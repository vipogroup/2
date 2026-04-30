/**
 * Fix agent commissions - reset claimed order to available
 * Run with: node fix-agent-commissions.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function fixAgentCommissions() {
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
    const orders = db.collection('orders');
    const users = db.collection('users');
    const withdrawals = db.collection('withdrawalRequests');
    
    const agentId = new ObjectId('69605c7d74e8fe0438e5e93b');
    
    // 1. Fix the wrongly claimed order - set back to available
    const claimedOrder = await orders.findOne({
      _id: new ObjectId('696075ff49cc153d5abc3df1'),
      commissionStatus: 'claimed'
    });
    
    if (claimedOrder) {
      console.log('Fixing wrongly claimed order...');
      await orders.updateOne(
        { _id: claimedOrder._id },
        { $set: { commissionStatus: 'available', updatedAt: new Date() } }
      );
      console.log(`Order ${claimedOrder._id} changed from 'claimed' to 'available'`);
    }
    
    // 2. Calculate correct available balance from orders
    const agentOrders = await orders.find({
      $or: [{ agentId }, { refAgentId: agentId }],
      commissionAmount: { $gt: 0 },
      status: { $in: ['paid', 'completed', 'shipped'] }
    }).toArray();
    
    let totalEarned = 0;
    let availableAmount = 0;
    let claimedAmount = 0;
    
    agentOrders.forEach(o => {
      totalEarned += o.commissionAmount || 0;
      if (o.commissionStatus === 'available') {
        availableAmount += o.commissionAmount || 0;
      } else if (o.commissionStatus === 'claimed') {
        claimedAmount += o.commissionAmount || 0;
      }
    });
    
    // 3. Get completed withdrawals
    const completedWithdrawals = await withdrawals.find({
      userId: agentId,
      status: 'completed'
    }).toArray();
    
    const totalWithdrawn = completedWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
    
    // 4. Calculate correct commissionBalance
    // Available commissions (from orders with status 'available') minus pending withdrawal locks
    const pendingWithdrawals = await withdrawals.find({
      userId: agentId,
      status: { $in: ['pending', 'approved'] }
    }).toArray();
    
    const pendingAmount = pendingWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
    
    console.log('\n=== CALCULATIONS ===');
    console.log(`Total earned (from orders): ${totalEarned}₪`);
    console.log(`Available (commissionStatus=available): ${availableAmount}₪`);
    console.log(`Claimed (commissionStatus=claimed): ${claimedAmount}₪`);
    console.log(`Total withdrawn (completed): ${totalWithdrawn}₪`);
    console.log(`Pending withdrawals: ${pendingAmount}₪`);
    
    // The correct balance should be available commissions only (not total earned)
    // Because we now calculate from orders, not from user.commissionBalance
    const correctBalance = availableAmount;
    
    console.log(`\nCorrect commissionBalance should be: ${correctBalance}₪`);
    
    // 5. Update agent's commissionBalance
    const agent = await users.findOne({ _id: agentId });
    console.log(`Current commissionBalance: ${agent?.commissionBalance || 0}₪`);
    
    if (agent && agent.commissionBalance !== correctBalance) {
      await users.updateOne(
        { _id: agentId },
        { 
          $set: { 
            commissionBalance: correctBalance,
            commissionOnHold: pendingAmount,
            updatedAt: new Date() 
          } 
        }
      );
      console.log(`Updated commissionBalance from ${agent.commissionBalance}₪ to ${correctBalance}₪`);
    }
    
    console.log('\nDone!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixAgentCommissions();
