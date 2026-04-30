/**
 * Audit Log System
 * 
 * Records all sensitive operations for compliance and debugging.
 */

import dbConnect from '@/lib/dbConnect';

// Audit event types
export const AUDIT_EVENTS = {
  // Payment events
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',
  REFUND_INITIATED: 'refund.initiated',
  REFUND_COMPLETED: 'refund.completed',
  CHARGEBACK_RECEIVED: 'chargeback.received',

  // Commission events
  COMMISSION_CREDITED: 'commission.credited',
  COMMISSION_RELEASED: 'commission.released',
  COMMISSION_CANCELLED: 'commission.cancelled',

  // Withdrawal events
  WITHDRAWAL_REQUESTED: 'withdrawal.requested',
  WITHDRAWAL_APPROVED: 'withdrawal.approved',
  WITHDRAWAL_REJECTED: 'withdrawal.rejected',
  WITHDRAWAL_COMPLETED: 'withdrawal.completed',

  // Priority sync events
  PRIORITY_CUSTOMER_CREATED: 'priority.customer_created',
  PRIORITY_INVOICE_CREATED: 'priority.invoice_created',
  PRIORITY_SYNC_FAILED: 'priority.sync_failed',

  // Admin actions
  ADMIN_LOGIN: 'admin.login',
  ADMIN_SETTINGS_CHANGED: 'admin.settings_changed',
  ADMIN_USER_MODIFIED: 'admin.user_modified',
  ADMIN_MANUAL_SYNC: 'admin.manual_sync',
  ADMIN_DLQ_RETRY: 'admin.dlq_retry',

  // Test Harness
  TEST_SEED_CREATED: 'test_harness.seed_created',
  MOCK_PAYMENT_SUCCESS: 'test_harness.mock_payment_success',
  MOCK_PAYMENT_FAIL: 'test_harness.mock_payment_fail',

  // Security events
  SECURITY_INVALID_SIGNATURE: 'security.invalid_signature',
  SECURITY_BLOCKED_IP: 'security.blocked_ip',
  SECURITY_RATE_LIMITED: 'security.rate_limited',
};

/**
 * Create audit log entry
 */
export async function createAuditLog(event) {
  try {
    await dbConnect();
    
    const mongoose = (await import('mongoose')).default;
    
    // Get or create AuditLog model
    let AuditLog;
    try {
      AuditLog = mongoose.model('AuditLog');
    } catch {
      const AuditLogSchema = new mongoose.Schema({
        eventType: { type: String, required: true, index: true },
        severity: { type: String, enum: ['info', 'warning', 'error', 'critical'], default: 'info' },
        actor: {
          type: { type: String, enum: ['user', 'admin', 'system', 'webhook'] },
          id: String,
          email: String,
          ip: String,
        },
        target: {
          type: { type: String },
          id: String,
        },
        action: String,
        details: mongoose.Schema.Types.Mixed,
        metadata: {
          userAgent: String,
          requestId: String,
          sessionId: String,
        },
        timestamp: { type: Date, default: Date.now, index: true },
      }, { timestamps: true });

      AuditLogSchema.index({ 'actor.id': 1, timestamp: -1 });
      AuditLogSchema.index({ 'target.id': 1, timestamp: -1 });
      AuditLogSchema.index({ eventType: 1, timestamp: -1 });

      AuditLog = mongoose.model('AuditLog', AuditLogSchema);
    }

    const logEntry = new AuditLog({
      eventType: event.type,
      severity: event.severity || 'info',
      actor: event.actor || { type: 'system' },
      target: event.target,
      action: event.action,
      details: event.details,
      metadata: event.metadata,
      timestamp: new Date(),
    });

    await logEntry.save();

    // Also log to console for immediate visibility
    console.log('[AUDIT]', JSON.stringify({
      type: event.type,
      severity: event.severity,
      actor: event.actor?.id || 'system',
      target: event.target?.id,
      action: event.action,
    }));

    return logEntry;

  } catch (err) {
    console.error('[AUDIT_LOG_ERROR]', err.message);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Log payment event
 */
export async function logPaymentEvent(eventType, orderId, amount, details = {}) {
  return createAuditLog({
    type: eventType,
    severity: eventType.includes('failed') || eventType.includes('chargeback') ? 'warning' : 'info',
    target: { type: 'order', id: orderId },
    action: eventType,
    details: { amount, ...details },
  });
}

/**
 * Log admin action
 */
export async function logAdminAction(adminId, adminEmail, action, target, details = {}) {
  return createAuditLog({
    type: action,
    severity: 'info',
    actor: { type: 'admin', id: adminId, email: adminEmail },
    target,
    action,
    details,
  });
}

/**
 * Log security event
 */
export async function logSecurityEvent(eventType, ip, details = {}) {
  return createAuditLog({
    type: eventType,
    severity: 'warning',
    actor: { type: 'webhook', ip },
    action: eventType,
    details,
  });
}

/**
 * Query audit logs
 */
export async function queryAuditLogs(filters = {}, options = {}) {
  await dbConnect();
  
  const mongoose = (await import('mongoose')).default;
  const AuditLog = mongoose.model('AuditLog');

  const query = {};

  if (filters.eventType) query.eventType = filters.eventType;
  if (filters.actorId) query['actor.id'] = filters.actorId;
  if (filters.targetId) query['target.id'] = filters.targetId;
  if (filters.severity) query.severity = filters.severity;
  if (filters.startDate) query.timestamp = { $gte: new Date(filters.startDate) };
  if (filters.endDate) {
    query.timestamp = { ...query.timestamp, $lte: new Date(filters.endDate) };
  }

  const { limit = 100, skip = 0, sort = { timestamp: -1 } } = options;

  return AuditLog.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
}
