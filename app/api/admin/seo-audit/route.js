import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { ObjectId } from 'mongodb';
import { buildAuditContentCorpus, buildDuplicateSignature } from '@/lib/seoAuditContentCoverage';
import { getProductPublicPath, STAINLESS_SEO_CATEGORY_ARCHITECTURE } from '@/lib/stainlessSeoCategories';
import { isDbUnavailableError } from '@/lib/dbOutageClassifier';
import { withDefaultSettings } from '@/lib/settingsDefaults';

// SEO Audit API - Technical SEO, Content Coverage, Core Web Vitals
// Admin only - part of System Reports & Audits Center

const SEVERITY_WEIGHTS = {
  critical: 3,
  warning: 2,
  info: 1,
};

const SETTINGS_KEY = 'siteSettings';
const DEFAULT_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com').trim();
const DEFAULT_REPORT_TYPES = [
  'technical_seo',
  'content_coverage',
  'web_vitals',
  'live_indexability',
  'structured_data',
  'sitemap_consistency',
  'google_integrations',
];

const REPORT_TITLE_BY_TYPE = {
  technical_seo: 'Technical SEO Audit Report',
  content_coverage: 'SEO Content & Coverage Report',
  web_vitals: 'Core Web Vitals & Crawlability Report',
  live_indexability: 'Live Indexability & Rendering Audit',
  structured_data: 'Structured Data & Rich Results Audit',
  sitemap_consistency: 'Sitemap & Robots Consistency Audit',
  google_integrations: 'Google Integrations Audit',
};

const FALLBACK_EXECUTABLE_REPORTS = new Set([
  'live_indexability',
  'structured_data',
  'sitemap_consistency',
  'google_integrations',
]);

const ENV_GA_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
  || process.env.NEXT_PUBLIC_GA_ID
  || process.env.GOOGLE_ANALYTICS_ID
  || '';

const ENV_GTM_ID =
  process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID
  || process.env.NEXT_PUBLIC_GTM_ID
  || process.env.GOOGLE_TAG_MANAGER_ID
  || process.env.GTM_ID
  || '';

const ENV_GSC_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
  || process.env.NEXT_PUBLIC_GOOGLE_SEARCH_CONSOLE_VERIFICATION
  || process.env.GOOGLE_SITE_VERIFICATION
  || process.env.GOOGLE_SEARCH_CONSOLE_VERIFICATION
  || '';

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

function buildDbUnavailableErrorPayload() {
  return {
    ok: false,
    dataMode: 'fallback',
    error: 'שירות ה-SEO Audit אינו זמין זמנית עקב בעיית חיבור למסד הנתונים. נסו שוב בעוד כמה דקות.',
    code: 'DB_UNAVAILABLE',
  };
}

function buildFallbackHistoryPayload() {
  return {
    ok: true,
    dataMode: 'fallback',
    reports: [],
    count: 0,
    fallback: {
      reason: 'db_unavailable',
      message: 'History is temporarily unavailable because database connectivity is down.',
    },
  };
}

function resolveSiteUrl(request) {
  const configured = normalizeSiteUrl(DEFAULT_SITE_URL);
  if (configured) return configured.replace(/\/$/, '');

  const forwardedHost = sanitizeRuntimeEnvValue(request.headers.get('x-forwarded-host') || '');
  const host = forwardedHost || sanitizeRuntimeEnvValue(request.headers.get('host') || '');
  const proto = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');

  if (!host) return 'http://localhost:3000';
  return `${sanitizeRuntimeEnvValue(proto)}://${host}`;
}

async function getSiteSettings(db) {
  if (!db) return {};

  const keyedSettings = await db.collection('settings').findOne({ key: SETTINGS_KEY });
  if (keyedSettings?.value) return withDefaultSettings(keyedSettings.value);

  const fallback = await db.collection('settings').findOne({});
  return withDefaultSettings(fallback?.value || fallback || {});
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
  const contentMatch = text.match(/content=["']([^"']+)["']/i);
  if (contentMatch?.[1]) return contentMatch[1].trim();
  return text.replace(/<[^>]+>/g, '').trim();
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

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/$/, '');
}

function deriveHttpStatus(error, fallback = 500) {
  const numericStatus = Number(error?.status || error?.statusCode || 0);
  if (Number.isFinite(numericStatus) && numericStatus >= 100 && numericStatus < 600) {
    return numericStatus;
  }

  const message = String(error?.message || '').toLowerCase();
  if (message.includes('unauthorized')) return 401;
  if (message.includes('forbidden')) return 403;

  return fallback;
}

async function fetchText(url) {
  const maxAttempts = 2;
  let lastResult = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'user-agent': 'VIPO-SEO-Audit/1.0',
        },
      });

      clearTimeout(timeout);
      const text = await response.text().catch(() => '');
      const result = {
        ok: response.ok,
        status: response.status,
        finalUrl: response.url,
        text,
      };

      // Retry once for transient 5xx responses to reduce false positives.
      if (attempt < maxAttempts && response.status >= 500) {
        lastResult = result;
        continue;
      }

      return result;
    } catch (error) {
      lastResult = {
        ok: false,
        status: 0,
        finalUrl: url,
        text: '',
        error: error?.message || 'request_failed',
      };

      // Retry once on transient request failures.
      if (attempt < maxAttempts) {
        continue;
      }
    }
  }

  return lastResult || {
    ok: false,
    status: 0,
    finalUrl: url,
    text: '',
    error: 'request_failed',
  };
}

function extractTitle(html) {
  const source = String(html || '');
  const headMatch = source.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const head = (headMatch?.[1] || source).replace(/<script[\s\S]*?<\/script>/gi, '');
  const match = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, ' ').trim() || '';
}

function extractMetaContent(html, attribute, value) {
  const sourceRaw = String(html || '');
  const headMatch = sourceRaw.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const source = (headMatch?.[1] || sourceRaw).replace(/<script[\s\S]*?<\/script>/gi, '');
  const pattern = new RegExp(`<meta[^>]*${attribute}=["']${value}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
  const direct = source.match(pattern);
  if (direct?.[1]) return direct[1].trim();

  const reversePattern = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attribute}=["']${value}["'][^>]*>`, 'i');
  const reverse = source.match(reversePattern);
  return reverse?.[1]?.trim() || '';
}

function extractCanonical(html) {
  const sourceRaw = String(html || '');
  const headMatch = sourceRaw.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const source = (headMatch?.[1] || sourceRaw).replace(/<script[\s\S]*?<\/script>/gi, '');
  const match = source.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
    || source.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  return match?.[1]?.trim() || '';
}

