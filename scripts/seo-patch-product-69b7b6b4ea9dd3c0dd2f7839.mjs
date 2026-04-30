/**
 * One-off SEO data patch for a single product (by MongoDB ObjectId).
 * Run from project root: node scripts/seo-patch-product-69b7b6b4ea9dd3c0dd2f7839.mjs
 *
 * Env: MONGODB_URI is required (from the shell, e.g. node --env-file=vercel.env, or from .env.local).
 * If MONGODB_URI is already set at runtime, .env.local is not loaded (avoids prod/staging mix-ups).
 * dotenv uses override:false so other runtime vars (e.g. APP_DATA_MODE) are never overwritten by a file.
 */
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const PRODUCT_ID = '69b7b6b4ea9dd3c0dd2f7839';

const SEO = {
  metaTitle:
    'שולחן עבודה מנירוסטה מקצועי 2 שכבות | ישירות מהמפעל במחיר סיטונאי',
  metaDescription:
    'שולחן נירוסטה מקצועי 2 שכבות באיכות גבוהה למטבח, מסעדות ועסקים. ייבוא ישיר מהמפעל במחיר נמוך במיוחד. משלוח מהיר והצטרפות לרכישה קבוצתית.',
  h1: 'שולחן עבודה מנירוסטה 2 שכבות – איכות מקצועית במחיר מפעל',
};

const FULL_DESCRIPTION = `שולחן עבודה מנירוסטה איכותי עם 2 שכבות חזקות ועמידות, מתאים למטבחים מקצועיים, מסעדות, קייטרינגים ועסקים בתחום המזון.
השולחן עשוי נירוסטה ברמה גבוהה, עמיד בפני חלודה, קל לניקוי ומתאים לשימוש יומיומי אינטנסיבי.

המוצר מיובא ישירות מהמפעל במסגרת רכישה קבוצתית, מה שמאפשר לקבל מחיר סיטונאי נמוך במיוחד ללא פערי תיווך.
ככל שמצטרפים יותר — המחיר יורד.

✔ מתאים למסעדות, מטבחים מוסדיים ועסקים
✔ נירוסטה איכותית – עמידות לאורך שנים
✔ ניקוי קל ומהיר
✔ יציבות גבוהה גם בעומסים
✔ פתרון מושלם לעבודה מקצועית`;

const IMAGE_ALTS = [
  'שולחן עבודה מנירוסטה 2 שכבות מקצועי',
  'שולחן נירוסטה מקצועי למטבח עם 2 שכבות',
  'שולחן עבודה מנירוסטה איכותי לעסק',
];

// Prefer MONGODB_URI from the process environment (e.g. node --env-file=.env.production).
// Do not load .env.local when URI is already set — avoids overriding injected env.
const dotenvOpts = { override: false };
if (!process.env.MONGODB_URI?.trim()) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, ...dotenvOpts });
  } else {
    dotenv.config(dotenvOpts);
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db();
    const col = db.collection('products');
    const _id = new ObjectId(PRODUCT_ID);
    const doc = await col.findOne({ _id });
    if (!doc) {
      console.error('Product not found:', PRODUCT_ID);
      process.exit(1);
    }

    const prevSeo = doc.seo && typeof doc.seo === 'object' ? doc.seo : {};
    const images = Array.isArray(doc.media?.images) ? doc.media.images : [];
    const newImages = images.map((img, i) => ({
      ...img,
      alt: IMAGE_ALTS[i % IMAGE_ALTS.length],
    }));

    const update = {
      fullDescription: FULL_DESCRIPTION,
      seo: {
        ...prevSeo,
        metaTitle: SEO.metaTitle,
        metaDescription: SEO.metaDescription,
        h1: SEO.h1,
      },
    };

    if (newImages.length) {
      update['media.images'] = newImages;
    }

    const res = await col.updateOne({ _id }, { $set: update });
    console.log('matched:', res.matchedCount, 'modified:', res.modifiedCount);
    console.log('Updated product', PRODUCT_ID);
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
