/**
 * POST /api/admin/system-reset
 * שני מצבי איפוס:
 *   mode: 'test_only' (ברירת מחדל) — מוחק רק נתוני סימולטור (sim-* מיילים)
 *   mode: 'full' — מוחק הכל חוץ מ-catalogtemplates + מנהל ראשי + חנויות מוגנות
 *
 * GET /api/admin/system-reset
 * מחזיר רשימת גיבויים + רשימת חנויות (לבחירת הגנה)
 */

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { isSuperAdminUser } from '@/lib/superAdmins';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const PRIMARY_ADMIN_EMAIL = 'm0587009938@gmail.com';

// Simulator test email patterns
const SIM_EMAIL_PATTERNS = [
  /^sim-/i,
  /^test-/i,
  /@test\.com$/i,
  /@vipo\.local$/i,
];

function isTestEmail(email) {
  if (!email) return false;
  return SIM_EMAIL_PATTERNS.some(p => p.test(email));
}

// Collections to clean in test_only mode (filter by sim-* data)
const COLLECTIONS_WITH_TENANT_FILTER = [
  'orders', 'products', 'commissions', 'withdrawals',
  'notifications', 'notificationlogs', 'system_alerts',
  'agentgoals', 'bonusrules', 'automations', 'carts',
  'activitylogs', 'securityevents', 'supportmessages', 'catalogs',
];

const RESET_CONFIRM_TOKEN = 'RESET_SYSTEM_IRREVERSIBLE';

function blockedResetResponse() {
  return NextResponse.json(
    {
      error: 'system_reset_blocked',
      message: 'System reset is blocked without explicit super-admin confirmation.',
    },
    { status: 403 },
  );
}

function normalizeConfirmCollections(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
}

async function buildResetPreview(db, mode, protectedTenantIds) {
  const preview = {
    mode,
    estimatedCounts: {},
    collections: [],
    metadata: {},
  };

  if (mode === 'test_only') {
    const testUsers = await db.collection('users')
      .find({ email: { $ne: PRIMARY_ADMIN_EMAIL } }, { projection: { _id: 1, email: 1 } })
      .toArray();
    const testUserIds = testUsers.filter((u) => isTestEmail(u.email)).map((u) => u._id);

    const testTenants = await db.collection('tenants').find({
      $or: [
        { ownerId: { $in: testUserIds } },
        { slug: { $regex: /^(electronics|fashion|home)-\d+/ } },
        { name: { $regex: /^S\d+/ } },
      ],
    }, { projection: { _id: 1 } }).toArray();
    const testTenantIds = testTenants.map((t) => t._id);

    preview.metadata.testUsers = testUserIds.length;
    preview.metadata.testTenants = testTenantIds.length;
    preview.collections = ['users', 'tenants', ...COLLECTIONS_WITH_TENANT_FILTER, 'products'];

    preview.estimatedCounts.users = testUserIds.length
      ? await db.collection('users').countDocuments({ _id: { $in: testUserIds } })
      : 0;
    preview.estimatedCounts.tenants = testTenantIds.length
      ? await db.collection('tenants').countDocuments({ _id: { $in: testTenantIds } })
      : 0;

    for (const colName of COLLECTIONS_WITH_TENANT_FILTER) {
      const filter = { $or: [] };
      if (testTenantIds.length > 0) filter.$or.push({ tenantId: { $in: testTenantIds } });
      if (testUserIds.length > 0) {
        filter.$or.push({ customerId: { $in: testUserIds } });
        filter.$or.push({ userId: { $in: testUserIds } });
        filter.$or.push({ agentId: { $in: testUserIds } });
      }
      preview.estimatedCounts[colName] = filter.$or.length > 0
        ? await db.collection(colName).countDocuments(filter).catch(() => 0)
        : 0;
    }

    preview.estimatedCounts.productsExtra = await db.collection('products').countDocuments({
      $or: [
        { tenantId: { $in: testTenantIds } },
        { name: { $regex: /^S\d+_/ } },
        { name: { $regex: /^sim-/i } },
      ],
    }).catch(() => 0);

    preview.context = { testUserIds, testTenantIds };
    return preview;
  }

  const allTenants = await db.collection('tenants').find({}).toArray();
  const realTenantIds = protectedTenantIds.length > 0
    ? protectedTenantIds
    : allTenants.filter((t) => !isTestEmail(t.contact?.email)).map((t) => String(t._id));

  const protectedOids = realTenantIds
    .map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : null))
    .filter(Boolean);

  const protectedOwnerIds = allTenants
    .filter((t) => realTenantIds.includes(String(t._id)))
    .map((t) => t.ownerId)
    .filter(Boolean);

  const userFilter = {
    email: { $ne: PRIMARY_ADMIN_EMAIL },
    _id: {
      $nin: protectedOwnerIds.map((id) => {
        try {
          return new ObjectId(id);
        } catch {
          return id;
        }
      }),
    },
  };

  const tenantFilter = protectedOids.length > 0 ? { _id: { $nin: protectedOids } } : {};

  preview.metadata.protectedTenantIds = realTenantIds.length;
  preview.collections = ['users', 'tenants', ...COLLECTIONS_WITH_TENANT_FILTER];
  preview.estimatedCounts.users = await db.collection('users').countDocuments(userFilter);
  preview.estimatedCounts.tenants = await db.collection('tenants').countDocuments(tenantFilter);

  for (const colName of COLLECTIONS_WITH_TENANT_FILTER) {
    const filter = protectedOids.length > 0 ? { tenantId: { $nin: protectedOids } } : {};
    preview.estimatedCounts[colName] = await db.collection(colName).countDocuments(filter).catch(() => 0);
  }

  preview.context = { allTenants, realTenantIds, protectedOids, protectedOwnerIds, userFilter };
  return preview;
}