function extractFirstH1(html) {
  const match = String(html || '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match?.[1]?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || '';
}

function extractJsonLdBlocks(html) {
  return [...String(html || '').matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
}

function flattenJsonLd(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.flatMap(flattenJsonLd);
  if (typeof input === 'object' && Array.isArray(input['@graph'])) {
    return [input, ...input['@graph'].flatMap(flattenJsonLd)];
  }
  return [input];
}

function getIndexableProductsQuery() {
  return {
    active: { $ne: false },
    $or: [
      { status: 'published' },
      { status: { $exists: false } },
      { status: null },
      { status: '' },
    ],
  };
}

function getSchemaTypes(items) {
  return [...new Set(items.flatMap((item) => {
    const type = item?.['@type'];
    if (Array.isArray(type)) return type;
    if (type) return [type];
    return [];
  }))];
}

function parseJsonLdBlocks(blocks) {
  const items = [];
  let parseErrors = 0;

  blocks.forEach((block) => {
    const content = String(block || '').trim();
    if (!content) return;

    try {
      const parsed = JSON.parse(content);
      items.push(...flattenJsonLd(parsed));
    } catch (error) {
      parseErrors += 1;
    }
  });

  return { items, parseErrors };
}

function normalizeAuditDescription(value, fallback = '') {
  const text = String(value || fallback || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[|]+/g, ' ')
    .trim();

  if (!text) return '';
  if (text.length <= 160) return text;
  return `${text.substring(0, 157).trim()}...`;
}

function clampAuditTitle(value) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  if (cleaned.length <= 68) return cleaned;
  return `${cleaned.slice(0, 65).trim()}...`;
}

function getAuditDimensionsToken(product) {
  const stainless = product?.stainless || {};
  const length = Number(stainless?.length);
  const width = Number(stainless?.width);
  const height = Number(stainless?.height);

  if (Number.isFinite(length) && Number.isFinite(width) && Number.isFinite(height)
    && length > 0 && width > 0 && height > 0) {
    return `${length}x${width}x${height}`;
  }

  return '';
}

function buildProductAuditSeoTitle(product, siteName = 'VIPO') {
  const manualTitle = typeof product?.seo?.metaTitle === 'string' ? product.seo.metaTitle.trim() : '';
  if (manualTitle && manualTitle.length >= 45 && manualTitle.length <= 68) {
    return manualTitle;
  }

  const category = typeof product?.category === 'string' ? product.category.trim() : '';
  const dimensionsToken = getAuditDimensionsToken(product);
  const intentToken = product?.purchaseType === 'group' ? 'רכישה קבוצתית' : 'רכישה מיידית';

  const parts = [
    product?.name,
    category,
    dimensionsToken,
    intentToken,
    siteName,
  ]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim());

  const title = clampAuditTitle([...new Set(parts)].join(' | '));
  if (title.length >= 45) {
    return title;
  }

  const compact = [product?.name, category, siteName]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim())
    .join(' | ');

  const fallbackBase = clampAuditTitle(compact || `${product?.name || 'מוצר'} | ${siteName}`);
  if (fallbackBase.length >= 45) {
    return fallbackBase;
  }

  const enriched = clampAuditTitle(`${fallbackBase} | מחיר, מפרט ומשלוח לכל הארץ`);
  if (enriched.length >= 45) {
    return enriched;
  }

  return clampAuditTitle(`${product?.name || 'מוצר נירוסטה איכותי'} | פתרון למטבח מוסדי ותעשייתי | ${siteName}`);
}

function buildProductAuditMetaDescription(product, siteName = 'VIPO') {
  const intro = [product?.name, product?.category].filter(Boolean).join(' - ');
  const featureHighlights = Array.isArray(product?.features)
    ? product.features
      .filter((value) => typeof value === 'string' && value.trim())
      .slice(0, 3)
      .join('. ')
    : '';

  const candidates = [
    product?.seo?.metaDescription,
    intro,
    product?.description,
    product?.fullDescription,
    featureHighlights,
    product?.suitableFor,
    product?.whyChooseUs,
    product?.warranty,
  ]
    .map((value) => normalizeAuditDescription(value))
    .filter(Boolean);

  const deduped = [...new Set(candidates)];
  const base = deduped.join('. ') || product?.name || '';
  const priceText = Number.isFinite(product?.price) ? ` מחיר: ₪${product.price.toLocaleString('he-IL')}.` : '';
  const stockText = product?.purchaseType === 'group' ? ' זמין לרכישה קבוצתית.' : ' זמין לרכישה מיידית.';
  const description = normalizeAuditDescription(`${base}${priceText}${stockText}`, product?.name || siteName);
  if (description.length >= 120) {
    return description;
  }

  const category = typeof product?.category === 'string' ? product.category.trim() : '';
  const enriched = [
    description,
    category ? `פתרון מקצועי בתחום ${category} למטבחים מוסדיים ותעשייתיים.` : 'פתרון מקצועי למטבחים מוסדיים ותעשייתיים.',
    `מפרט מלא, משלוח לכל הארץ ושירות מקצועי מ-${siteName}.`,
  ].filter(Boolean).join(' ');
  const normalized = normalizeAuditDescription(enriched, product?.name || siteName);
  if (normalized.length >= 120) {
    return normalized;
  }

  const hardFallback = [
    `${product?.name || 'מוצר נירוסטה מקצועי'} מבית ${siteName}.`,
    category ? `מתאים לעסקי ${category} ולמטבחים מוסדיים ותעשייתיים.` : 'מתאים למטבחים מוסדיים, מסעדות ומטבחים תעשייתיים.',
    'כולל מפרט מלא, שירות מקצועי ואפשרויות אספקה מהירות לכל הארץ.',
  ].join(' ');

  return normalizeAuditDescription(hardFallback, product?.name || siteName);
}

async function getAuditTargets(db) {
  const staticTargets = [
    { path: '/', label: 'Homepage', pageType: 'home', expectedSchemas: ['Organization', 'WebSite'] },
    { path: '/about', label: 'About', pageType: 'content', expectedSchemas: [] },
    { path: '/contact', label: 'Contact', pageType: 'content', expectedSchemas: [] },
    { path: '/privacy', label: 'Privacy', pageType: 'legal', expectedSchemas: [] },
    { path: '/terms', label: 'Terms', pageType: 'legal', expectedSchemas: [] },
    { path: '/for-business', label: 'For Business', pageType: 'content', expectedSchemas: [] },
    { path: '/for-agents', label: 'For Agents', pageType: 'content', expectedSchemas: [] },
    { path: '/join', label: 'Join', pageType: 'content', expectedSchemas: [] },
  ];

  const marketplaceListingTargets = [
    { path: '/products', label: 'מרקטפלייס (רשימת מוצרים)', pageType: 'marketplace', expectedSchemas: [] },
  ];

  const stainlessCategoryTargets = Object.values(STAINLESS_SEO_CATEGORY_ARCHITECTURE).map((config) => ({
    path: config.canonicalPath,
    label: config.title || config.h1 || config.canonicalPath,
    pageType: 'category',
    expectedSchemas: [],
  }));

  if (!db) {
    return [...staticTargets, ...marketplaceListingTargets, ...stainlessCategoryTargets];
  }

  const products = await db.collection('products').find(getIndexableProductsQuery()).limit(12).toArray();
  let tenants = [];

  try {
    tenants = await db.collection('tenants').find({ status: { $in: ['active', 'approved'] } }).limit(6).toArray();
  } catch (error) {
    tenants = [];
  }

  const productTargets = products.map((product) => ({
    path: getProductPublicPath(product),
    label: product.name || 'Product',
    pageType: 'product',
    expectedSchemas: ['Product', 'BreadcrumbList'],
  }));

  const tenantTargets = tenants
    .filter((tenant) => tenant?.slug)
    .map((tenant) => ({
      path: `/t/${tenant.slug}`,
      label: tenant.businessName || tenant.slug,
      pageType: 'tenant',
      expectedSchemas: ['BreadcrumbList'],
    }));

  return [...staticTargets, ...marketplaceListingTargets, ...stainlessCategoryTargets, ...productTargets, ...tenantTargets];
}

// Helper: Calculate SEO score from issues
function calculateSeoScore(issues) {
  if (!issues || issues.length === 0) return 100;

  // Normalize repeated issues by signature so large catalogs are not over-penalized.
  const grouped = new Map();
  for (const issue of issues) {
    const severity = String(issue?.severity || 'warning').toLowerCase();
    const key = [
      severity,
      String(issue?.field || '').trim().toLowerCase(),
      String(issue?.issue_type || '').trim().toLowerCase(),
      String(issue?.issue || '').trim().toLowerCase(),
    ].join('|');

    const entry = grouped.get(key) || { severity, count: 0 };
    entry.count += 1;
    grouped.set(key, entry);
  }

  const basePenalty = { critical: 6, warning: 3, info: 1.5 };
  const spreadPenalty = { critical: 4, warning: 2, info: 1 };
  const spreadPivot = { critical: 8, warning: 15, info: 25 };

  let totalPenalty = 0;
  for (const { severity, count } of grouped.values()) {
    const normalizedSeverity = basePenalty[severity] ? severity : 'warning';
    const spreadFactor = Math.min(1, Math.max(1, count) / spreadPivot[normalizedSeverity]);
    totalPenalty += (basePenalty[normalizedSeverity] + (spreadPenalty[normalizedSeverity] * spreadFactor)) * 0.9;
  }

  return Math.max(0, Math.round(100 - Math.min(100, totalPenalty)));
}

