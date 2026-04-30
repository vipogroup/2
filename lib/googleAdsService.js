import crypto from 'crypto';
import { decryptSecret, encryptSecret } from '@/lib/googleAdsCrypto';

const SETTINGS_COLLECTION = 'settings';
const CONFIG_KEY = 'google_ads_config';
const OAUTH_KEY = 'google_ads_oauth';
const OAUTH_STATE_KEY = 'google_ads_oauth_state';
const SNAPSHOT_KEY = 'google_ads_snapshot';

function keyedDoc(value) {
  return {
    value,
    updatedAt: new Date(),
  };
}

async function getKeyValue(db, key) {
  const doc = await db.collection(SETTINGS_COLLECTION).findOne({ key });
  return doc?.value || {};
}

async function setKeyValue(db, key, value) {
  await db.collection(SETTINGS_COLLECTION).updateOne(
    { key },
    {
      $set: {
        key,
        ...keyedDoc(value),
      },
    },
    { upsert: true },
  );
}

function getOriginFromReq(req) {
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  return `${proto}://${host}`;
}

/** Callback URL derived from public site env (same pattern as rest of the app). */
function deriveGoogleAdsRedirectFromSiteEnv() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || '').trim();
  if (!base) return '';
  try {
    const u = new URL(base.startsWith('http') ? base : `https://${base}`);
    return `${u.origin}/api/admin/google-ads/callback`;
  } catch {
    return '';
  }
}

/**
 * Precedence: GOOGLE_ADS_REDIRECT_URI → callback from NEXT_PUBLIC_* → MongoDB saved.
 * Prevents a stale saved.redirectUri from overriding the canonical site URL after Cloud/Vercel updates.
 */
function resolveGoogleAdsRedirectPreference(saved) {
  const envR = String(process.env.GOOGLE_ADS_REDIRECT_URI || '').trim();
  if (envR) {
    return { redirectUri: envR, resolution: 'env' };
  }
  const siteR = deriveGoogleAdsRedirectFromSiteEnv();
  if (siteR) {
    return { redirectUri: siteR, resolution: 'next_public' };
  }
  const dbR = String(saved.redirectUri || '').trim();
  if (dbR) {
    return { redirectUri: dbR, resolution: 'database' };
  }
  return { redirectUri: '', resolution: 'none' };
}

/**
 * OAuth redirect: fixed URI from getGoogleAdsConfig when non-empty; else derived from request host (www vs apex).
 */
export function resolveGoogleAdsRedirectUri(config, req) {
  const explicit = String(config.redirectUri || '').trim();
  if (explicit) {
    return { redirectUri: explicit, source: 'explicit' };
  }
  const redirectUri = `${getOriginFromReq(req)}/api/admin/google-ads/callback`;
  return { redirectUri, source: 'dynamic' };
}

export async function getGoogleAdsConfig(db) {
  const saved = await getKeyValue(db, CONFIG_KEY);
  const { redirectUri, resolution } = resolveGoogleAdsRedirectPreference(saved);

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID || saved.clientId || '';
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET || decryptSecret(saved.clientSecretEnc || '');
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || decryptSecret(saved.developerTokenEnc || '');
  const managerCustomerId = process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID || saved.managerCustomerId || '';

  return {
    clientId: String(clientId || '').trim(),
    clientSecret: String(clientSecret || '').trim(),
    developerToken: String(developerToken || '').trim(),
    managerCustomerId: String(managerCustomerId || '').replace(/-/g, '').trim(),
    redirectUri: String(redirectUri || '').trim(),
    /** 'env' | 'next_public' | 'database' | 'none' — how redirectUri was chosen */
    redirectUriResolution: resolution,
    hasRequiredOauth: Boolean(clientId && clientSecret),
    hasDeveloperToken: Boolean(developerToken),
  };
}

export async function saveGoogleAdsConfig(db, payload = {}, actor = 'admin') {
  const existing = await getKeyValue(db, CONFIG_KEY);

  const next = {
    ...existing,
    clientId: payload.clientId !== undefined ? String(payload.clientId || '').trim() : existing.clientId,
    managerCustomerId:
      payload.managerCustomerId !== undefined
        ? String(payload.managerCustomerId || '').replace(/-/g, '').trim()
        : existing.managerCustomerId,
    redirectUri:
      payload.redirectUri !== undefined ? String(payload.redirectUri || '').trim() : existing.redirectUri,
    updatedBy: actor,
    updatedAt: new Date().toISOString(),
  };

  if (payload.clientSecret !== undefined) {
    next.clientSecretEnc = payload.clientSecret ? encryptSecret(payload.clientSecret) : '';
  }

  if (payload.developerToken !== undefined) {
    next.developerTokenEnc = payload.developerToken ? encryptSecret(payload.developerToken) : '';
  }

  await setKeyValue(db, CONFIG_KEY, next);
  return next;
}

