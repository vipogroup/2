'use client';

import { useState, useEffect, useCallback } from 'react';

const LinkIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

const CopyIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const OpenIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const LINKS = [
  {
    id: 'customer',
    title: 'הרשמת לקוח',
    description: 'טופס הרשמה ללקוחות חדשים',
    path: '/register',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    color: '#3b82f6',
  },
  {
    id: 'agent',
    title: 'הרשמת סוכן',
    description: 'טופס הרשמה לסוכנים חדשים',
    path: '/register-agent',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: '#8b5cf6',
  },
  {
    id: 'business',
    title: 'הרשמת עסק',
    description: 'טופס הרשמה לבעלי עסקים',
    path: '/register-business',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    color: '#0891b2',
  },
  {
    id: 'login',
    title: 'דף התחברות',
    description: 'דף כניסה למשתמשים קיימים',
    path: '/login',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
    ),
    color: '#1e3a8a',
  },
];

export default function RegistrationLinksClient() {
  const [copiedId, setCopiedId] = useState(null);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const handleCopy = useCallback(async (id, path) => {
    const url = `${baseUrl}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, [baseUrl]);

  return (
    <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Header bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LinkIcon className="w-5 h-5" style={{ color: '#1e3a8a' }} />
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>קישורי הרשמה</h1>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>קישורים לטפסי הרשמה והתחברות</span>
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>

          {/* Cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {LINKS.map(link => {
              const fullUrl = `${baseUrl}${link.path}`;
              const isCopied = copiedId === link.id;

              return (
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
                    {fullUrl || link.path}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleCopy(link.id, link.path)}
                      style={{
                        flex: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 12, fontWeight: 600,
                        color: isCopied ? '#fff' : '#1e3a8a',
                        background: isCopied ? '#16a34a' : '#fff',
                        border: isCopied ? '1px solid #16a34a' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 200ms',
                        fontFamily: 'inherit',
                      }}
                    >
                      {isCopied ? <CheckIcon /> : <CopyIcon />}
                      {isCopied ? 'הועתק!' : 'העתק קישור'}
                    </button>
                    <a
                      href={link.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '8px 16px',
                        borderRadius: 8,
                        fontSize: 12, fontWeight: 600,
                        color: '#fff',
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
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
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
