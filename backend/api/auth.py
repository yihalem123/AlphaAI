from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os
from dotenv import load_dotenv

from core.database import get_db, User

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "demo-secret-key-for-development-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours for development

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

# Create router
router = APIRouter()

# Request/Response models
class UserLogin(BaseModel):
    email: str
    password: str

class UserSignup(BaseModel):
    email: str
    password: str
    username: str
    plan: str = "free"

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    subscription_tier: str
    api_calls_count: int
    daily_limit: int
    created_at: str

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    
    # Handle demo token for development - create or get demo user
    if token == "demo_token_123":
        try:
            # Try to get existing demo user from database
            result = await db.execute(select(User).where(User.email == "demo@example.com"))
            demo_user = result.scalar_one_or_none()
            
            if not demo_user:
                # Create demo user in database
                demo_user = User(
                    username="demo_user",
                    email="demo@example.com",
                    subscription_tier="free",
                    api_calls_count=5,
                    daily_limit=100,  # Higher limit for development
                    is_active=True,
                    created_at=datetime.utcnow()
                )
                db.add(demo_user)
                await db.commit()
                await db.refresh(demo_user)
            
            return demo_user
        except Exception as e:
            print(f"Demo user creation/retrieval failed: {e}")
            # Fallback: return a temporary demo user object
            demo_user = User()
            demo_user.id = 999
            demo_user.username = "demo_user"
            demo_user.email = "demo@example.com"
            demo_user.subscription_tier = "free"
            demo_user.api_calls_count = 5
            demo_user.daily_limit = 100
            demo_user.is_active = True
            demo_user.created_at = datetime.utcnow()
            return demo_user
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Get user from database
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if user is None:
            raise credentials_exception
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        return user
    except Exception as e:
        print(f"Database error in get_current_user: {e}")
        raise credentials_exception

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Get current user from JWT token (optional)"""
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None

async def check_user_limits(user: User, db: AsyncSession):
    """Check if user has exceeded their daily limits"""
    # Define limits based on subscription tier
    limits = {
        "free": 10,
        "pro": 100,
        "premium": 1000
    }
    
    daily_limit = limits.get(user.subscription_tier, 10)
    
    if user.api_calls_count >= daily_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily limit of {daily_limit} API calls exceeded. Please upgrade your subscription."
        )

async def create_user_from_telegram(telegram_id: int, username: str, db: AsyncSession) -> User:
    """Create or get user from Telegram ID"""
    # Check if user already exists
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        return existing_user
    
    # Create new user
    new_user = User(
        telegram_id=telegram_id,
        username=username,
        subscription_tier="free",
        daily_limit=10
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return new_user

async def create_user_from_wallet(wallet_address: str, db: AsyncSession) -> User:
    """Create or get user from wallet address"""
    # Check if user already exists
    result = await db.execute(select(User).where(User.wallet_address == wallet_address))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        return existing_user
    
    # Create new user
    new_user = User(
        wallet_address=wallet_address,
        subscription_tier="free",
        daily_limit=10
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return new_user

def verify_telegram_auth(auth_data: dict) -> bool:
    """Verify Telegram authentication data"""
    # This should implement Telegram's authentication verification
    # For now, we'll use a simple check
    required_fields = ['id', 'first_name', 'auth_date', 'hash']
    return all(field in auth_data for field in required_fields)

def verify_wallet_signature(address: str, signature: str, message: str) -> bool:
    """Verify wallet signature for authentication"""
    # This should implement wallet signature verification
    # For now, we'll use a simple check
    return len(signature) > 0 and len(address) > 0

async def reset_daily_limits():
    """Reset daily API call limits for all users (to be called daily)"""
    # This would be called by a scheduled task
    from sqlalchemy import update
    from core.database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(User).values(api_calls_count=0)
        )
        await db.commit()

# API Endpoints

@router.post("/signup", response_model=Token)
async def signup(user_data: UserSignup, db: AsyncSession = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists"
        )
    
    # Create new user
    hashed = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed,
        subscription_tier=user_data.plan,
        api_calls_count=0,
        daily_limit=100 if user_data.plan == "free" else 1000,
        is_active=True,
        created_at=datetime.utcnow()
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(new_user.id)}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login user"""
    # Find user by email
    result = await db.execute(select(User).where(User.email == user_data.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(user_data.password, user.password_hash or ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        subscription_tier=current_user.subscription_tier,
        api_calls_count=current_user.api_calls_count,
        daily_limit=current_user.daily_limit,
        created_at=current_user.created_at.isoformat()
    )

@router.post("/logout")
async def logout():
    """Logout user (client should remove token)"""
    return {"message": "Successfully logged out"}