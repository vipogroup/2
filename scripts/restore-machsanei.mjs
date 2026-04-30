/**
 * שחזור חנות "מחסני נירוסטה" מגיבוי
 * מחזיר: tenant, owner user, products, orders הקשורים
 */
import { readFileSync } from 'fs';
import { MongoClient, ObjectId } from 'mongodb';

const BACKUP_PATH = './backups/database/full-2026-01-13T05-52-17-401Z/database-backup.json';
const TENANT_ID = '6965456e3b2bd7e6c52589bd';
const OWNER_ID = '6965456e3b2bd7e6c52589bc';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vipo';

async function main() {
  console.log('📂 קורא גיבוי...');
  const raw = readFileSync(BACKUP_PATH, 'utf-8');
  const backup = JSON.parse(raw);
  const cols = backup.collections;

  // --- Find tenant ---
  const tenant = (cols.tenants || []).find(t => t._id === TENANT_ID);
  if (!tenant) { console.error('❌ Tenant not found in backup'); process.exit(1); }
  console.log('✅ נמצא tenant: ' + tenant.name);

  // --- Find owner user ---
  const owner = (cols.users || []).find(u => u._id === OWNER_ID);
  if (owner) console.log('✅ נמצא owner: ' + owner.email);
  else console.log('⚠️ Owner user not found in backup');

  // --- Find products for this tenant ---
  const products = (cols.products || []).filter(p =>
    String(p.tenantId) === TENANT_ID || String(p.tenantId?.$oid) === TENANT_ID
  );
  console.log('📦 מוצרים: ' + products.length);

  // --- Find orders for this tenant ---
  const orders = (cols.orders || []).filter(o =>
    String(o.tenantId) === TENANT_ID || String(o.tenantId?.$oid) === TENANT_ID
  );
  console.log('🛒 הזמנות: ' + orders.length);

  // --- Find related users (agents/customers with this tenantId) ---
  const relatedUsers = (cols.users || []).filter(u =>
    u._id !== OWNER_ID && (String(u.tenantId) === TENANT_ID || String(u.tenantId?.$oid) === TENANT_ID)
  );
  console.log('👤 משתמשים קשורים: ' + relatedUsers.length);

  // --- Connect to DB ---
  console.log('\n🔌 מתחבר ל-MongoDB...');
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();

  // --- Restore tenant ---
  const existingTenant = await db.collection('tenants').findOne({ _id: new ObjectId(TENANT_ID) });
  if (existingTenant) {
    console.log('⏭️ Tenant already exists, skipping');
  } else {
    const tenantDoc = { ...tenant, _id: new ObjectId(tenant._id) };
    if (tenantDoc.ownerId) tenantDoc.ownerId = new ObjectId(tenantDoc.ownerId);
    if (tenantDoc.createdAt) tenantDoc.createdAt = new Date(tenantDoc.createdAt);
    if (tenantDoc.updatedAt) tenantDoc.updatedAt = new Date(tenantDoc.updatedAt);
    delete tenantDoc.__v;
    await db.collection('tenants').insertOne(tenantDoc);
    console.log('✅ Tenant restored');
  }

  // --- Restore owner ---
  if (owner) {
    const existingOwner = await db.collection('users').findOne({ _id: new ObjectId(OWNER_ID) });
    if (existingOwner) {
      console.log('⏭️ Owner already exists, skipping');
    } else {
      const ownerDoc = { ...owner, _id: new ObjectId(owner._id) };
      if (ownerDoc.tenantId) ownerDoc.tenantId = new ObjectId(ownerDoc.tenantId);
      if (ownerDoc.createdAt) ownerDoc.createdAt = new Date(ownerDoc.createdAt);
      if (ownerDoc.updatedAt) ownerDoc.updatedAt = new Date(ownerDoc.updatedAt);
      delete ownerDoc.__v;
      await db.collection('users').insertOne(ownerDoc);
      console.log('✅ Owner restored: ' + owner.email);
    }
  }

  // --- Restore products ---
  let restoredProducts = 0;
  for (const p of products) {
    const existing = await db.collection('products').findOne({ _id: new ObjectId(p._id) });
    if (existing) continue;
    const doc = { ...p, _id: new ObjectId(p._id) };
    if (doc.tenantId) doc.tenantId = new ObjectId(doc.tenantId);
    if (doc.createdAt) doc.createdAt = new Date(doc.createdAt);
    if (doc.updatedAt) doc.updatedAt = new Date(doc.updatedAt);
    delete doc.__v;
    try {
      await db.collection('products').insertOne(doc);
      restoredProducts++;
    } catch (e) { console.log('  ⚠️ product skip: ' + e.message); }
  }
  console.log('✅ Products restored: ' + restoredProducts);

  // --- Restore orders ---
  let restoredOrders = 0;
  for (const o of orders) {
    const existing = await db.collection('orders').findOne({ _id: new ObjectId(o._id) });
    if (existing) continue;
    const doc = { ...o, _id: new ObjectId(o._id) };
    if (doc.tenantId) doc.tenantId = new ObjectId(doc.tenantId);
    if (doc.customerId) doc.customerId = new ObjectId(doc.customerId);
    if (doc.createdAt) doc.createdAt = new Date(doc.createdAt);
    if (doc.updatedAt) doc.updatedAt = new Date(doc.updatedAt);
    delete doc.__v;
    try {
      await db.collection('orders').insertOne(doc);
      restoredOrders++;
    } catch (e) { console.log('  ⚠️ order skip: ' + e.message); }
  }
  console.log('✅ Orders restored: ' + restoredOrders);

  // --- Restore related users ---
  let restoredUsers = 0;
  for (const u of relatedUsers) {
    const existing = await db.collection('users').findOne({ _id: new ObjectId(u._id) });
    if (existing) continue;
    const doc = { ...u, _id: new ObjectId(u._id) };
    if (doc.tenantId) doc.tenantId = new ObjectId(doc.tenantId);
    if (doc.createdAt) doc.createdAt = new Date(doc.createdAt);
    if (doc.updatedAt) doc.updatedAt = new Date(doc.updatedAt);
    delete doc.__v;
    try {
      await db.collection('users').insertOne(doc);
      restoredUsers++;
    } catch (e) { console.log('  ⚠️ user skip: ' + e.message); }
  }
  console.log('✅ Related users restored: ' + restoredUsers);

  console.log('\n========================================');
  console.log('🎉 שחזור מחסני נירוסטה הושלם!');
  console.log('  Tenant: ' + tenant.name);
  console.log('  Products: ' + restoredProducts);
  console.log('  Orders: ' + restoredOrders);
  console.log('  Users: ' + restoredUsers + (owner ? ' + owner' : ''));
  console.log('========================================');

  await client.close();
}

main().catch(e => { console.error('❌ Error:', e); process.exit(1); });
