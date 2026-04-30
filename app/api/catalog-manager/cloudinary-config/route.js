import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await requireAdminApi(req);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;

    if (!cloudName) {
      return NextResponse.json(
        { error: 'Missing Cloudinary configuration' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      cloudName,
      uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'vipo_unsigned',
      folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'vipo-products',
    });
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('GET /api/catalog-manager/cloudinary-config error:', err);
    return NextResponse.json({ error: 'Failed to load Cloudinary configuration' }, { status: 500 });
  }
}
