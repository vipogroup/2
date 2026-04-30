/**
 * Cron Job - Retry Failed Syncs
 * Runs hourly
 * 
 * POST /api/cron/retry-failed-syncs
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
import { processPendingRetries } from '@/lib/payplus/retryPolicy';
import { retryFailedSyncs } from '@/lib/priority/syncService';
import { apiDebugLog } from '@/lib/apiDebugLog';

const AUTH_HEADER = 'authorization';

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
}

function validateAuth(req) {
  const rawSecret = process.env.CRON_SECRET || process.env.CRON_API_TOKEN;
  const cronSecret = rawSecret ? rawSecret.trim() : null;
  if (!cronSecret) {
    console.error('CRON_SECRET missing. Blocked retry-failed-syncs execution.');
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

    const results = {
      payplus: { processed: 0, succeeded: 0, failed: 0, movedToDeadLetter: 0 },
      priority: { processed: 0, succeeded: 0, failed: 0 },
    };

    // 1. Retry failed PayPlus webhook processing
    try {
      const payplusResult = await processPendingRetries(PaymentEvent, async (payload, signature) => {
        // Re-process the webhook (simplified - in production would call full handler)
        const event = await PaymentEvent.findOne({ rawPayload: payload });
        if (event) {
          event.status = 'processed';
          event.processedAt = new Date();
          await event.save();
        }
      });
      results.payplus = payplusResult;
    } catch (err) {
      console.error('[CRON_RETRY] PayPlus retry failed:', err.message);
      results.payplus.error = err.message;
    }

    // 2. Retry failed Priority syncs
    try {
      const priorityResult = await retryFailedSyncs(50);
      results.priority = priorityResult;
    } catch (err) {
      console.error('[CRON_RETRY] Priority retry failed:', err.message);
      results.priority.error = err.message;
    }

    // Log summary
    apiDebugLog('[CRON_RETRY_SYNCS]', JSON.stringify({
      payplus: {
        processed: results.payplus.processed,
        succeeded: results.payplus.succeeded,
        dlq: results.payplus.movedToDeadLetter,
      },
      priority: {
        processed: results.priority.processed,
        succeeded: results.priority.succeeded,
      },
    }));

    // Send alert if many failures
    const totalFailed = (results.payplus.failed || 0) + (results.priority.failed || 0);
    if (totalFailed > 10) {
      await sendRetryAlert(results);
    }

    return NextResponse.json({
      ok: true,
      results,
    });

  } catch (err) {
    console.error('CRON_RETRY_SYNCS_ERROR:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

async function sendRetryAlert(results) {
  const slackWebhook = process.env.INTEGRATION_ALERT_SLACK_WEBHOOK;
  
  if (slackWebhook) {
    try {
      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ':warning: *High number of sync failures*',
          attachments: [{
            color: 'warning',
            fields: [
              { title: 'PayPlus Failed', value: results.payplus.failed || 0, short: true },
              { title: 'Priority Failed', value: results.priority.failed || 0, short: true },
              { title: 'Moved to DLQ', value: results.payplus.movedToDeadLetter || 0, short: true },
            ],
          }],
        }),
      });
    } catch (err) {
      console.error('[RETRY_ALERT] Slack failed:', err.message);
    }
  }
}

export const POST = withErrorLogging(POSTHandler);
