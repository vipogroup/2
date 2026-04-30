#!/usr/bin/env node
/**
 * pull-templates-from-vercel.mjs
 *
 * Pulls catalog templates FROM the external (Vercel) server and upserts
 * them INTO the local MongoDB. This is the reverse-sync direction.
 *
 * Usage:
 *   node scripts/pull-templates-from-vercel.mjs [tenantSlug]
 *
 * Example:
 *   node scripts/pull-templates-from-vercel.mjs vcv
 *
 * Environment (from .env.local):
 *   MONGODB_URI, MONGODB_DB,
 *   CATALOG_TEMPLATE_SYNC_TARGET_URL, CATALOG_TEMPLATE_SYNC_SECRET
 */

import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'vipo';
const EXTERNAL_URL = (process.env.CATALOG_TEMPLATE_SYNC_TARGET_URL || '').replace(/\/$/, '');
const SYNC_SECRET = process.env.CATALOG_TEMPLATE_SYNC_SECRET || '';

const TENANT_SLUG = process.argv[2] || 'vcv';

if (!EXTERNAL_URL || !SYNC_SECRET) {
  console.error('❌ Missing CATALOG_TEMPLATE_SYNC_TARGET_URL or CATALOG_TEMPLATE_SYNC_SECRET in .env.local');
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in .env.local');
  process.exit(1);
}

async function fetchRemoteTemplates(tenantSlug) {
  const res = await fetch(`${EXTERNAL_URL}/api/internal/sync/catalog-templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-template-sync-secret': SYNC_SECRET,
    },
    body: JSON.stringify({
      action: 'list',
      tenantSlug,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.ok) {
    console.error(`❌ Failed to fetch remote templates: ${data.error || `HTTP ${res.status}`}`);
    if (data.details) console.error('   Details:', data.details);
    return null;
  }

  return data;
}

async function upsertLocalTemplates(templates, tenantSlug) {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);

    // Find local tenant by slug
    const tenant = await db.collection('tenants').findOne({ slug: tenantSlug });
    if (!tenant) {
      console.error(`❌ Local tenant not found for slug: ${tenantSlug}`);
      return { inserted: 0, updated: 0, errors: 0 };
    }

    const localTenantId = tenant._id;
    console.log(`📦 Local tenant: "${tenant.name}" (${localTenantId})`);

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const tpl of templates) {
      try {
        const filter = { tenantId: localTenantId, key: tpl.key };
        const update = {
          $set: {
            name: tpl.name || '',
            titlePrefix: tpl.titlePrefix || '',
            shortDescription: tpl.shortDescription || '',
            description: tpl.description || '',
            specs: tpl.specs || '',
            faq: tpl.faq || '',
            structuredData: tpl.structuredData || '',
            category: tpl.category || '',
            subCategory: tpl.subCategory || '',
            tags: Array.isArray(tpl.tags) ? tpl.tags : [],
            seo: {
              slugPrefix: tpl.seo?.slugPrefix || '',
              metaTitle: tpl.seo?.metaTitle || '',
              metaDescription: tpl.seo?.metaDescription || '',
              keywords: Array.isArray(tpl.seo?.keywords) ? tpl.seo.keywords : [],
            },
            isActive: tpl.isActive !== false,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            tenantId: localTenantId,
            key: tpl.key,
            createdAt: new Date(),
          },
        };

        const result = await db.collection('catalogtemplates').updateOne(filter, update, { upsert: true });

        if (result.upsertedCount > 0) {
          inserted++;
        } else if (result.modifiedCount > 0) {
          updated++;
        }
      } catch (err) {
        errors++;
        console.error(`  ❌ Error upserting key="${tpl.key}": ${err.message}`);
      }
    }

    return { inserted, updated, errors };
  } finally {
    await client.close();
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Pull Templates: Vercel → Local');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Tenant slug: ${TENANT_SLUG}`);
  console.log(`  Source: ${EXTERNAL_URL}`);
  console.log('');

  // Step 1: Fetch from Vercel
  console.log('🌐 Fetching templates from Vercel...');
  const remote = await fetchRemoteTemplates(TENANT_SLUG);
  if (!remote) {
    process.exit(1);
  }

  console.log(`  Found ${remote.count} templates (remote tenantId: ${remote.tenantId})`);
  if (remote.count === 0) {
    console.log('\n⚠️  No templates on Vercel. Nothing to pull.');
    process.exit(0);
  }

  // Step 2: Upsert to local
  console.log('\n📥 Upserting to local MongoDB...');
  const result = await upsertLocalTemplates(remote.templates, TENANT_SLUG);

  // Step 3: Report
  console.log('\n───────────────────────────────────────────────────────');
  console.log(`  Summary:`);
  console.log(`    📄 Remote templates: ${remote.count}`);
  console.log(`    ✅ Inserted (new): ${result.inserted}`);
  console.log(`    🔄 Updated: ${result.updated}`);
  console.log(`    ⏭️  Unchanged: ${remote.count - result.inserted - result.updated - result.errors}`);
  console.log(`    ❌ Errors: ${result.errors}`);
  console.log('───────────────────────────────────────────────────────\n');

  process.exit(result.errors > 0 ? 2 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
