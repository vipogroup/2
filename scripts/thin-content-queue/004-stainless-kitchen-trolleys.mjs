/**
 * תור תוכן דל — שלב 4: כל מוצרי "עגלות מטבח מנירוסטה" (לפי קטגוריה ב־Mongo)
 *
 * מסלול נגזר מ־seo.slug: -sc / -group / אחרת משלוח מיידי
 * סוג עגלה מ־slug: 2t / 3t / 4t / plastic
 *
 * הרצה: node scripts/thin-content-queue/004-stainless-kitchen-trolleys.mjs
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

function modeFromSlug(slug) {
  const s = String(slug || '');
  if (s.endsWith('-sc')) return 'shared_container';
  if (s.endsWith('-group')) return 'group';
  return 'immediate';
}

function trolleyKindFromSlug(slug) {
  const s = String(slug || '');
  if (s.includes('trolley-4t')) return '4';
  if (s.includes('trolley-plastic')) return 'plastic';
  if (s.includes('trolley-3t')) return '3';
  return '2';
}

function dimsFromName(name) {
  const m = String(name || '').match(/(\d+)\s*×\s*(\d+)\s*×\s*(\d+)/);
  if (m) return `${m[1]}×${m[2]}×${m[3]}`;
  const m2 = String(name || '').match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
  if (m2) return `${m2[1]}×${m2[2]}×${m2[3]}`;
  return '';
}

function modeLabel(mode) {
  if (mode === 'shared_container') return 'מכולה משותפת';
  if (mode === 'group') return 'רכישה קבוצתית';
  return 'משלוח מיידי מהמלאי';
}

function modeIntroParagraph(mode) {
  if (mode === 'shared_container') {
    return `<p><strong>מכולה משותפת:</strong> העגלה נרכשת במסגרת מכולת יבוא משותפת — מחיר ליחידה לרוב אטרקטיבי יותר, אך לוחות זמנים, מחיר סופי ואספקה תלויים בהתמלאות המכולה, בשחרור בנמל ובלוגיסטיקה. לרוב האספקה ארוכה יותר מרכישה מיידית מהמלאי.</p>`;
  }
  if (mode === 'group') {
    return `<p><strong>רכישה קבוצתית:</strong> ההזמנה במסגרת קבוצה עם כללי סגירה (כמות מינימום ו/או תאריך יעד). התקדמות והמחיר עשויים להתעדכן — מומלץ לעקוב בעמוד המוצר ולוודא מול השירות לפני סגירה.</p>`;
  }
  return `<p><strong>משלוח מיידי מהמלאי:</strong> מתאים כשצריכים עגלה ללא המתנה למכולה או לסגירת קבוצה. האספקה לפי זמינות במלאי; יש לוודא מול הנציגות מועד משלוח והתאמה למסדרון המטבח.</p>`;
}

function kindDescription(kind) {
  if (kind === '4') return 'עגלה עם ארבעה מדפים — נפח אחסון גבוה לעמדות עבודה עמוסות ולפריסת כלים וחומרי גלם.';
  if (kind === 'plastic')
    return 'עגלה עם מדפי פלסטיק קלים לניקוי לצד מסגרת נירוסטה — נוחה לארגון ציוד ולעבודה יומיומית במטבח.';
  if (kind === '3') return 'עגלה עם שלושה מדפי נירוסטה — מאפשרת חלוקה לוגית בין כלים, ציוד ניקוי וחומרים.';
  return 'עגלה עם שני מדפי נירוסטה — איזון טוב בין קיבול לתפיסת מקום במסדרון המטבח.';
}

function footprintHint(dims) {
  if (!dims) return 'בדקו מול שרטוט המטבח רוחב מעבר, פתחי דלתות ונקודות עגינה.';
  const first = parseInt(dims.split('×')[0], 10);
  if (first <= 350) return 'פורמט צר יחסית — מתאים למסדרונות מטבח צרים ולפינות שירות.';
  if (first <= 500) return 'מידות בינוניות — מתאים לרוב מטבחי מסעדות קטנים ובינוניים.';
  if (first <= 600) return 'שטח פריסה נוח לציוד בינוני ולתנועה בין עמדות.';
  return 'פורמט רחב — מתאים למטבחים עמוסים ולנשיאת עומסי עבודה גדולים יותר.';
}

/**
 * @param {string} dims
 * @param {'shared_container' | 'immediate' | 'group'} mode
 * @param {'2'|'3'|'4'|'plastic'} kind
 */
