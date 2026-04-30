import { MongoClient } from 'mongodb';
const c = new MongoClient('mongodb://127.0.0.1:27017/vipo');
await c.connect();
const db = c.db();

const tenants = await db.collection('tenants').find({}).toArray();
console.log('=== TENANTS (' + tenants.length + ') ===');
tenants.forEach(t => console.log('  ' + t.name + ' | ' + t.slug + ' | ' + t.status + ' | ID: ' + t._id));

const templates = await db.collection('catalogtemplates').find({}).toArray();
console.log('\n=== CATALOG TEMPLATES (' + templates.length + ') ===');
templates.forEach(t => console.log('  ' + t.name + ' | key: ' + t.key + ' | tenant: ' + t.tenantId));

const products = await db.collection('products').find({}).toArray();
console.log('\n=== PRODUCTS (' + products.length + ') ===');
products.slice(0, 5).forEach(p => console.log('  ' + p.name + ' | tenant: ' + p.tenantId));

const users = await db.collection('users').find({}).project({ email: 1, role: 1, tenantId: 1 }).toArray();
console.log('\n=== USERS (' + users.length + ') ===');
users.forEach(u => console.log('  ' + u.email + ' | ' + u.role + ' | tenant: ' + (u.tenantId || '-')));

const backups = await db.collection('system_backups').find({}).sort({ createdAt: -1 }).limit(3).toArray();
console.log('\n=== LATEST BACKUPS (' + backups.length + ') ===');
backups.forEach(b => console.log('  ' + b.createdAt + ' | mode: ' + (b.mode || 'old') + ' | templates: ' + (b.templateCount || b.templates?.length || 0) + ' | tenants backed up: ' + (b.tenantsBackup?.length || 0)));

await c.close();
