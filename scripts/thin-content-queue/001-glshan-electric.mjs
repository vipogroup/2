/**
 * תור תוכן דל — שלב 1 מתוך הרשימה ב־exports/thin-products-audit.json (ממוין לפי מילים).
 * מוצר: גלשן חשמלי | MongoDB _id 69af34b23fc5e435a670bdf8
 *
 * הרצה: node scripts/thin-content-queue/001-glshan-electric.mjs
 * (MONGODB_URI מ־.env.local או מהסביבה)
 */
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const PRODUCT_ID = '69af34b23fc5e435a670bdf8';

const dotenvOpts = { override: false };
if (!process.env.MONGODB_URI?.trim()) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, ...dotenvOpts });
  else dotenv.config(dotenvOpts);
}

const PATCH = {
  description:
    'גלשון חשמלי לרכיבה נוחה בפארקים ובשטחים מישורים — מנוע חשמלי שקט יחסית, בטריה נטענת ומבנה קל לנשיאה. מתאים לשימוש פנאי משפחתי; לפני השימוש חובה ציוד מגן, פיקוח מבוגר והתאמה לגיל ולמשקל המותג.',

  fullDescription: `<p>גלשון חשמלי הוא פתרון פנאי פופולרי לילדים ולמתבגרים שמחפשים חוויית רכיבה קלה בלי מאמץ גדול. המוצר מתאים לרכיבה קצרה בשטחים מוגדרים, מסלולים מישורים ומרחבים פתוחים בלי מפגעים, ובתנאי שיש הקפדה על כללי בטיחות.</p>
<p>היתרון המרכזי של גלשון חשמלי הוא הנוחות: הפעלה פשוטה, האצה עדינה ויכולת לעצור במהירות כשלומדים את אופן ההפעלה. רוב הדגמים כוללים בטריה נטענת ומטען ביתי; זמני טעינה וטווח נסיעה משתנים לפי יצרן, תנאי שטח ומשקל הרוכב — לכן חשוב לקרוא בעיון את מפרט היצרן שמגיע עם המוצר.</p>
<p>לפני הרכישה מומלץ לוודא התאמת גיל ומשקל מקסימלי, סוג הבלמים, מהירות מקסימימלית מותרת, ואם נדרשת קסדה או ציוד מגן נוסף לפי תקן המוכר ולפי הנחיות בטיחות מקומיות. השתמשו רק במטען המקורי או המאושר, הימנעו מטעינה ללא השגחה ואחסנו את המוצר במקום יבש.</p>
<p>ב־VIPO ניתן לרכוש את הגלשון החשמלי במסלול נוח, עם פירוט מחיר ותנאי אספקה בעמוד המוצר. אם יש לכם שאלות על זמינות, אחריות או התאמה לגיל — צרו קשר עם נציגי השירות לפני ביצוע ההזמנה.</p>`,

  suitableFor:
    'מתאים למשפחות שמחפשות פעילות פנאי בטוחה יחסית בשטח מבוקר, לילדים ונוער בגילאים שמותרים לפי היצרן והחוק המקומי, ולשימוש בפארקים או חצרות פרטיות כשיש פיקוח מבוגר. לא מתאים לכבישים פתוחים, רכיבה בלילה ללא תאורה או נשיאת נוסע נוסף אם הדגם לא מיועד לכך.',

  whyChooseUs:
    'נוחות הפעלה ורכיבה קלה יחסית לעומת אופניים קלאסיים, חוויית משחק ופנאי לילדים, וגודל קומפקטי שקל לאחסן. בחירה דרך פלטפורמה מאפשרת לכם לראות מחיר שקוף, תיאור מפורט וליווי הזמנה. מומלץ להשוות בין דגמים לפי משקל מקסימלי, מהירות, זמן טעינה ורמת בטיחות (בלמים, יציבות).',

  warranty:
    'תנאי האחריות והשירות משתנים לפי ספק ודגם. בדקו בעמוד ההזמנה או במסמך שנשלח עם המוצר מה מכוסה: בטריה, מנוע, שלט וחלקי פלסטיק. שמירה על שימוש לפי ההוראות ומניעת חדירת מים היא תנאי נפוץ לשמירה על אחריות.',

  seo: {
    metaTitle: 'גלשון חשמלי לרכיבה נוחה | VIPO',
    metaDescription:
      'גלשון חשמלי לפנאי משפחתי: בטריה נטענת, רכיבה קלה בשטחים מישורים והנחיות בטיחות. בדקו גיל, משקל מקסימלי ותנאי אספקה ב־VIPO.',
    h1: '',
  },

  /** שדה faq במסד הוא מחרוזת — משאירים ריק; ה־FAQ ב־JSON-LD נבנה מ־suitableFor/whyChooseUs/warranty/fullDescription */
  faq: '',
};

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

  const before = await col.findOne(
    { _id: new ObjectId(PRODUCT_ID) },
    { projection: { name: 1, description: 1 } },
  );
  if (!before) {
    console.error('מוצר לא נמצא:', PRODUCT_ID);
    await client.close();
    process.exit(1);
  }

  const res = await col.updateOne(
    { _id: new ObjectId(PRODUCT_ID) },
    {
      $set: {
        description: PATCH.description,
        fullDescription: PATCH.fullDescription,
        suitableFor: PATCH.suitableFor,
        whyChooseUs: PATCH.whyChooseUs,
        warranty: PATCH.warranty,
        faq: PATCH.faq,
        'seo.metaTitle': PATCH.seo.metaTitle,
        'seo.metaDescription': PATCH.seo.metaDescription,
        ...(PATCH.seo.h1 ? { 'seo.h1': PATCH.seo.h1 } : {}),
      },
    },
  );

  console.log('עודכן:', before.name, '| matched:', res.matchedCount, 'modified:', res.modifiedCount);
  await client.close();
})().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
