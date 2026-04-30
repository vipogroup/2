import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { requireSuperAdminApi } from '@/lib/auth/server';
import { rateLimiters } from '@/lib/rateLimit';
import { logAdminActivity } from '@/lib/auditMiddleware';

const ZIP_RESTORE_CONFIRM_TOKEN = 'RESTORE_ZIP_BACKUP_IRREVERSIBLE';

function blockedZipRestoreResponse() {
  return NextResponse.json(
    {
      error: 'backup_zip_restore_blocked',
      message: 'ZIP backup restore is blocked without explicit super-admin confirmation.',
    },
    { status: 403 },
  );
}

function parseBooleanFormValue(value, defaultValue = false) {
  if (value == null) return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function normalizeCollectionList(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((item) => String(item || '').trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

async function POSTHandler(req) {
  const rateLimit = rateLimiters.admin(req);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.message }, { status: 429 });
  }

  let user;
  try {
    user = await requireSuperAdminApi(req);
  } catch (err) {
    const status = err?.status || 401;
    const message = status === 403 ? 'Forbidden' : 'Unauthorized';
    return NextResponse.json({ error: message }, { status });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const action = formData.get('action');

    if (!file) {
      return NextResponse.json({ error: 'לא נבחר קובץ' }, { status: 400 });
    }

    if (action === 'restoreFromZip') {
      // קריאת קובץ ה-ZIP
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // חילוץ ה-ZIP
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();

      // חיפוש קובץ database-backup.json
      let dbBackupEntry = zipEntries.find(entry => 
        entry.entryName === 'database-backup.json' || 
        entry.entryName.endsWith('/database-backup.json')
      );

      if (!dbBackupEntry) {
        return NextResponse.json({ 
          error: 'לא נמצא קובץ database-backup.json בתוך ה-ZIP' 
        }, { status: 400 });
      }

      // קריאת תוכן קובץ הגיבוי
      const dbBackupContent = zip.readAsText(dbBackupEntry);
      let backupData;
      
      try {
        backupData = JSON.parse(dbBackupContent);
      } catch (parseErr) {
        return NextResponse.json({ 
          error: 'קובץ הגיבוי לא תקין - לא ניתן לפרסר JSON' 
        }, { status: 400 });
      }

      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      // בדיקת פורמט הגיבוי
      const collections = backupData.collections || backupData;
      const targetCollections = Object.keys(collections).filter((name) => name !== 'meta');
      const estimatedRestoreCounts = {};
      for (const [collectionName, docs] of Object.entries(collections)) {
        if (collectionName === 'meta') continue;
        estimatedRestoreCounts[collectionName] = Array.isArray(docs) ? docs.length : 0;
      }

      const currentCounts = {};
      for (const collectionName of targetCollections) {
        try {
          currentCounts[collectionName] = await db.collection(collectionName).countDocuments({});
        } catch {
          currentCounts[collectionName] = 0;
        }
      }

      const dryRun = parseBooleanFormValue(formData.get('dryRun'), true);
      const allowBackupUploadRestore = process.env.ALLOW_BACKUP_UPLOAD_RESTORE === 'true';
      const nodeEnv = process.env.NODE_ENV || 'development';
      const uploadedFilename = String(file?.name || '').trim();

      if (dryRun) {
        return NextResponse.json({
          ok: true,
          action,
          dryRun: true,
          deleteEnabled: false,
          preview: {
            uploadedFilename: uploadedFilename || null,
            collectionsFound: targetCollections,
            estimatedRestoreCounts,
            currentCounts,
          },
          message: 'ZIP restore dry-run preview only. No data was modified.',
        });
      }

      const confirm = String(formData.get('confirm') || '').trim();
      const acknowledgeOverwrite = parseBooleanFormValue(formData.get('acknowledgeOverwrite'), false);
      const reason = String(formData.get('reason') || '').trim();
      const confirmEnvironment = String(formData.get('confirmEnvironment') || '').trim();
      const confirmBackupFile = String(formData.get('confirmBackupFile') || '').trim();
      const confirmCollections = normalizeCollectionList(formData.get('confirmCollections'));
      const hasAllCollections = targetCollections.every((name) => confirmCollections.includes(name));

      const guardsOk =
        allowBackupUploadRestore &&
        confirm === ZIP_RESTORE_CONFIRM_TOKEN &&
        acknowledgeOverwrite === true &&
        reason.length > 0 &&
        confirmEnvironment === nodeEnv &&
        (!uploadedFilename || confirmBackupFile === uploadedFilename) &&
        targetCollections.length > 0 &&
        hasAllCollections;

      if (!guardsOk) {
        return blockedZipRestoreResponse();
      }

      console.warn('[BACKUP_ZIP_RESTORE_AUDIT]', {
        action: 'backup_zip_restore',
        actorId: user.id || user._id || null,
        actorEmail: user.email || null,
        actorRole: user.role || null,
        uploadedFilename: uploadedFilename || null,
        reason,
        NODE_ENV: nodeEnv,
        ALLOW_BACKUP_UPLOAD_RESTORE: allowBackupUploadRestore,
        dryRun: false,
        targetCollections,
        currentCounts,
        estimatedRestoreCounts,
      });
      
      const restored = [];
      const errors = [];

      for (const [collectionName, docs] of Object.entries(collections)) {
        if (collectionName === 'meta') continue;
        
        try {
          const collection = db.collection(collectionName);
          
          // מחיקת הנתונים הקיימים
          await collection.deleteMany({});
          
          // הכנסת הנתונים החדשים
          if (Array.isArray(docs) && docs.length > 0) {
            await collection.insertMany(docs, { ordered: false });
          }
          
          restored.push({ name: collectionName, count: Array.isArray(docs) ? docs.length : 0 });
        } catch (err) {
          console.error(`Error restoring ${collectionName}:`, err.message);
          errors.push({ collection: collectionName, error: err.message });
        }
      }

      // לוג פעילות
      await logAdminActivity({
        action: 'restore',
        entity: 'system',
        userId: user.id || user._id || null,
        userEmail: user.email || null,
        description: 'שחזור מקובץ ZIP',
        metadata: { 
          fileName: file.name,
          collectionsRestored: restored.length,
          errors: errors.length
        }
      });

      return NextResponse.json({
        success: true,
        message: `שחזור מ-ZIP הושלם בהצלחה! שוחזרו ${restored.length} קולקציות`,
        restored,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 });

  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json({ 
      error: 'שגיאה בעיבוד הקובץ: ' + error.message 
    }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
