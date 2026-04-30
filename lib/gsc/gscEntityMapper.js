/**
 * מיפוי URL מ-GSC Top Pages לישויות במערכת (ללא קריאות DB — תבניות routes + קונפיג סטטי).
 */

import { STAINLESS_SEO_CATEGORY_ARCHITECTURE } from '@/lib/stainlessSeoCategories';

/** @typedef {'home' | 'marketplace' | 'store' | 'category' | 'product' | 'other'} GscPageType */

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/** מפת נתיב קנוני → קונפיג קטגוריית נירוסטה */
const STAINLESS_PATH_TO_CONFIG = (() => {
  const m = new Map();
  for (const config of Object.values(STAINLESS_SEO_CATEGORY_ARCHITECTURE)) {
    const key = String(config.canonicalPath || '').replace(/\/+$/, '').toLowerCase();
    if (key) m.set(key, config);
  }
  return m;
})();

function normalizePathname(pathname) {
  if (!pathname || pathname === '') return '/';
  let p = pathname.trim();
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p || '/';
}

/**
 * @returns {{
 *   pageType: GscPageType,
 *   storeSlug: string | null,
 *   storeId: string | null,
 *   categorySlug: string | null,
 *   categoryName: string | null,
 *   productSlug: string | null,
 *   productId: string | null,
 *   productName: string | null,
 *   segmentLabel: string,
 *   uncertain: boolean,
 * }}
 */
export function mapGscUrlToEntity(pageUrl) {
  const base = {
    pageType: /** @type {GscPageType} */ ('other'),
    storeSlug: null,
    storeId: null,
    categorySlug: null,
    categoryName: null,
    productSlug: null,
    productId: null,
    productName: null,
    segmentLabel: 'דף כללי',
    uncertain: false,
  };

  if (!pageUrl || typeof pageUrl !== 'string') {
    return { ...base, uncertain: true, segmentLabel: 'לא זוהה' };
  }

  let url;
  try {
    url = new URL(pageUrl);
  } catch {
    try {
      url = new URL(`https://placeholder.local${pageUrl.startsWith('/') ? '' : '/'}${pageUrl}`);
    } catch {
      return { ...base, uncertain: true, segmentLabel: 'כתובת לא תקינה' };
    }
  }

  const path = normalizePathname(url.pathname);
  const seg = path.split('/').filter(Boolean);

  if (path === '/' || seg.length === 0) {
    return {
      ...base,
      pageType: 'home',
      segmentLabel: 'דף הבית',
      uncertain: false,
    };
  }

  const head = seg[0]?.toLowerCase();

  if (head === 'shop' && seg.length === 1) {
    return {
      ...base,
      pageType: 'marketplace',
      segmentLabel: 'חנות / מרקטפלייס',
      uncertain: true,
    };
  }

  if (head === 'products') {
    if (seg.length === 1) {
      return {
        ...base,
        pageType: 'marketplace',
        segmentLabel: 'מרקטפלייס — רשימת מוצרים',
        uncertain: false,
      };
    }

    if (seg[1] === 'shared-container' && seg[2]) {
      const idOrSlug = seg[2];
      const isOid = OBJECT_ID_RE.test(idOrSlug);
      return {
        ...base,
        pageType: 'product',
        productSlug: isOid ? null : idOrSlug,
        productId: isOid ? idOrSlug : null,
        segmentLabel: `מוצר (מכולה משותפת)`,
        uncertain: !isOid,
      };
    }

    if (['new', 'edit'].includes(seg[1]) || seg.includes('edit')) {
      return {
        ...base,
        pageType: 'other',
        segmentLabel: 'ניהול מוצר / טופס',
        uncertain: true,
      };
    }

    const param = seg[1];
    const isOid = OBJECT_ID_RE.test(param);
    return {
      ...base,
      pageType: 'product',
      productSlug: isOid ? null : param,
      productId: isOid ? param : null,
      segmentLabel: isOid ? 'מוצר (מזהה)' : `מוצר: ${param}`,
      uncertain: false,
    };
  }

  if (head === 'stainless' && seg[1]) {
    const catSeg = seg[1].toLowerCase();
    const lookupPath = `/stainless/${catSeg}`;
    const config = STAINLESS_PATH_TO_CONFIG.get(lookupPath);

    return {
      ...base,
      pageType: 'category',
      categorySlug: catSeg,
      categoryName: config?.title || catSeg,
      segmentLabel: config ? `קטגוריה: ${config.title}` : `קטגוריית נירוסטה (${catSeg})`,
      uncertain: !config,
    };
  }

  if (head === 't' && seg[1]) {
    const slug = seg[1];
    return {
      ...base,
      pageType: 'store',
      storeSlug: slug,
      segmentLabel: `חנות: ${slug}`,
      uncertain: false,
    };
  }

  if (head === 'p' && seg[1]) {
    return {
      ...base,
      pageType: 'product',
      productSlug: seg[1],
      segmentLabel: `מוצר (קישור קצר /p/)`,
      uncertain: true,
    };
  }

  return {
    ...base,
    pageType: 'other',
    segmentLabel: `דף: /${seg.join('/')}`,
    uncertain: true,
  };
}

