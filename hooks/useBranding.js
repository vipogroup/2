'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

/**
 * Branding Context - קונטקסט לצבעים דינמיים
 */
const BrandingContext = createContext(null);

// ברירות מחדל
const DEFAULT_BRANDING = {
  colors: {
    primary: '#1e3a8a',
    secondary: '#0891b2',
    accent: '#6366f1',
  },
  statusColors: {
    success: '#16a34a',
    warning: '#f59e0b',
    error: '#dc2626',
    info: '#3b82f6',
  },
  logo: {
    url: null,
    urlLight: null,
    maxWidth: 150,
  },
  gradient: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
};

/**
 * BrandingProvider - Provider לצבעים דינמיים
 */
export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // טעינת הגדרות
  const loadBranding = useCallback(async () => {
    try {
      setLoading(true);
      
      // נסה לטעון מה-API
      const res = await fetch('/api/branding');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setBranding({
            colors: data.settings.colors || DEFAULT_BRANDING.colors,
            statusColors: data.settings.statusColors || DEFAULT_BRANDING.statusColors,
            logo: data.settings.logo || DEFAULT_BRANDING.logo,
            gradient: data.settings.gradient || DEFAULT_BRANDING.gradient,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load branding:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranding();
  }, [loadBranding]);

  // פונקציה לרענון
  const refresh = useCallback(() => {
    loadBranding();
  }, [loadBranding]);

  const value = {
    ...branding,
    loading,
    error,
    refresh,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

/**
 * useBranding Hook - שימוש בצבעים דינמיים
 * 
 * שימוש:
 * const { colors, gradient, logo } = useBranding();
 */
export function useBranding() {
  const context = useContext(BrandingContext);
  
  // אם אין Provider, החזר ברירות מחדל
  if (!context) {
    return DEFAULT_BRANDING;
  }
  
  return context;
}

/**
 * פונקציות עזר לקבלת סגנונות
 */

// קבלת סגנון גרדיאנט
export function getGradientStyle(branding) {
  const colors = branding?.colors || DEFAULT_BRANDING.colors;
  return {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
  };
}

// קבלת סגנון טקסט גרדיאנט
export function getGradientTextStyle(branding) {
  const colors = branding?.colors || DEFAULT_BRANDING.colors;
  return {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };
}

// קבלת סגנון מסגרת גרדיאנט
export function getBorderedStyle(branding) {
  const colors = branding?.colors || DEFAULT_BRANDING.colors;
  const gradient = `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`;
  return {
    border: '2px solid transparent',
    backgroundImage: `linear-gradient(white, white), ${gradient}`,
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, border-box',
  };
}

// קבלת צבע לפי סטטוס
export function getStatusColor(status, branding) {
  const statusColors = branding?.statusColors || DEFAULT_BRANDING.statusColors;
  return statusColors[status] || statusColors.info;
}

export default useBranding;
