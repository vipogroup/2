export const ORDER_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING: 'pending',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  FAILED: 'failed',
});

export const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS);

const LEGACY_STATUS_MAP = {
  // Pending variants
  pending: ORDER_STATUS.PENDING,
  processing: ORDER_STATUS.PENDING,
  'in-progress': ORDER_STATUS.PENDING,
  'in_progress': ORDER_STATUS.PENDING,
  awaiting: ORDER_STATUS.PENDING,
  queued: ORDER_STATUS.PENDING,
  hold: ORDER_STATUS.PENDING,
  'on-hold': ORDER_STATUS.PENDING,
  'on_hold': ORDER_STATUS.PENDING,
  'awaiting-payment': ORDER_STATUS.PENDING,
  'awaiting_payment': ORDER_STATUS.PENDING,
  'awaiting-shipment': ORDER_STATUS.PENDING,
  'awaiting_shipment': ORDER_STATUS.PENDING,
  // Paid/completed variants
  paid: ORDER_STATUS.PAID,
  success: ORDER_STATUS.PAID,
  approved: ORDER_STATUS.PAID,
  completed: ORDER_STATUS.COMPLETED,
  fulfilled: ORDER_STATUS.COMPLETED,
  shipped: ORDER_STATUS.COMPLETED,
  shipping: ORDER_STATUS.COMPLETED,
  delivered: ORDER_STATUS.COMPLETED,
  'ready-for-pickup': ORDER_STATUS.COMPLETED,
  'ready_for_pickup': ORDER_STATUS.COMPLETED,
  settled: ORDER_STATUS.COMPLETED,
  // Cancelled variants
  cancelled: ORDER_STATUS.CANCELLED,
  canceled: ORDER_STATUS.CANCELLED,
  void: ORDER_STATUS.CANCELLED,
  rejected: ORDER_STATUS.CANCELLED,
  declined: ORDER_STATUS.CANCELLED,
  abandoned: ORDER_STATUS.CANCELLED,
  expired: ORDER_STATUS.CANCELLED,
  // Failed variants
  failed: ORDER_STATUS.FAILED,
  failure: ORDER_STATUS.FAILED,
  error: ORDER_STATUS.FAILED,
  chargeback: ORDER_STATUS.FAILED,
  dispute: ORDER_STATUS.FAILED,
  lost: ORDER_STATUS.FAILED,
  refunded: ORDER_STATUS.FAILED,
  refund: ORDER_STATUS.FAILED,
  'partial-refund': ORDER_STATUS.FAILED,
  'partial_refund': ORDER_STATUS.FAILED,
};

export function normalizeOrderStatus(value) {
  if (!value) return ORDER_STATUS.PENDING;
  const normalized = String(value).toLowerCase().trim();
  if (ORDER_STATUS_VALUES.includes(normalized)) {
    return normalized;
  }
  return LEGACY_STATUS_MAP[normalized] || ORDER_STATUS.PENDING;
}

export function isValidOrderStatus(value) {
  return ORDER_STATUS_VALUES.includes(normalizeOrderStatus(value));
}

export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  INITIATED: 'initiated',
  SUCCESS: 'success',
  FINAL_SUCCESS: 'final-success',
  FAILED: 'failed',
  FINAL_FAILED: 'final-failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIAL_REFUND: 'partial_refund',
  CHARGEBACK: 'chargeback',
});

export const PAYMENT_STATUS_VALUES = Object.values(PAYMENT_STATUS);

const FALLBACK_PAYMENT_STATUS_FOR_ORDER = {
  [ORDER_STATUS.DRAFT]: PAYMENT_STATUS.PENDING,
  [ORDER_STATUS.PENDING]: PAYMENT_STATUS.PENDING,
  [ORDER_STATUS.PAID]: PAYMENT_STATUS.SUCCESS,
  [ORDER_STATUS.CANCELLED]: PAYMENT_STATUS.CANCELLED,
  [ORDER_STATUS.COMPLETED]: PAYMENT_STATUS.SUCCESS,
  [ORDER_STATUS.FAILED]: PAYMENT_STATUS.FAILED,
};

