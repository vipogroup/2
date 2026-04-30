import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/auth/server';
import { apiDebugLog } from '@/lib/apiDebugLog';

function getRequestOrigin(req) {
  const proto = req?.headers?.get?.('x-forwarded-proto');
  const host = req?.headers?.get?.('x-forwarded-host') || req?.headers?.get?.('host');
  if (proto && host) {
    return `${proto}://${host}`;
  }
  try {
    return new URL(req.url).origin;
  } catch {
    return process.env.PUBLIC_URL || 'http://localhost:3001';
  }
}

function json(data, init) {
  return NextResponse.json(data, init);
}

async function POSTHandler(req) {
  try {
    const admin = await requireAdminApi(req);

    const body = await req.json().catch(() => ({}));
    const baseUrl =
      typeof body?.baseUrl === 'string' && body.baseUrl.trim()
        ? body.baseUrl.trim().replace(/\/+$/g, '')
        : getRequestOrigin(req);

    const userId = admin?.id || admin?._id;
    const role = admin?.role || null;
    const tenantId = admin?.tenantId ? String(admin.tenantId) : null;

    // Create a short-lived signed JWT as the SSO code (no DB needed)
    const ssoSecret = String(process.env.STUDIO_SSO_SECRET || process.env.JWT_SECRET || 'dev-studio-sso-secret');
    const ssoCode = jwt.sign(
      { userId: String(userId), role, tenantId, baseUrl, purpose: 'studio_sso' },
      ssoSecret,
      { expiresIn: '120s' },
    );

    const deepLink = `vipo-image-studio://sso?code=${encodeURIComponent(ssoCode)}&baseUrl=${encodeURIComponent(baseUrl)}`;

    apiDebugLog('[sso/launch] created JWT SSO code for userId:', String(userId));

    // Send SSO to the studio via local HTTP bridge (port 19250)
    let bridgeOk = false;
    try {
      const bridgeRes = await fetch('http://127.0.0.1:19250/sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: ssoCode, baseUrl }),
        signal: AbortSignal.timeout(5000),
      });
      const bridgeData = await bridgeRes.json().catch(() => ({}));
      bridgeOk = bridgeRes.ok && bridgeData?.ok;
      apiDebugLog('[sso/launch] bridge response:', bridgeRes.status, bridgeData);
    } catch (e) {
      apiDebugLog('[sso/launch] bridge unreachable (studio not running?):', e?.message);
    }

    return json({ ok: true, launched: bridgeOk, deepLink });
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) {
      return json({ ok: false, error: err.message }, { status: err.status });
    }
    console.error('POST /api/studio/auth/sso/launch error:', err);
    return json({ ok: false, error: 'Failed to launch studio' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
