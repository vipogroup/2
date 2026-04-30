import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { requireSuperAdminApi } from '@/lib/auth/server';
import { rateLimiters } from '@/lib/rateLimit';
import fs from 'fs';
import path from 'path';

async function GETHandler(req) {
  const rateLimit = rateLimiters.admin(req);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.message }, { status: 429 });
  }

  // בדיקת הרשאות
  try {
    await requireSuperAdminApi(req);
  } catch (err) {
    const status = err?.status || 401;
    const message = status === 403 ? 'Forbidden' : 'Unauthorized';
    return NextResponse.json({ error: message }, { status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const backupName = searchParams.get('name');

    if (!backupName) {
      return NextResponse.json({ error: 'שם גיבוי חסר' }, { status: 400 });
    }

    // בדיקת אבטחה - מניעת path traversal
    if (backupName.includes('..') || backupName.includes('/') || backupName.includes('\\')) {
      return NextResponse.json({ error: 'שם גיבוי לא תקין' }, { status: 400 });
    }

    const backupDir = path.join(process.cwd(), 'backups', 'database', backupName);
    
    if (!fs.existsSync(backupDir)) {
      return NextResponse.json({ error: 'גיבוי לא נמצא' }, { status: 404 });
    }

    // חיפוש קובץ ZIP
    const zipPath = path.join(backupDir, 'full-backup.zip');
    
    if (!fs.existsSync(zipPath)) {
      return NextResponse.json({ error: 'קובץ ZIP לא נמצא בגיבוי זה' }, { status: 404 });
    }

    // קריאת הקובץ
    const zipBuffer = fs.readFileSync(zipPath);

    return new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${backupName}.zip"`
      }
    });

  } catch (error) {
    console.error('[Download] Error:', error);
    return NextResponse.json({ 
      error: 'שגיאה בהורדת הקובץ: ' + error.message 
    }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
