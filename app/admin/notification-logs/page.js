'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const TEMPLATE_TYPE_LABELS = {
  welcome_user: 'ברוך הבא',
  admin_new_registration: 'הרשמה חדשה',
  order_confirmation: 'אישור הזמנה',
  agent_commission_awarded: 'עמלה לסוכן',
  admin_agent_sale: 'מכירה דרך סוכן',
  admin_payment_completed: 'תשלום הושלם',
  order_new: 'הזמנה חדשה',
  agent_daily_digest: 'דוח יומי לסוכן',
  product_new_release: 'מוצר חדש',
  group_buy_weekly_reminder: 'תזכורת קנייה קבוצתית',
  group_buy_last_call: '24 שעות אחרונות',
  group_buy_closed: 'קנייה קבוצתית נסגרה',
  withdrawal_approved: 'משיכה אושרה',
  withdrawal_completed: 'משיכה בוצעה',
  withdrawal_rejected: 'משיכה נדחתה',
};

const ROLE_LABELS = {
  customer: 'לקוח',
  agent: 'סוכן',
  admin: 'מנהל',
  business_admin: 'מנהל עסק',
  super_admin: 'מנהל ראשי',
};

const STATUS_CONFIG = {
  sent: { label: 'נשלח', color: 'bg-green-100 text-green-800' },
  failed: { label: 'נכשל', color: 'bg-red-100 text-red-800' },
  dry_run: { label: 'בדיקה', color: 'bg-yellow-100 text-yellow-800' },
};

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationLogsPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [templateType, setTemplateType] = useState('');
  const [status, setStatus] = useState('');
  const [recipientRole, setRecipientRole] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '30',
        includeStats: page === 1 ? 'true' : 'false',
      });

      if (search) params.set('search', search);
      if (templateType) params.set('templateType', templateType);
      if (status) params.set('status', status);
      if (recipientRole) params.set('recipientRole', recipientRole);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/admin/notification-logs?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'שגיאה בטעינת הנתונים');
      }

      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, templateType, status, recipientRole, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const clearFilters = () => {
    setSearch('');
    setTemplateType('');
    setStatus('');
    setRecipientRole('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header removed - sidebar provides navigation */}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
              <div className="text-2xl font-bold text-blue-900">{stats.summary.total}</div>
              <div className="text-sm text-gray-600">סה״כ התראות</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
              <div className="text-2xl font-bold text-green-700">{stats.summary.sent}</div>
              <div className="text-sm text-gray-600">נשלחו בהצלחה</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-100">
              <div className="text-2xl font-bold text-red-700">{stats.summary.failed}</div>
              <div className="text-sm text-gray-600">נכשלו</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
              <div className="text-2xl font-bold text-purple-700">{stats.summary.totalRecipients}</div>
              <div className="text-sm text-gray-600">נמענים</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <form onSubmit={handleSearch} className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="חיפוש בכותרת או תוכן..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Template Type */}
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm bg-white"
            >
              <option value="">כל הסוגים</option>
              {Object.entries(TEMPLATE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            {/* Status */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm bg-white"
            >
              <option value="">כל הסטטוסים</option>
              {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            {/* Recipient Role */}
            <select
              value={recipientRole}
              onChange={(e) => setRecipientRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm bg-white"
            >
              <option value="">כל הנמענים</option>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
              >
                <svg className="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                חפש
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-all"
              >
                נקה
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">מתאריך:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">עד:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-cyan-500 border-t-transparent"></div>
          </div>
        )}

        {/* Table - Desktop */}
        {!loading && logs.length > 0 && (
          <>
            <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-900 to-cyan-700 text-white">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium">תאריך</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">סוג</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">כותרת</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">נמען</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">נמענים</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">סטטוס</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(log.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-800">
                          {TEMPLATE_TYPE_LABELS[log.templateType] || log.templateType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{log.title}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {log.recipientName || (log.audienceTargets?.length > 0 
                            ? log.audienceTargets.map(t => ROLE_LABELS[t] || t).join(', ')
                            : log.audienceType)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{log.recipientCount || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_CONFIG[log.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                          {STATUS_CONFIG[log.status]?.label || log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards - Mobile */}
            <div className="md:hidden space-y-3">
              {logs.map((log) => (
                <div key={log._id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-gray-800">
                      {TEMPLATE_TYPE_LABELS[log.templateType] || log.templateType}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_CONFIG[log.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_CONFIG[log.status]?.label || log.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 mb-2">{log.title}</div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(log.createdAt)}</span>
                    <span>{log.recipientCount || 0} נמענים</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                מציג {logs.length} מתוך {total} התראות
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                >
                  הקודם
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-600">
                  עמוד {page} מתוך {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                >
                  הבא
                </button>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && logs.length === 0 && !error && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <div className="text-gray-500 text-lg">אין התראות ביומן</div>
            <div className="text-gray-400 text-sm mt-1">התראות יופיעו כאן לאחר שליחתן</div>
          </div>
        )}
      </div>
    </div>
  );
}
