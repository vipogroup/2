/**
 * תור תוכן דל — שלב 5: כל מוצרי "שולחן עבודה מנירוסטה 2 שכבות" (כולל כותרות "שולחן נירוסטה 2 מדפים")
 *
 * מסלול מ־seo.slug: -sc / -group / אחרת משלוח מיידי
 *
 * הרצה: node scripts/thin-content-queue/005-stainless-tables-2-layer.mjs
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

const TABLE_CATEGORY = 'שולחן עבודה מנירוסטה 2 שכבות';

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
    return `<p><strong>מכולה משותפת:</strong> שולחן העבודה נרכש במסגרת מכולת יבוא משותפת — מחיר ליחידה לרוב אטרקטיבי יותר. לוחות זמנים, מחיר סופי ואספקה תלויים בהתמלאות המכולה, בשחרור בנמל ובלוגיסטיקה; לרוב האספקה ארוכה יותר מרכישה מיידית מהמלאי.</p>`;
  }
  if (mode === 'group') {
    return `<p><strong>רכישה קבוצתית:</strong> ההזמנה במסגרת קבוצה עם כללי סגירה (כמות מינימום ו/או תאריך יעד). התקדמות והמחיר עשויים להתעדכן — מומלץ לעקוב בעמוד המוצר ולוודא מול השירות לפני סגירה.</p>`;
  }
  return `<p><strong>משלוח מיידי מהמלאי:</strong> מתאים כשצריכים שולחן ללא המתנה למכולה או לסגירת קבוצה. האספקה לפי זמינות במלאי; יש לוודא מול הנציגות מועד משלוח, גישה להובלה ומימדי פתחים.</p>`;
}

function sizeHint(dims) {
  if (!dims) return 'בדקו מול שרטוט המטבח התאמה למשטח, לצנרת ולרוחב מעבר.';
  const [L, W] = dims.split('×').map((x) => parseInt(x, 10));
  const area = (Number.isFinite(L) && Number.isFinite(W) ? L * W : 0) / 100;
  if (area && area < 70) return 'משטח קומפקטי — מתאים למטבחים צרים או כתוספת ליד משטח קיים.';
  if (area && area < 120) return 'איזון נפוץ בין שטח עבודה לתפיסת מקום במטבח בינוני.';
  if (area && area < 200) return 'שטח עבודה נרחב — מתאים למסעדות ומטבחים עמוסים.';
  return 'משטח עבודה רחב במיוחד — לעמדות הכנה כבדות ולפריסת ציוד גדול.';
}

/**
 * @param {string} dims
 * @param {'shared_container' | 'immediate' | 'group'} mode
 */
function buildPatch(dims, mode) {
  const modeHe = modeLabel(mode);

  const description = `שולחן עבודה מנירוסטה בשתי שכבות במידות ${dims || 'לפי הדגם'} ס״מ — ${modeHe}. משטח עליון עמיד ומדף תחתון לאחסון; ${sizeHint(dims)}`;

  const fullDescription = `<p>שולחן עבודה מנירוסטה בשתי שכבות משמש עמדת הכנה מרכזית במטבח מסחרי: שכבה עליונה לעבודה ישירה ושכבה תחתונה לאחסון כלים, גסטרונומים או ציוד נלווה. המבנה תורם לארגון המטבח ומקצר מסלולים בין עמדות. הדגם כאן בגודל <strong>${dims || 'לפי המפרט'}</strong> ס״מ — ${sizeHint(dims)}</p>
${modeIntroParagraph(mode)}
<p>נירוסטה עמידה בפני לחות וקלות יחסית לניקוי — חשוב להשתמש בחומרים המתאימים לנירוסטה ולהימנע משפשוף חומרים גסים שישרטו את המשטח. מומלץ לתכנן התאמה לרגליים/בסיס, לרמת המשטח מול עמדות סמוכות ולנקודות חיבור לצנרת אם נדרש.</p>
<p>במטבחים עמוסים כדאי לחשב עומס על המדף התחתון ולמנוע ערימה מסוכנת. אם השולחן צמוד לקיר, השאירו פינה לניקוי ולריתוך/חיבורים; אם הוא באיילנד — וודאו יציבות ואלמנטי עיגון לפי הוראות הספק. חומר הנירוסטה המדויק (למשל 304 לעומת 201) משפיע על עמידות בים־מלח ובקורוזיה — בקשו פירוט במסמכי הדגם.</p>
<p>ב־VIPO מוצגים מסלול הרכישה (${modeHe}), מחיר ופרטים; לשאלות על הובלה, הרכבה או חומר נירוסטה — פנו לשירות לפני ההזמנה.</p>
<p>כשרוכשים שולחן דו־שכבתי מומלץ לתכנן פינוי לחשמל ולמים אם יש כוונה לשלב מכשיר על המשטח, ולבדוק שהמשקל המאושר של המדף התחתון מספיק לציוד הצפוי. גימור המשטח (מט לעומת מבריק) משפיע על השתקפות תאורה ועל נראות סימני שימוש; ניתן לבקש תמונות מדגמים דומים במטבחים שהותקנו. לאחר התקנה כדאי לבדוק יישור עם פלס קצר ולכוון רגליים כדי למנוע מי מים על המשטח.</p>`;

  const suitableFor = `מתאים למסעדות, בתי קפה, מטבחי הכנה, מטבחים מוסדיים ותעשייתיים — בכל מקום שבו נדרש משטח עבודה היגייני עם אחסון תחתון. ${sizeHint(dims)}`;

  const whyChooseUs = `שתי שכבות ממקסמות שימוש בגובה אנכי: עבודה למעלה ואחסון למטה. בחירה בין ${modeHe} מאפשרת לאזן מחיר ולוח זמנים; מכולה וקבוצה לרוב משפרות מחיר ליחידה. ב־VIPO תמצאו פירוט מסלול ומחיר בעמוד המוצר.`;

  const warranty =
    'אחריות ושירות משתנים לפי ספק, דגם וחומר נירוסטה. שמרו חשבונית, בדקו את המוצר בעת המסירה (יישור, רגליים, שריטות תעשייתיות קלות), והתקינו לפי הוראות היצרן. עומס יתר על המדפים עלול לפגוע ביציבות ובאחריות.';

  const metaTitle = `שולחן עבודה נירוסטה 2 שכבות ${dims || ''} ס״מ | ${modeHe}`.replace(/\s+/g, ' ').trim();
  const metaBase =
    mode === 'shared_container'
      ? `שולחן עבודה נירוסטה 2 שכבות ${dims || ''} במכולה משותפת — מחיר ליחידה לפי התמלאות. למטבחים מסחריים; בדקו אספקה ב־VIPO.`
      : mode === 'group'
        ? `שולחן עבודה נירוסטה 2 שכבות ${dims || ''} ברכישה קבוצתית — הצטרפות לקבוצה. משטח ומדף תחתון; וודאו מידות.`
        : `שולחן עבודה נירוסטה 2 שכבות ${dims || ''} במשלוח מיידי מהמלאי — לפי זמינות. למטבח מקצועי; בדקו הובלה.`;

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

  const products = await col.find({ category: TABLE_CATEGORY }).project({ name: 1, seo: 1 }).toArray();

  let updated = 0;
  let skipped = 0;

  for (const p of products) {
    const slug = p.seo?.slug || '';
    if (!slug) {
      skipped += 1;
      continue;
    }
    const mode = modeFromSlug(slug);
    const dims = dimsFromName(p.name);
    const patch = buildPatch(dims, mode);

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

  console.log(JSON.stringify({ total: products.length, updated, skipped_no_slug: skipped }, null, 2));
  await client.close();
})().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
