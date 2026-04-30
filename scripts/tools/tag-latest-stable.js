#!/usr/bin/env node
/**
 * Tag the current HEAD as the latest stable release.
 * Usage:
 *   npm run tag:stable [tagName]
 * Default tag name: latest-stable
 */

const { execSync } = require('child_process');

function run(command) {
  return execSync(command, { stdio: 'pipe' }).toString().trim();
}

function main() {
  const tagName = process.argv[2] || 'latest-stable';

  const status = run('git status --porcelain');
  if (status) {
    console.error('❌ יש שינויים שלא נשמרו. בצע commit או stash לפני יצירת תג (tag).');
    process.exit(1);
  }

  const head = run('git rev-parse HEAD');
  console.log(`🔖 מתייג commit ${head} בשם ${tagName}`);

  try {
    run(`git tag -f ${tagName}`);
    console.log('✅ tag נוצר/עודכן בהצלחה');
  } catch (error) {
    console.error('❌ יצירת ה-tag נכשלה:', error.message || error);
    process.exit(1);
  }

  try {
    run(`git push origin ${tagName} --force`);
    console.log('📤 tag נשלח ל-GitHub (origin) בהצלחה');
  } catch (error) {
    console.error('⚠️ לא הצלחנו לדחוף את ה-tag ל-origin. תוכל להריץ: git push origin --tags');
    process.exitCode = 1;
  }
}

main();
