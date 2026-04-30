// scripts/check-db-connection.js
// Check which database Vercel is actually using
require('dotenv').config({ path: '.env.production.upload' });

const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'vipo';

console.log('🔍 Checking database connection...');
console.log('');
console.log('📋 Configuration:');
console.log('   URI:', uri ? uri.substring(0, 30) + '...' : 'NOT SET');
console.log('   Database:', dbName);
console.log('');

(async () => {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const users = db.collection('users');
    
    // Count all users
    const totalUsers = await users.countDocuments();
    console.log('');
    console.log('📊 Database Statistics:');
    console.log('   Total users:', totalUsers);
    
    // Find admin
    const admin = await users.findOne({ email: 'm0587009938@gmail.com' });
    if (admin) {
      console.log('   ✅ Admin found');
      console.log('   Admin ID:', admin._id);
      console.log('   Admin role:', admin.role);
    } else {
      console.log('   ❌ Admin NOT found');
    }
    
    // List all users
    console.log('');
    console.log('📋 All users in database:');
    const allUsers = await users.find({}, { projection: { email: 1, role: 1, _id: 1 } }).toArray();
    allUsers.forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.email} (${u.role}) - ID: ${u._id}`);
    });
    
    if (allUsers.length === 0) {
      console.log('   (No users found - database is empty!)');
    }
    
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await client.close();
    console.log('');
    console.log('🔌 Disconnected');
  }
})();
