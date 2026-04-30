import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { connectMongo } from '@/lib/mongoose';
import Product from '@/models/Product';
import { requireAdminApi } from '@/lib/auth/server';

async function POSTHandler(request) {
  try {
    // Verify admin access
    const authResult = await requireAdminApi(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await connectMongo();

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: 'חסר מזהה מוצר' }, { status: 400 });
    }

    // Find original product
    const originalProduct = await Product.findById(productId).lean();
    
    if (!originalProduct) {
      return NextResponse.json({ error: 'המוצר לא נמצא' }, { status: 404 });
    }

    // Create duplicate - remove _id and add " (עותק)" to name
    const { _id, createdAt, updatedAt, __v, sku, legacyId, ...productData } = originalProduct;

    // Generate new SKU if original had one
    let newSku = null;
    if (sku) {
      const timestamp = Date.now().toString().slice(-6);
      newSku = `${sku}-COPY-${timestamp}`;
    }

    const duplicateProduct = new Product({
      ...productData,
      name: `${originalProduct.name} (עותק)`,
      sku: newSku,
      isFeatured: false, // Don't feature duplicates automatically
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await duplicateProduct.save();

    return NextResponse.json({
      success: true,
      message: 'המוצר שוכפל בהצלחה',
      product: duplicateProduct,
    });

  } catch (error) {
    console.error('Duplicate product error:', error);
    return NextResponse.json(
      { error: 'שגיאה בשכפול המוצר' },
      { status: 500 }
    );
  }
}

export const POST = withErrorLogging(POSTHandler);
