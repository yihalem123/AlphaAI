from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Dict, List, Optional, Any
from datetime import datetime

from core.database import get_db, User, Portfolio
from core.market_data import MarketDataService
from api.auth import get_current_user

router = APIRouter()

class AddHoldingRequest(BaseModel):
    symbol: str
    amount: float
    average_price: Optional[float] = None

class UpdateHoldingRequest(BaseModel):
    amount: float
    average_price: Optional[float] = None

class PortfolioResponse(BaseModel):
    total_value_usd: float
    total_change_24h: float
    total_change_percentage_24h: float
    assets: Dict[str, Any]
    asset_count: int
    last_updated: str

# Initialize services
market_service = MarketDataService()

@router.get("/", response_model=PortfolioResponse)
async def get_portfolio(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's portfolio with current values"""
    try:
        # Get user's portfolio
        result = await db.execute(
            select(Portfolio).where(Portfolio.user_id == current_user.id)
        )
        portfolio = result.scalar_one_or_none()
        
        if not portfolio:
            return PortfolioResponse(
                total_value_usd=0.0,
                total_change_24h=0.0,
                total_change_percentage_24h=0.0,
                assets={},
                asset_count=0,
                last_updated=datetime.utcnow().isoformat()
            )
        
        # Calculate current portfolio value
        portfolio_data = await market_service.get_portfolio_value(portfolio.holdings)
        
        # Calculate 24h changes
        total_change_24h = 0.0
        previous_total = 0.0
        
        for symbol, asset_data in portfolio_data['assets'].items():
            change_24h_percent = asset_data.get('change_24h', 0)
            current_value = asset_data['value']
            previous_value = current_value / (1 + change_24h_percent / 100) if change_24h_percent != -100 else current_value
            
            total_change_24h += (current_value - previous_value)
            previous_total += previous_value
        
        total_change_percentage_24h = (total_change_24h / previous_total * 100) if previous_total > 0 else 0
        
        # Update portfolio in database
        portfolio.holdings = portfolio.holdings
        portfolio.total_value_usd = portfolio_data['total_value_usd']
        portfolio.last_updated = datetime.utcnow()
        await db.commit()
        
        return PortfolioResponse(
            total_value_usd=portfolio_data['total_value_usd'],
            total_change_24h=total_change_24h,
            total_change_percentage_24h=total_change_percentage_24h,
            assets=portfolio_data['assets'],
            asset_count=portfolio_data['asset_count'],
            last_updated=portfolio.last_updated.isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching portfolio: {str(e)}"
        )

@router.post("/holdings")
async def add_holding(
    request: AddHoldingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add or update a holding in the portfolio"""
    try:
        symbol = request.symbol.upper()
        
        # Get or create portfolio
        result = await db.execute(
            select(Portfolio).where(Portfolio.user_id == current_user.id)
        )
        portfolio = result.scalar_one_or_none()
        
        if not portfolio:
            portfolio = Portfolio(
                user_id=current_user.id,
                wallet_address=current_user.wallet_address or "",
                holdings={}
            )
            db.add(portfolio)
        
        # Update holdings
        if symbol in portfolio.holdings:
            # Update existing holding
            existing_amount = portfolio.holdings[symbol]
            portfolio.holdings[symbol] = existing_amount + request.amount
        else:
            # Add new holding
            portfolio.holdings[symbol] = request.amount
        
        # Remove holding if amount becomes 0 or negative
        if portfolio.holdings[symbol] <= 0:
            del portfolio.holdings[symbol]
        
        portfolio.last_updated = datetime.utcnow()
        await db.commit()
        
        return {
            "message": f"Successfully updated {symbol} holding",
            "symbol": symbol,
            "amount": portfolio.holdings.get(symbol, 0),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating holding: {str(e)}"
        )

@router.put("/holdings/{symbol}")
async def update_holding(
    symbol: str,
    request: UpdateHoldingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a specific holding"""
    try:
        symbol = symbol.upper()
        
        # Get portfolio
        result = await db.execute(
            select(Portfolio).where(Portfolio.user_id == current_user.id)
        )
        portfolio = result.scalar_one_or_none()
        
        if not portfolio:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Portfolio not found"
            )
        
        if symbol not in portfolio.holdings:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Holding {symbol} not found in portfolio"
            )
        
        # Update holding
        if request.amount <= 0:
            del portfolio.holdings[symbol]
        else:
            portfolio.holdings[symbol] = request.amount
        
        portfolio.last_updated = datetime.utcnow()
        await db.commit()
        
        return {
            "message": f"Successfully updated {symbol} holding",
            "symbol": symbol,
            "amount": portfolio.holdings.get(symbol, 0),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating holding: {str(e)}"
        )

