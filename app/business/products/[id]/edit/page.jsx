'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import EditProductForm from '@/app/admin/products/[id]/edit/page';

// This page redirects to the shared edit form but with business context
export default function BusinessEditProductPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.user?.role !== 'business_admin' && data.user?.role !== 'admin' && data.user?.role !== 'super_admin') {
          router.push('/');
          return;
        }
        
        // For super_admin, allow access with tenantId from URL
        const urlTenantId = searchParams.get('tenantId');
        if (data.user?.role === 'super_admin' && urlTenantId) {
          setAuthorized(true);
          return;
        }
        
        // For other roles, require tenantId in session
        if (!data.user?.tenantId) {
          router.push('/login');
          return;
        }
        setAuthorized(true);
      } catch (err) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router, searchParams]);

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

  return <EditProductForm />;
}
