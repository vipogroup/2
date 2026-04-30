/**
 * Tenant Module - Multi-Tenant Support
 * ייצוא מרכזי לכל פונקציות ה-tenant
 */

export {
  default as tenantMiddleware,
  getTenantByHost,
  getTenantBySlug,
  getTenantById,
  userBelongsToTenant,
  getCurrentTenant,
  addTenantFilter,
  addTenantToData,
  isSuperAdmin,
  isBusinessAdmin,
  resolveTenantId,
  withTenantQuery,
  withTenantData,
  canAccessTenant,
  getTenantSetting,
} from './tenantMiddleware';
