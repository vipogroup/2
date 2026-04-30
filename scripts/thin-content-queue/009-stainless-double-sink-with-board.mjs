/**
 * תור תוכן דל — שלב 9: כיור כפול/יחיד מנירוסטה עם משטח
 *
 * הרצה: node scripts/thin-content-queue/009-stainless-double-sink-with-board.mjs
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

const CATEGORY = 'כיור כפול/יחיד מנירוסטה עם משטח';

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
    return `<p><strong>מכולה משותפת:</strong> המוצר נרכש במסגרת מכולת יבוא משותפת — מחיר ליחידה לרוב אטרקטיבי יותר. לוחות זמנים ואספקה תלויים בהתמלאות המכולה ובשחרור בנמל.</p>`;
  }
  if (mode === 'group') {
    return `<p><strong>רכישה קבוצתית:</strong> ההזמנה במסגרת קבוצה עם כללי סגירה; התקדמות והמחיר עשויים להתעדכן — עקבו בעמוד המוצר.</p>`;
  }
  return `<p><strong>משלוח מיידי מהמלאי:</strong> אספקה לפי זמינות במלאי; מתאים כשצריכים כיור עם משטח ללא המתנה למכולה או לקבוצה.</p>`;
}

function sizeHint(dims) {
  if (!dims) return 'בדקו התאמה לנקודת ניקוז, לברזים ולרוחב המשטח מול הקיר.';
  const w = parseInt(dims.split('×')[0], 10);
  if (Number.isFinite(w) && w <= 1200) return 'משטח עבודה בינוני — מתאים למטבחים קטנים ובינוניים עם שטיפה עמוסה.';
  if (Number.isFinite(w) && w <= 1500) return 'משטח נרחב — נוח לחלוקה בין כיור, ייבוש ועבודה על המשטח.';
  return 'משטח רחב במיוחד — למטבחים מוסדיים ולקווי שטיפה עם נפח עבודה גבוה.';
}

function buildPatch(dims, mode) {
  const modeHe = modeLabel(mode);

  const description = `כיור כפול או יחיד מנירוסטה עם משטח עבודה משולב, במידות ${dims || 'לפי הדגם'} ס״מ — ${modeHe}. פתרון אחד לשטיפה ולמשטח הכנה; ${sizeHint(dims)}`;

  const fullDescription = `<p>כיור מנירוסטה עם משטח עבודה משולב מאפשר לרכז שטיפה, ייבוש קצר והכנה באותה יחידה — חוסך התאמות בין כיור נפרד לשולחן ומפשט את הניקוי סביב אזור הצנרת. המבנה מתאים למטבחים מסחריים הדורשים היגיינה גבוהה וזרימת עבודה רציפה. מידות הדגם: <strong>${dims || 'לפי המפרט'}</strong> ס״מ — ${sizeHint(dims)}</p>
${modeIntroParagraph(mode)}
<p>בתכנון יש לוודא התאמה לנקודת ניקוז, לסיפון ולברזים (מרכז או צדדי), ולרוחב המשטח מול ארונות ומסלולי הליכה. נירוסטה דורשת חומרי ניקוי מתאימים; יש להימנע מעומס יתר על המשטח ומחיתוך ישיר על הגימור. בכיור כפול ניתן לחלק בין שטיפה לשטיפה או בין סוגי כלים לפי נוהל המטבח.</p>
<p>ב־VIPO מוצגים מסלול הרכישה (${modeHe}) והמחיר; לשאלות על הובלה, חורי ברזים או חומר נירוסטה — פנו לשירות לפני ההזמנה.</p>
<p>במטבחים עמוסים מומלץ לקבוע נוהל ניקוי לכל משמרת למשטח ולמסגרת הכיור, ולוודא שסיפונים וצינורות נשארים נגישים לתחזוקה. רמת עמידות בפני מלח וחומציות תלויה בדירוג הנירוסטה — בקשו פירוט במפרט הספק.</p>`;

  const suitableFor = `מתאים למסעדות, בתי קפה, מטבחי הכנה ומטבחים מוסדיים — בכל מקום שבו נדרשים כיור עם משטח עבודה צמוד לשטיפה אינטנסיבית. ${sizeHint(dims)}`;

  const whyChooseUs = `יחידה משולבת מקצרת התקנות ומפשטת ניקוי סביב הצנרת. בחירה בין ${modeHe} מאפשרת לאזן מחיר ולוח זמנים; מכולה וקבוצה לרוב משפרות מחיר ליחידה. מומלץ לתאם מראש מיקום ברז ומסנן מים מול הספק. פירוט ב־VIPO.`;

  const warranty =
    'אחריות ושירות לפי ספק ודגם. שמרו חשבונית, בדקו במסירה שלמות משטח וכיורים, והתקינו לפי הוראות היצרן. נזק מחומרי ניקוי לא מתאימים או מהתקנה שגויה עלול לא להיכלל באחריות.';

  const metaTitle = `כיור נירוסטה עם משטח ${dims || ''} ס״מ | ${modeHe}`.replace(/\s+/g, ' ').trim();
  const metaBase =
    mode === 'shared_container'
      ? `כיור נירוסטה עם משטח ${dims || ''} במכולה משותפת — מחיר ליחידה לפי התמלאות. למטבח מסחרי; בדקו ניקוז ב־VIPO.`
      : mode === 'group'
        ? `כיור נירוסטה עם משטח ${dims || ''} ברכישה קבוצתית. שטיפה ומשטח משולבים; וודאו מידות.`
        : `כיור נירוסטה עם משטח ${dims || ''} במשלוח מיידי מהמלאי — לפי זמינות. למטבח מקצועי; בדקו צנרת.`;

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
    if (!slug || !slug.includes('sink-double-sink-board')) {
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
