const REQUIRED_ENV_KEYS = [
  'PAYPLUS_API_KEY',
  'PAYPLUS_SECRET',
  'PAYPLUS_WEBHOOK_SECRET',
  'PAYPLUS_BASE_URL',
];

/**
 * Normalize URL by trimming trailing slashes
 */
function normalizeUrl(url = '') {
  return url.replace(/\/$/, '');
}

/**
 * Get PayPlus config from environment variables (global/fallback)
 */
export function getPayPlusConfig({ strict = false } = {}) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const rawBaseUrl = process.env.PAYPLUS_BASE_URL || '';

  const config = {
    apiKey: process.env.PAYPLUS_API_KEY || '',
    secret: process.env.PAYPLUS_SECRET || '',
    webhookSecret: process.env.PAYPLUS_WEBHOOK_SECRET || '',
    baseUrl: normalizeUrl(rawBaseUrl),
    callbackUrl: process.env.PAYPLUS_CALLBACK_URL || '',
    mockEnabled: process.env.PAYPLUS_MOCK_ENABLED === 'true',
    nodeEnv,
  };

  const missing = REQUIRED_ENV_KEYS.filter((key) => {
    if (key === 'PAYPLUS_BASE_URL') {
      return !rawBaseUrl.trim();
    }
    const value = process.env[key];
    return !value || value.trim() === '';
  });

  const isProd = nodeEnv === 'production';

  if ((strict || isProd) && missing.length) {
    throw new Error(`PayPlus config missing required ENV: ${missing.join(', ')}`);
  }

  if (config.mockEnabled && isProd) {
    throw new Error('PAYPLUS_MOCK_ENABLED cannot be true in production');
  }

  return {
    ...config,
    missing,
    isConfigured: missing.length === 0,
  };
}

/**
 * Get PayPlus config for a specific tenant
 * Falls back to global config if tenant doesn't have PayPlus configured
 */
export function getPayPlusConfigForTenant(tenant) {
  // Check if tenant has PayPlus configured and enabled
  if (tenant?.payplus?.enabled && tenant.payplus.apiKey && tenant.payplus.secretKey) {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const rawBaseUrl = process.env.PAYPLUS_BASE_URL || 'https://api.payplus.co.il';
    
    return {
      apiKey: tenant.payplus.apiKey,
      secret: tenant.payplus.secretKey,
      webhookSecret: tenant.payplus.webhookSecret || '',
      baseUrl: normalizeUrl(rawBaseUrl),
      callbackUrl: process.env.PAYPLUS_CALLBACK_URL || '',
      mockEnabled: tenant.payplus.testMode || false,
      nodeEnv,
      tenantId: tenant._id?.toString(),
      isTenantConfig: true,
      missing: [],
      isConfigured: true,
    };
  }
  
  // Fall back to global config
  const globalConfig = getPayPlusConfig({ strict: false });
  return {
    ...globalConfig,
    isTenantConfig: false,
  };
}
