import 'dotenv/config';

import { MongoClient, ObjectId } from 'mongodb';
import { isSuperAdminUser } from '../../lib/superAdmins.js';

function fmtId(value) {
  if (value === undefined || value === null) return '';
  try {
    return String(value);
  } catch {
    return '';
  }
}

function tenantFilter(tenantObjectId) {
  const idStr = String(tenantObjectId);
  return {
    $or: [{ tenantId: tenantObjectId }, { tenantId: idStr }],
  };
}

function missingTenantFilter() {
  return {
    $or: [{ tenantId: null }, { tenantId: { $exists: false } }, { tenantId: '' }],
  };
}

function safeEmail(email) {
  if (!email) return '';
  return String(email).trim();
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  if (!uri) {
    throw new Error('Missing MONGODB_URI environment variable');
  }
  if (!dbName) {
    throw new Error('Missing MONGODB_DB environment variable');
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
  });

  await client.connect();
  const db = client.db(dbName);

  try {
    const [usersRaw, tenantsRaw] = await Promise.all([
      db
        .collection('users')
        .find(
          {},
          {
            projection: {
              email: 1,
              role: 1,
              tenantId: 1,
              createdAt: 1,
            },
          },
        )
        .sort({ createdAt: 1 })
        .toArray(),
      db
        .collection('tenants')
        .find(
          {},
          {
            projection: {
              name: 1,
              slug: 1,
              status: 1,
              createdAt: 1,
            },
          },
        )
        .sort({ createdAt: 1 })
        .toArray(),
    ]);

    const users = usersRaw.map((u) => {
      const user = {
        _id: u._id,
        email: safeEmail(u.email),
        role: u.role || '',
        tenantId: u.tenantId ?? null,
      };

      const isSuperAdmin = isSuperAdminUser({
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      });

      return {
        userId: fmtId(user._id),
        email: user.email,
        role: user.role,
        tenantId: user.tenantId ? fmtId(user.tenantId) : '',
        isSuperAdmin,
      };
    });

    const superAdmins = users.filter((u) => u.isSuperAdmin);

    // --- Users report ---
    console.log('=== USERS ===');
    console.log('userId\temail\trole\ttenantId\tisSuperAdmin\tmustKeep');

    users.forEach((u) => {
      const mustKeep = u.isSuperAdmin ? 'YES' : '';
      console.log(
        [u.userId, u.email, u.role, u.tenantId, u.isSuperAdmin ? 'YES' : '', mustKeep].join('\t'),
      );
    });

    // --- Tenants report ---
    console.log('\n=== TENANTS ===');
    console.log('tenantId\tname\tusersCount\tproductsCount\tordersCount');

    const tenantsWithCounts = [];

    for (const t of tenantsRaw) {
      const tenantId = t._id;
      const [usersCount, productsCount, ordersCount] = await Promise.all([
        db.collection('users').countDocuments(tenantFilter(tenantId)),
        db.collection('products').countDocuments(tenantFilter(tenantId)),
        db.collection('orders').countDocuments(tenantFilter(tenantId)),
      ]);

      const row = {
        tenantId: fmtId(tenantId),
        name: String(t.name || t.slug || '').trim(),
        usersCount,
        productsCount,
        ordersCount,
      };

      tenantsWithCounts.push(row);
      console.log(
        [row.tenantId, row.name, String(row.usersCount), String(row.productsCount), String(row.ordersCount)].join(
          '\t',
        ),
      );
    }

    // --- Global/orphan info ---
    const [usersNoTenant, productsNoTenant, ordersNoTenant] = await Promise.all([
      db.collection('users').countDocuments(missingTenantFilter()),
      db.collection('products').countDocuments(missingTenantFilter()),
      db.collection('orders').countDocuments(missingTenantFilter()),
    ]);

    // --- Summary ---
    console.log('\n=== SUMMARY ===');

    const totalUsers = users.length;
    const totalTenants = tenantsRaw.length;

    console.log(`totalUsers\t${totalUsers}`);
    console.log(`superAdminsDetected\t${superAdmins.length}`);
    console.log(`totalTenants\t${totalTenants}`);

    // What would be deleted in the planned reset
    if (superAdmins.length === 0) {
      console.log('WARNING\tNO_SUPER_ADMIN_FOUND');
      console.log(`usersToDeleteIfKeepOneSuperAdmin\tN/A`);
    } else {
      console.log(`usersToDeleteIfKeepOneSuperAdmin\t${Math.max(0, totalUsers - 1)}`);
      if (superAdmins.length > 1) {
        console.log('WARNING\tMULTIPLE_SUPER_ADMINS_FOUND');
      }
    }

    console.log(`tenantsToDelete\t${totalTenants}`);

    console.log(`usersWithoutTenantId\t${usersNoTenant}`);
    console.log(`productsWithoutTenantId\t${productsNoTenant}`);
    console.log(`ordersWithoutTenantId\t${ordersNoTenant}`);

    console.log(
      'NOTE\tDeleting tenants/users only will NOT delete products/orders automatically; they may remain orphaned unless you also clear tenant-scoped collections.',
    );

    // Extra warning: super_admin users that still have a tenantId
    const superAdminsWithTenant = users.filter((u) => u.isSuperAdmin && u.tenantId);
    if (superAdminsWithTenant.length > 0) {
      console.log('WARNING\tSUPER_ADMIN_WITH_TENANT_ID');
      superAdminsWithTenant.forEach((u) => {
        console.log(`superAdminWithTenant\t${u.userId}\t${u.email}\t${u.role}\t${u.tenantId}`);
      });
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('[DEMO_RESET_STATUS_ERROR]', err?.message || err);
  process.exitCode = 1;
});
