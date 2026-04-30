import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectMongo } from '../lib/mongoose.js';
import User from '../models/User.js';

async function run() {
  await connectMongo();

  const newPassword = '12345678';
  const hash = await bcrypt.hash(newPassword, 10);

  const result = await User.updateOne(
    { email: 'admin@vipo.local' },
    { $set: { passwordHash: hash } },
  );

  console.log('Matched:', result.matchedCount, 'Modified:', result.modifiedCount);
}

run()
  .then(() => {
    console.log('Password updated successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to update password:', err);
    process.exit(1);
  });
