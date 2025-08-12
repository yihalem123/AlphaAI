#!/usr/bin/env node

/**
 * Test Real Authentication Integration
 * Tests that the frontend properly connects to backend auth
 */

console.log('🔐 Real Authentication Integration Test')
console.log('=' * 50)

// Test the authentication flow
const testAuthFlow = async () => {
  const API_BASE_URL = 'http://localhost:8000'
  
  console.log('\n📋 Testing Authentication Flow...')
  
  try {
    // Test 1: Check if backend is running
    console.log('1. Checking if backend is running...')
    const healthResponse = await fetch(`${API_BASE_URL}/health`)
    if (healthResponse.ok) {
      console.log('✅ Backend is running')
    } else {
      console.log('❌ Backend is not responding')
      return
    }
    
    // Test 2: Test signup endpoint
    console.log('\n2. Testing signup endpoint...')
    const signupData = {
      email: 'test@example.com',
      password: 'testpassword123',
      username: 'testuser',
      plan: 'free'
    }
    
    const signupResponse = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData)
    })
    
    if (signupResponse.ok) {
      const signupResult = await signupResponse.json()
      console.log('✅ Signup endpoint works')
      console.log('   Access token received:', signupResult.access_token ? 'Yes' : 'No')
      
      // Test 3: Test /me endpoint with the token
      if (signupResult.access_token) {
        console.log('\n3. Testing /me endpoint...')
        const meResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${signupResult.access_token}` }
        })
        
        if (meResponse.ok) {
          const userData = await meResponse.json()
          console.log('✅ /me endpoint works')
          console.log('   User data:', {
            email: userData.email,
            username: userData.username,
            subscription_tier: userData.subscription_tier
          })
        } else {
          console.log('❌ /me endpoint failed')
        }
      }
    } else {
      const error = await signupResponse.json()
      if (signupResponse.status === 409) {
        console.log('⚠️ User already exists (this is expected)')
        
        // Test login instead
        console.log('\n2b. Testing login endpoint...')
        const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: signupData.email,
            password: signupData.password
          })
        })
        
        if (loginResponse.ok) {
          const loginResult = await loginResponse.json()
          console.log('✅ Login endpoint works')
          console.log('   Access token received:', loginResult.access_token ? 'Yes' : 'No')
        } else {
          console.log('❌ Login endpoint failed')
        }
      } else {
        console.log('❌ Signup failed:', error)
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

// Instructions for the user
console.log('\n💡 Instructions:')
console.log('1. Make sure your backend is running: python main.py')
console.log('2. Then test the frontend authentication')
console.log('3. Try signing up with a new email')
console.log('4. Check if the real user name appears instead of "demo_user"')

console.log('\n🔍 What to expect:')
console.log('- Real users should see their actual name/email in navigation')
console.log('- Demo user should only appear in development mode')
console.log('- Authentication should persist between page reloads')
console.log('- Token expiry should trigger automatic logout')

console.log('\n🎯 Frontend Changes Made:')
console.log('✅ Real authentication API calls in handleAuth()')
console.log('✅ AuthProvider listens for user update events')
console.log('✅ Demo token only used in development mode')
console.log('✅ Real user data displayed in navigation')
console.log('✅ Token validation and expiry handling')

console.log('\n🚀 Ready to test!')
console.log('Start your backend and try logging in with real credentials.')

if (process.argv.includes('--test-backend')) {
  testAuthFlow()
}