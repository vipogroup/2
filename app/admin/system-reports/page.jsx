export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { requireAdmin } from '@/lib/auth/server';
import SystemReportsClient from './SystemReportsClient';

export const metadata = {
  title: 'דוחות מערכת | ניהול',
};

export default async function SystemReportsPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <SystemReportsClient />
      </div>
    </div>
  );
}
