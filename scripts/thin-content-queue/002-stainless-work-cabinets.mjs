/**
 * תור תוכן דל — שלב 2: כל ארונות העבודה מנירוסטה (WC) במידות 100/120/150/180 ×60×90
 * מסלולים: מכולה משותפת (-sc), משלוח מיידי, רכישה קבוצתית (-group)
 *
 * הרצה: node scripts/thin-content-queue/002-stainless-work-cabinets.mjs
 */
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const dotenvOpts = { override: false };
if (!process.env.MONGODB_URI?.trim()) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, ...dotenvOpts });
  else dotenv.config(dotenvOpts);
}

/** @type {{ id: string; w: number; mode: 'shared_container' | 'immediate' | 'group' }[]} */
const ENTRIES = [
  { id: '69aebfea2de81cc992c400fd', w: 100, mode: 'shared_container' },
  { id: '69aebfec2de81cc992c40153', w: 150, mode: 'shared_container' },
  { id: '69aebfeb2de81cc992c40129', w: 120, mode: 'shared_container' },
  { id: '69aebfed2de81cc992c4017a', w: 180, mode: 'shared_container' },
  { id: '69aebfec2de81cc992c40160', w: 180, mode: 'immediate' },
  { id: '69aebfea2de81cc992c4010c', w: 120, mode: 'immediate' },
  { id: '69aebfeb2de81cc992c40138', w: 150, mode: 'immediate' },
  { id: '69aebfe92de81cc992c400dc', w: 100, mode: 'immediate' },
  { id: '69aebfec2de81cc992c40146', w: 150, mode: 'group' },
  { id: '69aebfea2de81cc992c400ed', w: 100, mode: 'group' },
  { id: '69aebfeb2de81cc992c4011b', w: 120, mode: 'group' },
  { id: '69aebfed2de81cc992c4016d', w: 180, mode: 'group' },
];

const D = 60;
const H = 90;

function modeLabel(mode) {
  if (mode === 'shared_container') return 'מכולה משותפת';
  if (mode === 'group') return 'רכישה קבוצתית';
  return 'משלוח מיידי מהמלאי';
}

function modeIntroParagraph(mode) {
  if (mode === 'shared_container') {
    return `<p><strong>מכולה משותפת:</strong> מוצר זה נרכש במסגרת הצטרפות למכולת יבוא משותפת — כך ניתן לייעל עלות ליחידה. המחיר המוצג, לוחות הזמנים ומועדי האספקה תלויים בהתמלאות המכולה, בשחרור בנמל ובלוגיסטיקה. לרוב לוח האספקה ארוך יותר מרכישה מיידית מהמלאי, אך התמורה היא מחיר אטרקטיבי יותר ליחידה כשהמכולה מתמלאת.</p>`;
  }
  if (mode === 'group') {
    return `<p><strong>רכישה קבוצתית:</strong> ההזמנה מתבצעת במסגרת קבוצה — עם כמות מינימום ו/או תאריך יעד לסגירה. ככל שהקבוצה מתמלאת, התנאים עשויים להשתפר. לוחות זמנים ומשלוח שונים מרכישה מיידית; מומלץ לעקוב אחרי סטטוס הקבוצה בעמוד המוצר ולפנות לשירות לפני סגירה.</p>`;
  }
  return `<p><strong>משלוח מיידי מהמלאי:</strong> מסלול זה מתאים כשצריכים ארון עבודה ללא המתנה לכמות מינימום קבוצתית או למכולה. האספקה נעשית לפי זמינות במלאי בעת ההזמנה — מומלץ לוודא מול הנציגות מועד משלוח משוער לאזורכם.</p>`;
}

function widthUseCase(w) {
  if (w <= 100) return 'קומפקטי למטבחים צרים, פינות עבודה קטנות או כתוספת אחסון ליד משטח קיים.';
  if (w <= 120) return 'איזון נפוץ בין שטח עבודה לבין תפיסת מקום — מתאים למטבחי עסק קטנים ובינוניים.';
  if (w <= 150) return 'שטח עבודה נדיב יותר להכנה, לסידור כלים ולעבודה ממושכת.';
  return 'שטח עבודה רחב למטבחים עמוסים, מסעדות ומטבחים מוסדיים הדורשים הרבה משטח פריסה.';
}

/**
 * @param {number} w
 * @param {'shared_container' | 'immediate' | 'group'} mode
 */
