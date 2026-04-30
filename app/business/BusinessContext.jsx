'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

/**
 * CRITICAL: Business Context Provider
 * 
 * This context ensures that ALL /business pages:
 * 1. Have access to the current tenant information
 * 2. NEVER redirect to /admin pages
 * 3. Show proper error messages when something is wrong
 */

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTenantId = searchParams.get('tenantId');
  
  const [state, setState] = useState({
    user: null,
    tenant: null,
    tenantId: null,
    tenantSlug: null,
    tenantName: null,
    role: null,
    loading: true,
    error: null,
  });

  const loadBusinessContext = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      
      if (!res.ok) {
        // Not logged in - redirect to login with return URL
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      
      const data = await res.json();
      const user = data.user;
      const role = user?.role;
      const userTenantId = user?.tenantId;
      
      // Business admin must have tenantId
      if (role === 'business_admin') {
        if (!userTenantId) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'חשבון העסק שלך לא משויך לעסק. פנה למנהל המערכת.',
          }));
          return;
        }
        
        // Fetch tenant details
        try {
          const tenantRes = await fetch(`/api/tenants/${userTenantId}`, { credentials: 'include', cache: 'no-store' });
          if (tenantRes.ok) {
            const tenantData = await tenantRes.json();
            const tenant = tenantData?.tenant || null;
            setState({
              user,
              tenant,
              tenantId: userTenantId,
              tenantSlug: tenant?.slug || null,
              tenantName: tenant?.businessName || tenant?.name || null,
              role,
              loading: false,
              error: null,
            });
            return;
          }
        } catch {
          // Continue with basic info
        }
        
        setState({
          user,
          tenant: null,
          tenantId: userTenantId,
          tenantSlug: null,
          tenantName: null,
          role,
          loading: false,
          error: null,
        });
        return;
      }
      
      // Super admin / admin - can access all businesses
      if (role === 'super_admin' || role === 'admin') {
        // Use tenantId from URL if available (when admin is viewing a specific tenant)
        const effectiveTenantId = urlTenantId || userTenantId || null;
        
        // If we have a tenantId from URL, fetch the tenant details
        if (effectiveTenantId) {
          try {
            const tenantRes = await fetch(`/api/tenants/${effectiveTenantId}`, { credentials: 'include', cache: 'no-store' });
            if (tenantRes.ok) {
              const tenantData = await tenantRes.json();
              const tenant = tenantData?.tenant || null;
              setState({
                user,
                tenant,
                tenantId: effectiveTenantId,
                tenantSlug: tenant?.slug || null,
                tenantName: tenant?.businessName || tenant?.name || null,
                role,
                loading: false,
                error: null,
              });
              return;
            }
          } catch {
            // Continue with basic info
          }
        }
        
        setState({
          user,
          tenant: null,
          tenantId: effectiveTenantId,
          tenantSlug: null,
          tenantName: role === 'super_admin' ? 'מנהל ראשי' : 'מנהל',
          role,
          loading: false,
          error: null,
        });
        return;
      }
      
      // Other roles - show error, DON'T redirect!
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'אין לך הרשאה לגשת לאזור זה. נדרשת הרשאת מנהל עסק.',
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'שגיאה בטעינת נתוני העסק. נסה לרענן את הדף.',
      }));
    }
  }, [router, pathname, urlTenantId]);

  useEffect(() => {
    loadBusinessContext();
  }, [loadBusinessContext]);

  // Refresh function for manual refresh
  const refresh = useCallback(() => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    loadBusinessContext();
  }, [loadBusinessContext]);

  return (
    <BusinessContext.Provider value={{ ...state, refresh }}>
      {children}
    </BusinessContext.Provider>
  );
}

/**
 * Hook to access business context
 * ALWAYS use this in /business pages to get tenant info
 */
export function useBusinessContext() {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusinessContext must be used within a BusinessProvider');
  }
  return context;
}

/**
 * Error component for business pages
 * Use this instead of redirecting to other pages
 */
export function BusinessError({ error, onRetry }) {
  const router = useRouter();
  const pathname = usePathname();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">שגיאה</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
          >
            חזרה
          </button>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all"
            >
              נסה שוב
            </button>
          )}
          <button
            onClick={() => router.push(`/login?redirect=${encodeURIComponent(pathname)}`)}
            className="px-4 py-2 text-white rounded-lg transition-all"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            התחברות מחדש
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading component for business pages
 */
export function BusinessLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 mx-auto" style={{
          border: '4px solid rgba(8, 145, 178, 0.2)',
          borderTopColor: '#0891b2',
        }}></div>
        <p className="mt-4 text-gray-600">טוען...</p>
      </div>
    </div>
  );
}

export default BusinessContext;
