import { NextResponse } from 'next/server';

function sanitizeHeaderValue(value, fallback = '') {
  const text = String(value ?? fallback);
  return text.replace(/[\r\n]+/g, ' ').trim() || fallback;
}

export function buildAdminFallbackHeaders(payload) {
  return {
    'Cache-Control': 'no-store',
    'X-Vipo-Data-Mode': 'fallback',
    'X-Vipo-Fallback': '1',
    'X-Vipo-Fallback-Reason': sanitizeHeaderValue(payload?.reason, 'db_unavailable'),
    'X-Vipo-Fallback-Source': sanitizeHeaderValue(payload?.source, 'unknown'),
    'X-Vipo-Fallback-At': sanitizeHeaderValue(payload?.generatedAt, new Date().toISOString()),
  };
}

export function jsonAdminFallback(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: buildAdminFallbackHeaders(payload),
  });
}
