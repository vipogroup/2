import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

async function GETHandler() {
  return NextResponse.json({ 
    success: true, 
    message: 'Reports API is working',
    timestamp: new Date().toISOString()
  });
}

export const GET = withErrorLogging(GETHandler);
