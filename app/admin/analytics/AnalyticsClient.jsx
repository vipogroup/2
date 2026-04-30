'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AnalyticsClient({ embedded = false }) {
  const pathname = usePathname();
  const basePath = pathname?.startsWith('/business') ? '/business' : '/admin';
  const [overview, setOverview] = useState(null);
  const [byProduct, setByProduct] = useState([]);
  const [byAgent, setByAgent] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Date filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterApplied, setFilterApplied] = useState(false);

  const safeFetch = async (url) => {
    const res = await fetch(url, { credentials: 'include' });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      console.error('Invalid JSON from', url, ':', text.substring(0, 200));
      return { error: 'Invalid response from server' };
    }
  };

  const fetchData = useCallback(async (fromDate = '', toDate = '') => {
    setLoading(true);
    setError(null);
    
    const params = new URLSearchParams();
    if (fromDate) params.append('from', fromDate);
    if (toDate) params.append('to', toDate);
    const q = params.toString() ? `?${params.toString()}` : '';
    
    try {
      const [overviewRes, productRes, agentRes] = await Promise.all([
        safeFetch(`/api/admin/reports/overview${q}`),
        safeFetch(`/api/admin/reports/by-product${q}`),
        safeFetch(`/api/admin/reports/by-agent${q}`),
      ]);
      
      if (overviewRes.error) {
        setError(`שגיאה: ${overviewRes.error}`);
        return;
      }
      
      setOverview(overviewRes.data || { newCustomers: 0, activeAgents: 0, ordersCount: 0, gmv: 0, commissions: 0 });
      setByProduct(productRes.items || []);
      setByAgent(agentRes.items || []);
      
      // Fetch recent orders for activity feed
      const ordersRes = await safeFetch('/api/orders?limit=5&sort=-createdAt').catch(() => ({ orders: [] }));
      setRecentActivity(ordersRes.orders || []);
    } catch (err) {
      console.error('Reports fetch error:', err);
      setError('שגיאה בטעינת הדוחות: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilter = () => {
    setFilterApplied(true);
    fetchData(dateFrom, dateTo);
  };

  const handleClearFilter = () => {
    setDateFrom('');
    setDateTo('');
    setFilterApplied(false);
    fetchData();
  };

  // Calculate max values for progress bars
  const maxProductRevenue = useMemo(() => Math.max(...byProduct.map(p => p.revenue || 0), 1), [byProduct]);
  const maxAgentGmv = useMemo(() => Math.max(...byAgent.map(a => a.gmv || 0), 1), [byAgent]);

  const formatCurrency = (val) => `₪${(val || 0).toLocaleString('he-IL')}`;

  if (loading) {
    return (
      <main className={embedded ? 'p-4 flex items-center justify-center' : 'min-h-screen bg-white p-3 sm:p-6 md:p-8 flex items-center justify-center'}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">טוען דוחות...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={embedded ? 'p-4 flex items-center justify-center' : 'min-h-screen bg-white p-3 sm:p-6 md:p-8 flex items-center justify-center'}>
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={() => fetchData()} className="mt-4 px-4 py-2 text-white rounded-lg" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>נסה שוב</button>
        </div>
      </main>
    );
  }

  return (
    <main className={embedded ? 'bg-white p-2' : 'min-h-screen bg-white p-3 sm:p-6 md:p-8'}>
      <div className={embedded ? 'space-y-4' : 'max-w-7xl mx-auto space-y-4 sm:space-y-6'}>
        {/* Title removed - sidebar provides navigation */}

        {/* Date Filters */}
        <section className="rounded-xl p-4 shadow-md" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-xs text-gray-500 mb-1">מתאריך</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-xs text-gray-500 mb-1">עד תאריך</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={handleFilter} className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white rounded-lg transition-all" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                <span className="flex items-center justify-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  סנן
                </span>
              </button>
              {filterApplied && (
                <button onClick={handleClearFilter} className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">נקה</button>
              )}
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            { key: 'ordersCount', label: 'הזמנות', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: '#1e3a8a' },
            { key: 'gmv', label: 'מחזור', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: '#0891b2', isCurrency: true },
            { key: 'commissions', label: 'עמלות', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', color: '#16a34a', isCurrency: true },
            { key: 'newCustomers', label: 'לקוחות חדשים', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: '#1e3a8a' },
          ].map((stat) => (
            <div key={stat.key} className="rounded-xl p-4 shadow-md transition-all hover:-translate-y-1" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                  <svg className="w-4 h-4" style={{ color: stat.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} /></svg>
                </div>
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold" style={{ color: stat.color }}>
                {stat.isCurrency ? formatCurrency(overview?.[stat.key]) : (overview?.[stat.key] ?? 0)}
              </div>
            </div>
          ))}
        </section>

        {/* Top Products with Progress Bars */}
        <section className="rounded-xl p-4 sm:p-6 shadow-md" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
          <h2 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1e3a8a' }}>
            <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            מוצרים מובילים
          </h2>
          {byProduct.length === 0 ? (
            <p className="text-center text-gray-500 py-6">אין נתונים להצגה</p>
          ) : (
            <div className="space-y-3">
              {byProduct.slice(0, 5).map((p, idx) => (
                <div key={p._id || p.productName || idx} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">{p.productName || p._id || '—'}</span>
                      <span className="text-sm font-bold" style={{ color: '#1e3a8a' }}>{formatCurrency(p.revenue)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(p.revenue / maxProductRevenue) * 100}%`, background: 'linear-gradient(90deg, #1e3a8a 0%, #0891b2 100%)' }} />
                    </div>
                    <span className="text-xs text-gray-500">{p.qty} יח׳</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top Agents Table */}
        <section className="rounded-xl shadow-md overflow-hidden" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
          <div className="p-4 sm:p-6 pb-0">
            <h2 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1e3a8a' }}>
              <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              סוכנים מובילים
            </h2>
          </div>
          {byAgent.length === 0 ? (
            <p className="text-center text-gray-500 py-6 px-4">אין נתונים להצגה</p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead style={{ borderBottom: '2px solid #0891b2' }}>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#1e3a8a' }}>#</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#1e3a8a' }}>סוכן</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>הזמנות</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>מחזור</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#16a34a' }}>עמלות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byAgent.slice(0, 10).map((a, idx) => (
                      <tr key={a._id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-all">
                        <td className="px-4 py-3"><span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: idx < 3 ? 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' : '#9ca3af' }}>{idx + 1}</span></td>
                        <td className="px-4 py-3 font-medium text-gray-900">{a.agentName || a._id || '—'}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{a.orders}</td>
                        <td className="px-4 py-3 text-center font-semibold" style={{ color: '#1e3a8a' }}>{formatCurrency(a.gmv)}</td>
                        <td className="px-4 py-3 text-center font-bold" style={{ color: '#16a34a' }}>{formatCurrency(a.commissions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="md:hidden p-4 space-y-3">
                {byAgent.slice(0, 10).map((a, idx) => (
                  <div key={a._id || idx} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: idx < 3 ? 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' : '#9ca3af' }}>{idx + 1}</span>
                      <span className="font-semibold text-gray-900">{a.agentName || a._id || '—'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-gray-500 block">הזמנות</span><span className="font-medium">{a.orders}</span></div>
                      <div><span className="text-gray-500 block">מחזור</span><span className="font-bold" style={{ color: '#1e3a8a' }}>{formatCurrency(a.gmv)}</span></div>
                      <div><span className="text-gray-500 block">עמלות</span><span className="font-bold" style={{ color: '#16a34a' }}>{formatCurrency(a.commissions)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Recent Activity */}
        <section className="rounded-xl p-4 sm:p-6 shadow-md" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
          <h2 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1e3a8a' }}>
            <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            פעילות אחרונה
          </h2>
          {recentActivity.length === 0 ? (
            <p className="text-center text-gray-500 py-4">אין פעילות אחרונה</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((order, idx) => (
                <div key={order._id || idx} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)' }}>
                    <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">הזמנה #{order._id?.slice(-6) || idx}</p>
                      <span className="text-sm font-bold" style={{ color: '#1e3a8a' }}>{formatCurrency(order.totalAmount)}</span>
                    </div>
                    <p className="text-xs text-gray-500">{order.customerInfo?.fullName || order.customerName || 'לקוח'}</p>
                    <p className="text-xs text-gray-400">{order.createdAt ? new Date(order.createdAt).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${order.status === 'completed' ? 'bg-green-100 text-green-700' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                    {order.status === 'completed' ? 'הושלם' : order.status === 'pending' ? 'ממתין' : order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