function calculateTruthScore(results, blockingIssuesCount) {
  const googleReport = results?.google_integrations;
  const googleChecks = Number(googleReport?.summary?.total_checks || 0);
  const googleHealthy = Number(googleReport?.summary?.healthy_checks || 0);
  const googleLiveScore = googleChecks > 0
    ? Math.round((googleHealthy / googleChecks) * 100)
    : null;

  const siteScores = Object.entries(results || {})
    .filter(([type, report]) => {
      if (type === 'google_integrations') return false;
      return !(report?.summary?.mode === 'fallback' && report?.summary?.db_unavailable === true);
    })
    .map(([, report]) => Number(report?.score || 0));

  const siteHealthScore = siteScores.length > 0
    ? Math.round(siteScores.reduce((sum, value) => sum + value, 0) / siteScores.length)
    : null;

  const blockerImpactScore = Math.max(0, 100 - Math.min(100, Number(blockingIssuesCount || 0) * 2));

  const weighted = [];
  if (googleLiveScore !== null) weighted.push({ score: googleLiveScore, weight: 40 });
  if (siteHealthScore !== null) weighted.push({ score: siteHealthScore, weight: 40 });
  weighted.push({ score: blockerImpactScore, weight: 20 });

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  const truthScore = totalWeight > 0
    ? Math.round(weighted.reduce((sum, item) => sum + (item.score * item.weight), 0) / totalWeight)
    : 0;

  return {
    truthScore,
    googleLiveScore,
    siteHealthScore,
    blockerImpactScore,
  };
}

function buildSkippedAuditReport(reportType) {
  return {
    reportType,
    title: REPORT_TITLE_BY_TYPE[reportType] || reportType,
    timestamp: new Date(),
    score: 0,
    status: 'WARN',
    summary: {
      mode: 'fallback',
      db_unavailable: true,
      total_issues: 1,
      critical_issues: 0,
      warning_issues: 1,
    },
    issues: [
      {
        page_url: '/',
        issue: 'Skipped in fallback mode because database is unavailable',
        severity: 'warning',
        field: 'database',
        current_value: 'unavailable',
        recommended_fix: 'Restore MongoDB connectivity and rerun the full SEO audit',
      },
    ],
    pages: [],
    recommendations: ['Restore MongoDB connectivity and rerun this report'],
  };
}

function buildAuditResponsePayload(results, mode = 'live') {
  const reportList = Object.values(results || {});
  const scores = reportList.map((report) => Number(report?.score || 0));
  const legacyOverallScore = scores.length > 0
    ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
    : 0;

  const blockingIssues = [];
  reportList.forEach((report) => {
    (report?.issues || [])
      .filter((issue) => issue?.severity === 'critical')
      .forEach((issue) => {
        blockingIssues.push({
          report: report.title,
          ...issue,
        });
      });
  });

  const scoreModel = calculateTruthScore(results, blockingIssues.length);
  const overallScore = scoreModel.truthScore;
  const overallStatus = overallScore >= 80 ? 'PASS' : overallScore >= 50 ? 'WARN' : 'FAIL';

  return {
    ok: true,
    dataMode: mode,
    overallScore,
    overallStatus,
    legacyOverallScore,
    truthScore: scoreModel.truthScore,
    googleLiveScore: scoreModel.googleLiveScore,
    siteHealthScore: scoreModel.siteHealthScore,
    blockerImpactScore: scoreModel.blockerImpactScore,
    scoringModel: 'truth_v2',
    blockingIssues,
    blockingIssuesCount: blockingIssues.length,
    reports: results,
    message: mode === 'fallback'
      ? `SEO audit completed in fallback mode. Truth score: ${overallScore}%`
      : `SEO audit completed. Truth score: ${overallScore}%`,
  };
}

async function runFallbackSeoAudit(typesToRun, siteUrl) {
  const results = {};

  for (const reportType of typesToRun) {
    if (!FALLBACK_EXECUTABLE_REPORTS.has(reportType)) {
      results[reportType] = buildSkippedAuditReport(reportType);
      continue;
    }

    if (reportType === 'live_indexability') {
      results.live_indexability = await runLiveIndexabilityAudit(null, siteUrl);
      continue;
    }

    if (reportType === 'structured_data') {
      results.structured_data = await runStructuredDataAudit(null, siteUrl);
      continue;
    }

    if (reportType === 'sitemap_consistency') {
      results.sitemap_consistency = await runSitemapConsistencyAudit(null, siteUrl);
      continue;
    }

    if (reportType === 'google_integrations') {
      results.google_integrations = await runGoogleIntegrationsAudit(null, siteUrl);
    }
  }

  return results;
}

