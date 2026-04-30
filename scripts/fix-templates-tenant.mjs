import { MongoClient, ObjectId } from 'mongodb';

const OLD_TENANT_ID = '6980e7a13862e2a30b667a62';
const NEW_TENANT_ID = '6965456e3b2bd7e6c52589bd'; // מחסני נירוסטה

const c = new MongoClient('mongodb://127.0.0.1:27017/vipo');
await c.connect();
const db = c.db();

// Update templates with old tenant ID
const r1 = await db.collection('catalogtemplates').updateMany(
  { tenantId: new ObjectId(OLD_TENANT_ID) },
  { $set: { tenantId: new ObjectId(NEW_TENANT_ID) } }
);
console.log('Updated templates (old tenant):', r1.modifiedCount);

// Also update templates with undefined/null tenantId
const r2 = await db.collection('catalogtemplates').updateMany(
  { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] },
  { $set: { tenantId: new ObjectId(NEW_TENANT_ID) } }
);
console.log('Updated templates (no tenant):', r2.modifiedCount);

// Verify
const all = await db.collection('catalogtemplates').find({}).toArray();
console.log('\n=== All Templates ===');
all.forEach(t => console.log('  ' + t.name + ' | tenant: ' + t.tenantId));

// Also create the old tenant as an alias so localStorage data loads
const oldTenantExists = await db.collection('tenants').findOne({ _id: new ObjectId(OLD_TENANT_ID) });
if (!oldTenantExists) {
  console.log('\nCreating alias tenant for old ID so localStorage products can load...');
  await db.collection('tenants').insertOne({
    _id: new ObjectId(OLD_TENANT_ID),
    name: 'מחסני נירוסטה (old)',
    slug: 'machsanei-old',
    status: 'active',
    ownerId: new ObjectId('6965456e3b2bd7e6c52589bc'),
    platformCommissionRate: 5,
    branding: { primaryColor: '#3B82F6', secondaryColor: '#1E40AF', accentColor: '#10B981' },
    contact: { email: 'm0533858881@gmail.com', phone: '0533858881' },
    features: { registration: true, agentSystem: true, coupons: true, notifications: true },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Created alias tenant: ' + OLD_TENANT_ID);
}

await c.close();
console.log('\nDone!');
