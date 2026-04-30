import dbConnect from '@/lib/dbConnect';
import Order from '@/models/Order';
import {
  ORDER_STATUS,
  normalizeOrderStatus,
  coercePaymentStatusForOrderStatus,
  canTransitionOrderStatus,
  assertOrderStatusInvariant,
} from '@/lib/orders/status';
import { createAuditLog } from '@/lib/security/auditLog';

const AUDIT_BASE_DETAILS = {
  source: 'auxiliary_writer',
  contract: 'order_status',
};

/**
 * Apply canonical status/payment update pipeline to an order document.
 *
 * @param {Object} params
 * @param {Object|null} params.order - Existing order document (optional)
 * @param {string} params.orderId - Order ID if document not provided
 * @param {string} params.nextStatus - Desired next order status
 * @param {string} [params.nextPaymentStatus] - Desired next payment status (optional)
 * @param {Object|string} [params.actor] - Actor descriptor or role string
 * @param {string} [params.reason] - Reason for update
 * @param {boolean} [params.allowIllegal=false] - Allow illegal transitions (logs override)
 * @param {boolean} [params.skipTransitionCheck=false] - Skip transition guard (legacy)
 * @param {Object} [params.metadata={}] - Additional metadata (should include requestId/source when available)
 *
 * @returns {Promise<{orderId:string, oldStatus:string, newStatus:string, oldPaymentStatus:string, newPaymentStatus:string, changed:boolean}>}
 */
export async function applyOrderStatusUpdate({
  order,
  orderId,
  nextStatus,
  nextPaymentStatus,
  actor = 'system',
  reason,
  allowIllegal = false,
  skipTransitionCheck = false,
  metadata = {},
}) {
  await dbConnect();

  const orderDoc = order || (await Order.findById(orderId));
  if (!orderDoc) {
    throw new Error(`Order ${orderId} not found`);
  }

  const actorDescriptor =
    typeof actor === 'string'
      ? { type: actor, id: actor === 'system' ? undefined : actor }
      : actor || {};
  const actorPayload = {
    type: actorDescriptor.type || 'system',
    id: actorDescriptor.id,
    email: actorDescriptor.email,
  };

  const oldStatus = orderDoc.status;
  const oldPaymentStatus = orderDoc.paymentStatus;
  const normalizedStatus = normalizeOrderStatus(nextStatus || orderDoc.status);
  const candidatePaymentStatus =
    typeof nextPaymentStatus === 'string' ? nextPaymentStatus : orderDoc.paymentStatus;
  const coercedPaymentStatus = coercePaymentStatusForOrderStatus(normalizedStatus, candidatePaymentStatus);

  const transitionAllowed =
    skipTransitionCheck ||
    canTransitionOrderStatus(orderDoc.status, normalizedStatus, {
      actorRole: actorDescriptor?.type || 'system',
      isAdminOverride: false,
    });

  if (!transitionAllowed && !allowIllegal) {
    await createAuditLog({
      type: 'INVALID_TRANSITION_BLOCKED',
      severity: 'error',
      actor: actorPayload,
      target: { type: 'order', id: orderDoc._id.toString() },
      details: {
        ...AUDIT_BASE_DETAILS,
        ...metadata,
        reason: reason || 'Transition blocked',
        from: orderDoc.status,
        to: normalizedStatus,
      },
    });

    const error = new Error(
      `Transition from "${orderDoc.status}" to "${normalizedStatus}" is not allowed`,
    );
    error.code = 'ORDER_TRANSITION_BLOCKED';
    error.orderId = orderDoc._id.toString();
    return Promise.reject(error);
  }

  const { status: invariantStatus, paymentStatus: invariantPaymentStatus } =
    assertOrderStatusInvariant(normalizedStatus, coercedPaymentStatus);

  const update = {
    status: invariantStatus,
    paymentStatus: invariantPaymentStatus,
    updatedAt: new Date(),
  };

  if (invariantStatus === ORDER_STATUS.PAID && orderDoc.commissionAmount > 0 && !orderDoc.commissionSettled) {
    update.commissionSettled = true;
  }

  const changedStatus = oldStatus !== invariantStatus;
  const changedPayment = oldPaymentStatus !== invariantPaymentStatus;

  await Order.updateOne({ _id: orderDoc._id }, { $set: update });

  const auditDetails = {
    ...AUDIT_BASE_DETAILS,
    ...metadata,
    oldStatus,
    newStatus: invariantStatus,
    oldPaymentStatus,
    newPaymentStatus: invariantPaymentStatus,
    reason,
  };

  const auditEvents = [];
  if (changedStatus) {
    auditEvents.push(
      createAuditLog({
        type: 'ORDER_STATUS_NORMALIZED',
        severity: 'info',
        actor: actorPayload,
        target: { type: 'order', id: orderDoc._id.toString() },
        details: auditDetails,
      }),
    );
  }

  if (changedPayment) {
    auditEvents.push(
      createAuditLog({
        type: 'PAYMENT_STATUS_COERCED',
        severity: 'info',
        actor: actorPayload,
        target: { type: 'order', id: orderDoc._id.toString() },
        details: auditDetails,
      }),
    );
  }

  if (!transitionAllowed && allowIllegal) {
    auditEvents.push(
      createAuditLog({
        type: 'INVALID_TRANSITION_OVERRIDE',
        severity: 'warning',
        actor: actorPayload,
        target: { type: 'order', id: orderDoc._id.toString() },
        details: {
          ...auditDetails,
          note: 'Illegal transition overridden by allowIllegal flag',
        },
      }),
    );
  }

  await Promise.all(auditEvents);

  return {
    orderId: orderDoc._id.toString(),
    oldStatus,
    newStatus: invariantStatus,
    oldPaymentStatus,
    newPaymentStatus: invariantPaymentStatus,
    changed: changedStatus || changedPayment,
  };
}
