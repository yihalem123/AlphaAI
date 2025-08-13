"""
Enhanced Authentication Service - Production Grade

This module consolidates and enhances the authentication system with:
- Modern security practices
- Comprehensive input validation  
- Rate limiting and abuse prevention
- Secure token management
- Session management with automatic cleanup
- Audit logging
- Multi-factor authentication support

Author: AI Trading Platform Team  
Version: 3.0.0
"""

import os
import secrets
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple, List
from pathlib import Path
from enum import Enum

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, HashingError
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import load_pem_private_key, load_pem_public_key
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, or_
from fastapi import HTTPException, status, Request, Response
from pydantic import BaseModel, EmailStr, Field

from .database import User, UserSession, RefreshToken
from .security import (
    InputValidator, RateLimiter, SecurityMonitor, CSRFProtection, 
    SecurityConfig, SecureUserRegistration, SecureUserLogin, security_monitor
)

# Configure auth logger
auth_logger = logging.getLogger("auth")
auth_logger.setLevel(logging.INFO)


class TokenType(Enum):
    """Token types for different purposes"""
    ACCESS = "access"
    REFRESH = "refresh" 
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"
    MFA = "mfa"


class AuthConfig:
    """Enhanced authentication configuration"""
    
    # JWT Configuration - Production settings
    ACCESS_TOKEN_EXPIRE_MINUTES = 15  # Short-lived for security
    REFRESH_TOKEN_EXPIRE_DAYS = 30    # Reasonable refresh window
    SESSION_EXPIRE_DAYS = 7           # Auto-logout inactive sessions
    EMAIL_VERIFICATION_EXPIRE_HOURS = 24
    PASSWORD_RESET_EXPIRE_HOURS = 1
    MFA_TOKEN_EXPIRE_MINUTES = 5
    
    # Security Settings
    PASSWORD_HASH_TIME_COST = 3       # Argon2 time cost
    PASSWORD_HASH_MEMORY_COST = 65536 # Argon2 memory cost (64MB)
    PASSWORD_HASH_PARALLELISM = 1     # Argon2 parallelism
    
    # Session Management
    MAX_SESSIONS_PER_USER = 5         # Limit concurrent sessions
    SESSION_CLEANUP_INTERVAL_HOURS = 6
    
    # Rate Limiting
    LOGIN_ATTEMPTS_PER_HOUR = 10
    REGISTRATION_ATTEMPTS_PER_HOUR = 3
    PASSWORD_RESET_ATTEMPTS_PER_HOUR = 3
    
    # Cookie Settings
    COOKIE_SECURE = os.getenv("ENV") == "production"
    COOKIE_SAMESITE = "lax"
    COOKIE_HTTPONLY = True
    COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN")
    
    # Encryption
    PRIVATE_KEY_PATH = Path("keys/jwt_private.pem")
    PUBLIC_KEY_PATH = Path("keys/jwt_public.pem")
    
    # Feature Flags
    ENABLE_MFA = True
    ENABLE_EMAIL_VERIFICATION = True
    ENABLE_PASSWORD_HISTORY = True
    REQUIRE_STRONG_PASSWORDS = True


