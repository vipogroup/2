'use client';

import { useState, useEffect, useCallback } from 'react';
import TenantsClient from '../tenants/TenantsClient';
import AgentsList from '@/components/admin/AgentsList';
import UsersList from '@/components/admin/UsersList';
import MarketingStoresTab from '@/components/admin/MarketingStoresTab';

// ─── SVG Icon Components ─────────────────────────────────────
const BuildingIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const UsersGroupIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const UserIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CatalogIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const MegaphoneIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5l10 4v6l-10 4V5zM4 9v6c0 1.657 1.79 3 4 3h1V6H8c-2.21 0-4 1.343-4 3zm5 10l1 2"
    />
  </svg>
);

const BoxIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const CartIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const CheckCircleIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowUpIcon = ({ className = 'w-3 h-3' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
  </svg>
);

const ExternalLinkIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const DownloadIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const BackIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

// ─── Tab definitions ─────────────────────────────────────────
const TABS = [
  { id: 'tenants', label: 'עסקים', icon: BuildingIcon },
  { id: 'agents', label: 'סוכנים', icon: UsersGroupIcon },
  { id: 'marketingStores', label: 'חנויות שיווק/פרסום', icon: MegaphoneIcon },
  { id: 'users', label: 'משתמשים', icon: UserIcon },
  { id: 'catalog', label: 'Catalog Manager', icon: CatalogIcon },
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


// ─── Main Management Client ──────────────────────────────────
export default function ManagementClient() {
  const [activeTab, setActiveTab] = useState('tenants');
  const [counts, setCounts] = useState({ tenants: 0, agents: 0, marketingStores: 0, users: 0, orders: 0, products: 0, active: 0 });

  // Fetch counts for KPI cards
  useEffect(() => {
    async function loadCounts() {
      try {
        const [tenantsRes, agentsRes, usersRes, marketingStoresRes] = await Promise.allSettled([
          fetch('/api/tenants', { credentials: 'include' }),
          fetch('/api/agents', { credentials: 'include' }),
          fetch('/api/users?limit=1', { credentials: 'include' }),
          fetch('/api/admin/marketing-stores?limit=1', { credentials: 'include' }),
        ]);

        let tCount = 0, aCount = 0, mCount = 0, uCount = 0, activeCount = 0;

        if (tenantsRes.status === 'fulfilled' && tenantsRes.value.ok) {
          const d = await tenantsRes.value.json();
          tCount = d.tenants?.length || 0;
          activeCount = d.tenants?.filter(t => t.status === 'active').length || 0;
        }
        if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) {
          const d = await agentsRes.value.json();
          aCount = d.agents?.length || 0;
        }
        if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
          const d = await usersRes.value.json();
          uCount = d.total || d.users?.length || 0;
        }

        if (marketingStoresRes && marketingStoresRes.status === 'fulfilled' && marketingStoresRes.value.ok) {
          const d = await marketingStoresRes.value.json();
          mCount = d.total || d.items?.length || 0;
        }

        setCounts(prev => ({
          ...prev,
          tenants: tCount,
          agents: aCount,
          marketingStores: mCount,
          users: uCount,
          active: activeCount,
        }));
      } catch (err) {
        console.error('Failed to load counts:', err);
      }
    }
    loadCounts();
  }, []);

  return (
    <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* KPI inline stats bar */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 8px', flexShrink: 0 }}>
          <KPIStat label='סה"כ עסקים' value={counts.tenants} icon={BuildingIcon} colorClass="indigo" />
          <KPIStat label='סה"כ סוכנים' value={counts.agents} icon={UsersGroupIcon} colorClass="cyan" />
          <KPIStat label='סה"כ משתמשים' value={counts.users} icon={UserIcon} colorClass="rose" />
          <KPIStat label="פעילים" value={counts.active} icon={CheckCircleIcon} colorClass="emerald" />
        </div>

        {/* Content area - fills remaining space */}
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
                    {tab.id !== 'catalog' && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10,
                        background: isActive ? '#eef2ff' : '#f1f5f9',
                        color: isActive ? '#6366f1' : '#94a3b8',
                      }}>
                        {tab.id === 'tenants'
                          ? counts.tenants
                          : tab.id === 'agents'
                            ? counts.agents
                            : tab.id === 'marketingStores'
                              ? counts.marketingStores
                              : counts.users}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}
            <div>
              {activeTab === 'tenants' && (
                <div style={{ padding: 0 }}>
                  <TenantsClient embedded={true} />
                </div>
              )}

              {activeTab === 'agents' && (
                <div style={{ padding: 0 }}>
                  <AgentsList embedded={true} />
                </div>
              )}

              {activeTab === 'marketingStores' && (
                <div style={{ padding: 0 }}>
                  <MarketingStoresTab embedded={true} />
                </div>
              )}

              {activeTab === 'users' && (
                <div style={{ padding: 0 }}>
                  <UsersList embedded={true} />
                </div>
              )}

              {activeTab === 'catalog' && (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14, background: '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px', color: '#94a3b8',
                  }}>
                    <CatalogIcon className="w-6 h-6" />
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Catalog Manager</p>
                  <p style={{ fontSize: 13.5, color: '#64748b', marginBottom: 20 }}>פתח את מנהל הקטלוג בחלון ייעודי לניהול מוצרים, מדיה ותמחור</p>
                  <a
                    href="/admin/catalog-manager/standalone"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 8,
                      fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: 'none',
                      background: '#6366f1',
                      boxShadow: '0 1px 2px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                      transition: 'all 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#818cf8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <ExternalLinkIcon className="w-4 h-4" />
                    פתח Catalog Manager
                  </a>
                </div>
              )}
            </div>

          </div>
        </div>
    </div>
  );
}
