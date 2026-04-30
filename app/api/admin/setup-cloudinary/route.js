import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import { getCloudinary } from '@/lib/cloudinary';
import { apiDebugLog } from '@/lib/apiDebugLog';

async function POSTHandler(req) {
  try {
    // Only admin can create upload preset
    await requireAdminApi(req);

    const cloudinary = getCloudinary();
    
    // Check if preset already exists
    try {
      const existingPresets = await cloudinary.api.upload_presets({ max_results: 100 });
      const presetExists = existingPresets.presets?.some(p => p.name === 'vipo_unsigned');
      
      if (presetExists) {
        return NextResponse.json({ 
          ok: true, 
          message: 'Upload preset already exists',
          preset: 'vipo_unsigned'
        });
      }
    } catch (e) {
      // If error checking presets, continue to create
      apiDebugLog('Could not check existing presets:', e.message);
    }

    // Create unsigned upload preset
    const result = await cloudinary.api.create_upload_preset({
      name: 'vipo_unsigned',
      unsigned: true,
      folder: 'vipo-products',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'avi', 'webm'],
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      // Video settings
      eager: [
        { format: 'mp4', video_codec: 'auto' }
      ],
      eager_async: true,
    });

    return NextResponse.json({ 
      ok: true, 
      message: 'Upload preset created successfully',
      preset: result.name 
    });

  } catch (error) {
    console.error('Setup Cloudinary error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to create upload preset' },
      { status: 500 }
    );
  }
}

async function GETHandler(req) {
  try {
    await requireAdminApi(req);

    const cloudinary = getCloudinary();
    
    // Check if preset exists
    try {
      const existingPresets = await cloudinary.api.upload_presets({ max_results: 100 });
      const preset = existingPresets.presets?.find(p => p.name === 'vipo_unsigned');
      
      if (preset) {
        return NextResponse.json({ 
          ok: true, 
          exists: true,
          preset: preset.name,
          settings: preset.settings
        });
      }
    } catch (e) {
      apiDebugLog('Could not check presets:', e.message);
    }

    return NextResponse.json({ 
      ok: true, 
      exists: false,
      message: 'Preset does not exist yet'
    });

  } catch (error) {
    console.error('Check Cloudinary preset error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

export const POST = withErrorLogging(POSTHandler);
export const GET = withErrorLogging(GETHandler);
