/**
 * Business Admin Menu Configuration
 * הגדרת תפריטים ואופציות עבור דשבורד Business Admin
 * משמש לסינון תפריטים לפי הרשאות Tenant
 */

/**
 * כל התפריטים האפשריים לדשבורד Business Admin
 */
export const BUSINESS_MENU_ITEMS = {
  // === ניהול משתמשים ===
  users: {
    id: 'users',
    label: 'ניהול משתמשים',
    href: '/business/users',
    category: 'users',
    icon: 'users',
  },
  agents: {
    id: 'agents',
    label: 'ניהול סוכנים',
    href: '/business/agents',
    category: 'users',
    icon: 'agent',
  },

  // === קטלוג ומכירות ===
  products: {
    id: 'products',
    label: 'ניהול מוצרים',
    href: '/business/products',
    category: 'catalog',
    icon: 'cube',
  },
  products_new: {
    id: 'products_new',
    label: 'הוספת מוצר',
    href: '/business/products/new',
    category: 'catalog',
    icon: 'plus',
  },
  orders: {
    id: 'orders',
    label: 'ניהול הזמנות',
    href: '/business/orders',
    category: 'catalog',
    icon: 'cart',
  },

  // === כספים ודוחות ===
  reports: {
    id: 'reports',
    label: 'דוחות',
    href: '/business/reports',
    category: 'finance',
    icon: 'chart',
  },
  commissions: {
    id: 'commissions',
    label: 'עמלות',
    href: '/business/commissions',
    category: 'finance',
    icon: 'coins',
  },
  withdrawals: {
    id: 'withdrawals',
    label: 'בקשות משיכה',
    href: '/business/withdrawals',
    category: 'finance',
    icon: 'coins',
  },
  transactions: {
    id: 'transactions',
    label: 'עסקאות',
    href: '/business/transactions',
    category: 'finance',
    icon: 'transaction',
  },
  analytics: {
    id: 'analytics',
    label: 'אנליטיקס',
    href: '/business/analytics',
    category: 'finance',
    icon: 'analytics',
  },

  sales_status: {
    id: 'sales_status',
    label: 'מצב מכירות',
    href: '/business/sales-status',
    category: 'finance',
    icon: 'chart',
  },

  // === הגדרות ושיווק ===
  settings: {
    id: 'settings',
    label: 'הגדרות חנות',
    href: '/business/settings',
    category: 'settings',
    icon: 'settings',
  },
  marketing: {
    id: 'marketing',
    label: 'שיווק',
    href: '/business/marketing',
    category: 'settings',
    icon: 'spark',
  },
  notifications: {
    id: 'notifications',
    label: 'התראות',
    href: '/business/notifications',
    category: 'settings',
    icon: 'bell',
  },
  integrations: {
    id: 'integrations',
    label: 'אינטגרציות',
    href: '/business/integrations',
    category: 'settings',
    icon: 'link',
  },
  crm: {
    id: 'crm',
    label: 'CRM',
    href: '/business/crm',
    category: 'settings',
    icon: 'crm',
  },
  bot_manager: {
    id: 'bot_manager',
    label: 'ניהול בוט צאט',
    href: '/business/bot-manager',
    category: 'settings',
    icon: 'robot',
  },
  site_texts: {
    id: 'site_texts',
    label: 'ניהול טקסטים',
    href: '/business/site-texts',
    category: 'settings',
    icon: 'edit',
  },
  branding: {
    id: 'branding',
    label: 'מיתוג וצבעים',
    href: '/business/branding',
    category: 'settings',
    icon: 'palette',
  },

  // === ווידג'טים ===
  new_users_widget: {
    id: 'new_users_widget',
    label: 'ווידג\'ט משתמשים חדשים',
    category: 'widgets',
    isWidget: true,
  },
  recent_orders_widget: {
    id: 'recent_orders_widget',
    label: 'ווידג\'ט הזמנות אחרונות',
    category: 'widgets',
    isWidget: true,
  },
};

/**
 * קטגוריות תפריטים
 */
