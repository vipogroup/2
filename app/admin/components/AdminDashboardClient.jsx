'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { hasPermission, ADMIN_PERMISSIONS, isBusinessAdminUser, isSuperAdminUser } from '@/lib/superAdmins';
import { fetchAuthUser } from '@/lib/clientAuthCache';
import { fetchUnreadAdminAlerts } from '@/lib/adminAlertsCache';

const ADMIN_AUTH_CACHE_TTL_MS = 15 * 1000;
const ADMIN_ALERTS_CACHE_TTL_MS = 20 * 1000;
const ADMIN_ALERTS_POLL_MS = 60 * 1000;
const ADMIN_DASHBOARD_PRIMARY_TIMEOUT_MS = 10 * 1000;
const ADMIN_DASHBOARD_SECONDARY_TIMEOUT_MS = 12 * 1000;

function DashboardIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="9" width="8" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PlusCircleIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8.5v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.5 12h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function UsersIcon({ className = 'w-10 h-10' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M4 19.5v-.75A5.75 5.75 0 019.75 13h4.5A5.75 5.75 0 0120 18.75v.75"
      />
      <circle cx="12" cy="9" r="3.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CartIcon({ className = 'w-10 h-10' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 2.25h1.386c.51 0 .955.343 1.087.835l.383 1.437m0 0h12.752a.75.75 0 01.736.92l-1.5 6a.75.75 0 01-.736.58H6.72a.75.75 0 01-.736-.58L4.106 4.522m13.813 10.477a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm-8.25 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
      />
    </svg>
  );
}

function CubeIcon({ className = 'w-10 h-10' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 7.5L12 2.25 3 7.5m18 0L12 12.75m9-5.25v9l-9 5.25m0-9L3 7.5m9 5.25v9l-9-5.25v-9"
      />
    </svg>
  );
}

function CoinStackIcon({ className = 'w-10 h-10' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="6.5" rx="7" ry="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 6.5v7c0 1.93 3.134 3.5 7 3.5s7-1.57 7-3.5v-7"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 10.5c0 1.93 3.134 3.5 7 3.5s7-1.57 7-3.5"
      />
    </svg>
  );
}

function CursorIcon({ className = 'w-10 h-10' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.25 4.25l8.5 9.5-3.8.7 2.2 5.8-2.05.75-2.05-5.95-3.8.7z"
      />
    </svg>
  );
}

function UserPlusIcon({ className = 'w-8 h-8' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M4 20v-.75A5.25 5.25 0 019.25 14h1.5"
      />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M16 8v4" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M14 10h4" />
    </svg>
  );
}

function SparkIcon({ className = 'w-8 h-8' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4l1.76 4.95L18.7 10.7l-4.94 1.76L12 17.4l-1.76-4.94L5.3 10.7l4.94-1.75z"
      />
    </svg>
  );
}

function ClipboardIcon({ className = 'w-8 h-8' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 3h6a1 1 0 011 1v1h1.5A1.5 1.5 0 0119.5 6v12A1.5 1.5 0 0118 19.5H6A1.5 1.5 0 014.5 18V6A1.5 1.5 0 016 5h1V4a1 1 0 011-1z"
      />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M9 9h6" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M9 13h6" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M9 17h4" />
    </svg>
  );
}

function AgentIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6.5" cy="16.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17.5" cy="16.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M10.4 9.4L8.3 13.6" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M13.6 9.4l2.1 4.2" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M8.5 16.5h7" />
    </svg>
  );
}

function ShieldIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4l7 2.8v5.7c0 4-2.9 7.8-7 8.5-4.1-.7-7-4.5-7-8.5V6.8L12 4z"
      />
    </svg>
  );
}

function UserCircleIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M8.5 17.5a3.5 3.5 0 017 0"
      />
    </svg>
  );
}

function LinkMarkIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15.5" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M11.5 12h1" />
    </svg>
  );
}

function ChartBarIcon({ className = 'w-10 h-10' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 20h16"
      />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M8 20v-8" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M12 20v-12" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M16 20v-5" />
    </svg>
  );
}

