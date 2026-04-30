import { NextResponse } from 'next/server';

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';

async function GETHandler(request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  throw new Error('DEV_THROW_TEST');
}

export const GET = withErrorLogging(GETHandler, {
  severity: 'error',
  type: 'API_ERROR',
});
