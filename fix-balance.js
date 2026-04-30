const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const db = c.db();
  
  // The agent withdrew 4₪, so available should be 108₪ - 4₪ = 104₪
  // But commissionBalance in users table is just for display in old code
  // The new code calculates from orders, so we don't need to update it
  
  // Let's verify the current state
  const agent = await db.collection('users').findOne({ _id: new ObjectId('69605c7d74e8fe0438e5e93b') });
  console.log('Agent commissionBalance:', agent?.commissionBalance);
  
  // The actual available is calculated from orders with commissionStatus='available'
  // minus commissionOnHold (pending withdrawal requests)
  // So we don't need to change commissionBalance since the new code doesn't use it
  
  await c.close();
})();
