import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

async function POSTHandler() {
  return NextResponse.json(
    {
      error: 'deprecated_endpoint',
      message:
        'Bulk product deletion is deprecated. Product deletion is allowed only through the approved Catalog Manager flow.',
    },
    { status: 410 },
  );
}

export const POST = withErrorLogging(POSTHandler);
