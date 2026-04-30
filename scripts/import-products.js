import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
require('dotenv').config({ path: '.env.local' });
console.log('MONGODB_URI:', process.env.MONGODB_URI);
const Product = require('../models/Product');
const ProductModel = Product?.default || Product;
let connectDB;


async function ensureMongooseConnection() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Missing MONGODB_URI environment variable');
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || 'vipo',
      serverSelectionTimeoutMS: 30000,
    });
  }
}

function loadProductsFromFile() {
  const dataDir = path.join(process.cwd(), 'export_vipo_products_ui', 'data');
  const generatedPath = path.join(dataDir, 'products.generated.json');
  const defaultPath = path.join(dataDir, 'products.json');

  const filePath = fs.existsSync(generatedPath) ? generatedPath : defaultPath;

  if (!fs.existsSync(filePath)) {
    throw new Error(`products.json not found at ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed?.items)) {
    return parsed.items;
  }

  throw new Error("products.json must contain an array or an 'items' array");
}

function normalizeNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return fallback;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : fallback;
  }
  return fallback;
}

function extractPriceFromText(...inputs) {
  for (const input of inputs) {
    if (!input || typeof input !== 'string') continue;

    const matches = Array.from(input.matchAll(/([0-9]+(?:\.[0-9]+)?)/g)).map((match) =>
      Number(match[1]),
    );
    const candidates = matches.filter((value) => Number.isFinite(value) && value > 0);
    if (!candidates.length) {
      continue;
    }

    const best = candidates.reduce((acc, value) => {
      // העדפה למספרים גדולים יותר (מחיר מול ערכי נפח/CBM קטנים)
      if (value > acc) {
        return value;
      }
      return acc;
    }, 0);

    if (best > 0) {
      return best;
    }
  }

  return null;
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (['true', 'yes', '1', 'y', 'on'].includes(lower)) return true;
    if (['false', 'no', '0', 'n', 'off'].includes(lower)) return false;
  }
  return fallback;
}

function pickIdentifier(item) {
  if (item.sku) return { field: 'sku', value: String(item.sku) };
  if (item.legacyId) return { field: 'legacyId', value: String(item.legacyId) };
  if (item.id) return { field: 'legacyId', value: String(item.id) };
  if (item._id) return { field: 'legacyId', value: String(item._id) };
  if (item.name) return { field: 'name', value: String(item.name) };
  return null;
}

function normalizeProduct(raw) {
  const identifier = pickIdentifier(raw);
  if (!identifier) {
    console.warn('⚠️  Skipping product without identifier', raw);
    return null;
  }

  let price = normalizeNumber(raw.price, NaN);
  if (!Number.isFinite(price) || price <= 0) {
    const extracted = extractPriceFromText(
      raw.priceText,
      raw.description,
      raw.fullDescription,
      raw.dimensions,
    );
    if (Number.isFinite(extracted) && extracted > 0) {
      price = extracted;
    }
  }

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
    throw new Error(`Missing media.images for product: ${identifier.value}`);
  }
  const mediaVideoUrl = typeof raw?.media?.videoUrl === 'string' ? raw.media.videoUrl : '';

  const normalized = {
    [identifier.field]: identifier.value,
    name: String(raw.name || identifier.value || 'Unnamed product'),
    description: raw.description || raw.fullDescription || raw.dimensions || raw.notes || '',
    fullDescription: raw.fullDescription || raw.description || raw.dimensions || '',
    category: raw.category || raw.section || 'uncategorized',
    price: Number.isFinite(price) && price > 0 ? price : normalizeNumber(raw.cost, 0),
    originalPrice: normalizeNumber(raw.originalPrice, null),
    commission: normalizeNumber(raw.commission, undefined),
    type: raw.type === 'group' || raw.purchaseType === 'group' ? 'group' : 'online',
    purchaseType: raw.purchaseType === 'group' ? 'group' : 'regular',
    inStock: normalizeBoolean(raw.inStock, true),
    stockCount: normalizeNumber(raw.stockCount, 0),
    media: {
      images: mediaImageSources,
      videoUrl: mediaVideoUrl || '',
    },
    features: Array.isArray(raw.features) ? raw.features : [],
    specs: typeof raw.specs === 'object' && raw.specs !== null ? raw.specs : {},
    rating: normalizeNumber(raw.rating, 0),
    reviews: normalizeNumber(raw.reviews, 0),
    groupEndDate: raw.groupEndDate ? new Date(raw.groupEndDate) : null,
    expectedDeliveryDays: normalizeNumber(raw.expectedDeliveryDays, null),
    groupMinQuantity: normalizeNumber(raw.groupMinQuantity, 1),
    groupCurrentQuantity: normalizeNumber(raw.groupCurrentQuantity, 0),
    groupPurchaseDetails: raw.groupPurchaseDetails || null,
  };

  if (normalized.commission === undefined) {
    normalized.commission =
      Number.isFinite(normalized.price) && normalized.price > 0 ? normalized.price * 0.1 : 0;
  }

  if (!normalized.description) {
    const details = [];
    if (raw.dimensions) details.push(`Dimensions: ${raw.dimensions}`);
    if (raw.materials) details.push(`Materials: ${raw.materials}`);
    normalized.description = details.join(' | ') || 'Product details will be updated soon.';
  }

  if (!normalized.fullDescription) {
    const extra = [];
    if (raw.dimensions) extra.push(`מידות: ${raw.dimensions}`);
    if (raw.notes) extra.push(raw.notes);
    normalized.fullDescription = extra.length ? extra.join('\n') : normalized.description;
  }

  if (raw.dimensions) {
    const specs = { ...(normalized.specs || {}) };
    if (!specs.dimensions && !specs.Dimensions) {
      specs.dimensions = raw.dimensions;
    }
    normalized.specs = specs;
  }

  if (raw.dimensions) {
    const features = new Set(Array.isArray(normalized.features) ? normalized.features : []);
    features.add(`מידות: ${raw.dimensions}`);
    normalized.features = Array.from(features);
  }

  return normalized;
}

async function importProducts() {
  try {
    if (!connectDB) {
      ({ connectDB } = await import('../lib/db.js'));
    }

    await connectDB();
    await ensureMongooseConnection();

    const products = loadProductsFromFile();
    console.log(`🔄 Loading ${products.length} products from JSON file...`);

    let processed = 0;
    let skipped = 0;

    for (const item of products) {
      const normalized = normalizeProduct(item);
      if (!normalized) {
        skipped += 1;
        continue;
      }

      const filter = pickIdentifier(normalized);
      if (!filter) {
        console.warn('⚠️  Unexpected missing identifier after normalization', normalized);
        skipped += 1;
        continue;
      }

      await ProductModel.findOneAndUpdate(
        { [filter.field]: filter.value },
        { $set: normalized },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      processed += 1;
    }

    console.log(
      `✅ Import done. Processed: ${processed}, skipped: ${skipped}. Closing connection.`,
    );
  } catch (err) {
    console.error('❌ Import failed:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
}

importProducts();
