import {
  findSubscriptionsByUserIds,
  findSubscriptionsByTags,
  findSubscriptionsByRoles,
  getAllSubscriptions,
  removePushSubscription,
} from '@/lib/pushSubscriptions';
import { sendPushNotification } from '@/lib/webPush';

function normalizePayload(input) {
  if (!input) return {};
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch (err) {
      return { title: 'VIPO', body: input };
    }
  }
  return { ...input };
}

async function deliverToSubscriptions(subscriptions, payload) {
  const normalized = normalizePayload(payload);
  console.log('PUSH_SENDER: deliverToSubscriptions called, payload:', JSON.stringify(normalized).slice(0, 200));
  const results = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        console.log('PUSH_SENDER: Sending to endpoint:', sub.endpoint?.slice(0, 50));
        await sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          normalized,
        );
        console.log('PUSH_SENDER: SUCCESS for endpoint:', sub.endpoint?.slice(0, 50));
        results.push({ endpoint: sub.endpoint, ok: true });
      } catch (error) {
        console.error('PUSH_SENDER: FAILED for endpoint:', sub.endpoint?.slice(0, 50), 'Error:', error?.message);
        const statusCode = error?.statusCode || error?.status || error?.code;
        if (statusCode === 403 || statusCode === 404 || statusCode === 410) {
          console.log('PUSH_SENDER: Removing invalid subscription');
          await removePushSubscription(sub.endpoint).catch(() => {});
        }
        results.push({ endpoint: sub.endpoint, ok: false, error: error?.message || 'push_failed' });
      }
    }),
  );

  return results;
}

export async function pushToUsers(userIds = [], payload) {
  if (!Array.isArray(userIds) || userIds.length === 0) return [];
  const subs = await findSubscriptionsByUserIds(userIds);
  if (!subs.length) return [];
  return deliverToSubscriptions(subs, payload);
}

export async function pushToTags(tags = [], payload, tenantId = null) {
  console.log('PUSH_SENDER: pushToTags called with tags:', tags, 'tenantId:', tenantId);
  if (!Array.isArray(tags) || tags.length === 0) {
    console.log('PUSH_SENDER: No tags provided');
    return [];
  }
  const subs = await findSubscriptionsByTags(tags, tenantId);
  console.log('PUSH_SENDER: Found subscriptions:', subs?.length || 0);
  if (!subs.length) {
    console.log('PUSH_SENDER: No subscriptions found for tags:', tags);
    return [];
  }
  console.log('PUSH_SENDER: Delivering to', subs.length, 'subscriptions');
  const results = await deliverToSubscriptions(subs, payload);
  console.log('PUSH_SENDER: Delivery results:', results);
  return results;
}

export async function pushToRoles(roles = [], payload, tenantId = null) {
  console.log('PUSH_SENDER: pushToRoles called with roles:', roles, 'tenantId:', tenantId);
  if (!Array.isArray(roles) || roles.length === 0) {
    console.log('PUSH_SENDER: No roles provided');
    return [];
  }
  // Multi-Tenant: Pass tenantId to filter subscriptions by tenant
  const subs = await findSubscriptionsByRoles(roles, tenantId);
  console.log('PUSH_SENDER: Found subscriptions for roles:', subs?.length || 0);
  if (!subs.length) {
    console.log('PUSH_SENDER: No subscriptions found for roles:', roles);
    return [];
  }
  return deliverToSubscriptions(subs, payload);
}

export async function pushBroadcast(payload) {
  const subs = await getAllSubscriptions();
  if (!subs.length) return [];
  return deliverToSubscriptions(subs, payload);
}
