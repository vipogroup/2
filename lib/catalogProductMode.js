/** מצב תצוגה אחיד: מלאי | קבוצתית | מכולה משותפת — מרקטפלייס וחנות טננט */

export function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function normalizeGroupPurchaseType(value) {
  const normalized = normalizeToken(value).replace(/[\s-]+/g, '_');
  if (normalized === 'shared_container' || normalized === 'sharedcontainer') {
    return 'shared_container';
  }
  if (normalized === 'group' || normalized === 'regular_group') {
    return 'group';
  }
  return normalized;
}

/** @returns {'stock' | 'group' | 'shared_container'} */
export function getCatalogProductMode(product) {
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
