#!/usr/bin/env node
/**
 * Pre-launch gate: deterministic checks before broad production marketing.
 * - lint + typecheck + build (required)
 * - test:api / test:ui (optional if script exists)
 * - critical files existence
 * - per-step timeout + explicit progress logging
 *
 * Output: reports/pre-launch-gate.json
 * Exit: 0 if required steps pass
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const pkgPath = path.join(root, 'package.json');
const pkgJson = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : {};
const scripts = pkgJson?.scripts || {};

const DEFAULT_TIMEOUT_MS = {
  lint: 120_000,
  typecheck: 180_000,
  build: 420_000,
  'test:api': 240_000,
  'test:ui': 300_000,
};

const startedAt = new Date();
const report = {
  startedAt: startedAt.toISOString(),
  finishedAt: null,
  durationMs: null,
  stale: false,
  ok: true,
  steps: [],
};

function addStep(stepResult) {
  report.steps.push(stepResult);
  if (stepResult.required && stepResult.status !== 'pass') {
    report.ok = false;
  }
}

function runNpmStep(script, { required = true, timeoutMs = 120_000 } = {}) {
  const command = `npm run ${script}`;
  const stepStartedAt = Date.now();
  process.stdout.write(`[pre-launch-gate] START ${command} (timeout=${timeoutMs}ms)\n`);

  try {
    const output = execSync(command, {
      cwd: root,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: timeoutMs,
      killSignal: 'SIGTERM',
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    const durationMs = Date.now() - stepStartedAt;
    process.stdout.write(`[pre-launch-gate] PASS ${command} (${durationMs}ms)\n`);
    return {
      name: command,
      required,
      status: 'pass',
      durationMs,
      detail: output ? String(output).slice(0, 4000) : '',
    };
  } catch (error) {
    const durationMs = Date.now() - stepStartedAt;
    const combinedOutput = [error?.stdout, error?.stderr]
      .filter(Boolean)
      .join('\n')
      .slice(0, 4000);
    const isTimeout =
      error?.code === 'ETIMEDOUT' ||
      error?.signal === 'SIGTERM' ||
      /timed? ?out/i.test(error?.message || '');
    const status = isTimeout ? 'timeout' : 'fail';
    process.stdout.write(`[pre-launch-gate] ${status.toUpperCase()} ${command} (${durationMs}ms)\n`);
    return {
      name: command,
      required,
      status,
      durationMs,
      detail: combinedOutput || error?.message || String(error),
    };
  }
}

function addFileCheck(relPath, required = true) {
  const abs = path.join(root, relPath);
  const exists = fs.existsSync(abs);
  const status = exists ? 'pass' : 'fail';
  process.stdout.write(`[pre-launch-gate] ${exists ? 'PASS' : 'FAIL'} file:${relPath}\n`);
  addStep({
    name: `file:${relPath}`,
    required,
    status,
    durationMs: 0,
    detail: exists ? 'exists' : 'missing',
  });
}

addStep(runNpmStep('lint', { required: true, timeoutMs: DEFAULT_TIMEOUT_MS.lint }));

if (process.env.PRELAUNCH_SKIP_BUILD === '1') {
  addStep({
    name: 'npm run build',
    required: true,
    status: 'skipped',
    durationMs: 0,
    detail: 'skipped (PRELAUNCH_SKIP_BUILD=1)',
  });
  addStep(runNpmStep('typecheck', { required: true, timeoutMs: DEFAULT_TIMEOUT_MS.typecheck }));
} else {
  const cleanStartedAt = Date.now();
  const nextDir = path.join(root, '.next');
  try {
    process.stdout.write('[pre-launch-gate] START clean:.next\n');
    fs.rmSync(nextDir, { recursive: true, force: true });
    const durationMs = Date.now() - cleanStartedAt;
    process.stdout.write(`[pre-launch-gate] PASS clean:.next (${durationMs}ms)\n`);
    addStep({
      name: 'clean:.next',
      required: false,
      status: 'pass',
      durationMs,
      detail: 'removed before build',
    });
  } catch (error) {
    const durationMs = Date.now() - cleanStartedAt;
    process.stdout.write(`[pre-launch-gate] FAIL clean:.next (${durationMs}ms)\n`);
    addStep({
      name: 'clean:.next',
      required: false,
      status: 'fail',
      durationMs,
      detail: error?.message || String(error),
    });
  }

  addStep(runNpmStep('build', { required: true, timeoutMs: DEFAULT_TIMEOUT_MS.build }));
  addStep(runNpmStep('typecheck', { required: true, timeoutMs: DEFAULT_TIMEOUT_MS.typecheck }));
}

if (scripts['test:api']) {
  addStep(runNpmStep('test:api', { required: false, timeoutMs: DEFAULT_TIMEOUT_MS['test:api'] }));
} else {
  addStep({
    name: 'npm run test:api',
    required: false,
    status: 'skipped',
    durationMs: 0,
    detail: 'script_missing',
  });
}

if (scripts['test:ui']) {
  addStep(runNpmStep('test:ui', { required: false, timeoutMs: DEFAULT_TIMEOUT_MS['test:ui'] }));
} else {
  addStep({
    name: 'npm run test:ui',
    required: false,
    status: 'skipped',
    durationMs: 0,
    detail: 'script_missing',
  });
}

const criticalRelPaths = [
  'app/page.jsx',
  'app/cart/page.jsx',
  'app/checkout/page.jsx',
  'app/checkout/success/page.jsx',
  'app/checkout/cancel/page.jsx',
  'app/(public)/login/page.jsx',
  'app/privacy/page.jsx',
  'app/terms/page.jsx',
  'app/returns-policy/page.jsx',
  'app/api/health/route.js',
  'middleware.js',
  'next.config.js',
];

for (const rel of criticalRelPaths) {
  addFileCheck(rel, true);
}

const finishedAt = new Date();
report.finishedAt = finishedAt.toISOString();
report.durationMs = finishedAt.getTime() - startedAt.getTime();

const outPath = path.join(reportsDir, 'pre-launch-gate.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
process.stdout.write(`[pre-launch-gate] wrote ${outPath} ok=${report.ok}\n`);

process.exit(report.ok ? 0 : 1);
