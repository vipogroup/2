/**
 * One-off: backup all documents in `orders`, report related collections, delete orders only.
 * Usage (from repo root): node scripts/orders-cleanup-with-backup.mjs
 * Requires: .env.local with MONGODB_URI
 */
import dotenv from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function serializeDoc(doc) {
  return JSON.parse(
    JSON.stringify(doc, (key, value) => {
      if (value instanceof ObjectId) return { __type: 'ObjectId', hex: value.toHexString() };
      if (value instanceof Date) return { __type: 'Date', iso: value.toISOString() };
      return value;
    }),
  );
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing in .env.local');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  const ordersCol = db.collection('orders');
  const orderCountBefore = await ordersCol.countDocuments({});

  const orderIds = await ordersCol.find({}, { projection: { _id: 1 } }).toArray();
  const idSet = orderIds.map((o) => o._id);

  /** @type {{ name: string, countReferencingOrders: number, totalDocs?: number, note?: string }[]} */
  const relatedReport = [];

  async function countInCollection(collName, filter) {
    try {
      const c = db.collection(collName);
      const total = await c.estimatedDocumentCount().catch(() => null);
      const n = await c.countDocuments(filter);
      relatedReport.push({
        name: collName,
        countReferencingOrders: n,
        totalDocs: total ?? undefined,
      });
    } catch (e) {
      relatedReport.push({
        name: collName,
        countReferencingOrders: -1,
        note: e?.message || String(e),
      });
    }
  }

  const idOrClause =
    idSet.length > 0 ? { orderId: { $in: idSet } } : { orderId: { $in: [] } };

  await countInCollection('paymentevents', idOrClause);
  await countInCollection('payment_events', idOrClause);
  await countInCollection('integrationsyncmaps', idOrClause);
  await countInCollection('integration_sync_maps', idOrClause);

  console.log('--- RELATED COLLECTIONS (reference current orders) ---');
  console.log(JSON.stringify(relatedReport, null, 2));
  console.log('--- ORDERS TO EXPORT ---', orderCountBefore);

  const allOrders = await ordersCol.find({}).toArray();
  const backupPayload = {
    exportedAt: new Date().toISOString(),
    database: db.databaseName,
    collection: 'orders',
    count: allOrders.length,
    orders: allOrders.map(serializeDoc),
  };

  const dir = path.join(root, 'backups');
  await mkdir(dir, { recursive: true });
  const fileName = `orders-before-cleanup-${stamp()}.json`;
  const outPath = path.join(dir, fileName);
  await writeFile(outPath, JSON.stringify(backupPayload, null, 2), 'utf8');
  console.log('BACKUP_WRITTEN', outPath);

  const delRes = await ordersCol.deleteMany({});
  console.log('ORDERS_DELETED', delRes.deletedCount);

  const orderCountAfter = await ordersCol.countDocuments({});
  console.log('ORDERS_REMAINING', orderCountAfter);

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
