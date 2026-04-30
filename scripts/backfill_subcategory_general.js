// scripts/backfill_subcategory_general.js
require('dotenv').config();

const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Missing MONGODB_URI in environment');
  process.exit(1);
}

const dbName = process.env.MONGODB_DB || 'vipo';

(async () => {
  const client = new MongoClient(uri);
  let exitCode = 0;

  try {
    await client.connect();
    const db = client.db(dbName);
    const products = db.collection('products');

    const query = {
      $or: [
        { subCategory: { $exists: false } },
        { subCategory: null },
        { subCategory: '' },
      ],
    };

    const result = await products.updateMany(query, { $set: { subCategory: 'general' } });

    console.log('matchedCount:', result.matchedCount || 0);
    console.log('modifiedCount:', result.modifiedCount || 0);
  } catch (err) {
    exitCode = 1;
    console.error('Error:', err?.message || err);
  } finally {
    try {
      await client.close();
    } catch {}
    process.exit(exitCode);
  }
})();
