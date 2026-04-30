// scripts/test-login-api.js
// Test login API directly
require('dotenv').config({ path: '.env.production.upload' });

const TEST_EMAIL = 'm0587009938@gmail.com';
const TEST_PASSWORD = '12345678';

console.log('🧪 Testing Login API...');
console.log('📧 Email:', TEST_EMAIL);
console.log('🔑 Password:', TEST_PASSWORD);
console.log('');

(async () => {
  try {
    const url = 'https://vipo-agents-test.vercel.app/api/auth/login';
    
    console.log('📡 Sending request to:', url);
    console.log('');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        rememberMe: false,
      }),
    });

    console.log('📊 Response Status:', response.status, response.statusText);
    console.log('');

    const data = await response.json();
    console.log('📦 Response Data:', JSON.stringify(data, null, 2));
    console.log('');

    if (response.ok) {
      console.log('✅ Login API works!');
      console.log('👤 User role:', data.role);
      
      // Check cookies
      const cookies = response.headers.get('set-cookie');
      if (cookies) {
        console.log('🍪 Cookies set:', cookies);
      } else {
        console.log('⚠️  No cookies in response');
      }
    } else {
      console.log('❌ Login failed!');
      console.log('💡 Error:', data.message || data.error);
      
      if (data.message === 'Invalid email or password') {
        console.log('');
        console.log('🔍 Possible issues:');
        console.log('   1. Email not found in database');
        console.log('   2. Password hash mismatch');
        console.log('   3. Database connection issue');
      }
    }
  } catch (e) {
    console.error('❌ Exception:', e.message);
  }
})();
