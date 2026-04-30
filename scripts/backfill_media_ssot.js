// scripts/backfill_media_ssot.js
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
        { 'media.images': { $exists: false } },
        { 'media.images': { $size: 0 } },
      ],
    };

    const missingCount = await products.countDocuments(query);

    if (missingCount === 0) {
      console.log('All products already include media.images.');
      process.exit(0);
    }

    console.warn(
      `Found ${missingCount} products without media.images. No legacy fallback is applied in SSOT-only mode.`,
    );
    exitCode = 1;
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
