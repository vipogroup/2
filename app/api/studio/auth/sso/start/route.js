import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/auth/server';

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

async function startSso(req) {
  const admin = await requireAdminApi(req);

  let baseUrl = null;
  try {
    const body = await req.json().catch(() => ({}));
    baseUrl =
      typeof body?.baseUrl === 'string' && body.baseUrl.trim()
        ? body.baseUrl.trim().replace(/\/+$/g, '')
        : null;
  } catch (_) {}

  if (!baseUrl) {
    try {
      const url = new URL(req.url);
      const qp = url.searchParams.get('baseUrl');
      if (typeof qp === 'string' && qp.trim()) {
        baseUrl = qp.trim().replace(/\/+$/g, '');
      }
    } catch (_) {}
  }

  if (!baseUrl) baseUrl = getRequestOrigin(req);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 120 * 1000); // 120 seconds

  const userId = admin?.id || admin?._id;
  const role = admin?.role || null;
  const tenantId = admin?.tenantId ? String(admin.tenantId) : null;

  const ssoSecret = String(process.env.STUDIO_SSO_SECRET || process.env.JWT_SECRET || 'dev-studio-sso-secret');
  const ssoCode = jwt.sign(
    { userId: String(userId), role, tenantId, baseUrl, purpose: 'studio_sso' },
    ssoSecret,
    { expiresIn: '120s' },
  );

  return { ssoCode, expiresAt, baseUrl };
}

async function POSTHandler(req) {
  try {
    const { ssoCode, expiresAt, baseUrl } = await startSso(req);
    return json({ ok: true, code: ssoCode, expiresAt: expiresAt.toISOString(), baseUrl });
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) {
      return json({ ok: false, error: err.message }, { status: err.status });
    }
    console.error('POST /api/studio/auth/sso/start error:', err);
    return json({ ok: false, error: 'Failed to start SSO' }, { status: 500 });
  }
}

async function GETHandler(req) {
  try {
    const url = new URL(req.url);
    const redirect = url.searchParams.get('redirect');

    const { ssoCode, expiresAt, baseUrl } = await startSso(req);

    if (redirect === '1' || redirect === 'true') {
      const deepLink = `vipo-image-studio://sso?code=${encodeURIComponent(ssoCode)}`;

      const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>פותח סטודיו...</title></head><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; background:#0b1220; color:#fff; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:24px;"><div style="max-width:720px; width:100%; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:16px; padding:20px;">` +
        `<h1 style="margin:0 0 8px; font-size:18px;">פותח את VIPO Image Studio...</h1>` +
        `<p style="margin:0 0 14px; opacity:0.85; line-height:1.5;">אם הסטודיו לא נפתח אוטומטית, לחץ על הכפתור למטה.</p>` +
        `<div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">` +
        `<a href="${deepLink}" style="display:inline-block; background:#2563eb; color:white; text-decoration:none; padding:10px 14px; border-radius:10px; font-weight:700;">פתח סטודיו</a>` +
        `<a href="/admin" style="display:inline-block; background:transparent; color:white; text-decoration:none; padding:10px 14px; border-radius:10px; font-weight:700; border:1px solid rgba(255,255,255,0.24);">חזרה לדשבורד</a>` +
        `</div>` +
        `<div style="margin-top:14px; font-size:12px; opacity:0.7;">אפשר לסגור את העמוד הזה לאחר שהסטודיו נפתח.</div>` +
        `</div>` +
        `<script>(function(){var url=${JSON.stringify(deepLink)}; try{window.location.href=url;}catch(e){} setTimeout(function(){try{window.location.href=url;}catch(e){}},300);})();</script>` +
        `</body></html>`;

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    return json({ ok: true, code: ssoCode, expiresAt: expiresAt.toISOString(), baseUrl });
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) {
      return json({ ok: false, error: err.message }, { status: err.status });
    }
    console.error('GET /api/studio/auth/sso/start error:', err);
    return json({ ok: false, error: 'Failed to start SSO' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
export const GET = withErrorLogging(GETHandler);