export const BUSINESS_MENU_CATEGORIES = {
  users: {
    id: 'users',
    label: 'ניהול משתמשים',
    icon: 'users',
    items: ['users', 'agents'],
  },
  catalog: {
    id: 'catalog',
    label: 'קטלוג ומכירות',
    icon: 'cube',
    items: ['products', 'products_new', 'orders'],
  },
  finance: {
    id: 'finance',
    label: 'כספים ודוחות',
    icon: 'coins',
    items: ['reports', 'commissions', 'withdrawals', 'transactions', 'analytics', 'sales_status'],
  },
  settings: {
    id: 'settings',
    label: 'הגדרות ושיווק',
    icon: 'settings',
    items: ['settings', 'marketing', 'notifications', 'integrations', 'crm', 'bot_manager', 'site_texts', 'branding'],
  },
  widgets: {
    id: 'widgets',
    label: 'ווידג\'טים',
    icon: 'dashboard',
    items: ['new_users_widget', 'recent_orders_widget'],
  },
};

/**
 * כל התפריטים האפשריים (לשימוש במודאל ההרשאות)
 */
export const ALL_MENU_ITEMS = Object.keys(BUSINESS_MENU_ITEMS);

/**
 * ברירת מחדל - אין הרשאות (מערך ריק)
 * Super Admin צריך להפעיל ידנית את התפריטים לכל עסק
 */
export const DEFAULT_ALLOWED_MENUS = [];

/**
 * בדיקה האם תפריט מורשה
 * @param {string} menuId - מזהה התפריט
 * @param {string[]} allowedMenus - רשימת תפריטים מורשים
 * @returns {boolean}
 */
export function isMenuAllowed(menuId, allowedMenus, allowedMenusConfigured) {
  const enforce = allowedMenusConfigured !== false;
  if (!enforce) return true;

  const list = Array.isArray(allowedMenus) ? allowedMenus : [];
  if (list.length === 0) return false;
  return list.includes(menuId);
}

/**
 * סינון תפריטים לפי הרשאות
 * @param {string[]} allowedMenus - רשימת תפריטים מורשים
 * @returns {Object} תפריטים מסוננים
 */
export function getFilteredMenuItems(allowedMenus, allowedMenusConfigured) {
  const enforce = allowedMenusConfigured !== false;
  if (!enforce) return { ...BUSINESS_MENU_ITEMS };

  const list = Array.isArray(allowedMenus) ? allowedMenus : [];
  if (list.length === 0) return {};
  
  const filtered = {};
  for (const [key, item] of Object.entries(BUSINESS_MENU_ITEMS)) {
    if (list.includes(key)) {
      filtered[key] = item;
    }
  }
  return filtered;
}

/**
 * קבלת קטגוריות מסוננות לפי הרשאות
 * @param {string[]} allowedMenus - רשימת תפריטים מורשים
 * @returns {Object} קטגוריות מסוננות
 */
export function getFilteredCategories(allowedMenus, allowedMenusConfigured) {
  const enforce = allowedMenusConfigured !== false;
  if (!enforce) return { ...BUSINESS_MENU_CATEGORIES };

  const list = Array.isArray(allowedMenus) ? allowedMenus : [];
  if (list.length === 0) return {};
  
  const filtered = {};
  for (const [key, category] of Object.entries(BUSINESS_MENU_CATEGORIES)) {
    const filteredItems = category.items.filter(item => list.includes(item));
    if (filteredItems.length > 0) {
      filtered[key] = {
        ...category,
        items: filteredItems,
      };
    }
  }
  return filtered;
}

/**
 * בדיקה האם נתיב מורשה
 * @param {string} pathname - נתיב הדף
 * @param {string[]} allowedMenus - רשימת תפריטים מורשים
 * @returns {boolean}
 */
export function isPathAllowed(pathname, allowedMenus, allowedMenusConfigured) {
  // דף הבית של /business תמיד מורשה
  if (pathname === '/business' || pathname === '/business/') {
    return true;
  }

  const enforce = allowedMenusConfigured !== false;
  if (!enforce) return true;

  const list = Array.isArray(allowedMenus) ? allowedMenus : [];
  if (list.length === 0) return false;
  
  // בדוק כל תפריט
  for (const [menuId, item] of Object.entries(BUSINESS_MENU_ITEMS)) {
    if (item.href && pathname.startsWith(item.href)) {
      return list.includes(menuId);
    }
  }
  
  // ברירת מחדל - מותר
  return true;
}
