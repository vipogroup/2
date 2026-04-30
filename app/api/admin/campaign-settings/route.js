import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SETTINGS_KEY = 'global';

// ─── GET: load current global caps ───────────────────────────────────────────
export async function GET(req) {
  try {
    await requireAdminApi(req);
    const db = await getDb();
    const doc = await db.collection('campaign_settings').findOne({ key: SETTINGS_KEY });
    return NextResponse.json({
      dailyCap: doc?.dailyCap ?? null,
      monthlyCap: doc?.monthlyCap ?? null,
    });
  } catch (err) {
    console.error('[campaign-settings GET]', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

// ─── POST: save / update global caps ─────────────────────────────────────────
export async function POST(req) {
  try {
    await requireAdminApi(req);
    const body = await req.json();
    const dailyCap = body.dailyCap ? Number(body.dailyCap) : null;
    const monthlyCap = body.monthlyCap ? Number(body.monthlyCap) : null;

    const db = await getDb();
    await db.collection('campaign_settings').updateOne(
      { key: SETTINGS_KEY },
      {
        $set: {
          key: SETTINGS_KEY,
          dailyCap,
          monthlyCap,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    // If daily cap is now exceeded by current spend, pause all active campaigns immediately
    if (dailyCap) {
      const campaigns = await db.collection('paid_campaigns').find({ status: 'active' }).toArray();
      const totalDailySpend = campaigns.reduce((s, c) => s + (c.dailySpend || 0), 0);
      if (totalDailySpend >= dailyCap) {
        await db.collection('paid_campaigns').updateMany(
          { status: 'active' },
          { $set: { status: 'paused', updatedAt: new Date() } },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[campaign-settings POST]', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