export async function getOAuthSession(db) {
  const oauth = await getKeyValue(db, OAUTH_KEY);
  if (!oauth?.refreshTokenEnc) return null;

  return {
    ...oauth,
    refreshToken: decryptSecret(oauth.refreshTokenEnc),
    accessToken: decryptSecret(oauth.accessTokenEnc || ''),
  };
}

export async function setOAuthSession(db, oauth = {}, actor = 'admin') {
  const payload = {
    connected: true,
    tokenType: oauth.tokenType || 'Bearer',
    scope: oauth.scope || 'https://www.googleapis.com/auth/adwords',
    refreshTokenEnc: oauth.refreshToken ? encryptSecret(oauth.refreshToken) : '',
    accessTokenEnc: oauth.accessToken ? encryptSecret(oauth.accessToken) : '',
    accessTokenExpiresAt: oauth.accessTokenExpiresAt || null,
    connectedAt: new Date().toISOString(),
    updatedBy: actor,
  };

  await setKeyValue(db, OAUTH_KEY, payload);
  return payload;
}

export async function clearOAuthSession(db) {
  await setKeyValue(db, OAUTH_KEY, {
    connected: false,
    refreshTokenEnc: '',
    accessTokenEnc: '',
    accessTokenExpiresAt: null,
    disconnectedAt: new Date().toISOString(),
  });
}

export async function saveOAuthState(db, state) {
  await setKeyValue(db, OAUTH_STATE_KEY, {
    state,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
}

export async function consumeOAuthState(db, state) {
  const data = await getKeyValue(db, OAUTH_STATE_KEY);
  const isValid = data?.state && data.state === state && Number(data.expiresAt || 0) > Date.now();
  await setKeyValue(db, OAUTH_STATE_KEY, {});
  return Boolean(isValid);
}

export async function buildGoogleAdsAuthUrl(db, req) {
  const config = await getGoogleAdsConfig(db);
  if (!config.hasRequiredOauth) {
    throw new Error('google_ads_oauth_not_configured');
  }

  const state = crypto.randomBytes(24).toString('hex');
  await saveOAuthState(db, state);

  const { redirectUri } = resolveGoogleAdsRedirectUri(config, req);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/adwords',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return {
    authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    redirectUri,
  };
}

export async function exchangeCodeForTokens(db, req, code) {
  const config = await getGoogleAdsConfig(db);
  if (!config.hasRequiredOauth) {
    throw new Error('google_ads_oauth_not_configured');
  }

  const { redirectUri } = resolveGoogleAdsRedirectUri(config, req);
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.error_description || data?.error || 'google_oauth_exchange_failed');
    err.googleOAuthError = data?.error || 'unknown';
    err.googleOAuthErrorDescription = String(data?.error_description || '').slice(0, 500);
    throw err;
  }

  const expiresMs = Number(data.expires_in || 3600) * 1000;
  await setOAuthSession(db, {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    tokenType: data.token_type,
    scope: data.scope,
    accessTokenExpiresAt: new Date(Date.now() + expiresMs).toISOString(),
  });

  return data;
}

async function refreshAccessToken(db) {
  const config = await getGoogleAdsConfig(db);
  const oauth = await getOAuthSession(db);

  if (!oauth?.refreshToken) throw new Error('google_ads_not_connected');
  if (!config.hasRequiredOauth) throw new Error('google_ads_oauth_not_configured');

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: oauth.refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error_description || data?.error || 'google_token_refresh_failed');
  }

  const expiresMs = Number(data.expires_in || 3600) * 1000;
  await setKeyValue(db, OAUTH_KEY, {
    connected: true,
    tokenType: data.token_type || oauth.tokenType || 'Bearer',
    scope: data.scope || oauth.scope || 'https://www.googleapis.com/auth/adwords',
    refreshTokenEnc: oauth.refreshTokenEnc,
    accessTokenEnc: encryptSecret(data.access_token),
    accessTokenExpiresAt: new Date(Date.now() + expiresMs).toISOString(),
    connectedAt: oauth.connectedAt || new Date().toISOString(),
    updatedBy: oauth.updatedBy || 'admin',
  });

  return data.access_token;
}

