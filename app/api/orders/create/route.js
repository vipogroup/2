import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

/**
 * @deprecated Removed — use POST /api/orders (tenant-safe, validated).
 * Always returns 410 so legacy clients cannot create tenantless orders.
 */
async function POSTHandler() {
  return NextResponse.json(
    {
      error: 'deprecated_endpoint',
      message: 'POST /api/orders/create is no longer supported. Use POST /api/orders with tenant resolution.',
    },
    { status: 410 },
  );
}

export const POST = withErrorLogging(POSTHandler);
