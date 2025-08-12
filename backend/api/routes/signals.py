from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from core.database import get_db, User, TradingSignal
from core.ai_service import AITradingService
from api.auth import get_current_user, check_user_limits

router = APIRouter()

class SignalResponse(BaseModel):
    id: int
    symbol: str
    signal_type: str
    confidence: float
    price: float
    target_price: Optional[float]
    stop_loss: Optional[float]
    reasoning: str
    indicators: Dict[str, Any]
    created_at: str
    is_active: bool

class SignalRequest(BaseModel):
    symbol: str
    timeframe: str = "1h"

class SignalUpdateRequest(BaseModel):
    is_active: bool

# Initialize services
ai_service = AITradingService()

@router.get("/", response_model=List[SignalResponse])
async def get_signals(
    limit: int = 50,
    symbol: Optional[str] = None,
    signal_type: Optional[str] = None,
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get trading signals with optional filters"""
    try:
        query = select(TradingSignal)
        
        if symbol:
            query = query.where(TradingSignal.symbol == symbol.upper())
        
        if signal_type:
            query = query.where(TradingSignal.signal_type == signal_type.lower())
        
        if active_only:
            query = query.where(TradingSignal.is_active == True)
        
        query = query.order_by(desc(TradingSignal.created_at)).limit(limit)
        
        result = await db.execute(query)
        signals = result.scalars().all()
        
        return [
            SignalResponse(
                id=signal.id,
                symbol=signal.symbol,
                signal_type=signal.signal_type,
                confidence=signal.confidence,
                price=signal.price,
                target_price=signal.target_price,
                stop_loss=signal.stop_loss,
                reasoning=signal.reasoning,
                indicators=signal.indicators,
                created_at=signal.created_at.isoformat(),
                is_active=signal.is_active
            )
            for signal in signals
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching signals: {str(e)}"
        )

@router.post("/generate", response_model=SignalResponse)
async def generate_signal(
    request: SignalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate a new trading signal"""
    try:
        # Check user limits
        await check_user_limits(current_user, db)
        
        # Generate signal using AI service
        signal_data = await ai_service.generate_trading_signal(
            request.symbol.upper(), 
            request.timeframe
        )
        
        if "error" in signal_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=signal_data["error"]
            )
        
        # Save signal to database
        new_signal = TradingSignal(
            symbol=signal_data["symbol"],
            signal_type=signal_data["signal_type"],
            confidence=signal_data["confidence"],
            price=signal_data["entry_price"],
            target_price=signal_data.get("target_price"),
            stop_loss=signal_data.get("stop_loss"),
            reasoning=signal_data["reasoning"],
            indicators=signal_data.get("technical_indicators", {})
        )
        
        db.add(new_signal)
        
        # Update user's API call count
        current_user.api_calls_count += 1
        
        await db.commit()
        await db.refresh(new_signal)
        
        return SignalResponse(
            id=new_signal.id,
            symbol=new_signal.symbol,
            signal_type=new_signal.signal_type,
            confidence=new_signal.confidence,
            price=new_signal.price,
            target_price=new_signal.target_price,
            stop_loss=new_signal.stop_loss,
            reasoning=new_signal.reasoning,
            indicators=new_signal.indicators,
            created_at=new_signal.created_at.isoformat(),
            is_active=new_signal.is_active
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating signal: {str(e)}"
        )

@router.get("/{signal_id}", response_model=SignalResponse)
async def get_signal(
    signal_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific trading signal"""
    try:
        result = await db.execute(
            select(TradingSignal).where(TradingSignal.id == signal_id)
        )
        signal = result.scalar_one_or_none()
        
        if not signal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Signal not found"
            )
        
        return SignalResponse(
            id=signal.id,
            symbol=signal.symbol,
            signal_type=signal.signal_type,
            confidence=signal.confidence,
            price=signal.price,
            target_price=signal.target_price,
            stop_loss=signal.stop_loss,
            reasoning=signal.reasoning,
            indicators=signal.indicators,
            created_at=signal.created_at.isoformat(),
            is_active=signal.is_active
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching signal: {str(e)}"
        )

@router.put("/{signal_id}")
async def update_signal(
    signal_id: int,
    request: SignalUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a trading signal (admin only for now)"""
    try:
        result = await db.execute(
            select(TradingSignal).where(TradingSignal.id == signal_id)
        )
        signal = result.scalar_one_or_none()
        
        if not signal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Signal not found"
            )
        
        # Update signal
        signal.is_active = request.is_active
        await db.commit()
        
        return {
            "message": "Signal updated successfully",
            "signal_id": signal_id,
            "is_active": signal.is_active,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating signal: {str(e)}"
        )

