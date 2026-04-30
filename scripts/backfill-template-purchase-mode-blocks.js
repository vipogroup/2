/**
 * Merge CatalogTemplate.purchaseModeBlocks into existing Product.fullDescription.
 * Logic aligned with lib/catalogTemplatePurchaseMode.js + lib/catalogProductMode.js
 *
 *   npm run backfill:template-purchase-blocks -- --dry-run
 *   npm run backfill:template-purchase-blocks
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const mongoose = require('mongoose');

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeGroupPurchaseType(value) {
  const normalized = normalizeToken(value).replace(/[\s-]+/g, '_');
  if (normalized === 'shared_container' || normalized === 'sharedcontainer') {
    return 'shared_container';
  }
  if (normalized === 'group' || normalized === 'regular_group') {
    return 'group';
  }
  return normalized;
}

function getCatalogProductMode(product) {
  const groupPurchaseType = normalizeGroupPurchaseType(product?.groupPurchaseType);
  if (groupPurchaseType === 'shared_container') {
    return 'shared_container';
  }
  const purchaseType = normalizeToken(product?.purchaseType || product?.type);
  if (purchaseType === 'group') {
    return 'group';
  }
  const inventoryMode = normalizeToken(product?.inventoryMode);
  if (inventoryMode === 'group') {
    return 'group';
  }
  if (inventoryMode === 'shared_container' || inventoryMode === 'sharedcontainer') {
    return 'shared_container';
  }
  return 'stock';
}

function mergeTemplatePurchaseModeIntoDescription(baseDescription, template, productLike) {
  const base = String(baseDescription || '').trim();
  const blocks = template && template.purchaseModeBlocks;
  if (!blocks || typeof blocks !== 'object') return base;

  const mode = getCatalogProductMode(productLike);
  const extra = String(blocks[mode] || '').trim();
  if (!extra) return base;

  const marker = `<!-- vipo:pm:${mode} -->`;
  if (base.includes(marker)) return base;

  const chunk = `${marker}\n${extra}`;
  return base ? `${base}\n\n${chunk}` : chunk;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI missing (.env.local)');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB || undefined,
  });

  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const limitArg = argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Math.max(0, parseInt(String(limitArg.split('=')[1] || '0'), 10) || 0) : 0;

  const Product = mongoose.connection.collection('products');
  const CatalogTemplate = mongoose.connection.collection('catalogtemplates');

  let updated = 0;
  let skipped = 0;
  let noTemplate = 0;
  let errors = 0;
  let processed = 0;

  const cursor = Product.find(
    { templateKey: { $exists: true, $nin: ['', null] } },
    {
      projection: {
        templateKey: 1,
        tenantId: 1,
        fullDescription: 1,
        purchaseType: 1,
        type: 1,
        groupPurchaseType: 1,
        inventoryMode: 1,
      },
    },
  );

  for await (const doc of cursor) {
    if (limit && processed >= limit) break;
    processed += 1;

    try {
      const key = String(doc.templateKey || '').trim();
      const tenantId = doc.tenantId || null;

      const tplQuery = { key, isActive: { $ne: false } };
      if (tenantId) {
        tplQuery.tenantId = tenantId;
      } else {
        tplQuery.tenantId = null;
      }

      let template = await CatalogTemplate.findOne(tplQuery);
      if (!template && tenantId) {
        template = await CatalogTemplate.findOne({
          key,
          tenantId: null,
          isActive: { $ne: false },
        });
      }

      if (!template) {
        noTemplate += 1;
        skipped += 1;
        continue;
      }

      const merged = mergeTemplatePurchaseModeIntoDescription(
        String(doc.fullDescription || ''),
        template,
        doc,
      );
      const prev = String(doc.fullDescription || '');
      if (merged === prev) {
        skipped += 1;
        continue;
      }

      if (dryRun) {
        console.log('[dry-run]', doc._id && doc._id.toString(), key);
        updated += 1;
        continue;
      }

      await Product.updateOne({ _id: doc._id }, { $set: { fullDescription: merged } });
      updated += 1;
    } catch (err) {
      errors += 1;
      console.error('[error]', doc._id && doc._id.toString(), err && err.message);
    }
  }

  console.log(
    JSON.stringify(
      { dryRun, limit: limit || null, processed, updated, skipped, noTemplate, errors },
      null,
      2,
    ),
  );
  await mongoose.disconnect();
  process.exit(errors ? 2 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
