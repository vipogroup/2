import CatalogTemplate from '@/models/CatalogTemplate';
import catalogTemplatesPack from '@/exports/catalog-templates-stainless.json';

const DEFAULT_TEMPLATE_NAMES = {
  'catalog-manager': 'תבנית נירוסטה',
};

const normalizeKeywords = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const buildTemplateFromLegacy = (template, tenantId = null) => {
  if (!template || !template.key) return null;

  return {
    key: template.key,
    tenantId: tenantId || null,
    name:
      template.name ||
      DEFAULT_TEMPLATE_NAMES[template.key] ||
      template.titlePrefix ||
      template.key,
    titlePrefix: template.titlePrefix || '',
    description: template.description || '',
    shortDescription: template.shortDescription || '',
    specs: template.specs || '',
    faq: template.faq || '',
    structuredData: template.structuredData || '',
    category: template.category || '',
    subCategory: template.subCategory || '',
    tags: Array.isArray(template.tags) ? template.tags : [],
    seo: {
      slugPrefix: template.seo?.slugPrefix || '',
      metaTitle: template.seo?.metaTitle || '',
      metaDescription: template.seo?.metaDescription || '',
      keywords: normalizeKeywords(template.seo?.keywords),
    },
    purchaseModeBlocks: {
      stock: String(template.purchaseModeBlocks?.stock || '').trim(),
      group: String(template.purchaseModeBlocks?.group || '').trim(),
      shared_container: String(template.purchaseModeBlocks?.shared_container || '').trim(),
    },
    isActive: template.isActive !== false,
  };
};

/**
 * When Mongo has no legacy / donor templates, seed from the bundled stainless pack
 * (same source as lib/productPrefillTemplates.js) so Catalog Manager never shows an empty list.
 */
function getBundledCatalogTemplatesAsPlain() {
  const items = Array.isArray(catalogTemplatesPack?.templates)
    ? catalogTemplatesPack.templates
    : [];

  return items
    .filter((t) => t && typeof t.key === 'string' && t.key.trim())
    .map((t) => ({
      key: t.key.trim(),
      name: typeof t.name === 'string' ? t.name.trim() : '',
      titlePrefix: typeof t.titlePrefix === 'string' ? t.titlePrefix.trim() : '',
      description: typeof t.description === 'string' ? t.description : '',
      shortDescription: typeof t.shortDescription === 'string' ? t.shortDescription : '',
      specs: typeof t.specs === 'string' ? t.specs : '',
      faq: typeof t.faq === 'string' ? t.faq : '',
      structuredData: typeof t.structuredData === 'string' ? t.structuredData : '',
      category: typeof t.category === 'string' ? t.category : '',
      subCategory: typeof t.subCategory === 'string' ? t.subCategory : '',
      tags: Array.isArray(t.tags) ? t.tags : [],
      seo: t.seo && typeof t.seo === 'object' ? t.seo : {},
      purchaseModeBlocks:
        t.purchaseModeBlocks && typeof t.purchaseModeBlocks === 'object'
          ? {
              stock: String(t.purchaseModeBlocks.stock || '').trim(),
              group: String(t.purchaseModeBlocks.group || '').trim(),
              shared_container: String(t.purchaseModeBlocks.shared_container || '').trim(),
            }
          : { stock: '', group: '', shared_container: '' },
      isActive: t.isActive !== false,
    }));
}

export async function ensureSeedCatalogTemplates(tenantId = null) {
  const normalizedTenantId = tenantId ? String(tenantId) : null;
  if (!normalizedTenantId) return;

  const existing = await CatalogTemplate.find({ tenantId: normalizedTenantId }, { key: 1 }).lean();
  const existingKeys = new Set(existing.map((item) => item?.key).filter(Boolean));

  // Try to copy from legacy templates first (tenantId: null)
  let sourceTemplates = await CatalogTemplate.find({ tenantId: null }).lean();

  // If no legacy templates, copy from any existing tenant that has templates
  if (!sourceTemplates.length) {
    const donorTenant = await CatalogTemplate.findOne(
      { tenantId: { $nin: [null, normalizedTenantId] } },
      { tenantId: 1 },
    ).lean();
    if (donorTenant?.tenantId) {
      sourceTemplates = await CatalogTemplate.find({ tenantId: donorTenant.tenantId }).lean();
    }
  }

  if (!sourceTemplates.length) {
    sourceTemplates = getBundledCatalogTemplatesAsPlain();
  }

  if (!sourceTemplates.length) return;

  const newDocs = sourceTemplates
    .filter((item) => item?.key)
    .filter((item) => !existingKeys.has(item.key))
    .map((item) => buildTemplateFromLegacy(item, normalizedTenantId))
    .filter(Boolean);

  if (newDocs.length > 0) {
    await CatalogTemplate.insertMany(newDocs, { ordered: false }).catch(() => {});
  }
}

export async function resolveCatalogTemplate(templateKey, tenantId = null) {
  if (!templateKey) return null;

  const normalizedTenantId = tenantId ? String(tenantId) : null;
  const scopeQuery = {
    key: templateKey,
    isActive: true,
    tenantId: normalizedTenantId,
  };

  let template = await CatalogTemplate.findOne(scopeQuery).lean();
  if (template) return template;

  if (normalizedTenantId) {
    await ensureSeedCatalogTemplates(normalizedTenantId);
    template = await CatalogTemplate.findOne(scopeQuery).lean();
    if (template) return template;
  }

  return null;
}
