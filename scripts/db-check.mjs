import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

console.log('🔍 Running DB Health Check...\n');

// Load ENV
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`📄 Loaded ENV from .env.local`);
} else {
  dotenv.config();
  console.log(`📄 Loaded ENV from system environment`);
}

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ ERROR: MONGODB_URI is missing in ENV.');
  process.exit(1);
}

console.log(`🔗 MONGODB_URI detected: OK\n`);

async function main() {
  try {
    const start = Date.now();

    // Connect
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    const duration = Date.now() - start;

    console.log(`✅ Connected to MongoDB in ${duration}ms`);
    console.log(`📦 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
    console.log(`🔢 Port: ${mongoose.connection.port}`);
    console.log('');

    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();

    if (!collections.length) {
      console.warn('⚠️ WARNING: No collections found in this database.');
    } else {
      console.log(`📚 Found ${collections.length} collections:\n`);
      for (const col of collections) {
        const count = await mongoose.connection.db.collection(col.name).countDocuments();

        console.log(`• ${col.name} – ${count} documents`);
      }
    }

    console.log('\n🏁 DB Health Check Completed Successfully.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ DB CONNECTION FAILED');
    console.error(err);
    process.exit(1);
  }
}

main();
