// Script to backup MongoDB data
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function backupDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const backupDir = path.join(__dirname, 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
    
    const collections = await db.listCollections().toArray();
    const backup = {};
    
    for (const collInfo of collections) {
      const collName = collInfo.name;
      console.log(`📦 Backing up collection: ${collName}`);
      const data = await db.collection(collName).find({}).toArray();
      backup[collName] = data;
      console.log(`   ✓ ${data.length} documents backed up`);
    }
    
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📁 Backup file: ${backupFile}`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

backupDatabase();
