const CANONICAL_PRIMARY_ADMIN_EMAIL = 'm0587009938@gmail.com';
const LEGACY_PRIMARY_ADMIN_EMAIL = '0587009938@gmail.com';
const BRAND_PRIMARY_ADMIN_EMAIL_ALIAS = 'vipogroup1@gmail.com';
const CANONICAL_PRIMARY_ADMIN_PHONE = '0533752633';
const PRIMARY_ADMIN_PASSWORD_FALLBACK = 'zxcvbnm1';

function cleanArtifactString(rawValue, { trim = true } = {}) {
  if (rawValue === null || rawValue === undefined) {
    return '';
  }

  let value = String(rawValue).replace(/\uFEFF/g, '');
  if (trim) {
    value = value.trim();
  }

  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    const hasWrappingQuotes = (first === '"' && last === '"') || (first === "'" && last === "'");
    if (hasWrappingQuotes) {
      value = value.slice(1, -1);
      if (trim) {
        value = value.trim();
      }
    }
  }

  value = value
    .replace(/^(?:\\r\\n|\\n|\\r|[\r\n])+/g, '')
    .replace(/(?:\\r\\n|\\n|\\r|[\r\n])+$/g, '');

  if (trim) {
    value = value.trim();
  }

  return value;
}

function uniqueNonEmpty(values) {
  const out = [];
  const seen = new Set();

  for (const item of values) {
    const value = String(item || '');
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    out.push(value);
  }

  return out;
}

function buildPrimaryAdminConfig() {
  const configuredEmail = cleanArtifactString(process.env.ADMIN_EMAIL || CANONICAL_PRIMARY_ADMIN_EMAIL).toLowerCase();
  const configuredPhone = cleanArtifactString(
    process.env.ADMIN_PHONE || process.env.SUPER_ADMIN_PHONE || CANONICAL_PRIMARY_ADMIN_PHONE,
  );

  const aliasRaw = cleanArtifactString(process.env.ADMIN_EMAIL_ALIASES || '');
  const envAliases = aliasRaw
    ? aliasRaw
        .split(/[;,\s]+/)
        .map((entry) => cleanArtifactString(entry).toLowerCase())
        .filter(Boolean)
    : [];

  const configuredPasswordRaw = process.env.ADMIN_PASSWORD ?? process.env.SUPER_ADMIN_PASSWORD ?? '';
  const configuredPasswordExact = cleanArtifactString(configuredPasswordRaw, { trim: false });
  const configuredPasswordTrimmed = cleanArtifactString(configuredPasswordRaw, { trim: true });

  const emailCandidates = uniqueNonEmpty([
    CANONICAL_PRIMARY_ADMIN_EMAIL,
    configuredEmail,
    LEGACY_PRIMARY_ADMIN_EMAIL,
    BRAND_PRIMARY_ADMIN_EMAIL_ALIAS,
    ...envAliases,
  ]);

  const phoneCandidates = uniqueNonEmpty([configuredPhone, CANONICAL_PRIMARY_ADMIN_PHONE]);

  const passwordCandidates = uniqueNonEmpty([
    configuredPasswordRaw,
    configuredPasswordExact,
    configuredPasswordTrimmed,
    PRIMARY_ADMIN_PASSWORD_FALLBACK,
  ]);

  return {
    canonicalEmail: CANONICAL_PRIMARY_ADMIN_EMAIL,
    legacyEmail: LEGACY_PRIMARY_ADMIN_EMAIL,
    brandAliasEmail: BRAND_PRIMARY_ADMIN_EMAIL_ALIAS,
    canonicalPhone: CANONICAL_PRIMARY_ADMIN_PHONE,
    passwordFallback: PRIMARY_ADMIN_PASSWORD_FALLBACK,
    emailCandidates,
    phoneCandidates,
    passwordCandidates,
  };
}

export const primaryAdminConfig = buildPrimaryAdminConfig();

export function isPrimaryAdminEmail(email) {
  const normalized = cleanArtifactString(email).toLowerCase();
  return Boolean(normalized) && primaryAdminConfig.emailCandidates.includes(normalized);
}

export function isPrimaryAdminPassword(password) {
  const normalizedRaw = String(password ?? '');
  const normalizedTrimmed = cleanArtifactString(password);

  return (
    primaryAdminConfig.passwordCandidates.includes(normalizedRaw) ||
    primaryAdminConfig.passwordCandidates.includes(normalizedTrimmed)
  );
}
