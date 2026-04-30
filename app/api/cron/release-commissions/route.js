import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';

const AUTH_HEADER = 'authorization';

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
}

function validateAuth(req) {
  const rawSecret = process.env.CRON_SECRET || process.env.CRON_API_TOKEN;
  const cronSecret = rawSecret ? rawSecret.trim() : null;
  if (!cronSecret) {
    // אם אין סוד, נבצע חסימה כדי למנוע חשיפה
    console.error('CRON_SECRET missing. Blocked release-commissions execution.');
    return false;
  }

  const header = req.headers.get(AUTH_HEADER) || '';
  if (!header.startsWith('Bearer ')) {
    return false;
  }

  const provided = header.slice('Bearer '.length);
  return provided === cronSecret;
}

async function POSTHandler(req) {
  try {
    if (!validateAuth(req)) {
      return unauthorized();
    }

    const db = await getDb();
    const ordersCollection = db.collection('orders');
    const usersCollection = db.collection('users');

    const now = new Date();

    const pendingOrders = await ordersCollection
      .find({
        commissionStatus: 'pending',
        commissionAmount: { $gt: 0 },
        commissionAvailableAt: { $ne: null, $lte: now },
      })
      .project({
        _id: 1,
        agentId: 1,
        refAgentId: 1,
        commissionAmount: 1,
      })
      .toArray();

    if (pendingOrders.length === 0) {
      return NextResponse.json({ ok: true, released: 0, agents: 0 });
    }

    // סכומי עמלות לכל סוכן (תומך גם ב-agentId וגם ב-refAgentId)
    const agentTotals = new Map();
    pendingOrders.forEach((order) => {
      const agentId = order.agentId || order.refAgentId;
      if (!agentId) {
        return;
      }
      const agentKey = agentId instanceof ObjectId ? agentId.toString() : String(agentId);
      const current = agentTotals.get(agentKey) || { amount: 0, orderIds: [] };
      current.amount += Number(order.commissionAmount || 0);
      current.orderIds.push(order._id);
      agentTotals.set(agentKey, current);
    });

    if (agentTotals.size === 0) {
      return NextResponse.json({ ok: true, released: 0, agents: 0 });
    }

    const session = db.client.startSession();
    let releasedCount = 0;

    try {
      await session.withTransaction(async () => {
        // עדכון עמלות זמינות להזמנות
        const orderIds = pendingOrders.map((order) => order._id);
        if (orderIds.length > 0) {
          const updateResult = await ordersCollection.updateMany(
            { _id: { $in: orderIds } },
            {
              $set: {
                commissionStatus: 'available',
                updatedAt: now,
              },
            },
            { session },
          );
          releasedCount = updateResult.modifiedCount || 0;
        }

        // עדכון יתרת הסוכן
        for (const [agentKey, data] of agentTotals.entries()) {
          if (!data.amount) continue;
          await usersCollection.updateOne(
            { _id: new ObjectId(agentKey) },
            {
              $inc: { commissionBalance: data.amount },
              $set: { updatedAt: now },
            },
            { session },
          );
        }
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({
      ok: true,
      released: releasedCount,
      agents: agentTotals.size,
    });
  } catch (err) {
    console.error('CRON_RELEASE_COMMISSIONS_ERROR:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
