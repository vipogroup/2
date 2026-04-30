import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { rateLimiters } from '@/lib/rateLimit';
import fs from 'fs';
import path from 'path';

const DEEP_SCAN_TIMEOUT_MS = 4500;

/** שירותים שסופרים ל"בריאות ליבה" (לא כולל npm, github, אופציונלי וכו') */
const CORE_SERVICE_KEYS = [
  'mongodb',
  'authSecrets',
  'cloudinary',
  'payplus',
  'resend',
  'publicSite',
];

function readAppVersion() {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8');
    const pkg = JSON.parse(raw);
    return String(pkg.version || '0.0.0');
  } catch {
    return '0.0.0';
  }
}

/**
 * @param {Record<string, { status?: string }>} results
 */
function buildHealthMeta(results) {
  const entries = Object.entries(results || {});
  const total = entries.length;
  const connectedAll = entries.filter(([, v]) => v?.status === 'connected').length;
  const allPct = total > 0 ? Math.round((connectedAll / total) * 100) : 0;

  const coreEntries = CORE_SERVICE_KEYS.filter((k) => results[k] != null).map((k) => [k, results[k]]);
  const coreTotal = coreEntries.length;
  const coreConnected = coreEntries.filter(([, v]) => v?.status === 'connected').length;
  const corePct = coreTotal > 0 ? Math.round((coreConnected / coreTotal) * 100) : 0;

  return {
    all: { pct: allPct, connected: connectedAll, total },
    core: { pct: corePct, connected: coreConnected, total: coreTotal, keys: CORE_SERVICE_KEYS },
  };
}

function buildRuntimeMeta() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    vercel: Boolean(process.env.VERCEL && process.env.VERCEL !== '0'),
    appVersion: readAppVersion(),
  };
}

/** ספירת סטטוסים לכל השירותים בתשובה */
function countConnectionStatuses(results) {
  const vals = Object.values(results || {});
  return {
    total: vals.length,
    connected: vals.filter((v) => v?.status === 'connected').length,
    warning: vals.filter((v) => v?.status === 'warning').length,
    error: vals.filter((v) => v?.status === 'error').length,
  };
}

/**
 * משתני env רלוונטיים לכל שירות — לכפתור "מה חסר" בממשק.
 * `alt` = שם חלופי (מספיק אחד מהשניים).
 */
