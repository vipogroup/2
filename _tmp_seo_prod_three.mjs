/**
 * One-off: backup + SEO update for 3 products on Production DB.
 * Run: node --env-file=.env.prod.current _tmp_seo_prod_three.mjs
 * Do not commit this file.
 */
import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import https from 'https';

const SITE = 'https://www.vipo-group.com';
const uri = process.env.MONGODB_URI?.trim();
if (!uri) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

const BACKUP_DIR = path.resolve(
  process.cwd(),
  'backups',
  'seo-prod-snapshots',
  new Date().toISOString().slice(0, 10),
);

const PRODUCTS = [
  {
    id: '69b7b6beea9dd3c0dd2f79b8',
    seo: {
      metaTitle:
        'שולחן עבודה מנירוסטה 2 שכבות 200×80 | ישירות מהמפעל במחיר סיטונאי',
      metaDescription:
        'שולחן נירוסטה מקצועי במידה 200×80×90 ס״מ — 2 שכבות עמידות למטבחים תעשייתיים ומסעדות. רכישה קבוצתית מהמפעל, מחיר נמוך ככל שמצטרפים יותר, משלוח מהיר.',
      h1: 'שולחן עבודה מנירוסטה 2 שכבות 200×80×90 — עמידות מקצועית במחיר מפעל',
    },
    fullDescription: `שולחן עבודה מנירוסטה עם שתי שכבות חזקות במידה 200×80×90 ס״מ, מיועד למטבחים מקצועיים, מסעדות, קייטרינג ועסקי מזון שצריכים משטח עבודה יציב, נוח לניקוי ועמיד לאורך זמן.

השולחן מיובא במסגרת רכישה קבוצתית — בלי תיווך מיותר — כך שניתן להגיע למחיר סיטונאי אטרקטיבי. ככל שמצטרפים יותר רוכשים, המחיר יורד.

✔ נירוסטה איכותית — עמידות בפני שחיקה וחלודה
✔ שתי שכבות לארגון ציוד ועבודה נוחה
✔ ניקוי מהיר והיגיינה גבוהה בסביבת מזון
✔ מתאים לעומס יומיומי במטבח תעשייתי`,
    imageAlts: [
      'שולחן עבודה מנירוסטה בשתי שכבות במידה 200×80×90 — מבט קדמי על משטח העבודה',
      'שולחן עבודה מנירוסטה 2 שכבות — מבט צדדי על המבנה',
      'שולחן נירוסטה מקצועי — תקריב משטח עבודה עליון',
      'שולחן עבודה מנירוסטה — שתי שכבות לארגון ציוד',
      'שולחן עבודה מנירוסטה 200×80×90 — יציבות ועמידות למטבח תעשייתי',
    ],
  },
  {
    id: '69af01ce26aa03a91e977731',
    seo: {
      metaTitle: 'עגלת מטבח נירוסטה 700×1100×1200 | 4 מדפים למטבח תעשייתי',
      metaDescription:
        'עגלה נירוסטה למטבח תעשייתי במידה 700×1100×1200 — 4 מדפים לשינוע ושירות, עמידה ונוחה לניקוי. רכישה קבוצתית מהמפעל במחיר אטרקטיבי.',
      h1: 'עגלת מטבח מנירוסטה 700×1100×1200 — נפח אחסון גדול לשירות ושינוע',
    },
    fullDescription: `עגלת מטבח מנירוסטה עם ארבעה מדפים במידה 700×1100×1200 ס״מ, מתאימה למסעדות, מטבחים מוסדיים ומפעלי הכנה שבהם צריך לנוע בין תחנות, להעמיס כלים וחומרי גלם ולשמור על סדר והיגיינה.

המוצר נרכש במסגרת רכישה קבוצתית — מחיר משתפר ככל שיש יותר משתתפים.

✔ נירוסטה — ניקוי קל ועמידות לאורך זמן
✔ 4 קומות אחסון — ניצול גובה ושטח
✔ מתאימה לסביבת מזון עם עומסי עבודה
✔ פתרון פרקטי לשירות ולוגיסטיקה במטבח`,
    imageAlts: [
      'עגלת מטבח מנירוסטה עם ארבעה מדפים במידה 700×1100×1200 — מבט מלא על המבנה',
      'עגלת מטבח נירוסטה — מבט צדדי על ארבעת המדפים',
      'עגלה נירוסטה למטבח תעשייתי — תקריב גלגלים ומבנה',
      'עגלת מטבח עם 4 מדפים — ניצול גובה לאחסון',
      'עגלת מטבח מנירוסטה 700×1100×1200 — שימוש במטבח מוסדי',
    ],
  },
  {
    id: '69aef968e3076a3b11644187',
    seo: {
      metaTitle:
        'עגלת תבניות Pan Cart מנירוסטה 630×865×1700 | למאפיות ומטבח תעשייתי',
      metaDescription:
        'עגלה לתבניות אפייה (Pan Cart) מנירוסטה במידה 630×865×1700 — שינוע תבניות 60×40 בבטיחות וביעילות. רכישה קבוצתית, מחיר מפעל.',
      h1: 'עגלת תבניות מנירוסטה 630×865×1700 — פתרון מסודר למאפיות ומטבחים אינטנסיביים',
    },
    fullDescription: `עגלת תבניות (Pan Cart) מנירוסטה במידה 630×865×1700 ס״מ, מיועדת לסידור ושינוע תבניות אפייה בגודל נפוץ (למשל 60×40), במאפיות, מטבחי הכנה ומפעלי מזון עם קצב אפייה גבוה.

הרכישה במסגרת רכישה קבוצתית מאפשרת מחיר תחרותי בהשוואה לרכישה בודדת.

✔ נירוסטה — עמידות והיגיינה גבוהה
✔ סידור תבניות — פחות נזקים ויותר סדר בתנועה
✔ מתאימה לסביבות אפייה תעשייתיות
✔ מבנה יציב לעומסים חוזרים`,
    imageAlts: [
      'עגלת תבניות Pan Cart מנירוסטה 630×865×1700 — תאי אחסון לתבניות אפייה',
      'עגלת תבניות מנירוסטה — מבט צדדי על קומות האחסון',
      'Pan Cart נירוסטה — תקריב מדפי תבניות 60×40',
      'עגלת תבניות למאפייה — שינוע בטוח בין תחנות',
      'עגלת תבניות 630×865×1700 — עמידות לסביבת אפייה תעשייתית',
    ],
  },
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': 'VIPO-SEO-verify/1.0',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        },
        (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => resolve(d));
        },
      )
      .on('error', reject);
  });
}

