import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { withErrorLogging } from '@/lib/errorTracking/errorLogger';

async function GETHandler(request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const db = await getDb();
  const latest = await db
    .collection('error_events')
    .find({}, { projection: { ts: 1, message: 1, requestId: 1, route: 1, fingerprint: 1 } })
    .sort({ ts: -1 })
    .limit(5)
    .toArray();

  return NextResponse.json({ latest });
}

export const GET = withErrorLogging(GETHandler, {
  severity: 'info',
  type: 'API_ERROR',
});
