// scripts/verify-admin.js
// Verify admin user and test password
require('dotenv').config({ path: '.env.production.upload' });

const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI missing');
  process.exit(1);
}

const dbName = process.env.MONGODB_DB || 'vipo';
const ADMIN_EMAIL = 'm0587009938@gmail.com';
const TEST_PASSWORD = '12345678';

console.log('🔍 Verifying admin user...');
console.log('📧 Email:', ADMIN_EMAIL);
console.log('🔗 Database:', dbName);
console.log('');

(async () => {
  const client = new MongoClient(uri);
  let exitCode = 0;

  try {
    await client.connect();
    console.log('🟢 Connected to MongoDB Atlas');
    const db = client.db(dbName);
    const users = db.collection('users');

    // Find admin user
    const admin = await users.findOne({ email: ADMIN_EMAIL });
    
    if (!admin) {
      console.log('❌ Admin user NOT found in database!');
      console.log('');
      console.log('💡 Run this to create admin:');
      console.log('   node scripts\\create-admin-vercel.js');
      exitCode = 1;
    } else {
      console.log('✅ Admin user found!');
      console.log('');
      console.log('📋 User Details:');
      console.log('   ID:', admin._id);
      console.log('   Email:', admin.email);
      console.log('   Role:', admin.role);
      console.log('   Active:', admin.isActive);
      console.log('   Has Password Hash:', Boolean(admin.passwordHash));
      console.log('');

      // Test password
      if (admin.passwordHash) {
        console.log('🔐 Testing password...');
        const matches = await bcrypt.compare(TEST_PASSWORD, admin.passwordHash);
        
        if (matches) {
          console.log('✅ Password is CORRECT!');
          console.log('');
          console.log('🎯 Login should work with:');
          console.log('   Email:', ADMIN_EMAIL);
          console.log('   Password:', TEST_PASSWORD);
        } else {
          console.log('❌ Password does NOT match!');
          console.log('');
          console.log('💡 Run this to reset password:');
          console.log('   node scripts\\create-admin-vercel.js');
          exitCode = 1;
        }
      } else {
        console.log('❌ No password hash found!');
        exitCode = 1;
      }
    }
  } catch (e) {
    exitCode = 1;
    console.error('❌ Error:', e.message);
  } finally {
    try {
      await client.close();
      console.log('');
      console.log('🔌 Disconnected from MongoDB');
    } catch {}
    process.exit(exitCode);
  }
})();
