/**
 * תור תוכן דל — שלב 12: עגלת משטח מורכבת מנירוסטה (platform trolley flat-assem)
 *
 * הרצה: node scripts/thin-content-queue/012-stainless-platform-trolley.mjs
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

const CATEGORY = 'עגלת משטח מורכבת מנירוסטה';

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
    return `<p><strong>מכולה משותפת:</strong> העגלה נרכשת במסגרת מכולת יבוא משותפת — מחיר ליחידה לרוב אטרקטיבי יותר. לוחות זמנים ואספקה תלויים בהתמלאות המכולה ובשחרור בנמל.</p>`;
  }
  if (mode === 'group') {
    return `<p><strong>רכישה קבוצתית:</strong> ההזמנה במסגרת קבוצה עם כללי סגירה; התקדמות והמחיר עשויים להתעדכן — עקבו בעמוד המוצר.</p>`;
  }
  return `<p><strong>משלוח מיידי מהמלאי:</strong> אספקה לפי זמינות במלאי; מתאים כשצריכים עגלת משטח ללא המתנה למכולה או לקבוצה.</p>`;
}

function footprintHint(dims) {
  if (!dims) return 'בדקו רוחב מסדרון ופתחי דלתות מול גודל המשטח.';
  const w = parseInt(dims.split('×')[0], 10);
  if (Number.isFinite(w) && w <= 550) return 'משטח בינוני — מתאים למסדרונות צרים יחסית ולעבודה בין עמדות.';
  return 'משטח רחב יותר — נוח להעברת כלים גדולים או מגשים במקביל; וודאו רדיוס פניות.';
}

function buildPatch(dims, mode) {
  const modeHe = modeLabel(mode);

  const description = `עגלת משטח מורכבת מנירוסטה במידות ${dims || 'לפי הדגם'} ס״מ — ${modeHe}. משטח שטוח לניידות ציוד ומגשים בין עמדות; ${footprintHint(dims)}`;

  const fullDescription = `<p>עגלת משטח מנירוסטה עם הרכבה (לפי הדגם) נועדה להעברת כלים, מגשים וציוד בין תחנות עבודה — בלי מדפים גבוהים שמגבילים גובה מטען. המשטח השטוח נוח לפריסה זמנית ולניקוי יחסית מהיר. מידות הדגם: <strong>${dims || 'לפי המפרט'}</strong> ס״מ — ${footprintHint(dims)}</p>
${modeIntroParagraph(mode)}
<p>יש לבדוק עומס מקסימלי מותר, יציבות הגלגלים וברקסים אם קיימים, ולמנוע היסט של מטען במורד משטחים משופעים. נירוסטה דורשת חומרי ניקוי מתאימים; אחרי שימוש במזון מומלץ ניקוי שוטף. בעגלה מורכבת — להידק ברגים לפי הוראות היצרן ולבדוק מדי תקופה.</p>
<p>ב־VIPO מוצגים מסלול הרכישה (${modeHe}) והמחיר; לשאלות על הובלה, הרכבה או עומס מקסימלי — פנו לשירות לפני ההזמנה.</p>
<p>במטבחים מוסדיים אפשר לשייך עגלה לאזור חם או קר לפי צבע/תווית, כדי למנוע בלבול צוות. אחסון לילי במקום יבש מאריך חיי המסגרת ומונע ריחות.</p>
<p>כשמעבירים מגשים חמים יש להימנע מחשיפה ממושכת של הגלגלים לטמפרטורות קיצוניות ולבדוק שהמשטח לא מתחמם מעבר לנוחות אחיזה. ניתן לרכז כמה עגלות באותו גודל כדי להחליף אותן בניקוי לסירוגין בלי לעצור את הקו.</p>`;

  const suitableFor = `מתאים למסעדות, מטבחי הכנה, מטבחים מוסדיים וקייטרינג — בכל מקום שבו נדרשת העברת ציוד על משטח יציב ונייד. ${footprintHint(dims)}`;

  const whyChooseUs = `עגלת משטח מקצרת מסלולים בין עמדות ומפחיתה הרמת כלים ידנית על פני מרחקים. בחירה בין ${modeHe} מאפשרת לאזן מחיר ולוח זמנים. מומלץ לקבוע נוהל בדיקת גלגלים אחת לשבועיים במטבחים עמוסים. פירוט בעמוד המוצר ב־VIPO.`;

  const warranty =
    'אחריות ושירות לפי ספק ודגם. שמרו חשבונית, בדקו במסירה גלגלים ומסגרת, והרכיבו לפי הוראות היצרן. עומס יתר או הרכבה רופפת עלולים לפגוע ביציבות ובאחריות.';

  const metaTitle = `עגלת משטח נירוסטה ${dims || ''} ס״מ | ${modeHe}`.replace(/\s+/g, ' ').trim();
  const metaBase =
    mode === 'shared_container'
      ? `עגלת משטח נירוסטה ${dims || ''} במכולה משותפת — מחיר ליחידה לפי התמלאות. ניידות במטבח; בדקו ב־VIPO.`
      : mode === 'group'
        ? `עגלת משטח נירוסטה ${dims || ''} ברכישה קבוצתית. משטח מורכב; וודאו עומס.`
        : `עגלת משטח נירוסטה ${dims || ''} במשלוח מיידי מהמלאי — לפי זמינות. למטבח מקצועי.`;

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
    if (!slug || !slug.includes('platform-trolley')) {
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
