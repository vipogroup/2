import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { consumeOAuthState, exchangeCodeForTokens } from '@/lib/googleAdsService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(new URL('/admin/control-center?tab=integrations&googleAdsError=oauth_denied', req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/admin/control-center?tab=integrations&googleAdsError=invalid_callback', req.url));
  }

  try {
    const db = await getDb();
    const validState = await consumeOAuthState(db, state);
    if (!validState) {
      return NextResponse.redirect(new URL('/admin/control-center?tab=integrations&googleAdsError=invalid_state', req.url));
    }

    await exchangeCodeForTokens(db, req, code);

    return NextResponse.redirect(new URL('/admin/control-center?tab=integrations&googleAdsConnected=1', req.url));
  } catch (error) {
    console.error(
      '[google-ads/callback]',
      error?.message,
      error?.googleOAuthError,
      error?.googleOAuthErrorDescription || '',
    );
    const url = new URL('/admin/control-center', req.url);
    url.searchParams.set('tab', 'integrations');
    url.searchParams.set('googleAdsError', 'exchange_failed');
    if (error?.googleOAuthError && error.googleOAuthError !== 'unknown') {
      url.searchParams.set('googleOAuthError', error.googleOAuthError);
    }
    return NextResponse.redirect(url);
  }
}
