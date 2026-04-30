// tools/test-mongo.js

// לטעון משתני סביבה מתוך .env.local
require('dotenv').config({ path: '.env.local' });

const { MongoClient } = require('mongodb');

async function test() {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      console.error('❌ MONGODB_URI is not defined in process.env');
      console.error(
        "Keys that start with 'MONGO' in env:",
        Object.keys(process.env).filter((k) => k.toUpperCase().includes('MONGO')),
      );
      process.exit(1);
    }

    console.log('Using URI:', uri.replace(/:[^:@]+@/, ':***@'));

    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    await client.connect();
    console.log('✅ Connected successfully to MongoDB');

    const adminDb = client.db().admin();
    const pingResult = await adminDb.ping();
    console.log('Ping result:', pingResult);

    await client.close();
    console.log('Connection closed.');
  } catch (err) {
    console.error('❌ MongoDB connection failed:');
    console.error(err);
  }
}

test();
