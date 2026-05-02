import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { verify as verifyJwt } from '@/lib/auth/createToken';

/**
 * Get user from cookies (Server Component only)
 * @returns {Object|null} - User object with { sub, role } or null
 */
export async function getUserFromCookies() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) return null;

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return {
      id: payload.sub,
      role: payload.role,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Check if user is admin
 * @returns {boolean}
 */
export async function isAdmin() {
  const user = await getUserFromCookies();
  return user?.role === 'admin';
}

/**
 * Require admin or super_admin role or redirect (Server Components)
 */
export async function requireAdmin() {
  const user = await getUserFromCookies();

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  return user;
}

function adminApiError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function getTokenFromRequest(req) {
  try {
    const c = req?.cookies?.get?.('token');
    if (c?.value) return c.value;
  } catch (_) {}
  try {
    const raw = req?.headers?.get?.('cookie') || '';
    const m = raw.match(/(?:^|;\s*)token=([^;]+)/i);
    if (m) return decodeURIComponent(m[1]);
  } catch (_) {}
  try {
    return cookies().get('token')?.value || null;
  } catch (_) {
    return null;
  }
}

/**
 * API route guard: admin, super_admin, or business_admin.
 * Loads user from DB (email, tenantId) for isSuperAdminUser and tenant checks.
 * @throws {Error & { status: number }} on 401/403
 */
export async function requireAdminApi(req) {
  const token = getTokenFromRequest(req);
  const payload = verifyJwt(token);
  if (!payload) {
    throw adminApiError(401, 'Unauthorized');
  }

  const userId = payload.sub || payload.userId || payload.id;
  if (!userId) {
    throw adminApiError(401, 'Unauthorized');
  }

  let oid;
  try {
    oid = new ObjectId(String(userId));
  } catch (_) {
    throw adminApiError(401, 'Unauthorized');
  }

  const db = await getDb();
  const user = await db.collection('users').findOne(
    { _id: oid },
    { projection: { email: 1, role: 1, tenantId: 1, isActive: 1 } },
  );

  if (!user || user.isActive === false) {
    throw adminApiError(401, 'Unauthorized');
  }

  const role = user.role || payload.role || 'customer';
  const allowed = ['admin', 'super_admin', 'business_admin'];
  if (!allowed.includes(role)) {
    throw adminApiError(403, 'Forbidden');
  }

  return {
    id: String(user._id),
    _id: user._id,
    role,
    email: user.email || '',
    tenantId: user.tenantId != null ? String(user.tenantId) : null,
  };
}