const SERVICE_ENV_CHECKLISTS = {
  mongodb: {
    note: 'ב-Atlas: גם Network Access ומשתמש עם סיסמה תקינה',
    vars: [{ key: 'MONGODB_URI' }, { key: 'MONGODB_DB', optional: true }],
  },
  payplus: {
    vars: [
      { key: 'PAYPLUS_API_KEY' },
      { key: 'PAYPLUS_SECRET' },
      { key: 'PAYPLUS_WEBHOOK_SECRET' },
      { key: 'PAYPLUS_BASE_URL' },
    ],
  },
  priority: {
    vars: [
      { key: 'PRIORITY_BASE_URL', alt: 'PRIORITY_API_URL' },
      { key: 'PRIORITY_CLIENT_ID', alt: 'PRIORITY_USERNAME' },
      { key: 'PRIORITY_CLIENT_SECRET', alt: 'PRIORITY_PASSWORD' },
      { key: 'PRIORITY_COMPANY_CODE' },
    ],
  },
  whatsapp: {
    note: 'מספיק אחד: שרת WhatsApp (URL) או מספר Twilio WhatsApp',
    vars: [{ key: 'WHATSAPP_SERVER_URL' }, { key: 'TWILIO_WHATSAPP_NUMBER' }],
    anyOf: true,
  },
  cloudinary: {
    vars: [
      { key: 'CLOUDINARY_CLOUD_NAME', alt: 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME' },
      { key: 'CLOUDINARY_API_KEY' },
      { key: 'CLOUDINARY_API_SECRET' },
    ],
  },
  vercel: {
    note: 'ב-localhost אזהרה נורמלית; בפרודקשן על Vercel לרוב ירוק בלי טוקן',
    vars: [
      { key: 'VERCEL_TOKEN', optional: true },
      { key: 'VERCEL_PROJECT_ID', optional: true },
    ],
  },
  github: {
    note: 'בבדיקה המהירה תמיד זמין; לסריקה עמוקה: טוקן GitHub',
    vars: [{ key: 'GITHUB_TOKEN', alt: 'GH_TOKEN', optional: true }],
  },
  resend: {
    vars: [{ key: 'RESEND_API_KEY' }],
  },
  twilio: {
    vars: [
      { key: 'TWILIO_ACCOUNT_SID' },
      { key: 'TWILIO_AUTH_TOKEN' },
      { key: 'TWILIO_FROM_NUMBER', alt: 'TWILIO_PHONE_NUMBER', optional: true },
    ],
  },
  npm: {
    note: 'אין משתני env נדרשים — נבדקת זמינות ה-registry',
    vars: [],
  },
  sendgrid: {
    note: 'אופציונלי אם משתמשים רק ב-Resend',
    vars: [{ key: 'SENDGRID_API_KEY', optional: true }],
  },
  googleOAuth: {
    vars: [{ key: 'GOOGLE_CLIENT_ID' }, { key: 'GOOGLE_CLIENT_SECRET' }],
  },
  authSecrets: {
    note: 'מומלץ מפתחות ארוכים (≥32 תווים) בפרודקשן',
    vars: [{ key: 'JWT_SECRET' }, { key: 'NEXTAUTH_SECRET' }],
  },
  webPush: {
    vars: [
      { key: 'WEB_PUSH_PUBLIC_KEY', alt: 'NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY' },
      { key: 'WEB_PUSH_PRIVATE_KEY' },
    ],
  },
  googleAds: {
    note: 'חלופה: הגדרה בטאב אינטגרציות (לא רק env)',
    vars: [
      { key: 'GOOGLE_ADS_CLIENT_ID' },
      { key: 'GOOGLE_ADS_CLIENT_SECRET' },
      { key: 'GOOGLE_ADS_DEVELOPER_TOKEN' },
    ],
  },
  googleAdsEnv: {
    note: 'אותם משתני OAuth — שורה נפרדת לבדיקת env בלבד',
    vars: [
      { key: 'GOOGLE_ADS_CLIENT_ID' },
      { key: 'GOOGLE_ADS_CLIENT_SECRET' },
      { key: 'GOOGLE_ADS_DEVELOPER_TOKEN' },
    ],
  },
  studioSso: {
    note: 'אם חסר — נעשה fallback ל-JWT_SECRET',
    vars: [{ key: 'STUDIO_SSO_SECRET', optional: true }],
  },
  publicSite: {
    vars: [{ key: 'NEXT_PUBLIC_SITE_URL', alt: 'NEXT_PUBLIC_BASE_URL' }],
  },
};

function envEntryPresent(entry) {
  const primary = checkEnvVar(entry.key);
  if (entry.alt) {
    return primary || checkEnvVar(entry.alt);
  }
  return primary;
}

/** ערך env בפועל (primary או alt) */
function getResolvedEnvRaw(entry) {
  const p = process.env[entry.key];
  if (p && String(p).trim()) {
    return { raw: String(p).trim(), usedKey: entry.key };
  }
  if (entry.alt) {
    const a = process.env[entry.alt];
    if (a && String(a).trim()) {
      return { raw: String(a).trim(), usedKey: entry.alt };
    }
  }
  return { raw: null, usedKey: null };
}

/** מחלץ host מ-Mongo URI בלי סיסמה (לתצוגה בטוחה) */
function mongoConnectionHostHint(uri) {
  const s = String(uri || '');
  const at = s.lastIndexOf('@');
  if (at === -1) return null;
  let rest = s.slice(at + 1);
  const slash = rest.indexOf('/');
  if (slash !== -1) rest = rest.slice(0, slash);
  const q = rest.indexOf('?');
  if (q !== -1) rest = rest.slice(0, q);
  return rest.trim() || null;
}

/**
 * תצוגת ערך בטוחה ללקוח — ללא סודות; חלק מהערכים הציבוריים במלואם
 * @returns {{ text: string, kind: 'plain' | 'partial' | 'masked' } | null}
 */
function buildSafeValuePreview(usedKey, raw) {
  if (!usedKey || !raw) return null;
  const ku = String(usedKey).toUpperCase();

  if (ku === 'MONGODB_URI') {
    const host = mongoConnectionHostHint(raw);
    if (host) {
      return {
        text: `מוגדר — שרת: ${host} (מחרוזת מלאה מוסתרת)`,
        kind: 'partial',
      };
    }
    return { text: 'מוגדר — מחרוזת חיבור מוסתרת', kind: 'masked' };
  }

  if (usedKey.startsWith('NEXT_PUBLIC_')) {
    const t = raw.length > 240 ? `${raw.slice(0, 240)}…` : raw;
    return { text: t, kind: 'plain' };
  }

  if (
    ku === 'GOOGLE_CLIENT_ID' ||
    ku === 'GOOGLE_ADS_CLIENT_ID' ||
    ku.endsWith('_CLIENT_ID')
  ) {
    const t = raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
    return { text: t, kind: 'plain' };
  }

  if (
    ku.includes('SECRET') ||
    ku.includes('PASSWORD') ||
    ku.includes('AUTH_TOKEN') ||
    (ku.includes('TOKEN') && !ku.startsWith('NEXT_PUBLIC')) ||
    ku === 'JWT_SECRET' ||
    ku === 'NEXTAUTH_SECRET'
  ) {
    return { text: 'מוגדר — מוסתר (סוד / טוקן)', kind: 'masked' };
  }

  if (
    (ku.includes('_KEY') || ku.includes('API_KEY')) &&
    !ku.startsWith('NEXT_PUBLIC') &&
    !ku.includes('PUBLIC_KEY')
  ) {
    return { text: 'מוגדר — מוסתר (מפתח API)', kind: 'masked' };
  }

  if (ku.includes('WEB_PUSH_PRIVATE_KEY')) {
    return { text: 'מוגדר — מוסתר (מפתח פרטי)', kind: 'masked' };
  }

  if (ku.includes('WEB_PUSH') && (ku.includes('PUBLIC') || ku.includes('PUBLIC_KEY'))) {
    const t = raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
    return { text: t, kind: 'plain' };
  }

  if (
    ku.includes('CLOUD_NAME') ||
    ku === 'MONGODB_DB' ||
    ku.includes('TWILIO_FROM') ||
    ku.includes('TWILIO_PHONE') ||
    ku.includes('WHATSAPP_NUMBER')
  ) {
    const t = raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
    return { text: t, kind: 'plain' };
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      if (u.username || u.password) {
        return { text: 'מוגדר — URL עם הרשאות מוסתר', kind: 'masked' };
      }
      const t = raw.length > 200 ? `${raw.slice(0, 200)}…` : raw;
      return { text: t, kind: 'plain' };
    } catch {
      return { text: 'מוגדר — לא מוצג (רגיש)', kind: 'masked' };
    }
  }

  if (ku.includes('SID') && ku.includes('TWILIO')) {
    return { text: 'מוגדר — מזהה חשבון מוסתר', kind: 'masked' };
  }

  if (ku.includes('USERNAME') && !ku.includes('PASSWORD')) {
    const t = raw.length > 96 ? `${raw.slice(0, 96)}…` : raw;
    return { text: t, kind: 'plain' };
  }

  return { text: 'מוגדר — לא מוצג (רגיש)', kind: 'masked' };
}

/**
 * @param {Record<string, object>} results
 */
