'use client';

import { useState } from 'react';

const STAT_CONFIG = [
  {
    key: 'activeSales',
    title: 'מכירות פעילות',
    description: 'הזמנות שנמצאות כרגע בתהליך טיפול',
    format: 'number',
    gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    textColor: '#7c3aed',
    icon: (
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    key: 'totalSales',
    title: 'סה״כ הזמנות',
    description: 'כמות ההזמנות הכוללת שבוצעו דרך הלינק שלך',
    format: 'number',
    gradient: 'linear-gradient(135deg, #1e3a8a, #0891b2)',
    textColor: '#1e3a8a',
    icon: (
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    key: 'totalRevenue',
    title: 'סה״כ מכירות',
    description: 'סכום כל המכירות שנעשו דרך הקופון שלך',
    format: 'currency',
    gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)',
    textColor: '#0891b2',
    icon: (
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'availableBalance',
    title: 'יתרה למשיכה',
    description: 'סכום העמלות הזמין למשיכה מיידית',
    format: 'currency',
    gradient: 'linear-gradient(135deg, #10b981, #34d399)',
    textColor: '#059669',
    icon: (
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    key: 'clicks',
    title: 'קליקים',
    description: 'מספר הפעמים שמישהו לחץ על הלינק שלך',
    format: 'number',
    gradient: 'linear-gradient(135deg, #6b7280, #9ca3af)',
    textColor: '#4b5563',
    icon: (
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
      </svg>
    ),
  },
  {
    key: 'conversionRate',
    title: 'אחוז המרה',
    description: 'אחוז האנשים שקנו מתוך כל מי שלחץ על הלינק',
    format: 'percent',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    textColor: '#d97706',
    icon: (
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

function formatValue(value, format) {
  if (value === undefined || value === null) return '-';
  
  switch (format) {
    case 'currency':
      return `₪${Number(value).toLocaleString('he-IL')}`;
    case 'percent':
      return `${Number(value).toFixed(1)}%`;
    case 'number':
    default:
      return Number(value).toLocaleString('he-IL');
  }
}

function StatCard({ config, value, isActive, showDescription, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative p-4 rounded-xl bg-white transition-all duration-300 text-right w-full cursor-pointer"
      style={{
        border: '2px solid transparent',
        backgroundImage: `linear-gradient(white, white), ${config.gradient}`,
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        boxShadow: isActive ? '0 8px 20px rgba(8, 145, 178, 0.15)' : '0 2px 10px rgba(8, 145, 178, 0.08)',
        transform: isActive ? 'translateY(-3px)' : 'translateY(0)',
        minHeight: '88px',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: config.textColor }}>
          {config.title}
        </span>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: config.gradient }}
        >
          {config.icon}
        </div>
      </div>
      
      {showDescription ? (
        <p className="text-xs text-gray-600 leading-relaxed text-right">
          {config.description}
        </p>
      ) : (
        <p className="text-xl font-bold text-gray-900">
          {formatValue(value, config.format)}
        </p>
      )}
      
      {/* Small indicator */}
      <div 
        className="absolute bottom-2 left-2 text-[8px] text-gray-400"
      >
        {showDescription ? 'לחץ לנתונים' : 'לחץ להסבר'}
      </div>
    </button>
  );
}

export default function StatisticsSection({ stats }) {
  const [activeCard, setActiveCard] = useState(null);

  const toggleCard = (key) => {
    setActiveCard((prev) => (prev === key ? null : key));
  };

  return (
    <section
      className="rounded-2xl p-5 bg-white"
      style={{
        border: '2px solid transparent',
        backgroundImage:
          'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        boxShadow: '0 4px 15px rgba(8, 145, 178, 0.12)',
      }}
    >
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold" style={{ color: '#1e3a8a' }}>
          סטטיסטיקות
        </h2>
        <div
          className="w-16 h-1 mx-auto mt-2 rounded-full"
          style={{ background: 'linear-gradient(90deg, #1e3a8a, #0891b2)' }}
        />
        <p className="text-xs text-gray-500 mt-2">לחץ על כרטיס לפרטים נוספים</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {STAT_CONFIG.map((config) => (
          <StatCard
            key={config.key}
            config={config}
            value={stats[config.key]}
            isActive={activeCard === config.key}
            showDescription={activeCard === config.key}
            onToggle={() => toggleCard(config.key)}
          />
        ))}
      </div>
    </section>
  );
}
