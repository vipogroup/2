// Create sample products with images and videos
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const buildMediaImages = (images = []) =>
  images
    .filter(Boolean)
    .map((url, index) => ({
      url,
      alt: '',
      position: index,
      publicId: '',
    }));

const sampleProducts = [
  {
    name: 'אוזניות Bluetooth אלחוטיות',
    description: 'אוזניות אלחוטיות עם סאונד איכותי וביטול רעשים',
    fullDescription:
      'אוזניות Bluetooth מתקדמות עם טכנולוגיית ביטול רעשים אקטיבי, סוללה ל-30 שעות, וחיבור מהיר לכל המכשירים.',
    price: 299,
    originalPrice: 399,
    category: 'אלקטרוניקה',
    media: {
      images: buildMediaImages([
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800',
        'https://images.unsplash.com/photo-1545127398-14699f92334b?w=800',
      ]),
      videoUrl: 'https://www.youtube.com/embed/jNQXAC9IVRw',
    },
    inStock: true,
    stockCount: 50,
    rating: 4.5,
    reviews: 234,
    features: ['ביטול רעשים', '30 שעות סוללה', 'Bluetooth 5.0', 'עמיד למים'],
    specs: {
      סוג: 'Over-ear',
      חיבור: 'Bluetooth 5.0',
      סוללה: '30 שעות',
      טעינה: 'USB-C',
      משקל: '250 גרם',
      צבעים: 'שחור, לבן, כחול',
    },
  },
  {
    name: 'שעון חכם ספורט',
    description: 'שעון חכם עם מעקב כושר ובריאות מתקדם',
    fullDescription:
      'שעון חכם עם מסך AMOLED, מעקב דופק, GPS מובנה, עמידות למים 50 מטר, וסוללה ל-7 ימים.',
    price: 599,
    originalPrice: 799,
    category: 'אביזרים',
    media: {
      images: buildMediaImages([
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800',
        'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800',
      ]),
      videoUrl: 'https://www.youtube.com/embed/9bZkp7q19f0',
    },
    inStock: true,
    stockCount: 30,
    rating: 4.7,
    reviews: 156,
    features: ['מסך AMOLED', 'GPS מובנה', 'עמיד למים', '7 ימי סוללה'],
    specs: {
      מסך: "1.4 אינץ' AMOLED",
      GPS: 'כן',
      עמידות: '50 מטר',
      סוללה: '7 ימים',
      חיישנים: 'דופק, חמצן, לחץ דם',
      תאימות: 'iOS, Android',
    },
  },
  {
    name: 'משקפי שמש מעצבים',
    description: 'משקפי שמש אופנתיים עם הגנת UV מלאה',
    fullDescription: 'משקפי שמש איכותיים עם עדשות פולארויד, הגנת UV400, ומסגרת קלה ונוחה.',
    price: 199,
    originalPrice: 299,
    category: 'אופנה',
    media: {
      images: buildMediaImages([
        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800',
        'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800',
        'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800',
      ]),
      videoUrl: 'https://www.youtube.com/embed/kJQP7kiw5Fk',
    },
    inStock: true,
    stockCount: 75,
    rating: 4.3,
    reviews: 89,
    features: ['עדשות פולארויד', 'הגנת UV400', 'מסגרת קלה', 'עיצוב מודרני'],
    specs: {
      עדשות: 'פולארויד',
      הגנה: 'UV400',
      חומר: 'אצטט איכותי',
      משקל: '25 גרם',
      צבעים: 'שחור, חום, זהב',
      'מגיע עם': 'נרתיק קשיח',
    },
  },
  {
    name: 'נעלי ריצה מקצועיות',
    description: 'נעלי ריצה עם סוליה מתקדמת וריפוד אוויר',
    fullDescription:
      'נעלי ריצה מקצועיות עם טכנולוגיית Air Cushion, סוליה נושמת, ותמיכה מושלמת לקשת כף הרגל.',
    price: 449,
    originalPrice: 599,
    category: 'ספורט',
    media: {
      images: buildMediaImages([
        'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800',
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
        'https://images.unsplash.com/photo-1572635196243-4dd75fbdbd7f?w=800',
      ]),
      videoUrl: 'https://www.youtube.com/embed/tgbNymZ7vqY',
    },
    inStock: true,
    stockCount: 40,
    rating: 4.8,
    reviews: 312,
    features: ['Air Cushion', 'סוליה נושמת', 'תמיכה לקשת', 'קלות משקל'],
    specs: {
      טכנולוגיה: 'Air Cushion',
      'חומר עליון': 'Mesh נושם',
      סוליה: 'גומי עמיד',
      משקל: '280 גרם',
      מידות: '36-46',
      צבעים: 'שחור, לבן, אפור, כחול',
    },
  },
  {
    name: 'מצלמה דיגיטלית מתקדמת',
    description: 'מצלמה דיגיטלית 24MP עם וידאו 4K',
    fullDescription:
      'מצלמה דיגיטלית מקצועית עם חיישן 24 מגה-פיקסל, צילום וידאו 4K, מסך מגע מתהפך, ו-WiFi מובנה.',
    price: 2499,
    originalPrice: 3299,
    category: 'אלקטרוניקה',
    media: {
      images: buildMediaImages([
        'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800',
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800',
        'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800',
      ]),
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    },
    inStock: true,
    stockCount: 15,
    rating: 4.9,
    reviews: 67,
    features: ['24MP חיישן', 'וידאו 4K', 'WiFi מובנה', 'מסך מגע'],
    specs: {
      חיישן: '24.2 MP CMOS',
      וידאו: '4K 30fps',
      מסך: "3 אינץ' מגע מתהפך",
      ISO: '100-25600',
      WiFi: 'כן',
      סוללה: '1200 תמונות',
    },
  },
];

async function createProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || 'vipo',
    });

    console.log('✅ Connected to MongoDB');

    const Product = require('../models/Product');
    const ProductModel = Product?.default || Product;

    // Clear existing products
    await ProductModel.deleteMany({});
    console.log('🗑️  Cleared existing products');

    // Insert new products
    const result = await ProductModel.insertMany(sampleProducts);
    console.log(`✅ Created ${result.length} products with images and videos!`);

    // Display summary
    console.log('\n📦 Products created:');
    result.forEach((p, i) => {
      const preview = p?.media?.images?.[0]?.url || '';
      const videoUrl = p?.media?.videoUrl || '';
      console.log(`${i + 1}. ${p.name}`);
      if (preview) {
        console.log(`   📸 Image: ${preview.substring(0, 50)}...`);
      }
      if (videoUrl) {
        console.log(`   🎥 Video: ${videoUrl}`);
      }
      console.log(`   💰 Price: ₪${p.price}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

createProducts();
