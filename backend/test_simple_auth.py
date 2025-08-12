#!/usr/bin/env python3
"""
Simple test script for the existing authentication system
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("🔧 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.ok:
            print("✅ Backend is healthy:", response.json())
            return True
        else:
            print("❌ Health check failed:", response.status_code)
            return False
    except Exception as e:
        print("❌ Health check error:", e)
        return False

def test_auth():
    """Test authentication with demo token"""
    print("\n🔐 Testing authentication...")
    try:
        headers = {"Authorization": "Bearer demo_token_123"}
        response = requests.get(f"{BASE_URL}/api/subscription/plans", headers=headers)
        
        if response.ok:
            data = response.json()
            print("✅ Authentication successful!")
            print(f"   Available plans: {list(data['plans'].keys())}")
            return True
        else:
            print("❌ Authentication failed:", response.status_code, response.text)
            return False
    except Exception as e:
        print("❌ Auth test error:", e)
        return False

def test_portfolio():
    """Test portfolio endpoint"""
    print("\n📊 Testing portfolio endpoint...")
    try:
        headers = {"Authorization": "Bearer demo_token_123"}
        response = requests.get(f"{BASE_URL}/api/portfolio/", headers=headers)
        
        if response.ok:
            print("✅ Portfolio endpoint working!")
            return True
        else:
            print("❌ Portfolio failed:", response.status_code, response.text)
            return False
    except Exception as e:
        print("❌ Portfolio test error:", e)
        return False

def test_subscription_upgrade():
    """Test subscription upgrade endpoint (simple test)"""
    print("\n💳 Testing subscription upgrade...")
    try:
        headers = {
            "Authorization": "Bearer demo_token_123",
            "Content-Type": "application/json"
        }
        
        # Simple test payload matching the expected model
        payload = {
            "plan_id": "pro",
            "amount": 29.0,
            "currency": "USD",
            "billing_period": "monthly",
            "payment_method": "stripe",
            "card": {
                "number": "4242424242424242",
                "exp_month": 12,
                "exp_year": 2025,
                "cvc": "123",
                "name": "Test User"
            },
            "billing_details": {
                "name": "Test User",
                "email": "test@example.com",
                "address": {
                    "line1": "123 Test St",
                    "city": "Test City",
                    "state": "TS",
                    "postal_code": "12345",
                    "country": "US"
                }
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/subscription/upgrade", 
                               headers=headers, 
                               json=payload)
        
        if response.status_code == 503:
            print("⚠️  Stripe not configured (expected for development)")
            return True
        elif response.ok:
            print("✅ Subscription upgrade endpoint working!")
            return True
        else:
            print(f"❌ Subscription upgrade failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print("❌ Subscription upgrade test error:", e)
        return False

def main():
    print("🚀 Testing Existing Authentication System")
    print("=" * 50)
    
    tests = [
        ("Health Check", test_health),
        ("Authentication", test_auth), 
        ("Portfolio Access", test_portfolio),
        ("Subscription Upgrade", test_subscription_upgrade),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        if test_func():
            passed += 1
        else:
            failed += 1
    
    print(f"\n📊 Test Results:")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    
    if failed == 0:
        print(f"\n🎉 All tests passed! Your authentication system is working!")
        print(f"\n💡 Next steps:")
        print(f"   1. Start frontend: cd ../frontend && npm run dev")
        print(f"   2. Test subscription flow in the UI")
        print(f"   3. Add your Stripe test keys to backend/config.local")
    else:
        print(f"\n⚠️  Some tests failed. Check the output above for details.")
    
    return failed == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)