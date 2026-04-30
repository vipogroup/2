/**
 * Auto-Sync: Polling service that keeps local DB in sync with production
 * 
 * Runs in the background when the dev server starts.
 * Periodically pulls tenants and products from the production server
 * and updates the local MongoDB.
 * 
 * The production server is the source of truth.
 * Local changes are pushed to production via tenantSync.js and productSync.js.
 * Production changes are pulled to local via this polling service.
 */

import { MongoClient, ObjectId } from 'mongodb';

// ─── State ───
let isRunning = false;
let intervalHandle = null;
let lastSyncAt = null;
let syncCount = 0;

// ─── Configuration ───
const SYNC_INTERVAL_MS = Number(process.env.AUTO_SYNC_INTERVAL_MS) || 60000; // Default: 60 seconds
/** Opt-in only: when true, pulls tenants/products from CATALOG_TEMPLATE_SYNC_TARGET_URL into local Mongo. Default off so local DB edits (e.g. SEO scripts) are not overwritten every minute. */
const ENABLED = process.env.AUTO_SYNC_ENABLED === 'true';

function getConfig() {
  const targetUrl = (process.env.CATALOG_TEMPLATE_SYNC_TARGET_URL || '').trim().replace(/\/$/, '');
  const secret = (process.env.CATALOG_TEMPLATE_SYNC_SECRET || '').trim();
  const localUri = (process.env.MONGODB_URI || '').trim();
  const localDb = (process.env.MONGODB_DB || '').trim();
  return { targetUrl, secret, localUri, localDb };
}

// ─── API Helper ───
async function syncApiCall(targetUrl, secret, endpoint, body) {
  const url = `${targetUrl}${endpoint}`;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-template-sync-secret': secret,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, error: err?.message || String(err) };
  }
}

// ─── Sync Logic ───
async function pullFromProduction() {
  const { targetUrl, secret, localUri, localDb } = getConfig();
  
  if (!targetUrl || !secret || !localUri || !localDb) {
    return { ok: false, reason: 'missing_config' };
  }

  // Don't sync if target is localhost (would create infinite loop)
  if (targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1')) {
    return { ok: false, reason: 'target_is_localhost' };
  }

  const client = new MongoClient(localUri, {
    maxPoolSize: 3,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 10000,
  });

  try {
    // 1. Fetch tenants from production
    const tenantsRes = await syncApiCall(targetUrl, secret, '/api/internal/sync/tenants', { action: 'list' });
    if (!tenantsRes.ok || !Array.isArray(tenantsRes.data?.tenants)) {
      return { ok: false, reason: 'tenants_fetch_failed', error: tenantsRes.data?.error || tenantsRes.error };
    }

    const prodTenants = tenantsRes.data.tenants;

    // 2. Fetch products per tenant
    const prodProducts = [];
    for (const tenant of prodTenants) {
      const slug = tenant.slug || '';
      const name = tenant.name || '';
      if (!slug) continue;

      const productsRes = await syncApiCall(targetUrl, secret, '/api/internal/sync/products', {
        action: 'list',
        tenantSlug: slug,
        tenantName: name,
      });

      if (productsRes.ok && Array.isArray(productsRes.data?.products)) {
        for (const p of productsRes.data.products) {
          prodProducts.push({ ...p, _tenantSlug: slug, _remoteTenantId: productsRes.data.tenantId });
        }
      }
    }

    // 3. Connect to local DB and apply changes
    await client.connect();
    const db = client.db(localDb);
    const tenantsCol = db.collection('tenants');
    const productsCol = db.collection('products');

    // 3a. Sync tenants
    let tenantsUpdated = 0;
    let tenantsCreated = 0;
    let tenantsDeleted = 0;

    const prodTenantSlugs = new Set(prodTenants.map(t => t.slug));

    for (const tenant of prodTenants) {
      const cleanTenant = { ...tenant };
      if (typeof cleanTenant._id === 'string' && ObjectId.isValid(cleanTenant._id)) {
        cleanTenant._id = new ObjectId(cleanTenant._id);
      }
      if (typeof cleanTenant.ownerId === 'string' && ObjectId.isValid(cleanTenant.ownerId)) {
        cleanTenant.ownerId = new ObjectId(cleanTenant.ownerId);
      }
      delete cleanTenant.admin;
      delete cleanTenant.productsCount;

      const existing = await tenantsCol.findOne({ slug: tenant.slug });
      if (existing) {
        // Check if changed (compare updatedAt)
        const prodUpdated = tenant.updatedAt ? new Date(tenant.updatedAt).getTime() : 0;
        const localUpdated = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        if (prodUpdated > localUpdated || !existing.updatedAt) {
          await tenantsCol.replaceOne({ slug: tenant.slug }, cleanTenant);
          tenantsUpdated++;
        }
      } else {
        try {
          await tenantsCol.insertOne(cleanTenant);
          tenantsCreated++;
        } catch {
          await tenantsCol.replaceOne({ _id: cleanTenant._id }, cleanTenant, { upsert: true });
          tenantsCreated++;
        }
      }
    }

    // Delete local tenants that don't exist in production
    const localTenants = await tenantsCol.find({}).toArray();
    for (const lt of localTenants) {
      if (lt.slug && !prodTenantSlugs.has(lt.slug)) {
        await tenantsCol.deleteOne({ _id: lt._id });
        await productsCol.deleteMany({ tenantId: lt._id });
        tenantsDeleted++;
      }
    }

    // 3b. Sync products
    let productsUpdated = 0;
    let productsCreated = 0;
    let productsDeleted = 0;

    // Build slug → local tenant ID mapping
    const refreshedTenants = await tenantsCol.find({}).toArray();
    const slugToId = new Map();
    for (const t of refreshedTenants) {
      if (t.slug) slugToId.set(t.slug, t._id);
    }

    // Track production SKUs per tenant for deletion
    const prodSkusByTenant = new Map();

    for (const p of prodProducts) {
      const tenantId = slugToId.get(p._tenantSlug);
      if (!tenantId) continue;

      const sku = String(p.sku || '').trim();
      if (!sku) continue;

      // Track SKU
      if (!prodSkusByTenant.has(p._tenantSlug)) {
        prodSkusByTenant.set(p._tenantSlug, new Set());
      }
      prodSkusByTenant.get(p._tenantSlug).add(sku);

      const doc = { ...p, tenantId };
      delete doc._tenantSlug;
      delete doc._remoteTenantId;
      if (!doc._id) doc._id = new ObjectId();
      else if (typeof doc._id === 'string' && ObjectId.isValid(doc._id)) {
        doc._id = new ObjectId(doc._id);
      }

      const existing = await productsCol.findOne({ tenantId, sku });
      if (existing) {
        await productsCol.replaceOne({ tenantId, sku }, doc);
        productsUpdated++;
      } else {
        try {
          await productsCol.replaceOne({ tenantId, sku }, doc, { upsert: true });
          productsCreated++;
        } catch {
          // ignore duplicate key errors
        }
      }
    }

    // Delete local products that don't exist in production (per tenant)
    for (const [slug, skuSet] of prodSkusByTenant) {
      const tenantId = slugToId.get(slug);
      if (!tenantId) continue;
      const localProducts = await productsCol.find({ tenantId }, { projection: { sku: 1 } }).toArray();
      for (const lp of localProducts) {
        if (lp.sku && !skuSet.has(lp.sku)) {
          await productsCol.deleteOne({ _id: lp._id });
          productsDeleted++;
        }
      }
    }

    const result = {
      ok: true,
      tenants: { total: prodTenants.length, created: tenantsCreated, updated: tenantsUpdated, deleted: tenantsDeleted },
      products: { total: prodProducts.length, created: productsCreated, updated: productsUpdated, deleted: productsDeleted },
      syncedAt: new Date().toISOString(),
    };

    lastSyncAt = new Date();
    syncCount++;

    const hasChanges = tenantsCreated + tenantsUpdated + tenantsDeleted + productsCreated + productsUpdated + productsDeleted > 0;
    if (hasChanges) {
      console.log(`[AUTO-SYNC] Changes applied:`, JSON.stringify(result));
    }

    return result;
  } catch (err) {
    return { ok: false, reason: 'sync_error', error: err?.message || String(err) };
  } finally {
    await client.close().catch(() => {});
  }
}

