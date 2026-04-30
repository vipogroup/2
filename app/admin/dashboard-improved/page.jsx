import { requireAdmin } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export default async function LegacyAdminDashboardRedirect() {
  await requireAdmin();

  redirect('/admin');
}
