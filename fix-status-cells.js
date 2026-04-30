const fs = require('fs');

// קרא את הקובץ
let html = fs.readFileSync('public/_standalone/catalog-manager/index.html', 'utf8');

// מצא את כל השורות עם class="data-row"
const lines = html.split('\n');
let modified = false;

for (let i = 0; i < lines.length; i++) {
  // אם זו שורת data-row
  if (lines[i].includes('<tr class="data-row"')) {
    // בדוק אם בשורה הבאה אין כבר status-cell
    if (i + 1 < lines.length && !lines[i + 1].includes('status-cell')) {
      // הוסף status-cell אחרי ה-tr
      const indent = '          '; // 10 רווחים
      lines[i] = lines[i] + '\n' + indent + '<td class="status-cell"></td>';
      modified = true;
      console.log(`Added status-cell after line ${i + 1}`);
    }
  }
}

if (modified) {
  // שמור את הקובץ המעודכן
  fs.writeFileSync('public/_standalone/catalog-manager/index.html', lines.join('\n'), 'utf8');
  console.log('File updated successfully!');
} else {
  console.log('No changes needed - all rows already have status-cell');
}
