import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentTenant } from '@/lib/tenant';
import { apiDebugLog } from '@/lib/apiDebugLog';

/**
 * Preview-only cleanup route.
 * Deletion is intentionally disabled because messages contain business communication history.
 */
function getExpectedCronSecret() {
  const expected = String(process.env.CRON_SECRET || '').trim();
  return expected || null;
}

function getTenantFilter(tenantId) {
  return tenantId
    ? { tenantId: { $in: [tenantId, String(tenantId)] } }
    : { tenantId: { $in: [null, undefined] } };
}

function verifyCronSecret(req) {
  const expectedSecret = getExpectedCronSecret();
  if (!expectedSecret) {
    return NextResponse.json({ error: 'cleanup_secret_not_configured' }, { status: 503 });
  }
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

async function buildCleanupPreview(tenantFilter) {
  const db = await getDb();
  const usersCol = db.collection('users');
  const messagesCol = db.collection('messages');
  const messages = await messagesCol.find(tenantFilter).toArray();

  let eligibleForDeletion = 0;
  const eligibleIds = [];
  const stats = {
    total: messages.length,
    direct: { total: 0, readByTarget: 0 },
    broadcast: { total: 0, oldAndRead: 0 },
    roleBased: { total: 0, mostlyRead: 0 },
  };

  for (const msg of messages) {
    const readByUserIds = (msg.readBy || []).map((r) => String(r.userId));

    if (msg.targetRole === 'direct' && msg.targetUserId) {
      stats.direct.total++;
      const targetRead = readByUserIds.includes(String(msg.targetUserId));
      if (targetRead) {
        stats.direct.readByTarget++;
        eligibleForDeletion++;
        eligibleIds.push(String(msg._id));
      }
    } else if (msg.targetRole === 'all') {
      stats.broadcast.total++;
      const isOld = new Date() - new Date(msg.createdAt) > 7 * 24 * 60 * 60 * 1000;
      const oldAndRead = isOld && readByUserIds.length >= 10;
      if (oldAndRead) {
        stats.broadcast.oldAndRead++;
        eligibleForDeletion++;
        eligibleIds.push(String(msg._id));
      }
    } else {
      stats.roleBased.total++;
      const roleCount = await usersCol.countDocuments({ role: msg.targetRole, ...tenantFilter });
      const readPercentage = roleCount > 0 ? (readByUserIds.length / roleCount) * 100 : 0;
      const mostlyRead = readPercentage >= 80;
      if (mostlyRead) {
        stats.roleBased.mostlyRead++;
        eligibleForDeletion++;
        eligibleIds.push(String(msg._id));
      }
    }
  }

  return {
    stats,
    eligibleForDeletion,
    eligibleIds,
    timestamp: new Date().toISOString(),
    previewOnly: true,
    deleteEnabled: false,
  };
}

async function POSTHandler(req) {
  try {
    const authError = verifyCronSecret(req);
    if (authError) return authError;

    const body = await req.json().catch(() => ({}));
    if (body?.execute === true) {
      return NextResponse.json(
        {
          error: 'message_cleanup_delete_disabled',
          message: 'Message deletion cleanup is disabled because messages contain business communication history.',
        },
        { status: 403 },
      );
    }

    const tenant = await getCurrentTenant(req);
    const tenantId = tenant?._id || null;
    const tenantFilter = getTenantFilter(tenantId);
    const preview = await buildCleanupPreview(tenantFilter);

    apiDebugLog('MESSAGES_CLEANUP_PREVIEW_POST', {
      eligibleForDeletion: preview.eligibleForDeletion,
      total: preview.stats.total,
    });

    return NextResponse.json({
      ok: true,
      ...preview,
    });
  } catch (error) {
    console.error('MESSAGES_CLEANUP_ERROR', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * GET endpoint returns cleanup preview/stats only.
 */
async function GETHandler(req) {
  try {
    const authError = verifyCronSecret(req);
    if (authError) return authError;

    const tenant = await getCurrentTenant(req);
    const tenantId = tenant?._id || null;
    const tenantFilter = getTenantFilter(tenantId);
    const preview = await buildCleanupPreview(tenantFilter);

    return NextResponse.json({
      ok: true,
      ...preview,
    });
  } catch (error) {
    console.error('MESSAGES_CLEANUP_STATS_ERROR', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
export const GET = withErrorLogging(GETHandler);
