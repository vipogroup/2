import { config } from 'dotenv';
import { connectDB, getDb } from './lib/db.js';

// Load environment variables
config({ path: '.env.local' });

async function testConnection() {
  try {
    console.log('🔄 Testing MongoDB connections...\n');

    // Test Mongoose connection
    console.log('1️⃣ Testing Mongoose connection...');
    const mongoose = await connectDB();
    console.log('✅ Mongoose connected successfully!');
    console.log(`   Database: ${mongoose.connection.db.databaseName}\n`);

    // Test Native Driver connection
    console.log('2️⃣ Testing Native MongoDB Driver connection...');
    const db = await getDb();
    console.log('✅ Native Driver connected successfully!');
    console.log(`   Database: ${db.databaseName}\n`);

    // Test collections
    console.log('3️⃣ Testing collections access...');
    const collections = await db.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections:`);
    collections.forEach((col) => console.log(`   - ${col.name}`));

    console.log('\n🎉 All connections successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testConnection();