function enrichResultsWithEnvHints(results) {
  const out = {};
  for (const [serviceKey, val] of Object.entries(results)) {
    const def = SERVICE_ENV_CHECKLISTS[serviceKey];
    if (!def || !val || typeof val !== 'object') {
      out[serviceKey] = val;
      continue;
    }

    const rawVars = def.vars || [];
    const vars = rawVars.map((entry) => {
      const { raw, usedKey } = getResolvedEnvRaw(entry);
      const present = Boolean(raw && raw.length);
      const preview = present && usedKey ? buildSafeValuePreview(usedKey, raw) : null;
      return {
        key: entry.key,
        alt: entry.alt || null,
        optional: Boolean(entry.optional),
        present,
        resolvedKey: usedKey,
        valuePreview: preview?.text || null,
        valuePreviewKind: preview?.kind || null,
      };
    });

    let anyOfOk = null;
    if (def.anyOf && rawVars.length > 0) {
      anyOfOk = vars.some((v) => v.present);
    }

    out[serviceKey] = {
      ...val,
      envChecklist: {
        vars,
        note: def.note || null,
        anyOf: Boolean(def.anyOf),
        anyOfOk,
      },
    };
  }
  return out;
}

const CONNECTION_LOG_DEDUP_MS = 15 * 60 * 1000;
const DEEP_SCAN_URL = '/api/admin/system-status?deep=1';

// Helper to check if user is admin
async function checkAdmin(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  // Check both auth_token and legacy token cookies
  const authTokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
  const legacyTokenMatch = cookieHeader.match(/token=([^;]+)/);
  const tokenValue = authTokenMatch?.[1] || legacyTokenMatch?.[1];
  
  if (!tokenValue) return null;
  
  try {
    const { jwtVerify } = await import('jose');
    if (!process.env.JWT_SECRET) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(decodeURIComponent(tokenValue), secret);
    if (payload.role !== 'admin' && payload.role !== 'super_admin') return null;
    return payload;
  } catch {
    return null;
  }
}

// Check MongoDB connection
function mapMongoStatusError(error) {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || 'MongoDB check failed');
  const normalizedMessage = message.toLowerCase();

  if (code === 'MONGO_CIRCUIT_OPEN' || normalizedMessage.includes('mongo_circuit_open')) {
    return {
      status: 'warning',
      code: 'MONGO_CIRCUIT_OPEN',
      message: 'MongoDB circuit פתוח זמנית אחרי כשלי תקשורת - יתבצע ניסיון חוזר בעוד מספר שניות',
    };
  }

  if (code === '18' || normalizedMessage.includes('authentication failed')) {
    return {
      status: 'error',
      code: 'MONGO_AUTH_FAILED',
      message: 'MongoDB דחה את ההתחברות (authentication failed) - יש לבדוק משתמש/סיסמה',
    };
  }

  if (
    normalizedMessage.includes('replicasetnoprimary') ||
    normalizedMessage.includes('server selection timed out') ||
    normalizedMessage.includes('failed to connect') ||
    normalizedMessage.includes('enotfound') ||
    normalizedMessage.includes('etimedout')
  ) {
    return {
      status: 'error',
      code: 'MONGO_CONNECTIVITY_FAILED',
      message: 'MongoDB לא נגיש כרגע (network/topology) - יש לבדוק Atlas DNS/cluster/network access',
    };
  }

  return {
    status: 'error',
    code: code || 'MONGO_UNKNOWN_ERROR',
    message,
  };
}

async function checkMongoDB() {
  try {
    const { getDb } = await import('@/lib/db');
    const db = await getDb();
    if (!db) {
      return {
        status: 'error',
        code: 'MONGO_DB_NULL',
        message: 'MongoDB לא מחובר - בדוק MONGODB_URI, MONGODB_DB והרשאות גישה',
      };
    }
    await db.command({ ping: 1 });
    return { status: 'connected', message: 'MongoDB מחובר ופעיל' };
  } catch (error) {
    return mapMongoStatusError(error);
  }
}

// Check if environment variable exists
function checkEnvVar(varName) {
  const value = process.env[varName];
  return value && value.length > 0;
}

// Check GitHub (just verify env var exists)
function checkGitHub() {
  // GitHub doesn't need API key for public repos
  return { status: 'connected', message: 'GitHub זמין' };
}

// Check Vercel (deployment platform - always accessible via web)
async function checkVercel() {
  const isOnVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
  const env = process.env.VERCEL_ENV || 'unknown';
  const url = process.env.VERCEL_URL || '';
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || '';
  const commitRef = process.env.VERCEL_GIT_COMMIT_REF || '';

  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (token && projectId) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://api.vercel.com/v13/deployments?projectId=${encodeURIComponent(projectId)}&limit=1`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return { status: isOnVercel ? 'warning' : 'error', message: `Vercel API error (${res.status})` };
      }

      const data = await res.json().catch(() => null);
      const deployment = data?.deployments?.[0];
      const state = deployment?.state || 'unknown';
      const createdAt = deployment?.createdAt ? new Date(deployment.createdAt).toISOString() : null;

      if (state === 'READY') {
        return { status: 'connected', message: `Vercel (${env}) READY${commitSha ? ` ${commitSha.slice(0, 7)}` : ''}${createdAt ? ` @ ${createdAt}` : ''}` };
      }
      if (state === 'ERROR') {
        return { status: 'error', message: `Vercel (${env}) ERROR${createdAt ? ` @ ${createdAt}` : ''}` };
      }
      return { status: 'warning', message: `Vercel (${env}) ${state}${createdAt ? ` @ ${createdAt}` : ''}` };
    } catch (e) {
      return { status: isOnVercel ? 'warning' : 'error', message: `Vercel API unreachable${e?.name ? ` (${e.name})` : ''}` };
    }
  }

  if (!isOnVercel) {
    return { status: 'warning', message: 'Vercel לא מזוהה (לא רץ על Vercel / חסר env)' };
  }

  return {
    status: 'connected',
    message: `Vercel (${env})${url ? ` ${url}` : ''}${commitSha ? ` ${commitSha.slice(0, 7)}` : ''}${commitRef ? ` (${commitRef})` : ''}`,
  };
}


