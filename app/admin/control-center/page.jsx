export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { requireAdmin } from '@/lib/auth/server';
import ControlCenterClient from './ControlCenterClient';

export const metadata = {
  title: 'מרכז בקרה | ניהול',
};

export default async function ControlCenterPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-[#f0f2f5]" dir="rtl">
      <ControlCenterClient />
    </div>
  );
}
