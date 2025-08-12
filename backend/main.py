from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn
from typing import Optional
import os
from dotenv import load_dotenv

from api.routes import ai, portfolio, signals, subscription, payment
from api import auth
from core.database import init_db
from core.ai_service import AITradingService
from core.market_data import MarketDataService

load_dotenv()

# Initialize services
ai_service = AITradingService()
market_service = MarketDataService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await market_service.initialize()
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
    allow_methods=["*"],
    allow_headers=["*"]
)

# Security
security = HTTPBearer()

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
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