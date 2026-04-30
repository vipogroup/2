// Script to add images and videos to all products
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Sample images from Unsplash (free to use)
const sampleImages = [
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', // Headphones
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800', // Watch
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800', // Sunglasses
  'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800', // Sneakers
  'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800', // Camera
  'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800', // Perfume
  'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800', // Laptop
  'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800', // Smart watch
  'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800', // Backpack
  'https://images.unsplash.com/photo-1572635196184-84e35138cf62?w=800', // Bag
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800', // Coding
  'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800', // Phone
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', // Red shoes
  'https://images.unsplash.com/photo-1572635196243-4dd75fbdbd7f?w=800', // White shoes
  'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800', // Speaker
  'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=800', // Keyboard
  'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800', // Mouse
  'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800', // Laptop
  'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800', // Earbuds
  'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800', // Smartwatch
];

// Sample YouTube video IDs (product demos)
const sampleVideos = [
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  'https://www.youtube.com/embed/jNQXAC9IVRw',
  'https://www.youtube.com/embed/9bZkp7q19f0',
  'https://www.youtube.com/embed/kJQP7kiw5Fk',
  'https://www.youtube.com/embed/tgbNymZ7vqY',
];

const buildMediaImages = (images = []) =>
  images
    .filter(Boolean)
    .map((url, index) => ({
      url,
      alt: '',
      position: index,
      publicId: '',
    }));

async function addImagesToProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || 'vipo',
    });

    console.log('✅ Connected to MongoDB');

    const Product = require('../models/Product');
    const ProductModel = Product?.default || Product;

    const products = await ProductModel.find({});
    console.log(`📦 Found ${products.length} products`);

    let updated = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      // Select random image
      const randomImage = sampleImages[i % sampleImages.length];

      // Select random video
      const randomVideo = sampleVideos[i % sampleVideos.length];

      // Create array of 3 images (main + 2 variations)
      const imageIndex = i % sampleImages.length;
      const images = [
        sampleImages[imageIndex],
        sampleImages[(imageIndex + 1) % sampleImages.length],
        sampleImages[(imageIndex + 2) % sampleImages.length],
      ];

      // Update product
      await ProductModel.findByIdAndUpdate(product._id, {
        $set: {
          media: {
            images: buildMediaImages(images),
            videoUrl: randomVideo,
          },
        },
      });

      updated++;
      console.log(`✅ Updated ${product.name} (${updated}/${products.length})`);
    }

    console.log(`\n🎉 Successfully updated ${updated} products with images and videos!`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

addImagesToProducts();
