import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import { getAdminOverview } from '@/lib/reports';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';

async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = req.nextUrl || new URL(req.url, 'http://localhost');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    // Multi-Tenant: Pass tenantId for Business Admin
    const tenantId = !isSuperAdmin(admin) && admin.tenantId ? admin.tenantId : null;
    const data = await getAdminOverview({ from, to, tenantId });
    return NextResponse.json({ success: true, data, error: null });
  } catch (error) {
    const status = error?.status || 500;
    const message =
      status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Server error';
    return NextResponse.json({ error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
