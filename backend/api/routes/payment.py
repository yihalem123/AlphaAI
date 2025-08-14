from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
from datetime import datetime, timedelta
import secrets
import hashlib

from api.auth_secure import get_current_user, get_current_user_optional
from core.auth_enhanced import enhanced_auth_service
from api.routes.subscription import SUBSCRIPTION_PLANS
from core.database import get_db, User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

router = APIRouter()

# In-memory subscriptions store (temporary placeholder if DB not used here)
subscriptions_db: Dict[int, Any] = {}
CHECKOUT_EXCHANGES: Dict[str, Any] = {}
# Payment session preservation
PAYMENT_AUTH_PRESERVATION: Dict[str, Any] = {}

# Cleanup expired preservation data
async def cleanup_expired_preservation():
    """Remove expired auth preservation data"""
    current_time = datetime.utcnow()
    expired_keys = [
        key for key, data in PAYMENT_AUTH_PRESERVATION.items()
        if data.get("expires_at", current_time) <= current_time
    ]
    for key in expired_keys:
        PAYMENT_AUTH_PRESERVATION.pop(key, None)
    
    if expired_keys:
        print(f"[CLEANUP] Removed {len(expired_keys)} expired payment auth preservation entries")

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
def _get_or_create_stripe_customer_for_user(user: Any) -> Optional[str]:
    """Find or create a Stripe customer for the given user by email."""
    if not STRIPE_AVAILABLE:
        return None
    # Try to find existing customer by email
    customers = stripe.Customer.list(email=user.email, limit=1)
    if customers.data:
        return customers.data[0].id
    # Create new customer
    created = stripe.Customer.create(email=user.email, name=user.username or user.email)
    return created.id



@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    payload: CreateCheckoutSessionRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user_optional),
):
    if not STRIPE_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe not available"
        )

    # Debug: log incoming cookies
    try:
        cookie_keys = list(request.cookies.keys())
        print(f"[checkout] cookies present: {cookie_keys}")
    except Exception:
        pass

    # Best-effort silent refresh for expired access token
    if not current_user:
        refresh_cookie = request.cookies.get("refresh_token")
        if refresh_cookie:
            try:
                print("[checkout] attempting silent refresh via refresh_token cookie")
                user, new_tokens = await enhanced_auth_service.refresh_user_tokens(db, refresh_cookie, request)
                enhanced_auth_service.set_auth_cookies(response, new_tokens)
                current_user = user
            except Exception:
                print("[checkout] silent refresh failed")

    # If still no session, proceed without attaching customer; user will be resolved on success via email

    # Validate plan
    if payload.plan_type not in SUBSCRIPTION_PLANS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan type: {payload.plan_type}"
        )

    price_id = _get_stripe_price_id(payload.plan_type, payload.billing_period)
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Missing Stripe price configuration"
        )

    success_url = payload.success_url or os.getenv(
        "STRIPE_SUCCESS_URL", "http://localhost:3000/?checkout=success"
    )
    cancel_url = payload.cancel_url or os.getenv(
        "STRIPE_CANCEL_URL", "http://localhost:3000/?checkout=cancel"
    )

    try:
        customer_id = _get_or_create_stripe_customer_for_user(current_user)
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=str(current_user.id),
            metadata={
                "user_id": str(current_user.id),
                "plan_type": payload.plan_type,
                "billing_period": payload.billing_period,
            },
            customer=customer_id,
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


# ============ Stripe Billing Portal & Webhooks ============

class BillingPortalRequest(BaseModel):
    return_url: Optional[str] = None

class BillingPortalResponse(BaseModel):
    url: str

