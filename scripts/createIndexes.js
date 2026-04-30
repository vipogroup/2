/**
 * MongoDB Index Creation Script
 * 
 * Run with: node scripts/createIndexes.js
 * 
 * Creates all necessary indexes for PayPlus/Priority integration
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in environment');
  process.exit(1);
}

async function createIndexes() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;

  const indexes = [
    // PaymentEvent indexes
    {
      collection: 'paymentevents',
      indexes: [
        { key: { eventId: 1 }, options: { unique: true, name: 'eventId_unique' } },
        { key: { orderId: 1 }, options: { name: 'orderId_idx' } },
        { key: { type: 1, status: 1 }, options: { name: 'type_status_idx' } },
        { key: { createdAt: -1 }, options: { name: 'createdAt_desc' } },
        { key: { status: 1, retryCount: 1 }, options: { name: 'status_retry_idx' } },
        { key: { deadLetter: 1, deadLetterAt: -1 }, options: { name: 'deadletter_idx' } },
        { key: { payplusTransactionId: 1 }, options: { name: 'payplus_tx_idx', sparse: true } },
      ],
    },

    // IntegrationSyncMap indexes
    {
      collection: 'integrationsyncmaps',
      indexes: [
        { key: { orderId: 1 }, options: { unique: true, name: 'orderId_unique' } },
        { key: { syncStatus: 1 }, options: { name: 'syncStatus_idx' } },
        { key: { priorityCustomerId: 1 }, options: { name: 'priorityCustomer_idx', sparse: true } },
        { key: { prioritySalesOrderId: 1 }, options: { name: 'prioritySO_idx', sparse: true } },
        { key: { priorityInvoiceId: 1 }, options: { name: 'priorityInv_idx', sparse: true } },
        { key: { createdAt: -1 }, options: { name: 'createdAt_desc' } },
        { key: { lastSyncAttempt: -1 }, options: { name: 'lastSync_idx' } },
      ],
    },

    // PriorityProduct indexes
    {
      collection: 'priorityproducts',
      indexes: [
        { key: { productId: 1 }, options: { unique: true, name: 'productId_unique' } },
        { key: { vipoSku: 1 }, options: { unique: true, name: 'vipoSku_unique' } },
        { key: { priorityItemCode: 1 }, options: { name: 'priorityItem_idx', sparse: true } },
        { key: { isActive: 1 }, options: { name: 'isActive_idx' } },
      ],
    },

    // Order indexes (additional for PayPlus/Priority)
    {
      collection: 'orders',
      indexes: [
        { key: { payplusSessionId: 1 }, options: { name: 'payplus_session_idx', sparse: true } },
        { key: { payplusTransactionId: 1 }, options: { name: 'payplus_tx_idx', sparse: true } },
        { key: { paymentStatus: 1 }, options: { name: 'payment_status_idx' } },
        { key: { priorityDocId: 1 }, options: { name: 'priority_doc_idx', sparse: true } },
        { key: { prioritySyncStatus: 1 }, options: { name: 'priority_sync_idx' } },
        { key: { commissionStatus: 1 }, options: { name: 'commission_status_idx' } },
        { key: { commissionAvailableAt: 1 }, options: { name: 'commission_available_idx', sparse: true } },
        { key: { refAgentId: 1, commissionStatus: 1 }, options: { name: 'agent_commission_idx' } },
      ],
    },

    // User indexes (additional for Priority)
    {
      collection: 'users',
      indexes: [
        { key: { priorityCustomerId: 1 }, options: { name: 'priority_customer_idx', sparse: true } },
        { key: { prioritySyncStatus: 1 }, options: { name: 'priority_sync_idx' } },
        { key: { commissionBalance: -1 }, options: { name: 'commission_balance_idx' } },
      ],
    },

    // WithdrawalRequest indexes
    {
      collection: 'withdrawalrequests',
      indexes: [
        { key: { userId: 1, status: 1 }, options: { name: 'user_status_idx' } },
        { key: { status: 1, createdAt: -1 }, options: { name: 'status_date_idx' } },
        { key: { priorityPaymentDocId: 1 }, options: { name: 'priority_payment_idx', sparse: true } },
      ],
    },

    // AuditLog indexes
    {
      collection: 'auditlogs',
      indexes: [
        { key: { eventType: 1, timestamp: -1 }, options: { name: 'event_time_idx' } },
        { key: { 'actor.id': 1, timestamp: -1 }, options: { name: 'actor_time_idx' } },
        { key: { 'target.id': 1, timestamp: -1 }, options: { name: 'target_time_idx' } },
        { key: { severity: 1, timestamp: -1 }, options: { name: 'severity_time_idx' } },
        { key: { timestamp: -1 }, options: { name: 'timestamp_idx', expireAfterSeconds: 90 * 24 * 60 * 60 } }, // 90 days TTL
      ],
    },
  ];

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const { collection, indexes: collIndexes } of indexes) {
    console.log(`\n📁 Collection: ${collection}`);
    
    // Check if collection exists
    const collections = await db.listCollections({ name: collection }).toArray();
    if (collections.length === 0) {
      console.log(`   ⚠️ Collection does not exist yet - indexes will be created when documents are inserted`);
      continue;
    }

    const col = db.collection(collection);
    const existingIndexes = await col.indexes();
    const existingNames = existingIndexes.map(i => i.name);

    for (const { key, options } of collIndexes) {
      if (existingNames.includes(options.name)) {
        console.log(`   ⏭️ Index ${options.name} already exists`);
        totalSkipped++;
        continue;
      }

      try {
        await col.createIndex(key, options);
        console.log(`   ✅ Created index: ${options.name}`);
        totalCreated++;
      } catch (err) {
        console.log(`   ❌ Failed to create ${options.name}: ${err.message}`);
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`✅ Created: ${totalCreated} indexes`);
  console.log(`⏭️ Skipped: ${totalSkipped} indexes (already exist)`);
  console.log(`========================================\n`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

createIndexes().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
