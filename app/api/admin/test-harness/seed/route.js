
import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

/**
 * Deprecated: order seeding via test harness can bypass canonical order flow.
 * Use POST /api/orders for real order creation.
 */
async function POSTHandler() {
  return NextResponse.json(
    {
      error: 'deprecated_endpoint',
      message: 'Order seeding is deprecated. Use POST /api/orders for real order creation.',
    },
    { status: 410 },
  );
}

export const POST = withErrorLogging(POSTHandler);
