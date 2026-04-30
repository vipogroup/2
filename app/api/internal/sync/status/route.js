import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

function getSyncSecret() {
  const raw = process.env.CATALOG_TEMPLATE_SYNC_SECRET;
  const secret = raw ? String(raw).trim() : '';
  return secret || null;
}

function isAuthorized(req) {
  const secret = getSyncSecret();
  if (!secret) {
    return { ok: false, response: NextResponse.json({ ok: false, error: 'sync_secret_not_configured' }, { status: 503 }) };
  }
  const incoming = req.headers.get('x-template-sync-secret');
  if (!incoming || incoming !== secret) {
    return { ok: false, response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }) };
  }
  return { ok: true };
}

async function GETHandler(req) {
  const auth = isAuthorized(req);
  if (!auth.ok) return auth.response;

  try {
    const { getAutoSyncStatus } = await import('@/lib/autoSync');
    const status = getAutoSyncStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

async function POSTHandler(req) {
  const auth = isAuthorized(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '').trim().toLowerCase();

    if (action === 'trigger') {
      const { triggerSync } = await import('@/lib/autoSync');
      const result = await triggerSync();
      return NextResponse.json({ ok: true, result });
    }

    if (action === 'start') {
      const { startAutoSync } = await import('@/lib/autoSync');
      startAutoSync();
      return NextResponse.json({ ok: true, message: 'auto-sync started' });
    }

    if (action === 'stop') {
      const { stopAutoSync } = await import('@/lib/autoSync');
      stopAutoSync();
      return NextResponse.json({ ok: true, message: 'auto-sync stopped' });
    }

    return NextResponse.json({ ok: false, error: 'invalid_action. Use: trigger, start, stop' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
