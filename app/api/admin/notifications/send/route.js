import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import { sendTemplateNotification } from '@/lib/notifications/dispatcher';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';

export const dynamic = 'force-dynamic';

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

    const {
      templateType,
      variables = {},
      audienceRoles = [],
      audienceTags = [],
      audienceUserIds = [],
      payloadOverrides = {},
      dryRun = false,
    } = payload;

    if (!templateType) {
      return NextResponse.json({ ok: false, error: 'template_type_required' }, { status: 400 });
    }

    // Multi-Tenant: Get tenantId from admin user (Business Admin sends only to their tenant)
    const tenantId = !isSuperAdmin(admin) && admin.tenantId ? admin.tenantId : null;

    const result = await sendTemplateNotification({
      templateType,
      variables,
      audienceRoles,
      audienceTags,
      audienceUserIds,
      payloadOverrides,
      dryRun,
      tenantId, // Multi-Tenant: Pass tenantId to filter recipients
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('send_notification_error', error);
    const status = error?.status || 500;
    const message =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : error?.message || 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export const POST = withErrorLogging(POSTHandler);