// Check Cloudinary - actual connection test
async function checkCloudinary() {
  const hasCloudName = checkEnvVar('CLOUDINARY_CLOUD_NAME') || checkEnvVar('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
  const hasApiKey = checkEnvVar('CLOUDINARY_API_KEY');
  const hasApiSecret = checkEnvVar('CLOUDINARY_API_SECRET');
  
  if (!hasCloudName) {
    return { status: 'error', message: 'CLOUDINARY_CLOUD_NAME לא מוגדר' };
  }
  
  if (!hasApiKey || !hasApiSecret) {
    return { status: 'warning', message: 'Cloudinary מוגדר חלקית - חסרים API_KEY או API_SECRET' };
  }
  
  // Try actual connection
  try {
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    await cloudinary.api.ping();
    return { status: 'connected', message: 'Cloudinary מחובר ופעיל' };
  } catch (error) {
    return { status: 'warning', message: 'Cloudinary מוגדר אך לא ניתן לאמת חיבור' };
  }
}


// Check Twilio - for SMS/WhatsApp OTP
function checkTwilio() {
  const hasSid = checkEnvVar('TWILIO_ACCOUNT_SID');
  const hasToken = checkEnvVar('TWILIO_AUTH_TOKEN');
  const hasPhone = checkEnvVar('TWILIO_FROM_NUMBER') || checkEnvVar('TWILIO_PHONE_NUMBER');
  
  if (!hasSid && !hasToken) {
    return { status: 'warning', message: 'Twilio לא מוגדר - קודי OTP יודפסו בקונסול' };
  }
  
  if (!hasSid) {
    return { status: 'error', message: 'TWILIO_ACCOUNT_SID חסר' };
  }
  
  if (!hasToken) {
    return { status: 'error', message: 'TWILIO_AUTH_TOKEN חסר' };
  }
  
  if (!hasPhone) {
    return { status: 'warning', message: 'TWILIO_FROM_NUMBER חסר - לא ניתן לשלוח SMS' };
  }
  
  return { status: 'connected', message: 'Twilio מוגדר - SMS/WhatsApp פעיל' };
}

// Check Resend - for email sending
function checkResend() {
  const hasApiKey = checkEnvVar('RESEND_API_KEY');
  if (!hasApiKey) {
    return { status: 'error', message: 'RESEND_API_KEY לא מוגדר - שליחת אימיילים לא תעבוד' };
  }
  return { status: 'connected', message: 'Resend מוגדר - שליחת אימיילים פעילה' };
}

// Check NPM (always available)
function checkNPM() {
  return { status: 'connected', message: 'NPM זמין' };
}

/** SendGrid — אופציונלי אם Resend הוא ספק המייל הראשי */
function checkSendGrid() {
  if (checkEnvVar('SENDGRID_API_KEY')) {
    return { status: 'connected', message: 'SendGrid מוגדר' };
  }
  if (checkEnvVar('RESEND_API_KEY')) {
    return { status: 'warning', message: 'SendGrid לא בשימוש (מיילים דרך Resend)' };
  }
  return { status: 'warning', message: 'SendGrid לא מוגדר — אופציונלי אם לא נדרש' };
}

/** Google OAuth דרך NextAuth (התחברות עם Google) */
function checkGoogleOAuth() {
  const id = checkEnvVar('GOOGLE_CLIENT_ID');
  const secret = checkEnvVar('GOOGLE_CLIENT_SECRET');
  if (id && secret) {
    return { status: 'connected', message: 'Google OAuth מוגדר (התחברות Google)' };
  }
  if (!id && !secret) {
    return { status: 'warning', message: 'Google OAuth לא מוגדר — התחברות Google לא תעבוד' };
  }
  return { status: 'warning', message: 'Google OAuth חלקי — חסר GOOGLE_CLIENT_ID או GOOGLE_CLIENT_SECRET' };
}

/** מפתחות אימות אפליקציה */
function checkAuthSecrets() {
  const jwt = String(process.env.JWT_SECRET || '').trim();
  const na = String(process.env.NEXTAUTH_SECRET || '').trim();
  if (!jwt && !na) {
    return { status: 'error', message: 'JWT_SECRET ו-NEXTAUTH_SECRET חסרים — אימות לא יעבוד' };
  }
  const longest = Math.max(jwt.length, na.length);
  if (longest > 0 && longest < 32) {
    return { status: 'warning', message: 'מפתח אימות קצר מ-32 תווים (מומלץ בפרודקשן)' };
  }
  return { status: 'connected', message: 'מפתחות JWT / NextAuth מוגדרים' };
}

/** Web Push (VAPID) */
function checkWebPush() {
  const pub =
    checkEnvVar('WEB_PUSH_PUBLIC_KEY') ||
    checkEnvVar('NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY');
  const priv = checkEnvVar('WEB_PUSH_PRIVATE_KEY');
  if (pub && priv) {
    return { status: 'connected', message: 'Web Push (VAPID) מוגדר' };
  }
  if (!pub && !priv) {
    return { status: 'warning', message: 'Web Push לא מוגדר — התראות דחיפה לא זמינות' };
  }
  return { status: 'warning', message: 'Web Push חלקי — חסר מפתח ציבורי או פרטי' };
}

/** Google Ads — לרוב יש גם הגדרה בממשק; כאן בודקים env */
function checkGoogleAdsEnv() {
  const id = checkEnvVar('GOOGLE_ADS_CLIENT_ID');
  const secret = checkEnvVar('GOOGLE_ADS_CLIENT_SECRET');
  const dev = checkEnvVar('GOOGLE_ADS_DEVELOPER_TOKEN');
  if (id && secret && dev) {
    return { status: 'connected', message: 'Google Ads API מוגדר ב-env' };
  }
  if (!id && !secret && !dev) {
    return {
      status: 'warning',
      message: 'Google Ads לא ב-env — ניתן להגדיר בטאב אינטגרציות',
    };
  }
  return { status: 'warning', message: 'Google Ads חלקי ב-env — השלם Client / Developer Token' };
}

/** SSO לסטודיו / אימג׳ סטודיו */
function checkStudioSso() {
  if (checkEnvVar('STUDIO_SSO_SECRET')) {
    return { status: 'connected', message: 'Studio SSO (STUDIO_SSO_SECRET) מוגדר' };
  }
  if (checkEnvVar('JWT_SECRET')) {
    return {
      status: 'warning',
      message: 'Studio SSO משתמש ב-JWT_SECRET (מומלץ STUDIO_SSO_SECRET נפרד)',
    };
  }
  return { status: 'warning', message: 'אין STUDIO_SSO_SECRET — SSO לסטודיו עלול לא לעבוד' };
}

/** כתובת אתר ציבורית לקישורים ו-SEO */
function checkPublicSiteUrl() {
  const url = String(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || '',
  ).trim();
  if (!url) {
    return {
      status: 'warning',
      message: 'NEXT_PUBLIC_SITE_URL / BASE_URL חסר — קישורים בדוא״ל ו-SEO עלולים להיות שגויים',
    };
  }
  return { status: 'connected', message: `כתובת ציבורית: ${url}` };
}

/** Google Ads — בריאות אינטגרציה מול DB (lib/googleAdsService) */
async function checkGoogleAds() {
  try {
    const { getDb } = await import('@/lib/db');
    const db = await getDb();
    if (!db) {
      return { status: 'warning', message: 'Google Ads — לא ניתן לבדוק (אין חיבור למסד נתונים)' };
    }
    const { getGoogleAdsIntegrationHealth } = await import('@/lib/googleAdsService');
    return await getGoogleAdsIntegrationHealth(db);
  } catch (e) {
    return { status: 'warning', message: `Google Ads — ${e?.message || 'בדיקה נכשלה'}` };
  }
}

// Check Priority ERP
function checkPriority() {
  const hasUrl = checkEnvVar('PRIORITY_API_URL') || checkEnvVar('PRIORITY_BASE_URL');
  const hasUser = checkEnvVar('PRIORITY_USERNAME') || checkEnvVar('PRIORITY_CLIENT_ID');
  const hasPass = checkEnvVar('PRIORITY_PASSWORD') || checkEnvVar('PRIORITY_CLIENT_SECRET');
  
  if (!hasUrl) {
    return { status: 'error', message: 'Priority לא מוגדר - אין URL' };
  }
  
  if (!hasUser || !hasPass) {
    return { status: 'warning', message: 'Priority מוגדר חלקית - חסרים פרטי אימות' };
  }
  
  return { status: 'connected', message: 'Priority ERP מוגדר ופעיל' };
}

// Check WhatsApp connection
async function checkWhatsApp() {
  const hasTwilioWhatsApp = checkEnvVar('TWILIO_WHATSAPP_NUMBER');
  const hasWhatsAppServer = checkEnvVar('WHATSAPP_SERVER_URL');
  
  // Check if WhatsApp server is running
  if (hasWhatsAppServer) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${process.env.WHATSAPP_SERVER_URL}/status`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        return { status: 'connected', message: 'WhatsApp Server מחובר ופעיל' };
      }
      return { status: 'warning', message: 'WhatsApp Server לא מגיב' };
    } catch {
      return { status: 'warning', message: 'WhatsApp Server לא זמין' };
    }
  }
  
  if (hasTwilioWhatsApp) {
    return { status: 'connected', message: 'WhatsApp דרך Twilio מוגדר' };
  }
  
  return { status: 'error', message: 'WhatsApp לא מוגדר' };
}

// Check PayPlus - payment gateway
function checkPayPlus() {
  const hasApiKey = checkEnvVar('PAYPLUS_API_KEY');
  const hasSecret = checkEnvVar('PAYPLUS_SECRET');
  const hasBaseUrl = checkEnvVar('PAYPLUS_BASE_URL');
  const isMockEnabled = process.env.PAYPLUS_MOCK_ENABLED === 'true';
  
  if (isMockEnabled) {
    return { status: 'warning', message: 'PayPlus במצב דמו - תשלומים לא אמיתיים' };
  }
  
  if (!hasApiKey || !hasSecret) {
    return { status: 'error', message: 'PayPlus לא מוגדר - סליקה לא תעבוד' };
  }
  
  if (!hasBaseUrl) {
    return { status: 'warning', message: 'PAYPLUS_BASE_URL חסר' };
  }
  
  return { status: 'connected', message: 'PayPlus מוגדר - סליקת אשראי פעילה' };
}

function parseBoolean(input) {
  if (typeof input !== 'string') return false;
  return ['1', 'true', 'yes', 'y', 'on'].includes(input.trim().toLowerCase());
}

function normalizeStatus(status) {
  if (status === 'connected' || status === 'warning' || status === 'error') {
    return status;
  }
  return 'error';
}

function normalizeCheckResult(result, fallbackMessage) {
  if (!result || typeof result !== 'object') {
    return {
      status: 'error',
      message: fallbackMessage,
    };
  }

  const normalized = {
    status: normalizeStatus(result.status),
    message: result.message || fallbackMessage,
  };

  if (result.code) normalized.code = result.code;
  if (typeof result.durationMs === 'number') normalized.durationMs = result.durationMs;
  if (result.checkedAt) normalized.checkedAt = result.checkedAt;
  if (result.details !== undefined) normalized.details = result.details;

  return normalized;
}

async function timedCheck(serviceKey, checkFn) {
  const startedAt = Date.now();

  try {
    const result = await checkFn();
    return normalizeCheckResult(
      {
        ...result,
        durationMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      },
      `${serviceKey} deep scan failed`,
    );
  } catch (error) {
    const safeKey = String(serviceKey || 'service').toUpperCase().replace(/[^A-Z0-9]/g, '_');
    return {
      status: 'error',
      code: `${safeKey}_CHECK_FAILED`,
      message: error?.message || `${serviceKey} deep scan failed`,
      durationMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    };
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || DEEP_SCAN_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timeout);
  }
}

function buildDeepSummary(results) {
  const services = Object.values(results || {});
  const summary = {
    total: services.length,
    connected: 0,
    warning: 0,
    error: 0,
  };

  for (const service of services) {
    const status = normalizeStatus(service?.status);
    if (status === 'connected') summary.connected += 1;
    else if (status === 'warning') summary.warning += 1;
    else summary.error += 1;
  }

  return summary;
}

function collectConnectionIssues(results) {
  return Object.entries(results || {})
    .filter(([, value]) => value && normalizeStatus(value.status) !== 'connected')
    .map(([service, value]) => ({
      service,
      status: normalizeStatus(value.status),
      level: normalizeStatus(value.status) === 'error' ? 'error' : 'warn',
      message: value.message || `${service} connection issue`,
      code: value.code || null,
      durationMs: typeof value.durationMs === 'number' ? value.durationMs : null,
      checkedAt: value.checkedAt || null,
    }));
}

async function persistConnectionIssues(issues, user, scanMeta) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return { inserted: 0, deduplicated: 0 };
  }

  try {
    const { getDb } = await import('@/lib/db');
    const db = await getDb();
    if (!db) {
      return { inserted: 0, deduplicated: 0 };
    }

    const logsCol = db.collection('error_logs');
    const dedupCutoff = new Date(Date.now() - CONNECTION_LOG_DEDUP_MS);
    let inserted = 0;
    let deduplicated = 0;

    for (const issue of issues) {
      const source = `integration_scan:${issue.service}`;
      const duplicate = await logsCol.findOne({
        source,
        message: issue.message,
        resolved: false,
        createdAt: { $gte: dedupCutoff },
      });

      if (duplicate) {
        deduplicated += 1;
        continue;
      }

      await logsCol.insertOne({
        level: issue.level,
        message: issue.message,
        source,
        stack: null,
        url: DEEP_SCAN_URL,
        userId: user?.id || user?.sub || null,
        metadata: {
          service: issue.service,
          status: issue.status,
          code: issue.code,
          durationMs: issue.durationMs,
          checkedAt: issue.checkedAt,
          scanId: scanMeta.runId,
          scanStartedAt: scanMeta.startedAt,
        },
        resolved: false,
        resolvedAt: null,
        resolvedBy: null,
        createdAt: new Date(),
      });

      inserted += 1;
    }

    return { inserted, deduplicated };
  } catch (error) {
    console.error('Failed to persist integration scan issues:', error);
    return { inserted: 0, deduplicated: 0 };
  }
}

async function deepCheckMongoDB() {
  return timedCheck('mongodb', async () => {
    const base = await checkMongoDB();
    if (base.status !== 'connected') {
      return {
        ...base,
        details: {
          pingOk: false,
        },
      };
    }

    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      const [stats, collections] = await Promise.all([
        db.stats().catch(() => null),
        db.listCollections().toArray().catch(() => []),
      ]);

      return {
        status: 'connected',
        message: 'MongoDB מחובר ופעיל',
        details: {
          pingOk: true,
          dbName: stats?.db || null,
          collections: Array.isArray(collections) ? collections.length : null,
          objects: typeof stats?.objects === 'number' ? stats.objects : null,
        },
      };
    } catch (error) {
      return {
        status: 'warning',
        code: 'MONGO_STATS_UNAVAILABLE',
        message: 'MongoDB מחובר אך סטטיסטיקות עומק אינן זמינות כרגע',
        details: {
          pingOk: true,
          error: error?.message || null,
        },
      };
    }
  });
}

async function deepCheckPayPlus() {
  return timedCheck('payplus', async () => {
    const { getPayPlusConfig } = await import('@/lib/payplus/config');
    const cfg = getPayPlusConfig({ strict: false });

    const details = {
      configured: cfg.isConfigured,
      missing: cfg.missing || [],
      mockEnabled: cfg.mockEnabled || false,
      baseUrl: cfg.baseUrl || null,
    };

    if (!cfg.isConfigured) {
      return {
        status: 'error',
        code: 'PAYPLUS_MISSING_CONFIG',
        message: `PayPlus לא מוגדר: ${(cfg.missing || []).join(', ')}`,
        details,
      };
    }

    let endpointReachable = false;
    let endpointStatus = null;
    let endpointError = null;

    try {
      const endpointRes = await fetchWithTimeout(cfg.baseUrl, { timeoutMs: DEEP_SCAN_TIMEOUT_MS });
      endpointReachable = true;
      endpointStatus = endpointRes.status;
    } catch (error) {
      endpointError = error?.name === 'AbortError' ? 'timeout' : (error?.message || 'request_failed');
    }

    details.endpointReachable = endpointReachable;
    details.endpointStatus = endpointStatus;
    details.endpointError = endpointError;

    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      if (db) {
        const eventsCol = db.collection('paymentevents');
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [total24h, failed24h, deadLetters] = await Promise.all([
          eventsCol.countDocuments({ createdAt: { $gte: since } }),
          eventsCol.countDocuments({ createdAt: { $gte: since }, status: 'failed' }),
          eventsCol.countDocuments({ inDeadLetter: true }),
        ]);

        details.paymentStats = {
          total24h,
          failed24h,
          deadLetters,
        };
      }
    } catch {
      details.paymentStats = {
        total24h: null,
        failed24h: null,
        deadLetters: null,
      };
    }

    if (!endpointReachable) {
      return {
        status: 'error',
        code: 'PAYPLUS_ENDPOINT_UNREACHABLE',
        message: 'PayPlus מוגדר אך נקודת הקצה לא נגישה',
        details,
      };
    }

    if (cfg.mockEnabled) {
      return {
        status: 'warning',
        code: 'PAYPLUS_MOCK_ENABLED',
        message: 'PayPlus במצב דמו - יש להפעיל סביבת סליקה אמיתית',
        details,
      };
    }

    const total24h = details.paymentStats?.total24h || 0;
    const failed24h = details.paymentStats?.failed24h || 0;
    const failedRatio = total24h > 0 ? failed24h / total24h : 0;

    if (total24h > 0 && failedRatio >= 0.25) {
      return {
        status: 'warning',
        code: 'PAYPLUS_HIGH_FAILURE_RATIO',
        message: `זוהה שיעור גבוה של כשלי PayPlus ב-24 שעות האחרונות (${Math.round(failedRatio * 100)}%)`,
        details,
      };
    }

    return {
      status: 'connected',
      message: 'PayPlus מחובר ונגיש בסריקה עמוקה',
      details,
    };
  });
}

async function deepCheckPriority() {
  return timedCheck('priority', async () => {
    const { validatePriorityConfig } = await import('@/lib/priority/config');
    const validation = validatePriorityConfig();

    const details = {
      configured: validation.ok,
      missing: validation.missing || [],
    };

    if (!validation.ok) {
      return {
        status: 'warning',
        code: 'PRIORITY_MISSING_CONFIG',
        message: `Priority מוגדר חלקית: ${(validation.missing || []).join(', ')}`,
        details,
      };
    }

    const { getPriorityClient } = await import('@/lib/priority/client');
    const client = getPriorityClient(true);
    const connectionTest = client
      ? await client.testConnection()
      : { connected: false, message: 'Priority client unavailable' };

    details.connectionMessage = connectionTest.message;

    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      if (db) {
        const grouped = await db.collection('integrationsyncmaps').aggregate([
          { $group: { _id: '$syncStatus', count: { $sum: 1 } } },
        ]).toArray();

        details.syncStats = grouped.reduce((acc, item) => {
          if (item?._id) {
            acc[item._id] = item.count;
          }
          return acc;
        }, {});
      }
    } catch {
      details.syncStats = null;
    }

    if (!connectionTest.connected) {
      return {
        status: 'error',
        code: 'PRIORITY_CONNECTION_FAILED',
        message: connectionTest.message || 'Priority חיבור נכשל',
        details,
      };
    }

    if ((details.syncStats?.failed || 0) > 0) {
      return {
        status: 'warning',
        code: 'PRIORITY_SYNC_FAILURES',
        message: `Priority מחובר אך קיימים ${details.syncStats.failed} סנכרונים שנכשלו`,
        details,
      };
    }

    return {
      status: 'connected',
      message: 'Priority מחובר ותקין בסריקה עמוקה',
      details,
    };
  });
}

async function deepCheckWhatsApp() {
  return timedCheck('whatsapp', async () => {
    const hasTwilioWhatsApp = checkEnvVar('TWILIO_WHATSAPP_NUMBER');
    const hasWhatsAppServer = checkEnvVar('WHATSAPP_SERVER_URL');
    const result = await checkWhatsApp();

    return {
      ...result,
      details: {
        hasTwilioWhatsApp,
        hasWhatsAppServer,
      },
    };
  });
}

async function deepCheckCloudinary() {
  return timedCheck('cloudinary', async () => {
    const result = await checkCloudinary();
    return {
      ...result,
      details: {
        hasCloudName: checkEnvVar('CLOUDINARY_CLOUD_NAME') || checkEnvVar('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME'),
        hasApiKey: checkEnvVar('CLOUDINARY_API_KEY'),
        hasApiSecret: checkEnvVar('CLOUDINARY_API_SECRET'),
      },
    };
  });
}

async function deepCheckVercel() {
  return timedCheck('vercel', async () => checkVercel());
}

async function deepCheckGitHub() {
  return timedCheck('github', async () => {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_PAT;

    if (!token) {
      return {
        status: 'warning',
        code: 'GITHUB_TOKEN_MISSING',
        message: 'GitHub זמין אך ללא טוקן API לא ניתן לבצע בדיקת עומק מלאה',
      };
    }

    const res = await fetchWithTimeout('https://api.github.com/rate_limit', {
      timeoutMs: DEEP_SCAN_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'vipo-integrations-scan',
      },
    });

    if (res.ok) {
      const payload = await res.json().catch(() => null);
      return {
        status: 'connected',
        message: 'GitHub API זמין',
        details: {
          remaining: payload?.resources?.core?.remaining ?? null,
          resetAt: payload?.resources?.core?.reset
            ? new Date(payload.resources.core.reset * 1000).toISOString()
            : null,
        },
      };
    }

    if (res.status === 401) {
      return {
        status: 'error',
        code: 'GITHUB_AUTH_FAILED',
        message: 'GitHub token לא תקין (401)',
      };
    }

    if (res.status === 403) {
      return {
        status: 'warning',
        code: 'GITHUB_RATE_LIMITED',
        message: 'GitHub API החזיר 403 (ייתכן rate limit)',
      };
    }

    return {
      status: 'warning',
      code: 'GITHUB_API_UNEXPECTED_STATUS',
      message: `GitHub API החזיר סטטוס ${res.status}`,
    };
  });
}

async function deepCheckResend() {
  return timedCheck('resend', async () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return checkResend();
    }

    const res = await fetchWithTimeout('https://api.resend.com/domains', {
      timeoutMs: DEEP_SCAN_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (res.ok) {
      return {
        status: 'connected',
        message: 'Resend מחובר ופעיל',
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        status: 'error',
        code: 'RESEND_AUTH_FAILED',
        message: `Resend auth failed (${res.status})`,
      };
    }

    return {
      status: 'warning',
      code: 'RESEND_API_UNEXPECTED_STATUS',
      message: `Resend API החזיר סטטוס ${res.status}`,
    };
  });
}

async function deepCheckTwilio() {
  return timedCheck('twilio', async () => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const baseStatus = checkTwilio();

    if (!sid || !token) {
      return baseStatus;
    }

    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const res = await fetchWithTimeout(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}.json`, {
      timeoutMs: DEEP_SCAN_TIMEOUT_MS,
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (res.ok) {
      const payload = await res.json().catch(() => null);
      if (baseStatus.status === 'warning') {
        return {
          ...baseStatus,
          details: {
            accountStatus: payload?.status || null,
          },
        };
      }

      return {
        status: 'connected',
        message: 'Twilio API זמין ומאומת',
        details: {
          accountStatus: payload?.status || null,
        },
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        status: 'error',
        code: 'TWILIO_AUTH_FAILED',
        message: `Twilio auth failed (${res.status})`,
      };
    }

    return {
      status: 'warning',
      code: 'TWILIO_API_UNEXPECTED_STATUS',
      message: `Twilio API החזיר סטטוס ${res.status}`,
    };
  });
}

