/**
 * PayPlus Payment Integration Client
 *
 * All configuration is read from environment variables:
 * - PAYPLUS_API_KEY: API key for authentication
 * - PAYPLUS_SECRET: API secret for authentication
 * - PAYPLUS_WEBHOOK_SECRET: Secret for verifying webhook signatures
 * - PAYPLUS_BASE_URL: Base URL for PayPlus API (defaults to production)
 * - PAYPLUS_CALLBACK_URL: (Optional) Override callback URL for webhooks
 *
 * The client gracefully handles missing configuration by returning
 * a fallback response instead of crashing.
 */

import crypto from 'crypto';

import { getPayPlusConfig } from './config';

/**
 * Get PayPlus configuration with validation
 * @param {Object} options
 * @param {boolean} options.strict - If true, throws on missing required keys
 * @returns {Object} Configuration with missing keys list
 */
export function validatePayPlusConfig() {
  try {
    const cfg = getPayPlusConfig({ strict: false });
    const missing = cfg.missing || [];
    const ok = !missing.length;
    return {
      ok,
      missing,
      message: ok
        ? 'PayPlus is configured'
        : `Payment service not configured. Missing: ${missing.join(', ')}`,
    };
  } catch (err) {
    console.error('validatePayPlusConfig error:', err.message);
    return {
      ok: false,
      missing: ['unknown'],
      message: `Payment service error: ${err.message}`,
    };
  }
}

export function isPayPlusConfigured() {
  const cfg = getPayPlusConfig({ strict: false });
  return cfg.isConfigured;
}

async function callPayPlusAPI(endpoint, payload, cfg) {
  const url = new URL(endpoint, cfg.baseUrl).toString();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
      'X-API-SECRET': cfg.secret,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPlus API error (${res.status}): ${text}`);
  }

  return res.json();
}

export async function createPayPlusSession({ order, successUrl, cancelUrl }) {
  const cfg = getPayPlusConfig({ strict: true });

  const payload = {
    orderId: String(order._id),
    amount: Number(order.totalAmount || order.total?.total || 0),
    currency: 'ILS',
    customer: {
      name: order.customerName || '',
      phone: order.customerPhone || '',
      email: order.customerEmail || '',
    },
    returnUrls: {
      success: successUrl,
      cancel: cancelUrl || `/checkout/cancel?orderId=${order._id}`,
    },
    metadata: {
      refAgentId: order.refAgentId ? String(order.refAgentId) : null,
    },
  };

  try {
    const response = await callPayPlusAPI('/v1/payments', payload, cfg);
    return {
      provider: 'payplus',
      isFallback: false,
      paymentUrl: response?.paymentPageUrl || response?.redirectUrl,
      sessionId: response?.id || response?.transactionId || null,
      raw: response,
    };
  } catch (err) {
    console.error('PAYPLUS_CREATE_SESSION_FAILED', err.message);
    throw err;
  }
}

/**
 * Create PayPlus session using tenant-specific configuration
 */
export async function createPayPlusSessionForTenant({ order, successUrl, cancelUrl, tenant }) {
  const { getPayPlusConfigForTenant } = await import('./config');
  const cfg = getPayPlusConfigForTenant(tenant);

  if (!cfg.isConfigured) {
    throw new Error('PayPlus not configured for this tenant');
  }

  const payload = {
    orderId: String(order._id),
    amount: Number(order.totalAmount || order.total?.total || 0),
    currency: 'ILS',
    customer: {
      name: order.customerName || '',
      phone: order.customerPhone || '',
      email: order.customerEmail || '',
    },
    returnUrls: {
      success: successUrl,
      cancel: cancelUrl || `/checkout/cancel?orderId=${order._id}`,
    },
    metadata: {
      refAgentId: order.refAgentId ? String(order.refAgentId) : null,
      tenantId: tenant._id?.toString(),
    },
  };

  try {
    const response = await callPayPlusAPI('/v1/payments', payload, cfg);
    return {
      provider: 'payplus',
      isFallback: false,
      paymentUrl: response?.paymentPageUrl || response?.redirectUrl,
      sessionId: response?.id || response?.transactionId || null,
      raw: response,
      tenantId: tenant._id?.toString(),
    };
  } catch (err) {
    console.error('PAYPLUS_CREATE_SESSION_FOR_TENANT_FAILED', err.message, { tenantId: tenant._id });
    throw err;
  }
}

export function verifyPayPlusSignature(rawBody, signatureHeader) {
  const cfg = getPayPlusConfig({ strict: false });

  if (!cfg.webhookSecret) {
    return { valid: false, reason: 'missing_secret' };
  }

  if (!signatureHeader) {
    return { valid: false, reason: 'missing_header' };
  }

  const provided = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader;

  const digest = crypto.createHmac('sha256', cfg.webhookSecret).update(rawBody).digest('hex');

  let received;
  try {
    received = Buffer.from(provided, 'hex');
  } catch {
    received = Buffer.from(provided, 'utf8');
  }

  const expected = Buffer.from(digest, 'hex');

  if (expected.length !== received.length) {
    return { valid: false, reason: 'length_mismatch' };
  }

  const valid = crypto.timingSafeEqual(expected, received);
  return { valid, reason: valid ? null : 'mismatch' };
}
