/**
 * PayPlus Error Codes Mapping
 * מיפוי שגיאות PayPlus לקודים וטקסטים בעברית
 */

const PAYPLUS_PAYMENT_STATUS = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  PENDING: "PENDING",
  REFUND: "REFUND",
  PARTIAL_REFUND: "PARTIAL_REFUND",
  CHARGEBACK: "CHARGEBACK",
};

export const PAYPLUS_ERROR_MAP = {
  // Payment declined errors
  'PP001': { 
    code: 'CARD_DECLINED', 
    message: 'הכרטיס נדחה', 
    messageEn: 'Card declined',
    action: 'retry_different_card',
    severity: 'warning',
    userVisible: true
  },
  'PP002': { 
    code: 'INSUFFICIENT_FUNDS', 
    message: 'אין יתרה מספיקה בכרטיס', 
    messageEn: 'Insufficient funds',
    action: 'retry_later',
    severity: 'warning',
    userVisible: true
  },
  'PP003': { 
    code: 'EXPIRED_CARD', 
    message: 'תוקף הכרטיס פג', 
    messageEn: 'Card expired',
    action: 'update_card',
    severity: 'warning',
    userVisible: true
  },
  'PP004': { 
    code: '3DS_FAILED', 
    message: 'אימות 3DS נכשל', 
    messageEn: '3DS authentication failed',
    action: 'retry',
    severity: 'warning',
    userVisible: true
  },
  'PP005': { 
    code: 'TIMEOUT', 
    message: 'פג זמן ההמתנה, נסה שוב', 
    messageEn: 'Request timeout',
    action: 'auto_retry',
    severity: 'error',
    userVisible: true
  },
  'PP006': { 
    code: 'INVALID_CARD_NUMBER', 
    message: 'מספר כרטיס לא תקין', 
    messageEn: 'Invalid card number',
    action: 'fix_input',
    severity: 'warning',
    userVisible: true
  },
  'PP007': { 
    code: 'INVALID_CVV', 
    message: 'קוד CVV לא תקין', 
    messageEn: 'Invalid CVV',
    action: 'fix_input',
    severity: 'warning',
    userVisible: true
  },
  'PP008': { 
    code: 'CARD_NOT_SUPPORTED', 
    message: 'סוג כרטיס לא נתמך', 
    messageEn: 'Card type not supported',
    action: 'retry_different_card',
    severity: 'warning',
    userVisible: true
  },
  'PP009': { 
    code: 'TRANSACTION_LIMIT_EXCEEDED', 
    message: 'חריגה ממגבלת עסקה', 
    messageEn: 'Transaction limit exceeded',
    action: 'contact_bank',
    severity: 'warning',
    userVisible: true
  },
  'PP010': { 
    code: 'STOLEN_CARD', 
    message: 'כרטיס חסום', 
    messageEn: 'Card blocked',
    action: 'contact_bank',
    severity: 'critical',
    userVisible: true
  },

  // Success codes
  'PP100': { 
    code: 'SUCCESS', 
    message: 'התשלום התקבל בהצלחה', 
    messageEn: 'Payment successful',
    action: 'proceed',
    severity: 'info',
    userVisible: true
  },
  'PP101': { 
    code: 'PENDING', 
    message: 'התשלום בעיבוד', 
    messageEn: 'Payment pending',
    action: 'wait',
    severity: 'info',
    userVisible: true
  },

  // Refund codes
  'PP200': { 
    code: 'REFUND_SUCCESS', 
    message: 'הזיכוי בוצע בהצלחה', 
    messageEn: 'Refund successful',
    action: 'notify',
    severity: 'info',
    userVisible: true
  },
  'PP201': { 
    code: 'REFUND_PENDING', 
    message: 'הזיכוי בעיבוד', 
    messageEn: 'Refund pending',
    action: 'wait',
    severity: 'info',
    userVisible: true
  },
  'PP202': { 
    code: 'REFUND_FAILED', 
    message: 'הזיכוי נכשל', 
    messageEn: 'Refund failed',
    action: 'retry_or_manual',
    severity: 'error',
    userVisible: false
  },
  'PP203': { 
    code: 'PARTIAL_REFUND_SUCCESS', 
    message: 'הזיכוי החלקי בוצע', 
    messageEn: 'Partial refund successful',
    action: 'notify',
    severity: 'info',
    userVisible: true
  },

  // System errors
  'PP300': { 
    code: 'API_ERROR', 
    message: 'שגיאת מערכת, נסה שוב מאוחר יותר', 
    messageEn: 'System error',
    action: 'retry_later',
    severity: 'error',
    userVisible: true
  },
  'PP301': { 
    code: 'NETWORK_ERROR', 
    message: 'בעיית תקשורת', 
    messageEn: 'Network error',
    action: 'auto_retry',
    severity: 'error',
    userVisible: true
  },
  'PP302': { 
    code: 'AUTHENTICATION_FAILED', 
    message: 'שגיאת אימות', 
    messageEn: 'Authentication failed',
    action: 'contact_support',
    severity: 'critical',
    userVisible: false
  },
  'PP303': { 
    code: 'INVALID_REQUEST', 
    message: 'בקשה לא תקינה', 
    messageEn: 'Invalid request',
    action: 'fix_data',
    severity: 'error',
    userVisible: false
  },

  // Chargeback
  'PP400': { 
    code: 'CHARGEBACK_RECEIVED', 
    message: 'התקבל צ\'ארג\'בק', 
    messageEn: 'Chargeback received',
    action: 'admin_alert',
    severity: 'critical',
    userVisible: false
  },
  'PP401': { 
    code: 'CHARGEBACK_WON', 
    message: 'צ\'ארג\'בק נדחה', 
    messageEn: 'Chargeback won',
    action: 'notify',
    severity: 'info',
    userVisible: false
  },
  'PP402': { 
    code: 'CHARGEBACK_LOST', 
    message: 'צ\'ארג\'בק אושר', 
    messageEn: 'Chargeback lost',
    action: 'admin_alert',
    severity: 'critical',
    userVisible: false
  },

  // Default
  'UNKNOWN': { 
    code: 'UNKNOWN_ERROR', 
    message: 'שגיאה לא מזוהה', 
    messageEn: 'Unknown error',
    action: 'contact_support',
    severity: 'error',
    userVisible: false
  }
};

