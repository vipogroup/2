'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { isPathAllowed } from '@/lib/businessMenuConfig';
import { BusinessProvider, BusinessLoading, BusinessError, useBusinessContext } from './BusinessContext';

function BusinessPermissionGate({ children }) {
  const pathname = usePathname();
  const { role, loading, tenant, refresh } = useBusinessContext();

  if (loading) return <BusinessLoading />;
  if (role !== 'business_admin') return children;
  if (!tenant) return <BusinessError error="שגיאה בטעינת הרשאות העסק. נסה לרענן את הדף." onRetry={refresh} />;

  const allowedMenus = tenant?.allowedMenus;
  const allowedMenusConfigured = tenant?.allowedMenusConfigured;
  if (!isPathAllowed(pathname, allowedMenus, allowedMenusConfigured)) {
    return <BusinessError error="אין לך הרשאה לצפות בדף זה." onRetry={refresh} />;
  }

  return children;
}

export default function BusinessClientLayout({ children }) {
  return (
    <Suspense fallback={<BusinessLoading />}>
      <BusinessProvider>
        <BusinessPermissionGate>{children}</BusinessPermissionGate>
      </BusinessProvider>
    </Suspense>
  );
}
