// scripts/set-business-admin-credentials.js
// Dry-run by default. Use --apply to write changes.

const dotenv = require('dotenv');
// Prefer local env for safety
dotenv.config({ path: process.env.ENV_FILE || '.env.local' });

const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI is missing (not set via environment or .env.local)');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');

// SAFETY GUARD: block production unless explicitly allowed
const nodeEnv = process.env.NODE_ENV || 'development';
const allowApplyInProd = String(process.env.ALLOW_BUSINESS_ADMIN_CREDENTIALS || '').toLowerCase() === 'true';
if (APPLY && nodeEnv === 'production' && !allowApplyInProd) {
  console.error('🛑 set-business-admin-credentials blocked in production. Set ALLOW_BUSINESS_ADMIN_CREDENTIALS=true to override.');
  process.exit(1);
}

/* SAFETY GUARD: allow script only on approved DB names */
const allowedDbNames = new Set(['vipo', 'vipo_dev']);
const dbName = process.env.MONGODB_DB || 'vipo';
if (!allowedDbNames.has(dbName)) {
  console.error(`🛑 set-business-admin-credentials blocked: DB name "${dbName}" is not in allowed list (${Array.from(allowedDbNames).join(', ')})`);
  process.exit(1);
}

const BASE_EMAIL = '0523004374@gmail.com';
const PASSWORD_PLAIN = '1zxcvbnm';

const PHONE_PREFIX_8 = '05230043';

// Mapping approved by user (slug -> email letter)
const TENANT_EMAIL_MAPPING = [
  { slug: 't-83f833377b', letter: 'a' },
  { slug: 't-b4824527b6', letter: 'b' },
  { slug: 't-b19dc96fe5', letter: 'c' },
  { slug: 't-9a2f0c1f50', letter: 'd' },
  { slug: 't-57104b3c7b', letter: 'e' },
  { slug: 't-48a3f15132', letter: 'f' },
  { slug: 'test-biz-1768939622680', letter: 'g' },
  { slug: 'test-biz-1769009878448', letter: 'h' },
];

function targetEmailForLetter(letter) {
  return `${String(letter || '').toLowerCase()}${BASE_EMAIL}`.toLowerCase();
}

function preferredPhoneForIndex(idx) {
  const suffix = String(Number(idx) || 0).padStart(2, '0');
  return `${PHONE_PREFIX_8}${suffix}`;
}

function toLowerOrNull(value) {
  if (!value) return null;
  return String(value).trim().toLowerCase() || null;
}

function isForbiddenRole(role) {
  return ['super_admin', 'admin', 'agent', 'customer'].includes(String(role || '').toLowerCase());
}

async function allocateUniquePhone(users, preferred, excludeUserId = null) {
  const pref = String(preferred || '').trim();

  const reservedPhones = allocateUniquePhone.reservedPhones instanceof Set ? allocateUniquePhone.reservedPhones : null;

  async function isFree(phone) {
    if (!phone) return false;
    if (reservedPhones && reservedPhones.has(phone)) return false;
    const q = excludeUserId ? { phone, _id: { $ne: excludeUserId } } : { phone };
    const exists = await users.findOne(q, { projection: { _id: 1 } });
    return !exists;
  }

  if (pref && (await isFree(pref))) {
    if (reservedPhones) reservedPhones.add(pref);
    return pref;
  }

  // Fallback search in a safe deterministic range
  for (let i = 0; i < 200; i += 1) {
    const candidate = preferredPhoneForIndex(i);
    if (await isFree(candidate)) {
      if (reservedPhones) reservedPhones.add(candidate);
      return candidate;
    }
  }

  throw new Error('Safety abort: failed to allocate unique phone');
}

