import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import { getDb } from '@/lib/db';
import { getGoogleAdsStatus } from '@/lib/googleAdsService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await requireAdminApi(req);
    const db = await getDb();
    const status = await getGoogleAdsStatus(db);
    return NextResponse.json({ ok: true, ...status });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json({ ok: false, error: error?.message || 'google_ads_status_failed' }, { status });
  }
}
