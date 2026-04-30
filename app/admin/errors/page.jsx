// UI Unification Checklist (CRM parity only):
// - [x] Rebuilt UI from scratch
// - [x] Stats via stats API
// - [x] Events via events API
// - [x] Pagination
// - [x] RTL/LTR handling

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import StatsBar from './components/StatsBar';
import EventsList from './components/EventsList';

const WINDOW_OPTIONS = [
  { value: '15m', label: '15 דקות' },
  { value: '1h', label: 'שעה' },
  { value: '24h', label: '24 שעות' },
];

export default function AdminErrorsPage() {
  const [windowValue, setWindowValue] = useState('1h');

  const windowLabel = useMemo(
    () => WINDOW_OPTIONS.find((opt) => opt.value === windowValue)?.label || 'שעה',
    [windowValue],
  );

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-gradient-to-l from-[#1e3a8a] to-[#0891b2] bg-clip-text">
            ניטור שגיאות מערכת
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            מרכז הבקרה לשגיאות השרת וה-API. צפה במגמות, חקור אירועים חדשים ופעל במהירות בהתאם לחלון הזמן שנבחר ({windowLabel}).
          </p>
        </header>

        <section className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">חלון זמן:</span>
          <div className="flex flex-wrap gap-2">
            {WINDOW_OPTIONS.map((option) => {
              const isActive = option.value === windowValue;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setWindowValue(option.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0891b2] ${
                    isActive
                      ? 'text-white bg-gradient-to-l from-[#1e3a8a] to-[#0891b2] shadow'
                      : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <StatsBar window={windowValue} />

        <EventsList window={windowValue} />
      </div>
    </div>
  );
}
