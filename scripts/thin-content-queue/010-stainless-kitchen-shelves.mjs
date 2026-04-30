/**
 * תור תוכן דל — שלב 10: מדפי מטבח מנירוסטה (slug shelf-4t / shelf-5t)
 *
 * הרצה: node scripts/thin-content-queue/010-stainless-kitchen-shelves.mjs
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

const CATEGORY = 'מדפי מטבח מנירוסטה';

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

function tierFromSlug(slug) {
  const s = String(slug || '');
  if (s.includes('shelf-5t')) return 5;
  if (s.includes('shelf-4t')) return 4;
  return 0;
}

function modeLabel(mode) {
  if (mode === 'shared_container') return 'מכולה משותפת';
  if (mode === 'group') return 'רכישה קבוצתית';
  return 'משלוח מיידי מהמלאי';
}

function modeIntroParagraph(mode) {
  if (mode === 'shared_container') {
    return `<p><strong>מכולה משותפת:</strong> המדפים נרכשים במסגרת מכולת יבוא משותפת — מחיר ליחידה לרוב אטרקטיבי יותר. לוחות זמנים ואספקה תלויים בהתמלאות המכולה ובשחרור בנמל.</p>`;
  }
  if (mode === 'group') {
    return `<p><strong>רכישה קבוצתית:</strong> ההזמנה במסגרת קבוצה עם כללי סגירה; התקדמות והמחיר עשויים להתעדכן — עקבו בעמוד המוצר.</p>`;
  }
  return `<p><strong>משלוח מיידי מהמלאי:</strong> אספקה לפי זמינות במלאי; מתאים כשצריכים מדפים ללא המתנה למכולה או לקבוצה.</p>`;
}

function buildPatch(dims, mode, tiers) {
  const modeHe = modeLabel(mode);
  const tierText =
    tiers === 5 ? 'חמישה מדפים לארגון אנכי עמוק יותר' : tiers === 4 ? 'ארבעה מדפים לאחסון מדורג' : 'מספר מדפים לפי המפרט';

  const description = `מדפי מטבח מנירוסטה במידות ${dims || 'לפי הדגם'} ס״מ — ${modeHe}. ${tierText}; מתאימים לאחסון כלים, חומרי אריזה וציוד במטבח מסחרי.`;

  const fullDescription = `<p>מדפי מטבח מנירוסטה מספקים אחסון פתוח נגיש ליד עמדות העבודה — נוח לכלים תדירים, לקופסאות ולציוד שצריך לאוורר. נירוסטה קלה לניקוי יחסית ומתאימה לסביבת מזון. מידות הדגם: <strong>${dims || 'לפי המפרט'}</strong> ס״מ; ${tierText}. חשוב לתכנן קיבוע חזק לקיר או למבנה תומך, במיוחד כשמעמיסים מדפים עליונים.</p>
${modeIntroParagraph(mode)}
<p>במטבחים עמוסים מומלץ לחלק משקל בין המדפים, להימנע מעומס יתר על מדף אחד, ולוודא שאין חיכוך עם צינורות או מתגי חשמל. ניקוי שוטף מפחית הצטברות שומן ואבק; יש להשתמש בחומרים המתאימים לנירוסטה. אם המדף צמוד למקור חום — בדקו המלצות היצרן למרחק מינימלי.</p>
<p>ב־VIPO מוצגים מסלול הרכישה (${modeHe}) והמחיר; לשאלות על הובלה, ברגי קיבוע או עומס מקסימלי — פנו לשירות לפני ההזמנה.</p>
<p>בתכנון מוסדי כדאי לשלב מדפים עם נוהלי HACCP: זיהוי מדפים לאזורי חום/קר, וניקוי מתועד. מדפים גבוהים דורשים גישה בטוחה (שרפרף מאושר) בעת פריקה וטעינה.</p>
<p>ניתן לשלב מדפים מעל כיור או ליד מקרר — רק לוודא שאין התנגשות עם פתיחת דלתות ושהקיבוע לקיר עומד בתקן. במטבח לח מומלץ לבחור סוג נירוסטה עמיד יותר לקורוזיה; בקשו מהספק טבלת השוואה בין דרגות 201 ל־304 לפי סביבת העבודה.</p>
<p>במדפים ארוכים מומלץ לחלק את העומס בין זוגות ברגי קיבוע כדי למנוע מתיחה של הפרופיל; אם הקיר אינו בטון מלא יש להשתמש בדיבלים מתאימים לחומר הקיר. בפרויקטים מוסדיים ניתן לבקש תעודת חומר או דוח בדיקת אלמגן כדי לוודא התאמה לים־מלח או לחות גבוהה. לאחר התקנה כדאי לבדוק יישור עם פלס ולוודא שאין «רטט» בעומס בינוני.</p>`;

  const suitableFor = `מתאים למסעדות, מטבחי הכנה, מטבחים מוסדיים ומחסנים קטנים של מזון — בכל מקום שבו נדרש אחסון פתוח נגיש ליד קו העבודה. ${tierText}.`;

  const whyChooseUs = `מדפי נירוסטה משלבים עמידות וניקיון ויזואלי. בחירה בין ${modeHe} מאפשרת לאזן מחיר ולוח זמנים. מומלץ לבחור מספר מדפים לפי גובה תקרה ולפי נפח הציוד. פירוט ב־VIPO.`;

  const warranty =
    'אחריות ושירות לפי ספק ודגם. שמרו חשבונית, בדקו במסירה יישור וקיבוע, והתקינו לפי הוראות היצרן. עומס יתר או קיבוע חלש עלול לגרום לנפילה ולפגיעה באחריות.';

  const metaTitle = `מדפי מטבח נירוסטה ${dims || ''} ס״מ | ${modeHe}`.replace(/\s+/g, ' ').trim();
  const metaBase =
    mode === 'shared_container'
      ? `מדפי מטבח נירוסטה ${dims || ''} במכולה משותפת — מחיר ליחידה לפי התמלאות. אחסון למטבח מסחרי; בדקו ב־VIPO.`
      : mode === 'group'
        ? `מדפי מטבח נירוסטה ${dims || ''} ברכישה קבוצתית. מדפים מדורגים; וודאו קיבוע לקיר.`
        : `מדפי מטבח נירוסטה ${dims || ''} במשלוח מיידי מהמלאי — לפי זמינות. אחסון נירוסטה; בדקו הובלה.`;

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
    if (!slug || !slug.includes('kitchen-shelf')) {
      skipped += 1;
      continue;
    }
    const patch = buildPatch(dimsFromName(p.name), modeFromSlug(slug), tierFromSlug(slug));
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
