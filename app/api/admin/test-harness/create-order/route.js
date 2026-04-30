
import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
 export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

/**
 * Deprecated test-harness endpoint.
 * Order creation must go through POST /api/orders tenant validation only.
 */
async function POSTHandler() {
  return NextResponse.json(
    {
      error: 'deprecated_endpoint',
      message: 'Use POST /api/orders instead.',
    },
    { status: 410 },
  );
}

export const POST = withErrorLogging(POSTHandler);
