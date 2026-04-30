'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const STATUS_LABELS = {
  pending: 'ממתין',
  approved: 'אושר',
  rejected: 'נדחה',
  completed: 'הושלם',
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
};

export default function WithdrawalsPage() {
  const embedded = false;
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [processing, setProcessing] = useState(null);

  const loadWithdrawals = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      
      const res = await fetch(`/api/admin/withdrawals?${params}`);
      const data = await res.json();
      
      if (data.ok) {
        setWithdrawals(data.withdrawals || []);
        setStats(data.stats || null);
        setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
      }
    } catch (err) {
      console.error('Failed to load withdrawals:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  async function handleAction(id, action) {
    if (!confirm(`האם לבצע ${action === 'approve' ? 'אישור' : action === 'reject' ? 'דחייה' : 'השלמה'}?`)) return;
    
    setProcessing(id);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      if (res.ok) {
        loadWithdrawals(pagination.page);
      } else {
        const data = await res.json();
        alert(data.error || 'שגיאה בעדכון');
      }
    } catch (err) {
      console.error('Action failed:', err);
      alert('שגיאה בביצוע הפעולה');
    } finally {
      setProcessing(null);
    }
  }

  function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount || 0);
  }

  return (
    <main className={embedded ? 'bg-white p-2' : 'min-h-screen bg-white p-3 sm:p-6 md:p-8'}>
      <div className={embedded ? 'space-y-4' : 'max-w-7xl mx-auto space-y-6'}>
        {/* Header */}
        {!embedded && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <h1
              className="text-xl sm:text-2xl md:text-3xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              בקשות משיכה
            </h1>
          </div>
        </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl p-4 shadow-md" style={{ border: '2px solid #f59e0b' }}>
              <div className="text-sm text-gray-600">ממתינים לאישור</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingCount}</div>
              <div className="text-sm text-gray-500">{formatCurrency(stats.pendingAmount)}</div>
            </div>
            <div className="rounded-xl p-4 shadow-md" style={{ border: '2px solid #10b981' }}>
              <div className="text-sm text-gray-600">הושלמו החודש</div>
              <div className="text-2xl font-bold text-green-600">{stats.completedCountThisMonth}</div>
              <div className="text-sm text-gray-500">{formatCurrency(stats.completedThisMonth)}</div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">סינון לפי סטטוס:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">הכל</option>
            <option value="pending">ממתין</option>
            <option value="approved">אושר</option>
            <option value="rejected">נדחה</option>
            <option value="completed">הושלם</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl shadow-md overflow-hidden" style={{ border: '2px solid #e5e7eb' }}>
          {loading ? (
            <div className="text-center py-8 text-gray-500">טוען...</div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">אין בקשות משיכה</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">תאריך</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">סוכן</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">סכום</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">סטטוס</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">הערות</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(w.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{w.user?.fullName || 'לא ידוע'}</div>
                        <div className="text-xs text-gray-500">{w.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(w.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[w.status] || 'bg-gray-100'}`}>
                          {STATUS_LABELS[w.status] || w.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate">{w.notes || '-'}</td>
                      <td className="px-4 py-3">
                        {w.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(w.id, 'approve')}
                              disabled={processing === w.id}
                              className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600 disabled:opacity-50"
                            >
                              אשר
                            </button>
                            <button
                              onClick={() => handleAction(w.id, 'reject')}
                              disabled={processing === w.id}
                              className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 disabled:opacity-50"
                            >
                              דחה
                            </button>
                          </div>
                        )}
                        {w.status === 'approved' && (
                          <button
                            onClick={() => handleAction(w.id, 'complete')}
                            disabled={processing === w.id}
                            className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 disabled:opacity-50"
                          >
                            סמן כהושלם
                          </button>
                        )}
                        {(w.status === 'completed' || w.status === 'rejected') && (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => loadWithdrawals(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
            >
              הקודם
            </button>
            <span className="text-sm text-gray-600">
              עמוד {pagination.page} מתוך {pagination.pages}
            </span>
            <button
              onClick={() => loadWithdrawals(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
            >
              הבא
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
