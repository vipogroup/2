#!/usr/bin/env node

const enabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_TEST_HARNESS === 'true';

const summary = {
  NODE_ENV: process.env.NODE_ENV || '(undefined)',
  ENABLE_TEST_HARNESS: process.env.ENABLE_TEST_HARNESS || '(undefined)',
  enabled,
};

console.log('TEST_HARNESS_GATE_SMOKE');
console.log(JSON.stringify(summary, null, 2));
