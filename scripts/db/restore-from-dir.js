#!/usr/bin/env node
/**
 * Restore MongoDB collections from JSON files exported via scripts/db/export-local.js
 * Usage:
 *   npm run restore:db -- <path-to-backup-dir>
 *   or set BACKUP_DIR env var.
 */

const fs = require('fs/promises');
const path = require('path');
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');
const dotenv = require('dotenv');

const envFiles = [
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), 'app', '.env.local'),
  path.join(process.cwd(), '.env'),
];

for (const envFile of envFiles) {
  dotenv.config({ path: envFile, override: true });
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'vipo';

if (!uri) {
  console.error('❌ MONGODB_URI missing. Cannot restore database.');
  process.exit(1);
}

const backupDir = process.argv[2] || process.env.BACKUP_DIR;

if (!backupDir) {
  console.error('❌ Missing backup directory. Provide as argument or BACKUP_DIR env variable.');
  console.error('   npm run restore:db -- ./backups/mongo-2025-12-20T09-30-00');
  process.exit(1);
}

async function restore() {
  const resolvedDir = path.resolve(backupDir);
  const dirExists = await fs
    .stat(resolvedDir)
    .then((stats) => stats.isDirectory())
    .catch(() => false);

  if (!dirExists) {
    console.error(`❌ Backup directory not found: ${resolvedDir}`);
    process.exit(1);
  }

  const entries = await fs.readdir(resolvedDir);
  const jsonFiles = entries.filter((file) => file.endsWith('.json'));

  if (!jsonFiles.length) {
    console.error(`❌ No JSON files found in ${resolvedDir}`);
    process.exit(1);
  }

  console.log(`📁 Restoring from directory: ${resolvedDir}`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    console.log(`✅ Connected to MongoDB (${dbName})`);

    for (const file of jsonFiles) {
      const collectionName = path.basename(file, '.json');
      const filePath = path.join(resolvedDir, file);
      console.log(`➡️  Restoring collection: ${collectionName}`);

      const raw = await fs.readFile(filePath, 'utf8');
      let documents;
      try {
        documents = EJSON.parse(raw);
      } catch (err) {
        console.error(`   ❌ Failed to parse ${file}:`, err.message);
        process.exitCode = 1;
        continue;
      }

      if (!Array.isArray(documents)) {
        console.warn(`   ⚠️  Skipping ${file}: expected array of documents`);
        continue;
      }

      const collection = db.collection(collectionName);
      await collection.deleteMany({});

      if (documents.length) {
        await collection.insertMany(documents);
        console.log(`   ✓ Inserted ${documents.length} documents.`);
      } else {
        console.log('   ✓ Collection restored empty.');
      }
    }

    console.log('\n✅ Restore completed successfully.');
  } catch (error) {
    console.error('❌ Restore failed:', error);
    process.exitCode = 1;
  } finally {
    await client.close().catch(() => {});
  }
}

restore();
