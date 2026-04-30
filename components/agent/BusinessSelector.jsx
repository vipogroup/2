'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

/**
 * BusinessSelector - קומפוננטה לבחירת עסק פעיל עבור סוכן
 * מאפשרת לסוכן לראות ולהחליף בין עסקים שהוא מחובר אליהם
 */
export default function BusinessSelector({ 
  currentTenantId, 
  currentTenantName,
  onBusinessChange,
  compact = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(null);
  const dropdownRef = useRef(null);

  // טעינת העסקים שהסוכן מחובר אליהם
  useEffect(() => {
    loadBusinesses();
  }, []);

  // סגירת הדרופדאון בלחיצה מחוץ לאלמנט
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadBusinesses = async () => {
    try {
      const res = await fetch('/api/agent/businesses', { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.businesses) {
        setBusinesses(data.businesses);
      }
    } catch (err) {
      console.error('Failed to load businesses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (tenantId, tenantName) => {
    if (tenantId === currentTenantId) {
      setIsOpen(false);
      return;
    }

    setSwitching(tenantId);
    try {
      const res = await fetch('/api/agent/switch-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId }),
      });

      const data = await res.json();
      if (data.ok) {
        setIsOpen(false);
        if (onBusinessChange) {
          onBusinessChange(tenantId, tenantName);
        } else {
          // רענון הדף אם לא הועברה פונקציית callback
          window.location.reload();
        }
      }
    } catch (err) {
      console.error('Failed to switch business:', err);
    } finally {
      setSwitching(null);
    }
  };

  // אם הסוכן לא מחובר לאף עסק, הצג לינק להצטרפות
  if (!loading && businesses.length === 0) {
    return (
      <Link
        href="/agent/marketplace"
        className="flex items-center gap-2 px-3 py-2 text-sm text-[#0891b2] hover:bg-[#0891b2]/5 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span>הצטרף לעסק</span>
      </Link>
    );
  }

  // אם הסוכן מחובר לעסק אחד בלבד, הצג רק את השם
  if (!loading && businesses.length === 1) {
    const business = businesses[0];
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-l from-[#1e3a8a] to-[#0891b2] flex items-center justify-center text-white text-xs font-bold">
          {business.tenantName?.charAt(0) || 'W'}
        </div>
        <span className="text-sm font-medium text-gray-700">{business.tenantName}</span>
      </div>
    );
  }

  // תצוגה מקוצרת (compact) - רק אייקון
  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-l from-[#1e3a8a] to-[#0891b2] text-white hover:opacity-90 transition-opacity"
          title={currentTenantName || 'בחר עסק'}
        >
          {currentTenantName ? (
            <span className="text-sm font-bold">{currentTenantName.charAt(0)}</span>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          )}
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-500">העסקים שלי</p>
            </div>
            {renderBusinessList()}
          </div>
        )}
      </div>
    );
  }

  // תצוגה מלאה
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-[#0891b2]/40 transition-colors w-full"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-l from-[#1e3a8a] to-[#0891b2] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {currentTenantName?.charAt(0) || 'W'}
        </div>
        <div className="flex-1 text-right min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {currentTenantName || 'בחר עסק'}
          </p>
          <p className="text-xs text-gray-500">
            {businesses.length} עסקים פעילים
          </p>
        </div>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">העסקים שלי</p>
            <Link
              href="/agent/marketplace"
              className="text-xs text-[#0891b2] hover:underline flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              הוסף עסק
            </Link>
          </div>
          {renderBusinessList()}
        </div>
      )}
    </div>
  );

  function renderBusinessList() {
    if (loading) {
      return (
        <div className="px-4 py-3 text-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0891b2] mx-auto"></div>
        </div>
      );
    }

    return (
      <div className="max-h-64 overflow-y-auto">
        {businesses.map((business) => {
          const isActive = business.tenantId === currentTenantId;
          const isSwitching = switching === business.tenantId;

          return (
            <button
              key={business.tenantId}
              onClick={() => handleSwitch(business.tenantId, business.tenantName)}
              disabled={isSwitching}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                isActive ? 'bg-[#0891b2]/5' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                isActive 
                  ? 'bg-gradient-to-l from-[#1e3a8a] to-[#0891b2] text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {business.tenantLogo ? (
                  <Image
                    src={business.tenantLogo}
                    alt=""
                    width={32}
                    height={32}
                    className="w-full h-full rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  business.tenantName?.charAt(0) || 'W'
                )}
              </div>
              
              <div className="flex-1 text-right min-w-0">
                <p className={`text-sm font-medium truncate ${isActive ? 'text-[#0891b2]' : 'text-gray-800'}`}>
                  {business.tenantName}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{business.commissionPercent}% עמלה</span>
                  <span>•</span>
                  <span>₪{(business.totalCommission || 0).toLocaleString()}</span>
                </div>
              </div>

              {isSwitching ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0891b2]"></div>
              ) : isActive ? (
                <svg className="w-5 h-5 text-[#16a34a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }
}
