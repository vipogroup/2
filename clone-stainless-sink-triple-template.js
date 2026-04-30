const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

function ensureUniqueKey(key) {
  const normalized = String(key || '').trim().toLowerCase();
  if (!/^[a-z0-9-_]+$/.test(normalized)) {
    throw new Error(`Invalid key: ${key}`);
  }
  return normalized;
}

function containsForbiddenTripleSinkTerms(value) {
  if (typeof value !== 'string') return false;
  return value.includes('כפול') || value.includes('בודד');
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const tenantId = new mongoose.Types.ObjectId('6980e7a13862e2a30b667a62');

  const sourceKey = 'stainless-steel-sink-double';
  const newKey = ensureUniqueKey('stainless-steel-sink-triple');

  const source = await db.collection('catalogtemplates').findOne({ key: sourceKey, tenantId });
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
  next.name = 'כיור נירוסטה 3 כיורים';
  next.titlePrefix = 'כיור נירוסטה';

  next.category = 'ציוד נירוסטה';
  next.subCategory = 'כיורי נירוסטה';

  next.shortDescription =
    'כיור נירוסטה 3 כיורים למטבחים תעשייתיים, מסעדות, קייטרינג ומפעלים. כולל שלוש קערות כיור (Triple Bowl) לעבודה רציפה ומקבילית – שטיפה, השריה וניקוי בו־זמנית, עם גב אחורי למניעת התזה ורגליים מתכווננות. פתרון מקצועי לעבודה אינטנסיבית והיגיינה גבוהה.';

  next.description =
    'כיור נירוסטה 3 כיורים (Triple Bowl) מיועד לסביבות עבודה עמוסות במטבחים תעשייתיים, מסעדות, קייטרינג ומפעלים. שלוש קערות מאפשרות חלוקת תחנות עבודה—לדוגמה שטיפה, השריה וניקוי בו־זמנית—וכך משפרות יעילות וזרימת עבודה בעומס גבוה. בדגמים מסוימים ניתן לקבל גב אחורי (Backsplash) להפחתת התזות ורגליים מתכווננות ליישור יציב. נירוסטה היא חומר עמיד, היגייני וקל לניקוי ולכן מתאימה במיוחד לסביבה מקצועית.';

  next.specs =
    'מאפיינים עיקריים:\n' +
    '• כיור נירוסטה 3 כיורים (3 קערות)\n' +
    '• מאפשר עבודה מקבילה: שטיפה + השריה + ניקוי\n' +
    '• מתאים למטבחים תעשייתיים, מסעדות, קייטרינג ומפעלים\n' +
    '• גב אחורי (Backsplash) להגנה מהתזות (לפי דגם)\n' +
    '• רגליים מתכווננות ליישור על רצפה\n' +
    '• מבנה חזק ועמיד, קל לניקוי ושמירה על היגיינה\n' +
    '• מתאים לקווי עבודה עמוסים ולחלוקת תחנות עבודה\n';

  next.seo = {
    ...(source.seo || {}),
    slugPrefix: newKey,
    metaTitle: 'כיור נירוסטה 3 כיורים | כיור 3 קערות למטבח תעשייתי',
    metaDescription:
      'כיור נירוסטה 3 כיורים (3 קערות) למטבחים תעשייתיים ומסעדות – פתרון לעבודה אינטנסיבית, היגייני ועמיד. מגוון מידות, אפשרויות התאמה ורגליים מתכווננות.',
    keywords: [
      'כיור נירוסטה 3 כיורים',
      'כיור 3 קערות נירוסטה',
      'כיור תעשייתי 3 כיורים',
      'כיור נירוסטה למטבח תעשייתי 3 קערות',
      'stainless steel triple bowl sink',
    ],
  };

  next.faq =
    'שאלות ותשובות – כיור נירוסטה 3 כיורים\n\n' +
    'שאלה:\nמה היתרון של כיור נירוסטה 3 כיורים לעומת כיור עם שתי קערות?\n' +
    'תשובה:\nשלוש קערות מאפשרות חלוקת עבודה ברורה (למשל שטיפה/השריה/ניקוי) בו־זמנית, ומתאימות במיוחד לקווי עבודה עמוסים.\n\n' +
    'שאלה:\nאיך בוחרים מידה נכונה לכיור 3 כיורים?\n' +
    'תשובה:\nבוחרים לפי שטח ההצבה, נפח העבודה, וגודל הכלים/מגשים. חשוב לוודא גם מרווחי מעבר נוחים סביב עמדת השטיפה.\n\n' +
    'שאלה:\nהאם מתאים לקו עבודה עמוס במטבח תעשייתי?\n' +
    'תשובה:\nכן. זה בדיוק היתרון: אפשר לעבוד בכמה שלבים במקביל ולשמור על רצף עבודה גם בעומסים גבוהים.\n\n' +
    'שאלה:\nכמה ברזים/נקודות מים צריך לכיור 3 כיורים?\n' +
    'תשובה:\nזה תלוי בדגם ובתכנון המטבח. בחלק מהמקרים ברז אחד מספיק, ובחלק נדרשות התאמות. מומלץ להתאים את מספר נקודות המים לתהליך העבודה בפועל.\n\n' +
    'שאלה:\nאיך מתחזקים ומנקים כיור נירוסטה תעשייתי עם 3 קערות?\n' +
    'תשובה:\nמנקים עם חומרי ניקוי עדינים המתאימים לנירוסטה, שוטפים ומייבשים. מומלץ להימנע מחומרים שורטים כדי לשמור על הגימור לאורך זמן.\n';

  next.structuredData =
    'Product Schema – כיור נירוסטה 3 כיורים\n' +
    'סוג מוצר: Product\n' +
    'קטגוריה: ציוד נירוסטה > כיורי נירוסטה\n' +
    'סוג מוצר (פירוט): כיור נירוסטה\n' +
    'מספר כיורים: 3\n' +
    'קטגוריה (פירוט): כיור תעשייתי\n' +
    'שימוש: שטיפה/ניקיון מטבח מקצועי\n' +
    'גב אחורי (Backsplash): לפי דגם\n' +
    'רגליים מתכווננות: כן\n' +
    'חומר: נירוסטה\n' +
    'התאמה לתקני מזון: כן\n';

  const fieldsToCheck = {
    name: next.name,
    titlePrefix: next.titlePrefix,
    shortDescription: next.shortDescription,
    description: next.description,
    specs: next.specs,
    faq: next.faq,
    structuredData: next.structuredData,
    seo_metaTitle: next.seo?.metaTitle,
    seo_metaDescription: next.seo?.metaDescription,
  };

  const offenders = Object.entries(fieldsToCheck)
    .filter(([, v]) => containsForbiddenTripleSinkTerms(v))
    .map(([k]) => k);

  if (offenders.length) {
    console.error('Found forbidden terms (כפול/בודד) in fields:', offenders);
    process.exit(1);
  }

  const insertResult = await db.collection('catalogtemplates').insertOne(next);
  const created = await db.collection('catalogtemplates').findOne({ _id: insertResult.insertedId });

  console.log('=== CREATED TEMPLATE ===');
  console.log('id:', created._id.toString());
  console.log('key:', created.key);
  console.log('name:', created.name);
  console.log('titlePrefix:', created.titlePrefix);
  console.log('seo.slugPrefix:', created.seo?.slugPrefix);
  console.log('seo.metaTitle:', created.seo?.metaTitle);
  console.log('specs (first 200):', String(created.specs || '').slice(0, 200));

  process.exit(0);
})();
