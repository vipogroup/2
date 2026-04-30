const CONSENT_STORAGE_KEY = 'vipogroup_push_consent';
export const PUSH_CONSENT_VERSION = '2024-12-21';

function consentDebug(...args) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[pushConsent]', ...args);
  }
}

function safeParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('pushConsent_parse_error', error);
    return null;
  }
}

function getWindow() {
  if (typeof window === 'undefined') return null;
  return window;
}

export function getConsentRecord() {
  const win = getWindow();
  if (!win) return null;
  const raw = win.localStorage.getItem(CONSENT_STORAGE_KEY);
  consentDebug('getConsentRecord raw =', raw);
  const record = safeParse(raw);
  if (!record || typeof record !== 'object') return null;
  consentDebug('getConsentRecord parsed =', record);
  return record;
}

export function hasValidConsent(requiredVersion = PUSH_CONSENT_VERSION) {
  const record = getConsentRecord();
  if (!record) return false;
  if (record.accepted !== true) return false;
  if (!record.version) return false;
  if (record.version !== requiredVersion) return false;
  return true;
}

export function hasRespondedToConsent(requiredVersion = PUSH_CONSENT_VERSION) {
  const record = getConsentRecord();
  if (!record) return false;
  if (!record.version) return false;
  if (record.version !== requiredVersion) return false;
  return true;
}

export function saveConsentRecord(record) {
  const win = getWindow();
  if (!win) {
    console.error('saveConsentRecord: no window');
    return null;
  }
  const value = JSON.stringify(record);
  consentDebug('saveConsentRecord saving =', value);
  win.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  // Verify save
  const verify = win.localStorage.getItem(CONSENT_STORAGE_KEY);
  consentDebug('saveConsentRecord verify =', verify);
  return record;
}

export function markConsentAccepted({ version = PUSH_CONSENT_VERSION, role = null, meta = {} } = {}) {
  const payload = {
    accepted: true,
    version,
    role,
    meta,
    updatedAt: new Date().toISOString(),
  };
  return saveConsentRecord(payload);
}

export function markConsentDeclined({ version = PUSH_CONSENT_VERSION, role = null, reason = null } = {}) {
  const payload = {
    accepted: false,
    version,
    role,
    reason,
    updatedAt: new Date().toISOString(),
  };
  return saveConsentRecord(payload);
}

export function clearConsentRecord() {
  const win = getWindow();
  if (!win) return;
  win.localStorage.removeItem(CONSENT_STORAGE_KEY);
}
