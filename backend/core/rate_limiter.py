"""
Advanced Rate Limiting System for AI Trading Platform

This module provides comprehensive rate limiting with:
- Multiple rate limiting strategies (token bucket, sliding window)
- Redis-based distributed rate limiting
- Memory fallback for development
- User-based and IP-based limiting
- Endpoint-specific rate limits
- Graceful degradation

Author: AI Trading Platform Team
Version: 1.0.0
"""

import time
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, Any, List
from collections import defaultdict, deque
from dataclasses import dataclass
from enum import Enum

from fastapi import HTTPException, Request, status

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

# Configure logger
rate_limit_logger = logging.getLogger("rate_limiter")


class RateLimitStrategy(Enum):
    """Rate limiting strategies"""
    TOKEN_BUCKET = "token_bucket"
    SLIDING_WINDOW = "sliding_window"
    FIXED_WINDOW = "fixed_window"


@dataclass
class RateLimit:
    """Rate limit configuration"""
    requests: int           # Number of requests allowed
    window_seconds: int     # Time window in seconds
    strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW
    burst_allowance: int = 0  # Extra requests allowed in burst


@dataclass
class RateLimitResult:
    """Rate limit check result"""
    allowed: bool
    remaining: int
    reset_time: datetime
    retry_after: Optional[int] = None


