/**
 * ייצוא מוצרים עם תוכן דל — אותה לוגיקת מילים כמו ב־/api/admin/seo-audit (content_coverage).
 *
 * מונה מילים על: description, fullDescription, seo.metaDescription, suitableFor,
 * whyChooseUs, warranty, FAQ (שאלה+תשובה) — אחרי הסרת HTML.
 *
 * ספים:
 *   - מתחת ל־100 מילים: תוכן דל חמור
 *   - 100–299: מתחת להמלצה (300+)
 *
 * הרצה מהשורש:
 *   node scripts/export-thin-products.mjs
 * או עם URI מפורש:
 *   node --env-file=.env.production scripts/export-thin-products.mjs
 */
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { buildAuditContentCorpus, normalizeAuditText } from '../lib/seoAuditContentCoverage.js';
import { getProductPublicPath } from '../lib/stainlessSeoCategories.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dotenvOpts = { override: false };
if (!process.env.MONGODB_URI?.trim()) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, ...dotenvOpts });
  } else {
    dotenv.config(dotenvOpts);
  }
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://vipo-group.com').replace(
  /\/$/,
  '',
);

function getIndexableProductsQuery() {
  return {
    active: { $ne: false },
    $or: [
      { status: 'published' },
      { status: { $exists: false } },
      { status: null },
      { status: '' },
    ],
  };
}

function wordCount(text) {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function preview(text, max = 240) {
  const t = normalizeAuditText(text);
  if (!t) return '';
  return t.length <= max ? t : `${t.slice(0, max - 3)}...`;
}

function thinBucket(wc) {
  if (wc < 100) return 'under_100';
  if (wc < 300) return 'under_300';
  return null;
}

(async () => {
  const uri = process.env.MONGODB_URI?.trim();
  const dbName = process.env.MONGODB_DB || 'vipo';
  if (!uri) {
    console.error('חסר MONGODB_URI. הגדר במסוף או ב־.env.local / --env-file');
    process.exit(1);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const db = client.db(dbName);
  const products = await db.collection('products').find(getIndexableProductsQuery()).toArray();

  const rows = [];
  for (const p of products) {
    const corpus = buildAuditContentCorpus(p);
    const wc = wordCount(corpus);
    const bucket = thinBucket(wc);
    if (!bucket) continue;

    const pathOnly = getProductPublicPath(p);
    rows.push({
      _id: String(p._id),
      legacyId: p.legacyId || null,
      name: p.name || '',
      category: p.category || '',
      tenantId: p.tenantId ? String(p.tenantId) : null,
      path: pathOnly,
      url: pathOnly.startsWith('http') ? pathOnly : `${SITE_URL}${pathOnly}`,
      word_count: wc,
      thin_bucket: bucket,
      description_preview: preview(p.description, 200),
      fullDescription_preview: preview(p.fullDescription, 200),
      faq_count: Array.isArray(p.faq) ? p.faq.length : 0,
    });
  }

  rows.sort((a, b) => a.word_count - b.word_count);

  const outDir = path.resolve(process.cwd(), 'exports');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, 'thin-products-audit.json');
  const payload = {
    generatedAt: new Date().toISOString(),
    site_url_base: SITE_URL,
    thresholds: { thin_hard: 100, thin_recommended_min: 300 },
    summary: {
      total_indexable_products: products.length,
      thin_under_100: rows.filter((r) => r.thin_bucket === 'under_100').length,
      thin_under_300: rows.filter((r) => r.thin_bucket === 'under_300').length,
      thin_total: rows.length,
    },
    products: rows,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(JSON.stringify(payload.summary, null, 2));
  console.log('נכתב:', outPath);
  await client.close();
  process.exit(0);
})().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
