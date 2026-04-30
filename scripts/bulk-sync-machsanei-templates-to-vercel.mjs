import dotenv from 'dotenv';
import path from 'path';
import { MongoClient } from 'mongodb';
import fetchImport from 'node-fetch';

const fetchFn = globalThis.fetch || fetchImport;

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`[X] Missing ${name} in environment (.env.local)`);
  }
  return value;
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeKey(value) {
  const key = String(value || '').trim().toLowerCase();
  return key;
}

function buildSeoPayload(seo) {
  const obj = seo && typeof seo === 'object' ? seo : {};
  return {
    slugPrefix: normalizeString(obj.slugPrefix),
    metaTitle: normalizeString(obj.metaTitle),
    metaDescription: normalizeString(obj.metaDescription),
    keywords: Array.isArray(obj.keywords) ? obj.keywords.map((k) => normalizeString(k)).filter(Boolean) : [],
  };
}

function buildTemplatePayload(doc) {
  return {
    key: normalizeKey(doc?.key),
    name: normalizeString(doc?.name),
    titlePrefix: normalizeString(doc?.titlePrefix),
    shortDescription: normalizeString(doc?.shortDescription),
    description: normalizeString(doc?.description),
    specs: normalizeString(doc?.specs),
    faq: normalizeString(doc?.faq),
    structuredData: normalizeString(doc?.structuredData),
    category: normalizeString(doc?.category),
    subCategory: normalizeString(doc?.subCategory),
    tags: Array.isArray(doc?.tags) ? doc.tags.map((t) => normalizeString(t)).filter(Boolean) : [],
    seo: buildSeoPayload(doc?.seo),
    isActive: doc?.isActive !== false,
  };
}

async function postJson({ url, secret, body }) {
  const res = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-template-sync-secret': secret,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  dotenv.config({
    path: path.resolve(process.cwd(), '.env.local'),
    override: true,
  });

  const onlyTemplateKey = normalizeKey(process.argv[2] || '');

  const mongoUri = requireEnv('MONGODB_URI');
  const mongoDb = requireEnv('MONGODB_DB');
  const targetBaseUrl = normalizeBaseUrl(requireEnv('CATALOG_TEMPLATE_SYNC_TARGET_URL'));
  const secret = requireEnv('CATALOG_TEMPLATE_SYNC_SECRET');

  const client = new MongoClient(mongoUri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 30000,
  });

  await client.connect();
  const db = client.db(mongoDb);

  const exactTenant = await db.collection('tenants').findOne({ name: 'מחסני נירוסטה' });
  const tenant =
    exactTenant ||
    (await db
      .collection('tenants')
      .find({ name: { $regex: 'מחסני נירוסטה', $options: 'i' } })
      .sort({ updatedAt: -1 })
      .limit(1)
      .next());

  if (!tenant?._id) {
    throw new Error('[X] Tenant "מחסני נירוסטה" not found in local DB');
  }

  const tenantSlug = normalizeString(tenant?.slug).toLowerCase();
  const tenantName = normalizeString(tenant?.name);

  if (!tenantSlug || !tenantName) {
    throw new Error('[X] Tenant missing slug or name');
  }

  console.log(`Tenant: ${tenantName} (${tenantSlug}) id=${tenant._id}`);

  const tenantSync = await postJson({
    url: `${targetBaseUrl}/api/internal/sync/tenants`,
    secret,
    body: {
      action: 'upsert',
      tenant: {
        slug: tenantSlug,
        name: tenantName,
        status: normalizeString(tenant?.status) || 'pending',
        platformCommissionRate:
          Number.isFinite(Number(tenant?.platformCommissionRate)) ? Number(tenant.platformCommissionRate) : undefined,
        branding: tenant?.branding && typeof tenant.branding === 'object' ? tenant.branding : undefined,
        contact: tenant?.contact && typeof tenant.contact === 'object' ? tenant.contact : undefined,
        features: tenant?.features && typeof tenant.features === 'object' ? tenant.features : undefined,
      },
    },
  });

  if (!tenantSync.ok) {
    console.error('Tenant sync failed:', tenantSync.status, tenantSync.data);
    throw new Error('[X] Cannot continue without tenant sync');
  }

  const templates = await db
    .collection('catalogtemplates')
    .find({ tenantId: tenant._id })
    .sort({ createdAt: -1 })
    .toArray();

  const filteredTemplates = onlyTemplateKey
    ? templates.filter((t) => normalizeKey(t?.key) === onlyTemplateKey)
    : templates;

  if (onlyTemplateKey) {
    console.log(`Filtering to template key=${onlyTemplateKey}`);
  }
  console.log(`Found ${filteredTemplates.length} templates for tenant in local DB`);

  let okCount = 0;
  let failCount = 0;

  for (let i = 0; i < filteredTemplates.length; i += 1) {
    const t = filteredTemplates[i];
    const payloadTemplate = buildTemplatePayload(t);

    if (!payloadTemplate.key || !payloadTemplate.name) {
      failCount += 1;
      console.warn(`Skip invalid template at index ${i} (_id=${t?._id})`);
      continue;
    }

    const r = await postJson({
      url: `${targetBaseUrl}/api/internal/sync/catalog-templates`,
      secret,
      body: {
        action: 'upsert',
        tenantSlug,
        tenantName,
        template: payloadTemplate,
      },
    });

    if (r.ok) {
      okCount += 1;
    } else {
      failCount += 1;
      console.warn(`Template sync failed (key=${payloadTemplate.key}):`, r.status, r.data);
    }

    if ((i + 1) % 10 === 0 || i === filteredTemplates.length - 1) {
      console.log(`Progress: ${i + 1}/${filteredTemplates.length} ok=${okCount} fail=${failCount}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  await client.close();

  console.log(`Done. ok=${okCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
