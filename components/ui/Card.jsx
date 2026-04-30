'use client';

import { gradients } from '@/lib/theme';

/**
 * Card Component - כרטיס אחיד למערכת VIPO
 * 
 * שימוש:
 * <Card>תוכן</Card>
 * <Card variant="bordered">תוכן עם מסגרת גרדיאנט</Card>
 * <Card variant="interactive">תוכן עם אפקט hover</Card>
 */

export default function Card({
  children,
  variant = 'default',    // default | bordered | interactive | flat
  padding = 'default',    // none | small | default | large
  className = '',
  onClick,
  ...props
}) {
  // סגנונות בסיס
  const baseStyles = 'bg-white rounded-2xl';
  
  // סגנונות לפי variant
  const variantStyles = {
    default: 'shadow-xl',
    bordered: '',
    interactive: 'shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer',
    flat: 'border border-gray-200',
  };
  
  // סגנונות padding - Mobile First responsive
  const paddingStyles = {
    none: '',
    small: 'p-3 md:p-4',
    default: 'p-4 md:p-6',
    large: 'p-5 md:p-8',
  };
  
  // סגנון inline למסגרת גרדיאנט
  const getBorderedStyle = () => {
    if (variant === 'bordered') {
      return {
        border: '2px solid transparent',
        backgroundImage: `linear-gradient(white, white), ${gradients.primary}`,
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
      };
    }
    return {};
  };
  
  // קלאסים מאוחדים
  const combinedClassName = [
    baseStyles,
    variantStyles[variant],
    paddingStyles[padding],
    className,
  ].filter(Boolean).join(' ');
  
  return (
    <div
      className={combinedClassName}
      style={getBorderedStyle()}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * CardHeader - כותרת כרטיס
 */
export function CardHeader({ 
  title, 
  subtitle, 
  action,
  className = '' 
}) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div>
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/**
 * CardContent - תוכן כרטיס
 */
export function CardContent({ children, className = '' }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

/**
 * CardFooter - תחתית כרטיס
 */
export function CardFooter({ children, className = '' }) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-100 ${className}`}>
      {children}
    </div>
  );
}
