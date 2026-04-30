import 'dotenv/config';
import { ObjectId } from 'mongodb';
import { getDb } from '../lib/db.js';
import { generateAgentCoupon } from '../lib/agents.js';

try {
  const db = await getDb();
  const users = db.collection('users');
  const agents = await users
    .find({ role: 'agent', $or: [{ couponCode: { $exists: false } }, { couponCode: null }] })
    .toArray();

  console.log(`Found ${agents.length} agents without coupon`);
  for (const agent of agents) {
    const nameForCoupon = agent.fullName?.trim() || agent.email || agent.phone || 'agent';
    console.log('Generating coupon for', agent._id.toString(), nameForCoupon);
    await generateAgentCoupon({ fullName: nameForCoupon, agentId: agent._id instanceof ObjectId ? agent._id : new ObjectId(agent._id) });
  }

  console.log('Done');
  process.exit(0);
} catch (err) {
  console.error('ENSURE_AGENT_COUPONS_ERROR', err);
  process.exit(1);
}
