/**
 * Apply Atlas MONGODB_URI for vipo_atlas_app @ cluster0.ak4wriy.mongodb.net/vipo
 * Password: URL-encoded automatically.
 *
 * Usage (recommended — password not echoed in shell history if you use set + node):
 *   set "VIPO_ATLAS_APP_PASSWORD=your_password_here"
 *   node scripts/apply-atlas-mongo-uri.mjs
 *
 * Or interactive (password visible on some terminals):
 *   node scripts/apply-atlas-mongo-uri.mjs
 *
 * Does not print the password or full URI.
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const ROOT = path.resolve(process.cwd());
const HOST = 'cluster0.ak4wriy.mongodb.net';
const DB_USER = 'vipo_atlas_app';
const APP_NAME = 'Cluster0';

const TARGET_FILES = [
  '.env.prod.current',
  '.env.prod.verify',
  '.env.prod.livecheck',
  '.env.local',
];

function buildUri(password) {
  const enc = encodeURIComponent(String(password).trim());
  if (!enc) throw new Error('Empty password');
  return `mongodb+srv://${DB_USER}:${enc}@${HOST}/vipo?appName=${APP_NAME}`;
}

function setOrReplaceLine(content, key, newLine) {
  const lines = content.split(/\r?\n/);
  const out = [];
  let replaced = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(`${key}=`) || trimmed.startsWith(`${key} =`)) {
      if (!replaced) {
        out.push(newLine);
        replaced = true;
      }
      continue;
    }
    out.push(line);
  }
  if (!replaced) out.push(newLine);
  return out.join('\n');
}

function removeKeyLines(content, key) {
  return content
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      return !t.startsWith(`${key}=`) && !t.startsWith(`${key} =`);
    })
    .join('\n');
}

function ensureAppDataMode(content) {
  const has = /(^|\n)\s*APP_DATA_MODE\s*=/.test(content);
  if (has) {
    return setOrReplaceLine(content, 'APP_DATA_MODE', 'APP_DATA_MODE=shared_remote');
  }
  const dbLineIdx = content.split(/\r?\n/).findIndex((l) => l.trim().startsWith('MONGODB_DB='));
  if (dbLineIdx >= 0) {
    const lines = content.split(/\r?\n/);
    lines.splice(dbLineIdx + 1, 0, 'APP_DATA_MODE=shared_remote');
    return lines.join('\n');
  }
  return `${content.trimEnd()}\nAPP_DATA_MODE=shared_remote\n`;
}

function ensureMongoDb(content) {
  return setOrReplaceLine(content, 'MONGODB_DB', 'MONGODB_DB=vipo');
}

async function readPassword() {
  if (process.env.VIPO_ATLAS_APP_PASSWORD) {
    return process.env.VIPO_ATLAS_APP_PASSWORD;
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const pwd = await new Promise((resolve) => {
    rl.question('Enter database password for vipo_atlas_app: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
  return pwd;
}

async function main() {
  const password = await readPassword();
  const uri = buildUri(password);
  const uriLine = `MONGODB_URI="${uri}"`;

  for (const rel of TARGET_FILES) {
    const fp = path.join(ROOT, rel);
    if (!fs.existsSync(fp)) {
      console.warn('skip missing file:', rel);
      continue;
    }
    let text = fs.readFileSync(fp, 'utf8');
    text = removeKeyLines(text, 'MONGODB_URI_SRV');
    text = removeKeyLines(text, 'MONGODB_URI_FALLBACK');
    text = ensureMongoDb(text);
    text = ensureAppDataMode(text);
    text = setOrReplaceLine(text, 'MONGODB_URI', uriLine);
    fs.writeFileSync(fp, text, 'utf8');
    console.log('updated', rel);
  }

  console.log('DONE. Host:', HOST, '| DB:', 'vipo', '| APP_DATA_MODE:', 'shared_remote');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
