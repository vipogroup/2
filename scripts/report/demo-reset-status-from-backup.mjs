import fs from 'node:fs/promises';
import path from 'node:path';

import { isSuperAdminUser } from '../../lib/superAdmins.js';

function normalizeEjson(value) {
  if (Array.isArray(value)) return value.map(normalizeEjson);
  if (!value || typeof value !== 'object') return value;

  const keys = Object.keys(value);
  if (keys.length === 1 && keys[0] === '$oid') return String(value.$oid);
  if (keys.length === 1 && keys[0] === '$date') return String(value.$date);

  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = normalizeEjson(v);
  return out;
}

async function readJsonIfExists(filePath, fallback = []) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return normalizeEjson(JSON.parse(raw));
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) return fallback;
    throw err;
  }
}

function getArgValue(argv, key) {
  const idx = argv.indexOf(key);
  if (idx < 0) return null;
  return argv[idx + 1] ?? null;
}

async function resolveBackupDir(argv) {
  const explicit = getArgValue(argv, '--backup-dir');
  if (explicit) return explicit;

  const baseDir = path.resolve('backups', 'database');
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const mongoDirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith('mongo-'))
    .map((e) => e.name)
    .sort();

  if (mongoDirs.length === 0) {
    throw new Error(`No mongo-* backup dirs found under ${baseDir}`);
  }

  return path.join(baseDir, mongoDirs[mongoDirs.length - 1]);
}

function asString(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function isMissingTenantId(v) {
  return v === null || v === undefined || String(v).trim() === '';
}

async function main() {
  const backupDir = await resolveBackupDir(process.argv.slice(2));

  const usersPath = path.join(backupDir, 'users.json');
  const tenantsPath = path.join(backupDir, 'tenants.json');
  const productsPath = path.join(backupDir, 'products.json');
  const ordersPath = path.join(backupDir, 'orders.json');

  const [usersRaw, tenantsRaw, productsRaw, ordersRaw] = await Promise.all([
    readJsonIfExists(usersPath, []),
    readJsonIfExists(tenantsPath, []),
    readJsonIfExists(productsPath, []),
    readJsonIfExists(ordersPath, []),
  ]);

  const users = (Array.isArray(usersRaw) ? usersRaw : []).map((u) => {
    const tenantId = u.tenantId ?? null;
    const email = u.email ? String(u.email).trim() : '';
    const role = u.role ? String(u.role) : '';
    const isSuperAdmin = isSuperAdminUser({ email, role, tenantId });

    return {
      userId: asString(u._id),
      email,
      role,
      tenantId: isMissingTenantId(tenantId) ? '' : asString(tenantId),
      isSuperAdmin,
    };
  });

  const tenants = (Array.isArray(tenantsRaw) ? tenantsRaw : []).map((t) => ({
    tenantId: asString(t._id),
    name: String(t.name || t.slug || '').trim(),
  }));

  const products = Array.isArray(productsRaw) ? productsRaw : [];
  const orders = Array.isArray(ordersRaw) ? ordersRaw : [];

  const usersCountByTenant = new Map();
  const productsCountByTenant = new Map();
  const ordersCountByTenant = new Map();

  for (const u of usersRaw) {
    if (!u) continue;
    const tenantId = u.tenantId ?? null;
    if (isMissingTenantId(tenantId)) continue;
    const key = asString(tenantId);
    usersCountByTenant.set(key, (usersCountByTenant.get(key) || 0) + 1);
  }

  for (const p of products) {
    if (!p) continue;
    const tenantId = p.tenantId ?? null;
    if (isMissingTenantId(tenantId)) continue;
    const key = asString(tenantId);
    productsCountByTenant.set(key, (productsCountByTenant.get(key) || 0) + 1);
  }

  for (const o of orders) {
    if (!o) continue;
    const tenantId = o.tenantId ?? null;
    if (isMissingTenantId(tenantId)) continue;
    const key = asString(tenantId);
    ordersCountByTenant.set(key, (ordersCountByTenant.get(key) || 0) + 1);
  }

  const tenantsWithCounts = tenants.map((t) => {
    const id = t.tenantId;
    return {
      ...t,
      usersCount: usersCountByTenant.get(id) || 0,
      productsCount: productsCountByTenant.get(id) || 0,
      ordersCount: ordersCountByTenant.get(id) || 0,
    };
  });

  const superAdmins = users.filter((u) => u.isSuperAdmin);

  const usersWithoutTenantId = users.filter((u) => !u.tenantId).length;
  const productsWithoutTenantId = products.filter((p) => isMissingTenantId(p?.tenantId ?? null)).length;
  const ordersWithoutTenantId = orders.filter((o) => isMissingTenantId(o?.tenantId ?? null)).length;

  console.log('DEMO RESET STATUS (FROM BACKUP)');
  console.log(`backupDir\t${backupDir}`);

  console.log('\n=== USERS ===');
  console.log('userId\temail\trole\ttenantId\tisSuperAdmin\tmustKeep');
  users.forEach((u) => {
    console.log(
      [
        u.userId,
        u.email,
        u.role,
        u.tenantId,
        u.isSuperAdmin ? 'YES' : '',
        u.isSuperAdmin ? 'YES' : '',
      ].join('\t'),
    );
  });

  console.log('\n=== TENANTS ===');
  console.log('tenantId\tname\tusersCount\tproductsCount\tordersCount');
  tenantsWithCounts.forEach((t) => {
    console.log([t.tenantId, t.name, t.usersCount, t.productsCount, t.ordersCount].join('\t'));
  });

  console.log('\n=== SUMMARY ===');
  console.log(`totalUsers\t${users.length}`);
  console.log(`superAdminsDetected\t${superAdmins.length}`);
  console.log(`totalTenants\t${tenants.length}`);

  if (superAdmins.length === 0) {
    console.log('WARNING\tNO_SUPER_ADMIN_FOUND');
  } else if (superAdmins.length > 1) {
    console.log('WARNING\tMULTIPLE_SUPER_ADMINS_FOUND');
  }

  if (superAdmins.length >= 1) {
    console.log(`usersToDeleteIfKeepOneSuperAdmin\t${Math.max(0, users.length - 1)}`);
  } else {
    console.log('usersToDeleteIfKeepOneSuperAdmin\tN/A');
  }

  console.log(`tenantsToDelete\t${tenants.length}`);

  console.log(`usersWithoutTenantId\t${usersWithoutTenantId}`);
  console.log(`productsWithoutTenantId\t${productsWithoutTenantId}`);
  console.log(`ordersWithoutTenantId\t${ordersWithoutTenantId}`);

  console.log(
    'NOTE\tDeleting tenants/users only will NOT delete products/orders automatically; tenant-scoped collections must also be cleared to avoid orphan data.',
  );

  const superAdminsWithTenant = users.filter((u) => u.isSuperAdmin && u.tenantId);
  if (superAdminsWithTenant.length > 0) {
    console.log('WARNING\tSUPER_ADMIN_WITH_TENANT_ID');
    superAdminsWithTenant.forEach((u) => {
      console.log(`superAdminWithTenant\t${u.userId}\t${u.email}\t${u.role}\t${u.tenantId}`);
    });
  }
}

main().catch((err) => {
  console.error('[DEMO_RESET_STATUS_FROM_BACKUP_ERROR]', err?.message || err);
  process.exitCode = 1;
});
