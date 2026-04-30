/**
 * שחזור 140 מוצרים + קטגוריות לחנות "מחסני נירוסטה"
 * מקור: קטלוג מוצרים מ-index.html (19 מוצרי טבלה + 121 מודלים חדשים)
 *
 * Usage:
 *   node scripts/restore-machsanei-products.mjs          # production DB
 *   node scripts/restore-machsanei-products.mjs --local   # local DB
 */
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

const isLocal = process.argv.includes('--local');
const envFile = isLocal ? '.env.local' : '.env.production.local';
dotenv.config({ path: path.resolve(process.cwd(), envFile), override: true });

const MONGO_URI = process.env.MONGODB_URI;
const MONGO_DB = process.env.MONGODB_DB;
const TENANT_ID = '6980e7a13862e2a30b667a62';

// Pricing settings (from stainless_products_backup.json)
const RATE = 3.7;        // USD -> ILS
const FACTOR = 3;         // regular markup
const GROUP_FACTOR = 2;   // group markup

function calcPrice(usd) {
  if (!usd || usd <= 0) return null;
  return Math.round(usd * RATE * FACTOR);
}
function calcGroupPrice(usd) {
  if (!usd || usd <= 0) return null;
  return Math.round(usd * RATE * GROUP_FACTOR);
}

function parseDims(size) {
  // "100×60×90" -> {length:100, width:60, height:90}
  const parts = size.replace(/×/g, 'x').split('x').map(Number);
  return {
    length: parts[0] || null,
    width: parts[1] || null,
    height: parts[2] || null,
  };
}

