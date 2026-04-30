import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import { getDb } from '@/lib/db';
import { syncGoogleAdsSnapshot } from '@/lib/googleAdsService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    await requireAdminApi(req);
    const db = await getDb();
    const snapshot = await syncGoogleAdsSnapshot(db);
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json({ ok: false, error: error?.message || 'google_ads_sync_failed' }, { status });
  }
}
