/**
 * Tenant Middleware - Multi-Tenant Support
 * זיהוי tenant לפי דומיין/subdomain והוספה לבקשה
 */

import { getDb } from '@/lib/db';

/**
 * Loopback hosts used for local `next dev` / `next start` (no real subdomain tenant).
 */
function isLoopbackHostHeader(host) {
  if (!host) return false;
  const hostname = host.toLowerCase().split(':')[0];
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '0.0.0.0'
  );
}

/**
 * מזהה את ה-tenant לפי הדומיין או subdomain
 * @param {string} host - הדומיין המלא (e.g., shop1.vipo.co.il)
 * @returns {Promise<Object|null>} - אובייקט tenant או null
 */
export async function getTenantByHost(host) {
  if (!host) return null;
  
  try {
    const db = await getDb();
    const hostname = host.toLowerCase().split(':')[0]; // Remove port if exists
    
    // Try to find by exact domain match first
    let tenant = await db.collection('tenants').findOne({
      domain: hostname,
      status: 'active',
    });
    
    if (tenant) return tenant;
    
    // Try subdomain match
    const baseDomain = process.env.BASE_DOMAIN || 'vipo.co.il';
    if (hostname.endsWith(`.${baseDomain}`)) {
      const subdomain = hostname.replace(`.${baseDomain}`, '');
      tenant = await db.collection('tenants').findOne({
        subdomain: subdomain,
        status: 'active',
      });
    }
    
    return tenant;
  } catch (error) {
    console.error('getTenantByHost error:', error);
    return null;
  }
}

/**
 * מזהה את ה-tenant לפי slug
 * @param {string} slug - מזהה ה-tenant
 * @returns {Promise<Object|null>}
 */
export async function getTenantBySlug(slug) {
  if (!slug) return null;
  
  try {
    const db = await getDb();
    return await db.collection('tenants').findOne({
      slug: slug.toLowerCase(),
      status: 'active',
    });
  } catch (error) {
    console.error('getTenantBySlug error:', error);
    return null;
  }
}

/**
 * מזהה את ה-tenant לפי ID
 * @param {string} tenantId - מזהה ה-tenant
 * @returns {Promise<Object|null>}
 */
export async function getTenantById(tenantId) {
  if (!tenantId) return null;
  
  try {
    const db = await getDb();
    const { ObjectId } = await import('mongodb');
    return await db.collection('tenants').findOne({
      _id: new ObjectId(tenantId),
      status: 'active',
    });
  } catch (error) {
    console.error('getTenantById error:', error);
    return null;
  }
}

/**
 * בודק אם המשתמש שייך ל-tenant מסוים
 * @param {Object} user - אובייקט המשתמש
 * @param {string} tenantId - מזהה ה-tenant
 * @returns {boolean}
 */
export function userBelongsToTenant(user, tenantId) {
  if (!user || !tenantId) return false;
  
  // Super admins can access all tenants
  if ((user.role === 'admin' || user.role === 'super_admin') && !user.tenantId) return true;
  
  // Check if user's tenantId matches
  return String(user.tenantId) === String(tenantId);
}

/**
 * מחזיר את ה-tenant הנוכחי מהבקשה
 * @param {Request} request - אובייקט הבקשה
 * @returns {Promise<Object|null>}
 */
