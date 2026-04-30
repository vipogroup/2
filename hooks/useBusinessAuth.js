'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

/**
 * CRITICAL SECURITY HOOK - Business Dashboard Authentication
 * 
 * This hook ensures that /business pages NEVER redirect to /admin or other pages.
 * If authentication fails, it shows an error message IN THE SAME PAGE instead of redirecting.
 * 
 * RULES:
 * 1. Never use router.push('/') or router.push('/admin') in business pages
 * 2. Always show error messages in the current page
 * 3. Only redirect to /login with ?redirect= parameter to return to the same business page
 * 
 * @returns {{ authorized: boolean, loading: boolean, error: string | null, user: object | null, tenantId: string | null }}
 */
export function useBusinessAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTenantId = searchParams?.get('tenantId');
  
  const [state, setState] = useState({
    authorized: false,
    loading: true,
    error: null,
    user: null,
    tenantId: null,
  });

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      
      if (!res.ok) {
        // Not logged in - redirect to login with return URL
        // IMPORTANT: Keep in business path!
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      
      const data = await res.json();
      const role = data.user?.role;
      const userTenantId = data.user?.tenantId;
      
      // Business admin - must have tenantId
      if (role === 'business_admin') {
        if (!userTenantId) {
          setState({
            authorized: false,
            loading: false,
            error: 'חשבון העסק שלך לא משויך לעסק. פנה למנהל המערכת.',
            user: data.user,
            tenantId: null,
          });
          return;
        }
        setState({
          authorized: true,
          loading: false,
          error: null,
          user: data.user,
          tenantId: userTenantId,
        });
        return;
      }
      
      // Super admin / admin - can access with URL tenantId or impersonate
      if (role === 'super_admin' || role === 'admin') {
        setState({
          authorized: true,
          loading: false,
          error: null,
          user: data.user,
          tenantId: urlTenantId || userTenantId || null,
        });
        return;
      }
      
      // Other roles - show error, DON'T redirect!
      setState({
        authorized: false,
        loading: false,
        error: 'אין לך הרשאה לגשת לדף זה. נדרשת הרשאת מנהל עסק.',
        user: data.user,
        tenantId: null,
      });
    } catch (err) {
      setState({
        authorized: false,
        loading: false,
        error: 'שגיאה באימות. נסה להתחבר מחדש.',
        user: null,
        tenantId: null,
      });
    }
  }, [router, pathname, urlTenantId]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return state;
}

/**
 * Error component to display when authentication fails
 * Use this instead of redirecting to other pages
 */
export function BusinessAuthError({ error, onBack, onLogin }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">שגיאת הרשאה</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
            >
              חזרה
            </button>
          )}
          {onLogin && (
            <button
              onClick={onLogin}
              className="px-4 py-2 text-white rounded-lg transition-all"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              התחברות מחדש
            </button>
          )}
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
      <div className="animate-spin rounded-full h-12 w-12" style={{
        border: '4px solid rgba(8, 145, 178, 0.2)',
        borderTopColor: '#0891b2',
      }}></div>
    </div>
  );
}

export default useBusinessAuth;
