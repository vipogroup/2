'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

import { useControlCenterTenant } from '../ControlCenterContext';

const TYPE_LABELS = {
  integration: { label: 'אינטגרציה', color: 'bg-cyan-100 text-cyan-800' },
  security: { label: 'אבטחה', color: 'bg-red-100 text-red-800' },
  performance: { label: 'ביצועים', color: 'bg-blue-100 text-blue-800' },
  audit: { label: 'ביקורת', color: 'bg-yellow-100 text-yellow-800' },
  backup: { label: 'גיבוי', color: 'bg-green-100 text-green-800' },
  custom: { label: 'כללי', color: 'bg-gray-100 text-gray-800' },
  executive: { label: 'הנהלה', color: 'bg-cyan-100 text-cyan-800' },
  financial: { label: 'כספים', color: 'bg-emerald-100 text-emerald-800' },
  operational: { label: 'תפעולי', color: 'bg-orange-100 text-orange-800' },
  risk: { label: 'סיכונים', color: 'bg-rose-100 text-rose-800' },
  meta: { label: 'מטא', color: 'bg-cyan-100 text-cyan-800' },
};

export default function ReportsScanTab({ user }) {
  const cc = useControlCenterTenant();
  const selectedTenantId = cc?.selectedTenantId;
  const isSuperAdmin = cc?.isSuperAdmin;

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filter, setFilter] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [envAnalysis, setEnvAnalysis] = useState(null);
  const [issuesLog, setIssuesLog] = useState(null);
  const [scans, setScans] = useState([]);
  const [seoData, setSeoData] = useState(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [attrSummary, setAttrSummary] = useState(null);
  const [attrLoading, setAttrLoading] = useState(false);

  const loadAttributionSummary = useCallback(async () => {
    setAttrLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('days', '30');
      if (isSuperAdmin && selectedTenantId) params.set('tenantId', selectedTenantId);
      const res = await fetch(`/api/admin/attribution/summary?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (res.ok) setAttrSummary(json);
      else setAttrSummary(null);
    } catch {
      setAttrSummary(null);
    } finally {
      setAttrLoading(false);
    }
  }, [isSuperAdmin, selectedTenantId]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('type', filter);
      const res = await fetch(`/api/admin/system-reports?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (res.ok) setReports(json.reports || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadReports();
    loadScans();
  }, [loadReports]);

  useEffect(() => {
    loadAttributionSummary();
  }, [loadAttributionSummary]);

  async function runSystemScan() {
    if (scanning) return;
    setScanning(true);
    setScanProgress({ status: 'running', message: 'מתחיל סריקה...' });
    setEnvAnalysis(null);
    setIssuesLog(null);

    try {
      const res = await fetch('/api/admin/system-reports/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scope: 'full', generateReports: true }),
      });
      const json = await res.json();

      if (res.ok) {
        setScanProgress({
          status: 'completed',
          message: `סריקה הושלמה! ציון: ${json.results?.score}% | ${json.reportsGenerated} דוחות נוצרו`,
        });
        setEnvAnalysis(json.envAnalysis);
        setIssuesLog(json.issuesLog);
        loadReports();
        loadScans();
      } else {
        setScanProgress({ status: 'failed', message: json.error || 'שגיאה בסריקה' });
      }
    } catch (err) {
      setScanProgress({ status: 'failed', message: 'שגיאת רשת' });
    } finally {
      setScanning(false);
    }
  }

  async function loadScans() {
    try {
      const res = await fetch('/api/admin/system-reports/scan?limit=10', { credentials: 'include' });
      const json = await res.json();
      if (res.ok) setScans(json.scans || []);
    } catch (err) {
      console.error('Failed to load scans:', err);
    }
  }

  async function runSeoAudit() {
    if (seoLoading) return;
    setSeoLoading(true);
    try {
      const res = await fetch('/api/admin/seo-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'scan', reportTypes: ['technical_seo', 'content_coverage', 'web_vitals'] }),
      });
      const json = await res.json();
      if (res.ok) {
        setSeoData(json);
      } else {
        alert(json.error || 'שגיאה בסריקת SEO');
      }
    } catch (err) {
      console.error('SEO audit failed:', err);
      alert('שגיאת רשת בסריקת SEO');
    } finally {
      setSeoLoading(false);
    }
  }

  async function copyReportToClipboard(report) {
    const text = `${report.title}\n${'='.repeat(report.title.length)}\n\nתאריך: ${formatDate(report.createdAt)}\nסיכום: ${report.summary || ''}\n\n${report.content}`;
    try {
      await navigator.clipboard.writeText(text);
      alert('הדוח הועתק ללוח!');
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('הדוח הועתק ללוח!');
    }
  }


  async function loadReport(id) {
    try {
      const res = await fetch(`/api/admin/system-reports/${id}`, { credentials: 'include' });
      const json = await res.json();
      if (res.ok) setSelectedReport(json.report);
    } catch (err) {
      console.error('Failed to load report:', err);
    }
  }

  async function deleteReport(id) {
    if (!confirm('האם למחוק את הדוח?')) return;
    try {
      const res = await fetch(`/api/admin/system-reports/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setReports(reports.filter(r => r.id !== id));
        if (selectedReport?.id === id) setSelectedReport(null);
      }
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  }

  async function generateReport(reportType) {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/system-reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reportType }),
      });
      if (res.ok) {
        alert('דוח נוצר בהצלחה!');
        loadReports();
      }
    } catch (err) {
      alert('שגיאת רשת');
    } finally {
      setGenerating(false);
    }
  }

  function formatMarkdownToHtml(md) {
    if (!md) return '';
    return md
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/```[\s\S]*?```/g, (m) => `<pre>${m.slice(3, -3)}</pre>`)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');
  }

  function downloadReport(report, format) {
    const filename = `VIPO_${report.type}_${new Date(report.createdAt).toISOString().split('T')[0]}`;
    if (format === 'md') {
      const blob = new Blob([report.content], { type: 'text/markdown;charset=utf-8' });
      downloadBlob(blob, `${filename}.md`);
    } else if (format === 'json') {
      const data = { ...report, exportedAt: new Date().toISOString() };
      delete data.contentHtml;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      downloadBlob(blob, `${filename}.json`);
    } else if (format === 'html') {
      const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><title>${report.title}</title><style>body{font-family:sans-serif;max-width:900px;margin:0 auto;padding:40px;background:#f5f5f5}h1{color:#1e3a8a}pre{background:#eee;padding:15px;overflow-x:auto}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:12px;text-align:right}</style></head><body><h1>${report.title}</h1><p>תאריך: ${formatDate(report.createdAt)}</p><hr/><div>${formatMarkdownToHtml(report.content)}</div></body></html>`;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      downloadBlob(blob, `${filename}.html`);
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

  function csvEscapeCell(val) {
    const s = String(val ?? '');
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function exportAttributionSummaryCsv() {
    if (!attrSummary) return;
    const s = attrSummary;
    const lines = [];
    lines.push(['metric', 'value'].map(csvEscapeCell).join(','));
    const kpi = [
      ['days', s.days ?? 30],
      ['orderCount', s.orderCount ?? 0],
      ['ordersWithAttribution', s.ordersWithAttribution ?? 0],
      ['coveragePercent', s.coveragePercent ?? 0],
      ['multiTouchJourneys', s.multiTouchJourneys ?? 0],
      ['exportedAt', new Date().toISOString()],
    ];
    if (isSuperAdmin && selectedTenantId) {
      kpi.push(['tenantIdFilter', selectedTenantId]);
    }
    kpi.forEach(([k, v]) => lines.push([k, v].map(csvEscapeCell).join(',')));
    lines.push('');
    lines.push(['breakdown', 'utm_source', 'orders', 'revenue_ils'].map(csvEscapeCell).join(','));
    (Array.isArray(s.bySource) ? s.bySource : []).forEach((row) => {
      lines.push(['by_source', row.source, row.count, row.revenue].map(csvEscapeCell).join(','));
    });
    lines.push('');
    lines.push(['breakdown', 'utm_campaign', 'orders', 'revenue_ils'].map(csvEscapeCell).join(','));
    (Array.isArray(s.byCampaign) ? s.byCampaign : []).forEach((row) => {
      lines.push(['by_campaign', row.campaign, row.count, row.revenue].map(csvEscapeCell).join(','));
    });
    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const dayPart = new Date().toISOString().slice(0, 10);
    const days = s.days ?? 30;
    downloadBlob(blob, `VIPO_attribution_${days}d_${dayPart}.csv`);
  }

  const formatDate = (date) => new Date(date).toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* ── Scan Hero ── */}
      <div className="rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
        <h2 className="text-lg font-extrabold mb-1 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          סריקת מערכת מלאה
        </h2>
        <p className="text-blue-100 text-sm mb-4">סריקה מקיפה של כל רכיבי המערכת ויצירת 8 דוחות אוטומטיים</p>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={runSystemScan}
            disabled={scanning}
            className="px-6 py-2.5 bg-white text-blue-900 font-bold rounded-lg hover:bg-blue-50 disabled:opacity-50 text-sm transition-all"
          >
            {scanning ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
                סורק...
              </span>
            ) : 'הפעל סריקה מלאה'}
          </button>
          {scanProgress && (
            <div className={`px-4 py-2 rounded-lg text-sm ${
              scanProgress.status === 'completed' ? 'bg-green-500/20' :
              scanProgress.status === 'failed' ? 'bg-red-500/20' :
              'bg-blue-500/20'
            }`}>
              {scanProgress.message}
            </div>
          )}
        </div>
      </div>

      {/* ── מקורות הגעה (UTM) — 30 יום ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              מקורות הגעה (UTM)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              נתונים נשמרים בהזמנה לפי last-touch; מסע first→last מוצג כשהשדות שונים. אחסון בדפדפן (למסע בין עמודים) רק אחרי אישור עוגיות.
              {isSuperAdmin && !selectedTenantId ? ' · כל החנויות' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportAttributionSummaryCsv}
              disabled={!attrSummary || attrLoading}
              className="text-xs font-semibold text-gray-700 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 disabled:opacity-40"
            >
              ייצוא CSV
            </button>
            <button
              type="button"
              onClick={loadAttributionSummary}
              disabled={attrLoading}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 disabled:opacity-50"
            >
              {attrLoading ? 'טוען…' : 'רענן'}
            </button>
          </div>
        </div>
        {attrLoading && !attrSummary ? (
          <p className="text-sm text-gray-500">טוען נתוני אטריביושן…</p>
        ) : attrSummary ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="text-[11px] text-gray-500">הזמנות בטווח</div>
                <div className="text-xl font-bold text-gray-900">{attrSummary.orderCount ?? 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50/80 border border-indigo-100">
                <div className="text-[11px] text-indigo-700">עם UTM / מזהה קליק</div>
                <div className="text-xl font-bold text-indigo-900">{attrSummary.ordersWithAttribution ?? 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-100">
                <div className="text-[11px] text-emerald-800">כיסוי</div>
                <div className="text-xl font-bold text-emerald-900">{attrSummary.coveragePercent ?? 0}%</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50/90 border border-amber-100">
                <div className="text-[11px] text-amber-900">מסע רב־מגע (שינוי מקור/קמפיין)</div>
                <div className="text-xl font-bold text-amber-950">{attrSummary.multiTouchJourneys ?? 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="text-[11px] text-gray-500">ימים</div>
                <div className="text-xl font-bold text-gray-900">{attrSummary.days ?? 30}</div>
              </div>
            </div>
            {Array.isArray(attrSummary.bySource) && attrSummary.bySource.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <div className="px-3 py-2 text-xs font-bold text-gray-600 bg-gray-50 border-b border-gray-100">לפי מקור (last-touch · utm_source)</div>
                  <table className="min-w-full text-sm text-right">
                    <thead className="bg-gray-50/80 text-gray-600 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2 font-semibold">utm_source</th>
                        <th className="px-3 py-2 font-semibold">הזמנות</th>
                        <th className="px-3 py-2 font-semibold">הכנסה (סכום)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attrSummary.bySource.map((row) => (
                        <tr key={row.source} className="border-t border-gray-100 hover:bg-gray-50/80">
                          <td className="px-3 py-2 font-medium text-gray-800">{row.source}</td>
                          <td className="px-3 py-2">{row.count}</td>
                          <td className="px-3 py-2 tabular-nums">{row.revenue} ₪</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {Array.isArray(attrSummary.byCampaign) && attrSummary.byCampaign.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <div className="px-3 py-2 text-xs font-bold text-gray-600 bg-gray-50 border-b border-gray-100">לפי קמפיין (last-touch · utm_campaign)</div>
                    <table className="min-w-full text-sm text-right">
                      <thead className="bg-gray-50/80 text-gray-600 text-xs uppercase tracking-wide">
                        <tr>
                          <th className="px-3 py-2 font-semibold">utm_campaign</th>
                          <th className="px-3 py-2 font-semibold">הזמנות</th>
                          <th className="px-3 py-2 font-semibold">הכנסה (סכום)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attrSummary.byCampaign.map((row) => (
                          <tr key={row.campaign} className="border-t border-gray-100 hover:bg-gray-50/80">
                            <td className="px-3 py-2 font-medium text-gray-800">{row.campaign}</td>
                            <td className="px-3 py-2">{row.count}</td>
                            <td className="px-3 py-2 tabular-nums">{row.revenue} ₪</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">אין עדיין הזמנות עם שדות UTM בטווח שנבחר.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">לא ניתן לטעון סיכום אטריביושן.</p>
        )}
      </div>

      {/* ── Scanned Areas ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-gray-700">
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          אזורים נסרקים
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {['Database', 'Users', 'Orders', 'Products', 'Transactions', 'Permissions', 'Integrations', 'Security', 'Payments', 'System Keys'].map(a => (
            <div key={a} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg text-xs font-medium">
              <span className="text-green-500 font-bold">✓</span>{a}
            </div>
          ))}
        </div>
      </div>

      {/* ── Enterprise Reports ── */}
      <div className="rounded-xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
        <h3 className="text-sm font-bold mb-2">Enterprise Reports</h3>
        <p className="text-cyan-100 text-xs mb-3">דוחות ברמת הנהלה שנוצרים אוטומטית בסריקה</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { name: 'Go-Live Readiness', critical: true },
            { name: 'Financial Reconciliation', critical: true },
            { name: 'Missing Keys Impact' },
            { name: 'Risk Matrix' },
            { name: 'Reports Reliability' },
          ].map(r => (
            <div key={r.name} className={`p-2.5 rounded-lg text-xs font-semibold ${r.critical ? 'bg-red-500/25 border border-red-400/50' : 'bg-white/10'}`}>
              {r.name}
              {r.critical && <span className="block text-red-300 text-[10px] mt-0.5">Critical</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Environment Analysis (if available) ── */}
      {envAnalysis && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-bold mb-3 text-gray-700">לוג משתני סביבה</h3>
          <div className="mb-4 p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.04), rgba(8,145,178,0.04))' }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-xs text-gray-500">ציון נוכחי</div>
                <div className="text-2xl font-black text-[#1e3a8a]">{envAnalysis.scoreBreakdown?.current || 0}%</div>
              </div>
              <div className="text-2xl text-gray-300">→</div>
              <div>
                <div className="text-xs text-gray-500">ציון פוטנציאלי</div>
                <div className="text-2xl font-black text-green-600">100%</div>
              </div>
              <div className="bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
                <div className="text-xs text-yellow-700">חסר</div>
                <div className="text-lg font-bold text-yellow-800">+{100 - (envAnalysis.scoreBreakdown?.current || 0)}%</div>
              </div>
            </div>
          </div>

          {envAnalysis.missingVars?.length > 0 && (
            <div className="space-y-1.5 mb-4">
              <h4 className="text-xs font-bold text-red-700">משתנים חסרים ({envAnalysis.missingVars.length})</h4>
              {envAnalysis.missingVars.map(v => (
                <div key={v.key} className="flex items-center justify-between p-2.5 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <code className="bg-red-100 px-1.5 py-0.5 rounded text-red-800 text-[11px] font-mono">{v.key}</code>
                    <span className={`mr-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${v.priority === 'critical' ? 'bg-red-600 text-white' : v.priority === 'high' ? 'bg-orange-500 text-white' : 'bg-yellow-400 text-yellow-900'}`}>{v.priority}</span>
                    <p className="text-[11px] text-gray-500 mt-0.5">{v.description}</p>
                  </div>
                  <div className="text-sm font-bold text-green-600">+{v.percentageGain}%</div>
                </div>
              ))}
            </div>
          )}

          {envAnalysis.configured?.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-green-700 mb-1.5">משתנים מוגדרים ({envAnalysis.configured.length})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {envAnalysis.configured.map(v => (
                  <div key={v.key} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-1.5">
                      <span className="text-green-500 font-bold text-xs">✓</span>
                      <code className="text-[11px] font-mono">{v.key}</code>
                    </div>
                    <span className="text-[10px] text-gray-400">{v.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Issues Log ── */}
      {issuesLog && issuesLog.summary?.totalIssues > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">לוג שגיאות - מה צריך לתקן</h3>
            <div className="flex gap-2 text-xs">
              {issuesLog.summary.totalErrors > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">{issuesLog.summary.totalErrors} שגיאות</span>}
              {issuesLog.summary.totalWarnings > 0 && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">{issuesLog.summary.totalWarnings} אזהרות</span>}
              {issuesLog.summary.totalInfo > 0 && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">{issuesLog.summary.totalInfo} המלצות</span>}
            </div>
          </div>
          <div className="space-y-2">
            {Object.entries(issuesLog.categories || {}).map(([key, category]) => {
              if (category.items.length === 0) return null;
              const borderCls = category.severity === 'error' ? 'border-red-300 bg-red-50' : category.severity === 'warning' ? 'border-yellow-300 bg-yellow-50' : 'border-blue-300 bg-blue-50';
              return (
                <div key={key} className={`rounded-lg border-2 overflow-hidden ${borderCls}`}>
                  <div className="px-3 py-2 font-bold text-xs">{category.title} ({category.items.length})</div>
                  <div className="divide-y divide-white/50">
                    {category.items.map((item, j) => (
                      <div key={j} className="px-3 py-1.5 text-[11px]">{item.message || item}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Reports List ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f2f5' }}>
          <h3 className="text-sm font-bold text-gray-700">דוחות קיימים ({reports.length})</h3>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1"
            >
              <option value="all">הכל</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <Link
              href="/admin/system-reports"
              className="text-[11px] font-semibold hover:opacity-80"
              style={{ color: '#0891b2' }}
            >
              דף דוחות מלא →
            </Link>
          </div>
        </div>

        {/* Report Detail View */}
        {selectedReport ? (
          <div className="p-4">
            <button onClick={() => setSelectedReport(null)} className="text-xs text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              חזרה לרשימה
            </button>
            <h4 className="text-base font-bold text-gray-800 mb-1">{selectedReport.title}</h4>
            <p className="text-xs text-gray-400 mb-3">{formatDate(selectedReport.createdAt)}</p>
            {selectedReport.summary && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-3">{selectedReport.summary}</p>}
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-xs leading-relaxed bg-gray-50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
              {selectedReport.content}
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <button onClick={() => copyReportToClipboard(selectedReport)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>העתק</button>
              <button onClick={() => downloadReport(selectedReport, 'md')} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">MD</button>
              <button onClick={() => downloadReport(selectedReport, 'html')} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">HTML</button>
              <button onClick={() => downloadReport(selectedReport, 'json')} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">JSON</button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-400">טוען דוחות...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs">אין דוחות עדיין. הפעל סריקה ליצירת דוחות.</div>
            ) : reports.map(report => {
              const typeInfo = TYPE_LABELS[report.type] || TYPE_LABELS.custom;
              return (
                <div key={report.id || report._id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer flex items-center justify-between" onClick={() => loadReport(report.id || report._id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${typeInfo.color}`}>{typeInfo.label}</span>
                      <span className="text-xs font-medium text-gray-800 truncate">{report.title}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">{formatDate(report.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={e => { e.stopPropagation(); deleteReport(report.id || report._id); }} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* ── SEO Audit ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f2f5' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(8,145,178,0.08)' }}>
              <svg className="w-3.5 h-3.5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <h3 className="text-sm font-bold text-gray-700">SEO Audit</h3>
          </div>
          <button
            onClick={runSeoAudit}
            disabled={seoLoading}
            className="px-3 py-1.5 text-white rounded-lg text-[11px] font-semibold disabled:opacity-50 flex items-center gap-1.5"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            {seoLoading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            {seoLoading ? 'סורק...' : 'הפעל סריקת SEO'}
          </button>
        </div>
        {seoData ? (
          <div className="p-4">
            <div className="flex items-center gap-4 mb-3">
              <div className="bg-gray-50 rounded-lg px-4 py-2 text-center border border-gray-100">
                <div className="text-2xl font-bold" style={{ color: seoData.overallScore >= 80 ? '#16a34a' : seoData.overallScore >= 50 ? '#d97706' : '#dc2626' }}>{seoData.overallScore}%</div>
                <div className="text-[10px] text-gray-400">ציון כללי</div>
              </div>
              <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${seoData.overallStatus === 'PASS' ? 'bg-green-50 text-green-700 border-green-200' : seoData.overallStatus === 'WARN' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {seoData.overallStatus === 'PASS' ? 'עובר' : seoData.overallStatus === 'WARN' ? 'אזהרה' : 'נכשל'}
              </div>
              <div className="bg-red-50 rounded-lg px-3 py-2 text-center border border-red-100">
                <div className="text-lg font-bold text-red-600">{seoData.blockingIssuesCount || 0}</div>
                <div className="text-[10px] text-red-400">בעיות חוסמות</div>
              </div>
            </div>
            {seoData.reports && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(seoData.reports).map(([key, report]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${report.status === 'PASS' ? 'bg-green-100 text-green-700' : report.status === 'WARN' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{report.status}</span>
                    </div>
                    <div className="text-xl font-bold" style={{ color: report.score >= 80 ? '#16a34a' : report.score >= 50 ? '#d97706' : '#dc2626' }}>{report.score}%</div>
                    {report.summary && (
                      <div className="text-[10px] text-gray-400 mt-1 space-y-0.5">
                        {Object.entries(report.summary).slice(0, 3).map(([k, v]) => (
                          <div key={k}>{k.replace(/_/g, ' ')}: {v}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-400 text-xs">הפעל סריקת SEO לצפייה בתוצאות</div>
        )}
      </div>

      {/* ── Scan History ── */}
      {scans.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #f0f2f5' }}>
            <h3 className="text-sm font-bold text-gray-700">סריקות אחרונות ({scans.length})</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-[200px] overflow-y-auto">
            {scans.map(s => (
              <div key={s.scanId} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <code className="text-[10px] font-mono text-gray-400">{s.scanId?.substring(0, 12)}...</code>
                  <span className="text-xs text-gray-600">{formatDate(s.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${(s.results?.score || 0) >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.results?.score || 0}%</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