/**
 * Map PayPlus status to internal event type
 */
export const STATUS_TO_EVENT_TYPE = {
  [PAYPLUS_PAYMENT_STATUS.SUCCESS]: 'success',
  'approved': 'success',
  'completed': 'success',
  [PAYPLUS_PAYMENT_STATUS.PENDING]: 'pending',
  'processing': 'pending',
  [PAYPLUS_PAYMENT_STATUS.FAILED]: 'failed',
  'declined': 'failed',
  'error': 'failed',
  'cancelled': 'cancelled',
  [PAYPLUS_PAYMENT_STATUS.REFUND]: 'refund',
  [PAYPLUS_PAYMENT_STATUS.PARTIAL_REFUND]: 'partial_refund',
  [PAYPLUS_PAYMENT_STATUS.CHARGEBACK]: 'chargeback',
};

/**
 * Get error info from PayPlus error code
 * @param {string} errorCode - PayPlus error code
 * @returns {Object} Error info
 */
export function getErrorInfo(errorCode) {
  return PAYPLUS_ERROR_MAP[errorCode] || PAYPLUS_ERROR_MAP['UNKNOWN'];
}

/**
 * Get user-friendly error message
 * @param {string} errorCode - PayPlus error code
 * @param {string} lang - Language ('he' or 'en')
 * @returns {string} Error message
 */
export function getErrorMessage(errorCode, lang = 'he') {
  const info = getErrorInfo(errorCode);
  return lang === 'en' ? info.messageEn : info.message;
}

/**
 * Check if error is retriable
 * @param {string} errorCode - PayPlus error code
 * @returns {boolean}
 */
export function isRetriable(errorCode) {
  const info = getErrorInfo(errorCode);
  return ['auto_retry', 'retry', 'retry_later'].includes(info.action);
}

/**
 * Check if error requires admin alert
 * @param {string} errorCode - PayPlus error code
 * @returns {boolean}
 */
export function requiresAdminAlert(errorCode) {
  const info = getErrorInfo(errorCode);
  return info.severity === 'critical' || info.action === 'admin_alert';
}

/**
 * Map PayPlus raw status to internal event type
 * @param {string} status - Raw status from PayPlus
 * @returns {string} Internal event type
 */
export function mapStatusToEventType(status) {
  const normalized = (status || '').toLowerCase().trim();
  return STATUS_TO_EVENT_TYPE[normalized] || 'failed';
}
