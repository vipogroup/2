/**
 * Reset Super Admin Password
 * Run: node scripts/reset-super-admin-password.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
const NEW_PASSWORD = '1zxcvbnm';

async function resetPassword() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const users = db.collection('users');
    
    // Find super_admin
    const admin = await users.findOne({ role: 'super_admin' });
    if (!admin) {
      console.error('Super admin not found!');
      process.exit(1);
    }
    
    console.log('Found super admin:', admin.email);
    
    // Hash new password
    const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);
    
    // Update password
    await users.updateOne(
      { _id: admin._id },
      { $set: { passwordHash, updatedAt: new Date() } }
    );
    
    console.log('✅ Password reset successfully!');
    console.log('Email:', admin.email);
    console.log('New password:', NEW_PASSWORD);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

resetPassword();
