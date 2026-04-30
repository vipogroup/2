const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

async function main() {
  // Create a valid JWT token for super_admin
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET not found in .env.local');
    process.exit(1);
  }
  console.log('JWT_SECRET found, length:', secret.length);

  // Find the super_admin user
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const user = await db.collection('users').findOne({ email: 'm0587009938@gmail.com' });
  console.log('User found:', user ? user.email + ' role:' + user.role : 'NOT FOUND');

  if (!user) {
    await client.close();
    return;
  }

  // Create JWT token
  const token = jwt.sign(
    { userId: user._id.toString(), id: user._id.toString(), role: user.role, email: user.email },
    secret,
    { expiresIn: '1h' }
  );
  console.log('Token created, length:', token.length);

  // Test API call with token
  const tenantId = '6980e7a13862e2a30b667a62';
  const url = 'http://localhost:3001/api/orders?tenantId=' + tenantId + '&page=1&limit=100';
  console.log('\nFetching:', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Cookie': 'auth_token=' + token + '; token=' + token,
    },
  });
  
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response keys:', Object.keys(data));
  
  if (data.error) {
    console.log('ERROR:', data.error);
  } else {
    const orders = data.orders || data.items || [];
    console.log('Orders count:', orders.length);
    console.log('Total:', data.total);
    orders.forEach((o, i) => {
      console.log('  Order', i + 1, ':', o._id, '| status:', o.status);
      (o.items || []).forEach(item => {
        console.log('    -', item.name?.substring(0, 40), '| purchaseType:', item.purchaseType, '| groupPurchaseType:', item.groupPurchaseType);
      });
    });
  }

  await client.close();
}

main().catch(e => console.error(e.message));
