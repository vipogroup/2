import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import {
  getNotificationTemplate,
  upsertNotificationTemplate,
  removeNotificationTemplate,
  ensureDefaultTemplates,
} from '@/lib/notifications/templates';

export const dynamic = 'force-dynamic';

function normalizeType(rawType) {
  if (!rawType) return null;
  return String(rawType).trim();
}

async function GETHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const type = normalizeType(params?.id);
    if (!type) {
      return NextResponse.json({ ok: false, error: 'invalid_type' }, { status: 400 });
    }

    await ensureDefaultTemplates();
    const template = await getNotificationTemplate(type);
    if (!template) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, template });
  } catch (error) {
    const status = error?.status || 500;
    const message = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

async function PUTHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const type = normalizeType(params?.id);
    if (!type) {
      return NextResponse.json({ ok: false, error: 'invalid_type' }, { status: 400 });
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

    const updated = await upsertNotificationTemplate(type, {
      name: payload.name,
      title: payload.title,
      body: payload.body,
      description: payload.description,
      audience: payload.audience,
      variables: payload.variables,
      enabled: payload.enabled,
    });

    return NextResponse.json({ ok: true, template: updated });
  } catch (error) {
    const status = error?.status || 500;
    const message = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : error?.message || 'server_error';
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

    const type = normalizeType(params?.id);
    if (!type) {
      return NextResponse.json({ ok: false, error: 'invalid_type' }, { status: 400 });
    }

    const result = await removeNotificationTemplate(type);
    return NextResponse.json({ ok: true, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    const status = error?.status || 500;
    const message = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
export const PUT = withErrorLogging(PUTHandler);
export const DELETE = withErrorLogging(DELETEHandler);
