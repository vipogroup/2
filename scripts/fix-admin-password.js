// scripts/fix-admin-password.js
// Force recreate admin with fresh password hash
require('dotenv').config({ path: '.env.production.upload' });

const bcrypt = require('bcryptjs');
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'vipo';
const ADMIN_EMAIL = 'm0587009938@gmail.com';
const ADMIN_PASSWORD = '12345678';

console.log('🔧 Fixing admin password...');
console.log('📧 Email:', ADMIN_EMAIL);
console.log('');

(async () => {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db(dbName);
    const users = db.collection('users');
    
    // Find existing admin
    const existing = await users.findOne({ email: ADMIN_EMAIL });
    
    if (existing) {
      console.log('📋 Found existing admin:');
      console.log('   ID:', existing._id);
      console.log('   Email:', existing.email);
      console.log('   Role:', existing.role);
      console.log('');
      
      // Delete old admin
      console.log('🗑️  Deleting old admin...');
      await users.deleteOne({ _id: existing._id });
      console.log('✅ Deleted');
      console.log('');
    }
    
    // Create fresh password hash
    console.log('🔐 Creating new password hash...');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(ADMIN_PASSWORD, salt);
    console.log('✅ Hash created');
    console.log('');
    
    // Create new admin from scratch
    console.log('👤 Creating new admin user...');
    const result = await users.insertOne({
      email: ADMIN_EMAIL,
      phone: '0533752633',
      fullName: 'System Admin',
      passwordHash: hash,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      referralsCount: 0,
      commissionBalance: 0,
      totalSales: 0,
      commissionOnHold: 0,
    });
    
    console.log('✅ Admin created successfully!');
    console.log('   New ID:', result.insertedId);
    console.log('');
    
    // Verify password works
    console.log('🧪 Testing password...');
    const newAdmin = await users.findOne({ _id: result.insertedId });
    const matches = await bcrypt.compare(ADMIN_PASSWORD, newAdmin.passwordHash);
    
    if (matches) {
      console.log('✅ Password verification PASSED!');
    } else {
      console.log('❌ Password verification FAILED!');
    }
    
    console.log('');
    console.log('═══════════════════════════════════');
    console.log('✅ Admin user ready!');
    console.log('═══════════════════════════════════');
    console.log('');
    console.log('🎯 Login at: https://vipo-agents-test.vercel.app/login');
    console.log('');
    console.log('📋 Credentials:');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e);
  } finally {
    await client.close();
    console.log('🔌 Disconnected');
  }
})();