@router.delete("/holdings/{symbol}")
async def remove_holding(
    symbol: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a holding from the portfolio"""
    try:
        symbol = symbol.upper()
        
        # Get portfolio
        result = await db.execute(
            select(Portfolio).where(Portfolio.user_id == current_user.id)
        )
        portfolio = result.scalar_one_or_none()
        
        if not portfolio:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Portfolio not found"
            )
        
        if symbol not in portfolio.holdings:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Holding {symbol} not found in portfolio"
            )
        
        # Remove holding
        del portfolio.holdings[symbol]
        portfolio.last_updated = datetime.utcnow()
        await db.commit()
        
        return {
            "message": f"Successfully removed {symbol} from portfolio",
            "symbol": symbol,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error removing holding: {str(e)}"
        )

@router.get("/analysis")
async def get_portfolio_analysis(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get AI analysis of the user's portfolio"""
    try:
        # Get portfolio
        result = await db.execute(
            select(Portfolio).where(Portfolio.user_id == current_user.id)
        )
        portfolio = result.scalar_one_or_none()
        
        if not portfolio or not portfolio.holdings:
            return {
                "message": "No portfolio found or portfolio is empty",
                "recommendations": [],
                "risk_assessment": "low",
                "diversification_score": 0
            }
        
        # Get current portfolio value
        portfolio_data = await market_service.get_portfolio_value(portfolio.holdings)
        
        # Calculate diversification score
        diversification_score = calculate_diversification_score(portfolio_data['assets'])
        
        # Generate risk assessment
        risk_assessment = assess_portfolio_risk(portfolio_data['assets'])
        
        # Generate recommendations
        recommendations = generate_portfolio_recommendations(portfolio_data['assets'])
        
        return {
            "total_value": portfolio_data['total_value_usd'],
            "asset_count": portfolio_data['asset_count'],
            "diversification_score": diversification_score,
            "risk_assessment": risk_assessment,
            "recommendations": recommendations,
            "top_holdings": get_top_holdings(portfolio_data['assets']),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing portfolio: {str(e)}"
        )

@router.post("/import-wallet")
async def import_wallet_holdings(
    wallet_address: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Import holdings from a wallet address (placeholder for now)"""
    try:
        # This would integrate with blockchain APIs to fetch wallet holdings
        # For now, return a placeholder response
        
        return {
            "message": "Wallet import feature coming soon",
            "wallet_address": wallet_address,
            "status": "pending_implementation",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error importing wallet: {str(e)}"
        )

def calculate_diversification_score(assets: Dict[str, Any]) -> float:
    """Calculate portfolio diversification score (0-100)"""
    if not assets:
        return 0
    
    # Simple diversification based on number of assets and allocation distribution
    asset_count = len(assets)
    max_allocation = max([asset['allocation_percentage'] for asset in assets.values()])
    
    # Base score from asset count (up to 50 points)
    count_score = min(50, asset_count * 10)
    
    # Allocation score (up to 50 points, lower is better for max allocation)
    allocation_score = max(0, 50 - max_allocation)
    
    return round(count_score + allocation_score, 1)

def assess_portfolio_risk(assets: Dict[str, Any]) -> str:
    """Assess overall portfolio risk level"""
    if not assets:
        return "low"
    
    # Simple risk assessment based on asset allocation and volatility
    high_risk_symbols = ['DOGE', 'SHIB', 'MEME']  # Example high-risk assets
    total_high_risk_allocation = sum([
        asset['allocation_percentage'] 
        for symbol, asset in assets.items() 
        if symbol in high_risk_symbols
    ])
    
    if total_high_risk_allocation > 50:
        return "high"
    elif total_high_risk_allocation > 20:
        return "medium"
    else:
        return "low"

def generate_portfolio_recommendations(assets: Dict[str, Any]) -> List[str]:
    """Generate portfolio recommendations"""
    recommendations = []
    
    if not assets:
        recommendations.append("Consider adding some cryptocurrency holdings to start building your portfolio")
        return recommendations
    
    # Check for over-concentration
    max_allocation = max([asset['allocation_percentage'] for asset in assets.values()])
    if max_allocation > 60:
        recommendations.append(f"Consider diversifying - one asset represents {max_allocation:.1f}% of your portfolio")
    
    # Check for lack of major cryptocurrencies
    major_cryptos = ['BTC', 'ETH']
    missing_majors = [crypto for crypto in major_cryptos if crypto not in assets]
    if missing_majors:
        recommendations.append(f"Consider adding exposure to major cryptocurrencies: {', '.join(missing_majors)}")
    
    # Check for too many small positions
    small_positions = [symbol for symbol, asset in assets.items() if asset['allocation_percentage'] < 5]
    if len(small_positions) > 5:
        recommendations.append("Consider consolidating small positions to reduce complexity")
    
    return recommendations

def get_top_holdings(assets: Dict[str, Any], limit: int = 5) -> List[Dict[str, Any]]:
    """Get top holdings by allocation"""
    sorted_assets = sorted(
        assets.items(),
        key=lambda x: x[1]['allocation_percentage'],
        reverse=True
    )
    
    return [
        {
            "symbol": symbol,
            "allocation_percentage": asset['allocation_percentage'],
            "value": asset['value'],
            "amount": asset['amount']
        }
        for symbol, asset in sorted_assets[:limit]
    ]