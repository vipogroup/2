#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { MongoClient } = require('mongodb');

const parseStainlessText = require('./parse-stainless-text');

require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'vipo';

const DEFAULT_CATEGORY = 'נירוסטה';
const JSON_PATHS = [
  path.join(process.cwd(), 'data', 'products.json'),
  path.join(process.cwd(), 'export_vipo_products_ui', 'data', 'products.json'),
];
const PDF_PATHS = [
  path.join(process.cwd(), 'data', 'agents-catalog.pdf'),
  path.join(process.cwd(), 'export_vipo_products_ui', 'data', 'agents-catalog.pdf'),
];

const buildMediaImages = (images = []) =>
  images
    .filter(Boolean)
    .map((url, index) => ({
      url,
      alt: '',
      position: index,
      publicId: '',
    }));

function ensureEnv() {
  if (!MONGODB_URI) {
    throw new Error('❌ Missing MONGODB_URI. Please set it in .env.local');
  }
}

function pickExistingPath(candidates) {
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

function parsePrice(rawPrice) {
  if (typeof rawPrice === 'number' && !Number.isNaN(rawPrice)) {
    return Math.round(rawPrice * 100) / 100;
  }

  if (typeof rawPrice !== 'string') {
    return 0;
  }

  const clean = rawPrice.replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
  const numeric = parseFloat(clean);
  if (Number.isNaN(numeric)) {
    return 0;
  }
  return Math.round(numeric * 100) / 100;
}

function coerceBoolean(value, defaultValue = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', '1', 'y', 't'].includes(normalized)) return true;
    if (['false', 'no', '0', 'n', 'f'].includes(normalized)) return false;
  }
  return defaultValue;
}

function toNumber(value, defaultValue = 0) {
  if (value === undefined || value === null) return defaultValue;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? defaultValue : numeric;
}

function removeUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

function normalizeProduct(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) {
    return null;
  }

  const code = typeof raw.code === 'string' && raw.code.trim() ? raw.code.trim() : undefined;
  const sku = typeof raw.sku === 'string' && raw.sku.trim() ? raw.sku.trim() : undefined;

  const descriptionSource =
    typeof raw.description === 'string' && raw.description.trim()
      ? raw.description.trim()
      : typeof raw.dimensions === 'string' && raw.dimensions.trim()
        ? raw.dimensions.trim()
        : '';

  const price = parsePrice(
    raw.price ?? raw.currentPrice ?? raw.salePrice ?? raw.originalPrice ?? raw.cost,
  );

  const originalPrice =
    typeof raw.originalPrice === 'number'
      ? Math.round(raw.originalPrice * 100) / 100
      : price
        ? Math.round(price * 1.1)
        : null;

  const category =
    (typeof raw.category === 'string' && raw.category.trim()) ||
    (typeof raw.categoryName === 'string' && raw.categoryName.trim()) ||
    DEFAULT_CATEGORY;

  const stockCount = toNumber(raw.stockCount ?? raw.quantity ?? raw.qty, 0);
  const inStock = coerceBoolean(raw.inStock ?? raw.available ?? stockCount > 0, true);

  const features = Array.isArray(raw.features)
    ? raw.features
        .map((feature) => (typeof feature === 'string' ? feature.trim() : feature))
        .filter(Boolean)
    : [];

  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((tag) => (typeof tag === 'string' ? tag.trim() : tag)).filter(Boolean)
    : undefined;

  const rawMediaImages = Array.isArray(raw?.media?.images) ? raw.media.images : [];
  const mediaImageSources = rawMediaImages
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const url = typeof item.url === 'string' ? item.url.trim() : '';
      if (!url) return null;
      return {
        url,
        alt: typeof item.alt === 'string' ? item.alt : '',
        position: Number.isFinite(item.position) ? item.position : index,
        publicId: typeof item.publicId === 'string' ? item.publicId : '',
      };
    })
    .filter(Boolean);
  if (!mediaImageSources.length) {
    const label = name || code || sku || raw?.name || raw?.code || raw?.sku || 'unknown';
    throw new Error(`Missing media.images for product: ${label}`);
  }
  const mediaVideoUrl =
    typeof raw?.media?.videoUrl === 'string' && raw.media.videoUrl.trim()
      ? raw.media.videoUrl.trim()
      : '';
  const media = {
    images: mediaImageSources,
    videoUrl: mediaVideoUrl,
  };

  const product = removeUndefined({
    name,
    code,
    sku,
    description: descriptionSource,
    price,
    originalPrice,
    category,
    media,
    inStock,
    stockCount,
    currency:
      typeof raw.currency === 'string' && raw.currency.trim() ? raw.currency.trim() : undefined,
    dimensions:
      typeof raw.dimensions === 'string' && raw.dimensions.trim()
        ? raw.dimensions.trim()
        : undefined,
    material:
      typeof raw.material === 'string' && raw.material.trim() ? raw.material.trim() : undefined,
    weight: typeof raw.weight === 'string' && raw.weight.trim() ? raw.weight.trim() : undefined,
    rating: typeof raw.rating === 'number' && !Number.isNaN(raw.rating) ? raw.rating : 4.6,
    reviews: toNumber(raw.reviews, 0),
    features,
    tags,
  });

  return product;
}

