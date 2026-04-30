import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { getCloudinary } from '@/lib/cloudinary';
import Product from '@/models/Product';
import { requireAdminApi } from '@/lib/auth/server';
import { isSuperAdminUser } from '@/lib/superAdmins';

export const dynamic = 'force-dynamic';

/**
 * POST /api/catalog-manager/cleanup-media
 * Deletes ALL images from Cloudinary (vipo-products folder)
 * and clears media from all products in MongoDB.
 * Super Admin only.
 */
async function POSTHandler(request) {
  try {
    const admin = await requireAdminApi(request);
    if (!isSuperAdminUser(admin)) {
      return NextResponse.json({ error: 'Super Admin only' }, { status: 403 });
    }

    await connectMongo();

    const results = {
      cloudinaryDeleted: 0,
      cloudinaryErrors: [],
      productsUpdated: 0,
    };

    // Step 1: Delete all resources from Cloudinary vipo-products folder
    const hasConfig = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (hasConfig) {
      try {
        const cloudinary = getCloudinary();
        
        // Delete all images in vipo-products folder
        let hasMore = true;
        let nextCursor = undefined;
        
        while (hasMore) {
          const listResult = await cloudinary.api.resources({
            type: 'upload',
            prefix: 'vipo-products',
            max_results: 500,
            next_cursor: nextCursor,
          });
          
          const resources = listResult.resources || [];
          if (resources.length > 0) {
            const publicIds = resources.map(r => r.public_id);
            
            // Delete in batches of 100 (Cloudinary limit)
            for (let i = 0; i < publicIds.length; i += 100) {
              const batch = publicIds.slice(i, i + 100);
              try {
                await cloudinary.api.delete_resources(batch, { resource_type: 'image' });
                results.cloudinaryDeleted += batch.length;
              } catch (batchErr) {
                results.cloudinaryErrors.push(batchErr.message);
              }
            }
          }
          
          nextCursor = listResult.next_cursor;
          hasMore = Boolean(nextCursor);
        }

        // Also try to delete videos in vipo-products folder
        try {
          hasMore = true;
          nextCursor = undefined;
          while (hasMore) {
            const videoResult = await cloudinary.api.resources({
              type: 'upload',
              prefix: 'vipo-products',
              resource_type: 'video',
              max_results: 500,
              next_cursor: nextCursor,
            });
            const videos = videoResult.resources || [];
            if (videos.length > 0) {
              const videoIds = videos.map(r => r.public_id);
              for (let i = 0; i < videoIds.length; i += 100) {
                const batch = videoIds.slice(i, i + 100);
                try {
                  await cloudinary.api.delete_resources(batch, { resource_type: 'video' });
                  results.cloudinaryDeleted += batch.length;
                } catch (batchErr) {
                  results.cloudinaryErrors.push(batchErr.message);
                }
              }
            }
            nextCursor = videoResult.next_cursor;
            hasMore = Boolean(nextCursor);
          }
        } catch (videoErr) {
          // No videos, that's fine
        }

      } catch (cloudErr) {
        results.cloudinaryErrors.push(cloudErr.message);
      }
    } else {
      results.cloudinaryErrors.push('Cloudinary not configured');
    }

    // Step 2: Clear media from all products in MongoDB
    const updateResult = await Product.updateMany(
      {},
      {
        $set: {
          'media.images': [],
          'media.videoUrl': '',
        }
      }
    );
    results.productsUpdated = updateResult.modifiedCount || 0;

    return NextResponse.json({
      success: true,
      message: `Cleanup complete. Deleted ${results.cloudinaryDeleted} files from Cloudinary. Cleared media from ${results.productsUpdated} products.`,
      ...results,
    });
  } catch (err) {
    console.error('cleanup-media error:', err);
    return NextResponse.json(
      { error: 'Cleanup failed', details: err.message },
      { status: 500 }
    );
  }
}

export const POST = POSTHandler;
