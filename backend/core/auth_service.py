"""
Production-grade authentication service with JWT access tokens, rotating refresh tokens,
and secure session management.
"""

import os
import secrets
import hashlib
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from pathlib import Path

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, HashingError
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import load_pem_private_key, load_pem_public_key
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status, Request
from fastapi.responses import Response

from .database import User, UserSession, RefreshToken


class AuthConfig:
    """Authentication configuration"""
    
    # JWT Configuration
    ACCESS_TOKEN_EXPIRE_MINUTES = 10  # Short-lived access tokens
    REFRESH_TOKEN_EXPIRE_DAYS = 60   # Long-lived refresh tokens
    SESSION_EXPIRE_DAYS = 30         # Session duration
    
    # Security
    PASSWORD_HASH_ROUNDS = 12
    CSRF_TOKEN_LENGTH = 32
    REFRESH_TOKEN_LENGTH = 64
    
    # Rate limiting
    MAX_FAILED_ATTEMPTS = 5
    LOCKOUT_DURATION_MINUTES = 15
    
    # Cookie settings
    COOKIE_SECURE = True  # Set to False for development over HTTP
    COOKIE_SAMESITE = "lax"
    COOKIE_HTTPONLY = True
    
    # RSA Key paths
    PRIVATE_KEY_PATH = Path("keys/jwt_private.pem")
    PUBLIC_KEY_PATH = Path("keys/jwt_public.pem")


class CryptoService:
    """Cryptographic operations service"""
    
    def __init__(self):
        self.ph = PasswordHasher()
        self._private_key = None
        self._public_key = None
        self._ensure_keys_exist()
    
    def _ensure_keys_exist(self):
        """Generate RSA key pair if they don't exist"""
        os.makedirs("keys", exist_ok=True)
        
        if not AuthConfig.PRIVATE_KEY_PATH.exists() or not AuthConfig.PUBLIC_KEY_PATH.exists():
            print("🔐 Generating RSA key pair for JWT signing...")
            
            # Generate private key
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
            )
            
            # Get public key
            public_key = private_key.public_key()
            
            # Serialize private key
            private_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )
            
            # Serialize public key
            public_pem = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
            
            # Save keys
            with open(AuthConfig.PRIVATE_KEY_PATH, 'wb') as f:
                f.write(private_pem)
            
            with open(AuthConfig.PUBLIC_KEY_PATH, 'wb') as f:
                f.write(public_pem)
            
            print("✅ RSA keys generated and saved")
    
    def get_private_key(self):
        """Load and return private key"""
        if self._private_key is None:
            with open(AuthConfig.PRIVATE_KEY_PATH, 'rb') as f:
                self._private_key = load_pem_private_key(f.read(), password=None)
        return self._private_key
    
    def get_public_key(self):
        """Load and return public key"""
        if self._public_key is None:
            with open(AuthConfig.PUBLIC_KEY_PATH, 'rb') as f:
                self._public_key = load_pem_public_key(f.read())
        return self._public_key
    
    def hash_password(self, password: str) -> str:
        """Hash password using Argon2"""
        try:
            return self.ph.hash(password)
        except HashingError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Password hashing failed"
            )
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        try:
            self.ph.verify(password_hash, password)
            return True
        except VerifyMismatchError:
            return False
    
    def generate_secure_token(self, length: int = 32) -> str:
        """Generate cryptographically secure random token"""
        return secrets.token_urlsafe(length)
    
    def hash_token(self, token: str) -> str:
        """Hash token for database storage"""
        return hashlib.sha256(token.encode()).hexdigest()


