'use client';

import { useState, useEffect } from 'react';
import ProductsClient from '../products/ProductsClient';
import OrdersList from '@/components/admin/OrdersList';

// ─── SVG Icon Components ─────────────────────────────────────
const CubeIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const CartIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const CatalogIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const CheckCircleIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

const CoinIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ─── Tab definitions ─────────────────────────────────────────
const TABS = [
  { id: 'products', label: 'מוצרים', icon: CubeIcon },
  { id: 'orders', label: 'הזמנות', icon: CartIcon },
  { id: 'catalog-manager', label: 'Catalog Manager', icon: CatalogIcon },
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

// ─── Main Catalog Sales Client ───────────────────────────────
export default function CatalogSalesClient() {
  const [activeTab, setActiveTab] = useState('products');
  const [counts, setCounts] = useState({ products: 0, orders: 0, todayOrders: 0, revenue: 0 });

  // Fetch counts for KPI cards
  useEffect(() => {
    async function loadCounts() {
      try {
        const [productsRes, ordersRes] = await Promise.allSettled([
          fetch('/api/products', { credentials: 'include' }),
          fetch('/api/orders?limit=100', { credentials: 'include' }),
        ]);

        let pCount = 0, oCount = 0, todayCount = 0, totalRevenue = 0;

        if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
          const d = await productsRes.value.json();
          const items = d.products || d.items || [];
          pCount = Array.isArray(items) ? items.length : 0;
        }
        if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
          const d = await ordersRes.value.json();
          const items = d.items || d.orders || [];
          oCount = Array.isArray(items) ? items.length : 0;
          // Count today's orders
          const today = new Date().toDateString();
          todayCount = items.filter(o => new Date(o.createdAt).toDateString() === today).length;
          // Sum revenue from paid orders
          totalRevenue = items
            .filter(o => o.status === 'paid')
            .reduce((sum, o) => sum + (o.totals?.totalAmount || o.totalAmount || 0), 0);
        }

        setCounts({
          products: pCount,
          orders: oCount,
          todayOrders: todayCount,
          revenue: totalRevenue,
        });
      } catch (err) {
        console.error('Failed to load counts:', err);
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
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>קטלוג ומכירות</h1>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>ניהול מוצרים, הזמנות וקטלוג</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
            <DownloadIcon className="w-3.5 h-3.5" />
            ייצוא
          </button>
          <a
            href="/admin/products/new"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', textDecoration: 'none' }}
          >
            <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            הוסף מוצר
          </a>
        </div>
      </div>

      {/* KPI inline stats bar */}
      <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 8px', flexShrink: 0 }}>
        <KPIStat label='סה"כ מוצרים' value={counts.products} icon={CubeIcon} colorClass="indigo" />
        <KPIStat label='סה"כ הזמנות' value={counts.orders} icon={CartIcon} colorClass="cyan" />
        <KPIStat label="הזמנות היום" value={counts.todayOrders} icon={CheckCircleIcon} colorClass="emerald" />
        <KPIStat label="הכנסות" value={`₪${counts.revenue.toLocaleString()}`} icon={CoinIcon} colorClass="rose" />
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
                  {tab.id === 'products' && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10,
                      background: isActive ? '#eef2ff' : '#f1f5f9',
                      color: isActive ? '#6366f1' : '#94a3b8',
                    }}>
                      {counts.products}
                    </span>
                  )}
                  {tab.id === 'orders' && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10,
                      background: isActive ? '#eef2ff' : '#f1f5f9',
                      color: isActive ? '#6366f1' : '#94a3b8',
                    }}>
                      {counts.orders}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Panels */}
          <div>
            {activeTab === 'products' && (
              <div style={{ padding: 0 }}>
                <ProductsClient embedded={true} />
              </div>
            )}

            {activeTab === 'orders' && (
              <div style={{ padding: 0 }}>
                <OrdersList embedded={true} />
              </div>
            )}

            {activeTab === 'catalog-manager' && (
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
