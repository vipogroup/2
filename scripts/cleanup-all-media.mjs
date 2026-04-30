/**
 * Cleanup all media:
 * 1. Delete all images/videos from Cloudinary (vipo-products folder)
 * 2. Clear media from all products in MongoDB
 * 
 * Usage: node scripts/cleanup-all-media.mjs
 */

import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';

// Load env
dotenv.config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

console.log('=== Media Cleanup Script ===\n');

// Step 1: Cloudinary cleanup
if (CLOUD_NAME && API_KEY && API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true,
  });

  console.log(`Cloudinary: ${CLOUD_NAME}`);
  console.log('Deleting all images in vipo-products folder...\n');

  let totalDeleted = 0;

  // Delete images
  try {
    let hasMore = true;
    let nextCursor = undefined;

    while (hasMore) {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'vipo-products',
        resource_type: 'image',
        max_results: 500,
        next_cursor: nextCursor,
      });

      const resources = result.resources || [];
      console.log(`  Found ${resources.length} images in this batch`);

      if (resources.length > 0) {
        const publicIds = resources.map(r => r.public_id);
        
        for (let i = 0; i < publicIds.length; i += 100) {
          const batch = publicIds.slice(i, i + 100);
          try {
            await cloudinary.api.delete_resources(batch, { resource_type: 'image' });
            totalDeleted += batch.length;
            console.log(`  Deleted batch of ${batch.length} images`);
          } catch (err) {
            console.error(`  Error deleting batch: ${err.message}`);
          }
        }
      }

      nextCursor = result.next_cursor;
      hasMore = Boolean(nextCursor);
    }
  } catch (err) {
    console.error('Error listing images:', err.message);
  }

  // Delete videos
  try {
    let hasMore = true;
    let nextCursor = undefined;

    while (hasMore) {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'vipo-products',
        resource_type: 'video',
        max_results: 500,
        next_cursor: nextCursor,
      });

      const resources = result.resources || [];
      if (resources.length > 0) {
        console.log(`  Found ${resources.length} videos`);
        const publicIds = resources.map(r => r.public_id);
        
        for (let i = 0; i < publicIds.length; i += 100) {
          const batch = publicIds.slice(i, i + 100);
          try {
            await cloudinary.api.delete_resources(batch, { resource_type: 'video' });
            totalDeleted += batch.length;
            console.log(`  Deleted batch of ${batch.length} videos`);
          } catch (err) {
            console.error(`  Error deleting video batch: ${err.message}`);
          }
        }
      }

      nextCursor = result.next_cursor;
      hasMore = Boolean(nextCursor);
    }
  } catch (err) {
    // No videos - that's fine
  }

  console.log(`\nCloudinary: Deleted ${totalDeleted} files total\n`);
} else {
  console.log('Cloudinary not configured, skipping...\n');
}

// Step 2: MongoDB cleanup
if (MONGO_URI) {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected!\n');

  const db = mongoose.connection.db;
  const productsCol = db.collection('products');

  // Count products with media
  const withMedia = await productsCol.countDocuments({
    $or: [
      { 'media.images': { $exists: true, $ne: [] } },
      { 'media.videoUrl': { $exists: true, $ne: '' } },
    ]
  });
  console.log(`Products with media: ${withMedia}`);

  // Clear all media
  const result = await productsCol.updateMany(
    {},
    {
      $set: {
        'media.images': [],
        'media.videoUrl': '',
      }
    }
  );
  console.log(`Products updated: ${result.modifiedCount}`);

  await mongoose.disconnect();
  console.log('\nMongoDB: Done!\n');
} else {
  console.log('MongoDB URI not found, skipping...\n');
}

console.log('=== Cleanup Complete ===');
console.log('All images deleted from Cloudinary and cleared from products.');
console.log('You can now start fresh with new images in the Catalog Manager.');
process.exit(0);
