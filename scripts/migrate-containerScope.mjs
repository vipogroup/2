import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const result = await db.collection('products').updateMany(
    { groupPurchaseType: 'shared_container', containerScope: { $exists: false } },
    { $set: { containerScope: 'shared' } }
  );
  console.log(`Updated ${result.modifiedCount} products (missing containerScope) to 'shared'`);

  // Also update any existing shared_container products that don't have containerScope yet
  const result2 = await db.collection('products').updateMany(
    { groupPurchaseType: 'shared_container', containerScope: null },
    { $set: { containerScope: 'shared' } }
  );
  console.log(`Updated ${result2.modifiedCount} more products (null containerScope) to 'shared'`);

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
