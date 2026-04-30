import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { sendTemplateNotification } from '@/lib/notifications/dispatcher';
import { pushToUsers } from '@/lib/pushSender';
import { getProductPublicPath } from '@/lib/stainlessSeoCategories';

function getCronSecret() {
  const secret = process.env.PUSH_CRON_SECRET;
  return secret ? secret.trim() : null;
}

function isAuthorized(req) {
  const secret = getCronSecret();
  if (!secret) {
    return {
      ok: false,
      status: 503,
      response: NextResponse.json({ ok: false, error: 'cron_secret_not_configured' }, { status: 503 }),
    };
  }

  const incomingSecret = req.headers.get('x-cron-secret');
  if (!incomingSecret || incomingSecret !== secret) {
    return {
      ok: false,
      status: 401,
      response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }),
    };
  }

  return { ok: true };
}

function formatTimeLeft(endDate) {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  
  if (diff <= 0) return 'הסתיים';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days} ימים ו-${hours} שעות`;
  }
  return `${hours} שעות`;
}

async function getGroupBuyParticipants(db, productId) {
  const orders = db.collection('orders');
  
  // Find all orders for this group buy product
  const productOrders = await orders.find({
    'items.productId': productId,
    status: { $in: ['pending', 'paid', 'confirmed'] },
  }).toArray();

  // Extract unique user IDs
  const userIds = [...new Set(productOrders.map(order => String(order.createdBy)).filter(Boolean))];
  return userIds;
}

async function POSTHandler(req) {
  const auth = isAuthorized(req);
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(req.url);
  const dryRunParam = url.searchParams.get('dryRun') || url.searchParams.get('dry_run');
  const dryRun = dryRunParam === '1' || dryRunParam === 'true';

  try {
    const db = await getDb();
    const products = db.collection('products');

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const results = {
      weeklyReminders: [],
      lastCallReminders: [],
      closedNotifications: [],
    };

    // 1. Find group buys that are open and need weekly reminder
    // (active group buys that haven't been reminded in the last week)
    const activeGroupBuys = await products.find({
      $or: [
        { purchaseType: 'group' },
        { type: 'group' },
      ],
      active: true,
      groupEndDate: { $gt: now },
    }).toArray();

    for (const product of activeGroupBuys) {
      const productId = product._id;
      const productName = product.name || 'רכישה קבוצתית';
      const endDate = new Date(product.groupEndDate);
      const timeLeft = formatTimeLeft(endDate);
      const hoursUntilClose = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Get participants
      const participantIds = await getGroupBuyParticipants(db, productId);

      if (participantIds.length === 0) continue;

      // Check if this is a 24-hour reminder (between 23-25 hours until close)
      if (hoursUntilClose > 23 && hoursUntilClose <= 25) {
        // Last call reminder
        if (!dryRun) {
          try {
            await sendTemplateNotification({
              templateType: 'group_buy_last_call',
              variables: {
                group_name: productName,
              },
              audienceUserIds: participantIds,
              payloadOverrides: {
                url: getProductPublicPath(product),
                data: {
                  type: 'group_buy_last_call',
                  productId: String(productId),
                },
              },
            });
          } catch (err) {
            console.error('GROUP_BUY_LAST_CALL_ERROR', productId, err?.message);
          }
        }

        results.lastCallReminders.push({
          productId: String(productId),
          productName,
          participants: participantIds.length,
          hoursUntilClose: Math.round(hoursUntilClose),
          sent: !dryRun,
        });
      }
      // Weekly reminder for products with more than 7 days left
      else if (hoursUntilClose > 7 * 24) {
        // Check if we already sent a reminder this week
        const lastReminder = product.lastWeeklyReminderAt;
        const shouldSendReminder = !lastReminder || new Date(lastReminder) < oneWeekAgo;

        if (shouldSendReminder) {
          if (!dryRun) {
            try {
              await sendTemplateNotification({
                templateType: 'group_buy_weekly_reminder',
                variables: {
                  time_left: timeLeft,
                  group_name: productName,
                },
                audienceUserIds: participantIds,
                payloadOverrides: {
                  url: getProductPublicPath(product),
                  data: {
                    type: 'group_buy_weekly_reminder',
                    productId: String(productId),
                  },
                },
              });

              // Update last reminder timestamp
              await products.updateOne(
                { _id: productId },
                { $set: { lastWeeklyReminderAt: now } }
              );
            } catch (err) {
              console.error('GROUP_BUY_WEEKLY_REMINDER_ERROR', productId, err?.message);
            }
          }

          results.weeklyReminders.push({
            productId: String(productId),
            productName,
            participants: participantIds.length,
            timeLeft,
            sent: !dryRun,
          });
        }
      }
    }

    // 2. Find group buys that just closed (ended in the last hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const justClosedGroupBuys = await products.find({
      $or: [
        { purchaseType: 'group' },
        { type: 'group' },
      ],
      groupEndDate: { $gte: oneHourAgo, $lte: now },
      groupBuyClosedNotificationSent: { $ne: true },
    }).toArray();

    for (const product of justClosedGroupBuys) {
      const productId = product._id;
      const productName = product.name || 'רכישה קבוצתית';

      // Get participants
      const participantIds = await getGroupBuyParticipants(db, productId);

      if (participantIds.length > 0) {
        if (!dryRun) {
          try {
            await sendTemplateNotification({
              templateType: 'group_buy_closed',
              variables: {
                group_name: productName,
              },
              audienceUserIds: participantIds,
              payloadOverrides: {
                url: getProductPublicPath(product),
                data: {
                  type: 'group_buy_closed',
                  productId: String(productId),
                },
              },
            });

            // Mark as notified
            await products.updateOne(
              { _id: productId },
              { $set: { groupBuyClosedNotificationSent: true } }
            );
          } catch (err) {
            console.error('GROUP_BUY_CLOSED_ERROR', productId, err?.message);
          }
        }

        results.closedNotifications.push({
          productId: String(productId),
          productName,
          participants: participantIds.length,
          sent: !dryRun,
        });
      }
    }

    const totalProcessed = 
      results.weeklyReminders.length + 
      results.lastCallReminders.length + 
      results.closedNotifications.length;

    return NextResponse.json({
      ok: true,
      dryRun,
      processed: totalProcessed,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GROUP_BUY_CRON_ERROR', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'group_buy_notifications_failed',
        message: error?.message || 'Unexpected error',
      },
      { status: 500 },
    );
  }
}

async function GETHandler(req) {
  // Allow GET for providers that only support GET webhooks
  return POST(req);
}

export const POST = withErrorLogging(POSTHandler);
export const GET = withErrorLogging(GETHandler);
