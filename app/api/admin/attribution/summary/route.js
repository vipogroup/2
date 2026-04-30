import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { isSuperAdminUser } from '@/lib/superAdmins';
import {
  effectiveAttributionForReporting,
  firstTouchAttributionForReporting,
  hasAnyAttributionStored,
} from '@/lib/attribution';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normalizeTenantObjectId(tenantId) {
  if (tenantId == null || tenantId === '') return null;
  const s = String(tenantId).trim();
  if (!s || !ObjectId.isValid(s)) return null;
  return new ObjectId(s);
}

async function GETHandler(req) {
  const adminUser = await requireAdminApi(req);
  const { searchParams } = new URL(req.url);
  const days = Math.min(90, Math.max(7, parseInt(searchParams.get('days') || '30', 10)));
  const tenantParam = searchParams.get('tenantId');

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const filter = { createdAt: { $gte: since } };

  if (isSuperAdminUser(adminUser)) {
    const tid = normalizeTenantObjectId(tenantParam);
    if (tid) filter.tenantId = tid;
  } else {
    const tid = normalizeTenantObjectId(adminUser?.tenantId);
    if (tid) {
      filter.tenantId = tid;
    } else {
      filter.$or = [{ tenantId: { $exists: false } }, { tenantId: null }];
    }
  }

  const db = await getDb();
  const ordersCol = db.collection('orders');
  await ordersCol.createIndex({ createdAt: -1 }).catch(() => {});
  await ordersCol.createIndex({ tenantId: 1, createdAt: -1 }).catch(() => {});

  const orders = await ordersCol
    .find(filter)
    .project({ attribution: 1, totalAmount: 1, createdAt: 1 })
    .toArray();

  const orderCount = orders.length;
  let withAttr = 0;
  let multiTouchJourneys = 0;
  const bySource = new Map();
  const byCampaign = new Map();

  for (const o of orders) {
    const a = o.attribution;
    if (!hasAnyAttributionStored(a)) continue;
    withAttr += 1;
    const eff = effectiveAttributionForReporting(a);
    const first = firstTouchAttributionForReporting(a);
    if (first && eff) {
      const srcDiff = String(first.utm_source || '') !== String(eff.utm_source || '');
      const campDiff = String(first.utm_campaign || '') !== String(eff.utm_campaign || '');
      if (srcDiff || campDiff) multiTouchJourneys += 1;
    }

    const label = (eff?.utm_source && String(eff.utm_source).trim()) || '(ללא utm_source)';
    const cur = bySource.get(label) || { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += Number(o.totalAmount) || 0;
    bySource.set(label, cur);

    const campKey = (eff?.utm_campaign && String(eff.utm_campaign).trim()) || '(ללא utm_campaign)';
    const ccur = byCampaign.get(campKey) || { count: 0, revenue: 0 };
    ccur.count += 1;
    ccur.revenue += Number(o.totalAmount) || 0;
    byCampaign.set(campKey, ccur);
  }

  const breakdown = [...bySource.entries()]
    .map(([source, v]) => ({
      source,
      count: v.count,
      revenue: Math.round(v.revenue * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);

  const byCampaignRows = [...byCampaign.entries()]
    .map(([campaign, v]) => ({
      campaign,
      count: v.count,
      revenue: Math.round(v.revenue * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);

  const coveragePercent = orderCount ? Math.round((withAttr / orderCount) * 1000) / 10 : 0;

  return NextResponse.json({
    days,
    orderCount,
    ordersWithAttribution: withAttr,
    coveragePercent,
    multiTouchJourneys,
    bySource: breakdown,
    byCampaign: byCampaignRows,
  });
}

export const GET = withErrorLogging(GETHandler);