// ============================================
// REPORT 1: Technical SEO Audit
// ============================================
async function runTechnicalSeoAudit(db, siteUrl) {
  const issues = [];
  const pages = [];
  
  // Get all products (as pages)
  const products = await db.collection('products').find(getIndexableProductsQuery()).toArray();
  
  // Get site settings for meta defaults
  const settings = await getSiteSettings(db);
  const siteName = String(
    settings?.companyName
    || settings?.businessName
    || process.env.NEXT_PUBLIC_COMPANY_NAME
    || 'VIPO'
  ).trim();
  
  for (const product of products) {
    const pageUrl = getProductPublicPath(product);
    const pageIssues = [];
    const mediaImages = Array.isArray(product.media?.images) ? product.media.images : [];
    const validImages = mediaImages.filter((img) => img?.url);
    const mediaVideoUrl = typeof product.media?.videoUrl === 'string' ? product.media.videoUrl : '';
    const effectiveTitle = buildProductAuditSeoTitle(product, siteName);
    const effectiveMetaDescription = buildProductAuditMetaDescription(product, siteName);
    
    // Check Title Tag
    if (!effectiveTitle || effectiveTitle.length < 10) {
      pageIssues.push({
        page_url: pageUrl,
        error_type: 'missing',
        issue: 'Title tag too short or missing',
        severity: 'critical',
        field: 'title',
        current_value: effectiveTitle || '',
        recommended_fix: 'Add descriptive title with 50-60 characters including primary keyword',
      });
    } else if (effectiveTitle.length > 60) {
      pageIssues.push({
        page_url: pageUrl,
        error_type: 'invalid',
        issue: 'Title tag too long (>60 chars)',
        severity: 'warning',
        field: 'title',
        current_value: effectiveTitle,
        recommended_fix: 'Shorten title to 50-60 characters while keeping primary keyword',
      });
    }
    
    // Check Meta Description
    if (!effectiveMetaDescription || effectiveMetaDescription.length < 50) {
      pageIssues.push({
        page_url: pageUrl,
        error_type: 'missing',
        issue: 'Meta description missing or too short',
        severity: 'critical',
        field: 'meta_description',
        current_value: effectiveMetaDescription?.substring(0, 100) || '',
        recommended_fix: 'Add compelling meta description with 150-160 characters including call-to-action',
      });
    } else if (effectiveMetaDescription.length > 160) {
      pageIssues.push({
        page_url: pageUrl,
        error_type: 'invalid',
        issue: 'Meta description too long (>160 chars)',
        severity: 'warning',
        field: 'meta_description',
        current_value: effectiveMetaDescription.substring(0, 200) + '...',
        recommended_fix: 'Shorten description to 150-160 characters',
      });
    }
    
    // Check Images Alt Tags
    if (validImages.length > 0) {
      const imagesWithoutAlt = validImages.filter((img) => !img?.alt);
      if (imagesWithoutAlt.length > 0) {
        pageIssues.push({
          page_url: pageUrl,
          error_type: 'missing',
          issue: `${imagesWithoutAlt.length} images missing alt text`,
          severity: 'warning',
          field: 'image_alt',
          current_value: `${imagesWithoutAlt.length} images`,
          recommended_fix: 'Add descriptive alt text to all images for accessibility and SEO',
        });
      }
    }
    
    // Check URL Structure
    if (product.slug) {
      if (product.slug.length > 75) {
        pageIssues.push({
          page_url: pageUrl,
          error_type: 'invalid',
          issue: 'URL slug too long',
          severity: 'warning',
          field: 'url_structure',
          current_value: product.slug,
          recommended_fix: 'Shorten URL slug to 3-5 words, use hyphens, remove stop words',
        });
      }
      if (/[A-Z]/.test(product.slug)) {
        pageIssues.push({
          page_url: pageUrl,
          error_type: 'invalid',
          issue: 'URL contains uppercase letters',
          severity: 'warning',
          field: 'url_structure',
          current_value: product.slug,
          recommended_fix: 'Use lowercase letters only in URLs',
        });
      }
    }
    
    // Check for Canonical: missing only when neither explicit canonical nor resolvable public URL exists.
    if (!product.canonicalUrl && !pageUrl) {
      pageIssues.push({
        page_url: pageUrl,
        error_type: 'missing',
        issue: 'No canonical URL defined',
        severity: 'warning',
        field: 'canonical',
        current_value: '',
        recommended_fix: 'Set canonical URL to prevent duplicate content issues',
      });
    }
    
    // Check Price (structured data)
    if (!product.price || product.price <= 0) {
      pageIssues.push({
        page_url: pageUrl,
        error_type: 'missing',
        issue: 'Product price missing (affects rich snippets)',
        severity: 'warning',
        field: 'structured_data',
        current_value: product.price || 'N/A',
        recommended_fix: 'Add valid price for Product structured data markup',
      });
    }
    
    issues.push(...pageIssues);
    pages.push({
      url: pageUrl,
      title: effectiveTitle || product.name,
      issues_count: pageIssues.length,
      critical_count: pageIssues.filter(i => i.severity === 'critical').length,
      warning_count: pageIssues.filter(i => i.severity === 'warning').length,
    });
  }
  
  // Check site-wide issues
  
  // Robots.txt check
  const robotsIssues = [];
  const robotsResult = await fetchText(`${siteUrl}/robots.txt`);
  if (!robotsResult.ok) {
    robotsIssues.push({
      page_url: '/robots.txt',
      error_type: 'missing',
      issue: 'robots.txt not reachable',
      severity: 'critical',
      field: 'robots_txt',
      current_value: String(robotsResult.status || 'Not found'),
      recommended_fix: 'Ensure robots.txt is publicly reachable and returns HTTP 200',
    });
  }
  
  const sitemapResult = await fetchText(`${siteUrl}/sitemap.xml`);
  if (!sitemapResult.ok) {
    robotsIssues.push({
      page_url: '/sitemap.xml',
      error_type: 'missing',
      issue: 'XML Sitemap not reachable',
      severity: 'critical',
      field: 'sitemap',
      current_value: String(sitemapResult.status || 'Not found'),
      recommended_fix: 'Ensure sitemap.xml is publicly reachable and returns HTTP 200',
    });
  }
  
  issues.push(...robotsIssues);
  
  // Calculate statistics
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const score = calculateSeoScore(issues);
  
  return {
    reportType: 'technical_seo',
    title: 'Technical SEO Audit Report',
    timestamp: new Date(),
    score,
    status: score >= 80 ? 'PASS' : score >= 50 ? 'WARN' : 'FAIL',
    summary: {
      total_pages_scanned: products.length,
      total_issues: issues.length,
      critical_issues: criticalCount,
      warning_issues: warningCount,
      pages_with_issues: pages.filter(p => p.issues_count > 0).length,
    },
    issues,
    pages,
    recommendations: [
      criticalCount > 0 ? 'Fix all critical issues immediately - they block organic ranking' : null,
      warningCount > 5 ? 'Address warning issues to improve search visibility' : null,
      !robotsResult.ok ? 'Restore public robots.txt availability' : null,
      !sitemapResult.ok ? 'Restore public sitemap.xml availability' : null,
    ].filter(Boolean),
  };
}

// ============================================
// REPORT 2: SEO Content & Coverage
// ============================================
async function runContentCoverageAudit(db) {
  const issues = [];
  const pages = [];
  
  const products = await db.collection('products').find(getIndexableProductsQuery()).toArray();
  const categories = await db.collection('categories').find({}).toArray();
  
  // Build internal links map
  const internalLinks = {};
  products.forEach(p => {
    const pageUrl = getProductPublicPath(p);
    internalLinks[pageUrl] = {
      inbound: 0,
      outbound: 0,
    };
  });
  
  // Count internal links (simplified - checking category references)
  products.forEach(p => {
    if (p.category) {
      const categoryProducts = products.filter(prod => prod.category === p.category && prod._id !== p._id);
      const pageUrl = getProductPublicPath(p);
      if (!internalLinks[pageUrl]) {
        internalLinks[pageUrl] = { inbound: 0, outbound: 0 };
      }
      internalLinks[pageUrl].outbound = categoryProducts.length;
      categoryProducts.forEach(cp => {
        const cpUrl = getProductPublicPath(cp);
        if (internalLinks[cpUrl]) {
          internalLinks[cpUrl].inbound++;
        }
      });
    }
  });
  
  const duplicateBuckets = new Map();
  products.forEach((product) => {
    const signature = buildDuplicateSignature(product);
    if (!signature) return;
    const bucket = duplicateBuckets.get(signature) || [];
    bucket.push(product);
    duplicateBuckets.set(signature, bucket);
  });

  for (const product of products) {
    const pageUrl = getProductPublicPath(product);
    const pageIssues = [];
    const contentCorpus = buildAuditContentCorpus(product);
    const wordCount = contentCorpus.split(/\s+/).filter((w) => w.length > 0).length;
    const links = internalLinks[pageUrl] || { inbound: 0, outbound: 0 };
    
    // Thin Content Check
    if (wordCount < 100) {
      pageIssues.push({
        page_url: pageUrl,
        issue_type: 'thin',
        issue: 'Thin content - insufficient word count',
        word_count: wordCount,
        internal_links_count: links.inbound,
        severity: 'warning',
        recommended_action: 'Expand content to at least 300 words with relevant information, features, benefits',
      });
    } else if (wordCount < 300) {
      pageIssues.push({
        page_url: pageUrl,
        issue_type: 'thin',
        issue: 'Content below recommended length',
        word_count: wordCount,
        internal_links_count: links.inbound,
        severity: 'warning',
        recommended_action: 'Consider expanding content to 500+ words for better ranking potential',
      });
    }
    
    // Orphan Page Check (no internal links pointing to it)
    if (links.inbound === 0) {
      pageIssues.push({
        page_url: pageUrl,
        issue_type: 'orphan',
        issue: 'Orphan page - no internal links pointing to this page',
        word_count: wordCount,
        internal_links_count: 0,
        severity: 'warning',
        recommended_action: 'Add internal links from related pages, category pages, or blog posts',
      });
    }
    
    // No Keywords Check (simplified - checking if description lacks product name)
    if (product.description && product.name) {
      const nameWords = product.name.toLowerCase().split(/\s+/);
      const descLower = product.description.toLowerCase();
      const keywordPresent = nameWords.some(word => word.length > 3 && descLower.includes(word));
      
      if (!keywordPresent) {
        pageIssues.push({
          page_url: pageUrl,
          issue_type: 'mismatch',
          issue: 'Primary keyword not found in content',
          word_count: wordCount,
          internal_links_count: links.inbound,
          severity: 'warning',
          recommended_action: 'Include primary keyword naturally in description, features, and headings',
        });
      }
    }
    
    // Check for duplicate content (same description)
    const duplicateSignature = buildDuplicateSignature(product);
    const duplicates = duplicateSignature
      ? (duplicateBuckets.get(duplicateSignature) || []).filter((p) => p._id.toString() !== product._id.toString())
      : [];
    
    if (duplicates.length > 0) {
      pageIssues.push({
        page_url: pageUrl,
        issue_type: 'duplicate',
        issue: `Duplicate content found with ${duplicates.length} other page(s)`,
        word_count: wordCount,
        internal_links_count: links.inbound,
        severity: 'warning',
        recommended_action: 'Rewrite content to be unique, or use canonical tags if intentional',
        duplicate_pages: duplicates.map(d => getProductPublicPath(d)),
      });
    }
    
    issues.push(...pageIssues);
    pages.push({
      url: pageUrl,
      title: product.name,
      word_count: wordCount,
      internal_links: links,
      issues_count: pageIssues.length,
      issue_types: [...new Set(pageIssues.map(i => i.issue_type))],
    });
  }
  
  // Category coverage check
  const uncoveredCategories = categories.filter((cat) => {
    if (cat?.active === false) return false;
    if (String(cat?.status || '').toLowerCase() === 'archived') return false;
    const categoryProducts = products.filter(p => p.category === cat.name || p.category === cat._id?.toString());
    return categoryProducts.length === 0;
  });
  
  uncoveredCategories.forEach(cat => {
    issues.push({
      page_url: `/category/${cat.slug || cat._id}`,
      issue_type: 'orphan',
      issue: 'Category with no products',
      word_count: 0,
      internal_links_count: 0,
      severity: 'warning',
      recommended_action: 'Add products to category or remove empty category',
    });
  });
  
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const score = calculateSeoScore(issues);
  
  return {
    reportType: 'content_coverage',
    title: 'SEO Content & Coverage Report',
    timestamp: new Date(),
    score,
    status: score >= 80 ? 'PASS' : score >= 50 ? 'WARN' : 'FAIL',
    summary: {
      total_pages_scanned: products.length,
      total_issues: issues.length,
      critical_issues: criticalCount,
      warning_issues: warningCount,
      thin_content_pages: issues.filter(i => i.issue_type === 'thin').length,
      orphan_pages: issues.filter(i => i.issue_type === 'orphan').length,
      duplicate_content_pages: issues.filter(i => i.issue_type === 'duplicate').length,
      avg_word_count: Math.round(pages.reduce((sum, p) => sum + p.word_count, 0) / pages.length) || 0,
    },
    issues,
    pages,
    recommendations: [
      criticalCount > 0 ? 'Address duplicate content issues immediately' : null,
      issues.filter(i => i.issue_type === 'thin').length > 0 ? 'Expand thin content pages to at least 300 words' : null,
      issues.filter(i => i.issue_type === 'orphan').length > 0 ? 'Build internal links to orphan pages' : null,
    ].filter(Boolean),
  };
}

