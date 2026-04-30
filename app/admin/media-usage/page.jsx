export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/server';
import { isSuperAdminUser } from '@/lib/superAdmins';
import MediaUsageClient from './MediaUsageClient';

export const metadata = {
  title: 'שימוש מדיה | ניהול',
};

export default async function MediaUsagePage() {
  const user = await requireAdmin();
  if (!isSuperAdminUser(user)) {
    redirect('/admin');
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]" dir="rtl">
      <div className="p-2 sm:p-4">
        <div className="max-w-7xl mx-auto">
          <MediaUsageClient />
        </div>
      </div>
    </div>
  );
}
