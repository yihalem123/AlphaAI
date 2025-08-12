#!/usr/bin/env python3
"""
Test script for subscription endpoints
Run this to test the subscription API endpoints
"""

import requests
import json
import os

# Configuration
BASE_URL = "http://localhost:8000"
TEST_TOKEN = "demo_token_123"  # Use your demo token

def test_get_plans():
    """Test getting subscription plans"""
    print("Testing GET /api/subscription/plans...")
    
    response = requests.get(f"{BASE_URL}/api/subscription/plans")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print("-" * 50)

def test_stripe_upgrade():
    """Test Stripe subscription upgrade"""
    print("Testing POST /api/subscription/upgrade...")
    
    headers = {
        "Authorization": f"Bearer {TEST_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "plan_id": "pro",
        "amount": 29.0,
        "currency": "USD",
        "billing_period": "monthly",
        "payment_method": "stripe",
        "card": {
            "number": "4242424242424242",  # Stripe test card
            "exp_month": 12,
            "exp_year": 2025,
            "cvc": "123",
            "name": "Test User"
        },
        "billing_details": {
            "email": "test@example.com",
            "address": {
                "line1": "123 Test St",
                "city": "Test City",
                "state": "CA",
                "postal_code": "12345",
                "country": "US"
            }
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/subscription/upgrade", 
            headers=headers,
            json=payload
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("-" * 50)

def test_crypto_payment():
    """Test crypto payment creation"""
    print("Testing POST /api/subscription/crypto-payment...")
    
    headers = {
        "Authorization": f"Bearer {TEST_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "plan_id": "pro",
        "amount": 29.0,
        "currency": "USD",
        "billing_period": "monthly",
        "crypto_type": "bitcoin"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/subscription/crypto-payment", 
            headers=headers,
            json=payload
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("-" * 50)

def test_health():
    """Test health endpoint"""
    print("Testing GET /health...")
    
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print("-" * 50)

if __name__ == "__main__":
    print("🚀 Testing AI Trading Platform Subscription API")
    print("=" * 60)
    
    # Test basic endpoints first
    test_health()
    test_get_plans()
    
    # Test payment endpoints (these will fail if Stripe keys are not configured)
    print("⚠️  Note: Payment tests will fail if Stripe keys are not configured")
    test_crypto_payment()
    # test_stripe_upgrade()  # Commented out to avoid charges during testing
    
    print("✅ Testing complete!")
    print("💡 To test Stripe payments:")
    print("   1. Add your Stripe test keys to backend/config.local")
    print("   2. Uncomment the test_stripe_upgrade() call above")
    print("   3. Use test card numbers from: https://stripe.com/docs/testing")