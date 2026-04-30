/**
 * Admin API - Priority Products Mapping
 * GET /api/admin/priority/products - רשימת מיפויי מוצרים
 * POST /api/admin/priority/products - יצירת/עדכון מיפוי
 */

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import { escapeRegex } from '@/lib/utils/sanitize';
import dbConnect from '@/lib/dbConnect';
import PriorityProduct from '@/models/PriorityProduct';
import Product from '@/models/Product';

async function GETHandler(req) {
  try {
    await requireAdminApi(req);

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search');
    const unmapped = searchParams.get('unmapped') === 'true';

    const skip = (page - 1) * limit;

    if (unmapped) {
      // Get products without Priority mapping
      const mappedProductIds = await PriorityProduct.distinct('productId');
      
      const query = { _id: { $nin: mappedProductIds }, status: 'published' };
      if (search) {
        const safeSearch = escapeRegex(search);
        query.$or = [
          { name: { $regex: safeSearch, $options: 'i' } },
          { sku: { $regex: safeSearch, $options: 'i' } },
        ];
      }

      const [products, total] = await Promise.all([
        Product.find(query).skip(skip).limit(limit).lean(),
        Product.countDocuments(query),
      ]);

      return NextResponse.json({
        ok: true,
        products,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    }

    // Get mapped products
    const query = { isActive: true };
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { priorityItemCode: { $regex: safeSearch, $options: 'i' } },
        { priorityItemName: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const [mappings, total] = await Promise.all([
      PriorityProduct.find(query)
        .populate('productId', 'name sku price')
        .skip(skip)
        .limit(limit)
        .lean(),
      PriorityProduct.countDocuments(query),
    ]);

    return NextResponse.json({
      ok: true,
      mappings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });

  } catch (err) {
    console.error('[ADMIN_PRIORITY_PRODUCTS]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function POSTHandler(req) {
  try {
    await requireAdminApi(req);

    await dbConnect();

    const data = await req.json();
    const { productId, priorityItemCode, priorityItemName, vatType, glAccountSales } = data;

    if (!productId || !priorityItemCode) {
      return NextResponse.json({ 
        error: 'productId and priorityItemCode are required' 
      }, { status: 400 });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Create or update mapping
    const mapping = await PriorityProduct.upsertMapping(
      productId,
      {
        priorityItemCode,
        priorityItemName: priorityItemName || product.name,
        vatType: vatType || 'standard',
        glAccountSales: glAccountSales || '4100',
      },
      session.user.id
    );

    // Update product with Priority item code
    product.priorityItemCode = priorityItemCode;
    product.prioritySyncStatus = 'synced';
    product.lastPrioritySyncAt = new Date();
    await product.save();

    return NextResponse.json({
      ok: true,
      mapping,
    });

  } catch (err) {
    console.error('[ADMIN_PRIORITY_PRODUCTS_CREATE]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
