import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import {
  resolveGscPropertyUrl,
  isGscServiceAccountConfigured,
  computeGscDateRange,
  fetchGscTopQueriesAndPages,
  classifyGscError,
} from '@/lib/gsc/searchAnalyticsServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_RANGES = new Set(['7d', '28d', '3m']);

async function GETHandler(request) {
  try {
    await requireAdminApi(request);
  } catch (authErr) {
    const status = authErr?.status === 403 ? 403 : 401;
    return NextResponse.json(
      {
        ok: false,
        code: status === 403 ? 'forbidden' : 'unauthorized',
        message: status === 403 ? 'אין הרשאה (נדרש מנהל)' : 'נדרשת התחברות',
      },
      { status },
    );
  }

  try {
    if (!isGscServiceAccountConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          code: 'not_configured',
          message:
            'חיבור Search Console API לא הוגדר. הגדרו את משתנה הסביבה GSC_SERVICE_ACCOUNT_JSON (JSON מלא של Service Account) ואת GSC_PROPERTY_URL.',
        },
        { status: 503 },
      );
    }

    const siteUrl = resolveGscPropertyUrl();
    if (!siteUrl) {
      return NextResponse.json(
        {
          ok: false,
          code: 'no_property',
          message:
            'לא נמצאה כתובת נכס. הגדרו GSC_PROPERTY_URL או NEXT_PUBLIC_SITE_URL כדי שיתאימו לנכס ב-Search Console.',
        },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';
    if (!ALLOWED_RANGES.has(range)) {
      return NextResponse.json({ ok: false, code: 'invalid_range', message: 'טווח לא נתמך' }, { status: 400 });
    }

    const { startDate, endDate } = computeGscDateRange(range);
    const { queries, pages } = await fetchGscTopQueriesAndPages(siteUrl, startDate, endDate, 50);

    return NextResponse.json({
      ok: true,
      source: 'google_search_console',
      propertyUrl: siteUrl,
      range,
      startDate,
      endDate,
      queries,
      pages,
    });
  } catch (error) {
    const classified = classifyGscError(error);
    console.error('GSC_ANALYTICS_ERROR:', error?.response?.data || error?.message || error);
    return NextResponse.json(
      {
        ok: false,
        code: classified.code,
        message: classified.message,
      },
      { status: classified.http },
    );
  }
}

export const GET = withErrorLogging(GETHandler);
