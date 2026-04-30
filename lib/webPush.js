import webPush from 'web-push';

let isConfigured = false;

function sanitizeBase64Key(rawValue) {
  if (!rawValue) return '';
  const trimmed = String(rawValue).trim();
  const withoutWrappingQuotes = trimmed.replace(/^['"]+|['"]+$/g, '');
  return withoutWrappingQuotes.replace(/\s+/g, '');
}

const PUBLIC_KEY = sanitizeBase64Key(process.env.WEB_PUSH_PUBLIC_KEY || process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || '');
const PRIVATE_KEY = sanitizeBase64Key(process.env.WEB_PUSH_PRIVATE_KEY || '');
const CONTACT_EMAIL = (process.env.WEB_PUSH_CONTACT_EMAIL || process.env.SUPPORT_EMAIL || 'mailto:vipogroup1@gmail.com').trim().replace(/[\r\n]/g, '');

function normalizeContact(contact) {
  if (!contact) return 'mailto:vipogroup1@gmail.com';
  const cleaned = String(contact).trim().replace(/[\r\n]/g, '');
  if (cleaned.startsWith('mailto:')) return cleaned;
  return `mailto:${cleaned}`;
}

export function getWebPushConfig() {
  const configured = Boolean(PUBLIC_KEY && PRIVATE_KEY);
  return {
    configured,
    publicKey: PUBLIC_KEY,
    contact: normalizeContact(CONTACT_EMAIL),
  };
}

export function ensureWebPushConfigured() {
  if (isConfigured) return true;

  const { configured, publicKey, contact } = getWebPushConfig();
  if (!configured) {
    throw new Error('WEB_PUSH_NOT_CONFIGURED');
  }

  console.log('WEB_PUSH: Configuring VAPID:', {
    publicKeyLength: publicKey?.length,
    publicKeyFirst20: publicKey?.slice(0, 20),
    publicKeyLast10: publicKey?.slice(-10),
    privateKeyLength: PRIVATE_KEY?.length,
    privateKeyFirst10: PRIVATE_KEY?.slice(0, 10),
    contact,
  });
  webPush.setVapidDetails(contact, publicKey, PRIVATE_KEY);
  isConfigured = true;
  return true;
}

export async function sendPushNotification(subscription, payload = {}) {
  ensureWebPushConfigured();

  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  
  // Options for Apple compatibility
  const options = {
    TTL: 60 * 60, // 1 hour
    urgency: 'normal',
  };
  
  console.log('WEB_PUSH: Sending to endpoint:', subscription.endpoint?.slice(0, 60));
  return webPush.sendNotification(subscription, body, options);
}

export function resetWebPushForTesting() {
  isConfigured = false;
}
