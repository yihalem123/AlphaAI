from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from core.database import get_db, User, ChatHistory
from core.ai_service import AITradingService
from core.market_data import MarketDataService
from api.auth_secure import get_current_user, check_user_limits
from core.rate_limiter import rate_limit_dependency

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    platform: str = "web"  # "web" or "telegram"

class ChatResponse(BaseModel):
    response: str
    timestamp: str
    tokens_used: Optional[int] = None

class SignalRequest(BaseModel):
    symbol: str
    timeframe: str = "1h"

class MarketAnalysisRequest(BaseModel):
    symbols: List[str]
    analysis_type: str = "sentiment"  # "sentiment", "technical", "comprehensive"

# Initialize services
ai_service = AITradingService()
market_service = MarketDataService()

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _rate_limit: None = Depends(lambda r: rate_limit_dependency(r, "api_ai"))
):
    """Chat with AI trading assistant"""
    try:
        # Check user limits
        await check_user_limits(current_user, db)
        
        # Get AI response
        response = await ai_service.chat_response(
            user_input=request.message,
            user_context={
                "user_id": current_user.id,
                "subscription_tier": current_user.subscription_tier,
                "preferences": current_user.preferences
            }
        )
        
        # Save chat history
        user_message = ChatHistory(
            user_id=current_user.id,
            platform=request.platform,
            message_type="user",
            content=request.message,
            metadata={"timestamp": datetime.utcnow().isoformat()}
        )
        
        ai_message = ChatHistory(
            user_id=current_user.id,
            platform=request.platform,
            message_type="assistant",
            content=response,
            metadata={"timestamp": datetime.utcnow().isoformat()}
        )
        
        db.add(user_message)
        db.add(ai_message)
        
        # Update API call count
        current_user.api_calls_count += 1
        await db.commit()
        
        return ChatResponse(
            response=response,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat request: {str(e)}"
        )

@router.post("/signal/{symbol}")
async def generate_signal(
    symbol: str,
    timeframe: str = "1h",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate trading signal for a specific symbol"""
    try:
        # Check user limits
        await check_user_limits(current_user, db)
        
        # Generate signal
        signal = await ai_service.generate_trading_signal(symbol.upper(), timeframe)
        
        # Update API call count
        current_user.api_calls_count += 1
        await db.commit()
        
        return signal
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating signal: {str(e)}"
        )

@router.post("/market-analysis")
async def market_analysis(
    request: MarketAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Perform market analysis on multiple symbols"""
    try:
        # Check user limits
        await check_user_limits(current_user, db)
        
        results = {}
        
        for symbol in request.symbols:
            if request.analysis_type == "sentiment":
                analysis = await ai_service.analyze_market_sentiment(symbol.upper())
            elif request.analysis_type == "technical":
                signal = await ai_service.generate_trading_signal(symbol.upper())
                analysis = signal.get("technical_indicators", {})
            else:  # comprehensive
                signal = await ai_service.generate_trading_signal(symbol.upper())
                sentiment = await ai_service.analyze_market_sentiment(symbol.upper())
                analysis = {
                    "signal": signal,
                    "sentiment": sentiment
                }
            
            results[symbol.upper()] = analysis
        
        # Update API call count
        current_user.api_calls_count += len(request.symbols)
        await db.commit()
        
        return {
            "analysis_type": request.analysis_type,
            "results": results,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error performing market analysis: {str(e)}"
        )

@router.get("/chat-history")
async def get_chat_history(
    limit: int = 50,
    platform: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's chat history"""
    try:
        from sqlalchemy import select, desc
        
        query = select(ChatHistory).where(ChatHistory.user_id == current_user.id)
        
        if platform:
            query = query.where(ChatHistory.platform == platform)
        
        query = query.order_by(desc(ChatHistory.created_at)).limit(limit)
        
        result = await db.execute(query)
        chat_history = result.scalars().all()
        
        return [
            {
                "id": chat.id,
                "message_type": chat.message_type,
                "content": chat.content,
                "platform": chat.platform,
                "timestamp": chat.created_at.isoformat(),
                "metadata": chat.metadata
            }
            for chat in chat_history
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching chat history: {str(e)}"
        )

@router.get("/market-overview")
async def get_market_overview(current_user: User = Depends(get_current_user)):
    """Get general market overview"""
    try:
        overview = await market_service.get_market_overview()
        trending = await market_service.get_trending_coins(10)
        fear_greed = await market_service.get_fear_greed_index()
        
        return {
            "market_overview": overview,
            "trending_coins": trending,
            "fear_greed_index": fear_greed,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching market overview: {str(e)}"
        )

@router.get("/search/{query}")
async def search_coins(
    query: str,
    current_user: User = Depends(get_current_user)
):
    """Search for coins by name or symbol"""
    try:
        results = await market_service.search_coins(query)
        return {
            "query": query,
            "results": results,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching coins: {str(e)}"
        )

@router.get("/price/{symbol}")
async def get_price(
    symbol: str,
    current_user: User = Depends(get_current_user)
):
    """Get current price for a symbol"""
    try:
        price_data = await market_service.get_current_price(symbol.upper())
        
        if not price_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Price data not found for {symbol}"
            )
        
        return price_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching price: {str(e)}"
        )