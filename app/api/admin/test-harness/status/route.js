
import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/auth/server';
import { assertTestHarnessAccess, isTestHarnessEnabled } from '@/lib/testHarness/gate';
import { ADMIN_PERMISSIONS, hasPermission, isSuperAdminUser } from '@/lib/superAdmins';

async function GETHandler(request, _context, { requestId }) {
  const user = await requireAdminApi(request);
  assertTestHarnessAccess({ user, requestId, source: 'api/admin/test-harness' });

  const enabled = isTestHarnessEnabled();
  const hasTestHarnessPermission =
    isSuperAdminUser(user) || hasPermission(user, ADMIN_PERMISSIONS.MANAGE_TEST_HARNESS);

  return NextResponse.json({
    enabled,
    nodeEnv: process.env.NODE_ENV || 'development',
    enableTestHarness: process.env.ENABLE_TEST_HARNESS === 'true',
    hasPermission: hasTestHarnessPermission,
  });
}

export const GET = withErrorLogging(GETHandler);
