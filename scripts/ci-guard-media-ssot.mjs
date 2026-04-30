#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const allowedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const excludedDirs = new Set([
  '.git',
  '.next',
  'node_modules',
  'backups',
  'reports',
  'public',
  'new1',
  'vipo-crm',
  'whatsapp-server',
  'export_vipo_products_ui',
  'vipo_products_ui_export',
]);

const ignoredFiles = new Set([
  path.join(rootDir, 'scripts', 'ci-guard-media-ssot.mjs'),
]);

const violations = [];

function shouldIgnoreDir(dirName) {
  return excludedDirs.has(dirName);
}

function shouldScanFile(filePath) {
  if (ignoredFiles.has(filePath)) return false;
  return allowedExtensions.has(path.extname(filePath));
}

function findMatchingBrace(content, startIndex) {
  let depth = 1;
  let i = startIndex + 1;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;

  while (i < content.length) {
    const ch = content[i];
    const next = content[i + 1];

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
      }
      i += 1;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (inSingle) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === "'") {
        inSingle = false;
      }
      i += 1;
      continue;
    }

    if (inDouble) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === '"') {
        inDouble = false;
      }
      i += 1;
      continue;
    }

    if (inTemplate) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === '`') {
        inTemplate = false;
      }
      i += 1;
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 2;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 2;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      i += 1;
      continue;
    }

    if (ch === '`') {
      inTemplate = true;
      i += 1;
      continue;
    }

    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }

    i += 1;
  }

  return -1;
}

function buildMediaBlocks(content) {
  const blocks = [];
  const regex = /\bmedia\s*:\s*\{/g;
  let match;

  while ((match = regex.exec(content))) {
    const braceIndex = content.indexOf('{', match.index);
    if (braceIndex === -1) continue;
    const endIndex = findMatchingBrace(content, braceIndex);
    if (endIndex !== -1) {
      blocks.push([braceIndex, endIndex]);
    }
  }

  return blocks;
}

function isIndexInBlocks(index, blocks) {
  return blocks.some(([start, end]) => index >= start && index <= end);
}

function getLineInfo(content, index) {
  const lineStart = content.lastIndexOf('\n', index - 1) + 1;
  const lineEnd = content.indexOf('\n', index);
  const safeLineEnd = lineEnd === -1 ? content.length : lineEnd;
  const lineText = content.slice(lineStart, safeLineEnd);
  const lineNumber = content.slice(0, index).split(/\r?\n/).length;
  const columnNumber = index - lineStart + 1;
  return { lineNumber, columnNumber, lineText };
}

function recordViolation({ filePath, matchIndex, matchText, reason, content }) {
  const { lineNumber, columnNumber, lineText } = getLineInfo(content, matchIndex);
  violations.push({
    filePath,
    lineNumber,
    columnNumber,
    matchText,
    reason,
    lineText: lineText.trim(),
  });
}

function scanForRegex({ content, filePath, regex, reason }) {
  let match;
  while ((match = regex.exec(content))) {
    recordViolation({
      filePath,
      matchIndex: match.index,
      matchText: match[0],
      reason,
      content,
    });
  }
}

function scanVideoUrl({ content, filePath }) {
  const mediaBlocks = buildMediaBlocks(content);
  const regex = /\bvideoUrl\b/g;
  let match;

  while ((match = regex.exec(content))) {
    const index = match.index;
    if (isIndexInBlocks(index, mediaBlocks)) {
      continue;
    }

    const prevChar = content[index - 1];
    if (prevChar !== '.') {
      continue;
    }

    const prefix = content.slice(0, index);
    if (/\bmedia\??\.$/.test(prefix)) {
      continue;
    }

    recordViolation({
      filePath,
      matchIndex: index,
      matchText: match[0],
      reason: 'videoUrl outside media',
      content,
    });
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  scanForRegex({
    content,
    filePath,
    regex: /product\.image\b/g,
    reason: 'legacy product.image',
  });

  scanForRegex({
    content,
    filePath,
    regex: /product\.images\b/g,
    reason: 'legacy product.images',
  });

  scanForRegex({
    content,
    filePath,
    regex: /\bimageUrl\b/g,
    reason: 'legacy imageUrl',
  });

  scanVideoUrl({ content, filePath });
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldIgnoreDir(entry.name)) continue;
      walk(fullPath);
      continue;
    }
    if (!shouldScanFile(fullPath)) continue;
    scanFile(fullPath);
  }
}

walk(rootDir);

if (violations.length) {
  console.error('❌ Media SSOT guard failed. Found legacy media references:');
  for (const violation of violations) {
    console.error(
      `- ${path.relative(rootDir, violation.filePath)}:${violation.lineNumber}:${violation.columnNumber} ` +
        `[${violation.reason}] ${violation.lineText}`,
    );
  }
  process.exit(1);
}

console.log('✅ Media SSOT guard passed (no legacy references found).');
