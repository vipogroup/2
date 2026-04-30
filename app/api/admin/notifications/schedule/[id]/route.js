import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import {
  getScheduledNotification,
  cancelScheduledNotification,
  updateScheduledNotification,
} from '@/lib/notifications/scheduler';

export const dynamic = 'force-dynamic';

function normalizeId(rawId) {
  if (!rawId) return null;
  return String(rawId).trim();
}

async function GETHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const id = normalizeId(params?.id);
    if (!id) {
      return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
    }

    const scheduled = await getScheduledNotification(id);
    if (!scheduled) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, scheduled });
  } catch (error) {
    const status = error?.status || 500;
    const message = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

async function PATCHHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const id = normalizeId(params?.id);
    if (!id) {
      return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
    }

    let payload;
    try {
      payload = await req.json();
    } catch (err) {
      return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }

    const res = await updateScheduledNotification(id, payload);
    if (!res.ok) {
      const status = res.error === 'invalid_id' ? 400 : res.error === 'not_found' ? 404 : 400;
      return NextResponse.json({ ok: false, error: res.error }, { status });
    }

    return NextResponse.json({ ok: true, scheduled: res.item });
  } catch (error) {
    const status = error?.status || 500;
    const message =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : error?.message || 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

async function DELETEHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const id = normalizeId(params?.id);
    if (!id) {
      return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
    }

    const res = await cancelScheduledNotification(id);
    if (!res.ok) {
      const status = res.error === 'invalid_id' ? 400 : res.error === 'not_found' ? 404 : 400;
      return NextResponse.json({ ok: false, error: res.error }, { status });
    }

    return NextResponse.json({ ok: true, scheduled: res.item });
  } catch (error) {
    const status = error?.status || 500;
    const message = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
export const PATCH = withErrorLogging(PATCHHandler);
export const DELETE = withErrorLogging(DELETEHandler);
