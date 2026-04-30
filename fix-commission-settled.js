/**
 * Fix commissionSettled for existing orders
 * Run with: node fix-commission-settled.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function fixCommissionSettled() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in environment');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const orders = db.collection('orders');
    
    // Find orders that are paid/completed/shipped with commissions but commissionSettled = false
    const ordersToFix = await orders.find({
      status: { $in: ['paid', 'completed', 'shipped'] },
      commissionAmount: { $gt: 0 },
      commissionSettled: { $ne: true }
    }).toArray();
    
    console.log(`Found ${ordersToFix.length} orders to fix`);
    
    if (ordersToFix.length === 0) {
      console.log('No orders need fixing');
      return;
    }
    
    // Update all orders
    const orderIds = ordersToFix.map(o => o._id);
    const result = await orders.updateMany(
      { _id: { $in: orderIds } },
      { $set: { commissionSettled: true, updatedAt: new Date() } }
    );
    
    console.log(`Updated ${result.modifiedCount} orders`);
    
    // Now release commissions that are ready
    const now = new Date();
    const readyToRelease = await orders.find({
      commissionStatus: 'pending',
      commissionSettled: true,
      commissionAmount: { $gt: 0 },
      commissionAvailableAt: { $lte: now }
    }).toArray();
    
    console.log(`Found ${readyToRelease.length} commissions ready to release`);
    
    if (readyToRelease.length > 0) {
      const releaseIds = readyToRelease.map(o => o._id);
      const releaseResult = await orders.updateMany(
        { _id: { $in: releaseIds } },
        { $set: { commissionStatus: 'available', updatedAt: now } }
      );
      console.log(`Released ${releaseResult.modifiedCount} commissions to 'available' status`);
    }
    
    console.log('Done!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixCommissionSettled();
