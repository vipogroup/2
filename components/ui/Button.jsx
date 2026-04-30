'use client';

import { gradients, colors } from '@/lib/theme';

/**
 * Button Component - כפתור אחיד למערכת VIPO
 * 
 * שימוש:
 * <Button>טקסט</Button>
 * <Button variant="secondary">טקסט</Button>
 * <Button variant="danger">מחק</Button>
 * <Button size="small">טקסט</Button>
 * <Button loading>טוען...</Button>
 */

export default function Button({
  children,
  variant = 'primary',    // primary | secondary | danger | ghost
  size = 'default',       // small | default | large
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  // סגנונות בסיס
  const baseStyles = 'font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2';
  
  // סגנונות לפי variant
  const variantStyles = {
    primary: '',
    secondary: 'border-2 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-gray-600 hover:bg-gray-100',
  };
  
  // סגנונות לפי גודל - Mobile First with min touch target 44px
  const sizeStyles = {
    small: 'px-3 py-2 text-sm min-h-[36px] md:min-h-[40px]',
    default: 'px-4 py-2.5 text-sm min-h-[44px] md:px-6 md:py-3 md:text-base',
    large: 'px-6 py-3 text-base min-h-[48px] md:px-8 md:py-4 md:text-lg',
  };
  
  // סגנון inline לגרדיאנט (רק ל-primary)
  const getStyle = () => {
    if (variant === 'primary') {
      return { background: gradients.primary };
    }
    if (variant === 'secondary') {
      return { 
        borderColor: colors.primary.cyan, 
        color: colors.primary.blue 
      };
    }
    return {};
  };
  
  // קלאסים מאוחדים
  const combinedClassName = [
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    variant === 'primary' && 'text-white hover:scale-105 shadow-lg',
    fullWidth && 'w-full',
    (disabled || loading) && 'opacity-50 cursor-not-allowed',
    className,
  ].filter(Boolean).join(' ');
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={combinedClassName}
      style={getStyle()}
      {...props}
    >
      {loading && (
        <svg 
          className="animate-spin h-5 w-5" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

/**
 * IconButton - כפתור עם אייקון בלבד
 */
export function IconButton({
  children,
  variant = 'ghost',
  size = 'default',
  className = '',
  ...props
}) {
  const sizeStyles = {
    small: 'p-1.5',
    default: 'p-2',
    large: 'p-3',
  };
  
  return (
    <Button
      variant={variant}
      className={`${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
}

/**
 * ButtonGroup - קבוצת כפתורים
 */
export function ButtonGroup({ children, className = '' }) {
  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      {children}
    </div>
  );
}