(async () => {
  const client = new MongoClient(uri);
  let exitCode = 0;

  try {
    console.log('════════════════════════════════════════════');
    console.log('🔧 Business Admin Credentials - Plan/Apply');
    console.log('════════════════════════════════════════════');
    console.log(`Mode: ${APPLY ? 'APPLY (write to DB)' : 'DRY-RUN (no writes)'}`);
    console.log(`DB: ${dbName}`);
    console.log(`NODE_ENV: ${nodeEnv}`);
    console.log('');

    await client.connect();
    const db = client.db(dbName);
    const tenants = db.collection('tenants');
    const users = db.collection('users');

    const tenantsTotal = await tenants.countDocuments();
    if (tenantsTotal !== TENANT_EMAIL_MAPPING.length) {
      console.log(`⚠️ tenants count is ${tenantsTotal}, mapping has ${TENANT_EMAIL_MAPPING.length}. Proceeding only with mapped tenants.`);
      console.log('');
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);

    // Resolve tenants by slug
    const resolved = [];
    const missing = [];

    for (const m of TENANT_EMAIL_MAPPING) {
      const slug = toLowerOrNull(m.slug);
      const tenant = slug ? await tenants.findOne({ slug }) : null;
      if (!tenant) {
        missing.push(m);
        continue;
      }
      resolved.push({ mapping: m, tenant });
    }

    if (missing.length) {
      console.error('❌ Missing tenants by slug. Aborting for safety.');
      for (const m of missing) {
        console.error(` - slug=${m.slug} letter=${m.letter}`);
      }
      process.exit(1);
    }

    const planRows = [];
    const actions = [];

    // Reserve phones during planning so we never allocate the same phone twice in one run.
    allocateUniquePhone.reservedPhones = new Set();

    for (const item of resolved) {
      const { tenant, mapping } = item;
      const mappingIndex = TENANT_EMAIL_MAPPING.findIndex((x) => String(x.slug || '').toLowerCase() === String(mapping.slug || '').toLowerCase());
      const targetEmail = targetEmailForLetter(mapping.letter);
      const preferredPhone = preferredPhoneForIndex(mappingIndex >= 0 ? mappingIndex : 0);

      // If another user already has target email, validate it's a business_admin
      const existingByEmail = await users.findOne(
        { email: targetEmail },
        { projection: { _id: 1, email: 1, role: 1, tenantId: 1, fullName: 1, phone: 1 } },
      );

      if (existingByEmail && isForbiddenRole(existingByEmail.role)) {
        throw new Error(
          `Safety abort: email ${targetEmail} is already used by role=${existingByEmail.role} userId=${existingByEmail._id}`,
        );
      }

      // Find current business_admin(s) for this tenant
      const tenantAdmins = await users
        .find(
          { role: 'business_admin', tenantId: tenant._id },
          { projection: { _id: 1, email: 1, role: 1, tenantId: 1, fullName: 1, phone: 1 } },
        )
        .toArray();

      // Reserve any existing phones found (avoid allocating them to newly created users)
      for (const u of tenantAdmins) {
        if (u?.phone) allocateUniquePhone.reservedPhones.add(String(u.phone));
      }
      if (existingByEmail?.phone) allocateUniquePhone.reservedPhones.add(String(existingByEmail.phone));

      const row = {
        tenantId: String(tenant._id),
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        targetEmail,
        password: PASSWORD_PLAIN,
        foundTenantAdmins: tenantAdmins.map((u) => ({ _id: String(u._id), email: u.email || null, fullName: u.fullName || null })),
        foundUserByTargetEmail: existingByEmail
          ? { _id: String(existingByEmail._id), email: existingByEmail.email || null, role: existingByEmail.role, tenantId: existingByEmail.tenantId ? String(existingByEmail.tenantId) : null }
          : null,
      };
      planRows.push(row);

      // Determine action
      if (existingByEmail) {
        // SAFETY: if tenant already has a different business_admin, abort to avoid duplicates.
        const tenantAdminIds = new Set(tenantAdmins.map((u) => String(u._id)));
        if (tenantAdmins.length > 0 && !tenantAdminIds.has(String(existingByEmail._id))) {
          throw new Error(
            `Safety abort: tenant ${tenant.slug} already has business_admin user(s), but target email ${targetEmail} belongs to a different user (${existingByEmail._id}).`,
          );
        }

        const phoneToSet = existingByEmail.phone
          ? String(existingByEmail.phone)
          : await allocateUniquePhone(users, preferredPhone, existingByEmail._id);

        // Update that user to be the tenant business admin (only if safe)
        if (existingByEmail.tenantId && String(existingByEmail.tenantId) !== String(tenant._id)) {
          throw new Error(
            `Safety abort: user with email ${targetEmail} belongs to another tenant (${existingByEmail.tenantId}).`,
          );
        }

        actions.push({
          kind: 'update_existing_by_email',
          userId: existingByEmail._id,
          update: {
            email: targetEmail,
            role: 'business_admin',
            tenantId: tenant._id,
            isActive: true,
            passwordHash,
            phone: phoneToSet,
            updatedAt: now,
          },
        });
        continue;
      }

      if (tenantAdmins.length === 1) {
        // Rename existing tenant business_admin email + reset password
        const admin = tenantAdmins[0];
        if (isForbiddenRole(admin.role)) {
          throw new Error(`Safety abort: tenant admin is forbidden role=${admin.role} userId=${admin._id}`);
        }

        const phoneToSet = admin.phone
          ? String(admin.phone)
          : await allocateUniquePhone(users, preferredPhone, admin._id);

        actions.push({
          kind: 'update_single_tenant_admin',
          userId: admin._id,
          update: {
            email: targetEmail,
            role: 'business_admin',
            tenantId: tenant._id,
            isActive: true,
            passwordHash,
            phone: phoneToSet,
            updatedAt: now,
          },
        });
        continue;
      }

      if (tenantAdmins.length > 1) {
        throw new Error(
          `Safety abort: tenant ${tenant.slug} has ${tenantAdmins.length} business_admin users. Resolve duplicates first.`,
        );
      }

      // Create new business admin for tenant
      actions.push({
        kind: 'create_new_tenant_admin',
        insert: {
          email: targetEmail,
          phone: await allocateUniquePhone(users, preferredPhone, null),
          fullName: `מנהל חנות - ${tenant.name}`,
          role: 'business_admin',
          tenantId: tenant._id,
          isActive: true,
          passwordHash,
          provider: 'local',
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    // Print plan
    console.log('📋 Plan (per tenant):');
    for (const row of planRows) {
      console.log(`- ${row.tenantName} (${row.tenantSlug}) -> ${row.targetEmail} / ${row.password}`);
    }
    console.log('');

    const summary = actions.reduce(
      (acc, a) => {
        acc[a.kind] = (acc[a.kind] || 0) + 1;
        return acc;
      },
      {},
    );

    console.log('🧾 Actions summary:');
    Object.keys(summary)
      .sort()
      .forEach((k) => console.log(`- ${k}: ${summary[k]}`));
    console.log('');

    if (!APPLY) {
      console.log('✅ Dry-run complete. Re-run with --apply to execute.');
      process.exit(0);
    }

    // Apply actions
    console.log('🚨 APPLY mode: executing writes...');

    let updated = 0;
    let inserted = 0;

    for (const a of actions) {
      if (a.kind === 'create_new_tenant_admin') {
        await users.insertOne(a.insert);
        inserted += 1;
      } else {
        const res = await users.updateOne({ _id: a.userId }, { $set: a.update });
        updated += res.modifiedCount || 0;
      }
    }

    console.log('');
    console.log('✅ Done.');
    console.log(JSON.stringify({ updated, inserted }));

    // Final table
    console.log('');
    console.log('📌 Final credentials table (same password for all):');
    for (const item of resolved) {
      const expectedEmail = targetEmailForLetter(item.mapping.letter);
      const u = await users.findOne(
        { role: 'business_admin', tenantId: item.tenant._id },
        { projection: { _id: 1, email: 1, phone: 1, fullName: 1 } },
      );
      const actualEmail = u?.email || null;
      const actualPhone = u?.phone || null;
      const mismatch = actualEmail && actualEmail !== expectedEmail ? ' [WARN email mismatch]' : '';
      console.log(`- ${item.tenant.name} (${item.tenant.slug}): ${expectedEmail} / ${PASSWORD_PLAIN}${mismatch}`);
      if (!u) {
        console.log('  -> ❌ missing business_admin user for tenant');
      } else {
        console.log(`  -> userId=${String(u._id)} email=${actualEmail} phone=${actualPhone}`);
      }
    }
  } catch (e) {
    exitCode = 1;
    console.error('❌ Error:', e?.message || e);
  } finally {
    try {
      await client.close();
    } catch {}
    process.exit(exitCode);
  }
})();
