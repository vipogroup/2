import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import SocialPublishHistory from '@/models/SocialPublishHistory';
import {
  buildWeeklySummary,
  runSocialPublisherCycle,
  syncSocialAnalytics,
} from '@/lib/socialAgent/socialPublisher';
import {
  getSocialAgentConfig,
  validateSocialAgentConfig,
} from '@/lib/socialAgent/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isAuthorized(req) {
  const rawSecret = process.env.CRON_SECRET || process.env.CRON_API_TOKEN;
  const secret = String(rawSecret || '').trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'cron_secret_not_configured' },
      { status: 503 },
    );
  }

  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (bearer === secret) return null;

  const xHeader = req.headers.get('x-cron-secret') || '';
  if (xHeader && xHeader.trim() === secret) return null;

  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
}

function shouldRunWeekly(cfg, now) {
  return (
    now.getUTCDay() === cfg.weeklySummaryDayUtc &&
    now.getUTCHours() === cfg.weeklySummaryHourUtc
  );
}

async function handleCron(req) {
  const unauthorized = isAuthorized(req);
  if (unauthorized) return unauthorized;

  await connectMongo();
  const cfg = getSocialAgentConfig();
  const cfgCheck = validateSocialAgentConfig(cfg);
  if (!cfgCheck.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: 'missing_env',
        missing: cfgCheck.missing,
      },
      { status: 400 },
    );
  }

  const now = new Date();
  const publishResult = await runSocialPublisherCycle({ cfg, now });
  const analyticsResult = await syncSocialAnalytics({ cfg });

  let weeklySummary = null;
  if (shouldRunWeekly(cfg, now)) {
    weeklySummary = await buildWeeklySummary();
    await SocialPublishHistory.create({
      postKind: 'weekly_summary',
      platform: 'facebook_page',
      status: 'skipped',
      caption: JSON.stringify(weeklySummary),
      scheduledFor: now,
    });
  }

  return NextResponse.json({
    ok: true,
    publishResult,
    analyticsResult,
    weeklySummary,
    timestamp: new Date().toISOString(),
  });
}

export const GET = withErrorLogging(handleCron);
export const POST = withErrorLogging(handleCron);
