const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

function ensureUniqueKey(key) {
  const normalized = String(key || '').trim().toLowerCase();
  if (!/^[a-z0-9-_]+$/.test(normalized)) {
    throw new Error(`Invalid key: ${key}`);
  }
  return normalized;
}

function containsForbiddenWords(value) {
  if (typeof value !== 'string') return false;
  return value.includes('שולחן') || value.includes('שולחנות') || value.includes('ארון') || value.includes('ארונות');
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const tenantId = new mongoose.Types.ObjectId('6980e7a13862e2a30b667a62');

  const sourceKey = 'stainless-steel-cabinet';
  const newKey = ensureUniqueKey('stainless-steel-grease-trap');

  const source = await db.collection('catalogtemplates').findOne({
    key: sourceKey,
    tenantId,
  });

  if (!source) {
    console.error('Source template not found:', { sourceKey, tenantId: tenantId.toString() });
    process.exit(1);
  }

  const existing = await db.collection('catalogtemplates').findOne({ key: newKey, tenantId });
  if (existing) {
    console.error('Target template key already exists:', { newKey, tenantId: tenantId.toString() });
    process.exit(1);
  }

  const next = { ...source };
  delete next._id;
  delete next.createdAt;
  delete next.updatedAt;

  next.key = newKey;
  next.name = 'מלכודת שומן מנירוסטה';
  next.titlePrefix = 'מלכודת שומן';

  next.category = 'ציוד נירוסטה';
  next.subCategory = 'מלכודות שומן';

  next.shortDescription =
    'מלכודת שומן מנירוסטה (מפריד שמן-מים) לשימוש במטבחים תעשייתיים, מסעדות וקייטרינג. מיועדת להפרדת שומנים ושמנים ממי השפכים לפני כניסה לקווי הניקוז, להפחתת סתימות וריחות, שמירה על היגיינה ועמידה בדרישות תחזוקה.';

  next.description =
    'מלכודת שומן מנירוסטה (Grease Trap / מפריד שמן-מים) היא פתרון חיוני לניהול מי שפכים במטבחים תעשייתיים, מסעדות וקייטרינג. המערכת מפרידה שומנים ושמנים ממי השפכים לפני כניסתם לקווי הניקוז, ובכך מסייעת להפחית סתימות וריחות, לשמור על היגיינה ולהקל על תחזוקה שוטפת. המבנה מנירוסטה עמיד בפני קורוזיה, קל לניקוי ומתאים לעבודה בסביבה מקצועית.';

  next.specs =
    'מאפיינים עיקריים:\n' +
    '• מפריד שמן-מים מנירוסטה (מלכודת שומן)\n' +
    '• מפחית סתימות וריחות במערכת הניקוז\n' +
    '• מתאים למסעדות, מטבחים תעשייתיים, קייטרינג ומפעלים\n' +
    '• מכסה עליון נגיש לפתיחה וניקוי\n' +
    '• כניסות/יציאות לפי דגם (פתח אחד / 2 / 3)\n' +
    '• מבנה עמיד, אנטי-קורוזיה, קל לניקוי\n' +
    '• מיועד לתחזוקה שוטפת וניקוז בטוח\n';

  next.seo = {
    ...(source.seo || {}),
    slugPrefix: newKey,
    metaTitle: 'מלכודת שומן מנירוסטה | מפריד שמן-מים למטבח תעשייתי',
    metaDescription:
      'מלכודת שומן מנירוסטה (מפריד שמן-מים) להפחתת סתימות וריחות בניקוז. מתאימה למסעדות ומטבחים תעשייתיים. תחזוקה קלה, ניקוי מהיר, מגוון גדלים וחיבורים.',
    keywords: [
      'מלכודת שומן נירוסטה',
      'מפריד שמן מים',
      'מפריד שומנים למטבח תעשייתי',
      'מלכודת שומן למסעדות',
      'grease trap stainless steel',
    ],
  };

  next.faq =
    'שאלות ותשובות – מלכודת שומן מנירוסטה\n\n' +
    'שאלה:\nלמה צריך מלכודת שומן במטבח תעשייתי?\n' +
    'תשובה:\nכדי להפריד שומנים ושמנים ממי השפכים לפני הניקוז, להפחית סתימות וריחות ולשמור על היגיינה ותחזוקה תקינה.\n\n' +
    'שאלה:\nאיך בוחרים מלכודת שומן לפי כמות שימוש?\n' +
    'תשובה:\nבוחרים לפי היקף הפעילות, כמות מי השפכים וסוג השימוש. ככל שהמטבח פעיל יותר—נדרש נפח/דגם מתאים יותר.\n\n' +
    'שאלה:\nכל כמה זמן צריך לנקות מלכודת שומן?\n' +
    'תשובה:\nזה תלוי בעומס השימוש. ברוב העסקים מבצעים ניקוי תקופתי (שבועי/דו-שבועי/חודשי) כדי לשמור על יעילות ולמנוע ריחות.\n\n' +
    'שאלה:\nמה ההבדל בין דגמים עם 1/2/3 פתחים?\n' +
    'תשובה:\nמספר הפתחים קשור לאופן החיבור לקווי כניסה/יציאה ולעתים גם לפיצול זרימה. בוחרים לפי תשתית הניקוז והדגם הנדרש באתר.\n\n' +
    'שאלה:\nהאם מלכודת השומן מתאימה למסעדות וקייטרינג?\n' +
    'תשובה:\nכן. היא מיועדת במיוחד לסביבות מקצועיות שבהן יש שימוש מוגבר בשמנים ושומנים.\n';

  next.structuredData =
    'Product Schema – מלכודת שומן מנירוסטה\n' +
    'סוג מוצר: Product\n' +
    'קטגוריה: ציוד נירוסטה > מלכודות שומן\n' +
    'סוג מוצר (פירוט): מלכודת שומן מנירוסטה\n' +
    'קטגוריה (פירוט): מפריד שמן-מים\n' +
    'שימוש: ניקוז מטבח תעשייתי\n' +
    'תחזוקה: ניקוי תקופתי\n' +
    'חומר: נירוסטה\n' +
    'התאמה לתקני מזון: כן\n';

  // Quality checks
  const fieldsToCheck = {
    name: next.name,
    titlePrefix: next.titlePrefix,
    category: next.category,
    subCategory: next.subCategory,
    shortDescription: next.shortDescription,
    description: next.description,
    specs: next.specs,
    faq: next.faq,
    structuredData: next.structuredData,
    seo_metaTitle: next.seo?.metaTitle,
    seo_metaDescription: next.seo?.metaDescription,
  };

  const offenders = Object.entries(fieldsToCheck)
    .filter(([, v]) => containsForbiddenWords(v))
    .map(([k]) => k);

  if (offenders.length) {
    console.error('Found forbidden words (שולחן/ארון) in fields:', offenders);
    process.exit(1);
  }

  const insertResult = await db.collection('catalogtemplates').insertOne(next);
  const created = await db.collection('catalogtemplates').findOne({ _id: insertResult.insertedId });

  console.log('=== CREATED TEMPLATE ===');
  console.log('id:', created._id.toString());
  console.log('key:', created.key);
  console.log('name:', created.name);
  console.log('titlePrefix:', created.titlePrefix);
  console.log('category:', created.category);
  console.log('subCategory:', created.subCategory);
  console.log('seo.slugPrefix:', created.seo?.slugPrefix);
  console.log('seo.metaTitle:', created.seo?.metaTitle);
  console.log('seo.metaDescription:', created.seo?.metaDescription);
  console.log('seo.keywords:', JSON.stringify(created.seo?.keywords));
  console.log('specs (first 200):', String(created.specs || '').slice(0, 200));

  process.exit(0);
})();
