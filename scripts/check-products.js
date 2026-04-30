const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || 'vipo',
    });

    console.log('✅ Connected to MongoDB');

    const Product = require('../models/Product');
    const ProductModel = Product?.default || Product;

    const products = await ProductModel.find({}).select('name media');

    console.log(`\n📦 Total products: ${products.length}\n`);

    products.forEach((p, i) => {
      const images = Array.isArray(p?.media?.images) ? p.media.images : [];
      const primaryUrl = images[0]?.url || '';
      const videoUrl = typeof p?.media?.videoUrl === 'string' ? p.media.videoUrl : '';

      console.log(`${i + 1}. ${p.name}`);
      console.log(`   📸 Image: ${images.length ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   🖼️  Images array: ${images.length} images`);
      console.log(`   🎥 Video: ${videoUrl ? 'YES ✅' : 'NO ❌'}`);
      if (primaryUrl) {
        console.log(`   URL: ${primaryUrl.substring(0, 60)}...`);
      }
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

checkProducts();
