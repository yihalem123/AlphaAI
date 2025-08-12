from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import jwt
from datetime import datetime, timedelta
import hashlib
import secrets
import json
import os

router = APIRouter(tags=["authentication"])
security = HTTPBearer()

# File-based storage for persistence
USERS_FILE = "users_db.json"
SUBSCRIPTIONS_FILE = "subscriptions_db.json"

def load_db():
    """Load databases from files"""
    users_db = {}
    subscriptions_db = {}
    
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r') as f:
                users_db = json.load(f)
        except:
            users_db = {}
    
    if os.path.exists(SUBSCRIPTIONS_FILE):
        try:
            with open(SUBSCRIPTIONS_FILE, 'r') as f:
                subscriptions_db = json.load(f)
        except:
            subscriptions_db = {}
    
    return users_db, subscriptions_db

def save_db(users_db, subscriptions_db):
    """Save databases to files"""
    try:
        with open(USERS_FILE, 'w') as f:
            json.dump(users_db, f)
        with open(SUBSCRIPTIONS_FILE, 'w') as f:
            json.dump(subscriptions_db, f)
    except Exception as e:
        print(f"Error saving database: {e}")

# Load initial data
users_db, subscriptions_db = load_db()

SECRET_KEY = "demo-secret-key-for-testing"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 43200  # 30 days for development

class UserSignup(BaseModel):
    email: str
    password: str
    name: Optional[str] = None
    plan: Optional[str] = "free"

class UserLogin(BaseModel):
    email: str
    password: str

class TelegramAuthData(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str

class WalletAuthData(BaseModel):
    address: str
    signature: str
    message: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    subscription_plan: str
    subscription_status: str

class User(BaseModel):
    id: int
    telegram_id: Optional[int] = None
    wallet_address: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    subscription_tier: str = "free"
    subscription_expires: Optional[str] = None
    api_calls_count: int = 0
    daily_limit: int = 5
    preferences: dict = {}
    created_at: str
    is_active: bool = True

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: User

def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(data: dict):
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return user data"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None or user_id not in users_db:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return users_db[user_id]
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/signup", response_model=LoginResponse)
async def signup(user_data: UserSignup):
    """User registration endpoint"""
    # Load latest data
    global users_db, subscriptions_db
    users_db, subscriptions_db = load_db()
    
    print(f"DEBUG: Signup attempt for email: {user_data.email}")
    print(f"DEBUG: Existing users: {[(uid, u.get('email')) for uid, u in users_db.items()]}")
    
    # Check if email already exists
    existing_emails = [user.get("email") for user in users_db.values() if user.get("email")]
    print(f"DEBUG: Existing emails: {existing_emails}")
    
    if user_data.email in existing_emails:
        print(f"DEBUG: Email {user_data.email} already exists!")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please use a different email or try logging in."
        )
    
    user_id = secrets.token_urlsafe(16)
    hashed_password = hash_password(user_data.password)
    
    print(f"DEBUG: Creating user with ID: {user_id}")
    print(f"DEBUG: Hashed password: {hashed_password[:20]}...")
    
    # Create user
    users_db[user_id] = {
        "id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "name": user_data.name or user_data.email.split("@")[0],
        "created_at": datetime.utcnow().isoformat()
    }
    
    print(f"DEBUG: User created successfully! Total users: {len(users_db)}")
    
    # Create subscription based on selected plan
    plan_limits = {
        "free": {"queries_limit": 5, "plan": "free"},
        "pro": {"queries_limit": 1000, "plan": "pro"},
        "enterprise": {"queries_limit": 10000, "plan": "enterprise"}
    }
    
    selected_plan = user_data.plan or "free"
    plan_config = plan_limits.get(selected_plan, plan_limits["free"])
    
    subscriptions_db[user_id] = {
        "user_id": user_id,
        "plan": plan_config["plan"],
        "status": "active",
        "queries_used": 0,
        "queries_limit": plan_config["queries_limit"],
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": None
    }
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id})
    
    # Create user object for response
    user_obj = User(
        id=int(hashlib.md5(user_id.encode()).hexdigest()[:8], 16),  # Convert to int
        email=user_data.email,
        username=user_data.name or user_data.email.split("@")[0],
        subscription_tier=plan_config["plan"],
        api_calls_count=0,
        daily_limit=plan_config["queries_limit"],
        preferences={},
        created_at=datetime.utcnow().isoformat(),
        is_active=True
    )
    
    # Save to persistent storage
    save_db(users_db, subscriptions_db)
    print(f"DEBUG: Data saved to files. Users: {len(users_db)}, Subscriptions: {len(subscriptions_db)}")
    
    return LoginResponse(
        access_token=access_token, 
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_obj
    )

