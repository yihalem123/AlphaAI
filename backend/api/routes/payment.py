from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
from datetime import datetime, timedelta
import secrets
import hashlib

from api.auth import get_current_user
from api.routes.subscription import SUBSCRIPTION_PLANS

router = APIRouter()

# In-memory subscriptions store (temporary placeholder if DB not used here)
subscriptions_db: Dict[int, Any] = {}

# Helper to resolve Stripe price IDs from environment
def _get_stripe_price_id(plan_type: str, billing_period: str) -> Optional[str]:
    env_key = f"STRIPE_PRICE_{plan_type}_{billing_period}".upper()
    return os.getenv(env_key)


# ============ Stripe Checkout Session (Subscriptions) ============
class CreateCheckoutSessionRequest(BaseModel):
    plan_type: str
    billing_period: str = "monthly"  # "monthly" or "yearly"
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutSessionResponse(BaseModel):
    url: str


@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CreateCheckoutSessionRequest,
    current_user = Depends(get_current_user)
):
    if not STRIPE_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe not available"
        )

    # Validate plan
    if request.plan_type not in SUBSCRIPTION_PLANS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan type: {request.plan_type}"
        )

    price_id = _get_stripe_price_id(request.plan_type, request.billing_period)
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Missing Stripe price configuration"
        )

    success_url = request.success_url or os.getenv(
        "STRIPE_SUCCESS_URL", "http://localhost:3000/?checkout=success"
    )
    cancel_url = request.cancel_url or os.getenv(
        "STRIPE_CANCEL_URL", "http://localhost:3000/?checkout=cancel"
    )

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=str(current_user.id),
            metadata={
                "user_id": str(current_user.id),
                "plan_type": request.plan_type,
                "billing_period": request.billing_period,
            },
        )
        return CheckoutSessionResponse(url=session.url)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stripe error: {e}"
        )

# Try to import Stripe, but handle the case where it's not available
try:
    import stripe
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_...")
    STRIPE_AVAILABLE = True
except ImportError:
    STRIPE_AVAILABLE = False
    print("Warning: Stripe not available. Payment functionality will be limited.")

class CreatePaymentIntentRequest(BaseModel):
    plan_type: str
    duration: str = "monthly"  # "monthly" or "yearly"
    payment_method: str = "stripe"  # "stripe" or "crypto"

class PaymentIntentResponse(BaseModel):
    client_secret: str
    amount: int
    currency: str
    plan_type: str
    payment_method: str
    payment_url: Optional[str] = None

class ConfirmPaymentRequest(BaseModel):
    payment_intent_id: str
    plan_type: str
    duration: str = "monthly"
    payment_method: str = "stripe"

class CryptoPaymentRequest(BaseModel):
    plan_type: str
    duration: str = "monthly"
    crypto_currency: str = "BTC"  # "BTC", "ETH", "USDT"
    transaction_hash: Optional[str] = None

@router.post("/create-payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    request: CreatePaymentIntentRequest,
    current_user = Depends(get_current_user)
):
    """Create a payment intent for subscription"""
    try:
        # Validate plan type
        if request.plan_type not in SUBSCRIPTION_PLANS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan type: {request.plan_type}"
            )
        
        plan = SUBSCRIPTION_PLANS[request.plan_type]
        
        # Calculate amount based on duration
        if request.duration == "yearly":
            amount = int(plan.price_yearly * 100)  # Convert to cents
        else:
            amount = int(plan.price_monthly * 100)  # Convert to cents
        
        if request.payment_method == "stripe":
            if not STRIPE_AVAILABLE:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Stripe payment is not available at the moment"
                )
            
            # Create Stripe payment intent
            payment_intent = stripe.PaymentIntent.create(
                amount=amount,
                currency="usd",
                metadata={
                    "user_id": current_user.id,
                    "plan_type": request.plan_type,
                    "duration": request.duration
                },
                automatic_payment_methods={
                    "enabled": True,
                },
            )
            
            return PaymentIntentResponse(
                client_secret=payment_intent.client_secret,
                amount=amount,
                currency="usd",
                plan_type=request.plan_type,
                payment_method="stripe"
            )
        
        elif request.payment_method == "crypto":
            # Generate a unique payment ID for crypto payment
            payment_id = secrets.token_urlsafe(16)
            
            # Calculate crypto amount (simplified - in real implementation, you'd use current exchange rates)
            crypto_amounts = {
                "BTC": amount / 50000,  # Assuming 1 BTC = $50,000
                "ETH": amount / 3000,   # Assuming 1 ETH = $3,000
                "USDT": amount / 100    # USDT is 1:1 with USD
            }
            
            crypto_currency = "USDT"  # Default
            crypto_amount = crypto_amounts[crypto_currency]
            
            # Store payment intent in memory (in production, use a database)
            payment_intents = getattr(router, '_payment_intents', {})
            payment_intents[payment_id] = {
                "user_id": current_user.id,
                "plan_type": request.plan_type,
                "duration": request.duration,
                "amount": amount,
                "crypto_amount": crypto_amount,
                "crypto_currency": crypto_currency,
                "status": "pending",
                "created_at": datetime.utcnow().isoformat()
            }
            router._payment_intents = payment_intents
            
            return PaymentIntentResponse(
                client_secret=payment_id,
                amount=amount,
                currency="usd",
                plan_type=request.plan_type,
                payment_method="crypto",
                payment_url=f"crypto://payment/{payment_id}"
            )
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported payment method: {request.payment_method}"
            )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating payment intent: {str(e)}"
        )

