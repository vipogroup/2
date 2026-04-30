import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';

async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    
    // Only super admins can see users grouped by tenant
    // isSuperAdmin expects user object, not email
    if (!isSuperAdmin(admin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDb();
    const users = db.collection('users');
    const tenants = db.collection('tenants');

    // Get all tenants
    const allTenants = await tenants.find({}).toArray();
    
    // Get all users (excluding password)
    const allUsers = await users.find({}, { 
      projection: { passwordHash: 0, password: 0 } 
    }).toArray();

    // Separate users: system users (no tenantId AND not business_admin) vs tenant users
    // Business admins should NEVER appear in system users, even if they don't have a tenantId yet
    const systemUsers = allUsers.filter(u => !u.tenantId && u.role !== 'business_admin');
    
    // Group users by tenant
    const usersByTenant = {};
    
    // First, add all tenants with their users
    for (const tenant of allTenants) {
      const tenantId = String(tenant._id);
      usersByTenant[tenantId] = {
        tenant: {
          _id: tenantId,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
        },
        users: allUsers.filter(u => u.tenantId && String(u.tenantId) === tenantId).map(u => ({
          ...u,
          _id: String(u._id),
          tenantId: String(u.tenantId),
        })),
      };
    }
    
    // Find business_admin users without tenantId (orphaned business admins)
    const orphanedBusinessAdmins = allUsers.filter(u => u.role === 'business_admin' && !u.tenantId);
    
    // Group orphaned business admins as "unassigned" tenant group
    if (orphanedBusinessAdmins.length > 0) {
      usersByTenant['unassigned'] = {
        tenant: {
          _id: 'unassigned',
          name: 'מנהלי עסק ללא שיוך',
          slug: 'unassigned',
          status: 'pending',
        },
        users: orphanedBusinessAdmins.map(u => ({
          ...u,
          _id: String(u._id),
        })),
      };
    }

    return NextResponse.json({
      systemUsers: systemUsers.map(u => ({
        ...u,
        _id: String(u._id),
      })),
      tenantGroups: Object.values(usersByTenant),
      totalUsers: allUsers.length,
      totalSystemUsers: systemUsers.length,
      totalTenantUsers: allUsers.length - systemUsers.length,
    });
  } catch (error) {
    console.error('GET /api/admin/users-by-tenant error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