async function deepCheckNpm() {
  return timedCheck('npm', async () => {
    const res = await fetchWithTimeout('https://registry.npmjs.org/npm', {
      timeoutMs: DEEP_SCAN_TIMEOUT_MS,
    });

    if (res.ok) {
      return {
        status: 'connected',
        message: 'NPM Registry זמין',
      };
    }

    return {
      status: 'warning',
      code: 'NPM_REGISTRY_UNEXPECTED_STATUS',
      message: `NPM Registry החזיר סטטוס ${res.status}`,
    };
  });
}

async function deepCheckSendGrid() {
  return timedCheck('sendgrid', async () => checkSendGrid());
}

async function deepCheckGoogleOAuth() {
  return timedCheck('googleOAuth', async () => checkGoogleOAuth());
}

async function deepCheckAuthSecrets() {
  return timedCheck('authSecrets', async () => checkAuthSecrets());
}

async function deepCheckWebPush() {
  return timedCheck('webPush', async () => checkWebPush());
}

async function deepCheckGoogleAdsEnv() {
  return timedCheck('googleAdsEnv', async () => checkGoogleAdsEnv());
}

async function deepCheckStudioSso() {
  return timedCheck('studioSso', async () => checkStudioSso());
}

async function deepCheckPublicSiteUrl() {
  return timedCheck('publicSite', async () => checkPublicSiteUrl());
}