function getRoleBadge(role) {
  switch (role) {
    case 'agent':
      return { label: 'סוכן', className: 'bg-cyan-100 text-cyan-700', Icon: AgentIcon };
    case 'admin':
      return { label: 'מנהל', className: 'bg-red-100 text-red-700', Icon: ShieldIcon };
    default:
      return { label: 'לקוח', className: 'bg-blue-100 text-blue-700', Icon: UserCircleIcon };
  }
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const dataMode = response.headers.get('x-vipo-data-mode') || '';
    const fallbackSource = response.headers.get('x-vipo-fallback-source') || '';
    const fallbackAt = response.headers.get('x-vipo-fallback-at') || '';
    let data = null;
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      dataMode,
      fallbackSource,
      fallbackAt,
      timedOut: false,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      dataMode: '',
      fallbackSource: '',
      fallbackAt: '',
      timedOut: error?.name === 'AbortError',
      error,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function AdminDashboardClient({ initialUser = null }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadWarning, setLoadWarning] = useState('');
  const [openCategory, setOpenCategory] = useState(null);
  const [infoTooltip, setInfoTooltip] = useState(null);
  const [systemStatus, setSystemStatus] = useState({});
  const [statusLoading, setStatusLoading] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [securityData, setSecurityData] = useState(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [tunnelUrl, setTunnelUrl] = useState(null);
  const [tunnelLoading, setTunnelLoading] = useState(false);
  const [tenantStats, setTenantStats] = useState(null);
  const [tenantStatsPeriod, setTenantStatsPeriod] = useState('month');
  const [tenantMediaUsage, setTenantMediaUsage] = useState(null);
  const [adminZoom, setAdminZoom] = useState(1);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin-page-zoom');
      const parsed = saved ? parseFloat(saved) : NaN;
      if (Number.isFinite(parsed)) setAdminZoom(parsed);
    } catch (_) {}
  }, []);

  useEffect(() => {
    const onExternalZoom = (e) => {
      const next = typeof e?.detail === 'number' ? e.detail : parseFloat(e?.detail);
      if (!Number.isFinite(next)) return;
      setAdminZoom(next);
    };

    try {
      window.addEventListener('admin-zoom-change', onExternalZoom);
      return () => window.removeEventListener('admin-zoom-change', onExternalZoom);
    } catch (_) {
      return;
    }
  }, []);

  const setGlobalZoom = useCallback((value) => {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return;
    const next = Math.round(Math.max(0.5, Math.min(1.3, raw)) * 100) / 100;
    setAdminZoom(next);
    try {
      localStorage.setItem('admin-page-zoom', String(next));
    } catch (_) {}
    try {
      window.dispatchEvent(new CustomEvent('admin-zoom-change', { detail: next }));
    } catch (_) {}
  }, []);

  const backupInfoTexts = {
    backup: 'יוצר גיבוי חדש של כל הקבצים והנתונים במערכת. מומלץ לבצע לפני כל עדכון גדול.',
    update: 'מושך את הקוד העדכני מהשרת (git pull) ומתקין תלויות חדשות (npm install). השתמש כשיש עדכונים בקוד.',
    server: 'מפעיל את השרת המקומי לפיתוח בפורט 3001. סוגר שרת קיים אם יש ומפעיל חדש.',
    manual: 'מציג את כל הפקודות הידניות שניתן להריץ בטרמינל. לשימוש מתקדם בלבד.',
    deploy: 'מעלה את הגרסה העדכנית לשרת Vercel בפרודקשן. האתר יתעדכן תוך כ-2 דקות.',
    restore: 'משחזר גיבוי קודם. שים לב: פעולה זו תדרוס את הנתונים הנוכחיים!'
  };

  const systemsInfoTexts = {
    github: 'מאגר הקוד של הפרויקט. כאן נשמר כל הקוד והיסטוריית השינויים. לחץ לפתיחת GitHub.',
    mongodb: 'מסד הנתונים הראשי של המערכת. כאן נשמרים משתמשים, הזמנות, מוצרים וכל הנתונים.',
    vercel: 'פלטפורמת האחסון של האתר בפרודקשן. Deploy אוטומטי מ-GitHub.',
    render: 'לא בשימוש בפרויקט זה. ניתן להסיר מהרשימה.',
    cloudinary: 'שירות אחסון תמונות ומדיה בענן. משמש להעלאת תמונות מוצרים ותוכן.',
    firebase: 'לא בשימוש בפרויקט זה. ניתן להסיר מהרשימה.',
    sendgrid: 'שירות שליחת אימיילים. משמש לאימות אימייל בהרשמה, הודעות מערכת ועוד.',
    twilio: 'שירות SMS/WhatsApp לשליחת קודי OTP לאימות משתמשים.',
    resend: 'שירות שליחת אימיילים. משמש לאימות אימייל, הודעות מערכת ועוד.',
    npm: 'מנהל החבילות של Node.js - ספריות הקוד של הפרויקט.',
    payplus: 'מערכת סליקת כרטיסי אשראי. משמשת לחיוב לקוחות ועיבוד תשלומים בחנות.'
  };

  const loadData = useCallback(async () => {
    try {
      setLoadWarning('');

      let currentUser = initialUser;
      if (!currentUser) {
        currentUser = await fetchAuthUser({
          ttlMs: ADMIN_AUTH_CACHE_TTL_MS,
        });
      }

      if (!currentUser) {
        router.push('/login');
        return;
      }

      if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
        router.push('/');
        return;
      }

      setUser(currentUser);

      const isSuperAdmin = isSuperAdminUser(currentUser);

      const dashboardResult = await fetchJsonWithTimeout(
        '/api/admin/dashboard',
        ADMIN_DASHBOARD_PRIMARY_TIMEOUT_MS,
      );
      const primaryIsFallback = Boolean(dashboardResult?.data?.fallback);

      if (dashboardResult.ok && dashboardResult.data) {
        setDashboardData(dashboardResult.data);
        if (primaryIsFallback) {
          const hasSnapshotAt = Boolean(dashboardResult.fallbackAt);
          const snapshotText = hasSnapshotAt
            ? ` (עודכן ${new Date(dashboardResult.fallbackAt).toLocaleTimeString('he-IL')})`
            : '';
          setLoadWarning(
            `MongoDB לא זמין כרגע. מוצגים נתוני גיבוי כדי לשמור על רציפות עבודה${snapshotText}.`,
          );
        }
      } else if (dashboardResult.timedOut) {
        setLoadWarning('הטעינה של נתוני הדשבורד מתעכבת. מוצגים נתונים חלקיים.');
      } else if (dashboardResult.status >= 500) {
        setLoadWarning('יש עומס זמני בשרת הנתונים. אפשר לעבוד ולרענן בעוד כמה שניות.');
      }

      // Let the admin shell render even if heavy stats endpoints are slow.
      setLoading(false);

      const secondaryRequests = [
        fetchJsonWithTimeout('/api/admin/tenant-stats?period=month', ADMIN_DASHBOARD_SECONDARY_TIMEOUT_MS),
      ];
      if (isSuperAdmin) {
        secondaryRequests.push(
          fetchJsonWithTimeout('/api/admin/tenant-media-usage', ADMIN_DASHBOARD_SECONDARY_TIMEOUT_MS),
        );
      }

      const [tenantStatsResult, tenantMediaUsageResult] = await Promise.all(secondaryRequests);

      if (tenantStatsResult?.ok && tenantStatsResult.data) {
        setTenantStats(tenantStatsResult.data);
      }

      if (isSuperAdmin && tenantMediaUsageResult?.ok && tenantMediaUsageResult.data) {
        setTenantMediaUsage(tenantMediaUsageResult.data);
      }

      const secondaryFailure =
        tenantStatsResult?.timedOut ||
        tenantStatsResult?.status >= 500 ||
        (isSuperAdmin && (tenantMediaUsageResult?.timedOut || tenantMediaUsageResult?.status >= 500));
      const secondaryFallback =
        Boolean(tenantStatsResult?.data?.fallback) ||
        (isSuperAdmin && Boolean(tenantMediaUsageResult?.data?.fallback));

      if ((secondaryFailure || secondaryFallback) && dashboardResult.ok && !primaryIsFallback) {
        if (secondaryFallback) {
          setLoadWarning('נתוני הדוחות מוצגים כרגע במצב גיבוי עד שחיבור MongoDB יתאושש.');
        } else {
          setLoadWarning('חלק מהנתונים המתקדמים מתעכבים כרגע. אפשר להמשיך לעבוד ולרענן בהמשך.');
        }
      }
    } catch (error) {
      console.error('Failed to load admin dashboard:', error);
      setLoadWarning('טעינת הדשבורד נכשלה זמנית. נסה לרענן בעוד כמה שניות.');
    } finally {
      setLoading(false);
    }
  }, [router, initialUser]);

  const checkSystemStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/admin/system-status');
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data.results || {});
      }
    } catch (error) {
      console.error('Failed to check system status:', error);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    checkSystemStatus();
  }, [loadData, checkSystemStatus]);

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
      } catch (e) {
        console.error('Failed to fetch alerts:', e);
      }
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

  // Fetch security data when security category is opened
  const checkSecurity = useCallback(async () => {
    setSecurityLoading(true);
    try {
      const res = await fetch('/api/admin/security-scan');
      if (res.ok) {
        const data = await res.json();
        setSecurityData(data);
      }
    } catch (e) {
      console.error('Failed to fetch security data:', e);
    } finally {
      setSecurityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (openCategory === 'security' && !securityData) {
      checkSecurity();
    }
  }, [openCategory, securityData, checkSecurity]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ background: '#f0f2f5' }}>
        <div
          className="bg-white rounded-xl p-8"
          style={{
            border: '2px solid transparent',
            backgroundImage:
              'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 4px 20px rgba(8, 145, 178, 0.15)',
          }}
        >
          <div
            className="animate-spin rounded-full h-16 w-16 mx-auto mb-4"
            style={{
              border: '4px solid rgba(8, 145, 178, 0.2)',
              borderTopColor: '#0891b2',
            }}
          ></div>
          <p className="text-gray-600 text-center font-medium">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};

  // Helper function to check permissions
  const canAccess = (permission) => hasPermission(user, permission);
  const isSuperAdmin = isSuperAdminUser(user);
  const isBusinessAdmin = isBusinessAdminUser(user);

  const toggleCategory = (category) => {
    setOpenCategory(openCategory === category ? null : category);
  };

  return (
    <main className="min-h-screen" style={{ background: '#f0f2f5' }}>
      {/* Sidebar is now in admin/layout.js via AdminSidebar component */}

      <div className="p-2 sm:p-2.5 md:p-3 lg:p-3">
      <div className="max-w-7xl mx-auto lg:max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px]">
        {/* Header */}
        <div className="mb-1.5 sm:mb-2 flex items-center justify-between gap-2 flex-shrink-0 min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-bold min-w-0">
            <span
              className="flex items-center gap-1.5 sm:gap-2"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              <DashboardIcon
                className="w-5 h-5 sm:w-6 sm:h-6"
                style={{ color: '#0891b2' }}
              />
              דשבורד מנהל
            </span>
          </h1>

          <div className="hidden sm:flex items-center gap-1 rounded-lg p-1 border border-gray-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setGlobalZoom((Number.isFinite(Number(adminZoom)) ? Number(adminZoom) : 1) - 0.05)}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-all"
              title="הקטן"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
            </button>

            <button
              type="button"
              onClick={() => setGlobalZoom(1)}
              className="text-[11px] font-extrabold px-2 py-1 rounded hover:bg-gray-100 transition-all"
              title="איפוס זום"
              style={{ color: '#1e3a8a' }}
            >
              {Math.round((Number.isFinite(Number(adminZoom)) ? Number(adminZoom) : 1) * 100)}%
            </button>

            <button
              type="button"
              onClick={() => setGlobalZoom((Number.isFinite(Number(adminZoom)) ? Number(adminZoom) : 1) + 0.05)}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-all"
              title="הגדל"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
        </div>

        {loadWarning ? (
          <div
            className="mb-2 rounded-lg border px-3 py-2 text-[11px] sm:text-xs font-semibold"
            style={{
              background: '#fff7ed',
              borderColor: '#fed7aa',
              color: '#9a3412',
            }}
          >
            {loadWarning}
          </div>
        ) : null}

        <div>

        {/* Hero Banner */}
        <div className="rounded-xl p-3 sm:p-4 mb-2 flex flex-wrap items-center justify-between gap-3 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
          <div className="relative z-10">
            <h2 className="text-sm sm:text-base font-extrabold mb-0.5">שלום, {user?.fullName || 'מנהל'}</h2>
            <p className="text-[10px] sm:text-xs opacity-70">סקירה כללית של המערכת | {new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex gap-4 sm:gap-5 relative z-10 flex-wrap">
            <div className="text-center"><div className="text-base sm:text-lg font-extrabold">{(stats.totalOrders || 0).toLocaleString()}</div><div className="text-[9px] opacity-65">הזמנות</div></div>
            <div className="w-px self-stretch hidden sm:block" style={{ background: 'rgba(255,255,255,0.12)' }}></div>
            <div className="text-center"><div className="text-base sm:text-lg font-extrabold">{stats.totalAgents || 0}</div><div className="text-[9px] opacity-65">סוכנים</div></div>
            <div className="w-px self-stretch hidden sm:block" style={{ background: 'rgba(255,255,255,0.12)' }}></div>
            <div className="text-center"><div className="text-base sm:text-lg font-extrabold">{stats.totalProducts || 0}</div><div className="text-[9px] opacity-65">מוצרים</div></div>
            <div className="w-px self-stretch hidden sm:block" style={{ background: 'rgba(255,255,255,0.12)' }}></div>
            <div className="text-center"><div className="text-base sm:text-lg font-extrabold">{stats.totalUsers || 0}</div><div className="text-[9px] opacity-65">משתמשים</div></div>
          </div>
          <div className="absolute -top-12 -left-8 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}></div>
          <div className="absolute -bottom-16 right-20 w-60 h-60 rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }}></div>
        </div>

        {/* Status Bar - All System Services */}
        <div className="bg-white border border-gray-200 rounded-lg mb-2 shadow-sm p-2 sm:p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-500">סטטוס חיבורים</span>
            <div className="flex items-center gap-1.5">
              {statusLoading && <span className="text-[9px] text-gray-400">בודק...</span>}
              <button onClick={checkSystemStatus} disabled={statusLoading} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all disabled:opacity-50" title="בדוק שוב">
                &#x21bb; רענן
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
            {[
              { key: 'mongodb', label: 'MongoDB' },
              { key: 'payplus', label: 'PayPlus' },
              { key: 'priority', label: 'Priority' },
              { key: 'whatsapp', label: 'WhatsApp' },
              { key: 'cloudinary', label: 'Cloudinary' },
              { key: 'vercel', label: 'Vercel' },
              { key: 'github', label: 'GitHub' },
              { key: 'resend', label: 'Resend' },
              { key: 'twilio', label: 'Twilio' },
              { key: 'npm', label: 'NPM' },
            ].map((svc) => {
              const s = systemStatus[svc.key];
              const color = !s ? '#94a3b8' : s.status === 'connected' ? '#16a34a' : s.status === 'warning' ? '#f59e0b' : '#ef4444';
              const bgColor = !s ? '#f8fafc' : s.status === 'connected' ? '#f0fdf4' : s.status === 'warning' ? '#fffbeb' : '#fef2f2';
              const borderColor = !s ? '#e2e8f0' : s.status === 'connected' ? '#bbf7d0' : s.status === 'warning' ? '#fde68a' : '#fecaca';
              const statusLabel = !s ? '...' : s.status === 'connected' ? 'OK' : s.status === 'warning' ? 'Warn' : 'Err';
              return (
                <div key={svc.key} className="rounded-md p-1.5 flex flex-col gap-0.5" style={{ background: bgColor, border: `1px solid ${borderColor}` }} title={s?.message || 'בודק...'}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: s?.status === 'connected' ? `0 0 6px ${color}` : 'none' }}></span>
                      <span className="text-[10px] font-semibold text-gray-700">{svc.label}</span>
                    </div>
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: color, color: 'white' }}>{statusLabel}</span>
                  </div>
                  <div className="text-[8px] text-gray-500 truncate" dir="rtl">{s?.message || 'בודק...'}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 mb-2">
          <div className="bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 transition-all hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 left-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}></div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 font-medium">סה&quot;כ עמלות</span>
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ color: '#1e3a8a', background: 'rgba(30,58,138,0.07)' }}><CoinStackIcon className="w-3.5 h-3.5" /></div>
            </div>
            <div className="text-base sm:text-lg font-extrabold text-gray-900 mb-0.5">&#8362;{(stats.totalCommissions || 0).toLocaleString()}</div>
            <div className="flex items-center gap-1 text-[9px] font-semibold" style={{ color: '#16a34a' }}>
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              עמלות פלטפורמה
            </div>
            <div className="mt-1">
              <svg viewBox="0 0 200 28" preserveAspectRatio="none" className="w-full h-6">
                <defs><linearGradient id="sg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.2"/><stop offset="100%" stopColor="#1e3a8a" stopOpacity="0"/></linearGradient></defs>
                <path d="M0 28 L30 22 L60 24 L90 16 L120 18 L150 12 L180 8 L200 4 L200 32 L0 32Z" fill="url(#sg1)"/>
                <path d="M0 28 L30 22 L60 24 L90 16 L120 18 L150 12 L180 8 L200 4" fill="none" stroke="#1e3a8a" strokeWidth="1.5"/>
              </svg>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 transition-all hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 left-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}></div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 font-medium">סוכנים פעילים</span>
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ color: '#0891b2', background: 'rgba(8,145,178,0.07)' }}><UsersIcon className="w-3.5 h-3.5" /></div>
            </div>
            <div className="text-base sm:text-lg font-extrabold text-gray-900 mb-0.5">{stats.totalAgents || 0}</div>
            <div className="flex items-center gap-1 text-[9px] font-semibold" style={{ color: '#16a34a' }}>
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              סוכנים רשומים
            </div>
            <div className="mt-1">
              <svg viewBox="0 0 200 28" preserveAspectRatio="none" className="w-full h-6">
                <defs><linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0891b2" stopOpacity="0.2"/><stop offset="100%" stopColor="#0891b2" stopOpacity="0"/></linearGradient></defs>
                <path d="M0 26 L30 20 L60 23 L90 14 L120 16 L150 10 L180 12 L200 6 L200 32 L0 32Z" fill="url(#sg2)"/>
                <path d="M0 26 L30 20 L60 23 L90 14 L120 16 L150 10 L180 12 L200 6" fill="none" stroke="#0891b2" strokeWidth="1.5"/>
              </svg>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 transition-all hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 left-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}></div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 font-medium">הזמנות פעילות</span>
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ color: '#16a34a', background: 'rgba(22,163,74,0.07)' }}><ClipboardIcon className="w-3.5 h-3.5" /></div>
            </div>
            <div className="text-base sm:text-lg font-extrabold text-gray-900 mb-0.5">{(stats.totalOrders || 0).toLocaleString()}</div>
            <div className="flex items-center gap-1 text-[9px] font-semibold" style={{ color: '#0891b2' }}>
              סה&quot;כ הזמנות במערכת
            </div>
            <div className="mt-1">
              <svg viewBox="0 0 200 28" preserveAspectRatio="none" className="w-full h-6">
                <defs><linearGradient id="sg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a34a" stopOpacity="0.2"/><stop offset="100%" stopColor="#16a34a" stopOpacity="0"/></linearGradient></defs>
                <path d="M0 24 L25 20 L50 22 L75 15 L100 18 L125 12 L150 14 L175 8 L200 5 L200 32 L0 32Z" fill="url(#sg3)"/>
                <path d="M0 24 L25 20 L50 22 L75 15 L100 18 L125 12 L150 14 L175 8 L200 5" fill="none" stroke="#16a34a" strokeWidth="1.5"/>
              </svg>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 transition-all hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 left-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}></div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 font-medium">מוצרים בקטלוג</span>
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ color: '#7c3aed', background: 'rgba(124,58,237,0.07)' }}><CubeIcon className="w-3.5 h-3.5" /></div>
            </div>
            <div className="text-base sm:text-lg font-extrabold text-gray-900 mb-0.5">{stats.totalProducts || 0}</div>
            <div className="flex items-center gap-1 text-[9px] font-semibold text-gray-400">
              {stats.groupProducts || 0} קבוצתיים | {stats.onlineProducts || 0} אונליין
            </div>
            <div className="mt-1">
              <svg viewBox="0 0 200 28" preserveAspectRatio="none" className="w-full h-6">
                <defs><linearGradient id="sg4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2"/><stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/></linearGradient></defs>
                <path d="M0 20 L30 18 L60 22 L90 14 L120 16 L150 11 L180 9 L200 7 L200 32 L0 32Z" fill="url(#sg4)"/>
                <path d="M0 20 L30 18 L60 22 L90 14 L120 16 L150 11 L180 9 L200 7" fill="none" stroke="#7c3aed" strokeWidth="1.5"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Middle Row: Quick Stats + Container Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 sm:gap-2 mb-2">
          <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
            <div className="text-[12px] font-bold text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              סיכום מהיר
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <div className="p-2 rounded-lg text-center transition-all hover:bg-blue-50/50 cursor-default" style={{ background: '#f8fafc' }}>
                <div className="text-base font-extrabold text-gray-900">{stats.totalUsers || 0}</div>
                <div className="text-[9px] text-gray-400 mt-0.5">משתמשים</div>
              </div>
              <div className="p-2 rounded-lg text-center transition-all hover:bg-blue-50/50 cursor-default" style={{ background: '#f8fafc' }}>
                <div className="text-base font-extrabold text-gray-900">{stats.totalProducts || 0}</div>
                <div className="text-[9px] text-gray-400 mt-0.5">מוצרים</div>
              </div>
              <div className="p-2 rounded-lg text-center transition-all hover:bg-blue-50/50 cursor-default" style={{ background: '#f8fafc' }}>
                <div className="text-base font-extrabold text-gray-900">{stats.totalCustomers || 0}</div>
                <div className="text-[9px] text-gray-400 mt-0.5">לקוחות</div>
              </div>
              <div className="p-2 rounded-lg text-center transition-all hover:bg-blue-50/50 cursor-default" style={{ background: '#f8fafc' }}>
                <div className="text-base font-extrabold text-gray-900">{stats.totalClicks || 0}</div>
                <div className="text-[9px] text-gray-400 mt-0.5">קליקים</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm flex items-center gap-4">
            <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
              <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
                <defs><linearGradient id="cg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1e3a8a"/><stop offset="100%" stopColor="#0891b2"/></linearGradient></defs>
                <circle cx="36" cy="36" r="30" fill="none" stroke="#e2e8f0" strokeWidth="7"/>
                <circle cx="36" cy="36" r="30" fill="none" stroke="url(#cg1)" strokeWidth="7" strokeLinecap="round" strokeDasharray="188" strokeDashoffset={188 - (188 * Math.min((stats.totalOrders || 0) / Math.max(stats.totalOrders || 1, 50), 1))} style={{ transition: 'stroke-dashoffset 1s ease' }}/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-extrabold text-gray-900">{stats.totalOrders || 0}</span>
                <span className="text-[8px] text-gray-400">הזמנות</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[12px] font-bold text-gray-900 mb-1.5 flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                סטטוס מערכת
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] py-0.5 border-b border-gray-100"><span className="text-gray-500">משתמשים</span><span className="font-bold text-gray-900">{stats.totalUsers || 0}</span></div>
                <div className="flex justify-between text-[11px] py-0.5 border-b border-gray-100"><span className="text-gray-500">סוכנים</span><span className="font-bold text-gray-900">{stats.totalAgents || 0}</span></div>
                <div className="flex justify-between text-[11px] py-0.5 border-b border-gray-100"><span className="text-gray-500">לקוחות</span><span className="font-bold text-gray-900">{stats.totalCustomers || 0}</span></div>
                <div className="flex justify-between text-[11px] py-0.5"><span className="text-gray-500">עמלות</span><span className="font-bold" style={{ color: '#16a34a' }}>&#8362;{(stats.totalCommissions || 0).toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity + Top Agents Row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-1.5 sm:gap-2 mb-2">
          {/* Agent Stats Table */}
          {dashboardData?.agentStats?.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <span className="text-[12px] font-bold text-gray-900 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                סוכנים מובילים
              </span>
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ color: '#0891b2', background: 'rgba(8,145,178,0.07)' }}>{dashboardData.agentStats.length} סוכנים</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-right text-[9px] text-gray-400 font-semibold uppercase tracking-wider px-3 py-1.5" style={{ borderBottom: '1px solid #e2e8f0' }}>סוכן</th>
                    <th className="text-right text-[9px] text-gray-400 font-semibold uppercase tracking-wider px-3 py-1.5" style={{ borderBottom: '1px solid #e2e8f0' }}>הפניות</th>
                    <th className="text-right text-[9px] text-gray-400 font-semibold uppercase tracking-wider px-3 py-1.5" style={{ borderBottom: '1px solid #e2e8f0' }}>מכירות</th>
                    <th className="text-right text-[9px] text-gray-400 font-semibold uppercase tracking-wider px-3 py-1.5" style={{ borderBottom: '1px solid #e2e8f0' }}>יתרה</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.agentStats.slice(0, 5).map((agent, idx) => (
                  <tr key={agent._id} className="transition-all hover:bg-gray-50" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded flex items-center justify-center text-white font-bold text-[10px]" style={{ background: idx === 0 ? 'linear-gradient(135deg, #1e3a8a, #0891b2)' : idx === 1 ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' : 'linear-gradient(135deg, #059669, #34d399)' }}>
                          {(agent.fullName || agent.email || '?')[0]}
                        </div>
                        <span className="text-[11px] font-semibold text-gray-900 truncate max-w-[100px]">{agent.fullName || agent.email}</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-gray-700">{agent.referralsCount || 0}</td>
                    <td className="px-3 py-1.5 text-[11px] font-semibold" style={{ color: '#1e3a8a' }}>&#8362;{(agent.totalSales || 0).toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-[11px] font-semibold" style={{ color: '#16a34a' }}>&#8362;{(agent.commissionBalance || 0).toLocaleString()}</td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
          {/* Live Activity Feed */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <span className="text-[12px] font-bold text-gray-900 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                פעילות אחרונה
              </span>
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ color: '#16a34a', background: 'rgba(22,163,74,0.07)' }}>LIVE</span>
            </div>
            <div className="px-3 py-1.5">
              {dashboardData?.recentOrders?.slice(0, 4).map((order) => (
              <div key={order._id} className="flex items-start gap-2 py-1.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: order.status === 'completed' ? 'rgba(22,163,74,0.07)' : 'rgba(30,58,138,0.07)', color: order.status === 'completed' ? '#16a34a' : '#1e3a8a' }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">{order.status === 'completed' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />}</svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-gray-900 truncate">{order.productName}</div>
                  <div className="text-[9px] text-gray-400">{order.customerName} · {new Date(order.createdAt).toLocaleDateString('he-IL')}</div>
                </div>
                <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: '#16a34a' }}>&#8362;{(order.totalAmount || 0).toLocaleString()}</span>
              </div>
              ))}
              {dashboardData?.newUsers?.slice(0, 2).map((u) => (
              <div key={u._id} className="flex items-start gap-2 py-1.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(124,58,237,0.07)', color: '#7c3aed' }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-gray-900 truncate">{u.role === 'agent' ? 'סוכן חדש' : 'משתמש חדש'} - {u.fullName || u.email || u.phone}</div>
                  <div className="text-[9px] text-gray-400">{new Date(u.createdAt).toLocaleDateString('he-IL')}</div>
                </div>
              </div>
              ))}
            </div>
          </div>
        </div>

        {/* Accordion Categories - only visible when sidebar item clicked */}
        {openCategory && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-3 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #e2e8f0' }}>
            <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#1e3a8a' }}>
              <svg className="w-4 h-4" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              ניווט מהיר
            </span>
            <button onClick={() => setOpenCategory(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all" title="סגור">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {/* 1. ניהול משתמשים */}
          {(canAccess(ADMIN_PERMISSIONS.VIEW_USERS) || canAccess(ADMIN_PERMISSIONS.VIEW_AGENTS)) && (
          <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 2px 10px rgba(8, 145, 178, 0.1)' }}>
            <button onClick={() => toggleCategory('users')} className="w-full flex items-center justify-between p-2 sm:p-2.5 text-right transition-all hover:bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                  <UsersIcon className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold" style={{ color: '#1e3a8a' }}>ניהול משתמשים</span>
              </div>
              <svg className={`w-5 h-5 transition-transform ${openCategory === 'users' ? 'rotate-180' : ''}`} style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openCategory === 'users' && (
            <div className="p-2 pt-0 grid grid-cols-2 gap-1.5 flex-1 min-h-0 scroll-y-auto">
              {canAccess(ADMIN_PERMISSIONS.VIEW_USERS) && (
              <Link href="/admin/users" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <UsersIcon className="w-5 h-5" style={{ color: '#0891b2' }} />
                <span className="text-xs font-medium text-gray-900">ניהול משתמשים</span>
              </Link>
              )}
              {canAccess(ADMIN_PERMISSIONS.VIEW_AGENTS) && (
              <Link href="/admin/agents" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <AgentIcon className="w-5 h-5" style={{ color: '#0891b2' }} />
                <span className="text-xs font-medium text-gray-900">ניהול סוכנים</span>
              </Link>
              )}
              {/* יומן התראות - Super Admin only */}
              {isSuperAdmin && (
              <Link href="/admin/notification-logs" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="text-xs font-medium text-gray-900">יומן התראות</span>
              </Link>
              )}
              {/* Multi-Tenant: ניהול עסקים - Super Admin only */}
              {isSuperAdmin && (
              <Link href="/admin/tenants" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
                <span className="text-xs font-medium text-gray-900">ניהול עסקים</span>
              </Link>
              )}
              {/* מארקטפלייס עסקים - דף לסוכנים לראות עסקים זמינים */}
              {isSuperAdmin && (
              <Link href="/agent/marketplace" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                </svg>
                <span className="text-xs font-medium text-gray-900">מארקטפלייס עסקים</span>
              </Link>
              )}
              {/* סימולטור מערכת - Super Admin only */}
              {isSuperAdmin && (
              <Link href="/admin/simulator" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-2.256.377A9.065 9.065 0 0112 21a9.065 9.065 0 01-5.879-.81l-2.256-.377c-1.717-.293-2.299-2.379-1.067-3.611L5 14.5" />
                </svg>
                <span className="text-xs font-medium text-gray-900">סימולטור מערכת</span>
              </Link>
              )}
            </div>
            )}
          </div>
          )}

          {/* 2. קטלוג ומכירות */}
          {(canAccess(ADMIN_PERMISSIONS.VIEW_PRODUCTS) || canAccess(ADMIN_PERMISSIONS.VIEW_ORDERS)) && (
          <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 2px 10px rgba(8, 145, 178, 0.1)' }}>
            <button onClick={() => toggleCategory('catalog')} className="w-full flex items-center justify-between p-2 sm:p-2.5 text-right transition-all hover:bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                  <CubeIcon className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold" style={{ color: '#1e3a8a' }}>קטלוג ומכירות</span>
              </div>
              <svg className={`w-5 h-5 transition-transform ${openCategory === 'catalog' ? 'rotate-180' : ''}`} style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openCategory === 'catalog' && (
            <div className="p-2 pt-0 grid grid-cols-2 gap-1.5 flex-1 min-h-0 scroll-y-auto">
              {canAccess(ADMIN_PERMISSIONS.VIEW_PRODUCTS) && (
              <Link href="/admin/products" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <CubeIcon className="w-5 h-5" style={{ color: '#0891b2' }} />
                <span className="text-xs font-medium text-gray-900">ניהול מוצרים</span>
              </Link>
              )}
              {canAccess(ADMIN_PERMISSIONS.VIEW_ORDERS) && (
              <Link href="/admin/orders" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <CartIcon className="w-5 h-5" style={{ color: '#0891b2' }} />
                <span className="text-xs font-medium text-gray-900">ניהול הזמנות</span>
              </Link>
              )}
              <Link href="/my-orders" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <CartIcon className="w-5 h-5" style={{ color: '#0891b2' }} />
                <span className="text-xs font-medium text-gray-900">ההזמנות שלי</span>
              </Link>
              {isSuperAdmin && (
              <Link href="/catalog-manager" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                <span className="text-xs font-medium text-gray-900">Catalog Manager</span>
              </Link>
              )}
              {canAccess(ADMIN_PERMISSIONS.EDIT_PRODUCTS) && (
              <Link href="/admin/products/new" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <PlusCircleIcon className="w-5 h-5" style={{ color: '#0891b2' }} />
                <span className="text-xs font-medium text-gray-900">הוסף מוצר</span>
              </Link>
              )}
            </div>
            )}
          </div>
          )}

          {/* 3. כספים ודוחות */}
          {(canAccess(ADMIN_PERMISSIONS.VIEW_REPORTS) || canAccess(ADMIN_PERMISSIONS.VIEW_COMMISSIONS)) && (
          <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 2px 10px rgba(8, 145, 178, 0.1)' }}>
            <button onClick={() => toggleCategory('finance')} className="w-full flex items-center justify-between p-2 sm:p-2.5 text-right transition-all hover:bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                  <CoinStackIcon className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold" style={{ color: '#1e3a8a' }}>כספים ודוחות</span>
              </div>
              <svg className={`w-5 h-5 transition-transform ${openCategory === 'finance' ? 'rotate-180' : ''}`} style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openCategory === 'finance' && (
            <div className="p-2 pt-0 grid grid-cols-2 gap-1.5 flex-1 min-h-0 scroll-y-auto">
              {canAccess(ADMIN_PERMISSIONS.VIEW_REPORTS) && (
              <Link href="/admin/reports" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <ChartBarIcon className="w-5 h-5" style={{ color: '#0891b2' }} />
                <span className="text-xs font-medium text-gray-900">דוחות</span>
              </Link>
              )}
              {canAccess(ADMIN_PERMISSIONS.VIEW_ANALYTICS) && (
              <Link href="/admin/analytics" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <ChartBarIcon className="w-5 h-5" style={{ color: '#0891b2' }} />
                <span className="text-xs font-medium text-gray-900">ניתוח נתונים</span>
              </Link>
              )}
              {canAccess(ADMIN_PERMISSIONS.VIEW_REPORTS) && (
              <Link href="/admin/transactions" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <CoinStackIcon className="w-5 h-5" style={{ color: '#0891b2' }} />
                <span className="text-xs font-medium text-gray-900">עסקאות</span>
              </Link>
              )}
              {canAccess(ADMIN_PERMISSIONS.VIEW_COMMISSIONS) && (
              <Link href="/admin/commissions" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <CoinStackIcon className="w-5 h-5" style={{ color: '#0891b2' }} />
                <span className="text-xs font-medium text-gray-900">עמלות</span>
              </Link>
              )}
              {canAccess(ADMIN_PERMISSIONS.VIEW_COMMISSIONS) && (
              <Link href="/admin/withdrawals" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <CoinStackIcon className="w-5 h-5" style={{ color: '#0891b2' }} />
                <span className="text-xs font-medium text-gray-900">בקשות משיכה</span>
              </Link>
              )}
              {canAccess(ADMIN_PERMISSIONS.VIEW_REPORTS) && (
              <a href="https://www.payplus.co.il" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all relative">
                <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${systemStatus.payplus?.status === 'connected' ? 'bg-green-500' : systemStatus.payplus?.status === 'warning' ? 'bg-amber-500' : systemStatus.payplus?.status === 'error' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                <svg className="w-5 h-5" style={{ color: '#00A651' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                </svg>
                <span className="text-xs font-medium text-gray-900">PayPlus סליקה</span>
              </a>
              )}
            </div>
            )}
          </div>
          )}

          {/* 4. CRM - ניהול לקוחות */}
          {canAccess(ADMIN_PERMISSIONS.VIEW_USERS) && (
          <Link href="/admin/crm/dashboard" className="block rounded-xl overflow-hidden transition-all hover:shadow-lg" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 2px 10px rgba(8, 145, 178, 0.1)' }}>
            <div className="flex items-center justify-between p-2 sm:p-2.5 text-right transition-all hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </span>
                <span className="text-xs font-bold" style={{ color: '#1e3a8a' }}>CRM - מערכת ניהול לקוחות</span>
              </div>
              <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
          )}

          {/* 5. הגדרות ושיווק */}
          {(canAccess(ADMIN_PERMISSIONS.MANAGE_NOTIFICATIONS) || canAccess(ADMIN_PERMISSIONS.VIEW_SETTINGS)) && (
          <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 2px 10px rgba(8, 145, 178, 0.1)' }}>
            <button onClick={() => toggleCategory('settings')} className="w-full flex items-center justify-between p-2 sm:p-2.5 text-right transition-all hover:bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                  <SettingsIcon className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold" style={{ color: '#1e3a8a' }}>הגדרות ושיווק</span>
              </div>
              <svg className={`w-5 h-5 transition-transform ${openCategory === 'settings' ? 'rotate-180' : ''}`} style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openCategory === 'settings' && (
            <div className="p-2 pt-0 grid grid-cols-2 gap-1.5 flex-1 min-h-0 scroll-y-auto">
              {canAccess(ADMIN_PERMISSIONS.MANAGE_NOTIFICATIONS) && (
              <Link href="/admin/notifications" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <SettingsIcon className="w-5 h-5" style={{ color: '#0891b2' }} />
                <span className="text-xs font-medium text-gray-900">התראות</span>
              </Link>
              )}
              {canAccess(ADMIN_PERMISSIONS.MANAGE_NOTIFICATIONS) && (
              <button 
                onClick={async () => {
                  const message = prompt('הכנס את תוכן ההתראה:');
                  if (!message) return;
                  try {
                    const res = await fetch('/api/push/send-all', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ title: 'VIPO', body: message }),
                    });
                    const data = await res.json();
                    if (data.ok) {
                      alert(`התראה נשלחה ל-${data.sent || 0} משתמשים`);
                    } else {
                      alert('שגיאה: ' + (data.error || 'שגיאה בשליחה'));
                    }
                  } catch (err) {
                    alert('שגיאה: ' + err.message);
                  }
                }}
                className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all"
              >
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="text-xs font-medium text-gray-900">שלח Popup לכולם</span>
              </button>
              )}
              {canAccess(ADMIN_PERMISSIONS.MANAGE_NOTIFICATIONS) && (
              <Link href="/admin/marketing-assets" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <SparkIcon className="w-5 h-5" style={{ color: '#0891b2' }} />
                <span className="text-xs font-medium text-gray-900">שיווק</span>
              </Link>
              )}
              {canAccess(ADMIN_PERMISSIONS.VIEW_SETTINGS) && (
              <Link href="/admin/settings" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <SettingsIcon className="w-5 h-5" style={{ color: '#0891b2' }} />
                <span className="text-xs font-medium text-gray-900">הגדרות</span>
              </Link>
              )}
              {canAccess(ADMIN_PERMISSIONS.VIEW_SETTINGS) && (
              <Link href="/admin/site-texts" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-xs font-medium text-gray-900">ניהול טקסטים</span>
              </Link>
              )}
              {canAccess(ADMIN_PERMISSIONS.VIEW_SETTINGS) && (
              <Link href="/admin/system-reports" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <ChartBarIcon className="w-5 h-5" style={{ color: '#0891b2' }} />
                <span className="text-xs font-medium text-gray-900">דוחות מערכת</span>
              </Link>
              )}
              {canAccess(ADMIN_PERMISSIONS.VIEW_SETTINGS) && (
              <Link href="/admin/social-audit" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="text-xs font-medium text-gray-900">Social Audits</span>
              </Link>
              )}
              {canAccess(ADMIN_PERMISSIONS.VIEW_SETTINGS) && (
              <Link href="/admin/social-posts" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <span className="text-xs font-medium text-gray-900">אישור פרסומי AI</span>
              </Link>
              )}
              {canAccess(ADMIN_PERMISSIONS.VIEW_SETTINGS) && (
              <Link href="/admin/branding" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <span className="text-xs font-medium text-gray-900">ניהול צבעים</span>
              </Link>
              )}
              {canAccess(ADMIN_PERMISSIONS.VIEW_SETTINGS) && (
              <Link href="/admin/bot-manager" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="text-xs font-medium text-gray-900">ניהול בוט צאט</span>
              </Link>
              )}
            </div>
            )}
          </div>
          )}

          {/* 5. מערכות וחיבורים - רק למנהלים ראשיים */}
          {isSuperAdmin && (
          <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 2px 10px rgba(8, 145, 178, 0.1)' }}>
            <button onClick={() => toggleCategory('systems')} className="w-full flex items-center justify-between p-2 sm:p-2.5 text-right transition-all hover:bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </span>
                <span className="text-xs font-bold" style={{ color: '#1e3a8a' }}>מערכות וחיבורים</span>
              </div>
              <svg className={`w-5 h-5 transition-transform ${openCategory === 'systems' ? 'rotate-180' : ''}`} style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openCategory === 'systems' && (
            <div className="p-2 pt-0 relative flex-1 min-h-0 scroll-y-auto">
              {/* Refresh Button */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">{statusLoading ? 'בודק חיבורים...' : 'סטטוס מערכות'}</span>
                <button 
                  onClick={checkSystemStatus} 
                  disabled={statusLoading}
                  className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                >
                  <svg className={`w-3 h-3 ${statusLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-xs text-gray-600">רענן</span>
                </button>
              </div>
              
              {/* Info Tooltip Modal for Systems */}
              {infoTooltip && systemsInfoTexts[infoTooltip] && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setInfoTooltip(null)}>
                  <div className="bg-white rounded-xl p-4 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-gray-900">מידע</h4>
                      <button onClick={() => setInfoTooltip(null)} className="p-1 hover:bg-gray-100 rounded-full">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{systemsInfoTexts[infoTooltip]}</p>
                    {systemStatus[infoTooltip] && (
                      <div className={`mt-3 p-2 rounded-lg text-xs ${systemStatus[infoTooltip].status === 'connected' ? 'bg-green-50 text-green-700' : systemStatus[infoTooltip].status === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                        {systemStatus[infoTooltip].message}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-2">
                <a href="https://github.com/vipogroup" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all relative">
                  <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${systemStatus.github?.status === 'connected' ? 'bg-green-500' : systemStatus.github?.status === 'warning' ? 'bg-amber-500' : systemStatus.github?.status === 'error' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                  <svg className="w-5 h-5" style={{ color: '#333' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1 17H7v-4h4v4zm0-6H7V7h4v4zm6 6h-4v-4h4v4zm0-6h-4V7h4v4z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-900">GitHub</span>
                </a>
                <button onClick={() => setInfoTooltip('github')} className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold transition-all">i</button>
              </div>
              <div className="flex flex-col gap-2">
                <a href="https://cloud.mongodb.com" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all relative">
                  <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${systemStatus.mongodb?.status === 'connected' ? 'bg-green-500' : systemStatus.mongodb?.status === 'warning' ? 'bg-amber-500' : systemStatus.mongodb?.status === 'error' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                  <svg className="w-5 h-5" style={{ color: '#47A248' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05A73.49 73.49 0 0111.91 24h.481c.114-1.032.284-2.056.51-3.07.417-.296.604-.463.85-.693a11.342 11.342 0 003.639-8.464c.01-.814-.103-1.662-.197-2.218zm-5.336 8.195s0-8.291.275-8.29c.213 0 .49 10.695.49 10.695-.381-.045-.765-1.76-.765-2.405z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-900">MongoDB</span>
                </a>
                <button onClick={() => setInfoTooltip('mongodb')} className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold transition-all">i</button>
              </div>
              <div className="flex flex-col gap-2">
                <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all relative">
                  <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${systemStatus.vercel?.status === 'connected' ? 'bg-green-500' : systemStatus.vercel?.status === 'warning' ? 'bg-amber-500' : systemStatus.vercel?.status === 'error' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                  <svg className="w-5 h-5" style={{ color: '#000' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 22.525H0l12-21.05 12 21.05z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-900">Vercel</span>
                </a>
                <button onClick={() => setInfoTooltip('vercel')} className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold transition-all">i</button>
              </div>
              <div className="flex flex-col gap-2">
                <a href="https://render.com" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all relative">
                  <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${systemStatus.render?.status === 'connected' ? 'bg-green-500' : systemStatus.render?.status === 'warning' ? 'bg-amber-500' : systemStatus.render?.status === 'error' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                  <svg className="w-5 h-5" style={{ color: '#46E3B7' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 19.5a7.5 7.5 0 110-15 7.5 7.5 0 010 15z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-900">Render</span>
                </a>
                <button onClick={() => setInfoTooltip('render')} className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold transition-all">i</button>
              </div>
              <div className="flex flex-col gap-2">
                <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all relative">
                  <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${systemStatus.cloudinary?.status === 'connected' ? 'bg-green-500' : systemStatus.cloudinary?.status === 'warning' ? 'bg-amber-500' : systemStatus.cloudinary?.status === 'error' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                  <svg className="w-5 h-5" style={{ color: '#3448C5' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.5 16.5h-9v-3h9v3zm0-4.5h-9V9h9v3zm0-6h-9V7h9v2h-2V7h-2v2H7v2h2V9h2v2h2v-3H7V9h2V7h2v2zm4 6h-2V9h2v2z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-900">Cloudinary</span>
                </a>
                <button onClick={() => setInfoTooltip('cloudinary')} className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold transition-all">i</button>
              </div>
              <div className="flex flex-col gap-2">
                <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all relative">
                  <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${systemStatus.firebase?.status === 'connected' ? 'bg-green-500' : systemStatus.firebase?.status === 'warning' ? 'bg-amber-500' : systemStatus.firebase?.status === 'error' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                  <svg className="w-5 h-5" style={{ color: '#FFCA28' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.89 15.673L6.255.461A.542.542 0 017.27.289l2.543 4.771zm16.794 3.692l-2.25-14a.54.54 0 00-.919-.295L3.316 19.365l7.856 4.427a1.621 1.621 0 001.588 0l8.92-4.427zM14.3 7.148l-1.82-3.482a.542.542 0 00-.96 0L3.53 17.984z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-900">Firebase</span>
                </a>
                <button onClick={() => setInfoTooltip('firebase')} className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold transition-all">i</button>
              </div>
              <div className="flex flex-col gap-2">
                <a href="https://app.sendgrid.com" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all relative">
                  <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${systemStatus.sendgrid?.status === 'connected' ? 'bg-green-500' : systemStatus.sendgrid?.status === 'warning' ? 'bg-amber-500' : systemStatus.sendgrid?.status === 'error' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                  <svg className="w-5 h-5" style={{ color: '#1A82E2' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1 17H7v-4h4v4zm0-6H7V7h4v4zm6 6h-4v-4h4v4zm0-6h-4V7h4v4z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-900">SendGrid</span>
                </a>
                <button onClick={() => setInfoTooltip('sendgrid')} className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold transition-all">i</button>
              </div>
              <div className="flex flex-col gap-2">
                <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all relative">
                  <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${systemStatus.twilio?.status === 'connected' ? 'bg-green-500' : systemStatus.twilio?.status === 'warning' ? 'bg-amber-500' : systemStatus.twilio?.status === 'error' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                  <svg className="w-5 h-5" style={{ color: '#F22F46' }} fill="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span className="text-xs font-medium text-gray-900">Twilio</span>
                </a>
                <button onClick={() => setInfoTooltip('twilio')} className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold transition-all">i</button>
              </div>
              <div className="flex flex-col gap-2">
                <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all relative">
                  <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${systemStatus.resend?.status === 'connected' ? 'bg-green-500' : systemStatus.resend?.status === 'warning' ? 'bg-amber-500' : systemStatus.resend?.status === 'error' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                  <svg className="w-5 h-5" style={{ color: '#000' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm2 0v8h16V6l-8 5-8-5z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-900">Resend</span>
                </a>
                <button onClick={() => setInfoTooltip('resend')} className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold transition-all">i</button>
              </div>
              <div className="flex flex-col gap-2">
                <a href="https://www.npmjs.com/package/web-push" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all relative">
                  <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${systemStatus.npm?.status === 'connected' ? 'bg-green-500' : systemStatus.npm?.status === 'warning' ? 'bg-amber-500' : systemStatus.npm?.status === 'error' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                  <svg className="w-5 h-5" style={{ color: '#CB3837' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 4H2v16h20V4zM10.93 6.07c-.59-.59-1.54-.59-2.12 0l-1.07 1.07c-.59.59-.59 1.54 0 2.12l2.12 2.12c.59.59 1.54.59 2.12 0l1.07-1.07c.59-.59.59-1.54 0-2.12l-2.12-2.12zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-900">NPM</span>
                </a>
                <button onClick={() => setInfoTooltip('npm')} className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold transition-all">i</button>
              </div>
              <div className="flex flex-col gap-2">
                <a href="https://www.payplus.co.il" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all relative">
                  <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${systemStatus.payplus?.status === 'connected' ? 'bg-green-500' : systemStatus.payplus?.status === 'warning' ? 'bg-amber-500' : systemStatus.payplus?.status === 'error' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                  <svg className="w-5 h-5" style={{ color: '#00A651' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-900">PayPlus</span>
                </a>
                <button onClick={() => setInfoTooltip('payplus')} className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold transition-all">i</button>
              </div>
              </div>
            </div>
            )}
          </div>
          )}

          {/* 6. מרכז בקרה - רק למנהלים ראשיים */}
          {isSuperAdmin && (
          <Link href="/admin/control-center" className="block rounded-xl overflow-hidden transition-all hover:shadow-lg" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 2px 10px rgba(8, 145, 178, 0.1)' }}>
            <div className="flex items-center justify-between p-2 sm:p-2.5 text-right transition-all hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </span>
                <span className="text-xs font-bold" style={{ color: '#1e3a8a' }}>מרכז בקרה</span>
              </div>
              <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
          )}

          {/* 7. משימות ותיקונים - רק למנהלים ראשיים */}
          {isSuperAdmin && (
          <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 2px 10px rgba(8, 145, 178, 0.1)' }}>
            <button onClick={() => toggleCategory('tasks')} className="w-full flex items-center justify-between p-2 sm:p-2.5 text-right transition-all hover:bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </span>
                <span className="text-xs font-bold" style={{ color: '#1e3a8a' }}>משימות ותיקונים</span>
              </div>
              <svg className={`w-5 h-5 transition-transform ${openCategory === 'tasks' ? 'rotate-180' : ''}`} style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openCategory === 'tasks' && (
            <div className="p-2 pt-0 grid grid-cols-2 gap-1.5 flex-1 min-h-0 scroll-y-auto">
              <Link href="/admin/tasks" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-xs font-medium text-gray-900">כל המשימות</span>
              </Link>
              <Link href="/admin/tasks?filter=pending" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium text-gray-900">ממתינות</span>
              </Link>
              <Link href="/admin/tasks?filter=completed" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xs font-medium text-gray-900">הושלמו</span>
              </Link>
              <Link href="/admin/tasks?action=new" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-xs font-medium text-gray-900">הוסף משימה</span>
              </Link>
              <Link href="/admin/tasks?filter=bugs" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4H5.082c-1.54 0-2.502-1.667-1.732-3L13.732 4c.77-1.333 2.694-1.333 3.464 0L20.66 16c.77 1.333-.192 3-1.732 3z" />
                </svg>
                <span className="text-xs font-medium text-gray-900">באגים</span>
              </Link>
              <Link href="/admin/tasks?filter=features" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span className="text-xs font-medium text-gray-900">פיצרים חדשים</span>
              </Link>
            </div>
            )}
          </div>
          )}

          {/* 8. דוחות מערכת - רק למנהלים ראשיים */}
          {isSuperAdmin && (
          <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 2px 10px rgba(8, 145, 178, 0.1)' }}>
            <button onClick={() => toggleCategory('reports')} className="w-full flex items-center justify-between p-2 sm:p-2.5 text-right transition-all hover:bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                  <ChartBarIcon className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold" style={{ color: '#1e3a8a' }}>דוחות מערכת</span>
              </div>
              <svg className={`w-5 h-5 transition-transform ${openCategory === 'reports' ? 'rotate-180' : ''}`} style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openCategory === 'reports' && (
            <div className="p-2 pt-0 grid grid-cols-2 gap-1.5 flex-1 min-h-0 scroll-y-auto">
              <Link href="/admin/system-reports" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs font-medium text-gray-900">כל הדוחות</span>
              </Link>
              <Link href="/admin/system-reports?tab=seo" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-xs font-medium text-gray-900">SEO Audits</span>
              </Link>
              <Link href="/admin/system-reports?tab=scan" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-xs font-medium text-gray-900">סריקת מערכת</span>
              </Link>
              <Link href="/admin/system-reports?tab=enterprise" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v12m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-xs font-medium text-gray-900">Enterprise</span>
              </Link>
              <Link href="/admin/system-reports?tab=errors" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-xs font-medium text-gray-900">שגיאות מערכת</span>
              </Link>
              <Link href="/admin/errors" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m6.938 4H5.082c-1.54 0-2.502-1.667-1.732-3L13.732 4c.77-1.333 2.694-1.333 3.464 0L20.66 16c.77 1.333-.192 3-1.732 3z" />
                </svg>
                <span className="text-xs font-medium text-gray-900">לוח ניטור שגיאות</span>
              </Link>
              <Link href="/admin/system-reports?tab=downloads" className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="text-xs font-medium text-gray-900">הורדות</span>
              </Link>
            </div>
            )}
          </div>
          )}

          {/* 9. אבטחת מערכת - רק למנהלים ראשיים */}
          {isSuperAdmin && (
          <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 2px 10px rgba(8, 145, 178, 0.1)' }}>
            <button onClick={() => toggleCategory('security')} className="w-full flex items-center justify-between p-2 sm:p-2.5 text-right transition-all hover:bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}>
                  <ShieldIcon className="w-5 h-5" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold" style={{ color: '#1e3a8a' }}>אבטחת מערכת</span>
                  {securityData && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${securityData.overallScore >= 85 ? 'bg-green-100 text-green-700' : securityData.overallScore >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {securityData.overallScore}%
                    </span>
                  )}
                </div>
              </div>
              <svg className={`w-5 h-5 transition-transform ${openCategory === 'security' ? 'rotate-180' : ''}`} style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openCategory === 'security' && (
            <div className="p-2 pt-0 flex-1 min-h-0 scroll-y-auto">
              {securityLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid rgba(8, 145, 178, 0.2)', borderTopColor: '#0891b2' }}></div>
                  <span className="mr-3 text-gray-600">סורק אבטחה...</span>
                </div>
              ) : securityData ? (
                <div className="space-y-4">
                  {/* Overall Score */}
                  <div className={`p-4 rounded-lg ${securityData.overallScore >= 85 ? 'bg-green-50 border border-green-200' : securityData.overallScore >= 70 ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900">ציון אבטחה כללי</span>
                      <span className={`text-2xl font-bold ${securityData.overallScore >= 85 ? 'text-green-600' : securityData.overallScore >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                        {securityData.overallScore}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${securityData.overallScore >= 85 ? 'bg-green-500' : securityData.overallScore >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${securityData.overallScore}%` }}></div>
                    </div>
                  </div>

                  {/* Category Scores */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {securityData.categories && Object.entries(securityData.categories).map(([key, cat]) => (
                      <div key={key} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">{cat.name}</span>
                          <span className={`text-sm font-bold ${cat.score >= 80 ? 'text-green-600' : cat.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{cat.score}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${cat.score >= 80 ? 'bg-green-500' : cat.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${cat.score}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Recommendations */}
                  {securityData.recommendations && securityData.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-gray-900 text-sm">המלצות לשיפור:</h4>
                      {securityData.recommendations.slice(0, 3).map((rec, i) => (
                        <div key={i} className={`p-3 rounded-lg ${rec.priority === 'critical' ? 'bg-red-50 border border-red-200' : rec.priority === 'high' ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
                          <div className="flex items-start gap-2">
                            <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${rec.priority === 'critical' ? 'bg-red-500' : rec.priority === 'high' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                            <div>
                              <p className="text-xs font-medium text-gray-900">{rec.title}</p>
                              <p className="text-xs text-gray-600">{rec.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button onClick={checkSecurity} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      סרוק שוב
                    </button>
                    <Link href="/admin/security" className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      דוח מלא
                    </Link>
                  </div>
                  <div className="pt-2">
                    <Link href="/admin/settings" className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c-.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      הגדרות מערכת
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 text-gray-500">לחץ לסריקת אבטחה</div>
              )}
            </div>
            )}
          </div>
          )}

          {isSuperAdmin && (
          <Link
            href="/admin/errors"
            className="block rounded-xl overflow-hidden transition-all hover:shadow-lg"
            style={{
              border: '2px solid transparent',
              backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              boxShadow: '0 2px 10px rgba(8, 145, 178, 0.1)'
            }}
          >
            <div className="flex items-center justify-between p-2 sm:p-2.5 text-right transition-all hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white"
                  style={{ background: 'linear-gradient(135deg, #e11d48 0%, #dc2626 100%)' }}
                >
                  <ChartBarIcon className="w-5 h-5" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold" style={{ color: '#1e3a8a' }}>
                    ניטור שגיאות
                  </span>
                  <span className="text-xs font-semibold text-red-500">System Error Monitoring</span>
                </div>
              </div>
              <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </Link>
          )}

          {/* 10. דוחות גוגל - רק למנהלים ראשיים */}
          {isSuperAdmin && (
          <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 2px 10px rgba(8, 145, 178, 0.1)' }}>
            <button onClick={() => toggleCategory('google')} className="w-full flex items-center justify-between p-2 sm:p-2.5 text-right transition-all hover:bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ background: 'linear-gradient(135deg, #EA4335 0%, #FBBC05 50%, #34A853 100%)' }}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </span>
                <span className="text-xs font-bold" style={{ color: '#1e3a8a' }}>דוחות גוגל</span>
              </div>
              <svg className={`w-5 h-5 transition-transform ${openCategory === 'google' ? 'rotate-180' : ''}`} style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openCategory === 'google' && (
            <div className="p-2 pt-0 grid grid-cols-2 gap-1.5 flex-1 min-h-0 scroll-y-auto">
              <div className="flex items-center gap-2">
                <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-all">
                  <svg className="w-5 h-5" style={{ color: '#F57C00' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-900">Analytics</span>
                </a>
                <button onClick={() => { navigator.clipboard.writeText('https://analytics.google.com'); alert('הקישור הועתק!'); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all" title="העתק קישור">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all">
                  <svg className="w-5 h-5" style={{ color: '#4285F4' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-900">Search Console</span>
                </a>
                <button onClick={() => { navigator.clipboard.writeText('https://search.google.com/search-console'); alert('הקישור הועתק!'); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all" title="העתק קישור">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <a href="https://ads.google.com" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-all">
                  <svg className="w-5 h-5" style={{ color: '#34A853' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-900">Google Ads</span>
                </a>
                <button onClick={() => { navigator.clipboard.writeText('https://ads.google.com'); alert('הקישור הועתק!'); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all" title="העתק קישור">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <a href="https://tagmanager.google.com" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-cyan-50 hover:bg-cyan-100 transition-all">
                  <svg className="w-5 h-5" style={{ color: '#00ACC1' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-900">Tag Manager</span>
                </a>
                <button onClick={() => { navigator.clipboard.writeText('https://tagmanager.google.com'); alert('הקישור הועתק!'); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all" title="העתק קישור">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <a href="https://pagespeed.web.dev" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-all">
                  <svg className="w-5 h-5" style={{ color: '#EA4335' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2.05v2.02c3.95.49 7 3.85 7 7.93 0 1.63-.5 3.14-1.35 4.4l1.47 1.47C21.36 16.13 22 14.17 22 12c0-5.18-3.95-9.45-9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-5.05.5-9 4.77-9 9.95 0 5.52 4.48 10 10 10 3.87 0 7.22-2.2 8.89-5.42l-1.48-1.48C17.64 17.65 15 19 12 19z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-900">PageSpeed</span>
                </a>
                <button onClick={() => { navigator.clipboard.writeText('https://pagespeed.web.dev'); alert('הקישור הועתק!'); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all" title="העתק קישור">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <a href="https://business.google.com" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-all">
                  <svg className="w-5 h-5" style={{ color: '#FBBC05' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-900">Business Profile</span>
                </a>
                <button onClick={() => { navigator.clipboard.writeText('https://business.google.com'); alert('הקישור הועתק!'); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all" title="העתק קישור">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
            </div>
            )}
          </div>
          )}

          {/* 11. קישורי התחברות - רק למנהלים ראשיים */}
          {isSuperAdmin && (
          <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 2px 10px rgba(8, 145, 178, 0.1)' }}>
            <button onClick={() => toggleCategory('registration')} className="w-full flex items-center justify-between p-2 sm:p-2.5 text-right transition-all hover:bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </span>
                <span className="text-xs font-bold" style={{ color: '#1e3a8a' }}>קישורי התחברות</span>
              </div>
              <svg className={`w-5 h-5 transition-transform ${openCategory === 'registration' ? 'rotate-180' : ''}`} style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openCategory === 'registration' && (
            <div className="p-2 pt-0 grid grid-cols-2 gap-1.5 flex-1 min-h-0 scroll-y-auto">
              <div className="flex items-center gap-2">
                <Link href="/register" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all">
                  <svg className="w-5 h-5" style={{ color: '#1e3a8a' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <span className="text-xs font-medium text-gray-900">הרשמת לקוח</span>
                </Link>
                <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/register'); alert('הקישור הועתק!'); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all" title="העתק קישור">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/register-agent" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-cyan-50 hover:bg-cyan-100 transition-all">
                  <svg className="w-5 h-5" style={{ color: '#7c3aed' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  <span className="text-xs font-medium text-gray-900">הרשמת סוכן</span>
                </Link>
                <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/register-agent'); alert('הקישור הועתק!'); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all" title="העתק קישור">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/register-business" className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-all">
                  <svg className="w-5 h-5" style={{ color: '#059669' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                  </svg>
                  <span className="text-xs font-medium text-gray-900">הרשמת עסק</span>
                </Link>
                <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/register-business'); alert('הקישור הועתק!'); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all" title="העתק קישור">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
            </div>
            )}
          </div>
          )}
          </div>
        </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 sm:gap-2 mb-2 min-w-0">
          {/* New Users Section */}
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5 sm:p-3 min-w-0">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <h2
                className="text-xs sm:text-sm font-bold flex items-center gap-1.5"
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                <UserPlusIcon
                  className="w-4 sm:w-5 h-4 sm:h-5"
                  style={{ color: '#0891b2' }}
                />
                <span>משתמשים חדשים</span>
              </h2>
            </div>
            <div className="space-y-1.5 sm:space-y-2 max-h-72 scroll-y-auto">
              {dashboardData?.newUsers?.length > 0 ? (
                dashboardData.newUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-start justify-between p-2 sm:p-2.5 rounded-md transition-all"
                    style={{
                      border: '2px solid #e5e7eb',
                      background: 'white',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0891b2';
                      e.currentTarget.style.background =
                        'linear-gradient(135deg, rgba(30, 58, 138, 0.02) 0%, rgba(8, 145, 178, 0.02) 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                          {user.fullName || user.email || user.phone}
                        </p>
                        {(() => {
                          const {
                            label,
                            className: roleClass,
                            Icon: RoleIcon,
                          } = getRoleBadge(user.role);
                          return (
                            <span className={`text-xs px-2 py-1 rounded-full ${roleClass}`}>
                              <span className="flex items-center gap-1">
                                <RoleIcon className="w-4 h-4" />
                                {label}
                              </span>
                            </span>
                          );
                        })()}
                      </div>
                      {user.referrerName && (
                        <p className="text-xs text-green-600 mb-1 flex items-center gap-1">
                          <LinkMarkIcon className="w-4 h-4" />
                          <span>
                            {'הופנה ע&quot;י:'} {user.referrerName}
                          </span>
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('he-IL')} בשעה{' '}
                        {new Date(user.createdAt).toLocaleTimeString('he-IL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">אין משתמשים חדשים</div>
              )}
            </div>
          </section>

          {/* Recent Orders Section */}
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5 sm:p-3 min-w-0">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <h2
                className="text-xs sm:text-sm font-bold flex items-center gap-1.5"
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                <ClipboardIcon
                  className="w-4 sm:w-5 h-4 sm:h-5"
                  style={{ color: '#0891b2' }}
                />
                <span>הזמנות אחרונות</span>
              </h2>
            </div>

            {dashboardData?.recentOrders?.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block scroll-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '2px solid #0891b2' }}>
                        <th
                          className="text-right py-3 px-3 text-sm font-semibold"
                          style={{ color: '#1e3a8a' }}
                        >
                          מוצר
                        </th>
                        <th
                          className="text-right py-3 px-3 text-sm font-semibold"
                          style={{ color: '#1e3a8a' }}
                        >
                          לקוח
                        </th>
                        <th
                          className="text-right py-3 px-3 text-sm font-semibold"
                          style={{ color: '#1e3a8a' }}
                        >
                          סכום
                        </th>
                        <th
                          className="text-right py-3 px-3 text-sm font-semibold"
                          style={{ color: '#1e3a8a' }}
                        >
                          עמלה
                        </th>
                        <th
                          className="text-right py-3 px-3 text-sm font-semibold"
                          style={{ color: '#1e3a8a' }}
                        >
                          סטטוס
                        </th>
                        <th
                          className="text-right py-3 px-3 text-sm font-semibold"
                          style={{ color: '#1e3a8a' }}
                        >
                          תאריך
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.recentOrders.map((order) => (
                        <tr
                          key={order._id}
                          className="border-b border-gray-100 transition-all"
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              'linear-gradient(135deg, rgba(30, 58, 138, 0.02) 0%, rgba(8, 145, 178, 0.02) 100%)')
                          }
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                        >
                          <td className="py-3 px-3 text-sm">{order.productName}</td>
                          <td className="py-3 px-3 text-sm">{order.customerName}</td>
                          <td
                            className="py-3 px-3 text-sm font-semibold"
                            style={{ color: '#1e3a8a' }}
                          >
                            ₪{(order.totalAmount || 0).toLocaleString()}
                          </td>
                          <td
                            className="py-3 px-3 text-sm font-semibold"
                            style={{ color: '#16a34a' }}
                          >
                            ₪{(order.commissionAmount || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                order.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : order.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString('he-IL')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {dashboardData.recentOrders.map((order) => (
                    <div
                      key={order._id}
                      className="p-4 rounded-lg transition-all"
                      style={{
                        border: '2px solid #e5e7eb',
                        background: 'white',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#0891b2';
                        e.currentTarget.style.background =
                          'linear-gradient(135deg, rgba(30, 58, 138, 0.02) 0%, rgba(8, 145, 178, 0.02) 100%)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.background = 'white';
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 mb-1">
                            {order.productName}
                          </p>
                          <p className="text-xs text-gray-500">{order.customerName}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                            order.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : order.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">סכום:</span>
                          <span className="font-semibold mr-1" style={{ color: '#1e3a8a' }}>
                            ₪{(order.totalAmount || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">עמלה:</span>
                          <span className="font-semibold mr-1" style={{ color: '#16a34a' }}>
                            ₪{(order.commissionAmount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString('he-IL')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">אין הזמנות עדיין</div>
            )}
          </section>
        </div>

        {/* ===== TENANT / STORE STATISTICS ===== */}
        {isSuperAdmin && tenantStats?.tenants?.length > 0 && (
        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5 sm:p-3 mb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs sm:text-sm font-bold flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              <svg className="w-4 sm:w-5 h-4 sm:h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
              <span>סטטיסטיקות חנויות</span>
            </h2>
            <div className="flex items-center gap-1">
              {['month', 'week', 'year', 'all'].map((p) => (
                <button
                  key={p}
                  onClick={async () => {
                    setTenantStatsPeriod(p);
                    try {
                      const res = await fetch(`/api/admin/tenant-stats?period=${p}`);
                      if (res.ok) {
                        const data = await res.json();
                        setTenantStats(data);
                      }
                    } catch (e) { console.error(e); }
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-medium transition-all"
                  style={{
                    background: tenantStatsPeriod === p ? 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' : '#f3f4f6',
                    color: tenantStatsPeriod === p ? 'white' : '#6b7280',
                  }}
                >
                  {p === 'month' ? 'חודש' : p === 'week' ? 'שבוע' : p === 'year' ? 'שנה' : 'הכל'}
                </button>
              ))}
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="rounded-lg p-2 text-center" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.05), rgba(8,145,178,0.05))' }}>
              <div className="text-lg font-extrabold" style={{ color: '#1e3a8a' }}>{tenantStats.totals?.activeTenants || 0}</div>
              <div className="text-[10px] text-gray-500">חנויות פעילות</div>
            </div>
            <div className="rounded-lg p-2 text-center" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.05), rgba(8,145,178,0.05))' }}>
              <div className="text-lg font-extrabold" style={{ color: '#0891b2' }}>{tenantStats.totals?.totalOrders || 0}</div>
              <div className="text-[10px] text-gray-500">הזמנות בתקופה</div>
            </div>
            <div className="rounded-lg p-2 text-center" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.05), rgba(8,145,178,0.05))' }}>
              <div className="text-lg font-extrabold" style={{ color: '#1e3a8a' }}>₪{(tenantStats.totals?.totalSales || 0).toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">מכירות בתקופה</div>
            </div>
            <div className="rounded-lg p-2 text-center" style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.05), rgba(8,145,178,0.05))' }}>
              <div className="text-lg font-extrabold" style={{ color: '#16a34a' }}>₪{(tenantStats.totals?.totalPlatformCommission || 0).toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">עמלת פלטפורמה</div>
            </div>
          </div>

          {/* Bar Chart - Sales per Store */}
          <div className="mb-3">
            <h3 className="text-[11px] font-semibold text-gray-600 mb-2">מכירות לפי חנות</h3>
            <div className="space-y-1.5">
              {tenantStats.tenants.map((t) => {
                const maxSales = Math.max(...tenantStats.tenants.map(x => x.totalSales), 1);
                const pct = (t.totalSales / maxSales) * 100;
                return (
                  <div key={String(t.tenantId)} className="flex items-center gap-2">
                    <div className="w-24 sm:w-32 text-[10px] font-medium text-gray-700 truncate text-right">{t.tenantName}</div>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%`, background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color: pct > 40 ? 'white' : '#1e3a8a' }}>
                        ₪{t.totalSales.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Products per Store Chart */}
          <div className="mb-3">
            <h3 className="text-[11px] font-semibold text-gray-600 mb-2">מוצרים לפי חנות</h3>
            <div className="space-y-1.5">
              {tenantStats.tenants.map((t) => {
                const maxProducts = Math.max(...tenantStats.tenants.map(x => x.productCount || 0), 1);
                const pct = ((t.productCount || 0) / maxProducts) * 100;
                return (
                  <div key={String(t.tenantId)} className="flex items-center gap-2">
                    <div className="w-24 sm:w-32 text-[10px] font-medium text-gray-700 truncate text-right">{t.tenantName}</div>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%`, background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)' }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color: pct > 40 ? 'white' : '#0891b2' }}>
                        {t.productCount || 0}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {tenantMediaUsage?.tenants?.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-semibold text-gray-600">שימוש מדיה לפי חנות</h3>
                <div className="text-[10px] text-gray-400">
                  עודכן: {tenantMediaUsage.generatedAt ? new Date(tenantMediaUsage.generatedAt).toLocaleString('he-IL') : '-'}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <div className="rounded-lg p-2 text-center" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.05), rgba(8,145,178,0.05))' }}>
                  <div className="text-lg font-extrabold" style={{ color: '#1e3a8a' }}>{tenantMediaUsage.totals?.imageCount || 0}</div>
                  <div className="text-[10px] text-gray-500">תמונות (סך הכל)</div>
                </div>
                <div className="rounded-lg p-2 text-center" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.05), rgba(8,145,178,0.05))' }}>
                  <div className="text-lg font-extrabold" style={{ color: '#0891b2' }}>{tenantMediaUsage.totals?.uniqueImageCount || 0}</div>
                  <div className="text-[10px] text-gray-500">תמונות ייחודיות</div>
                </div>
                <div className="rounded-lg p-2 text-center" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.05), rgba(8,145,178,0.05))' }}>
                  <div className="text-lg font-extrabold" style={{ color: '#1e3a8a' }}>{tenantMediaUsage.totals?.videoCount || 0}</div>
                  <div className="text-[10px] text-gray-500">וידאו (מוצרים עם וידאו)</div>
                </div>
                <div className="rounded-lg p-2 text-center" style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.05), rgba(8,145,178,0.05))' }}>
                  <div className="text-lg font-extrabold" style={{ color: '#16a34a' }}>{tenantMediaUsage.totals?.productCount || 0}</div>
                  <div className="text-[10px] text-gray-500">מוצרים</div>
                </div>
              </div>

              <div className="scroll-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '2px solid #0891b2' }}>
                      <th className="text-right py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>חנות</th>
                      <th className="text-right py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>מוצרים</th>
                      <th className="text-right py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>תמונות</th>
                      <th className="text-right py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>ייחודיות</th>
                      <th className="text-right py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>וידאו</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenantMediaUsage.tenants.map((t) => (
                      <tr key={String(t.tenantId)} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-2 font-medium">{t.tenantName}</td>
                        <td className="py-2 px-2">{t.productCount || 0}</td>
                        <td className="py-2 px-2">{t.imageCount || 0}</td>
                        <td className="py-2 px-2">{t.uniqueImageCount || 0}</td>
                        <td className="py-2 px-2">{t.videoCount || 0}</td>
                      </tr>
                    ))}
                    <tr className="font-bold" style={{ borderTop: '2px solid #0891b2' }}>
                      <td className="py-2 px-2" style={{ color: '#1e3a8a' }}>סה&quot;כ</td>
                      <td className="py-2 px-2">{tenantMediaUsage.totals?.productCount || 0}</td>
                      <td className="py-2 px-2">{tenantMediaUsage.totals?.imageCount || 0}</td>
                      <td className="py-2 px-2">{tenantMediaUsage.totals?.uniqueImageCount || 0}</td>
                      <td className="py-2 px-2">{tenantMediaUsage.totals?.videoCount || 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Table */}
          <div className="scroll-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '2px solid #0891b2' }}>
                  <th className="text-right py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>חנות</th>
                  <th className="text-right py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>מוצרים</th>
                  <th className="text-right py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>הזמנות</th>
                  <th className="text-right py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>מכירות</th>
                  <th className="text-right py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>ממוצע</th>
                  <th className="text-right py-2 px-2 font-semibold" style={{ color: '#16a34a' }}>עמלה</th>
                </tr>
              </thead>
              <tbody>
                {tenantStats.tenants.map((t) => (
                  <tr key={String(t.tenantId)} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-2 font-medium">{t.tenantName}</td>
                    <td className="py-2 px-2">{t.productCount || 0}</td>
                    <td className="py-2 px-2">{t.orderCount}</td>
                    <td className="py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>₪{t.totalSales.toLocaleString()}</td>
                    <td className="py-2 px-2 text-gray-500">₪{(t.avgOrderValue || 0).toLocaleString()}</td>
                    <td className="py-2 px-2 font-semibold" style={{ color: '#16a34a' }}>₪{t.platformCommission.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="font-bold" style={{ borderTop: '2px solid #0891b2' }}>
                  <td className="py-2 px-2" style={{ color: '#1e3a8a' }}>סה&quot;כ</td>
                  <td className="py-2 px-2">{tenantStats.tenants.reduce((s, t) => s + (t.productCount || 0), 0)}</td>
                  <td className="py-2 px-2">{tenantStats.totals?.totalOrders || 0}</td>
                  <td className="py-2 px-2" style={{ color: '#1e3a8a' }}>₪{(tenantStats.totals?.totalSales || 0).toLocaleString()}</td>
                  <td className="py-2 px-2"></td>
                  <td className="py-2 px-2" style={{ color: '#16a34a' }}>₪{(tenantStats.totals?.totalPlatformCommission || 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        )}

        </div>
      </div>
      </div>
    </main>
  );
}
