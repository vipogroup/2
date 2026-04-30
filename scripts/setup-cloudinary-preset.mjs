import { config } from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

// Load environment variables from .env.production
config({ path: '.env.production' });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.replace(/"/g, '').trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.replace(/"/g, '').trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.replace(/"/g, '').trim(),
  secure: true,
});

async function setupPreset() {
  console.log('🔧 Setting up Cloudinary Upload Preset...');
  console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);

  try {
    // Delete existing preset first (to update settings)
    try {
      await cloudinary.api.delete_upload_preset('vipo_unsigned');
      console.log('🗑️ Deleted old preset');
    } catch (e) {
      console.log('ℹ️ No existing preset to delete');
    }

    // Create unsigned upload preset
    const result = await cloudinary.api.create_upload_preset({
      name: 'vipo_unsigned',
      unsigned: true,
      folder: 'vipo-products',
      allowed_formats: 'jpg,jpeg,png,webp,gif,mp4,mov,avi,webm,mkv',
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });

    console.log('✅ Upload preset created successfully!');
    console.log('Preset name:', result.name);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupPreset();
