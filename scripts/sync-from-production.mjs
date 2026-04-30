/**
 * סנכרון מלא מהשרת החיצוני (Production / Vercel) לשרת המקומי (Local)
 * 
 * הסקריפט משתמש ב-Sync API (עם SYNC_SECRET) — ללא צורך ב-JWT/login
 * 
 * Prerequisites:
 *   1. /api/internal/sync/tenants  — must support action: 'list'
 *   2. /api/internal/sync/products — already supports action: 'list'
 *   3. CATALOG_TEMPLATE_SYNC_SECRET must be set in .env.local
 * 
 * שימוש:
 *   node scripts/sync-from-production.mjs --dry-run     (הצגת מה יש בפרודקשן בלבד)
 *   node scripts/sync-from-production.mjs --confirm      (ביצוע סנכרון בפועל)
 */

import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config({ path: '.env.local' });
dotenv.config();

// ─── Configuration ───
const PRODUCTION_URL = process.env.CATALOG_TEMPLATE_SYNC_TARGET_URL || 'https://vipo-agents-test.vercel.app';
const SYNC_SECRET = process.env.CATALOG_TEMPLATE_SYNC_SECRET || '';

const LOCAL_URI = process.env.MONGODB_URI;
const LOCAL_DB = process.env.MONGODB_DB;

function hasFlag(argv, flag) {
  return argv.includes(flag);
}

// ─── API Helper ───
async function syncApiCall(endpoint, body) {
  const url = `${PRODUCTION_URL}${endpoint}`;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-template-sync-secret': SYNC_SECRET,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, status: 0, data: null, error: err?.message || String(err) };
  }
}

// ─── Fetch tenants via sync API ───
async function fetchTenants() {
  console.log('  📥 Fetching tenants...');
  const res = await syncApiCall('/api/internal/sync/tenants', { action: 'list' });
  if (res.ok && Array.isArray(res.data?.tenants)) {
    return res.data.tenants;
  }
  console.error(`  ❌ Failed to fetch tenants: ${res.data?.error || res.error || `status ${res.status}`}`);
  return null;
}

// ─── Fetch products for a tenant via sync API ───
async function fetchProductsForTenant(tenantSlug, tenantName) {
  const res = await syncApiCall('/api/internal/sync/products', {
    action: 'list',
    tenantSlug,
    tenantName,
  });

  if (res.ok && Array.isArray(res.data?.products)) {
    return { products: res.data.products, tenantId: res.data.tenantId };
  }
  return { products: [], tenantId: null };
}

// ─── Fetch catalog templates for a tenant via sync API ───
async function fetchCatalogTemplates(tenantSlug, tenantName, fallbackToLegacy = false) {
  const res = await syncApiCall('/api/internal/sync/catalog-templates', {
    action: 'list',
    tenantSlug,
    tenantName,
    fallbackToLegacy,
  });

  if (res.ok && Array.isArray(res.data?.templates)) {
    return { templates: res.data.templates, tenantId: res.data.tenantId };
  }
  return { templates: [], tenantId: null };
}