async function GETHandler(req) {
  const admin = await requireAdminApi(req);
  if (admin.role !== 'admin' && admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const db = await getDb();

  // Get backups
  const backups = await db.collection('system_backups')
    .find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  // Get tenants for protection selection
  const tenants = await db.collection('tenants').find({}).toArray();

  return NextResponse.json({
    ok: true,
    backups: backups.map(b => ({
      _id: String(b._id),
      createdAt: b.createdAt,
      createdBy: b.createdBy,
      mode: b.mode || 'unknown',
      templateCount: b.templateCount || 0,
      deletedCounts: b.deletedCounts || {},
    })),
    tenants: tenants.map(t => ({
      _id: String(t._id),
      name: t.name,
      slug: t.slug,
      status: t.status,
      ownerEmail: t.contact?.email || '',
    })),
  });
}

async function POSTHandler(req) {
  const admin = await requireAdminApi(req);
  if (!isSuperAdminUser(admin)) {
    return blockedResetResponse();
  }

  const body = await req.json().catch(() => ({}));
  const {
    password,
    mode = 'test_only',
    protectedTenantIds = [],
    dryRun = true,
    confirm,
    reason,
    acknowledgeDataLoss,
    confirmEnvironment,
    confirmCollections,
  } = body || {};

  if (!['test_only', 'full'].includes(mode)) {
    return NextResponse.json({ error: 'invalid_mode' }, { status: 400 });
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  const allowSystemReset = process.env.ALLOW_SYSTEM_RESET === 'true';
  const db = await getDb();
  const preview = await buildResetPreview(
    db,
    mode,
    Array.isArray(protectedTenantIds) ? protectedTenantIds : [],
  );

  if (dryRun !== false) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      deleteEnabled: false,
      mode,
      preview,
      requiredConfirmCollections: preview.collections,
      message: 'Dry-run preview only. No data was modified.',
    });
  }

  if (nodeEnv === 'production' && !allowSystemReset) {
    return blockedResetResponse();
  }

  const normalizedReason = String(reason || '').trim();
  const normalizedConfirm = String(confirm || '').trim();
  const normalizedConfirmEnv = String(confirmEnvironment || '').trim();
  const requestedCollections = normalizeConfirmCollections(confirmCollections);
  const requiredCollections = preview.collections;
  const hasAllRequiredCollections = requiredCollections.every((name) => requestedCollections.includes(name));
  const confirmationValid =
    normalizedConfirm === RESET_CONFIRM_TOKEN &&
    normalizedReason.length > 0 &&
    acknowledgeDataLoss === true &&
    normalizedConfirmEnv === nodeEnv &&
    requestedCollections.length > 0 &&
    hasAllRequiredCollections;

  if (!confirmationValid) {
    return blockedResetResponse();
  }

  if (!password) {
    return blockedResetResponse();
  }

  // Verify primary admin password for irreversible reset
  const adminUser = await db.collection('users').findOne(
    { email: PRIMARY_ADMIN_EMAIL },
    { projection: { passwordHash: 1, _id: 1, email: 1 } },
  );
  if (!adminUser?.passwordHash) {
    return blockedResetResponse();
  }
  const passwordMatch = await bcrypt.compare(password, adminUser.passwordHash);
  if (!passwordMatch) {
    return blockedResetResponse();
  }

  console.warn('[SYSTEM_RESET_AUDIT]', {
    action: 'system_reset',
    actorId: admin?.id || admin?._id || null,
    actorEmail: admin?.email || null,
    actorRole: admin?.role || null,
    reason: normalizedReason,
    NODE_ENV: nodeEnv,
    ALLOW_SYSTEM_RESET: allowSystemReset,
    dryRun: false,
    mode,
    affectedCollections: requiredCollections,
    estimatedCounts: preview.estimatedCounts,
  });

  // ---- STEP 1: Backup catalog templates ----
  const templates = await db.collection('catalogtemplates').find({}).toArray();

  // Also backup tenants & products for safety
  const tenantsBackup = await db.collection('tenants').find({}).toArray();
  const productsBackup = await db.collection('products').find({}).toArray();

  const deletedCounts = {};

  if (mode === 'test_only') {
    // ========================================
    // MODE: TEST ONLY — delete sim-* data only
    // ========================================

    const testUserIds = preview?.context?.testUserIds || [];
    const testTenantIds = preview?.context?.testTenantIds || [];

    // Delete test users
    if (testUserIds.length > 0) {
      const r = await db.collection('users').deleteMany({ _id: { $in: testUserIds } });
      deletedCounts.users = r.deletedCount;
    } else {
      deletedCounts.users = 0;
    }

    // Delete test tenants
    if (testTenantIds.length > 0) {
      const r = await db.collection('tenants').deleteMany({ _id: { $in: testTenantIds } });
      deletedCounts.tenants = r.deletedCount;
    } else {
      deletedCounts.tenants = 0;
    }

    // For each collection, delete docs belonging to test tenants or test users
    for (const colName of COLLECTIONS_WITH_TENANT_FILTER) {
      try {
        const col = db.collection(colName);
        const filter = { $or: [] };
        if (testTenantIds.length > 0) filter.$or.push({ tenantId: { $in: testTenantIds } });
        if (testUserIds.length > 0) {
          filter.$or.push({ customerId: { $in: testUserIds } });
          filter.$or.push({ userId: { $in: testUserIds } });
          filter.$or.push({ agentId: { $in: testUserIds } });
        }
        if (filter.$or.length > 0) {
          const r = await col.deleteMany(filter);
          deletedCounts[colName] = r.deletedCount;
        } else {
          deletedCounts[colName] = 0;
        }
      } catch (e) {
        deletedCounts[colName] = 0;
      }
    }

    // Also delete products without tenantId that have sim/test names
    try {
      const r = await db.collection('products').deleteMany({
        $or: [
          { tenantId: { $in: testTenantIds } },
          { name: { $regex: /^S\d+_/ } },
          { name: { $regex: /^sim-/i } },
        ],
      });
      deletedCounts.products = (deletedCounts.products || 0) + r.deletedCount;
    } catch (e) { /* skip */ }

  } else {
    // ========================================
    // MODE: FULL — delete everything except admin + protected tenants + templates
    // ========================================

    const protectedOids = preview?.context?.protectedOids || [];

    // Delete users except admin and protected tenant owners
    const userFilter = preview?.context?.userFilter || { email: { $ne: PRIMARY_ADMIN_EMAIL } };
    const userR = await db.collection('users').deleteMany(userFilter);
    deletedCounts.users = userR.deletedCount;

    // Delete tenants except protected
    if (protectedOids.length > 0) {
      const tenR = await db.collection('tenants').deleteMany({ _id: { $nin: protectedOids } });
      deletedCounts.tenants = tenR.deletedCount;
    } else {
      const tenR = await db.collection('tenants').deleteMany({});
      deletedCounts.tenants = tenR.deletedCount;
    }

    // Wipe other collections, preserving data of protected tenants
    for (const colName of COLLECTIONS_WITH_TENANT_FILTER) {
      try {
        const col = db.collection(colName);
        let filter = {};
        if (protectedOids.length > 0) {
          filter = { tenantId: { $nin: protectedOids } };
        }
        const r = await col.deleteMany(filter);
        deletedCounts[colName] = r.deletedCount;
      } catch (e) {
        deletedCounts[colName] = 0;
      }
    }
  }

  // ---- Save backup with stats ----
  const backupDoc = {
    type: 'pre_reset',
    mode,
    createdAt: new Date(),
    createdBy: admin.email || PRIMARY_ADMIN_EMAIL,
    templateCount: templates.length,
    templates,
    tenantsBackup,
    deletedCounts,
  };

  await db.collection('system_backups').insertOne(backupDoc);

  return NextResponse.json({
    ok: true,
    mode,
    message: mode === 'test_only' ? 'Test data cleaned' : 'Full system reset complete',
    deletedCounts,
    templateBackupCount: templates.length,
    templatesBackupData: templates.map(t => ({
      _id: String(t._id),
      key: t.key,
      name: t.name,
      tenantId: t.tenantId ? String(t.tenantId) : null,
      category: t.category,
      subCategory: t.subCategory,
      description: t.description,
      shortDescription: t.shortDescription,
      specs: t.specs,
      faq: t.faq,
      structuredData: t.structuredData,
      titlePrefix: t.titlePrefix,
      tags: t.tags,
      seo: t.seo,
      isActive: t.isActive,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
  });
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
