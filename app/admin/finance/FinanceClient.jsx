'use client';

import { useState, useEffect } from 'react';
import ReportsClient from '../reports/ReportsClient';
import AnalyticsClient from '../analytics/AnalyticsClient';
import TransactionsReport from '@/components/admin/TransactionsReport';
import CommissionsClient from '../commissions/CommissionsClient';
import WithdrawalsPage from '../withdrawals/page';

// ─── SVG Icon Components ─────────────────────────────────────
const ChartIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const AnalyticsIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
  </svg>
);

const TransactionIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const CoinIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WithdrawIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const DownloadIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

// ─── Tab definitions ─────────────────────────────────────────
const TABS = [
  { id: 'reports', label: 'דוחות', icon: ChartIcon },
  { id: 'analytics', label: 'ניתוח נתונים', icon: AnalyticsIcon },
  { id: 'transactions', label: 'עסקאות', icon: TransactionIcon },
  { id: 'commissions', label: 'עמלות', icon: CoinIcon },
  { id: 'withdrawals', label: 'בקשות משיכה', icon: WithdrawIcon },
];

// ─── Inline KPI Stat ─────────────────────────────────────────
function KPIStat({ label, value, icon: Icon, colorClass }) {
  const colorMap = {
    indigo: '#6366f1', cyan: '#06b6d4', rose: '#f43f5e', emerald: '#10b981',
  };
  const clr = colorMap[colorClass] || '#6366f1';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderLeft: '1px solid #e2e8f0' }}>
      <Icon className="w-4 h-4" style={{ color: clr, flexShrink: 0 }} />
      <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5 }}>{value}</span>
      <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

// ─── Main Finance Client ─────────────────────────────────────
export default function FinanceClient() {
  const [activeTab, setActiveTab] = useState('reports');
  const [counts, setCounts] = useState({ commissions: 0, withdrawals: 0, revenue: 0, agents: 0 });

  useEffect(() => {
    async function loadCounts() {
      try {
        const [commRes, withdrawRes] = await Promise.allSettled([
          fetch('/api/admin/commissions', { credentials: 'include' }),
          fetch('/api/admin/withdrawals', { credentials: 'include' }),
        ]);

        let commTotal = 0, wCount = 0, revenue = 0, agentCount = 0;

        if (commRes.status === 'fulfilled' && commRes.value.ok) {
          const d = await commRes.value.json();
          commTotal = d.summary?.totalAmount || 0;
          revenue = d.summary?.totalClaimed || 0;
          agentCount = d.agentsSummary?.length || 0;
        }
        if (withdrawRes.status === 'fulfilled' && withdrawRes.value.ok) {
          const d = await withdrawRes.value.json();
          wCount = d.stats?.pendingCount || d.pagination?.total || 0;
        }

        setCounts({ commissions: commTotal, withdrawals: wCount, revenue, agents: agentCount });
      } catch (err) {
        console.error('Failed to load finance counts:', err);
      }
    }
    loadCounts();
  }, []);

  return (
    <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Header bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '6px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>כספים ודוחות</h1>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>דוחות, ניתוח נתונים, עסקאות, עמלות ובקשות משיכה</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
            <DownloadIcon className="w-3.5 h-3.5" />
            ייצוא
          </button>
        </div>
      </div>

      {/* KPI inline stats bar */}
      <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 8px', flexShrink: 0 }}>
        <KPIStat label='סה"כ עמלות' value={`₪${counts.commissions.toLocaleString()}`} icon={CoinIcon} colorClass="indigo" />
        <KPIStat label="בקשות משיכה" value={counts.withdrawals} icon={WithdrawIcon} colorClass="cyan" />
        <KPIStat label="שולם לסוכנים" value={`₪${counts.revenue.toLocaleString()}`} icon={TransactionIcon} colorClass="emerald" />
        <KPIStat label="סוכנים פעילים" value={counts.agents} icon={ChartIcon} colorClass="rose" />
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* Tabs */}
          <div style={{ borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px',
                    fontSize: 12.5, fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#6366f1' : '#64748b',
                    background: 'none', border: 'none',
                    borderBottom: `2px solid ${isActive ? '#6366f1' : 'transparent'}`,
                    cursor: 'pointer', transition: 'all 150ms',
                    fontFamily: 'inherit', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#f1f5f9'; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'none'; } }}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Panels */}
          <div>
            {activeTab === 'reports' && (
              <div style={{ padding: 0 }}>
                <ReportsClient embedded={true} />
              </div>
            )}

            {activeTab === 'analytics' && (
              <div style={{ padding: 0 }}>
                <AnalyticsClient embedded={true} />
              </div>
            )}

            {activeTab === 'transactions' && (
              <div style={{ padding: 0 }}>
                <div className="bg-white p-2">
                  <TransactionsReport />
                </div>
              </div>
            )}

            {activeTab === 'commissions' && (
              <div style={{ padding: 0 }}>
                <CommissionsClient embedded={true} />
              </div>
            )}

            {activeTab === 'withdrawals' && (
              <div style={{ padding: 0 }}>
                <WithdrawalsPage embedded={true} />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
