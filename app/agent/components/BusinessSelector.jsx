'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function BusinessSelector({ selectedTenantId, onSelect }) {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    async function loadBusinesses() {
      try {
        const res = await fetch('/api/agent/businesses', { credentials: 'include' });
        const data = await res.json();
        if (data.ok) {
          setBusinesses(data.businesses || []);
          // Auto-select first business if none selected
          if (!selectedTenantId && data.businesses?.length > 0) {
            onSelect(data.businesses[0].tenantId);
          }
        }
      } catch (err) {
        console.error('Failed to load businesses:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBusinesses();
    // Intentional: load once on mount; onSelect is stable in practice
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedBusiness = businesses.find(b => b.tenantId === selectedTenantId);

  if (loading) {
    return (
      <div className="h-10 bg-white/10 rounded-lg animate-pulse w-48"></div>
    );
  }

  if (businesses.length === 0) {
    return (
      <Link
        href="/agent/marketplace"
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span>הצטרף לעסק</span>
      </Link>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Business Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors min-w-[180px]"
      >
        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
          {selectedBusiness?.tenantName?.charAt(0) || 'W'}
        </div>
        <span className="flex-1 text-right truncate">
          {selectedBusiness?.tenantName || 'בחר עסק'}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
          {/* Business List */}
          <div className="max-h-64 overflow-y-auto">
            {businesses.map((business) => (
              <button
                key={business.tenantId}
                onClick={() => {
                  onSelect(business.tenantId);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-gray-50 transition-colors ${
                  selectedTenantId === business.tenantId ? 'bg-blue-50' : ''
                }`}
              >
                <div className="w-8 h-8 bg-gradient-to-l from-[#1e3a8a] to-[#0891b2] rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {business.tenantName?.charAt(0) || 'W'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 truncate">{business.tenantName}</div>
                  <div className="text-xs text-gray-500">
                    {business.commissionPercent}% עמלה • {business.ordersCount} הזמנות
                  </div>
                </div>
                {selectedTenantId === business.tenantId && (
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Add Business Link */}
          <Link
            href="/agent/marketplace"
            className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <span className="font-medium">הוסף עסק נוסף</span>
          </Link>
        </div>
      )}
    </div>
  );
}
