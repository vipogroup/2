import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'vipo';

async function deleteUserByEmail(email) {
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  if (!email) {
    console.error('❌ Usage: node scripts/delete-user-by-email.mjs <email>');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(dbName);
    const users = db.collection('users');

    // Find user first
    const user = await users.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`⚠️  User with email "${email}" not found`);
      return;
    }

    console.log(`Found user:`, {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });

    // Delete user
    const result = await users.deleteOne({ email: email.toLowerCase() });

    if (result.deletedCount === 1) {
      console.log(`✅ User "${email}" deleted successfully`);
    } else {
      console.log(`⚠️  Failed to delete user`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

const email = process.argv[2];
deleteUserByEmail(email);
