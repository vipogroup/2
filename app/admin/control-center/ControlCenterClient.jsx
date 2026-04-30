'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ControlCenterProvider, useControlCenterTenant } from './ControlCenterContext';

const OverviewTab = dynamic(() => import('./tabs/OverviewTab'), { ssr: false });
const ErrorsLogsTab = dynamic(() => import('./tabs/ErrorsLogsTab'), { ssr: false });
const ReportsScanTab = dynamic(() => import('./tabs/ReportsScanTab'), { ssr: false });
const BackupTab = dynamic(() => import('./tabs/BackupTab'), { ssr: false });
const IntegrationsTab = dynamic(() => import('./tabs/IntegrationsTab'), { ssr: false });
const SeoAuditTab = dynamic(() => import('./tabs/SeoAuditTab'), { ssr: false });
const SecurityTab = dynamic(() => import('./tabs/SecurityTab'), { ssr: false });
const PaidPromotionTab = dynamic(() => import('./tabs/PaidPromotionTab'), { ssr: false });

const TABS = [
  { id: 'overview', label: 'סקירה כללית', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
  { id: 'errors', label: 'שגיאות ולוגים', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  { id: 'reports', label: 'דוחות וסריקה', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'backup', label: 'גיבוי ועדכון', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
  { id: 'integrations', label: 'אינטגרציות וחיבורים', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
  { id: 'seo', label: 'Google SEO Audit', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { id: 'security', label: 'אבטחה', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { id: 'paid-promo', label: 'קידום ממומן', icon: 'M12 8c-2.21 0-4 1.343-4 3s1.79 3 4 3 4 1.343 4 3-1.79 3-4 3m0-12V5m0 14v-2m8-6h-2m-12 0H4' },
];

function MarketingTenantStrip() {
  const ctx = useControlCenterTenant();
  if (!ctx) return null;

  const {
    isSuperAdmin,
    userTenantId,
    tenants,
    tenantsLoading,
    selectedTenantId,
    setSelectedTenantId,
    selectedTenantLabel,
  } = ctx;

  if (isSuperAdmin) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-white/85 font-semibold hidden sm:inline">הקשר שיווק:</span>
        <select
          value={selectedTenantId}
          onChange={(e) => setSelectedTenantId(e.target.value)}
          disabled={tenantsLoading}
          className="text-gray-900 text-xs rounded-lg px-2 py-1.5 min-w-[160px] max-w-[220px] border border-white/40 bg-white shadow-sm"
          title="בחירת חנות לשלבי השדרוג (קידום, דוחות)"
        >
          <option value="">כל החנויות</option>
          {tenants.map((t) => (
            <option key={t._id} value={String(t._id)}>
              {t.name}
            </option>
          ))}
        </select>
        {tenantsLoading ? (
          <span className="text-white/70 text-[10px]">טוען…</span>
        ) : (
          <span className="text-white/60 text-[10px] max-w-[140px] truncate hidden md:inline" title={selectedTenantLabel}>
            {selectedTenantId ? selectedTenantLabel : 'סינון כללי'}
          </span>
        )}
      </div>
    );
  }

  if (userTenantId) {
    return (
      <span className="text-[10px] text-white/75 font-medium hidden sm:inline">
        חנות: <span className="text-white font-bold">{userTenantId.slice(-8)}</span>
      </span>
    );
  }

  return null;
}

function ControlCenterShell({
  user,
  activeTab,
  setActiveTab,
  errorCount,
  onErrorCountChange,
  clock,
}) {
  return (
    <>
      <div className="sticky top-0 z-50 text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
        <div className="max-w-[1600px] mx-auto px-4 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h1 className="text-base font-extrabold">מרכז בקרה</h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
            <span className="text-xs opacity-60 hidden sm:inline">{clock}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end sm:justify-start">
            <MarketingTenantStrip />
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/20"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              דשבורד
            </Link>
          </div>
        </div>
      </div>

      <div className="sticky top-[52px] z-40 bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-[3px] whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'border-[#0891b2] text-[#1e3a8a] bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
              {tab.id === 'errors' && errorCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {errorCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-4">
        {activeTab === 'overview' && <OverviewTab user={user} onErrorCountChange={onErrorCountChange} />}
        {activeTab === 'errors' && <ErrorsLogsTab user={user} onErrorCountChange={onErrorCountChange} />}
        {activeTab === 'reports' && <ReportsScanTab user={user} />}
        {activeTab === 'backup' && <BackupTab user={user} />}
        {activeTab === 'integrations' && <IntegrationsTab user={user} />}
        {activeTab === 'seo' && <SeoAuditTab user={user} />}
        {activeTab === 'security' && <SecurityTab user={user} />}
        {activeTab === 'paid-promo' && <PaidPromotionTab user={user} />}
      </div>
    </>
  );
}

export default function ControlCenterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(tabParam || 'overview');
  const [clock, setClock] = useState('');
  const [errorCount, setErrorCount] = useState(0);

  // Update tab from URL
  useEffect(() => {
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) { router.push('/login'); return; }
        const data = await res.json();
        if (data.user.role !== 'admin' && data.user.role !== 'super_admin') {
          router.push('/'); return;
        }
        setUser(data.user);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // Live clock
  useEffect(() => {
    const updateClock = () => setClock(new Date().toLocaleTimeString('he-IL'));
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Callback to update error badge from child tabs
  const onErrorCountChange = useCallback((count) => {
    setErrorCount(count);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-4" style={{ border: '4px solid rgba(8, 145, 178, 0.2)', borderTopColor: '#0891b2' }} />
          <p className="text-gray-600 text-sm">טוען מרכז בקרה...</p>
        </div>
      </div>
    );
  }

  return (
    <ControlCenterProvider user={user}>
      <ControlCenterShell
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        errorCount={errorCount}
        onErrorCountChange={onErrorCountChange}
        clock={clock}
      />
    </ControlCenterProvider>
  );
}
