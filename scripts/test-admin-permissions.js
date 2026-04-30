// scripts/test-admin-permissions.js
// Test if admin can update data via API
console.log('🧪 Testing Admin Permissions...');
console.log('');

const API_BASE = 'https://vipo-agents-test.vercel.app';
const TEST_EMAIL = 'm0587009938@gmail.com';
const TEST_PASSWORD = '12345678';

(async () => {
  try {
    // Step 1: Login
    console.log('1️⃣ Logging in as admin...');
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    if (!loginRes.ok) {
      console.log('❌ Login failed!');
      const data = await loginRes.json();
      console.log('Error:', data);
      return;
    }

    console.log('✅ Login successful!');
    
    // Get cookies
    const cookies = loginRes.headers.get('set-cookie');
    if (!cookies) {
      console.log('⚠️  No cookies received!');
      return;
    }

    // Extract auth_token
    const authTokenMatch = cookies.match(/auth_token=([^;]+)/);
    if (!authTokenMatch) {
      console.log('⚠️  No auth_token in cookies!');
      return;
    }

    const authToken = authTokenMatch[1];
    console.log('🍪 Auth token:', authToken.substring(0, 20) + '...');
    console.log('');

    // Step 2: Get first product
    console.log('2️⃣ Getting first product...');
    const productsRes = await fetch(`${API_BASE}/api/products`);
    const products = await productsRes.json();
    
    if (!products || products.length === 0) {
      console.log('⚠️  No products found!');
      return;
    }

    const testProduct = products[0];
    console.log('✅ Found product:', testProduct.name);
    console.log('   ID:', testProduct._id);
    console.log('');

    // Step 3: Try to update product
    console.log('3️⃣ Trying to update product...');
    const newName = `${testProduct.name} [UPDATED ${Date.now()}]`;
    
    const updateRes = await fetch(`${API_BASE}/api/products/${testProduct._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_token=${authToken}`,
      },
      body: JSON.stringify({
        name: newName,
      }),
    });

    console.log('📊 Response Status:', updateRes.status, updateRes.statusText);
    
    const updateData = await updateRes.json();
    console.log('📦 Response Data:', JSON.stringify(updateData, null, 2));
    console.log('');

    if (updateRes.ok) {
      console.log('✅ Update successful!');
      console.log('   Old name:', testProduct.name);
      console.log('   New name:', updateData.name);
      console.log('');
      
      // Step 4: Verify update
      console.log('4️⃣ Verifying update...');
      const verifyRes = await fetch(`${API_BASE}/api/products/${testProduct._id}`);
      const verifiedProduct = await verifyRes.json();
      
      if (verifiedProduct.name === newName) {
        console.log('✅ Update verified! Product name changed successfully.');
      } else {
        console.log('❌ Update NOT saved! Product name is still:', verifiedProduct.name);
      }
    } else {
      console.log('❌ Update failed!');
      console.log('');
      console.log('🔍 Possible issues:');
      if (updateRes.status === 401) {
        console.log('   - Not authenticated (cookie not sent correctly)');
      } else if (updateRes.status === 403) {
        console.log('   - Not authorized (not admin)');
      } else if (updateRes.status === 500) {
        console.log('   - Server error (check MongoDB connection)');
      }
    }

  } catch (error) {
    console.error('❌ Exception:', error.message);
  }
})();
