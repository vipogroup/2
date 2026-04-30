'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { isSuperAdminUser } from '@/lib/superAdmins';

export default function AdminProductsCategoriesPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);

  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [openRows, setOpenRows] = useState(() => new Set());
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());

  const canView = useMemo(() => isSuperAdminUser(user), [user]);

  async function loadCategories() {
    setLoading(true);
    try {
      setError('');
      const res = await fetch(`/api/admin/categories?ts=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'שגיאה בטעינת קטגוריות');
      }
      setCategories(Array.isArray(data?.categories) ? data.categories : []);
    } catch (err) {
      setError(err?.message || 'שגיאה בטעינת קטגוריות');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      setAuthLoading(true);
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json().catch(() => ({}));
        setUser(data?.user || null);
      } catch {
        router.push('/login');
        return;
      } finally {
        setAuthLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!canView) return;
    loadCategories();
  }, [authLoading, canView]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (categories || []).filter((c) => {
      if (!showInactive && c?.active === false) return false;
      if (!q) return true;
      return String(c?.name || '').toLowerCase().includes(q);
    });
  }, [categories, query, showInactive]);

  const nameByKey = useMemo(() => {
    const map = new Map();
    for (const c of categories || []) {
      const name = String(c?.name || '').trim();
      if (!name) continue;
      map.set(name.toLowerCase(), name);
    }
    return map;
  }, [categories]);

  const visibleKeys = useMemo(() => {
    return (filtered || [])
      .map((c) => String(c?.name || '').trim())
      .filter(Boolean)
      .map((n) => n.toLowerCase());
  }, [filtered]);

  const selectedVisibleCount = useMemo(() => {
    let count = 0;
    for (const k of visibleKeys) {
      if (selectedKeys.has(k)) count += 1;
    }
    return count;
  }, [selectedKeys, visibleKeys]);

  const allVisibleSelected = useMemo(() => {
    return visibleKeys.length > 0 && visibleKeys.every((k) => selectedKeys.has(k));
  }, [selectedKeys, visibleKeys]);

  function toggleSelectAllVisible() {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const k of visibleKeys) next.delete(k);
      } else {
        for (const k of visibleKeys) next.add(k);
      }
      return next;
    });
  }

  function toggleSelectedKey(key) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleRow(key) {
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleDeleteCategory(name) {
    const confirmText = 'מחק קטגוריה';
    const userInput = prompt(`האם למחוק את הקטגוריה "${name}"?\n\nהקלד "${confirmText}" לאישור:`);
    if (String(userInput || '').trim() !== confirmText) {
      return;
    }

    setLoading(true);
    try {
      setError('');
      const res = await fetch(`/api/admin/categories?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'שגיאה במחיקת קטגוריה');
      }
      await loadCategories();
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        next.delete(String(name || '').trim().toLowerCase());
        return next;
      });
    } catch (err) {
      setError(err?.message || 'שגיאה במחיקת קטגוריה');
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkDeleteSelected() {
    const keys = Array.from(selectedKeys);
    const names = keys
      .map((k) => nameByKey.get(k))
      .filter(Boolean);

    if (!names.length) {
      alert('לא נבחרו קטגוריות למחיקה.');
      return;
    }

    const confirmText = 'מחק קטגוריות';
    const userInput = prompt(`האם למחוק ${names.length} קטגוריות?\n\nהקלד "${confirmText}" לאישור:`);
    if (String(userInput || '').trim() !== confirmText) {
      return;
    }

    setLoading(true);
    try {
      setError('');
      const params = new URLSearchParams();
      for (const name of names) {
        params.append('name', name);
      }

      const res = await fetch(`/api/admin/categories?${params.toString()}`, {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'שגיאה במחיקת קטגוריות');
      }
      await loadCategories();
      setSelectedKeys(new Set());
      setOpenRows(new Set());
    } catch (err) {
      setError(err?.message || 'שגיאה במחיקת קטגוריות');
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivateCategory(name) {
    setLoading(true);
    try {
      setError('');
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, active: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'שגיאה בהפעלת קטגוריה');
      }
      await loadCategories();
    } catch (err) {
      setError(err?.message || 'שגיאה בהפעלת קטגוריה');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white p-6" dir="rtl">
        <div className="max-w-5xl mx-auto">
          <div className="animate-spin rounded-full h-10 w-10" style={{ border: '4px solid rgba(8, 145, 178, 0.2)', borderTopColor: '#0891b2' }} />
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="min-h-screen bg-white p-6" dir="rtl">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">ניהול קטגוריות (כל החנויות)</h1>
            <Link href="/admin/products" className="px-4 py-2 rounded-lg border-2" style={{ borderColor: '#0891b2', color: '#0891b2' }}>
              חזרה למוצרים
            </Link>
          </div>
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4">
            אין לך הרשאה לצפות בעמוד זה.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-3 sm:p-6 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1
            className="text-xl sm:text-2xl md:text-3xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ניהול קטגוריות (כל החנויות)
          </h1>
          <Link
            href="/admin/products"
            className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            חזרה למוצרים
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש קטגוריה..."
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:outline-none transition-colors text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              הצג גם קטגוריות שנמחקו
            </label>

            <button
              type="button"
              onClick={loadCategories}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-white font-medium transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {loading ? 'טוען...' : 'רענן'}
            </button>

            <button
              type="button"
              onClick={handleBulkDeleteSelected}
              disabled={loading || selectedKeys.size === 0}
              className="px-4 py-2 rounded-xl text-white font-medium transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' }}
              title={selectedKeys.size ? `מחק נבחרים (${selectedKeys.size})` : 'בחר קטגוריות למחיקה'}
            >
              מחק נבחרים{selectedKeys.size ? ` (${selectedKeys.size})` : ''}
            </button>
          </div>

          {error && (
            <div className="mt-3 bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">{error}</div>
          )}

          <div className="mt-3 text-sm text-gray-500">{filtered.length} קטגוריות</div>
          {selectedKeys.size > 0 && (
            <div className="mt-1 text-xs text-gray-500">
              נבחרו: {selectedKeys.size} (מתוכן מוצגות כעת: {selectedVisibleCount})
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '2px solid #0891b2' }}>
                  <th className="px-4 py-4 text-center text-sm font-semibold" style={{ color: '#1e3a8a' }}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      disabled={loading || visibleKeys.length === 0}
                      title={allVisibleSelected ? 'נקה בחירה' : 'בחר את כל המוצגות'}
                    />
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-semibold" style={{ color: '#1e3a8a' }}>
                    קטגוריה
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold" style={{ color: '#1e3a8a' }}>
                    סטטוס
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold" style={{ color: '#1e3a8a' }}>
                    מוצרים מפורסמים
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold" style={{ color: '#1e3a8a' }}>
                    סה&quot;כ מוצרים
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold" style={{ color: '#1e3a8a' }}>
                    חנויות
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold" style={{ color: '#1e3a8a' }}>
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((cat) => {
                  const name = String(cat?.name || '').trim();
                  const key = name.toLowerCase();
                  const active = cat?.active !== false;
                  const tenants = Array.isArray(cat?.tenants) ? cat.tenants : [];
                  const isOpen = openRows.has(key);

                  return (
                    <Fragment key={key}>
                      <tr key={key}>
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedKeys.has(key)}
                            disabled={loading || !name}
                            onChange={() => toggleSelectedKey(key)}
                            title={selectedKeys.has(key) ? 'הסר בחירה' : 'בחר למחיקה מרובה'}
                          />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => toggleRow(key)}
                            className="text-right font-semibold hover:underline"
                            style={{ color: '#111827' }}
                            title="הצג/הסתר חנויות"
                          >
                            {name || '(ללא שם)'}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-center text-sm">
                          <span
                            className="px-2 py-1 rounded-full"
                            style={{
                              background: active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: active ? '#065f46' : '#991b1b',
                            }}
                          >
                            {active ? 'פעילה' : 'נמחקה'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center text-sm">{Number(cat?.publishedProducts || 0)}</td>
                        <td className="px-4 py-4 text-center text-sm">{Number(cat?.totalProducts || 0)}</td>
                        <td className="px-4 py-4 text-center text-sm">{tenants.length}</td>
                        <td className="px-4 py-4 text-center">
                          {active ? (
                            <button
                              type="button"
                              disabled={loading || !name}
                              onClick={() => handleDeleteCategory(name)}
                              className="px-3 py-2 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-50"
                              style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' }}
                            >
                              מחק
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={loading || !name}
                              onClick={() => handleReactivateCategory(name)}
                              className="px-3 py-2 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-50"
                              style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                            >
                              החזר
                            </button>
                          )}
                        </td>
                      </tr>

                      {isOpen && (
                        <tr key={`${key}-tenants`}>
                          <td className="px-4 pb-4" colSpan={7}>
                            <div className="bg-gray-50 rounded-xl p-3">
                              {tenants.length ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {tenants.map((t) => (
                                    <div
                                      key={`${key}-${t.tenantId}`}
                                      className="bg-white rounded-lg border border-gray-200 p-3 text-sm"
                                    >
                                      <div className="font-semibold text-gray-900">
                                        {t.tenantName || t.tenantSlug || t.tenantId}
                                      </div>
                                      <div className="text-gray-600 mt-1">
                                        מפורסמים: {Number(t.publishedProducts || 0)} | סה&quot;כ: {Number(t.totalProducts || 0)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-600">אין מוצרים שמשויכים לקטגוריה זו.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

                {!filtered.length && (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={7}>
                      אין קטגוריות להצגה.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
