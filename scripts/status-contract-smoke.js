#!/usr/bin/env node
/*
 * Status Contract Smoke Test
 * Validates normalization, invariants, and transition rules for order/payment statuses.
 */

const path = require('path');
const { pathToFileURL } = require('url');

async function loadStatusModule() {
  const modulePath = path.join(__dirname, '..', 'lib', 'orders', 'status.js');
  return import(pathToFileURL(modulePath).href);
}

(async () => {
  const {
    ORDER_STATUS,
    ORDER_STATUS_VALUES,
    PAYMENT_STATUS_VALUES,
    ORDER_STATUS_ALLOWED_PAYMENT_STATUSES,
    ORDER_STATUS_TRANSITIONS,
    normalizeOrderStatus,
    coercePaymentStatusForOrderStatus,
    assertOrderStatusInvariant,
    canTransitionOrderStatus,
  } = await loadStatusModule();

  const checks = [];
  let failed = false;
  let firstFailure = null;

  function record(name, passed, detail = '') {
    checks.push({ name, passed, detail });
    if (!passed && !failed) {
      failed = true;
      firstFailure = { name, detail };
    }
  }

  function expectThrows(fn, label) {
    try {
      fn();
      record(label, false, 'Expected error but none thrown');
    } catch (err) {
      record(label, true, err?.message || 'threw as expected');
    }
  }

  function expectNotThrow(fn, label) {
    try {
      fn();
      record(label, true, 'ok');
    } catch (err) {
      record(label, false, err?.message || 'unexpected error');
    }
  }

  // === A) Normalization of legacy statuses ===
  const legacyStatuses = [
    'processing',
    'Processing',
    ' shipped ',
    'FULFILLED',
    'Ready_for_pickup',
    'queued',
    'ON-HOLD',
    'awaiting-payment',
    'Success',
    'settled',
    'declined',
    'expired',
    'chargeback',
    'partial_refund',
    'refund',
  ];

  legacyStatuses.forEach((legacy) => {
    const normalized = normalizeOrderStatus(legacy);
    const passed = ORDER_STATUS_VALUES.includes(normalized);
    record(`normalize:${legacy}`, passed, `=> ${normalized}`);
  });

  // === B) Payment invariants ===
  const validPairs = [];
  Object.entries(ORDER_STATUS_ALLOWED_PAYMENT_STATUSES).forEach(([status, payments]) => {
    payments.forEach((payment) => {
      validPairs.push({ status, payment });
      validPairs.push({ status: status.toUpperCase(), payment });
      validPairs.push({ status: ` ${status} `, payment });
    });
  });

  const invalidPairs = [
    { status: ORDER_STATUS.PAID, paymentStatus: 'failed' },
    { status: ORDER_STATUS.PAID, paymentStatus: 'processing' },
    { status: ORDER_STATUS.COMPLETED, paymentStatus: 'failed' },
    { status: ORDER_STATUS.CANCELLED, paymentStatus: 'success' },
    { status: ORDER_STATUS.FAILED, paymentStatus: 'success' },
    { status: ORDER_STATUS.PENDING, paymentStatus: 'success' },
    { status: ORDER_STATUS.DRAFT, paymentStatus: 'success' },
    { status: ORDER_STATUS.CANCELLED, paymentStatus: 'pending' },
    { status: ORDER_STATUS.FAILED, paymentStatus: 'cancelled' },
    { status: ORDER_STATUS.COMPLETED, paymentStatus: 'cancelled' },
    { status: ORDER_STATUS.DRAFT, paymentStatus: 'final-success' },
    { status: ORDER_STATUS.PAID, paymentStatus: 'unknown' },
  ];

  validPairs.forEach(({ status, payment }) => {
    expectNotThrow(() => assertOrderStatusInvariant(status, payment), `assert:valid:${status}->${payment}`);
  });

  invalidPairs.forEach(({ status, paymentStatus }) => {
    expectThrows(() => assertOrderStatusInvariant(status, paymentStatus), `assert:invalid:${status}->${paymentStatus}`);
  });

  // === C) Transition table checks ===
  const transitionSamples = [
    { from: ORDER_STATUS.DRAFT, to: ORDER_STATUS.PENDING, allowed: true },
    { from: ORDER_STATUS.DRAFT, to: ORDER_STATUS.CANCELLED, allowed: true },
    { from: ORDER_STATUS.DRAFT, to: ORDER_STATUS.PAID, allowed: false },
    { from: ORDER_STATUS.PENDING, to: ORDER_STATUS.PAID, allowed: true },
    { from: ORDER_STATUS.PENDING, to: ORDER_STATUS.CANCELLED, allowed: true },
    { from: ORDER_STATUS.PENDING, to: ORDER_STATUS.COMPLETED, allowed: false },
    { from: ORDER_STATUS.PENDING, to: ORDER_STATUS.DRAFT, allowed: false },
    { from: ORDER_STATUS.PAID, to: ORDER_STATUS.COMPLETED, allowed: true },
    { from: ORDER_STATUS.PAID, to: ORDER_STATUS.CANCELLED, allowed: true },
    { from: ORDER_STATUS.PAID, to: ORDER_STATUS.FAILED, allowed: true },
    { from: ORDER_STATUS.PAID, to: ORDER_STATUS.PENDING, allowed: false },
    { from: ORDER_STATUS.COMPLETED, to: ORDER_STATUS.PAID, allowed: false },
    { from: ORDER_STATUS.COMPLETED, to: ORDER_STATUS.CANCELLED, allowed: false },
    { from: ORDER_STATUS.CANCELLED, to: ORDER_STATUS.PENDING, allowed: false },
    { from: ORDER_STATUS.CANCELLED, to: ORDER_STATUS.PAID, allowed: false },
    { from: ORDER_STATUS.FAILED, to: ORDER_STATUS.PENDING, allowed: false },
    { from: ORDER_STATUS.FAILED, to: ORDER_STATUS.COMPLETED, allowed: false },
    { from: ORDER_STATUS.PAID, to: ORDER_STATUS.PAID, allowed: true },
    { from: ORDER_STATUS.PENDING, to: ORDER_STATUS.PENDING, allowed: true },
    { from: ORDER_STATUS.DRAFT, to: ORDER_STATUS.DRAFT, allowed: true },
    { from: ORDER_STATUS.PENDING, to: ORDER_STATUS.FAILED, allowed: true },
    { from: ORDER_STATUS.DRAFT, to: ORDER_STATUS.FAILED, allowed: true },
  ];

  transitionSamples.forEach(({ from, to, allowed }) => {
    const result = canTransitionOrderStatus(from, to, { actorRole: 'admin' });
    const passed = result === allowed;
    record(`transition:${from}->${to}`, passed, `expected=${allowed} actual=${result}`);
  });

  // Summary
  const summary = {
    ok: !failed,
    checksCount: checks.length,
    firstFailure,
  };

  console.log('STATUS_CONTRACT_SMOKE:', failed ? 'FAIL' : 'PASS');
  if (failed && firstFailure) {
    console.log(`FIRST_FAILURE: ${firstFailure.name} (${firstFailure.detail})`);
  }
  console.log(JSON.stringify(summary, null, 2));

  if (failed) {
    process.exitCode = 1;
  }
})();
