'use client';

import { useState, useEffect, useCallback } from 'react';

export default function ErrorsLogsTab({ user, onErrorCountChange }) {
  const [errorLogs, setErrorLogs] = useState([]);
  const [errorStats, setErrorStats] = useState({});
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityStats, setActivityStats] = useState({});
  const [errorsLoading, setErrorsLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);

  const fetchErrorLogs = useCallback(async () => {
    setErrorsLoading(true);
    try {
      const res = await fetch('/api/admin/error-logs?limit=50');
      if (res.ok) {
        const data = await res.json();
        setErrorLogs(data.logs || []);
        setErrorStats(data.stats || {});
        if (onErrorCountChange) onErrorCountChange(data.stats?.unresolved || 0);
      }
    } catch (error) {
      console.error('Failed to fetch error logs:', error);
    } finally {
      setErrorsLoading(false);
    }
  }, [onErrorCountChange]);

  const fetchActivityLogs = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await fetch('/api/admin/activity-logs?limit=30');
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data.logs || []);
        setActivityStats(data.stats || {});
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const markErrorResolved = async (id) => {
    try {
      await fetch('/api/admin/error-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, resolved: true })
      });
      fetchErrorLogs();
    } catch (error) {
      console.error('Failed to mark error as resolved:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchErrorLogs();
      fetchActivityLogs();
    }
  }, [user, fetchErrorLogs, fetchActivityLogs]);

  const getActionStyle = (action) => {
    const map = {
      create: { bg: 'rgba(22,163,74,0.1)', color: '#16a34a', icon: 'M12 4v16m8-8H4' },
      update: { bg: 'rgba(37,99,235,0.1)', color: '#2563eb', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
      delete: { bg: 'rgba(220,38,38,0.1)', color: '#dc2626', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
      login: { bg: 'rgba(8,145,178,0.1)', color: '#0891b2', icon: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1' },
      backup: { bg: 'rgba(8,145,178,0.1)', color: '#0891b2', icon: 'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4' },
    };
    return map[action] || { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3 animate-fadeIn">
      {/* ── Error Logs ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f2f5' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.08)' }}>
              <svg className="w-3.5 h-3.5" style={{ color: '#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-gray-700">שגיאות מערכת</h2>
            <span className="text-[10px] text-gray-400 mr-2">
              {errorStats.total || 0} סה&quot;כ | היום: {errorStats.today || 0} | פתוח: {errorStats.unresolved || 0}
            </span>
          </div>
          <button
            onClick={fetchErrorLogs}
            disabled={errorsLoading}
            className="px-3 py-1 rounded-lg text-[11px] font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            {errorsLoading ? 'טוען...' : 'רענן'}
          </button>
        </div>
        <div className="divide-y divide-gray-50 max-h-[calc(100vh-260px)] overflow-y-auto">
          {errorLogs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: 'rgba(22,163,74,0.1)' }}>
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-700">אין שגיאות!</p>
              <p className="text-xs text-gray-400">המערכת תקינה</p>
            </div>
          ) : errorLogs.map((log, i) => (
            <div key={log._id || i} className={`px-4 py-3 ${log.resolved ? 'opacity-40' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      log.level === 'error' ? 'bg-red-100 text-red-700' :
                      log.level === 'warn' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{log.level}</span>
                    <span className="text-[10px] text-gray-400">{log.source}</span>
                    {log.resolved && <span className="text-[10px] text-green-600 font-bold">✓ טופל</span>}
                  </div>
                  <p className="text-xs text-gray-800 font-medium">{log.message}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(log.createdAt).toLocaleString('he-IL')}
                    {log.url && ` | ${log.url}`}
                  </p>
                </div>
                {!log.resolved && (
                  <button
                    onClick={() => markErrorResolved(log._id)}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all hover:opacity-80 flex-shrink-0 text-white"
                    style={{ background: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)' }}
                  >
                    טופל
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Activity Log ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f2f5' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(8,145,178,0.08)' }}>
              <svg className="w-3.5 h-3.5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-gray-700">לוג פעילות</h2>
            <span className="text-[10px] text-gray-400 mr-2">
              {activityStats.total || 0} סה&quot;כ | היום: {activityStats.today || 0}
            </span>
          </div>
          <button
            onClick={fetchActivityLogs}
            disabled={activityLoading}
            className="text-[11px] font-semibold hover:opacity-80 disabled:opacity-50"
            style={{ color: '#0891b2' }}
          >
            רענן
          </button>
        </div>
        <div className="divide-y divide-gray-50 max-h-[calc(100vh-260px)] overflow-y-auto">
          {activityLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">אין פעילות עדיין</div>
          ) : activityLogs.map((log, i) => {
            const style = getActionStyle(log.action);
            return (
              <div key={log._id || i} className="px-4 py-2.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: style.bg }}>
                    <svg className="w-3.5 h-3.5" style={{ color: style.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={style.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800 font-medium truncate">{log.description}</p>
                    <p className="text-[10px] text-gray-400">
                      {log.userEmail && `${log.userEmail} | `}
                      {new Date(log.createdAt).toLocaleString('he-IL')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
