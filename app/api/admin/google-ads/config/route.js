import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import { getDb } from '@/lib/db';
import { getMaskedGoogleAdsConfig, saveGoogleAdsConfig } from '@/lib/googleAdsService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await requireAdminApi(req);
    const db = await getDb();
    const config = await getMaskedGoogleAdsConfig(db, req);
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json({ ok: false, error: error?.message || 'google_ads_config_fetch_failed' }, { status });
  }
}

export async function POST(req) {
  try {
    const user = await requireAdminApi(req);
    const body = await req.json();

    const db = await getDb();
    await saveGoogleAdsConfig(
      db,
      {
        clientId: body.clientId,
        clientSecret: body.clientSecret,
        developerToken: body.developerToken,
        managerCustomerId: body.managerCustomerId,
        redirectUri: body.redirectUri,
      },
      user?.email || user?.id || 'admin',
    );

    const config = await getMaskedGoogleAdsConfig(db, req);
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json({ ok: false, error: error?.message || 'google_ads_config_save_failed' }, { status });
  }
}
