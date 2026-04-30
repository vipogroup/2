import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { isSuperAdminUser } from '@/lib/superAdmins';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COLLECTION = 'paid_campaigns';

function normalizeTenantObjectId(tenantId) {
  if (tenantId == null || tenantId === '') return null;
  const s = String(tenantId).trim();
  if (!s || !ObjectId.isValid(s)) return null;
  return new ObjectId(s);
}

/** גישה לקמפיין: סופר־אדמין — הכל; אחרת — רק קמפיינים של אותה חנות (או ללא חנות אם למשתמש אין tenant) */
function canAccessCampaign(admin, campaign) {
  if (isSuperAdminUser(admin)) return true;
  const uid = admin?.tenantId ? String(admin.tenantId) : '';
  const cid = campaign?.tenantId ? String(campaign.tenantId) : '';
  if (!uid) return !cid;
  return cid === uid;
}

// ─── GET: list campaigns + KPI summary ────────────────────────────────────────
async function GETHandler(req) {
  const adminUser = await requireAdminApi(req);
  const db = await getDb();
  const col = db.collection(COLLECTION);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // active | paused | ended | all
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
  const tenantParam = searchParams.get('tenantId');

  const filter = {};
  if (status && status !== 'all') filter.status = status;

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

  const campaigns = await col
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  // KPI summary
  const active = campaigns.filter((c) => c.status === 'active');
  const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);

  return NextResponse.json({
    campaigns,
    kpi: {
      activeCampaigns: active.length,
      totalCampaigns: campaigns.length,
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      roas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0,
      cpa: totalConversions > 0 ? Math.round((totalSpend / totalConversions) * 100) / 100 : 0,
      ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0,
      cvr: totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 10000) / 100 : 0,
    },
  });
}

// ─── POST: create campaign ────────────────────────────────────────────────────
async function POSTHandler(req) {
  const adminUser = await requireAdminApi(req);
  const db = await getDb();
  const col = db.collection(COLLECTION);

  const body = await req.json();

  const {
    name,
    productId,
    productName,
    productImage,
    goal = 'purchases',
    placement = ['homepage'],
    dailyBudget,
    totalBudget,
    cpaStopThreshold,
    startDate,
    endDate,
    tenantId: tenantIdBody,
  } = body;

  let resolvedTenantId = null;
  if (isSuperAdminUser(adminUser)) {
    resolvedTenantId = normalizeTenantObjectId(tenantIdBody);
  } else {
    resolvedTenantId = normalizeTenantObjectId(adminUser?.tenantId);
  }

  if (!name || !productId || !dailyBudget) {
    return NextResponse.json({ error: 'שם, מוצר ותקציב יומי הם שדות חובה' }, { status: 400 });
  }

  if (dailyBudget < 10) {
    return NextResponse.json({ error: 'תקציב יומי מינימלי הוא ₪10' }, { status: 400 });
  }

  const now = new Date();
  const campaign = {
    name: String(name).trim(),
    productId: ObjectId.isValid(productId) ? new ObjectId(productId) : productId,
    productName: productName || '',
    productImage: productImage || '',
    goal,
    placement: Array.isArray(placement) ? placement : [placement],
    dailyBudget: Number(dailyBudget),
    totalBudget: totalBudget ? Number(totalBudget) : null,
    cpaStopThreshold: cpaStopThreshold ? Number(cpaStopThreshold) : null,
    status: 'active',
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    revenue: 0,
    startDate: startDate ? new Date(startDate) : now,
    endDate: endDate ? new Date(endDate) : null,
    createdAt: now,
    updatedAt: now,
    createdBy: adminUser?.email || 'admin',
    ...(resolvedTenantId && { tenantId: resolvedTenantId }),
  };

  const result = await col.insertOne(campaign);

  return NextResponse.json({ success: true, campaignId: result.insertedId, campaign });
}

// ─── PATCH: update campaign status / budget ───────────────────────────────────
async function PATCHHandler(req) {
  const adminUser = await requireAdminApi(req);
  const db = await getDb();
  const col = db.collection(COLLECTION);

  const body = await req.json();
  const { campaignId, action, ...updates } = body;

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId הוא שדה חובה' }, { status: 400 });
  }

  const id = ObjectId.isValid(campaignId) ? new ObjectId(campaignId) : campaignId;
  const existing = await col.findOne({ _id: id });
  if (!existing) {
    return NextResponse.json({ error: 'קמפיין לא נמצא' }, { status: 404 });
  }
  if (!canAccessCampaign(adminUser, existing)) {
    return NextResponse.json({ error: 'אין הרשאה לקמפיין זה' }, { status: 403 });
  }

  const now = new Date();

  const setFields = { updatedAt: now };

  if (action === 'pause') setFields.status = 'paused';
  else if (action === 'resume') setFields.status = 'active';
  else if (action === 'stop') setFields.status = 'ended';
  else {
    // Generic field update (budget, name etc)
    const allowed = ['name', 'dailyBudget', 'totalBudget', 'cpaStopThreshold', 'endDate'];
    for (const key of allowed) {
      if (updates[key] !== undefined) setFields[key] = updates[key];
    }
  }

  const result = await col.findOneAndUpdate(
    { _id: id },
    { $set: setFields },
    { returnDocument: 'after' },
  );

  return NextResponse.json({ success: true, campaign: result.value || result });
}

// ─── DELETE: remove campaign ──────────────────────────────────────────────────
async function DELETEHandler(req) {
  const adminUser = await requireAdminApi(req);
  const db = await getDb();
  const col = db.collection(COLLECTION);

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaignId');

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId הוא שדה חובה' }, { status: 400 });
  }

  const id = ObjectId.isValid(campaignId) ? new ObjectId(campaignId) : campaignId;
  const existing = await col.findOne({ _id: id });
  if (!existing) {
    return NextResponse.json({ error: 'קמפיין לא נמצא' }, { status: 404 });
  }
  if (!canAccessCampaign(adminUser, existing)) {
    return NextResponse.json({ error: 'אין הרשאה לקמפיין זה' }, { status: 403 });
  }

  await col.deleteOne({ _id: id });

  return NextResponse.json({ success: true });
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
export const PATCH = withErrorLogging(PATCHHandler);
export const DELETE = withErrorLogging(DELETEHandler);
