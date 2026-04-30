/**
 * Check commission status for all orders
 * Run with: node check-commissions.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkCommissions() {
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
    
    // Find all orders with commissions
    const allOrders = await orders.find({
      commissionAmount: { $gt: 0 }
    }).sort({ createdAt: -1 }).limit(20).toArray();
    
    console.log(`Found ${allOrders.length} orders with commissions:\n`);
    
    const now = new Date();
    
    allOrders.forEach((o, i) => {
      const availableAt = o.commissionAvailableAt ? new Date(o.commissionAvailableAt) : null;
      const isReady = availableAt && availableAt <= now;
      
      console.log(`${i + 1}. Order: ${o._id}`);
      console.log(`   Status: ${o.status}`);
      console.log(`   Commission: ${o.commissionAmount}₪`);
      console.log(`   commissionStatus: ${o.commissionStatus || 'NOT SET'}`);
      console.log(`   commissionSettled: ${o.commissionSettled}`);
      console.log(`   commissionAvailableAt: ${availableAt ? availableAt.toISOString() : 'NOT SET'}`);
      console.log(`   Ready to release: ${isReady ? 'YES' : 'NO'}`);
      console.log(`   Agent ID: ${o.agentId || o.refAgentId || 'NONE'}`);
      console.log('');
    });
    
    // Summary
    console.log('\n=== SUMMARY ===');
    const pending = allOrders.filter(o => o.commissionStatus === 'pending');
    const available = allOrders.filter(o => o.commissionStatus === 'available');
    const claimed = allOrders.filter(o => o.commissionStatus === 'claimed');
    const notSettled = allOrders.filter(o => !o.commissionSettled);
    const readyButPending = allOrders.filter(o => 
      o.commissionStatus === 'pending' && 
      o.commissionAvailableAt && 
      new Date(o.commissionAvailableAt) <= now
    );
    
    console.log(`Pending: ${pending.length} (${pending.reduce((s, o) => s + o.commissionAmount, 0)}₪)`);
    console.log(`Available: ${available.length} (${available.reduce((s, o) => s + o.commissionAmount, 0)}₪)`);
    console.log(`Claimed: ${claimed.length} (${claimed.reduce((s, o) => s + o.commissionAmount, 0)}₪)`);
    console.log(`Not Settled: ${notSettled.length}`);
    console.log(`Ready but still pending: ${readyButPending.length}`);
    
    if (readyButPending.length > 0) {
      console.log('\n=== ORDERS THAT SHOULD BE RELEASED ===');
      readyButPending.forEach(o => {
        console.log(`Order ${o._id}: ${o.commissionAmount}₪, settled=${o.commissionSettled}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkCommissions();
