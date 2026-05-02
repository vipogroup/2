import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { requireAdminApi } from '@/lib/auth/server';
import Product from '@/models/Product';
import Tenant from '@/models/Tenant';
import { resolveCatalogTemplate } from '@/lib/catalogTemplates';
import { mergeTemplatePurchaseModeIntoDescription } from '@/lib/catalogTemplatePurchaseMode';
import { isDbUnavailableError } from '@/lib/dbOutageClassifier';
import { isSuperAdminUser } from '@/lib/superAdmins';
import { syncProductUpsert } from '@/lib/productSync';
import { apiDebugLog } from '@/lib/apiDebugLog';
import {
  CATALOG_FORBIDDEN_PLACEHOLDER_PRICE,
  isForbiddenCatalogPrice,
} from '@/lib/catalogPriceGuards';

export const dynamic = 'force-dynamic';

function buildMediaPayload(images, productName, videoUrl) {
  const normalizedImages = Array.isArray(images)
    ? images
        .map((img, idx) => {
          const url = typeof img === 'string' ? img : img?.url || '';
          if (!url) return null;
          return {
            url,
            alt: productName,
            position: idx,
            publicId: typeof img === 'string' ? '' : (img?.publicId || img?.public_id || ''),
          };
        })
        .filter(Boolean)
    : [];

  return {
    images: normalizedImages,
    videoUrl: typeof videoUrl === 'string' ? videoUrl : '',
  };
}

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

function buildUpdatePayload(catalogProduct, template, templateKey) {
  const titlePrefix = template?.titlePrefix || 'שולחן נירוסטה';
  const rawName = String(catalogProduct.name || catalogProduct.title || '').trim();
  const productName = rawName || `${titlePrefix} ${catalogProduct.category || ''} ${catalogProduct.sku || ''}`.trim();

  const shortDesc =
    catalogProduct.description ||
    template?.shortDescription ||
    template?.description ||
    'תיאור המוצר';
  let fullDesc = catalogProduct.fullDescription || catalogProduct.description || template?.description || '';
  const category = catalogProduct.category || template?.category || 'כללי';

  const normalizedPurchaseType = catalogProduct.purchaseType === 'regular' ? 'regular' : 'group';
  const normalizedType = normalizedPurchaseType === 'group' ? 'group' : 'online';

  const modePreview = {
    purchaseType: normalizedPurchaseType,
    type: normalizedType,
    groupPurchaseType: catalogProduct.groupPurchaseType === 'shared_container' ? 'shared_container' : 'group',
    inventoryMode: catalogProduct.inventoryMode || 'stock',
  };
  if (template) {
    fullDesc = mergeTemplatePurchaseModeIntoDescription(fullDesc, template, modePreview);
  }

  const mediaPayload = buildMediaPayload(catalogProduct.images, productName, catalogProduct.videoUrl);
  const hasMediaUpdate = mediaPayload.images.length > 0 || mediaPayload.videoUrl;
  const templateTags = normalizeList(template?.tags);
  const resolvedTemplateKey = template?.key || templateKey || '';

  const update = {
    name: productName,
    description: shortDesc,
    fullDescription: fullDesc,
    category,
    subCategory: template?.subCategory || catalogProduct.subCategory || 'כללי',
    price: catalogProduct.price || 0,
    groupPrice: catalogProduct.groupPrice || catalogProduct.price || 0,
    originalPrice: catalogProduct.originalPrice || catalogProduct.price || null,
    commission: catalogProduct.commission || 0,
    currency: 'ILS',
    type: normalizedType,
    purchaseType: normalizedPurchaseType,
    groupPurchaseType: catalogProduct.groupPurchaseType === 'shared_container' ? 'shared_container' : 'group',
    groupPurchaseDetails: normalizedPurchaseType === 'group'
      ? (catalogProduct.groupPurchaseDetails || {
        closingDays: '40',
        shippingDays: '60',
        minQuantity: '0',
        currentQuantity: '0',
      })
      : null,
    shippingEnabled: false,
    shippingPrice: 0,
    inStock: catalogProduct.inStock ?? (catalogProduct.stockCount > 0),
    stockCount: catalogProduct.stockCount || 0,
    inventoryMode: 'stock',
    features: catalogProduct.features?.length > 0 ? catalogProduct.features : [
      'נירוסטה איכותית 304/201',
      'עמיד בפני חלודה וקורוזיה',
      'קל לניקוי ותחזוקה',
      'מתאים לשימוש תעשייתי אינטנסיבי',
    ],
    specs: catalogProduct.specs || `מידות: ${catalogProduct.stainless?.length || 0}x${catalogProduct.stainless?.width || 0}x${catalogProduct.stainless?.height || 0} ס"מ\n` +
      `עובי: ${catalogProduct.stainless?.thickness || '1.2'} מ"מ\n` +
      `חומר: נירוסטה ${catalogProduct.stainless?.material || '304'}\n` +
      `משקל: כ-${Math.round((catalogProduct.stainless?.length * catalogProduct.stainless?.width * 0.008) || 20)} ק"ג\n` +
      `מדפים: ${catalogProduct.stainless?.layers || 1}`,
    suitableFor: catalogProduct.suitableFor || 'מטבחים תעשייתיים, מסעדות, בתי מלון, קייטרינג, מעבדות מזון, בתי חולים',
    whyChooseUs: catalogProduct.whyChooseUs || 'איכות גבוהה, אחריות מלאה, שירות מקצועי, משלוח מהיר, מחירים תחרותיים',
    warranty: catalogProduct.warranty || 'שנת אחריות מלאה על כל פגם בייצור',
    stainless: {
      length: catalogProduct.stainless?.length ? Number(catalogProduct.stainless.length) : null,
      width: catalogProduct.stainless?.width ? Number(catalogProduct.stainless.width) : null,
      height: catalogProduct.stainless?.height ? Number(catalogProduct.stainless.height) : null,
      thickness: catalogProduct.stainless?.thickness || '',
      material: catalogProduct.stainless?.material || '',
      layers: catalogProduct.stainless?.layers ? Number(catalogProduct.stainless.layers) : null,
      hasMiddleShelf: catalogProduct.stainless?.hasMiddleShelf || false,
    },
  };

  if (resolvedTemplateKey) {
    update.templateKey = resolvedTemplateKey;
  }

  if (template) {
    update.titlePrefix = template.titlePrefix || '';
    update.tags = templateTags;
    update.faq = template.faq || '';
    update.structuredData = template.structuredData || '';
    update['seo.slugPrefix'] = template.seo?.slugPrefix || '';
  }

  return { update, mediaPayload, hasMediaUpdate };
}

