'use client';

import { gradients } from '@/lib/theme';

/**
 * KPICard Component - כרטיס סטטיסטיקה אחיד למערכת VIPO
 * 
 * שימוש:
 * <KPICard title="סה״כ משתמשים" value={150} />
 * <KPICard title="הכנסות" value="₪15,000" color="green" />
 * <KPICard title="ממתינים" value={5} color="yellow" icon={<ClockIcon />} />
 */

export default function KPICard({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',         // blue | green | yellow | red | purple
  trend,                   // { value: '+15%', positive: true }
  className = '',
}) {
  // צבעים לפי סוג
  const colorStyles = {
    blue: {
      border: '#1e3a8a',
      text: '#1e3a8a',
      bg: 'bg-blue-50',
    },
    green: {
      border: '#16a34a',
      text: '#16a34a',
      bg: 'bg-green-50',
    },
    yellow: {
      border: '#eab308',
      text: '#eab308',
      bg: 'bg-yellow-50',
    },
    red: {
      border: '#dc2626',
      text: '#dc2626',
      bg: 'bg-red-50',
    },
    purple: {
      border: '#7c3aed',
      text: '#7c3aed',
      bg: 'bg-purple-50',
    },
  };
  
  const currentColor = colorStyles[color] || colorStyles.blue;
  
  return (
    <div
      className={`bg-white rounded-xl p-4 shadow-md ${className}`}
      style={{
        border: '2px solid transparent',
        backgroundImage: `linear-gradient(white, white), linear-gradient(135deg, ${currentColor.border}, ${currentColor.border}88)`,
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* כותרת */}
          <p className="text-xs sm:text-sm text-gray-500 mb-1">{title}</p>
          
          {/* ערך */}
          <p 
            className="text-lg sm:text-2xl font-bold"
            style={{ color: currentColor.text }}
          >
            {value}
          </p>
          
          {/* כותרת משנה */}
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
          
          {/* מגמה */}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${
              trend.positive ? 'text-green-600' : 'text-red-600'
            }`}>
              <svg 
                className={`w-3 h-3 ${!trend.positive && 'rotate-180'}`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        
        {/* אייקון */}
        {icon && (
          <div 
            className={`p-2 rounded-lg ${currentColor.bg}`}
            style={{ color: currentColor.text }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * KPIGrid - גריד של כרטיסי KPI - Mobile First Responsive
 * Breakpoints: 360px, 480px, 768px, 1024px, 1280px+
 */
export function KPIGrid({ children, columns = 4, className = '' }) {
  // Mobile First: 2 cols on mobile, scales up with screen size
  const colsClass = {
    2: 'grid-cols-2 md:grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
  };
  
  return (
    <div className={`grid ${colsClass[columns] || colsClass[4]} gap-3 md:gap-4 lg:gap-6 mb-4 md:mb-6 ${className}`}>
      {children}
    </div>
  );
}
