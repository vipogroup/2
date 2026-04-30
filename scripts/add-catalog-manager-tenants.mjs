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

  const tenantsToCreate = [
    { name: 'עיסוי מעולם אחר', slug: 'massage-world', status: 'active' },
    { name: 'עולם המוזיקה', slug: 'music-world', status: 'active' },
  ];

  console.log('ADD CATALOG MANAGER TENANTS');
  console.log(`mode\t${dryRun ? 'DRY_RUN' : 'CONFIRM'}`);
  console.log(`dbName\t${dbName}`);
  console.log(`tenantsPlanned\t${tenantsToCreate.length}`);

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
      throw new Error('No super_admin user found. Aborting.');
    }

    const slugs = tenantsToCreate.map((t) => t.slug);
    const existingTenants = await tenantsCol
      .find({ slug: { $in: slugs } }, { projection: { _id: 1, name: 1, slug: 1 } })
      .toArray();
    const existingBySlug = new Map((existingTenants || []).map((t) => [String(t.slug || ''), t]));

    if (dryRun) {
      console.log('\nPLAN');
      tenantsToCreate.forEach((t) => {
        const exists = existingBySlug.has(t.slug);
        console.log(`- ${exists ? 'SKIP' : 'CREATE'}\t${t.name}\t${t.slug}`);
      });
      return;
    }

    const now = new Date();
    const baseDoc = {
      ownerId: superAdmin._id,
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
      stats: {
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalAgents: 0,
        totalCustomers: 0,
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
      createdAt: now,
      updatedAt: now,
      createdBy: superAdmin._id,
    };

    const created = [];
    const skipped = [];

    for (const tenant of tenantsToCreate) {
      if (existingBySlug.has(tenant.slug)) {
        skipped.push(tenant.slug);
        continue;
      }

      const doc = {
        ...baseDoc,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status || 'active',
        seo: {
          title: tenant.name,
          description: null,
          keywords: null,
          googleAnalyticsId: null,
          googleTagManagerId: null,
        },
      };

      await tenantsCol.insertOne(doc);
      created.push(tenant.slug);
    }

    console.log('\nRESULT');
    console.log(`created\t${created.length}`);
    created.forEach((slug) => console.log(`+ ${slug}`));
    if (skipped.length) {
      console.log(`skipped\t${skipped.length}`);
      skipped.forEach((slug) => console.log(`- ${slug}`));
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('[ADD_CATALOG_MANAGER_TENANTS_ERROR]', err?.message || err);
  process.exitCode = 1;
});
