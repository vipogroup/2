'use client';

import Link from 'next/link';
import { gradients } from '@/lib/theme';

/**
 * PageHeader Component - כותרת עמוד אחידה למערכת VIPO
 * 
 * שימוש:
 * <PageHeader title="ניהול משתמשים" />
 * <PageHeader title="ניהול משתמשים" subtitle="צפה וערוך משתמשים" />
 * <PageHeader title="ניהול משתמשים" backHref="/admin" />
 * <PageHeader title="ניהול משתמשים" actions={<Button>הוסף</Button>} />
 */

export default function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = 'חזרה',
  actions,
  className = '',
}) {
  // סגנון גרדיאנט לטקסט
  const gradientTextStyle = {
    background: gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };
  
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 ${className}`}>
      {/* צד שמאל - כותרת וכפתור חזרה */}
      <div className="flex items-center gap-3">
        {backHref && (
          <Link 
            href={backHref} 
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title={backLabel}
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
        
        <div>
          <h1 
            className="text-2xl md:text-3xl font-bold"
            style={gradientTextStyle}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      
      {/* צד ימין - פעולות */}
      {actions && (
        <div className="flex gap-2 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * PageContainer - מיכל עמוד עם רקע וריפוד אחיד
 */
export function PageContainer({ children, className = '' }) {
  return (
    <main 
      className={`min-h-screen p-4 md:p-6 lg:p-8 ${className}`}
      style={{ background: 'linear-gradient(to bottom right, #eff6ff, #ffffff)' }}
    >
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </main>
  );
}

/**
 * PageSection - סקשן בעמוד
 */
export function PageSection({ 
  title, 
  subtitle,
  children, 
  className = '' 
}) {
  return (
    <section className={`mb-8 ${className}`}>
      {title && (
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
