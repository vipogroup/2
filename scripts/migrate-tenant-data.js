/**
 * Migration Script - Associate existing data with a tenant
 * 
 * This script migrates existing data (products, orders, users, etc.)
 * to be associated with a specific tenant.
 * 
 * Usage:
 *   node scripts/migrate-tenant-data.js <tenantId>
 *   node scripts/migrate-tenant-data.js --all  (migrate to first tenant)
 * 
 * IMPORTANT: Run this AFTER creating the first tenant!
 */

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment');
  process.exit(1);
}

// Collections to migrate
const COLLECTIONS_TO_MIGRATE = [
  { name: 'users', filter: { role: { $in: ['agent', 'customer'] } } }, // Only agents and customers
  { name: 'products', filter: {} },
  { name: 'orders', filter: {} },
  { name: 'levelrules', filter: {} },
  { name: 'agentbonuses', filter: {} },
  { name: 'agentgoals', filter: {} },
  { name: 'withdrawalRequests', filter: {} },
  { name: 'referral_logs', filter: {} },
  { name: 'pushSubscriptions', filter: {} },
  { name: 'categories', filter: {} },
  { name: 'catalogs', filter: {} },
];

async function migrate(tenantId) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const tenantObjectId = new ObjectId(tenantId);
    
    // Verify tenant exists
    const tenant = await db.collection('tenants').findOne({ _id: tenantObjectId });
    if (!tenant) {
      console.error(`❌ Tenant not found: ${tenantId}`);
      process.exit(1);
    }
    
    console.log(`\n📦 Migrating data to tenant: ${tenant.name} (${tenantId})\n`);
    
    const results = {};
    
    for (const col of COLLECTIONS_TO_MIGRATE) {
      const collection = db.collection(col.name);
      
      // Find documents without tenantId
      const query = {
        ...col.filter,
        tenantId: { $exists: false },
      };
      
      const count = await collection.countDocuments(query);
      
      if (count === 0) {
        console.log(`⏭️  ${col.name}: No documents to migrate`);
        results[col.name] = { migrated: 0, skipped: true };
        continue;
      }
      
      // Update documents with tenantId
      const result = await collection.updateMany(
        query,
        { $set: { tenantId: tenantObjectId } }
      );
      
      console.log(`✅ ${col.name}: Migrated ${result.modifiedCount} documents`);
      results[col.name] = { migrated: result.modifiedCount };
    }
    
    console.log('\n📊 Migration Summary:');
    console.log('='.repeat(40));
    
    let totalMigrated = 0;
    for (const [name, data] of Object.entries(results)) {
      if (!data.skipped) {
        console.log(`  ${name}: ${data.migrated} documents`);
        totalMigrated += data.migrated;
      }
    }
    
    console.log('='.repeat(40));
    console.log(`Total migrated: ${totalMigrated} documents`);
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

async function getFirstTenant() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    const tenant = await db.collection('tenants').findOne({});
    await client.close();
    return tenant?._id?.toString();
  } catch (error) {
    console.error('❌ Failed to get tenant:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/migrate-tenant-data.js <tenantId>');
    console.log('  node scripts/migrate-tenant-data.js --all');
    console.log('');
    console.log('Options:');
    console.log('  <tenantId>  Specific tenant ID to migrate data to');
    console.log('  --all       Migrate all data to the first tenant found');
    process.exit(0);
  }
  
  let tenantId = args[0];
  
  if (tenantId === '--all') {
    console.log('🔍 Finding first tenant...');
    tenantId = await getFirstTenant();
    
    if (!tenantId) {
      console.error('❌ No tenants found! Create a tenant first.');
      process.exit(1);
    }
    
    console.log(`📍 Found tenant: ${tenantId}`);
  }
  
  if (!ObjectId.isValid(tenantId)) {
    console.error(`❌ Invalid tenant ID: ${tenantId}`);
    process.exit(1);
  }
  
  await migrate(tenantId);
}

main();
