// scripts/fill-products-data.js
// Script to fill all products with complete data including real images

const buildMediaImages = (images = []) =>
  images
    .filter(Boolean)
    .map((url, index) => ({
      url,
      alt: '',
      position: index,
      publicId: '',
    }));

const buildMedia = (imageSrc, videoUrl = '') => ({
  images: buildMediaImages([imageSrc]),
  videoUrl,
});

const products = [
  {
    name: 'מקלדת גיימינג מכנית RGB Razer BlackWidow V3',
    description: 'מקלדת מכנית מקצועית עם תאורת RGB מלאה ומתגים ירוקים',
    fullDescription:
      'מקלדת גיימינג מכנית Razer BlackWidow V3 עם מתגים ירוקים מכניים, תאורת RGB Chroma מלאה עם 16.8 מיליון צבעים, משענת יד מגנטית נשלפת, גלגל מולטימדיה ומקשי מדיה ייעודיים. תומכת ב-Razer Synapse 3 לתכנות מקשים ומאקרו. עמידה במים ואבק ברמת IP54.',
    price: 449,
    originalPrice: 599,
    category: 'אביזרי מחשב',
    media: buildMedia('https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800'),
    inStock: true,
    stockCount: 15,
    rating: 4.8,
    reviews: 1247,
    purchaseType: 'regular',
    features: ['מתגים מכניים ירוקים', 'תאורת RGB Chroma', 'משענת יד מגנטית', 'עמידה במים IP54'],
    specs: {
      'סוג מתגים': 'Razer Green Mechanical',
      תאורה: 'RGB Chroma 16.8M צבעים',
      חיבור: 'USB Type-C',
      'אורך כבל': '1.8 מטר',
      משקל: '1.35 ק"ג',
      תאימות: 'Windows, Mac, Linux',
    },
    isBestseller: true,
  },
  {
    name: 'עכבר גיימינג Logitech G502 HERO',
    description: 'עכבר גיימינג מתקדם עם חיישן HERO 25K ו-11 כפתורים הניתנים לתכנות',
    fullDescription:
      'עכבר גיימינג Logitech G502 HERO עם חיישן אופטי HERO 25K ברזולוציה של עד 25,600 DPI, 11 כפתורים הניתנים לתכנות, מערכת משקולות מתכווננת, תאורת RGB LIGHTSYNC, ו-5 פרופילי זיכרון מובנים. עיצוב ארגונומי מתקדם עם אחיזה מושלמת.',
    price: 299,
    originalPrice: 399,
    category: 'אביזרי מחשב',
    media: buildMedia('https://images.unsplash.com/photo-1527814050087-3793815479db?w=800'),
    inStock: true,
    stockCount: 23,
    rating: 4.9,
    reviews: 2341,
    purchaseType: 'regular',
    features: [
      'חיישן HERO 25K DPI',
      '11 כפתורים ניתנים לתכנות',
      'משקולות מתכווננות',
      'תאורת RGB LIGHTSYNC',
    ],
    specs: {
      חיישן: 'HERO 25K Optical',
      רזולוציה: '100-25,600 DPI',
      'מהירות מעקב': '400+ IPS',
      תאורה: 'RGB LIGHTSYNC',
      כפתורים: '11 ניתנים לתכנות',
      משקל: '121 גרם (ללא כבל)',
    },
    isBestseller: true,
  },
  {
    name: 'אוזניות גיימינג HyperX Cloud II',
    description: 'אוזניות גיימינג מקצועיות עם סאונד 7.1 וירטואלי ומיקרופון מבטל רעשים',
    fullDescription:
      'אוזניות גיימינג HyperX Cloud II עם סאונד היקפי 7.1 וירטואלי, רמקולים 53mm, מיקרופון מבטל רעשים נשלף, כריות אוזן מעור זיכרון איכותי, ותאימות לכל הפלטפורמות. כוללות כרטיס קול USB עם בקרת עוצמה ומתג השתקה.',
    price: 349,
    originalPrice: 449,
    category: 'אודיו',
    media: buildMedia('https://images.unsplash.com/photo-1599669454699-248893623440?w=800'),
    inStock: true,
    stockCount: 18,
    rating: 4.7,
    reviews: 1876,
    purchaseType: 'regular',
    features: [
      'סאונד 7.1 וירטואלי',
      'רמקולים 53mm',
      'מיקרופון מבטל רעשים',
      'כריות זיכרון איכותיות',
    ],
    specs: {
      'סוג רמקולים': 'Neodymium 53mm',
      'תגובת תדר': '15Hz-25,000Hz',
      עכבה: '60 Ohms',
      מיקרופון: 'דו-כיווני מבטל רעשים',
      חיבור: 'USB + 3.5mm',
      משקל: '320 גרם',
    },
  },
  {
    name: 'מסך גיימינג ASUS ROG Swift 27" 165Hz',
    description: "מסך גיימינג 27 אינץ' QHD 165Hz עם G-SYNC ו-IPS",
    fullDescription:
      "מסך גיימינג ASUS ROG Swift 27 אינץ' ברזולוציית 2560x1440 (QHD), קצב רענון 165Hz, זמן תגובה 1ms, פאנל IPS עם 99% sRGB, תמיכה ב-NVIDIA G-SYNC, HDR10, ועיצוב ארגונומי עם תמיכה בהטיה, סיבוב והתאמת גובה.",
    price: 1899,
    originalPrice: 2399,
    category: 'מסכים',
    media: buildMedia('https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800'),
    inStock: true,
    stockCount: 8,
    rating: 4.9,
    reviews: 892,
    purchaseType: 'regular',
    features: ['QHD 2560x1440', '165Hz קצב רענון', 'G-SYNC תמיכה', 'פאנל IPS'],
    specs: {
      גודל: "27 אינץ'",
      רזולוציה: '2560x1440 (QHD)',
      'קצב רענון': '165Hz',
      'זמן תגובה': '1ms (GTG)',
      פאנל: 'IPS',
      'כיסוי צבעים': '99% sRGB',
    },
    isBestseller: true,
  },
  {
    name: 'כיסא גיימינג DXRacer Formula Series',
    description: 'כיסא גיימינג ארגונומי עם תמיכה מלאה בגב ומשענות מתכווננות',
    fullDescription:
      'כיסא גיימינג DXRacer Formula Series עם עיצוב ספורטיבי, ריפוד קצף בצפיפות גבוהה, משענת ראש ומותניים מתכווננות, משענות ידיים 4D, בסיס אלומיניום חזק, גלגלי PU שקטים, ותמיכה במשקל עד 100 ק"ג. מושלם לישיבה ממושכת.',
    price: 1299,
    originalPrice: 1699,
    category: 'ריהוט',
    media: buildMedia('https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=800'),
    inStock: true,
    stockCount: 12,
    rating: 4.6,
    reviews: 654,
    purchaseType: 'regular',
    features: ['עיצוב ארגונומי', 'משענות 4D', 'ריפוד קצף איכותי', 'בסיס אלומיניום'],
    specs: {
      'משקל מקסימלי': '100 ק"ג',
      'חומר ריפוד': 'PU Leather',
      'משענות ידיים': '4D מתכווננות',
      בסיס: 'אלומיניום',
      גלגלים: 'PU 60mm',
      'גובה מושב': '42-52 ס"מ',
    },
  },
  {
    name: 'מיקרופון USB Blue Yeti',
    description: 'מיקרופון USB מקצועי עם 4 דפוסי הקלטה ואיכות סטודיו',
    fullDescription:
      'מיקרופון USB Blue Yeti עם 3 קפסולות קונדנסר, 4 דפוסי הקלטה (Cardioid, Stereo, Omnidirectional, Bidirectional), בקרת עוצמה וכפתור השתקה, חיבור אוזניות 3.5mm לניטור ללא השהיה, ותמיכה בהקלטה ברזולוציית 16-bit/48kHz.',
    price: 549,
    originalPrice: 699,
    category: 'אודיו',
    media: buildMedia('https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800'),
    inStock: true,
    stockCount: 14,
    rating: 4.8,
    reviews: 1523,
    purchaseType: 'regular',
    features: ['3 קפסולות קונדנסר', '4 דפוסי הקלטה', 'ניטור ללא השהיה', 'איכות 16-bit/48kHz'],
    specs: {
      קפסולות: '3 קונדנסר',
      'דפוסי הקלטה': '4 (Cardioid, Stereo, Omni, Bi)',
      'תגובת תדר': '20Hz-20kHz',
      רזולוציה: '16-bit/48kHz',
      חיבור: 'USB',
      משקל: '550 גרם',
    },
  },
  {
    name: 'כרטיס מסך NVIDIA GeForce RTX 4070',
    description: 'כרטיס מסך גיימינג מתקדם עם ארכיטקטורת Ada Lovelace ו-12GB GDDR6X',
    fullDescription:
      'כרטיס מסך NVIDIA GeForce RTX 4070 עם ארכיטקטורת Ada Lovelace, 12GB GDDR6X, תמיכה ב-Ray Tracing דור 3, DLSS 3, 5888 CUDA Cores, קצב שעון עד 2.48GHz, ותמיכה ב-4K גיימינג. כולל מערכת קירור מתקדמת עם 3 מאווררים.',
    price: 2899,
    originalPrice: 3499,
    category: 'אביזרי מחשב',
    media: buildMedia('https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800'),
    inStock: true,
    stockCount: 6,
    rating: 4.9,
    reviews: 743,
    purchaseType: 'regular',
    features: ['12GB GDDR6X', 'Ray Tracing דור 3', 'DLSS 3', 'קירור 3 מאווררים'],
    specs: {
      זיכרון: '12GB GDDR6X',
      'CUDA Cores': '5888',
      'Boost Clock': '2.48 GHz',
      TDP: '200W',
      חיבורים: '3x DisplayPort 1.4a, 1x HDMI 2.1',
      אורך: '304mm',
    },
    isBestseller: true,
  },
  {
    name: 'SSD Samsung 980 PRO 1TB NVMe',
    description: 'כונן SSD NVMe PCIe 4.0 במהירויות קריאה עד 7,000 MB/s',
    fullDescription:
      'כונן SSD Samsung 980 PRO 1TB עם ממשק PCIe 4.0 x4, NVMe 1.3c, מהירויות קריאה עד 7,000 MB/s וכתיבה עד 5,000 MB/s, טכנולוגיית V-NAND 3-bit MLC, בקר Samsung Elpis, ואחריות של 5 שנים. מושלם לגיימינג ועבודה מקצועית.',
    price: 449,
    originalPrice: 599,
    category: 'אביזרי מחשב',
    media: buildMedia('https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800'),
    inStock: true,
    stockCount: 25,
    rating: 4.9,
    reviews: 2156,
    purchaseType: 'regular',
    features: ['PCIe 4.0 x4', '7,000 MB/s קריאה', '5,000 MB/s כתיבה', 'אחריות 5 שנים'],
    specs: {
      קיבולת: '1TB',
      ממשק: 'PCIe 4.0 x4, NVMe 1.3c',
      קריאה: 'עד 7,000 MB/s',
      כתיבה: 'עד 5,000 MB/s',
      טכנולוגיה: 'V-NAND 3-bit MLC',
      אחריות: '5 שנים',
    },
  },
  {
    name: 'רמקול Bluetooth JBL Charge 5',
    description: 'רמקול Bluetooth נייד עמיד במים עם 20 שעות סוללה',
    fullDescription:
      'רמקול Bluetooth JBL Charge 5 עם הספק 40W, סאונד סטריאו עוצמתי, עמידות IP67 למים ואבק, סוללה של 20 שעות, יציאת USB-C לטעינה מהירה, ואפשרות לטעינת מכשירים חיצוניים. כולל טכנולוגיית PartyBoost לחיבור מספר רמקולים.',
    price: 549,
    originalPrice: 699,
    category: 'אודיו',
    media: buildMedia('https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800'),
    inStock: true,
    stockCount: 31,
    rating: 4.7,
    reviews: 1342,
    purchaseType: 'regular',
    features: ['40W הספק', 'IP67 עמיד במים', '20 שעות סוללה', 'PartyBoost'],
    specs: {
      הספק: '40W RMS',
      Bluetooth: '5.1',
      סוללה: '7500mAh (20 שעות)',
      עמידות: 'IP67',
      טעינה: 'USB-C',
      משקל: '960 גרם',
    },
  },
  {
    name: 'מצלמת רשת Logitech C920 HD Pro',
    description: 'מצלמת רשת Full HD 1080p עם מיקרופונים סטריאו',
    fullDescription:
      'מצלמת רשת Logitech C920 HD Pro עם הקלטה ב-Full HD 1080p/30fps, עדשות זכוכית Carl Zeiss, תיקון תאורה אוטומטי HD, 2 מיקרופונים סטריאו מובנים, ותמיכה ב-H.264. תואמת ל-Zoom, Skype, Teams ועוד. כוללת קליפ אוניברסלי.',
    price: 349,
    originalPrice: 449,
    category: 'אביזרי מחשב',
    media: buildMedia('https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800'),
    inStock: true,
    stockCount: 19,
    rating: 4.6,
    reviews: 2876,
    purchaseType: 'regular',
    features: [
      'Full HD 1080p/30fps',
      'עדשות Carl Zeiss',
      '2 מיקרופונים סטריאו',
      'תיקון תאורה אוטומטי',
    ],
    specs: {
      רזולוציה: '1920x1080 (Full HD)',
      'קצב פריימים': '30 fps',
      עדשות: 'Carl Zeiss Glass',
      'שדה ראייה': '78 מעלות',
      מיקרופונים: '2 סטריאו',
      חיבור: 'USB-A',
    },
  },
];

console.log('\\n📦 מוצרים מוכנים לייבוא:');
console.log(`סה"כ ${products.length} מוצרים`);
console.log('\\n✅ כל מוצר כולל:');
console.log('  - שם מלא');
console.log('  - תיאור קצר ומלא');
console.log('  - מחיר ומחיר מקורי');
console.log('  - תמונה מ-Unsplash');
console.log('  - קטגוריה');
console.log('  - מלאי');
console.log('  - דירוג וביקורות');
console.log('  - 4 תכונות עיקריות');
console.log('  - 6 מפרטים טכניים');
console.log('  - סוג רכישה');
console.log('\\n🚀 להוספת המוצרים למערכת:');
console.log('  1. היכנס לדשבורד מנהל');
console.log('  2. לחץ על "הוסף מוצר חדש"');
console.log('  3. העתק את הפרטים מהקובץ הזה');
console.log('  4. שמור');
console.log('\\nאו השתמש ב-API:');
console.log('POST /api/products');
console.log(JSON.stringify(products[0], null, 2));

module.exports = products;
