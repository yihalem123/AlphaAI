"""
Enhanced Security Module

Provides comprehensive security utilities including:
- Input validation and sanitization
- Rate limiting and DOS protection
- Security monitoring and logging
- CSRF protection
- User registration and login security
"""

import re
import time
import hmac
import hashlib
import secrets
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from collections import defaultdict, deque
import bcrypt
from pydantic import BaseModel, EmailStr, validator
import ipaddress

# Configure security logger
security_logger = logging.getLogger("security")


@dataclass
class SecurityConfig:
    """Security configuration settings"""
    # Rate limiting
    max_requests_per_minute: int = 60
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15
    
    # Legacy compatibility attributes
    LOGIN_ATTEMPTS_LIMIT: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15
    RATE_LIMIT_PER_HOUR: int = 100
    
    # Password policy
    min_password_length: int = 8
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_numbers: bool = True
    require_special_chars: bool = True
    
    # Session security
    session_timeout_minutes: int = 60
    max_concurrent_sessions: int = 5
    
    # Input validation
    max_input_length: int = 1000
    allowed_file_types: List[str] = field(default_factory=lambda: ['.jpg', '.png', '.pdf'])
    max_file_size_mb: int = 10
    
    # CSRF protection
    csrf_token_lifetime_minutes: int = 30
    CSRF_TOKEN_LENGTH: int = 32
    
    # Security monitoring
    max_failed_attempts_before_alert: int = 10
    suspicious_activity_threshold: int = 20


class SecurityViolation(Exception):
    """Raised when a security violation is detected"""
    def __init__(self, message: str, violation_type: str, severity: str = "medium"):
        super().__init__(message)
        self.violation_type = violation_type
        self.severity = severity
        self.timestamp = datetime.utcnow()


