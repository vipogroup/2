'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function BusinessSiteTextsPage() {
  const [businessId, setBusinessId] = useState(null);
  
  // Get businessId from API
  useEffect(() => {
    const getBusinessId = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data?.user?.businessId) {
          setBusinessId(data.user.businessId);
        } else if (data?.user?.id) {
          setBusinessId(data.user.id);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      }
    };
    getBusinessId();
  }, []);

  return (
    <div style={{ padding: '20px', direction: 'rtl' }}>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ 
            fontSize: '1.8rem', 
            fontWeight: '700', 
            background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '10px'
          }}>
            ניהול טקסטים
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
            שליטה מלאה בכל הטקסטים של החנות שלך
          </p>
        </div>
        <Link
          href="/business"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', flexShrink: 0 }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          חזרה לדשבורד
        </Link>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '20px' 
      }}>
        {/* Home Page Card */}
        <Link href="/business/site-texts/home" style={{ textDecoration: 'none' }}>
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
          }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h2 style={{ 
              fontSize: '1.2rem', 
              fontWeight: '600', 
              marginBottom: '8px',
              color: '#1e3a8a'
            }}>דף הבית</h2>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '0.9rem',
              lineHeight: '1.5'
            }}>
              ערוך את כל הטקסטים של דף הבית - כותרות, תיאורים, כפתורים ועוד
            </p>
            <div style={{ 
              marginTop: '16px',
              fontSize: '0.85rem',
              color: '#0891b2',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              לחץ לעריכה 
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Shop Page Card */}
        <Link href="/business/site-texts/shop" style={{ textDecoration: 'none' }}>
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
          }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <h2 style={{ 
              fontSize: '1.2rem', 
              fontWeight: '600', 
              marginBottom: '8px',
              color: '#1e3a8a'
            }}>דף החנות</h2>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '0.9rem',
              lineHeight: '1.5'
            }}>
              ערוך טקסטים של דף החנות - סינון, מיון, הודעות ועוד
            </p>
            <div style={{ 
              marginTop: '16px',
              fontSize: '0.85rem',
              color: '#0891b2',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              לחץ לעריכה 
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
