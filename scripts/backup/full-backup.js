#!/usr/bin/env node
/**
 * Full System Backup Script
 * Creates comprehensive backup of MongoDB, Code (Git tag), and configuration
 * 
 * Usage: node scripts/backup/full-backup.js [backup-name]
 * Example: node scripts/backup/full-backup.js pre-payplus-upgrade
 */

const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables (.env first, then .env.local overrides)
const envFiles = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '.env.local'),
];
for (const envFile of envFiles) {
  if (fsSync.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: true });
  }
}

const BACKUP_ROOT = path.join(process.cwd(), 'backups', 'full');
const MAX_FULL_BACKUPS = 5;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(emoji, message, color = '') {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(`${colors.bold}${colors.cyan}  ${title}${colors.reset}`);
  console.log('═'.repeat(60));
}

async function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

async function createBackupDirectory(backupName) {
  const timestamp = await getTimestamp();
  const dirName = backupName ? `${timestamp}_${backupName}` : timestamp;
  const backupDir = path.join(BACKUP_ROOT, dirName);
  await fs.mkdir(backupDir, { recursive: true });
  return { backupDir, timestamp, dirName };
}

// ═══════════════════════════════════════════════════════════════
// MONGODB BACKUP
// ═══════════════════════════════════════════════════════════════
async function backupMongoDB(backupDir) {
  logSection('MongoDB Backup');
  
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'vipo';
  
  if (!uri) {
    log('❌', 'MONGODB_URI not found - skipping database backup', colors.red);
    return { success: false, error: 'No MONGODB_URI' };
  }
  
  const mongoDir = path.join(backupDir, 'mongodb');
  await fs.mkdir(mongoDir, { recursive: true });
  
  const client = new MongoClient(uri);
  const stats = { collections: 0, documents: 0, size: 0 };
  
  try {
    log('🔌', 'Connecting to MongoDB...', colors.yellow);
    await client.connect();
    log('✅', `Connected to database: ${dbName}`, colors.green);
    
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    
    if (!collections.length) {
      log('⚠️', 'No collections found', colors.yellow);
      return { success: true, stats };
    }
    
    for (const coll of collections) {
      const colName = coll.name;
      const docs = await db.collection(colName).find({}).toArray();
      const filePath = path.join(mongoDir, `${colName}.json`);
      const json = JSON.stringify(docs, null, 2);
      await fs.writeFile(filePath, json, 'utf8');
      
      stats.collections++;
      stats.documents += docs.length;
      stats.size += Buffer.byteLength(json, 'utf8');
      
      log('  📦', `${colName}: ${docs.length} documents`);
    }
    
    // Save metadata
    const metadata = {
      timestamp: new Date().toISOString(),
      database: dbName,
      collections: stats.collections,
      totalDocuments: stats.documents,
      collectionNames: collections.map(c => c.name)
    };
    await fs.writeFile(
      path.join(mongoDir, '_metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    log('✅', `MongoDB backup complete: ${stats.collections} collections, ${stats.documents} documents`, colors.green);
    return { success: true, stats };
    
  } catch (err) {
    log('❌', `MongoDB backup failed: ${err.message}`, colors.red);
    return { success: false, error: err.message };
  } finally {
    await client.close().catch(() => {});
  }
}

// ═══════════════════════════════════════════════════════════════
// GIT BACKUP (Tag + Branch)
// ═══════════════════════════════════════════════════════════════
async function backupGit(backupDir, backupName, timestamp) {
  logSection('Git Backup');
  
  const gitDir = path.join(backupDir, 'git');
  await fs.mkdir(gitDir, { recursive: true });
  
  try {
    // Check if git is available
    execSync('git --version', { stdio: 'pipe' });
    
    // Get current branch and commit
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    const currentCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
    
    log('📍', `Current branch: ${currentBranch}`, colors.blue);
    log('📍', `Current commit: ${currentCommit.slice(0, 8)}`, colors.blue);
    
    // Create backup tag
    const tagName = `backup/${timestamp}${backupName ? '_' + backupName : ''}`;
    const tagMessage = `Backup created at ${new Date().toISOString()}${backupName ? ' - ' + backupName : ''}`;
    
    try {
      execSync(`git tag -a "${tagName}" -m "${tagMessage}"`, { stdio: 'pipe' });
      log('🏷️', `Created tag: ${tagName}`, colors.green);
    } catch (tagErr) {
      log('⚠️', `Tag creation failed (may already exist): ${tagErr.message}`, colors.yellow);
    }
    
    // Save git info
    const gitInfo = {
      timestamp: new Date().toISOString(),
      branch: currentBranch,
      commit: currentCommit,
      commitMessage,
      tag: tagName,
      remotes: execSync('git remote -v', { encoding: 'utf8' }).trim().split('\n')
    };
    await fs.writeFile(
      path.join(gitDir, 'git-info.json'),
      JSON.stringify(gitInfo, null, 2)
    );
    
    // Save recent commit history
    const commitHistory = execSync('git log -20 --pretty=format:"%H|%ai|%an|%s"', { encoding: 'utf8' });
    await fs.writeFile(path.join(gitDir, 'commit-history.txt'), commitHistory);
    
    // Save list of modified files (not committed)
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        await fs.writeFile(path.join(gitDir, 'uncommitted-changes.txt'), status);
        log('⚠️', `Found uncommitted changes - saved to uncommitted-changes.txt`, colors.yellow);
      }
    } catch (e) {}
    
    log('✅', 'Git backup complete', colors.green);
    return { success: true, tag: tagName, commit: currentCommit };
    
  } catch (err) {
    log('❌', `Git backup failed: ${err.message}`, colors.red);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// ENVIRONMENT & CONFIG BACKUP
// ═══════════════════════════════════════════════════════════════
async function backupConfig(backupDir) {
  logSection('Configuration Backup');
  
  const configDir = path.join(backupDir, 'config');
  await fs.mkdir(configDir, { recursive: true });
  
  const configFiles = [
    'package.json',
    'package-lock.json',
    'next.config.mjs',
    'tailwind.config.js',
    'tsconfig.json',
    'vercel.json',
    '.env.example',
    'middleware.js'
  ];
  
  let backedUp = 0;
  
  for (const file of configFiles) {
    const srcPath = path.join(process.cwd(), file);
    if (fsSync.existsSync(srcPath)) {
      const destPath = path.join(configDir, file);
      await fs.copyFile(srcPath, destPath);
      log('  📄', file);
      backedUp++;
    }
  }
  
  // Save environment variable names (not values!) for reference
  const envVarNames = {
    timestamp: new Date().toISOString(),
    note: 'This file contains environment variable NAMES only, not values',
    variables: Object.keys(process.env).filter(k => 
      k.startsWith('MONGODB') || 
      k.startsWith('PAYPLUS') || 
      k.startsWith('PRIORITY') ||
      k.startsWith('NEXT') ||
      k.startsWith('VERCEL') ||
      k.startsWith('SENDGRID') ||
      k.startsWith('CLOUDINARY') ||
      k.startsWith('JWT') ||
      k.startsWith('GOOGLE')
    )
  };
  await fs.writeFile(
    path.join(configDir, 'env-variables-reference.json'),
    JSON.stringify(envVarNames, null, 2)
  );
  
  log('✅', `Configuration backup complete: ${backedUp} files`, colors.green);
  return { success: true, files: backedUp };
}

// ═══════════════════════════════════════════════════════════════
// VERCEL CONFIG DOCUMENTATION
// ═══════════════════════════════════════════════════════════════
async function backupVercelInfo(backupDir) {
  logSection('Vercel Configuration');
  
  const vercelDir = path.join(backupDir, 'vercel');
  await fs.mkdir(vercelDir, { recursive: true });
  
  const vercelInfo = {
    timestamp: new Date().toISOString(),
    project: process.env.VERCEL_PROJECT_PRODUCTION_URL || 'N/A',
    deploymentUrl: process.env.VERCEL_URL || 'N/A',
    environment: process.env.VERCEL_ENV || 'N/A',
    note: 'For full Vercel backup, use Vercel CLI: vercel env pull',
    instructions: [
      '1. Install Vercel CLI: npm i -g vercel',
      '2. Login: vercel login',
      '3. Pull environment: vercel env pull .env.vercel',
      '4. List deployments: vercel ls',
      '5. Rollback: vercel rollback [deployment-url]'
    ]
  };
  
  await fs.writeFile(
    path.join(vercelDir, 'vercel-info.json'),
    JSON.stringify(vercelInfo, null, 2)
  );
  
  log('✅', 'Vercel info documented', colors.green);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// CREATE RESTORE SCRIPTS
// ═══════════════════════════════════════════════════════════════
async function createRestoreScripts(backupDir, dirName) {
  logSection('Creating Restore Scripts');
  
  const repoRoot = process.cwd();
  
  // PowerShell restore script
  const restorePs1 = `
# Restore Script for backup: ${dirName}
# Usage: .\\restore.ps1 [-MongoUri "mongodb://..."]

param(
    [string]$MongoUri = ""
)

$ErrorActionPreference = "Stop"
$BackupDir = $PSScriptRoot
$RepoRoot = "${repoRoot.replace(/\\/g, '\\\\')}"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  VIPO System Restore" -ForegroundColor Cyan
Write-Host "  Backup: ${dirName}" -ForegroundColor Cyan  
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Restore MongoDB
Write-Host ""
Write-Host "🔄 Restoring MongoDB..." -ForegroundColor Yellow
if ($MongoUri) { 
    $env:MONGODB_URI = $MongoUri 
}
Set-Location $RepoRoot

$mongoBackupDir = Join-Path $BackupDir "mongodb"
if (Test-Path $mongoBackupDir) {
    node scripts/db/restore-from-dir.js "$mongoBackupDir"
    Write-Host "✅ MongoDB restored" -ForegroundColor Green
} else {
    Write-Host "⚠️ No MongoDB backup found" -ForegroundColor Yellow
}

# Restore Git tag
Write-Host ""
Write-Host "🔄 Checking Git tag..." -ForegroundColor Yellow
$gitInfoFile = Join-Path $BackupDir "git" "git-info.json"
if (Test-Path $gitInfoFile) {
    $gitInfo = Get-Content $gitInfoFile | ConvertFrom-Json
    Write-Host "📍 Backup was at commit: $($gitInfo.commit.Substring(0,8))" -ForegroundColor Blue
    Write-Host "📍 Tag: $($gitInfo.tag)" -ForegroundColor Blue
    Write-Host ""
    Write-Host "To restore code to this point, run:" -ForegroundColor Yellow
    Write-Host "  git checkout $($gitInfo.tag)" -ForegroundColor White
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Restore Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
`;

  // CMD restore script
  const restoreCmd = `@echo off
REM Restore Script for backup: ${dirName}
REM Usage: restore.cmd [mongodb-uri]

setlocal
set "BACKUP_DIR=%~dp0"
set "REPO_ROOT=${repoRoot}"

echo ═══════════════════════════════════════════════════════════
echo   VIPO System Restore
echo   Backup: ${dirName}
echo ═══════════════════════════════════════════════════════════

if not "%~1"=="" set "MONGODB_URI=%~1"

cd /d "%REPO_ROOT%"

echo.
echo Restoring MongoDB...
if exist "%BACKUP_DIR%mongodb" (
    node scripts\\db\\restore-from-dir.js "%BACKUP_DIR%mongodb"
    echo MongoDB restored successfully
) else (
    echo No MongoDB backup found
)

echo.
echo ═══════════════════════════════════════════════════════════
echo   Restore Complete!
echo ═══════════════════════════════════════════════════════════

endlocal
pause
`;

  await fs.writeFile(path.join(backupDir, 'restore.ps1'), restorePs1.trim());
  await fs.writeFile(path.join(backupDir, 'restore.cmd'), restoreCmd.trim());
  
  log('✅', 'Restore scripts created: restore.ps1 / restore.cmd', colors.green);
}

// ═══════════════════════════════════════════════════════════════
// CLEANUP OLD BACKUPS
// ═══════════════════════════════════════════════════════════════
async function cleanupOldBackups() {
  logSection('Cleanup Old Backups');
  
  try {
    if (!fsSync.existsSync(BACKUP_ROOT)) {
      log('ℹ️', 'No backup directory found - skipping cleanup');
      return;
    }
    
    const items = await fs.readdir(BACKUP_ROOT, { withFileTypes: true });
    const backupDirs = items
      .filter(item => item.isDirectory())
      .map(item => ({
        name: item.name,
        path: path.join(BACKUP_ROOT, item.name)
      }))
      .sort((a, b) => b.name.localeCompare(a.name));
    
    log('📊', `Found ${backupDirs.length} backup folders`);
    
    if (backupDirs.length <= MAX_FULL_BACKUPS) {
      log('✅', `No cleanup needed (keeping ${MAX_FULL_BACKUPS} backups)`);
      return;
    }
    
    const toDelete = backupDirs.slice(MAX_FULL_BACKUPS);
    log('🗑️', `Deleting ${toDelete.length} old backups...`, colors.yellow);
    
    for (const backup of toDelete) {
      await fs.rm(backup.path, { recursive: true, force: true });
      log('  ↳', `Deleted: ${backup.name}`);
    }
    
    log('✅', `Cleanup complete - kept ${MAX_FULL_BACKUPS} most recent`, colors.green);
  } catch (err) {
    log('⚠️', `Cleanup warning: ${err.message}`, colors.yellow);
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log(`${colors.bold}${colors.cyan}  🔒 VIPO FULL SYSTEM BACKUP${colors.reset}`);
  console.log(`${colors.cyan}  ${new Date().toLocaleString('he-IL')}${colors.reset}`);
  console.log('═'.repeat(60));
  
  const backupName = process.argv[2] || '';
  if (backupName) {
    log('📝', `Backup name: ${backupName}`, colors.blue);
  }
  
  // Create backup directory
  const { backupDir, timestamp, dirName } = await createBackupDirectory(backupName);
  log('📁', `Backup directory: ${path.relative(process.cwd(), backupDir)}`, colors.blue);
  
  const results = {
    timestamp: new Date().toISOString(),
    name: backupName || 'auto',
    directory: backupDir,
    mongodb: null,
    git: null,
    config: null,
    vercel: null
  };
  
  // Execute all backups
  results.mongodb = await backupMongoDB(backupDir);
  results.git = await backupGit(backupDir, backupName, timestamp);
  results.config = await backupConfig(backupDir);
  results.vercel = await backupVercelInfo(backupDir);
  
  // Create restore scripts
  await createRestoreScripts(backupDir, dirName);
  
  // Save backup summary
  await fs.writeFile(
    path.join(backupDir, 'backup-summary.json'),
    JSON.stringify(results, null, 2)
  );
  
  // Cleanup old backups
  await cleanupOldBackups();
  
  // Final summary
  console.log('\n' + '═'.repeat(60));
  console.log(`${colors.bold}${colors.green}  ✅ BACKUP COMPLETE${colors.reset}`);
  console.log('═'.repeat(60));
  console.log(`${colors.cyan}  📁 Location: ${path.relative(process.cwd(), backupDir)}${colors.reset}`);
  if (results.git?.tag) {
    console.log(`${colors.cyan}  🏷️  Git Tag: ${results.git.tag}${colors.reset}`);
  }
  if (results.mongodb?.stats) {
    console.log(`${colors.cyan}  📊 MongoDB: ${results.mongodb.stats.collections} collections, ${results.mongodb.stats.documents} documents${colors.reset}`);
  }
  console.log(`${colors.cyan}  🔄 Restore: cd ${path.relative(process.cwd(), backupDir)} && .\\restore.ps1${colors.reset}`);
  console.log('═'.repeat(60) + '\n');
}

main().catch(err => {
  console.error(`\n${colors.red}❌ BACKUP FAILED: ${err.message}${colors.reset}\n`);
  process.exit(1);
});
