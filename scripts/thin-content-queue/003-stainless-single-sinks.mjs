/**
 * תור תוכן דל — שלב 3: כיור נירוסטה יחיד (כל המידות והמסלולים ברשימת ה-audit)
 *
 * הרצה: node scripts/thin-content-queue/003-stainless-single-sinks.mjs
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

/** @type {{ id: string; dims: string; mode: 'shared_container' | 'immediate' | 'group' }[]} */
const ENTRIES = [
  { id: '69aec609e1e2f9a63bf105ff', dims: '700×700×900', mode: 'shared_container' },
  { id: '69aec607e1e2f9a63bf105a9', dims: '500×500×900', mode: 'shared_container' },
  { id: '69aec60ae1e2f9a63bf10626', dims: '750×750×900', mode: 'shared_container' },
  { id: '69aec608e1e2f9a63bf105d6', dims: '600×600×900', mode: 'shared_container' },
  { id: '69af02431f9bb9efface50fa', dims: '60×60×90', mode: 'shared_container' },
  { id: '69aec609e1e2f9a63bf1060c', dims: '750×750×900', mode: 'immediate' },
  { id: '69aec607e1e2f9a63bf105b8', dims: '600×600×900', mode: 'immediate' },
  { id: '69aec608e1e2f9a63bf105e4', dims: '700×700×900', mode: 'immediate' },
  { id: '69aec606e1e2f9a63bf10588', dims: '500×500×900', mode: 'immediate' },
  { id: '69af02431f9bb9efface50e0', dims: '60×60×90', mode: 'immediate' },
  { id: '69aec607e1e2f9a63bf10599', dims: '500×500×900', mode: 'group' },
  { id: '69aec609e1e2f9a63bf105f2', dims: '700×700×900', mode: 'group' },
  { id: '69aec60ae1e2f9a63bf10619', dims: '750×750×900', mode: 'group' },
  { id: '69aec608e1e2f9a63bf105c7', dims: '600×600×900', mode: 'group' },
  { id: '69af02431f9bb9efface50ed', dims: '60×60×90', mode: 'group' },
];

function modeLabel(mode) {
  if (mode === 'shared_container') return 'מכולה משותפת';
  if (mode === 'group') return 'רכישה קבוצתית';
  return 'משלוח מיידי מהמלאי';
}

function modeIntroParagraph(mode) {
  if (mode === 'shared_container') {
    return `<p><strong>מכולה משותפת:</strong> כיור זה נרכש במסגרת הצטרפות למכולת יבוא משותפת — לרוב עם מחיר ליחידה אטרקטיבי יותר. לוחות זמנים, מחיר סופי ואספקה תלויים בהתמלאות המכולה, בשחרור בנמל ובלוגיסטיקה; לרוב האספקה ארוכה יותר מרכישה מיידית מהמלאי.</p>`;
  }
  if (mode === 'group') {
    return `<p><strong>רכישה קבוצתית:</strong> ההזמנה מתבצעת במסגרת קבוצה עם כללי סגירה (כמות מינימום ו/או תאריך יעד). התקדמות הקבוצה והמחיר הסופי עשויים להתעדכן; מומלץ לעקוב בעמוד המוצר ולוודא מול השירות לפני סגירה.</p>`;
  }
  return `<p><strong>משלוח מיידי מהמלאי:</strong> מתאים כשצריכים כיור ללא המתנה למכולה או לסגירת קבוצה. האספקה לפי זמינות במלאי בעת ההזמנה — יש לוודא מול הנציגות מועד משלוח משוער ותאימות למשטח העבודה והצנרת.</p>`;
}

/** מידות בש"ח — טקסט שימושי לפי גודל אומבה */
function sizeHint(dims) {
  if (dims.startsWith('60×')) return 'פורמט קומפקטי — מתאים לעמדות צרות, פינות שירות או משטחי עזר.';
  if (dims.startsWith('500×')) return 'איזון טוב בין נפח אומבה לתפיסת שטח — מתאים למטבחים קטנים ובינוניים.';
  if (dims.startsWith('600×')) return 'נפח אומבה נוח לשטיפה יומיומית ולכלים בינוניים.';
  if (dims.startsWith('700×')) return 'אומבה מרווחת — נוח לשטיפת כלים גדולים ולעבודה אינטנסיבית.';
  if (dims.startsWith('750×')) return 'אחת הגדולות בסדרה — מתאימה למטבחים עמוסים ולנפח שטיפה גבוה.';
  return 'בדקו מול שרטוט המטבח התאמה למשטח, לקירוי ולנקודת הניקוז.';
}

/**
 * @param {string} dims
 * @param {'shared_container' | 'immediate' | 'group'} mode
 */
