import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';

import { processDueNotifications } from '@/lib/notifications/dispatcher';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

async function POSTHandler(req) {
  const auth = isAuthorized(req);
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(req.url);
  const dryRunParam = url.searchParams.get('dryRun') || url.searchParams.get('dry_run');
  const dryRun = dryRunParam === '1' || dryRunParam === 'true';

  try {
    const result = await processDueNotifications(new Date(), { dryRun });
    return NextResponse.json({
      ok: true,
      dryRun: result.dryRun,
      processed: result.processed,
      results: result.results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('PUSH_CRON_ERROR', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'dispatch_failed',
        message: error?.message || 'Unexpected error',
      },
      { status: 500 },
    );
  }
}

async function GETHandler(req) {
  // Allow GET for providers that only support GET webhooks (e.g. Vercel cron)
  return POST(req);
}

export const POST = withErrorLogging(POSTHandler);
export const GET = withErrorLogging(GETHandler);
