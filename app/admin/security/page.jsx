'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SecurityPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [securityData, setSecurityData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'logs' | 'auth'
  
  // Auth settings state
  const [authSettings, setAuthSettings] = useState({ emailVerificationEnabled: false });
  const [authSettingsLoading, setAuthSettingsLoading] = useState(false);
  const [authSettingsSaving, setAuthSettingsSaving] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (data.user.role !== 'admin' && data.user.role !== 'super_admin') {
        router.push('/');
        return;
      }
      setUser(data.user);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

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

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
    if (user) {
      runSecurityScan();
      loadSecurityLogs();
      loadAuthSettings();
    }
  }, [user, runSecurityScan, loadSecurityLogs, loadAuthSettings]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-4" style={{ border: '4px solid rgba(8, 145, 178, 0.2)', borderTopColor: '#0891b2' }}></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getStatusIcon = (status) => {
    if (status === 'ok') return (
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
    if (status === 'warning') return (
      <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
    return (
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8" dir="rtl">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              אבטחת מערכת
            </h1>
            <p className="text-gray-500 text-sm mt-1">סריקה מקיפה של רמת האבטחה במערכת</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={runSecurityScan}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              <svg className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {scanning ? 'סורק...' : 'סרוק שוב'}
            </button>
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              חזרה
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'scan' ? 'text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            style={activeTab === 'scan' ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              סריקת אבטחה
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'logs' ? 'text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            style={activeTab === 'logs' ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              לוג אבטחה
          </button>
          <button
            onClick={() => setActiveTab('auth')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'auth' ? 'text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            style={activeTab === 'auth' ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
              הגדרות אימות
          </button>
        </div>

        {/* Security Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                לוג אירועי אבטחה
              </h2>
              <button
                onClick={loadSecurityLogs}
                disabled={logsLoading}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                {logsLoading ? 'טוען...' : 'רענן'}
              </button>
            </div>
            <div className="p-4">
              {logsLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-2" style={{ border: '3px solid #ddd', borderTopColor: '#0891b2' }}></div>
                  <p className="text-gray-500 text-sm">טוען לוגים...</p>
                </div>
              ) : securityLogs.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  <p className="text-gray-500">אין אירועי אבטחה</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {securityLogs.map((log, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${
                      log.action?.includes('fail') || log.action?.includes('error') || log.action?.includes('block') 
                        ? 'bg-red-50 border-red-200' 
                        : log.action?.includes('warn') 
                        ? 'bg-amber-50 border-amber-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
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
                              <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs">{log.category}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-900 font-medium">{log.details?.message || log.action || 'אירוע אבטחה'}</p>
                          {log.actorName && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> {log.actorName}</p>
                          )}
                          {log.ip && (
                            <p className="text-xs text-gray-500 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg> IP: {log.ip}</p>
                          )}
                          {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 1 && (
                            <details className="mt-2">
                              <summary className="text-xs text-blue-600 cursor-pointer hover:underline">פרטים נוספים</summary>
                              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto" dir="ltr">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                        <div className="text-left text-xs text-gray-500 whitespace-nowrap">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString('he-IL') : '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'scan' && securityData && (
          <>
            {/* Overall Score Card */}
            <div className={`bg-white rounded-xl p-6 border-2 shadow-lg mb-6 ${securityData.overallScore >= 85 ? 'border-green-300' : securityData.overallScore >= 70 ? 'border-amber-300' : 'border-red-300'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">ציון אבטחה כללי</h2>
                  <p className="text-sm text-gray-500">
                    {securityData.overallScore >= 85 ? 'המערכת מאובטחת היטב' : 
                     securityData.overallScore >= 70 ? 'יש מקום לשיפור' : 
                     'נדרשת תשומת לב מיידית'}
                  </p>
                </div>
                <div className="text-center">
                  <div className={`text-5xl font-bold ${getScoreColor(securityData.overallScore)}`}>
                    {securityData.overallScore}%
                  </div>
                  <div className="w-32 bg-gray-200 rounded-full h-3 mt-2">
                    <div className={`h-3 rounded-full ${getScoreBg(securityData.overallScore)}`} style={{ width: `${securityData.overallScore}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {securityData.categories && Object.entries(securityData.categories).map(([key, category]) => (
                <div key={key} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <button 
                    onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${category.score >= 80 ? 'bg-green-100' : category.score >= 60 ? 'bg-amber-100' : 'bg-red-100'}`}>
                        <span className={`text-xl font-bold ${getScoreColor(category.score)}`}>{category.score}</span>
                      </div>
                      <div className="text-right">
                        <h3 className="font-bold text-gray-900">{category.name}</h3>
                        <p className="text-xs text-gray-500">{category.checks?.length || 0} בדיקות</p>
                      </div>
                    </div>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedCategory === key ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {expandedCategory === key && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="space-y-3">
                        {category.checks?.map((check, i) => (
                          <div key={i} className={`p-3 rounded-lg ${check.status === 'ok' ? 'bg-green-50 border border-green-200' : check.status === 'warning' ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
                            <div className="flex items-start gap-3">
                              {getStatusIcon(check.status)}
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{check.name}</p>
                                <p className="text-sm text-gray-600">{check.message}</p>
                                {check.recommendation && (
                                  <p className="text-xs text-blue-600 mt-1">המלצה: {check.recommendation}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {securityData.recommendations && securityData.recommendations.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">המלצות לשיפור האבטחה</h2>
                </div>
                <div className="p-4 space-y-4">
                  {securityData.recommendations.map((rec, i) => (
                    <div key={i} className={`p-4 rounded-lg ${rec.priority === 'critical' ? 'bg-red-50 border-2 border-red-300' : rec.priority === 'high' ? 'bg-amber-50 border border-amber-200' : rec.priority === 'medium' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                      <div className="flex items-start gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${rec.priority === 'critical' ? 'bg-red-500 text-white' : rec.priority === 'high' ? 'bg-amber-500 text-white' : rec.priority === 'medium' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'}`}>
                          {rec.priority === 'critical' ? 'קריטי' : rec.priority === 'high' ? 'גבוה' : rec.priority === 'medium' ? 'בינוני' : 'נמוך'}
                        </span>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">{rec.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                          {rec.code && (
                            <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto" dir="ltr">
                              {rec.code}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Best Practices */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">מה קיים במערכת</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-900">הצפנת סיסמאות עם bcrypt</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-900">אימות JWT מאובטח</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-900">Rate Limiting לנקודות קצה</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-900">הגנה על Routes לפי תפקיד</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-900">Cookies מאובטחים (httpOnly, secure)</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-900">חיבור מוצפן לדאטהבייס (SSL)</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'scan' && !securityData && !scanning && (
          <div className="bg-white rounded-xl p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-gray-500">לחץ על סרוק שוב להפעלת סריקת אבטחה</p>
          </div>
        )}

        {/* Auth Settings Tab */}
        {activeTab === 'auth' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                הגדרות אימות משתמשים
              </h2>
              <p className="text-sm text-gray-500 mt-1">שליטה באופן האימות של משתמשים חדשים</p>
            </div>
            <div className="p-6">
              {authSettingsLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-2" style={{ border: '3px solid #ddd', borderTopColor: '#0891b2' }}></div>
                  <p className="text-gray-500 text-sm">טוען הגדרות...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Email Verification Toggle */}
                  <div className="p-5 rounded-xl border-2 border-gray-200 hover:border-cyan-300 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${authSettings.emailVerificationEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                            <svg className={`w-5 h-5 ${authSettings.emailVerificationEnabled ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">אימות מייל בהרשמה</h3>
                            <p className="text-sm text-gray-500">משתמשים חדשים יקבלו קוד 6 ספרות למייל</p>
                          </div>
                        </div>
                        <div className={`text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${authSettings.emailVerificationEnabled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {authSettings.emailVerificationEnabled ? (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                              מופעל - משתמשים חייבים לאמת מייל לפני סיום ההרשמה
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              מבוטל - הרשמה ישירה ללא אימות מייל
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={toggleEmailVerification}
                        disabled={authSettingsSaving}
                        className={`relative w-14 h-8 rounded-full transition-all duration-300 ${authSettings.emailVerificationEnabled ? 'bg-cyan-500' : 'bg-gray-300'} ${authSettingsSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${authSettings.emailVerificationEnabled ? 'right-1' : 'left-1'}`}></span>
                      </button>
                    </div>
                    {authSettings.updatedAt && (
                      <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100">
                        עודכן לאחרונה: {new Date(authSettings.updatedAt).toLocaleString('he-IL')}
                      </p>
                    )}
                  </div>

                  {/* Info Box */}
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex gap-3">
                      <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">מתי להשתמש?</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>כבה את האימות בזמן <strong>בדיקות ופיתוח</strong> להרשמה מהירה</li>
                          <li>הפעל את האימות ב<strong>פרודקשן</strong> למניעת ספאם וחשבונות מזויפים</li>
                          <li>נדרש הגדרת <code className="bg-blue-100 px-1 rounded">RESEND_API_KEY</code> לשליחת מיילים</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
