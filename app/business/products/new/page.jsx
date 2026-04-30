'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NewProductForm from '@/app/admin/products/new/page';
import PageTextEditor from '@/components/PageTextEditor';

export default function BusinessNewProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTenantId = searchParams.get('tenantId');
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          // IMPORTANT: Stay in /business path, redirect to business login
          router.replace('/login?redirect=/business/products/new');
          return;
        }
        const data = await res.json();
        const role = data.user?.role;
        const userTenantId = data.user?.tenantId;
        
        // Business admin must have tenantId
        if (role === 'business_admin') {
          if (!userTenantId) {
            setAuthError('חשבון העסק שלך לא משויך לעסק. פנה למנהל המערכת.');
            return;
          }
          setAuthorized(true);
          return;
        }
        
        // Super admin can access with tenantId from URL
        if (role === 'super_admin' || role === 'admin') {
          setAuthorized(true);
          return;
        }
        
        // Other roles - show error, DON'T redirect to other pages!
        setAuthError('אין לך הרשאה לגשת לדף זה. נדרשת הרשאת מנהל עסק.');
      } catch (err) {
        setAuthError('שגיאה באימות. נסה להתחבר מחדש.');
      }
    }
    checkAuth();
  }, [router, urlTenantId]);

  // Show error message instead of redirecting to other pages
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">שגיאת הרשאה</h2>
          <p className="text-gray-600 mb-6">{authError}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
            >
              חזרה
            </button>
            <button
              onClick={() => router.push('/login?redirect=/business/products/new')}
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

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12" style={{
          border: '4px solid rgba(8, 145, 178, 0.2)',
          borderTopColor: '#0891b2',
        }}></div>
      </div>
    );
  }

  return (
    <PageTextEditor pageKey="products-new">
      <NewProductForm />
    </PageTextEditor>
  );
}