@router.post("/login", response_model=LoginResponse)
async def login(user_data: UserLogin):
    """User login endpoint"""
    # Load latest data
    global users_db, subscriptions_db
    users_db, subscriptions_db = load_db()
    
    print(f"DEBUG: Login attempt for email: {user_data.email}")
    print(f"DEBUG: Available users: {list(users_db.keys())}")
    print(f"DEBUG: Users data: {[(uid, u.get('email')) for uid, u in users_db.items()]}")
    
    # Find user by email
    user = None
    user_id = None
    for uid, u in users_db.items():
        print(f"DEBUG: Checking user {uid}: {u.get('email')} vs {user_data.email}")
        if u.get("email") == user_data.email:
            user = u
            user_id = uid
            print(f"DEBUG: Found user! {user_id}")
            break
    
    if not user:
        print(f"DEBUG: User not found for email: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found. Please sign up first.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    hashed_input_password = hash_password(user_data.password)
    stored_password = user.get("password")
    print(f"DEBUG: Password check - Input hash: {hashed_input_password[:20]}...")
    print(f"DEBUG: Password check - Stored hash: {stored_password[:20] if stored_password else 'None'}...")
    
    if stored_password != hashed_input_password:
        print("DEBUG: Password mismatch!")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get subscription info
    subscription = subscriptions_db.get(user_id, {})
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id})
    
    # Create user object for response
    user_obj = User(
        id=int(hashlib.md5(user_id.encode()).hexdigest()[:8], 16),  # Convert to int
        email=user["email"],
        username=user["name"],
        subscription_tier=subscription.get("plan", "free"),
        api_calls_count=subscription.get("queries_used", 0),
        daily_limit=subscription.get("queries_limit", 5),
        preferences={},
        created_at=user["created_at"],
        is_active=True
    )
    
    return LoginResponse(
        access_token=access_token, 
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_obj
    )

@router.get("/me", response_model=User)
async def get_current_user(current_user: dict = Depends(verify_token)):
    """Get current user information"""
    subscription = subscriptions_db.get(current_user["id"], {})
    
    return User(
        id=int(hashlib.md5(current_user["id"].encode()).hexdigest()[:8], 16),
        email=current_user["email"],
        username=current_user["name"],
        subscription_tier=subscription.get("plan", "free"),
        api_calls_count=subscription.get("queries_used", 0),
        daily_limit=subscription.get("queries_limit", 5),
        preferences={},
        created_at=current_user["created_at"],
        is_active=True
    )

@router.get("/subscription")
async def get_subscription(current_user: dict = Depends(verify_token)):
    """Get user subscription details"""
    subscription = subscriptions_db.get(current_user["id"])
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    return {
        "plan": subscription["plan"],
        "status": subscription["status"],
        "queries_used": subscription["queries_used"],
        "queries_limit": subscription["queries_limit"],
        "queries_remaining": subscription["queries_limit"] - subscription["queries_used"],
        "created_at": subscription["created_at"],
        "expires_at": subscription["expires_at"]
    }

@router.post("/upgrade")
async def upgrade_subscription(current_user: dict = Depends(verify_token)):
    """Upgrade user subscription (mock implementation)"""
    user_id = current_user["id"]
    
    if user_id not in subscriptions_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    # Mock upgrade to Pro plan
    subscriptions_db[user_id].update({
        "plan": "pro",
        "queries_limit": 1000,
        "upgraded_at": datetime.utcnow().isoformat()
    })
    
    return {
        "message": "Subscription upgraded successfully",
        "plan": "pro",
        "queries_limit": 1000
    }

@router.post("/logout")
async def logout(current_user: dict = Depends(verify_token)):
    """User logout endpoint (client-side token removal)"""
    # In a real implementation, you might want to blacklist the token
    return {"message": "Logged out successfully"}

@router.post("/telegram", response_model=LoginResponse)
async def login_with_telegram(auth_data: TelegramAuthData):
    """Telegram authentication endpoint"""
    # Find existing user or create new one
    user_id = None
    user = None
    
    # Look for existing telegram user
    for uid, u in users_db.items():
        if u.get("telegram_id") == auth_data.id:
            user_id = uid
            user = u
            break
    
    if not user:
        # Create new user
        user_id = secrets.token_urlsafe(16)
        username = auth_data.username or f"{auth_data.first_name}_{auth_data.id}"
        name = f"{auth_data.first_name} {auth_data.last_name or ''}".strip()
        
        users_db[user_id] = {
            "id": user_id,
            "telegram_id": auth_data.id,
            "name": name,
            "username": username,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Create free subscription for new user
        subscriptions_db[user_id] = {
            "user_id": user_id,
            "plan": "free",
            "status": "active",
            "queries_used": 0,
            "queries_limit": 5,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": None
        }
    
    # Get subscription info
    subscription = subscriptions_db.get(user_id, {})
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id})
    
    # Create user object for response
    user_obj = User(
        id=auth_data.id,
        telegram_id=auth_data.id,
        username=users_db[user_id]["username"],
        subscription_tier=subscription.get("plan", "free"),
        api_calls_count=subscription.get("queries_used", 0),
        daily_limit=subscription.get("queries_limit", 5),
        preferences={},
        created_at=users_db[user_id]["created_at"],
        is_active=True
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_obj
    )

