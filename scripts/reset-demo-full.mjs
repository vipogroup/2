import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config({ path: '.env.local' });
dotenv.config();

function getArgValue(argv, key) {
  const idx = argv.indexOf(key);
  if (idx < 0) return null;
  return argv[idx + 1] ?? null;
}

function hasFlag(argv, flag) {
  return argv.includes(flag);
}

function missingTenantFilter() {
  return {
    $or: [{ tenantId: null }, { tenantId: { $exists: false } }, { tenantId: '' }],
  };
}

function tenantPresentFilter() {
  return {
    $and: [{ tenantId: { $exists: true } }, { tenantId: { $nin: [null, ''] } }],
  };
}

async function main() {
  const argv = process.argv.slice(2);

  const confirm = hasFlag(argv, '--confirm');
  const dryRun = hasFlag(argv, '--dry-run') || !confirm;

  const uri = getArgValue(argv, '--uri') || process.env.MONGODB_URI;
  const dbName = getArgValue(argv, '--db') || process.env.MONGODB_DB || 'vipogroup';

  if (!uri) {
    throw new Error('Missing MONGODB_URI (set env var or pass --uri)');
  }

  const allowReset = String(process.env.ALLOW_DEMO_RESET || '').toLowerCase() === 'true';
  const allowedDbNames = new Set(['vipogroup', 'vipo', 'vipo_dev', 'vipo_test', 'vipo_stage']);

  if (confirm) {
    if (!allowReset) {
      throw new Error('Reset blocked. Set ALLOW_DEMO_RESET=true to run with --confirm');
    }
    if (!allowedDbNames.has(dbName)) {
      throw new Error(
        `Reset blocked. DB name "${dbName}" not in allowed list: ${Array.from(allowedDbNames).join(', ')}`,
      );
    }
  }

  console.log('RESET DEMO FULL');
  console.log(`mode\t${dryRun ? 'DRY_RUN' : 'CONFIRM'}`);
  console.log(`dbName\t${dbName}`);

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
  });

  await client.connect();
  const db = client.db(dbName);

  try {
    const collectionsInfo = await db.listCollections({}, { nameOnly: true }).toArray();
    const collectionNames = new Set((collectionsInfo || []).map((c) => c.name).filter(Boolean));

    if (!collectionNames.has('users')) {
      throw new Error('users collection not found');
    }
    if (!collectionNames.has('tenants')) {
      throw new Error('tenants collection not found');
    }

    const usersCol = db.collection('users');
    const tenantsCol = db.collection('tenants');

    const superAdmins = await usersCol
      .find({ role: 'super_admin' }, { projection: { email: 1, role: 1, tenantId: 1 } })
      .toArray();

    if (superAdmins.length === 0) {
      throw new Error('SAFETY: No user with role=super_admin found. Aborting.');
    }

    if (superAdmins.length > 1) {
      const list = superAdmins
        .map((u) => `${String(u._id)}\t${String(u.email || '')}`)
        .join('\n');
      throw new Error(
        `SAFETY: Found ${superAdmins.length} super_admin users. Rules forbid deleting them, so cannot reach exactly one.\n${list}`,
      );
    }

    const tenants = await tenantsCol.find({}, { projection: { _id: 1, name: 1 } }).toArray();

    const usersToDeleteCount = await usersCol.countDocuments({ role: { $ne: 'super_admin' } });
    const tenantsToDeleteCount = tenants.length;

    const productsTotalCount = collectionNames.has('products')
      ? await db.collection('products').countDocuments({})
      : 0;
    const ordersTotalCount = collectionNames.has('orders')
      ? await db.collection('orders').countDocuments({})
      : 0;

    const commissionsTotalCount = collectionNames.has('commissions')
      ? await db.collection('commissions').countDocuments({})
      : 0;
    const transactionsTotalCount = collectionNames.has('transactions')
      ? await db.collection('transactions').countDocuments({})
      : 0;
    const withdrawalsTotalCount = collectionNames.has('withdrawals')
      ? await db.collection('withdrawals').countDocuments({})
      : 0;

    const result = {
      usersDeleted: 0,
      tenantsDeleted: 0,
      productsDeleted: 0,
      ordersDeleted: 0,
      commissionsDeleted: 0,
      transactionsDeleted: 0,
      withdrawalsDeleted: 0,
      tenantScopedDeleted: {},
    };

    console.log('\nPLAN');
    console.log(`usersToDelete(non-super_admin)\t${usersToDeleteCount}`);
    console.log(`tenantsToDelete\t${tenantsToDeleteCount}`);
    console.log(`productsToDelete\t${productsTotalCount}`);
    console.log(`ordersToDelete\t${ordersTotalCount}`);
    console.log(`commissionsToDelete\t${commissionsTotalCount}`);
    console.log(`transactionsToDelete\t${transactionsTotalCount}`);
    console.log(`withdrawalsToDelete\t${withdrawalsTotalCount}`);

    const tenantFilter = tenantPresentFilter();

    if (!dryRun) {
      const usersDeletedRes = await usersCol.deleteMany({ role: { $ne: 'super_admin' } });
      result.usersDeleted = usersDeletedRes.deletedCount || 0;
    }

    for (const name of collectionNames) {
      if (name === 'users' || name === 'tenants') continue;
      if (name === 'products' || name === 'orders') continue;
      if (name === 'commissions' || name === 'transactions' || name === 'withdrawals') continue;
      const col = db.collection(name);

      if (dryRun) {
        const c = await col.countDocuments(tenantFilter);
        if (c > 0) result.tenantScopedDeleted[name] = c;
      } else {
        const del = await col.deleteMany(tenantFilter);
        const dc = del.deletedCount || 0;
        if (dc > 0) result.tenantScopedDeleted[name] = dc;
      }
    }

    if (collectionNames.has('products')) {
      const productsCol = db.collection('products');
      if (dryRun) {
        result.productsDeleted = await productsCol.countDocuments({});
      } else {
        const del = await productsCol.deleteMany({});
        result.productsDeleted = del.deletedCount || 0;
      }
    }

    if (collectionNames.has('orders')) {
      const ordersCol = db.collection('orders');
      if (dryRun) {
        result.ordersDeleted = await ordersCol.countDocuments({});
      } else {
        const del = await ordersCol.deleteMany({});
        result.ordersDeleted = del.deletedCount || 0;
      }
    }

    if (collectionNames.has('commissions')) {
      const commissionsCol = db.collection('commissions');
      if (dryRun) {
        result.commissionsDeleted = await commissionsCol.countDocuments({});
      } else {
        const del = await commissionsCol.deleteMany({});
        result.commissionsDeleted = del.deletedCount || 0;
      }
    }

    if (collectionNames.has('transactions')) {
      const transactionsCol = db.collection('transactions');
      if (dryRun) {
        result.transactionsDeleted = await transactionsCol.countDocuments({});
      } else {
        const del = await transactionsCol.deleteMany({});
        result.transactionsDeleted = del.deletedCount || 0;
      }
    }

    if (collectionNames.has('withdrawals')) {
      const withdrawalsCol = db.collection('withdrawals');
      if (dryRun) {
        result.withdrawalsDeleted = await withdrawalsCol.countDocuments({});
      } else {
        const del = await withdrawalsCol.deleteMany({});
        result.withdrawalsDeleted = del.deletedCount || 0;
      }
    }

    if (!dryRun) {
      const tenantsDeletedRes = await tenantsCol.deleteMany({});
      result.tenantsDeleted = tenantsDeletedRes.deletedCount || 0;
    }

    console.log('\nRESULT');
    console.log(JSON.stringify(result, null, 2));

    const remainingSuperAdmins = await usersCol.countDocuments({ role: 'super_admin' });
    const remainingUsers = await usersCol.countDocuments({});
    const remainingTenants = await tenantsCol.countDocuments({});

    const remainingProducts = collectionNames.has('products')
      ? await db.collection('products').countDocuments({})
      : 0;

    const remainingOrders = collectionNames.has('orders')
      ? await db.collection('orders').countDocuments({})
      : 0;

    console.log('\nVERIFY');
    console.log(`remainingSuperAdmins\t${remainingSuperAdmins}`);
    console.log(`remainingUsers\t${remainingUsers}`);
    console.log(`remainingTenants\t${remainingTenants}`);
    console.log(`remainingProducts\t${remainingProducts}`);
    console.log(`remainingOrders\t${remainingOrders}`);

    if (!dryRun) {
      if (remainingSuperAdmins !== 1 || remainingUsers !== 1) {
        throw new Error(
          `POST-CHECK FAILED: Expected exactly 1 user who is super_admin. Found remainingUsers=${remainingUsers}, remainingSuperAdmins=${remainingSuperAdmins}`,
        );
      }
      if (remainingTenants !== 0) {
        throw new Error(`POST-CHECK FAILED: Expected 0 tenants. Found ${remainingTenants}`);
      }
      if (remainingProducts !== 0) {
        throw new Error(`POST-CHECK FAILED: Expected 0 products. Found ${remainingProducts}`);
      }
      if (remainingOrders !== 0) {
        throw new Error(`POST-CHECK FAILED: Expected 0 orders. Found ${remainingOrders}`);
      }
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('[RESET_DEMO_FULL_ERROR]', err?.message || err);
  process.exitCode = 1;
});
