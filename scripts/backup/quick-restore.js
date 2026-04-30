#!/usr/bin/env node
/**
 * Quick Restore Script - Restore from a specific backup
 * 
 * Usage: 
 *   node scripts/backup/quick-restore.js                    # Interactive - shows list of backups
 *   node scripts/backup/quick-restore.js <backup-name>      # Restore specific backup
 *   node scripts/backup/quick-restore.js --latest           # Restore most recent backup
 */

const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const readline = require('readline');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables
const envFiles = [
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), '.env'),
];
for (const envFile of envFiles) {
  if (fsSync.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: true });
  }
}

const BACKUP_ROOT = path.join(process.cwd(), 'backups', 'full');

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

async function listBackups() {
  if (!fsSync.existsSync(BACKUP_ROOT)) {
    return [];
  }
  
  const items = await fs.readdir(BACKUP_ROOT, { withFileTypes: true });
  const backups = [];
  
  for (const item of items) {
    if (!item.isDirectory()) continue;
    
    const summaryPath = path.join(BACKUP_ROOT, item.name, 'backup-summary.json');
    let summary = null;
    
    try {
      if (fsSync.existsSync(summaryPath)) {
        summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
      }
    } catch (e) {}
    
    backups.push({
      name: item.name,
      path: path.join(BACKUP_ROOT, item.name),
      summary
    });
  }
  
  return backups.sort((a, b) => b.name.localeCompare(a.name));
}

async function selectBackup(backups) {
  console.log('\n' + '═'.repeat(60));
  console.log(`${colors.bold}${colors.cyan}  Available Backups${colors.reset}`);
  console.log('═'.repeat(60));
  
  backups.forEach((backup, index) => {
    const date = backup.name.split('_')[0].replace(/T/, ' ').replace(/-/g, ':').slice(0, 16).replace(/:/, '-').replace(/:/, '-');
    const name = backup.summary?.name || '';
    const mongoStats = backup.summary?.mongodb?.stats;
    const statsStr = mongoStats ? `(${mongoStats.collections} collections, ${mongoStats.documents} docs)` : '';
    
    console.log(`  ${colors.cyan}[${index + 1}]${colors.reset} ${backup.name}`);
    if (name && name !== 'auto') {
      console.log(`      ${colors.yellow}└─ ${name}${colors.reset}`);
    }
    if (statsStr) {
      console.log(`      ${colors.blue}└─ ${statsStr}${colors.reset}`);
    }
  });
  
  console.log('═'.repeat(60));
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`\n${colors.yellow}Select backup number (1-${backups.length}) or 'q' to quit: ${colors.reset}`, (answer) => {
      rl.close();
      
      if (answer.toLowerCase() === 'q') {
        resolve(null);
        return;
      }
      
      const index = parseInt(answer) - 1;
      if (index >= 0 && index < backups.length) {
        resolve(backups[index]);
      } else {
        resolve(null);
      }
    });
  });
}

async function confirmRestore(backup) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    console.log('\n' + '═'.repeat(60));
    console.log(`${colors.bold}${colors.red}  ⚠️  WARNING: This will REPLACE your current data!${colors.reset}`);
    console.log('═'.repeat(60));
    console.log(`  Backup: ${backup.name}`);
    if (backup.summary?.mongodb?.stats) {
      console.log(`  MongoDB: ${backup.summary.mongodb.stats.documents} documents`);
    }
    console.log('═'.repeat(60));
    
    rl.question(`\n${colors.red}Type 'RESTORE' to confirm: ${colors.reset}`, (answer) => {
      rl.close();
      resolve(answer === 'RESTORE');
    });
  });
}