export async function getValidAccessToken(db) {
  const oauth = await getOAuthSession(db);
  if (!oauth?.refreshToken) throw new Error('google_ads_not_connected');

  const expiresAt = oauth.accessTokenExpiresAt ? new Date(oauth.accessTokenExpiresAt).getTime() : 0;
  const hasFreshToken = oauth.accessToken && expiresAt > Date.now() + 5 * 60 * 1000;

  if (hasFreshToken) {
    return oauth.accessToken;
  }

  return refreshAccessToken(db);
}

function authHeaders(accessToken, config) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  if (config.developerToken) {
    headers['developer-token'] = config.developerToken;
  }
  if (config.managerCustomerId) {
    headers['login-customer-id'] = config.managerCustomerId;
  }

  return headers;
}

export async function listAccessibleCustomers(db, accessToken) {
  const config = await getGoogleAdsConfig(db);
  if (!config.developerToken) {
    throw new Error('google_ads_developer_token_missing');
  }

  const res = await fetch('https://googleads.googleapis.com/v18/customers:listAccessibleCustomers', {
    method: 'GET',
    headers: authHeaders(accessToken, config),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'google_ads_customers_fetch_failed');
  }

  const resourceNames = Array.isArray(data.resourceNames) ? data.resourceNames : [];
  return resourceNames.map((name) => String(name).split('/').pop()).filter(Boolean);
}