@router.post("/dev-login")
async def dev_login():
    """Development login endpoint - generates long-lasting token"""
    # Create demo user if not exists
    user_id = "demo_user_123"
    
    if user_id not in users_db:
        users_db[user_id] = {
            "id": user_id,
            "email": "demo@example.com",
            "name": "Demo User",
            "username": "demo_user",
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Create free subscription for demo user
        subscriptions_db[user_id] = {
            "user_id": user_id,
            "plan": "free",
            "status": "active",
            "queries_used": 5,
            "queries_limit": 10,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": None
        }
        
        save_db(users_db, subscriptions_db)
    
    # Create long-lasting access token (30 days)
    access_token_expires = timedelta(days=30)
    access_token = create_access_token(
        data={"sub": user_id}, 
        expires_delta=access_token_expires
    )
    
    # Get subscription info
    subscription = subscriptions_db.get(user_id, {})
    
    # Create user object for response
    user_obj = User(
        id=1,
        email="demo@example.com",
        username="demo_user",
        subscription_tier=subscription.get("plan", "free"),
        api_calls_count=subscription.get("queries_used", 5),
        daily_limit=subscription.get("queries_limit", 10),
        preferences={},
        created_at=users_db[user_id]["created_at"],
        is_active=True
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 30 * 24 * 60 * 60,  # 30 days in seconds
        "user": user_obj,
        "message": "Development token generated (valid for 30 days)"
    }

@router.post("/wallet", response_model=LoginResponse)
async def login_with_wallet(auth_data: WalletAuthData):
    """Wallet authentication endpoint"""
    # Find existing user or create new one
    user_id = None
    user = None
    
    # Look for existing wallet user
    for uid, u in users_db.items():
        if u.get("wallet_address") == auth_data.address:
            user_id = uid
            user = u
            break
    
    if not user:
        # Create new user
        user_id = secrets.token_urlsafe(16)
        username = f"wallet_{auth_data.address[:8]}"
        
        users_db[user_id] = {
            "id": user_id,
            "wallet_address": auth_data.address,
            "name": username,
            "username": username,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Create free subscription for new user
        subscriptions_db[user_id] = {
            "user_id": user_id,
            "plan": "free",
            "status": "active",
            "queries_used": 0,
            "queries_limit": 5,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": None
        }
    
    # Get subscription info
    subscription = subscriptions_db.get(user_id, {})
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id})
    
    # Create user object for response
    user_obj = User(
        id=int(hashlib.md5(user_id.encode()).hexdigest()[:8], 16),
        wallet_address=auth_data.address,
        username=users_db[user_id]["username"],
        subscription_tier=subscription.get("plan", "free"),
        api_calls_count=subscription.get("queries_used", 0),
        daily_limit=subscription.get("queries_limit", 5),
        preferences={},
        created_at=users_db[user_id]["created_at"],
        is_active=True
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_obj
    )

@router.post("/dev-login")
async def dev_login():
    """Development login endpoint - generates long-lasting token"""
    # Create demo user if not exists
    user_id = "demo_user_123"
    
    if user_id not in users_db:
        users_db[user_id] = {
            "id": user_id,
            "email": "demo@example.com",
            "name": "Demo User",
            "username": "demo_user",
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Create free subscription for demo user
        subscriptions_db[user_id] = {
            "user_id": user_id,
            "plan": "free",
            "status": "active",
            "queries_used": 5,
            "queries_limit": 10,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": None
        }
        
        save_db(users_db, subscriptions_db)
    
    # Create long-lasting access token (30 days)
    access_token_expires = timedelta(days=30)
    access_token = create_access_token(
        data={"sub": user_id}, 
        expires_delta=access_token_expires
    )
    
    # Get subscription info
    subscription = subscriptions_db.get(user_id, {})
    
    # Create user object for response
    user_obj = User(
        id=1,
        email="demo@example.com",
        username="demo_user",
        subscription_tier=subscription.get("plan", "free"),
        api_calls_count=subscription.get("queries_used", 5),
        daily_limit=subscription.get("queries_limit", 10),
        preferences={},
        created_at=users_db[user_id]["created_at"],
        is_active=True
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 30 * 24 * 60 * 60,  # 30 days in seconds
        "user": user_obj,
        "message": "Development token generated (valid for 30 days)"
    }