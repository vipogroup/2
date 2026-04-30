/**
 * Cron Job - Generate Daily Reconciliation Report
 * Runs daily at 06:00
 * 
 * POST /api/cron/generate-reconciliation
 * Authorization: Bearer {CRON_SECRET}
 */

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import PaymentEvent from '@/models/PaymentEvent';
import IntegrationSyncMap from '@/models/IntegrationSyncMap';
import Order from '@/models/Order';
import { apiDebugLog } from '@/lib/apiDebugLog';

const AUTH_HEADER = 'authorization';

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
}

function validateAuth(req) {
  const rawSecret = process.env.CRON_SECRET || process.env.CRON_API_TOKEN;
  const cronSecret = rawSecret ? rawSecret.trim() : null;
  if (!cronSecret) {
    console.error('CRON_SECRET missing. Blocked generate-reconciliation execution.');
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

    await dbConnect();

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
    const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));

    // Get yesterday's payment events
    const paymentEvents = await PaymentEvent.find({
      createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
      type: 'success',
      status: 'processed',
    }).lean();

    // Get corresponding orders
    const orderIds = paymentEvents.map(e => e.orderId);
    const orders = await Order.find({ _id: { $in: orderIds } }).lean();
    const ordersMap = orders.reduce((acc, o) => {
      acc[o._id.toString()] = o;
      return acc;
    }, {});

    // Calculate stats
    let totalPayments = 0;
    let totalOrders = 0;
    let mismatches = 0;
    let missing = 0;

    const issues = [];

    for (const event of paymentEvents) {
      const orderId = event.orderId.toString();
      const order = ordersMap[orderId];

      totalPayments += event.amount;

      if (!order) {
        missing++;
        issues.push({
          type: 'missing_order',
          eventId: event.eventId,
          orderId,
          amount: event.amount,
        });
        continue;
      }

      totalOrders += order.totalAmount;
      const diff = Math.abs(event.amount - order.totalAmount);
      
      if (diff > 0.01) {
        mismatches++;
        issues.push({
          type: 'amount_mismatch',
          eventId: event.eventId,
          orderId,
          paymentAmount: event.amount,
          orderAmount: order.totalAmount,
          diff,
        });
      }
    }

    // Get sync status
    const syncStats = await IntegrationSyncMap.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
        },
      },
      {
        $group: {
          _id: '$syncStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const report = {
      date: startOfYesterday.toISOString().split('T')[0],
      generatedAt: now.toISOString(),
      payments: {
        total: paymentEvents.length,
        totalAmount: totalPayments,
      },
      orders: {
        total: orders.length,
        totalAmount: totalOrders,
      },
      reconciliation: {
        matched: paymentEvents.length - mismatches - missing,
        mismatches,
        missingOrders: missing,
        difference: totalPayments - totalOrders,
      },
      sync: syncStats.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      issues: issues.slice(0, 50), // Limit to 50 issues
    };

    // Send alert if there are issues
    if (issues.length > 0) {
      await sendReconciliationAlert(report);
    }

    apiDebugLog('[CRON_RECONCILIATION]', JSON.stringify({
      date: report.date,
      payments: report.payments.total,
      mismatches: report.reconciliation.mismatches,
      missing: report.reconciliation.missingOrders,
    }));

    return NextResponse.json({
      ok: true,
      report,
    });

  } catch (err) {
    console.error('CRON_RECONCILIATION_ERROR:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

async function sendReconciliationAlert(report) {
  const alertEmail = process.env.INTEGRATION_ALERT_EMAIL;
  const slackWebhook = process.env.INTEGRATION_ALERT_SLACK_WEBHOOK;

  const message = `
[STATS] דוח התאמות יומי - ${report.date}

תשלומים: ${report.payments.total} (₪${report.payments.totalAmount.toLocaleString()})
הזמנות: ${report.orders.total} (₪${report.orders.totalAmount.toLocaleString()})

התאמות:
[OK] תואמים: ${report.reconciliation.matched}
[WARN] אי-התאמות: ${report.reconciliation.mismatches}
[X] הזמנות חסרות: ${report.reconciliation.missingOrders}

הפרש כולל: ₪${report.reconciliation.difference.toLocaleString()}
  `.trim();

  // Send email if configured
  if (alertEmail) {
    try {
      const { sendEmail } = await import('@/lib/email.js');
      await sendEmail({
        to: alertEmail,
        subject: `[VIPO] דוח התאמות יומי - ${report.date}`,
        text: message,
      });
    } catch (err) {
      console.error('[RECONCILIATION_ALERT] Email failed:', err.message);
    }
  }

  // Send Slack if configured
  if (slackWebhook) {
    try {
      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          attachments: report.reconciliation.mismatches > 0 ? [{
            color: 'warning',
            title: 'יש אי-התאמות לבדיקה',
            text: `${report.reconciliation.mismatches} עסקאות עם אי-התאמה בסכום`,
          }] : [],
        }),
      });
    } catch (err) {
      console.error('[RECONCILIATION_ALERT] Slack failed:', err.message);
    }
  }
}

export const POST = withErrorLogging(POSTHandler);
