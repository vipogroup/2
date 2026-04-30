'use client';

import { useTenant } from './AgentDashboardClient';

const numberFormatter = new Intl.NumberFormat('he-IL');
const currencyFormatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
});

const formatNumber = (value = 0) => numberFormatter.format(Math.max(0, Number(value) || 0));
const formatCurrency = (value = 0) => currencyFormatter.format(Math.max(0, Number(value) || 0));

/**
 * AgentStatsSection - סטטיסטיקות הסוכן לפי העסק הנבחר
 */
export default function AgentStatsSection() {
  const { stats, loading, currentBusiness, businesses, hasMultipleBusinesses } = useTenant();

  if (loading) {
    return (
      <section className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-8 bg-gray-100 rounded w-24"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      label: 'מכירות',
      value: formatNumber(stats.totalSales),
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 9l1 11h10l1-11H6z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 9V7a3 3 0 016 0v2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'הכנסות',
      value: formatCurrency(stats.totalRevenue),
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 16l5-5 4 4 7-7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 8h4v4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      label: 'עמלות שהרווחת',
      value: formatCurrency(stats.totalCommission),
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="5" width="18" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 10h-6a2 2 0 100 4h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: 'from-cyan-500 to-cyan-600',
    },
    {
      label: 'זמין למשיכה',
      value: formatCurrency(stats.availableBalance),
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: 'from-amber-500 to-amber-600',
      highlight: true,
    },
  ];

  const additionalStats = [
    { label: 'קליקים', value: formatNumber(stats.clicks) },
    { label: 'המרה', value: `${stats.conversionRate || 0}%` },
    { label: 'הפניות', value: formatNumber(stats.totalReferrals) },
  ];

  // חישוב סיכום כל העסקים
  const allBusinessesTotal = hasMultipleBusinesses ? {
    totalSales: businesses.reduce((sum, b) => sum + (b.totalSales || 0), 0),
    totalCommission: businesses.reduce((sum, b) => sum + (b.totalCommission || 0), 0),
    businessCount: businesses.length,
  } : null;

  return (
    <section className="mb-6">
      {/* כרטיס סיכום כל העסקים - מוצג רק אם יש יותר מעסק אחד */}
      {hasMultipleBusinesses && allBusinessesTotal && (
        <div className="mb-4 p-4 rounded-xl bg-gradient-to-l from-[#1e3a8a] to-[#0891b2] text-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              סיכום מכל העסקים
            </h3>
            <span className="text-sm bg-white/20 px-2 py-1 rounded-full">
              {allBusinessesTotal.businessCount} עסקים
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm text-white/70">סה&quot;כ מכירות</p>
              <p className="text-2xl font-bold">{formatNumber(allBusinessesTotal.totalSales)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm text-white/70">סה&quot;כ עמלות</p>
              <p className="text-2xl font-bold">{formatCurrency(allBusinessesTotal.totalCommission)}</p>
            </div>
          </div>
          {/* רשימת עסקים מקוצרת */}
          <div className="mt-3 pt-3 border-t border-white/20">
            <p className="text-xs text-white/70 mb-2">פירוט לפי עסק:</p>
            <div className="flex flex-wrap gap-2">
              {businesses.map((b) => (
                <div 
                  key={b.tenantId} 
                  className={`text-xs px-2 py-1 rounded-full ${b.isActive ? 'bg-white text-[#1e3a8a]' : 'bg-white/20'}`}
                >
                  {b.tenantName}: {formatCurrency(b.totalCommission || 0)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Business indicator for stats */}
      {currentBusiness && (
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>סטטיסטיקות עבור: <strong className="text-[#1e3a8a]">{currentBusiness.tenantName}</strong></span>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4 xl:gap-5 mb-4 lg:mb-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`bg-white rounded-xl border ${stat.highlight ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'} p-4 transition-all hover:shadow-md`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{stat.label}</span>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-white`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-xl font-bold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        {additionalStats.map((stat, index) => (
          <div
            key={index}
            className="bg-gradient-to-l from-[#1e3a8a]/5 to-[#0891b2]/5 rounded-lg px-3 py-2 text-center"
          >
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="text-lg font-bold text-[#1e3a8a]">{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
