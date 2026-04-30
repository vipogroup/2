'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { hasPermission, ADMIN_PERMISSIONS, isSuperAdminUser } from '@/lib/superAdmins';
import { fetchAuthUser } from '@/lib/clientAuthCache';
import { fetchUnreadAdminAlerts } from '@/lib/adminAlertsCache';

const ADMIN_AUTH_CACHE_TTL_MS = 15 * 1000;
const ADMIN_ALERTS_CACHE_TTL_MS = 20 * 1000;

// ─── Icons (compact) ──────────────────────────────────────────
function DashboardIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="9" width="8" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function UsersIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M4 19.5v-.75A5.75 5.75 0 019.75 13h4.5A5.75 5.75 0 0120 18.75v.75" />
      <circle cx="12" cy="9" r="3.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CoinStackIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="6.5" rx="7" ry="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M5 6.5v7c0 1.93 3.134 3.5 7 3.5s7-1.57 7-3.5v-7" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M5 10.5c0 1.93 3.134 3.5 7 3.5s7-1.57 7-3.5" />
    </svg>
  );
}

function CubeIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 7.5L12 2.25 3 7.5m18 0L12 12.75m9-5.25v9l-9 5.25m0-9L3 7.5m9 5.25v9l-9-5.25v-9" />
    </svg>
  );
}

function SettingsIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function TagIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 7h.01M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4z"
      />
    </svg>
  );
}

function ShieldIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 4l7 2.8v5.7c0 4-2.9 7.8-7 8.5-4.1-.7-7-4.5-7-8.5V6.8L12 4z" />
    </svg>
  );
}

function ChartBarIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M4 20h16" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M8 20v-8" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M12 20v-12" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M16 20v-5" />
    </svg>
  );
}

function ImageIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M4 16l4-4 4 4 4-6 4 6" />
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="9" r="1.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function AdminMobileNav({ zoom = 1, onZoomChange } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  const applyZoomDelta = useCallback((delta) => {
    if (typeof onZoomChange !== 'function') return;
    const base = Number.isFinite(Number(zoom)) ? Number(zoom) : 1;
    const next = Math.round(Math.max(0.5, Math.min(1.3, base + delta)) * 100) / 100;
    onZoomChange(next);
  }, [onZoomChange, zoom]);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const userData = await fetchAuthUser({ ttlMs: ADMIN_AUTH_CACHE_TTL_MS });
        if (!ignore) {
          setUser(userData || null);
        }
      } catch (_) {}
    })();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setAlertCount(0);
      return;
    }

    let ignore = false;

    const fetchAlerts = async () => {
      try {
        const unreadCount = await fetchUnreadAdminAlerts({ ttlMs: ADMIN_ALERTS_CACHE_TTL_MS });
        if (!ignore) {
          setAlertCount(unreadCount);
        }
      } catch (_) {}
    };

    fetchAlerts();

    return () => {
      ignore = true;
    };
  }, [user]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const canAccess = (permission) => hasPermission(user, permission);
  const isSuperAdmin = isSuperAdminUser(user);

  const isActive = (href) => pathname === href;
  const isActivePrefix = (prefix) => pathname?.startsWith(prefix);

  // ── Bottom Tab Items (5 main) ──
  const bottomTabs = [
    { href: '/admin', label: 'דשבורד', Icon: DashboardIcon, exact: true },
    { href: '/admin/management', label: 'ניהול', Icon: UsersIcon },
    { href: '/admin/catalog', label: 'קטלוג', Icon: CubeIcon },
    { href: '/admin/finance', label: 'כספים', Icon: CoinStackIcon },
    { href: '/admin/settings-hub', label: 'הגדרות', Icon: SettingsIcon },
  ];

  // ── Full Drawer Items ──
  const drawerSections = [
    {
      title: 'ראשי',
      items: [
        { href: '/admin', label: 'דשבורד', Icon: DashboardIcon, exact: true },
        { href: '/admin/monitor', label: 'מוניטור', badge: alertCount > 0 ? alertCount : null, Icon: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
      ],
    },
    {
      title: 'ניהול',
      items: [
        canAccess(ADMIN_PERMISSIONS.VIEW_USERS) && { href: '/admin/management', label: 'ניהול משתמשים', Icon: UsersIcon },
        isSuperAdmin && { href: '/admin/notification-logs', label: 'יומן התראות', Icon: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
        isSuperAdmin && { href: '/admin/simulator', label: 'סימולטור', Icon: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
      ].filter(Boolean),
    },
    {
      title: 'קטלוג ומכירות',
      items: [
        canAccess(ADMIN_PERMISSIONS.VIEW_PRODUCTS) && { href: '/admin/catalog', label: 'קטלוג ומכירות', Icon: CubeIcon },
        canAccess(ADMIN_PERMISSIONS.VIEW_PRODUCTS) && { href: '/admin/products', label: 'מוצרים', Icon: CubeIcon },
        isSuperAdmin && { href: '/admin/products/categories', label: 'קטגוריות', Icon: TagIcon },
      ].filter(Boolean),
    },
    {
      title: 'כספים ודוחות',
      items: [
        canAccess(ADMIN_PERMISSIONS.VIEW_REPORTS) && { href: '/admin/finance', label: 'כספים ודוחות', Icon: CoinStackIcon },
        canAccess(ADMIN_PERMISSIONS.VIEW_USERS) && { href: '/admin/crm/dashboard', label: 'CRM', Icon: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
      ].filter(Boolean),
    },
    {
      title: 'הגדרות',
      items: [
        canAccess(ADMIN_PERMISSIONS.VIEW_SETTINGS) && { href: '/admin/settings-hub', label: 'מרכז הגדרות', Icon: SettingsIcon },
        isSuperAdmin && { href: '/admin/tenants', label: 'ניהול חנויות', Icon: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
        isSuperAdmin && { href: '/admin/catalog-manager/standalone', label: 'Catalog Manager', Icon: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> },
      ].filter(Boolean),
    },
    {
      title: 'מערכת',
      show: isSuperAdmin,
      items: [
        { href: '/admin/control-center', label: 'מרכז בקרה', Icon: ChartBarIcon },
        { href: '/admin/media-usage', label: 'שימוש מדיה', Icon: ImageIcon },
        { href: '/api/studio/auth/sso/start?redirect=1', label: 'סטודיו תמונות', Icon: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 7.5h1.5l1.5-2.25h10.5l1.5 2.25h1.5A1.5 1.5 0 0121.75 9v9.75A1.5 1.5 0 0120.25 20.25H3.75A1.5 1.5 0 012.25 18.75V9A1.5 1.5 0 013.75 7.5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 17.25a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" /></svg> },
        { href: '/admin/tasks', label: 'משימות ותיקונים', Icon: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
        { href: '/admin/control-center?tab=security', label: 'אבטחה', Icon: ShieldIcon },
      ],
    },
  ];

  // Check if tab is active
  const isTabActive = (tab) => {
    if (tab.exact) return pathname === tab.href;
    return pathname?.startsWith(tab.href);
  };

  return (
    <>
      {/* ══════════ TOP BAR ══════════ */}
      <div
        className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-3 py-2"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0f2557 100%)',
          boxShadow: '0 2px 8px rgba(30, 58, 138, 0.3)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-sm" style={{ background: 'rgba(255,255,255,0.12)' }}>V</div>
          <span className="text-base font-extrabold text-white tracking-tight">VIPO</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <button
              type="button"
              onClick={() => applyZoomDelta(-0.05)}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/[0.08] transition-all"
              title="הקטן"
              style={{ color: 'rgba(255,255,255,0.9)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
            </button>

            <button
              type="button"
              onClick={() => typeof onZoomChange === 'function' && onZoomChange(1)}
              className="text-[11px] font-extrabold px-2 py-1 rounded hover:bg-white/[0.08] transition-all"
              title="איפוס זום"
              style={{ color: 'rgba(255,255,255,0.95)' }}
            >
              {Math.round((Number.isFinite(Number(zoom)) ? Number(zoom) : 1) * 100)}%
            </button>

            <button
              type="button"
              onClick={() => applyZoomDelta(0.05)}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/[0.08] transition-all"
              title="הגדל"
              style={{ color: 'rgba(255,255,255,0.9)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.1)' }}
            aria-label="פתח תפריט"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ══════════ DRAWER OVERLAY ══════════ */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[100]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer panel - slides from right */}
          <div
            className="absolute top-0 right-0 bottom-0 w-[280px] flex flex-col overflow-y-auto"
            style={{
              background: 'linear-gradient(180deg, #1e3a8a 0%, #0f2557 100%)',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
              animation: 'slideInRight 0.25s ease-out',
            }}
          >
            {/* Drawer Header */}
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white font-black text-base" style={{ background: 'rgba(255,255,255,0.12)' }}>V</div>
                <span className="text-xl font-extrabold text-white tracking-tight">VIPO</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: 'rgba(255,255,255,0.08)' }}
                aria-label="סגור תפריט"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Nav */}
            <div className="flex-1 py-2 px-2 overflow-y-auto">
              {drawerSections.map((section) => {
                if (section.show === false) return null;
                if (section.items.length === 0) return null;
                return (
                  <div key={section.title}>
                    <div className="px-2.5 pt-4 pb-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {section.title}
                      </span>
                    </div>
                    {section.items.map((item) => {
                      const active = item.exact ? isActive(item.href) : isActivePrefix(item.href);
                      const cls = "flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-sm font-medium transition-all";
                      const sty = {
                        color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                        background: active ? 'rgba(255,255,255,0.13)' : 'transparent',
                      };
                      const inner = (
                        <>
                          <item.Icon className="w-5 h-5" />
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="mr-auto text-[10px] font-bold px-1.5 py-0.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      );
                      const isApiHref = typeof item.href === 'string' && item.href.startsWith('/api/');
                      return item.external ? (
                        <a key={item.href + item.label} href={item.href} target="_blank" rel="noopener noreferrer" className={cls} style={sty}>
                          {inner}
                        </a>
                      ) : isApiHref ? (
                        <a key={item.href + item.label} href={item.href} className={cls} style={sty}>
                          {inner}
                        </a>
                      ) : (
                        <Link key={item.href + item.label} href={item.href} className={cls} style={sty}>
                          {inner}
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="px-3 pb-3 flex flex-col gap-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
              {user && (
                <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] mb-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: 'rgba(255,255,255,0.12)' }}>
                    {user.fullName?.[0] || 'M'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{user.fullName || 'מנהל'}</div>
                    <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{user.email}</div>
                  </div>
                </div>
              )}
              <Link href="/" className="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-all hover:bg-white/[0.07]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>
                לאתר הראשי
              </Link>
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                  } catch (_) {}
                  router.push('/login');
                  router.refresh();
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-all hover:bg-red-500/20 text-right"
                style={{ color: '#fca5a5' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                התנתקות
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ BOTTOM TAB BAR ══════════ */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around safe-bottom"
        style={{
          background: 'linear-gradient(180deg, #1e3a8a 0%, #0f2557 100%)',
          boxShadow: '0 -2px 12px rgba(30, 58, 138, 0.3)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {bottomTabs.map((tab) => {
          const active = isTabActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center py-2 px-1 flex-1 min-w-0 transition-all relative"
              style={{ color: active ? '#fff' : 'rgba(255,255,255,0.45)' }}
            >
              {/* Active indicator */}
              {active && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full"
                  style={{ background: 'linear-gradient(90deg, #0891b2, #06b6d4)' }}
                />
              )}
              <tab.Icon className={`w-5 h-5 ${active ? '' : 'opacity-70'}`} />
              <span className={`text-[10px] mt-0.5 font-medium ${active ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* More button - opens drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center py-2 px-1 flex-1 min-w-0 transition-all"
          style={{ color: drawerOpen ? '#fff' : 'rgba(255,255,255,0.45)' }}
        >
          <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-[10px] mt-0.5 font-medium">עוד</span>
        </button>
      </div>

      {/* ══════════ CSS Animation ══════════ */}
      <style jsx global>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