async function fetchJson(url) {
  const t = await fetchText(url);
  return JSON.parse(t);
}

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function verifyLive(id, spec) {
  const api = await fetchJson(`${SITE}/api/products/${id}`);
  const bust = Date.now();
  const html = await fetchText(`${SITE}/products/${id}?_=${bust}`);

  const apiOk =
    api?.seo?.metaTitle === spec.seo.metaTitle &&
    api?.seo?.metaDescription === spec.seo.metaDescription &&
    api?.seo?.h1 === spec.seo.h1 &&
    api?.fullDescription === spec.fullDescription;

  const titleRe = new RegExp(
    `<title[^>]*>\\s*${escapeReg(spec.seo.metaTitle)}\\s*</title>`,
    'i',
  );
  const metaDescRe = new RegExp(
    `<meta[^>]+name=["']description["'][^>]+content=["']${escapeReg(spec.seo.metaDescription)}["']`,
    'i',
  );
  const metaDescRe2 = new RegExp(
    `content=["']${escapeReg(spec.seo.metaDescription)}["'][^>]+name=["']description["']`,
    'i',
  );

  const titleOk = titleRe.test(html);
  const metaOk = metaDescRe.test(html) || metaDescRe2.test(html);
  const h1Ok = html.includes(spec.seo.h1);

  const schemaOk =
    html.includes('"@type":"Product"') ||
    html.includes('"@type": "Product"') ||
    html.includes('application/ld+json');

  return { api, apiOk, titleOk, metaOk, h1Ok, schemaOk, htmlLen: html.length };
}

async function main() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const client = new MongoClient(uri);
  await client.connect();
  const results = [];

  try {
    const db = client.db();
    const col = db.collection('products');

    for (const spec of PRODUCTS) {
      const _id = new ObjectId(spec.id);
      const doc = await col.findOne({ _id });
      if (!doc) {
        throw new Error(`Product not found: ${spec.id}`);
      }

      const backupPath = path.join(BACKUP_DIR, `before-${spec.id}.json`);
      const backupPayload = {
        _id: doc._id.toString(),
        capturedAt: new Date().toISOString(),
        seo: doc.seo,
        fullDescription: doc.fullDescription,
        media: doc.media,
      };
      fs.writeFileSync(backupPath, JSON.stringify(backupPayload, null, 2), 'utf8');
      console.log('backup written', backupPath);

      const prevSeo = doc.seo && typeof doc.seo === 'object' ? doc.seo : {};
      const images = Array.isArray(doc.media?.images) ? doc.media.images : [];
      const newImages = images.map((img, i) => ({
        ...img,
        alt: spec.imageAlts[i % spec.imageAlts.length],
      }));

      const update = {
        fullDescription: spec.fullDescription,
        seo: {
          ...prevSeo,
          ...spec.seo,
        },
      };
      if (newImages.length) {
        update['media.images'] = newImages;
      }

      const res = await col.updateOne({ _id }, { $set: update });
      console.log('update', spec.id, 'matched', res.matchedCount, 'modified', res.modifiedCount);

      await new Promise((r) => setTimeout(r, 2000));

      const v = await verifyLive(spec.id, spec);
      const imgs = v.api?.media?.images || [];
      const firstAltOk = imgs[0]?.alt === spec.imageAlts[0];

      results.push({
        id: spec.id,
        backup: true,
        dbUpdated: res.modifiedCount >= 1 || res.matchedCount >= 1,
        apiOk: v.apiOk && firstAltOk,
        titleOk: v.titleOk,
        metaOk: v.metaOk,
        h1Ok: v.h1Ok,
        schemaOk: v.schemaOk,
        detail: {
          apiOk: v.apiOk,
          firstAltOk,
          htmlLen: v.htmlLen,
        },
      });

      const allPass =
        v.apiOk &&
        firstAltOk &&
        v.titleOk &&
        v.metaOk &&
        v.h1Ok &&
        v.schemaOk;
      if (!allPass) {
        console.error('Verification failed for', spec.id, results[results.length - 1]);
        process.exitCode = 1;
        break;
      }
      console.log('verified OK', spec.id);
    }

    console.log(JSON.stringify(results, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
