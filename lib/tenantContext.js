/**
 * Tenant Context Utilities
 * פונקציות עזר לזיהוי tenant מתוך המשתמש
 */

import mongoose from 'mongoose';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';

/**
 * מחזיר את ה-tenantId מתוך אובייקט המשתמש
 * @param {Object} user - אובייקט המשתמש
 * @returns {ObjectId} - מזהה ה-tenant
 */
export function getTenantId(user) {
  if (!user) return null;

  // אם זה super_admin ללא tenant ספציפי, נחזיר null
  if (isSuperAdmin(user)) {
    return null;
  }

  // אם למשתמש יש tenantId ישיר
  if (user.tenantId) {
    // המרה ל-ObjectId אם צריך
    if (typeof user.tenantId === 'string') {
      try {
        return new mongoose.Types.ObjectId(user.tenantId);
      } catch {
        return null;
      }
    }
    return user.tenantId;
  }

  return null;
}

/**
 * בודק אם המשתמש שייך ל-tenant מסוים
 * @param {Object} user - אובייקט המשתמש
 * @param {ObjectId|string} tenantId - מזהה ה-tenant לבדיקה
 * @returns {boolean}
 */
export function belongsToTenant(user, tenantId) {
  if (!user || !tenantId) return false;
  
  // Super admin יכול לגשת לכל tenant
  if (isSuperAdmin(user)) return true;
  
  const userTenantId = user.tenantId?.toString();
  const checkTenantId = tenantId.toString();
  
  return userTenantId === checkTenantId;
}

/**
 * מוסיף סינון tenant לשאילתה
 * @param {Object} query - שאילתת MongoDB
 * @param {Object} user - אובייקט המשתמש
 * @returns {Object} - שאילתה עם סינון tenant
 */
export function withTenantFilter(query, user) {
  if (isSuperAdmin(user)) return query;

  const tenantId = getTenantId(user);
  if (tenantId) {
    return { ...query, tenantId };
  }

  return { ...query, _id: null };
}

/**
 * מחזיר פילטר tenant מהמשתמש
 * @param {Object} user - אובייקט המשתמש
 * @returns {Object} - פילטר tenant
 */
export function getTenantFilter(user) {
  if (isSuperAdmin(user)) return {};

  const tenantId = getTenantId(user);
  if (tenantId) {
    return { tenantId };
  }

  return { _id: null };
}