@router.get("/stats/performance")
async def get_signal_performance(
    days: int = 30,
    symbol: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get signal performance statistics"""
    try:
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        query = select(TradingSignal).where(
            TradingSignal.created_at >= start_date
        )
        
        if symbol:
            query = query.where(TradingSignal.symbol == symbol.upper())
        
        result = await db.execute(query)
        signals = result.scalars().all()
        
        if not signals:
            return {
                "total_signals": 0,
                "performance_stats": {},
                "period": f"{days} days",
                "message": "No signals found for the specified period"
            }
        
        # Calculate performance metrics
        total_signals = len(signals)
        signal_types = {}
        confidence_avg = sum(signal.confidence for signal in signals) / total_signals
        
        for signal in signals:
            signal_type = signal.signal_type
            if signal_type not in signal_types:
                signal_types[signal_type] = 0
            signal_types[signal_type] += 1
        
        # Calculate accuracy (this would require actual outcome tracking)
        # For now, we'll use a placeholder calculation
        estimated_accuracy = min(85, confidence_avg * 100 + 15)  # Rough estimate
        
        return {
            "total_signals": total_signals,
            "period": f"{days} days",
            "performance_stats": {
                "average_confidence": round(confidence_avg, 2),
                "estimated_accuracy": round(estimated_accuracy, 1),
                "signal_distribution": signal_types,
                "most_common_signal": max(signal_types, key=signal_types.get) if signal_types else None
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating signal performance: {str(e)}"
        )

@router.get("/trending/symbols")
async def get_trending_signals(
    limit: int = 10,
    hours: int = 24,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get most frequently signaled symbols in recent hours"""
    try:
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(hours=hours)
        
        query = select(TradingSignal).where(
            TradingSignal.created_at >= start_date
        )
        
        result = await db.execute(query)
        signals = result.scalars().all()
        
        # Count signals by symbol
        symbol_counts = {}
        for signal in signals:
            symbol = signal.symbol
            if symbol not in symbol_counts:
                symbol_counts[symbol] = {
                    "count": 0,
                    "latest_signal": signal.signal_type,
                    "avg_confidence": 0,
                    "confidences": []
                }
            
            symbol_counts[symbol]["count"] += 1
            symbol_counts[symbol]["confidences"].append(signal.confidence)
            
            # Update latest signal if this is more recent
            if signal.created_at > getattr(symbol_counts[symbol], 'latest_time', datetime.min):
                symbol_counts[symbol]["latest_signal"] = signal.signal_type
                symbol_counts[symbol]["latest_time"] = signal.created_at
        
        # Calculate average confidence for each symbol
        for symbol_data in symbol_counts.values():
            symbol_data["avg_confidence"] = sum(symbol_data["confidences"]) / len(symbol_data["confidences"])
            del symbol_data["confidences"]  # Remove raw data
            if "latest_time" in symbol_data:
                del symbol_data["latest_time"]  # Remove helper field
        
        # Sort by count and limit results
        trending = sorted(
            symbol_counts.items(),
            key=lambda x: x[1]["count"],
            reverse=True
        )[:limit]
        
        return {
            "trending_symbols": [
                {
                    "symbol": symbol,
                    "signal_count": data["count"],
                    "latest_signal_type": data["latest_signal"],
                    "average_confidence": round(data["avg_confidence"], 2)
                }
                for symbol, data in trending
            ],
            "period": f"{hours} hours",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching trending signals: {str(e)}"
        )