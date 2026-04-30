import 'dotenv/config';
import { getDb } from '../lib/db.js';

try {
  const db = await getDb();
  const users = db.collection('users');
  const agents = await users
    .find(
      { role: 'agent' },
      {
        projection: {
          fullName: 1,
          email: 1,
          phone: 1,
          couponCode: 1,
          couponStatus: 1,
          discountPercent: 1,
          commissionPercent: 1,
          referralId: 1,
          createdAt: 1,
        },
      },
    )
    .toArray();
  console.log('Agents:', agents);
  process.exit(0);
} catch (err) {
  console.error('DEBUG_LIST_AGENTS_ERROR', err);
  process.exit(1);
}
