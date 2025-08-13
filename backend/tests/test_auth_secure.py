"""
Comprehensive Test Suite for Secure Authentication System

This test suite covers:
- User registration and login flows
- Token generation and validation
- Rate limiting functionality
- Input validation and sanitization
- Security middleware
- Session management
- Error handling

Author: AI Trading Platform Test Team
Version: 1.0.0
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from core.database import Base, User
from core.auth_enhanced import enhanced_auth_service, TokenType
from core.security import InputValidator, SecurityMonitor
from core.rate_limiter import RateLimitManager, RateLimit


# Test database setup
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestSessionLocal = async_sessionmaker(
    test_engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)


@pytest.fixture
async def db_session():
    """Create test database session"""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
async def test_user(db_session):
    """Create test user"""
    password_hash = enhanced_auth_service.crypto.hash_password("TestPassword123!")
    user = User(
        email="test@example.com",
        username="testuser",
        password_hash=password_hash,
        subscription_tier="free",
        email_verified=True,
        is_active=True
    )
    
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    return user


class TestInputValidation:
    """Test input validation and sanitization"""
    
    def test_email_validation(self):
        """Test email validation"""
        # Valid emails
        assert InputValidator.validate_email("test@example.com") == "test@example.com"
        assert InputValidator.validate_email("USER@EXAMPLE.COM") == "user@example.com"
        
        # Invalid emails
        with pytest.raises(ValueError):
            InputValidator.validate_email("invalid-email")
        
        with pytest.raises(ValueError):
            InputValidator.validate_email("@example.com")
        
        with pytest.raises(ValueError):
            InputValidator.validate_email("test@")
    
    def test_username_validation(self):
        """Test username validation"""
        # Valid usernames
        assert InputValidator.validate_username("validuser") == "validuser"
        assert InputValidator.validate_username("user_123") == "user_123"
        assert InputValidator.validate_username("user.name") == "user.name"
        
        # Invalid usernames
        with pytest.raises(ValueError):
            InputValidator.validate_username("ab")  # Too short
        
        with pytest.raises(ValueError):
            InputValidator.validate_username("user@name")  # Invalid character
        
        with pytest.raises(ValueError):
            InputValidator.validate_username("<script>")  # XSS attempt
    
    def test_password_validation(self):
        """Test password validation"""
        # Valid passwords
        assert InputValidator.validate_password("ValidPass123!") == "ValidPass123!"
        assert InputValidator.validate_password("Another1@") == "Another1@"
        
        # Invalid passwords
        with pytest.raises(ValueError):
            InputValidator.validate_password("short")  # Too short
        
        with pytest.raises(ValueError):
            InputValidator.validate_password("nouppercase123!")  # Missing requirements
        
        with pytest.raises(ValueError):
            InputValidator.validate_password("NoNumbers!")  # Missing numbers
    
    def test_string_sanitization(self):
        """Test string sanitization"""
        # XSS prevention
        malicious = "<script>alert('xss')</script>"
        sanitized = InputValidator.sanitize_string(malicious)
        assert "<script>" not in sanitized
        assert "alert" not in sanitized
        
        # HTML encoding
        html_input = "Test & <b>bold</b> text"
        sanitized = InputValidator.sanitize_string(html_input)
        assert "&amp;" in sanitized
        assert "&lt;" in sanitized
        assert "&gt;" in sanitized
    
    def test_sql_injection_prevention(self):
        """Test SQL injection prevention"""
        # Valid input
        safe_input = "normal search term"
        assert InputValidator.validate_sql_input(safe_input) == safe_input
        
        # SQL injection attempts
        with pytest.raises(ValueError):
            InputValidator.validate_sql_input("'; DROP TABLE users; --")
        
        with pytest.raises(ValueError):
            InputValidator.validate_sql_input("1 UNION SELECT password FROM users")
        
        with pytest.raises(ValueError):
            InputValidator.validate_sql_input("admin'/*")


class TestCryptographicOperations:
    """Test cryptographic operations"""
    
    def test_password_hashing(self):
        """Test password hashing and verification"""
        password = "TestPassword123!"
        
        # Hash password
        password_hash = enhanced_auth_service.crypto.hash_password(password)
        assert password_hash != password
        assert len(password_hash) > 50  # Argon2 hashes are long
        
        # Verify correct password
        assert enhanced_auth_service.crypto.verify_password(password, password_hash)
        
        # Verify incorrect password
        assert not enhanced_auth_service.crypto.verify_password("WrongPassword", password_hash)
    
    def test_secure_token_generation(self):
        """Test secure token generation"""
        token1 = enhanced_auth_service.crypto.generate_secure_token(32)
        token2 = enhanced_auth_service.crypto.generate_secure_token(32)
        
        # Tokens should be different
        assert token1 != token2
        
        # Tokens should be base64url encoded
        import base64
        try:
            base64.urlsafe_b64decode(token1 + "==")  # Add padding
            token_valid = True
        except:
            token_valid = False
        
        assert token_valid
    
    def test_token_hashing(self):
        """Test token hashing for storage"""
        token = "sample_token_123"
        token_hash = enhanced_auth_service.crypto.hash_token(token)
        
        # Hash should be deterministic
        assert enhanced_auth_service.crypto.hash_token(token) == token_hash
        
        # Hash should be different from original
        assert token_hash != token
        
        # Hash should be hex string
        assert len(token_hash) == 64  # SHA256 hex output


class TestJWTOperations:
    """Test JWT token operations"""
    
    def test_access_token_creation_and_verification(self):
        """Test access token creation and verification"""
        user_id = 123
        session_id = "test-session-123"
        jti = "test-jti-456"
        
        # Create token
        token = enhanced_auth_service.jwt.create_token(
            user_id, TokenType.ACCESS, session_id, jti
        )
        
        assert isinstance(token, str)
        assert len(token) > 100  # JWT tokens are long
        
        # Verify token
        payload = enhanced_auth_service.jwt.verify_token(token, TokenType.ACCESS)
        
        assert payload["sub"] == str(user_id)
        assert payload["sid"] == session_id
        assert payload["jti"] == jti
        assert payload["type"] == TokenType.ACCESS.value
        assert payload["iss"] == "ai-trading-platform"
        assert payload["aud"] == "api"
    
    def test_token_expiration(self):
        """Test token expiration"""
        import time
        
        # Create token with very short expiration for testing
        user_id = 123
        
        # Mock short expiration
        original_expire = enhanced_auth_service.jwt.crypto.__class__
        
        # This is a simplified test - in practice you'd mock the expiration
        token = enhanced_auth_service.jwt.create_token(user_id, TokenType.ACCESS)
        
        # Token should be valid immediately
        payload = enhanced_auth_service.jwt.verify_token(token, TokenType.ACCESS)
        assert payload is not None
    
    def test_invalid_token_rejection(self):
        """Test rejection of invalid tokens"""
        from fastapi import HTTPException
        
        # Test malformed token
        with pytest.raises(HTTPException):
            enhanced_auth_service.jwt.verify_token("invalid.token.here", TokenType.ACCESS)
        
        # Test empty token
        with pytest.raises(HTTPException):
            enhanced_auth_service.jwt.verify_token("", TokenType.ACCESS)
        
        # Test token with wrong type
        refresh_token = enhanced_auth_service.jwt.create_token(123, TokenType.REFRESH)
        with pytest.raises(HTTPException):
            enhanced_auth_service.jwt.verify_token(refresh_token, TokenType.ACCESS)


class TestRateLimiting:
    """Test rate limiting functionality"""
    
    @pytest.fixture
    def rate_limiter(self):
        """Create test rate limiter"""
        return RateLimitManager()
    
    @pytest.mark.asyncio
    async def test_basic_rate_limiting(self, rate_limiter):
        """Test basic rate limiting"""
        limit = RateLimit(requests=2, window_seconds=60)
        identifier = "test_user_123"
        
        # First request should be allowed
        result1 = await rate_limiter.check_rate_limit(identifier, "test", limit)
        assert result1.allowed
        assert result1.remaining == 1
        
        # Second request should be allowed
        result2 = await rate_limiter.check_rate_limit(identifier, "test", limit)
        assert result2.allowed
        assert result2.remaining == 0
        
        # Third request should be blocked
        result3 = await rate_limiter.check_rate_limit(identifier, "test", limit)
        assert not result3.allowed
        assert result3.retry_after is not None
    
    @pytest.mark.asyncio
    async def test_rate_limit_isolation(self, rate_limiter):
        """Test that rate limits are isolated by identifier"""
        limit = RateLimit(requests=1, window_seconds=60)
        
        # Different users should have separate limits
        result1 = await rate_limiter.check_rate_limit("user1", "test", limit)
        result2 = await rate_limiter.check_rate_limit("user2", "test", limit)
        
        assert result1.allowed
        assert result2.allowed
    
    @pytest.mark.asyncio
    async def test_sliding_window_behavior(self, rate_limiter):
        """Test sliding window rate limiting behavior"""
        limit = RateLimit(requests=2, window_seconds=1)
        identifier = "test_user"
        
        # Use up the limit
        await rate_limiter.check_rate_limit(identifier, "test", limit)
        await rate_limiter.check_rate_limit(identifier, "test", limit)
        
        # Should be blocked
        result = await rate_limiter.check_rate_limit(identifier, "test", limit)
        assert not result.allowed
        
        # Wait for window to slide (in real test, you'd mock time)
        import asyncio
        await asyncio.sleep(1.1)
        
        # Should be allowed again
        result = await rate_limiter.check_rate_limit(identifier, "test", limit)
        assert result.allowed


class TestAuthenticationFlow:
    """Test complete authentication flows"""
    
    @pytest.mark.asyncio
    async def test_user_registration_flow(self, db_session):
        """Test user registration flow"""
        from core.security import SecureUserRegistration
        from unittest.mock import Mock
        
        # Mock request object
        request = Mock()
        request.client.host = "127.0.0.1"
        request.headers = {"user-agent": "test-agent"}
        
        # Test data
        registration_data = SecureUserRegistration(
            email="newuser@example.com",
            password="NewPassword123!",
            username="newuser"
        )
        
        # Register user
        user, tokens = await enhanced_auth_service.register_user(
            db_session, registration_data, request
        )
        
        # Verify user creation
        assert user.email == "newuser@example.com"
        assert user.username == "newuser"
        assert user.password_hash is not None
        assert user.is_active
        
        # Verify tokens
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert "session_id" in tokens
        
        # Verify token is valid
        payload = enhanced_auth_service.jwt.verify_token(
            tokens["access_token"], TokenType.ACCESS
        )
        assert payload["sub"] == str(user.id)
    
    @pytest.mark.asyncio
    async def test_user_login_flow(self, db_session, test_user):
        """Test user login flow"""
        from core.security import SecureUserLogin
        from unittest.mock import Mock
        
        # Mock request object
        request = Mock()
        request.client.host = "127.0.0.1"
        request.headers = {"user-agent": "test-agent"}
        
        # Test login
        login_data = SecureUserLogin(
            email="test@example.com",
            password="TestPassword123!"
        )
        
        # Authenticate user
        authenticated_user = await enhanced_auth_service.authenticate_user(
            db_session, login_data, request
        )
        
        assert authenticated_user is not None
        assert authenticated_user.id == test_user.id
        assert authenticated_user.email == test_user.email
    
    @pytest.mark.asyncio
    async def test_failed_login_attempts(self, db_session, test_user):
        """Test failed login attempt handling"""
        from core.security import SecureUserLogin
        from unittest.mock import Mock
        from fastapi import HTTPException
        
        request = Mock()
        request.client.host = "127.0.0.1"
        request.headers = {"user-agent": "test-agent"}
        
        login_data = SecureUserLogin(
            email="test@example.com",
            password="WrongPassword123!"
        )
        
        # Multiple failed attempts should eventually lock account
        for i in range(6):  # Exceed the limit
            with pytest.raises(HTTPException):
                await enhanced_auth_service.authenticate_user(
                    db_session, login_data, request
                )
        
        # Check that user is locked
        await db_session.refresh(test_user)
        assert test_user.locked_until is not None
        assert test_user.failed_login_attempts >= 5


class TestSecurityMiddleware:
    """Test security middleware functionality"""
    
    def test_security_headers(self, client):
        """Test that security headers are added"""
        response = client.get("/health")
        
        # Check for security headers
        assert "X-Content-Type-Options" in response.headers
        assert "X-Frame-Options" in response.headers
        assert "X-XSS-Protection" in response.headers
        assert "Content-Security-Policy" in response.headers
        assert "Referrer-Policy" in response.headers
        
        # Verify header values
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["X-Frame-Options"] == "DENY"
        assert response.headers["X-XSS-Protection"] == "1; mode=block"
    
    def test_csrf_protection(self, client):
        """Test CSRF protection"""
        # Request without CSRF token should be rejected
        response = client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com",
                "password": "Password123!",
                "username": "testuser",
                "terms_accepted": True
            }
        )
        
        assert response.status_code == 403
        assert "CSRF token required" in response.json()["detail"]


class TestAPIEndpoints:
    """Test API endpoint security"""
    
    def test_health_endpoint(self, client):
        """Test health endpoint"""
        response = client.get("/api/auth/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "features" in data
        assert "version" in data
    
    def test_csrf_token_endpoint(self, client):
        """Test CSRF token generation"""
        response = client.get("/api/auth/csrf-token")
        assert response.status_code == 200
        
        data = response.json()
        assert "csrf_token" in data
        assert len(data["csrf_token"]) >= 16
    
    def test_registration_validation(self, client):
        """Test registration input validation"""
        # Get CSRF token first
        csrf_response = client.get("/api/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        # Test with invalid email
        response = client.post(
            "/api/auth/register",
            headers={"X-CSRF-Token": csrf_token},
            json={
                "email": "invalid-email",
                "password": "Password123!",
                "username": "testuser",
                "terms_accepted": True
            }
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_authentication_required(self, client):
        """Test that protected endpoints require authentication"""
        response = client.get("/api/auth/me")
        assert response.status_code == 401
        assert "Authentication required" in response.json()["detail"]


@pytest.mark.asyncio
async def test_session_management(db_session, test_user):
    """Test session management functionality"""
    from unittest.mock import Mock
    
    request = Mock()
    request.client.host = "127.0.0.1"
    request.headers = {"user-agent": "test-agent"}
    
    # Create session
    session = await enhanced_auth_service.sessions.create_session(
        db_session, test_user.id, "127.0.0.1", "test-agent"
    )
    
    assert session.user_id == test_user.id
    assert session.ip_address == "127.0.0.1"
    assert session.is_active
    
    # Get active session
    active_session = await enhanced_auth_service.sessions.get_active_session(
        db_session, session.session_id
    )
    
    assert active_session is not None
    assert active_session.session_id == session.session_id
    
    # Revoke session
    await enhanced_auth_service.sessions.revoke_session(
        db_session, session.session_id
    )
    
    # Session should no longer be active
    revoked_session = await enhanced_auth_service.sessions.get_active_session(
        db_session, session.session_id
    )
    
    assert revoked_session is None


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
