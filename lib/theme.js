/**
 * VIPO Design System - Theme Configuration
 * =========================================
 * קובץ מרכזי לכל הגדרות העיצוב של המערכת
 * 
 * כללים חשובים:
 * 1. גרדיאנט כחול-טורקיז בלבד לכפתורים וכותרות
 * 2. אין אימוג'ים לעולם - רק SVG
 * 3. אין ירוק לכפתורים - רק לאינדיקציות הצלחה
 * 4. אין אדום אלא למחיקה ושגיאות
 */

// ==================== צבעים ====================

export const colors = {
  // צבעים ראשיים - הגרדיאנט המרכזי
  primary: {
    blue: '#1e3a8a',      // כחול כהה
    cyan: '#0891b2',      // טורקיז
  },
  
  // צבעים משניים
  secondary: {
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },
  
  // צבעי סטטוס (לא לכפתורים!)
  status: {
    success: '#16a34a',   // ירוק - רק לאינדיקציות
    error: '#dc2626',     // אדום - רק למחיקה ושגיאות
    warning: '#f59e0b',   // כתום - להתראות
    info: '#3b82f6',      // כחול - למידע
  },
};

// ==================== גרדיאנטים ====================

export const gradients = {
  // הגרדיאנט הראשי - משתמשים בזה בכל מקום!
  primary: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
  
  // גרדיאנט הפוך (לאפקטים מיוחדים)
  primaryReverse: 'linear-gradient(135deg, #0891b2 0%, #1e3a8a 100%)',
  
  // גרדיאנט אדום (רק למחיקה!)
  danger: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)',
  
  // רקע דף
  pageBackground: 'linear-gradient(to bottom right, #eff6ff, #ffffff)',
};

// ==================== סגנונות כפתורים ====================

export const buttonStyles = {
  // כפתור ראשי - הכי נפוץ
  primary: {
    background: gradients.primary,
    color: 'white',
    className: 'px-6 py-3 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg',
  },
  
  // כפתור משני - מסגרת בלבד
  secondary: {
    borderColor: colors.primary.cyan,
    color: colors.primary.blue,
    className: 'px-6 py-3 font-bold rounded-xl border-2 hover:bg-gray-50 transition-all',
  },
  
  // כפתור מחיקה - אדום
  danger: {
    background: colors.status.error,
    color: 'white',
    className: 'px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all',
  },
  
  // כפתור קטן
  small: {
    background: gradients.primary,
    color: 'white',
    className: 'px-3 py-1.5 text-sm text-white font-medium rounded-lg hover:scale-105 transition-all',
  },
  
  // כפתור disabled
  disabled: {
    className: 'opacity-50 cursor-not-allowed',
  },
};

// ==================== סגנונות כרטיסים ====================

export const cardStyles = {
  // כרטיס רגיל
  default: {
    className: 'bg-white rounded-2xl shadow-xl p-6',
  },
  
  // כרטיס עם מסגרת גרדיאנט
  bordered: {
    className: 'bg-white rounded-2xl p-6',
    style: {
      border: '2px solid transparent',
      backgroundImage: `linear-gradient(white, white), ${gradients.primary}`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'padding-box, border-box',
    },
  },
  
  // כרטיס KPI
  kpi: {
    className: 'bg-white rounded-xl p-4 shadow-md',
  },
  
  // כרטיס hover
  interactive: {
    className: 'bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer',
  },
};

// ==================== סגנונות טקסט ====================

export const textStyles = {
  // כותרת ראשית
  h1: {
    className: 'text-3xl md:text-4xl font-bold',
    gradient: true, // להחיל גרדיאנט על הטקסט
  },
  
  // כותרת משנית
  h2: {
    className: 'text-2xl font-bold text-gray-900',
  },
  
  // כותרת קטנה
  h3: {
    className: 'text-xl font-semibold text-gray-800',
  },
  
  // כותרת קטנה מאוד
  h4: {
    className: 'text-lg font-semibold text-gray-700',
  },
  
  // טקסט רגיל
  body: {
    className: 'text-base text-gray-600',
  },
  
  // טקסט קטן
  small: {
    className: 'text-sm text-gray-500',
  },
  
  // תווית
  label: {
    className: 'text-sm font-semibold text-gray-900 mb-2',
  },
};

// ==================== סגנון גרדיאנט לטקסט ====================

export const gradientTextStyle = {
  background: gradients.primary,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

// ==================== סגנונות Input ====================

export const inputStyles = {
  default: {
    className: 'w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-cyan-600 transition-colors',
  },
  
  error: {
    className: 'w-full px-4 py-3 border-2 border-red-500 rounded-xl focus:outline-none focus:border-red-600',
  },
};

// ==================== סגנונות טבלה ====================

export const tableStyles = {
  container: {
    className: 'overflow-x-auto',
  },
  table: {
    className: 'w-full',
  },
  header: {
    className: 'bg-gray-50 text-right',
  },
  headerCell: {
    className: 'px-4 py-3 text-xs font-semibold text-gray-600 uppercase',
  },
  row: {
    className: 'border-b border-gray-100 hover:bg-gray-50 transition-colors',
  },
  cell: {
    className: 'px-4 py-3 text-sm text-gray-700',
  },
};

// ==================== Breakpoints (רספונסיביות) ====================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ==================== רווחים ====================

export const spacing = {
  page: 'p-4 md:p-6 lg:p-8',
  section: 'mb-6 md:mb-8',
  card: 'p-4 md:p-6',
  gap: 'gap-4 md:gap-6',
};

// ==================== אנימציות ====================

export const animations = {
  hover: 'hover:scale-105 transition-all duration-200',
  hoverShadow: 'hover:shadow-lg transition-shadow duration-200',
  fadeIn: 'animate-fadeIn',
  spin: 'animate-spin',
};

// ==================== פונקציות עזר ====================

/**
 * מחזיר סגנון inline לגרדיאנט הראשי
 */
export const getPrimaryGradientStyle = () => ({
  background: gradients.primary,
});

/**
 * מחזיר סגנון inline למסגרת גרדיאנט
 */
export const getBorderedCardStyle = () => ({
  border: '2px solid transparent',
  backgroundImage: `linear-gradient(white, white), ${gradients.primary}`,
  backgroundOrigin: 'border-box',
  backgroundClip: 'padding-box, border-box',
});

/**
 * מחזיר סגנון inline לטקסט גרדיאנט
 */
export const getGradientTextStyle = () => gradientTextStyle;

// ==================== ייצוא ברירת מחדל ====================

const theme = {
  colors,
  gradients,
  buttonStyles,
  cardStyles,
  textStyles,
  gradientTextStyle,
  inputStyles,
  tableStyles,
  breakpoints,
  spacing,
  animations,
  getPrimaryGradientStyle,
  getBorderedCardStyle,
  getGradientTextStyle,
};

export default theme;
