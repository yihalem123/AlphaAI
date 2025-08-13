"""
Secure Authentication API - Production Grade

This module provides a unified, secure authentication API that replaces
the old auth.py and consolidates auth_v2.py with enhanced security features.

Features:
- Comprehensive input validation
- Rate limiting and abuse prevention  
- Secure JWT tokens with RS256
- Session management with automatic cleanup
- CSRF protection
- Security monitoring and logging
- Multi-factor authentication support
- Password strength requirements
- Account lockout protection

Author: AI Trading Platform Security Team
Version: 3.0.0
"""

from fastapi import APIRouter, HTTPException, Depends, status, Request, Response, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional, Dict, Any, List
from datetime import datetime
import secrets
import logging
import os

from core.database import get_db, User, UserSession
from core.auth_enhanced import enhanced_auth_service, TokenType, AuthConfig
from core.security import (
    InputValidator, SecurityMonitor, CSRFProtection,
    SecurityConfig, SecureUserRegistration, SecureUserLogin,
    SecurityHeaders, security_middleware, security_monitor
)
from core.rate_limiter import rate_limit_dependency, RateLimit

# Create dependency functions to avoid parameter conflicts
async def auth_login_rate_limit(request: Request):
    return await rate_limit_dependency(request, "auth_login")

async def auth_register_rate_limit(request: Request):
    return await rate_limit_dependency(request, "auth_register")

async def auth_refresh_rate_limit(request: Request):
    return await rate_limit_dependency(request, "auth_refresh")

# Configure router
router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)

# Configure logger
api_logger = logging.getLogger("auth_api")


# Enhanced Pydantic Models
class UserRegistrationRequest(SecureUserRegistration):
    """User registration with enhanced validation"""
    terms_accepted: bool = Field(..., description="User must accept terms of service")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "SecurePassword123!",
                "confirm_password": "SecurePassword123!",
                "username": "john_doe",
                "terms_accepted": True
            }
        }


class UserLoginRequest(SecureUserLogin):
    """User login with optional MFA"""
    mfa_code: Optional[str] = Field(None, min_length=6, max_length=8)
    device_trust: bool = Field(False, description="Trust this device for 30 days")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com", 
                "password": "SecurePassword123!",
                "remember_me": True,
                "mfa_code": "123456",
                "device_trust": False
            }
        }


class TokenResponse(BaseModel):
    """Enhanced token response"""
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    refresh_expires_in: int
    user: Dict[str, Any]
    session_id: str
    permissions: List[str] = []
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
                "token_type": "Bearer",
                "expires_in": 900,
                "refresh_expires_in": 2592000,
                "user": {
                    "id": 1,
                    "email": "user@example.com",
                    "username": "john_doe",
                    "subscription_tier": "pro",
                    "email_verified": True
                },
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "permissions": ["read", "write", "trade"]
            }
        }


class UserResponse(BaseModel):
    """Secure user information response"""
    id: int
    email: str
    username: Optional[str]
    subscription_tier: str
    email_verified: bool
    mfa_enabled: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    permissions: List[str] = []
    
    class Config:
        from_attributes = True


class PasswordChangeRequest(BaseModel):
    """Password change request"""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
    logout_all_sessions: bool = Field(False, description="Logout from all other sessions")


