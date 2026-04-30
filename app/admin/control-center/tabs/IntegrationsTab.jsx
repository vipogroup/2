'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const SERVICE_META = {
  mongodb:     { name: 'MongoDB',           desc: 'מסד נתונים ראשי',             icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4', color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
  payplus:     { name: 'PayPlus',            desc: 'סליקה ותשלומים',              icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
  priority:    { name: 'Priority ERP',       desc: 'חשבונאות וסנכרון',            icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
  cloudinary:  { name: 'Cloudinary',         desc: 'CDN תמונות ווידאו',            icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z', color: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
  whatsapp:    { name: 'WhatsApp',           desc: 'הודעות ווטסאפ',               icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
  twilio:      { name: 'Twilio',             desc: 'SMS / OTP קודי אימות',        icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', color: '#d946ef', bg: 'rgba(217,70,239,0.08)' },
  resend:      { name: 'Email (Resend)',     desc: 'שליחת מיילים',                icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
  sendgrid:    { name: 'SendGrid',           desc: 'מייל (חלופי ל-Resend)',       icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: '#1c7c54', bg: 'rgba(28,124,84,0.08)' },
  vercel:      { name: 'Vercel',             desc: 'Hosting ו-Deploy',            icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', color: '#1f2937', bg: 'rgba(31,41,55,0.08)' },
  github:      { name: 'GitHub',             desc: 'ניהול קוד מקור',              icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', color: '#1f2937', bg: 'rgba(31,41,55,0.08)' },
  npm:         { name: 'NPM',               desc: 'חבילות ותלויות',               icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  googleOAuth: { name: 'Google OAuth',       desc: 'התחברות עם Google',           icon: 'M12 11c0-.552.448-1 1-1h7.5c.552 0 1 .448 1 1s-.448 1-1 1H13c-.552 0-1-.448-1-1z', color: '#4285F4', bg: 'rgba(66,133,244,0.08)' },
  authSecrets: { name: 'JWT / NextAuth',     desc: 'מפתחות אימות סשן',            icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
  webPush:     { name: 'Web Push',           desc: 'התראות דחיפה בדפדפן',         icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', color: '#ea580c', bg: 'rgba(234,88,12,0.08)' },
  googleAds:   { name: 'Google Ads',         desc: 'אינטגרציה וסנכרון (DB)',       icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  googleAdsEnv: { name: 'Google Ads (env)',  desc: 'משתני OAuth ב-.env',          icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z', color: '#ca8a04', bg: 'rgba(202,138,4,0.1)' },
  studioSso:   { name: 'Studio SSO',         desc: 'אימות לסטודיו / SSO',         icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: '#0d9488', bg: 'rgba(13,148,136,0.08)' },
  publicSite:  { name: 'כתובת אתר',          desc: 'URL ציבורי לקישורים',         icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9', color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
};

export default function IntegrationsTab({ user }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [googleAdsOAuthBanner, setGoogleAdsOAuthBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState({});
  const [deepScanLoading, setDeepScanLoading] = useState(false);
  const [deepScanData, setDeepScanData] = useState(null);
  const [connectionLogs, setConnectionLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showLogsWindow, setShowLogsWindow] = useState(false);
  const [allServices, setAllServices] = useState({});
  const [lastCheck, setLastCheck] = useState(null);
  const [googleAds, setGoogleAds] = useState({
    connected: false,
    configured: { oauthClient: false, developerToken: false, managerCustomerId: false },
    accessTokenExpiresAt: null,
    lastSyncAt: null,
    snapshot: null,
  });
  const [googleAdsConfig, setGoogleAdsConfig] = useState({
    clientId: '',
    clientSecret: '',
    developerToken: '',
    managerCustomerId: '',
    redirectUri: '',
  });
  const [googleAdsConfigMeta, setGoogleAdsConfigMeta] = useState(null);
  const [integrations, setIntegrations] = useState({
    payplus: { connected: false, status: 'checking', lastCheck: null },
    priority: { connected: false, status: 'checking', lastCheck: null },
  });

  const fetchConnectionLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/admin/error-logs?limit=120&resolved=false');
      if (!res.ok) return;

      const data = await res.json();
      const logs = (data.logs || []).filter((log) => {
        const source = String(log?.source || '').toLowerCase();
        const message = String(log?.message || '').toLowerCase();

        if (source.startsWith('integration_scan:')) return true;

        return (
          source.includes('payplus') ||
          source.includes('priority') ||
          source.includes('cloudinary') ||
          source.includes('whatsapp') ||
          source.includes('twilio') ||
          source.includes('resend') ||
          source.includes('vercel') ||
          source.includes('mongodb') ||
          message.includes('connect') ||
          message.includes('connection') ||
          message.includes('integration') ||
          message.includes('priority') ||
          message.includes('payplus')
        );
      });

      setConnectionLogs(logs.slice(0, 60));
    } catch (err) {
      console.error('Failed to fetch connection logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const fetchAllStatuses = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes] = await Promise.all([
        fetch('/api/admin/system-status'),
        checkPayPlusConnection(),
        checkPriorityConnection(),
        checkGoogleAdsStatus(),
        loadGoogleAdsConfig(),
      ]);
      if (statusRes.ok) {
        const data = await statusRes.json();
        setAllServices(data.results || {});
        setLastCheck(data.timestamp);
      }
    } catch (err) {
      console.error('Failed to fetch system status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAllStatuses();
  }, [user, fetchAllStatuses]);

  useEffect(() => {
    if (!user) return;
    const err = searchParams.get('googleAdsError');
    const oauthErr = searchParams.get('googleOAuthError');
    const connected = searchParams.get('googleAdsConnected');
    if (!err && !oauthErr && connected !== '1') return;

    if (connected === '1') {
      setGoogleAdsOAuthBanner({ type: 'success', text: 'Google Ads חובר בהצלחה.' });
      fetch('/api/admin/google-ads/status')
        .then((res) => res.json())
        .then((data) => {
          if (data?.ok) setGoogleAds(data);
        })
        .catch(() => {});
    } else if (err) {
      let text = 'התחברות ל-Google Ads נכשלה.';
      if (err === 'oauth_denied') text = 'ביטלת את ההרשאה ב-Google.';
      else if (err === 'invalid_callback') text = 'תגובת OAuth לא תקינה (חסר code או state).';
      else if (err === 'invalid_state') text = 'פג תוקף אבטחת ההתחברות — נסו שוב מ«התחבר ל-Google Ads».';
      else if (err === 'connect_failed') text = 'לא ניתן להתחיל התחברות (בדקו הגדרות OAuth).';
      else if (err === 'exchange_failed') {
        if (oauthErr === 'redirect_uri_mismatch') {
          text =
            'ה-Redirect URI לא תואם (לעיתים www מול apex). הגדירו Redirect זהה ב-Google Cloud ובשדה למטה או ב-GOOGLE_ADS_REDIRECT_URI ב-Vercel.';
        } else if (oauthErr === 'invalid_client') {
          text = 'Client ID או Client Secret שגויים — וודאו התאמה לזוג OAuth ב-Google Cloud וב-Vercel.';
        } else if (oauthErr === 'invalid_grant') {
          text = 'קוד ההרשאה פג או כבר נוצל — נסו להתחבר שוב.';
        } else if (oauthErr) {
          text = `שגיאת OAuth: ${oauthErr}`;
        } else {
          text = 'החלפת קוד לטוקן נכשלה — בדקו לוגי פונקציות ב-Vercel.';
        }
      }
      setGoogleAdsOAuthBanner({ type: 'error', text });
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete('googleAdsError');
    next.delete('googleOAuthError');
    next.delete('googleAdsConnected');
    const q = next.toString();
    router.replace(`/admin/control-center${q ? `?${q}` : ''}`);
  }, [user, searchParams, router]);

  useEffect(() => {
    if (user) {
      fetchConnectionLogs();
    }
  }, [user, fetchConnectionLogs]);

  async function checkPayPlusConnection() {
    try {
      const res = await fetch('/api/admin/payplus/transactions?limit=1');
      const data = await res.json();
      setIntegrations(prev => ({
        ...prev,
        payplus: {
          connected: res.ok,
          status: res.ok ? 'connected' : 'error',
          lastCheck: new Date().toISOString(),
          stats: data.stats,
          error: data.error,
        },
      }));
    } catch (err) {
      setIntegrations(prev => ({
        ...prev,
        payplus: { connected: false, status: 'error', lastCheck: new Date().toISOString(), error: err.message },
      }));
    }
  }

  async function checkPriorityConnection() {
    try {
      const res = await fetch('/api/admin/priority/status');
      const data = await res.json();
      setIntegrations(prev => ({
        ...prev,
        priority: {
          connected: data.connected,
          status: data.connected ? 'connected' : (data.configured ? 'error' : 'not_configured'),
          lastCheck: new Date().toISOString(),
          environment: data.environment,
          companyCode: data.companyCode,
          stats: data.stats,
          error: data.connectionMessage,
        },
      }));
    } catch (err) {
      setIntegrations(prev => ({
        ...prev,
        priority: { connected: false, status: 'error', lastCheck: new Date().toISOString(), error: err.message },
      }));
    }
  }

  async function checkGoogleAdsStatus() {
    try {
      const res = await fetch('/api/admin/google-ads/status');
      const data = await res.json();
      if (res.ok && data.ok) {
        setGoogleAds(data);
      }
    } catch (err) {
      console.error('Google Ads status check failed:', err);
    }
  }

  async function loadGoogleAdsConfig() {
    try {
      const res = await fetch('/api/admin/google-ads/config');
      const data = await res.json();
      if (res.ok && data.ok) {
        setGoogleAdsConfigMeta(data.config);
        setGoogleAdsConfig((prev) => ({
          ...prev,
          clientId: data.config.clientId || '',
          managerCustomerId: data.config.managerCustomerId || '',
          redirectUri: data.config.redirectUri || '',
          clientSecret: '',
          developerToken: '',
        }));
      }
    } catch (err) {
      console.error('Google Ads config load failed:', err);
    }
  }

  async function saveGoogleAdsConfig() {
    setTesting((prev) => ({ ...prev, googleAdsConfig: true }));
    try {
      const res = await fetch('/api/admin/google-ads/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(googleAdsConfig),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data?.error || 'שמירת Google Ads נכשלה');
        return;
      }
      setGoogleAdsConfigMeta(data.config || null);
      setGoogleAdsConfig((prev) => ({ ...prev, clientSecret: '', developerToken: '' }));
      await checkGoogleAdsStatus();
      alert('הגדרות Google Ads נשמרו');
    } catch (err) {
      alert('שגיאת רשת בשמירת Google Ads');
    } finally {
      setTesting((prev) => ({ ...prev, googleAdsConfig: false }));
    }
  }

  async function connectGoogleAds() {
    window.location.href = '/api/admin/google-ads/connect';
  }

  async function syncGoogleAds() {
    setTesting((prev) => ({ ...prev, googleAdsSync: true }));
    try {
      const res = await fetch('/api/admin/google-ads/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data?.error || 'סנכרון Google Ads נכשל');
        return;
      }
      await checkGoogleAdsStatus();
      alert('סנכרון Google Ads הושלם');
    } catch (err) {
      alert('שגיאת רשת בסנכרון Google Ads');
    } finally {
      setTesting((prev) => ({ ...prev, googleAdsSync: false }));
    }
  }

  async function disconnectGoogleAds() {
    if (!confirm('לנתק את Google Ads מהמערכת?')) return;
    setTesting((prev) => ({ ...prev, googleAdsDisconnect: true }));
    try {
      const res = await fetch('/api/admin/google-ads/disconnect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data?.error || 'ניתוק Google Ads נכשל');
        return;
      }
      await checkGoogleAdsStatus();
      alert('Google Ads נותק בהצלחה');
    } catch (err) {
      alert('שגיאת רשת בניתוק Google Ads');
    } finally {
      setTesting((prev) => ({ ...prev, googleAdsDisconnect: false }));
    }
  }

  async function testConnection(type) {
    setTesting(prev => ({ ...prev, [type]: true }));
    if (type === 'payplus') await checkPayPlusConnection();
    else if (type === 'priority') await checkPriorityConnection();
    else if (type === 'googleAds') await checkGoogleAdsStatus();
    else await fetchAllStatuses();
    setTesting(prev => ({ ...prev, [type]: false }));
  }

  async function runDeepScan() {
    setDeepScanLoading(true);
    try {
      const res = await fetch('/api/admin/system-status?deep=1');
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Deep scan failed');
      }

      setAllServices(data.results || {});
      setLastCheck(data.timestamp || new Date().toISOString());
      setDeepScanData(data.deepScan || null);

      await Promise.all([
        checkPayPlusConnection(),
        checkPriorityConnection(),
        checkGoogleAdsStatus(),
        fetchConnectionLogs(),
      ]);

      setShowLogsWindow(true);
    } catch (err) {
      console.error('Deep scan failed:', err);
      alert(err?.message ? `סריקה מעמיקה נכשלה: ${err.message}` : 'סריקה מעמיקה נכשלה');
    } finally {
      setDeepScanLoading(false);
    }
  }

  function normalizeStatus(svc) {
    if (!svc) return 'checking';
    if (svc.status === 'connected') return 'connected';
    if (svc.status === 'warning') return 'warning';
    return 'error';
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'connected':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-200"><span className="w-2 h-2 bg-green-500 rounded-full" />מחובר</span>;
      case 'warning':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-semibold border border-yellow-200"><span className="w-2 h-2 bg-yellow-500 rounded-full" />חלקי</span>;
      case 'error':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-semibold border border-red-200"><span className="w-2 h-2 bg-red-500 rounded-full" />שגיאה</span>;
      case 'not_configured':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-semibold border border-yellow-200"><span className="w-2 h-2 bg-yellow-500 rounded-full" />לא מוגדר</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-xs font-semibold border border-gray-200"><span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />בודק...</span>;
    }
  };

  const getSmallStatusIcon = (status) => {
    if (status === 'connected') return <span className="text-green-600 font-bold text-[11px]">✓ מחובר</span>;
    if (status === 'warning') return <span className="text-amber-600 font-bold text-[11px]">~ חלקי</span>;
    if (status === 'error') return <span className="text-red-600 font-bold text-[11px]">✗ שגיאה</span>;
    return <span className="text-gray-400 font-bold text-[11px]">... בודק</span>;
  };

  const gradientBorder = {
    border: '2px solid transparent',
    backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, border-box',
  };

  const additionalServiceKeys = Object.keys(SERVICE_META).filter(k => allServices[k] || k === 'mongodb');
  const unresolvedConnectionErrors = connectionLogs.filter((log) => log?.resolved !== true).length;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* ── Header + Stats ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-700">חיבורים למערכות חיצוניות</h2>
          {lastCheck && <div className="text-[10px] text-gray-400 mt-0.5">בדיקה אחרונה: {new Date(lastCheck).toLocaleString('he-IL')}</div>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllStatuses}
            disabled={loading}
            className="px-4 py-2 text-white rounded-lg flex items-center gap-2 text-xs font-semibold disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            רענן הכל
          </button>

          <button
            onClick={runDeepScan}
            disabled={deepScanLoading}
            className="px-4 py-2 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-800 text-xs font-semibold disabled:opacity-50 flex items-center gap-2"
          >
            {deepScanLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l-2 2m2-2l2 2m4 8v3m0 0l-2-2m2 2l2-2M4 12a8 8 0 0112.906-6.32M20 12a8 8 0 01-12.906 6.32" />
              </svg>
            )}
            סריקה מעמיקה
          </button>

          <button
            onClick={() => {
              const next = !showLogsWindow;
              setShowLogsWindow(next);
              if (next) fetchConnectionLogs();
            }}
            className="px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold"
          >
            לוג שגיאות חיבור ({unresolvedConnectionErrors})
          </button>
        </div>
      </div>

      {deepScanData && (
        <div className="bg-white rounded-xl border border-cyan-100 shadow-sm p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-bold text-cyan-800">תוצאות סריקה מעמיקה</h3>
              <p className="text-[11px] text-cyan-700 mt-0.5">
                הרצה: {deepScanData.runId || '-'} | משך: {deepScanData.durationMs || 0}ms
              </p>
            </div>
            <div className="text-[11px] text-gray-500">
              הסתיים: {deepScanData.completedAt ? new Date(deepScanData.completedAt).toLocaleString('he-IL') : '-'}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            <div className="rounded-lg border border-green-100 bg-green-50 p-2 text-center">
              <div className="text-[10px] text-green-700">מחוברים</div>
              <div className="text-lg font-bold text-green-800">{deepScanData.summary?.connected || 0}</div>
            </div>
            <div className="rounded-lg border border-yellow-100 bg-yellow-50 p-2 text-center">
              <div className="text-[10px] text-yellow-700">אזהרות</div>
              <div className="text-lg font-bold text-yellow-800">{deepScanData.summary?.warning || 0}</div>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50 p-2 text-center">
              <div className="text-[10px] text-red-700">שגיאות</div>
              <div className="text-lg font-bold text-red-800">{deepScanData.summary?.error || 0}</div>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-center">
              <div className="text-[10px] text-blue-700">סה&quot;כ שירותים</div>
              <div className="text-lg font-bold text-blue-800">{deepScanData.summary?.total || 0}</div>
            </div>
            <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-2 text-center">
              <div className="text-[10px] text-cyan-700">לוגים שנרשמו</div>
              <div className="text-lg font-bold text-cyan-800">{deepScanData.summary?.logged || 0}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-center">
              <div className="text-[10px] text-gray-600">מניעת כפילויות</div>
              <div className="text-lg font-bold text-gray-800">{deepScanData.summary?.deduplicated || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Integration Cards: PayPlus + Priority ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PayPlus */}
        <div className="rounded-xl overflow-hidden shadow-sm" style={gradientBorder}>
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xs font-extrabold" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>PP</div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">PayPlus</h3>
                  <p className="text-xs text-gray-500">סליקת אשראי ותשלומים</p>
                </div>
              </div>
              {getStatusBadge(integrations.payplus.status)}
            </div>
            {integrations.payplus.stats && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-green-50 rounded-lg p-2.5 text-center border border-green-100">
                  <div className="text-lg font-bold text-green-700">{integrations.payplus.stats.success?.count || 0}</div>
                  <div className="text-[10px] text-green-600">מוצלחות</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2.5 text-center border border-red-100">
                  <div className="text-lg font-bold text-red-700">{integrations.payplus.stats.failed?.count || 0}</div>
                  <div className="text-[10px] text-red-600">נכשלות</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-2.5 text-center border border-yellow-100">
                  <div className="text-lg font-bold text-yellow-700">{integrations.payplus.stats.refund?.count || 0}</div>
                  <div className="text-[10px] text-yellow-600">החזרים</div>
                </div>
              </div>
            )}
            {integrations.payplus.error && integrations.payplus.status === 'error' && (
              <div className="p-2.5 bg-red-50 rounded-lg text-red-700 text-xs mb-3 border border-red-200">{integrations.payplus.error}</div>
            )}
          </div>
          <div className="bg-gray-50 px-5 py-3 flex items-center justify-between border-t border-gray-100">
            <div className="text-[10px] text-gray-400">{integrations.payplus.lastCheck && `בדיקה: ${new Date(integrations.payplus.lastCheck).toLocaleTimeString('he-IL')}`}</div>
            <div className="flex gap-2">
              <button onClick={() => testConnection('payplus')} disabled={testing.payplus} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1.5">
                {testing.payplus ? <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                בדוק חיבור
              </button>
              <Link href="/admin/finance?tab=transactions" className="px-3 py-1.5 text-white rounded-lg text-xs font-medium" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>צפה בעסקאות</Link>
            </div>
          </div>
        </div>

        {/* Priority */}
        <div className="rounded-xl overflow-hidden shadow-sm" style={{ ...gradientBorder, backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #059669, #10b981)' }}>
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xs font-extrabold" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>ERP</div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">Priority ERP</h3>
                  <p className="text-xs text-gray-500">סנכרון לקוחות, הזמנות, חשבוניות</p>
                </div>
              </div>
              {getStatusBadge(integrations.priority.status)}
            </div>
            {integrations.priority.status === 'connected' && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                  <div className="text-[10px] text-blue-600 mb-0.5">סביבה</div>
                  <div className="text-sm font-bold text-blue-800">{integrations.priority.environment || 'לא ידוע'}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                  <div className="text-[10px] text-blue-600 mb-0.5">קוד חברה</div>
                  <div className="text-sm font-bold font-mono text-blue-800">{integrations.priority.companyCode || 'לא ידוע'}</div>
                </div>
              </div>
            )}
            {integrations.priority.error && integrations.priority.status === 'error' && (
              <div className="p-2.5 bg-red-50 rounded-lg text-red-700 text-xs mb-3 border border-red-200">{integrations.priority.error}</div>
            )}
          </div>
          <div className="bg-gray-50 px-5 py-3 flex items-center justify-between border-t border-gray-100">
            <div className="text-[10px] text-gray-400">{integrations.priority.lastCheck && `בדיקה: ${new Date(integrations.priority.lastCheck).toLocaleTimeString('he-IL')}`}</div>
            <button onClick={() => testConnection('priority')} disabled={testing.priority} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1.5">
              {testing.priority ? <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              בדוק חיבור
            </button>
          </div>
        </div>
      </div>

      {/* ── Google Ads Integration (Full OAuth + Sync) ── */}
      <div className="rounded-xl overflow-hidden shadow-sm" style={{ ...gradientBorder, backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xs font-extrabold" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>GAds</div>
              <div>
                <h3 className="text-base font-bold text-gray-800">Google Ads</h3>
                <p className="text-xs text-gray-500">OAuth, סנכרון קמפיינים ועלויות מתוך המערכת</p>
              </div>
            </div>
            {getStatusBadge(googleAds.connected ? 'connected' : (googleAds.configured?.oauthClient ? 'warning' : 'not_configured'))}
          </div>

          {googleAdsOAuthBanner && (
            <div
              className={`mb-3 px-3 py-2.5 rounded-lg text-xs border ${
                googleAdsOAuthBanner.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {googleAdsOAuthBanner.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">OAuth Client ID</label>
              <input
                value={googleAdsConfig.clientId}
                onChange={(e) => setGoogleAdsConfig((prev) => ({ ...prev, clientId: e.target.value }))}
                placeholder="Google OAuth Client ID"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">OAuth Client Secret</label>
              <input
                type="password"
                value={googleAdsConfig.clientSecret}
                onChange={(e) => setGoogleAdsConfig((prev) => ({ ...prev, clientSecret: e.target.value }))}
                placeholder={googleAdsConfigMeta?.hasClientSecret ? 'שמורה סיסמה מוצפנת (ניתן לעדכן)' : 'Google OAuth Client Secret'}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Developer Token</label>
              <input
                type="password"
                value={googleAdsConfig.developerToken}
                onChange={(e) => setGoogleAdsConfig((prev) => ({ ...prev, developerToken: e.target.value }))}
                placeholder={googleAdsConfigMeta?.hasDeveloperToken ? 'שמורה סיסמה מוצפנת (ניתן לעדכן)' : 'Google Ads Developer Token'}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Manager Customer ID (אופציונלי)</label>
              <input
                value={googleAdsConfig.managerCustomerId}
                onChange={(e) => setGoogleAdsConfig((prev) => ({ ...prev, managerCustomerId: e.target.value }))}
                placeholder="1234567890"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Redirect URI (אופציונלי)</label>
              <input
                value={googleAdsConfig.redirectUri}
                onChange={(e) => setGoogleAdsConfig((prev) => ({ ...prev, redirectUri: e.target.value }))}
                placeholder="https://www.vipo-group.com/api/admin/google-ads/callback"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono"
              />
              {googleAdsConfigMeta?.oauthRedirectUriEffective && (
                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                  <span className="font-semibold text-gray-600">בשימוש בפועל: </span>
                  <code className="font-mono text-[10px] break-all">{googleAdsConfigMeta.oauthRedirectUriEffective}</code>
                  {googleAdsConfigMeta.oauthRedirectUriSource === 'dynamic' && (
                    <span> — דינמי לפי האתר בו לחצתם «התחבר»</span>
                  )}
                  {googleAdsConfigMeta.oauthRedirectUriSource === 'explicit' &&
                    googleAdsConfigMeta.redirectUriResolution === 'env' && (
                      <span> — מ-GOOGLE_ADS_REDIRECT_URI</span>
                  )}
                  {googleAdsConfigMeta.oauthRedirectUriSource === 'explicit' &&
                    googleAdsConfigMeta.redirectUriResolution === 'next_public' && (
                      <span> — מ-NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_BASE_URL</span>
                  )}
                  {googleAdsConfigMeta.oauthRedirectUriSource === 'explicit' &&
                    googleAdsConfigMeta.redirectUriResolution === 'database' && (
                      <span> — מהשדה השמור במסד (מטאב זה)</span>
                  )}
                </p>
              )}
              {googleAdsConfigMeta?.oauthRedirectUriDynamicNote && (
                <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-1">
                  {googleAdsConfigMeta.oauthRedirectUriDynamicNote}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={saveGoogleAdsConfig}
              disabled={testing.googleAdsConfig}
              className="px-3 py-1.5 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
            >
              {testing.googleAdsConfig ? 'שומר...' : 'שמור הגדרות'}
            </button>
            <button
              onClick={connectGoogleAds}
              disabled={!googleAds.configured?.oauthClient || testing.googleAds}
              className="px-3 py-1.5 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
            >
              התחבר ל-Google Ads
            </button>
            <button
              onClick={syncGoogleAds}
              disabled={!googleAds.connected || testing.googleAdsSync}
              className="px-3 py-1.5 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50"
            >
              {testing.googleAdsSync ? 'מסנכרן...' : 'סנכרון נתונים'}
            </button>
            <button
              onClick={disconnectGoogleAds}
              disabled={!googleAds.connected || testing.googleAdsDisconnect}
              className="px-3 py-1.5 border border-red-200 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
            >
              נתק
            </button>
            <button
              onClick={() => testConnection('googleAds')}
              disabled={testing.googleAds}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
            >
              {testing.googleAds ? 'בודק...' : 'רענן סטטוס'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
              <div className="text-[10px] text-gray-500">OAuth</div>
              <div className="text-xs font-bold text-gray-800">{googleAds.configured?.oauthClient ? 'מוגדר' : 'חסר'}</div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
              <div className="text-[10px] text-gray-500">Developer Token</div>
              <div className="text-xs font-bold text-gray-800">{googleAds.configured?.developerToken ? 'מוגדר' : 'חסר'}</div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
              <div className="text-[10px] text-gray-500">Last Sync</div>
              <div className="text-xs font-bold text-gray-800">{googleAds.lastSyncAt ? new Date(googleAds.lastSyncAt).toLocaleString('he-IL') : 'טרם סונכרן'}</div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
              <div className="text-[10px] text-gray-500">ROAS (30d)</div>
              <div className="text-xs font-bold text-gray-800">{googleAds.snapshot?.summary?.roas ? `${googleAds.snapshot.summary.roas}x` : '-'}</div>
            </div>
          </div>

          {googleAds.snapshot?.summary && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">
                <div className="text-[10px] text-blue-600">Customers</div>
                <div className="text-sm font-bold text-blue-800">{googleAds.snapshot.summary.customers || 0}</div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">
                <div className="text-[10px] text-blue-600">Campaigns</div>
                <div className="text-sm font-bold text-blue-800">{googleAds.snapshot.summary.campaigns || 0}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-center">
                <div className="text-[10px] text-emerald-600">Clicks</div>
                <div className="text-sm font-bold text-emerald-800">{googleAds.snapshot.summary.clicks || 0}</div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 text-center">
                <div className="text-[10px] text-amber-600">Cost</div>
                <div className="text-sm font-bold text-amber-800">₪{(googleAds.snapshot.summary.cost || 0).toLocaleString('he-IL')}</div>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-2 text-center">
                <div className="text-[10px] text-purple-600">Conversions</div>
                <div className="text-sm font-bold text-purple-800">{googleAds.snapshot.summary.conversions || 0}</div>
              </div>
              <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-2 text-center">
                <div className="text-[10px] text-cyan-600">Revenue</div>
                <div className="text-sm font-bold text-cyan-800">₪{(googleAds.snapshot.summary.conversionsValue || 0).toLocaleString('he-IL')}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── All Services Grid ── */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">כל החיבורים והשירותים ({additionalServiceKeys.length})</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {additionalServiceKeys.map(key => {
            const meta = SERVICE_META[key] || { name: key, desc: '', icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: '#6b7280', bg: 'rgba(107,114,128,0.08)' };
            const svc = allServices[key];
            const status = normalizeStatus(svc);
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                    <svg className="w-5 h-5" style={{ color: meta.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={meta.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-800">{meta.name}</div>
                    <div className="text-[10px] text-gray-400">{meta.desc}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {getSmallStatusIcon(status)}
                  {svc?.message && <div className="text-[9px] text-gray-400 truncate max-w-[140px]" title={svc.message}>{svc.message}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showLogsWindow && (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-red-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-red-700">חלון לוג שגיאות חיבור</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">מציג שגיאות ואזהרות חיבור לזיהוי מהיר של מה צריך לתקן</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchConnectionLogs}
                disabled={logsLoading}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-gray-200 text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
              >
                {logsLoading ? 'טוען...' : 'רענן לוגים'}
              </button>
              <button
                onClick={() => setShowLogsWindow(false)}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
              >
                סגור
              </button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
            {logsLoading ? (
              <div className="p-6 text-center text-sm text-gray-500">טוען לוגים...</div>
            ) : connectionLogs.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">אין כרגע שגיאות חיבור פתוחות</div>
            ) : (
              connectionLogs.map((log, idx) => {
                const source = String(log?.source || 'unknown');
                const serviceName = source.startsWith('integration_scan:')
                  ? source.replace('integration_scan:', '')
                  : source;

                return (
                  <div key={String(log?._id || idx)} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log?.level === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>{log?.level || 'warn'}</span>
                          <span className="text-[10px] text-gray-500">{serviceName}</span>
                          {log?.resolved && <span className="text-[10px] font-bold text-green-700">טופל</span>}
                        </div>
                        <div className="text-xs text-gray-800 font-medium break-words">{log?.message}</div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          {log?.createdAt ? new Date(log.createdAt).toLocaleString('he-IL') : '-'}
                        </div>
                      </div>
                      {log?.metadata?.code && (
                        <div className="text-[10px] text-gray-500 font-mono bg-gray-50 border border-gray-200 rounded px-2 py-1">
                          {log.metadata.code}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