async function restoreMongoDB(backupDir) {
  log('🔄', 'Restoring MongoDB...', colors.yellow);
  
  const mongoDir = path.join(backupDir, 'mongodb');
  if (!fsSync.existsSync(mongoDir)) {
    log('⚠️', 'No MongoDB backup found in this backup', colors.yellow);
    return { success: false, error: 'No MongoDB backup' };
  }
  
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'vipo';
  
  if (!uri) {
    log('❌', 'MONGODB_URI not found', colors.red);
    return { success: false, error: 'No MONGODB_URI' };
  }
  
  const client = new MongoClient(uri);
  const stats = { collections: 0, documents: 0 };
  
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Get all JSON files in backup
    const files = await fs.readdir(mongoDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('_'));
    
    for (const file of jsonFiles) {
      const collName = path.basename(file, '.json');
      const filePath = path.join(mongoDir, file);
      const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
      
      if (!Array.isArray(data) || data.length === 0) {
        log('  ⏭️', `${collName}: empty, skipping`);
        continue;
      }
      
      // Drop existing collection and insert backup data
      const collection = db.collection(collName);
      await collection.deleteMany({});
      await collection.insertMany(data);
      
      stats.collections++;
      stats.documents += data.length;
      log('  ✅', `${collName}: ${data.length} documents restored`);
    }
    
    log('✅', `MongoDB restore complete: ${stats.collections} collections, ${stats.documents} documents`, colors.green);
    return { success: true, stats };
    
  } catch (err) {
    log('❌', `MongoDB restore failed: ${err.message}`, colors.red);
    return { success: false, error: err.message };
  } finally {
    await client.close().catch(() => {});
  }
}

async function showGitInfo(backupDir) {
  const gitInfoPath = path.join(backupDir, 'git', 'git-info.json');
  
  if (!fsSync.existsSync(gitInfoPath)) {
    return;
  }
  
  try {
    const gitInfo = JSON.parse(await fs.readFile(gitInfoPath, 'utf8'));
    
    console.log('\n' + '═'.repeat(60));
    console.log(`${colors.bold}${colors.cyan}  Git Restore Information${colors.reset}`);
    console.log('═'.repeat(60));
    console.log(`  Backup commit: ${gitInfo.commit?.slice(0, 8) || 'N/A'}`);
    console.log(`  Backup tag: ${gitInfo.tag || 'N/A'}`);
    console.log(`  Backup branch: ${gitInfo.branch || 'N/A'}`);
    console.log('');
    console.log(`  ${colors.yellow}To restore code to this backup point:${colors.reset}`);
    console.log(`  ${colors.cyan}git checkout ${gitInfo.tag || gitInfo.commit}${colors.reset}`);
    console.log('═'.repeat(60));
  } catch (e) {}
}

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log(`${colors.bold}${colors.cyan}  🔄 VIPO SYSTEM RESTORE${colors.reset}`);
  console.log('═'.repeat(60));
  
  const backups = await listBackups();
  
  if (backups.length === 0) {
    log('❌', 'No backups found. Run: npm run backup:full', colors.red);
    process.exit(1);
  }
  
  let selectedBackup;
  const arg = process.argv[2];
  
  if (arg === '--latest') {
    selectedBackup = backups[0];
    log('📦', `Using latest backup: ${selectedBackup.name}`, colors.blue);
  } else if (arg) {
    selectedBackup = backups.find(b => b.name.includes(arg));
    if (!selectedBackup) {
      log('❌', `Backup not found: ${arg}`, colors.red);
      process.exit(1);
    }
  } else {
    selectedBackup = await selectBackup(backups);
  }
  
  if (!selectedBackup) {
    log('ℹ️', 'Restore cancelled', colors.blue);
    process.exit(0);
  }
  
  // Confirm restore
  const confirmed = await confirmRestore(selectedBackup);
  if (!confirmed) {
    log('ℹ️', 'Restore cancelled', colors.blue);
    process.exit(0);
  }
  
  // Perform restore
  console.log('\n');
  const result = await restoreMongoDB(selectedBackup.path);
  
  // Show git info for code restore
  await showGitInfo(selectedBackup.path);
  
  if (result.success) {
    console.log('\n' + '═'.repeat(60));
    console.log(`${colors.bold}${colors.green}  ✅ RESTORE COMPLETE${colors.reset}`);
    console.log('═'.repeat(60) + '\n');
  } else {
    console.log('\n' + '═'.repeat(60));
    console.log(`${colors.bold}${colors.red}  ❌ RESTORE FAILED${colors.reset}`);
    console.log('═'.repeat(60) + '\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`\n${colors.red}❌ RESTORE FAILED: ${err.message}${colors.reset}\n`);
  process.exit(1);
});
