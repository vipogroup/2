/**
 * Final validation + backup + cleanup for orders.
 * Usage: node scripts/orders-post-cleanup-smoke.mjs [baseUrl]
 */
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

dotenv.config({ path: '.env.local' });

const base = process.argv[2] || 'http://localhost:3000';

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function toJsonSafe(doc) {
  return JSON.parse(
    JSON.stringify(doc, (key, value) => {
      if (value instanceof ObjectId) return { __type: 'ObjectId', hex: value.toHexString() };
      if (value instanceof Date) return { __type: 'Date', iso: value.toISOString() };
      return value;
    }),
  );
}

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  return { status: res.status, text, json, headers: res.headers };
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const orders = db.collection('orders');
  const products = db.collection('products');

  const countTenantless = async () =>
    orders.countDocuments({ $or: [{ tenantId: null }, { tenantId: { $exists: false } }] });

  const before = {
    totalOrders: await orders.countDocuments({}),
    tenantlessOrders: await countTenantless(),
  };

  // Deprecated endpoint checks
  const deprecated = {
    ordersCreate: await postJson(`${base}/api/orders/create`, {
      productId: '000000000000000000000001',
      quantity: 1,
    }),
    trackOrder: await postJson(`${base}/api/track/order`, { productId: 'x', amount: 1, customer: {} }),
    harnessCreateOrder: await postJson(`${base}/api/admin/test-harness/create-order`, { tenantId: 'x' }),
    harnessSeed: await postJson(`${base}/api/admin/test-harness/seed`, {}),
  };

  // Auth
  const login = await postJson(
    `${base}/api/auth/login`,
    { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1', rememberMe: false },
    { 'x-automation-key': 'test-automation-key' },
  );
  const setCookie = login.headers.get('set-cookie') || '';
  const tokenMatch = setCookie.match(/auth_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  if (!token) {
    throw new Error(`auth_token missing from login response (status=${login.status})`);
  }
  const auth = { Authorization: `Bearer ${token}` };

  const pick = await products
    .find({
      stockCount: { $gt: 0 },
      tenantId: { $exists: true, $ne: null },
      purchaseType: { $ne: 'group' },
      type: { $ne: 'group' },
    })
    .project({ _id: 1, stockCount: 1 })
    .limit(1)
    .toArray();
  const pid = pick[0]?._id?.toString();
  if (!pid) throw new Error('No in-stock tenant-scoped product found');

  const stockBefore = (await products.findOne({ _id: new ObjectId(pid) }, { projection: { stockCount: 1 } }))?.stockCount ?? null;

  // Tenant validation checks
  const rejectNull = await postJson(
    `${base}/api/orders`,
    { tenantId: null, items: [{ productId: pid, quantity: 1 }], customer: { name: 'Reject Null', phone: '050', email: 'reject-null@test.local' } },
    auth,
  );
  const rejectMissingLike = await postJson(
    `${base}/api/orders`,
    { tenantId: '', items: [{ productId: pid, quantity: 1 }], customer: { name: 'Reject Empty', phone: '050', email: 'reject-empty@test.local' } },
    auth,
  );
  const rejectInvalid = await postJson(
    `${base}/api/orders`,
    { tenantId: 'not-an-objectid', items: [{ productId: pid, quantity: 1 }], customer: { name: 'Reject Invalid', phone: '050', email: 'reject-invalid@test.local' } },
    auth,
  );

  const stockAfterReject = (await products.findOne({ _id: new ObjectId(pid) }, { projection: { stockCount: 1 } }))?.stockCount ?? null;

  // Canonical create path
  const createOk = await postJson(
    `${base}/api/orders`,
    { items: [{ productId: pid, quantity: 1 }], customer: { name: 'Final Smoke', phone: '050', email: 'final-smoke@test.local' } },
    auth,
  );
  const createdOrderId = createOk.json?.orderId || null;
  let createdOrderTenantId = null;
  if (createdOrderId && ObjectId.isValid(String(createdOrderId))) {
    const createdDoc = await orders.findOne(
      { _id: new ObjectId(String(createdOrderId)) },
      { projection: { tenantId: 1 } },
    );
    createdOrderTenantId = createdDoc?.tenantId ? String(createdDoc.tenantId) : null;
  }

  const afterSmoke = {
    tenantlessOrders: await countTenantless(),
  };

  // Final backup + cleanup
  await mkdir(path.join(process.cwd(), 'backups'), { recursive: true });
  const backupFile = path.join(
    process.cwd(),
    'backups',
    `orders-final-smoke-cleanup-${stamp()}.json`,
  );
  const allOrders = await orders.find({}).toArray();
  await writeFile(
    backupFile,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        count: allOrders.length,
        orders: allOrders.map(toJsonSafe),
      },
      null,
      2,
    ),
    'utf8',
  );

  const delRes = await orders.deleteMany({});
  const final = {
    deletedCount: delRes.deletedCount,
    finalOrdersCount: await orders.countDocuments({}),
    finalTenantlessOrders: await countTenantless(),
  };

  const result = {
    before,
    deprecated: {
      ordersCreate: { status: deprecated.ordersCreate.status, error: deprecated.ordersCreate.json?.error || null },
      trackOrder: { status: deprecated.trackOrder.status, error: deprecated.trackOrder.json?.error || null },
      harnessCreateOrder: { status: deprecated.harnessCreateOrder.status, error: deprecated.harnessCreateOrder.json?.error || null },
      harnessSeed: { status: deprecated.harnessSeed.status, error: deprecated.harnessSeed.json?.error || null },
    },
    canonicalCreate: {
      status: createOk.status,
      createdOrderId,
      createdOrderTenantId,
    },
    tenantValidation: {
      rejectNull: { status: rejectNull.status, error: rejectNull.json?.error || null },
      rejectMissingLike: { status: rejectMissingLike.status, error: rejectMissingLike.json?.error || null },
      rejectInvalid: { status: rejectInvalid.status, error: rejectInvalid.json?.error || null },
      stockBeforeReject: stockBefore,
      stockAfterReject,
      stockChangedAfterReject: stockBefore !== stockAfterReject,
    },
    afterSmoke,
    cleanup: {
      backupFile,
      ...final,
    },
  };

  console.log(JSON.stringify(result, null, 2));
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
