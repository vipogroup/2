'use client';

import { useState, useEffect, useCallback } from 'react';

export default function SecurityTab({ user }) {
  const [securityData, setSecurityData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('scan'); // 'scan' | 'logs' | 'auth'

  // Auth settings state
  const [authSettings, setAuthSettings] = useState({ emailVerificationEnabled: false });
  const [authSettingsLoading, setAuthSettingsLoading] = useState(false);
  const [authSettingsSaving, setAuthSettingsSaving] = useState(false);

  const runSecurityScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/admin/security-scan');
      if (res.ok) {
        const data = await res.json();
        setSecurityData(data);
      }
    } catch (error) {
      console.error('Failed to run security scan:', error);
    } finally {
      setScanning(false);
    }
  }, []);

  const loadSecurityLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/admin/activity-logs?category=security&limit=50');
      if (res.ok) {
        const data = await res.json();
        setSecurityLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to load security logs:', error);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const loadAuthSettings = useCallback(async () => {
    setAuthSettingsLoading(true);
    try {
      const res = await fetch('/api/admin/settings/auth');
      if (res.ok) {
        const data = await res.json();
        setAuthSettings(data.settings || { emailVerificationEnabled: false });
      }
    } catch (error) {
      console.error('Failed to load auth settings:', error);
    } finally {
      setAuthSettingsLoading(false);
    }
  }, []);

  const toggleEmailVerification = async () => {
    setAuthSettingsSaving(true);
    try {
      const newValue = !authSettings.emailVerificationEnabled;
      const res = await fetch('/api/admin/settings/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailVerificationEnabled: newValue }),
      });
      if (res.ok) {
        const data = await res.json();
        setAuthSettings(data.settings);
      } else {
        alert('שגיאה בעדכון ההגדרה');
      }
    } catch (error) {
      console.error('Failed to update auth settings:', error);
      alert('שגיאה בעדכון ההגדרה');
    } finally {
      setAuthSettingsSaving(false);
    }
  };

  useEffect(() => {
    runSecurityScan();
    loadSecurityLogs();
    loadAuthSettings();
  }, [runSecurityScan, loadSecurityLogs, loadAuthSettings]);

  const getScoreColor = (score) => {
    if (score >= 85) return '#16a34a';
    if (score >= 70) return '#d97706';
    return '#dc2626';
  };

  const getScoreBg = (score) => {
    if (score >= 85) return 'bg-green-50 border-green-200';
    if (score >= 70) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Section Switcher */}
      <div className="flex gap-1.5">
        {[
          { id: 'scan', label: 'סריקת אבטחה', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
          { id: 'logs', label: 'לוג אבטחה', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
          { id: 'auth', label: 'הגדרות אימות', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
        ].map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSection === sec.id
                ? 'text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            style={activeSection === sec.id ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sec.icon} />
            </svg>
            {sec.label}
          </button>
        ))}
      </div>

      {/* ── Security Scan ── */}
      {activeSection === 'scan' && (
        <div className="space-y-4">
          {/* Score Hero */}
          <div className="rounded-xl overflow-hidden text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-extrabold">אבטחת מערכת</h2>
                  <p className="text-cyan-100 text-xs">סריקה מקיפה של רמת האבטחה במערכת</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {securityData && (
                  <div className="text-center px-4 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <div className="text-3xl font-extrabold" style={{ color: securityData.overallScore >= 85 ? '#4ade80' : securityData.overallScore >= 70 ? '#fbbf24' : '#f87171' }}>
                      {securityData.overallScore}%
                    </div>
                    <div className="text-[10px] text-cyan-100">ציון אבטחה</div>
                  </div>
                )}
                <button
                  onClick={runSecurityScan}
                  disabled={scanning}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <svg className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {scanning ? 'סורק...' : 'סרוק שוב'}
                </button>
              </div>
            </div>
            {securityData && (
              <div className="px-5 pb-4">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${securityData.overallScore}%`,
                      background: securityData.overallScore >= 85 ? '#4ade80' : securityData.overallScore >= 70 ? '#fbbf24' : '#f87171',
                    }}
                  />
                </div>
                <p className="text-xs text-cyan-100 mt-2">
                  {securityData.overallScore >= 85 ? 'המערכת מאובטחת היטב' :
                   securityData.overallScore >= 70 ? 'יש מקום לשיפור' :
                   'נדרשת תשומת לב מיידית'}
                </p>
              </div>
            )}
          </div>

          {/* Category Cards */}
          {securityData?.categories && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(securityData.categories).map(([key, category]) => (
                <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getScoreBg(category.score)}`}>
                        <span className="text-base font-extrabold" style={{ color: getScoreColor(category.score) }}>{category.score}</span>
                      </div>
                      <div className="text-right">
                        <h3 className="text-sm font-bold text-gray-800">{category.name}</h3>
                        <p className="text-[10px] text-gray-400">{category.checks?.length || 0} בדיקות</p>
                      </div>
                    </div>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedCategory === key ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedCategory === key && (
                    <div className="border-t border-gray-100 p-3 bg-gray-50 space-y-2">
                      {category.checks?.map((check, i) => (
                        <div key={i} className={`p-2.5 rounded-lg border text-xs ${
                          check.status === 'ok' ? 'bg-green-50 border-green-200' :
                          check.status === 'warning' ? 'bg-amber-50 border-amber-200' :
                          'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-start gap-2">
                            <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${check.status === 'ok' ? 'text-green-500' : check.status === 'warning' ? 'text-amber-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {check.status === 'ok' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              ) : check.status === 'warning' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              )}
                            </svg>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{check.name}</p>
                              <p className="text-gray-600 mt-0.5">{check.message}</p>
                              {check.recommendation && (
                                <p className="text-blue-600 mt-1 text-[10px]">המלצה: {check.recommendation}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {securityData?.recommendations?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #f0f2f5' }}>
                <h3 className="text-sm font-bold text-gray-700">המלצות לשיפור האבטחה</h3>
              </div>
              <div className="p-3 space-y-2">
                {securityData.recommendations.map((rec, i) => (
                  <div key={i} className={`p-3 rounded-lg border text-xs ${
                    rec.priority === 'critical' ? 'bg-red-50 border-red-300' :
                    rec.priority === 'high' ? 'bg-amber-50 border-amber-200' :
                    rec.priority === 'medium' ? 'bg-blue-50 border-blue-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                        rec.priority === 'critical' ? 'bg-red-500' :
                        rec.priority === 'high' ? 'bg-amber-500' :
                        rec.priority === 'medium' ? 'bg-blue-500' :
                        'bg-gray-500'
                      }`}>
                        {rec.priority === 'critical' ? 'קריטי' : rec.priority === 'high' ? 'גבוה' : rec.priority === 'medium' ? 'בינוני' : 'נמוך'}
                      </span>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{rec.title}</h4>
                        <p className="text-gray-600 mt-0.5">{rec.description}</p>
                        {rec.code && (
                          <pre className="mt-1.5 p-2 bg-gray-900 text-green-400 rounded text-[10px] overflow-x-auto" dir="ltr">{rec.code}</pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Best Practices */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3" style={{ borderBottom: '1px solid #f0f2f5' }}>
              <h3 className="text-sm font-bold text-gray-700">מה קיים במערכת</h3>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'הצפנת סיסמאות עם bcrypt',
                  'אימות JWT מאובטח',
                  'Rate Limiting לנקודות קצה',
                  'הגנה על Routes לפי תפקיד',
                  'Cookies מאובטחים (httpOnly, secure)',
                  'חיבור מוצפן לדאטהבייס (SSL)',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200 text-xs">
                    <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-800 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {scanning && !securityData && (
            <div className="bg-white rounded-xl p-8 text-center">
              <div className="w-10 h-10 rounded-full animate-spin mx-auto mb-3" style={{ border: '3px solid #e5e7eb', borderTopColor: '#0891b2' }} />
              <p className="text-gray-500 text-sm">מריץ סריקת אבטחה...</p>
            </div>
          )}
        </div>
      )}

      {/* ── Security Logs ── */}
      {activeSection === 'logs' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f2f5' }}>
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: '#1e3a8a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              לוג אירועי אבטחה
            </h3>
            <button
              onClick={loadSecurityLogs}
              disabled={logsLoading}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {logsLoading ? 'טוען...' : 'רענן'}
            </button>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {logsLoading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 rounded-full animate-spin mx-auto mb-2" style={{ border: '2px solid #e5e7eb', borderTopColor: '#0891b2' }} />
                <p className="text-gray-400 text-xs">טוען לוגים...</p>
              </div>
            ) : securityLogs.length === 0 ? (
              <div className="p-10 text-center">
                <svg className="w-10 h-10 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-gray-400 text-sm">אין אירועי אבטחה</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {securityLogs.map((log, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-gray-50 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.action?.includes('fail') || log.action?.includes('error') || log.action?.includes('block')
                              ? 'bg-red-100 text-red-700'
                              : log.action?.includes('warn')
                              ? 'bg-amber-100 text-amber-700'
                              : log.action?.includes('login') || log.action?.includes('auth')
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {log.action || 'פעולה'}
                          </span>
                          {log.category && (
                            <span className="px-1.5 py-0.5 bg-cyan-50 text-cyan-700 rounded text-[10px]">{log.category}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-800 font-medium">{log.details?.message || log.action || 'אירוע אבטחה'}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                          {log.actorName && (
                            <span className="flex items-center gap-0.5">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              {log.actorName}
                            </span>
                          )}
                          {log.ip && (
                            <span className="flex items-center gap-0.5">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
                              {log.ip}
                            </span>
                          )}
                        </div>
                        {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 1 && (
                          <details className="mt-1.5">
                            <summary className="text-[10px] text-blue-600 cursor-pointer hover:underline">פרטים נוספים</summary>
                            <pre className="mt-1 p-2 bg-gray-100 rounded text-[10px] overflow-x-auto" dir="ltr">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('he-IL') : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Auth Settings ── */}
      {activeSection === 'auth' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #f0f2f5' }}>
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: '#1e3a8a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              הגדרות אימות משתמשים
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">שליטה באופן האימות של משתמשים חדשים</p>
          </div>
          <div className="p-4">
            {authSettingsLoading ? (
              <div className="p-6 text-center">
                <div className="w-6 h-6 rounded-full animate-spin mx-auto mb-2" style={{ border: '2px solid #e5e7eb', borderTopColor: '#0891b2' }} />
                <p className="text-gray-400 text-xs">טוען הגדרות...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Email Verification Toggle */}
                <div className="p-4 rounded-xl border-2 border-gray-100 hover:border-cyan-200 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${authSettings.emailVerificationEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <svg className={`w-4 h-4 ${authSettings.emailVerificationEnabled ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-800">אימות מייל בהרשמה</h4>
                          <p className="text-[10px] text-gray-400">משתמשים חדשים יקבלו קוד 6 ספרות למייל</p>
                        </div>
                      </div>
                      <div className={`text-[10px] px-2.5 py-1 rounded-lg inline-flex items-center gap-1 ${authSettings.emailVerificationEnabled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {authSettings.emailVerificationEnabled ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          )}
                        </svg>
                        {authSettings.emailVerificationEnabled ? 'מופעל - חובת אימות מייל' : 'מבוטל - הרשמה ישירה'}
                      </div>
                    </div>
                    <button
                      onClick={toggleEmailVerification}
                      disabled={authSettingsSaving}
                      className={`relative w-12 h-7 rounded-full transition-all duration-300 flex-shrink-0 ${authSettings.emailVerificationEnabled ? 'bg-cyan-500' : 'bg-gray-300'} ${authSettingsSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${authSettings.emailVerificationEnabled ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {authSettings.updatedAt && (
                    <p className="text-[10px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
                      עודכן לאחרונה: {new Date(authSettings.updatedAt).toLocaleString('he-IL')}
                    </p>
                  )}
                </div>

                {/* Info Box */}
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex gap-2">
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-[11px] text-blue-800 space-y-1">
                      <p>כבה את האימות בזמן <strong>בדיקות ופיתוח</strong> להרשמה מהירה</p>
                      <p>הפעל את האימות ב<strong>פרודקשן</strong> למניעת ספאם וחשבונות מזויפים</p>
                      <p>נדרש הגדרת <code className="bg-blue-100 px-1 rounded text-[10px]">RESEND_API_KEY</code> לשליחת מיילים</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