@router.post("/confirm-payment")
async def confirm_payment(
    request: ConfirmPaymentRequest,
    current_user = Depends(get_current_user)
):
    """Confirm payment and activate subscription"""
    try:
        user_id = current_user.id
        
        if request.payment_method == "stripe":
            if not STRIPE_AVAILABLE:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Stripe payment is not available at the moment"
                )
            
            # Retrieve payment intent from Stripe
            payment_intent = stripe.PaymentIntent.retrieve(request.payment_intent_id)
            
            if payment_intent.status != "succeeded":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Payment not completed"
                )
        
        elif request.payment_method == "crypto":
            # Check if payment intent exists and is valid
            payment_intents = getattr(router, '_payment_intents', {})
            payment_intent_data = payment_intents.get(request.payment_intent_id)
            
            if not payment_intent_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Payment intent not found"
                )
            
            if payment_intent_data["user_id"] != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Payment intent does not belong to this user"
                )
            
            # In a real implementation, you would verify the crypto transaction here
            # For now, we'll just mark it as succeeded
            payment_intent_data["status"] = "succeeded"
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported payment method: {request.payment_method}"
            )
        
        # Calculate subscription dates
        start_date = datetime.utcnow()
        if request.duration == "yearly":
            end_date = start_date + timedelta(days=365)
        else:
            end_date = start_date + timedelta(days=30)
        
        # Update subscription in mock database (replace with real database)
        if user_id not in subscriptions_db:
            subscriptions_db[user_id] = {}
        
        subscriptions_db[user_id].update({
            "user_id": user_id,
            "plan": request.plan_type,
            "status": "active",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "payment_intent_id": request.payment_intent_id,
            "payment_method": request.payment_method,
            "queries_limit": SUBSCRIPTION_PLANS[request.plan_type].api_calls_limit,
            "queries_used": 0
        })
        
        return {
            "message": "Payment confirmed and subscription activated",
            "plan_type": request.plan_type,
            "status": "active",
            "end_date": end_date.isoformat(),
            "payment_method": request.payment_method
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error confirming payment: {str(e)}"
        )

@router.post("/crypto-payment")
async def create_crypto_payment(
    request: CryptoPaymentRequest,
    current_user = Depends(get_current_user)
):
    """Create a crypto payment for subscription"""
    try:
        # Validate plan type
        if request.plan_type not in SUBSCRIPTION_PLANS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan type: {request.plan_type}"
            )
        
        plan = SUBSCRIPTION_PLANS[request.plan_type]
        
        # Calculate amount based on duration
        if request.duration == "yearly":
            amount = int(plan.price_yearly * 100)  # Convert to cents
        else:
            amount = int(plan.price_monthly * 100)  # Convert to cents
        
        # Calculate crypto amount based on current rates (simplified)
        crypto_rates = {
            "BTC": 50000,  # $50,000 per BTC
            "ETH": 3000,   # $3,000 per ETH
            "USDT": 1      # $1 per USDT
        }
        
        if request.crypto_currency not in crypto_rates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported cryptocurrency: {request.crypto_currency}"
            )
        
        crypto_amount = amount / (crypto_rates[request.crypto_currency] * 100)
        
        # Generate payment ID
        payment_id = secrets.token_urlsafe(16)
        
        # Store payment intent
        payment_intents = getattr(router, '_payment_intents', {})
        payment_intents[payment_id] = {
            "user_id": current_user.id,
            "plan_type": request.plan_type,
            "duration": request.duration,
            "amount": amount,
            "crypto_amount": crypto_amount,
            "crypto_currency": request.crypto_currency,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
            "transaction_hash": request.transaction_hash
        }
        router._payment_intents = payment_intents
        
        return {
            "payment_id": payment_id,
            "crypto_amount": crypto_amount,
            "crypto_currency": request.crypto_currency,
            "usd_amount": amount / 100,
            "wallet_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",  # Example BTC address
            "payment_url": f"crypto://payment/{payment_id}"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating crypto payment: {str(e)}"
        )

@router.get("/payment-methods")
async def get_payment_methods():
    """Get available payment methods"""
    return {
        "payment_methods": [
            {
                "id": "stripe",
                "name": "Credit Card",
                "description": "Pay with Visa, Mastercard, or other major cards",
                "icon": "💳",
                "available": STRIPE_AVAILABLE
            },
            {
                "id": "crypto",
                "name": "Cryptocurrency",
                "description": "Pay with Bitcoin, Ethereum, or USDT",
                "icon": "₿",
                "available": True,
                "supported_currencies": ["BTC", "ETH", "USDT"]
            }
        ]
    } 