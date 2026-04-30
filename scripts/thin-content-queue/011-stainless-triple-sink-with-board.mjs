/**
 * תור תוכן דל — שלב 11: כיור משולש/כפול מנירוסטה עם משטח
 *
 * הרצה: node scripts/thin-content-queue/011-stainless-triple-sink-with-board.mjs
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

const CATEGORY = 'כיור משולש/כפול מנירוסטה עם משטח';

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
  return `<p><strong>משלוח מיידי מהמלאי:</strong> אספקה לפי זמינות במלאי; מתאים כשצריכים כיור רחב עם משטח ללא המתנה למכולה או לקבוצה.</p>`;
}

function sizeHint(dims) {
  if (!dims) return 'בדקו התאמה לניקוז, לברזים ולחלוקת אומבות מול נוהל השטיפה.';
  const w = parseInt(dims.split('×')[0], 10);
  if (Number.isFinite(w) && w <= 1500) return 'משטח רחב — מאפשר חלוקה בין אומבות ומשטח עבודה לצד הכיור.';
  return 'פורמט רחב במיוחד — למטבחים עמוסים עם קו שטיפה מרכזי ונפח עבודה גבוה.';
}

function buildPatch(dims, mode) {
  const modeHe = modeLabel(mode);

  const description = `כיור משולש או כפול מנירוסטה עם משטח עבודה, במידות ${dims || 'לפי הדגם'} ס״מ — ${modeHe}. מתאים לשטיפה אינטנסיבית עם חלוקה בין אומבות; ${sizeHint(dims)}`;

  const fullDescription = `<p>כיור מנירוסטה עם משטח ומספר אומבות (כפול או משולש לפי הדגם) נועד למטבחים שבהם נדרשת הפרדה בין שלבי שטיפה — למשל שטיפה ראשונית, שטיפה סופית וייבוש צמוד, או חלוקה לפי סוג כלים. המשטח משמש להכנה קצרה, מיון או מנוחת כלים. מידות הדגם: <strong>${dims || 'לפי המפרט'}</strong> ס״מ — ${sizeHint(dims)}</p>
${modeIntroParagraph(mode)}
<p>חשוב לתכנן ניקוז נפרד או משותף לפי המפרט, מיקום ברזים ומסנן, וסיפון נגד רטיבות מתחת למשטח. נירוסטה דורשת חומרי ניקוי מתאימים; יש להימנע מעומס יתר על המשטח. במטבחים עמוסים מומלץ לקבוע נוהל ניקוי בין משמרות ולוודא נגישות לסיפונים.</p>
<p>ב־VIPO מוצגים מסלול הרכישה (${modeHe}) והמחיר; לשאלות על הובלה, חורי ברזים או תאימות לצנרת — פנו לשירות לפני ההזמנה.</p>
<p>בדקו במפרט כמה אומבות בפועל, עומקיהן וקוטר ניקוז מומלץ — השמות בשוק משתנים בין יצרנים. חומר הנירוסטה משפיע על עמידות בסביבה מלוחה; בקשו פירוט מול הספק.</p>
<p>במטבחים עם פיקוח קשה מומלץ לתכנן מראש פיצול ברזים לכל אומבה או ברז רב-מצב, ולוודא שסיפון המשטח מתחבר לניקוז ללא מפלים שיוצרים בריכות מים דקות. לאחר התקנה כדאי לבצע בדיקת נזילות קצרה לפני הפעלה מלאה.</p>
<p>אם מתכננים כיירון או מדיח צמודים למשטח, יש לבדוק את המרווחים המינימליים לפי תקן היצרן ולשמור נתיב ניקוז נקי ממשקעי שמן. במטבחים עם פינוי שומן מרוכז מומלץ לתאם את מיקום האומבות מול תהליך השטיפה כדי לקצר מגע עם משטחים חיצוניים. ניתן לבקש מהספק חריצים לברזים מוכנים מפעל לפי תכנון הצנרת כדי לחסוך זמן בשטח.</p>`;

  const suitableFor = `מתאים למסעדות, מטבחי הכנה גדולים, מטבחים מוסדיים ותעשייתיים — בכל מקום שבו נדרשת שטיפה רב-שלבית עם משטח צמוד. ${sizeHint(dims)}`;

  const whyChooseUs = `כיור רחב עם משטח מצמצם פערים בין יחידות נפרדות ומסייע לזרימת עבודה אחידה. בחירה בין ${modeHe} מאפשרת לאזן מחיר ולוח זמנים. מומלץ לתאם מראש סידור ברזים וניקוז. פירוט ב־VIPO.`;

  const warranty =
    'אחריות ושירות לפי ספק ודגם. שמרו חשבונית, בדקו במסירה את המשטח והאומבות, והתקינו לפי הוראות היצרן. נזק מהתקנה או מחומרי ניקוי לא מתאימים עלול לא להיכלל באחריות.';

  const metaTitle = `כיור נירוסטה רב אומבה עם משטח ${dims || ''} | ${modeHe}`.replace(/\s+/g, ' ').trim();
  const metaBase =
    mode === 'shared_container'
      ? `כיור נירוסטה עם משטח ${dims || ''} במכולה משותפת — מחיר ליחידה לפי התמלאות. שטיפה מסחרית; בדקו ב־VIPO.`
      : mode === 'group'
        ? `כיור נירוסטה עם משטח ${dims || ''} ברכישה קבוצתית. אומבות ומשטח משולבים; וודאו צנרת.`
        : `כיור נירוסטה עם משטח ${dims || ''} במשלוח מיידי מהמלאי — לפי זמינות. למטבח מקצועי.`;

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
    if (!slug || !slug.includes('sink-triple')) {
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
