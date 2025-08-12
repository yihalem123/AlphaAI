#!/usr/bin/env node

/**
 * Test Authentication Fix
 * Quick test to verify the auth system works
 */

console.log('🔐 Testing Authentication Fix')
console.log('=' * 40)

const testAuth = async () => {
  try {
    // Test backend health
    const healthResponse = await fetch('http://localhost:8000/health')
    if (!healthResponse.ok) {
      console.log('❌ Backend is not running')
      console.log('💡 Start backend with: cd backend && python main.py')
      return
    }
    console.log('✅ Backend is running')

    // Test signup
    const testUser = {
      email: 'testuser@example.com',
      password: 'testpass123',
      username: 'testuser',
      plan: 'free'
    }

    console.log('\n🔐 Testing signup...')
    const signupResponse = await fetch('http://localhost:8000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    })

    if (signupResponse.ok) {
      const signupData = await signupResponse.json()
      console.log('✅ Signup successful')
      console.log('   Token:', signupData.access_token ? 'Received' : 'Missing')

      // Test /me endpoint
      if (signupData.access_token) {
        console.log('\n👤 Testing user info...')
        const meResponse = await fetch('http://localhost:8000/api/auth/me', {
          headers: { 'Authorization': `Bearer ${signupData.access_token}` }
        })

        if (meResponse.ok) {
          const userData = await meResponse.json()
          console.log('✅ User info retrieved')
          console.log('   Email:', userData.email)
          console.log('   Username:', userData.username)
          console.log('   Subscription:', userData.subscription_tier)
        } else {
          console.log('❌ Failed to get user info')
        }
      }
    } else {
      const error = await signupResponse.json()
      if (signupResponse.status === 409) {
        console.log('⚠️ User already exists, testing login...')
        
        // Test login
        const loginResponse = await fetch('http://localhost:8000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password
          })
        })

        if (loginResponse.ok) {
          const loginData = await loginResponse.json()
          console.log('✅ Login successful')
          console.log('   Token:', loginData.access_token ? 'Received' : 'Missing')
        } else {
          console.log('❌ Login failed')
        }
      } else {
        console.log('❌ Signup failed:', error)
      }
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

console.log('\n🎯 What was fixed:')
console.log('✅ Removed demo token auto-fallback')
console.log('✅ Fixed AuthProvider login method')
console.log('✅ Direct login instead of events')
console.log('✅ Proper user state management')
console.log('✅ Dashboard shows after authentication')

console.log('\n🚀 Testing backend endpoints...')
testAuth()

console.log('\n💡 To test frontend:')
console.log('1. Open http://localhost:3000')
console.log('2. Click "Sign In"')
console.log('3. Try signing up with a new email')
console.log('4. Should show dashboard after successful login')
console.log('5. Should see your real name in navigation')