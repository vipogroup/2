import { ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { getDb } from '@/lib/db';

let didAttemptLoadEnvLocal = false;

function findEnvLocalPath() {
  try {
    let dir = process.cwd();
    for (let i = 0; i < 6; i += 1) {
      const candidate = path.join(dir, '.env.local');
      if (fs.existsSync(candidate)) return candidate;
      const parent = path.dirname(dir);
      if (!parent || parent === dir) break;
      dir = parent;
    }
  } catch {}
  return null;
}

function getEnvDebug() {
  let envLocalPath = null;
  let envLocalExists = false;
  try {
    envLocalPath = findEnvLocalPath();
    envLocalExists = !!envLocalPath;
  } catch {}
  return {
    hasTarget: !!process?.env?.CATALOG_TEMPLATE_SYNC_TARGET_URL,
    hasSecret: !!process?.env?.CATALOG_TEMPLATE_SYNC_SECRET,
    targetLen: String(process?.env?.CATALOG_TEMPLATE_SYNC_TARGET_URL || '').length,
    secretLen: String(process?.env?.CATALOG_TEMPLATE_SYNC_SECRET || '').length,
    cwd: (() => {
      try {
        return process.cwd();
      } catch {
        return null;
      }
    })(),
    envLocalExists,
    envLocalPath,
  };
}

function ensureSyncEnvLoaded() {
  if (didAttemptLoadEnvLocal) return;
  didAttemptLoadEnvLocal = true;
  try {
    const hasTarget = !!process?.env?.CATALOG_TEMPLATE_SYNC_TARGET_URL;
    const hasSecret = !!process?.env?.CATALOG_TEMPLATE_SYNC_SECRET;
    if (hasTarget && hasSecret) return;
    const envLocalPath = findEnvLocalPath();
    if (!envLocalPath) return;
    dotenv.config({ path: envLocalPath, override: true });
  } catch {
    // ignore
  }
}

function getTargetBaseUrl() {
  ensureSyncEnvLoaded();
  const raw = process.env.CATALOG_TEMPLATE_SYNC_TARGET_URL;
  const url = raw ? String(raw).trim() : '';
  return url ? url.replace(/\/$/, '') : null;
}

function getSyncSecret() {
  ensureSyncEnvLoaded();
  const raw = process.env.CATALOG_TEMPLATE_SYNC_SECRET;
  const secret = raw ? String(raw).trim() : '';
  return secret || null;
}

function sanitizeSlug(value) {
  const slug = String(value || '').trim().toLowerCase();
  return slug || '';
}

function sanitizeString(value) {
  return String(value || '').trim();
}

function sanitizeTenantPayload(tenant) {
  const slug = sanitizeSlug(tenant?.slug);
  const name = sanitizeString(tenant?.name);
  if (!slug || !name) return null;

  const status = sanitizeString(tenant?.status) || 'pending';

  return {
    slug,
    name,
    status,
    platformCommissionRate: Number.isFinite(Number(tenant?.platformCommissionRate))
      ? Number(tenant.platformCommissionRate)
      : undefined,
    branding: tenant?.branding && typeof tenant.branding === 'object' ? tenant.branding : undefined,
    contact: tenant?.contact && typeof tenant.contact === 'object' ? tenant.contact : undefined,
    features: tenant?.features && typeof tenant.features === 'object' ? tenant.features : undefined,
  };
}

export async function syncTenantUpsert({ tenant }) {
  const baseUrl = getTargetBaseUrl();
  const secret = getSyncSecret();
  if (!baseUrl || !secret) return { ok: false, skipped: true, debug: getEnvDebug() };

  const payloadTenant = sanitizeTenantPayload(tenant);
  if (!payloadTenant) return { ok: false, skipped: true };

  const previousSlugRaw = tenant?.previousSlug;
  const previousSlug = previousSlugRaw ? sanitizeSlug(previousSlugRaw) : '';

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(baseUrl + '/api/internal/sync/tenants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-template-sync-secret': secret,
      },
      body: JSON.stringify({
        action: 'upsert',
        ...(previousSlug && previousSlug !== payloadTenant.slug ? { previousSlug } : {}),
        tenant: payloadTenant,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    clearTimeout(t);
    return { ok: false, error: err?.message || String(err) };
  }
}

export async function syncTenantDelete({ tenantSlug }) {
  const baseUrl = getTargetBaseUrl();
  const secret = getSyncSecret();
  if (!baseUrl || !secret) return { ok: false, skipped: true };

  const slug = sanitizeSlug(tenantSlug);
  if (!slug) return { ok: false, skipped: true };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(baseUrl + '/api/internal/sync/tenants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-template-sync-secret': secret,
      },
      body: JSON.stringify({
        action: 'delete',
        tenantSlug: slug,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    clearTimeout(t);
    return { ok: false, error: err?.message || String(err) };
  }
}

export async function getTenantById(tenantId) {
  const id = String(tenantId || '').trim();
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const doc = await db.collection('tenants').findOne({ _id: new ObjectId(id) });
  return doc || null;
}
