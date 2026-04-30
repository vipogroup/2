function toInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export function getSocialAgentConfig() {
  const cfg = {
    enabled: toBool(process.env.SOCIAL_AGENT_ENABLED, false),
    approvalMode: toBool(process.env.SOCIAL_AGENT_APPROVAL_MODE, true),
    postEveryHoursMin: toInt(process.env.SOCIAL_AGENT_PRODUCT_INTERVAL_MIN_HOURS, 3),
    postEveryHoursMax: toInt(process.env.SOCIAL_AGENT_PRODUCT_INTERVAL_MAX_HOURS, 6),
    maxPostsPerDay: toInt(process.env.SOCIAL_AGENT_MAX_POSTS_PER_DAY, 24),
    duplicateWindowDays: toInt(process.env.SOCIAL_AGENT_DUPLICATE_WINDOW_DAYS, 7),
    affiliatePostHourUtc: toInt(process.env.SOCIAL_AGENT_AFFILIATE_HOUR_UTC, 18),
    weeklySummaryDayUtc: toInt(process.env.SOCIAL_AGENT_WEEKLY_SUMMARY_DAY_UTC, 0),
    weeklySummaryHourUtc: toInt(process.env.SOCIAL_AGENT_WEEKLY_SUMMARY_HOUR_UTC, 8),
    metaApiVersion: String(process.env.META_GRAPH_API_VERSION || 'v22.0').trim(),
    metaAppId: String(process.env.META_APP_ID || '').trim(),
    metaAppSecret: String(process.env.META_APP_SECRET || '').trim(),
    metaAccessToken: String(process.env.META_ACCESS_TOKEN || '').trim(),
    metaPageId: String(process.env.META_PAGE_ID || '').trim(),
    instagramBusinessAccountId: String(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '').trim(),
    openAiApiKey: String(process.env.OPENAI_API_KEY || '').trim(),
  };

  return cfg;
}

export function validateSocialAgentConfig(cfg) {
  const missing = [];
  if (!cfg.metaAccessToken) missing.push('META_ACCESS_TOKEN');
  if (!cfg.instagramBusinessAccountId) missing.push('INSTAGRAM_BUSINESS_ACCOUNT_ID');
  if (!cfg.openAiApiKey) missing.push('OPENAI_API_KEY');
  return { ok: missing.length === 0, missing };
}
