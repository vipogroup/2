import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import {
  listScheduledNotifications,
  scheduleNotification,
} from '@/lib/notifications/scheduler';

export const dynamic = 'force-dynamic';

function normalizeStatusParam(value) {
  if (!value) return null;
  const list = Array.isArray(value) ? value : String(value).split(',');
  const allowed = ['pending', 'paused', 'completed', 'cancelled'];
  const normalized = list
    .map((item) => String(item).trim().toLowerCase())
    .filter((item) => allowed.includes(item));
  return normalized.length ? normalized : null;
}

async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = normalizeStatusParam(searchParams.getAll('status'));
    const templateType = searchParams.get('templateType') || undefined;

    const scheduled = await listScheduledNotifications({
      status: statusParam || ['pending', 'paused'],
      templateType,
    });

    return NextResponse.json({ ok: true, scheduled });
  } catch (error) {
    const status = error?.status || 500;
    const message = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

async function POSTHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
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

    const item = await scheduleNotification({
      templateType: payload.templateType,
      scheduleAt: payload.scheduleAt,
      audience: payload.audience,
      payloadOverrides: payload.payloadOverrides,
      recurrence: payload.recurrence,
      timezone: payload.timezone,
      metadata: payload.metadata,
      createdBy: admin.id,
    });

    return NextResponse.json({ ok: true, scheduled: item }, { status: 201 });
  } catch (error) {
    const status = error?.status || 500;
    const message =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : error?.message || 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
