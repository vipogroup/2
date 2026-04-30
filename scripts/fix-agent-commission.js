/**
 * סקריפט לעדכון אחוז העמלה של כל הסוכנים ל-10%
 * הרצה: node scripts/fix-agent-commission.js
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function fixAgentCommission() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in environment');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const users = db.collection('users');

    // עדכון כל הסוכנים ל-10% עמלה
    const result = await users.updateMany(
      { role: 'agent' },
      { $set: { commissionPercent: 10 } }
    );

    console.log(`Updated ${result.modifiedCount} agents to 10% commission`);

    // הצגת סטטיסטיקה
    const stats = await users.aggregate([
      { $match: { role: 'agent' } },
      { $group: { _id: '$commissionPercent', count: { $sum: 1 } } }
    ]).toArray();

    console.log('Commission distribution after update:');
    stats.forEach(s => console.log(`  ${s._id}%: ${s.count} agents`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Done');
  }
}

fixAgentCommission();