function buildPatch(dims, mode) {
  const modeHe = modeLabel(mode);

  const description = `כיור נירוסטה יחיד במידות ${dims} ס״מ — ${modeHe}. נירוסטה עמידה, ניקוי קל והתאמה למטבחים מסחריים ומוסדיים; ${sizeHint(dims)}`;

  const fullDescription = `<p>כיור נירוסטה יחיד הוא רכיב מרכזי במטבח מסחרי: הוא חייב לעמוד בשטיפה אינטנסיבית, בחומרי ניקוי ובטמפרטורות משתנות, תוך שמירה על היגיינה. הדגם כאן בגודל <strong>${dims} ס״מ</strong> — ${sizeHint(dims)}</p>
${modeIntroParagraph(mode)}
<p>נירוסטה כחומר לכיור מציעה משטח חלק יחסית, עמידות בפני קורוזיה בתנאים נורמליים של מטבח, ונוחות ניקוי יומיומית. מומלץ להתקין עם ניקוז מתאים, סיפון נגד רטיבות למטה ולוודא התאמה לסיפונים ולברזים לפי מפרט הספק. בשימוש מסחרי חשוב גם לתכנן גישה לניקוי סביב הכיור ולתחזוקת סיפונים.</p>
<p>ב־VIPO מוצגים מסלול הרכישה (${modeHe}), מחיר ופרטים בסיסיים; לשאלות על התקנה, הובלה, תאימות לברז או לנקודת ניקוז — פנו לשירות לפני ביצוע ההזמנה.</p>
<p>בשלב התכנון כדאי למדוד את עומק האומבה מול עומק ארונות המטבח הקיימים, ולבדוק אם נדרשת התאמה לקורה או לחיזוק תת־כיורי. במטבחים עם מים קשים מומלץ לשקול מסנן או טיפול שוטף נגד אבנית; שמירה על אטימות סביב הניקוז מונעת רטיבות במבנה התומך. אם הכיור יושב ליד מקור חום, יש לוודא מרחק בטיחותי לפי היצרן ולתכנן גישה לניקוי מתחת לשפת הכיור.</p>`;

  const suitableFor = `מתאים למסעדות, בתי קפה, מטבחי הכנה, מטבחים מוסדיים ותעשייתיים קלים, ולכל עסק שדורש כיור שטיפה אחד איכותי. המידות ${dims} ס״מ מתאימות כשכבר קיימת תכנון של משטח עבודה וניקוז; ${sizeHint(dims)} לא מיועד לשימוש חיצוני ללא הגנה ואישור ספק.`;

  const whyChooseUs = `כיור יחיד מנירוסטה משלב עמידות, נראות נקייה ותחזוקה פשוטה יחסית. בחירה בין ${modeHe} מאפשרת לאזן בין מחיר, לוח זמנים ודחיפות: מכולה משותפת ורכישה קבוצתית לרוב משפרות מחיר ליחידה, ומשלוח מיידי נותן מענה מהיר מהמלאי. ב־VIPO תמצאו פירוט מסלול ומחיר בעמוד המוצר.`;

  const warranty =
    'אחריות ושירות משתנים לפי ספק ודגם. שמרו חשבונית והזמנה, בדקו את המוצר בעת המסירה, והשתמשו בחומרי ניקוי המתאימים לנירוסטה כדי לשמור על הגימור. התקנה לא תקינה או שימוש בחומרים קורוזיביים עלולים לפגוע בתקינות ובאחריות.';

  const metaTitle = `כיור נירוסטה יחיד ${dims} ס״מ | ${modeHe}`;
  const metaDescription =
    mode === 'shared_container'
      ? `כיור נירוסטה יחיד ${dims} ס״מ במכולה משותפת — מחיר ליחידה לפי התמלאות. למטבחים מסחריים; וודאו ניקוז והובלה ב־VIPO.`.slice(0, 160)
      : mode === 'group'
        ? `כיור נירוסטה יחיד ${dims} ס״מ ברכישה קבוצתית — הצטרפות לקבוצה ותנאים לפי סגירה. עמיד ונוח לניקוי למטבח מקצועי.`.slice(0, 160)
        : `כיור נירוסטה יחיד ${dims} ס״מ במשלוח מיידי מהמלאי — אספקה לפי זמינות. למטבחים מסחריים; בדקו התאמה לצנרת.`.slice(0, 160);

  return {
    description,
    fullDescription,
    suitableFor,
    whyChooseUs,
    warranty,
    faq: '',
    seo: {
      metaTitle,
      metaDescription: metaDescription,
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

  let updated = 0;
  let missing = 0;
  let unchanged = 0;

  for (const row of ENTRIES) {
    const exists = await col.findOne({ _id: new ObjectId(row.id) }, { projection: { _id: 1, name: 1 } });
    if (!exists) {
      console.warn('לא נמצא:', row.id);
      missing += 1;
      continue;
    }
    const patch = buildPatch(row.dims, row.mode);
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
    if (res.modifiedCount) updated += 1;
    else unchanged += 1;
  }

  console.log(JSON.stringify({ updated, unchanged, missing, total: ENTRIES.length }, null, 2));
  await client.close();
})().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
