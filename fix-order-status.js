const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  
  // Fix the order that was wrongly marked as claimed
  await c.db().collection('orders').updateOne(
    { _id: new ObjectId('696075ff49cc153d5abc3df1') },
    { $set: { commissionStatus: 'available', updatedAt: new Date() } }
  );
  
  console.log('Fixed order 696075ff49cc153d5abc3df1 to available');
  
  // Verify
  const orders = await c.db().collection('orders').find({
    commissionAmount: { $gt: 0 }
  }).toArray();
  
  console.log('\nOrders status:');
  orders.forEach(o => {
    console.log(`- ${o._id}: ${o.commissionStatus}, ${o.commissionAmount}₪`);
  });
  
  await c.close();
})();
