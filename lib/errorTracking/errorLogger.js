import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import {
  insertErrorEvent,
  buildFingerprint,
  redactSensitive,
} from '@/models/ErrorEvent';

function getSeverityFromStatus(status = 500) {
  if (status >= 500) return 'critical';
  if (status >= 400) return 'error';
  if (status >= 300) return 'warn';
  return 'info';
}

function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    null
  );
}

async function writeErrorEvent(event) {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[ErrorLogger] Missing DB instance, skipping log');
      return;
    }
    await insertErrorEvent(db, event);
  } catch (err) {
    console.error('[ErrorLogger] Failed to persist error event:', err);
  }
}

export async function logServerError({
  request,
  error,
  context,
  requestId,
  override,
}) {
  const url = request.nextUrl?.pathname || request.url || 'unknown';
  const method = request.method || 'UNKNOWN';
  const status = override?.status ?? error?.status ?? error?.statusCode ?? 500;
  const source = override?.source || 'api';
  const severity = override?.severity || getSeverityFromStatus(status);

  let derivedType = override?.type || error?.type || error?.name || (status >= 500 ? 'UNHANDLED' : 'API_ERROR');
  const errorMessage = error?.message || '';

  if (!override?.type && errorMessage && /ECONNREFUSED|ECONNRESET|ETIMEDOUT|Mongo|mongodb|Mongoose/i.test(errorMessage)) {
    derivedType = 'DB_ERROR';
  }

  const type = derivedType;

  const message = override?.message || error?.message || 'Unhandled server error';
  const stack = typeof error?.stack === 'string' ? error.stack : undefined;
  const fingerprint = override?.fingerprint || buildFingerprint({
    type,
    route: url,
    message,
    stack,
  });

  const meta = {
    params: context?.params || null,
    ...(override?.meta || {}),
  };

  if (error?.meta && typeof error.meta === 'object') {
    meta.errorMeta = error.meta;
  }

  let user = override?.user;
  if (!user) {
    try {
      const { requireAuthApi } = await import('@/lib/auth/server');
      user = await requireAuthApi(request);
    } catch (authErr) {
      if (process.env.NODE_ENV === 'development' && authErr?.status && authErr.status >= 500) {
        console.warn('[ErrorLogger] Failed to resolve user from request:', authErr?.message);
      }
      user = null;
    }
  }

  if (user) {
    meta.user = {
      id: user.id || user._id || null,
      role: user.role || null,
      tenantId: user.tenantId || null,
      impersonating: user.impersonating || false,
    };
  }

  await writeErrorEvent({
    ts: new Date(),
    severity,
    source,
    type,
    message,
    stack,
    route: url,
    method,
    status,
    requestId,
    userId: user?.id || user?._id || null,
    tenantId: user?.tenantId || null,
    fingerprint,
    ip: getClientIp(request),
    userAgent: request.headers.get('user-agent') || null,
    meta: redactSensitive(meta),
  });
}

export function withErrorLogging(handler, options = {}) {
  return async (request, context) => {
    const requestId = request.headers.get('x-request-id') || randomUUID();

    try {
      const response = await handler(request, context, { requestId });

      if (response instanceof Response) {
        response.headers.set('x-request-id', requestId);
      }

      return response;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[withErrorLogging]', error);
      }

      await logServerError({
        request,
        error,
        context,
        requestId,
        override: options,
      });

      const status = options.status ?? error?.status ?? error?.statusCode ?? 500;
      const safeMessage =
        process.env.NODE_ENV === 'development'
          ? error?.message || 'Server error'
          : options.publicMessage || 'אירעה שגיאה בשרת';

      const response = NextResponse.json(
        {
          error: safeMessage,
          requestId,
        },
        { status },
      );

      response.headers.set('x-request-id', requestId);
      return response;
    }
  };
}

const errorLogger = {
  withErrorLogging,
  logServerError,
};

export default errorLogger;