function buildPatch(dims, mode, kind) {
  const modeHe = modeLabel(mode);
  const kd = kindDescription(kind);

  const description = `עגלת מטבח מנירוסטה במידות ${dims || 'לפי הדגם'} ס״מ — ${modeHe}. ${kd} גלגלים לניידות בין עמדות; מתאימה למטבחים מסחריים ומוסדיים.`;

  const fullDescription = `<p>עגלת מטבח מנירוסטה היא כלי עזר חיוני במטבח מקצועי: היא מאפשרת להעביר כלים, חומרי ניקוי וציוד בין תחנות עבודה בלי לחסום את המסדרון. הדגם כאן בגודל <strong>${dims || 'לפי המפרט'}</strong> ס״מ — ${footprintHint(dims)} ${kd}</p>
${modeIntroParagraph(mode)}
<p>נירוסטה במגע עם מזון ומים דורשת תחזוקה סדירה: ניקוי אחרי משמרת, חומרים מתאימים לנירוסטה, ומניעת שריטות חומרים קשים. הגלגלים צריכים להיות תקינים ומותאמים למשקל העומס; מומלץ לבדוק נעילה/שחרור אם קיים מנגנון ברקס. בעגלה עם מדפי פלסטיק — לוודא עמידות בטמפרטורה ובחומרי ניקוי לפי היצרן.</p>
<p>ב־VIPO מוצגים מסלול הרכישה (${modeHe}), מחיר ופרטים; לשאלות על הובלה, הרכבה או התאמה למטבח — פנו לשירות לפני ההזמנה.</p>
<p>לפני סגירת הזמנה מומלץ לצלם את מסלולי הנעה של העגלה (פינות, מעליות, דלתות מטבח) ולבדוק שאין פער גובה בין גובה המדפים לבין משטחי עבודה סמוכים. ניתן לבקש מהספק המלצה לסוג גלגל (קשיח/מבודד רעש) לפי ריצוף המטבח, ולבדוק האם הדגם מתאים לשטיפת מסגרת תכופה במדיח תעשייתי ללא פגיעה בפלסטיק אם קיים.</p>`;

  const suitableFor = `מתאים למסעדות, בתי קפה, מטבחי הכנה, מטבחים מוסדיים ותעשייתיים קלים — בכל מקום שבו נדרשת ניידות בין עמדות שטיפה, הכנה ואחסון זמני. ${kd} ${footprintHint(dims)}`;

  const whyChooseUs = `עגלת מטבח משפרת זרימת עבודה ומפחיתה הליכה מיותרת. בחירה בין ${modeHe} מאפשרת לאזן מחיר מול לוח זמנים: מכולה וקבוצה לרוב משפרות מחיר ליחידה, משלוח מיידי נותן מענה מהיר. ב־VIPO תמצאו פירוט מסלול ומחיר בעמוד המוצר.`;

  const warranty =
    'אחריות ושירות משתנים לפי ספק ודגם. שמרו חשבונית, בדקו את המוצר בעת המסירה (כולל גלגלים ומדפים), והשתמשו בחומרי ניקוי המתאימים לחומרי העגלה. עומס יתר או שימוש לא נכון עלולים לפגוע ביציבות ובאחריות.';

  const metaTitle = `עגלת מטבח מנירוסטה ${dims || ''} ס״מ | ${modeHe}`.replace(/\s+/g, ' ').trim();
  const metaBase =
    mode === 'shared_container'
      ? `עגלת מטבח נירוסטה ${dims || ''} במכולה משותפת — מחיר ליחידה לפי התמלאות. ניידות ואחסון למטבח מקצועי; בדקו אספקה ב־VIPO.`
      : mode === 'group'
        ? `עגלת מטבח נירוסטה ${dims || ''} ברכישה קבוצתית — הצטרפות לקבוצה. מדפים וגלגלים לעבודה יומיומית במסעדה.`
        : `עגלת מטבח נירוסטה ${dims || ''} במשלוח מיידי מהמלאי — לפי זמינות. ניידות בין עמדות; וודאו מידות מסדרון.`;

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

  const cursor = col.find({ category: 'עגלות מטבח מנירוסטה' }).project({ name: 1, seo: 1 });
  const products = await cursor.toArray();

  let updated = 0;
  let skipped = 0;

  for (const p of products) {
    const slug = p.seo?.slug || '';
    if (!slug) {
      skipped += 1;
      continue;
    }
    const mode = modeFromSlug(slug);
    const kind = trolleyKindFromSlug(slug);
    const dims = dimsFromName(p.name);
    const patch = buildPatch(dims, mode, kind);

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