function buildPatch(w, mode) {
  const dims = `${w}×${D}×${H}`;
  const modeHe = modeLabel(mode);

  const description = `ארון עבודה מנירוסטה במידות ${dims} ס״מ — ${modeHe}. משטח נירוסטה עמיד, ניקוי קל והתאמה למטבחים מסחריים ומוסדיים; מומלץ לוודא מידות פתח וגישה לפני הזמנה.`;

  const fullDescription = `<p>ארון עבודה מנירוסטה הוא רכיב בסיסי במטבחים מסחריים, מוסדיים ותעשייתיים: הוא מספק משטח עבודה יציב, עמיד בפני לחות וחומרי ניקוי, וקל לתחזוקה יומיומית. הדגם כאן בגודל <strong>${dims} ס״מ</strong> — ${widthUseCase(w)}</p>
${modeIntroParagraph(mode)}
<p>נירוסטה כחומר מתאימה לסביבות בהן נדרשת היגיינה גבוהה: מסעדות, בתי קפה, מטבחי הכנה, מעבדות מזון ועוד. המשטח חלק יחסית, פחות סופג לכלוך, וניתן לנקותו במים וסבון או חומרי ניקוי המתאימים לנירוסטה — תמיד לפי הוראות היצרן כדי לשמור על הגימור.</p>
<p>לפני הרכישה חשוב לבדוק: רוחב ועומק המשטח מול מיקום הצנרת והארונות, גובה נוח לעבודה, ואם נדרשת הרכבה או הובלה מיוחדת (קומות, גישה לרכב שינוע). ב־VIPO תקבלו פירוט מחיר ומסלול רכישה (${modeHe}) בעמוד המוצר; לשאלות על זמינות, אספקה או התאמה למסעדה/מטבח — צרו קשר עם השירות.</p>`;

  const suitableFor = `מתאים למטבחים מסחריים, מוסדיים ותעשייתיים קלים, לבתי קפה ומסעדות שצריכות משטח עבודה נקי ועמיד, ולעסקים שמכינים מזון באופן יומיומי. רוחב ${w} ס״מ ${widthUseCase(w)} לא מתאים להתקנה חיצונית ללא הגנה מפני חומרים קורוזיביים או מזג אוויר — אלא אם הדגם והתקן מאושרים לכך על ידי הספק.`;

  const whyChooseUs = `ארון עבודה מנירוסטה משלב עמידות, נראות מקצועית ונוחות ניקוי. בחירה במסלול ${modeHe} מאפשרת התאמה ללוח זמנים ולתקציב: מכולה משותפת ורכישה קבוצתית לרוב משפרות מחיר ליחידה, ואילו משלוח מיידי נותן מענה מהיר כשיש דחיפות תפעולית. VIPO מרכזת מידע על המוצר ומסלולי הרכישה כדי שתדעו מה לצפות לפני שמבצעים הזמנה.`;

  const warranty =
    'תנאי אחריות, כיסוי לרכיבים ושירות לאחר מכירה משתנים לפי ספק ודגם. מומלץ לשמור חשבונית ואישור הזמנה, לבדוק בעת המסירה שלמות האריזה והמוצר, ולפנות לתמיכה במקרה של פגם או אי־התאמה. שימוש שלא לפי הוראות ההרכבה והתחזוקה עלול לפגוע בכיסוי האחריות.';

  const metaTitle = `ארון עבודה מנירוסטה ${dims} ס״מ | ${modeHe}`;
  const metaDesc =
    mode === 'shared_container'
      ? `ארון עבודה נירוסטה ${dims} ס״מ במכולה משותפת — מחיר אטרקטיבי ליחידה, לוח אספקה לפי התמלאות. למטבחים מסחריים; בדקו מידות והובלה ב־VIPO.`
      : mode === 'group'
        ? `ארון עבודה נירוסטה ${dims} ס״מ ברכישה קבוצתית — הצטרפות לקבוצה ותנאים משתנים לפי סגירה. שטח עבודה עמיד ונוח לניקוי.`
        : `ארון עבודה נירוסטה ${dims} ס״מ במשלוח מיידי מהמלאי — אספקה לפי זמינות. מתאים למטבחים מסחריים; וודאו מידות פתח והובלה.`;

  return {
    description,
    fullDescription,
    suitableFor,
    whyChooseUs,
    warranty,
    faq: '',
    seo: {
      metaTitle,
      metaDescription: metaDesc.slice(0, 160),
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

  let ok = 0;
  let missing = 0;

  for (const row of ENTRIES) {
    const exists = await col.findOne({ _id: new ObjectId(row.id) }, { projection: { _id: 1, name: 1 } });
    if (!exists) {
      console.warn('לא נמצא:', row.id);
      missing += 1;
      continue;
    }
    const patch = buildPatch(row.w, row.mode);
    const res = await col.updateOne(
      { _id: new ObjectId(row.id) },
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
    if (res.modifiedCount) ok += 1;
    else console.warn('ללא שינוי:', exists.name, row.id);
  }

  console.log(JSON.stringify({ updated: ok, missing, total: ENTRIES.length }, null, 2));
  await client.close();
})().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
