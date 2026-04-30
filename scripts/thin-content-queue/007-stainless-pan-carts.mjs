/**
 * תור תוכן דל — שלב 7: "עגלת תבניות מנירוסטה" (גסטרונום / GN)
 *
 * הרצה: node scripts/thin-content-queue/007-stainless-pan-carts.mjs
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

const CATEGORY = 'עגלת תבניות מנירוסטה';

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

/** pan-a / pan-b / pan-c מתוך slug */
function panSeriesFromSlug(slug) {
  const s = String(slug || '');
  if (s.includes('-pan-a-')) return 'a';
  if (s.includes('-pan-b-')) return 'b';
  if (s.includes('-pan-c-')) return 'c';
  return '';
}

function seriesHint(series) {
  if (series === 'a') return 'סדרת דגמים המתאימה לסט תבניות גדול יחסית — בדקו במפרט את כמות התבניות והמידות התואמות ל-GN.';
  if (series === 'b') return 'סדרה קומפקטית יותר — מתאימה למסדרונות צרים או לעמדות עם מגבלת רוחב.';
  if (series === 'c') return 'סדרה נפוצה במטבחים מסחריים — שילוב נפח וניידות; וודאו התאמה למספר תבניות שבשימוש.';
  return 'בדקו במפרט הדגם כמה תבניות GN נתמכות ומה מימדי התאמה.';
}

function modeLabel(mode) {
  if (mode === 'shared_container') return 'מכולה משותפת';
  if (mode === 'group') return 'רכישה קבוצתית';
  return 'משלוח מיידי מהמלאי';
}

function modeIntroParagraph(mode) {
  if (mode === 'shared_container') {
    return `<p><strong>מכולה משותפת:</strong> העגלה נרכשת במסגרת מכולת יבוא משותפת — מחיר ליחידה לרוב אטרקטיבי יותר. לוחות זמנים ואספקה תלויים בהתמלאות המכולה ובשחרור בנמל.</p>`;
  }
  if (mode === 'group') {
    return `<p><strong>רכישה קבוצתית:</strong> ההזמנה במסגרת קבוצה עם כללי סגירה; התקדמות והמחיר עשויים להתעדכן — עקבו בעמוד המוצר.</p>`;
  }
  return `<p><strong>משלוח מיידי מהמלאי:</strong> אספקה לפי זמינות במלאי; מתאים כשצריכים עגלה ללא המתנה למכולה או לקבוצה.</p>`;
}

function buildPatch(dims, mode, series) {
  const modeHe = modeLabel(mode);
  const sh = seriesHint(series);

  const description = `עגלת תבניות מנירוסטה במידות ${dims || 'לפי הדגם'} ס״מ — ${modeHe}. לניידות תבניות גסטרון (GN) בין עמדות קירור והכנה; ${sh}`;

  const fullDescription = `<p>עגלת תבניות מנירוסטה משמשת להעברת תבניות גסטרון בין מקרר, עמדת הכנה ונקודת הגשה — תוך שמירה על היגיינה ועל סדר במסדרון המטבח. המבנה מנירוסטה קל לניקוי יחסית ומתאים לסביבת מזון מסחרית. מידות הדגם: <strong>${dims || 'לפי המפרט'}</strong> ס״מ. ${sh}</p>
${modeIntroParagraph(mode)}
<p>מומלץ לוודא שהרוחב והגובה מתאימים לפתחי מקרר ולמסלולי תנועה, שהגלגלים (כולל ברקס אם קיים) תקינים, ושהעומס על המדפים עומד בתחום היצרן. אל עומס יתר על תבניות חמות ללא צירים יציבים. ניקוי שוטף אחרי משמרת מפחית הצטברות לכלוך ושומנים.</p>
<p>ב־VIPO מוצגים מסלול הרכישה (${modeHe}) והמחיר; לשאלות על תאימות תבניות, הובלה או הרכבה — פנו לשירות לפני ההזמנה.</p>
<p>במטבח מוסדי חשוב לתאם בין עגלת התבניות לתהליך HACCP: הפרדה בין תבניות חמות לקרות, ניקוי תדיר של הידיות והמסגרת, ומניעת חיכוך בין תבניות שחושפות קצוות חדים. אחסון לילי של העגלה במקום יבש מאריך את חיי המסגרת ומונע ריחות לא נעימים.</p>
<p>בזמן העברה בין מקרר להכנה חשוב לצמצם זמן בתווך החמים, ולסמן עגלות לפי סוג תוכן (בשר, חלב, ירקות) כדי למנוע זיהום צולב. ניתן לשקול מגבילי תנועה או מחצלות גומי לתבניות על המדפים אם הדגם מאפשר, כדי למנוע החלקה במורד מהיר או בפניות חדות. אם העגלה עוברת בין משמרות, כדאי לקבוע נוהל בדיקת גלגלים וברקסים בתחילת כל משמרת.</p>`;

  const suitableFor = `מתאים למסעדות, מטבחי קייטרינג, מטבחים מוסדיים ולכל עסק העובד עם תבניות GN בין תחנות קירור והכנה. ${sh}`;

  const whyChooseUs = `עגלת תבניות מקצרת זמני הליכה ומסייעת לשמירה על טמפרטורה ובטיחות מזון בזמן העברה. בחירה בין ${modeHe} מאפשרת לאזן מחיר ולוח זמנים. מומלץ לסמן עגלות לפי אזורי מטבח (חם/קר) כדי למנוע בלבול צוות. פירוט בעמוד המוצר ב־VIPO.`;

  const warranty =
    'אחריות ושירות לפי ספק ודגם. שמרו חשבונית, בדקו במסירה גלגלים ומסגרת, והשתמשו בעומסים לפי הוראות היצרן. שימוש לא נכון בתבניות או עומס יתר עלול לפגוע ביציבות ובאחריות.';

  const metaTitle = `עגלת תבניות נירוסטה ${dims || ''} ס״מ | ${modeHe}`.replace(/\s+/g, ' ').trim();
  const metaBase =
    mode === 'shared_container'
      ? `עגלת תבניות נירוסטה ${dims || ''} במכולה משותפת — מחיר ליחידה לפי התמלאות. GN וניידות במטבח מסחרי; בדקו ב־VIPO.`
      : mode === 'group'
        ? `עגלת תבניות נירוסטה ${dims || ''} ברכישה קבוצתית. להעברת תבניות בין עמדות; וודאו מפרט GN.`
        : `עגלת תבניות נירוסטה ${dims || ''} במשלוח מיידי מהמלאי — לפי זמינות. למטבח מקצועי; בדקו הובלה.`;

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
    if (!slug || !slug.includes('pan-cart')) {
      skipped += 1;
      continue;
    }
    const patch = buildPatch(dimsFromName(p.name), modeFromSlug(slug), panSeriesFromSlug(slug));
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
