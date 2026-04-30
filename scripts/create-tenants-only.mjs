import crypto from 'crypto';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config({ path: '.env.local' });
dotenv.config();

function hasFlag(argv, flag) {
  return argv.includes(flag);
}

function getArgValue(argv, key) {
  const idx = argv.indexOf(key);
  if (idx < 0) return null;
  return argv[idx + 1] ?? null;
}

function buildStableSlug(name) {
  const h = crypto.createHash('sha1').update(String(name || ''), 'utf8').digest('hex').slice(0, 10);
  return `t-${h}`;
}

function formatId(id) {
  try {
    return String(id);
  } catch {
    return '';
  }
}

async function main() {
  const argv = process.argv.slice(2);

  const confirm = hasFlag(argv, '--confirm');
  const dryRun = hasFlag(argv, '--dry-run') || !confirm;

  const uri = getArgValue(argv, '--uri') || process.env.MONGODB_URI;
  const dbName = getArgValue(argv, '--db') || process.env.MONGODB_DB;

  if (!uri) {
    throw new Error('Missing MONGODB_URI (set env var or pass --uri)');
  }
  if (!dbName) {
    throw new Error('Missing MONGODB_DB (set env var or pass --db)');
  }

  const allowedDbNames = new Set(['vipogroup', 'vipo', 'vipo_dev', 'vipo_test', 'vipo_stage']);
  if (confirm && !allowedDbNames.has(dbName)) {
    throw new Error(
      `Blocked. DB name "${dbName}" not in allowed list: ${Array.from(allowedDbNames).join(', ')}`,
    );
  }

  const names = [
    'עיסוי מקצועי',
    'מערכות סאונד',
    'מחסני נירוסטה PD',
    'מערכות ישיבה מעור',
    'קמפינג ומתנפחים',
    'מוצרים לבית',
  ];

  const now = new Date();
  const planned = names.map((name) => ({ name, slug: buildStableSlug(name) }));

  console.log('CREATE TENANTS ONLY');
  console.log(`mode\t${dryRun ? 'DRY_RUN' : 'CONFIRM'}`);
  console.log(`dbName\t${dbName}`);
  console.log(`tenantsPlanned\t${planned.length}`);

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
  });

  await client.connect();
  const db = client.db(dbName);

  try {
    const tenantsCol = db.collection('tenants');
    const usersCol = db.collection('users');

    const superAdmin = await usersCol.findOne(
      { role: 'super_admin' },
      { projection: { _id: 1, email: 1, role: 1 } },
    );
    if (!superAdmin?._id) {
      throw new Error('SAFETY: No super_admin user found. Aborting.');
    }

    const existingTenants = await tenantsCol
      .find({}, { projection: { _id: 1, name: 1, slug: 1, domain: 1, subdomain: 1 } })
      .toArray();
    const existingTenantsCount = existingTenants.length;
    const usersCountBefore = await usersCol.countDocuments({});

    const colNames = (await db.listCollections({}, { nameOnly: true }).toArray())
      .map((c) => c.name)
      .filter(Boolean);
    const collectionsToVerifyEmpty = ['products', 'orders', 'commissions', 'transactions', 'withdrawals'];
    const countsBefore = {};
    for (const colName of collectionsToVerifyEmpty) {
      if (!colNames.includes(colName)) continue;
      countsBefore[colName] = await db.collection(colName).countDocuments({});
    }

    const plannedSlugs = new Set(planned.map((t) => t.slug));
    const extraTenants = (existingTenants || []).filter((t) => !plannedSlugs.has(String(t.slug || '')));
    if (extraTenants.length > 0) {
      const list = extraTenants.map((t) => `${formatId(t._id)}\t${String(t.name || '')}\t${String(t.slug || '')}`).join('\n');
      throw new Error(
        `SAFETY: Found existing tenants outside the requested set (${extraTenants.length}). Aborting.\n${list}`,
      );
    }

    const inserts = planned.map((t) => ({
      name: t.name,
      slug: t.slug,
      ownerId: superAdmin._id,
      status: 'pending',
      platformCommissionRate: 5,
      branding: {
        logo: null,
        favicon: null,
        primaryColor: '#1e3a8a',
        secondaryColor: '#0891b2',
        accentColor: '#06b6d4',
        useGlobalBranding: true,
      },
      contact: {
        email: null,
        phone: null,
        whatsapp: null,
        address: null,
      },
      social: {
        facebook: null,
        instagram: null,
        twitter: null,
        linkedin: null,
        youtube: null,
        tiktok: null,
      },
      seo: {
        title: t.name,
        description: null,
        keywords: null,
        googleAnalyticsId: null,
        googleTagManagerId: null,
      },
      features: {
        registration: true,
        groupPurchase: true,
        notifications: true,
        darkMode: false,
        agentSystem: true,
        coupons: true,
      },
      allowedMenus: [],
      allowedMenusConfigured: true,
      agentSettings: {
        defaultCommissionPercent: 12,
        defaultDiscountPercent: 10,
        commissionHoldDays: 30,
        groupPurchaseHoldDays: 100,
      },
      billing: {
        pendingBalance: 0,
        totalPaid: 0,
        lastPaymentAt: null,
        paymentMethod: null,
        bankDetails: {
          bankName: null,
          branchNumber: null,
          accountNumber: null,
          accountName: null,
        },
      },
      paymentMode: 'platform',
      payplus: {
        enabled: false,
        apiKey: null,
        secretKey: null,
        terminalId: null,
        webhookSecret: null,
        testMode: true,
      },
      priority: {
        enabled: false,
        apiUrl: null,
        username: null,
        password: null,
        companyId: null,
        priceListCode: null,
        warehouseCode: null,
      },
      stats: {
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalAgents: 0,
        totalCustomers: 0,
      },
      createdAt: now,
      updatedAt: now,
      createdBy: superAdmin._id,
    }));

    const existingBySlug = new Map((existingTenants || []).map((t) => [String(t.slug || ''), t]));

    if (dryRun) {
      console.log('\nPLAN');
      console.log(`existingTenants\t${existingTenantsCount}`);
      for (const t of inserts) {
        const exists = existingBySlug.has(t.slug);
        console.log(`- ${exists ? 'KEEP' : 'CREATE'}\t${t.name}\t${t.slug}`);
      }
      return;
    }

    for (const doc of inserts) {
      // Important: do NOT set domain/subdomain to null (unique+sparse index treats null as a value)
      const setFields = {
        name: doc.name,
        ownerId: doc.ownerId,
        status: doc.status,
        platformCommissionRate: doc.platformCommissionRate,
        updatedAt: now,
        createdBy: doc.createdBy,
      };

      const insertOnly = { ...doc };
      for (const k of Object.keys(setFields)) {
        delete insertOnly[k];
      }

      await tenantsCol.updateOne(
        { slug: doc.slug },
        {
          $setOnInsert: insertOnly,
          $set: setFields,
          $unset: {
            domain: '',
            subdomain: '',
          },
        },
        { upsert: true },
      );
    }

    const usersCountAfter = await usersCol.countDocuments({});
    if (usersCountAfter !== usersCountBefore) {
      throw new Error(`POST-CHECK FAILED: users count changed (${usersCountBefore} -> ${usersCountAfter})`);
    }

    const createdTenants = await tenantsCol
      .find({ slug: { $in: Array.from(plannedSlugs) } }, { projection: { _id: 1, name: 1, slug: 1 } })
      .toArray();

    if (createdTenants.length !== inserts.length) {
      throw new Error(`POST-CHECK FAILED: Expected ${inserts.length} tenants by slug. Found ${createdTenants.length}`);
    }

    const nameOrder = new Map(names.map((n, i) => [n, i]));
    createdTenants.sort((a, b) => {
      const ai = nameOrder.get(a.name) ?? 9999;
      const bi = nameOrder.get(b.name) ?? 9999;
      return ai - bi;
    });

    for (const colName of collectionsToVerifyEmpty) {
      if (!colNames.includes(colName)) continue;
      const col = db.collection(colName);
      for (const t of createdTenants) {
        const c = await col.countDocuments({ tenantId: t._id });
        if (c !== 0) {
          throw new Error(`POST-CHECK FAILED: ${colName} not empty for tenantId=${formatId(t._id)} (count=${c})`);
        }
      }
    }

    for (const colName of collectionsToVerifyEmpty) {
      if (!colNames.includes(colName)) continue;
      const after = await db.collection(colName).countDocuments({});
      const before = countsBefore[colName] ?? 0;
      if (after !== before) {
        throw new Error(`POST-CHECK FAILED: ${colName} count changed (${before} -> ${after})`);
      }
    }

    console.log('\nRESULT');
    console.log('tenantId\tname');
    for (const t of createdTenants) {
      console.log(`${formatId(t._id)}\t${t.name}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('[CREATE_TENANTS_ONLY_ERROR]', err?.message || err);
  process.exitCode = 1;
});
