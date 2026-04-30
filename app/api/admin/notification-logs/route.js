import { NextResponse } from 'next/server';
import { requireAdminGuard } from '@/lib/auth/requireAuth';
import { getNotificationLogs, getNotificationStats } from '@/lib/notifications/logger';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await requireAdminGuard(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const templateType = searchParams.get('templateType') || null;
    const status = searchParams.get('status') || null;
    const recipientRole = searchParams.get('recipientRole') || null;
    const search = searchParams.get('search') || null;
    const startDate = searchParams.get('startDate') || null;
    const endDate = searchParams.get('endDate') || null;
    const includeStats = searchParams.get('includeStats') === 'true';

    // Super admin sees all, regular admin sees only their tenant
    const tenantId = auth.user.role === 'super_admin' ? null : auth.user.tenantId;

    const result = await getNotificationLogs({
      tenantId,
      templateType,
      status,
      recipientRole,
      search,
      startDate,
      endDate,
      page,
      limit,
    });

    // Include stats if requested
    let stats = null;
    if (includeStats) {
      stats = await getNotificationStats(tenantId);
    }

    return NextResponse.json({
      ok: true,
      ...result,
      stats,
    });
  } catch (error) {
    console.error('GET /api/admin/notification-logs error:', error);
    return NextResponse.json(
      { error: error.message || 'internal_server_error' },
      { status: 500 }
    );
  }
}
