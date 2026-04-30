import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { requireSuperAdminApi } from '@/lib/auth/server';
import { isSuperAdminUser } from '@/lib/superAdmins';
import { logAdminActivity } from '@/lib/auditMiddleware';
import { rateLimiters } from '@/lib/rateLimit';
import { apiDebugLog } from '@/lib/apiDebugLog';

const execAsync = promisify(exec);
const MAX_BACKUPS = 10; // מספר גיבויים מקסימלי לשמור
const RESTORE_CONFIRM_TOKEN = 'RESTORE_BACKUP_IRREVERSIBLE';

function blockedRestoreResponse() {
  return NextResponse.json(
    {
      error: 'backup_restore_blocked',
      message: 'Backup restore is blocked without explicit super-admin confirmation.',
    },
    { status: 403 },
  );
}

function normalizeCollectionList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
}

async function buildRestorePreview(db, selectedBackup, restoreCollections, restoreCounts) {
  const collections = normalizeCollectionList(restoreCollections);
  const currentCounts = {};
  for (const name of collections) {
    try {
      currentCounts[name] = await db.collection(name).countDocuments({});
    } catch {
      currentCounts[name] = 0;
    }
  }
  return {
    selectedBackup,
    targetCollections: collections,
    currentCounts,
    restoreCounts: restoreCounts || {},
  };
}

function verifyRestoreGuards({
  body,
  selectedBackup,
  restoreCollections,
  nodeEnv,
}) {
  const allowBackupRestore = process.env.ALLOW_BACKUP_RESTORE === 'true';
  const dryRun = body?.dryRun !== false;
  if (dryRun) {
    return { ok: true, dryRun, allowBackupRestore };
  }

  const confirm = String(body?.confirm || '').trim();
  const reason = String(body?.reason || '').trim();
  const acknowledgeOverwrite = body?.acknowledgeOverwrite === true;
  const confirmEnvironment = String(body?.confirmEnvironment || '').trim();
  const confirmCollections = normalizeCollectionList(body?.confirmCollections);
  const requiredCollections = normalizeCollectionList(restoreCollections);
  const hasAllCollections = requiredCollections.every((name) => confirmCollections.includes(name));

  const selectedBackupId = String(selectedBackup?.id || '').trim();
  const selectedBackupFile = String(selectedBackup?.file || '').trim();
  const confirmBackupId = String(body?.confirmBackupId || '').trim();
  const confirmBackupFile = String(body?.confirmBackupFile || '').trim();

  const hasBackupIdentityMatch =
    (selectedBackupId && confirmBackupId === selectedBackupId) ||
    (selectedBackupFile && confirmBackupFile === selectedBackupFile);

  const guardsOk =
    allowBackupRestore &&
    confirm === RESTORE_CONFIRM_TOKEN &&
    acknowledgeOverwrite &&
    reason.length > 0 &&
    confirmEnvironment === nodeEnv &&
    hasBackupIdentityMatch &&
    requiredCollections.length > 0 &&
    hasAllCollections;

  return {
    ok: guardsOk,
    dryRun,
    allowBackupRestore,
    reason,
    requiredCollections,
  };
}

