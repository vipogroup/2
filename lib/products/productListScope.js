import { isSuperAdminUser } from '@/lib/superAdmins';

/**
 * @param {object|null} user
 * @param {string} requestedTenantId
 */
export function assertTenantAccessOrThrow(user, requestedTenantId) {
  if (!user) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  if (!requestedTenantId) {
    const err = new Error('Bad Request');
    err.status = 400;
    throw err;
  }
  if (isSuperAdminUser(user)) return;
  if (user.tenantId && requestedTenantId === user.tenantId) return;
  if (user.role === 'business_admin') {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  if (user.role === 'admin') {
    if (!user.tenantId || requestedTenantId !== user.tenantId) {
      const err = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
    return;
  }
  const err = new Error('Forbidden');
  err.status = 403;
  throw err;
}