async function deepCheckGoogleAds() {
  return timedCheck('googleAds', async () => {
    const base = await checkGoogleAds();
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      if (!db) {
        return { ...base, details: { dbAvailable: false } };
      }
      const { getGoogleAdsStatus } = await import('@/lib/googleAdsService');
      const st = await getGoogleAdsStatus(db);
      return {
        ...base,
        details: {
          ...(base.details || {}),
          dbAvailable: true,
          configured: st.configured,
          connected: st.connected,
          lastSyncAt: st.lastSyncAt,
        },
      };
    } catch {
      return base;
    }
  });
}

async function runQuickChecks() {
  const [mongoResult, googleAdsResult] = await Promise.all([checkMongoDB(), checkGoogleAds()]);

  const [cloudinaryResult, whatsappResult, vercelResult] = await Promise.all([
    checkCloudinary(),
    checkWhatsApp(),
    checkVercel(),
  ]);

  return {
    mongodb: mongoResult,
    googleAds: googleAdsResult,
    payplus: checkPayPlus(),
    priority: checkPriority(),
    whatsapp: whatsappResult,
    cloudinary: cloudinaryResult,
    vercel: vercelResult,
    github: checkGitHub(),
    resend: checkResend(),
    twilio: checkTwilio(),
    npm: checkNPM(),
    sendgrid: checkSendGrid(),
    googleOAuth: checkGoogleOAuth(),
    authSecrets: checkAuthSecrets(),
    webPush: checkWebPush(),
    googleAdsEnv: checkGoogleAdsEnv(),
    studioSso: checkStudioSso(),
    publicSite: checkPublicSiteUrl(),
  };
}

