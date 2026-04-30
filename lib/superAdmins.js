/**
 * Super Admin Configuration
 * Defines which users are super admins with full system access
 */

const SUPER_ADMIN_EMAILS = [
  'm0587009938@gmail.com',
  'M0587009938@gmail.com',
  '0587009938@gmail.com',
  'admin@vipo.local',
];

/**
 * Check if a user is a super admin based on email
 * @param {string} email - User email
 * @returns {boolean}
 */
export function isSuperAdmin(email) {
  if (!email) return false;
  const normalized = String(email).trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.some(
    (superEmail) => superEmail.toLowerCase() === normalized
  );
}

/**
 * Check if a user object is a super admin
 * Super admin = role is 'super_admin' OR email is in SUPER_ADMIN_EMAILS AND no tenantId
 * @param {Object} user - User object with email property
 * @returns {boolean}
 */
export function isSuperAdminUser(user) {
  if (!user) return false;
  
  // Check by role first (new way)
  if (user.role === 'super_admin') return true;
  
  // Check by email (legacy way) - only if no tenantId
  if (user.email && !user.tenantId && isSuperAdmin(user.email)) return true;
  
  // Admin without tenantId is also super admin (backwards compatibility)
  if (user.role === 'admin' && (!user.tenantId || (user.email && isSuperAdmin(user.email)))) return true;
  
  return false;
}

/**
 * Get list of super admin emails
 * @returns {string[]}
 */
export function getSuperAdminEmails() {
  return [...SUPER_ADMIN_EMAILS];
}

/**
 * Available admin permissions
 */
export const ADMIN_PERMISSIONS = {
  // User Management
  VIEW_USERS: 'view_users',
  EDIT_USERS: 'edit_users',
  DELETE_USERS: 'delete_users',
  CHANGE_USER_ROLES: 'change_user_roles',
  
  // Product Management
  VIEW_PRODUCTS: 'view_products',
  EDIT_PRODUCTS: 'edit_products',
  DELETE_PRODUCTS: 'delete_products',
  
  // Order Management
  VIEW_ORDERS: 'view_orders',
  EDIT_ORDERS: 'edit_orders',
  DELETE_ORDERS: 'delete_orders',
  
  // Reports & Analytics
  VIEW_REPORTS: 'view_reports',
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data',

  // Diagnostics & Infrastructure
  VIEW_PAYMENTS: 'view_payments',
  VIEW_SEO: 'view_seo',
  VIEW_SOCIAL: 'view_social',

  // Test & Sandbox Tools
  MANAGE_TEST_HARNESS: 'manage_test_harness',

  // Notifications
  MANAGE_NOTIFICATIONS: 'manage_notifications',
  SEND_NOTIFICATIONS: 'send_notifications',
  
  // Settings
  VIEW_SETTINGS: 'view_settings',
  EDIT_SETTINGS: 'edit_settings',
  
  // Agent Management
  VIEW_AGENTS: 'view_agents',
  MANAGE_AGENTS: 'manage_agents',
  VIEW_COMMISSIONS: 'view_commissions',
  EDIT_COMMISSIONS: 'edit_commissions',
};

/**
 * Default permissions for regular admins
 */
export const DEFAULT_ADMIN_PERMISSIONS = [
  ADMIN_PERMISSIONS.VIEW_USERS,
  ADMIN_PERMISSIONS.VIEW_PRODUCTS,
  ADMIN_PERMISSIONS.VIEW_ORDERS,
  ADMIN_PERMISSIONS.EDIT_ORDERS,
  ADMIN_PERMISSIONS.VIEW_REPORTS,
  ADMIN_PERMISSIONS.VIEW_AGENTS,
];

/**
 * Super admins have all permissions
 */
export function getSuperAdminPermissions() {
  return Object.values(ADMIN_PERMISSIONS);
}

/**
 * Check if a user is a business admin (admin with tenantId)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isBusinessAdminUser(user) {
  if (!user) return false;
  return (user.role === 'business_admin' || user.role === 'admin') && !!user.tenantId;
}

/**
 * Check if a user has a specific permission
 * @param {Object} user - User object
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user) return false;
  
  // Super admins have all permissions
  if (isSuperAdminUser(user)) return true;
  
  // Business admins and regular admins check their permissions array
  if (!['admin', 'business_admin', 'super_admin'].includes(user.role)) return false;
  
  // If permissions is explicitly set (even empty array), use it
  // Only use default if permissions is undefined/null
  const userPermissions = Array.isArray(user.permissions) ? user.permissions : DEFAULT_ADMIN_PERMISSIONS;
  return userPermissions.includes(permission);
}

/**
 * Get user's permissions
 * @param {Object} user - User object
 * @returns {string[]}
 */
export function getUserPermissions(user) {
  if (!user) return [];
  
  // Super admins have all permissions
  if (isSuperAdminUser(user)) {
    return getSuperAdminPermissions();
  }
  
  // Regular admins have their assigned permissions
  // If permissions is explicitly set (even empty array), use it
  // Only use default if permissions is undefined/null
  if (user.role === 'admin') {
    return Array.isArray(user.permissions) ? user.permissions : DEFAULT_ADMIN_PERMISSIONS;
  }
  
  return [];
}
