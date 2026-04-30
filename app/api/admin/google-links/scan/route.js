import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { isDbUnavailableError } from '@/lib/dbOutageClassifier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SETTINGS_COLLECTION = 'settings';
const SETTINGS_KEY = 'siteSettings';
const HEALTH_CHECK_TIMEOUT_MS = 10000;

function sanitizeRuntimeEnvValue(rawValue) {
  return String(rawValue ?? '')
    .replace(/\uFEFF/g, '')
    .trim()
    .replace(/^(?:\\r\\n|\\n|\\r|[\r\n])+/g, '')
    .replace(/(?:\\r\\n|\\n|\\r|[\r\n])+$/g, '');
}

function normalizeSiteUrl(rawValue) {
  const cleaned = sanitizeRuntimeEnvValue(rawValue).replace(/\/+$/, '');
  if (!cleaned) return 'https://www.vipo-group.com';
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned}`;
}

const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com');

const ENV_GA_ID =
  sanitizeRuntimeEnvValue(
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
    || process.env.NEXT_PUBLIC_GA_ID
    || process.env.GOOGLE_ANALYTICS_ID
    || '',
  );

const ENV_GTM_ID =
  sanitizeRuntimeEnvValue(
    process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID
    || process.env.NEXT_PUBLIC_GTM_ID
    || process.env.GOOGLE_TAG_MANAGER_ID
    || process.env.GTM_ID
    || '',
  );

const ENV_GSC_VERIFICATION =
  sanitizeRuntimeEnvValue(
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    || process.env.NEXT_PUBLIC_GOOGLE_SEARCH_CONSOLE_VERIFICATION
    || process.env.GOOGLE_SITE_VERIFICATION
    || process.env.GOOGLE_SEARCH_CONSOLE_VERIFICATION
    || '',
  );

const GOOGLE_LINKS = [
  { id: 'search_console', name: 'Search Console', url: 'https://search.google.com/search-console' },
  { id: 'google_analytics', name: 'Google Analytics', url: 'https://analytics.google.com' },
  { id: 'tag_manager', name: 'Tag Manager', url: 'https://tagmanager.google.com' },
  { id: 'google_ads', name: 'Google Ads', url: 'https://ads.google.com' },
  { id: 'business_profile', name: 'Business Profile', url: 'https://business.google.com' },
  { id: 'pagespeed', name: 'PageSpeed Insights', url: 'https://pagespeed.web.dev' },
];

function extractToken(req) {
  const tokenFromCookie = req.cookies?.get?.('auth_token')?.value || req.cookies?.get?.('token')?.value;
  if (tokenFromCookie) return tokenFromCookie;

  const authHeader = req.headers?.get?.('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  return null;
}

function isAdminRole(role) {
  return ['admin', 'super_admin', 'business_admin'].includes(role);
}

function statusFromBoolean(ok) {
  return ok ? 'ok' : 'warn';
}

function isValidGa4Id(value) {
  return /^G-[A-Z0-9]{6,}$/i.test(String(value || '').trim());
}

function isValidGtmId(value) {
  return /^GTM-[A-Z0-9]{4,}$/i.test(String(value || '').trim());
}

function hasSearchConsoleVerification(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  return text.includes('google-site-verification') || text.length >= 12;
}

function extractVerificationToken(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  const contentMatch = text.match(/content=["']([^"']+)["']/i);
  if (contentMatch?.[1]) return contentMatch[1].trim();

  return text.replace(/^google-site-verification=/i, '').replace(/<[^>]+>/g, '').trim();
}

function extractGa4IdsFromHtml(html) {
  const source = String(html || '');
  const matches = [
    ...source.matchAll(/\bG-[A-Z0-9]{6,}\b/gi),
    ...source.matchAll(/gtag\(\s*['"]config['"]\s*,\s*['"]([^'"]+)['"]\s*\)/gi),
  ];

  const ids = new Set();
  for (const match of matches) {
    const candidate = String(match?.[1] || match?.[0] || '').trim().toUpperCase();
    if (isValidGa4Id(candidate)) {
      ids.add(candidate);
    }
  }

  return [...ids];
}

function extractGtmIdsFromHtml(html) {
  const source = String(html || '');
  const matches = source.match(/\bGTM-[A-Z0-9]{4,}\b/gi) || [];

  const ids = new Set();
  for (const match of matches) {
    const candidate = String(match || '').trim().toUpperCase();
    if (isValidGtmId(candidate)) {
      ids.add(candidate);
    }
  }

  return [...ids];
}

async function checkUrl(url, includeBody = false) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'user-agent': 'VIPO-Health-Scanner/1.0',
      },
    });

    clearTimeout(timeout);
    const bodyText = includeBody ? await response.text().catch(() => '') : '';

    return {
      ok: response.ok,
      statusCode: response.status,
      finalUrl: response.url,
      bodyText,
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: 0,
      finalUrl: url,
      bodyText: '',
      error: error?.message || 'request_failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function compactCheckDetails(result, { includeSnippet = false } = {}) {
  const body = String(result?.bodyText || '');
  const compact = {
    ok: Boolean(result?.ok),
    statusCode: Number(result?.statusCode || 0),
    finalUrl: String(result?.finalUrl || ''),
    bodyText: '',
  };

  if (result?.error) {
    compact.error = String(result.error);
  }

  if (body) {
    compact.bodyTextLength = body.length;
    if (includeSnippet) {
      compact.bodyTextSnippet = body.slice(0, 280);
    }
  }

  return compact;
}

async function GETHandler(req) {
  const token = extractToken(req);
  const payload = verifyJWT(token);
  const role = payload?.role || payload?.userRole;

  if (!payload || !isAdminRole(role)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 403 });
  }

  let settings = {};
  let dataMode = 'live';
  let fallback = null;

  try {
    const db = await getDb();
    if (!db) {
      const unavailableError = new Error('database_unavailable');
      unavailableError.code = 'MONGO_CIRCUIT_OPEN';
      throw unavailableError;
    }

    const settingsDoc = await db.collection(SETTINGS_COLLECTION).findOne({ key: SETTINGS_KEY });
    const legacySettingsDoc = settingsDoc ? null : await db.collection(SETTINGS_COLLECTION).findOne({});
    settings = settingsDoc?.value || legacySettingsDoc?.value || legacySettingsDoc || {};
  } catch (error) {
    if (!isDbUnavailableError(error)) {
      throw error;
    }

    dataMode = 'fallback';
    fallback = {
      reason: 'db_unavailable',
      message: 'Database unavailable. Running Google checks with environment defaults.',
    };
  }

  const gaId = String(settings.googleAnalyticsId || ENV_GA_ID || '').trim().toUpperCase();
  const gtmId = String(settings.googleTagManagerId || ENV_GTM_ID || '').trim().toUpperCase();
  const gscVerification = String(settings.googleSearchConsoleVerification || ENV_GSC_VERIFICATION || '').trim();
  const gscToken = extractVerificationToken(gscVerification);

  const hasConfiguredGa = isValidGa4Id(gaId);
  const hasConfiguredGtm = isValidGtmId(gtmId);

  const configChecks = [
    {
      id: 'ga4_id',
      name: 'Google Analytics ID',
      status: statusFromBoolean(hasConfiguredGa),
      details: gaId || 'missing',
    },
    {
      id: 'gtm_id',
      name: 'Google Tag Manager ID',
      status: statusFromBoolean(!gtmId || hasConfiguredGtm),
      details: gtmId || 'missing',
    },
    {
      id: 'gsc_verification',
      name: 'Search Console Verification',
      status: statusFromBoolean(hasSearchConsoleVerification(gscVerification)),
      details: gscVerification ? 'configured' : 'missing',
    },
  ];

  const siteChecks = [];
  const robotsResult = await checkUrl(`${SITE_URL}/robots.txt`);
  siteChecks.push({
    id: 'robots_txt',
    name: 'robots.txt',
    status: statusFromBoolean(robotsResult.ok),
    details: compactCheckDetails(robotsResult),
  });

  const sitemapResult = await checkUrl(`${SITE_URL}/sitemap.xml`);
  siteChecks.push({
    id: 'sitemap_xml',
    name: 'sitemap.xml',
    status: statusFromBoolean(sitemapResult.ok),
    details: compactCheckDetails(sitemapResult),
  });

  const homeResult = await checkUrl(`${SITE_URL}/`, true);
  const homeHtml = String(homeResult.bodyText || '');
  const renderedGaIds = extractGa4IdsFromHtml(homeHtml);
  const renderedGtmIds = extractGtmIdsFromHtml(homeHtml);
  const hasRenderedGa = renderedGaIds.length > 0;
  const hasRenderedGtm = renderedGtmIds.length > 0;
  const effectiveGaId = hasConfiguredGa ? gaId : (renderedGaIds[0] || 'missing');
  const gscTagFoundInHome = homeHtml.includes('google-site-verification') || (gscToken && homeHtml.includes(gscToken));
  const gaSnippetFound = !hasConfiguredGa || renderedGaIds.includes(gaId);
  const gtmSnippetFound = !hasConfiguredGtm || renderedGtmIds.includes(gtmId);

  if (!hasConfiguredGa && hasRenderedGa) {
    configChecks[0] = {
      ...configChecks[0],
      status: 'ok',
      details: effectiveGaId,
    };
  }

  if (!gtmId && hasRenderedGtm) {
    configChecks[1] = {
      ...configChecks[1],
      status: 'ok',
      details: renderedGtmIds[0],
    };
  }

  siteChecks.push({
    id: 'site_home',
    name: 'Homepage',
    status: statusFromBoolean(homeResult.ok),
    details: compactCheckDetails(homeResult),
  });

  siteChecks.push({
    id: 'ga_snippet',
    name: 'GA Snippet On Homepage',
    status: statusFromBoolean(gaSnippetFound),
    details: gaSnippetFound
      ? effectiveGaId || 'ok'
      : hasConfiguredGa
        ? `${effectiveGaId}: לא נמצא G- ב-HTML שנשלף ללא JS. הגדר NEXT_PUBLIC_GOOGLE_ANALYTICS_ID זהה למזהה בהגדרות האתר והפעל build מחדש, או ודא ש-meta ga4-measurement-id נשלח ב-SSR.`
        : effectiveGaId || 'not_configured',
  });

  siteChecks.push({
    id: 'gtm_snippet',
    name: 'GTM Snippet On Homepage',
    status: statusFromBoolean(gtmSnippetFound),
    details: gtmId || 'not_configured',
  });

  siteChecks.push({
    id: 'gsc_tag_home',
    name: 'Search Console Meta On Homepage',
    status: statusFromBoolean(gscTagFoundInHome),
    details: gscToken || 'meta_based_detection',
  });

  const gscConfigured = hasSearchConsoleVerification(gscVerification) || gscTagFoundInHome;
  configChecks[2] = {
    ...configChecks[2],
    status: statusFromBoolean(gscConfigured),
    details: gscConfigured ? 'configured' : 'missing',
  };

  const linksChecks = [];
  for (const link of GOOGLE_LINKS) {
    const result = await checkUrl(link.url);
    linksChecks.push({
      id: link.id,
      name: link.name,
      status: statusFromBoolean(result.ok),
      details: compactCheckDetails(result),
    });
  }

  const allChecks = [...configChecks, ...siteChecks, ...linksChecks];
  const warnCount = allChecks.filter((item) => item.status !== 'ok').length;

  return NextResponse.json({
    ok: true,
    scannedAt: new Date().toISOString(),
    siteUrl: SITE_URL,
    dataMode,
    fallback,
    summary: {
      totalChecks: allChecks.length,
      healthyChecks: allChecks.length - warnCount,
      warnings: warnCount,
    },
    configChecks,
    siteChecks,
    linksChecks,
  });
}

export const GET = withErrorLogging(GETHandler);
