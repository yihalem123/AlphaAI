from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn
from typing import Optional
import os
from dotenv import load_dotenv

from api.routes import ai, portfolio, signals, subscription, payment
from api import auth_secure
from core.database import init_db
from core.security import SecurityHeaders
from core.ai_service import AITradingService
from core.market_data import MarketDataService
from core.rate_limiter import rate_limiter

load_dotenv()

# Initialize services
ai_service = AITradingService()
market_service = MarketDataService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await market_service.initialize()
    await rate_limiter.initialize()
    yield
    # Shutdown
    await market_service.cleanup()

app = FastAPI(
    title="AI Trading Assistant API",
    description="Backend API for AI-powered trading assistant",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
# Use explicit origins when credentials or authorization headers are used
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-CSRF-Token"]
)

# Add security middleware
@app.middleware("http")
async def security_middleware(request: Request, call_next):
    """Add security headers and monitoring"""
    response = await call_next(request)
    
    # Add security headers
    security_headers = SecurityHeaders.get_security_headers()
    for key, value in security_headers.items():
        response.headers[key] = value
    
    return response

# Security
security = HTTPBearer()

# Include routers with new secure authentication
app.include_router(auth_secure.router, tags=["Authentication"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Assistant"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio"])
app.include_router(signals.router, prefix="/api/signals", tags=["Trading Signals"])
app.include_router(subscription.router, prefix="/api/subscription", tags=["Subscriptions"])
app.include_router(payment.router, prefix="/api/payment", tags=["Payments"])

@app.get("/")
async def root():
    return {"message": "AI Trading Assistant API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )