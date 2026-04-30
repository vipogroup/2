'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useBusinessContext, BusinessError, BusinessLoading } from '@/app/business/BusinessContext';

function toInputDate(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function formatCurrency(val) {
  const num = Number(val || 0);
  return `₪${num.toLocaleString('he-IL')}`;
}

function paymentTypeLabel(type) {
  switch (type) {
    case 'success':
      return { label: 'הצלחה', className: 'bg-green-100 text-green-800' };
    case 'failed':
      return { label: 'נכשל', className: 'bg-red-100 text-red-800' };
    case 'refund':
      return { label: 'זיכוי', className: 'bg-blue-100 text-blue-800' };
    case 'partial_refund':
      return { label: 'זיכוי חלקי', className: 'bg-blue-100 text-blue-800' };
    case 'pending':
      return { label: 'בהמתנה', className: 'bg-yellow-100 text-yellow-800' };
    case 'initiated':
      return { label: 'התחיל', className: 'bg-gray-100 text-gray-800' };
    case 'cancelled':
      return { label: 'בוטל', className: 'bg-gray-100 text-gray-800' };
    case 'chargeback':
      return { label: "צ'ארג'בק", className: 'bg-red-100 text-red-800' };
    default:
      return { label: type || '—', className: 'bg-gray-100 text-gray-800' };
  }
}

export default function BusinessSalesStatusPage() {
  const { tenantName, loading: contextLoading, error: contextError, refresh } = useBusinessContext();

  const today = useMemo(() => new Date(), []);
  const defaultTo = useMemo(() => toInputDate(today), [today]);
  const defaultFrom = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    return toInputDate(d);
  }, [today]);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const isCustomDateRange = useMemo(() => {
    return from !== defaultFrom || to !== defaultTo;
  }, [from, to, defaultFrom, defaultTo]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [overview, setOverview] = useState(null);
  const [commissions, setCommissions] = useState(null);
  const [agentsRows, setAgentsRows] = useState([]);
  const [payplus, setPayplus] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');

    const safeFetch = async (url) => {
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return { error: 'Invalid response from server', raw: text?.slice?.(0, 200) };
      }
    };

    const rangeParams = new URLSearchParams();
    if (from) rangeParams.set('from', from);
    if (to) rangeParams.set('to', to);

    try {
      const [overviewRes, commissionsRes, byAgentRes, payplusRes, ordersRes] = await Promise.all([
        safeFetch(`/api/admin/reports/overview?${rangeParams.toString()}`),
        safeFetch(`/api/admin/commissions?${rangeParams.toString()}`),
        safeFetch(`/api/admin/reports/by-agent?${rangeParams.toString()}`),
        safeFetch(`/api/admin/payplus/transactions?limit=20&startDate=${encodeURIComponent(from)}&endDate=${encodeURIComponent(to)}`),
        safeFetch('/api/orders?limit=100'),
      ]);

      if (overviewRes?.error) throw new Error(overviewRes.error);
      if (commissionsRes?.error) throw new Error(commissionsRes.error);
      if (byAgentRes?.error) throw new Error(byAgentRes.error);
      if (payplusRes?.error) throw new Error(payplusRes.error);
      if (ordersRes?.error) throw new Error(ordersRes.error);

      const overviewData = overviewRes?.data || null;
      setOverview(overviewData);

      setCommissions(commissionsRes);
      setPayplus(payplusRes);

      const byAgentItems = Array.isArray(byAgentRes?.items) ? byAgentRes.items : [];
      const commAgents = Array.isArray(commissionsRes?.agentsSummary) ? commissionsRes.agentsSummary : [];

      const salesMap = new Map(byAgentItems.filter((x) => x?._id).map((x) => [String(x._id), x]));
      const commMap = new Map(commAgents.filter((x) => x?.agentId).map((x) => [String(x.agentId), x]));
      const agentIds = new Set([...salesMap.keys(), ...commMap.keys()]);

      const rows = Array.from(agentIds).map((agentId) => {
        const s = salesMap.get(agentId);
        const c = commMap.get(agentId);
        return {
          agentId,
          fullName: c?.fullName || agentId,
          couponCode: c?.couponCode || '',
          ordersCount: s?.orders ?? c?.ordersCount ?? 0,
          gmv: s?.gmv ?? 0,
          pendingAmount: c?.pendingAmount ?? 0,
          availableForWithdrawal: c?.availableForWithdrawal ?? c?.currentBalance ?? 0,
          claimedAmount: c?.claimedAmount ?? 0,
          totalEarned: c?.totalEarned ?? 0,
        };
      });

      rows.sort((a, b) => (b.gmv || 0) - (a.gmv || 0));
      setAgentsRows(rows);

      const allOrders = Array.isArray(ordersRes?.items) ? ordersRes.items : (Array.isArray(ordersRes?.orders) ? ordersRes.orders : []);
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(`${to}T23:59:59.999`) : null;
      const filtered = allOrders.filter((o) => {
        const created = o?.createdAt ? new Date(o.createdAt) : null;
        if (!created) return false;
        if (fromDate && created < fromDate) return false;
        if (toDate && created > toDate) return false;
        return true;
      });
      setRecentOrders(filtered.slice(0, 10));

    } catch (e) {
      setError(e?.message || 'שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (!from || !to) return;
    fetchAll();
  }, [fetchAll, from, to]);

  const payplusStats = payplus?.stats || {};
  const moneyIn = payplusStats?.success?.totalAmount || 0;
  const moneyFailed = payplusStats?.failed?.totalAmount || 0;
  const moneyRefunded = (payplusStats?.refund?.totalAmount || 0) + (payplusStats?.partial_refund?.totalAmount || 0);

  if (contextLoading) return <BusinessLoading />;
  if (contextError) return <BusinessError error={contextError} onRetry={refresh} />;

  if (loading) {
    return (
      <main className="min-h-screen bg-white p-3 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 mx-auto" style={{
            border: '4px solid rgba(8, 145, 178, 0.2)',
            borderTopColor: '#0891b2',
          }}></div>
        </div>
      </main>
    );
  }

  if (error) {
    return <BusinessError error={error} onRetry={fetchAll} />;
  }

  return (
    <main className="min-h-screen bg-white p-3 sm:p-6 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1
            className="text-xl sm:text-2xl md:text-3xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            מצב מכירות {tenantName ? `- ${tenantName}` : ''}
          </h1>
          <Link
            href="/business"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            חזרה
          </Link>
        </div>

        <section
          className="rounded-xl p-4 shadow-md"
          style={{
            border: '2px solid transparent',
            backgroundImage:
              'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">מתאריך</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">עד תאריך</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div
            className="rounded-xl p-4 sm:p-5 shadow-md"
            style={{
              border: '2px solid transparent',
              backgroundImage:
                'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          >
            <div className="text-xs sm:text-sm text-gray-500 mb-1">כסף נכנס בפועל (סליקה הצליחה)</div>
            <div className="text-lg sm:text-2xl font-bold" style={{ color: '#16a34a' }}>{formatCurrency(moneyIn)}</div>
          </div>

          <div
            className="rounded-xl p-4 sm:p-5 shadow-md"
            style={{
              border: '2px solid transparent',
              backgroundImage:
                'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          >
            <div className="text-xs sm:text-sm text-gray-500 mb-1">נכשל בסליקה</div>
            <div className="text-lg sm:text-2xl font-bold" style={{ color: '#dc2626' }}>{formatCurrency(moneyFailed)}</div>
          </div>

          <div
            className="rounded-xl p-4 sm:p-5 shadow-md"
            style={{
              border: '2px solid transparent',
              backgroundImage:
                'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          >
            <div className="text-xs sm:text-sm text-gray-500 mb-1">זיכויים</div>
            <div className="text-lg sm:text-2xl font-bold" style={{ color: '#1e3a8a' }}>{formatCurrency(moneyRefunded)}</div>
          </div>

          <div
            className="rounded-xl p-4 sm:p-5 shadow-md"
            style={{
              border: '2px solid transparent',
              backgroundImage:
                'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          >
            <div className="text-xs sm:text-sm text-gray-500 mb-1">מחזור הזמנות (Paid/Completed)</div>
            <div className="text-lg sm:text-2xl font-bold" style={{ color: '#1e3a8a' }}>{formatCurrency(overview?.gmv || 0)}</div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-xl p-4 sm:p-5 shadow-md" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
            <div className="text-xs sm:text-sm text-gray-500 mb-1">ממתין לשחרור (עמלות)</div>
            <div className="text-lg sm:text-2xl font-bold" style={{ color: '#eab308' }}>{formatCurrency(commissions?.summary?.totalPending || 0)}</div>
          </div>
          <div className="rounded-xl p-4 sm:p-5 shadow-md" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
            <div className="text-xs sm:text-sm text-gray-500 mb-1">זמין למשיכה (עמלות)</div>
            <div className="text-lg sm:text-2xl font-bold" style={{ color: '#16a34a' }}>{formatCurrency(commissions?.summary?.actualAvailable ?? commissions?.summary?.totalAvailable ?? 0)}</div>
          </div>
          <div className="rounded-xl p-4 sm:p-5 shadow-md" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
            <div className="text-xs sm:text-sm text-gray-500 mb-1">נמשך (עמלות)</div>
            <div className="text-lg sm:text-2xl font-bold" style={{ color: '#1e3a8a' }}>{formatCurrency(commissions?.summary?.totalClaimed || 0)}</div>
          </div>
          <div className="rounded-xl p-4 sm:p-5 shadow-md" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
            <div className="text-xs sm:text-sm text-gray-500 mb-1">כמות הזמנות (Paid/Completed)</div>
            <div className="text-lg sm:text-2xl font-bold" style={{ color: '#1e3a8a' }}>{overview?.ordersCount ?? 0}</div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-base sm:text-lg font-bold" style={{ color: '#1e3a8a' }}>סיכום לפי סוכן</h2>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ borderBottom: '2px solid #0891b2' }}>
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#1e3a8a' }}>סוכן</th>
                  {isCustomDateRange && (
                    <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#1e3a8a' }}>קופון</th>
                  )}
                  <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>הזמנות</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>מחזור</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>ממתין</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>זמין</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>נמשך</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>{'סה"כ עמלות'}</th>
                </tr>
              </thead>
              <tbody>
                {agentsRows.length === 0 ? (
                  <tr>
                    <td colSpan={isCustomDateRange ? 8 : 7} className="px-4 py-8 text-center text-gray-500">אין נתונים להצגה</td>
                  </tr>
                ) : (
                  agentsRows.map((a) => (
                    <tr key={a.agentId} className="border-b border-gray-100 hover:bg-gray-50 transition-all">
                      <td className="px-4 py-3 text-gray-900">{a.fullName}</td>
                      {isCustomDateRange && (
                        <td className="px-4 py-3 text-gray-700 font-mono">{a.couponCode || '-'}</td>
                      )}
                      <td className="px-4 py-3 text-center text-gray-900">{a.ordersCount || 0}</td>
                      <td className="px-4 py-3 text-center font-semibold" style={{ color: '#1e3a8a' }}>{formatCurrency(a.gmv || 0)}</td>
                      <td className="px-4 py-3 text-center" style={{ color: '#eab308' }}>{formatCurrency(a.pendingAmount || 0)}</td>
                      <td className="px-4 py-3 text-center" style={{ color: '#16a34a' }}>{formatCurrency(a.availableForWithdrawal || 0)}</td>
                      <td className="px-4 py-3 text-center font-bold" style={{ color: '#1e3a8a' }}>{formatCurrency(a.claimedAmount || 0)}</td>
                      <td className="px-4 py-3 text-center font-bold" style={{ color: '#0891b2' }}>{formatCurrency(a.totalEarned || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden p-4 space-y-3">
            {agentsRows.length === 0 ? (
              <p className="text-center text-gray-500 py-8">אין נתונים להצגה</p>
            ) : (
              agentsRows.slice(0, 20).map((a) => (
                <div key={a.agentId} className="p-3 rounded-lg border-2 border-gray-200 bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{a.fullName}</p>
                      {isCustomDateRange && (
                        <p className="text-xs text-gray-500 font-mono">{a.couponCode || '-'}</p>
                      )}
                    </div>
                    <div className="text-sm font-bold" style={{ color: '#1e3a8a' }}>{formatCurrency(a.gmv || 0)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                    <div><span className="text-gray-500">הזמנות:</span><span className="mr-1 font-medium">{a.ordersCount || 0}</span></div>
                    <div><span className="text-gray-500">ממתין:</span><span className="mr-1" style={{ color: '#eab308' }}>{formatCurrency(a.pendingAmount || 0)}</span></div>
                    <div><span className="text-gray-500">זמין:</span><span className="mr-1" style={{ color: '#16a34a' }}>{formatCurrency(a.availableForWithdrawal || 0)}</span></div>
                    <div><span className="text-gray-500">נמשך:</span><span className="mr-1 font-bold" style={{ color: '#1e3a8a' }}>{formatCurrency(a.claimedAmount || 0)}</span></div>
                    <div className="col-span-2"><span className="text-gray-500">{'סה"כ עמלות:'}</span><span className="mr-1 font-bold" style={{ color: '#0891b2' }}>{formatCurrency(a.totalEarned || 0)}</span></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-base sm:text-lg font-bold" style={{ color: '#1e3a8a' }}>הזמנות אחרונות</h2>
            </div>
            <div className="divide-y">
              {recentOrders.length === 0 ? (
                <div className="p-6 text-center text-gray-500">אין הזמנות להצגה</div>
              ) : (
                recentOrders.map((o) => (
                  <div key={o._id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{o.customer?.fullName || o.customerName || 'לקוח'}</p>
                      <p className="text-xs text-gray-500">{o.createdAt ? new Date(o.createdAt).toLocaleString('he-IL') : ''}</p>
                    </div>
                    <div className="text-sm font-bold" style={{ color: '#1e3a8a' }}>{formatCurrency(o.totalAmount || 0)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-base sm:text-lg font-bold" style={{ color: '#1e3a8a' }}>עסקאות סליקה אחרונות</h2>
            </div>
            <div className="divide-y">
              {(payplus?.events || []).length === 0 ? (
                <div className="p-6 text-center text-gray-500">אין נתוני סליקה להצגה</div>
              ) : (
                (payplus.events || []).slice(0, 10).map((ev) => {
                  const badge = paymentTypeLabel(ev.type);
                  return (
                    <div key={ev.eventId || ev._id} className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${badge.className}`}>{badge.label}</span>
                          <span className="text-xs text-gray-500 font-mono">{(ev.transactionId || ev.eventId || '').toString().slice(0, 10)}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {ev.createdAt ? new Date(ev.createdAt).toLocaleString('he-IL') : ''}
                        </div>
                      </div>
                      <div className="text-sm font-bold" style={{ color: '#1e3a8a' }}>{formatCurrency(ev.amount || 0)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
