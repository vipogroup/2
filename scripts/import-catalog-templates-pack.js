/**
 * Upsert catalog templates from exports/catalog-templates-stainless.json into MongoDB.
 * Targets: tenantId null (legacy), pack source.tenantId, and every tenantId that has
 * products using any template key from the pack (so per-tenant copies stay in sync).
 *
 *   npm run import:catalog-templates-pack -- --dry-run
 *   npm run import:catalog-templates-pack
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const PACK_PATH = path.join(__dirname, '..', 'exports', 'catalog-templates-stainless.json');

/** Align with app/api/internal/sync/catalog-templates — old DBs may have a unique index on { key: 1 } only. */
async function ensureCatalogTemplateIndexes(col) {
  const indexes = await col.indexes().catch(() => []);
  const uniqueKeyOnly = indexes.filter((idx) => {
    if (!idx?.unique) return false;
    const keySpec = idx?.key;
    return keySpec && typeof keySpec === 'object' && keySpec.key === 1 && Object.keys(keySpec).length === 1;
  });
  for (const idx of uniqueKeyOnly) {
    if (!idx?.name) continue;
    try {
      await col.dropIndex(idx.name);
      console.log('[indexes] dropped legacy unique index:', idx.name);
    } catch (err) {
      console.warn('[indexes] drop failed', idx.name, err && err.message);
    }
  }
  await col.createIndex({ key: 1 }, { name: 'key_1' });
  await col.createIndex(
    { tenantId: 1, key: 1 },
    { unique: true, name: 'tenantId_1_key_1' },
  );
}

function normalizeKeywords(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((s) => String(s).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function buildUpdateFromPackTemplate(template) {
  if (!template || !template.key) return null;
  const seo = template.seo && typeof template.seo === 'object' ? template.seo : {};
  const pm = template.purchaseModeBlocks && typeof template.purchaseModeBlocks === 'object'
    ? template.purchaseModeBlocks
    : {};
  return {
    name: String(template.name || template.titlePrefix || template.key).trim() || template.key,
    titlePrefix: String(template.titlePrefix || '').trim(),
    description: String(template.description || '').trim(),
    shortDescription: String(template.shortDescription || '').trim(),
    specs: String(template.specs || '').trim(),
    faq: String(template.faq || '').trim(),
    structuredData: String(template.structuredData || '').trim(),
    category: String(template.category || '').trim(),
    subCategory: String(template.subCategory || '').trim(),
    tags: Array.isArray(template.tags) ? template.tags.map((t) => String(t).trim()).filter(Boolean) : [],
    seo: {
      slugPrefix: String(seo.slugPrefix || '').trim(),
      metaTitle: String(seo.metaTitle || '').trim(),
      metaDescription: String(seo.metaDescription || '').trim(),
      keywords: normalizeKeywords(seo.keywords),
    },
    purchaseModeBlocks: {
      stock: String(pm.stock || '').trim(),
      group: String(pm.group || '').trim(),
      shared_container: String(pm.shared_container || '').trim(),
    },
    isActive: template.isActive !== false,
    updatedAt: new Date(),
  };
}

function parseTenantTargets(pack) {
  const out = [];
  const seen = new Set();

  const add = (tid) => {
    const label = tid === null ? 'null' : String(tid);
    if (seen.has(label)) return;
    seen.add(label);
    out.push(tid);
  };

  add(null);

  const raw = pack?.source?.tenantId;
  if (raw && ObjectId.isValid(String(raw))) {
    add(new ObjectId(String(raw)));
  }

  return { out, add };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI missing (.env.local)');
    process.exit(1);
  }

  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');

  const pack = JSON.parse(fs.readFileSync(PACK_PATH, 'utf8'));
  const templates = Array.isArray(pack.templates) ? pack.templates : [];
  const templateKeys = templates.map((t) => t && t.key).filter(Boolean);

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB || undefined,
  });

  const col = mongoose.connection.collection('catalogtemplates');
  const products = mongoose.connection.collection('products');

  await ensureCatalogTemplateIndexes(col);

  const { out: tenantTargets, add } = parseTenantTargets(pack);

  const distinctTenants = await products.distinct('tenantId', {
    templateKey: { $in: templateKeys },
  });
  for (const tid of distinctTenants) {
    if (tid) add(tid instanceof ObjectId ? tid : new ObjectId(String(tid)));
  }

  let upserts = 0;
  const now = new Date();

  for (const tenantId of tenantTargets) {
    for (const template of templates) {
      const key = String(template.key || '').trim();
      if (!key) continue;
      const $set = buildUpdateFromPackTemplate(template);
      if (!$set) continue;

      const filter = { tenantId, key };
      const update = {
        $set: $set,
        $setOnInsert: {
          tenantId,
          key,
          createdAt: now,
        },
      };

      if (dryRun) {
        upserts += 1;
        continue;
      }

      await col.updateOne(filter, update, { upsert: true });
      upserts += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        packPath: PACK_PATH,
        templateCount: templates.length,
        tenantScopes: tenantTargets.map((t) => (t === null ? null : String(t))),
        upsertOperations: upserts,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