export async function fetchCampaignsForCustomer(db, accessToken, customerId) {
  const config = await getGoogleAdsConfig(db);
  const query = [
    'SELECT',
    'campaign.id,',
    'campaign.name,',
    'campaign.status,',
    'metrics.impressions,',
    'metrics.clicks,',
    'metrics.cost_micros,',
    'metrics.conversions,',
    'metrics.conversions_value',
    'FROM campaign',
    'WHERE segments.date DURING LAST_30_DAYS',
    'ORDER BY metrics.cost_micros DESC',
    'LIMIT 100',
  ].join(' ');

  const endpoint = `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: authHeaders(accessToken, config),
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `google_ads_campaigns_fetch_failed_${customerId}`);
  }

  const chunks = Array.isArray(data) ? data : [];
  const rows = chunks.flatMap((chunk) => chunk.results || []);

  return rows.map((row) => {
    const metrics = row.metrics || {};
    return {
      id: row.campaign?.id,
      name: row.campaign?.name,
      status: row.campaign?.status,
      impressions: Number(metrics.impressions || 0),
      clicks: Number(metrics.clicks || 0),
      cost: Math.round((Number(metrics.costMicros || metrics.cost_micros || 0) / 1_000_000) * 100) / 100,
      conversions: Number(metrics.conversions || 0),
      conversionsValue: Number(metrics.conversionsValue || metrics.conversions_value || 0),
    };
  });
}

export async function syncGoogleAdsSnapshot(db) {
  const accessToken = await getValidAccessToken(db);
  const customerIds = await listAccessibleCustomers(db, accessToken);

  const customers = [];
  for (const customerId of customerIds.slice(0, 10)) {
    const campaigns = await fetchCampaignsForCustomer(db, accessToken, customerId);
    customers.push({ customerId, campaigns });
  }

  const summary = customers.reduce(
    (acc, c) => {
      acc.customers += 1;
      acc.campaigns += c.campaigns.length;
      for (const campaign of c.campaigns) {
        acc.impressions += campaign.impressions || 0;
        acc.clicks += campaign.clicks || 0;
        acc.cost += campaign.cost || 0;
        acc.conversions += campaign.conversions || 0;
        acc.conversionsValue += campaign.conversionsValue || 0;
      }
      return acc;
    },
    { customers: 0, campaigns: 0, impressions: 0, clicks: 0, cost: 0, conversions: 0, conversionsValue: 0 },
  );

  summary.cost = Math.round(summary.cost * 100) / 100;
  summary.roas = summary.cost > 0 ? Math.round((summary.conversionsValue / summary.cost) * 100) / 100 : 0;

  const snapshot = {
    updatedAt: new Date().toISOString(),
    customers,
    summary,
  };

  await setKeyValue(db, SNAPSHOT_KEY, snapshot);
  await setKeyValue(db, OAUTH_KEY, {
    ...(await getKeyValue(db, OAUTH_KEY)),
    lastSyncAt: snapshot.updatedAt,
    connected: true,
  });

  return snapshot;
}

export async function getGoogleAdsStatus(db) {
  const config = await getGoogleAdsConfig(db);
  const oauth = await getKeyValue(db, OAUTH_KEY);
  const snapshot = await getKeyValue(db, SNAPSHOT_KEY);

  const connected = Boolean(oauth?.connected && oauth?.refreshTokenEnc);

  return {
    connected,
    configured: {
      oauthClient: Boolean(config.clientId && config.clientSecret),
      developerToken: Boolean(config.developerToken),
      managerCustomerId: Boolean(config.managerCustomerId),
    },
    lastSyncAt: oauth?.lastSyncAt || null,
    accessTokenExpiresAt: oauth?.accessTokenExpiresAt || null,
    snapshot: snapshot?.summary ? snapshot : null,
  };
}

/**
 * Health row for /api/admin/system-status — uses env OR settings stored in MongoDB (same as runtime).
 */
export async function getGoogleAdsIntegrationHealth(db) {
  const config = await getGoogleAdsConfig(db);
  const oauth = await getKeyValue(db, OAUTH_KEY);
  const oauthConnected = Boolean(oauth?.connected && oauth?.refreshTokenEnc);
  const hasOauth = Boolean(config.hasRequiredOauth);
  const hasDev = Boolean(config.hasDeveloperToken);

  const details = {
    oauthClient: hasOauth,
    developerToken: hasDev,
    oauthConnected,
  };

  if (hasOauth && hasDev && oauthConnected) {
    return {
      status: 'connected',
      message: 'Google Ads מחובר (OAuth + Developer Token)',
      details,
    };
  }

  if (hasOauth && hasDev && !oauthConnected) {
    return {
      status: 'warning',
      message:
        'Google Ads מוגדר (מפתחות) אך לא הושלמה התחברות — במרכז הבקרה → אינטגרציות לחצו «התחבר ל-Google Ads»',
      details,
    };
  }

  if (!hasOauth && !hasDev) {
    return {
      status: 'warning',
      message:
        'Google Ads לא מוגדר — הזינו Client ID, Secret ו-Developer Token ב-Vercel או בטאב אינטגרציות',
      details,
    };
  }

  return {
    status: 'warning',
    message: 'Google Ads מוגדר חלקית — חסרים OAuth (Client ID+Secret) או Developer Token',
    details,
  };
}

export async function getMaskedGoogleAdsConfig(db, req = null) {
  const saved = await getKeyValue(db, CONFIG_KEY);
  const config = await getGoogleAdsConfig(db);

  const explicit = String(config.redirectUri || '').trim();
  const resolution = config.redirectUriResolution || 'none';
  const oauthRedirectUriSource = explicit ? 'explicit' : 'dynamic';
  let oauthRedirectUriEffective = explicit || null;
  if (!explicit && req) {
    oauthRedirectUriEffective = `${getOriginFromReq(req)}/api/admin/google-ads/callback`;
  }

  const oauthRedirectUriDynamicNote = !explicit
    ? 'נקבע לפי host של הבקשה — הגדירו GOOGLE_ADS_REDIRECT_URI או NEXT_PUBLIC_SITE_URL, או שדה Redirect כדי למנוע redirect_uri_mismatch בין www ל-apex'
    : null;

  return {
    clientId: config.clientId,
    hasClientSecret: Boolean(process.env.GOOGLE_ADS_CLIENT_SECRET || saved.clientSecretEnc),
    hasDeveloperToken: Boolean(process.env.GOOGLE_ADS_DEVELOPER_TOKEN || saved.developerTokenEnc),
    managerCustomerId: config.managerCustomerId,
    redirectUri: explicit,
    redirectUriResolution: resolution,
    oauthRedirectUriEffective,
    oauthRedirectUriSource,
    oauthRedirectUriDynamicNote,
    usingEnvClientId: Boolean(process.env.GOOGLE_ADS_CLIENT_ID),
    usingEnvClientSecret: Boolean(process.env.GOOGLE_ADS_CLIENT_SECRET),
    usingEnvDeveloperToken: Boolean(process.env.GOOGLE_ADS_DEVELOPER_TOKEN),
    usingEnvRedirectUri: Boolean(process.env.GOOGLE_ADS_REDIRECT_URI),
    /** True when the value is available from DB even if not in process.env (UI / scans). */
    satisfiedClientId: Boolean(String(config.clientId || '').trim()),
    satisfiedClientSecret: Boolean(
      process.env.GOOGLE_ADS_CLIENT_SECRET || saved.clientSecretEnc,
    ),
    satisfiedDeveloperToken: Boolean(
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN || saved.developerTokenEnc,
    ),
  };
}
