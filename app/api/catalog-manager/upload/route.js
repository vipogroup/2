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

export const dynamic = 'force-dynamic';

function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
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

/**
 * POST /api/catalog-manager/upload
 * Public endpoint for uploading products from standalone Catalog Manager
 */
export async function POST(req) {
  apiDebugLog('\n=== UPLOAD API CALLED AT', new Date().toISOString(), '===');

  try {
    const admin = await requireAdminApi(req);
    if (!isSuperAdminUser(admin)) {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    apiDebugLog('Step 1: Parsing request body...');
    let body = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'פורמט בקשה לא תקין' },
        { status: 400 },
      );
    }

    const { tenantId, templateKey, products: directProducts } = body;
    apiDebugLog('Step 2: Received data:');
    apiDebugLog('  - tenantId:', tenantId);
    apiDebugLog('  - templateKey:', templateKey);
    apiDebugLog('  - products count:', directProducts?.length || 0);

    // Debug: Print first product details
    if (directProducts && directProducts.length > 0) {
      apiDebugLog('First product received:', JSON.stringify(directProducts[0], null, 2));
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'יש לבחור עסק יעד' },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { error: 'העסק לא נמצא' },
        { status: 404 }
      );
    }

    // Auto-activate tenant if pending - products must be visible in marketplace
    if (tenant.status !== 'active') {
      apiDebugLog(`[UPLOAD] Tenant "${tenant.name}" status is "${tenant.status}" → activating automatically`);
      tenant.status = 'active';
      await tenant.save();
      apiDebugLog(`[UPLOAD] Tenant "${tenant.name}" activated successfully`);
    }

    if (!Array.isArray(directProducts) || directProducts.length === 0) {
      return NextResponse.json(
        { error: 'לא נמצאו מוצרים להעלאה' },
        { status: 400 }
      );
    }

    if (!String(templateKey || '').trim()) {
      return NextResponse.json(
        { error: 'חובה לבחור תבנית לפני העלאה' },
        { status: 400 },
      );
    }

    apiDebugLog('Step 3: Connecting to MongoDB...');
    const conn = await connectMongo();
    if (!conn) {
      return NextResponse.json(
        { error: 'שירות בסיס הנתונים אינו זמין כרגע' },
        { status: 503 },
      );
    }
    apiDebugLog('Step 4: MongoDB connected');

    // Load template if selected
    apiDebugLog('=== DEBUG TEMPLATE RESOLUTION ===');
    apiDebugLog('templateKey received:', templateKey);
    apiDebugLog('tenantId received:', tenantId);
    const template = templateKey ? await resolveCatalogTemplate(templateKey, tenantId) : null;
    apiDebugLog('template found:', template ? 'YES' : 'NO');
    if (!template) {
      return NextResponse.json(
        { error: 'התבנית שנבחרה לא נמצאה. נסה לבחור תבנית מחדש.' },
        { status: 400 },
      );
    }
    if (template) {
      apiDebugLog('template.key:', template.key);
      apiDebugLog('template.structuredData:', template.structuredData);
      apiDebugLog('template.faq:', template.faq);
      apiDebugLog('template.tags:', template.tags);
      apiDebugLog('template.titlePrefix:', template.titlePrefix);
    }

    const createdProducts = [];
    const errors = [];

    apiDebugLog('=== STARTING TO PROCESS PRODUCTS ===');
    for (const catalogProduct of directProducts) {
      try {
        apiDebugLog('Processing product:', catalogProduct.title || catalogProduct.sku);
        apiDebugLog('Product category:', catalogProduct.category);
        apiDebugLog('Product price:', catalogProduct.price, typeof catalogProduct.price);
        apiDebugLog('Product stainless:', JSON.stringify(catalogProduct.stainless));

        const purchaseTypeRaw = String(catalogProduct.purchaseType || '').trim();
        if (!purchaseTypeRaw) {
          errors.push({ sku: catalogProduct.sku || 'unknown', error: 'חובה לבחור מצב העלאה למוצר (רגיל/קבוצתי/מכולה)' });
          continue;
        }
        if (!['regular', 'group'].includes(purchaseTypeRaw)) {
          errors.push({ sku: catalogProduct.sku || 'unknown', error: 'מצב העלאה לא תקין' });
          continue;
        }
        const groupPurchaseTypeRaw = String(catalogProduct.groupPurchaseType || '').trim();
        if (purchaseTypeRaw === 'group' && !['group', 'shared_container'].includes(groupPurchaseTypeRaw)) {
          errors.push({ sku: catalogProduct.sku || 'unknown', error: 'חובה לבחור סוג רכישה קבוצתית (קבוצתית/מכולה משותפת)' });
          continue;
        }

        // ולידציה: חובה לפחות 5 תמונות
        const imageUrls = Array.isArray(catalogProduct.images)
          ? catalogProduct.images
              .map((img) => (typeof img === 'string' ? img : img?.url || ''))
              .map((url) => String(url || '').trim())
              .filter(Boolean)
          : [];
        if (imageUrls.length < 5) {
          errors.push({ sku: catalogProduct.sku || 'unknown', error: `חובה להוסיף לפחות 5 תמונות (יש ${imageUrls.length}/5)` });
          continue;
        }

        // Build product name (prefer Catalog Manager name/title as-is)
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

        // SEO
        const seoSlugBase = template?.seo?.slugPrefix || catalogProduct.category?.toLowerCase().replace(/\s+/g, '-') || 'product';
        const seoSlug = generateSlug(`${seoSlugBase}-${catalogProduct.sku || Date.now()}`);

        const normalizedPurchaseType = purchaseTypeRaw;
        const normalizedType = normalizedPurchaseType === 'group' ? 'group' : 'online';
        const resolvedGroupPurchaseType =
          normalizedPurchaseType === 'group'
            ? (groupPurchaseTypeRaw === 'shared_container' ? 'shared_container' : 'group')
            : 'group';

        const modePreview = {
          purchaseType: normalizedPurchaseType,
          type: normalizedType,
          groupPurchaseType: resolvedGroupPurchaseType,
          inventoryMode: catalogProduct.inventoryMode || 'stock',
        };
        fullDesc = mergeTemplatePurchaseModeIntoDescription(fullDesc, template, modePreview);

        const seoKeywords = Array.isArray(template?.seo?.keywords)
          ? template.seo.keywords
          : typeof template?.seo?.keywords === 'string'
            ? template.seo.keywords.split(',').map((item) => item.trim()).filter(Boolean)
            : [];
        const templateTags = normalizeList(template?.tags);

        const newProduct = {
          tenantId: tenantId,
          name: productName,
          description: shortDesc,
          fullDescription: fullDesc,
          category: category,
          subCategory: template?.subCategory || catalogProduct.subCategory || 'כללי',
          templateKey: template?.key || templateKey || '',
          titlePrefix: template?.titlePrefix || '',
          tags: templateTags,
          faq: template?.faq || '',
          structuredData: template?.structuredData || '',
          price: catalogProduct.price || 0,
          groupPrice: catalogProduct.groupPrice || catalogProduct.price || 0,
          originalPrice: catalogProduct.originalPrice || catalogProduct.price || null,
          commission: catalogProduct.commission || 0,
          sku: catalogProduct.sku || '',
          currency: 'ILS',
          type: normalizedType,
          purchaseType: normalizedPurchaseType,
          groupPurchaseType: resolvedGroupPurchaseType,
          rating: 4.5,
          reviews: 0,
          groupPurchaseDetails: catalogProduct.groupPurchaseDetails || {
            closingDays: '40',
            shippingDays: '60', 
            minQuantity: '0', // ללא כמות מינימום כברירת מחדל
            currentQuantity: '0'
          },
          shippingEnabled: false,
          shippingPrice: 0,
          media: {
            images: imageUrls.map((url, idx) => ({
                  url,
                  alt: productName,
                  position: idx,
                })),
            videoUrl: typeof catalogProduct.videoUrl === 'string' ? catalogProduct.videoUrl.trim() : '',
          },
          inStock: catalogProduct.inStock ?? (catalogProduct.stockCount > 0),
          stockCount: catalogProduct.stockCount || 0,
          inventoryMode: 'stock',
          features: catalogProduct.features?.length > 0 ? catalogProduct.features : [
            'נירוסטה איכותית 304/201',
            'עמיד בפני חלודה וקורוזיה',
            'קל לניקוי ותחזוקה',
            'מתאים לשימוש תעשייתי אינטנסיבי'
          ],
          specs: catalogProduct.specs || `מידות: ${catalogProduct.stainless?.length || 0}x${catalogProduct.stainless?.width || 0}x${catalogProduct.stainless?.height || 0} ס"מ
עובי: ${catalogProduct.stainless?.thickness || '1.2'} מ"מ
חומר: נירוסטה ${catalogProduct.stainless?.material || '304'}
משקל: כ-${Math.round((catalogProduct.stainless?.length * catalogProduct.stainless?.width * 0.008) || 20)} ק"ג
מדפים: ${catalogProduct.stainless?.layers || 1}`,
          suitableFor: catalogProduct.suitableFor || 'מטבחים תעשייתיים, מסעדות, בתי מלון, קייטרינג, מעבדות מזון, בתי חולים',
          whyChooseUs: catalogProduct.whyChooseUs || 'איכות גבוהה, אחריות מלאה, שירות מקצועי, משלוח מהיר, מחירים תחרותיים',
          warranty: catalogProduct.warranty || 'שנת אחריות מלאה על כל פגם בייצור',
          seo: {
            slug: seoSlug,
            slugPrefix: template?.seo?.slugPrefix || '',
            metaTitle: template?.seo?.metaTitle || productName,
            metaDescription: template?.seo?.metaDescription || shortDesc?.substring(0, 160) || '',
            keywords: seoKeywords,
          },
          stainless: {
            length: catalogProduct.stainless?.length ? Number(catalogProduct.stainless.length) : null,
            width: catalogProduct.stainless?.width ? Number(catalogProduct.stainless.width) : null,
            height: catalogProduct.stainless?.height ? Number(catalogProduct.stainless.height) : null,
            thickness: catalogProduct.stainless?.thickness || '',
            material: catalogProduct.stainless?.material || '',
            layers: catalogProduct.stainless?.layers ? Number(catalogProduct.stainless.layers) : null,
            hasMiddleShelf: catalogProduct.stainless?.hasMiddleShelf || false,
          },
          status: 'published',
          isFeatured: false,
        };

        apiDebugLog('About to create product:', newProduct.name);
        apiDebugLog('Product data:', JSON.stringify(newProduct, null, 2));

        const productDoc = new Product(newProduct);
        const created = await productDoc.save();

        if (!created) {
          console.error('Product save returned null/undefined');
          throw new Error('Product creation failed - no document returned');
        }

        // Verify it was actually saved
        const verification = await Product.findById(created._id);
        if (!verification) {
          console.error('ERROR: Product not found after save! ID:', created._id);
          throw new Error('Product save failed - not found in DB');
        } else {
          apiDebugLog('VERIFIED: Product exists in DB with ID:', verification._id);
        }

        createdProducts.push(created);
        apiDebugLog('Successfully created product:', created._id, created.name);
      } catch (err) {
        console.error('Error creating product:', catalogProduct.title);
        console.error('Full error:', err);
        console.error('Validation errors:', err.errors);
        errors.push({
          productId: catalogProduct._id,
          title: catalogProduct.title,
          error: err.message,
          validationErrors: err.errors
        });
      }
    }

    apiDebugLog('Upload summary: Created', createdProducts.length, 'products, Errors:', errors.length);

    // Sync created products to external server
    if (createdProducts.length > 0) {
      syncProductUpsert({ tenantId, products: createdProducts }).catch((err) => {
        console.warn('PRODUCT_SYNC_UPSERT_WARNING', err?.message || err);
      });
    }

    // Print detailed errors
    if (errors.length > 0) {
      apiDebugLog('=== VALIDATION ERRORS ===');
      errors.forEach(err => {
        apiDebugLog('Product:', err.title);
        apiDebugLog('Error message:', err.error);
        if (err.validationErrors) {
          Object.keys(err.validationErrors).forEach(field => {
            apiDebugLog(`  - Field "${field}":`, err.validationErrors[field].message);
          });
        }
      });
      apiDebugLog('=========================');
    }

    // Return accurate response
    if (createdProducts.length === 0 && errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'לא הצלחנו ליצור אף מוצר',
        errors: errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `נוצרו ${createdProducts.length} מוצרים בהצלחה`,
      created: createdProducts.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isDbUnavailableError(error)) {
      return NextResponse.json(
        { error: 'שירות בסיס הנתונים אינו זמין כרגע' },
        { status: 503 },
      );
    }
    console.error('Catalog upload error:', error);
    return NextResponse.json(
      { error: error.message || 'שגיאה בהעלאת המוצרים' },
      { status: 500 }
    );
  }
}