class InputValidator:
    """Advanced input validation and sanitization"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        
        # Regex patterns for validation
        self.patterns = {
            'email': re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
            'username': re.compile(r'^[a-zA-Z0-9_-]{3,30}$'),
            'password': re.compile(r'^.{8,128}$'),
            'phone': re.compile(r'^\+?1?-?\.?\s?\(?([0-9]{3})\)?[-\.\s]?([0-9]{3})[-\.\s]?([0-9]{4})$'),
            'alphanumeric': re.compile(r'^[a-zA-Z0-9\s]+$'),
            'safe_string': re.compile(r'^[a-zA-Z0-9\s\.\-_@]+$'),
        }
        
        # Dangerous patterns to block
        self.dangerous_patterns = [
            re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL),
            re.compile(r'javascript:', re.IGNORECASE),
            re.compile(r'vbscript:', re.IGNORECASE),
            re.compile(r'on\w+\s*=', re.IGNORECASE),
            re.compile(r'expression\s*\(', re.IGNORECASE),
            re.compile(r'url\s*\(', re.IGNORECASE),
            re.compile(r'@import', re.IGNORECASE),
            re.compile(r'<!--.*?-->', re.DOTALL),
        ]
        
        # SQL injection patterns
        self.sql_injection_patterns = [
            re.compile(r'\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b', re.IGNORECASE),
            re.compile(r'[\'";]', re.IGNORECASE),
            re.compile(r'--', re.IGNORECASE),
            re.compile(r'/\*.*?\*/', re.DOTALL),
        ]
    
    def validate_email(self, email: str) -> bool:
        """Validate email format"""
        if not email or len(email) > 254:
            return False
        return bool(self.patterns['email'].match(email))
    
    def validate_username(self, username: str) -> bool:
        """Validate username format"""
        if not username:
            return False
        return bool(self.patterns['username'].match(username))
    
    def validate_password(self, password: str) -> Dict[str, Any]:
        """Comprehensive password validation"""
        result = {
            'valid': True,
            'errors': [],
            'strength_score': 0
        }
        
        if not password:
            result['valid'] = False
            result['errors'].append("Password is required")
            return result
        
        # Length check
        if len(password) < self.config.min_password_length:
            result['valid'] = False
            result['errors'].append(f"Password must be at least {self.config.min_password_length} characters")
        
        # Character requirements
        if self.config.require_uppercase and not re.search(r'[A-Z]', password):
            result['valid'] = False
            result['errors'].append("Password must contain at least one uppercase letter")
        
        if self.config.require_lowercase and not re.search(r'[a-z]', password):
            result['valid'] = False
            result['errors'].append("Password must contain at least one lowercase letter")
        
        if self.config.require_numbers and not re.search(r'\d', password):
            result['valid'] = False
            result['errors'].append("Password must contain at least one number")
        
        if self.config.require_special_chars and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            result['valid'] = False
            result['errors'].append("Password must contain at least one special character")
        
        # Calculate strength score
        score = 0
        if len(password) >= 8: score += 1
        if len(password) >= 12: score += 1
        if re.search(r'[A-Z]', password): score += 1
        if re.search(r'[a-z]', password): score += 1
        if re.search(r'\d', password): score += 1
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', password): score += 1
        if len(password) >= 16: score += 1
        
        result['strength_score'] = min(score, 5)  # Max 5
        
        return result
    
    def sanitize_input(self, input_str: str, allow_html: bool = False) -> str:
        """Sanitize input string"""
        if not input_str:
            return ""
        
        # Length check
        if len(input_str) > self.config.max_input_length:
            raise SecurityViolation(
                f"Input exceeds maximum length of {self.config.max_input_length}",
                "input_length_exceeded"
            )
        
        # Check for SQL injection
        for pattern in self.sql_injection_patterns:
            if pattern.search(input_str):
                raise SecurityViolation(
                    "Potential SQL injection detected",
                    "sql_injection_attempt",
                    severity="high"
                )
        
        # Check for XSS if HTML not allowed
        if not allow_html:
            for pattern in self.dangerous_patterns:
                if pattern.search(input_str):
                    raise SecurityViolation(
                        "Potential XSS attack detected",
                        "xss_attempt",
                        severity="high"
                    )
        
        # Basic sanitization
        sanitized = input_str.strip()
        
        if not allow_html:
            # Escape HTML characters
            sanitized = (sanitized
                        .replace('&', '&amp;')
                        .replace('<', '&lt;')
                        .replace('>', '&gt;')
                        .replace('"', '&quot;')
                        .replace("'", '&#x27;')
                        .replace('/', '&#x2F;'))
        
        return sanitized
    
    def validate_ip_address(self, ip: str) -> bool:
        """Validate IP address format"""
        try:
            ipaddress.ip_address(ip)
            return True
        except ValueError:
            return False


class RateLimiter:
    """Advanced rate limiting with multiple strategies"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        self.requests: Dict[str, deque] = defaultdict(lambda: deque())
        self.blocked_ips: Dict[str, datetime] = {}
        self.failed_attempts: Dict[str, List[datetime]] = defaultdict(list)
    
    def is_rate_limited(self, identifier: str, max_requests: Optional[int] = None, 
                       window_seconds: int = 60) -> bool:
        """Check if identifier is rate limited"""
        now = time.time()
        max_reqs = max_requests or self.config.max_requests_per_minute
        
        # Clean old requests
        request_times = self.requests[identifier]
        while request_times and request_times[0] < now - window_seconds:
            request_times.popleft()
        
        # Check if limit exceeded
        if len(request_times) >= max_reqs:
            security_logger.warning(f"Rate limit exceeded for {identifier}")
            return True
        
        # Add current request
        request_times.append(now)
        return False
    
    def record_failed_attempt(self, identifier: str) -> bool:
        """Record failed login attempt and check if should be blocked"""
        now = datetime.utcnow()
        
        # Clean old attempts (older than lockout duration)
        cutoff = now - timedelta(minutes=self.config.lockout_duration_minutes)
        self.failed_attempts[identifier] = [
            attempt for attempt in self.failed_attempts[identifier]
            if attempt > cutoff
        ]
        
        # Add current attempt
        self.failed_attempts[identifier].append(now)
        
        # Check if should be blocked
        if len(self.failed_attempts[identifier]) >= self.config.max_login_attempts:
            self.blocked_ips[identifier] = now + timedelta(minutes=self.config.lockout_duration_minutes)
            security_logger.warning(f"IP {identifier} blocked due to too many failed attempts")
            return True
        
        return False
    
    def is_blocked(self, identifier: str) -> bool:
        """Check if identifier is currently blocked"""
        if identifier in self.blocked_ips:
            if datetime.utcnow() < self.blocked_ips[identifier]:
                return True
            else:
                # Unblock expired blocks
                del self.blocked_ips[identifier]
        return False
    
    def clear_failed_attempts(self, identifier: str):
        """Clear failed attempts for identifier (e.g., on successful login)"""
        if identifier in self.failed_attempts:
            del self.failed_attempts[identifier]
        if identifier in self.blocked_ips:
            del self.blocked_ips[identifier]


