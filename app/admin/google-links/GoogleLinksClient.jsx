'use client';

import { useEffect, useMemo, useState } from 'react';

const OpenIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const GoogleIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const LINKS = [
  {
    id: 'analytics',
    title: 'Google Analytics',
    description: 'נתוני תנועה, ביקורים ומשתמשים באתר',
    url: 'https://analytics.google.com',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: '#E37400',
  },
  {
    id: 'search-console',
    title: 'Search Console',
    description: 'ביצועי חיפוש, אינדוקס וסריקת האתר',
    url: 'https://search.google.com/search-console',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    color: '#4285F4',
  },
  {
    id: 'ads',
    title: 'Google Ads',
    description: 'ניהול קמפיינים ופרסום ממומן',
    url: 'https://ads.google.com',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    color: '#34A853',
  },
  {
    id: 'tag-manager',
    title: 'Tag Manager',
    description: 'ניהול תגיות ומעקב באתר',
    url: 'https://tagmanager.google.com',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    color: '#4285F4',
  },
  {
    id: 'pagespeed',
    title: 'PageSpeed Insights',
    description: 'בדיקת מהירות וביצועי האתר',
    url: 'https://pagespeed.web.dev',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: '#EA4335',
  },
  {
    id: 'business',
    title: 'Business Profile',
    description: 'ניהול פרופיל העסק בגוגל מפות',
    url: 'https://business.google.com',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    color: '#FBBC05',
  },
];

export default function GoogleLinksClient() {
  const [settings, setSettings] = useState({
    googleAnalyticsId: '',
    googleTagManagerId: '',
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/settings', { cache: 'no-store' });
        const data = await response.json();
        if (data?.ok && data?.settings) {
          setSettings({
            googleAnalyticsId: String(data.settings.googleAnalyticsId || '').trim(),
            googleTagManagerId: String(data.settings.googleTagManagerId || '').trim(),
          });
        }
      } catch (error) {
        console.error('Failed to load Google settings:', error);
      }
    }

    loadSettings();

    // Fire background health scan for admin telemetry.
    fetch('/api/admin/google-links/scan', { cache: 'no-store' }).catch(() => {});
  }, []);

  const links = useMemo(() => {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.vipo-group.com';
    const domain = siteUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    const scResource = encodeURIComponent(`sc-domain:${domain}`);
    const pageSpeedUrl = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(siteUrl)}`;

    return LINKS.map((link) => {
      if (link.id === 'search-console') {
        return {
          ...link,
          url: `https://search.google.com/search-console?resource_id=${scResource}`,
        };
      }

      if (link.id === 'analytics' && settings.googleAnalyticsId) {
        return {
          ...link,
          url: `https://analytics.google.com/analytics/web/?hl=he#${encodeURIComponent(settings.googleAnalyticsId)}`,
        };
      }

      if (link.id === 'tag-manager' && settings.googleTagManagerId) {
        return {
          ...link,
          url: `https://tagmanager.google.com/#/home`,
        };
      }

      if (link.id === 'pagespeed') {
        return {
          ...link,
          url: pageSpeedUrl,
        };
      }

      return link;
    });
  }, [settings.googleAnalyticsId, settings.googleTagManagerId]);

  return (
    <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Header bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GoogleIcon className="w-5 h-5" />
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>דוחות גוגל</h1>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>קישורים מהירים לכלי גוגל</span>
        </div>
      </div>

      <div style={{ padding: '12px 16px 0', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 10,
          padding: '10px 12px',
          fontSize: 12,
          color: '#1e3a8a',
          lineHeight: 1.5,
        }}>
          הכלים המרכזיים והזרימה המלאה זמינים בלשונית <strong>Google SEO Audit</strong> תחת{' '}
          <a href="/admin/control-center?tab=seo" style={{ color: '#0891b2', fontWeight: 600 }}>מרכז בקרה</a>.
          דף זה נשמר לגישה ישירה ולמסכים צרים.
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>

          {/* Cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {links.map(link => (
              <div
                key={link.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  transition: 'box-shadow 150ms',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
              >
                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${link.color}12`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: link.color, flexShrink: 0,
                  }}>
                    {link.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{link.title}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{link.description}</div>
                  </div>
                </div>

                {/* URL display */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: '#475569',
                  direction: 'ltr',
                  textAlign: 'left',
                  wordBreak: 'break-all',
                }}>
                  {link.url}
                </div>

                {/* Action */}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 12, fontWeight: 600,
                    color: '#fff',
                    background: `linear-gradient(135deg, ${link.color} 0%, ${link.color}cc 100%)`,
                    textDecoration: 'none',
                    transition: 'opacity 200ms',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <OpenIcon />
                  פתח
                </a>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