/**
 * POST /api/catalog-manager/update
 * Update existing products by SKU for a tenant
 */
export async function POST(req) {
  try {
    const admin = await requireAdminApi(req);
    if (!isSuperAdminUser(admin)) {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    let body = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'פורמט בקשה לא תקין' }, { status: 400 });
    }

    const { tenantId, templateKey, products: directProducts } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'יש לבחור עסק יעד' }, { status: 400 });
    }

    if (!Array.isArray(directProducts) || directProducts.length === 0) {
      return NextResponse.json({ error: 'לא נמצאו מוצרים לעדכון' }, { status: 400 });
    }

    const conn = await connectMongo();
    if (!conn) {
      return NextResponse.json({ error: 'שירות בסיס הנתונים אינו זמין כרגע' }, { status: 503 });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'העסק לא נמצא' }, { status: 404 });
    }

    apiDebugLog('=== DEBUG TEMPLATE RESOLUTION (UPDATE) ===');
    apiDebugLog('templateKey received:', templateKey);
    apiDebugLog('tenantId received:', tenantId);
    const template = templateKey ? await resolveCatalogTemplate(templateKey, tenantId) : null;
    apiDebugLog('template found:', template ? 'YES' : 'NO');
    if (template) {
      apiDebugLog('template.key:', template.key);
      apiDebugLog('template.structuredData:', template.structuredData);
      apiDebugLog('template.faq:', template.faq);
      apiDebugLog('template.tags:', template.tags);
      apiDebugLog('template.titlePrefix:', template.titlePrefix);
    }
    const updatedProducts = [];
    const notFound = [];
    const errors = [];

    for (const catalogProduct of directProducts) {
      try {
        const sku = String(catalogProduct.sku || '').trim();
        if (!sku) {
          errors.push({
            productId: catalogProduct._id,
            title: catalogProduct.title,
            error: 'Missing SKU',
          });
          continue;
        }

        const priceNum = Number(catalogProduct.price);
        const groupPriceNum = Number(
          catalogProduct.groupPrice != null ? catalogProduct.groupPrice : catalogProduct.price,
        );
        if (
          isForbiddenCatalogPrice(priceNum) ||
          isForbiddenCatalogPrice(groupPriceNum) ||
          Number(catalogProduct.originalPrice) === CATALOG_FORBIDDEN_PLACEHOLDER_PRICE
        ) {
          const isPh =
            priceNum === CATALOG_FORBIDDEN_PLACEHOLDER_PRICE ||
            groupPriceNum === CATALOG_FORBIDDEN_PLACEHOLDER_PRICE ||
            Number(catalogProduct.originalPrice) === CATALOG_FORBIDDEN_PLACEHOLDER_PRICE;
          errors.push({
            productId: catalogProduct._id,
            title: catalogProduct.title,
            error: isPh
              ? 'מחיר placeholder (12345) אסור לפרסום — עדכן מחיר USD בטבלת הקטלוג.'
              : 'מחיר לא תקין (חייב להיות חיובי).',
          });
          continue;
        }

        const { update, mediaPayload, hasMediaUpdate } = buildUpdatePayload(
          catalogProduct,
          template,
          templateKey,
        );
        if (hasMediaUpdate) {
          update.media = mediaPayload;
        }

        const doc = await Product.findOneAndUpdate(
          { tenantId, sku },
          update,
          { new: true, runValidators: true },
        );

        if (!doc) {
          notFound.push(sku);
          continue;
        }

        updatedProducts.push(doc);
      } catch (err) {
        errors.push({
          productId: catalogProduct._id,
          title: catalogProduct.title,
          error: err.message,
        });
      }
    }

    // Sync updated products to external server
    if (updatedProducts.length > 0) {
      syncProductUpsert({ tenantId, products: updatedProducts }).catch((err) => {
        console.warn('PRODUCT_SYNC_UPSERT_WARNING', err?.message || err);
      });
    }

    const messageParts = [`עודכנו ${updatedProducts.length} מוצרים`];
    if (notFound.length) messageParts.push(`${notFound.length} לא נמצאו`);
    if (errors.length) messageParts.push(`${errors.length} שגיאות`);

    return NextResponse.json({
      success: errors.length === 0,
      message: messageParts.join(', '),
      updated: updatedProducts.length,
      notFound: notFound.length ? notFound : undefined,
      errors: errors.length ? errors : undefined,
    });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isDbUnavailableError(error)) {
      return NextResponse.json({ error: 'שירות בסיס הנתונים אינו זמין כרגע' }, { status: 503 });
    }
    console.error('Catalog update error:', error);
    return NextResponse.json(
      { error: error.message || 'שגיאה בעדכון המוצרים' },
      { status: 500 },
    );
  }
}