class CryptoService:
    """Enhanced cryptographic operations"""
    
    def __init__(self):
        self.ph = PasswordHasher(
            time_cost=AuthConfig.PASSWORD_HASH_TIME_COST,
            memory_cost=AuthConfig.PASSWORD_HASH_MEMORY_COST, 
            parallelism=AuthConfig.PASSWORD_HASH_PARALLELISM
        )
        self._private_key = None
        self._public_key = None
        self._ensure_keys_exist()
    
    def _ensure_keys_exist(self):
        """Generate RSA key pair if they don't exist"""
        os.makedirs("keys", exist_ok=True)
        
        if not AuthConfig.PRIVATE_KEY_PATH.exists() or not AuthConfig.PUBLIC_KEY_PATH.exists():
            auth_logger.info("🔐 Generating new RSA key pair for JWT signing...")
            
            # Generate 4096-bit key for enhanced security
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=4096,
            )
            
            public_key = private_key.public_key()
            
            # Serialize keys
            private_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )
            
            public_pem = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
            
            # Save with secure permissions
            with open(AuthConfig.PRIVATE_KEY_PATH, 'wb') as f:
                f.write(private_pem)
            os.chmod(AuthConfig.PRIVATE_KEY_PATH, 0o600)  # Owner read only
            
            with open(AuthConfig.PUBLIC_KEY_PATH, 'wb') as f:
                f.write(public_pem)
            os.chmod(AuthConfig.PUBLIC_KEY_PATH, 0o644)   # Public readable
            
            auth_logger.info("✅ RSA keys generated successfully")
    
    def get_private_key(self):
        """Load and cache private key"""
        if self._private_key is None:
            try:
                with open(AuthConfig.PRIVATE_KEY_PATH, 'rb') as f:
                    self._private_key = load_pem_private_key(f.read(), password=None)
            except Exception as e:
                auth_logger.error(f"Failed to load private key: {e}")
                raise
        return self._private_key
    
    def get_public_key(self):
        """Load and cache public key"""
        if self._public_key is None:
            try:
                with open(AuthConfig.PUBLIC_KEY_PATH, 'rb') as f:
                    self._public_key = load_pem_public_key(f.read())
            except Exception as e:
                auth_logger.error(f"Failed to load public key: {e}")
                raise
        return self._public_key
    
    def hash_password(self, password: str) -> str:
        """Hash password using Argon2"""
        try:
            return self.ph.hash(password)
        except HashingError as e:
            auth_logger.error(f"Password hashing failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Password processing failed"
            )
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        try:
            self.ph.verify(password_hash, password)
            return True
        except VerifyMismatchError:
            return False
        except Exception as e:
            auth_logger.error(f"Password verification error: {e}")
            return False
    
    def generate_secure_token(self, length: int = 32) -> str:
        """Generate cryptographically secure random token"""
        return secrets.token_urlsafe(length)
    
    def hash_token(self, token: str) -> str:
        """Hash token for secure storage"""
        return hashlib.sha256(token.encode()).hexdigest()


