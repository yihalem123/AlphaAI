from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, Float, Integer, Boolean, Text, JSON, ForeignKey, Index
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import os
from dotenv import load_dotenv
import uuid

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///ai_trading.db")

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    telegram_id: Mapped[Optional[int]] = mapped_column(Integer, unique=True, nullable=True)
    wallet_address: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    username: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # For email/password auth
    subscription_tier: Mapped[str] = mapped_column(String(20), default="free")
    subscription_expires: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    api_calls_count: Mapped[int] = mapped_column(Integer, default=0)
    daily_limit: Mapped[int] = mapped_column(Integer, default=10)
    preferences: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Relationships
    sessions: Mapped[List["UserSession"]] = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    session_id: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)  # IPv6 compatible
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    last_activity: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.utcnow() + timedelta(days=30))
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user: Mapped[User] = relationship("User", back_populates="sessions")
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship("RefreshToken", back_populates="session", cascade="all, delete-orphan")
    
    # SQLite compatible indexes
    __table_args__ = (
        Index('idx_session_user_active', 'user_id', 'is_active'),
        Index('idx_session_id', 'session_id'),
    )

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("user_sessions.session_id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True)  # Hashed opaque token
    jti: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)  # JWT ID for access token correlation
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.utcnow() + timedelta(days=60))
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    replaced_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)  # Token rotation tracking
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user: Mapped[User] = relationship("User", back_populates="refresh_tokens")
    session: Mapped[UserSession] = relationship("UserSession", back_populates="refresh_tokens")
    
    # SQLite compatible indexes
    __table_args__ = (
        Index('idx_refresh_token_hash', 'token_hash'),
        Index('idx_refresh_user_session', 'user_id', 'session_id', 'is_active'),
    )

class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    platform: Mapped[str] = mapped_column(String(20))  # 'telegram' or 'web'
    message_type: Mapped[str] = mapped_column(String(20))  # 'user' or 'assistant'
    content: Mapped[str] = mapped_column(Text)
    message_metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

class TradingSignal(Base):
    __tablename__ = "trading_signals"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    symbol: Mapped[str] = mapped_column(String(20))
    signal_type: Mapped[str] = mapped_column(String(10))  # 'buy', 'sell', 'hold'
    confidence: Mapped[float] = mapped_column(Float)
    price: Mapped[float] = mapped_column(Float)
    target_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    stop_loss: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reasoning: Mapped[str] = mapped_column(Text)
    indicators: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class Portfolio(Base):
    __tablename__ = "portfolios"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    wallet_address: Mapped[str] = mapped_column(String(100))
    holdings: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    total_value_usd: Mapped[float] = mapped_column(Float, default=0.0)
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    plan_type: Mapped[str] = mapped_column(String(20))  # 'free', 'pro', 'premium'
    payment_method: Mapped[str] = mapped_column(String(20))  # 'crypto', 'telegram'
    transaction_hash: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(10))
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

async def init_db():
    async with engine.begin() as conn:
        # Create tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)

        # Lightweight migration: ensure new nullable columns exist for SQLite
        try:
            result = await conn.exec_driver_sql("PRAGMA table_info(users)")
            existing_cols = {row[1] for row in result}  # row[1] is column name

            # Define columns to ensure with their SQLite types and defaults
            columns_to_add = {
                "password_hash": "VARCHAR(255)",
                "mfa_enabled": "INTEGER DEFAULT 0",
                "mfa_secret": "VARCHAR(32)",
                "email_verified": "INTEGER DEFAULT 0",
                "failed_login_attempts": "INTEGER DEFAULT 0",
                "locked_until": "DATETIME",
                "updated_at": "DATETIME",
                # Ensure preferences JSON column exists (stored as TEXT in SQLite)
                "preferences": "TEXT"
            }

            for col_name, col_ddl in columns_to_add.items():
                if col_name not in existing_cols:
                    try:
                        await conn.exec_driver_sql(
                            f"ALTER TABLE users ADD COLUMN {col_name} {col_ddl}"
                        )
                    except Exception:
                        # Ignore if cannot add (e.g., race condition), continue
                        pass
        except Exception:
            # Best-effort – don't block app start
            pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()