// ============================================
// REPORT 3: Core Web Vitals & Crawlability
// ============================================
async function runWebVitalsAudit(db, siteUrl) {
  const issues = [];
  const pages = [];
  
  const products = await db.collection('products').find(getIndexableProductsQuery()).toArray();
  
  // Google thresholds
  const THRESHOLDS = {
    LCP: { good: 2500, poor: 4000 }, // ms
    CLS: { good: 0.1, poor: 0.25 },
    INP: { good: 200, poor: 500 }, // ms
  };
  
  for (const product of products) {
    const pageUrl = getProductPublicPath(product);
    const pageIssues = [];
    const mediaImages = Array.isArray(product.media?.images) ? product.media.images : [];
    const validImages = mediaImages.filter((img) => img?.url);
    const mediaVideoUrl = typeof product.media?.videoUrl === 'string' ? product.media.videoUrl : '';
    
    // Simulate metrics based on page content (in real implementation, use Lighthouse or CrUX API)
    const hasLargeImages = validImages.length > 3;
    const hasVideo = !!mediaVideoUrl;
    const descriptionLength = (product.description || '').length;
    
    // Estimated LCP based on content
    const estimatedLCP = 1500 + (hasLargeImages ? 1500 : 0) + (hasVideo ? 2000 : 0);
    const lcpStatus = estimatedLCP <= THRESHOLDS.LCP.good ? 'pass' : estimatedLCP <= THRESHOLDS.LCP.poor ? 'warn' : 'fail';
    
    if (lcpStatus !== 'pass') {
      pageIssues.push({
        page_url: pageUrl,
        metric_name: 'LCP',
        measured_value: estimatedLCP,
        google_threshold: `Good: <${THRESHOLDS.LCP.good}ms`,
        status: lcpStatus,
        severity: lcpStatus === 'fail' ? 'critical' : 'warning',
        technical_fix_hint: hasVideo 
          ? 'Lazy-load video content, use video poster image'
          : hasLargeImages 
            ? 'Optimize images: use WebP format, implement lazy loading, add width/height attributes'
            : 'Optimize server response time, use CDN for static assets',
      });
    }
    
    // Estimated CLS based on images without dimensions
    const imagesWithoutDimensions = validImages.filter(
      (img) => !img?.width || !img?.height,
    ).length;
    
    const estimatedCLS = imagesWithoutDimensions * 0.05;
    const clsStatus = estimatedCLS <= THRESHOLDS.CLS.good ? 'pass' : estimatedCLS <= THRESHOLDS.CLS.poor ? 'warn' : 'fail';
    
    if (clsStatus !== 'pass') {
      pageIssues.push({
        page_url: pageUrl,
        metric_name: 'CLS',
        measured_value: estimatedCLS.toFixed(3),
        google_threshold: `Good: <${THRESHOLDS.CLS.good}`,
        status: clsStatus,
        severity: clsStatus === 'fail' ? 'critical' : 'warning',
        technical_fix_hint: 'Add explicit width and height to images and embeds, reserve space for dynamic content',
      });
    }
    
    // Crawl depth estimation (simplified - all products are at depth 2: home > category > product)
    const crawlDepth = 2;
    if (crawlDepth > 3) {
      pageIssues.push({
        page_url: pageUrl,
        metric_name: 'crawl_depth',
        measured_value: crawlDepth,
        google_threshold: 'Recommended: ≤3 clicks from homepage',
        status: 'fail',
        severity: 'warning',
        technical_fix_hint: 'Improve site architecture, add links from higher-level pages',
      });
    }
    
    // Check for broken links (image URLs)
    const brokenImages = validImages.filter((img) => {
      const url = img?.url;
      return url && (url.includes('placeholder') || url.includes('undefined'));
    });
    
    if (brokenImages.length > 0) {
      pageIssues.push({
        page_url: pageUrl,
        metric_name: 'broken_resources',
        measured_value: `${brokenImages.length} broken images`,
        google_threshold: '0 broken resources',
        status: 'fail',
        severity: 'warning',
        technical_fix_hint: 'Replace broken image URLs with valid images or remove them',
      });
    }
    
    issues.push(...pageIssues);
    pages.push({
      url: pageUrl,
      title: product.name,
      metrics: {
        lcp: { value: estimatedLCP, status: lcpStatus },
        cls: { value: estimatedCLS, status: clsStatus },
        crawl_depth: crawlDepth,
      },
      issues_count: pageIssues.length,
    });
  }
  
  // Mobile usability check (site-wide)
  const homeResult = await fetchText(`${siteUrl}/`);
  const viewport = extractMetaContent(homeResult.text, 'name', 'viewport');
  if (!viewport) {
    issues.push({
      page_url: '/',
      metric_name: 'mobile_usability',
      measured_value: 'Viewport meta tag missing',
      google_threshold: 'Mobile-friendly required',
      status: 'fail',
      severity: 'critical',
      technical_fix_hint: 'Ensure responsive design, viewport meta tag, and touch-friendly elements',
    });
  }
  
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const score = calculateSeoScore(issues);
  
  // Calculate pass rates for each metric
  const lcpPassRate = Math.round((pages.filter(p => p.metrics.lcp.status === 'pass').length / pages.length) * 100) || 0;
  const clsPassRate = Math.round((pages.filter(p => p.metrics.cls.status === 'pass').length / pages.length) * 100) || 0;
  
  return {
    reportType: 'web_vitals',
    title: 'Core Web Vitals & Crawlability Report',
    timestamp: new Date(),
    score,
    status: score >= 80 ? 'PASS' : score >= 50 ? 'WARN' : 'FAIL',
    summary: {
      total_pages_scanned: products.length,
      total_issues: issues.length,
      critical_issues: criticalCount,
      warning_issues: warningCount,
      lcp_pass_rate: lcpPassRate,
      cls_pass_rate: clsPassRate,
      pages_need_attention: pages.filter(p => p.issues_count > 0).length,
    },
    issues,
    pages,
    thresholds: THRESHOLDS,
    recommendations: [
      lcpPassRate < 75 ? 'Optimize LCP: compress images, use CDN, improve server response' : null,
      clsPassRate < 75 ? 'Fix CLS: add image dimensions, avoid injecting content above existing content' : null,
      criticalCount > 0 ? 'Address critical performance issues blocking search ranking' : null,
    ].filter(Boolean),
  };
}

