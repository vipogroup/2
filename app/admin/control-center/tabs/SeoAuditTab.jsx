'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { enrichGscPages, buildGscDashboardBuckets } from '@/lib/gsc/gscPageInsights';
import {
  aggregateGscByPageType,
  aggregateGscByStore,
  aggregateGscByCategory,
  filterGscProductPotential,
} from '@/lib/gsc/gscEntityMapper';
import { DEFAULT_SETTINGS } from '@/lib/settingsDefaults';

const REPORT_TYPES = [
  'technical_seo',
  'content_coverage',
  'web_vitals',
  'live_indexability',
  'structured_data',
  'sitemap_consistency',
  'google_integrations',
];

const REPORT_META = {
  technical_seo: { label: 'Technical SEO', description: 'כותרות, תיאורים, alt, canonical ומבנה URL' },
  content_coverage: { label: 'Content Coverage', description: 'תוכן דל, orphan pages ותוכן כפול' },
  web_vitals: { label: 'Web Vitals', description: 'בדיקות ביצועים ו-crawlability' },
  live_indexability: { label: 'Live Indexability', description: 'בדיקה חיה של עמודים כפי שגוגל רואה' },
  structured_data: { label: 'Structured Data', description: 'בדיקת JSON-LD ו-rich results' },
  sitemap_consistency: { label: 'Sitemap Consistency', description: 'התאמה בין sitemap, robots ותגובות האתר' },
  google_integrations: { label: 'Google Integrations', description: 'GA4, GTM, Search Console ונראות בדף הבית' },
};

/** דוח google_integrations מוסתר ב-UI — מכוסה בבלוק "בדיקות Google Live" (מקור יחיד להצגה). */
const HIDE_REPORT_TYPES_UI = new Set(['google_integrations']);

function getStatusClasses(status) {
  if (status === 'PASS' || status === 'ok') return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'WARN' || status === 'warning' || status === 'warn') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

