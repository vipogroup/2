import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendTemplateNotification } from '@/lib/notifications/dispatcher';
import { pushToUsers } from '@/lib/pushSender';

function getCronSecret() {
  const secret = process.env.PUSH_CRON_SECRET;
  return secret ? secret.trim() : null;
}

function isAuthorized(req) {
  const secret = getCronSecret();
  if (!secret) {
    return {
      ok: false,
      status: 503,
      response: NextResponse.json({ ok: false, error: 'cron_secret_not_configured' }, { status: 503 }),
    };
  }

  const incomingSecret = req.headers.get('x-cron-secret');
  if (!incomingSecret || incomingSecret !== secret) {
    return {
      ok: false,
      status: 401,
      response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }),
    };
  }

  return { ok: true };
}

async function getAgentStats(db, agentId, startOfDay, endOfDay) {
  const orders = db.collection('orders');
  
  // Get orders through this agent today
  const agentOrders = await orders.find({
    $or: [
      { agentId: agentId },
      { refAgentId: agentId },
    ],
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  }).toArray();

  const ordersCount = agentOrders.length;
  const totalCommission = agentOrders.reduce((sum, order) => {
    return sum + (Number(order.commissionAmount) || 0);
  }, 0);

  // Get visits count (if tracking exists)
  const visits = 0; // TODO: implement visit tracking if needed

  return {
    visits,
    orders: ordersCount,
    commission: totalCommission,
  };
}

async function POSTHandler(req) {
  const auth = isAuthorized(req);
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(req.url);
  const dryRunParam = url.searchParams.get('dryRun') || url.searchParams.get('dry_run');
  const dryRun = dryRunParam === '1' || dryRunParam === 'true';

  try {
    const db = await getDb();
    const users = db.collection('users');

    // Get all active agents
    const agents = await users.find({
      role: 'agent',
      isActive: { $ne: false },
    }).toArray();

    if (!agents.length) {
      return NextResponse.json({
        ok: true,
        message: 'No active agents found',
        processed: 0,
        dryRun,
      });
    }

    // Calculate today's date range
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const results = [];

    for (const agent of agents) {
      try {
        const stats = await getAgentStats(db, agent._id, startOfDay, endOfDay);
        const agentName = agent.fullName || agent.email || 'סוכן';

        if (dryRun) {
          results.push({
            agentId: String(agent._id),
            agentName,
            stats,
            sent: false,
            dryRun: true,
          });
          continue;
        }

        // Send notification using template
        await sendTemplateNotification({
          templateType: 'agent_daily_digest',
          variables: {
            agent_name: agentName,
            visits: String(stats.visits),
            orders: String(stats.orders),
            commission: stats.commission.toLocaleString('he-IL'),
          },
          audienceUserIds: [String(agent._id)],
          payloadOverrides: {
            url: '/agent',
            data: {
              type: 'agent_daily_digest',
              agentId: String(agent._id),
              stats,
            },
          },
        });

        results.push({
          agentId: String(agent._id),
          agentName,
          stats,
          sent: true,
        });
      } catch (agentErr) {
        console.error('AGENT_DIGEST_ERROR', agent._id, agentErr?.message);
        results.push({
          agentId: String(agent._id),
          error: agentErr?.message || 'failed',
          sent: false,
        });
      }
    }

    const successCount = results.filter(r => r.sent).length;

    return NextResponse.json({
      ok: true,
      processed: successCount,
      total: agents.length,
      dryRun,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AGENT_DIGEST_CRON_ERROR', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'digest_failed',
        message: error?.message || 'Unexpected error',
      },
      { status: 500 },
    );
  }
}

async function GETHandler(req) {
  // Allow GET for providers that only support GET webhooks
  return POST(req);
}

export const POST = withErrorLogging(POSTHandler);
export const GET = withErrorLogging(GETHandler);
