// Script to check push subscriptions in MongoDB
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vipo';
  const dbName = process.env.MONGODB_DB || 'vipo';
  
  console.log('Connecting to MongoDB...');
  console.log('URI:', uri.replace(/\/\/.*@/, '//***@')); // Hide credentials
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected successfully!\n');
    
    const db = client.db(dbName);
    const col = db.collection('pushSubscriptions');
    
    // Count total subscriptions
    const total = await col.countDocuments();
    console.log('📊 Total subscriptions:', total);
    
    // Count active (non-revoked) subscriptions
    const active = await col.countDocuments({
      $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }]
    });
    console.log('✅ Active subscriptions:', active);
    
    // Count by tag
    const customerCount = await col.countDocuments({ tags: 'customer', revokedAt: null });
    const agentCount = await col.countDocuments({ tags: 'agent', revokedAt: null });
    const adminCount = await col.countDocuments({ tags: 'admin', revokedAt: null });
    console.log('\n📋 By tag:');
    console.log('   - customer:', customerCount);
    console.log('   - agent:', agentCount);
    console.log('   - admin:', adminCount);
    
    // Show recent subscriptions
    const recent = await col.find({}).sort({ updatedAt: -1 }).limit(5).toArray();
    console.log('\n📝 Recent subscriptions:');
    for (const sub of recent) {
      console.log(`   - User: ${sub.userId || 'N/A'}, Tags: ${sub.tags?.join(', ') || 'none'}, Revoked: ${sub.revokedAt ? 'YES' : 'NO'}`);
      console.log(`     Endpoint: ${sub.endpoint?.slice(0, 60)}...`);
      console.log(`     Keys: ${sub.keys ? 'Present' : 'MISSING'}`);
      console.log(`     Created: ${sub.createdAt}`);
      console.log('');
    }
    
    if (total === 0) {
      console.log('\n⚠️  NO SUBSCRIPTIONS FOUND!');
      console.log('   Users need to click "אפשר התראות דחיפה" in the account menu');
      console.log('   to register for push notifications.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

main();
