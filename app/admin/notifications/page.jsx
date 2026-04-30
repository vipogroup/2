export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import dynamicImport from 'next/dynamic';

import { requireAdmin } from '@/lib/auth/server';

const NotificationsManagerClient = dynamicImport(() => import('./NotificationsManagerClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="bg-white rounded-xl p-8 shadow-lg">
        <div className="animate-spin rounded-full h-16 w-16 mx-auto mb-4 border-4 border-gray-200 border-t-[#0891b2]" />
        <p className="text-gray-600 text-center font-medium">טוען ממשק התראות...</p>
      </div>
    </div>
  ),
});

export default async function AdminNotificationsPage() {
  await requireAdmin();
  return <NotificationsManagerClient />;
}
