/**
 * Admin Navigation Configuration with Permissions
 * Maps navigation items to required permissions
 */

import { ADMIN_PERMISSIONS } from './superAdmins';

/**
 * Permission for super admin only items
 */
export const SUPER_ADMIN_ONLY = '__SUPER_ADMIN_ONLY__';

export const ADMIN_NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'לוח בקרה',
    href: '/admin',
    icon: 'dashboard',
    permission: null, // Always visible to admins
  },
  {
    id: 'users',
    label: 'משתמשים',
    href: '/admin/users',
    icon: 'users',
    permission: ADMIN_PERMISSIONS.VIEW_USERS,
  },
  {
    id: 'products',
    label: 'מוצרים',
    href: '/admin/products',
    icon: 'products',
    permission: ADMIN_PERMISSIONS.VIEW_PRODUCTS,
  },
  {
    id: 'orders',
    label: 'הזמנות',
    href: '/admin/orders',
    icon: 'orders',
    permission: ADMIN_PERMISSIONS.VIEW_ORDERS,
  },
  {
    id: 'agents',
    label: 'סוכנים',
    href: '/admin/agents',
    icon: 'agents',
    permission: ADMIN_PERMISSIONS.VIEW_AGENTS,
  },
  {
    id: 'crm',
    label: 'CRM',
    href: '/admin/crm',
    icon: 'crm',
    permission: ADMIN_PERMISSIONS.VIEW_USERS,
    children: [
      { id: 'crm-dashboard', label: 'לוח בקרה', href: '/admin/crm' },
      { id: 'crm-leads', label: 'לידים', href: '/admin/crm/leads' },
      { id: 'crm-inbox', label: 'תיבת דואר', href: '/admin/crm/inbox' },
      { id: 'crm-tasks', label: 'משימות', href: '/admin/crm/tasks' },
    ],
  },
  {
    id: 'reports',
    label: 'דוחות',
    href: '/admin/reports',
    icon: 'reports',
    permission: ADMIN_PERMISSIONS.VIEW_REPORTS,
  },
  {
    id: 'notifications',
    label: 'התראות',
    href: '/admin/notifications',
    icon: 'notifications',
    permission: ADMIN_PERMISSIONS.MANAGE_NOTIFICATIONS,
  },
  {
    id: 'transactions',
    label: 'עסקאות',
    href: '/admin/transactions',
    icon: 'transactions',
    permission: ADMIN_PERMISSIONS.VIEW_REPORTS,
  },
  {
    id: 'finance',
    label: 'כספים ודוחות',
    href: '/admin/finance',
    icon: 'finance',
    permission: ADMIN_PERMISSIONS.VIEW_REPORTS,
  },
  {
    id: 'commissions',
    label: 'עמלות סוכנים',
    href: '/admin/commissions',
    icon: 'commissions',
    permission: ADMIN_PERMISSIONS.VIEW_COMMISSIONS,
  },
  {
    id: 'marketing',
    label: 'ספריית שיווק',
    href: '/admin/marketing-assets',
    icon: 'marketing',
    permission: ADMIN_PERMISSIONS.VIEW_REPORTS,
  },
  {
    id: 'integrations',
    label: 'אינטגרציות',
    href: '/admin/integrations',
    icon: 'integrations',
    permission: ADMIN_PERMISSIONS.VIEW_SETTINGS,
  },
  {
    id: 'site-texts',
    label: 'ניהול טקסטים',
    href: '/admin/site-texts',
    icon: 'text',
    permission: ADMIN_PERMISSIONS.VIEW_SETTINGS,
    children: [
      { id: 'site-texts-home', label: 'עמוד ראשי (Home Page)', href: '/admin/site-texts/homepage' },
    ],
  },
  {
    id: 'settings',
    label: 'הגדרות מערכת',
    href: '/admin/settings',
    icon: 'settings',
    permission: ADMIN_PERMISSIONS.VIEW_SETTINGS,
  },
  {
    id: 'system-reports',
    label: 'דוחות מערכת',
    href: '/admin/system-reports',
    icon: 'system-reports',
    permission: ADMIN_PERMISSIONS.VIEW_SETTINGS,
  },
  {
    id: 'bot-manager',
    label: 'ניהול בוט צאט',
    href: '/admin/bot-manager',
    icon: 'robot',
    permission: ADMIN_PERMISSIONS.VIEW_SETTINGS,
  },
  // === Super Admin Only ===
  {
    id: 'notification-logs',
    label: 'יומן התראות',
    href: '/admin/notification-logs',
    icon: 'log',
    permission: SUPER_ADMIN_ONLY,
    superAdminOnly: true,
  },
  {
    id: 'tenants',
    label: 'ניהול עסקים',
    href: '/admin/tenants',
    icon: 'building',
    permission: SUPER_ADMIN_ONLY,
    superAdminOnly: true,
  },
  {
    id: 'simulator',
    label: 'סימולטור מערכת',
    href: '/admin/simulator',
    icon: 'simulator',
    permission: SUPER_ADMIN_ONLY,
    superAdminOnly: true,
  },
];

/**
 * Dashboard widgets configuration with permissions
 */
export const DASHBOARD_WIDGETS = [
  {
    id: 'users_stats',
    title: 'משתמשים',
    permission: ADMIN_PERMISSIONS.VIEW_USERS,
  },
  {
    id: 'products_stats',
    title: 'מוצרים',
    permission: ADMIN_PERMISSIONS.VIEW_PRODUCTS,
  },
  {
    id: 'orders_stats',
    title: 'הזמנות',
    permission: ADMIN_PERMISSIONS.VIEW_ORDERS,
  },
  {
    id: 'revenue_stats',
    title: 'הכנסות',
    permission: ADMIN_PERMISSIONS.VIEW_REPORTS,
  },
  {
    id: 'agents_stats',
    title: 'סוכנים',
    permission: ADMIN_PERMISSIONS.VIEW_AGENTS,
  },
  {
    id: 'commissions_stats',
    title: 'עמלות',
    permission: ADMIN_PERMISSIONS.VIEW_COMMISSIONS,
  },
];

/**
 * Filter navigation items based on user permissions
 * @param {Object} user - User object with email and permissions
 * @param {Function} hasPermissionFn - Function to check if user has permission
 * @returns {Array} Filtered navigation items
 */
export function getFilteredNavItems(user, hasPermissionFn, isSuperAdminFn) {
  if (!user) return [];
  
  // Check if user is any type of admin
  const isAdmin = ['admin', 'business_admin', 'super_admin'].includes(user.role);
  if (!isAdmin) return [];

  return ADMIN_NAV_ITEMS.filter((item) => {
    // Super admin only items
    if (item.superAdminOnly || item.permission === SUPER_ADMIN_ONLY) {
      return isSuperAdminFn ? isSuperAdminFn(user) : false;
    }
    
    // Items without permission requirement are always visible
    if (!item.permission) return true;
    
    // Check if user has the required permission
    return hasPermissionFn(item.permission);
  });
}

/**
 * Filter dashboard widgets based on user permissions
 * @param {Object} user - User object with email and permissions
 * @param {Function} hasPermissionFn - Function to check if user has permission
 * @returns {Array} Filtered dashboard widgets
 */
export function getFilteredDashboardWidgets(user, hasPermissionFn) {
  if (!user || user.role !== 'admin') return [];

  return DASHBOARD_WIDGETS.filter((widget) => {
    // Widgets without permission requirement are always visible
    if (!widget.permission) return true;
    
    // Check if user has the required permission
    return hasPermissionFn(widget.permission);
  });
}