function getScoreColor(score) {
  if (score >= 80) return '#16a34a';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderSummaryEntries(summary) {
  if (!summary) return [];
  return Object.entries(summary).slice(0, 4);
}

function resolveApiErrorMessage(json, response, fallbackMessage) {
  if (json?.code === 'DB_UNAVAILABLE' || response?.status === 503) {
    return 'שירות ה-SEO Audit כרגע במצב תחזוקה זמני בגלל חיבור למסד הנתונים. נסה שוב בעוד כמה דקות.';
  }

  return json?.error || fallbackMessage;
}

function OpenIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function normalizePageUrlForLookup(input) {
  try {
    let s = String(input || '').trim();
    if (!s) return '';
    if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
    const u = new URL(s);
    const origin = u.origin.toLowerCase();
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return `${origin}${path}`.toLowerCase();
  } catch {
    return String(input || '').trim().toLowerCase();
  }
}

function formatGscCtr(ctr) {
  const n = Number(ctr);
  if (Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

function formatGscPosition(pos) {
  const n = Number(pos);
  if (Number.isNaN(n)) return '—';
  return n.toFixed(1);
}

function GscStatusBadge({ status }) {
  const map = {
    critical: { label: 'קריטי', className: 'bg-red-100 text-red-800 border-red-200' },
    warning: { label: 'לתשומת לב', className: 'bg-amber-100 text-amber-900 border-amber-200' },
    good: { label: 'טוב', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  };
  const m = map[status] || map.good;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${m.className}`}>{m.label}</span>
  );
}

const GSC_PAGE_TYPE_LABELS = {
  home: 'בית',
  marketplace: 'מרקטפלייס',
  store: 'חנות',
  category: 'קטגוריה',
  product: 'מוצר',
  other: 'אחר',
};

function GscPageTypeBadge({ pageType }) {
  return (
    <span className="inline-flex px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-700 whitespace-nowrap">
      {GSC_PAGE_TYPE_LABELS[pageType] || pageType || '—'}
    </span>
  );
}

/** קישור פעולה או טקסט "לא זמין" — ללא כפתור מת */
function GscActionOrMissing({ href, label, external }) {
  if (!href) {
    return <span className="text-[9px] text-gray-400">{label}: לא זמין</span>;
  }
  const cls = 'text-[10px] font-semibold text-cyan-800 hover:underline whitespace-nowrap';
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {label}
    </Link>
  );
}

function GscActionsColumn({ row }) {
  const a = row.actions || {};
  return (
    <div className="flex flex-col gap-1 items-end max-w-[220px]">
      {row.uncertain ? (
        <span className="text-[9px] font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">זיהוי חלקי</span>
      ) : null}
      <div className="flex flex-wrap gap-x-2 gap-y-1 justify-end">
        <GscActionOrMissing href={a.publicUrl} label="פתח" external />
        <GscActionOrMissing href={a.adminEditUrl} label="ערוך" external={false} />
        <GscActionOrMissing href={a.pageSpeedUrl} label="PageSpeed" external />
        <GscActionOrMissing href={a.richResultsUrl} label="Rich" external />
      </div>
    </div>
  );
}

function GscQuickActionsPanel({ row }) {
  const a = row.actions || {};
  return (
    <div className="rounded-lg border border-cyan-100 bg-cyan-50/60 px-3 py-2">
      <div className="font-bold text-gray-800 mb-2 text-[11px]">פעולות מהירות</div>
      <div className="flex flex-wrap gap-2 gap-y-2 items-center">
        <GscActionOrMissing href={a.publicUrl} label="פתח באתר" external />
        <GscActionOrMissing href={a.adminEditUrl} label="עריכה באדמין" external={false} />
        <GscActionOrMissing href={a.pageSpeedUrl} label="PageSpeed" external />
        <GscActionOrMissing href={a.richResultsUrl} label="Rich Results" external />
        <GscActionOrMissing href={a.searchConsoleUrl} label="Search Console" external />
      </div>
    </div>
  );
}

const SEO_AUDIT_EXPORT_VERSION = 1;
const SEO_AUDIT_FIXLIST_EXPORT_VERSION = 1;

/** ייצוא קובץ JSON מהדפדפן — ללא API */
function downloadJsonFile(filename, data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function GscExpandablePageTable({ rows, expandedSet, onToggle }) {
  if (!rows?.length) {
    return <p className="text-[11px] text-gray-500 py-2">אין פריטים בקטגוריה זו לטווח הנבחר.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100">
      <table className="min-w-full text-xs text-right">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-2 py-2 w-8" aria-hidden />
            <th className="px-3 py-2 font-semibold">page</th>
            <th className="px-2 py-2 font-semibold">סוג</th>
            <th className="px-2 py-2 font-semibold min-w-[140px]">פילוח מערכת</th>
            <th className="px-3 py-2 font-semibold">clicks</th>
            <th className="px-3 py-2 font-semibold">impressions</th>
            <th className="px-3 py-2 font-semibold">ctr</th>
            <th className="px-3 py-2 font-semibold">position</th>
            <th className="px-2 py-2 font-semibold min-w-[200px]">פעולות</th>
            <th className="px-3 py-2 font-semibold">סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const open = expandedSet.has(row.page);
            return (
              <Fragment key={row.page}>
                <tr className="border-t border-gray-100 hover:bg-gray-50/80">
                  <td className="px-1 py-1 text-center">
                    <button
                      type="button"
                      aria-expanded={open}
                      className="p-1 rounded text-gray-500 hover:bg-gray-200"
                      onClick={() => onToggle(row.page)}
                    >
                      <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-3 py-2 max-w-[200px] break-all font-mono dir-ltr text-left text-[10px]" title={row.page}>{row.page || '—'}</td>
                  <td className="px-2 py-2 align-top"><GscPageTypeBadge pageType={row.pageType} /></td>
                  <td className="px-2 py-2 align-top max-w-[200px]">
                    <div className="text-[10px] text-gray-800 leading-snug">{row.segmentLabel || '—'}</div>
                    {row.uncertain ? (
                      <span className="mt-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-200 text-gray-700 border border-gray-300">לא זוהה בוודאות</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{row.clicks ?? 0}</td>
                  <td className="px-3 py-2">{row.impressions ?? 0}</td>
                  <td className="px-3 py-2">{formatGscCtr(row.ctr)}</td>
                  <td className="px-3 py-2">{formatGscPosition(row.position)}</td>
                  <td className="px-2 py-2 align-top"><GscActionsColumn row={row} /></td>
                  <td className="px-3 py-2"><GscStatusBadge status={row.status} /></td>
                </tr>
                {open && (
                  <tr className="bg-slate-50/90 border-t border-gray-100">
                    <td colSpan={10} className="px-4 py-3 text-[11px] text-gray-700 space-y-2">
                      <GscQuickActionsPanel row={row} />
                      {(row.storeSlug || row.categorySlug || row.productSlug || row.productId) && (
                        <div className="text-[10px] text-gray-600 border-b border-gray-200 pb-2 mb-2 dir-ltr text-left font-mono flex flex-wrap gap-x-3 gap-y-1">
                          {row.storeSlug ? <span>store: {row.storeSlug}</span> : null}
                          {row.categorySlug ? <span>category: {row.categorySlug}</span> : null}
                          {row.productSlug ? <span>productSlug: {row.productSlug}</span> : null}
                          {row.productId ? <span>productId: {row.productId}</span> : null}
                        </div>
                      )}
                      {row.issues?.length > 0 && (
                        <div>
                          <div className="font-bold text-gray-800 mb-1">בעיות שזוהו</div>
                          <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                            {row.issues.map((t, i) => <li key={`${row.page}-i-${i}`}>{t}</li>)}
                          </ul>
                        </div>
                      )}
                      {row.recommendations?.length > 0 && (
                        <div>
                          <div className="font-bold text-gray-800 mb-1">המלצות</div>
                          <ul className="list-disc list-inside space-y-0.5 text-emerald-900/90">
                            {row.recommendations.map((t, i) => <li key={`${row.page}-r-${i}`}>{t}</li>)}
                          </ul>
                        </div>
                      )}
                      {(!row.issues?.length && !row.recommendations?.length) && (
                        <span className="text-gray-500">אין פירוט נוסף.</span>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SeoAuditTab() {
  const [auditData, setAuditData] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [googleHealth, setGoogleHealth] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [apiStatusMessage, setApiStatusMessage] = useState('');
  const [settings, setSettings] = useState({ googleAnalyticsId: '', googleTagManagerId: '' });
  const [toolCheckUrl, setToolCheckUrl] = useState('');
  const [siteOrigin, setSiteOrigin] = useState('');
  const [gscRange, setGscRange] = useState('7d');
  const [gscLoading, setGscLoading] = useState(true);
  const [gscError, setGscError] = useState(null);
  const [gscPayload, setGscPayload] = useState(null);
  const [gscPageLookup, setGscPageLookup] = useState('');
  const [gscExpandedPages, setGscExpandedPages] = useState(() => new Set());
  const [gscFilterPageType, setGscFilterPageType] = useState('');
  const [gscFilterStore, setGscFilterStore] = useState('');
  const [gscFilterStatus, setGscFilterStatus] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const o = window.location.origin;
    setSiteOrigin(o);
    setToolCheckUrl((prev) => (prev ? prev : `${o}/`));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/settings', { cache: 'no-store' });
        const data = await response.json();
        if (!cancelled && data?.ok && data?.settings) {
          setSettings({
            googleAnalyticsId: String(
              data.settings.googleAnalyticsId || DEFAULT_SETTINGS.googleAnalyticsId || '',
            ).trim(),
            googleTagManagerId: String(
              data.settings.googleTagManagerId || DEFAULT_SETTINGS.googleTagManagerId || '',
            ).trim(),
          });
        }
      } catch (e) {
        console.error('SeoAuditTab settings load:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const siteHostname = useMemo(() => {
    try {
      return siteOrigin ? new URL(siteOrigin).hostname : '';
    } catch {
      return '';
    }
  }, [siteOrigin]);

  const externalToolUrls = useMemo(() => {
    const origin = siteOrigin || (typeof window !== 'undefined' ? window.location.origin : '');
    const domain = siteHostname || (typeof window !== 'undefined' ? window.location.hostname : '');
    const scResource = encodeURIComponent(`sc-domain:${domain || 'localhost'}`);
    const pageSpeedPrefill = origin
      ? `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(origin)}`
      : 'https://pagespeed.web.dev/';
    const gaId = settings.googleAnalyticsId;
    const analyticsUrl = gaId
      ? `https://analytics.google.com/analytics/web/?hl=he#${encodeURIComponent(gaId)}`
      : 'https://analytics.google.com';
    return {
      searchConsole: `https://search.google.com/search-console?resource_id=${scResource}`,
      pageSpeed: pageSpeedPrefill,
      analytics: analyticsUrl,
      googleAds: 'https://ads.google.com',
      tagManager: settings.googleTagManagerId
        ? 'https://tagmanager.google.com/#/home'
        : 'https://tagmanager.google.com',
      businessProfile: 'https://business.google.com',
      siteIndexSearch: domain
        ? `https://www.google.com/search?q=${encodeURIComponent(`site:${domain}`)}`
        : 'https://www.google.com/',
      keywordPlanner: 'https://ads.google.com/home/tools/keyword-planner/',
      newCampaign: 'https://ads.google.com/aw/campaigns/new',
    };
  }, [siteOrigin, siteHostname, settings.googleAnalyticsId, settings.googleTagManagerId]);

  const resolvedToolUrl = useMemo(() => {
    const raw = (toolCheckUrl || siteOrigin || '').trim();
    if (!raw) return siteOrigin || '';
    try {
      const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
      return u.toString();
    } catch {
      return siteOrigin || '';
    }
  }, [toolCheckUrl, siteOrigin]);

  const urlToolLinks = useMemo(() => {
    const u = resolvedToolUrl || siteOrigin;
    if (!u) return { psi: '#', mobile: '#', rich: '#' };
    const enc = encodeURIComponent(u);
    return {
      psi: `https://pagespeed.web.dev/analysis?url=${enc}`,
      mobile: `https://search.google.com/test/mobile-friendly?url=${enc}`,
      rich: `https://search.google.com/test/rich-results?url=${enc}`,
    };
  }, [resolvedToolUrl, siteOrigin]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/admin/seo-audit?limit=20', { credentials: 'include' });
      const json = await res.json();
      if (res.ok) {
        setHistory(json.reports || []);
        if (json?.dataMode === 'fallback') {
          setApiStatusMessage('היסטוריית דוחות מלאה אינה זמינה כרגע בגלל חיבור מסד נתונים.');
        }
      } else {
        setHistory([]);
        setApiStatusMessage(resolveApiErrorMessage(json, res, 'לא ניתן לטעון היסטוריית SEO כרגע.'));
      }
    } catch (error) {
      console.error('Failed to load SEO audit history:', error);
      setApiStatusMessage('שגיאת רשת בטעינת היסטוריית SEO.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadGoogleHealth = useCallback(async () => {
    setGoogleLoading(true);
    try {
      const res = await fetch('/api/admin/google-links/scan', { credentials: 'include', cache: 'no-store' });
      const json = await res.json();
      if (res.ok) {
        setGoogleHealth(json);
        if (json?.dataMode === 'fallback') {
          setApiStatusMessage('Google checks רצים במצב fallback (ללא DB חי). ניתן לראות מצב חי של robots/sitemap/GA/GTM.');
        }
      } else {
        setGoogleHealth(null);
        setApiStatusMessage(resolveApiErrorMessage(json, res, 'לא ניתן לטעון בדיקות Google כרגע.'));
      }
    } catch (error) {
      console.error('Failed to load Google health checks:', error);
      setApiStatusMessage('שגיאת רשת בטעינת Google checks.');
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  const loadGscAnalytics = useCallback(async () => {
    setGscLoading(true);
    setGscError(null);
    try {
      const res = await fetch(`/api/admin/gsc-analytics?range=${encodeURIComponent(gscRange)}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) {
        setGscPayload(null);
        setGscError(json?.message || json?.error || 'שגיאה בטעינת נתוני Search Console');
        return;
      }
      setGscPayload(json);
    } catch (e) {
      console.error('GSC analytics load failed:', e);
      setGscPayload(null);
      setGscError('שגיאת רשת בטעינת נתוני Search Console');
    } finally {
      setGscLoading(false);
    }
  }, [gscRange]);

  useEffect(() => {
    loadHistory();
    loadGoogleHealth();
  }, [loadHistory, loadGoogleHealth]);

  useEffect(() => {
    loadGscAnalytics();
  }, [loadGscAnalytics]);

  useEffect(() => {
    setGscExpandedPages(new Set());
    setGscFilterPageType('');
    setGscFilterStore('');
    setGscFilterStatus('');
  }, [gscRange]);

  async function runFullSeoAudit() {
    if (auditLoading) return;
    setAuditLoading(true);
    try {
      const res = await fetch('/api/admin/seo-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'scan', reportTypes: REPORT_TYPES }),
      });
      const json = await res.json();
      if (res.ok) {
        setAuditData(json);
        if (json?.dataMode === 'fallback') {
          setApiStatusMessage('הסריקה רצה במצב fallback: דוחות תלויי DB סומנו כ-Skipped עד שחיבור Mongo יחזור.');
        } else {
          setApiStatusMessage('');
        }
        loadHistory();
        loadGoogleHealth();
      } else {
        const errorMessage = resolveApiErrorMessage(json, res, 'שגיאה בסריקת SEO');
        setApiStatusMessage(errorMessage);
        alert(errorMessage);
      }
    } catch (error) {
      console.error('SEO audit failed:', error);
      setApiStatusMessage('שגיאת רשת בסריקת SEO');
      alert('שגיאת רשת בסריקת SEO');
    } finally {
      setAuditLoading(false);
    }
  }

  const latestHistoryByType = useMemo(() => {
    const map = new Map();
    history.forEach((report) => {
      if (HIDE_REPORT_TYPES_UI.has(report.reportType)) return;
      if (!map.has(report.reportType)) {
        map.set(report.reportType, report);
      }
    });
    return REPORT_TYPES
      .filter((t) => !HIDE_REPORT_TYPES_UI.has(t))
      .map((type) => map.get(type))
      .filter(Boolean);
  }, [history]);

  const googleLiveUiScore = useMemo(() => {
    if (auditData?.googleLiveScore != null) return auditData.googleLiveScore;
    const healthy = Number(googleHealth?.summary?.healthyChecks || 0);
    const total = Number(googleHealth?.summary?.totalChecks || 0);
    if (!total) return null;
    return Math.round((healthy / total) * 100);
  }, [auditData, googleHealth]);

  const truthScore = auditData?.truthScore ?? auditData?.overallScore ?? null;
  const siteHealthScore = auditData?.siteHealthScore ?? null;

  const toggleGscExpand = useCallback((pageUrl) => {
    setGscExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageUrl)) next.delete(pageUrl);
      else next.add(pageUrl);
      return next;
    });
  }, []);

  const gscEnrichedPages = useMemo(() => {
    if (!gscPayload?.ok || !gscPayload.pages?.length) return [];
    return enrichGscPages(gscPayload.pages);
  }, [gscPayload]);

  const gscBuckets = useMemo(() => buildGscDashboardBuckets(gscEnrichedPages), [gscEnrichedPages]);

  const gscFilteredPages = useMemo(() => {
    let list = gscEnrichedPages;
    if (gscFilterPageType) list = list.filter((r) => r.pageType === gscFilterPageType);
    if (gscFilterStore) list = list.filter((r) => r.storeSlug === gscFilterStore);
    if (gscFilterStatus) list = list.filter((r) => r.status === gscFilterStatus);
    return list;
  }, [gscEnrichedPages, gscFilterPageType, gscFilterStore, gscFilterStatus]);

  const gscStoreFilterOptions = useMemo(() => {
    const s = new Set();
    gscEnrichedPages.forEach((r) => {
      if (r.storeSlug) s.add(r.storeSlug);
    });
    return [...s].sort();
  }, [gscEnrichedPages]);

  const gscByPageType = useMemo(() => aggregateGscByPageType(gscEnrichedPages), [gscEnrichedPages]);
  const gscByStore = useMemo(() => aggregateGscByStore(gscEnrichedPages), [gscEnrichedPages]);
  const gscByCategory = useMemo(() => aggregateGscByCategory(gscEnrichedPages), [gscEnrichedPages]);
  const gscProductPotential = useMemo(() => filterGscProductPotential(gscEnrichedPages), [gscEnrichedPages]);
  const reportEntries = useMemo(() => {
    if (!auditData?.reports) return [];
    return Object.entries(auditData.reports).filter(([type]) => !HIDE_REPORT_TYPES_UI.has(type));
  }, [auditData]);

  const fixlistItems = useMemo(() => {
    const items = [];
    let idCounter = 1;
    const pushItem = (payload) => {
      items.push({ id: idCounter++, ...payload });
    };

    if (apiStatusMessage) {
      pushItem({
        source: 'ui',
        scope: 'seo_audit',
        severity: 'high',
        type: 'api_status',
        title: 'שגיאה כללית בלוח SEO Audit',
        details: String(apiStatusMessage),
      });
    }

    if (gscError) {
      pushItem({
        source: 'gsc',
        scope: 'search_console',
        severity: 'high',
        type: 'gsc_error',
        title: 'שגיאה בטעינת נתוני Search Console',
        details: String(gscError),
      });
    }

    reportEntries.forEach(([reportType, report]) => {
      const issues = Array.isArray(report?.issues) ? report.issues : [];
      issues.forEach((issue, idx) => {
        const issueText = typeof issue === 'string'
          ? issue
          : issue?.issue || issue?.message || issue?.title || JSON.stringify(issue);
        pushItem({
          source: 'audit_report',
          scope: reportType,
          severity: report?.status === 'FAIL' ? 'high' : 'medium',
          type: 'report_issue',
          title: issueText || `Issue #${idx + 1}`,
          details: typeof issue === 'string' ? '' : (issue?.details || ''),
          meta: {
            reportStatus: report?.status || null,
            reportScore: Number.isFinite(report?.score) ? report.score : null,
          },
        });
      });
    });

    (googleHealth?.configChecks || []).forEach((item) => {
      if (item?.status === 'ok') return;
      pushItem({
        source: 'google_live',
        scope: 'config',
        severity: 'high',
        type: item?.id || 'config_issue',
        title: item?.name || 'בעיית הגדרות Google',
        details: typeof item?.details === 'string'
          ? item.details
          : (item?.details?.details || item?.details?.finalUrl || JSON.stringify(item?.details || {})),
      });
    });

    (googleHealth?.siteChecks || []).forEach((item) => {
      if (item?.status === 'ok') return;
      pushItem({
        source: 'google_live',
        scope: 'site',
        severity: 'medium',
        type: item?.id || 'site_check_issue',
        title: item?.name || 'בעיית בדיקת אתר',
        details: typeof item?.details === 'string'
          ? item.details
          : (item?.details?.details || item?.details?.finalUrl || `statusCode: ${item?.details?.statusCode ?? 'unknown'}`),
      });
    });

    gscEnrichedPages
      .filter((row) => row?.status === 'critical' || row?.status === 'warning')
      .forEach((row) => {
        const severity = row.status === 'critical' ? 'high' : 'medium';
        const issues = Array.isArray(row.issues) ? row.issues : [];
        if (issues.length === 0) {
          pushItem({
            source: 'gsc',
            scope: 'page',
            severity,
            type: 'gsc_page_status',
            title: `עמוד GSC דורש טיפול (${row.status})`,
            details: row.page || '',
          });
          return;
        }
        issues.forEach((issueText) => {
          pushItem({
            source: 'gsc',
            scope: 'page',
            severity,
            type: 'gsc_page_issue',
            title: issueText,
            details: row.page || '',
            meta: {
              pageType: row.pageType || null,
              clicks: row.clicks ?? null,
              impressions: row.impressions ?? null,
              ctr: row.ctr ?? null,
              position: row.position ?? null,
            },
          });
        });
      });

    const grouped = new Map();
    items.forEach((item) => {
      const key = [
        item.source || '',
        item.scope || '',
        item.severity || '',
        item.type || '',
        item.title || '',
      ].join('|');
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          ...item,
          occurrences: 1,
          detailsSamples: item.details ? [String(item.details)] : [],
        });
        return;
      }

      existing.occurrences += 1;
      if (item.details && existing.detailsSamples.length < 3) {
        const value = String(item.details);
        if (!existing.detailsSamples.includes(value)) {
          existing.detailsSamples.push(value);
        }
      }
    });

    return [...grouped.values()].map((item, idx) => ({
      ...item,
      id: idx + 1,
      details: item.detailsSamples?.[0] || item.details || '',
    }));
  }, [apiStatusMessage, gscError, reportEntries, googleHealth, gscEnrichedPages]);

  const exportSeoAuditSnapshot = useCallback(() => {
    const exportedAt = new Date().toISOString();
    const clone = (x) => {
      try {
        return JSON.parse(JSON.stringify(x));
      } catch {
        return x;
      }
    };
    const payload = {
      _readme:
        'ייצוא מלוח Google SEO Audit ב-VIPO. קובץ JSON לשליחה לצוות/AI לניתוח תיקונים — כולל סריקה אחרונה, GSC ודוחות.',
      exportVersion: SEO_AUDIT_EXPORT_VERSION,
      exportedAt,
      site: { origin: siteOrigin || null, hostname: siteHostname || null },
      settingsSnapshot: {
        googleAnalyticsId: String(
          settings.googleAnalyticsId || DEFAULT_SETTINGS.googleAnalyticsId || '',
        ),
        googleTagManagerId: String(
          settings.googleTagManagerId || DEFAULT_SETTINGS.googleTagManagerId || '',
        ),
      },
      toolCheckUrl: toolCheckUrl || '',
      ui: {
        apiStatusMessage: apiStatusMessage || '',
        gscRange,
        gscError: gscError || null,
        gscFilters: {
          pageType: gscFilterPageType || null,
          store: gscFilterStore || null,
          status: gscFilterStatus || null,
        },
      },
      lastFullAudit: auditData ? clone(auditData) : null,
      googleLiveScan: googleHealth ? clone(googleHealth) : null,
      gsc: {
        range: gscRange,
        raw: gscPayload ? clone(gscPayload) : null,
        enrichedPages: gscEnrichedPages.length ? clone(gscEnrichedPages) : [],
        buckets: gscBuckets ? clone(gscBuckets) : null,
        aggregates: {
          byPageType: clone(gscByPageType),
          byStore: clone(gscByStore),
          byCategory: clone(gscByCategory),
          productPotential: clone(gscProductPotential),
        },
      },
      historyRecent: history.length ? clone(history.slice(0, 40)) : [],
      hints: [
        !auditData && 'לא בוצעה סריקת "הפעל את כל בדיקות ה-SEO" במושב הנוכחי — lastFullAudit יהיה ריק.',
        gscError && `GSC: ${gscError}`,
      ].filter(Boolean),
    };
    const stamp = exportedAt.slice(0, 19).replace(/T/, '_').replace(/:/g, '-');
    downloadJsonFile(`seo-audit-export-${stamp}.json`, payload);
  }, [
    siteOrigin,
    siteHostname,
    settings.googleAnalyticsId,
    settings.googleTagManagerId,
    toolCheckUrl,
    apiStatusMessage,
    gscRange,
    gscError,
    gscFilterPageType,
    gscFilterStore,
    gscFilterStatus,
    auditData,
    googleHealth,
    gscPayload,
    gscEnrichedPages,
    gscBuckets,
    gscByPageType,
    gscByStore,
    gscByCategory,
    gscProductPotential,
    history,
  ]);

  const exportSeoFixlist = useCallback(() => {
    const exportedAt = new Date().toISOString();
    const payload = {
      _readme:
        'רשימת תיקונים ממוקדת מתוך Google SEO Audit. קובץ זה כולל רק מה שדורש טיפול בפועל.',
      exportVersion: SEO_AUDIT_FIXLIST_EXPORT_VERSION,
      exportedAt,
      totalIssues: fixlistItems.length,
      summary: {
        high: fixlistItems.filter((i) => i.severity === 'high').length,
        medium: fixlistItems.filter((i) => i.severity === 'medium').length,
        low: fixlistItems.filter((i) => i.severity === 'low').length,
      },
      items: fixlistItems,
    };
    const stamp = exportedAt.slice(0, 19).replace(/T/, '_').replace(/:/g, '-');
    downloadJsonFile(`seo-audit-fixlist-${stamp}.json`, payload);
  }, [fixlistItems]);

  const gscMatchedPageRow = useMemo(() => {
    if (!gscEnrichedPages.length || !gscPageLookup.trim()) return null;
    const want = normalizePageUrlForLookup(gscPageLookup);
    if (!want) return null;
    const byNorm = gscEnrichedPages.find((row) => normalizePageUrlForLookup(row.page) === want);
    if (byNorm) return byNorm;
    const needle = gscPageLookup.trim().toLowerCase();
    return gscEnrichedPages.find((row) => String(row.page || '').toLowerCase().includes(needle)) || null;
  }, [gscEnrichedPages, gscPageLookup]);

  const toolCardClass =
    'rounded-xl border border-gray-100 bg-white p-3 flex flex-col gap-2 shadow-sm transition hover:shadow-md';

  return (
    <div className="space-y-4" dir="rtl">
      {/* 1 — כותרת + כפתור */}
      <div className="rounded-xl overflow-hidden text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
        <div className="px-5 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-extrabold">Google SEO Audit</h2>
                <p className="text-cyan-100 text-xs">לוח בקרה מאוחד: בדיקות פנימיות, בדיקות Google חיות וכלים חיצוניים</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {REPORT_TYPES.map((type) => (
                <span key={type} className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.14)' }}>
                  {REPORT_META[type].label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={runFullSeoAudit}
              disabled={auditLoading}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: 'rgba(255,255,255,0.18)' }}
            >
              <svg className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {auditLoading ? 'סורק...' : 'הפעל את כל בדיקות ה-SEO'}
            </button>

            <Link
              href="/admin/google-links"
              className="px-4 py-2 rounded-lg text-[10px] font-semibold transition-all hover:bg-white/20 border border-white/20 text-white/90"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              דף דוחות גוגל (מלא)
            </Link>

            <button
              type="button"
              onClick={exportSeoAuditSnapshot}
              className="px-4 py-2 rounded-lg text-[10px] font-semibold transition-all hover:bg-white/20 border border-white/25 text-white/95"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              title="מוריד קובץ JSON עם סריקת SEO, GSC, דוחות והיסטוריה — לשליחה לבדיקה"
            >
              ייצוא דוח (JSON)
            </button>

            <button
              type="button"
              onClick={exportSeoFixlist}
              className="px-4 py-2 rounded-lg text-[10px] font-semibold transition-all hover:bg-white/20 border border-amber-200/70 text-white"
              style={{ background: 'linear-gradient(135deg, rgba(217,119,6,0.9), rgba(180,83,9,0.9))' }}
              title="מוריד רשימת בעיות לתיקון בלבד (ללא נתוני רעש)"
            >
              ייצוא תיקונים (JSON)
            </button>
          </div>
        </div>
      </div>

      {/* 2 — כלים חיצוניים מהירים */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">כלים חיצוניים מהירים</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">קישורים לכלי גוגל ולבדיקות ציבוריות (ללא API)</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className={toolCardClass}>
              <div className="text-xs font-bold text-gray-800">Search Console</div>
              <p className="text-[10px] text-gray-500">ביצועים, אינדוקס וסריקה</p>
              <a href={externalToolUrls.searchConsole} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-white" style={{ background: 'linear-gradient(135deg, #4285F4, #3367d6)' }}>
                <OpenIcon /> פתח
              </a>
            </div>
            <div className={toolCardClass}>
              <div className="text-xs font-bold text-gray-800">PageSpeed Insights</div>
              <p className="text-[10px] text-gray-500">מהירות לפי URL נוכחי</p>
              <a href={externalToolUrls.pageSpeed} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-white" style={{ background: 'linear-gradient(135deg, #EA4335, #c5221f)' }}>
                <OpenIcon /> פתח
              </a>
            </div>
            <div className={toolCardClass}>
              <div className="text-xs font-bold text-gray-800">Google Analytics</div>
              <p className="text-[10px] text-gray-500">תנועה ומשתמשים</p>
              <a href={externalToolUrls.analytics} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-white" style={{ background: 'linear-gradient(135deg, #E37400, #b35c00)' }}>
                <OpenIcon /> פתח
              </a>
            </div>
            <div className={toolCardClass}>
              <div className="text-xs font-bold text-gray-800">Google Ads</div>
              <p className="text-[10px] text-gray-500">ניהול קמפיינים</p>
              <a href={externalToolUrls.googleAds} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-white" style={{ background: 'linear-gradient(135deg, #34A853, #188038)' }}>
                <OpenIcon /> פתח
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className={toolCardClass}>
              <div className="text-xs font-bold text-gray-800">Tag Manager</div>
              <a href={externalToolUrls.tagManager} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 break-all dir-ltr text-left">GTM</a>
              <a href={externalToolUrls.tagManager} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold bg-slate-700 text-white">
                <OpenIcon /> פתח
              </a>
            </div>
            <div className={toolCardClass}>
              <div className="text-xs font-bold text-gray-800">Business Profile</div>
              <a href={externalToolUrls.businessProfile} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold bg-amber-500 text-white">
                <OpenIcon /> פתח
              </a>
            </div>
            <div className={toolCardClass}>
              <div className="text-xs font-bold text-gray-800">בדיקת אינדוקס (site:)</div>
              <p className="text-[10px] text-gray-500">חיפוש גוגל לדוגמת כיסוי</p>
              <a href={externalToolUrls.siteIndexSearch} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold bg-indigo-600 text-white">
                <OpenIcon /> פתח חיפוש
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 space-y-2">
            <div className="text-xs font-bold text-gray-800">בדיקת URL (PageSpeed / Mobile / Rich Results)</div>
            <p className="text-[10px] text-gray-500">הזינו URL מלא (ברירת מחדל: מקור האתר הנוכחי)</p>
            <input
              dir="ltr"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-left font-mono"
              value={toolCheckUrl}
              onChange={(e) => setToolCheckUrl(e.target.value)}
              placeholder="https://..."
            />
            <div className="flex flex-wrap gap-2">
              <a href={urlToolLinks.psi} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white">
                <OpenIcon /> PageSpeed
              </a>
              <a href={urlToolLinks.mobile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white">
                <OpenIcon /> Mobile Friendly
              </a>
              <a href={urlToolLinks.rich} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white">
                <OpenIcon /> Rich Results
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a href={externalToolUrls.keywordPlanner} target="_blank" rel="noopener noreferrer" className={`${toolCardClass} hover:border-cyan-200`}>
              <div className="text-xs font-bold text-gray-800">Keyword Planner</div>
              <p className="text-[10px] text-gray-500">מחקר מילות מפתח ב-Google Ads</p>
              <span className="text-[11px] font-semibold text-cyan-700 inline-flex items-center gap-1">פתח <OpenIcon /></span>
            </a>
            <a href={externalToolUrls.newCampaign} target="_blank" rel="noopener noreferrer" className={`${toolCardClass} hover:border-cyan-200`}>
              <div className="text-xs font-bold text-gray-800">יצירת קמפיין חדש</div>
              <p className="text-[10px] text-gray-500">Google Ads — קמפיין חדש</p>
              <span className="text-[11px] font-semibold text-cyan-700 inline-flex items-center gap-1">פתח <OpenIcon /></span>
            </a>
          </div>
        </div>
      </div>

      {/* 3 — בדיקות Google Live */}
      {googleLoading && !googleHealth && (
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-6 text-center text-gray-400 text-sm">טוען בדיקות Google Live...</div>
      )}

      {googleHealth && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f2f5' }}>
            <div>
              <h3 className="text-sm font-bold text-gray-700">בדיקות Google Live</h3>
              <p className="text-[11px] text-gray-400">מקור יחיד להצגה: הגדרות GA/GTM/GSC, זמינות robots/sitemap והתאמות בדף הבית (הדוח הפנימי &quot;Google Integrations&quot; אינו מוצג כאן כדי למנוע כפילות)</p>
            </div>
            <div className="text-left">
              <div className="text-lg font-extrabold text-[#1e3a8a]">{googleHealth.summary?.healthyChecks || 0}/{googleHealth.summary?.totalChecks || 0}</div>
              <div className="text-[10px] text-gray-400">בדיקות תקינות</div>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-3">
            {[
              { key: 'configChecks', title: 'הגדרות Google' },
              { key: 'siteChecks', title: 'נראות אתר' },
              { key: 'linksChecks', title: 'בדיקות קישורי Google' },
            ].map((section) => (
              <div key={section.key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <h4 className="text-xs font-bold text-gray-700 mb-2">{section.title}</h4>
                <div className="space-y-2">
                  {(googleHealth[section.key] || []).map((item) => (
                    <div key={item.id} className={`rounded-lg border px-3 py-2 ${getStatusClasses(item.status)}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold">{item.name}</span>
                        <span className="text-[10px] font-bold uppercase">{item.status}</span>
                      </div>
                      <div className="text-[10px] mt-1 opacity-80 break-all">
                        {typeof item.details === 'string' ? item.details : item.details?.statusCode || item.details?.details || item.details?.finalUrl || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* נתוני Google Search Console (API) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">נתוני Google Search Console</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">אלו נתונים אמיתיים מ-Google Search Console (Search Analytics API)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: '7d', label: '7 ימים' },
              { id: '28d', label: '28 ימים' },
              { id: '3m', label: '3 חודשים' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setGscRange(r.id)}
                disabled={gscLoading}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all disabled:opacity-50 ${
                  gscRange === r.id
                    ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-2 border-b border-gray-50 bg-slate-50/80">
          <p className="text-[10px] text-slate-600">
            טווח דיווח: נתוני GSC מתעדכנים עם השהייה של כמה ימים; תאריכי ההתחלה והסוף מחושבים בצד השרת (סיום לרוב לפני יומיים).
            {gscPayload?.ok && gscPayload.startDate && gscPayload.endDate && (
              <span className="mr-2 font-mono dir-ltr inline-block">
                {gscPayload.startDate} → {gscPayload.endDate}
              </span>
            )}
            {gscPayload?.propertyUrl && (
              <span className="mr-2 block sm:inline mt-1 sm:mt-0 text-slate-500 break-all">נכס: {gscPayload.propertyUrl}</span>
            )}
          </p>
        </div>

        <div className="p-4 space-y-6">
          {gscLoading && (
            <div className="text-center text-gray-500 text-sm py-8">טוען נתונים מ-Search Console...</div>
          )}

          {!gscLoading && gscError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
              <div className="font-bold mb-1">לא ניתן להציג נתוני GSC</div>
              <div>{gscError}</div>
            </div>
          )}

          {!gscLoading && gscPayload?.ok && (!gscPayload.queries?.length && !gscPayload.pages?.length) && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              אין נתונים בטווח הנבחר (למשל אתר חדש ב-GSC או אין חשיפות בחיפוש).
            </div>
          )}

          {!gscLoading && gscPayload?.ok && (gscPayload.queries?.length > 0 || gscPayload.pages?.length > 0) && (
            <>
              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-2">חלק א — Top Queries</h4>
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="min-w-full text-xs text-right">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">query</th>
                        <th className="px-3 py-2 font-semibold">clicks</th>
                        <th className="px-3 py-2 font-semibold">impressions</th>
                        <th className="px-3 py-2 font-semibold">ctr</th>
                        <th className="px-3 py-2 font-semibold">position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(gscPayload.queries || []).map((row, idx) => (
                        <tr key={`q-${idx}`} className="border-t border-gray-100 hover:bg-gray-50/80">
                          <td className="px-3 py-2 max-w-[220px] truncate font-mono dir-ltr text-left" title={row.query}>{row.query || '—'}</td>
                          <td className="px-3 py-2">{row.clicks ?? 0}</td>
                          <td className="px-3 py-2">{row.impressions ?? 0}</td>
                          <td className="px-3 py-2">{formatGscCtr(row.ctr)}</td>
                          <td className="px-3 py-2">{formatGscPosition(row.position)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-2">חלק ב — Top Pages</h4>
                <p className="text-[10px] text-gray-500 mb-2">כולל מיפוי לישויות במערכת, סטטוס אוטומטי והמלצות — לחצו על החץ לפרטים</p>

                <div className="flex flex-wrap gap-3 items-end mb-3 p-3 rounded-lg border border-gray-100 bg-gray-50/90">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">סוג דף</label>
                    <select
                      value={gscFilterPageType}
                      onChange={(e) => setGscFilterPageType(e.target.value)}
                      className="text-xs rounded-lg border border-gray-200 px-2 py-1.5 bg-white min-w-[130px]"
                    >
                      <option value="">הכל</option>
                      <option value="home">{GSC_PAGE_TYPE_LABELS.home}</option>
                      <option value="marketplace">{GSC_PAGE_TYPE_LABELS.marketplace}</option>
                      <option value="store">{GSC_PAGE_TYPE_LABELS.store}</option>
                      <option value="category">{GSC_PAGE_TYPE_LABELS.category}</option>
                      <option value="product">{GSC_PAGE_TYPE_LABELS.product}</option>
                      <option value="other">{GSC_PAGE_TYPE_LABELS.other}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">חנות (slug)</label>
                    <select
                      value={gscFilterStore}
                      onChange={(e) => setGscFilterStore(e.target.value)}
                      className="text-xs rounded-lg border border-gray-200 px-2 py-1.5 bg-white min-w-[130px] dir-ltr text-left"
                    >
                      <option value="">הכל</option>
                      {gscStoreFilterOptions.map((slug) => (
                        <option key={slug} value={slug}>{slug}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">סטטוס ניתוח</label>
                    <select
                      value={gscFilterStatus}
                      onChange={(e) => setGscFilterStatus(e.target.value)}
                      className="text-xs rounded-lg border border-gray-200 px-2 py-1.5 bg-white min-w-[120px]"
                    >
                      <option value="">הכל</option>
                      <option value="critical">קריטי</option>
                      <option value="warning">לתשומת לב</option>
                      <option value="good">טוב</option>
                    </select>
                  </div>
                  {(gscFilterPageType || gscFilterStore || gscFilterStatus) && (
                    <button
                      type="button"
                      onClick={() => {
                        setGscFilterPageType('');
                        setGscFilterStore('');
                        setGscFilterStatus('');
                      }}
                      className="text-[11px] font-semibold text-cyan-700 hover:underline mb-1"
                    >
                      נקה פילטרים
                    </button>
                  )}
                </div>

                <GscExpandablePageTable
                  rows={gscFilteredPages}
                  expandedSet={gscExpandedPages}
                  onToggle={toggleGscExpand}
                />
              </div>

              <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-4 space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">ניתוח ביצועים והזדמנויות</h4>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    אלו נתונים אמיתיים מ-Google Search Console — ניתוח לפי ספים על בסיס Top Pages בלבד (ללא קריאות נוספות)
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden />
                    <h5 className="text-xs font-bold text-red-900">א. בעיות קריטיות</h5>
                  </div>
                  <p className="text-[10px] text-gray-600 mb-2">דפים ללא חשיפות, או מעל 100 חשיפות ללא קליקים</p>
                  <GscExpandablePageTable
                    rows={gscBuckets.critical}
                    expandedSet={gscExpandedPages}
                    onToggle={toggleGscExpand}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden />
                    <h5 className="text-xs font-bold text-amber-900">ב. הזדמנויות</h5>
                  </div>
                  <p className="text-[10px] text-gray-600 mb-2">מיקום 8–15 עם חשיפות, או CTR נמוך מתחת ל-1% (עם קליקים)</p>
                  <GscExpandablePageTable
                    rows={gscBuckets.opportunities}
                    expandedSet={gscExpandedPages}
                    onToggle={toggleGscExpand}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden />
                    <h5 className="text-xs font-bold text-emerald-900">ג. מובילים</h5>
                  </div>
                  <p className="text-[10px] text-gray-600 mb-2">לפחות 5 קליקים, CTR מעל 2%, מעל 25 חשיפות — עד 15 דפים</p>
                  <GscExpandablePageTable
                    rows={gscBuckets.topPerformers}
                    expandedSet={gscExpandedPages}
                    onToggle={toggleGscExpand}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-teal-100 bg-teal-50/30 p-4 space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">פילוח ביצועים לפי מערכת</h4>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    אגרגציה על כל Top Pages בטווח — מיפוי URL לפי routes ידועים (ללא DB)
                  </p>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-gray-800 mb-2">א. ביצועים לפי סוג דף</h5>
                  <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-3 py-2 text-right font-semibold">סוג</th>
                          <th className="px-3 py-2 font-semibold">דפים</th>
                          <th className="px-3 py-2 font-semibold">clicks</th>
                          <th className="px-3 py-2 font-semibold">impressions</th>
                          <th className="px-3 py-2 font-semibold">avg ctr</th>
                          <th className="px-3 py-2 font-semibold">avg position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gscByPageType.map((row) => (
                          <tr key={row.pageType} className="border-t border-gray-100">
                            <td className="px-3 py-2">{GSC_PAGE_TYPE_LABELS[row.pageType] || row.pageType}</td>
                            <td className="px-3 py-2">{row.pages}</td>
                            <td className="px-3 py-2">{row.clicks}</td>
                            <td className="px-3 py-2">{row.impressions}</td>
                            <td className="px-3 py-2">{formatGscCtr(row.ctr)}</td>
                            <td className="px-3 py-2">{formatGscPosition(row.avgPosition)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-gray-800 mb-2">ב. ביצועים לפי חנות</h5>
                  {gscByStore.length === 0 ? (
                    <p className="text-[11px] text-gray-500">אין דפי חנות (/t/...) בנתוני הטווח.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="px-3 py-2 text-right font-semibold">store</th>
                            <th className="px-3 py-2 font-semibold">pages</th>
                            <th className="px-3 py-2 font-semibold">clicks</th>
                            <th className="px-3 py-2 font-semibold">impressions</th>
                            <th className="px-3 py-2 font-semibold">avg ctr</th>
                            <th className="px-3 py-2 font-semibold">avg position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gscByStore.map((row) => (
                            <tr key={row.key} className="border-t border-gray-100">
                              <td className="px-3 py-2 font-mono dir-ltr text-left text-[10px]">{row.label}</td>
                              <td className="px-3 py-2">{row.pages}</td>
                              <td className="px-3 py-2">{row.clicks}</td>
                              <td className="px-3 py-2">{row.impressions}</td>
                              <td className="px-3 py-2">{formatGscCtr(row.ctr)}</td>
                              <td className="px-3 py-2">{formatGscPosition(row.avgPosition)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <h5 className="text-xs font-bold text-gray-800 mb-2">ג. ביצועים לפי קטגוריה</h5>
                  {gscByCategory.length === 0 ? (
                    <p className="text-[11px] text-gray-500">אין דפי קטגוריית נירוסטה (/stainless/...) בנתוני הטווח.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="px-3 py-2 text-right font-semibold">category</th>
                            <th className="px-3 py-2 font-semibold">pages</th>
                            <th className="px-3 py-2 font-semibold">clicks</th>
                            <th className="px-3 py-2 font-semibold">impressions</th>
                            <th className="px-3 py-2 font-semibold">avg ctr</th>
                            <th className="px-3 py-2 font-semibold">avg position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gscByCategory.map((row) => (
                            <tr key={row.key} className="border-t border-gray-100">
                              <td className="px-3 py-2">{row.label}</td>
                              <td className="px-3 py-2">{row.pages}</td>
                              <td className="px-3 py-2">{row.clicks}</td>
                              <td className="px-3 py-2">{row.impressions}</td>
                              <td className="px-3 py-2">{formatGscCtr(row.ctr)}</td>
                              <td className="px-3 py-2">{formatGscPosition(row.avgPosition)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <h5 className="text-xs font-bold text-gray-800 mb-2">ד. מוצרים עם פוטנציאל</h5>
                  <p className="text-[10px] text-gray-600 mb-2">דפי מוצר: חשיפות גבוהות, CTR נמוך, מיקום 8–20</p>
                  <GscExpandablePageTable
                    rows={gscProductPotential}
                    expandedSet={gscExpandedPages}
                    onToggle={toggleGscExpand}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 space-y-2">
                <h4 className="text-xs font-bold text-gray-800">חלק ג — בדיקת URL (בתוך Top Pages)</h4>
                <p className="text-[10px] text-gray-500">חיפוש התאמה ברשימת הדפים שהוחזרה מ-GSC לטווח הנבחר</p>
                <input
                  dir="ltr"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-left font-mono"
                  value={gscPageLookup}
                  onChange={(e) => setGscPageLookup(e.target.value)}
                  placeholder="https://... או חלק מנתיב"
                />
                {gscPageLookup.trim() && (
                  <div className="mt-2">
                    {gscMatchedPageRow ? (
                      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">נמצא בנתוני GSC</span>
                          {gscMatchedPageRow.status && <GscStatusBadge status={gscMatchedPageRow.status} />}
                          {gscMatchedPageRow.pageType && <GscPageTypeBadge pageType={gscMatchedPageRow.pageType} />}
                          {gscMatchedPageRow.uncertain ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-200 text-gray-700 border border-gray-300">לא זוהה בוודאות</span>
                          ) : null}
                        </div>
                        {gscMatchedPageRow.segmentLabel && (
                          <div className="text-[10px] text-gray-700">{gscMatchedPageRow.segmentLabel}</div>
                        )}
                        <div className="break-all dir-ltr text-left font-mono text-[10px]">{gscMatchedPageRow.page}</div>
                        <div className="flex flex-wrap gap-3 text-[11px]">
                          <span>clicks: <strong>{gscMatchedPageRow.clicks ?? 0}</strong></span>
                          <span>impressions: <strong>{gscMatchedPageRow.impressions ?? 0}</strong></span>
                          <span>ctr: <strong>{formatGscCtr(gscMatchedPageRow.ctr)}</strong></span>
                          <span>position: <strong>{formatGscPosition(gscMatchedPageRow.position)}</strong></span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        לא נמצאה התאמה ל-URL זה ברשימת Top Pages בטווח הנבחר (ייתכן שהדף מחוץ ל-50 המובילים או ללא נתונים בטווח).
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {apiStatusMessage && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-800">
          {apiStatusMessage}
        </div>
      )}

      {/* 4 — תוצאות SEO Audit (ציונים) */}
      {(auditData || googleHealth) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">תוצאות SEO Audit</h3>
            <p className="text-[11px] text-gray-500">סיכום ציונים לאחר סריקה (הפעל &quot;הפעל את כל בדיקות ה-SEO&quot;)</p>
          </div>
          <div className="p-4 flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px] px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-center">
              <div className="text-2xl font-extrabold" style={{ color: getScoreColor(truthScore || 0) }}>{truthScore ?? '-'}</div>
              <div className="text-[10px] text-gray-500">Truth SEO</div>
            </div>
            <div className="flex-1 min-w-[140px] px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-center">
              <div className="text-2xl font-extrabold" style={{ color: getScoreColor(googleLiveUiScore || 0) }}>{googleLiveUiScore ?? '-'}</div>
              <div className="text-[10px] text-gray-500">Google Live</div>
            </div>
            <div className="flex-1 min-w-[140px] px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-center">
              <div className="text-2xl font-extrabold" style={{ color: getScoreColor(siteHealthScore || 0) }}>{siteHealthScore ?? '-'}</div>
              <div className="text-[10px] text-gray-500">Site Health</div>
            </div>
          </div>
          {auditData?.scoringModel && (
            <div className="px-4 pb-4">
              <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-xs text-cyan-800">
                מודל ציון פעיל: {auditData.scoringModel}. הציון הראשי משקלל Google Live + Site Health + Blockers.
                {typeof auditData.legacyOverallScore === 'number' && (
                  <span className="mr-2">(ציון ישן להשוואה: {auditData.legacyOverallScore}%)</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5 — בעיות קריטיות */}
      {auditData?.blockingIssues?.length > 0 && (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #fee2e2' }}>
            <h3 className="text-sm font-bold text-red-700">בעיות חוסמות לטיפול מיידי</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
              {auditData.blockingIssuesCount}
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-2">
            {auditData.blockingIssues.slice(0, 8).map((issue, index) => (
              <div key={`${issue.report}-${index}`} className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="text-[10px] font-bold text-red-700 mb-1">{issue.report}</div>
                <div className="text-xs font-semibold text-gray-800">{issue.issue}</div>
                <div className="text-[10px] text-gray-500 mt-1 break-all">{issue.page_url || issue.field || issue.metric_name || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6 — פירוט טכני (דוחות) */}
      <div className="space-y-2">
        <div className="px-1">
          <h3 className="text-sm font-bold text-gray-800">פירוט טכני לפי דוחות</h3>
          <p className="text-[11px] text-gray-500">כל דוח מציג ממצאים מהסריקה הפנימית בלבד</p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {reportEntries.length > 0 ? (
            reportEntries.map(([type, report]) => (
              <div key={type} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f2f5' }}>
                  <div>
                    <h3 className="text-sm font-bold text-gray-700">{REPORT_META[type]?.label || type}</h3>
                    <p className="text-[11px] text-gray-400">{REPORT_META[type]?.description || report.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xl font-extrabold" style={{ color: getScoreColor(report.score || 0) }}>{report.score || 0}%</div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${getStatusClasses(report.status)}`}>{report.status}</span>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {type === 'web_vitals' && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                      ⚠️ נתונים אלו הם הערכה פנימית ולא נתוני Google CrUX
                    </div>
                  )}
                  {type === 'live_indexability' && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                      הבדיקות מבוססות על סריקה טכנית, לא נתוני Google Search Console
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {renderSummaryEntries(report.summary).map(([key, value]) => (
                      <div key={key} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <div className="text-[10px] text-gray-400">{key.replace(/_/g, ' ')}</div>
                        <div className="text-sm font-bold text-gray-800">{String(value)}</div>
                      </div>
                    ))}
                  </div>

                  {report.recommendations?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 mb-2">המלצות</h4>
                      <div className="space-y-1.5">
                        {report.recommendations.slice(0, 3).map((item) => (
                          <div key={item} className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-800">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-2">ממצאים מרכזיים</h4>
                    {report.issues?.length > 0 ? (
                      <div className="space-y-2 max-h-[260px] overflow-y-auto">
                        {report.issues.slice(0, 5).map((issue, index) => (
                          <div
                            key={`${type}-${index}`}
                            className={`rounded-lg border px-3 py-2 ${issue.severity === 'critical' ? 'bg-red-50 border-red-200' : issue.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-bold text-gray-800">{issue.issue}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${issue.severity === 'critical' ? 'bg-red-100 text-red-700' : issue.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                                {issue.severity}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1 break-all">
                              {issue.page_url || issue.field || issue.metric_name || issue.issue_type || '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-xs text-green-700">
                        לא נמצאו בעיות מהותיות בדוח זה.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
              הפעל את כל בדיקות ה-SEO כדי לראות את כל התוצאות והדוחות במקום אחד.
            </div>
          )}
        </div>
      </div>

      {/* 7 — היסטוריה */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f2f5' }}>
          <div>
            <h3 className="text-sm font-bold text-gray-700">היסטוריית דוחות SEO</h3>
            <p className="text-[11px] text-gray-400">הדוח האחרון שנשמר מכל סוג בדיקה (ללא כפילות Google Integrations)</p>
          </div>
          <span className="text-[11px] text-gray-400">{historyLoading ? 'טוען...' : `${latestHistoryByType.length} דוחות`}</span>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {historyLoading ? (
            <div className="col-span-full text-center text-gray-400 text-sm py-8">טוען היסטוריית דוחות...</div>
          ) : latestHistoryByType.length === 0 ? (
            <div className="col-span-full text-center text-gray-400 text-sm py-8">אין עדיין היסטוריית SEO audit שמורה.</div>
          ) : (
            latestHistoryByType.map((report) => (
              <div key={String(report._id)} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="text-xs font-bold text-gray-800">{REPORT_META[report.reportType]?.label || report.title}</div>
                    <div className="text-[10px] text-gray-400">{formatDate(report.timestamp || report.createdAt)}</div>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${getStatusClasses(report.status)}`}>{report.status}</span>
                </div>
                <div className="text-2xl font-extrabold mb-2" style={{ color: getScoreColor(report.score || 0) }}>{report.score || 0}%</div>
                <div className="space-y-1">
                  {renderSummaryEntries(report.summary).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="text-[11px] text-gray-500">
                      {key.replace(/_/g, ' ')}: <span className="font-bold text-gray-700">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
