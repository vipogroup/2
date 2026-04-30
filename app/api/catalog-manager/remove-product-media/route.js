import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Product from '@/models/Product';
import { requireAdminApi } from '@/lib/auth/server';
import { isSuperAdminUser } from '@/lib/superAdmins';

export const dynamic = 'force-dynamic';

/**
 * POST /api/catalog-manager/remove-product-media
 * Removes a specific media URL from products in the store.
 * Super Admin only.
 */
async function POSTHandler(request) {
  try {
    const admin = await requireAdminApi(request);
    if (!isSuperAdminUser(admin)) {
      return NextResponse.json({ error: 'Super Admin only' }, { status: 403 });
    }

    const { url, tenantId } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    await connectMongo();

    // Build filter
    const filter = {
      'media.images.url': url,
    };
    if (tenantId) {
      filter.tenantId = tenantId;
    }

    // Pull the image from media.images array where url matches
    const result = await Product.updateMany(
      filter,
      {
        $pull: {
          'media.images': { url: url }
        }
      }
    );

    // Also clear videoUrl if it matches
    const videoFilter = {
      'media.videoUrl': url,
    };
    if (tenantId) {
      videoFilter.tenantId = tenantId;
    }
    const videoResult = await Product.updateMany(
      videoFilter,
      {
        $set: { 'media.videoUrl': '' }
      }
    );

    const updatedCount = (result.modifiedCount || 0) + (videoResult.modifiedCount || 0);

    return NextResponse.json({ 
      success: true, 
      updatedCount,
      imageUpdated: result.modifiedCount || 0,
      videoUpdated: videoResult.modifiedCount || 0,
    });
  } catch (err) {
    console.error('remove-product-media error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const POST = POSTHandler;
