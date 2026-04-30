import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import { getDb } from '@/lib/db';
import { buildGoogleAdsAuthUrl } from '@/lib/googleAdsService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await requireAdminApi(req);
    const db = await getDb();
    const { authUrl, redirectUri } = await buildGoogleAdsAuthUrl(db, req);
    if (process.env.GOOGLE_ADS_OAUTH_DEBUG === '1') {
      console.info('[google-ads/connect] redirect_uri=', redirectUri);
    }

    const mode = new URL(req.url).searchParams.get('mode') || 'redirect';
    if (mode === 'json') {
      return NextResponse.json({ ok: true, authUrl, redirectUri });
    }

    return NextResponse.redirect(authUrl);
  } catch (error) {
    const fallback = '/admin/control-center?tab=integrations&googleAdsError=connect_failed';
    const redirect = NextResponse.redirect(new URL(fallback, req.url));
    redirect.headers.set('x-google-ads-error', String(error?.message || 'google_ads_connect_failed'));
    return redirect;
  }
}
