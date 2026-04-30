/**
 * Admin API - PayPlus Dead Letter Queue
 * GET /api/admin/payplus/dead-letter - רשימת אירועים ב-DLQ
 * POST /api/admin/payplus/dead-letter - פעולות על DLQ
 */

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import dbConnect from '@/lib/dbConnect';
import PaymentEvent from '@/models/PaymentEvent';
import { DeadLetterQueue } from '@/lib/payplus/retryPolicy';

async function GETHandler(req) {
  try {
    await requireAdminApi(req);

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      PaymentEvent.find({ inDeadLetter: true })
        .sort({ deadLetterAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('orderId', 'status totalAmount customerName')
        .lean(),
      PaymentEvent.countDocuments({ inDeadLetter: true }),
    ]);

    return NextResponse.json({
      ok: true,
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (err) {
    console.error('[ADMIN_PAYPLUS_DLQ]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function POSTHandler(req) {
  try {
    await requireAdminApi(req);

    await dbConnect();

    const { action, eventId, eventIds } = await req.json();

    if (action === 'retry' && eventId) {
      const event = await DeadLetterQueue.retryFromDeadLetter(PaymentEvent, eventId);
      return NextResponse.json({
        ok: true,
        message: 'Event moved from DLQ and queued for retry',
        event,
      });
    }

    if (action === 'retry_all' && Array.isArray(eventIds)) {
      const results = [];
      for (const id of eventIds) {
        try {
          const event = await DeadLetterQueue.retryFromDeadLetter(PaymentEvent, id);
          results.push({ id, success: true });
        } catch (err) {
          results.push({ id, success: false, error: err.message });
        }
      }
      return NextResponse.json({
        ok: true,
        message: `Processed ${results.length} events`,
        results,
      });
    }

    if (action === 'clear' && eventId) {
      const event = await PaymentEvent.findOne({ eventId });
      if (event) {
        event.status = 'ignored';
        event.inDeadLetter = false;
        await event.save();
      }
      return NextResponse.json({
        ok: true,
        message: 'Event removed from DLQ',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err) {
    console.error('[ADMIN_PAYPLUS_DLQ_ACTION]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
