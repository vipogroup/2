'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SiteTextsPage() {
  const embedded = false;
  const pathname = usePathname();
  const basePath = pathname?.startsWith('/business') ? '/business' : '/admin';

  return (
    <div style={{ padding: embedded ? '12px' : '20px', direction: 'rtl' }}>
      {/* Header removed - sidebar provides navigation */}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '20px' 
      }}>
        {/* Home Page Card */}
        <Link href="/admin/site-texts/home" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(8, 145, 178, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.08)';
          }}
          >
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
            </div>
            <h3 style={{ 
              fontSize: '1.1rem', 
              fontWeight: '600', 
              color: '#1e3a8a',
              marginBottom: '8px'
            }}>
              עמוד ראשי (Home Page)
            </h3>
            <p style={{ 
              fontSize: '0.85rem', 
              color: '#6b7280',
              lineHeight: '1.5'
            }}>
              ניהול כל הטקסטים בעמוד הבית - Hero, איך זה עובד, שאלות נפוצות ועוד
            </p>
            <div style={{
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#0891b2',
              fontSize: '0.85rem',
              fontWeight: '500'
            }}>
              <span>ערוך טקסטים</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'scaleX(-1)' }}>
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </div>
          </div>
        </Link>

        {/* Coming Soon Cards */}
        {[
          { name: 'דף חנות', icon: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z' },
          { name: 'דף מוצר', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z' },
          { name: 'דף עגלה', icon: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z' },
        ].map((page, index) => (
          <div key={index} style={{
            background: '#f8f9fa',
            borderRadius: '12px',
            padding: '24px',
            border: '2px dashed #e5e7eb',
            opacity: 0.7,
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: '#e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#9ca3af">
                <path d={page.icon}/>
              </svg>
            </div>
            <h3 style={{ 
              fontSize: '1.1rem', 
              fontWeight: '600', 
              color: '#9ca3af',
              marginBottom: '8px'
            }}>
              {page.name}
            </h3>
            <p style={{ 
              fontSize: '0.85rem', 
              color: '#9ca3af',
              lineHeight: '1.5'
            }}>
              בקרוב...
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
