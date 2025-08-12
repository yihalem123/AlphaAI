#!/usr/bin/env python3
"""
Test script for authentication system
Run this to test the auth endpoints and get a development token
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"

def test_dev_login():
    """Test development login endpoint"""
    print("🔐 Testing dev login endpoint...")
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/dev-login")
        print(f"Status: {response.status_code}")
        
        if response.ok:
            data = response.json()
            print(f"✅ Success! Token obtained:")
            print(f"   Access Token: {data['access_token'][:50]}...")
            print(f"   Expires In: {data['expires_in']} seconds ({data['expires_in'] // (24*60*60)} days)")
            print(f"   User: {data['user']['username']} ({data['user']['email']})")
            print(f"   Subscription: {data['user']['subscription_tier']}")
            return data['access_token']
        else:
            print(f"❌ Failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_subscription_with_token(token):
    """Test subscription endpoint with token"""
    print("\n📊 Testing subscription endpoint with token...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/api/subscription/plans", headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.ok:
            data = response.json()
            print(f"✅ Subscription plans retrieved successfully!")
            print(f"   Available plans: {list(data['plans'].keys())}")
            print(f"   Payment methods: {data['payment_methods']}")
        else:
            print(f"❌ Failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_demo_token():
    """Test demo token"""
    print("\n🔧 Testing demo token...")
    
    headers = {
        "Authorization": "Bearer demo_token_123",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/api/subscription/plans", headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.ok:
            print(f"✅ Demo token works!")
        else:
            print(f"❌ Demo token failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_health():
    """Test health endpoint"""
    print("❤️ Testing health endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        
        if response.ok:
            data = response.json()
            print(f"✅ Backend is healthy: {data}")
        else:
            print(f"❌ Health check failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Backend is not running or unreachable: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 Testing AI Trading Platform Authentication")
    print("=" * 60)
    
    # Test if backend is running
    if not test_health():
        print("\n💡 Make sure to start the backend first:")
        print("   cd backend && python main.py")
        exit(1)
    
    # Test demo token
    test_demo_token()
    
    # Test dev login
    token = test_dev_login()
    
    if token:
        # Test subscription endpoint with new token
        test_subscription_with_token(token)
        
        print(f"\n🎉 Authentication system is working!")
        print(f"\n💡 You can now use this token in your frontend:")
        print(f"   localStorage.setItem('auth_token', '{token[:50]}...')")
    else:
        print(f"\n❌ Authentication system needs fixing")
    
    print("\n" + "=" * 60)
    print("✅ Testing complete!")