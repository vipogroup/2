import { NextResponse } from 'next/server';
import { getCloudinary } from '@/lib/cloudinary';
import { requireAdminApi } from '@/lib/auth/server';
import { isSuperAdminUser } from '@/lib/superAdmins';

export const dynamic = 'force-dynamic';

/**
 * POST /api/catalog-manager/delete-media
 * Deletes a single image/video from Cloudinary by URL.
 * Super Admin only.
 */
async function POSTHandler(request) {
  try {
    const admin = await requireAdminApi(request);
    if (!isSuperAdminUser(admin)) {
      return NextResponse.json({ error: 'Super Admin only' }, { status: 403 });
    }

    const { url } = await request.json();
    if (!url || !url.includes('cloudinary')) {
      return NextResponse.json({ error: 'Invalid Cloudinary URL' }, { status: 400 });
    }

    const hasConfig = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (!hasConfig) {
      return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 });
    }

    // Extract public_id from URL
    const publicId = extractPublicIdFromUrl(url);
    if (!publicId) {
      return NextResponse.json({ error: 'Could not extract public ID from URL' }, { status: 400 });
    }

    const cloudinary = getCloudinary();
    
    // Try image first, then video
    let deleted = false;
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      if (result.result === 'ok') deleted = true;
    } catch (e) {
      // ignore
    }

    if (!deleted) {
      try {
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
        if (result.result === 'ok') deleted = true;
      } catch (e) {
        // ignore
      }
    }

    return NextResponse.json({ success: true, deleted, publicId });
  } catch (err) {
    console.error('delete-media error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function extractPublicIdFromUrl(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('res.cloudinary.com')) return '';
    const segments = parsed.pathname.split('/').filter(Boolean);
    const uploadIndex = segments.indexOf('upload');
    if (uploadIndex === -1) return '';
    let after = segments.slice(uploadIndex + 1);
    const versionIndex = after.findIndex((s) => /^v\d+$/.test(s));
    if (versionIndex !== -1) after = after.slice(versionIndex + 1);
    if (!after.length) return '';
    const lastIndex = after.length - 1;
    after[lastIndex] = after[lastIndex].replace(/\.[a-z0-9]+$/i, '');
    return after.join('/');
  } catch {
    return '';
  }
}

export const POST = POSTHandler;
