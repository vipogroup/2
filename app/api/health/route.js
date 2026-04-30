import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

/**
 * Health Check Endpoint
 *
 * Used for uptime monitoring and deployment health checks.
 * No authentication required.
 *
 * GET /api/health
 * Returns: { status: 'ok', timestamp: ISO string }
 */

async function GETHandler(request) {
  const requestUrl = new URL(request?.url || 'http://localhost');
  const check = requestUrl.searchParams.get('check') || '';
  const deep = requestUrl.searchParams.get('deep') || '';
  const shouldCheckDb = ['db', 'mongo', 'mongodb', '1', 'true'].includes(check.toLowerCase())
    || ['1', 'true'].includes(deep.toLowerCase());

  let mongoStatus = {
    status: 'skipped',
    message: 'MongoDB check skipped (use ?check=db for deep check)',
  };
  let overallStatus = 'ok';
  let httpStatus = 200;

  if (shouldCheckDb) {
    const startTime = Date.now();
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      if (!db) {
        mongoStatus = {
          status: 'error',
          message: 'MongoDB client unavailable',
        };
      } else {
        await db.command({ ping: 1 });
        mongoStatus = {
          status: 'connected',
          message: 'MongoDB ping ok',
          latencyMs: Date.now() - startTime,
        };
      }
    } catch (error) {
      mongoStatus = {
        status: 'error',
        message: error?.message || 'MongoDB check failed',
      };
    }

    if (mongoStatus.status !== 'connected') {
      overallStatus = 'degraded';
      httpStatus = 503;
    }
  }

  return new Response(
    JSON.stringify({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      mode: shouldCheckDb ? 'deep' : 'basic',
      checks: {
        mongodb: mongoStatus,
      },
    }),
    {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    },
  );
}

export const GET = withErrorLogging(GETHandler);
