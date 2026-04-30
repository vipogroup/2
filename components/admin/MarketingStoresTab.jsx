'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

function formatCurrency(value) {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₪${Math.round(n)}`;
  }
}

export default function MarketingStoresTab({ embedded = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [copiedLinkId, setCopiedLinkId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ commissionPercent: 10, discountPercent: 10 });

  const totalCount = useMemo(() => items.length, [items]);

  async function fetchStores() {
    try {
      setLoading(true);
      setError('');
      const url = new URL('/api/admin/marketing-stores', window.location.origin);
      url.searchParams.set('limit', '100');
      if (searchQuery) url.searchParams.set('q', searchQuery);

      const res = await fetch(url.toString(), { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || 'Failed to fetch marketing stores');
      }

      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err?.message || 'שגיאה בטעינת הנתונים');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  function handleCopyCoupon(store) {
    const code = store?.couponCode ? String(store.couponCode).toUpperCase() : '';
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedId(store._id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function handleCopyLink(store) {
    const code = store?.couponCode ? String(store.couponCode).trim() : '';
    if (!code) return;
    const link = `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(link);
    setCopiedLinkId(store._id);
    setTimeout(() => setCopiedLinkId(null), 1500);
  }

  function openEdit(store) {
    setEditing(store);
    setEditForm({
      commissionPercent: Number(store?.commissionPercent ?? 10),
      discountPercent: Number(store?.discountPercent ?? 10),
    });
  }

  function closeEdit() {
    setEditing(null);
    setEditForm({ commissionPercent: 10, discountPercent: 10 });
  }

  async function saveEdit() {
    if (!editing?._id) return;
    try {
      setSavingId(editing._id);
      setError('');

      const res = await fetch(`/api/users/${editing._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          commissionPercent: Number(editForm.commissionPercent) || 0,
          discountPercent: Number(editForm.discountPercent) || 0,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || 'Failed to update store');
      }

      await fetchStores();
      closeEdit();
    } catch (err) {
      setError(err?.message || 'שגיאה בשמירה');
    } finally {
      setSavingId(null);
    }
  }

  async function toggleActive(store) {
    if (!store?._id) return;
    try {
      setSavingId(store._id);
      setError('');

      const res = await fetch(`/api/users/${store._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !store.isActive }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || 'Failed to update status');
      }

      await fetchStores();
    } catch (err) {
      setError(err?.message || 'שגיאה בעדכון סטטוס');
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
          <div
            className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin absolute top-0"
            style={{
              borderTopColor: '#0891b2',
              borderRightColor: '#0891b2',
              borderBottomColor: '#1e3a8a',
            }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div>
              <p className="text-sm sm:text-base text-gray-600">סה״כ {totalCount} חנויות פרסום</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="חיפוש שם / טלפון / אימייל / קופון"
              className="w-full sm:w-[340px] px-3 py-2 border rounded-lg"
            />
            <button
              type="button"
              onClick={() => setSearchQuery(searchInput.trim())}
              className="text-white font-semibold px-4 py-2 rounded-lg transition-all shadow"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              חפש
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fetchStores()}
              className="px-4 py-2 rounded-lg border font-semibold text-sm"
            >
              רענן
            </button>
            <Link
              href="/admin/users?create=marketing_store"
              className="text-white font-semibold px-4 py-2 rounded-lg transition-all shadow"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              הוסף חנות שיווק/פרסום
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-white rounded-xl p-4 border-2" style={{ borderColor: '#ef4444' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: '#ef4444' }}>
              {error}
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg sm:rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-right">
                <th className="px-4 py-3 font-semibold text-gray-700">חנות</th>
                <th className="px-4 py-3 font-semibold text-gray-700">קופון</th>
                <th className="px-4 py-3 font-semibold text-gray-700">עמלה</th>
                <th className="px-4 py-3 font-semibold text-gray-700">הנחה</th>
                <th className="px-4 py-3 font-semibold text-gray-700">הזמנות</th>
                <th className="px-4 py-3 font-semibold text-gray-700">מחזור</th>
                <th className="px-4 py-3 font-semibold text-gray-700">עמלות</th>
                <th className="px-4 py-3 font-semibold text-gray-700">סטטוס</th>
                <th className="px-4 py-3 font-semibold text-gray-700">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    אין עדיין חנויות פרסום
                  </td>
                </tr>
              ) : (
                items.map((store) => {
                  const isBusy = savingId === store._id;
                  const stats = store?.stats || {};
                  const activeLabel = store.isActive ? 'פעיל' : 'כבוי';
                  const activeClass = store.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

                  return (
                    <tr key={store._id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{store.companyName || store.fullName}</div>
                        <div className="text-xs text-gray-500">{store.email || store.phone || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs">{store.couponCode ? String(store.couponCode).toUpperCase() : '---'}</div>
                      </td>
                      <td className="px-4 py-3">{Number(store.commissionPercent ?? 0)}%</td>
                      <td className="px-4 py-3">{Number(store.discountPercent ?? 0)}%</td>
                      <td className="px-4 py-3">{stats.ordersCount || 0}</td>
                      <td className="px-4 py-3">{formatCurrency(stats.totalRevenue || 0)}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-700">סה״כ: {formatCurrency(stats.totalCommission || 0)}</div>
                        <div className="text-[11px] text-gray-500">
                          pending: {formatCurrency(stats.pendingCommission || 0)}
                          <span className="mx-1">|</span>
                          available: {formatCurrency(stats.availableCommission || 0)}
                          <span className="mx-1">|</span>
                          claimed: {formatCurrency(stats.claimedCommission || 0)}
                        </div>
                        {Number(stats.readyToReleaseCommission || 0) > 0 && (
                          <div className="text-[11px] font-semibold" style={{ color: '#1e3a8a' }}>
                            לשחרור: {formatCurrency(stats.readyToReleaseCommission || 0)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${activeClass}`}>{activeLabel}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyCoupon(store)}
                            className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                            title="העתק קופון"
                          >
                            {copiedId === store._id ? 'הועתק' : 'קופון'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyLink(store)}
                            className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                            title="העתק לינק עם ref"
                          >
                            {copiedLinkId === store._id ? 'הועתק' : 'לינק'}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEdit(store)}
                            className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                            disabled={isBusy}
                          >
                            ערוך
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleActive(store)}
                            className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                            disabled={isBusy}
                          >
                            {store.isActive ? 'כבה' : 'הפעל'}
                          </button>

                          <Link
                            href={`/admin/agents/${store._id}`}
                            className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                            title="פרטי סוכן"
                          >
                            פרטים
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3
              className="text-xl font-bold mb-6"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              עריכת חנות פרסום
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">עמלה (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.commissionPercent}
                    onChange={(e) => setEditForm((p) => ({ ...p, commissionPercent: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">הנחה (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.discountPercent}
                    onChange={(e) => setEditForm((p) => ({ ...p, discountPercent: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="px-4 py-2 rounded-lg border font-semibold"
                  disabled={savingId === editing._id}
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  className="text-white font-semibold px-4 py-2 rounded-lg transition-all shadow"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                  disabled={savingId === editing._id}
                >
                  {savingId === editing._id ? 'שומר...' : 'שמור'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
