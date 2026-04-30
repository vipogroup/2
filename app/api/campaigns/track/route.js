import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/campaigns/track
 * Body: { campaignId, event: 'impression'|'click'|'conversion', revenue? }
 *
 * - impression: increments impressions counter only (lightweight, fire-and-forget)
 * - click: increments clicks counter
 * - conversion: increments conversions + accumulates revenue + spend, enforces daily budget
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { campaignId, event, revenue = 0 } = body;

    if (!campaignId || !event) {
      return NextResponse.json({ ok: false, error: 'campaignId and event are required' }, { status: 400 });
    }
    if (!['impression', 'click', 'conversion'].includes(event)) {
      return NextResponse.json({ ok: false, error: 'invalid event type' }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection('paid_campaigns');

    const id = ObjectId.isValid(campaignId) ? new ObjectId(campaignId) : null;
    if (!id) return NextResponse.json({ ok: false, error: 'invalid campaignId' }, { status: 400 });

    const campaign = await col.findOne({ _id: id });
    if (!campaign) return NextResponse.json({ ok: false, error: 'campaign not found' }, { status: 404 });
    if (campaign.status !== 'active') return NextResponse.json({ ok: true, skipped: true });

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    // Reset daily spend tracker if day changed
    const lastReset = campaign.lastDailyReset?.toISOString?.()?.slice(0, 10) || '';
    const isNewDay = lastReset !== todayKey;

    const incFields = {};
    const setFields = { updatedAt: now };

    if (event === 'impression') {
      incFields.impressions = 1;
    } else if (event === 'click') {
      incFields.clicks = 1;
    } else if (event === 'conversion') {
      // Use dailyBudget as cost-per-conversion (simplified model)
      // In production you'd use a real CPC/CPA bid model
      const cpaSpend = campaign.cpaStopThreshold ? Math.min(campaign.dailyBudget / 10, campaign.cpaStopThreshold) : campaign.dailyBudget / 10;
      incFields.conversions = 1;
      incFields.revenue = Number(revenue) || 0;
      incFields.spend = cpaSpend;
      if (isNewDay) {
        setFields.dailySpend = cpaSpend;
        setFields.lastDailyReset = now;
      } else {
        incFields.dailySpend = cpaSpend;
      }
    }

    await col.updateOne(
      { _id: id },
      { $inc: incFields, $set: setFields },
    );

    // Auto-enforce: pause campaign if daily budget exceeded
    if (event === 'conversion') {
      const updatedCampaign = await col.findOne({ _id: id });
      const currentDailySpend = isNewDay ? (incFields.spend || 0) : ((campaign.dailySpend || 0) + (incFields.dailySpend || 0));
      const shouldPauseDailyBudget = updatedCampaign?.dailyBudget && currentDailySpend >= updatedCampaign.dailyBudget;
      const shouldPauseTotalBudget = updatedCampaign?.totalBudget && updatedCampaign.spend >= updatedCampaign.totalBudget;
      const shouldPauseCpa = updatedCampaign?.cpaStopThreshold && updatedCampaign.conversions > 0 &&
        (updatedCampaign.spend / updatedCampaign.conversions) >= updatedCampaign.cpaStopThreshold;

      if (shouldPauseDailyBudget || shouldPauseTotalBudget || shouldPauseCpa) {
        const stopReason = shouldPauseTotalBudget ? 'budget_exceeded' : 'paused';
        await col.updateOne({ _id: id }, { $set: { status: stopReason, updatedAt: now } });
      }
    }

    // Enforce global budget caps
    try {
      const settingsDoc = await db.collection('campaign_settings').findOne({ key: 'global' });
      if (settingsDoc) {
        const allCampaigns = await col.find({ status: 'active' }).toArray();
        const totalDailySpend = allCampaigns.reduce((s, c) => s + (c.dailySpend || 0), 0);
        if (settingsDoc.dailyCap && totalDailySpend >= settingsDoc.dailyCap) {
          await col.updateMany({ status: 'active' }, { $set: { status: 'paused', updatedAt: now } });
        }
      }
    } catch (_) { /* non-critical */ }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[campaigns/track] error:', err);
    return NextResponse.json({ ok: false, error: 'internal error' }, { status: 500 });
  }
}
