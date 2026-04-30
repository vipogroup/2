import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_DIR = path.resolve(__dirname, '..', 'app', 'api');
const METHOD_NAMES = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

function collectRouteFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRouteFiles(fullPath));
    } else if (entry.isFile() && /route\.(js|ts)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function insertImport(content) {
  if (content.includes("withErrorLogging")) {
    return content;
  }

  const lines = content.split('\n');
  let insertIndex = 0;

  // Skip shebang, directives like 'use server';
  while (insertIndex < lines.length) {
    const trimmed = lines[insertIndex].trim();
    if (trimmed === '' || trimmed === '\r') {
      insertIndex += 1;
      continue;
    }
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*')
    ) {
      insertIndex += 1;
      continue;
    }
    if (trimmed.startsWith('"use ') || trimmed.startsWith("'use ")) {
      insertIndex += 1;
      continue;
    }
    break;
  }

  lines.splice(insertIndex, 0, "import { withErrorLogging } from '@/lib/errorTracking/errorLogger';");
  return lines.join('\n');
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  const methods = new Set();

  content = content.replace(
    /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(/g,
    (match, method) => {
      methods.add(method);
      return `async function ${method}Handler(`;
    },
  );

  content = content.replace(
    /export\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*=\s*/g,
    (match, method) => {
      methods.add(method);
      return `const ${method}Handler = `;
    },
  );

  // Handle export { handler as GET }
  content = content.replace(
    /export\s*{\s*([^}]+)\s*};?/g,
    (match, inner) => {
      let replaced = inner;
      let modified = false;
      METHOD_NAMES.forEach((method) => {
        const regex = new RegExp(`\\b([A-Za-z0-9_]+)\s+as\s+${method}\\b`);
        if (regex.test(replaced)) {
          methods.add(method);
          replaced = replaced.replace(regex, `$1 as ${method}Handler`);
          modified = true;
        }
      });
      if (modified) {
        return `export { ${replaced} };`;
      }
      return match;
    },
  );

  if (methods.size === 0) {
    return false;
  }

  content = insertImport(content);

  const wrapperLines = Array.from(methods)
    .map((method) => `export const ${method} = withErrorLogging(${method}Handler);`)
    .join('\n');

  if (!content.includes(wrapperLines)) {
    content = `${content.trim()}\n\n${wrapperLines}\n`;
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

function main() {
  const files = collectRouteFiles(API_DIR);
  const updated = [];

  files.forEach((filePath) => {
    try {
      if (processFile(filePath)) {
        updated.push(path.relative(API_DIR, filePath));
      }
    } catch (err) {
      console.error('Failed to process', filePath, err);
    }
  });

  console.log('Wrapped handlers in', updated.length, 'files');
  updated.forEach((file) => console.log(' -', file));
}

main();
