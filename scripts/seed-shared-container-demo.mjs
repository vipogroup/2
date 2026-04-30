/**
 * Seed script: Creates shared_container products in all tenant stores
 * and creates PAID orders from each store to demonstrate cross-tenant
 * container progress aggregation.
 *
 * Usage: node scripts/seed-shared-container-demo.mjs [--confirm]
 */
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config({ path: '.env.local' });
dotenv.config();

const DRY_RUN = !process.argv.includes('--confirm');

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;
  if (!uri || !dbName) {
    console.error('Missing MONGODB_URI or MONGODB_DB');
    process.exit(1);
  }

  console.log(`MODE: ${DRY_RUN ? 'DRY_RUN (pass --confirm to write)' : 'CONFIRM - WILL WRITE'}`);
  console.log(`DB: ${dbName}\n`);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  // 1) Get all active tenants
  const tenants = await db.collection('tenants').find({ status: 'active' }).toArray();
  console.log(`Found ${tenants.length} active tenants:`);
  tenants.forEach(t => console.log(`  - ${t.name} (${t._id})`));

  if (tenants.length === 0) {
    console.log('No tenants found, exiting.');
    await client.close();
    return;
  }

  // 2) Get or create a customer user for placing orders
  let customer = await db.collection('users').findOne({ role: 'customer' });
  if (!customer) {
    console.log('\nNo customer found - creating demo customer...');
    if (!DRY_RUN) {
      const res = await db.collection('users').insertOne({
        fullName: 'לקוח דמו מכולה',
        email: 'demo-container@vipo.test',
        role: 'customer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      customer = { _id: res.insertedId, fullName: 'לקוח דמו מכולה', email: 'demo-container@vipo.test' };
    } else {
      customer = { _id: new ObjectId(), fullName: 'לקוח דמו מכולה (dry-run)' };
    }
  }
  console.log(`\nCustomer: ${customer.fullName} (${customer._id})`);

  // 3) Shared container product templates
  const productTemplates = [
    { name: 'כסא משרדי ארגונומי Premium', sku: 'SC-CHAIR-001', price: 450, groupPrice: 320, cbm: 0.35 },
    { name: 'שולחן עבודה חשמלי מתכוונן', sku: 'SC-DESK-001', price: 1200, groupPrice: 850, cbm: 0.8 },
    { name: 'מנורת LED חכמה', sku: 'SC-LAMP-001', price: 180, groupPrice: 120, cbm: 0.05 },
    { name: 'ארגז כלים מקצועי 200 חלקים', sku: 'SC-TOOLS-001', price: 350, groupPrice: 250, cbm: 0.15 },
  ];

  const now = new Date();
  const closingDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  // 4) Create products in each tenant store
  const createdProducts = []; // { tenantId, tenantName, productId, name, sku, groupPrice, quantity }

  console.log('\n--- Creating products ---');
  for (const tenant of tenants) {
    for (const tpl of productTemplates) {
      const existing = await db.collection('products').findOne({
        sku: tpl.sku,
        tenantId: tenant._id,
        groupPurchaseType: 'shared_container',
      });

      if (existing) {
        console.log(`  [EXISTS] ${tpl.name} in ${tenant.name} (${existing._id})`);
        createdProducts.push({
          tenantId: tenant._id,
          tenantName: tenant.name,
          productId: existing._id,
          name: tpl.name,
          sku: tpl.sku,
          groupPrice: tpl.groupPrice,
        });
        continue;
      }

      const productDoc = {
        name: tpl.name,
        sku: tpl.sku,
        price: tpl.price,
        groupPrice: tpl.groupPrice,
        currency: 'ILS',
        purchaseType: 'group',
        groupPurchaseType: 'shared_container',
        containerScope: 'shared',
        type: 'group',
        active: true,
        status: 'published',
        inStock: true,
        stockCount: 999,
        tenantId: tenant._id,
        groupMinQuantity: 100,
        groupCurrentQuantity: 0,
        groupPurchaseDetails: {
          closingDays: 30,
          shippingDays: 45,
          minQuantity: 100,
          currentQuantity: 0,
          containerCapacity: 68,
          totalDays: 75,
        },
        groupEndDate: closingDate,
        expectedDeliveryDays: 45,
        description: `${tpl.name} - מוצר מכולה משותפת. הצטרפו לרכישה קבוצתית וחסכו!`,
        images: [],
        category: 'מכולה משותפת',
        cbm: tpl.cbm,
        createdAt: now,
        updatedAt: now,
      };

      if (DRY_RUN) {
        console.log(`  [DRY] Would create: ${tpl.name} in ${tenant.name}`);
        createdProducts.push({
          tenantId: tenant._id,
          tenantName: tenant.name,
          productId: new ObjectId(),
          name: tpl.name,
          sku: tpl.sku,
          groupPrice: tpl.groupPrice,
        });
      } else {
        const res = await db.collection('products').insertOne(productDoc);
        console.log(`  [CREATED] ${tpl.name} in ${tenant.name} -> ${res.insertedId}`);
        createdProducts.push({
          tenantId: tenant._id,
          tenantName: tenant.name,
          productId: res.insertedId,
          name: tpl.name,
          sku: tpl.sku,
          groupPrice: tpl.groupPrice,
        });
      }
    }
  }

  // 5) Create PAID orders - each tenant orders different quantities
  const orderQuantities = [3, 5, 2, 7, 4, 6]; // per tenant
  const createdOrders = [];

  console.log('\n--- Creating PAID orders ---');
  for (let i = 0; i < tenants.length; i++) {
    const tenant = tenants[i];
    const qty = orderQuantities[i % orderQuantities.length];

    // Each tenant orders 1-2 products
    const tenantProducts = createdProducts.filter(p => p.tenantId.toString() === tenant._id.toString());
    if (tenantProducts.length === 0) continue;

    // Pick first 2 products for this tenant
    const orderItems = tenantProducts.slice(0, 2).map(p => ({
      productId: p.productId,
      name: p.name,
      sku: p.sku,
      quantity: qty,
      unitPrice: p.groupPrice,
      totalPrice: p.groupPrice * qty,
      purchaseType: 'group',
      groupPurchaseType: 'shared_container',
    }));

    const totalAmount = orderItems.reduce((sum, it) => sum + it.totalPrice, 0);

    const orderDoc = {
      status: 'paid',
      paymentStatus: 'success',
      items: orderItems,
      totalAmount,
      tenantId: tenant._id,
      createdBy: customer._id,
      customerName: customer.fullName,
      customerEmail: customer.email || 'demo@vipo.test',
      shippingDetails: {
        fullName: customer.fullName,
        city: 'תל אביב',
        address: 'רחוב הרצל 1',
        phone: '050-0000000',
      },
      createdAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000), // random within last 7 days
      updatedAt: now,
    };

    if (DRY_RUN) {
      console.log(`  [DRY] Would create order for ${tenant.name}: ${orderItems.length} items, qty=${qty}, total=${totalAmount} ILS`);
    } else {
      const res = await db.collection('orders').insertOne(orderDoc);
      console.log(`  [CREATED] Order for ${tenant.name}: ${res.insertedId} (${orderItems.length} items, qty=${qty}, total=${totalAmount} ILS)`);
      createdOrders.push({ orderId: res.insertedId, tenantName: tenant.name });

      // Update product groupCurrentQuantity for each ordered item
      for (const item of orderItems) {
        await db.collection('products').updateOne(
          { _id: item.productId },
          {
            $inc: {
              groupCurrentQuantity: qty,
              'groupPurchaseDetails.currentQuantity': qty,
            },
            $set: { updatedAt: now },
          },
        );
        console.log(`    -> Updated product ${item.name}: +${qty} units`);
      }
    }
  }

  // 6) Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Tenants: ${tenants.length}`);
  console.log(`Products created/found: ${createdProducts.length}`);
  console.log(`Orders created: ${DRY_RUN ? '(dry-run)' : createdOrders.length}`);
  
  if (!DRY_RUN) {
    // Quick aggregation check
    const totalUnits = await db.collection('products').aggregate([
      { $match: { groupPurchaseType: 'shared_container', purchaseType: 'group' } },
      { $group: { _id: null, total: { $sum: '$groupCurrentQuantity' } } },
    ]).toArray();
    console.log(`Total units across all stores: ${totalUnits[0]?.total || 0}`);
  }

  await client.close();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
