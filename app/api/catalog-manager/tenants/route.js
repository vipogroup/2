import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import { getDb } from '@/lib/db';
import { isDbUnavailableError } from '@/lib/dbOutageClassifier';
import { isSuperAdminUser } from '@/lib/superAdmins';
import { apiDebugLog } from '@/lib/apiDebugLog';

const FALLBACK_TENANTS_FILE = path.join(process.cwd(), 'data', 'fallback-marketplace-tenants.json');

function serializeTenant(tenant = {}) {
  return {
    _id: tenant?._id?.toString?.() ?? String(tenant?._id || '').trim(),
    name: String(tenant?.name || '').trim() || 'ללא שם',
    status: String(tenant?.status || '').trim() || 'active',
  };
}

async function loadFallbackTenants() {
  try {
    const raw = await fs.readFile(FALLBACK_TENANTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((tenant) => serializeTenant(tenant))
      .filter((tenant) => tenant._id && tenant.name);
  } catch (error) {
    console.warn('CATALOG_MANAGER_TENANTS_FALLBACK_LOAD_FAILED', error?.message || error);
    return [];
  }
}

async function buildFallbackTenantsResponse(reason = 'db_unavailable') {
  const tenants = await loadFallbackTenants();

  return NextResponse.json(
    {
      ok: true,
      tenants,
      dataMode: 'fallback',
      fallback: {
        reason,
        message: 'Database unavailable. Returning fallback tenants list.',
      },
    },
    {
      headers: {
        'cache-control': 'no-store',
        'x-data-mode': 'fallback',
        'x-vipo-fallback': 'true',
        'x-vipo-fallback-reason': reason,
      },
    },
  );
}

/**
 * GET /api/catalog-manager/tenants
 * Get list of tenants for catalog manager dropdown
 * Note: This endpoint returns only basic tenant info (id, name) for the dropdown
 */
async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    if (!isSuperAdminUser(admin)) {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    let db = null;
    try {
      db = await getDb();
    } catch (dbError) {
      if (isDbUnavailableError(dbError)) {
        return buildFallbackTenantsResponse('db_unavailable');
      }
      throw dbError;
    }

    if (!db) {
      return buildFallbackTenantsResponse('db_unavailable');
    }
    
    const tenants = await db.collection('tenants')
      .find({})
      .project({ _id: 1, name: 1, status: 1 })
      .sort({ name: 1 })
      .toArray();

    apiDebugLog('Catalog manager tenants loaded:', tenants.length);

    // next dev + Mongo ריק — אותו snapshot כמו במרקטפלייס (בחירת חנות ב-Catalog Manager)
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.VIPO_DEV_EMPTY_MONGO_FALLBACK !== '0' &&
      tenants.length === 0
    ) {
      console.warn(
        '[CATALOG_MANAGER] Development: no tenants in Mongo — using data/fallback-marketplace-tenants.json',
      );
      return buildFallbackTenantsResponse('dev_empty_db');
    }

    return NextResponse.json({
      ok: true,
      tenants: tenants.map(t => ({
        _id: t._id?.toString?.() ?? t._id,
        name: t.name || 'ללא שם',
        status: t.status || 'active'
      }))
    });
  } catch (err) {
    if (isDbUnavailableError(err)) {
      return buildFallbackTenantsResponse('db_unavailable');
    }
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('GET /api/catalog-manager/tenants error:', err);
    return NextResponse.json({ error: 'Failed to load tenants' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