class SecurityMonitor:
    """Security event monitoring and alerting"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        self.security_events: List[Dict[str, Any]] = []
        self.suspicious_activities: Dict[str, int] = defaultdict(int)
    
    def log_security_event(self, event_type: str, details: Dict[str, Any], 
                          severity: str = "medium", ip_address: str = None):
        """Log a security event"""
        event = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'details': details,
            'severity': severity,
            'ip_address': ip_address
        }
        
        self.security_events.append(event)
        
        # Log to security logger
        security_logger.info(f"Security event: {event_type}", extra=event)
        
        # Track suspicious activity
        if ip_address:
            self.suspicious_activities[ip_address] += 1
            
            if self.suspicious_activities[ip_address] >= self.config.suspicious_activity_threshold:
                self.trigger_security_alert(ip_address, "high_suspicious_activity")
    
    def trigger_security_alert(self, identifier: str, alert_type: str):
        """Trigger security alert for immediate attention"""
        alert = {
            'timestamp': datetime.utcnow().isoformat(),
            'alert_type': alert_type,
            'identifier': identifier,
            'severity': 'high'
        }
        
        security_logger.critical(f"SECURITY ALERT: {alert_type} for {identifier}", extra=alert)
        
        # In production, this would send notifications to security team
        # For now, just log the alert
    
    def get_security_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get security events summary for specified hours"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        recent_events = [
            event for event in self.security_events
            if datetime.fromisoformat(event['timestamp']) > cutoff
        ]
        
        return {
            'total_events': len(recent_events),
            'events_by_type': {},
            'events_by_severity': {},
            'top_suspicious_ips': dict(list(self.suspicious_activities.items())[:10])
        }


class CSRFProtection:
    """CSRF token generation and validation"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        self.tokens: Dict[str, Dict[str, Any]] = {}
    
    def generate_token(self, session_id: str) -> str:
        """Generate CSRF token for session"""
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(minutes=self.config.csrf_token_lifetime_minutes)
        
        self.tokens[token] = {
            'session_id': session_id,
            'expires_at': expires_at,
            'created_at': datetime.utcnow()
        }
        
        return token
    
    def validate_token(self, token: str, session_id: str) -> bool:
        """Validate CSRF token"""
        if not token or token not in self.tokens:
            return False
        
        token_data = self.tokens[token]
        
        # Check expiration
        if datetime.utcnow() > token_data['expires_at']:
            del self.tokens[token]
            return False
        
        # Check session match
        if token_data['session_id'] != session_id:
            return False
        
        return True
    
    def cleanup_expired_tokens(self):
        """Remove expired tokens"""
        now = datetime.utcnow()
        expired_tokens = [
            token for token, data in self.tokens.items()
            if now > data['expires_at']
        ]
        
        for token in expired_tokens:
            del self.tokens[token]


class SecureUserRegistration(BaseModel):
    """Secure user registration model with validation"""
    email: EmailStr
    username: str
    password: str
    confirm_password: str
    terms_accepted: bool
    
    @validator('username')
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]{3,30}$', v):
            raise ValueError('Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens')
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('terms_accepted')
    def terms_must_be_accepted(cls, v):
        if not v:
            raise ValueError('Terms and conditions must be accepted')
        return v


class SecureUserLogin(BaseModel):
    """Secure user login model with validation"""
    email: EmailStr
    password: str
    remember_me: bool = False
    mfa_code: Optional[str] = None


class PasswordHasher:
    """Secure password hashing utilities"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        except Exception:
            return False


class SecureTokenGenerator:
    """Secure token generation utilities"""
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generate cryptographically secure random token"""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def generate_numeric_code(length: int = 6) -> str:
        """Generate secure numeric code (for MFA, etc.)"""
        return ''.join(secrets.choice('0123456789') for _ in range(length))
    
    @staticmethod
    def generate_api_key() -> str:
        """Generate API key with specific format"""
        prefix = "aita_"  # AI Trading Assistant
        key = secrets.token_urlsafe(32)
        return f"{prefix}{key}"


class SecurityHeaders:
    """Security headers management"""
    
    @staticmethod
    def get_security_headers() -> Dict[str, str]:
        """Get recommended security headers"""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
        }
    
    @staticmethod
    def apply_headers(response, headers: Dict[str, str] = None):
        """Apply security headers to response"""
        security_headers = headers or SecurityHeaders.get_security_headers()
        for key, value in security_headers.items():
            response.headers[key] = value
        return response


async def security_middleware(request, call_next):
    """Security middleware for FastAPI"""
    # Process request
    start_time = time.time()
    
    # Get client IP
    client_ip = request.client.host
    
    # Log request
    security_monitor.log_security_event(
        "request",
        {
            "method": request.method,
            "url": str(request.url),
            "user_agent": request.headers.get("user-agent", ""),
            "referer": request.headers.get("referer", "")
        },
        ip_address=client_ip
    )
    
    # Process response
    response = await call_next(request)
    
    # Apply security headers
    SecurityHeaders.apply_headers(response)
    
    # Log response
    process_time = time.time() - start_time
    security_monitor.log_security_event(
        "response",
        {
            "status_code": response.status_code,
            "process_time": process_time
        },
        ip_address=client_ip
    )
    
    return response


# Initialize security components with default config
default_config = SecurityConfig()
input_validator = InputValidator(default_config)
rate_limiter = RateLimiter(default_config)
security_monitor = SecurityMonitor(default_config)
csrf_protection = CSRFProtection(default_config)
password_hasher = PasswordHasher()
token_generator = SecureTokenGenerator()
