import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import { getDb } from '@/lib/db';
import { isSuperAdminUser } from '@/lib/superAdmins';
import { apiDebugLog } from '@/lib/apiDebugLog';

/**
 * GET /api/admin/catalog-manager/tenants
 * Get list of tenants for catalog manager dropdown
 * Note: This endpoint returns only basic tenant info (id, name) for the dropdown
 */
async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    if (!isSuperAdminUser(admin)) {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    const db = await getDb();
    
    const tenants = await db.collection('tenants')
      .find({})
      .project({ _id: 1, name: 1, status: 1 })
      .sort({ name: 1 })
      .toArray();

    apiDebugLog('Catalog manager tenants loaded:', tenants.length);

    return NextResponse.json({
      ok: true,
      tenants: tenants.map(t => ({
        _id: t._id?.toString?.() ?? t._id,
        name: t.name || 'ללא שם',
        status: t.status || 'active'
      }))
    });
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('GET /api/admin/catalog-manager/tenants error:', err);
    return NextResponse.json({ error: 'Failed to load tenants' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
