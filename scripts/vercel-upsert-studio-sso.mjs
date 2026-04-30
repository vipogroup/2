#!/usr/bin/env node
/**
 * מסנכרן STUDIO_SSO_SECRET ל-Production ול-Preview בפרויקט Vercel (אותו ערך),
 * בלי לבחור ענף Git — דרך REST API (עוקף מגבלות vercel env add ב-Preview).
 *
 * דרישות:
 *   - VERCEL_TOKEN — טוקן מ־https://vercel.com/account/tokens (Scope: Full או לפחות Project)
 *
 * שימוש:
 *   set VERCEL_TOKEN=...   (PowerShell: $env:VERCEL_TOKEN="...")
 *   node scripts/vercel-upsert-studio-sso.mjs
 *
 * אופציונלי: ערך קבוע (אחרת נוצר אקראי חדש וידרס את Production הקיים):
 *   node scripts/vercel-upsert-studio-sso.mjs --value=YOUR_HEX_SECRET
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const projectJsonPath = path.join(root, '.vercel', 'project.json');

function loadProjectMeta() {
  if (!fs.existsSync(projectJsonPath)) {
    console.error('חסר .vercel/project.json — הרץ vercel link בתיקיית הפרויקט.');
    process.exit(1);
  }
  const j = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
  const projectId = j.projectId;
  const teamId = j.orgId;
  if (!projectId || !teamId) {
    console.error('.vercel/project.json חייב לכלול projectId ו-orgId');
    process.exit(1);
  }
  return { projectId, teamId };
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let value = null;
  for (const a of argv) {
    if (a.startsWith('--value=')) value = a.slice('--value='.length).trim();
  }
  return { value };
}

async function main() {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    console.error(
      'חסר VERCEL_TOKEN. צור טוקן ב: https://vercel.com/account/tokens\n' +
        'ואז: PowerShell: $env:VERCEL_TOKEN="..." ; node scripts/vercel-upsert-studio-sso.mjs',
    );
    process.exit(1);
  }

  const { projectId, teamId } = loadProjectMeta();
  const { value: fromCli } = parseArgs();
  const value =
    fromCli && fromCli.length > 0
      ? fromCli
      : crypto.randomBytes(32).toString('hex');

  const base = `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/env`;
  const qs = new URLSearchParams({ upsert: 'true', teamId });

  /** בקשה אחת עם שני targets — נתמך ב-API v10 */
  const body = {
    key: 'STUDIO_SSO_SECRET',
    value,
    type: 'sensitive',
    target: ['production', 'preview'],
  };

  async function postEnv(targetArr) {
    const res = await fetch(`${base}?${qs}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        target: targetArr,
      }),
    });
    const text = await res.text();
    return { res, text };
  }

  let { res, text } = await postEnv(['production', 'preview']);

  if (!res.ok) {
    console.warn('בקשה משולבת נכשלה — מנסה Production ו-Preview בנפרד…', res.status);
    const p1 = await postEnv(['production']);
    if (!p1.res.ok) {
      console.error(`Production: ${p1.res.status}`, p1.text);
      process.exit(1);
    }
    const p2 = await postEnv(['preview']);
    if (!p2.res.ok) {
      console.error(`Preview: ${p2.res.status}`, p2.text);
      process.exit(1);
    }
    console.log('STUDIO_SSO_SECRET עודכן ל-Production ול-Preview (שני שלבים).');
    console.log('הפעל Deploy מחדש לפרויקט כדי שהערך ייטען בכל הסביבות.');
    if (!fromCli) console.log('נוצר ערך אקראי חדש (64 תווים hex).');
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.log('OK (לא JSON):', text.slice(0, 200));
    process.exit(0);
  }

  const failed = parsed?.failed?.length ? parsed.failed : [];
  if (failed.length) {
    console.error('חלק מההגדרות נכשלו:', JSON.stringify(failed, null, 2));
    process.exit(1);
  }

  console.log('STUDIO_SSO_SECRET עודכן ל-Production + Preview (upsert).');
  console.log('הפעל Deploy מחדש לפרויקט (או המתן ל-deploy אוטומטי) כדי שהערך ייטען.');
  if (!fromCli) {
    console.log('נוצר ערך אקראי חדש (64 תווים hex).');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
