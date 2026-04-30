import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'vipo';

async function deleteAllUsers() {
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

    // Count current users
    const countBefore = await users.countDocuments();
    console.log(`📊 Current users in database: ${countBefore}`);

    if (countBefore === 0) {
      console.log('✅ No users to delete');
      return;
    }

    // List all users before deletion
    const allUsers = await users.find({}).toArray();
    console.log('\n📋 Users to be deleted:\n');
    allUsers.forEach((user, index) => {
      console.log(
        `${index + 1}. ${user.fullName || 'No name'} (${user.email || user.phone || 'N/A'}) - ${user.role}`,
      );
    });

    console.log('\n🗑️  Deleting all users...\n');

    // Delete all users
    const result = await users.deleteMany({});

    console.log(`✅ Deleted ${result.deletedCount} users successfully`);

    // Verify deletion
    const countAfter = await users.countDocuments();
    console.log(`📊 Remaining users: ${countAfter}`);

    if (countAfter === 0) {
      console.log('\n✨ All users deleted! You can now register fresh users.');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

console.log('⚠️  WARNING: This will delete ALL users from the database!\n');
deleteAllUsers();