class RedisRateLimiter:
    """Redis-based distributed rate limiter"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        if not REDIS_AVAILABLE:
            raise ImportError("Redis is not available. Install with: pip install redis")
        self.redis_url = redis_url
        self.redis_client: Optional[redis.Redis] = None
        self._connected = False
    
    async def connect(self):
        """Connect to Redis"""
        try:
            self.redis_client = redis.from_url(self.redis_url)
            await self.redis_client.ping()
            self._connected = True
            rate_limit_logger.info("Connected to Redis for rate limiting")
        except Exception as e:
            rate_limit_logger.warning(f"Failed to connect to Redis: {e}")
            self._connected = False
    
    async def check_rate_limit(
        self, 
        key: str, 
        limit: RateLimit
    ) -> RateLimitResult:
        """Check rate limit using Redis"""
        if not self._connected:
            raise Exception("Redis not connected")
        
        now = time.time()
        window_start = now - limit.window_seconds
        
        if limit.strategy == RateLimitStrategy.SLIDING_WINDOW:
            return await self._sliding_window_check(key, limit, now, window_start)
        elif limit.strategy == RateLimitStrategy.TOKEN_BUCKET:
            return await self._token_bucket_check(key, limit, now)
        else:  # FIXED_WINDOW
            return await self._fixed_window_check(key, limit, now)
    
    async def _sliding_window_check(
        self, 
        key: str, 
        limit: RateLimit, 
        now: float, 
        window_start: float
    ) -> RateLimitResult:
        """Sliding window rate limiting using Redis"""
        pipe = self.redis_client.pipeline()
        
        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)
        
        # Count current requests
        pipe.zcard(key)
        
        # Add current request
        pipe.zadd(key, {str(now): now})
        
        # Set expiration
        pipe.expire(key, limit.window_seconds + 1)
        
        results = await pipe.execute()
        current_requests = results[1]
        
        allowed = current_requests < limit.requests
        remaining = max(0, limit.requests - current_requests)
        reset_time = datetime.fromtimestamp(now + limit.window_seconds)
        
        if not allowed:
            # Remove the request we just added since it's not allowed
            await self.redis_client.zrem(key, str(now))
            retry_after = limit.window_seconds
        else:
            retry_after = None
        
        return RateLimitResult(
            allowed=allowed,
            remaining=remaining,
            reset_time=reset_time,
            retry_after=retry_after
        )
    
    async def _token_bucket_check(
        self, 
        key: str, 
        limit: RateLimit, 
        now: float
    ) -> RateLimitResult:
        """Token bucket rate limiting using Redis"""
        bucket_key = f"{key}:bucket"
        
        # Get current bucket state
        bucket_data = await self.redis_client.hmget(
            bucket_key, 
            "tokens", "last_refill"
        )
        
        current_tokens = float(bucket_data[0] or limit.requests)
        last_refill = float(bucket_data[1] or now)
        
        # Calculate token refill
        refill_rate = limit.requests / limit.window_seconds
        time_passed = now - last_refill
        tokens_to_add = time_passed * refill_rate
        
        # Update token count (capped at bucket size)
        new_tokens = min(limit.requests, current_tokens + tokens_to_add)
        
        if new_tokens >= 1:
            # Allow request and consume token
            new_tokens -= 1
            allowed = True
            remaining = int(new_tokens)
        else:
            # Not enough tokens
            allowed = False
            remaining = 0
        
        # Update bucket state
        await self.redis_client.hset(
            bucket_key,
            mapping={
                "tokens": new_tokens,
                "last_refill": now
            }
        )
        await self.redis_client.expire(bucket_key, limit.window_seconds * 2)
        
        # Calculate reset time
        if remaining == 0:
            time_for_token = 1 / refill_rate
            reset_time = datetime.fromtimestamp(now + time_for_token)
            retry_after = int(time_for_token)
        else:
            reset_time = datetime.fromtimestamp(now + limit.window_seconds)
            retry_after = None
        
        return RateLimitResult(
            allowed=allowed,
            remaining=remaining,
            reset_time=reset_time,
            retry_after=retry_after
        )
    
    async def _fixed_window_check(
        self, 
        key: str, 
        limit: RateLimit, 
        now: float
    ) -> RateLimitResult:
        """Fixed window rate limiting using Redis"""
        window_key = f"{key}:{int(now // limit.window_seconds)}"
        
        # Increment counter
        current_requests = await self.redis_client.incr(window_key)
        
        if current_requests == 1:
            # Set expiration for new window
            await self.redis_client.expire(window_key, limit.window_seconds)
        
        allowed = current_requests <= limit.requests
        remaining = max(0, limit.requests - current_requests)
        
        # Calculate reset time
        window_number = int(now // limit.window_seconds)
        reset_time = datetime.fromtimestamp((window_number + 1) * limit.window_seconds)
        
        retry_after = None if allowed else limit.window_seconds
        
        return RateLimitResult(
            allowed=allowed,
            remaining=remaining,
            reset_time=reset_time,
            retry_after=retry_after
        )


class MemoryRateLimiter:
    """Memory-based rate limiter for development"""
    
    def __init__(self):
        self.requests: Dict[str, deque] = defaultdict(deque)
        self.token_buckets: Dict[str, Dict[str, float]] = defaultdict(dict)
    
    async def check_rate_limit(
        self, 
        key: str, 
        limit: RateLimit
    ) -> RateLimitResult:
        """Check rate limit using memory storage"""
        now = time.time()
        
        if limit.strategy == RateLimitStrategy.SLIDING_WINDOW:
            return await self._sliding_window_check(key, limit, now)
        elif limit.strategy == RateLimitStrategy.TOKEN_BUCKET:
            return await self._token_bucket_check(key, limit, now)
        else:  # FIXED_WINDOW
            return await self._fixed_window_check(key, limit, now)
    
    async def _sliding_window_check(
        self, 
        key: str, 
        limit: RateLimit, 
        now: float
    ) -> RateLimitResult:
        """Sliding window check in memory"""
        window_start = now - limit.window_seconds
        requests = self.requests[key]
        
        # Remove old requests
        while requests and requests[0] < window_start:
            requests.popleft()
        
        allowed = len(requests) < limit.requests
        remaining = max(0, limit.requests - len(requests))
        
        if allowed:
            requests.append(now)
        
        reset_time = datetime.fromtimestamp(now + limit.window_seconds)
        retry_after = None if allowed else limit.window_seconds
        
        return RateLimitResult(
            allowed=allowed,
            remaining=remaining,
            reset_time=reset_time,
            retry_after=retry_after
        )
    
    async def _token_bucket_check(
        self, 
        key: str, 
        limit: RateLimit, 
        now: float
    ) -> RateLimitResult:
        """Token bucket check in memory"""
        bucket = self.token_buckets[key]
        
        current_tokens = bucket.get("tokens", limit.requests)
        last_refill = bucket.get("last_refill", now)
        
        # Calculate refill
        refill_rate = limit.requests / limit.window_seconds
        time_passed = now - last_refill
        tokens_to_add = time_passed * refill_rate
        
        new_tokens = min(limit.requests, current_tokens + tokens_to_add)
        
        if new_tokens >= 1:
            new_tokens -= 1
            allowed = True
            remaining = int(new_tokens)
        else:
            allowed = False
            remaining = 0
        
        # Update bucket
        bucket["tokens"] = new_tokens
        bucket["last_refill"] = now
        
        reset_time = datetime.fromtimestamp(now + limit.window_seconds)
        retry_after = None if allowed else int(1 / refill_rate)
        
        return RateLimitResult(
            allowed=allowed,
            remaining=remaining,
            reset_time=reset_time,
            retry_after=retry_after
        )
    
    async def _fixed_window_check(
        self, 
        key: str, 
        limit: RateLimit, 
        now: float
    ) -> RateLimitResult:
        """Fixed window check in memory"""
        window_number = int(now // limit.window_seconds)
        window_key = f"{key}:{window_number}"
        
        if window_key not in self.requests:
            self.requests[window_key] = deque()
        
        requests = self.requests[window_key]
        current_requests = len(requests) + 1
        
        allowed = current_requests <= limit.requests
        remaining = max(0, limit.requests - current_requests)
        
        if allowed:
            requests.append(now)
        
        reset_time = datetime.fromtimestamp((window_number + 1) * limit.window_seconds)
        retry_after = None if allowed else limit.window_seconds
        
        return RateLimitResult(
            allowed=allowed,
            remaining=remaining,
            reset_time=reset_time,
            retry_after=retry_after
        )


class RateLimitManager:
    """Main rate limiting manager"""
    
    # Default rate limits for different endpoints
    DEFAULT_LIMITS = {
        "auth_login": RateLimit(5, 300),  # 5 attempts per 5 minutes
        "auth_register": RateLimit(3, 3600),  # 3 registrations per hour
        "auth_refresh": RateLimit(10, 300),  # 10 refreshes per 5 minutes
        "api_general": RateLimit(100, 60),  # 100 requests per minute
        "api_ai": RateLimit(20, 60),  # 20 AI requests per minute
        "api_premium": RateLimit(200, 60),  # 200 premium requests per minute
        "password_reset": RateLimit(3, 3600),  # 3 password resets per hour
    }
    
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url
        self.redis_limiter: Optional[RedisRateLimiter] = None
        self.memory_limiter = MemoryRateLimiter()
        self.use_redis = redis_url is not None and REDIS_AVAILABLE
        
        if self.use_redis:
            try:
                self.redis_limiter = RedisRateLimiter(redis_url)
            except ImportError:
                self.use_redis = False
    
    async def initialize(self):
        """Initialize rate limiter"""
        if self.use_redis and self.redis_limiter:
            try:
                await self.redis_limiter.connect()
            except Exception as e:
                rate_limit_logger.warning(f"Failed to initialize Redis rate limiter: {e}")
                self.use_redis = False
    
    async def check_rate_limit(
        self,
        identifier: str,
        limit_type: str,
        custom_limit: Optional[RateLimit] = None
    ) -> RateLimitResult:
        """Check rate limit for identifier"""
        limit = custom_limit or self.DEFAULT_LIMITS.get(
            limit_type, 
            self.DEFAULT_LIMITS["api_general"]
        )
        
        key = f"rate_limit:{limit_type}:{identifier}"
        
        try:
            if self.use_redis and self.redis_limiter:
                return await self.redis_limiter.check_rate_limit(key, limit)
            else:
                return await self.memory_limiter.check_rate_limit(key, limit)
        except Exception as e:
            rate_limit_logger.error(f"Rate limit check failed: {e}")
            # Fail open - allow request if rate limiter is broken
            return RateLimitResult(
                allowed=True,
                remaining=limit.requests,
                reset_time=datetime.now() + timedelta(seconds=limit.window_seconds)
            )
    
    def get_rate_limit_headers(self, result: RateLimitResult) -> Dict[str, str]:
        """Get HTTP headers for rate limit response"""
        headers = {
            "X-RateLimit-Remaining": str(result.remaining),
            "X-RateLimit-Reset": str(int(result.reset_time.timestamp())),
        }
        
        if result.retry_after:
            headers["Retry-After"] = str(result.retry_after)
        
        return headers


# Global rate limiter instance
rate_limiter = RateLimitManager(
    redis_url=os.getenv("REDIS_URL") if "os" in globals() else None
)


async def rate_limit_dependency(
    request: Request,
    limit_type: str = "api_general",
    custom_limit: Optional[RateLimit] = None
):
    """FastAPI dependency for rate limiting"""
    # Get identifier (prefer user ID, fallback to IP)
    identifier = getattr(request.state, "user_id", None)
    if not identifier:
        identifier = request.client.host if request.client else "unknown"
    
    result = await rate_limiter.check_rate_limit(identifier, limit_type, custom_limit)
    
    if not result.allowed:
        headers = rate_limiter.get_rate_limit_headers(result)
        
        rate_limit_logger.warning(
            f"Rate limit exceeded: {identifier} for {limit_type}"
        )
        
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
            headers=headers
        )
    
    # Add rate limit headers to successful responses
    if hasattr(request.state, "rate_limit_headers"):
        request.state.rate_limit_headers.update(
            rate_limiter.get_rate_limit_headers(result)
        )
    else:
        request.state.rate_limit_headers = rate_limiter.get_rate_limit_headers(result)


# Import os for environment variables
import os
