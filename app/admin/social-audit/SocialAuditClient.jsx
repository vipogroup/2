'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const REPORT_TYPES = {
  social_metadata_audit: {
    label: 'Social Metadata Audit',
    hebrewLabel: 'ביקורת מטא-דאטה חברתית',
    description: 'בדיקת Open Graph tags, Twitter Cards ותאימות',
    icon: null,
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  },
  social_preview_shareability: {
    label: 'Social Preview & Shareability',
    hebrewLabel: 'תצוגה מקדימה ושיתוף',
    description: 'סימולציית Preview לפלטפורמות חברתיות',
    icon: null,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  social_crawlability_discovery: {
    label: 'Crawlability & Discovery',
    hebrewLabel: 'סריקה וגילוי',
    description: 'HTTP headers, redirects, sitemap וזמינות',
    icon: null,
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  },
};

const TABS = [
  { id: 'overview', label: 'סקירה כללית' },
  { id: 'scan', label: 'סריקה חדשה' },
  { id: 'reports', label: 'דוחות' },
  { id: 'history', label: 'היסטוריה' },
];

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', icon: 'FB' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'WA' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'LI' },
  { id: 'twitter', label: 'Twitter/X', icon: 'X' },
];

export default function SocialAuditClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(tabParam || 'overview');
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filter, setFilter] = useState({ type: 'all', status: 'all', platform: 'all' });

  useEffect(() => {
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function loadReports() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.type !== 'all') params.set('type', filter.type);
      if (filter.status !== 'all') params.set('status', filter.status);
      if (filter.platform !== 'all') params.set('platform', filter.platform);
      params.set('limit', '50');

      const res = await fetch(`/api/admin/social-audit?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (res.ok) {
        setReports(json.reports || []);
        setStats(json.stats || {});
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }

  async function runSocialAudit(reportTypes = null) {
    if (scanning) return;
    setScanning(true);
    setScanResult(null);

    try {
      const body = {
        action: 'scan',
        reportTypes: reportTypes || ['social_metadata_audit', 'social_preview_shareability', 'social_crawlability_discovery'],
      };

      const res = await fetch('/api/admin/social-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (res.ok) {
        setScanResult(json);
        loadReports();
      } else {
        alert(json.error || 'שגיאה בסריקה');
      }
    } catch (err) {
      console.error('Scan failed:', err);
      alert('שגיאת רשת');
    } finally {
      setScanning(false);
    }
  }

  async function loadReport(reportId) {
    try {
      const res = await fetch(`/api/admin/social-audit/${reportId}`, { credentials: 'include' });
      const json = await res.json();
      if (res.ok) {
        setSelectedReport(json.report);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    }
  }

  async function exportReport(reportId, format) {
    try {
      const res = await fetch(`/api/admin/social-audit/export?reportId=${reportId}&format=${format}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const blob = await res.blob();
        const contentDisposition = res.headers.get('Content-Disposition');
        const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `report.${format}`;
        downloadBlob(blob, filename);
      } else {
        const json = await res.json();
        alert(json.error || 'שגיאה בייצוא');
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('שגיאה בייצוא הדוח');
    }
  }

  async function deleteReport(reportId) {
    if (!confirm('האם למחוק את הדוח?')) return;
    try {
      const res = await fetch(`/api/admin/social-audit/${reportId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setReports(reports.filter(r => r.reportId !== reportId));
        if (selectedReport?.reportId === reportId) setSelectedReport(null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const getStatusBadge = (status) => {
    const styles = {
      PASS: 'bg-green-100 text-green-800 border-green-300',
      WARN: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      FAIL: 'bg-red-100 text-red-800 border-red-300',
    };
    const icons = { PASS: 'V', WARN: '!', FAIL: 'X' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100'}`}>
        {icons[status]} {status}
      </span>
    );
  };

  const getSeverityBadge = (severity) => {
    const styles = {
      critical: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      info: 'bg-blue-100 text-blue-800',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[severity] || 'bg-gray-100'}`}>
        {severity}
      </span>
    );
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  const isSocialReady = stats.failCount === 0 && reports.length > 0 && reports.every(r => r.status !== 'FAIL');

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            <svg className="w-8 h-8" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Social Networks Discoverability & Preview Audits
          </h1>
          <p className="text-gray-600 text-sm mt-1">זיהוי, בדיקה ואבחון תצוגת שיתופים ברשתות חברתיות</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/system-reports"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 bg-gray-100 text-sm font-medium transition-all hover:bg-gray-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            System Reports
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            חזרה
          </Link>
        </div>
      </div>

      {/* Social Ready Status Banner */}
      <div className={`mb-6 p-4 rounded-xl border-2 ${isSocialReady ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className={`text-3xl ${isSocialReady ? 'text-green-500' : 'text-yellow-500'}`}>{isSocialReady ? 'V' : '!'}</span>
            <div>
              <h2 className="font-bold text-lg">{isSocialReady ? 'האתר מוכן לשיתוף!' : 'נדרשות התאמות'}</h2>
              <p className="text-sm text-gray-600">
                {isSocialReady
                  ? 'כל הבדיקות עברו בהצלחה - האתר מוכן לשיתוף ברשתות חברתיות'
                  : 'יש בעיות שצריך לתקן כדי לשפר את תצוגת השיתופים'}
              </p>
            </div>
          </div>
          <button
            onClick={() => runSocialAudit()}
            disabled={scanning}
            className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            {scanning ? 'סורק...' : 'סריקה מלאה'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.totalReports || 0}</div>
              <div className="text-xs text-gray-500 mt-1">סה&quot;כ דוחות</div>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.passCount || 0}</div>
              <div className="text-xs text-gray-500 mt-1">עברו</div>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">{stats.warnCount || 0}</div>
              <div className="text-xs text-gray-500 mt-1">אזהרות</div>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{stats.failCount || 0}</div>
              <div className="text-xs text-gray-500 mt-1">נכשלו</div>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-3xl font-bold text-cyan-600">{Math.round(stats.avgScore || 0)}%</div>
              <div className="text-xs text-gray-500 mt-1">ציון ממוצע</div>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">{(stats.totalCritical || 0) + (stats.totalWarnings || 0)}</div>
              <div className="text-xs text-gray-500 mt-1">סה&quot;כ בעיות</div>
            </div>
          </div>

          {/* Report Types Overview */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-bold mb-4 text-lg">סוגי דוחות</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(REPORT_TYPES).map(([key, type]) => {
                const typeReports = reports.filter(r => r.reportType === key);
                const lastReport = typeReports[0];
                return (
                  <div key={key} className={`p-4 rounded-xl border-2 ${type.color}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{type.icon}</span>
                      <div>
                        <h4 className="font-bold text-sm">{type.hebrewLabel}</h4>
                        <p className="text-xs opacity-75">{type.description}</p>
                      </div>
                    </div>
                    {lastReport ? (
                      <div className="flex items-center justify-between">
                        {getStatusBadge(lastReport.status)}
                        <span className="text-xs">{lastReport.score}%</span>
                      </div>
                    ) : (
                      <p className="text-xs opacity-75">טרם נסרק</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Platform Status */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-bold mb-4 text-lg">סטטוס פלטפורמות</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {PLATFORMS.map(platform => {
                const platformIssues = reports.reduce((sum, r) => {
                  return sum + (r.platformSummary?.[platform.id]?.issues || 0);
                }, 0);
                const hasIssues = platformIssues > 0;
                return (
                  <div
                    key={platform.id}
                    className={`p-4 rounded-xl border-2 text-center ${
                      hasIssues ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="text-3xl mb-2">{platform.icon}</div>
                    <div className="font-medium">{platform.label}</div>
                    <div className={`text-sm ${hasIssues ? 'text-yellow-600' : 'text-green-600'}`}>
                      {hasIssues ? `${platformIssues} בעיות` : '[v] תקין'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Issues */}
          {reports.some(r => r.issues?.length > 0) && (
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-bold mb-4 text-lg">בעיות אחרונות</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {reports.slice(0, 3).flatMap(r => (r.issues || []).slice(0, 3)).map((issue, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border-r-4 ${
                      issue.severity === 'critical' ? 'bg-red-50 border-red-500' :
                      issue.severity === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{issue.issue_description || issue.issue_type}</p>
                        <p className="text-xs text-gray-500 truncate mt-1">{issue.page_url}</p>
                      </div>
                      {getSeverityBadge(issue.severity)}
                    </div>
                    {issue.recommended_fix && (
                      <p className="text-xs text-green-700 mt-2 bg-green-50 p-2 rounded">{issue.recommended_fix}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Scan */}
      {activeTab === 'scan' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-900 to-cyan-700 rounded-xl p-6 text-white">
            <h2 className="text-xl font-bold mb-2">סריקת Social Audit</h2>
            <p className="text-blue-100 mb-4 text-sm">סריקה מקיפה של מטא-דאטה חברתית, תצוגות מקדימות ויכולת גילוי</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => runSocialAudit()}
                disabled={scanning}
                className="px-6 py-3 bg-white text-blue-900 font-bold rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                {scanning ? 'סורק...' : 'סריקה מלאה (3 דוחות)'}
              </button>
              <button
                onClick={() => runSocialAudit(['social_metadata_audit'])}
                disabled={scanning}
                className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 disabled:opacity-50"
              >
                Metadata בלבד
              </button>
              <button
                onClick={() => runSocialAudit(['social_preview_shareability'])}
                disabled={scanning}
                className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 disabled:opacity-50"
              >
                Preview בלבד
              </button>
              <button
                onClick={() => runSocialAudit(['social_crawlability_discovery'])}
                disabled={scanning}
                className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 disabled:opacity-50"
              >
                Crawlability בלבד
              </button>
            </div>
          </div>

          {/* Scan Result */}
          {scanResult && (
            <div className={`rounded-xl border-2 p-6 ${
              scanResult.isSocialReady ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-4xl ${scanResult.isSocialReady ? 'text-green-500' : 'text-yellow-500'}`}>{scanResult.isSocialReady ? 'V' : '!'}</span>
                <div>
                  <h3 className="font-bold text-lg">
                    {scanResult.isSocialReady ? 'האתר מוכן לשיתוף!' : 'נמצאו בעיות'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    סטטוס: {scanResult.overallStatus} | {scanResult.reportsGenerated} דוחות נוצרו | {scanResult.scannedPages} עמודים נסרקו
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {scanResult.reports?.map(r => (
                  <div
                    key={r.reportId}
                    onClick={() => loadReport(r.reportId)}
                    className="bg-white p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">{REPORT_TYPES[r.reportType]?.icon}</span>
                      {getStatusBadge(r.status)}
                    </div>
                    <h4 className="font-medium text-sm">{REPORT_TYPES[r.reportType]?.hebrewLabel}</h4>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-gray-500">{r.issuesCount} בעיות</span>
                      <span className="font-bold">{r.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What gets checked */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-bold mb-4">מה נבדק?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-cyan-700 mb-2">Metadata Audit</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• og:title, og:description, og:image</li>
                  <li>• og:url, og:type</li>
                  <li>• twitter:card, twitter:title</li>
                  <li>• twitter:description, twitter:image</li>
                  <li>• התאמה בין title/meta ↔ og ↔ twitter</li>
                  <li>• תקינות תמונות (פורמט, גודל, זמינות)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-700 mb-2">Preview & Shareability</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• תצוגת Preview לפייסבוק/ווטסאפ</li>
                  <li>• תצוגת Preview ללינקדאין</li>
                  <li>• תצוגת Preview לטוויטר</li>
                  <li>• זיהוי תמונה שגויה/טקסט גנרי</li>
                  <li>• בעיות Cache</li>
                  <li>• Redirect לפני preview</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-cyan-700 mb-2">Crawlability & Discovery</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• HTTP status codes</li>
                  <li>• Cache-control headers</li>
                  <li>• Redirect chains</li>
                  <li>• robots.txt / meta robots</li>
                  <li>• זמינות sitemap</li>
                  <li>• עמודים יתומים (orphans)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border">
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">כל הסוגים</option>
              {Object.entries(REPORT_TYPES).map(([key, type]) => (
                <option key={key} value={key}>{type.icon} {type.hebrewLabel}</option>
              ))}
            </select>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="PASS">PASS</option>
              <option value="WARN">WARN</option>
              <option value="FAIL">FAIL</option>
            </select>
            <select
              value={filter.platform}
              onChange={(e) => setFilter({ ...filter, platform: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">כל הפלטפורמות</option>
              {PLATFORMS.map(p => (
                <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
              ))}
            </select>
          </div>

          {/* Reports Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reports List */}
            <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-10">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl">
                  <p className="text-gray-500">אין דוחות. הפעל סריקה ראשונה.</p>
                </div>
              ) : (
                reports.map(r => (
                  <div
                    key={r.reportId}
                    onClick={() => loadReport(r.reportId)}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      selectedReport?.reportId === r.reportId
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span>{REPORT_TYPES[r.reportType]?.icon}</span>
                      {getStatusBadge(r.status)}
                      <span className="text-sm font-bold">{r.score}%</span>
                    </div>
                    <h3 className="font-medium text-sm truncate">{REPORT_TYPES[r.reportType]?.hebrewLabel}</h3>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{formatDate(r.createdAt)}</span>
                      <span>{r.summary?.totalIssues || 0} בעיות</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Report Detail */}
            <div className="lg:col-span-2">
              {selectedReport ? (
                <div className="bg-white rounded-xl border-2 overflow-hidden">
                  {/* Report Header */}
                  <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-bold">{selectedReport.title}</h2>
                        <p className="text-sm opacity-90 mt-1">{selectedReport.description}</p>
                        <p className="text-xs opacity-75 mt-2">{formatDate(selectedReport.createdAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => exportReport(selectedReport.reportId, 'json')}
                          className="px-3 py-1.5 bg-white/20 rounded text-xs hover:bg-white/30"
                        >
                          JSON
                        </button>
                        <button
                          onClick={() => exportReport(selectedReport.reportId, 'html')}
                          className="px-3 py-1.5 bg-white/20 rounded text-xs hover:bg-white/30"
                        >
                          HTML
                        </button>
                        <button
                          onClick={() => exportReport(selectedReport.reportId, 'md')}
                          className="px-3 py-1.5 bg-white/20 rounded text-xs hover:bg-white/30"
                        >
                          MD
                        </button>
                        <button
                          onClick={() => deleteReport(selectedReport.reportId)}
                          className="px-3 py-1.5 bg-red-500/50 rounded text-xs hover:bg-red-500/70"
                        >
                          X
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      {getStatusBadge(selectedReport.status)}
                      <span className="text-lg font-bold">{selectedReport.score}%</span>
                      <span className={`px-2 py-1 rounded text-xs ${selectedReport.isSocialReady ? 'bg-green-500/30' : 'bg-yellow-500/30'}`}>
                        {selectedReport.isSocialReady ? 'Social Ready' : 'Not Ready'}
                      </span>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b">
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">{selectedReport.summary?.totalPages || 0}</div>
                      <div className="text-xs text-gray-500">עמודים</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-600">{selectedReport.summary?.criticalIssues || 0}</div>
                      <div className="text-xs text-gray-500">קריטי</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-yellow-600">{selectedReport.summary?.warningIssues || 0}</div>
                      <div className="text-xs text-gray-500">אזהרות</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">{selectedReport.summary?.passedChecks || 0}</div>
                      <div className="text-xs text-gray-500">עברו</div>
                    </div>
                  </div>

                  {/* Platform Summary */}
                  {selectedReport.platformSummary && (
                    <div className="p-4 border-b">
                      <h4 className="font-medium mb-3 text-sm">סטטוס פלטפורמות</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {Object.entries(selectedReport.platformSummary).map(([platform, data]) => (
                          <div
                            key={platform}
                            className={`p-2 rounded text-center text-xs ${
                              data.status === 'PASS' ? 'bg-green-100' :
                              data.status === 'WARN' ? 'bg-yellow-100' : 'bg-red-100'
                            }`}
                          >
                            <div>{PLATFORMS.find(p => p.id === platform)?.icon}</div>
                            <div className="font-medium capitalize">{platform}</div>
                            <div>{data.issues || 0} issues</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Issues List */}
                  <div className="p-4 max-h-80 overflow-y-auto">
                    <h4 className="font-medium mb-3 text-sm">לוג בעיות ({selectedReport.issues?.length || 0})</h4>
                    {selectedReport.issues?.length > 0 ? (
                      <div className="space-y-2">
                        {selectedReport.issues.map((issue, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border-r-4 ${
                              issue.severity === 'critical' ? 'bg-red-50 border-red-500' :
                              issue.severity === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                              'bg-blue-50 border-blue-500'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {getSeverityBadge(issue.severity)}
                                  {issue.tag_type && (
                                    <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">{issue.tag_type}</span>
                                  )}
                                  {issue.platform && (
                                    <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">{issue.platform}</span>
                                  )}
                                </div>
                                <p className="text-sm font-medium mt-1">{issue.issue_description || issue.issue_type}</p>
                                <p className="text-xs text-gray-500 mt-1 truncate">{issue.page_url}</p>
                                {issue.recommended_fix && (
                                  <p className="text-xs text-green-700 mt-2 bg-green-50 p-2 rounded">{issue.recommended_fix}</p>
                                )}
                                {issue.technical_fix_hint && (
                                  <p className="text-xs text-blue-700 mt-1 bg-blue-50 p-2 rounded">{issue.technical_fix_hint}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-green-50 rounded-lg">
                        <span className="text-4xl text-green-500">V</span>
                        <p className="text-green-700 mt-2">לא נמצאו בעיות!</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-10 text-center">
                  <span className="text-5xl text-cyan-600">R</span>
                  <p className="text-gray-500 mt-3">בחר דוח מהרשימה לצפייה בפרטים</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right p-4">תאריך</th>
                <th className="text-right p-4">סוג דוח</th>
                <th className="text-right p-4">סטטוס</th>
                <th className="text-right p-4">ציון</th>
                <th className="text-right p-4">בעיות</th>
                <th className="text-right p-4">הופעל ע&quot;י</th>
                <th className="text-right p-4">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.reportId} className="border-t hover:bg-gray-50">
                  <td className="p-4 text-xs">{formatDate(r.createdAt)}</td>
                  <td className="p-4">
                    <span className="flex items-center gap-2">
                      <span>{REPORT_TYPES[r.reportType]?.icon}</span>
                      <span className="text-xs">{REPORT_TYPES[r.reportType]?.hebrewLabel}</span>
                    </span>
                  </td>
                  <td className="p-4">{getStatusBadge(r.status)}</td>
                  <td className="p-4 font-bold">{r.score}%</td>
                  <td className="p-4">
                    <span className="text-red-600">{r.summary?.criticalIssues || 0}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-yellow-600">{r.summary?.warningIssues || 0}</span>
                  </td>
                  <td className="p-4 text-xs text-gray-500">{r.trigger || 'manual'}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <button
                        onClick={() => { loadReport(r.reportId); setActiveTab('reports'); }}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                      >
                        צפה
                      </button>
                      <button
                        onClick={() => exportReport(r.reportId, 'html')}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                      >
                        ייצא
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reports.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500">אין היסטוריית דוחות</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