class JWTService:
    """JWT token management service"""
    
    def __init__(self, crypto_service: CryptoService):
        self.crypto = crypto_service
    
    def create_access_token(self, user_id: int, session_id: str, jti: str) -> str:
        """Create short-lived RS256 JWT access token"""
        now = datetime.utcnow()
        expire = now + timedelta(minutes=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        payload = {
            "sub": str(user_id),         # Subject (user ID)
            "sid": session_id,           # Session ID
            "jti": jti,                  # JWT ID (for refresh token correlation)
            "iat": int(now.timestamp()), # Issued at
            "exp": int(expire.timestamp()), # Expiration
            "iss": "ai-trading-platform",   # Issuer
            "aud": "api",                   # Audience
            "type": "access"                # Token type
        }
        
        return jwt.encode(
            payload, 
            self.crypto.get_private_key(), 
            algorithm="RS256"
        )
    
    def verify_access_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode access token"""
        try:
            payload = jwt.decode(
                token,
                self.crypto.get_public_key(),
                algorithms=["RS256"],
                audience="api",
                issuer="ai-trading-platform"
            )
            
            if payload.get("type") != "access":
                raise jwt.InvalidTokenError("Invalid token type")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Access token expired"
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid access token: {str(e)}"
            )


class SessionService:
    """Session management service"""
    
    def __init__(self, crypto_service: CryptoService):
        self.crypto = crypto_service
    
    async def create_session(
        self, 
        db: AsyncSession, 
        user_id: int, 
        ip_address: str, 
        user_agent: str
    ) -> UserSession:
        """Create new user session"""
        session = UserSession(
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.add(session)
        await db.flush()  # Get the generated session_id
        return session
    
    async def get_active_session(
        self, 
        db: AsyncSession, 
        session_id: str
    ) -> Optional[UserSession]:
        """Get active session by ID"""
        result = await db.execute(
            select(UserSession)
            .where(
                UserSession.session_id == session_id,
                UserSession.is_active == True,
                UserSession.expires_at > datetime.utcnow(),
                UserSession.revoked_at.is_(None)
            )
        )
        return result.scalar_one_or_none()
    
    async def update_session_activity(
        self, 
        db: AsyncSession, 
        session_id: str
    ):
        """Update session last activity"""
        await db.execute(
            update(UserSession)
            .where(UserSession.session_id == session_id)
            .values(last_activity=datetime.utcnow())
        )
    
    async def revoke_session(
        self, 
        db: AsyncSession, 
        session_id: str
    ):
        """Revoke a session"""
        await db.execute(
            update(UserSession)
            .where(UserSession.session_id == session_id)
            .values(
                is_active=False,
                revoked_at=datetime.utcnow()
            )
        )
        
        # Also revoke all refresh tokens for this session
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.session_id == session_id)
            .values(
                is_active=False,
                revoked_at=datetime.utcnow()
            )
        )


class RefreshTokenService:
    """Refresh token management with rotation"""
    
    def __init__(self, crypto_service: CryptoService):
        self.crypto = crypto_service
    
    def generate_refresh_token(self) -> Tuple[str, str]:
        """Generate opaque refresh token and its hash"""
        token = self.crypto.generate_secure_token(AuthConfig.REFRESH_TOKEN_LENGTH)
        token_hash = self.crypto.hash_token(token)
        return token, token_hash
    
    async def create_refresh_token(
        self,
        db: AsyncSession,
        user_id: int,
        session_id: str,
        jti: str
    ) -> Tuple[str, RefreshToken]:
        """Create new refresh token"""
        token, token_hash = self.generate_refresh_token()
        
        refresh_token = RefreshToken(
            user_id=user_id,
            session_id=session_id,
            token_hash=token_hash,
            jti=jti
        )
        
        db.add(refresh_token)
        return token, refresh_token
    
    async def rotate_refresh_token(
        self,
        db: AsyncSession,
        old_token: str,
        new_jti: str
    ) -> Tuple[Optional[str], Optional[RefreshToken]]:
        """Rotate refresh token (mark old as used, create new)"""
        old_token_hash = self.crypto.hash_token(old_token)
        
        # Find and validate old token
        result = await db.execute(
            select(RefreshToken)
            .where(
                RefreshToken.token_hash == old_token_hash,
                RefreshToken.is_active == True,
                RefreshToken.expires_at > datetime.utcnow(),
                RefreshToken.used_at.is_(None),
                RefreshToken.revoked_at.is_(None)
            )
        )
        old_refresh_token = result.scalar_one_or_none()
        
        if not old_refresh_token:
            # Token reuse detected - revoke all tokens for this session
            await self._handle_token_reuse(db, old_token_hash)
            return None, None
        
        # Mark old token as used
        old_refresh_token.used_at = datetime.utcnow()
        old_refresh_token.is_active = False
        
        # Create new token
        new_token, new_token_hash = self.generate_refresh_token()
        new_refresh_token = RefreshToken(
            user_id=old_refresh_token.user_id,
            session_id=old_refresh_token.session_id,
            token_hash=new_token_hash,
            jti=new_jti
        )
        
        # Link tokens for audit trail
        old_refresh_token.replaced_by = new_refresh_token.id
        
        db.add(new_refresh_token)
        return new_token, new_refresh_token
    
    async def _handle_token_reuse(self, db: AsyncSession, token_hash: str):
        """Handle refresh token reuse - security breach"""
        # Find the compromised token
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        compromised_token = result.scalar_one_or_none()
        
        if compromised_token:
            # Revoke all tokens for this session
            await db.execute(
                update(RefreshToken)
                .where(RefreshToken.session_id == compromised_token.session_id)
                .values(
                    is_active=False,
                    revoked_at=datetime.utcnow()
                )
            )
            
            # Revoke the session itself
            await db.execute(
                update(UserSession)
                .where(UserSession.session_id == compromised_token.session_id)
                .values(
                    is_active=False,
                    revoked_at=datetime.utcnow()
                )
            )


class AuthService:
    """Main authentication service"""
    
    def __init__(self):
        self.crypto = CryptoService()
        self.jwt = JWTService(self.crypto)
        self.sessions = SessionService(self.crypto)
        self.refresh_tokens = RefreshTokenService(self.crypto)
    
    async def authenticate_user(
        self, 
        db: AsyncSession, 
        email: str, 
        password: str
    ) -> Optional[User]:
        """Authenticate user with email/password"""
        # Get user
        result = await db.execute(
            select(User).where(User.email == email, User.is_active == True)
        )
        user = result.scalar_one_or_none()
        
        if not user or not user.password_hash:
            return None
        
        # Check if account is locked
        if user.locked_until and user.locked_until > datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account temporarily locked due to failed login attempts"
            )
        
        # Verify password
        if not self.crypto.verify_password(password, user.password_hash):
            # Increment failed attempts
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= AuthConfig.MAX_FAILED_ATTEMPTS:
                user.locked_until = datetime.utcnow() + timedelta(
                    minutes=AuthConfig.LOCKOUT_DURATION_MINUTES
                )
            await db.commit()
            return None
        
        # Reset failed attempts on successful login
        user.failed_login_attempts = 0
        user.locked_until = None
        await db.commit()
        
        return user
    
    async def create_auth_tokens(
        self,
        db: AsyncSession,
        user: User,
        request: Request
    ) -> Dict[str, Any]:
        """Create access and refresh tokens for user"""
        # Create session
        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        session = await self.sessions.create_session(
            db, user.id, ip_address, user_agent
        )
        
        # Generate JTI for token correlation
        jti = self.crypto.generate_secure_token(16)
        
        # Create tokens
        access_token = self.jwt.create_access_token(user.id, session.session_id, jti)
        refresh_token, refresh_token_obj = await self.refresh_tokens.create_refresh_token(
            db, user.id, session.session_id, jti
        )
        
        await db.commit()
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "session_id": session.session_id,
            "expires_in": AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "token_type": "Bearer"
        }
    
    async def refresh_access_token(
        self,
        db: AsyncSession,
        refresh_token: str
    ) -> Optional[Dict[str, Any]]:
        """Refresh access token using refresh token"""
        # Generate new JTI
        new_jti = self.crypto.generate_secure_token(16)
        
        # Rotate refresh token
        new_refresh_token, refresh_token_obj = await self.refresh_tokens.rotate_refresh_token(
            db, refresh_token, new_jti
        )
        
        if not new_refresh_token or not refresh_token_obj:
            # Token reuse detected
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token - session revoked for security"
            )
        
        # Create new access token
        access_token = self.jwt.create_access_token(
            refresh_token_obj.user_id,
            refresh_token_obj.session_id,
            new_jti
        )
        
        await db.commit()
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "expires_in": AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "token_type": "Bearer"
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
            path="/"
        )
        
        # Refresh token cookie (long-lived)
        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            max_age=AuthConfig.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            httponly=AuthConfig.COOKIE_HTTPONLY,
            secure=AuthConfig.COOKIE_SECURE,
            samesite=AuthConfig.COOKIE_SAMESITE,
            path="/api/auth"  # Restrict to auth endpoints
        )
    
    def clear_auth_cookies(self, response: Response):
        """Clear authentication cookies"""
        response.delete_cookie(
            key="access_token",
            path="/",
            httponly=AuthConfig.COOKIE_HTTPONLY,
            secure=AuthConfig.COOKIE_SECURE,
            samesite=AuthConfig.COOKIE_SAMESITE
        )
        
        response.delete_cookie(
            key="refresh_token",
            path="/api/auth",
            httponly=AuthConfig.COOKIE_HTTPONLY,
            secure=AuthConfig.COOKIE_SECURE,
            samesite=AuthConfig.COOKIE_SAMESITE
        )
    
    async def logout_user(
        self,
        db: AsyncSession,
        session_id: str,
        response: Response
    ):
        """Logout user and revoke session"""
        await self.sessions.revoke_session(db, session_id)
        self.clear_auth_cookies(response)
        await db.commit()


# Global auth service instance
auth_service = AuthService()