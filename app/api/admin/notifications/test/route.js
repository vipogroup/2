import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import { getNotificationTemplate } from '@/lib/notifications/templates';
import { findSubscriptionsByUserIds } from '@/lib/pushSubscriptions';
import { sendPushNotification, getWebPushConfig } from '@/lib/webPush';
import { apiDebugLog } from '@/lib/apiDebugLog';

export const dynamic = 'force-dynamic';

async function POSTHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    // Check VAPID config
    const config = getWebPushConfig();
    if (!config.configured) {
      return NextResponse.json({ 
        ok: false, 
        error: 'VAPID keys not configured' 
      }, { status: 400 });
    }

    const body = await req.json();
    const { templateType, title, body: messageBody } = body;

    if (!templateType) {
      return NextResponse.json({ ok: false, error: 'template_type_required' }, { status: 400 });
    }

    const template = await getNotificationTemplate(templateType);
    if (!template) {
      return NextResponse.json({ ok: false, error: 'template_not_found' }, { status: 404 });
    }

    // Find subscriptions for this admin user
    const subs = await findSubscriptionsByUserIds([admin.id]);
    apiDebugLog('TEST_NOTIFICATION: Found subscriptions for admin', admin.id, ':', subs?.length || 0);
    
    if (!subs.length) {
      return NextResponse.json({ 
        ok: false, 
        error: 'לא נמצאו מכשירים רשומים להתראות',
        hint: 'לחץ על "הפעל התראות" בתפריט החשבון שלי'
      }, { status: 404 });
    }

    const payload = {
      title: title || template.title || '[BELL] התראת בדיקה',
      body: messageBody || template.body || 'זוהי התראת בדיקה מדף ניהול ההתראות',
      icon: '/icons/192.png',
      badge: '/icons/badge.png',
      tag: 'test-template-' + Date.now(),
      data: {
        templateType: template.type,
        isTest: true,
        url: '/admin/notifications',
        timestamp: Date.now(),
      },
    };

    const results = [];
    for (const sub of subs) {
      try {
        apiDebugLog('TEST_NOTIFICATION: Sending to endpoint', sub.endpoint?.slice(0, 50));
        await sendPushNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        );
        results.push({ ok: true, endpoint: sub.endpoint?.slice(0, 30) });
        apiDebugLog('TEST_NOTIFICATION: SUCCESS');
      } catch (err) {
        console.error('TEST_NOTIFICATION: FAILED', err?.message);
        results.push({ ok: false, error: err?.message, endpoint: sub.endpoint?.slice(0, 30) });
      }
    }

    const successCount = results.filter(r => r.ok).length;
    const failCount = results.filter(r => !r.ok).length;

    return NextResponse.json({
      ok: successCount > 0,
      sent: successCount,
      failed: failCount,
      results,
      sentTo: admin.email,
      message: successCount > 0 
        ? `נשלחו ${successCount} התראות בהצלחה!` 
        : 'לא הצלחנו לשלוח התראות',
    });
  } catch (error) {
    console.error('Test notification error:', error);
    const status = error?.status || 500;
    const message = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : error?.message || 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export const POST = withErrorLogging(POSTHandler);
