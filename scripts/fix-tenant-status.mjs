import { MongoClient, ObjectId } from 'mongodb';
const c = new MongoClient('mongodb://127.0.0.1:27017/vipo');
await c.connect();
const r = await c.db().collection('tenants').updateOne(
  { _id: new ObjectId('6965456e3b2bd7e6c52589bd') },
  { $set: { status: 'active' } }
);
console.log('Updated:', r.modifiedCount);
const t = await c.db().collection('tenants').findOne({ _id: new ObjectId('6965456e3b2bd7e6c52589bd') });
console.log('Tenant:', t?.name, '| Status:', t?.status);
await c.close();