async function main() {
  const argv = process.argv.slice(2);
  const confirm = hasFlag(argv, '--confirm');
  const dryRun = hasFlag(argv, '--dry-run') || !confirm;

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   PULL FROM PRODUCTION → LOCAL (via Sync API)               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`Mode:         ${dryRun ? '🔍 DRY RUN (no changes)' : '⚡ CONFIRM (will modify local DB)'}`);
  console.log(`Production:   ${PRODUCTION_URL}`);
  console.log(`Local DB:     ${LOCAL_URI} / ${LOCAL_DB}`);
  console.log(`Sync Secret:  ${SYNC_SECRET ? '✅ configured' : '❌ missing'}`);
  console.log();

  if (!LOCAL_URI || !LOCAL_DB) {
    console.error('❌ Missing MONGODB_URI or MONGODB_DB in .env.local');
    process.exit(1);
  }

  if (!SYNC_SECRET) {
    console.error('❌ Missing CATALOG_TEMPLATE_SYNC_SECRET in .env.local');
    process.exit(1);
  }

  // ─── Phase 1: Fetch tenants from production ───
  console.log('═══ Phase 1: Fetching tenants from production ═══');
  const tenants = await fetchTenants();
  if (!tenants || tenants.length === 0) {
    console.error('❌ No tenants found on production server.');
    console.error('   Make sure the production has the list action deployed.');
    console.error('   (Deploy this code to Vercel first if needed)');
    process.exit(1);
  }
  console.log(`  ✅ Found ${tenants.length} tenants`);

  // ─── Phase 2: Fetch products per tenant ───
  console.log('\n═══ Phase 2: Fetching products per tenant ═══');
  const allProducts = [];
  
  for (const tenant of tenants) {
    const slug = tenant.slug || '';
    const name = tenant.name || '';
    const { products, tenantId } = await fetchProductsForTenant(slug, name);
    
    // Enrich products with correct tenantId
    for (const p of products) {
      allProducts.push({ ...p, _tenantId: tenantId, _tenantSlug: slug });
    }
    
    console.log(`  📦 ${name} (${slug}): ${products.length} products`);
  }
  console.log(`  📦 סה"כ מוצרים: ${allProducts.length}`);
  console.log();

  // ─── Phase 3: Show summary ───
  console.log('═══ Phase 3: Summary ═══');
  console.log();
  console.log('  🏪 חנויות בפרודקשן:');
  console.log('  ─────────────────────────────────────────────');
  for (const tenant of tenants) {
    const slug = tenant.slug || '(none)';
    const prodCount = tenant.productsCount || 0;
    console.log(`  │ 🏪 ${tenant.name}`);
    console.log(`  │    slug: ${slug}`);
    console.log(`  │    status: ${tenant.status || 'unknown'}`);
    console.log(`  │    products: ${prodCount}`);
    console.log(`  │`);
  }
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  סה"כ חנויות: ${tenants.length}`);
  console.log(`  סה"כ מוצרים: ${allProducts.length}`);

  if (dryRun) {
    console.log('\n🔍 DRY RUN complete. No changes were made.');
    console.log('   Run with --confirm to sync these to local DB.');
    return;
  }

  // ─── Phase 4: Apply to Local DB ───
  console.log('\n═══ Phase 4: Applying to Local DB ═══');
  
  const localClient = new MongoClient(LOCAL_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    connectTimeoutMS: 30000,
  });

  try {
    await localClient.connect();
    const localDb = localClient.db(LOCAL_DB);
    console.log('  ✅ Connected to local DB');

    // 4a. Sync tenants
    console.log('\n  --- Syncing Tenants ---');
    const tenantsCol = localDb.collection('tenants');
    
    const delTenants = await tenantsCol.deleteMany({});
    console.log(`  🗑️  Deleted ${delTenants.deletedCount} old tenants`);

    if (tenants.length > 0) {
      const cleanTenants = tenants.map(t => {
        const clean = { ...t };
        if (typeof clean._id === 'string' && ObjectId.isValid(clean._id)) {
          clean._id = new ObjectId(clean._id);
        }
        if (typeof clean.ownerId === 'string' && ObjectId.isValid(clean.ownerId)) {
          clean.ownerId = new ObjectId(clean.ownerId);
        }
        delete clean.admin;
        delete clean.productsCount;
        return clean;
      });

      let insertedCount = 0;
      for (const doc of cleanTenants) {
        try {
          await tenantsCol.replaceOne({ _id: doc._id }, doc, { upsert: true });
          insertedCount++;
        } catch (err) {
          console.warn(`  ⚠️  Tenant ${doc.name}: ${err.message}`);
        }
      }
      console.log(`  ✅ Inserted ${insertedCount} tenants`);
    }

    // 4b. Sync products
    console.log('\n  --- Syncing Products ---');
    const productsCol = localDb.collection('products');
    
    const delProducts = await productsCol.deleteMany({});
    console.log(`  🗑️  Deleted ${delProducts.deletedCount} old products`);

    // Build tenant slug → ObjectId mapping from what we just inserted
    const localTenants = await tenantsCol.find({}).toArray();
    const slugToId = new Map();
    for (const lt of localTenants) {
      slugToId.set(lt.slug, lt._id);
    }

    if (allProducts.length > 0) {
      let insertedCount = 0;
      for (const p of allProducts) {
        try {
          const tenantId = slugToId.get(p._tenantSlug);
          if (!tenantId) continue;

          const doc = { ...p, tenantId };
          delete doc._tenantId;
          delete doc._tenantSlug;
          
          // Generate a unique _id if not present
          if (!doc._id) {
            doc._id = new ObjectId();
          } else if (typeof doc._id === 'string' && ObjectId.isValid(doc._id)) {
            doc._id = new ObjectId(doc._id);
          }

          await productsCol.replaceOne({ tenantId, sku: doc.sku }, doc, { upsert: true });
          insertedCount++;
        } catch (err) {
          console.warn(`  ⚠️  Product ${p.name || p.sku}: ${err.message}`);
        }
      }
      console.log(`  ✅ Inserted ${insertedCount} products`);
    }

    // 4c. Clear stale collections
    const staleCols = ['stainlessproducts'];
    for (const colName of staleCols) {
      try {
        const del = await localDb.collection(colName).deleteMany({});
        if (del.deletedCount > 0) {
          console.log(`  🗑️  Cleared ${colName}: ${del.deletedCount} documents`);
        }
      } catch {}
    }

    // 4d. Sync catalog templates
    console.log('\n  --- Syncing Catalog Templates ---');
    const catalogTemplatesCol = localDb.collection('catalogtemplates');
    const delTemplates = await catalogTemplatesCol.deleteMany({});
    console.log(`  🗑️  Deleted ${delTemplates.deletedCount} old catalog templates`);

    let totalTemplatesInserted = 0;

    // Fetch legacy templates (tenantId: null)
    console.log('  📥 Fetching legacy templates (tenantId: null)...');
    const { templates: legacyTemplates } = await fetchCatalogTemplates('__legacy__', '__legacy__', true);
    if (legacyTemplates.length > 0) {
      for (const tpl of legacyTemplates) {
        try {
          const doc = { ...tpl, tenantId: null };
          delete doc.id;
          if (doc._id && typeof doc._id === 'string' && ObjectId.isValid(doc._id)) {
            doc._id = new ObjectId(doc._id);
          } else {
            delete doc._id;
          }
          await catalogTemplatesCol.updateOne(
            { tenantId: null, key: doc.key },
            { $set: doc },
            { upsert: true }
          );
          totalTemplatesInserted++;
        } catch (err) {
          console.warn(`  ⚠️  Legacy template ${tpl.key}: ${err.message}`);
        }
      }
      console.log(`  ✅ Inserted ${legacyTemplates.length} legacy templates`);
    } else {
      console.log('  ℹ️  No legacy templates found on production');
    }

    // Fetch templates per tenant
    for (const tenant of tenants) {
      const slug = tenant.slug || '';
      const name = tenant.name || '';
      const { templates: tenantTemplates, tenantId: remoteTenantId } = await fetchCatalogTemplates(slug, name);
      if (!tenantTemplates.length) continue;

      const localTenantId = slugToId.get(slug);
      if (!localTenantId) {
        console.warn(`  ⚠️  Skipping templates for ${name}: tenant not found locally`);
        continue;
      }

      for (const tpl of tenantTemplates) {
        try {
          const doc = { ...tpl, tenantId: localTenantId };
          delete doc.id;
          if (doc._id && typeof doc._id === 'string' && ObjectId.isValid(doc._id)) {
            doc._id = new ObjectId(doc._id);
          } else {
            delete doc._id;
          }
          await catalogTemplatesCol.updateOne(
            { tenantId: localTenantId, key: doc.key },
            { $set: doc },
            { upsert: true }
          );
          totalTemplatesInserted++;
        } catch (err) {
          console.warn(`  ⚠️  Template ${tpl.key} for ${name}: ${err.message}`);
        }
      }
      console.log(`  📋 ${name}: ${tenantTemplates.length} templates`);
    }
    console.log(`  ✅ סה"כ תבניות: ${totalTemplatesInserted}`);

    // ─── Phase 5: Verification ───
    console.log('\n═══ Phase 5: Verification ═══');
    const localTenantCount = await tenantsCol.countDocuments({});
    const localProductCount = await productsCol.countDocuments({});
    
    const localTemplateCount = await catalogTemplatesCol.countDocuments({});
    console.log(`  Tenants:   Production=${tenants.length} → Local=${localTenantCount} ${tenants.length === localTenantCount ? '✅' : '⚠️'}`);
    console.log(`  Products:  Production=${allProducts.length} → Local=${localProductCount} ${allProducts.length === localProductCount ? '✅' : '⚠️'}`);
    console.log(`  Templates: Local=${localTemplateCount} ✅`);

    console.log('\n  📋 חנויות מקומיות אחרי סנכרון:');
    const finalTenants = await tenantsCol.find({}).toArray();
    for (const t of finalTenants) {
      const pCount = await productsCol.countDocuments({ tenantId: t._id });
      console.log(`  │ ${t.name} (${t.slug}) — ${pCount} products — ${t.status}`);
    }

    console.log('\n🎉 סנכרון הושלם בהצלחה!');
    console.log('   החנויות והמוצרים מהשרת החיצוני הועתקו לשרת המקומי.');

  } finally {
    await localClient.close();
  }
}

main().catch((err) => {
  console.error('❌ SYNC ERROR:', err?.message || err);
  process.exitCode = 1;
});