export async function getCurrentTenant(request) {
  const host = request.headers.get('host');
  const allowTenantQueryParam =
    process.env.NODE_ENV !== 'production' || isLoopbackHostHeader(host);

  const tenantSlugHeader = request.headers.get('x-tenant-slug');
  if (tenantSlugHeader) {
    const tenant = await getTenantBySlug(tenantSlugHeader);
    if (tenant) return tenant;
  }

  const tenantDomainHeader = request.headers.get('x-tenant-domain');
  if (tenantDomainHeader) {
    const tenant = await getTenantByHost(tenantDomainHeader);
    if (tenant) return tenant;
  }

  // `?tenant=` — non-production, or loopback in production (local `npm start`)
  if (allowTenantQueryParam) {
    try {
      const url = new URL(request.url);
      const tenantSlug = url.searchParams.get('tenant');
      if (tenantSlug) {
        const byParam = await getTenantBySlug(tenantSlug);
        if (byParam) return byParam;
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  // Real domain / subdomain → resolve from Host
  const tenantFromHost = await getTenantByHost(host);
  if (tenantFromHost) return tenantFromHost;

  // Loopback only: default tenant for local runs (does not run on production domains)
  if (isLoopbackHostHeader(host)) {
    const slugFromEnv =
      process.env.VIPO_LOCAL_DEFAULT_TENANT_SLUG?.trim() ||
      process.env.LOCAL_DEFAULT_TENANT_SLUG?.trim();
    if (slugFromEnv) {
      const fromEnv = await getTenantBySlug(slugFromEnv);
      if (fromEnv) return fromEnv;
    }

    try {
      const db = await getDb();
      if (db) {
        const first = await db
          .collection('tenants')
          .findOne(
            { status: { $in: ['active', 'pending'] } },
            { sort: { updatedAt: -1 } },
          );
        if (first) return first;
      }
    } catch (error) {
      console.error('getCurrentTenant localhost fallback error:', error?.message || error);
    }
  }

  return null;
}

/**
 * מוסיף פילטר tenant לשאילתה
 * @param {Object} query - שאילתה קיימת
 * @param {string} tenantId - מזהה ה-tenant
 * @returns {Object} - שאילתה עם פילטר tenant
 */
export function addTenantFilter(query = {}, tenantId) {
  if (!tenantId) return query;
  
  const { ObjectId } = require('mongodb');
  return {
    ...query,
    tenantId: new ObjectId(tenantId),
  };
}

/**
 * מוסיף tenantId לנתונים חדשים
 * @param {Object} data - נתונים ליצירה
 * @param {string} tenantId - מזהה ה-tenant
 * @returns {Object} - נתונים עם tenantId
 */
export function addTenantToData(data = {}, tenantId) {
  if (!tenantId) return data;
  
  const { ObjectId } = require('mongodb');
  return {
    ...data,
    tenantId: new ObjectId(tenantId),
  };
}

/**
 * בודק אם המשתמש הוא Super Admin (גישה גלובלית לכל החנויות)
 * super_admin — תמיד גלובלי גם אם נשאר tenantId ישן בפרופיל
 * admin — גלובלי רק בלי tenantId (אחרת נחשב מנהל עסק דרך isBusinessAdmin)
 * @param {Object} user - אובייקט המשתמש
 * @returns {boolean}
 */
export function isSuperAdmin(user) {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  return user.role === 'admin' && !user.tenantId;
}

/**
 * בודק אם המשתמש הוא Business Admin (עם tenant)
 * @param {Object} user - אובייקט המשתמש
 * @returns {boolean}
 */
export function isBusinessAdmin(user) {
  return user?.role === 'business_admin' || (user?.role === 'admin' && !!user?.tenantId);
}

/**
 * מחזיר את tenantId מהמשתמש או מהבקשה
 * @param {Object} user - אובייקט המשתמש
 * @param {Request} request - אובייקט הבקשה
 * @returns {Promise<string|null>}
 */
export async function resolveTenantId(user, request) {
  // Super admin לא מוגבל ל-tenant ספציפי
  if (isSuperAdmin(user)) {
    // אם יש tenant בבקשה, השתמש בו
    const tenant = await getCurrentTenant(request);
    return tenant?._id ? String(tenant._id) : null;
  }
  
  // משתמש רגיל - השתמש ב-tenantId שלו
  if (user?.tenantId) {
    return String(user.tenantId);
  }

  return null;
}

/**
 * Wrapper לשאילתות עם סינון tenant אוטומטי
 * @param {Object} options
 * @param {Object} options.user - המשתמש המחובר
 * @param {Request} options.request - הבקשה
 * @param {Object} options.query - שאילתה בסיסית
 * @param {boolean} options.allowGlobal - האם לאפשר שאילתה גלובלית ל-Super Admin
 * @returns {Promise<Object>} - שאילתה עם פילטר tenant
 */
export async function withTenantQuery({ user, request, query = {}, allowGlobal = false }) {
  const tenantId = await resolveTenantId(user, request);
  
  // Super admin יכול לראות הכל אם allowGlobal = true
  if (isSuperAdmin(user) && allowGlobal) {
    return query;
  }
  
  // אחרת, סנן לפי tenant
  if (tenantId) {
    return addTenantFilter(query, tenantId);
  }
  
  return query;
}

/**
 * מוסיף tenantId לנתונים חדשים לפי המשתמש והבקשה
 * @param {Object} options
 * @param {Object} options.user - המשתמש המחובר
 * @param {Request} options.request - הבקשה
 * @param {Object} options.data - הנתונים ליצירה
 * @returns {Promise<Object>} - נתונים עם tenantId
 */
export async function withTenantData({ user, request, data = {} }) {
  const tenantId = await resolveTenantId(user, request);
  
  if (tenantId) {
    return addTenantToData(data, tenantId);
  }
  
  return data;
}

/**
 * בודק אם למשתמש יש הרשאה לגשת לנתונים של tenant מסוים
 * @param {Object} user - אובייקט המשתמש
 * @param {string} resourceTenantId - ה-tenantId של המשאב
 * @returns {boolean}
 */
export function canAccessTenant(user, resourceTenantId) {
  // Super admin יכול לגשת לכל tenant
  if (isSuperAdmin(user)) return true;
  
  // אם למשאב אין tenantId, כולם יכולים לגשת
  if (!resourceTenantId) return true;
  
  // בדוק שהמשתמש שייך ל-tenant
  return userBelongsToTenant(user, resourceTenantId);
}

/**
 * מחזיר הגדרות tenant או ברירת מחדל
 * @param {Object} tenant - אובייקט ה-tenant
 * @param {string} settingPath - נתיב ההגדרה (e.g., 'agentSettings.defaultCommissionPercent')
 * @param {*} defaultValue - ערך ברירת מחדל
 * @returns {*}
 */
export function getTenantSetting(tenant, settingPath, defaultValue) {
  if (!tenant) return defaultValue;
  
  const parts = settingPath.split('.');
  let value = tenant;
  
  for (const part of parts) {
    if (value === undefined || value === null) return defaultValue;
    value = value[part];
  }
  
  return value !== undefined && value !== null ? value : defaultValue;
}

const tenantMiddleware = {
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
};

export default tenantMiddleware;
