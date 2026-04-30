import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { requireAdminApi } from '@/lib/auth/server';
import StainlessProduct from '@/models/StainlessProduct';
import Product from '@/models/Product';
import Tenant from '@/models/Tenant';
import { resolveCatalogTemplate } from '@/lib/catalogTemplates';
import { mergeTemplatePurchaseModeIntoDescription } from '@/lib/catalogTemplatePurchaseMode';

/**
 * POST /api/admin/catalog-manager/copy-to-tenant
 * Copy selected catalog products to a specific tenant (business)
 * Body: { productIds: string[], tenantId: string }
 */
async function POSTHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    
    // Only super_admin can copy products to other tenants
    if (admin.role !== 'super_admin' && admin.role !== 'admin') {
      return NextResponse.json(
        { error: 'רק מנהל ראשי יכול להעתיק מוצרים לעסקים' },
        { status: 403 }
      );
    }

    await connectMongo();

    const body = await req.json();
    const { productIds, tenantId, templateKey, products: directProducts } = body;
    
    // טעינת תבנית אם נבחרה
    const template = templateKey ? await resolveCatalogTemplate(templateKey, tenantId) : null;

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

    let catalogProducts = [];

    // Option 1: Direct products from standalone page
    if (Array.isArray(directProducts) && directProducts.length > 0) {
      catalogProducts = directProducts.map(p => ({
        ...p, // שמירת כל השדות המקוריים
        title: p.title || p.name || 'מוצר',
        name: p.title || p.name || 'מוצר',
        description: p.description || 'תיאור המוצר',
        category: p.category || 'כללי',
        price: p.price || 0,
        images: p.images || [],
        sku: p.sku || '',
        purchaseType: p.purchaseType || 'regular',
        stainless: p.stainless || {},
      }));
    } 
    // Option 2: Product IDs from catalog
    else if (Array.isArray(productIds) && productIds.length > 0) {
      const dbProducts = await StainlessProduct.find({
        _id: { $in: productIds }
      }).lean();
      catalogProducts = dbProducts;
    }

    if (catalogProducts.length === 0) {
      return NextResponse.json(
        { error: 'לא נמצאו מוצרים להעתקה' },
        { status: 400 }
      );
    }

    // Create products for the tenant
    const createdProducts = [];
    const errors = [];

    for (const catalogProduct of catalogProducts) {
      try {
        // בניית שם המוצר - אם יש תבנית עם prefix, משלב אותו
        const productName = template?.titlePrefix 
          ? `${template.titlePrefix} ${catalogProduct.category || ''} ${catalogProduct.stainless?.length || ''}×${catalogProduct.stainless?.width || ''}×${catalogProduct.stainless?.height || ''}`.trim()
          : (catalogProduct.title || catalogProduct.name || 'מוצר ללא שם');
        
        // תיאור קצר - מהתבנית או מהמוצר
        const shortDesc = template?.shortDescription || catalogProduct.description || 'תיאור המוצר';
        
        // תיאור מלא - מהתבנית או מהמוצר + בלוק לפי סוג רכישה (אם מוגדר בתבנית)
        let fullDesc = template?.description || catalogProduct.fullDescription || catalogProduct.description || '';
        const modePreview = {
          purchaseType: catalogProduct.purchaseType || 'group',
          type: catalogProduct.purchaseType === 'group' ? 'group' : 'online',
          groupPurchaseType: catalogProduct.groupPurchaseType === 'shared_container' ? 'shared_container' : 'group',
          inventoryMode: catalogProduct.inventoryMode || 'stock',
        };
        fullDesc = mergeTemplatePurchaseModeIntoDescription(fullDesc, template, modePreview);
        
        // קטגוריה - מהתבנית או מהמוצר
        const category = template?.category || catalogProduct.category || 'כללי';
        
        // SEO - מיזוג תבנית עם נתוני מוצר
        const seoSlugBase = template?.seo?.slugPrefix || catalogProduct.category?.toLowerCase().replace(/\s+/g, '-') || 'product';
        const seoSlug = generateSlug(`${seoSlugBase}-${catalogProduct.sku || Date.now()}`);
        
        // Map catalog product to Product schema
        const seoKeywords = Array.isArray(template?.seo?.keywords)
          ? template.seo.keywords
          : typeof template?.seo?.keywords === 'string'
            ? template.seo.keywords.split(',').map(item => item.trim()).filter(Boolean)
            : [];

        const newProduct = {
          tenantId: tenantId,
          name: productName,
          description: shortDesc,
          fullDescription: fullDesc,
          category: category,
          subCategory: template?.subCategory || catalogProduct.subCategory || 'כללי',
          price: catalogProduct.price || 0,
          groupPrice: catalogProduct.groupPrice || null,
          originalPrice: catalogProduct.originalPrice || null,
          commission: catalogProduct.commission || 0,
          sku: catalogProduct.sku || '',
          currency: 'ILS',
          type: 'group',
          purchaseType: 'group',
          groupPurchaseType: catalogProduct.groupPurchaseType === 'shared_container' ? 'shared_container' : 'group',
          media: {
            images: Array.isArray(catalogProduct.images) 
              ? catalogProduct.images.map((img, idx) => ({
                  url: typeof img === 'string' ? img : img?.url || '',
                  alt: productName,
                  position: idx,
                }))
              : [],
            videoUrl: typeof catalogProduct.videoUrl === 'string' ? catalogProduct.videoUrl.trim() : '',
          },
          inStock: catalogProduct.inStock ?? (catalogProduct.stockCount > 0),
          stockCount: catalogProduct.stockCount || 0,
          inventoryMode: 'stock',
          features: catalogProduct.features || [],
          specs: catalogProduct.specs || '',
          suitableFor: catalogProduct.suitableFor || '',
          whyChooseUs: catalogProduct.whyChooseUs || '',
          warranty: catalogProduct.warranty || '',
          seo: {
            slug: seoSlug,
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

        const created = await Product.create(newProduct);
        createdProducts.push(created);
      } catch (err) {
        errors.push({
          productId: catalogProduct._id,
          title: catalogProduct.title,
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: `הועתקו ${createdProducts.length} מוצרים לעסק ${tenant.name}`,
      copied: createdProducts.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('POST /api/admin/catalog-manager/copy-to-tenant error:', err);
    return NextResponse.json(
      { error: 'שגיאה בהעתקת המוצרים' },
      { status: 500 }
    );
  }
}

function generateSlug(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0590-\u05ff-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const POST = withErrorLogging(POSTHandler);
