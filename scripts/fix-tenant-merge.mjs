import { MongoClient, ObjectId } from 'mongodb';

const OLD_TENANT_ID = '6980e7a13862e2a30b667a62'; // where products are in localStorage
const ORIG_TENANT_ID = '6965456e3b2bd7e6c52589bd'; // original restored tenant

const c = new MongoClient('mongodb://127.0.0.1:27017/vipo');
await c.connect();
const db = c.db();

// Step 1: Move templates to the OLD tenant (where products live)
const r1 = await db.collection('catalogtemplates').updateMany(
  { tenantId: new ObjectId(ORIG_TENANT_ID) },
  { $set: { tenantId: new ObjectId(OLD_TENANT_ID) } }
);
console.log('Templates moved to old tenant:', r1.modifiedCount);

// Step 2: Update the OLD tenant to be the main one (rename, set proper data)
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
console.log('Old tenant updated to main "מחסני נירוסטה"');

// Step 3: Update the owner's tenantId to point to the old tenant
await db.collection('users').updateOne(
  { _id: new ObjectId('6965456e3b2bd7e6c52589bc') },
  { $set: { tenantId: new ObjectId(OLD_TENANT_ID) } }
);
console.log('Owner tenantId updated');

// Step 4: Delete the original restored tenant (no longer needed)
await db.collection('tenants').deleteOne({ _id: new ObjectId(ORIG_TENANT_ID) });
console.log('Original tenant removed');

// Verify
const tenants = await db.collection('tenants').find({}).toArray();
console.log('\n=== Tenants ===');
tenants.forEach(t => console.log('  ' + t.name + ' | ' + t._id + ' | ' + t.status));

const templates = await db.collection('catalogtemplates').find({}).toArray();
console.log('\n=== Templates (' + templates.length + ') ===');
templates.slice(0, 3).forEach(t => console.log('  ' + t.name + ' | tenant: ' + t.tenantId));

await c.close();
console.log('\nDone!');
