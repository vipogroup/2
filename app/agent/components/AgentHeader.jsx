'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTenant } from './AgentDashboardClient';

/**
 * AgentHeader - כותרת דשבורד הסוכן עם בורר עסקים
 */
export default function AgentHeader() {
  const { currentBusiness, businesses, switching, switchBusiness, hasMultipleBusinesses, loading } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const handleSwitch = async (tenantId) => {
    setIsOpen(false);
    await switchBusiness(tenantId);
  };

  return (
    <div className="mb-6">
      {/* כותרת ראשית */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h1
            className="text-3xl font-bold mb-1"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            דשבורד סוכן
          </h1>
          <div
            className="h-1 w-24 rounded-full"
            style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #0891b2 100%)' }}
          />
        </div>

        {/* בורר עסקים */}
        {!loading && hasMultipleBusinesses && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              disabled={switching}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl hover:border-[#0891b2]/40 transition-all shadow-sm"
            >
              {switching ? (
                <div className="w-8 h-8 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0891b2]"></div>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-l from-[#1e3a8a] to-[#0891b2] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {currentBusiness?.tenantName?.charAt(0) || 'W'}
                </div>
              )}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-800 max-w-[120px] truncate">
                  {currentBusiness?.tenantName || 'בחר עסק'}
                </p>
                <p className="text-[10px] text-gray-500">{businesses.length} עסקים</p>
              </div>
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
              <div className="absolute left-0 sm:right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500">העסקים שלי</p>
                  <Link
                    href="/agent/marketplace"
                    className="text-xs text-[#0891b2] hover:underline flex items-center gap-1"
                    onClick={() => setIsOpen(false)}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    הוסף עסק
                  </Link>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {businesses.map((business) => {
                    const isActive = business.isActive;
                    return (
                      <button
                        key={business.tenantId}
                        onClick={() => handleSwitch(business.tenantId)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                          isActive ? 'bg-[#0891b2]/5' : ''
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          isActive 
                            ? 'bg-gradient-to-l from-[#1e3a8a] to-[#0891b2] text-white' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {business.tenantName?.charAt(0) || 'W'}
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

                        {isActive && (
                          <svg className="w-5 h-5 text-[#16a34a] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* אינדיקציה לעסק הנוכחי */}
      {!loading && currentBusiness && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-[#0891b2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span>
            עובד עם: <strong className="text-[#1e3a8a]">{currentBusiness.tenantName}</strong>
          </span>
          {currentBusiness.commissionPercent && (
            <span className="px-2 py-0.5 bg-[#0891b2]/10 text-[#0891b2] rounded-full text-xs font-medium">
              {currentBusiness.commissionPercent}% עמלה
            </span>
          )}
        </div>
      )}
    </div>
  );
}
