import { NextResponse } from 'next/server';

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';

async function GETHandler(request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  await Promise.reject(new Error('DEV_REJECTION_TEST'));
}

export const GET = withErrorLogging(GETHandler, {
  severity: 'error',
  type: 'API_ERROR',
});