async function runLiveIndexabilityAudit(db, siteUrl) {
  const issues = [];
  const pages = [];
  const targets = await getAuditTargets(db);

  const results = [];
  for (const target of targets) {
    const absoluteUrl = new URL(target.path, siteUrl).toString();
    const response = await fetchText(absoluteUrl);
    results.push({ ...target, absoluteUrl, response });
  }

  results.forEach(({ path, pageType, absoluteUrl, response, label }) => {
    const pageIssues = [];

    if (!response.ok) {
      pageIssues.push({
        page_url: path,
        issue: 'Page is not reachable for Googlebot',
        severity: 'critical',
        field: 'http_status',
        current_value: response.status,
        recommended_fix: 'Return HTTP 200 for indexable public pages',
      });
    }

    const title = extractTitle(response.text);
    const description = extractMetaContent(response.text, 'name', 'description');
    const canonical = extractCanonical(response.text);
    const robots = extractMetaContent(response.text, 'name', 'robots').toLowerCase();
    const h1 = extractFirstH1(response.text);
    const viewport = extractMetaContent(response.text, 'name', 'viewport');

    if (!title) {
      pageIssues.push({
        page_url: path,
        issue: 'Missing title tag in live HTML',
        severity: 'critical',
        field: 'title',
        current_value: '',
        recommended_fix: 'Render a server-side title tag for the page',
      });
    } else if (title.length < 20) {
      pageIssues.push({
        page_url: path,
        issue: 'Title tag is too short',
        severity: 'warning',
        field: 'title',
        current_value: title,
        recommended_fix: 'Expand title to a descriptive 45-60 character range',
      });
    }

    if (!description && pageType !== 'legal') {
      pageIssues.push({
        page_url: path,
        issue: 'Missing meta description in live HTML',
        severity: 'warning',
        field: 'meta_description',
        current_value: '',
        recommended_fix: 'Render a meta description for better CTR and coverage',
      });
    }

    if (!canonical) {
      pageIssues.push({
        page_url: path,
        issue: 'Missing canonical tag in live HTML',
        severity: 'warning',
        field: 'canonical',
        current_value: '',
        recommended_fix: 'Render a canonical URL for every indexable page',
      });
    } else if (!stripTrailingSlash(canonical).startsWith(stripTrailingSlash(siteUrl))) {
      pageIssues.push({
        page_url: path,
        issue: 'Canonical points outside the main site origin',
        severity: 'warning',
        field: 'canonical',
        current_value: canonical,
        recommended_fix: 'Keep canonical URLs aligned with the primary site domain',
      });
    }

    // /products mirrors the homepage marketplace with canonical → / and noindex by design
    // (stable Ads landing + avoids duplicate indexing). Do not flag as a critical SEO blocker.
    const isAlternateMarketplaceSurface = path === '/products'
      && pageType === 'marketplace'
      && canonical
      && stripTrailingSlash(canonical) === stripTrailingSlash(siteUrl);

    if (robots.includes('noindex') && pageType !== 'legal' && !isAlternateMarketplaceSurface) {
      pageIssues.push({
        page_url: path,
        issue: 'Indexable public page is marked noindex',
        severity: 'critical',
        field: 'robots',
        current_value: robots,
        recommended_fix: 'Remove noindex from public pages that should rank',
      });
    }

    if (!viewport) {
      pageIssues.push({
        page_url: path,
        issue: 'Viewport meta tag missing',
        severity: 'warning',
        field: 'viewport',
        current_value: '',
        recommended_fix: 'Add a viewport tag for mobile-friendly rendering',
      });
    }

    if (!h1 && pageType !== 'legal') {
      pageIssues.push({
        page_url: path,
        issue: 'No H1 found in rendered HTML',
        severity: 'warning',
        field: 'h1',
        current_value: '',
        recommended_fix: 'Ensure each public page renders a primary heading',
      });
    }

    if (response.ok && response.finalUrl && stripTrailingSlash(response.finalUrl) !== stripTrailingSlash(absoluteUrl)) {
      pageIssues.push({
        page_url: path,
        issue: 'Requested URL redirects before render',
        severity: 'info',
        field: 'redirect',
        current_value: response.finalUrl,
        recommended_fix: 'Use direct canonical URLs in internal links and sitemaps',
      });
    }

    issues.push(...pageIssues);
    pages.push({
      url: path,
      title: title || label,
      status_code: response.status,
      canonical: canonical || null,
      robots: robots || 'index,follow',
      issues_count: pageIssues.length,
    });
  });

  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const score = calculateSeoScore(issues);

  return {
    reportType: 'live_indexability',
    title: 'Live Indexability & Rendering Audit',
    timestamp: new Date(),
    score,
    status: score >= 80 ? 'PASS' : score >= 50 ? 'WARN' : 'FAIL',
    summary: {
      total_pages_scanned: pages.length,
      total_issues: issues.length,
      critical_issues: criticalCount,
      warning_issues: warningCount,
      healthy_pages: pages.filter((page) => page.issues_count === 0).length,
    },
    issues,
    pages,
    recommendations: [
      criticalCount > 0 ? 'Fix public pages returning non-200 or noindex responses first' : null,
      warningCount > 0 ? 'Complete missing title, description, canonical and heading coverage' : null,
    ].filter(Boolean),
  };
}

async function runStructuredDataAudit(db, siteUrl) {
  const issues = [];
  const pages = [];
  const targets = (await getAuditTargets(db)).filter((target) => (
    ['home', 'product', 'tenant', 'category', 'marketplace'].includes(target.pageType)
  )).slice(0, 22);

  for (const target of targets) {
    const absoluteUrl = new URL(target.path, siteUrl).toString();
    const response = await fetchText(absoluteUrl);

    if (!response.ok) {
      issues.push({
        page_url: target.path,
        issue: 'Unable to verify structured data because page is unreachable',
        severity: 'critical',
        field: 'structured_data',
        current_value: response.status,
        recommended_fix: 'Return HTTP 200 for schema-bearing pages',
      });
      continue;
    }

    const { items, parseErrors } = parseJsonLdBlocks(extractJsonLdBlocks(response.text));
    const schemaTypes = getSchemaTypes(items);
    const pageIssues = [];

    if (parseErrors > 0) {
      pageIssues.push({
        page_url: target.path,
        issue: 'Invalid JSON-LD block detected',
        severity: 'critical',
        field: 'json_ld',
        current_value: parseErrors,
        recommended_fix: 'Fix malformed JSON-LD scripts so Google can parse rich result data',
      });
    }

    target.expectedSchemas.forEach((schemaType) => {
      if (!schemaTypes.includes(schemaType)) {
        pageIssues.push({
          page_url: target.path,
          issue: `Missing required ${schemaType} schema`,
          severity: target.pageType === 'product' || target.pageType === 'home' ? 'critical' : 'warning',
          field: 'schema_type',
          current_value: schemaTypes.join(', '),
          recommended_fix: `Render ${schemaType} JSON-LD for this page type`,
        });
      }
    });

    const productSchema = items.find((item) => {
      const type = item?.['@type'];
      return type === 'Product' || (Array.isArray(type) && type.includes('Product'));
    });

    if (target.pageType === 'product' && productSchema) {
      if (!productSchema.offers) {
        pageIssues.push({
          page_url: target.path,
          issue: 'Product schema is missing offers',
          severity: 'warning',
          field: 'offers',
          current_value: 'missing',
          recommended_fix: 'Add offers with price and availability to Product schema',
        });
      }
      if (!productSchema.image) {
        pageIssues.push({
          page_url: target.path,
          issue: 'Product schema is missing image',
          severity: 'warning',
          field: 'image',
          current_value: 'missing',
          recommended_fix: 'Add image URLs to Product schema for rich results',
        });
      }
    }

    issues.push(...pageIssues);
    pages.push({
      url: target.path,
      schema_types: schemaTypes,
      schema_blocks: items.length,
      issues_count: pageIssues.length,
    });
  }

  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const score = calculateSeoScore(issues);

  return {
    reportType: 'structured_data',
    title: 'Structured Data & Rich Results Audit',
    timestamp: new Date(),
    score,
    status: score >= 80 ? 'PASS' : score >= 50 ? 'WARN' : 'FAIL',
    summary: {
      total_pages_scanned: pages.length,
      total_issues: issues.length,
      critical_issues: criticalCount,
      warning_issues: warningCount,
      pages_with_schema: pages.filter((page) => page.schema_blocks > 0).length,
    },
    issues,
    pages,
    recommendations: [
      criticalCount > 0 ? 'Restore missing required Product, Organization, WebSite and Breadcrumb schema first' : null,
      warningCount > 0 ? 'Complete optional schema fields like offers and images to strengthen rich results' : null,
    ].filter(Boolean),
  };
}

