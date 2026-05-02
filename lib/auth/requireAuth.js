import { cookies as nextCookies } from 'next/headers';
import { verify as verifyJwt } from '@/lib/auth/createToken';

/**
 * Verifies JWT from cookie `token` and returns minimal user context.
 * Falls back gracefully between Next headers and Request cookies.
 * Returns null if unauthenticated.
 */
export async function requireAuth(req) {
  let token = null;

  // Try Route Handler request cookies API
  try {
    token = req?.cookies?.get?.('token')?.value || null;
  } catch {}

  // Fallback: next/headers cookies
  if (!token) {
    try {
      token = nextCookies().get('token')?.value || null;
    } catch {}
  }

  // Fallback: raw Cookie header
  if (!token && req?.headers?.get) {
    const raw = req.headers.get('cookie') || '';
    const m = raw.match(/(?:^|;\s*)token=([^;]+)/i);
    if (m) token = decodeURIComponent(m[1]);
  }

  const payload = verifyJwt(token);
  if (!payload) return null;

  const userId = payload.userId || payload.id || payload._id || payload.sub || null;
  const role = payload.role || null;
  if (!userId || !role) return null;

  return { _id: userId, role };
}
