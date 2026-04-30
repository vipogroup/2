const { MongoClient } = require('mongodb');

async function check() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const db = client.db('vipo');
  
  // Run the same aggregation as lib/reports.js
  console.log('=== Running getAdminOverview aggregation ===');
  const ordersAgg = await db.collection('orders').aggregate([
    { $match: { status: { $in: ['paid', 'completed'] } } },
    {
      $group: {
        _id: null,
        ordersCount: { $sum: 1 },
        gmv: { $sum: '$totalAmount' },
        commissions: { $sum: { $multiply: ['$totalAmount', 0.1] } },
      },
    },
  ]).toArray();
  console.log('Aggregation result:', JSON.stringify(ordersAgg, null, 2));
  
  // Get paid orders with details
  console.log('\n=== Paid Orders Details ===');
  const paidOrders = await db.collection('orders').find({ status: 'paid' }).toArray();
  paidOrders.forEach((o, i) => {
    console.log(`Order ${i+1}: totalAmount=${o.totalAmount}, items=${JSON.stringify(o.items?.length || 0)}`);
  });
  
  // Get users for reports
  const customers = await db.collection('users').countDocuments({ role: 'customer' });
  const agents = await db.collection('users').countDocuments({ role: 'agent', isActive: true });
  console.log(`\n=== Users: customers=${customers}, activeAgents=${agents} ===`);
  
  await client.close();
}

check().catch(console.error);