/**
 * @param {Array<object>} enrichedRows — שורות אחרי enrichGscPage (כולל שדות entity)
 */
export function aggregateGscByPageType(enrichedRows) {
  const keys = ['home', 'marketplace', 'store', 'category', 'product', 'other'];
  const init = () => ({
    pages: 0,
    clicks: 0,
    impressions: 0,
    positionWeighted: 0,
  });
  /** @type {Record<string, ReturnType<typeof init>>} */
  const map = {};
  keys.forEach((k) => { map[k] = init(); });

  for (const row of enrichedRows || []) {
    const t = row.pageType && map[row.pageType] ? row.pageType : 'other';
    const bucket = map[t] || map.other;
    bucket.pages += 1;
    bucket.clicks += Number(row.clicks ?? 0);
    bucket.impressions += Number(row.impressions ?? 0);
    bucket.positionWeighted += Number(row.position ?? 0) * Number(row.impressions ?? 0);
  }

  return keys.map((pageType) => {
    const b = map[pageType];
    const ctr = b.impressions > 0 ? b.clicks / b.impressions : 0;
    const avgPosition = b.impressions > 0 ? b.positionWeighted / b.impressions : 0;
    return {
      pageType,
      pages: b.pages,
      clicks: b.clicks,
      impressions: b.impressions,
      ctr,
      avgPosition,
    };
  });
}

function groupByKey(rows, keyFn) {
  /** @type {Map<string, typeof rows>} */
  const m = new Map();
  for (const row of rows || []) {
    const k = keyFn(row);
    if (k == null || k === '') continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(row);
  }
  return m;
}

export function aggregateGscByStore(enrichedRows) {
  const withStore = (enrichedRows || []).filter((r) => r.pageType === 'store' && r.storeSlug);
  const g = groupByKey(withStore, (r) => r.storeSlug);
  return Array.from(g.entries()).map(([storeSlug, list]) => {
    const clicks = list.reduce((s, r) => s + Number(r.clicks ?? 0), 0);
    const impressions = list.reduce((s, r) => s + Number(r.impressions ?? 0), 0);
    const positionWeighted = list.reduce((s, r) => s + Number(r.position ?? 0) * Number(r.impressions ?? 0), 0);
    return {
      key: storeSlug,
      label: storeSlug,
      pages: list.length,
      clicks,
      impressions,
      ctr: impressions > 0 ? clicks / impressions : 0,
      avgPosition: impressions > 0 ? positionWeighted / impressions : 0,
    };
  }).sort((a, b) => b.clicks - a.clicks);
}

export function aggregateGscByCategory(enrichedRows) {
  const withCat = (enrichedRows || []).filter((r) => r.pageType === 'category' && r.categorySlug);
  const g = groupByKey(withCat, (r) => r.categorySlug);
  return Array.from(g.entries()).map(([categorySlug, list]) => {
    const clicks = list.reduce((s, r) => s + Number(r.clicks ?? 0), 0);
    const impressions = list.reduce((s, r) => s + Number(r.impressions ?? 0), 0);
    const positionWeighted = list.reduce((s, r) => s + Number(r.position ?? 0) * Number(r.impressions ?? 0), 0);
    const name = list[0]?.categoryName || categorySlug;
    return {
      key: categorySlug,
      label: name,
      pages: list.length,
      clicks,
      impressions,
      ctr: impressions > 0 ? clicks / impressions : 0,
      avgPosition: impressions > 0 ? positionWeighted / impressions : 0,
    };
  }).sort((a, b) => b.clicks - a.clicks);
}

/**
 * מוצרים עם פוטנציאל — לפי ספים על נתוני GSC בלבד
 */
export function filterGscProductPotential(enrichedRows) {
  return (enrichedRows || []).filter((r) => {
    if (r.pageType !== 'product') return false;
    const impr = Number(r.impressions ?? 0);
    const ctr = Number(r.ctr ?? 0);
    const pos = Number(r.position ?? 0);
    return impr >= 80 && ctr < 0.02 && pos >= 8 && pos <= 20;
  }).sort((a, b) => Number(b.impressions) - Number(a.impressions));
}
