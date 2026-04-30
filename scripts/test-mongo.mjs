import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'vipo';

(async () => {
  try {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
    await client.connect();
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    console.log('OK', {
      database: db.databaseName,
      collections: collections.map((c) => c.name),
    });
    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('ERR', err.message || err);
    process.exit(1);
  }
})();
