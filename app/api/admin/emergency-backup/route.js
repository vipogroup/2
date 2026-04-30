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

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getDirectorySize(dirPath) {
  let size = 0;
  try {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = fs.statSync(fullPath);
      if (stats.isFile()) {
        size += stats.size;
      } else if (stats.isDirectory()) {
        size += getDirectorySize(fullPath);
      }
    }
  } catch {
    // Ignore errors
  }
  return size;
}

// GET - Get emergency backup info
async function GETHandler(req) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isLocal = !process.env.VERCEL && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
  
  if (!isLocal) {
    return NextResponse.json({ 
      lastUpdate: 'לא זמין בסביבת Production',
      dbSize: 'N/A',
      collectionsCount: 'N/A'
    });
  }

  try {
    const infoFile = path.join(EMERGENCY_BACKUP_DIR, 'backup-info.json');
    
    if (fs.existsSync(infoFile)) {
      const info = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
      return NextResponse.json(info);
    }
    
    return NextResponse.json({ 
      lastUpdate: 'לא עודכן עדיין',
      dbSize: 'לא ידוע',
      collectionsCount: 'לא ידוע'
    });
  } catch (error) {
    return NextResponse.json({ 
      lastUpdate: 'שגיאה בקריאת מידע',
      error: error.message
    });
  }
}

// POST - Update emergency backup
async function POSTHandler(req) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isLocal = !process.env.VERCEL && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
  
  if (!isLocal) {
    return NextResponse.json({ 
      error: 'עדכון גיבוי חירום זמין רק בסביבת פיתוח מקומית' 
    }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'update') {
      // Create emergency backup directory
      if (!fs.existsSync(EMERGENCY_BACKUP_DIR)) {
        fs.mkdirSync(EMERGENCY_BACKUP_DIR, { recursive: true });
      }

      // 1. Backup database
      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      
      const collections = await db.listCollections().toArray();
      const dbBackup = {};
      let totalDocs = 0;
      
      for (const col of collections) {
        const docs = await db.collection(col.name).find({}).toArray();
        dbBackup[col.name] = docs;
        totalDocs += docs.length;
      }
      
      // Save database backup
      const dbBackupPath = path.join(EMERGENCY_BACKUP_DIR, 'database-backup.json');
      fs.writeFileSync(dbBackupPath, JSON.stringify(dbBackup, null, 2), 'utf8');
      
      // 2. Copy .env.local (if exists)
      const envPath = path.join(process.cwd(), '.env.local');
      const envBackupPath = path.join(EMERGENCY_BACKUP_DIR, 'env-backup.txt');
      
      if (fs.existsSync(envPath)) {
        fs.copyFileSync(envPath, envBackupPath);
      }
      
      // 3. Create README with instructions
      const readmeContent = `# VIPO Emergency Backup
# גיבוי חירום - מערכת VIPO
# תאריך עדכון: ${new Date().toLocaleString('he-IL')}

## קבצים בגיבוי:
- database-backup.json - גיבוי מסד הנתונים (${collections.length} קולקציות, ${totalDocs} מסמכים)
- env-backup.txt - משתני סביבה (.env.local)

## שלבי הקמת מערכת חדשה:

### שלב 1: יצירת חשבונות
- Vercel: https://vercel.com
- MongoDB Atlas: https://cloud.mongodb.com
- Cloudinary: https://cloudinary.com

### שלב 2: שכפול הקוד
git clone https://github.com/vipogroup/vipo-agents-test.git
cd vipo-agents-test
npm install

### שלב 3: הגדרת משתני סביבה
1. העתק את env-backup.txt ל-.env.local
2. עדכן MONGODB_URI לכתובת MongoDB החדשה
3. עדכן NEXTAUTH_URL לכתובת האתר החדשה

### שלב 4: הפעלה מקומית
npm run dev

### שלב 5: שחזור מסד נתונים
1. היכנס ל-http://localhost:3001/admin/backups
2. לחץ על "שחזור גיבוי"
3. בחר את קובץ database-backup.json
4. המתן לסיום השחזור

### שלב 6: העלאה ל-Vercel
vercel login
vercel --prod

## שירותים נדרשים:
- GitHub: https://github.com/vipogroup/vipo-agents-test
- Vercel: https://vercel.com
- MongoDB Atlas: https://cloud.mongodb.com
- Cloudinary: https://cloudinary.com
- PayPlus: https://payplus.co.il
- Google Cloud Console: https://console.cloud.google.com
- Twilio: https://console.twilio.com

## זמן משוער להקמה: 30 דקות
`;
      
      const readmePath = path.join(EMERGENCY_BACKUP_DIR, 'README.txt');
      fs.writeFileSync(readmePath, readmeContent, 'utf8');
      
      // 4. Update backup info
      const backupInfo = {
        lastUpdate: new Date().toLocaleString('he-IL'),
        dbSize: formatBytes(fs.statSync(dbBackupPath).size),
        collectionsCount: collections.length,
        totalDocs,
        updatedBy: user.email
      };
      
      const infoPath = path.join(EMERGENCY_BACKUP_DIR, 'backup-info.json');
      fs.writeFileSync(infoPath, JSON.stringify(backupInfo, null, 2), 'utf8');
      
      // Log activity
      const { logAdminActivity } = await import('@/lib/auditMiddleware');
      await logAdminActivity({
        action: 'backup',
        entity: 'system',
        userId: user.userId,
        userEmail: user.email,
        description: 'עדכון גיבוי חירום',
        metadata: { 
          type: 'emergency',
          collectionsCount: collections.length,
          totalDocs
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: 'גיבוי חירום עודכן בהצלחה!',
        ...backupInfo
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Emergency backup error:', error);
    return NextResponse.json({ 
      error: 'שגיאה בעדכון גיבוי חירום',
      details: error.message 
    }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
