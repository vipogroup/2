import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import { listNotificationTemplates, upsertNotificationTemplate, getNotificationTemplate } from '@/lib/notifications/templates';
import { listScheduledNotifications } from '@/lib/notifications/scheduler';

export const dynamic = 'force-dynamic';

async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const templates = await listNotificationTemplates();
    const scheduled = await listScheduledNotifications({ status: ['pending', 'paused'] });

    return NextResponse.json({ ok: true, templates, scheduled });
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

    if (!payload?.type || typeof payload.type !== 'string') {
      return NextResponse.json({ ok: false, error: 'type_required' }, { status: 400 });
    }

    const type = payload.type.trim().toLowerCase().replace(/\s+/g, '_');
    if (!type) {
      return NextResponse.json({ ok: false, error: 'invalid_type' }, { status: 400 });
    }

    const existing = await getNotificationTemplate(type);
    if (existing) {
      return NextResponse.json({ ok: false, error: 'template_already_exists' }, { status: 409 });
    }

    const template = await upsertNotificationTemplate(type, {
      name: payload.name || payload.type,
      title: payload.title || '',
      body: payload.body || '',
      description: payload.description || '',
      audience: payload.audience || ['customer', 'agent', 'admin'],
      variables: payload.variables || [],
      enabled: payload.enabled !== false,
    });

    return NextResponse.json({ ok: true, template });
  } catch (error) {
    console.error('CREATE_TEMPLATE_ERROR', error);
    const status = error?.status || 500;
    const message = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
