import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth/server';
import { getDb } from '@/lib/db';
import webpush from 'web-push';

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@vipo.co.il';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

async function POSTHandler(req) {
  try {
    // Verify admin user
    const user = await requireAuthApi(req);
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, body, url } = await req.json();

    if (!body) {
      return NextResponse.json({ error: 'Missing message body' }, { status: 400 });
    }

    // Get all push subscriptions from database
    const db = await getDb();
    const subscriptions = await db.collection('push_subscriptions').find({ active: true }).toArray();

    if (subscriptions.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: 'No active subscriptions found' });
    }

    const payload = JSON.stringify({
      title: title || 'VIPO',
      body: body,
      icon: '/icons/vipo-icon.svg',
      badge: '/icons/vipo-badge.png',
      url: url || '/',
      timestamp: Date.now(),
    });

    let sent = 0;
    let failed = 0;

    // Send to all subscriptions
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        sent++;
      } catch (err) {
        failed++;
        // If subscription is expired or invalid, mark it as inactive
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.collection('push_subscriptions').updateOne(
            { _id: sub._id },
            { $set: { active: false, expiredAt: new Date() } }
          );
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      total: subscriptions.length,
      message: `התראה נשלחה ל-${sent} מכשירים`,
    });
  } catch (error) {
    console.error('Send all push error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send notifications' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
