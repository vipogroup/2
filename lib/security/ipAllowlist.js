/**
 * IP Allowlist for PayPlus Webhooks
 * 
 * PayPlus sends webhooks from specific IP ranges.
 * This middleware validates the source IP.
 */

// PayPlus known IP ranges (update based on PayPlus documentation)
const PAYPLUS_IP_RANGES = [
  '185.229.226.0/24',
  '185.229.227.0/24',
  '51.77.0.0/16',
  '54.229.0.0/16',
];

// Development IPs (localhost)
const DEV_IPS = [
  '127.0.0.1',
  '::1',
  'localhost',
];

/**
 * Check if IP is in CIDR range
 */
function ipInRange(ip, cidr) {
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);
  
  const ipParts = ip.split('.').map(Number);
  const rangeParts = range.split('.').map(Number);
  
  const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
  const rangeNum = (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3];
  
  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Validate if IP is allowed for PayPlus webhooks
 */
export function isPayPlusIPAllowed(ip) {
  // Skip validation in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Skip if IP allowlist is disabled
  if (process.env.PAYPLUS_IP_ALLOWLIST_ENABLED !== 'true') {
    return true;
  }

  if (!ip) return false;

  // Clean IP (remove IPv6 prefix if present)
  const cleanIp = ip.replace('::ffff:', '');

  // Check dev IPs
  if (DEV_IPS.includes(cleanIp)) {
    return process.env.NODE_ENV === 'development';
  }

  // Check against allowlist
  for (const range of PAYPLUS_IP_RANGES) {
    if (range.includes('/')) {
      if (ipInRange(cleanIp, range)) return true;
    } else if (cleanIp === range) {
      return true;
    }
  }

  // Check custom allowlist from env
  const customAllowlist = process.env.PAYPLUS_IP_ALLOWLIST;
  if (customAllowlist) {
    const customIPs = customAllowlist.split(',').map(s => s.trim());
    if (customIPs.includes(cleanIp)) {
      return true;
    }
  }

  return false;
}

/**
 * Middleware to validate PayPlus webhook source IP
 */
export function validatePayPlusIP(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip')
    || req.ip;

  const allowed = isPayPlusIPAllowed(ip);

  if (!allowed) {
    console.warn('[SECURITY] Blocked webhook from unauthorized IP:', ip);
  }

  return {
    allowed,
    ip,
  };
}

/**
 * Get client IP from request
 */
export function getClientIP(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || req.headers.get('cf-connecting-ip') // Cloudflare
    || 'unknown';
}