// פונקציה לשליחת התראה על כשלון
async function sendFailureAlert(action, error, userEmail) {
  try {
    // שמירה בלוג
    await logAdminActivity({
      action: 'system_alert',
      entity: 'system',
      description: `התראה: ${action} נכשל - ${error}`,
      metadata: { 
        alertType: 'failure',
        failedAction: action,
        error: error,
        timestamp: new Date().toISOString()
      }
    });

    // אם יש Resend API Key - שלח מייל
    if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        await resend.emails.send({
          from: 'VIPO System <vipogroup1@gmail.com>',
          to: process.env.ADMIN_EMAIL,
          subject: `[התראה] מערכת VIPO: ${action} נכשל`,
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #dc2626;">התראת כשלון מערכת</h2>
              <p><strong>פעולה:</strong> ${action}</p>
              <p><strong>שגיאה:</strong> ${error}</p>
              <p><strong>זמן:</strong> ${new Date().toLocaleString('he-IL')}</p>
              <p><strong>משתמש:</strong> ${userEmail || 'לא ידוע'}</p>
              <hr>
              <p style="color: #6b7280; font-size: 12px;">הודעה אוטומטית ממערכת VIPO</p>
            </div>
          `
        });
        apiDebugLog('[Alert] Email sent to admin');
      } catch (emailErr) {
        console.error('[Alert] Failed to send email:', emailErr.message);
      }
    }
  } catch (err) {
    console.error('[Alert] Failed to send alert:', err.message);
  }
}

// פונקציה לניקוי גיבויים ישנים - רק בסביבה מקומית
async function cleanupOldBackups(backupsDir) {
  // לא זמין בסביבת Vercel
  const isLocal = !process.env.VERCEL && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
  if (!isLocal) {
    return { cleaned: 0, skipped: true };
  }
  
  try {
    if (!fs.existsSync(backupsDir)) {
      return { cleaned: 0 };
    }
    
    const items = fs.readdirSync(backupsDir, { withFileTypes: true });
    const backupDirs = items
      .filter(item => item.isDirectory() && item.name.startsWith('mongo-'))
      .map(item => item.name)
      .sort((a, b) => b.localeCompare(a)); // מיון מהחדש לישן
    
    if (backupDirs.length <= MAX_BACKUPS) {
      return { cleaned: 0 };
    }
    
    const toDelete = backupDirs.slice(MAX_BACKUPS);
    let deletedCount = 0;
    
    for (const dir of toDelete) {
      const dirPath = path.join(backupsDir, dir);
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
        deletedCount++;
        apiDebugLog(`[Cleanup] Deleted old backup: ${dir}`);
      } catch (err) {
        console.error(`[Cleanup] Failed to delete ${dir}:`, err.message);
      }
    }
    
    return { cleaned: deletedCount };
  } catch (err) {
    console.error('[Cleanup] Error:', err.message);
    return { cleaned: 0, error: err.message };
  }
}

// Helper to check if user is admin
async function checkAdmin(req) {
  try {
    const user = await requireSuperAdminApi(req);
    if (!isSuperAdminUser(user)) return null;
    const userId = user.userId || user.id || user._id || null;
    return {
      ...user,
      userId,
      userEmail: user.email || user.userEmail || null,
    };
  } catch {
    return null;
  }
}

// GET - List backups
async function GETHandler(req) {
  const rateLimit = rateLimiters.admin(req);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.message }, { status: 429 });
  }

  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // בדיקה אם אנחנו בסביבת Vercel
  const isLocal = !process.env.VERCEL && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
  
  // ב-Vercel אין גישה למערכת קבצים - החזר רשימה ריקה
  if (!isLocal) {
    return NextResponse.json({ 
      backups: [],
      message: 'גיבויים מקומיים זמינים רק בסביבת פיתוח'
    });
  }

  try {
    const backupsDir = path.join(process.cwd(), 'backups', 'database');
    
    if (!fs.existsSync(backupsDir)) {
      return NextResponse.json({ backups: [] });
    }

    const items = fs.readdirSync(backupsDir, { withFileTypes: true });
    const backups = items
      .filter(item => item.isDirectory() && (item.name.startsWith('mongo-') || item.name.startsWith('full-')))
      .map(item => {
        const fullPath = path.join(backupsDir, item.name);
        const isFull = item.name.startsWith('full-');
        
        // Parse date from folder name (mongo-2025-12-31T15-47-00-767Z or full-2025-12-31T15-47-00-767Z)
        const prefix = isFull ? 'full-' : 'mongo-';
        const dateMatch = item.name.match(new RegExp(`${prefix}(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2})-(\\d{2})-(\\d{2})`));
        let dateStr = 'לא ידוע';
        if (dateMatch) {
          const [, year, month, day, hour, minute] = dateMatch;
          dateStr = `${day}/${month}/${year} ${hour}:${minute}`;
        }
        
        return {
          name: item.name,
          date: dateStr,
          size: formatBytes(getDirectorySize(fullPath)),
          path: fullPath,
          type: isFull ? 'full' : 'database',
          hasZip: isFull && fs.existsSync(path.join(fullPath, 'full-backup.zip'))
        };
      })
      .sort((a, b) => b.name.localeCompare(a.name)) // Sort newest first
      .slice(0, 10); // Limit to 10 most recent

    return NextResponse.json({ backups });
  } catch (error) {
    console.error('Error listing backups:', error);
    return NextResponse.json({ backups: [], error: error.message });
  }
}

// POST - Run backup action
async function POSTHandler(req) {
  const rateLimit = rateLimiters.admin(req);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.message }, { status: 429 });
  }

  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'backup') {
      const isLocal = !process.env.VERCEL && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
      
      if (isLocal) {
        // Run backup.cmd script locally
        try {
          const scriptPath = path.join(process.cwd(), 'backups', 'database', 'backup.cmd');
          apiDebugLog('[Backup] Running script:', scriptPath);
          
          const { stdout, stderr } = await execAsync(`"${scriptPath}"`, { 
            cwd: process.cwd(),
            timeout: 120000 
          });
          
          await logAdminActivity({
            action: 'backup',
            entity: 'system',
            userId: user.userId,
            userEmail: user.email,
            description: 'גיבוי מסד נתונים באמצעות backup.cmd',
            metadata: { type: 'script', output: (stdout || '').substring(0, 500) }
          });

          return NextResponse.json({ 
            success: true, 
            message: 'גיבוי הושלם בהצלחה באמצעות backup.cmd!',
            details: stdout,
            scriptUsed: 'backup.cmd'
          });
        } catch (error) {
          console.error('[Backup] Script error:', error);
          // Fallback to direct MongoDB backup
        }
      }
      
      // Direct MongoDB backup - save to backups/database folder
      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      
      // Create backup directory with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(process.cwd(), 'backups', 'database', `mongo-${timestamp}`);
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Get all collections
      const collections = await db.listCollections().toArray();
      let totalDocs = 0;
      
      // Export each collection to separate JSON file
      for (const col of collections) {
        const docs = await db.collection(col.name).find({}).toArray();
        totalDocs += docs.length;
        const filePath = path.join(backupDir, `${col.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
      }
      
      // Log backup action
      await logAdminActivity({
        action: 'backup',
        entity: 'system',
        userId: user.userId,
        userEmail: user.email,
        description: 'גיבוי מסד נתונים לתיקייה',
        metadata: { 
          type: 'database',
          collectionsCount: collections.length,
          totalDocs,
          backupDir: `mongo-${timestamp}`
        }
      });

      // ניקוי גיבויים ישנים - שמירת 10 אחרונים בלבד
      const backupsDir = path.join(process.cwd(), 'backups', 'database');
      const cleanupResult = await cleanupOldBackups(backupsDir);

      return NextResponse.json({ 
        success: true, 
        message: `גיבוי הושלם בהצלחה! נשמר בתיקייה: mongo-${timestamp}`,
        backupFolder: `mongo-${timestamp}`,
        collectionsCount: collections.length,
        totalDocs,
        cleanedBackups: cleanupResult.cleaned
      });
    }

    if (action === 'fullBackup') {
      // גיבוי מלא - קוד + DB + הגדרות - יוצר ZIP להורדה
      const isLocal = !process.env.VERCEL && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
      
      if (!isLocal) {
        return NextResponse.json({ error: 'גיבוי מלא זמין רק בסביבה מקומית' }, { status: 400 });
      }

      const archiver = (await import('archiver')).default;
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      // יצירת ZIP בזיכרון
      const archive = archiver('zip', { zlib: { level: 5 } });
      const chunks = [];

      // Promise לסיום
      const archivePromise = new Promise((resolve, reject) => {
        archive.on('data', (chunk) => chunks.push(chunk));
        archive.on('end', () => resolve());
        archive.on('error', (err) => reject(err));
      });
      
      // 1. גיבוי מסד נתונים
      const collections = await db.listCollections().toArray();
      const dbBackup = { collections: {}, meta: { date: new Date().toISOString(), collectionsCount: collections.length } };
      
      for (const col of collections) {
        const docs = await db.collection(col.name).find({}).toArray();
        dbBackup.collections[col.name] = docs;
        dbBackup.meta[col.name] = docs.length;
      }
      
      archive.append(JSON.stringify(dbBackup, null, 2), { name: 'database-backup.json' });

      // 2. קובץ הגדרות סביבה
      const envPath = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        archive.append(envContent, { name: 'env-backup.txt' });
      }

      // 3. קובץ README עם הוראות
      const readme = `# VIPO Full Backup
תאריך גיבוי: ${new Date().toLocaleString('he-IL')}

## תוכן הגיבוי:
- database-backup.json - גיבוי מסד נתונים (${collections.length} קולקציות)
- env-backup.txt - משתני סביבה

## הוראות שחזור:

### שלב 1: שכפול הקוד
git clone https://github.com/vipogroup/vipo-agents-test.git
cd vipo-agents-test

### שלב 2: התקנה
npm install

### שלב 3: הגדרת משתני סביבה
- העתק את env-backup.txt ל-.env.local
- עדכן MONGODB_URI לכתובת החדשה
- עדכן NEXTAUTH_URL לדומיין החדש

### שלב 4: שחזור מסד נתונים
- הפעל npm run dev
- היכנס ל-/admin/backups
- שחזר מקובץ database-backup.json

### שלב 5: העלאה ל-Vercel
vercel --prod

## שירותים חיצוניים נדרשים:
- MongoDB Atlas (מסד נתונים)
- Vercel (אחסון)
- Cloudinary (תמונות)
- PayPlus (סליקה)
- Twilio (SMS)
- Google OAuth (התחברות)
`;
      archive.append(readme, { name: 'README.txt' });

      // 4. הוספת קבצי קוד חשובים (לא כל הפרויקט - רק קבצי קונפיגורציה)
      const configFiles = ['package.json', 'next.config.mjs', 'tailwind.config.js', 'vercel.json'];
      for (const file of configFiles) {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          archive.append(content, { name: `config/${file}` });
        }
      }

      // סיום הארכיון והמתנה
      archive.finalize();
      await archivePromise;
      
      const zipBuffer = Buffer.concat(chunks);

      // שמירת ה-ZIP גם בתיקיית הגיבויים
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(process.cwd(), 'backups', 'database', `full-${timestamp}`);
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // שמירת ה-ZIP
      const zipPath = path.join(backupDir, 'full-backup.zip');
      fs.writeFileSync(zipPath, zipBuffer);
      
      // שמירת ה-JSON בנפרד (לשחזור מהיר)
      const dbJsonPath = path.join(backupDir, 'database-backup.json');
      fs.writeFileSync(dbJsonPath, JSON.stringify(dbBackup, null, 2));
      
      // שמירת מידע על הגיבוי
      const infoPath = path.join(backupDir, 'backup-info.json');
      fs.writeFileSync(infoPath, JSON.stringify({
        type: 'full',
        date: new Date().toISOString(),
        collectionsCount: collections.length,
        zipSize: zipBuffer.length,
        files: ['full-backup.zip', 'database-backup.json']
      }, null, 2));

      // לוג פעילות
      await logAdminActivity({
        action: 'backup',
        entity: 'system',
        userId: user.userId,
        userEmail: user.email,
        description: 'גיבוי מלא (קוד + DB + הגדרות)',
        metadata: { type: 'fullBackup', collectionsCount: collections.length, size: zipBuffer.length, folder: `full-${timestamp}` }
      });

      return new Response(zipBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="vipo-full-backup-${new Date().toISOString().split('T')[0]}.zip"`
        }
      });
    }

    if (action === 'localDeploy') {
      return NextResponse.json({
        success: false,
        error: 'Deploy ידני דרך המערכת כבוי כדי למנוע 2 Deployments במקביל',
        info: 'בצע רק שלב 5 (Push ל-GitHub) והדיפלוי ירוץ אוטומטית ב-Vercel.'
      }, { status: 400 });
    }

    if (action === 'deploy') {
      const isLocal = !process.env.VERCEL && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
      const deployScriptPath = path.join(process.cwd(), 'backups', 'database', 'deploy-vercel.cmd');
      const hasDeployScript = fs.existsSync(deployScriptPath);
      
      // Try deploy-vercel.cmd if it exists (supports local dev even with VERCEL=1 in .env.local)
      if ((isLocal || hasDeployScript) && !process.env.VERCEL_DEPLOY_HOOK_URL) {
        try {
          const scriptPath = deployScriptPath;
          apiDebugLog('[Deploy] Running script:', scriptPath);
          
          const { stdout } = await execAsync(`"${scriptPath}" --auto`, { 
            cwd: process.cwd(),
            timeout: 300000 
          });
          
          await logAdminActivity({
            action: 'deploy',
            entity: 'system',
            userId: user.userId,
            userEmail: user.email,
            description: 'Deploy ל-Vercel באמצעות deploy-vercel.cmd',
            metadata: { type: 'script', output: (stdout || '').substring(0, 500) }
          });

          return NextResponse.json({ 
            success: true, 
            message: 'Deploy ל-Vercel הופעל באמצעות deploy-vercel.cmd!',
            details: stdout,
            scriptUsed: 'deploy-vercel.cmd'
          });
        } catch (error) {
          console.error('[Deploy] Script error:', error);
          // Fallback to deploy hook or instructions
        }
      }
      
      // Use Vercel Deploy Hook if available
      const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
      
      if (deployHookUrl) {
        try {
          // Trigger Vercel deploy via webhook
          const deployRes = await fetch(deployHookUrl, { method: 'POST' });
          
          if (deployRes.ok) {
            const deployData = await deployRes.json().catch(() => ({}));
            
            await logAdminActivity({
              action: 'deploy',
              entity: 'system',
              userId: user.userId,
              userEmail: user.email,
              description: 'Deploy ל-Vercel הופעל בהצלחה',
              metadata: { platform: 'vercel', method: 'deploy_hook', jobId: deployData.job?.id }
            });

            return NextResponse.json({ 
              success: true, 
              message: 'Deploy ל-Vercel הופעל בהצלחה! הבנייה תתחיל תוך מספר שניות.',
              info: 'לצפייה בסטטוס: https://vercel.com/vipos-projects-0154d019/vipo-agents-test/deployments',
              deployTriggered: true
            });
          } else {
            throw new Error('Deploy hook failed');
          }
        } catch (err) {
          console.error('Deploy hook error:', err);
          return NextResponse.json({ 
            success: false, 
            error: 'Deploy נכשל. נסה שוב או בצע git push ידנית.',
            details: err.message
          }, { status: 500 });
        }
      } else {
        // No deploy hook configured - redirect to Vercel
        await logAdminActivity({
          action: 'deploy',
          entity: 'system',
          userId: user.userId,
          userEmail: user.email,
          description: 'בקשת Deploy - הפניה ל-Vercel',
          metadata: { platform: 'vercel', method: 'redirect' }
        });

        return NextResponse.json({ 
          success: true, 
          message: 'לביצוע Deploy, לחץ על הכפתור למטה:',
          vercelUrl: 'https://vercel.com/vipos-projects-0154d019/vipo-agents-test/deployments',
          info: 'בדף Vercel: לחץ על הפריסה האחרונה → ⋮ → Redeploy',
          redirectToVercel: true
        });
      }
    }

    if (action === 'gitpush') {
      const isLocal = !process.env.VERCEL && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
      
      if (isLocal) {
        try {
          const scriptPath = path.join(process.cwd(), 'backups', 'database', 'git-push.cmd');
          apiDebugLog('[GitPush] Running script:', scriptPath);
          
          const { stdout } = await execAsync(`"${scriptPath}" --auto`, { 
            cwd: process.cwd(),
            timeout: 120000 
          });
          
          await logAdminActivity({
            action: 'gitpush',
            entity: 'system',
            userId: user.userId,
            userEmail: user.email,
            description: 'Push ל-GitHub באמצעות git-push.cmd',
            metadata: { type: 'script', output: (stdout || '').substring(0, 500) }
          });

          return NextResponse.json({ 
            success: true, 
            message: 'Push ל-GitHub הושלם בהצלחה!',
            details: stdout,
            scriptUsed: 'git-push.cmd'
          });
        } catch (error) {
          console.error('[GitPush] Script error:', error);
          return NextResponse.json({ 
            success: false, 
            error: 'Push ל-GitHub נכשל',
            details: error.message
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Push ל-GitHub זמין רק בסביבה מקומית',
          info: 'בסביבת Production, בצע git push מהטרמינל'
        }, { status: 400 });
      }
    }

    if (action === 'update') {
      // Check if running locally (not on Vercel)
      const isLocal = !process.env.VERCEL && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
      
      if (isLocal) {
        // Try update-all.cmd script first
        try {
          const scriptPath = path.join(process.cwd(), 'backups', 'database', 'update-all.cmd');
          apiDebugLog('[Update] Running script:', scriptPath);
          
          const { stdout } = await execAsync(`"${scriptPath}"`, { 
            cwd: process.cwd(),
            timeout: 180000 
          });
          
          await logAdminActivity({
            action: 'update',
            entity: 'system',
            userId: user.userId,
            userEmail: user.email,
            description: 'עדכון מערכת באמצעות update-all.cmd',
            metadata: { type: 'script', output: (stdout || '').substring(0, 500) }
          });

          return NextResponse.json({ 
            success: true, 
            message: 'עדכון מערכת הושלם באמצעות update-all.cmd!',
            details: stdout,
            info: 'הסקריפט ביצע: גיבוי, תיוג גרסה, ופתיחת Vercel',
            scriptUsed: 'update-all.cmd'
          });
        } catch (scriptError) {
          apiDebugLog('[Update] Script failed, trying git pull:', scriptError.message);
          
          // Fallback to git pull
          try {
            const cwd = process.cwd();
            const { stdout: pullOutput } = await execAsync('git pull origin main', { cwd });
            
            let updateResult = pullOutput || '';
            let hasChanges = !updateResult.includes('Already up to date');
            
            await logAdminActivity({
              action: 'update',
              entity: 'system',
              userId: user.userId,
              userEmail: user.email,
              description: hasChanges ? 'עדכון מערכת - נמשכו שינויים' : 'עדכון מערכת - אין שינויים',
              metadata: { type: 'git_pull', hasChanges }
            });

            if (hasChanges) {
              try {
                await execAsync('npm install', { cwd, timeout: 120000 });
              } catch (npmErr) {
                apiDebugLog('[Update] npm install warning:', npmErr.message);
              }
            }
            
            return NextResponse.json({ 
              success: true, 
              message: hasChanges ? 'עדכון מערכת הושלם! נמשכו שינויים.' : 'המערכת מעודכנת!',
              details: updateResult,
              hasChanges
            });
          } catch (gitError) {
            return NextResponse.json({ 
              success: false, 
              error: 'שגיאה בעדכון המערכת',
              details: gitError.message,
              commands: ['git pull origin main', 'npm install']
            }, { status: 500 });
          }
        }
      } else {
        // In Vercel serverless, provide instructions
        return NextResponse.json({ 
          success: true, 
          message: 'בסביבת Vercel, העדכון מתבצע אוטומטית עם git push.',
          commands: [
            'git pull origin main',
            'git add .',
            'git commit -m "Update"',
            'git push origin main'
          ],
          info: 'לאחר ה-push, Vercel יעדכן את האתר אוטומטית.'
        });
      }
    }

    if (action === 'server') {
      const isLocal = !process.env.VERCEL && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
      
      if (!isLocal) {
        return NextResponse.json({ 
          error: 'הפעלת שרת זמינה רק בסביבה מקומית' 
        }, { status: 400 });
      }

      // הפעלת סקריפט Auto-Restart
      try {
        const scriptPath = path.join(process.cwd(), 'backups', 'database', 'Start-VIPO-Auto-Restart.cmd');
        
        if (!fs.existsSync(scriptPath)) {
          return NextResponse.json({ 
            error: 'סקריפט ההפעלה לא נמצא',
            path: scriptPath
          }, { status: 404 });
        }

        // הפעלה בחלון נפרד - עם גרשיים לנתיבים עם רווחים
        const { spawn } = require('child_process');
        spawn('cmd', ['/c', 'start', '""', `"${scriptPath}"`], {
          detached: true,
          stdio: 'ignore',
          shell: true
        }).unref();

        await logAdminActivity({
          action: 'server',
          entity: 'system',
          userId: user.userId,
          userEmail: user.email,
          description: 'הפעלת שרת עם Auto-Restart',
          metadata: { script: 'Start-VIPO-Auto-Restart.cmd' }
        });

        return NextResponse.json({ 
          success: true, 
          message: 'סקריפט Auto-Restart הופעל בהצלחה!\n\nהשרת יסגור כל שרת קיים על פורט 3001 ויפעיל שרת חדש.\nבנוסף, הוא יפעיל מחדש אוטומטית כשיש שינויים בקוד.',
          info: 'חלון PowerShell חדש נפתח עם השרת.'
        });
      } catch (error) {
        console.error('[Server] Error:', error);
        return NextResponse.json({ 
          success: true, 
          message: 'להפעלה ידנית, לחץ פעמיים על:\nbackups\\database\\Start-VIPO-Auto-Restart.cmd',
          error: error.message
        });
      }
    }

    if (action === 'restore') {
      // Restore from uploaded backup JSON
      const { backupData } = body;
      
      if (!backupData || !backupData.collections) {
        return NextResponse.json({ 
          error: 'קובץ גיבוי לא תקין. חסר מידע על collections.' 
        }, { status: 400 });
      }

      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      const collectionsObj = backupData.collections || {};
      const restoreCollections = Object.keys(collectionsObj).filter((name) => name !== 'meta');
      const restoreCounts = {};
      for (const [name, collectionData] of Object.entries(collectionsObj)) {
        if (name === 'meta') continue;
        restoreCounts[name] = Array.isArray(collectionData?.data) ? collectionData.data.length : 0;
      }
      const selectedBackup = {
        id: body?.backupId || '',
        file: body?.backupFileName || '',
      };
      const preview = await buildRestorePreview(db, selectedBackup, restoreCollections, restoreCounts);
      const guard = verifyRestoreGuards({
        body,
        selectedBackup,
        restoreCollections,
        nodeEnv: process.env.NODE_ENV || 'development',
      });
      if (guard.dryRun) {
        return NextResponse.json({
          ok: true,
          dryRun: true,
          deleteEnabled: false,
          action,
          preview,
          message: 'Restore dry-run preview only. No data was modified.',
        });
      }
      if (!guard.ok) {
        return blockedRestoreResponse();
      }
      console.warn('[BACKUP_RESTORE_AUDIT]', {
        action: 'backup_restore',
        restoreAction: action,
        actorId: user?.userId || null,
        actorEmail: user?.userEmail || user?.email || null,
        actorRole: user?.role || null,
        selectedBackupId: selectedBackup.id || null,
        selectedBackupFile: selectedBackup.file || null,
        reason: guard.reason,
        NODE_ENV: process.env.NODE_ENV || 'development',
        ALLOW_BACKUP_RESTORE: guard.allowBackupRestore,
        dryRun: false,
        targetCollections: preview.targetCollections,
        currentCounts: preview.currentCounts,
        restoreCounts: preview.restoreCounts,
      });
      
      const restoredCollections = [];
      const errors = [];
      
      for (const [collectionName, collectionData] of Object.entries(backupData.collections)) {
        try {
          const collection = db.collection(collectionName);
          
          // Delete existing data
          await collection.deleteMany({});
          
          // Insert backup data
          if (collectionData.data && collectionData.data.length > 0) {
            // Convert string dates back to Date objects and handle ObjectIds
            const docs = collectionData.data.map(doc => {
              const processedDoc = { ...doc };
              // Handle _id if it's an object with $oid
              if (processedDoc._id && typeof processedDoc._id === 'object' && processedDoc._id.$oid) {
                const { ObjectId } = require('mongodb');
                processedDoc._id = new ObjectId(processedDoc._id.$oid);
              }
              return processedDoc;
            });
            
            await collection.insertMany(docs);
          }
          
          restoredCollections.push({
            name: collectionName,
            count: collectionData.data?.length || 0
          });
        } catch (err) {
          console.error(`Error restoring ${collectionName}:`, err);
          errors.push({ collection: collectionName, error: err.message });
        }
      }
      
      // Log restore action
      await logAdminActivity({
        action: 'restore',
        entity: 'system',
        userId: user.userId,
        userEmail: user.email,
        description: 'שחזור מסד נתונים מגיבוי',
        metadata: { 
          type: 'database',
          backupTimestamp: backupData.timestamp,
          collectionsRestored: restoredCollections.length,
          errors: errors.length
        }
      });

      if (errors.length > 0) {
        return NextResponse.json({ 
          success: true,
          message: `שחזור הושלם עם ${errors.length} שגיאות`,
          restored: restoredCollections,
          errors
        });
      }

      return NextResponse.json({ 
        success: true, 
        message: `שחזור הושלם בהצלחה! שוחזרו ${restoredCollections.length} קולקציות.`,
        restored: restoredCollections
      });
    }

    // שחזור מגיבוי מקומי בלבד (ללא Deploy)
    if (action === 'restoreFromLocal') {
      const { backupName } = body;
      
      if (!backupName) {
        return NextResponse.json({ error: 'חסר שם גיבוי' }, { status: 400 });
      }

      const isLocal = !process.env.VERCEL && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
      
      if (!isLocal) {
        return NextResponse.json({ 
          error: 'שחזור מגיבוי מקומי זמין רק בסביבת פיתוח' 
        }, { status: 400 });
      }

      const backupDir = path.join(process.cwd(), 'backups', 'database', backupName);
      
      if (!fs.existsSync(backupDir)) {
        return NextResponse.json({ error: `גיבוי לא נמצא: ${backupName}` }, { status: 404 });
      }

      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      
      const restoredCollections = [];
      const errors = [];
      
      const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
      const restoreCollections = files.map((file) => file.replace('.json', ''));
      const restoreCounts = {};
      for (const file of files) {
        try {
          const filePath = path.join(backupDir, file);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const docs = JSON.parse(fileContent);
          restoreCounts[file.replace('.json', '')] = Array.isArray(docs) ? docs.length : 0;
        } catch {
          restoreCounts[file.replace('.json', '')] = 0;
        }
      }
      const selectedBackup = { id: body?.backupId || '', file: backupName };
      const preview = await buildRestorePreview(db, selectedBackup, restoreCollections, restoreCounts);
      const guard = verifyRestoreGuards({
        body,
        selectedBackup,
        restoreCollections,
        nodeEnv: process.env.NODE_ENV || 'development',
      });
      if (guard.dryRun) {
        return NextResponse.json({
          ok: true,
          dryRun: true,
          deleteEnabled: false,
          action,
          preview,
          message: 'Restore dry-run preview only. No data was modified.',
        });
      }
      if (!guard.ok) {
        return blockedRestoreResponse();
      }
      console.warn('[BACKUP_RESTORE_AUDIT]', {
        action: 'backup_restore',
        restoreAction: action,
        actorId: user?.userId || null,
        actorEmail: user?.userEmail || user?.email || null,
        actorRole: user?.role || null,
        selectedBackupId: selectedBackup.id || null,
        selectedBackupFile: selectedBackup.file || null,
        reason: guard.reason,
        NODE_ENV: process.env.NODE_ENV || 'development',
        ALLOW_BACKUP_RESTORE: guard.allowBackupRestore,
        dryRun: false,
        targetCollections: preview.targetCollections,
        currentCounts: preview.currentCounts,
        restoreCounts: preview.restoreCounts,
      });
      
      for (const file of files) {
        const collectionName = file.replace('.json', '');
        try {
          const filePath = path.join(backupDir, file);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const docs = JSON.parse(fileContent);
          
          const collection = db.collection(collectionName);
          await collection.deleteMany({});
          
          if (docs && docs.length > 0) {
            const { ObjectId } = require('mongodb');
            const processedDocs = docs.map(doc => {
              const processed = { ...doc };
              if (processed._id && typeof processed._id === 'object' && processed._id.$oid) {
                processed._id = new ObjectId(processed._id.$oid);
              } else if (processed._id && typeof processed._id === 'string' && processed._id.length === 24) {
                try {
                  processed._id = new ObjectId(processed._id);
                } catch (e) {}
              }
              return processed;
            });
            
            await collection.insertMany(processedDocs);
          }
          
          restoredCollections.push({
            name: collectionName,
            count: docs?.length || 0
          });
        } catch (err) {
          console.error(`Error restoring ${collectionName}:`, err);
          errors.push({ collection: collectionName, error: err.message });
        }
      }

      await logAdminActivity({
        action: 'restore',
        entity: 'system',
        userId: user.userId,
        userEmail: user.email,
        description: `שחזור מגיבוי ${backupName}`,
        metadata: { 
          type: 'restoreFromLocal',
          backupName,
          collectionsRestored: restoredCollections.length,
          errors: errors.length
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: `שחזור מגיבוי "${backupName}" הושלם בהצלחה!`,
        restored: restoredCollections,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    // שחזור מגיבוי מקומי והעלאה ל-Vercel
    if (action === 'restoreAndDeploy') {
      const { backupName } = body;
      
      if (!backupName) {
        return NextResponse.json({ error: 'חסר שם גיבוי' }, { status: 400 });
      }

      const isLocal = !process.env.VERCEL && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
      
      if (!isLocal) {
        return NextResponse.json({ 
          error: 'שחזור מגיבוי מקומי זמין רק בסביבת פיתוח' 
        }, { status: 400 });
      }

      const backupDir = path.join(process.cwd(), 'backups', 'database', backupName);
      
      if (!fs.existsSync(backupDir)) {
        return NextResponse.json({ error: `גיבוי לא נמצא: ${backupName}` }, { status: 404 });
      }

      // שלב 1: שחזור מסד הנתונים
      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      
      const restoredCollections = [];
      const errors = [];
      
      // קריאת כל קבצי ה-JSON בתיקיית הגיבוי
      const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
      const restoreCollections = files.map((file) => file.replace('.json', ''));
      const restoreCounts = {};
      for (const file of files) {
        try {
          const filePath = path.join(backupDir, file);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const docs = JSON.parse(fileContent);
          restoreCounts[file.replace('.json', '')] = Array.isArray(docs) ? docs.length : 0;
        } catch {
          restoreCounts[file.replace('.json', '')] = 0;
        }
      }
      const selectedBackup = { id: body?.backupId || '', file: backupName };
      const preview = await buildRestorePreview(db, selectedBackup, restoreCollections, restoreCounts);
      const guard = verifyRestoreGuards({
        body,
        selectedBackup,
        restoreCollections,
        nodeEnv: process.env.NODE_ENV || 'development',
      });
      if (guard.dryRun) {
        return NextResponse.json({
          ok: true,
          dryRun: true,
          deleteEnabled: false,
          action,
          preview,
          message: 'Restore dry-run preview only. No data was modified.',
        });
      }
      if (!guard.ok) {
        return blockedRestoreResponse();
      }
      console.warn('[BACKUP_RESTORE_AUDIT]', {
        action: 'backup_restore',
        restoreAction: action,
        actorId: user?.userId || null,
        actorEmail: user?.userEmail || user?.email || null,
        actorRole: user?.role || null,
        selectedBackupId: selectedBackup.id || null,
        selectedBackupFile: selectedBackup.file || null,
        reason: guard.reason,
        NODE_ENV: process.env.NODE_ENV || 'development',
        ALLOW_BACKUP_RESTORE: guard.allowBackupRestore,
        dryRun: false,
        targetCollections: preview.targetCollections,
        currentCounts: preview.currentCounts,
        restoreCounts: preview.restoreCounts,
      });
      
      for (const file of files) {
        const collectionName = file.replace('.json', '');
        try {
          const filePath = path.join(backupDir, file);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const docs = JSON.parse(fileContent);
          
          const collection = db.collection(collectionName);
          
          // מחיקת נתונים קיימים
          await collection.deleteMany({});
          
          // הכנסת נתוני הגיבוי
          if (docs && docs.length > 0) {
            // טיפול ב-ObjectId
            const { ObjectId } = require('mongodb');
            const processedDocs = docs.map(doc => {
              const processed = { ...doc };
              if (processed._id && typeof processed._id === 'object' && processed._id.$oid) {
                processed._id = new ObjectId(processed._id.$oid);
              } else if (processed._id && typeof processed._id === 'string' && processed._id.length === 24) {
                try {
                  processed._id = new ObjectId(processed._id);
                } catch (e) {
                  // Keep as string if not valid ObjectId
                }
              }
              return processed;
            });
            
            await collection.insertMany(processedDocs);
          }
          
          restoredCollections.push({
            name: collectionName,
            count: docs?.length || 0
          });
        } catch (err) {
          console.error(`Error restoring ${collectionName}:`, err);
          errors.push({ collection: collectionName, error: err.message });
        }
      }

      // שלב 2: Git commit & push
      let gitResult = '';
      try {
        const cwd = process.cwd();
        await execAsync('git add .', { cwd });
        await execAsync(`git commit -m "Restore from backup: ${backupName}" --allow-empty`, { cwd });
        const { stdout: pushOutput } = await execAsync('git push origin main', { cwd, timeout: 60000 });
        gitResult = pushOutput;
      } catch (gitErr) {
        console.error('[RestoreAndDeploy] Git error:', gitErr.message);
        gitResult = gitErr.message;
      }

      // שלב 3: Deploy ל-Vercel
      let deployResult = '';
      const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
      
      if (deployHookUrl) {
        try {
          const deployRes = await fetch(deployHookUrl, { method: 'POST' });
          if (deployRes.ok) {
            deployResult = 'Deploy triggered successfully';
          }
        } catch (deployErr) {
          deployResult = deployErr.message;
        }
      } else {
        deployResult = 'No deploy hook configured - deploy manually from Vercel';
      }

      // לוג פעילות
      await logAdminActivity({
        action: 'restore',
        entity: 'system',
        userId: user.userId,
        userEmail: user.email,
        description: `שחזור מגיבוי ${backupName} והעלאה ל-Vercel`,
        metadata: { 
          type: 'restoreAndDeploy',
          backupName,
          collectionsRestored: restoredCollections.length,
          errors: errors.length,
          gitResult: gitResult.substring(0, 200),
          deployResult
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: `שחזור מגיבוי "${backupName}" הושלם והועלה ל-Vercel!`,
        restored: restoredCollections,
        errors: errors.length > 0 ? errors : undefined,
        gitResult,
        deployUrl: 'https://vercel.com/vipos-projects-0154d019/vipo-agents-test/deployments'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Backup error:', error);
    
    // שליחת התראה על כשלון
    await sendFailureAlert('פעולת מערכת', error.message, user?.email);
    
    return NextResponse.json({ 
      error: 'Failed to run backup', 
      details: error.message 
    }, { status: 500 });
  }
}

// Helper to get directory size
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

// Helper to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
