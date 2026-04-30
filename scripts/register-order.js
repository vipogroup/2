#!/usr/bin/env node

const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  if (!uri || !dbName) {
    console.error('Missing MONGODB_URI or MONGODB_DB');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    console.log('Connected to MongoDB');

    const agentId = '693215457b48a021293de14c';
    const commissionAmount = 150;

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(agentId) },
      {
        $inc: {
          commissionBalance: commissionAmount,
        },
      }
    );

    console.log(`Updated ${result.modifiedCount} document(s)`);
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
