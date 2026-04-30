/**
 * Check withdrawal requests
 * Run with: node check-withdrawals.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkWithdrawals() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in environment');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    const db = client.db();
    const withdrawals = db.collection('withdrawalRequests');
    const users = db.collection('users');
    
    // Find all withdrawal requests
    const allWithdrawals = await withdrawals.find({}).sort({ createdAt: -1 }).toArray();
    
    console.log(`Found ${allWithdrawals.length} withdrawal requests:\n`);
    
    allWithdrawals.forEach((w, i) => {
      console.log(`${i + 1}. Withdrawal: ${w._id}`);
      console.log(`   User ID: ${w.userId}`);
      console.log(`   Amount: ${w.amount}₪`);
      console.log(`   Status: ${w.status}`);
      console.log(`   Created: ${w.createdAt}`);
      console.log('');
    });
    
    // Check agent user
    const agentId = '69605c7d74e8fe0438e5e93b';
    const agent = await users.findOne({ _id: new ObjectId(agentId) });
    
    if (agent) {
      console.log('\n=== AGENT INFO ===');
      console.log(`Agent: ${agent.fullName || agent.email}`);
      console.log(`commissionBalance: ${agent.commissionBalance || 0}₪`);
      console.log(`commissionOnHold: ${agent.commissionOnHold || 0}₪`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkWithdrawals();
