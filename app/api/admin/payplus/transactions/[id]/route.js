/**
 * Admin API - PayPlus Transaction Details
 * GET /api/admin/payplus/transactions/:id - פרטי עסקה
 * POST /api/admin/payplus/transactions/:id/retry - ניסיון חוזר
 */

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';
import dbConnect from '@/lib/dbConnect';
import PaymentEvent from '@/models/PaymentEvent';
import IntegrationSyncMap from '@/models/IntegrationSyncMap';

function assertTenantAccess(admin, event) {
  if (isSuperAdmin(admin)) return;
  if (!admin?.tenantId) throw new Error('Access denied');

  const eventTenantId = event?.tenantId || event?.orderId?.tenantId;
  if (!eventTenantId) throw new Error('Access denied');
  if (String(eventTenantId) !== String(admin.tenantId)) throw new Error('Access denied');
}

async function GETHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);

    await dbConnect();

    const event = await PaymentEvent.findById(params.id)
      .populate('orderId')
      .lean();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    try {
      assertTenantAccess(admin, event);
    } catch {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get sync map if exists
    let syncMap = null;
    if (event.orderId) {
      syncMap = await IntegrationSyncMap.findOne({ orderId: event.orderId._id }).lean();
    }

    return NextResponse.json({
      ok: true,
      event,
      syncMap,
    });

  } catch (err) {
    console.error('[ADMIN_PAYPLUS_TRANSACTION_DETAIL]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function POSTHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);

    await dbConnect();

    const { action } = await req.json();

    if (action === 'retry') {
      const event = await PaymentEvent.findById(params.id).populate('orderId', 'tenantId');
      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      try {
        assertTenantAccess(admin, event);
      } catch {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Reset event for retry
      event.status = 'pending';
      event.retryCount = 0;
      event.nextRetryAt = new Date();
      event.inDeadLetter = false;
      event.deadLetterReason = null;
      event.deadLetterAt = null;
      await event.save();

      return NextResponse.json({
        ok: true,
        message: 'Event queued for retry',
        event,
      });
    }

    if (action === 'ignore') {
      const event = await PaymentEvent.findById(params.id).populate('orderId', 'tenantId');
      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      try {
        assertTenantAccess(admin, event);
      } catch {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      event.status = 'ignored';
      event.inDeadLetter = false;
      await event.save();

      return NextResponse.json({
        ok: true,
        message: 'Event marked as ignored',
        event,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err) {
    console.error('[ADMIN_PAYPLUS_TRANSACTION_ACTION]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
