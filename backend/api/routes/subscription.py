from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import os
import secrets

from core.database import get_db, User, Subscription
from api.auth_secure import get_current_user

# Import Stripe
try:
    import stripe
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY", os.getenv("STRIPE_TEST_SECRET_KEY"))
    STRIPE_AVAILABLE = True
except ImportError:
    STRIPE_AVAILABLE = False
    print("Warning: Stripe not available. Payment functionality will be limited.")

router = APIRouter()

class SubscriptionPlan(BaseModel):
    plan_type: str
    price_monthly: float
    price_yearly: float
    features: list
    api_calls_limit: int

class PaymentRequest(BaseModel):
    plan_type: str
    payment_method: str  # "crypto" or "telegram"
    duration: str = "monthly"  # "monthly" or "yearly"
    transaction_hash: Optional[str] = None
    amount: float
    currency: str

class SubscriptionResponse(BaseModel):
    id: int
    plan_type: str
    start_date: str
    end_date: str
    is_active: bool
    days_remaining: int

# New models for frontend API integration
class CardDetails(BaseModel):
    number: str
    exp_month: int
    exp_year: int
    cvc: str
    name: str

class BillingAddress(BaseModel):
    line1: str
    city: str
    state: Optional[str] = None
    postal_code: str
    country: str = "US"

class BillingDetails(BaseModel):
    email: str
    address: BillingAddress

class StripeUpgradeRequest(BaseModel):
    plan_id: str
    amount: float
    currency: str = "USD"
    billing_period: str  # "monthly" or "yearly"
    payment_method: str = "stripe"
    card: CardDetails
    billing_details: BillingDetails

class CryptoPaymentRequest(BaseModel):
    plan_id: str
    amount: float
    currency: str = "USD"
    billing_period: str
    crypto_type: str  # "bitcoin", "ethereum", "usdt"

class UpgradeResponse(BaseModel):
    success: bool
    subscription_id: str
    status: str
    requires_action: Optional[bool] = False
    payment_url: Optional[str] = None

class CryptoPaymentResponse(BaseModel):
    wallet_address: str
    amount_crypto: float
    crypto_symbol: str
    qr_code: Optional[str] = None
    payment_id: str
    expires_at: str

class CryptoPaymentStatusResponse(BaseModel):
    status: str  # "pending", "confirming", "completed", "expired"
    subscription_id: Optional[str] = None
    confirmations: Optional[int] = 0

# Subscription plans configuration - Updated to match frontend
SUBSCRIPTION_PLANS = {
    "free": SubscriptionPlan(
        plan_type="free",
        price_monthly=0.0,
        price_yearly=0.0,
        features=[
            "10 API calls per day",
            "Basic portfolio tracking",
            "Limited trading signals",
            "Basic market data",
            "Community support"
        ],
        api_calls_limit=10
    ),
    "pro": SubscriptionPlan(
        plan_type="pro",
        price_monthly=29.0,
        price_yearly=290.0,
        features=[
            "1,000 API calls per day",
            "Advanced portfolio analytics",
            "Unlimited trading signals",
            "Real-time market data",
            "AI-powered insights",
            "Technical analysis tools",
            "Priority support"
        ],
        api_calls_limit=1000
    ),
    "premium": SubscriptionPlan(
        plan_type="premium",
        price_monthly=99.0,
        price_yearly=990.0,
        features=[
            "Unlimited API calls",
            "Advanced portfolio management",
            "Custom trading strategies",
            "Real-time notifications",
            "Advanced AI analysis",
            "Custom indicators",
            "White-label solutions",
            "Dedicated support",
            "API access"
        ],
        api_calls_limit=999999
    )
}

@router.get("/")
async def get_subscription_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's current subscription info"""
    return await get_current_subscription(current_user, db)

@router.get("/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    return {
        "plans": SUBSCRIPTION_PLANS,
        "current_promotions": [],  # Can add promotional offers here
        "payment_methods": ["stripe", "crypto"],
        "supported_currencies": ["USD", "BTC", "ETH", "USDT"]
    }

