import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'vipo';

async function listUsers() {
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(dbName);
    const users = db.collection('users');

    const allUsers = await users.find({}).toArray();

    console.log(`Total users: ${allUsers.length}\n`);

    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.fullName || 'No name'}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Phone: ${user.phone || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user._id}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

listUsers();
