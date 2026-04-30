// tools/parse-stainless-text.js
// ממיר טקסט גולמי מה-PDF לרשימת מוצרים בסיסית.
// כאן לא חשוב הדיוק של כל שדה, רק שנקבל items עם name + dimensions + price אם יש.

module.exports = function parse(text) {
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
};
