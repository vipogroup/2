'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const NotificationsManagerClient = dynamic(
  () => import('@/app/admin/notifications/NotificationsManagerClient'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 mx-auto mb-4 border-4 border-gray-200 border-t-[#0891b2]" />
          <p className="text-gray-600 text-center font-medium">טוען ממשק התראות...</p>
        </div>
      </div>
    ),
  }
);

export default function BusinessNotificationsPage() {
  const router = useRouter();
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
  }, [router]);

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

  return <NotificationsManagerClient />;
}
