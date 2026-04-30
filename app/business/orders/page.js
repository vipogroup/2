'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OrdersList from '@/app/components/admin/OrdersList';

export default function BusinessOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTenantId = searchParams.get('tenantId');
  const [authorized, setAuthorized] = useState(false);
  const [effectiveTenantId, setEffectiveTenantId] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        const role = data.user?.role;
        const userTenantId = data.user?.tenantId;
        
        // Check role
        if (role !== 'business_admin' && role !== 'admin' && role !== 'super_admin') {
          router.push('/');
          return;
        }
        
        // Super admin can use tenantId from URL
        if (role === 'super_admin' || role === 'admin') {
          if (urlTenantId) {
            setEffectiveTenantId(urlTenantId);
            setAuthorized(true);
            return;
          }
          // Super admin without tenantId in URL - still allow access to see all orders
          setAuthorized(true);
          return;
        }
        
        // Business admin must have tenantId
        if (!userTenantId) {
          router.push('/login');
          return;
        }
        
        setEffectiveTenantId(userTenantId);
        setAuthorized(true);
      } catch (err) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router, urlTenantId]);

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
    <div className="min-h-screen bg-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl sm:text-3xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ניהול הזמנות
          </h1>
          <Link
            href="/business"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            חזרה
          </Link>
        </div>
        <OrdersList tenantId={effectiveTenantId} />
      </div>
    </div>
  );
}
