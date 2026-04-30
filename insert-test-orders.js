/**
 * Insert test shared_container orders to fill a 40HQ container (~75 m³)
 * and test the container fill logic.
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

const TENANT_ID = '6980e7a13862e2a30b667a62'; // מחסני נירוסטה

// Products with CBM calculated using packedDepth=25cm: (a/100)*(25/100)*(c/100)
const PRODUCTS = [
  { sku: '2L-100-60-90', name: '2-LAYERS WORKTABLE 100×60×90', priceUsd: 57.14, cbm: 0.225 },
  { sku: '2L-120-60-90', name: '2-LAYERS WORKTABLE 120×60×90', priceUsd: 62.50, cbm: 0.270 },
  { sku: '2L-140-60-90', name: '2-LAYERS WORKTABLE 140×60×90', priceUsd: 67.86, cbm: 0.315 },
  { sku: '2L-160-60-90', name: '2-LAYERS WORKTABLE 160×60×90', priceUsd: 73.71, cbm: 0.360 },
  { sku: '2L-180-60-90', name: '2-LAYERS WORKTABLE 180×60×90', priceUsd: 78.57, cbm: 0.405 },
  { sku: '2L-200-60-90', name: '2-LAYERS WORKTABLE 200×60×90', priceUsd: 86.79, cbm: 0.450 },
  { sku: '3L-60-60-90',  name: '3-LAYERS WORKTABLE 60×60×90',  priceUsd: 58.93, cbm: 0.135 },
  { sku: '3L-80-60-90',  name: '3-LAYERS WORKTABLE 80×60×90',  priceUsd: 62.50, cbm: 0.180 },
  { sku: '3L-100-60-90', name: '3-LAYERS WORKTABLE 100×60×90', priceUsd: 66.07, cbm: 0.225 },
  { sku: '3L-120-60-90', name: '3-LAYERS WORKTABLE 120×60×90', priceUsd: 73.21, cbm: 0.270 },
  { sku: '3L-140-60-90', name: '3-LAYERS WORKTABLE 140×60×90', priceUsd: 77.57, cbm: 0.315 },
  { sku: '3L-160-60-90', name: '3-LAYERS WORKTABLE 160×60×90', priceUsd: 83.21, cbm: 0.360 },
  { sku: '3L-180-60-90', name: '3-LAYERS WORKTABLE 180×60×90', priceUsd: 92.86, cbm: 0.405 },
  { sku: '3L-200-60-90', name: '3-LAYERS WORKTABLE 200×60×90', priceUsd: 101.79, cbm: 0.450 },
  { sku: 'SS-60-60-90',  name: 'SINGLE SINK 60×60×90',          priceUsd: 33.00, cbm: 0.135 },
  { sku: 'WC-100-60-90', name: 'WORK CABINET 100×60×90',        priceUsd: 86.00, cbm: 0.225 },
  { sku: 'WC-120-60-90', name: 'WORK CABINET 120×60×90',        priceUsd: 81.00, cbm: 0.270 },
  { sku: 'WC-150-60-90', name: 'WORK CABINET 150×60×90',        priceUsd: 113.00, cbm: 0.3375 },
  { sku: 'WC-180-60-90', name: 'WORK CABINET 180×60×90',        priceUsd: 93.00, cbm: 0.405 },
];

const CUSTOMERS = [
  { name: 'מסעדת הים', phone: '050-1111111', email: 'sea@test.com' },
  { name: 'קייטרינג דוד', phone: '050-2222222', email: 'david@test.com' },
  { name: 'מטבח השף', phone: '050-3333333', email: 'chef@test.com' },
  { name: 'פיצה רומא', phone: '050-4444444', email: 'roma@test.com' },
  { name: 'קפה מרכזי', phone: '050-5555555', email: 'cafe@test.com' },
  { name: 'מלון הגליל', phone: '050-6666666', email: 'galil@test.com' },
  { name: 'בית קפה נורד', phone: '050-7777777', email: 'nord@test.com' },
  { name: 'אולם אירועים שמש', phone: '050-8888888', email: 'shemesh@test.com' },
  { name: 'מסעדת סושי טו גו', phone: '050-9999999', email: 'sushi@test.com' },
  { name: 'מאפיית הכפר', phone: '052-1111111', email: 'bakery@test.com' },
  { name: 'סטייק האוס', phone: '052-2222222', email: 'steak@test.com' },
  { name: 'ברגר בר', phone: '052-3333333', email: 'burger@test.com' },
  { name: 'מלון דניאל', phone: '052-4444444', email: 'daniel@test.com' },
  { name: 'קונדיטוריה מתוקה', phone: '052-5555555', email: 'sweet@test.com' },
  { name: 'פלאפל הזהב', phone: '052-6666666', email: 'falafel@test.com' },
  { name: 'הומוס אבו חסן', phone: '052-7777777', email: 'hummus@test.com' },
  { name: 'מסעדת ביירות', phone: '052-8888888', email: 'beirut@test.com' },
  { name: 'פסטה בלה', phone: '052-9999999', email: 'pasta@test.com' },
  { name: 'בית חולים שיבא', phone: '053-1111111', email: 'shiba@test.com' },
  { name: 'צהריים בריאים', phone: '053-2222222', email: 'healthy@test.com' },
];

const ILS_RATE = 3.7; // USD to ILS rough rate

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('Connected to MongoDB');

  // Target: ~75 m³ total CBM (slightly over one 40HQ container of 67.3 m³)
  const TARGET_CBM = 75;
  let totalCbm = 0;
  let totalUnits = 0;
  const orders = [];

  let orderIndex = 0;
  while (totalCbm < TARGET_CBM) {
    const customer = CUSTOMERS[orderIndex % CUSTOMERS.length];
    const numItems = randomInt(1, 3);
    const items = [];
    let orderTotal = 0;

    for (let i = 0; i < numItems; i++) {
      const product = pickRandom(PRODUCTS);
      const qty = randomInt(1, 5);
      const priceIls = Math.round(product.priceUsd * ILS_RATE * 1.3); // with markup
      items.push({
        sku: product.sku,
        name: product.name,
        quantity: qty,
        price: priceIls,
        purchaseType: 'group',
        groupPurchaseType: 'shared_container',
      });
      orderTotal += priceIls * qty;
      totalCbm += product.cbm * qty;
      totalUnits += qty;
    }

    // Random date in the last 30 days
    const daysAgo = randomInt(0, 30);
    const createdAt = new Date(Date.now() - daysAgo * 86400000);

    orders.push({
      tenantId: new ObjectId(TENANT_ID),
      status: 'paid',
      customer: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
      items,
      totalAmount: orderTotal,
      purchaseType: 'group',
      groupPurchaseType: 'shared_container',
      source: 'test_container_fill',
      createdAt,
      updatedAt: createdAt,
    });

    orderIndex++;
  }

  console.log(`\nPrepared ${orders.length} orders:`);
  console.log(`  Total units: ${totalUnits}`);
  console.log(`  Total CBM: ${totalCbm.toFixed(3)} m³`);
  console.log(`  Target: ${TARGET_CBM} m³ (40HQ = 67.3 m³)`);
  console.log(`  Containers needed: ${(totalCbm / 67.3).toFixed(2)}`);

  // Insert into DB
  const result = await db.collection('orders').insertMany(orders);
  console.log(`\nInserted ${result.insertedCount} orders into MongoDB`);

  await client.close();
  console.log('Done!');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
