/**
 * תור תוכן דל — שלב 6: "שולחן עבודה מנירוסטה 3 שכבות" (middle shelf — slug middle-shelf-3l)
 *
 * הרצה: node scripts/thin-content-queue/006-stainless-tables-3-layer.mjs
 */
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const dotenvOpts = { override: false };
if (!process.env.MONGODB_URI?.trim()) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, ...dotenvOpts });
  else dotenv.config(dotenvOpts);
}

const CATEGORY = 'שולחן עבודה מנירוסטה 3 שכבות';

function modeFromSlug(slug) {
  const s = String(slug || '');
  if (s.endsWith('-sc')) return 'shared_container';
  if (s.endsWith('-group')) return 'group';
  return 'immediate';
}

function dimsFromName(name) {
  const m = String(name || '').match(/(\d+)\s*[×x]\s*(\d+)\s*[×x]\s*(\d+)/i);
  if (m) return `${m[1]}×${m[2]}×${m[3]}`;
  return '';
}

function modeLabel(mode) {
  if (mode === 'shared_container') return 'מכולה משותפת';
  if (mode === 'group') return 'רכישה קבוצתית';
  return 'משלוח מיידי מהמלאי';
}

function modeIntroParagraph(mode) {
  if (mode === 'shared_container') {
    return `<p><strong>מכולה משותפת:</strong> השולחן נרכש במסגרת מכולת יבוא משותפת — מחיר ליחידה לרוב אטרקטיבי יותר. לוחות זמנים, מחיר סופי ואספקה תלויים בהתמלאות המכולה ובשחרור בנמל; לרוב האספקה ארוכה יותר מרכישה מיידית מהמלאי.</p>`;
  }
  if (mode === 'group') {
    return `<p><strong>רכישה קבוצתית:</strong> ההזמנה במסגרת קבוצה עם כללי סגירה. התקדמות והמחיר עשויים להתעדכן — עקבו בעמוד המוצר ואשרו מול השירות לפני סגירה.</p>`;
  }
  return `<p><strong>משלוח מיידי מהמלאי:</strong> אספקה לפי זמינות במלאי; מתאים כשצריכים שולחן ללא המתנה למכולה או לקבוצה. וודאו מול הנציגות מועד משלוח והובלה.</p>`;
}

function sizeHint(dims) {
  if (!dims) return 'בדקו התאמה למשטח, לצנרת ולרוחב מעבר במטבח.';
  const [L, W] = dims.split('×').map((x) => parseInt(x, 10));
  const area = Number.isFinite(L) && Number.isFinite(W) ? (L * W) / 100 : 0;
  if (area && area < 70) return 'משטח עליון קומפקטי — מתאים למטבחים צרים או כתוספת לעמדה קיימת.';
  if (area && area < 120) return 'פריסה בינונית — מתאימה למטבחי מסעדות קטנים ובינוניים.';
  if (area && area < 200) return 'שטח עבודה נרחב — לעמדות הכנה עמוסות.';
  return 'משטח רחב במיוחד — למטבחים מוסדיים ותעשייתיים עם נפח עבודה גבוה.';
}

