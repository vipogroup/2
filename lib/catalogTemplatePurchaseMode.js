import { getCatalogProductMode } from './catalogProductMode.js';

/**
 * Appends template-owned copy for the resolved purchase mode (stock | group | shared_container).
 * Idempotent: skips if the mode marker already exists in the base text.
 */
export function mergeTemplatePurchaseModeIntoDescription(baseDescription, template, productLike) {
  const base = String(baseDescription || '').trim();
  const blocks = template?.purchaseModeBlocks;
  if (!blocks || typeof blocks !== 'object') return base;

  const mode = getCatalogProductMode(productLike);
  const extra = String(blocks[mode] || '').trim();
  if (!extra) return base;

  const marker = `<!-- vipo:pm:${mode} -->`;
  if (base.includes(marker)) return base;

  const chunk = `${marker}\n${extra}`;
  return base ? `${base}\n\n${chunk}` : chunk;
}