export function coercePaymentStatusForOrderStatus(orderStatus, paymentStatus) {
  const normalizedOrderStatus = normalizeOrderStatus(orderStatus);
  const normalizedPaymentStatus = typeof paymentStatus === 'string' ? paymentStatus.trim().toLowerCase() : '';

  const isPaymentStatusValid = PAYMENT_STATUS_VALUES.includes(normalizedPaymentStatus);

  switch (normalizedOrderStatus) {
    case ORDER_STATUS.PAID:
      if (isPaymentStatusValid && [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.FINAL_SUCCESS].includes(normalizedPaymentStatus)) {
        return normalizedPaymentStatus;
      }
      return PAYMENT_STATUS.SUCCESS;
    case ORDER_STATUS.COMPLETED:
      if (isPaymentStatusValid && [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.FINAL_SUCCESS].includes(normalizedPaymentStatus)) {
        return normalizedPaymentStatus;
      }
      return PAYMENT_STATUS.SUCCESS;
    case ORDER_STATUS.CANCELLED:
      return PAYMENT_STATUS.CANCELLED;
    case ORDER_STATUS.FAILED:
      if (
        isPaymentStatusValid &&
        [
          PAYMENT_STATUS.FAILED,
          PAYMENT_STATUS.FINAL_FAILED,
          PAYMENT_STATUS.CHARGEBACK,
          PAYMENT_STATUS.REFUNDED,
          PAYMENT_STATUS.PARTIAL_REFUND,
        ].includes(normalizedPaymentStatus)
      ) {
        return normalizedPaymentStatus;
      }
      return PAYMENT_STATUS.FAILED;
    case ORDER_STATUS.DRAFT:
    case ORDER_STATUS.PENDING:
    default:
      if (isPaymentStatusValid && [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.INITIATED].includes(normalizedPaymentStatus)) {
        return normalizedPaymentStatus;
      }
      return FALLBACK_PAYMENT_STATUS_FOR_ORDER[normalizedOrderStatus] || PAYMENT_STATUS.PENDING;
  }
}

export const FINAL_ORDER_STATUSES = Object.freeze([
  ORDER_STATUS.PAID,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.FAILED,
]);

export const ORDER_STATUS_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.DRAFT]: [ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED, ORDER_STATUS.FAILED],
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED, ORDER_STATUS.FAILED],
  [ORDER_STATUS.PAID]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.FAILED],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.FAILED]: [],
});

export const ORDER_STATUS_ALLOWED_PAYMENT_STATUSES = Object.freeze({
  [ORDER_STATUS.DRAFT]: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.INITIATED],
  [ORDER_STATUS.PENDING]: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.INITIATED],
  [ORDER_STATUS.PAID]: [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.FINAL_SUCCESS],
  [ORDER_STATUS.CANCELLED]: [PAYMENT_STATUS.CANCELLED],
  [ORDER_STATUS.COMPLETED]: [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.FINAL_SUCCESS],
  [ORDER_STATUS.FAILED]: [
    PAYMENT_STATUS.FAILED,
    PAYMENT_STATUS.FINAL_FAILED,
    PAYMENT_STATUS.CHARGEBACK,
    PAYMENT_STATUS.REFUNDED,
    PAYMENT_STATUS.PARTIAL_REFUND,
  ],
});

export function assertOrderStatusInvariant(orderStatus, paymentStatus) {
  const normalizedStatus = normalizeOrderStatus(orderStatus);
  if (!ORDER_STATUS_VALUES.includes(normalizedStatus)) {
    throw new Error(`Invalid order status: ${orderStatus}`);
  }

  const normalizedPaymentStatus = typeof paymentStatus === 'string' ? paymentStatus.trim().toLowerCase() : '';
  if (!PAYMENT_STATUS_VALUES.includes(normalizedPaymentStatus)) {
    throw new Error(`Invalid payment status: ${paymentStatus}`);
  }

  const allowedPayments = ORDER_STATUS_ALLOWED_PAYMENT_STATUSES[normalizedStatus] || [];
  if (!allowedPayments.includes(normalizedPaymentStatus)) {
    throw new Error(
      `Payment status "${normalizedPaymentStatus}" is not allowed for order status "${normalizedStatus}"`,
    );
  }

  return { status: normalizedStatus, paymentStatus: normalizedPaymentStatus };
}

export function canTransitionOrderStatus(
  currentStatus,
  nextStatus,
  { allowRegression = false, actorRole = null, isAdminOverride = false } = {},
) {
  const normalizedCurrent = normalizeOrderStatus(currentStatus);
  const normalizedNext = normalizeOrderStatus(nextStatus);

  if (!ORDER_STATUS_VALUES.includes(normalizedCurrent) || !ORDER_STATUS_VALUES.includes(normalizedNext)) {
    return false;
  }

  if (normalizedCurrent === normalizedNext) {
    return true;
  }

  if (isAdminOverride) {
    return true;
  }

  const allowedTransitions = ORDER_STATUS_TRANSITIONS[normalizedCurrent] || [];
  if (allowedTransitions.includes(normalizedNext)) {
    return true;
  }

  if (allowRegression) {
    return true;
  }

  // Prevent transitions from final states back to non-final without explicit regression flag
  if (FINAL_ORDER_STATUSES.includes(normalizedCurrent) && !FINAL_ORDER_STATUSES.includes(normalizedNext)) {
    return false;
  }

  return false;
}