function generateSlug(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

// ================================================================
// Product definitions
// ================================================================

// --- HTML table products (19 items, 60cm width) ---
const htmlProducts = [
  // 2-LAYERS WORKTABLE (60cm)
  { id: '2L-100-60-90', catHe: 'שכבות – שולחן עבודה', catEn: '2-LAYERS WORKTABLE', size: '100×60×90', usd: 57.14 },
  { id: '2L-120-60-90', catHe: 'שכבות – שולחן עבודה', catEn: '2-LAYERS WORKTABLE', size: '120×60×90', usd: 62.50 },
  { id: '2L-140-60-90', catHe: 'שכבות – שולחן עבודה', catEn: '2-LAYERS WORKTABLE', size: '140×60×90', usd: 67.86 },
  { id: '2L-160-60-90', catHe: 'שכבות – שולחן עבודה', catEn: '2-LAYERS WORKTABLE', size: '160×60×90', usd: 73.71 },
  { id: '2L-180-60-90', catHe: 'שכבות – שולחן עבודה', catEn: '2-LAYERS WORKTABLE', size: '180×60×90', usd: 78.57 },
  { id: '2L-200-60-90', catHe: 'שכבות – שולחן עבודה', catEn: '2-LAYERS WORKTABLE', size: '200×60×90', usd: 86.79 },
  // 3-LAYERS WORKTABLE (60cm)
  { id: '3L-60-60-90',  catHe: 'שכבות – שולחן עבודה', catEn: '3-LAYERS WORKTABLE', size: '60×60×90',  usd: 58.93 },
  { id: '3L-80-60-90',  catHe: 'שכבות – שולחן עבודה', catEn: '3-LAYERS WORKTABLE', size: '80×60×90',  usd: 62.50 },
  { id: '3L-100-60-90', catHe: 'שכבות – שולחן עבודה', catEn: '3-LAYERS WORKTABLE', size: '100×60×90', usd: 66.07 },
  { id: '3L-120-60-90', catHe: 'שכבות – שולחן עבודה', catEn: '3-LAYERS WORKTABLE', size: '120×60×90', usd: 73.21 },
  { id: '3L-140-60-90', catHe: 'שכבות – שולחן עבודה', catEn: '3-LAYERS WORKTABLE', size: '140×60×90', usd: 77.57 },
  { id: '3L-160-60-90', catHe: 'שכבות – שולחן עבודה', catEn: '3-LAYERS WORKTABLE', size: '160×60×90', usd: 83.21 },
  { id: '3L-180-60-90', catHe: 'שכבות – שולחן עבודה', catEn: '3-LAYERS WORKTABLE', size: '180×60×90', usd: 92.86 },
  { id: '3L-200-60-90', catHe: 'שכבות – שולחן עבודה', catEn: '3-LAYERS WORKTABLE', size: '200×60×90', usd: 101.79 },
  // SINGLE SINK
  { id: 'SS-60-60-90',  catHe: 'כיור יחיד', catEn: 'SINGLE SINK', size: '60×60×90', usd: 33.00 },
  // WORK CABINET
  { id: 'WC-100-60-90', catHe: 'ארון עבודה', catEn: 'WORK CABINET', size: '100×60×90', usd: 86.00 },
  { id: 'WC-120-60-90', catHe: 'ארון עבודה', catEn: 'WORK CABINET', size: '120×60×90', usd: 81.00 },
  { id: 'WC-150-60-90', catHe: 'ארון עבודה', catEn: 'WORK CABINET', size: '150×60×90', usd: 113.00 },
  { id: 'WC-180-60-90', catHe: 'ארון עבודה', catEn: 'WORK CABINET', size: '180×60×90', usd: 93.00 },
];

// --- mk() products (121 items) ---
const mkProducts = [
  // כיור יחיד (Single Sink) - 4
  { id: 'SINK-SINGLE-500-500', catHe: 'כיור יחיד', catEn: 'Single Sink', size: '500×500×900', usd: 0 },
  { id: 'SINK-SINGLE-600-600', catHe: 'כיור יחיד', catEn: 'Single Sink', size: '600×600×900', usd: 0 },
  { id: 'SINK-SINGLE-700-700', catHe: 'כיור יחיד', catEn: 'Single Sink', size: '700×700×900', usd: 0 },
  { id: 'SINK-SINGLE-750-750', catHe: 'כיור יחיד', catEn: 'Single Sink', size: '750×750×900', usd: 0 },

  // כיור כפול/יחיד עם משטח (Double Sink/Single Sink with Board) - 7
  { id: 'SINK-BOARD-1000-500', catHe: 'כיור כפול/יחיד עם משטח', catEn: 'Double Sink/Single Sink with Board', size: '1000×500×900', usd: 0 },
  { id: 'SINK-BOARD-1200-600', catHe: 'כיור כפול/יחיד עם משטח', catEn: 'Double Sink/Single Sink with Board', size: '1200×600×900', usd: 0 },
  { id: 'SINK-BOARD-1200-700', catHe: 'כיור כפול/יחיד עם משטח', catEn: 'Double Sink/Single Sink with Board', size: '1200×700×900', usd: 0 },
  { id: 'SINK-BOARD-1400-700', catHe: 'כיור כפול/יחיד עם משטח', catEn: 'Double Sink/Single Sink with Board', size: '1400×700×900', usd: 0 },
  { id: 'SINK-BOARD-1200-750', catHe: 'כיור כפול/יחיד עם משטח', catEn: 'Double Sink/Single Sink with Board', size: '1200×750×900', usd: 0 },
  { id: 'SINK-BOARD-1500-700', catHe: 'כיור כפול/יחיד עם משטח', catEn: 'Double Sink/Single Sink with Board', size: '1500×700×900', usd: 0 },
  { id: 'SINK-BOARD-1500-750', catHe: 'כיור כפול/יחיד עם משטח', catEn: 'Double Sink/Single Sink with Board', size: '1500×750×900', usd: 0 },

  // כיור משולש/כפול עם משטח (Triple Sink/Double Sink with Board) - 6
  { id: 'SINK-TRIPLE-1400-500', catHe: 'כיור משולש/כפול עם משטח', catEn: 'Triple Sink/Double Sink with Board', size: '1400×500×900', usd: 0 },
  { id: 'SINK-TRIPLE-1500-500', catHe: 'כיור משולש/כפול עם משטח', catEn: 'Triple Sink/Double Sink with Board', size: '1500×500×900', usd: 0 },
  { id: 'SINK-TRIPLE-1500-600', catHe: 'כיור משולש/כפול עם משטח', catEn: 'Triple Sink/Double Sink with Board', size: '1500×600×900', usd: 0 },
  { id: 'SINK-TRIPLE-1800-600', catHe: 'כיור משולש/כפול עם משטח', catEn: 'Triple Sink/Double Sink with Board', size: '1800×600×900', usd: 0 },
  { id: 'SINK-TRIPLE-1800-700', catHe: 'כיור משולש/כפול עם משטח', catEn: 'Triple Sink/Double Sink with Board', size: '1800×700×900', usd: 0 },
  { id: 'SINK-TRIPLE-1800-750', catHe: 'כיור משולש/כפול עם משטח', catEn: 'Triple Sink/Double Sink with Board', size: '1800×750×900', usd: 0 },

  // 2 שכבות – שולחן עבודה (2-LAYERS WORKTABLE 80cm) - 8
  { id: '2L-60-80-90',  catHe: '2 שכבות – שולחן עבודה', catEn: '2-LAYERS WORKTABLE', size: '60×80×90',  usd: 53.57 },
  { id: '2L-80-80-90',  catHe: '2 שכבות – שולחן עבודה', catEn: '2-LAYERS WORKTABLE', size: '80×80×90',  usd: 57.14 },
  { id: '2L-100-80-90', catHe: '2 שכבות – שולחן עבודה', catEn: '2-LAYERS WORKTABLE', size: '100×80×90', usd: 60.71 },
  { id: '2L-120-80-90', catHe: '2 שכבות – שולחן עבודה', catEn: '2-LAYERS WORKTABLE', size: '120×80×90', usd: 66.07 },
  { id: '2L-140-80-90', catHe: '2 שכבות – שולחן עבודה', catEn: '2-LAYERS WORKTABLE', size: '140×80×90', usd: 71.43 },
  { id: '2L-160-80-90', catHe: '2 שכבות – שולחן עבודה', catEn: '2-LAYERS WORKTABLE', size: '160×80×90', usd: 76.79 },
  { id: '2L-180-80-90', catHe: '2 שכבות – שולחן עבודה', catEn: '2-LAYERS WORKTABLE', size: '180×80×90', usd: 82.14 },
  { id: '2L-200-80-90', catHe: '2 שכבות – שולחן עבודה', catEn: '2-LAYERS WORKTABLE', size: '200×80×90', usd: 89.29 },

  // 3 שכבות – שולחן עבודה (3-LAYERS WORKTABLE 80cm) - 8
  { id: '3L-60-80-90',  catHe: '3 שכבות – שולחן עבודה', catEn: '3-LAYERS WORKTABLE', size: '60×80×90',  usd: 62.50 },
  { id: '3L-80-80-90',  catHe: '3 שכבות – שולחן עבודה', catEn: '3-LAYERS WORKTABLE', size: '80×80×90',  usd: 66.07 },
  { id: '3L-100-80-90', catHe: '3 שכבות – שולחן עבודה', catEn: '3-LAYERS WORKTABLE', size: '100×80×90', usd: 69.64 },
  { id: '3L-120-80-90', catHe: '3 שכבות – שולחן עבודה', catEn: '3-LAYERS WORKTABLE', size: '120×80×90', usd: 76.79 },
  { id: '3L-140-80-90', catHe: '3 שכבות – שולחן עבודה', catEn: '3-LAYERS WORKTABLE', size: '140×80×90', usd: 82.14 },
  { id: '3L-160-80-90', catHe: '3 שכבות – שולחן עבודה', catEn: '3-LAYERS WORKTABLE', size: '160×80×90', usd: 91.07 },
  { id: '3L-180-80-90', catHe: '3 שכבות – שולחן עבודה', catEn: '3-LAYERS WORKTABLE', size: '180×80×90', usd: 96.43 },
  { id: '3L-200-80-90', catHe: '3 שכבות – שולחן עבודה', catEn: '3-LAYERS WORKTABLE', size: '200×80×90', usd: 105.36 },

  // שולחן עבודה – 2/3 שכבות (Worktable 60cm) - 9
  { id: 'WT-60-60-85',  catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '60×60×85', usd: 0 },
  { id: 'WT-80-60-85',  catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '80×60×85', usd: 0 },
  { id: 'WT-100-60-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '100×60×85', usd: 0 },
  { id: 'WT-120-60-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '120×60×85', usd: 0 },
  { id: 'WT-140-60-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '140×60×85', usd: 0 },
  { id: 'WT-150-60-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '150×60×85', usd: 0 },
  { id: 'WT-160-60-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '160×60×85', usd: 0 },
  { id: 'WT-180-60-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '180×60×85', usd: 0 },
  { id: 'WT-200-60-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '200×60×85', usd: 0 },

  // שולחן עבודה – 2/3 שכבות (Worktable 70cm) - 9
  { id: 'WT-60-70-85',  catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '60×70×85', usd: 0 },
  { id: 'WT-80-70-85',  catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '80×70×85', usd: 0 },
  { id: 'WT-100-70-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '100×70×85', usd: 0 },
  { id: 'WT-120-70-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '120×70×85', usd: 0 },
  { id: 'WT-140-70-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '140×70×85', usd: 0 },
  { id: 'WT-150-70-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '150×70×85', usd: 0 },
  { id: 'WT-160-70-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '160×70×85', usd: 0 },
  { id: 'WT-180-70-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '180×70×85', usd: 0 },
  { id: 'WT-200-70-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '200×70×85', usd: 0 },

  // שולחן עבודה – 2/3 שכבות (Worktable 80cm) - 8
  { id: 'WT-80-80-85',  catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '80×80×85', usd: 0 },
  { id: 'WT-100-80-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '100×80×85', usd: 0 },
  { id: 'WT-120-80-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '120×80×85', usd: 0 },
  { id: 'WT-140-80-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '140×80×85', usd: 0 },
  { id: 'WT-150-80-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '150×80×85', usd: 0 },
  { id: 'WT-160-80-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '160×80×85', usd: 0 },
  { id: 'WT-180-80-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '180×80×85', usd: 0 },
  { id: 'WT-200-80-85', catHe: 'שולחן עבודה – 2/3 שכבות', catEn: 'Worktable', size: '200×80×85', usd: 0 },

  // עגלות מטבח (Kitchen Trolley) - 14
  { id: 'TROLLEY-2T-S-400-750-800',   catHe: 'עגלות מטבח', catEn: 'Kitchen Trolley', size: '400×750×800', usd: 0 },
  { id: 'TROLLEY-2T-M-450-880-930',   catHe: 'עגלות מטבח', catEn: 'Kitchen Trolley', size: '450×880×930', usd: 0 },
  { id: 'TROLLEY-2T-L-500-930-920',   catHe: 'עגלות מטבח', catEn: 'Kitchen Trolley', size: '500×930×920', usd: 0 },
  { id: 'TROLLEY-3T-S-400-750-800',   catHe: 'עגלות מטבח', catEn: 'Kitchen Trolley', size: '400×750×800', usd: 0 },
  { id: 'TROLLEY-3T-M-450-880-930',   catHe: 'עגלות מטבח', catEn: 'Kitchen Trolley', size: '450×880×930', usd: 0 },
  { id: 'TROLLEY-3T-L-500-930-920',   catHe: 'עגלות מטבח', catEn: 'Kitchen Trolley', size: '500×930×920', usd: 0 },
  { id: 'TROLLEY-2T-XL-550-1000-930', catHe: 'עגלות מטבח', catEn: 'Kitchen Trolley', size: '550×1000×930', usd: 0 },
  { id: 'TROLLEY-3T-XL-550-1000-930', catHe: 'עגלות מטבח', catEn: 'Kitchen Trolley', size: '550×1000×930', usd: 0 },
  { id: 'TROLLEY-4T-XL-550-1000-1200', catHe: 'עגלות מטבח', catEn: 'Kitchen Trolley', size: '550×1000×1200', usd: 0 },
  { id: 'TROLLEY-3T-XXL-700-1100-930', catHe: 'עגלות מטבח', catEn: 'Kitchen Trolley', size: '700×1100×930', usd: 0 },
  { id: 'TROLLEY-4T-XXL-700-1100-1200', catHe: 'עגלות מטבח', catEn: 'Kitchen Trolley', size: '700×1100×1200', usd: 0 },
  { id: 'TROLLEY-PLASTIC-S-310-760-780', catHe: 'עגלות מטבח', catEn: 'Kitchen Trolley', size: '310×760×780', usd: 0 },
  { id: 'TROLLEY-PLASTIC-M-410-810-930', catHe: 'עגלות מטבח', catEn: 'Kitchen Trolley', size: '410×810×930', usd: 0 },
  { id: 'TROLLEY-PLASTIC-L-500-900-930', catHe: 'עגלות מטבח', catEn: 'Kitchen Trolley', size: '500×900×930', usd: 0 },

  // עגלת משטח מתקפלת (Folding Flat Cart) - 10
  { id: 'FLAT-FOLD-500-750-850',  catHe: 'עגלת משטח מתקפלת', catEn: 'Folding Flat Cart', size: '500×750×850', usd: 0 },
  { id: 'FLAT-FOLD-500-1000-850', catHe: 'עגלת משטח מתקפלת', catEn: 'Folding Flat Cart', size: '500×1000×850', usd: 0 },
  { id: 'FLAT-FOLD-550-800-850',  catHe: 'עגלת משטח מתקפלת', catEn: 'Folding Flat Cart', size: '550×800×850', usd: 0 },
  { id: 'FLAT-FOLD-550-900-850',  catHe: 'עגלת משטח מתקפלת', catEn: 'Folding Flat Cart', size: '550×900×850', usd: 0 },
  { id: 'FLAT-FOLD-550-1000-850', catHe: 'עגלת משטח מתקפלת', catEn: 'Folding Flat Cart', size: '550×1000×850', usd: 0 },
  { id: 'FLAT-FOLD-550-1200-850', catHe: 'עגלת משטח מתקפלת', catEn: 'Folding Flat Cart', size: '550×1200×850', usd: 0 },
  { id: 'FLAT-FOLD-600-800-850',  catHe: 'עגלת משטח מתקפלת', catEn: 'Folding Flat Cart', size: '600×800×850', usd: 0 },
  { id: 'FLAT-FOLD-600-900-850',  catHe: 'עגלת משטח מתקפלת', catEn: 'Folding Flat Cart', size: '600×900×850', usd: 0 },
  { id: 'FLAT-FOLD-600-1000-850', catHe: 'עגלת משטח מתקפלת', catEn: 'Folding Flat Cart', size: '600×1000×850', usd: 0 },
  { id: 'FLAT-FOLD-600-1200-850', catHe: 'עגלת משטח מתקפלת', catEn: 'Folding Flat Cart', size: '600×1200×850', usd: 0 },

  // עגלת משטח מורכבת (Assembled Flat Cart) - 6
  { id: 'FLAT-ASSEM-550-800-850',  catHe: 'עגלת משטח מורכבת', catEn: 'Assembled Flat Cart', size: '550×800×850', usd: 0 },
  { id: 'FLAT-ASSEM-550-900-850',  catHe: 'עגלת משטח מורכבת', catEn: 'Assembled Flat Cart', size: '550×900×850', usd: 0 },
  { id: 'FLAT-ASSEM-550-1000-850', catHe: 'עגלת משטח מורכבת', catEn: 'Assembled Flat Cart', size: '550×1000×850', usd: 0 },
  { id: 'FLAT-ASSEM-600-900-850',  catHe: 'עגלת משטח מורכבת', catEn: 'Assembled Flat Cart', size: '600×900×850', usd: 0 },
  { id: 'FLAT-ASSEM-600-1000-850', catHe: 'עגלת משטח מורכבת', catEn: 'Assembled Flat Cart', size: '600×1000×850', usd: 0 },
  { id: 'FLAT-ASSEM-800-1200-850', catHe: 'עגלת משטח מורכבת', catEn: 'Assembled Flat Cart', size: '800×1200×850', usd: 0 },

  // עגלת תבניות (Pan Cart) - 10
  { id: 'PAN-A-12-630-460-1400', catHe: 'עגלת תבניות', catEn: 'Pan Cart', size: '630×460×1400', usd: 0 },
  { id: 'PAN-A-15-630-460-1700', catHe: 'עגלת תבניות', catEn: 'Pan Cart', size: '630×460×1700', usd: 0 },
  { id: 'PAN-A-24-630-865-1400', catHe: 'עגלת תבניות', catEn: 'Pan Cart', size: '630×865×1400', usd: 0 },
  { id: 'PAN-A-30-630-865-1700', catHe: 'עגלת תבניות', catEn: 'Pan Cart', size: '630×865×1700', usd: 0 },
  { id: 'PAN-B-12-630-460-1400', catHe: 'עגלת תבניות', catEn: 'Pan Cart', size: '630×460×1400', usd: 0 },
  { id: 'PAN-B-15-630-460-1700', catHe: 'עגלת תבניות', catEn: 'Pan Cart', size: '630×460×1700', usd: 0 },
  { id: 'PAN-C-12-630-460-1400', catHe: 'עגלת תבניות', catEn: 'Pan Cart', size: '630×460×1400', usd: 0 },
  { id: 'PAN-C-15-630-460-1700', catHe: 'עגלת תבניות', catEn: 'Pan Cart', size: '630×460×1700', usd: 0 },
  { id: 'PAN-C-24-630-865-1400', catHe: 'עגלת תבניות', catEn: 'Pan Cart', size: '630×865×1400', usd: 0 },
  { id: 'PAN-C-30-630-865-1700', catHe: 'עגלת תבניות', catEn: 'Pan Cart', size: '630×865×1700', usd: 0 },

  // מדפי מטבח (Kitchen Shelf) - 6
  { id: 'SHELF-4T-1200-500-1550', catHe: 'מדפי מטבח', catEn: 'Kitchen Shelf', size: '1200×500×1550', usd: 85 },
  { id: 'SHELF-4T-1500-500-1550', catHe: 'מדפי מטבח', catEn: 'Kitchen Shelf', size: '1500×500×1550', usd: 93 },
  { id: 'SHELF-4T-1800-500-1550', catHe: 'מדפי מטבח', catEn: 'Kitchen Shelf', size: '1800×500×1550', usd: 105 },
  { id: 'SHELF-5T-1200-500-1800', catHe: 'מדפי מטבח', catEn: 'Kitchen Shelf', size: '1200×500×1800', usd: 102 },
  { id: 'SHELF-5T-1500-500-1800', catHe: 'מדפי מטבח', catEn: 'Kitchen Shelf', size: '1500×500×1800', usd: 111 },
  { id: 'SHELF-5T-1800-500-1800', catHe: 'מדפי מטבח', catEn: 'Kitchen Shelf', size: '1800×500×1800', usd: 122 },

  // ארון שולחן עבודה (Worktable Cabinet) - 10
  { id: 'CAB-800-600-800',  catHe: 'ארון שולחן עבודה', catEn: 'Worktable Cabinet', size: '800×600×800', usd: 0 },
  { id: 'CAB-1000-600-800', catHe: 'ארון שולחן עבודה', catEn: 'Worktable Cabinet', size: '1000×600×800', usd: 0 },
  { id: 'CAB-1200-600-800', catHe: 'ארון שולחן עבודה', catEn: 'Worktable Cabinet', size: '1200×600×800', usd: 0 },
  { id: 'CAB-1500-600-800', catHe: 'ארון שולחן עבודה', catEn: 'Worktable Cabinet', size: '1500×600×800', usd: 0 },
  { id: 'CAB-1800-600-800', catHe: 'ארון שולחן עבודה', catEn: 'Worktable Cabinet', size: '1800×600×800', usd: 0 },
  { id: 'CAB-800-800-800',  catHe: 'ארון שולחן עבודה', catEn: 'Worktable Cabinet', size: '800×800×800', usd: 0 },
  { id: 'CAB-1000-800-800', catHe: 'ארון שולחן עבודה', catEn: 'Worktable Cabinet', size: '1000×800×800', usd: 0 },
  { id: 'CAB-1200-800-800', catHe: 'ארון שולחן עבודה', catEn: 'Worktable Cabinet', size: '1200×800×800', usd: 0 },
  { id: 'CAB-1500-800-800', catHe: 'ארון שולחן עבודה', catEn: 'Worktable Cabinet', size: '1500×800×800', usd: 0 },
  { id: 'CAB-1800-800-800', catHe: 'ארון שולחן עבודה', catEn: 'Worktable Cabinet', size: '1800×800×800', usd: 0 },

  // מלכודת שומן (Grease Trap) - 6
  { id: 'GREASE-JTD-Y50-500-290-290',     catHe: 'מלכודת שומן', catEn: 'Grease Trap', size: '500×290×290', usd: 0 },
  { id: 'GREASE-JTD-Y60-600-390-290',     catHe: 'מלכודת שומן', catEn: 'Grease Trap', size: '600×390×290', usd: 0 },
  { id: 'GREASE-JTD-Y80-800-400-400',     catHe: 'מלכודת שומן', catEn: 'Grease Trap', size: '800×400×400', usd: 0 },
  { id: 'GREASE-JTD-Y100-1000-600-400',   catHe: 'מלכודת שומן', catEn: 'Grease Trap', size: '1000×600×400', usd: 0 },
  { id: 'GREASE-JTD-Y120-1-1200-600-450', catHe: 'מלכודת שומן', catEn: 'Grease Trap', size: '1200×600×450', usd: 0 },
  { id: 'GREASE-JTD-Y120-2-1200-600-600', catHe: 'מלכודת שומן', catEn: 'Grease Trap', size: '1200×600×600', usd: 0 },
];

// ================================================================
// Merge all products
// ================================================================
const ALL_PRODUCTS = [...htmlProducts, ...mkProducts];

// Default description for products
const defaultDesc = 'מוצר נירוסטה מקצועי למטבחים תעשייתיים, מסעדות, קייטרינג ומפעלי מזון.';
const defaultFullDesc = 'מוצר נירוסטה איכותי ומקצועי המיועד לעבודה יומיומית במטבחים תעשייתיים, מסעדות, קייטרינג, אולמות ייצור ומפעלי מזון. עשוי נירוסטה עמידה בפני מים, חום וחומרי ניקוי חזקים, קל לניקוי, חזק במיוחד ומתאים לעבודה אינטנסיבית לאורך שנים.';

function buildProductDoc(p, idx) {
  const dims = parseDims(p.size);
  const hasPrice = p.usd > 0;
  const regularPrice = hasPrice ? calcPrice(p.usd) : 1; // min 1 for validation
  const groupPrice = hasPrice ? calcGroupPrice(p.usd) : 1;

  const productName = `${p.catHe} ${p.size} ס"מ`;
  const seoSlug = generateSlug(`${p.catEn}-${p.id}`);

  return {
    tenantId: new ObjectId(TENANT_ID),
    sku: p.id,
    name: productName,
    description: defaultDesc,
    fullDescription: defaultFullDesc,
    category: p.catHe,
    subCategory: p.catEn,
    templateKey: '',
    titlePrefix: p.catHe,
    tags: ['נירוסטה', 'ציוד מקצועי'],
    faq: '',
    structuredData: '',
    price: regularPrice,
    groupPrice: groupPrice,
    originalPrice: regularPrice,
    commission: 0,
    currency: 'ILS',
    type: 'group',
    purchaseType: 'group',
    groupPurchaseType: 'shared_container',
    containerScope: 'shared',
    groupPurchaseDetails: {
      closingDays: 40,
      shippingDays: 60,
      minQuantity: 0,
      currentQuantity: 0,
    },
    media: { images: [], videoUrl: '' },
    inStock: true,
    stockCount: 0,
    inventoryMode: 'group',
    rating: 4.5,
    reviews: 0,
    features: [
      'נירוסטה איכותית 304/201',
      'עמיד בפני חלודה וקורוזיה',
      'קל לניקוי ותחזוקה',
      'מתאים לשימוש תעשייתי אינטנסיבי',
    ],
    specs: `מידות: ${p.size} ס"מ`,
    suitableFor: 'מטבחים תעשייתיים, מסעדות, בתי מלון, קייטרינג, מעבדות מזון, בתי חולים',
    whyChooseUs: 'איכות גבוהה, אחריות מלאה, שירות מקצועי, משלוח מהיר, מחירים תחרותיים',
    warranty: 'שנת אחריות מלאה על כל פגם בייצור',
    seo: {
      slug: seoSlug,
      slugPrefix: generateSlug(p.catEn),
      metaTitle: `${productName} | מחסני נירוסטה`,
      metaDescription: `${productName} - ${defaultDesc}`,
      keywords: ['נירוסטה', p.catHe, p.catEn],
    },
    stainless: {
      length: dims.length,
      width: dims.width,
      height: dims.height,
      thickness: '1.2',
      material: '304',
      layers: p.id.startsWith('3L') ? 3 : p.id.startsWith('2L') ? 2 : null,
      hasMiddleShelf: p.id.startsWith('3L'),
    },
    status: 'published',
    active: true,
    isFeatured: false,
    position: idx,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function main() {
  console.log(`\n🔌 Connecting to ${isLocal ? 'LOCAL' : 'PRODUCTION'} DB...`);
  console.log(`   URI: ${MONGO_URI?.substring(0, 40)}...`);
  console.log(`   DB:  ${MONGO_DB}`);

  const client = new MongoClient(MONGO_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 30000 });
  await client.connect();
  const db = client.db(MONGO_DB);

  // Verify tenant exists
  const tenant = await db.collection('tenants').findOne({ _id: new ObjectId(TENANT_ID) });
  if (!tenant) {
    console.error('❌ Tenant not found:', TENANT_ID);
    process.exit(1);
  }
  console.log(`✅ Tenant: ${tenant.name} (${tenant.slug})`);

  // Check existing products
  const existingCount = await db.collection('products').countDocuments({ tenantId: new ObjectId(TENANT_ID) });
  if (existingCount > 0) {
    console.log(`⚠️  Already ${existingCount} products for this tenant. Skipping duplicates by SKU.`);
  }

  const existingSkus = new Set();
  if (existingCount > 0) {
    const existing = await db.collection('products').find(
      { tenantId: new ObjectId(TENANT_ID) },
      { projection: { sku: 1 } }
    ).toArray();
    existing.forEach(p => existingSkus.add(p.sku));
  }

  // Build product documents
  console.log(`\n📦 Preparing ${ALL_PRODUCTS.length} products...`);
  const docs = [];
  for (let i = 0; i < ALL_PRODUCTS.length; i++) {
    const p = ALL_PRODUCTS[i];
    if (existingSkus.has(p.id)) continue;
    docs.push(buildProductDoc(p, i));
  }

  if (docs.length === 0) {
    console.log('✅ All products already exist. Nothing to insert.');
  } else {
    console.log(`📥 Inserting ${docs.length} products...`);
    const result = await db.collection('products').insertMany(docs, { ordered: false });
    console.log(`✅ Inserted ${result.insertedCount} products`);
  }

  // Create categories
  console.log('\n📂 Creating categories...');
  const categoryNames = [...new Set(ALL_PRODUCTS.map(p => p.catHe))];
  let catCreated = 0;
  for (const catName of categoryNames) {
    const exists = await db.collection('categories').findOne({
      name: catName,
      tenantId: new ObjectId(TENANT_ID),
    });
    if (!exists) {
      await db.collection('categories').insertOne({
        name: catName,
        tenantId: new ObjectId(TENANT_ID),
        slug: generateSlug(catName),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      catCreated++;
    }
  }
  console.log(`✅ Categories: ${catCreated} created, ${categoryNames.length} total`);
  console.log('   Categories:', categoryNames.join(', '));

  // Final counts
  const finalProducts = await db.collection('products').countDocuments({ tenantId: new ObjectId(TENANT_ID) });
  const finalCategories = await db.collection('categories').countDocuments({ tenantId: new ObjectId(TENANT_ID) });
  console.log(`\n========================================`);
  console.log(`🎉 שחזור הושלם!`);
  console.log(`   מוצרים: ${finalProducts}`);
  console.log(`   קטגוריות: ${finalCategories}`);
  console.log(`========================================\n`);

  await client.close();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
