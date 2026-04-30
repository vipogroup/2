import catalogTemplatesJson from '@/exports/catalog-templates-stainless.json';

function buildPrefillTemplates() {
  const templates = {};
  const items = catalogTemplatesJson?.templates || [];
  for (const t of items) {
    if (!t.key) continue;
    templates[t.key] = {
      titlePrefix: t.titlePrefix || '',
      description: t.description || '',
      shortDescription: t.shortDescription || '',
      specs: t.specs || '',
      faq: t.faq || '',
      structuredData: t.structuredData || '',
      seo: {
        slugPrefix: t.seo?.slugPrefix || '',
        metaTitle: t.seo?.metaTitle || '',
        metaDescription: t.seo?.metaDescription || '',
        keywords: Array.isArray(t.seo?.keywords) ? t.seo.keywords.join(', ') : (t.seo?.keywords || ''),
      },
      category: t.category || '',
      subCategory: t.subCategory || '',
      tags: Array.isArray(t.tags) ? t.tags : [],
    };
  }
  return templates;
}

export const productPrefillTemplates = buildPrefillTemplates();