@router.post("/create-billing-portal-session", response_model=BillingPortalResponse)
async def create_billing_portal_session(
    request: BillingPortalRequest,
    current_user = Depends(get_current_user)
):
    if not STRIPE_AVAILABLE:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stripe not available")
    try:
        customer_id = _get_or_create_stripe_customer_for_user(current_user)
        return_url = request.return_url or os.getenv("STRIPE_PORTAL_RETURN_URL", "http://localhost:3000/dashboard")
        session = stripe.billing_portal.Session.create(customer=customer_id, return_url=return_url)
        return BillingPortalResponse(url=session.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe portal error: {e}")


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    if not STRIPE_AVAILABLE:
        # Accept but do nothing
        return {"received": True}
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    try:
        if webhook_secret:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            # Unsafe fallback in dev
            event = stripe.Event.construct_from(request.json(), stripe.api_key)  # type: ignore
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    event_type = event["type"]
    data_obj = event["data"]["object"]

    async def activate_user_subscription(user_id: int, plan_type: str, period_end_unix: Optional[int]):
        # Compute expiry
        expires = datetime.utcfromtimestamp(period_end_unix) if period_end_unix else (datetime.utcnow() + timedelta(days=30))
        print(f"[webhook] Activating subscription for user {user_id}: {plan_type} until {expires}")
        await db.execute(
            update(User)
            .where(User.id == user_id)
            .values(
                subscription_tier=plan_type,
                subscription_expires=expires,
                daily_limit=SUBSCRIPTION_PLANS.get(plan_type, SUBSCRIPTION_PLANS["pro"]).api_calls_limit
            )
        )
        await db.commit()
        print(f"[webhook] Subscription activated successfully for user {user_id}")

    try:
        if event_type == "checkout.session.completed":
            print(f"[webhook] Processing checkout.session.completed event")
            metadata = data_obj.get("metadata", {})
            user_id = metadata.get("user_id") or data_obj.get("client_reference_id")
            plan_type = metadata.get("plan_type", "pro")
            print(f"[webhook] Found user_id: {user_id}, plan_type: {plan_type}")
            
            if user_id:
                user_id = int(user_id)
                # Retrieve subscription to get period end
                subscription_id = data_obj.get("subscription")
                period_end = None
                if subscription_id:
                    sub = stripe.Subscription.retrieve(subscription_id)
                    period_end = sub["current_period_end"]
                    print(f"[webhook] Found subscription: {subscription_id}, period_end: {period_end}")
                await activate_user_subscription(user_id, plan_type, period_end)
            else:
                print(f"[webhook] ERROR: No user_id found in metadata or client_reference_id")
        elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
            # Best-effort: get user id from latest invoice/customer's email
            subscription_id = data_obj.get("id")
            customer_id = data_obj.get("customer")
            period_end = data_obj.get("current_period_end")
            # Try metadata via latest invoice
            user_id = None
            plan_type = "pro"
            try:
                if subscription_id:
                    invoices = stripe.Invoice.list(subscription=subscription_id, limit=1)
                    if invoices.data:
                        inv = invoices.data[0]
                        if inv.get("metadata") and inv["metadata"].get("user_id"):
                            user_id = int(inv["metadata"]["user_id"])  # type: ignore
                        if inv.get("metadata") and inv["metadata"].get("plan_type"):
                            plan_type = inv["metadata"]["plan_type"]
            except Exception:
                pass
            if not user_id and customer_id:
                # Fallback by customer email
                cust = stripe.Customer.retrieve(customer_id)
                email = cust.get("email")
                if email:
                    result = await db.execute(select(User).where(User.email == email))
                    user = result.scalar_one_or_none()
                    if user:
                        user_id = user.id
            if user_id:
                await activate_user_subscription(user_id, plan_type, period_end)
        elif event_type == "customer.subscription.deleted":
            # Downgrade on cancel
            customer_id = data_obj.get("customer")
            if customer_id:
                cust = stripe.Customer.retrieve(customer_id)
                email = cust.get("email")
                if email:
                    result = await db.execute(select(User).where(User.email == email))
                    user = result.scalar_one_or_none()
                    if user:
                        await db.execute(
                            update(User)
                            .where(User.id == user.id)
                            .values(subscription_tier="free")
                        )
                        await db.commit()
    except Exception as e:
        # Do not fail webhook delivery; log via HTTP exception
        raise HTTPException(status_code=200, detail=f"Handled with warning: {e}")

    return {"received": True}


# ============ Test/Debug endpoints ============

@router.get("/subscription-status")
async def get_subscription_status(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's subscription status"""
    try:
        # Refresh user data from database
        result = await db.execute(select(User).where(User.id == current_user.id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "user_id": user.id,
            "email": user.email,
            "subscription_tier": user.subscription_tier,
            "subscription_expires": user.subscription_expires.isoformat() if user.subscription_expires else None,
            "daily_limit": user.daily_limit,
            "api_calls_count": user.api_calls_count,
            "is_active": user.subscription_expires > datetime.utcnow() if user.subscription_expires else user.subscription_tier == "free"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get subscription status: {e}")

@router.post("/test-subscription-activation")
async def test_subscription_activation(
    user_id: int,
    plan_type: str = "pro",
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Test endpoint to manually activate subscription (for debugging)"""
    try:
        # Only allow users to activate their own subscription or admins
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        expires = datetime.utcnow() + timedelta(days=30)
        await db.execute(
            update(User)
            .where(User.id == user_id)
            .values(
                subscription_tier=plan_type,
                subscription_expires=expires,
                daily_limit=SUBSCRIPTION_PLANS.get(plan_type, SUBSCRIPTION_PLANS["pro"]).api_calls_limit
            )
        )
        await db.commit()
        
        return {
            "message": f"Subscription activated for user {user_id}",
            "plan_type": plan_type,
            "expires": expires.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to activate subscription: {e}")


# ============ Redirect helpers to avoid CORS/auth header issues ============

@router.get("/checkout/redirect")
async def checkout_redirect(
    plan_type: str,
    billing_period: str = "monthly",
    request: Request = None,
    response: Response = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    """Create a Stripe Checkout Session and redirect the browser to it.
    Preserve authentication state during payment flow.
    """
    # Clean up any expired preservation data
    await cleanup_expired_preservation()
    
    if not STRIPE_AVAILABLE:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stripe not available")

    # Attempt silent refresh if session missing/expired, but do not block checkout
    if not current_user:
        refresh_cookie = request.cookies.get("refresh_token") if request else None
        if refresh_cookie:
            try:
                user, new_tokens = await enhanced_auth_service.refresh_user_tokens(db, refresh_cookie, request)
                enhanced_auth_service.set_auth_cookies(response, new_tokens)
                current_user = user
            except Exception:
                pass

    if plan_type not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid plan type: {plan_type}")

    price_id = _get_stripe_price_id(plan_type, billing_period)
    if not price_id:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Missing Stripe price configuration")

    # Create a payment session ID to preserve auth state
    payment_session_id = secrets.token_urlsafe(32)
    
    # Preserve authentication info for this payment session
    if current_user:
        PAYMENT_AUTH_PRESERVATION[payment_session_id] = {
            "user_id": current_user.id,
            "email": current_user.email,
            "subscription_tier": current_user.subscription_tier,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(hours=2)  # 2 hour window for payment
        }
        print(f"[PAYMENT] Preserved auth for user {current_user.id} with session {payment_session_id}")

    frontend_success = os.getenv("STRIPE_SUCCESS_URL", "http://localhost:3000/?checkout=success")
    frontend_cancel  = os.getenv("STRIPE_CANCEL_URL",  "http://localhost:3000/?checkout=cancel")
    backend_base = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")
    
    # Include payment session ID in success URL
    success_url = f"{backend_base}/api/payment/checkout/success?session_id={{CHECKOUT_SESSION_ID}}&payment_session={payment_session_id}&redirect={frontend_success}"
    cancel_url  = f"{frontend_cancel}"

    try:
        customer_id = _get_or_create_stripe_customer_for_user(current_user) if current_user else None
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=str(current_user.id) if current_user else None,
            metadata={
                **({"user_id": str(current_user.id)} if current_user else {}),
                "plan_type": plan_type,
                "billing_period": billing_period,
                "payment_session_id": payment_session_id,
            },
            customer=customer_id,
        )
        return RedirectResponse(url=session.url, status_code=303)
    except Exception as e:
        # Clean up preservation data on error
        PAYMENT_AUTH_PRESERVATION.pop(payment_session_id, None)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Stripe error: {e}")


@router.get("/billing-portal/redirect")
async def billing_portal_redirect(
    request: Request,
    current_user = Depends(get_current_user)
):
    if not STRIPE_AVAILABLE:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stripe not available")
    try:
        customer_id = _get_or_create_stripe_customer_for_user(current_user)
        return_url = os.getenv("STRIPE_PORTAL_RETURN_URL", "http://localhost:3000/dashboard")
        session = stripe.billing_portal.Session.create(customer=customer_id, return_url=return_url)
        return RedirectResponse(url=session.url, status_code=303)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe portal error: {e}")


@router.get("/checkout/success")
async def checkout_success(
    session_id: str,
    payment_session: Optional[str] = None,
    redirect: Optional[str] = None,
    request: Request = None,
    response: Response = None,
    db: AsyncSession = Depends(get_db)
):
    """Stripe returns here after successful checkout. Activate subscription and restore authentication."""
    try:
        print(f"[SUCCESS] Processing checkout success for session: {session_id}, payment_session: {payment_session}")
        
        if not STRIPE_AVAILABLE:
            return RedirectResponse(url=redirect or "/", status_code=303)
        
        # Retrieve Stripe session
        session = stripe.checkout.Session.retrieve(session_id)
        print(f"[SUCCESS] Retrieved Stripe session: {session.id}")
        
        # Get user from session metadata
        metadata = session.get("metadata", {})
        user_id = metadata.get("user_id") or session.get("client_reference_id")
        plan_type = metadata.get("plan_type", "pro")
        
        print(f"[SUCCESS] Session metadata - user_id: {user_id}, plan_type: {plan_type}")
        
        if not user_id:
            print("[SUCCESS] ERROR: No user_id found in session")
            return RedirectResponse(url=(redirect or "/") + "?error=no_user", status_code=303)
        
        # IMMEDIATELY activate subscription (don't wait for webhook)
        user_id = int(user_id)
        expires = datetime.utcnow() + timedelta(days=30)  # Default 30 days
        
        # Get subscription details from Stripe if available
        subscription_id = session.get("subscription")
        if subscription_id:
            try:
                sub = stripe.Subscription.retrieve(subscription_id)
                expires = datetime.utcfromtimestamp(sub["current_period_end"])
                print(f"[SUCCESS] Got subscription period end: {expires}")
            except Exception as e:
                print(f"[SUCCESS] Warning: Could not retrieve subscription details: {e}")
        
        # Update user subscription in database
        print(f"[SUCCESS] Activating subscription for user {user_id}: {plan_type} until {expires}")
        
        result = await db.execute(
            update(User)
            .where(User.id == user_id)
            .values(
                subscription_tier=plan_type,
                subscription_expires=expires,
                daily_limit=SUBSCRIPTION_PLANS.get(plan_type, SUBSCRIPTION_PLANS["pro"]).api_calls_limit
            )
        )
        await db.commit()
        
        print(f"[SUCCESS] Subscription activated successfully for user {user_id}")
        
        # Try to restore authentication using preserved session
        auth_code = None
        if payment_session and payment_session in PAYMENT_AUTH_PRESERVATION:
            preserved = PAYMENT_AUTH_PRESERVATION[payment_session]
            
            # Check if preservation hasn't expired and matches the user
            if (preserved["expires_at"] > datetime.utcnow() and 
                preserved["user_id"] == user_id):
                
                try:
                    # Get fresh user data from DB
                    user_result = await db.execute(select(User).where(User.id == user_id))
                    user = user_result.scalar_one_or_none()
                    
                    if user:
                        # Create fresh authentication tokens
                        class _MockRequest:
                            def __init__(self):
                                self.client = type("c", (), {"host": "127.0.0.1"})()
                                self.headers = {}
                        
                        mock_request = _MockRequest()
                        tokens = await enhanced_auth_service.create_auth_tokens(db, user, mock_request, remember_me=True)
                        enhanced_auth_service.set_auth_cookies(response, tokens)
                        
                        # Create one-time exchange code for frontend
                        auth_code = secrets.token_urlsafe(16)
                        CHECKOUT_EXCHANGES[auth_code] = {
                            "user_id": user.id,
                            "tokens": tokens,
                            "expires_at": datetime.utcnow() + timedelta(minutes=5)
                        }
                        
                        print(f"[SUCCESS] Created fresh auth tokens and exchange code for user {user_id}")
                        
                    # Clean up preserved data
                    PAYMENT_AUTH_PRESERVATION.pop(payment_session, None)
                    
                except Exception as e:
                    print(f"[SUCCESS] Warning: Could not restore authentication: {e}")
        
        # Create redirect URL
        redirect_url = redirect or "http://localhost:3000"
        sep = '&' if ('?' in redirect_url) else '?'
        
        if auth_code:
            final_url = f"{redirect_url}{sep}payment_success=true&plan={plan_type}&code={auth_code}"
        else:
            final_url = f"{redirect_url}{sep}payment_success=true&plan={plan_type}&user_id={user_id}"
        
        print(f"[SUCCESS] Redirecting to: {final_url}")
        
        return RedirectResponse(url=final_url, status_code=302)
        
    except Exception as e:
        print(f"[SUCCESS] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return RedirectResponse(url=(redirect or "http://localhost:3000") + "?error=processing_failed", status_code=302)


@router.get("/exchange")
async def exchange_code_for_session(code: str, response: Response):
    """Front-end calls this with a one-time code to receive fresh cookies and token payload."""
    record = CHECKOUT_EXCHANGES.get(code)
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    if record["expires_at"] < datetime.utcnow():
        CHECKOUT_EXCHANGES.pop(code, None)
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    tokens = record["tokens"]
    # Set cookies again (in case browser missed prior Set-Cookie)
    enhanced_auth_service.set_auth_cookies(response, tokens)
    # Remove code after use
    CHECKOUT_EXCHANGES.pop(code, None)
    return {
        "access_token": tokens.get("access_token"),
        "expires_in": tokens.get("expires_in"),
        "session_id": tokens.get("session_id")
    }