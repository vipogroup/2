import crypto from 'crypto';

function getEncryptionKey() {
  const raw =
    process.env.GOOGLE_ADS_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'local-dev-google-ads-secret-change-me';
  return crypto.createHash('sha256').update(String(raw)).digest();
}

export function encryptSecret(plainText = '') {
  const text = String(plainText || '');
  if (!text) return '';

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(payload = '') {
  const raw = String(payload || '');
  if (!raw) return '';

  const parts = raw.split(':');
  if (parts.length !== 3) return raw;

  const [ivHex, tagHex, dataHex] = parts;
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

export function maskSecret(value = '', show = 4) {
  const text = String(value || '');
  if (!text) return '';
  if (text.length <= show) return '*'.repeat(text.length);
  return `${'*'.repeat(Math.max(0, text.length - show))}${text.slice(-show)}`;
}
