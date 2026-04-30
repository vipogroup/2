import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const EMERGENCY_BACKUP_DIR = path.join(process.cwd(), 'backups', 'emergency');

async function checkAdmin(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const authTokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
  const legacyTokenMatch = cookieHeader.match(/token=([^;]+)/);
  const tokenValue = authTokenMatch?.[1] || legacyTokenMatch?.[1];
  
  if (!tokenValue) return null;
  
  try {
    const { jwtVerify } = await import('jose');
    if (!process.env.JWT_SECRET) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(decodeURIComponent(tokenValue), secret);
    if (payload.role !== 'admin' && payload.role !== 'super_admin') return null;
    return payload;
  } catch {
    return null;
  }
}

async function GETHandler(req) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isLocal = !process.env.VERCEL && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
  
  if (!isLocal) {
    return NextResponse.json({ 
      error: 'הורדת גיבוי זמינה רק בסביבת פיתוח מקומית' 
    }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  try {
    if (type === 'database') {
      const dbPath = path.join(EMERGENCY_BACKUP_DIR, 'database-backup.json');
      
      if (!fs.existsSync(dbPath)) {
        return NextResponse.json({ error: 'קובץ גיבוי לא נמצא. יש לעדכן את הגיבוי תחילה.' }, { status: 404 });
      }
      
      const content = fs.readFileSync(dbPath);
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="vipo-database-backup-${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    }

    if (type === 'env') {
      const envPath = path.join(EMERGENCY_BACKUP_DIR, 'env-backup.txt');
      
      if (!fs.existsSync(envPath)) {
        return NextResponse.json({ error: 'קובץ ENV לא נמצא. יש לעדכן את הגיבוי תחילה.' }, { status: 404 });
      }
      
      const content = fs.readFileSync(envPath);
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="env-backup-${new Date().toISOString().split('T')[0]}.txt"`
        }
      });
    }

    if (type === 'full') {
      // Create a simple combined file (not a real ZIP, but all content together)
      const dbPath = path.join(EMERGENCY_BACKUP_DIR, 'database-backup.json');
      const envPath = path.join(EMERGENCY_BACKUP_DIR, 'env-backup.txt');
      const readmePath = path.join(EMERGENCY_BACKUP_DIR, 'README.txt');
      
      if (!fs.existsSync(dbPath)) {
        return NextResponse.json({ error: 'קובץ גיבוי לא נמצא. יש לעדכן את הגיבוי תחילה.' }, { status: 404 });
      }

      const fullBackup = {
        metadata: {
          createdAt: new Date().toISOString(),
          type: 'vipo-emergency-backup'
        },
        database: fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, 'utf8')) : null,
        env: fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : null,
        readme: fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : null
      };

      return new NextResponse(JSON.stringify(fullBackup, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="vipo-emergency-backup-${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ 
      error: 'שגיאה בהורדת הקובץ',
      details: error.message 
    }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
