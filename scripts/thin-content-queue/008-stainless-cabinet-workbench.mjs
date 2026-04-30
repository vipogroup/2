/**
 * תור תוכן דל — שלב 8: "ארון שולחן עבודה מנירוסטה" (משטח + ארון + מדף ביניים — slug table-middle-shelf-cab)
 *
 * הרצה: node scripts/thin-content-queue/008-stainless-cabinet-workbench.mjs
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

const CATEGORY = 'ארון שולחן עבודה מנירוסטה';

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
    return `<p><strong>מכולה משותפת:</strong> הרכיב נרכש במסגרת מכולת יבוא משותפת — מחיר ליחידה לרוב אטרקטיבי יותר. לוחות זמנים ואספקה תלויים בהתמלאות המכולה ובשחרור בנמל.</p>`;
  }
  if (mode === 'group') {
    return `<p><strong>רכישה קבוצתית:</strong> ההזמנה במסגרת קבוצה עם כללי סגירה; התקדמות והמחיר עשויים להתעדכן — עקבו בעמוד המוצר.</p>`;
  }
  return `<p><strong>משלוח מיידי מהמלאי:</strong> אספקה לפי זמינות במלאי; מתאים כשצריכים פתרון משולב ללא המתנה למכולה או לקבוצה.</p>`;
}

function widthHint(dims) {
  if (!dims) return 'בדקו התאמה למשטח, לפתחים ולנקודות צנרת.';
  const w = parseInt(dims.split('×')[0], 10);
  if (Number.isFinite(w) && w <= 1200) return 'רוחב בינוני — מתאים למטבחים קטנים ובינוניים עם צורך באחסון משולב.';
  if (Number.isFinite(w) && w <= 1600) return 'רוחב נרחב — שטח עבודה ואחסון נדיבים לעמדות עמוסות.';
  return 'רוחב גדול במיוחד — למטבחים מוסדיים ולקווי הכנה ארוכים; וודאו גישה להובלה.';
}

function buildPatch(dims, mode) {
  const modeHe = modeLabel(mode);

  const description = `ארון שולחן עבודה מנירוסטה (משטח + מדף ביניים + ארון) במידות ${dims || 'לפי הדגם'} ס״מ — ${modeHe}. פתרון משולב לעבודה ואחסון; ${widthHint(dims)}`;

  const fullDescription = `<p>ארון שולחן עבודה מנירוסטה משלב משטח עבודה עליון, מדף ביניים לארגון ציוד וארון תחתון לאחסון סגור — מתאים למטבחים שבהם רוצים לצמצם רהיטים נפרדים וליצור עמדה אחת עקבית. חומר הנירוסטה תורם לניקוי ולהיגיינה. מידות הדגם: <strong>${dims || 'לפי המפרט'}</strong> ס״מ — ${widthHint(dims)}</p>
${modeIntroParagraph(mode)}
<p>בתכנון יש לקחת בחשבון פתיחת דלתות הארון מול עמדות סמוכות, גובה משטח העבודה מול גובה המשתמשים, וחיבורי צנרת אם נדרשים לכיור או לציוד. מומלץ לבדוק רגליים/בסיס, יישור ועומסים מותרים על המדף הביניים. ניקוי נירוסטה בחומרים מתאימים שומר על הגימור לאורך זמן.</p>
<p>ב־VIPO מוצגים מסלול הרכישה (${modeHe}) והמחיר; לשאלות על הובלה, הרכבה או חומר נירוסטה — פנו לשירות לפני ההזמנה.</p>
<p>במטבחים עמוסים כדאי לתכנן את פתיחת דלתות הארון כך שלא יחסמו מסלולי הליכה; ניתן לשלב ברז וכיור קטן על המשטח אם המפרט מאפשר. רגליים מתכווננות או הידוק לרצפה מונעים הזחה בעת לחיצה על המשטח. שילוב ארון סגור עם מדף ביניים מפחית אבק ומגן על ציוד רגיש יותר מאשר מדף פתוח בלבד.</p>
<p>בערכות עם מגירות כדאי לוודא סרגלים העומדים בעומס ותוכן צפוי לכל מגירה כדי למנוע הזחה. אם מתכננים רגל מתכווננת — יש לבדוק גובה מול קו עבודה של הצוות ולוודא שאין פער המייצר עומס על הגב. אחרי התקנה מומלץ לבצע בדיקת הידוק ברגי הקיבוע למסגרת בתדירות שהספק ממליץ, במיוחד במטבחים עם ריצוד תנועה חזק.</p>
<p>לעמדות רחבות במיוחד כדאי לבדוק התאמה לנתיבי הליכה ולפתיחת דלתות ארון במקביל, ולוודא שהמשקל מתפזר באופן מאוזן על הרצפה. ניתן לתאם עם VIPO בדיקת תאימות לריצוף רטוב או משופע לפני אספקה.</p>`;

  const suitableFor = `מתאים למסעדות, מטבחי הכנה, מטבחים מוסדיים ותעשייתיים — בכל מקום שבו נדרש שילוב של משטח עבודה ואחסון סגור באותה יחידה. ${widthHint(dims)}`;

  const whyChooseUs = `יחידה משולבת חוסכת התאמות בין ארון נפרד לשולחן, ומסייעת לעיצוב אחיד של העמדה. בחירה בין ${modeHe} מאפשרת לאזן מחיר ולוח זמנים. פירוט בעמוד המוצר ב־VIPO.`;

  const warranty =
    'אחריות ושירות לפי ספק ודגם. שמרו חשבונית, בדקו במסירה דלתות, מדפים ומשטח, והתקינו לפי הוראות היצרן. עומס יתר על מדפים או משטח עלול לפגוע ביציבות ובאחריות.';

  const metaTitle = `ארון שולחן עבודה נירוסטה ${dims || ''} ס״מ | ${modeHe}`.replace(/\s+/g, ' ').trim();
  const metaBase =
    mode === 'shared_container'
      ? `ארון שולחן עבודה נירוסטה ${dims || ''} במכולה משותפת — מחיר ליחידה לפי התמלאות. משטח + מדף + ארון; בדקו ב־VIPO.`
      : mode === 'group'
        ? `ארון שולחן עבודה נירוסטה ${dims || ''} ברכישה קבוצתית. פתרון משולב למטבח מקצועי; וודאו מידות.`
        : `ארון שולחן עבודה נירוסטה ${dims || ''} במשלוח מיידי מהמלאי — לפי זמינות. עבודה ואחסון; בדקו הובלה.`;

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
    if (!slug || !slug.includes('middle-shelf-cab')) {
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
