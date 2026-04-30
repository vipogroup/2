/**
 * Admin API - Priority Product Mapping
 * GET /api/admin/priority/products/:id - פרטי מיפוי
 * PUT /api/admin/priority/products/:id - עדכון מיפוי
 * DELETE /api/admin/priority/products/:id - מחיקת מיפוי
 */

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import dbConnect from '@/lib/dbConnect';
import PriorityProduct from '@/models/PriorityProduct';
import Product from '@/models/Product';

async function GETHandler(req, { params }) {
  try {
    await requireAdminApi(req);

    await dbConnect();

    const mapping = await PriorityProduct.findById(params.id)
      .populate('productId', 'name sku price image category')
      .lean();

    if (!mapping) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      mapping,
    });

  } catch (err) {
    console.error('[ADMIN_PRIORITY_PRODUCT_GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function PUTHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);

    await dbConnect();

    const data = await req.json();
    const { priorityItemCode, priorityItemName, vatType, glAccountSales, isActive } = data;

    const mapping = await PriorityProduct.findById(params.id);
    if (!mapping) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    // Update fields
    if (priorityItemCode !== undefined) mapping.priorityItemCode = priorityItemCode;
    if (priorityItemName !== undefined) mapping.priorityItemName = priorityItemName;
    if (vatType !== undefined) mapping.vatType = vatType;
    if (glAccountSales !== undefined) mapping.glAccountSales = glAccountSales;
    if (isActive !== undefined) mapping.isActive = isActive;
    
    mapping.lastModifiedBy = admin.id;
    mapping.lastSyncAt = new Date();
    
    await mapping.save();

    // Update product sync status
    if (mapping.productId) {
      await Product.updateOne(
        { _id: mapping.productId },
        {
          $set: {
            priorityItemCode: mapping.priorityItemCode,
            prioritySyncStatus: 'synced',
            lastPrioritySyncAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({
      ok: true,
      mapping,
    });

  } catch (err) {
    console.error('[ADMIN_PRIORITY_PRODUCT_PUT]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function DELETEHandler(req, { params }) {
  try {
    await requireAdminApi(req);

    await dbConnect();

    const mapping = await PriorityProduct.findById(params.id);
    if (!mapping) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    // Clear product sync status
    if (mapping.productId) {
      await Product.updateOne(
        { _id: mapping.productId },
        {
          $unset: { priorityItemCode: '' },
          $set: { prioritySyncStatus: 'not_synced' },
        }
      );
    }

    await mapping.deleteOne();

    return NextResponse.json({
      ok: true,
      message: 'Mapping deleted',
    });

  } catch (err) {
    console.error('[ADMIN_PRIORITY_PRODUCT_DELETE]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const PUT = withErrorLogging(PUTHandler);
export const DELETE = withErrorLogging(DELETEHandler);
