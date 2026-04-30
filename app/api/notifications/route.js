import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';

/**
 * GET /api/notifications
 * Admin endpoint to query notifications (from notificationlogs collection)
 */
async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    // Query notificationlogs collection where dispatcher logs notifications
    const notificationLogs = db.collection('notificationlogs');

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const userId = searchParams.get('userId');
    const tenantId = searchParams.get('tenantId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const query = {};
    
    // Tenant filter for non-super-admin
    if (!isSuperAdmin(admin) && admin.tenantId) {
      query.tenantId = admin.tenantId;
    } else if (tenantId) {
      query.tenantId = tenantId;
    }

    // Use templateType field (how notifications are stored)
    if (type) {
      query.templateType = type;
    }

    if (userId) {
      query.$or = [
        { recipientUserId: userId },
        { audienceTargets: userId },
      ];
    }

    const items = await notificationLogs
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const formattedItems = items.map((n) => ({
      _id: String(n._id),
      type: n.templateType,
      templateType: n.templateType,
      title: n.title,
      body: n.body,
      userId: n.recipientUserId || null,
      tenantId: n.tenantId || null,
      status: n.status,
      recipientCount: n.recipientCount || 0,
      createdAt: n.createdAt,
    }));

    return NextResponse.json({
      ok: true,
      notifications: formattedItems,
      items: formattedItems,
      total: formattedItems.length,
    });
  } catch (error) {
    console.error('NOTIFICATIONS_GET_ERROR:', error);
    const status = error?.status || 500;
    const message = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
