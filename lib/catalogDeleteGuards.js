const CATALOG_DELETE_CONFIRM_TOKEN = 'DELETE_CATALOG_PRODUCTS_IRREVERSIBLE';
const CATALOG_DELETE_TARGET_COLLECTIONS = ['products', 'auditlogs'];

export function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
}

export function hasExactCoverage(expectedItems, providedItems) {
  if (expectedItems.length !== providedItems.length) return false;
  const expected = [...expectedItems].sort();
  const provided = [...providedItems].sort();
  return expected.every((value, index) => value === provided[index]);
}

/**
 * Validates body fields for a real (non–dry-run) catalog product delete.
 * @returns {boolean}
 */
export function catalogRealDeleteGuardsOk({
  body,
  nodeEnv,
  allowCatalogDelete,
  resolvedProductIds,
  requestedProductKeys,
  mediaDeletionInvolved,
  tenantId,
}) {
  if (nodeEnv === 'production' && !allowCatalogDelete) {
    return false;
  }

  const confirm = String(body?.confirm || '').trim();
  const acknowledgeDataLoss = body?.acknowledgeDataLoss === true;
  const acknowledgeMediaDeletion = body?.acknowledgeMediaDeletion === true;
  const reason = String(body?.reason || '').trim();
  const confirmEnvironment = String(body?.confirmEnvironment || '').trim();
  const confirmCollections = normalizeList(body?.confirmCollections);
  const confirmProductIds = normalizeList(body?.confirmProductIds);
  const confirmProductKeys = normalizeList(body?.confirmProductKeys);
  const confirmTenantId = String(body?.confirmTenantId || '').trim();
  const hasAllCollections = CATALOG_DELETE_TARGET_COLLECTIONS.every((name) =>
    confirmCollections.includes(name),
  );
  const idsCovered = resolvedProductIds.length > 0
    ? hasExactCoverage(resolvedProductIds, confirmProductIds)
    : true;
  const keysCovered = hasExactCoverage(requestedProductKeys, confirmProductKeys);
  return (
    confirm === CATALOG_DELETE_CONFIRM_TOKEN &&
    acknowledgeDataLoss === true &&
    reason.length > 0 &&
    confirmEnvironment === nodeEnv &&
    hasAllCollections &&
    confirmTenantId === String(tenantId) &&
    idsCovered &&
    keysCovered &&
    (!mediaDeletionInvolved || acknowledgeMediaDeletion === true)
  );
}

export { CATALOG_DELETE_CONFIRM_TOKEN, CATALOG_DELETE_TARGET_COLLECTIONS };