async function runSitemapConsistencyAudit(db, siteUrl) {
  const issues = [];
  const pages = [];
  const sitemapUrl = `${siteUrl}/sitemap.xml`;
  const sitemapResponse = await fetchText(sitemapUrl);

  if (!sitemapResponse.ok) {
    issues.push({
      page_url: '/sitemap.xml',
      issue: 'Sitemap is not reachable',
      severity: 'critical',
      field: 'sitemap',
      current_value: sitemapResponse.status,
      recommended_fix: 'Expose sitemap.xml publicly and return HTTP 200',
    });
  }

  const urls = [...sitemapResponse.text.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1].trim()).filter(Boolean);
  const uniqueUrls = [...new Set(urls)];

  if (uniqueUrls.length !== urls.length) {
    issues.push({
      page_url: '/sitemap.xml',
      issue: 'Sitemap contains duplicate URLs',
      severity: 'warning',
      field: 'sitemap_duplicates',
      current_value: urls.length - uniqueUrls.length,
      recommended_fix: 'Deduplicate URLs before emitting sitemap entries',
    });
  }

  const targets = await getAuditTargets(db);
  // /products is a deliberate noindex alternate surface (canonical → /). Do not require it in sitemap.xml.
  const requiredPaths = targets
    .slice(0, 20)
    .map((target) => target.path)
    .filter((path) => path !== '/products');
  const urlPathSet = new Set(uniqueUrls.map((url) => {
    try {
      return new URL(url, siteUrl).pathname;
    } catch (error) {
      return url;
    }
  }));

  requiredPaths.forEach((path) => {
    if (!urlPathSet.has(path)) {
      issues.push({
        page_url: path,
        issue: 'Important public page is missing from sitemap',
        severity: path === '/' || path.startsWith('/products/') ? 'critical' : 'warning',
        field: 'sitemap_coverage',
        current_value: 'missing',
        recommended_fix: 'Include canonical public URLs in sitemap.xml',
      });
    }
  });

  const sampledUrls = uniqueUrls.slice(0, 12);
  for (const url of sampledUrls) {
    const response = await fetchText(url);
    const robots = extractMetaContent(response.text, 'name', 'robots').toLowerCase();
    const pathname = (() => {
      try {
        return new URL(url, siteUrl).pathname;
      } catch (error) {
        return url;
      }
    })();

    const pageIssues = [];
    if (!response.ok) {
      pageIssues.push({
        page_url: pathname,
        issue: 'Sitemap URL does not return HTTP 200',
        severity: 'critical',
        field: 'http_status',
        current_value: response.status,
        recommended_fix: 'Keep only live canonical URLs in sitemap.xml',
      });
    }
    if (robots.includes('noindex')) {
      pageIssues.push({
        page_url: pathname,
        issue: 'Sitemap URL is marked noindex',
        severity: 'warning',
        field: 'robots',
        current_value: robots,
        recommended_fix: 'Remove noindex or exclude the URL from the sitemap',
      });
    }

    issues.push(...pageIssues);
    pages.push({
      url: pathname,
      status_code: response.status,
      robots: robots || 'index,follow',
      issues_count: pageIssues.length,
    });
  }

  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const score = calculateSeoScore(issues);

  return {
    reportType: 'sitemap_consistency',
    title: 'Sitemap & Robots Consistency Audit',
    timestamp: new Date(),
    score,
    status: score >= 80 ? 'PASS' : score >= 50 ? 'WARN' : 'FAIL',
    summary: {
      total_urls_in_sitemap: uniqueUrls.length,
      total_issues: issues.length,
      critical_issues: criticalCount,
      warning_issues: warningCount,
      sampled_urls_checked: pages.length,
    },
    issues,
    pages,
    recommendations: [
      criticalCount > 0 ? 'Fix missing or broken sitemap URLs before submitting to Google' : null,
      warningCount > 0 ? 'Align sitemap coverage with canonical and indexable URLs only' : null,
    ].filter(Boolean),
  };
}

