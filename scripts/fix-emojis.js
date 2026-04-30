#!/usr/bin/env node
/**
 * Script to remove all emojis from scripts and replace with text labels
 * Run: node scripts/fix-emojis.js
 */

const fs = require('fs');
const path = require('path');

const EMOJI_REPLACEMENTS = {
  '[X]': '[X]',
  '[OK]': '[OK]',
  '[WARN]': '[WARN]',
  '[WARN]': '[WARN]',
  '[PKG]': '[PKG]',
  '[FIX]': '[FIX]',
  '[SAVE]': '[SAVE]',
  '[LOCK]': '[LOCK]',
  '[STATS]': '[STATS]',
  '[TIME]': '[TIME]',
  '[DONE]': '[DONE]',
  '[DIR]': '[DIR]',
  '[NOTE]': '[NOTE]',
  '[SYNC]': '[SYNC]',
  '[TAG]': '[TAG]',
  '[FOLDER]': '[FOLDER]',
  '[SEARCH]': '[SEARCH]',
  '[TIP]': '[TIP]',
  '[GO]': '[GO]',
  '[FILE]': '[FILE]',
  '[LOCK]': '[LOCK]',
  '[UNLOCK]': '[UNLOCK]',
  '[TOOL]': '[TOOL]',
  '[*]': '[*]',
  '[$]': '[$]',
  '[CARD]': '[CARD]',
  '[BELL]': '[BELL]',
  '[CLEAN]': '[CLEAN]',
  '[BIZ]': '[BIZ]',
  '[USER]': '[USER]',
  '[USERS]': '[USERS]',
  '[GEAR]': '[GEAR]',
  '[UP]': '[UP]',
  '[DOWN]': '[DOWN]',
  '[GEM]': '[GEM]',
  '[GIFT]': '[GIFT]',
  '[STAR]': '[STAR]',
  '[STAR]': '[STAR]',
  '[FIRE]': '[FIRE]',
  '[STRONG]': '[STRONG]',
  '[PIN]': '[PIN]',
  '[HOME]': '[HOME]',
  '[WORK]': '[WORK]',
  '[LIST]': '[LIST]',
  '[SHIELD]': '[SHIELD]',
  '[CHAT]': '[CHAT]',
  '[DEL]': '[DEL]',
  '[PIN]': '[PIN]',
  '[LINK]': '[LINK]',
  '[PC]': '[PC]',
  '[PHONE]': '[PHONE]',
  '[WEB]': '[WEB]',
  '[ART]': '[ART]',
  '[CAL]': '[CAL]',
  '[CLOCK]': '[CLOCK]',
  '[$]': '[$]',
  '[OUT]': '[OUT]',
  '[IN]': '[IN]',
  '[SHOP]': '[SHOP]',
  '[MALL]': '[MALL]',
  '[MAIL]': '[MAIL]',
  '[MOBILE]': '[MOBILE]',
  '[CART]': '[CART]',
  '[TARGET]': '[TARGET]',
  '[TROPHY]': '[TROPHY]',
  '[BOOK]': '[BOOK]',
  '[IMG]': '[IMG]',
  '[NEW]': '[NEW]',
  '[v]': '[v]',
  '[x]': '[x]',
  '[...]': '[...]',
  '[MSG]': '[MSG]',
  '[+]': '[+]',
  '[LOOP]': '[LOOP]',
  '[SKIP]': '[SKIP]',
  '[SKIP]': '[SKIP]',
  '[->]': '[->]',
  '[->]': '[->]',
  '[1]': '[1]',
  '[2]': '[2]',
  '[3]': '[3]',
  '[4]': '[4]',
  '[5]': '[5]',
  '[BUILD]': '[BUILD]',
  '[BUILD]': '[BUILD]',
  '[SHOP]': '[SHOP]',
  '[i]': '[i]',
  '[i]': '[i]',
};

function replaceEmojis(content) {
  let result = content;
  for (const [emoji, replacement] of Object.entries(EMOJI_REPLACEMENTS)) {
    result = result.split(emoji).join(replacement);
  }
  return result;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = replaceEmojis(content);
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log('[OK] Fixed:', filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error('[X] Error processing:', filePath, err.message);
    return false;
  }
}

function walkDir(dir, extensions = ['.js', '.jsx', '.ts', '.tsx']) {
  const files = [];
  
  function walk(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', '.next', 'backups'].includes(entry.name)) {
            walk(fullPath);
          }
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      // Skip inaccessible directories
    }
  }
  
  walk(dir);
  return files;
}

// Main
const projectRoot = path.join(__dirname, '..');
const files = walkDir(projectRoot);

console.log(`\nScanning ${files.length} files for emojis...\n`);

let fixed = 0;
for (const file of files) {
  if (processFile(file)) {
    fixed++;
  }
}

console.log(`\n[DONE] Fixed ${fixed} files\n`);