// ─── Public API ───

/**
 * Start the auto-sync polling service.
 * Should be called once when the dev server starts.
 */
export function startAutoSync() {
  if (!ENABLED) {
    console.log('[AUTO-SYNC] Disabled — set AUTO_SYNC_ENABLED=true (+ CATALOG_TEMPLATE_SYNC_* ) to pull prod into local Mongo');
    return;
  }

  const { targetUrl, secret, localUri, localDb } = getConfig();
  if (!targetUrl || !secret || !localUri || !localDb) {
    console.log('[AUTO-SYNC] Skipped — missing configuration');
    return;
  }

  if (targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1')) {
    console.log('[AUTO-SYNC] Skipped — target is localhost (would loop)');
    return;
  }

  if (isRunning) {
    console.log('[AUTO-SYNC] Already running');
    return;
  }

  isRunning = true;
  console.log(`[AUTO-SYNC] Started — polling every ${SYNC_INTERVAL_MS / 1000}s from ${targetUrl}`);

  // Initial sync after 5 seconds (let the server start first)
  setTimeout(async () => {
    try {
      const result = await pullFromProduction();
      if (result.ok) {
        console.log(`[AUTO-SYNC] Initial sync complete — ${result.tenants.total} tenants, ${result.products.total} products`);
      } else {
        console.warn(`[AUTO-SYNC] Initial sync issue: ${result.reason || result.error || 'unknown'}`);
      }
    } catch (err) {
      console.warn(`[AUTO-SYNC] Initial sync error: ${err?.message || err}`);
    }
  }, 5000);

  // Periodic sync
  intervalHandle = setInterval(async () => {
    try {
      await pullFromProduction();
    } catch (err) {
      console.warn(`[AUTO-SYNC] Polling error: ${err?.message || err}`);
    }
  }, SYNC_INTERVAL_MS);
}

/**
 * Stop the auto-sync polling service.
 */
export function stopAutoSync() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  isRunning = false;
  console.log('[AUTO-SYNC] Stopped');
}

/**
 * Get the current status of auto-sync.
 */
export function getAutoSyncStatus() {
  return {
    running: isRunning,
    enabled: ENABLED,
    intervalMs: SYNC_INTERVAL_MS,
    lastSyncAt,
    syncCount,
  };
}

/**
 * Manually trigger a sync (useful for API endpoint or button).
 */
export async function triggerSync() {
  return pullFromProduction();
}
