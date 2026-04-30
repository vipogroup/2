'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { hasPermission, ADMIN_PERMISSIONS, isBusinessAdminUser, isSuperAdminUser } from '@/lib/superAdmins';
import { fetchAuthUser } from '@/lib/clientAuthCache';
import { fetchUnreadAdminAlerts } from '@/lib/adminAlertsCache';

const ADMIN_AUTH_CACHE_TTL_MS = 15 * 1000;
const ADMIN_ALERTS_CACHE_TTL_MS = 20 * 1000;
const ADMIN_ALERTS_POLL_MS = 60 * 1000;

// ─── Icons ───────────────────────────────────────────────────
function DashboardIcon({ className = 'w-[17px] h-[17px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="9" width="8" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function UsersIcon({ className = 'w-[17px] h-[17px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M4 19.5v-.75A5.75 5.75 0 019.75 13h4.5A5.75 5.75 0 0120 18.75v.75" />
      <circle cx="12" cy="9" r="3.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CartIcon({ className = 'w-[17px] h-[17px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M2.25 2.25h1.386c.51 0 .955.343 1.087.835l.383 1.437m0 0h12.752a.75.75 0 01.736.92l-1.5 6a.75.75 0 01-.736.58H6.72a.75.75 0 01-.736-.58L4.106 4.522m13.813 10.477a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm-8.25 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  );
}

function CubeIcon({ className = 'w-[17px] h-[17px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 7.5L12 2.25 3 7.5m18 0L12 12.75m9-5.25v9l-9 5.25m0-9L3 7.5m9 5.25v9l-9-5.25v-9" />
    </svg>
  );
}

function CoinStackIcon({ className = 'w-[17px] h-[17px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="6.5" rx="7" ry="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M5 6.5v7c0 1.93 3.134 3.5 7 3.5s7-1.57 7-3.5v-7" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M5 10.5c0 1.93 3.134 3.5 7 3.5s7-1.57 7-3.5" />
    </svg>
  );
}

function SettingsIcon({ className = 'w-[17px] h-[17px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ShieldIcon({ className = 'w-[17px] h-[17px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 4l7 2.8v5.7c0 4-2.9 7.8-7 8.5-4.1-.7-7-4.5-7-8.5V6.8L12 4z" />
    </svg>
  );
}

function ChartBarIcon({ className = 'w-[17px] h-[17px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M4 20h16" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M8 20v-8" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M12 20v-12" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M16 20v-5" />
    </svg>
  );
}

function ImageIcon({ className = 'w-[17px] h-[17px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M4 16l4-4 4 4 4-6 4 6" />
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="9" r="1.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg className={`w-3 h-3 mr-auto transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ─── Sidebar Component ───────────────────────────────────────
export default function AdminSidebar({ zoom = 1, onZoomChange } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [openCategory, setOpenCategory] = useState(null);
  const [alertCount, setAlertCount] = useState(0);
  const [tunnelUrl, setTunnelUrl] = useState(null);
  const [tunnelLoading, setTunnelLoading] = useState(false);

  const applyZoomDelta = useCallback((delta) => {
    if (typeof onZoomChange !== 'function') return;
    const base = Number.isFinite(Number(zoom)) ? Number(zoom) : 1;
    const next = Math.round(Math.max(0.5, Math.min(1.3, base + delta)) * 100) / 100;
    onZoomChange(next);
  }, [onZoomChange, zoom]);

  // Fetch user
  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const userData = await fetchAuthUser({ ttlMs: ADMIN_AUTH_CACHE_TTL_MS });
        if (!ignore) {
          setUser(userData || null);
        }
      } catch (e) { console.error('Sidebar: failed to load user', e); }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  // Fetch alert count
  useEffect(() => {
    if (!user) {
      setAlertCount(0);
      return;
    }

    let ignore = false;
    let intervalId = null;

    const fetchAlerts = async (forceRefresh = false) => {
      try {
        const unreadCount = await fetchUnreadAdminAlerts({
          ttlMs: ADMIN_ALERTS_CACHE_TTL_MS,
          forceRefresh,
        });
        if (!ignore) {
          setAlertCount(unreadCount);
        }
      } catch (e) { /* silent */ }
    };

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(fetchAlerts, ADMIN_ALERTS_POLL_MS);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
        return;
      }
      fetchAlerts(true);
      startPolling();
    };

    fetchAlerts();

    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      ignore = true;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const canAccess = (permission) => hasPermission(user, permission);
  const isSuperAdmin = isSuperAdminUser(user);

  const toggleCategory = (cat) => setOpenCategory(openCategory === cat ? null : cat);

  const isActive = (href) => pathname === href;
  const isActivePrefix = (prefix) => pathname?.startsWith(prefix);

  const linkCls = (active) =>
    `flex items-center gap-2 px-2.5 py-2 rounded-[9px] text-xs font-medium transition-all ${active ? 'text-white' : 'hover:bg-white/[0.07]'}`;
  const linkStyle = (active) => ({
    color: active ? '#fff' : 'rgba(255,255,255,0.6)',
    background: active ? 'rgba(255,255,255,0.13)' : 'transparent',
  });

  const subLinkCls = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all hover:bg-white/[0.07]';
  const subLinkStyle = { color: 'rgba(255,255,255,0.5)' };

  const catBtnCls = 'w-full flex items-center gap-2 px-2.5 py-2 rounded-[9px] text-xs font-medium transition-all hover:bg-white/[0.07] text-right';
  const catBtnStyle = (cat) => ({
    color: openCategory === cat ? 'white' : 'rgba(255,255,255,0.6)',
    background: openCategory === cat ? 'rgba(255,255,255,0.08)' : 'transparent',
  });

  return (
    <aside
      className="hidden lg:flex w-[240px] flex-shrink-0 flex-col h-full overflow-y-auto"
      style={{
        background: 'linear-gradient(180deg, #1e3a8a 0%, #0f2557 100%)',
        boxShadow: '-4px 0 20px rgba(30, 58, 138, 0.15)',
      }}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white font-black text-base" style={{ background: 'rgba(255,255,255,0.12)' }}>V</div>
        <span className="text-xl font-extrabold text-white tracking-tight">VIPO</span>
      </div>

      <div className="px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <button
            type="button"
            onClick={() => applyZoomDelta(-0.05)}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/[0.08] transition-all"
            title="הקטן"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
          </button>

          <button
            type="button"
            onClick={() => typeof onZoomChange === 'function' && onZoomChange(1)}
            className="text-[11px] font-extrabold px-2 py-1 rounded hover:bg-white/[0.08] transition-all"
            title="איפוס זום"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            {Math.round((Number.isFinite(Number(zoom)) ? Number(zoom) : 1) * 100)}%
          </button>

          <button
            type="button"
            onClick={() => applyZoomDelta(0.05)}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/[0.08] transition-all"
            title="הגדל"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-2 px-2 overflow-y-auto">
        {/* ── ראשי ── */}
        <div className="px-2.5 pt-3 pb-1"><span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>ראשי</span></div>

        <Link href="/admin" className={linkCls(isActive('/admin'))} style={linkStyle(isActive('/admin'))}>
          <DashboardIcon /> דשבורד
        </Link>
        <Link href="/admin/monitor" className={linkCls(isActive('/admin/monitor'))} style={linkStyle(isActive('/admin/monitor'))}>
          <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          מוניטור
          {alertCount > 0 && <span className="mr-auto text-[9px] font-bold px-1.5 py-0.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.25)', color: '#fca5a5' }}>{alertCount}</span>}
        </Link>

        {/* ── ניהול ── */}
        <div className="px-2.5 pt-4 pb-1"><span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>ניהול</span></div>

        {(canAccess(ADMIN_PERMISSIONS.VIEW_USERS) || canAccess(ADMIN_PERMISSIONS.VIEW_AGENTS)) && (
          <Link href="/admin/management" className={linkCls(isActivePrefix('/admin/management'))} style={linkStyle(isActivePrefix('/admin/management'))}>
            <UsersIcon /> ניהול משתמשים
          </Link>
        )}
        {isSuperAdmin && (
          <Link href="/admin/notification-logs" className={linkCls(isActive('/admin/notification-logs'))} style={linkStyle(isActive('/admin/notification-logs'))}>
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            יומן התראות
          </Link>
        )}
        {isSuperAdmin && (
          <Link href="/admin/simulator" className={linkCls(isActive('/admin/simulator'))} style={linkStyle(isActive('/admin/simulator'))}>
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            סימולטור מערכת
          </Link>
        )}

        {/* ── קטלוג ומכירות ── */}
        {(canAccess(ADMIN_PERMISSIONS.VIEW_PRODUCTS) || canAccess(ADMIN_PERMISSIONS.VIEW_ORDERS)) && (
          <Link href="/admin/catalog" className={linkCls(isActivePrefix('/admin/catalog'))} style={linkStyle(isActivePrefix('/admin/catalog'))}>
            <CubeIcon /> קטלוג ומכירות
          </Link>
        )}

        {canAccess(ADMIN_PERMISSIONS.VIEW_PRODUCTS) && (
          <Link
            href="/admin/products"
            className={linkCls(isActivePrefix('/admin/products'))}
            style={linkStyle(isActivePrefix('/admin/products'))}
          >
            <CubeIcon /> מוצרים
          </Link>
        )}

        {isSuperAdmin && (
          <Link
            href="/admin/products/categories"
            className={linkCls(isActivePrefix('/admin/products/categories'))}
            style={linkStyle(isActivePrefix('/admin/products/categories'))}
          >
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 7h.01M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4z"
              />
            </svg>
            קטגוריות
          </Link>
        )}

        {/* ── כספים ודוחות ── */}
        {(canAccess(ADMIN_PERMISSIONS.VIEW_REPORTS) || canAccess(ADMIN_PERMISSIONS.VIEW_COMMISSIONS)) && (
          <Link href="/admin/finance" className={linkCls(isActivePrefix('/admin/finance'))} style={linkStyle(isActivePrefix('/admin/finance'))}>
            <CoinStackIcon /> כספים ודוחות
          </Link>
        )}

        {/* CRM */}
        {canAccess(ADMIN_PERMISSIONS.VIEW_USERS) && (
          <Link href="/admin/crm/dashboard" className={linkCls(isActivePrefix('/admin/crm'))} style={linkStyle(isActivePrefix('/admin/crm'))}>
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            CRM
          </Link>
        )}

        {/* ── הגדרות ושיווק ── */}
        {(canAccess(ADMIN_PERMISSIONS.MANAGE_NOTIFICATIONS) || canAccess(ADMIN_PERMISSIONS.VIEW_SETTINGS)) && (
          <Link href="/admin/settings-hub" className={linkCls(isActivePrefix('/admin/settings-hub'))} style={linkStyle(isActivePrefix('/admin/settings-hub'))}>
            <SettingsIcon /> מרכז הגדרות
          </Link>
        )}

        {/* ניהול חנויות */}
        {isSuperAdmin && (
          <Link href="/admin/tenants" className={linkCls(isActive('/admin/tenants'))} style={linkStyle(isActive('/admin/tenants'))}>
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            ניהול חנויות
          </Link>
        )}

        {/* Catalog Manager */}
        {isSuperAdmin && (
          <Link href="/admin/catalog-manager/standalone" className={linkCls(isActive('/admin/catalog-manager/standalone'))} style={linkStyle(isActive('/admin/catalog-manager/standalone'))}>
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            Catalog Manager
          </Link>
        )}

        {/* ── מערכת ── */}
        {isSuperAdmin && (<>
          <div className="px-2.5 pt-4 pb-1"><span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>מערכת</span></div>

          <Link href="/admin/control-center" className={linkCls(isActivePrefix('/admin/control-center'))} style={linkStyle(isActivePrefix('/admin/control-center'))}>
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            מרכז בקרה
          </Link>

          <Link href="/admin/media-usage" className={linkCls(isActivePrefix('/admin/media-usage'))} style={linkStyle(isActivePrefix('/admin/media-usage'))}>
            <ImageIcon /> שימוש מדיה
          </Link>

          <a
            href="/api/studio/auth/sso/start?redirect=1"
            className={linkCls(isActivePrefix('/admin/vipo-image-studio'))}
            style={linkStyle(isActivePrefix('/admin/vipo-image-studio'))}
          >
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 7.5h1.5l1.5-2.25h10.5l1.5 2.25h1.5A1.5 1.5 0 0121.75 9v9.75A1.5 1.5 0 0120.25 20.25H3.75A1.5 1.5 0 012.25 18.75V9A1.5 1.5 0 013.75 7.5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 17.25a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" /></svg>
            סטודיו תמונות
          </a>

          {/* Tunnel */}
          <button
            onClick={async () => {
              setTunnelLoading(true);
              try {
                if (tunnelUrl) {
                  await fetch('/api/tunnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stop' }) });
                  setTunnelUrl(null);
                } else {
                  const res = await fetch('/api/tunnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start', port: 3001 }) });
                  const data = await res.json();
                  if (data.ok && data.tunnelUrl) {
                    setTunnelUrl(data.tunnelUrl);
                    try {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(data.tunnelUrl);
                        alert(`Tunnel פעיל!\n\nכתובת HTTPS למובייל:\n${data.tunnelUrl}\n\n(הועתק ללוח)`);
                      } else { prompt('Tunnel פעיל! העתק את הקישור:', data.tunnelUrl); }
                    } catch (clipErr) { prompt('Tunnel פעיל! העתק את הקישור:', data.tunnelUrl); }
                  } else { alert('שגיאה: ' + (data.error || 'שגיאה ביצירת tunnel')); }
                }
              } catch (err) { alert('שגיאה: ' + err.message); }
              setTunnelLoading(false);
            }}
            disabled={tunnelLoading}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[9px] text-xs font-medium transition-all hover:bg-white/[0.07] text-right"
            style={{ color: tunnelUrl ? '#4ade80' : 'rgba(255,255,255,0.6)' }}
          >
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
            {tunnelLoading ? 'טוען...' : tunnelUrl ? '● Tunnel פעיל' : 'הפעל Tunnel'}
          </button>
          {tunnelUrl && (
            <button
              onClick={async () => {
                try {
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(tunnelUrl);
                    alert('הועתק!\n\n' + tunnelUrl);
                  } else { prompt('העתק את הקישור:', tunnelUrl); }
                } catch (err) { prompt('העתק את הקישור:', tunnelUrl); }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 pr-7 rounded-md text-[11px] font-medium transition-all hover:bg-white/[0.07]"
              style={{ color: 'rgba(255,255,255,0.5)' }}
              title={tunnelUrl}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              העתק URL
            </button>
          )}

          {/* משימות */}
          <Link href="/admin/tasks" className={linkCls(isActivePrefix('/admin/tasks'))} style={linkStyle(isActivePrefix('/admin/tasks'))}>
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            משימות ותיקונים
          </Link>

          {/* אבטחה */}
          <Link href="/admin/control-center?tab=security" className={linkCls(false)} style={linkStyle(false)}>
            <ShieldIcon /> אבטחה
          </Link>
        </>)}

        {/* ── קישורים ── */}
        {isSuperAdmin && (<>
          <div className="px-2.5 pt-4 pb-1"><span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>קישורים</span></div>

          <Link href="/admin/google-links" className={linkCls(isActivePrefix('/admin/google-links'))} style={linkStyle(isActivePrefix('/admin/google-links'))}>
            <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/></svg>
            דוחות גוגל
          </Link>

          <Link href="/admin/registration-links" className={linkCls(isActivePrefix('/admin/registration-links'))} style={linkStyle(isActivePrefix('/admin/registration-links'))}>
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
            קישורי הרשמה
          </Link>
        </>)}
      </div>

      {/* User Card + Actions */}
      <div className="px-2 pb-2 flex flex-col gap-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[9px]" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: 'rgba(255,255,255,0.12)' }}>
            {user?.fullName?.[0] || 'M'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{user?.fullName || 'מנהל'}</div>
            <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{user?.email || (isSuperAdmin ? 'Super Admin' : 'Business Admin')}</div>
          </div>
        </div>
        <Link href="/profile" className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all hover:bg-white/[0.07]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          הפרופיל שלי
        </Link>
        <Link href="/" className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all hover:bg-white/[0.07]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>
          לאתר הראשי
        </Link>
        <button
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
            } catch (e) { console.error(e); }
            router.push('/login');
            router.refresh();
          }}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all hover:bg-red-500/20 text-right"
          style={{ color: '#fca5a5' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          התנתקות
        </button>
      </div>
    </aside>
  );
}
