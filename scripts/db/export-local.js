// scripts/db/export-local.js
// Export all collections from the configured MongoDB into JSON files
// Auto-cleanup: keeps only the last 10 backups

const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');
const dotenv = require('dotenv');

const envFiles = [
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), 'app', '.env.local'),
];

for (const envFile of envFiles) {
  dotenv.config({ path: envFile, override: true });
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'vipo';
const backupRoot = path.join(process.cwd(), 'backups', 'database');
const MAX_BACKUPS = 10; // מספר הגיבויים המקסימלי לשמור

// פונקציה למחיקת תיקייה רקורסיבית
async function deleteDirectory(dirPath) {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        await deleteDirectory(fullPath);
      } else {
        await fs.unlink(fullPath);
      }
    }
    await fs.rmdir(dirPath);
  } catch (err) {
    console.error(`   ⚠️  Failed to delete ${dirPath}:`, err.message);
  }
}

// פונקציה לניקוי גיבויים ישנים - שומרת רק 10 אחרונים
async function cleanupOldBackups() {
  console.log('\n🧹 Checking for old backups to cleanup...');
  
  try {
    const items = await fs.readdir(backupRoot, { withFileTypes: true });
    
    // סינון רק תיקיות גיבוי בפורמט mongo-YYYY-MM-DD...
    const backupDirs = items
      .filter(item => item.isDirectory() && item.name.startsWith('mongo-'))
      .map(item => ({
        name: item.name,
        path: path.join(backupRoot, item.name)
      }))
      .sort((a, b) => b.name.localeCompare(a.name)); // מיון מהחדש לישן
    
    console.log(`   📊 Found ${backupDirs.length} backup folders`);
    
    if (backupDirs.length <= MAX_BACKUPS) {
      console.log(`   ✅ No cleanup needed (keeping ${MAX_BACKUPS} backups)`);
      return;
    }
    
    // מחיקת גיבויים ישנים
    const toDelete = backupDirs.slice(MAX_BACKUPS);
    console.log(`   🗑️  Deleting ${toDelete.length} old backups...`);
    
    for (const backup of toDelete) {
      console.log(`   ↳ Deleting: ${backup.name}`);
      await deleteDirectory(backup.path);
    }
    
    console.log(`   ✅ Cleanup complete! Kept ${MAX_BACKUPS} most recent backups`);
  } catch (err) {
    console.error('   ⚠️  Cleanup failed:', err.message);
  }
}

if (!uri) {
  console.error('❌ MONGODB_URI missing. Aborting export.');
  process.exit(1);
}

async function exportDb() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportDir = path.join(backupRoot, `mongo-${timestamp}`);
  await fs.mkdir(exportDir, { recursive: true });

  const client = new MongoClient(uri);
  try {
    console.log('📦 Connecting to MongoDB...');
    await client.connect();
    console.log(`✅ Connected. Database: ${dbName}`);

    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    if (!collections.length) {
      console.warn('⚠️  No collections found to export.');
      return;
    }

    for (const coll of collections) {
      const colName = coll.name;
      console.log(`➡️  Exporting collection: ${colName}`);
      const docs = await db.collection(colName).find({}).toArray();
      const filePath = path.join(exportDir, `${colName}.json`);
      const json = EJSON.stringify(docs, null, 2);
      await fs.writeFile(filePath, json, 'utf8');
      console.log(
        `   ↳ Saved ${docs.length} documents to ${path.relative(process.cwd(), filePath)}`,
      );
    }

    const repoRoot = process.cwd();
    const restorePs1 = [
      'param(',
      '    [string]$MongoUri = ""',
      ')',
      '',
      `$repoRoot = "${repoRoot}"`,
      `$backupDir = "${exportDir}"`,
      '',
      'if ($MongoUri) { $env:MONGODB_URI = $MongoUri }',
      '',
      'Set-Location $repoRoot',
      'Write-Host "Restoring backup from $backupDir"',
      'node scripts/db/restore-from-dir.js "$backupDir"',
    ].join('\r\n');

    const restoreCmd = [
      '@echo off',
      'setlocal',
      `set "REPO_ROOT=${repoRoot}"`,
      `set "BACKUP_DIR=${exportDir}"`,
      'cd /d "%REPO_ROOT%"',
      'if not "%~1"=="" set "MONGODB_URI=%~1"',
      'echo Restoring backup from "%BACKUP_DIR%"',
      'node scripts\\db\\restore-from-dir.js "%BACKUP_DIR%"',
      'endlocal',
      'pause',
    ].join('\r\n');

    await fs.writeFile(path.join(exportDir, 'restore.ps1'), restorePs1, 'utf8');
    await fs.writeFile(path.join(exportDir, 'restore.cmd'), restoreCmd, 'utf8');
    console.log('   ↳ Helper scripts created: restore.ps1 / restore.cmd');

    console.log(`✅ Export complete. Files saved to ${path.relative(process.cwd(), exportDir)}`);
    
    // ניקוי גיבויים ישנים אחרי גיבוי מוצלח
    await cleanupOldBackups();
  } catch (err) {
    console.error('❌ Export failed:', err);
    process.exitCode = 1;
  } finally {
    await client.close().catch(() => {});
  }
}

exportDb();
