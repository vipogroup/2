import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

import { requireAuthApi } from '@/lib/auth/server';
import { upsertPushSubscription, removePushSubscription } from '@/lib/pushSubscriptions';
import { getWebPushConfig } from '@/lib/webPush';
import { apiDebugLog } from '@/lib/apiDebugLog';

function safeJsonParse(body) {
  try {
    return JSON.parse(body);
  } catch (error) {
    return null;
  }
}

async function POSTHandler(req) {
  try {
    apiDebugLog('PUSH_SUBSCRIBE: POST request received');
    const config = getWebPushConfig();
    if (!config.configured) {
      apiDebugLog('PUSH_SUBSCRIBE: web push not configured');
      return NextResponse.json({ ok: false, error: 'web_push_not_configured' }, { status: 503 });
    }

    apiDebugLog('PUSH_SUBSCRIBE: checking auth...');
    const user = await requireAuthApi(req);
    apiDebugLog('PUSH_SUBSCRIBE: user authenticated', { userId: user?.id, role: user?.role });

    const raw = await req.text();
    const payload = typeof raw === 'string' && raw ? safeJsonParse(raw) : null;

    if (!payload?.subscription || !payload.subscription.endpoint || !payload.subscription.keys) {
      return NextResponse.json({ ok: false, error: 'invalid_subscription' }, { status: 400 });
    }

    const subscription = payload.subscription;
    const tags = Array.isArray(payload.tags) ? payload.tags : [];
    const fallbackTag = user?.role === 'agent' ? 'agent' : user?.role === 'admin' ? 'admin' : 'customer';
    const effectiveTags = tags.length ? tags : [fallbackTag];
    const consentAt = payload.consentAt || null;
    const consentVersion = payload.consentVersion || null;
    const consentMeta = payload.consentMeta && typeof payload.consentMeta === 'object' ? payload.consentMeta : null;
    const lastConsentAction = payload.lastConsentAction || 'accepted';

    const headersList = await headers();
    const userAgent = headersList.get('user-agent');
    const ipHeader = headersList.get('x-forwarded-for') || headersList.get('x-real-ip');
    const ip = ipHeader ? ipHeader.split(',')[0].trim() : null;

    apiDebugLog('PUSH_SUBSCRIBE: Creating new subscription...');
    await upsertPushSubscription({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userId: user.id,
      role: user.role,
      tags: effectiveTags,
      userAgent,
      ip,
      consentAt,
      consentVersion,
      consentMeta,
      lastConsentAction,
      tenantId: user?.tenantId ? String(user.tenantId) : null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error?.status || 500;
    const message = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : error?.message || 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

async function DELETEHandler(req) {
  try {
    const user = await requireAuthApi(req);
    const raw = await req.text();
    const payload = typeof raw === 'string' && raw ? safeJsonParse(raw) : null;
    const endpoint = payload?.endpoint;

    if (!endpoint) {
      return NextResponse.json({ ok: false, error: 'endpoint_required' }, { status: 400 });
    }

    const result = await removePushSubscription(endpoint);

    return NextResponse.json({ ok: true, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    const status = error?.status || 500;
    const message = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : error?.message || 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export const POST = withErrorLogging(POSTHandler);
export const DELETE = withErrorLogging(DELETEHandler);
