import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ObjectId } from 'mongodb';

import { getUserFromCookies } from '@/lib/auth/server';
import { getDb } from '@/lib/db';

import AgentMarketingLibrary from './components/AgentMarketingLibrary';

export const dynamic = 'force-dynamic';

const parsedQueryTimeout = Number(process.env.AGENT_MARKETING_QUERY_TIMEOUT_MS || 8000);
const AGENT_MARKETING_QUERY_TIMEOUT_MS = Number.isFinite(parsedQueryTimeout)
  ? Math.max(1000, parsedQueryTimeout)
  : 8000;

function withTimeout(promise, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      const timeoutError = new Error(label || 'timeout');
      timeoutError.code = 'AGENT_MARKETING_TIMEOUT';
      reject(timeoutError);
    }, timeoutMs);

    Promise.resolve(promise)
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
  });
}

function resolveBaseUrl() {
  try {
    const hdrs = headers();
    const proto =
      hdrs.get('x-forwarded-proto') || hdrs.get('x-forwarded-protocol') || hdrs.get('x-url-scheme') || 'http';
    const host = hdrs.get('x-forwarded-host') || hdrs.get('host');

    if (host && host !== '0.0.0.0' && host !== '::1') {
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  } catch (error) {
    console.error('[AgentMarketingPage] Failed to resolve request headers for base URL:', error);
  }

  const fallback =
    process.env.PUBLIC_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_HOME_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3001';

  return fallback.replace(/\/$/, '');
}

export default async function AgentMarketingPage() {
  const user = await getUserFromCookies();
  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'agent' && user.role !== 'admin') {
    redirect('/');
  }

  let db = null;
  try {
    db = await getDb();
  } catch (error) {
    console.error('[AgentMarketingPage] Failed to connect DB:', error);
  }

  let agent = null;
  let assets = [];

  if (db) {
    try {
      const userId = String(user?.id || '').trim();
      const objectId = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
      const email = String(user?.email || '').trim().toLowerCase();
      const filter = objectId ? { _id: objectId } : email ? { email } : null;

      if (filter) {
        agent = await withTimeout(
          db.collection('users').findOne(
            filter,
            {
              projection: {
                couponCode: 1,
                discountPercent: 1,
                commissionPercent: 1,
                referralId: 1,
              },
            },
          ),
          AGENT_MARKETING_QUERY_TIMEOUT_MS,
          'agent_profile_query_timeout',
        );
      }
    } catch (error) {
      console.error('[AgentMarketingPage] Failed to fetch agent profile:', error);
    }

    try {
      assets = await withTimeout(
        db
          .collection('marketing_assets')
          .find(
            { $or: [{ isActive: { $exists: false } }, { isActive: { $ne: false } }] },
            {
              projection: {
                _id: 1,
                title: 1,
                type: 1,
                mediaUrl: 1,
                thumbnailUrl: 1,
                messageTemplate: 1,
                target: 1,
                createdAt: 1,
              },
            },
          )
          .sort({ createdAt: -1 })
          .limit(200)
          .toArray(),
        AGENT_MARKETING_QUERY_TIMEOUT_MS,
        'agent_marketing_assets_query_timeout',
      );
    } catch (error) {
      console.error('[AgentMarketingPage] Failed to fetch marketing assets:', error);
      assets = [];
    }
  }

  const baseUrl = resolveBaseUrl();
  const fallbackReferral = String(user?.id || user?.email || 'agent').trim();
  const referralCode = agent?.couponCode || agent?.referralId || fallbackReferral;
  // Use short /r/ format for cleaner sharing links
  const referralLink = `${baseUrl}/r/${encodeURIComponent(referralCode)}`;

  const formattedAssets = assets.map((asset) => ({
    id: asset._id?.toString() ?? '',
    title: asset.title ?? 'ללא שם',
    type: asset.type ?? 'video',
    mediaUrl: asset.mediaUrl ?? '',
    thumbnailUrl: asset.thumbnailUrl ?? null,
    messageTemplate: asset.messageTemplate ?? '',
    target: asset.target ?? { type: 'products' },
    createdAt: asset.createdAt ? new Date(asset.createdAt).toISOString() : null,
  }));

  return (
    <AgentMarketingLibrary
      agentName={user.fullName || ''}
      referralLink={referralLink}
      couponCode={agent?.couponCode || ''}
      discountPercent={agent?.discountPercent ?? 0}
      commissionPercent={agent?.commissionPercent ?? 0}
      assets={formattedAssets}
      baseUrl={baseUrl}
    />
  );
}