function buildPatch(dims, mode) {
  const modeHe = modeLabel(mode);

  const description = `שולחן עבודה מנירוסטה בשלוש שכבות (כולל מדף ביניים) במידות ${dims || 'לפי הדגם'} ס״מ — ${modeHe}. משטח עליון, מדף אמצע ומדף תחתון לארגון ציוד; ${sizeHint(dims)}`;

  const fullDescription = `<p>שולחן עבודה מנירוסטה בשלוש שכבות נועד למטבחים שבהם נדרשת הפרדה ברורה בין משטח עבודה פעיל, אזור אחסון ביניים ומדף תחתון לכבדות או לכלים גדולים. המדף האמצעי מסייע לחלק את הציוד לפי תדירות שימוש ולשמור על זרימת עבודה מסודרת. מידות הדגם: <strong>${dims || 'לפי המפרט'}</strong> ס״מ — ${sizeHint(dims)}</p>
${modeIntroParagraph(mode)}
<p>שלוש שכבות מגבירות את נפח האחסון האנכי ללא הרחבת רוחב המשטח, ולכן מתאימות למטבחים עם תקרה גבוהה יחסית וללא מגבלת גובה קריטית מעל המשטח. ניקוי נירוסטה צריך להיעשות בחומרים מתאימים; יש להימנע מעומס יתר על המדפים ולכוון התקנה ישרה ליציבות.</p>
<p>חומר הנירוסטה (למשל 304 מול 201) משפיע על עמידות בסביבה מלוחה; בקשו פירוט במפרט. ב־VIPO מוצגים מסלול הרכישה (${modeHe}) והמחיר — לשאלות על הובלה והרכבה פנו לשירות.</p>
<p>בשימוש יומיומי מומלץ לקבוע נוהל ניקוי לכל שכבה: משטח עליון אחרי כל משמרת מרכזית, מדף ביניים לפי הצטברות, ומדף תחתון לפי סיכון ללכלוך. רגליים מתכווננות או פלטת בסיס יציבה מפחיתות רטט ומונעות עקמומיות שמקשות על עבודה מדויקת.</p>`;

  const suitableFor = `מתאים למסעדות, מטבחי הכנה, מטבחים מוסדיים ותעשייתיים — בכל מקום שבו נדרשים משטח עבודה עם שתי רמות אחסון נוספות מתחת. ${sizeHint(dims)}`;

  const whyChooseUs = `שלוש שכבות מקסמות שימוש בגובה: עבודה למעלה, אחסון מדורג באמצע ולמטה. בחירה בין ${modeHe} מאפשרת לאזן מחיר ולוח זמנים; מכולה וקבוצה לרוב משפרות מחיר ליחידה. פירוט בעמוד המוצר ב־VIPO.`;

  const warranty =
    'אחריות ושירות לפי ספק ודגם. שמרו חשבונית, בדקו את המוצר במסירה (יישור, רגליים, שריטות תעשייתיות קלות), והתקינו לפי הוראות היצרן. עומס יתר על מדפי הביניים או התחתון עלול לפגוע ביציבות ובאחריות.';

  const metaTitle = `שולחן עבודה נירוסטה 3 שכבות ${dims || ''} ס״מ | ${modeHe}`.replace(/\s+/g, ' ').trim();
  const metaBase =
    mode === 'shared_container'
      ? `שולחן עבודה נירוסטה 3 שכבות ${dims || ''} במכולה משותפת — מחיר ליחידה לפי התמלאות. מדף ביניים + תחתון; בדקו אספקה ב־VIPO.`
      : mode === 'group'
        ? `שולחן עבודה נירוסטה 3 שכבות ${dims || ''} ברכישה קבוצתית — הצטרפות לקבוצה. משטח ושני מדפים; וודאו מידות.`
        : `שולחן עבודה נירוסטה 3 שכבות ${dims || ''} במשלוח מיידי מהמלאי — לפי זמינות. למטבח מקצועי; בדקו הובלה.`;

  return {
    description,
    fullDescription,
    suitableFor,
    whyChooseUs,
    warranty,
    faq: '',
    seo: {
      metaTitle: metaTitle.slice(0, 70),
      metaDescription: metaBase.slice(0, 160),
    },
  };
}

(async () => {
  const uri = process.env.MONGODB_URI?.trim();
  const dbName = process.env.MONGODB_DB || 'vipo';
  if (!uri) {
    console.error('חסר MONGODB_URI');
    process.exit(1);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const col = client.db(dbName).collection('products');

  const products = await col.find({ category: CATEGORY }).project({ name: 1, seo: 1 }).toArray();
  let updated = 0;
  let skipped = 0;

  for (const p of products) {
    const slug = p.seo?.slug || '';
    if (!slug || !slug.includes('middle-shelf-3l')) {
      skipped += 1;
      continue;
    }
    const patch = buildPatch(dimsFromName(p.name), modeFromSlug(slug));
    const res = await col.updateOne(
      { _id: p._id },
      {
        $set: {
          description: patch.description,
          fullDescription: patch.fullDescription,
          suitableFor: patch.suitableFor,
          whyChooseUs: patch.whyChooseUs,
          warranty: patch.warranty,
          faq: patch.faq,
          'seo.metaTitle': patch.seo.metaTitle,
          'seo.metaDescription': patch.seo.metaDescription,
        },
      },
    );
    if (res.modifiedCount) updated += 1;
  }

  console.log(JSON.stringify({ total: products.length, updated, skipped }, null, 2));
  await client.close();
})().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
