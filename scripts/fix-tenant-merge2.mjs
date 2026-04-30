import { MongoClient, ObjectId } from 'mongodb';
const OLD_TENANT_ID = '6980e7a13862e2a30b667a62';
const ORIG_TENANT_ID = '6965456e3b2bd7e6c52589bd';
const c = new MongoClient('mongodb://127.0.0.1:27017/vipo');
await c.connect();
const db = c.db();

// Delete the original tenant first (frees the slug "vcv")
await db.collection('tenants').deleteOne({ _id: new ObjectId(ORIG_TENANT_ID) });
console.log('Deleted original tenant');

// Now update old tenant with correct data
await db.collection('tenants').updateOne(
  { _id: new ObjectId(OLD_TENANT_ID) },
  { $set: {
    name: 'מחסני נירוסטה',
    slug: 'vcv',
    status: 'active',
    ownerId: new ObjectId('6965456e3b2bd7e6c52589bc'),
    contact: { email: 'm0533858881@gmail.com', phone: '0533858881', whatsapp: '0533858881', address: 'באר יעקב' },
    seo: { title: 'מחסני נירוסטה' },
    features: { registration: true, groupPurchase: true, notifications: true, agentSystem: true, coupons: true },
    agentSettings: { defaultCommissionPercent: 12, defaultDiscountPercent: 10, commissionHoldDays: 30, groupPurchaseHoldDays: 100 },
    platformCommissionRate: 5,
  }}
);
console.log('Updated old tenant to "מחסני נירוסטה"');

// Update owner
await db.collection('users').updateOne(
  { _id: new ObjectId('6965456e3b2bd7e6c52589bc') },
  { $set: { tenantId: new ObjectId(OLD_TENANT_ID) } }
);
console.log('Owner updated');

// Verify
const tenants = await db.collection('tenants').find({}).toArray();
console.log('\n=== Tenants ===');
tenants.forEach(t => console.log('  ' + t.name + ' | ' + t._id + ' | ' + t.status));
const tCount = await db.collection('catalogtemplates').countDocuments({ tenantId: new ObjectId(OLD_TENANT_ID) });
console.log('\nTemplates for this tenant: ' + tCount);

await c.close();
console.log('Done!');