async function runGoogleIntegrationsAudit(db, siteUrl) {
  const issues = [];
  const checks = [];
  const settings = await getSiteSettings(db);
  const gaId = String(settings.googleAnalyticsId || ENV_GA_ID || '').trim().toUpperCase();
  const gtmId = String(settings.googleTagManagerId || ENV_GTM_ID || '').trim().toUpperCase();
  const gscVerification = String(settings.googleSearchConsoleVerification || ENV_GSC_VERIFICATION || '').trim();
  const gscToken = extractVerificationToken(gscVerification);

  const homeResponse = await fetchText(`${siteUrl}/`);
  const homeHtml = homeResponse.text;
  const renderedGaIds = extractGa4IdsFromHtml(homeHtml);
  const renderedGtmIds = extractGtmIdsFromHtml(homeHtml);
  const hasConfiguredGa = isValidGa4Id(gaId);
  const hasRenderedGa = renderedGaIds.length > 0;
  const effectiveGaId = hasConfiguredGa ? gaId : (renderedGaIds[0] || '');

  const pushCheck = (id, name, passed, severity, issue, recommended_fix, current_value) => {
    checks.push({ id, name, status: passed ? 'ok' : 'warn', current_value: current_value || '' });
    if (!passed) {
      issues.push({
        page_url: '/',
        issue,
        severity,
        field: id,
        current_value,
        recommended_fix,
      });
    }
  };

  const gscPresentInHome = homeHtml.includes('google-site-verification') || (gscToken && homeHtml.includes(gscToken));
  const hasConfiguredGtm = Boolean(gtmId);
  const hasValidConfiguredGtm = isValidGtmId(gtmId);
  const gtmMatchesConfigured = hasValidConfiguredGtm && renderedGtmIds.includes(gtmId);
  const gaMatchesConfigured = hasConfiguredGa && renderedGaIds.includes(gaId);

  pushCheck('ga4_id', 'GA4 ID configured', hasConfiguredGa || hasRenderedGa, 'warning', 'Google Analytics ID is missing or invalid', 'Set a valid GA4 measurement ID in admin settings', effectiveGaId || 'missing');
  pushCheck('gtm_id', 'GTM ID configured (optional)', !hasConfiguredGtm || hasValidConfiguredGtm, 'warning', 'Google Tag Manager ID is invalid', 'Set a valid GTM container ID in admin settings or leave it empty', gtmId || 'not_configured');
  pushCheck('gsc_verification', 'Search Console verification configured', hasSearchConsoleVerification(gscVerification) || gscPresentInHome, 'warning', 'Search Console verification token is missing', 'Add the Search Console verification token in admin settings', (hasSearchConsoleVerification(gscVerification) || gscPresentInHome) ? 'configured' : 'missing');
  pushCheck('home_reachable', 'Homepage reachable', homeResponse.ok, 'critical', 'Homepage is not reachable', 'Ensure the homepage returns HTTP 200 for Googlebot', String(homeResponse.status || 'error'));
  pushCheck('ga4_rendered', 'GA4 rendered on homepage', !hasConfiguredGa || gaMatchesConfigured, 'critical', 'GA4 ID is configured but not rendered on homepage', 'Render the GA4 snippet with the configured measurement ID', hasConfiguredGa ? gaId : 'not_configured');
  pushCheck('gtm_rendered', 'GTM rendered on homepage', !hasValidConfiguredGtm || gtmMatchesConfigured, 'critical', 'GTM ID is configured but not rendered on homepage', 'Render the GTM container snippet with the configured container ID', hasValidConfiguredGtm ? gtmId : 'not_configured');
  pushCheck('gsc_rendered', 'Search Console verification rendered', !gscToken || homeHtml.includes(gscToken) || homeHtml.includes('google-site-verification'), 'critical', 'Search Console verification is configured but not rendered in homepage HTML', 'Render the google-site-verification meta tag in the document head', gscToken || 'not_configured');

  const robotsResponse = await fetchText(`${siteUrl}/robots.txt`);
  pushCheck('robots_public', 'robots.txt reachable', robotsResponse.ok, 'critical', 'robots.txt is not reachable', 'Expose robots.txt publicly', String(robotsResponse.status || 'error'));

  const sitemapResponse = await fetchText(`${siteUrl}/sitemap.xml`);
  pushCheck('sitemap_public', 'sitemap.xml reachable', sitemapResponse.ok, 'critical', 'sitemap.xml is not reachable', 'Expose sitemap.xml publicly', String(sitemapResponse.status || 'error'));

  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const score = calculateSeoScore(issues);

  return {
    reportType: 'google_integrations',
    title: 'Google Integrations Audit',
    timestamp: new Date(),
    score,
    status: score >= 80 ? 'PASS' : score >= 50 ? 'WARN' : 'FAIL',
    summary: {
      total_checks: checks.length,
      healthy_checks: checks.filter((check) => check.status === 'ok').length,
      total_issues: issues.length,
      critical_issues: criticalCount,
      warning_issues: warningCount,
    },
    issues,
    checks,
    recommendations: [
      criticalCount > 0 ? 'Fix homepage rendering of GA4, GTM and Search Console verification first' : null,
      warningCount > 0 ? 'Complete missing Google configuration values in admin settings' : null,
    ].filter(Boolean),
  };
}

// ============================================
// API Handlers
// ============================================

async function GETHandler(request) {
  try {
    await requireAdminApi(request);
    const db = await getDb();

    if (!db) {
      return NextResponse.json(buildFallbackHistoryPayload());
    }
    
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit')) || 10;
    
    // Fetch stored reports
    const query = reportType ? { reportType } : {};
    const reports = await db.collection('seo_reports')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    
    return NextResponse.json({
      ok: true,
      reports,
      count: reports.length,
    });
  } catch (error) {
    console.error('SEO_AUDIT_GET_ERROR:', error);
    const status = deriveHttpStatus(error, 500);
    if (status === 401 || status === 403) {
      return NextResponse.json(
        { ok: false, error: status === 401 ? 'Unauthorized' : 'Forbidden' },
        { status },
      );
    }

    if (isDbUnavailableError(error)) {
      return NextResponse.json(buildFallbackHistoryPayload());
    }

    return NextResponse.json({ ok: false, error: 'Failed to load SEO reports' }, { status: 500 });
  }
}

async function POSTHandler(request) {
  let action = null;
  let typesToRun = DEFAULT_REPORT_TYPES;
  let siteUrl = null;

  try {
    await requireAdminApi(request);
    siteUrl = resolveSiteUrl(request);

    const body = await request.json();
    action = body?.action;
    typesToRun = Array.isArray(body?.reportTypes) && body.reportTypes.length > 0
      ? body.reportTypes
      : DEFAULT_REPORT_TYPES;

    if (action !== 'scan') {
      return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      const fallbackResults = await runFallbackSeoAudit(typesToRun, siteUrl);
      return NextResponse.json(buildAuditResponsePayload(fallbackResults, 'fallback'));
    }

    const results = {};
    if (typesToRun.includes('technical_seo')) {
      results.technical_seo = await runTechnicalSeoAudit(db, siteUrl);
    }
    if (typesToRun.includes('content_coverage')) {
      results.content_coverage = await runContentCoverageAudit(db);
    }
    if (typesToRun.includes('web_vitals')) {
      results.web_vitals = await runWebVitalsAudit(db, siteUrl);
    }
    if (typesToRun.includes('live_indexability')) {
      results.live_indexability = await runLiveIndexabilityAudit(db, siteUrl);
    }
    if (typesToRun.includes('structured_data')) {
      results.structured_data = await runStructuredDataAudit(db, siteUrl);
    }
    if (typesToRun.includes('sitemap_consistency')) {
      results.sitemap_consistency = await runSitemapConsistencyAudit(db, siteUrl);
    }
    if (typesToRun.includes('google_integrations')) {
      results.google_integrations = await runGoogleIntegrationsAudit(db, siteUrl);
    }

    const reportsToStore = Object.values(results).map((report) => ({
      ...report,
      createdAt: new Date(),
    }));

    if (reportsToStore.length > 0) {
      await db.collection('seo_reports').insertMany(reportsToStore);
    }

    return NextResponse.json(buildAuditResponsePayload(results, 'live'));
  } catch (error) {
    console.error('SEO_AUDIT_POST_ERROR:', error);
    const status = deriveHttpStatus(error, 500);
    if (status === 401 || status === 403) {
      return NextResponse.json(
        { ok: false, error: status === 401 ? 'Unauthorized' : 'Forbidden' },
        { status },
      );
    }

    if (isDbUnavailableError(error)) {
      if (action === 'scan' && siteUrl) {
        try {
          const fallbackResults = await runFallbackSeoAudit(typesToRun, siteUrl);
          return NextResponse.json(buildAuditResponsePayload(fallbackResults, 'fallback'));
        } catch (fallbackError) {
          console.error('SEO_AUDIT_POST_FALLBACK_ERROR:', fallbackError);
        }
      }

      return NextResponse.json(buildDbUnavailableErrorPayload(), { status: 503 });
    }

    return NextResponse.json({ ok: false, error: 'Failed to run SEO audit' }, { status: 500 });
  }
}

async function DELETEHandler(request) {
  try {
    await requireAdminApi(request);
    const db = await getDb();

    if (!db) {
      return NextResponse.json(buildDbUnavailableErrorPayload(), { status: 503 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const olderThan = searchParams.get('olderThan'); // days
    
    if (id) {
      await db.collection('seo_reports').deleteOne({ _id: new ObjectId(id) });
      return NextResponse.json({ ok: true, message: 'Report deleted' });
    }
    
    if (olderThan) {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(olderThan));
      const result = await db.collection('seo_reports').deleteMany({ timestamp: { $lt: date } });
      return NextResponse.json({ ok: true, deleted: result.deletedCount });
    }
    
    return NextResponse.json({ ok: false, error: 'Specify id or olderThan parameter' }, { status: 400 });
  } catch (error) {
    console.error('SEO_AUDIT_DELETE_ERROR:', error);
    const status = deriveHttpStatus(error, 500);
    if (status === 401 || status === 403) {
      return NextResponse.json(
        { ok: false, error: status === 401 ? 'Unauthorized' : 'Forbidden' },
        { status },
      );
    }

    if (isDbUnavailableError(error)) {
      return NextResponse.json(buildDbUnavailableErrorPayload(), { status: 503 });
    }

    return NextResponse.json({ ok: false, error: 'Failed to delete SEO report' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
export const DELETE = withErrorLogging(DELETEHandler);
