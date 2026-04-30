/**
 * פעולות מהירות מקישור GSC + ישות ממופה (ללא API חדש).
 */

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/**
 * @param {string} pageFullUrl — URL מלא כפי שמגיע מ-GSC
 * @param {object} entity — תוצאת mapGscUrlToEntity
 */
export function buildGscEntityActions(pageFullUrl, entity) {
  /** @type {{ publicUrl: string | null, adminEditUrl: string | null, searchConsoleUrl: string | null, pageSpeedUrl: string | null, richResultsUrl: string | null }} */
  const actions = {
    publicUrl: null,
    adminEditUrl: null,
    searchConsoleUrl: null,
    pageSpeedUrl: null,
    richResultsUrl: null,
  };

  if (!pageFullUrl || typeof pageFullUrl !== 'string') {
    return actions;
  }

  let url;
  try {
    url = new URL(pageFullUrl);
  } catch {
    return actions;
  }

  const publicUrl = url.toString();
  actions.publicUrl = publicUrl;

  actions.pageSpeedUrl = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(publicUrl)}`;
  actions.richResultsUrl = `https://search.google.com/test/rich-results?url=${encodeURIComponent(publicUrl)}`;

  const host = url.hostname;
  const scDomain = `sc-domain:${host}`;
  actions.searchConsoleUrl = `https://search.google.com/search-console?resource_id=${encodeURIComponent(scDomain)}`;

  const pt = entity?.pageType;
  const uncertain = Boolean(entity?.uncertain);
  const productId = entity?.productId ? String(entity.productId).trim() : '';

  if (pt === 'home') {
    actions.adminEditUrl = null;
    return actions;
  }

  if (pt === 'marketplace') {
    actions.adminEditUrl = null;
    return actions;
  }

  if (pt === 'store') {
    actions.adminEditUrl = null;
    return actions;
  }

  if (pt === 'category') {
    if (!uncertain) {
      actions.adminEditUrl = '/admin/products/categories';
    }
    return actions;
  }

  if (pt === 'product') {
    if (!uncertain && productId && OBJECT_ID_RE.test(productId)) {
      actions.adminEditUrl = `/admin/products/${productId}/edit`;
    } else {
      actions.adminEditUrl = null;
    }
    return actions;
  }

  actions.adminEditUrl = null;
  return actions;
}