function loadProductsFromJson() {
  const jsonPath = pickExistingPath(JSON_PATHS);
  if (!jsonPath) {
    return { products: [], path: null };
  }

  const rawContent = fs.readFileSync(jsonPath, 'utf8').trim();
  if (!rawContent) {
    console.warn(`⚠️ products.json at ${jsonPath} is empty. Falling back to PDF.`);
    return { products: [], path: jsonPath };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (error) {
    throw new Error(`Failed to parse JSON at ${jsonPath}: ${error.message}`);
  }

  const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];

  if (!Array.isArray(items) || items.length === 0) {
    console.warn(
      `⚠️ products.json at ${jsonPath} does not include a products array. Falling back to PDF.`,
    );
    return { products: [], path: jsonPath };
  }

  console.log(`📦 Using products from JSON: ${jsonPath} (count: ${items.length})`);
  return { products: items, path: jsonPath };
}

async function loadProductsFromPdf() {
  const pdfPath = pickExistingPath(PDF_PATHS);
  if (!pdfPath) {
    throw new Error(
      `Could not find agents-catalog.pdf. Checked paths:\n- ${PDF_PATHS.join('\n- ')}`,
    );
  }

  console.log(`📄 Using PDF catalog: ${pdfPath}`);
  const buffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(buffer);
  const text = data?.text || '';

  if (!text.trim()) {
    console.warn('⚠️ PDF text content is empty.');
  }

  const parsed = parseStainlessText(text);
  const items = Array.isArray(parsed?.items) ? parsed.items : [];
  console.log(`📑 Parsed items from PDF: ${items.length}`);

  return { products: items, path: pdfPath };
}

async function upsertProducts(products) {
  ensureEnv();

  const client = new MongoClient(MONGODB_URI);
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    const collection = db.collection('products');

    for (const product of products) {
      const identifier = product.code || product.sku || product.name;
      if (!identifier) {
        skipped += 1;
        console.warn(
          `⚠️ Skipping product without identifier (code/sku/name): ${JSON.stringify(product)}`,
        );
        continue;
      }

      const filter = product.code
        ? { code: product.code }
        : product.sku
          ? { sku: product.sku }
          : { name: product.name };

      const docToSet = removeUndefined({
        ...product,
        updatedAt: new Date(),
      });

      const update = {
        $set: docToSet,
        $setOnInsert: { createdAt: new Date() },
      };

      const result = await collection.updateOne(filter, update, { upsert: true });
      if (result.upsertedCount > 0) {
        inserted += 1;
      } else if (result.modifiedCount > 0) {
        updated += 1;
      }
    }

    return { inserted, updated, skipped };
  } finally {
    await client.close();
  }
}

async function main() {
  try {
    ensureEnv();

    const { products: jsonProducts, path: jsonPath } = loadProductsFromJson();
    let source = 'products.json';
    let rawProducts = jsonProducts;

    if (!rawProducts.length) {
      const { products: pdfProducts } = await loadProductsFromPdf();
      rawProducts = pdfProducts;
      source = 'agents-catalog.pdf';
    }

    if (!rawProducts.length) {
      console.error('❌ No products found in JSON or PDF sources. Aborting import.');
      process.exit(1);
    }

    const normalizedProducts = rawProducts
      .map((item, index) => normalizeProduct(item))
      .filter(Boolean)
      .map((product, index) => ({
        ...product,
        importOrder: index,
        importSource: source,
      }));

    if (!normalizedProducts.length) {
      console.error('❌ No valid products after normalization. Aborting import.');
      process.exit(1);
    }

    const { inserted, updated, skipped } = await upsertProducts(normalizedProducts);
    console.log('✅ Import completed successfully');
    console.log(`📊 Total processed: ${normalizedProducts.length}`);
    console.log(`➕ Inserted: ${inserted}`);
    console.log(`🔁 Updated: ${updated}`);
    if (skipped > 0) {
      console.log(`⏭️ Skipped (missing identifier): ${skipped}`);
    }
  } catch (error) {
    console.error('❌ Import failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
