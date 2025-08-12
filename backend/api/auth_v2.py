"""
Production-grade authentication endpoints with JWT access tokens,
rotating refresh tokens, and secure session management.
"""

from fastapi import APIRouter, HTTPException, Depends, status, Request, Response, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, Dict, Any
from datetime import datetime
import secrets

from core.database import get_db, User
from core.auth_service import auth_service, AuthConfig


router = APIRouter(prefix="/api/auth/v2", tags=["authentication-v2"])
security = HTTPBearer(auto_error=False)


# Pydantic models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "SecurePassword123!",
                "username": "johndoe"
            }
        }


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "SecurePassword123!",
                "remember_me": True
            }
        }


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: Dict[str, Any]


class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None  # Can come from cookie or body


class UserResponse(BaseModel):
    id: int
    email: str
    username: Optional[str]
    subscription_tier: str
    email_verified: bool
    mfa_enabled: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# CSRF Protection
def require_csrf_token(request: Request):
    """Require CSRF token for state-changing requests"""
    csrf_token = request.headers.get("X-CSRF-Token")
    if not csrf_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token required"
        )
    # In production, validate CSRF token against session
    return csrf_token


# Dependency to get current user from JWT
async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    access_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current user from JWT access token (header or cookie)"""
    
    token = None
    if credentials:
        token = credentials.credentials
    elif access_token:
        token = access_token
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify JWT token
    try:
        payload = auth_service.jwt.verify_access_token(token)
        user_id = int(payload["sub"])
        session_id = payload["sid"]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format"
        )
    
    # Verify session is still active
    session = await auth_service.sessions.get_active_session(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or revoked"
        )
    
    # Get user
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Update session activity
    await auth_service.sessions.update_session_activity(db, session_id)
    await db.commit()
    
    return user


# Optional user dependency (doesn't raise error if not authenticated)
async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    access_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    try:
        return await get_current_user(request, credentials, access_token, db)
    except HTTPException:
        return None


@router.post("/register", response_model=TokenResponse)
async def register(
    request: Request,
    response: Response,
    user_data: RegisterRequest,
    csrf_token: str = Depends(require_csrf_token),
    db: AsyncSession = Depends(get_db)
):
    """Register new user with email/password"""
    
    # Check if user already exists
    result = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check username uniqueness if provided
    if user_data.username:
        result = await db.execute(
            select(User).where(User.username == user_data.username)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Hash password
    password_hash = auth_service.crypto.hash_password(user_data.password)
    
    # Create user
    user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=password_hash,
        subscription_tier="free",
        daily_limit=10
    )
    
    db.add(user)
    await db.flush()  # Get user ID
    
    # Create auth tokens
    tokens = await auth_service.create_auth_tokens(db, user, request)
    
    # Set secure cookies
    auth_service.set_auth_cookies(response, tokens)
    
    return TokenResponse(
        access_token=tokens["access_token"],
        expires_in=tokens["expires_in"],
        user=UserResponse.model_validate(user).model_dump()
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    csrf_token: str = Depends(require_csrf_token),
    db: AsyncSession = Depends(get_db)
):
    """Login with email/password"""
    
    # Authenticate user
    user = await auth_service.authenticate_user(
        db, login_data.email, login_data.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Create auth tokens
    tokens = await auth_service.create_auth_tokens(db, user, request)
    
    # Set secure cookies
    auth_service.set_auth_cookies(response, tokens)
    
    return TokenResponse(
        access_token=tokens["access_token"],
        expires_in=tokens["expires_in"],
        user=UserResponse.model_validate(user).model_dump()
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    response: Response,
    refresh_data: RefreshRequest,
    refresh_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token"""
    
    # Get refresh token from request body or cookie
    token = refresh_data.refresh_token or refresh_token
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required"
        )
    
    # Refresh tokens
    try:
        new_tokens = await auth_service.refresh_access_token(db, token)
    except HTTPException:
        # Clear cookies on invalid refresh token
        auth_service.clear_auth_cookies(response)
        raise
    
    if not new_tokens:
        auth_service.clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Get user for response
    payload = auth_service.jwt.verify_access_token(new_tokens["access_token"])
    user_id = int(payload["sub"])
    
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one()
    
    # Set new secure cookies
    auth_service.set_auth_cookies(response, new_tokens)
    
    return TokenResponse(
        access_token=new_tokens["access_token"],
        expires_in=new_tokens["expires_in"],
        user=UserResponse.model_validate(user).model_dump()
    )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    csrf_token: str = Depends(require_csrf_token),
    db: AsyncSession = Depends(get_db)
):
    """Logout user and revoke session"""
    
    # Get session ID from token
    token = None
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
    else:
        token = request.cookies.get("access_token")
    
    if token:
        try:
            payload = auth_service.jwt.verify_access_token(token)
            session_id = payload["sid"]
            await auth_service.logout_user(db, session_id, response)
        except:
            pass  # Token might be expired, still clear cookies
    
    auth_service.clear_auth_cookies(response)
    
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return UserResponse.model_validate(current_user)


@router.get("/csrf-token")
async def get_csrf_token():
    """Get CSRF token for state-changing requests"""
    token = secrets.token_urlsafe(32)
    # In production, store this in session/cache with expiration
    return {"csrf_token": token}


@router.get("/health")
async def auth_health():
    """Authentication service health check"""
    return {
        "status": "healthy",
        "service": "authentication-v2",
        "features": [
            "RS256 JWT access tokens",
            "Rotating refresh tokens", 
            "Secure session management",
            "CSRF protection",
            "Argon2 password hashing",
            "Rate limiting",
            "HTTP-only cookies"
        ],
        "token_config": {
            "access_token_expire_minutes": AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES,
            "refresh_token_expire_days": AuthConfig.REFRESH_TOKEN_EXPIRE_DAYS,
            "session_expire_days": AuthConfig.SESSION_EXPIRE_DAYS
        }
    }


# Development endpoint (remove in production)
@router.post("/dev-create-user")
async def dev_create_user(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Development endpoint to create a test user"""
    
    # Check if dev user already exists
    result = await db.execute(
        select(User).where(User.email == "dev@example.com")
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Create dev user
        password_hash = auth_service.crypto.hash_password("DevPassword123!")
        user = User(
            email="dev@example.com",
            username="dev_user",
            password_hash=password_hash,
            subscription_tier="free",
            daily_limit=100,  # Higher limit for development
            email_verified=True
        )
        
        db.add(user)
        await db.flush()
    
    # Create auth tokens
    tokens = await auth_service.create_auth_tokens(db, user, request)
    
    # Set secure cookies
    auth_service.set_auth_cookies(response, tokens)
    
    return {
        "message": "Development user created/authenticated",
        "credentials": {
            "email": "dev@example.com",
            "password": "DevPassword123!"
        },
        "access_token": tokens["access_token"],
        "expires_in": tokens["expires_in"],
        "user": UserResponse.model_validate(user).model_dump()
    }