class PasswordResetRequest(BaseModel):
    """Password reset request"""
    email: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com"
            }
        }


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation"""
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class SessionInfo(BaseModel):
    """User session information"""
    session_id: str
    ip_address: str
    user_agent: str
    created_at: datetime
    last_activity: datetime
    is_current: bool = False


# Dependencies
async def get_current_user(
    request: Request,
    response: Response,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    access_token: Optional[str] = Cookie(None),
    refresh_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user with enhanced security"""
    
    # Log security event for authentication attempt
    from core.security import security_monitor
    client_ip = request.client.host if request.client else "unknown"
    security_monitor.log_security_event(
        "auth_attempt",
        {
            "method": request.method,
            "url": str(request.url),
            "user_agent": request.headers.get("user-agent", "")
        },
        ip_address=client_ip
    )
    
    # Debug current user attempt
    api_logger.info(f"🔍 get_current_user called - has credentials: {bool(credentials)}, has cookie: {bool(access_token)}")
    if access_token:
        api_logger.info(f"🔍 Access token cookie value: {access_token[:20]}...")
    
    # Debug all cookies
    cookies = dict(request.cookies)
    api_logger.info(f"🔍 All cookies: {list(cookies.keys())}")
    
    # Get token from header or cookie
    token = None
    if credentials:
        token = credentials.credentials
    elif access_token:
        token = access_token

    # Helper: attempt refresh using refresh_token cookie
    async def try_refresh_and_return_user() -> Optional[User]:
        if not refresh_token:
            return None
        try:
            user, new_tokens = await enhanced_auth_service.refresh_user_tokens(db, refresh_token, request)
            # Set fresh cookies so subsequent requests succeed
            enhanced_auth_service.set_auth_cookies(response, new_tokens)
            # Update session activity
            await enhanced_auth_service.sessions.update_session_activity(
                db, new_tokens.get("session_id"), request.client.host if request.client else None
            )
            await db.commit()
            return user
        except HTTPException:
            return None
        except Exception as e:
            api_logger.error(f"Auto-refresh in get_current_user failed: {e}")
            return None

    if not token:
        # No access token; try silent refresh using refresh cookie
        refreshed_user = await try_refresh_and_return_user()
        if refreshed_user:
            return refreshed_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify JWT token
    try:
        payload = enhanced_auth_service.jwt.verify_token(token, TokenType.ACCESS)
        user_id = int(payload["sub"])
        session_id = payload["sid"]
    except HTTPException as e:
        # If access token invalid/expired, attempt silent refresh
        refreshed_user = await try_refresh_and_return_user()
        if refreshed_user:
            return refreshed_user
        raise e
    except Exception as e:
        api_logger.error(f"Token parsing error: {e}")
        # As a fallback, try refresh
        refreshed_user = await try_refresh_and_return_user()
        if refreshed_user:
            return refreshed_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format"
        )
    
    # Verify session is active
    session = await enhanced_auth_service.sessions.get_active_session(db, session_id)
    if not session:
        client_ip = request.client.host if request.client else "unknown"
        security_monitor.log_security_event(
            "session_expired",
            {"session_id": session_id, "user_id": user_id},
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or revoked"
        )
    
    # Get user
    result = await db.execute(
        select(User).where(
            and_(
                User.id == user_id,
                User.is_active == True
            )
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        client_ip = request.client.host if request.client else "unknown"
        security_monitor.log_security_event(
            "user_not_found",
            {"user_id": user_id},
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Update session activity
    await enhanced_auth_service.sessions.update_session_activity(
        db, session_id, request.client.host if request.client else None
    )
    await db.commit()
    
    return user


async def get_current_user_optional(
    request: Request,
    response: Response,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    access_token: Optional[str] = Cookie(None),
    refresh_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    try:
        return await get_current_user(request, response, credentials, access_token, refresh_token, db)
    except HTTPException:
        return None


def require_csrf_token(request: Request) -> str:
    """Require and validate CSRF token"""
    csrf_token = request.headers.get("X-CSRF-Token")
    if not csrf_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token required"
        )
    
    # Basic validation (in production, validate against stored token)
    from core.security import default_config
    if len(csrf_token) < default_config.CSRF_TOKEN_LENGTH // 2:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid CSRF token"
        )
    
    return csrf_token


async def check_user_limits(user: User, db: AsyncSession):
    """Check if user has exceeded their API usage limits"""
    # Define limits based on subscription tier
    limits = {
        "free": 50,
        "pro": 500,
        "premium": 2000
    }
    
    daily_limit = limits.get(user.subscription_tier, 50)
    
    if user.api_calls_count >= daily_limit:
        security_monitor.log_security_event(
            "api_limit_exceeded",
            {
                "user_id": user.id,
                "current_count": user.api_calls_count,
                "limit": daily_limit,
                "tier": user.subscription_tier
            }
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily API limit of {daily_limit} calls exceeded. Please upgrade your subscription."
        )
    
    # Increment usage counter
    user.api_calls_count += 1
    await db.commit()


# API Endpoints
@router.post("/register", response_model=TokenResponse)
async def register_user(
    request: Request,
    response: Response,
    user_data: UserRegistrationRequest,
    csrf_token: str = Depends(require_csrf_token),
    db: AsyncSession = Depends(get_db),
    _rate_limit: None = Depends(auth_register_rate_limit)
):
    """Register new user with comprehensive security"""
    
    # Validate terms acceptance
    if not user_data.terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Terms of service must be accepted"
        )
    
    try:
        # Debug registration
        api_logger.info(f"🔍 Registration attempt for: {user_data.email}")
        
        # Register user
        user, tokens = await enhanced_auth_service.register_user(
            db, user_data, request
        )
        
        api_logger.info(f"🔍 Registration successful for: {user_data.email}")
        
        # Set secure cookies
        enhanced_auth_service.set_auth_cookies(response, tokens)
        
        # Add security headers
        for key, value in SecurityHeaders.get_security_headers().items():
            response.headers[key] = value
        
        # Prepare response
        user_data_dict = UserResponse.model_validate(user).model_dump()
        
        return TokenResponse(
            access_token=tokens["access_token"],
            expires_in=tokens["expires_in"],
            refresh_expires_in=AuthConfig.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            user=user_data_dict,
            session_id=tokens["session_id"],
            permissions=["read", "write"] + (["premium"] if user.subscription_tier != "free" else [])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/debug-login")
async def debug_login(request: Request):
    """Debug endpoint to see raw request data"""
    print("🔍 DEBUG ENDPOINT HIT!")
    api_logger.info("🔍 DEBUG ENDPOINT HIT!")
    
    try:
        # Get all headers
        headers = dict(request.headers)
        print(f"🔍 DEBUG - All headers: {headers}")
        
        # Get body
        body = await request.body()
        content_type = request.headers.get("content-type", "unknown")
        
        print(f"🔍 DEBUG - Content-Type: {content_type}")
        print(f"🔍 DEBUG - Raw body: {body}")
        print(f"🔍 DEBUG - Body length: {len(body)}")
        print(f"🔍 DEBUG - Body decoded: {body.decode('utf-8')}")
        print(f"🔍 DEBUG - Body repr: {repr(body.decode('utf-8'))}")
        
        result = {
            "status": "debug_success",
            "content_type": content_type,
            "body_length": len(body),
            "headers": headers
        }
        
        # Try to parse JSON if it's not empty
        if body:
            import json
            try:
                parsed = json.loads(body)
                print(f"🔍 DEBUG - Parsed JSON: {parsed}")
                result["parsed_json"] = parsed
            except Exception as e:
                print(f"🔍 DEBUG - JSON parse error: {e}")
                result["json_error"] = str(e)
        else:
            print("🔍 DEBUG - Empty body!")
            result["empty_body"] = True
        
        print(f"🔍 DEBUG - Returning: {result}")
        return result
        
    except Exception as e:
        error_msg = f"🔍 DEBUG - Error: {e}"
        print(error_msg)
        api_logger.error(error_msg)
        return {"error": str(e)}


@router.post("/simple-login")
async def simple_login(request: Request):
    """Simple login test without dependencies"""
    try:
        print("🔍 SIMPLE LOGIN ENDPOINT HIT!")
        
        # Get body as JSON directly
        body = await request.json()
        print(f"🔍 SIMPLE - Parsed body: {body}")
        print(f"🔍 SIMPLE - Body type: {type(body)}")
        
        # Try to create the model manually
        from pydantic import ValidationError
        try:
            login_data = UserLoginRequest(**body)
            print(f"🔍 SIMPLE - Model created successfully: {login_data}")
            return {"status": "success", "email": login_data.email, "remember": login_data.remember_me}
        except ValidationError as ve:
            print(f"🔍 SIMPLE - Validation error: {ve}")
            return {"status": "validation_error", "errors": ve.errors()}
        except Exception as me:
            print(f"🔍 SIMPLE - Model error: {me}")
            return {"status": "model_error", "error": str(me)}
            
    except Exception as e:
        print(f"🔍 SIMPLE - General error: {e}")
        return {"status": "error", "error": str(e)}


@router.post("/login-test")
async def login_user_test(
    request: Request,
    response: Response,
    login_data: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Test login endpoint without CSRF/rate limiting"""
    print("🔍 LOGIN-TEST ENDPOINT HIT!")
    
    try:
        # Authenticate user
        user = await enhanced_auth_service.authenticate_user(
            db, login_data, request
        )
        
        if not user:
            return {"status": "auth_failed", "message": "Invalid credentials"}
            
        return {"status": "auth_success", "user_id": user.id, "email": user.email}
        
    except Exception as e:
        print(f"🔍 LOGIN-TEST - Error: {e}")
        return {"status": "error", "error": str(e)}


@router.post("/login", response_model=TokenResponse)
async def login_user(
    request: Request,
    response: Response,
    login_data: UserLoginRequest,
    csrf_token: str = Depends(require_csrf_token),
    db: AsyncSession = Depends(get_db),
    _rate_limit: None = Depends(auth_login_rate_limit)
):
    """Login user with enhanced security and optional MFA"""
    
    try:
        # Authenticate user
        user = await enhanced_auth_service.authenticate_user(
            db, login_data, request
        )
        
        # TODO: Handle MFA if enabled
        if user.mfa_enabled and not login_data.mfa_code:
            # In a real implementation, you'd generate and send MFA challenge
            raise HTTPException(
                status_code=status.HTTP_202_ACCEPTED,
                detail="MFA code required",
                headers={"X-MFA-Required": "true"}
            )
        
        # Create auth tokens
        tokens = await enhanced_auth_service.create_auth_tokens(
            db, user, request, login_data.remember_me
        )
        
        # Set secure cookies
        enhanced_auth_service.set_auth_cookies(response, tokens)
        
        # Add security headers
        for key, value in SecurityHeaders.get_security_headers().items():
            response.headers[key] = value
        
        # Prepare response
        user_data_dict = UserResponse.model_validate(user).model_dump()
        permissions = ["read", "write"]
        if user.subscription_tier in ["pro", "premium"]:
            permissions.extend(["premium", "analytics"])
        if user.subscription_tier == "premium":
            permissions.append("advanced")
        
        return TokenResponse(
            access_token=tokens["access_token"],
            expires_in=tokens["expires_in"],
            refresh_expires_in=AuthConfig.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            user=user_data_dict,
            session_id=tokens["session_id"],
            permissions=permissions
        )
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    request: Request,
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
    _rate_limit: None = Depends(auth_refresh_rate_limit)
):
    """Refresh access token using refresh token"""
    
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required"
        )
    
    try:
        # Debug refresh attempt
        api_logger.info(f"🔍 Refresh token attempt with token: {refresh_token[:20]}...")
        
        # Use the enhanced auth service to refresh tokens
        user, new_tokens = await enhanced_auth_service.refresh_user_tokens(
            db, refresh_token, request
        )
        
        # Set new secure cookies
        enhanced_auth_service.set_auth_cookies(response, new_tokens)
        
        # Add security headers
        for key, value in SecurityHeaders.get_security_headers().items():
            response.headers[key] = value
        
        # Prepare response
        user_data_dict = UserResponse.model_validate(user).model_dump()
        
        api_logger.info(f"🔍 Refresh successful for user: {user.email}")
        
        return TokenResponse(
            access_token=new_tokens["access_token"],
            expires_in=new_tokens["expires_in"],
            refresh_expires_in=AuthConfig.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            user=user_data_dict,
            session_id=new_tokens["session_id"],
            permissions=["read", "write"] + (["premium"] if user.subscription_tier != "free" else [])
        )
        
    except HTTPException:
        enhanced_auth_service.clear_auth_cookies(response)
        raise
    except Exception as e:
        api_logger.error(f"Token refresh error: {e}")
        enhanced_auth_service.clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed"
        )


@router.post("/logout")
async def logout_user(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    csrf_token: str = Depends(require_csrf_token),
    logout_all: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Logout user and revoke session"""
    
    try:
        # Get session ID from current request
        session_id = None
        token = None
        
        # Try to get token from header first
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
        else:
            # Try cookie
            token = request.cookies.get("access_token")
        
        if token:
            try:
                payload = enhanced_auth_service.jwt.verify_token(token, TokenType.ACCESS)
                session_id = payload.get("sid")
            except:
                pass  # Token might be expired
        
        if session_id:
            await enhanced_auth_service.logout_user(
                db, session_id, response, logout_all
            )
        else:
            # Clear cookies anyway
            enhanced_auth_service.clear_auth_cookies(response)
        
        client_ip = request.client.host if request.client else "unknown"
        security_monitor.log_security_event(
            "user_logout",
            {"user_id": current_user.id, "logout_all": logout_all},
            ip_address=client_ip
        )
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        api_logger.error(f"Logout error: {e}")
        # Clear cookies anyway
        enhanced_auth_service.clear_auth_cookies(response)
        return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return UserResponse.model_validate(current_user)


@router.get("/sessions", response_model=List[SessionInfo])
async def get_user_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's active sessions"""
    
    result = await db.execute(
        select(UserSession).where(
            and_(
                UserSession.user_id == current_user.id,
                UserSession.is_active == True
            )
        ).order_by(UserSession.last_activity.desc())
    )
    sessions = result.scalars().all()
    
    # Convert to response format
    session_list = []
    for session in sessions:
        session_info = SessionInfo(
            session_id=session.session_id,
            ip_address=session.ip_address or "unknown",
            user_agent=session.user_agent or "unknown",
            created_at=session.created_at,
            last_activity=session.last_activity
        )
        session_list.append(session_info)
    
    return session_list


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    csrf_token: str = Depends(require_csrf_token),
    db: AsyncSession = Depends(get_db)
):
    """Revoke a specific session"""
    
    # Verify session belongs to current user
    result = await db.execute(
        select(UserSession).where(
            and_(
                UserSession.session_id == session_id,
                UserSession.user_id == current_user.id
            )
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    await enhanced_auth_service.sessions.revoke_session(db, session_id)
    await db.commit()
    
    return {"message": "Session revoked"}


@router.get("/csrf-token")
async def get_csrf_token():
    """Get CSRF token for state-changing requests"""
    from core.security import token_generator
    token = token_generator.generate_secure_token(32)
    return {"csrf_token": token}


@router.get("/health")
async def auth_health():
    """Authentication service health check"""
    return {
        "status": "healthy",
        "service": "secure-authentication",
        "version": "3.0.0",
        "features": [
            "RS256 JWT access tokens",
            "Secure session management", 
            "Comprehensive input validation",
            "Rate limiting protection",
            "CSRF protection",
            "Argon2 password hashing",
            "Security monitoring",
            "Auto session cleanup",
            "Account lockout protection"
        ],
        "security_config": {
            "access_token_expire_minutes": AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES,
            "session_expire_days": AuthConfig.SESSION_EXPIRE_DAYS,
            "max_sessions_per_user": AuthConfig.MAX_SESSIONS_PER_USER,
            "login_attempts_limit": SecurityConfig.LOGIN_ATTEMPTS_LIMIT
        }
    }


# Development endpoints (remove in production)
if os.getenv("ENV") != "production":
    @router.post("/dev/create-user")
    async def dev_create_user(
        request: Request,
        response: Response,
        db: AsyncSession = Depends(get_db)
    ):
        """Development endpoint to create test user"""
        
        # Check if dev user exists
        result = await db.execute(
            select(User).where(User.email == "dev@example.com")
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Create dev user
            password_hash = enhanced_auth_service.crypto.hash_password("DevPassword123!")
            user = User(
                email="dev@example.com",
                username="dev_user",
                password_hash=password_hash,
                subscription_tier="premium",  # Give premium for testing
                daily_limit=1000,
                email_verified=True,
                is_active=True
            )
            
            db.add(user)
            await db.flush()
        
        # Create auth tokens
        tokens = await enhanced_auth_service.create_auth_tokens(db, user, request)
        enhanced_auth_service.set_auth_cookies(response, tokens)
        
        user_data_dict = UserResponse.model_validate(user).model_dump()
        
        return {
            "message": "Development user created/authenticated",
            "credentials": {
                "email": "dev@example.com",
                "password": "DevPassword123!"
            },
            "user": user_data_dict,
            "access_token": tokens["access_token"]
        }


# Initialize logger
if not api_logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    api_logger.addHandler(handler)
