import { getCatalogProductMode } from '@/lib/catalogProductMode';

/**
 * תואם ל-MarketplaceHome: אם כל המתגים כבויים ב-API — לא מסתירים הכל.
 * @returns {{ marketplaceShowStock: boolean, marketplaceShowGroup: boolean, marketplaceShowSharedContainer: boolean }}
 */
export function getVisibilityForUi(visibilitySettings) {
  const v = visibilitySettings || {};
  const marketplaceShowStock = v.marketplaceShowStock !== false;
  const marketplaceShowGroup = v.marketplaceShowGroup !== false;
  const marketplaceShowSharedContainer = v.marketplaceShowSharedContainer !== false;
  if (!marketplaceShowStock && !marketplaceShowGroup && !marketplaceShowSharedContainer) {
    return {
      marketplaceShowStock: true,
      marketplaceShowGroup: true,
      marketplaceShowSharedContainer: true,
    };
  }
  return {
    marketplaceShowStock,
    marketplaceShowGroup,
    marketplaceShowSharedContainer,
  };
}

/** האם מוצר בודד מותר להצגה לפי מתגי מנהל המוצרים (מלאי / קבוצה / מכולה משותפת). */
export function productPassesMarketplaceVisibility(product, visibilityForUi) {
  const mode = getCatalogProductMode(product);
  if (mode === 'stock' && !visibilityForUi.marketplaceShowStock) return false;
  if (mode === 'group' && !visibilityForUi.marketplaceShowGroup) return false;
  if (mode === 'shared_container' && !visibilityForUi.marketplaceShowSharedContainer) return false;
  return true;
}

/** מצבי קטלוג מותרים לשאילתת Mongo / aggregate — תואם ל־getVisibilityForUi */
export function buildAllowedCatalogModesForMarketplace(visibilityForUi) {
  const modes = [];
  if (visibilityForUi.marketplaceShowStock) modes.push('stock');
  if (visibilityForUi.marketplaceShowGroup) modes.push('group');
  if (visibilityForUi.marketplaceShowSharedContainer) modes.push('shared_container');
  return modes.length ? modes : ['stock', 'group', 'shared_container'];
}