async function runDeepChecks(user) {
  const startedAt = new Date();
  const runId = `DEEP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

  const [
    mongodb,
    payplus,
    priority,
    whatsapp,
    cloudinary,
    vercel,
    github,
    resend,
    twilio,
    npm,
    sendgrid,
    googleOAuth,
    authSecrets,
    webPush,
    googleAdsEnv,
    studioSso,
    publicSite,
    googleAds,
  ] = await Promise.all([
    deepCheckMongoDB(),
    deepCheckPayPlus(),
    deepCheckPriority(),
    deepCheckWhatsApp(),
    deepCheckCloudinary(),
    deepCheckVercel(),
    deepCheckGitHub(),
    deepCheckResend(),
    deepCheckTwilio(),
    deepCheckNpm(),
    deepCheckSendGrid(),
    deepCheckGoogleOAuth(),
    deepCheckAuthSecrets(),
    deepCheckWebPush(),
    deepCheckGoogleAdsEnv(),
    deepCheckStudioSso(),
    deepCheckPublicSiteUrl(),
    deepCheckGoogleAds(),
  ]);

  const services = {
    mongodb,
    payplus,
    priority,
    whatsapp,
    cloudinary,
    vercel,
    github,
    resend,
    twilio,
    npm,
    sendgrid,
    googleOAuth,
    authSecrets,
    webPush,
    googleAdsEnv,
    studioSso,
    publicSite,
    googleAds,
  };

  const issues = collectConnectionIssues(services);
  const logResult = await persistConnectionIssues(issues, user, {
    runId,
    startedAt: startedAt.toISOString(),
  });

  const completedAt = new Date();
  const summary = buildDeepSummary(services);

  return {
    services,
    runId,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - startedAt.getTime(),
    summary: {
      ...summary,
      issues: issues.length,
      logged: logResult.inserted,
      deduplicated: logResult.deduplicated,
    },
    issues: issues.map((issue) => ({
      service: issue.service,
      status: issue.status,
      level: issue.level,
      message: issue.message,
      code: issue.code,
    })),
  };
}

async function GETHandler(req) {
  const rateLimit = rateLimiters.admin(req);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.message }, { status: 429 });
  }

  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const mode = String(searchParams.get('mode') || '').toLowerCase();
    const deepRequested = parseBoolean(searchParams.get('deep')) || mode === 'deep';

    if (deepRequested) {
      const deepScan = await runDeepChecks(user);

      const enrichedDeep = enrichResultsWithEnvHints(deepScan.services);

      return NextResponse.json({
        success: true,
        mode: 'deep',
        results: enrichedDeep,
        meta: {
          health: buildHealthMeta(enrichedDeep),
          runtime: buildRuntimeMeta(),
          counts: countConnectionStatuses(enrichedDeep),
        },
        deepScan: {
          runId: deepScan.runId,
          startedAt: deepScan.startedAt,
          completedAt: deepScan.completedAt,
          durationMs: deepScan.durationMs,
          summary: deepScan.summary,
          issues: deepScan.issues,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const results = await runQuickChecks();
    const enriched = enrichResultsWithEnvHints(results);

    return NextResponse.json({
      success: true,
      mode: 'quick',
      results: enriched,
      meta: {
        health: buildHealthMeta(enriched),
        runtime: buildRuntimeMeta(),
        counts: countConnectionStatuses(enriched),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking system status:', error);
    return NextResponse.json({ error: 'Failed to check system status' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
