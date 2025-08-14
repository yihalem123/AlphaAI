#!/usr/bin/env python3
"""
Simple test script to verify payment flow endpoints
"""
import requests
import json

API_BASE = "http://localhost:8000"

def test_payment_endpoints():
    print("🧪 Testing Payment Flow Endpoints")
    print("=" * 50)
    
    # Test 1: Check if payment routes are accessible
    try:
        response = requests.get(f"{API_BASE}/api/payment/payment-methods")
        print(f"✅ Payment methods endpoint: {response.status_code}")
        if response.status_code == 200:
            methods = response.json()
            print(f"   Available payment methods: {[m['id'] for m in methods['payment_methods']]}")
    except Exception as e:
        print(f"❌ Payment methods endpoint error: {e}")
    
    # Test 2: Check subscription plans
    try:
        response = requests.get(f"{API_BASE}/api/subscription/plans")
        print(f"✅ Subscription plans endpoint: {response.status_code}")
        if response.status_code == 200:
            plans = response.json()
            print(f"   Available plans: {list(plans['plans'].keys())}")
    except Exception as e:
        print(f"❌ Subscription plans endpoint error: {e}")
    
    # Test 3: Check auth health
    try:
        response = requests.get(f"{API_BASE}/api/auth/health")
        print(f"✅ Auth health endpoint: {response.status_code}")
    except Exception as e:
        print(f"❌ Auth health endpoint error: {e}")
    
    print("\n🔍 To test complete payment flow:")
    print("1. Start backend: python -m uvicorn main:app --reload --port 8000")
    print("2. Start frontend: npm run dev")
    print("3. Go to http://localhost:3000")
    print("4. Sign in and try upgrading subscription")
    print("5. Use test card: 4242 4242 4242 4242")
    print("6. Check console logs for payment flow debugging")

if __name__ == "__main__":
    test_payment_endpoints()
