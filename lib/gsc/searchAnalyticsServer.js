/**
 * Google Search Console — Search Analytics (server-only).
 * Uses Search Console API v1 searchanalytics.query (dimensions: query | page).
 */

import { google } from 'googleapis';

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

function normalizeGscPropertyUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('sc-domain:')) {
    return s;
  }
  let u = s;
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  if (!u.endsWith('/')) {
    u += '/';
  }
  return u;
}

/**
 * @returns {string} Property URL as registered in Search Console (URL-prefix or sc-domain:)
 */
export function resolveGscPropertyUrl() {
  const explicit = process.env.GSC_PROPERTY_URL?.trim();
  if (explicit) {
    return normalizeGscPropertyUrl(explicit);
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || '';
  return normalizeGscPropertyUrl(base);
}

export function isGscServiceAccountConfigured() {
  return Boolean(process.env.GSC_SERVICE_ACCOUNT_JSON?.trim());
}

/**
 * @param {'7d'|'28d'|'3m'} rangeKey
 */
export function computeGscDateRange(rangeKey) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2);

  let spanDays = 7;
  if (rangeKey === '28d') spanDays = 28;
  if (rangeKey === '3m') spanDays = 90;

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (spanDays - 1));

  const fmt = (d) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

function mapAnalyticsRows(rows, dimension) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const key = row.keys?.[0] ?? '';
    const base = {
      clicks: Number(row.clicks ?? 0),
      impressions: Number(row.impressions ?? 0),
      ctr: Number(row.ctr ?? 0),
      position: Number(row.position ?? 0),
    };
    if (dimension === 'query') {
      return { query: key, ...base };
    }
    return { page: key, ...base };
  });
}

/**
 * @param {string} siteUrl — exact GSC property URL
 * @param {string} startDate — YYYY-MM-DD
 * @param {string} endDate — YYYY-MM-DD
 * @param {'query'|'page'} dimension
 * @param {number} rowLimit
 */
export async function fetchGscSearchAnalyticsDimension(siteUrl, startDate, endDate, dimension, rowLimit = 50) {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!raw?.trim()) {
    const err = new Error('GSC_NOT_CONFIGURED');
    err.code = 'GSC_NOT_CONFIGURED';
    throw err;
  }

  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch {
    const err = new Error('GSC_CREDENTIALS_INVALID');
    err.code = 'GSC_CREDENTIALS_INVALID';
    throw err;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [GSC_SCOPE],
  });

  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const res = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: [dimension],
      rowLimit,
      dataState: 'final',
    },
  });

  const rows = res.data?.rows || [];
  return mapAnalyticsRows(rows, dimension);
}

export async function fetchGscTopQueriesAndPages(siteUrl, startDate, endDate, rowLimit = 50) {
  const [queries, pages] = await Promise.all([
    fetchGscSearchAnalyticsDimension(siteUrl, startDate, endDate, 'query', rowLimit),
    fetchGscSearchAnalyticsDimension(siteUrl, startDate, endDate, 'page', rowLimit),
  ]);
  return { queries, pages };
}

/**
 * Map Google API errors to stable codes for the client.
 */
export function classifyGscError(error) {
  const status = error?.response?.status ?? error?.code;
  const apiMsg = error?.response?.data?.error?.message || error?.message || '';

  if (error?.code === 'GSC_NOT_CONFIGURED' || error?.message === 'GSC_NOT_CONFIGURED') {
    return { http: 503, code: 'not_configured', message: apiMsg };
  }
  if (error?.code === 'GSC_CREDENTIALS_INVALID' || error?.message === 'GSC_CREDENTIALS_INVALID') {
    return { http: 500, code: 'credentials_invalid', message: apiMsg };
  }

  if (status === 403) {
    return {
      http: 403,
      code: 'forbidden',
      message:
        'הגישה נדחתה (403). ודאו שחשבון השירות מופיע ב-Search Console תחת הגדרות הנכס > משתמשים והרשאות, עם הרשאת "מלא" או "מוגבל".',
    };
  }

  if (status === 404) {
    return {
      http: 404,
      code: 'site_not_found',
      message:
        'הנכס לא נמצא (404). ודאו ש-GSC_PROPERTY_URL תואם בדיוק לרישום ב-Search Console: לנכס URL-prefix — כתובת מלאה עם https ו-/ בסוף; לנכס Domain — בפורמט sc-domain:example.com.',
    };
  }

  if (status === 401) {
    return {
      http: 401,
      code: 'unauthorized_google',
      message: 'אימות מול Google נכשל (401). בדקו שה-JSON של חשבון השירות תקין ושה-API Search Console מופעל בפרויקט Google Cloud.',
    };
  }

  return {
    http: 502,
    code: 'gsc_error',
    message: apiMsg || 'שגיאה בקריאה ל-Google Search Console API',
  };
}