class JWTService:
    """Enhanced JWT token management"""
    
    def __init__(self, crypto_service: CryptoService):
        self.crypto = crypto_service
    
    def create_token(
        self, 
        user_id: int, 
        token_type: TokenType,
        session_id: Optional[str] = None,
        jti: Optional[str] = None,
        extra_claims: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create JWT token with enhanced security"""
        now = datetime.utcnow()
        
        # Set expiration based on token type
        if token_type == TokenType.ACCESS:
            expire = now + timedelta(minutes=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES)
        elif token_type == TokenType.REFRESH:
            expire = now + timedelta(days=AuthConfig.REFRESH_TOKEN_EXPIRE_DAYS)
        elif token_type == TokenType.EMAIL_VERIFICATION:
            expire = now + timedelta(hours=AuthConfig.EMAIL_VERIFICATION_EXPIRE_HOURS)
        elif token_type == TokenType.PASSWORD_RESET:
            expire = now + timedelta(hours=AuthConfig.PASSWORD_RESET_EXPIRE_HOURS)
        elif token_type == TokenType.MFA:
            expire = now + timedelta(minutes=AuthConfig.MFA_TOKEN_EXPIRE_MINUTES)
        else:
            expire = now + timedelta(minutes=15)  # Default
        
        payload = {
            "sub": str(user_id),                    # Subject (user ID)
            "iat": int(now.timestamp()),            # Issued at
            "exp": int(expire.timestamp()),         # Expiration
            "iss": "ai-trading-platform",           # Issuer
            "aud": "api",                           # Audience
            "type": token_type.value,               # Token type
            "nbf": int(now.timestamp()),            # Not before
        }
        
        # Add optional claims
        if session_id:
            payload["sid"] = session_id
        if jti:
            payload["jti"] = jti
        if extra_claims:
            payload.update(extra_claims)
        
        try:
            return jwt.encode(
                payload, 
                self.crypto.get_private_key(), 
                algorithm="RS256"
            )
        except Exception as e:
            auth_logger.error(f"JWT encoding failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Token generation failed"
            )
    
    def verify_token(self, token: str, expected_type: TokenType) -> Dict[str, Any]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(
                token,
                self.crypto.get_public_key(),
                algorithms=["RS256"],
                audience="api",
                issuer="ai-trading-platform"
            )
            
            # Verify token type
            if payload.get("type") != expected_type.value:
                raise jwt.InvalidTokenError("Invalid token type")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            auth_logger.warning(f"Invalid token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        except Exception as e:
            auth_logger.error(f"Token verification error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token verification failed"
            )


class SessionService:
    """Enhanced session management with cleanup"""
    
    def __init__(self, crypto_service: CryptoService):
        self.crypto = crypto_service
    
    async def create_session(
        self, 
        db: AsyncSession, 
        user_id: int, 
        ip_address: str, 
        user_agent: str,
        remember_me: bool = False
    ) -> UserSession:
        """Create new user session with automatic cleanup"""
        
        # Clean up old sessions for this user
        await self._cleanup_old_sessions(db, user_id)
        
        # Set expiration based on remember_me
        if remember_me:
            expires_at = datetime.utcnow() + timedelta(days=AuthConfig.REFRESH_TOKEN_EXPIRE_DAYS)
        else:
            expires_at = datetime.utcnow() + timedelta(days=AuthConfig.SESSION_EXPIRE_DAYS)
        
        session = UserSession(
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent[:500],  # Truncate long user agents
            expires_at=expires_at
        )
        
        db.add(session)
        await db.flush()  # Get the generated session_id
        
        auth_logger.info(f"Created session {session.session_id} for user {user_id}")
        return session
    
    async def _cleanup_old_sessions(self, db: AsyncSession, user_id: int):
        """Remove old/expired sessions for user"""
        # Get user's sessions ordered by creation date
        result = await db.execute(
            select(UserSession)
            .where(UserSession.user_id == user_id)
            .order_by(UserSession.created_at.desc())
        )
        sessions = result.scalars().all()
        
        # Keep only the most recent sessions
        sessions_to_keep = []
        sessions_to_remove = []
        
        for session in sessions:
            # Remove expired sessions
            if session.expires_at < datetime.utcnow() or not session.is_active:
                sessions_to_remove.append(session)
            # Keep recent active sessions up to limit
            elif len(sessions_to_keep) < AuthConfig.MAX_SESSIONS_PER_USER:
                sessions_to_keep.append(session)
            # Remove excess sessions
            else:
                sessions_to_remove.append(session)
        
        # Revoke old sessions
        for session in sessions_to_remove:
            await self.revoke_session(db, session.session_id)
    
    async def get_active_session(
        self, 
        db: AsyncSession, 
        session_id: str
    ) -> Optional[UserSession]:
        """Get active session by ID"""
        result = await db.execute(
            select(UserSession)
            .where(
                and_(
                    UserSession.session_id == session_id,
                    UserSession.is_active == True,
                    UserSession.expires_at > datetime.utcnow(),
                    UserSession.revoked_at.is_(None)
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def update_session_activity(
        self, 
        db: AsyncSession, 
        session_id: str,
        ip_address: Optional[str] = None
    ):
        """Update session last activity and optionally IP"""
        update_values = {"last_activity": datetime.utcnow()}
        if ip_address:
            update_values["ip_address"] = ip_address
        
        await db.execute(
            update(UserSession)
            .where(UserSession.session_id == session_id)
            .values(**update_values)
        )
    
    async def revoke_session(
        self, 
        db: AsyncSession, 
        session_id: str
    ):
        """Revoke a session and all associated tokens"""
        await db.execute(
            update(UserSession)
            .where(UserSession.session_id == session_id)
            .values(
                is_active=False,
                revoked_at=datetime.utcnow()
            )
        )
        
        # Revoke all refresh tokens for this session
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.session_id == session_id)
            .values(
                is_active=False,
                revoked_at=datetime.utcnow()
            )
        )
        
        auth_logger.info(f"Revoked session {session_id}")
    
    async def revoke_all_user_sessions(
        self, 
        db: AsyncSession, 
        user_id: int,
        except_session_id: Optional[str] = None
    ):
        """Revoke all sessions for a user (except optionally one)"""
        conditions = [UserSession.user_id == user_id]
        if except_session_id:
            conditions.append(UserSession.session_id != except_session_id)
        
        result = await db.execute(
            select(UserSession.session_id).where(and_(*conditions))
        )
        session_ids = [row[0] for row in result.fetchall()]
        
        for session_id in session_ids:
            await self.revoke_session(db, session_id)
        
        auth_logger.info(f"Revoked {len(session_ids)} sessions for user {user_id}")


class EnhancedAuthService:
    """Main enhanced authentication service"""
    
    def __init__(self):
        self.crypto = CryptoService()
        self.jwt = JWTService(self.crypto)
        self.sessions = SessionService(self.crypto)
    
    async def register_user(
        self,
        db: AsyncSession,
        registration_data: SecureUserRegistration,
        request: Request
    ) -> Tuple[User, Dict[str, Any]]:
        """Register new user with comprehensive validation"""
        
        # Rate limiting check
        client_ip = request.client.host if request.client else 'unknown'
        from core.rate_limiter import rate_limiter
        rate_limit_result = await rate_limiter.check_rate_limit(f"registration:{client_ip}", "auth_register")
        if not rate_limit_result.allowed:
            security_monitor.log_security_event(
                "registration_rate_limit",
                {"ip": client_ip, "email": registration_data.email},
                ip_address=client_ip
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many registration attempts. Please try again later."
            )
        
        # Check if user already exists
        result = await db.execute(
            select(User).where(
                or_(
                    User.email == registration_data.email,
                    User.username == registration_data.username
                )
            )
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            security_monitor.log_security_event(
                "duplicate_registration",
                {"email": registration_data.email, "username": registration_data.username},
                ip_address=client_ip
            )
            # Don't reveal which field conflicts for security
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email or username already exists"
            )
        
        # Hash password
        password_hash = self.crypto.hash_password(registration_data.password)
        
        # Create user
        user = User(
            email=registration_data.email,
            username=registration_data.username,
            password_hash=password_hash,
            subscription_tier="free",
            daily_limit=SecurityConfig.RATE_LIMIT_PER_HOUR,
            email_verified=not AuthConfig.ENABLE_EMAIL_VERIFICATION,  # Auto-verify if disabled
            created_at=datetime.utcnow()
        )
        
        db.add(user)
        await db.flush()  # Get user ID
        
        # Create initial session and tokens
        tokens = await self.create_auth_tokens(db, user, request)
        
        # Log successful registration
        security_monitor.log_security_event(
            "user_registered",
            {"user_id": user.id, "email": user.email},
            ip_address=client_ip
        )
        
        await db.commit()
        return user, tokens
    
    async def authenticate_user(
        self, 
        db: AsyncSession, 
        login_data: SecureUserLogin,
        request: Request
    ) -> Optional[User]:
        """Authenticate user with enhanced security"""
        
        client_ip = request.client.host if request.client else 'unknown'
        
        # Rate limiting checks
        from core.rate_limiter import rate_limiter
        rate_limit_result = await rate_limiter.check_rate_limit(f"login:{client_ip}:{login_data.email}", "auth_login")
        if not rate_limit_result.allowed:
            security_monitor.log_security_event(
                "login_rate_limit",
                {"ip": client_ip, "email": login_data.email},
                ip_address=client_ip
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed login attempts. Please try again later."
            )
        
        # Get user
        result = await db.execute(
            select(User).where(
                and_(
                    User.email == login_data.email,
                    User.is_active == True
                )
            )
        )
        user = result.scalar_one_or_none()
        
        if not user or not user.password_hash:
            # Record failed login attempt
            await rate_limiter.check_rate_limit(f"failed_login:{client_ip}:{login_data.email}", "auth_login")
            security_monitor.log_security_event(
                "login_failed_user_not_found",
                {"email": login_data.email},
                ip_address=client_ip
            )
            # Use generic error to prevent user enumeration
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if account is locked
        if user.locked_until and user.locked_until > datetime.utcnow():
            security_monitor.log_security_event(
                "login_account_locked",
                {"user_id": user.id, "locked_until": user.locked_until.isoformat()},
                ip_address=client_ip
            )
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account temporarily locked. Please try again later."
            )
        
        # Verify password
        # Debug password verification
        auth_logger.info(f"🔍 Attempting password verification for user: {user.email}")
        auth_logger.info(f"🔍 User has password hash: {bool(user.password_hash)}")
        auth_logger.info(f"🔍 Password hash length: {len(user.password_hash) if user.password_hash else 0}")
        
        password_valid = self.crypto.verify_password(login_data.password, user.password_hash)
        auth_logger.info(f"🔍 Password verification result: {password_valid}")
        
        if not password_valid:
            # Increment failed attempts
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= SecurityConfig.LOGIN_ATTEMPTS_LIMIT:
                user.locked_until = datetime.utcnow() + timedelta(
                    minutes=SecurityConfig.LOCKOUT_DURATION_MINUTES
                )
                security_monitor.log_security_event(
                    "account_locked",
                    {"user_id": user.id, "failed_attempts": user.failed_login_attempts},
                    ip_address=client_ip
                )
            
            # Record failed login attempt
            await rate_limiter.check_rate_limit(f"failed_login:{client_ip}:{login_data.email}", "auth_login")
            await db.commit()
            
            security_monitor.log_security_event(
                "login_failed_invalid_password",
                {"user_id": user.id, "failed_attempts": user.failed_login_attempts},
                ip_address=client_ip
            )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Reset failed attempts on successful login
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login = datetime.utcnow()
        
        security_monitor.log_security_event(
            "login_successful",
            {"user_id": user.id},
            ip_address=client_ip
        )
        
        await db.commit()
        return user
    
    async def create_auth_tokens(
        self,
        db: AsyncSession,
        user: User,
        request: Request,
        remember_me: bool = False
    ) -> Dict[str, Any]:
        """Create access and refresh tokens for user"""
        
        # Get client information
        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Create session
        session = await self.sessions.create_session(
            db, user.id, ip_address, user_agent, remember_me
        )
        
        # Generate correlation ID for tokens
        jti = self.crypto.generate_secure_token(16)
        
        # Create access token
        access_token = self.jwt.create_token(
            user.id, 
            TokenType.ACCESS, 
            session.session_id, 
            jti
        )
        
        # Create refresh token (opaque)
        refresh_token_raw = self.crypto.generate_secure_token(64)
        refresh_token_hash = self.crypto.hash_token(refresh_token_raw)
        
        # Store refresh token
        refresh_token_obj = RefreshToken(
            user_id=user.id,
            session_id=session.session_id,
            token_hash=refresh_token_hash,
            jti=jti,
            expires_at=session.expires_at
        )
        
        db.add(refresh_token_obj)
        await db.commit()
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token_raw,
            "token_type": "Bearer",
            "expires_in": AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "session_id": session.session_id
        }
    
    def set_auth_cookies(self, response: Response, tokens: Dict[str, Any]):
        """Set secure HTTP-only cookies for tokens"""
        
        # Access token cookie (short-lived)
        response.set_cookie(
            key="access_token",
            value=tokens["access_token"],
            max_age=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            httponly=AuthConfig.COOKIE_HTTPONLY,
            secure=AuthConfig.COOKIE_SECURE,
            samesite=AuthConfig.COOKIE_SAMESITE,
            domain=AuthConfig.COOKIE_DOMAIN,
            path="/"
        )
        
        # Refresh token cookie (long-lived, restricted path)
        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            max_age=AuthConfig.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            httponly=AuthConfig.COOKIE_HTTPONLY,
            secure=AuthConfig.COOKIE_SECURE,
            samesite=AuthConfig.COOKIE_SAMESITE,
            domain=AuthConfig.COOKIE_DOMAIN,
            path="/"  # Make available to all API routes for silent refresh
        )
        # Also set legacy path to support older flows
        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            max_age=AuthConfig.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            httponly=AuthConfig.COOKIE_HTTPONLY,
            secure=AuthConfig.COOKIE_SECURE,
            samesite=AuthConfig.COOKIE_SAMESITE,
            domain=AuthConfig.COOKIE_DOMAIN,
            path="/api/auth"
        )
    
    def clear_auth_cookies(self, response: Response):
        """Clear authentication cookies"""
        cookie_settings = {
            "httponly": AuthConfig.COOKIE_HTTPONLY,
            "secure": AuthConfig.COOKIE_SECURE,
            "samesite": AuthConfig.COOKIE_SAMESITE,
            "domain": AuthConfig.COOKIE_DOMAIN
        }
        
        response.delete_cookie(key="access_token", path="/", **cookie_settings)
        # Delete refresh cookie at both legacy and new paths
        response.delete_cookie(key="refresh_token", path="/api/auth", **cookie_settings)
        response.delete_cookie(key="refresh_token", path="/", **cookie_settings)
    
    async def logout_user(
        self,
        db: AsyncSession,
        session_id: str,
        response: Response,
        logout_all_sessions: bool = False
    ):
        """Logout user and clean up session/tokens"""
        
        if logout_all_sessions:
            # Get user_id from session
            result = await db.execute(
                select(UserSession.user_id).where(UserSession.session_id == session_id)
            )
            user_id = result.scalar_one_or_none()
            
            if user_id:
                await self.sessions.revoke_all_user_sessions(db, user_id)
        else:
            await self.sessions.revoke_session(db, session_id)
        
        self.clear_auth_cookies(response)
        await db.commit()
        
        auth_logger.info(f"User logged out - session: {session_id}, all_sessions: {logout_all_sessions}")

    async def refresh_user_tokens(
        self, 
        db: AsyncSession, 
        refresh_token: str, 
        request: Request
    ) -> Tuple[User, Dict[str, Any]]:
        """Refresh user tokens using refresh token"""
        
        try:
            # Find refresh token in database
            # Hash the provided token to compare with stored hash
            token_hash = self.crypto.hash_token(refresh_token)
            
            result = await db.execute(
                select(RefreshToken, User).join(User).where(
                    and_(
                        RefreshToken.token_hash == token_hash,
                        RefreshToken.expires_at > datetime.utcnow(),
                        RefreshToken.is_active == True,
                        RefreshToken.revoked_at.is_(None),
                        User.is_active == True
                    )
                )
            )
            
            token_user_pair = result.first()
            if not token_user_pair:
                auth_logger.warning(f"Invalid or expired refresh token used")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired refresh token"
                )
            
            refresh_token_obj, user = token_user_pair
            
            # Log refresh attempt
            client_ip = request.client.host if request.client else "unknown"
            security_monitor.log_security_event(
                "token_refresh",
                {"user_id": user.id, "email": user.email},
                ip_address=client_ip
            )
            
            # Revoke old refresh token (rotation)
            refresh_token_obj.is_active = False
            refresh_token_obj.revoked_at = datetime.utcnow()
            
            # Create new tokens
            new_tokens = await self.create_auth_tokens(db, user, request, remember_me=True)
            
            await db.commit()
            
            auth_logger.info(f"Successfully refreshed tokens for user: {user.email}")
            return user, new_tokens
            
        except HTTPException:
            raise
        except Exception as e:
            auth_logger.error(f"Token refresh error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token refresh failed"
            )


# Global service instance
enhanced_auth_service = EnhancedAuthService()

# Initialize auth logger
if not auth_logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    auth_logger.addHandler(handler)
