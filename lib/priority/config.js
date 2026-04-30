/**
 * Priority ERP Configuration
 */

const REQUIRED_KEYS = [
  'PRIORITY_BASE_URL',
  'PRIORITY_CLIENT_ID',
  'PRIORITY_CLIENT_SECRET',
  'PRIORITY_COMPANY_CODE',
];

const OPTIONAL_KEYS = [
  'PRIORITY_ENV',
  'PRIORITY_TIMEOUT_MS',
  'PRIORITY_INVOICE_SERIES',
  'PRIORITY_RECEIPT_SERIES',
  'PRIORITY_CREDIT_NOTE_SERIES',
];

/**
 * Get Priority configuration from environment
 * @param {Object} options
 * @param {boolean} options.strict - If true, throws on missing required keys
 */
export function getPriorityConfig(options = {}) {
  const { strict = false } = options;

  const missing = REQUIRED_KEYS.filter(key => !process.env[key]);
  const isConfigured = missing.length === 0;

  if (strict && !isConfigured) {
    throw new Error(`Priority not configured. Missing: ${missing.join(', ')}`);
  }

  return {
    // Environment
    env: process.env.PRIORITY_ENV || 'sandbox',
    isConfigured,
    missing,

    // Connection
    baseUrl: process.env.PRIORITY_BASE_URL || '',
    clientId: process.env.PRIORITY_CLIENT_ID || '',
    clientSecret: process.env.PRIORITY_CLIENT_SECRET || '',
    companyCode: process.env.PRIORITY_COMPANY_CODE || '',
    timeout: parseInt(process.env.PRIORITY_TIMEOUT_MS || '45000', 10),

    // Document series
    invoiceSeries: process.env.PRIORITY_INVOICE_SERIES || '',
    receiptSeries: process.env.PRIORITY_RECEIPT_SERIES || '',
    creditNoteSeries: process.env.PRIORITY_CREDIT_NOTE_SERIES || '',
  };
}

/**
 * Validate Priority configuration
 */
export function validatePriorityConfig() {
  const cfg = getPriorityConfig();
  return {
    ok: cfg.isConfigured,
    missing: cfg.missing,
    message: cfg.isConfigured
      ? 'Priority is configured'
      : `Priority not configured. Missing: ${cfg.missing.join(', ')}`,
  };
}

/**
 * GL Account mappings for Priority
 */
export const GL_ACCOUNTS = {
  SALES: {
    PRODUCTS: process.env.PRIORITY_GL_SALES_PRODUCTS || '4100',
    SERVICES: process.env.PRIORITY_GL_SALES_SERVICES || '4200',
    SHIPPING: process.env.PRIORITY_GL_SALES_SHIPPING || '4300',
  },
  VAT: {
    STANDARD: process.env.PRIORITY_GL_VAT_STANDARD || '4500',
    REDUCED: process.env.PRIORITY_GL_VAT_REDUCED || '4501',
    EXEMPT: process.env.PRIORITY_GL_VAT_EXEMPT || '4502',
  },
  EXPENSES: {
    AGENT_COMMISSION: process.env.PRIORITY_GL_AGENT_COMMISSION || '6200',
    REFUNDS: process.env.PRIORITY_GL_REFUNDS || '6300',
    CHARGEBACKS: process.env.PRIORITY_GL_CHARGEBACKS || '6400',
  },
  LIABILITIES: {
    AGENT_PAYABLE: process.env.PRIORITY_GL_AGENT_PAYABLE || '2200',
    CUSTOMER_PREPAYMENT: process.env.PRIORITY_GL_CUSTOMER_PREPAYMENT || '2300',
  },
};

/**
 * Payment method codes for Priority
 */
export const PAYMENT_CODES = {
  credit_card: 'CC',
  bit: 'BIT',
  paypal: 'PP',
  bank_transfer: 'BT',
  cash: 'CASH',
  check: 'CHK',
};

/**
 * Map PayPlus payment method to Priority code
 */
export function mapPaymentMethodToPriority(payplusMethod) {
  const mapping = {
    'credit_card': 'CC',
    'bit': 'BIT',
    'apple_pay': 'CC',
    'google_pay': 'CC',
    'paypal': 'PP',
    'bank_transfer': 'BT',
  };
  return mapping[payplusMethod] || 'CC';
}
