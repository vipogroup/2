import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { getProductPublicPath } from '@/lib/stainlessSeoCategories';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com').trim();

function buildProductLookupQuery(id) {
  const normalizedId = typeof id === 'string' ? id.trim() : '';
  if (!normalizedId) return null;

  const conditions = [];
  if (ObjectId.isValid(normalizedId)) {
    conditions.push({ _id: new ObjectId(normalizedId) });
  }
  conditions.push({ legacyId: normalizedId });
  conditions.push({ 'seo.slug': normalizedId.toLowerCase() });

  return conditions.length === 1 ? conditions[0] : { $or: conditions };
}

async function withTimeout(promise, timeoutMs, fallbackValue = null) {
  let timeoutHandle;
  const timeoutPromise = new Promise((resolve) => {
    timeoutHandle = setTimeout(() => resolve(fallbackValue), timeoutMs);
  });

  try {
    return await Promise.race([
      Promise.resolve(promise).catch(() => fallbackValue),
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function resolveCanonicalProductUrl(id) {
  const lookupQuery = buildProductLookupQuery(id);
  if (!lookupQuery) return null;

  try {
    const db = await withTimeout(getDb(), 800, null);
    if (!db) return null;

    const product = await withTimeout(
      db.collection('products').findOne(lookupQuery, { projection: { _id: 1, seo: 1, legacyId: 1 } }),
      1500,
      null,
    );
    if (!product) return null;

    const path = getProductPublicPath(product);
    if (!path || path === '/products') return null;
    return `${SITE_URL}${path}`;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  // This variant route is already blocked by robots.txt and kept out of the index.
  // Canonical must point at the main /products/<slug> URL — never at an ObjectId —
  // so Google consolidates signals to a single canonical for the product.
  const canonical = await resolveCanonicalProductUrl(id);

  return {
    robots: {
      index: false,
      follow: true,
    },
    ...(canonical ? { alternates: { canonical } } : {}),
  };
}

export default function SharedContainerProductLayout({ children }) {
  return children;
}