@router.get("/current")
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's current subscription"""
    try:
        result = await db.execute(
            select(Subscription).where(
                Subscription.user_id == current_user.id,
                Subscription.is_active == True
            ).order_by(Subscription.end_date.desc())
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            return {
                "plan_type": "free",
                "is_active": True,
                "days_remaining": None,
                "features": SUBSCRIPTION_PLANS["free"].features,
                "api_calls_limit": SUBSCRIPTION_PLANS["free"].api_calls_limit,
                "api_calls_used": current_user.api_calls_count
            }
        
        # Calculate days remaining
        days_remaining = (subscription.end_date - datetime.utcnow()).days
        is_active = subscription.is_active and days_remaining > 0
        
        # Update subscription status if expired
        if not is_active and subscription.is_active:
            subscription.is_active = False
            current_user.subscription_tier = "free"
            current_user.daily_limit = SUBSCRIPTION_PLANS["free"].api_calls_limit
            await db.commit()
        
        return SubscriptionResponse(
            id=subscription.id,
            plan_type=subscription.plan_type,
            start_date=subscription.start_date.isoformat(),
            end_date=subscription.end_date.isoformat(),
            is_active=is_active,
            days_remaining=max(0, days_remaining)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching subscription: {str(e)}"
        )

@router.post("/subscribe")
async def create_subscription(
    payment: PaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new subscription"""
    try:
        # Validate plan type
        if payment.plan_type not in SUBSCRIPTION_PLANS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan type: {payment.plan_type}"
            )
        
        plan = SUBSCRIPTION_PLANS[payment.plan_type]
        
        # Validate amount
        expected_amount = plan.price_yearly if payment.duration == "yearly" else plan.price_monthly
        if abs(payment.amount - expected_amount) > 0.01:  # Allow small floating point differences
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid payment amount. Expected: {expected_amount}, Received: {payment.amount}"
            )
        
        # For crypto payments, verify transaction (placeholder)
        if payment.payment_method == "crypto" and not payment.transaction_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction hash required for crypto payments"
            )
        
        # Verify payment (placeholder - would integrate with actual payment verification)
        payment_verified = await verify_payment(payment)
        if not payment_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment verification failed"
            )
        
        # Calculate subscription dates
        start_date = datetime.utcnow()
        if payment.duration == "yearly":
            end_date = start_date + timedelta(days=365)
        else:
            end_date = start_date + timedelta(days=30)
        
        # Deactivate existing subscriptions
        await db.execute(
            update(Subscription)
            .where(Subscription.user_id == current_user.id)
            .values(is_active=False)
        )
        
        # Create new subscription
        new_subscription = Subscription(
            user_id=current_user.id,
            plan_type=payment.plan_type,
            payment_method=payment.payment_method,
            transaction_hash=payment.transaction_hash,
            amount=payment.amount,
            currency=payment.currency,
            start_date=start_date,
            end_date=end_date,
            is_active=True
        )
        
        db.add(new_subscription)
        
        # Update user subscription info
        current_user.subscription_tier = payment.plan_type
        current_user.subscription_expires = end_date
        current_user.daily_limit = plan.api_calls_limit
        current_user.api_calls_count = 0  # Reset daily count
        
        await db.commit()
        await db.refresh(new_subscription)
        
        return {
            "message": f"Successfully subscribed to {payment.plan_type} plan",
            "subscription": SubscriptionResponse(
                id=new_subscription.id,
                plan_type=new_subscription.plan_type,
                start_date=new_subscription.start_date.isoformat(),
                end_date=new_subscription.end_date.isoformat(),
                is_active=new_subscription.is_active,
                days_remaining=(new_subscription.end_date - datetime.utcnow()).days
            ),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating subscription: {str(e)}"
        )

@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel current subscription"""
    try:
        # Get active subscription
        result = await db.execute(
            select(Subscription).where(
                Subscription.user_id == current_user.id,
                Subscription.is_active == True
            )
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active subscription found"
            )
        
        # Deactivate subscription (but let it run until end date)
        subscription.is_active = False
        
        # Don't immediately downgrade - let them use paid features until end date
        await db.commit()
        
        return {
            "message": "Subscription cancelled successfully",
            "subscription_ends": subscription.end_date.isoformat(),
            "note": "You will retain access to paid features until the subscription expires",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cancelling subscription: {str(e)}"
        )

@router.get("/history")
async def get_subscription_history(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's subscription history"""
    try:
        result = await db.execute(
            select(Subscription)
            .where(Subscription.user_id == current_user.id)
            .order_by(Subscription.start_date.desc())
            .limit(limit)
        )
        subscriptions = result.scalars().all()
        
        return {
            "subscriptions": [
                {
                    "id": sub.id,
                    "plan_type": sub.plan_type,
                    "payment_method": sub.payment_method,
                    "amount": sub.amount,
                    "currency": sub.currency,
                    "start_date": sub.start_date.isoformat(),
                    "end_date": sub.end_date.isoformat(),
                    "is_active": sub.is_active,
                    "transaction_hash": sub.transaction_hash
                }
                for sub in subscriptions
            ],
            "total_count": len(subscriptions),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching subscription history: {str(e)}"
        )

@router.get("/usage")
async def get_usage_stats(
    current_user: User = Depends(get_current_user)
):
    """Get current usage statistics"""
    try:
        plan = SUBSCRIPTION_PLANS.get(current_user.subscription_tier, SUBSCRIPTION_PLANS["free"])
        
        usage_percentage = (current_user.api_calls_count / current_user.daily_limit) * 100 if current_user.daily_limit > 0 else 0
        
        return {
            "current_plan": current_user.subscription_tier,
            "api_calls_used": current_user.api_calls_count,
            "daily_limit": current_user.daily_limit,
            "usage_percentage": round(usage_percentage, 1),
            "calls_remaining": max(0, current_user.daily_limit - current_user.api_calls_count),
            "subscription_expires": current_user.subscription_expires.isoformat() if current_user.subscription_expires else None,
            "features": plan.features
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching usage stats: {str(e)}"
        )

async def verify_payment(payment: PaymentRequest) -> bool:
    """Verify payment (placeholder implementation)"""
    # This would integrate with actual payment processors
    # For crypto: verify blockchain transaction
    # For telegram: verify with Telegram payment API
    
    if payment.payment_method == "crypto":
        # Verify blockchain transaction
        return await verify_crypto_payment(payment.transaction_hash, payment.amount, payment.currency)
    elif payment.payment_method == "telegram":
        # Verify Telegram payment
        return await verify_telegram_payment(payment)
    
    return False

async def verify_crypto_payment(transaction_hash: str, amount: float, currency: str) -> bool:
    """Verify cryptocurrency payment (placeholder)"""
    # This would integrate with blockchain APIs to verify the transaction
    # For now, return True if transaction_hash is provided
    return bool(transaction_hash and len(transaction_hash) > 10)

async def verify_telegram_payment(payment: PaymentRequest) -> bool:
    """Verify Telegram payment (placeholder)"""
    # This would integrate with Telegram's payment API
    return True

# NEW ENDPOINTS FOR FRONTEND INTEGRATION

@router.post("/upgrade", response_model=UpgradeResponse)
async def upgrade_subscription(
    request: StripeUpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upgrade subscription using Stripe"""
    try:
        if not STRIPE_AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Stripe payment is not available"
            )
        
        # Validate plan
        if request.plan_id not in SUBSCRIPTION_PLANS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan: {request.plan_id}"
            )
        
        plan = SUBSCRIPTION_PLANS[request.plan_id]
        
        # Validate amount
        expected_amount = plan.price_yearly if request.billing_period == "yearly" else plan.price_monthly
        if abs(request.amount - expected_amount) > 0.01:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid amount. Expected: {expected_amount}, Received: {request.amount}"
            )
        
        # Create or get Stripe customer
        stripe_customer_id = getattr(current_user, 'stripe_customer_id', None)
        if not stripe_customer_id:
            customer = stripe.Customer.create(
                email=request.billing_details.email,
                name=request.card.name,
                address={
                    "line1": request.billing_details.address.line1,
                    "city": request.billing_details.address.city,
                    "state": request.billing_details.address.state,
                    "postal_code": request.billing_details.address.postal_code,
                    "country": request.billing_details.address.country,
                }
            )
            stripe_customer_id = customer.id
            
            # Save Stripe customer ID to user (if the field exists)
            if hasattr(current_user, 'stripe_customer_id'):
                current_user.stripe_customer_id = stripe_customer_id
                await db.commit()
        
        # Create payment method
        payment_method = stripe.PaymentMethod.create(
            type="card",
            card={
                "number": request.card.number,
                "exp_month": request.card.exp_month,
                "exp_year": request.card.exp_year,
                "cvc": request.card.cvc,
            },
            billing_details={
                "name": request.card.name,
                "email": request.billing_details.email,
                "address": {
                    "line1": request.billing_details.address.line1,
                    "city": request.billing_details.address.city,
                    "state": request.billing_details.address.state,
                    "postal_code": request.billing_details.address.postal_code,
                    "country": request.billing_details.address.country,
                }
            }
        )
        
        # Attach payment method to customer
        payment_method.attach(customer=stripe_customer_id)
        
        # Create payment intent
        amount_cents = int(request.amount * 100)
        payment_intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=request.currency.lower(),
            customer=stripe_customer_id,
            payment_method=payment_method.id,
            confirmation_method="manual",
            confirm=True,
            return_url="https://your-domain.com/return",  # Configure this
            metadata={
                "user_id": str(current_user.id),
                "plan_id": request.plan_id,
                "billing_period": request.billing_period
            }
        )
        
        if payment_intent.status == "requires_action":
            return UpgradeResponse(
                success=False,
                subscription_id="",
                status="requires_action",
                requires_action=True,
                payment_url=payment_intent.next_action.redirect_to_url.url
            )
        elif payment_intent.status == "succeeded":
            # Create subscription in database
            subscription_id = await create_subscription_record(
                db, current_user, request.plan_id, request.billing_period, 
                request.amount, "stripe", payment_intent.id
            )
            
            return UpgradeResponse(
                success=True,
                subscription_id=subscription_id,
                status="active"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment failed with status: {payment_intent.status}"
            )
            
    except stripe.error.CardError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Card error: {e.user_message}"
        )
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Subscription upgrade failed: {str(e)}"
        )

@router.post("/crypto-payment", response_model=CryptoPaymentResponse)
async def create_crypto_payment(
    request: CryptoPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a crypto payment request"""
    try:
        # Validate plan
        if request.plan_id not in SUBSCRIPTION_PLANS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan: {request.plan_id}"
            )
        
        # Calculate crypto amount (simplified - in production use real exchange rates)
        crypto_rates = {
            "bitcoin": 43000.0,  # BTC/USD
            "ethereum": 2500.0,  # ETH/USD  
            "usdt": 1.0          # USDT/USD
        }
        
        if request.crypto_type not in crypto_rates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported crypto type: {request.crypto_type}"
            )
        
        crypto_amount = request.amount / crypto_rates[request.crypto_type]
        
        # Generate unique payment ID
        payment_id = f"crypto_{secrets.token_hex(16)}"
        
        # Generate dummy wallet address (in production, use proper wallet generation)
        wallet_addresses = {
            "bitcoin": f"bc1q{secrets.token_hex(20)}",
            "ethereum": f"0x{secrets.token_hex(20)}",
            "usdt": f"0x{secrets.token_hex(20)}"
        }
        
        wallet_address = wallet_addresses[request.crypto_type]
        expires_at = datetime.utcnow() + timedelta(minutes=30)
        
        # Store payment request in database (you may need to create a CryptoPayment table)
        # For now, store in a simple dict or add to existing subscription logic
        
        return CryptoPaymentResponse(
            wallet_address=wallet_address,
            amount_crypto=round(crypto_amount, 8),
            crypto_symbol=request.crypto_type.upper() if request.crypto_type != "bitcoin" else "BTC",
            payment_id=payment_id,
            expires_at=expires_at.isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Crypto payment creation failed: {str(e)}"
        )

@router.get("/crypto-payment-status/{payment_id}", response_model=CryptoPaymentStatusResponse)
async def check_crypto_payment_status(
    payment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check crypto payment status"""
    try:
        # In production, this would check the blockchain for confirmations
        # For now, return a demo response
        
        # Simulate different statuses based on payment_id
        if "completed" in payment_id:
            subscription_id = await create_subscription_record(
                db, current_user, "pro", "monthly", 29.0, "crypto", payment_id
            )
            return CryptoPaymentStatusResponse(
                status="completed",
                subscription_id=subscription_id,
                confirmations=6
            )
        elif "confirming" in payment_id:
            return CryptoPaymentStatusResponse(
                status="confirming",
                confirmations=3
            )
        else:
            return CryptoPaymentStatusResponse(
                status="pending",
                confirmations=0
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Status check failed: {str(e)}"
        )

async def create_subscription_record(
    db: AsyncSession,
    user: User,
    plan_id: str,
    billing_period: str,
    amount: float,
    payment_method: str,
    transaction_id: str
) -> str:
    """Create subscription record in database"""
    try:
        # Deactivate existing subscriptions
        await db.execute(
            update(Subscription)
            .where(Subscription.user_id == user.id)
            .values(is_active=False)
        )
        
        # Calculate subscription dates
        start_date = datetime.utcnow()
        if billing_period == "yearly":
            end_date = start_date + timedelta(days=365)
        else:
            end_date = start_date + timedelta(days=30)
        
        # Create new subscription
        new_subscription = Subscription(
            user_id=user.id,
            plan_type=plan_id,
            payment_method=payment_method,
            transaction_hash=transaction_id,
            amount=amount,
            currency="USD",
            start_date=start_date,
            end_date=end_date,
            is_active=True
        )
        
        db.add(new_subscription)
        
        # Update user subscription info
        plan = SUBSCRIPTION_PLANS[plan_id]
        user.subscription_tier = plan_id
        user.subscription_expires = end_date
        user.daily_limit = plan.api_calls_limit
        user.api_calls_count = 0  # Reset daily count
        
        await db.commit()
        await db.refresh(new_subscription)
        
        return str(new_subscription.id)
        
    except Exception as e:
        await db.rollback()
        raise e