const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

// ---- PARSER פנימי: טקסט PDF -> רשימת מוצרים ----
function parsePdfTextToProducts(text) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];
  let current = null;

  for (const line of lines) {
    // תחילת מוצר חדש (מספור או קוד)
    if (/^\d+[\.)]\s+/.test(line)) {
      if (current) items.push(current);
      current = {
        name: line.replace(/^\d+[\.)]\s+/, ''),
        dimensions: '',
        price: '',
      };
      continue;
    }

    if (!current) {
      current = { name: line, dimensions: '', price: '' };
    }

    // שורה עם מידות
    if (/מידות|尺寸|Size|CM|mm/i.test(line)) {
      current.dimensions = line.replace(/מידות[:\s]*/i, '').trim();
    }

    // שורה עם מחיר
    if (/USD|₪|\$|价格|Price/i.test(line)) {
      current.price = line.trim();
    }
  }

  if (current) items.push(current);

  return { items };
}

// ---- נתיבים ----
const pdfPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', 'export_vipo_products_ui', 'data', 'agents-catalog.pdf');

const outputJsonPath = path.join(
  __dirname,
  '..',
  'export_vipo_products_ui',
  'data',
  'products.json',
);

async function main() {
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF file not found:', pdfPath);
    process.exit(1);
  }

  console.log('📥 Reading Agents PDF from:', pdfPath);

  const buffer = fs.readFileSync(pdfPath);
  const pdfData = await pdf(buffer);

  const text = pdfData.text || '';
  const parsed = parsePdfTextToProducts(text);

  const allItems = Array.isArray(parsed.items) ? parsed.items : [];

  const itemsWithDimensions = allItems.filter((p) => {
    if (!p.dimensions) return false;
    return String(p.dimensions).trim().length > 0;
  });

  const cleaned = {
    items: itemsWithDimensions,
    currency: parsed.currency || 'USD',
    onlineSale: !!parsed.onlineSale,
  };

  console.log('-----------------------------------------');
  console.log('📊 Total parsed items:', allItems.length);
  console.log('🗑️ Removed (missing dimensions):', allItems.length - itemsWithDimensions.length);
  console.log('📦 Final items:', itemsWithDimensions.length);
  console.log('📁 Output JSON:', outputJsonPath);
  console.log('-----------------------------------------');

  fs.writeFileSync(outputJsonPath, JSON.stringify(cleaned, null, 2), 'utf8');
  console.log('✅ products.json created successfully.');
}

main().catch((err) => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
