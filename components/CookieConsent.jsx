'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { ATTRIBUTION_CONSENT_EVENT } from '@/lib/attributionClient';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user already accepted cookies
    const accepted = localStorage.getItem('cookieConsent');
    if (!accepted) {
      // תזמון: הצג רק אחרי 8 שניות כדי לא להפריע למשתמש
      setTimeout(() => setShowBanner(true), 8000);
    }
  }, []);

  const acceptCookies = () => {
    try {
      localStorage.setItem('cookieConsent', 'true');
    } catch {
      /* private mode */
    }
    setShowBanner(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(ATTRIBUTION_CONSENT_EVENT, { detail: { accepted: true } }));
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999] px-3 pb-3">
      <div 
        className="bg-white shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3 animate-[slide-up_0.25s_ease-out]" 
        style={{ 
          border: '2px solid transparent', 
          backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', 
          backgroundOrigin: 'border-box', 
          backgroundClip: 'padding-box, border-box', 
          boxShadow: '0 8px 25px rgba(8, 145, 178, 0.25)' 
        }}
      >
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <p className="text-xs text-gray-600 flex-1">
          אתר זה משתמש בעוגיות לשיפור חווית הגלישה ולמדידת מקורות הגעה (קמפיינים), בהתאם למדיניות הפרטיות.
        </p>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={acceptCookies}
            className="text-white text-xs font-semibold px-4 py-2 rounded-xl"
            style={{ 
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', 
              boxShadow: '0 2px 8px rgba(8, 145, 178, 0.3)' 
            }}
          >
            אישור
          </button>
          <Link
            href="/privacy"
            className="text-gray-500 hover:text-gray-700 text-xs px-2 py-2"
          >
            פרטיות
          </Link>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
