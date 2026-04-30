import { requireAdmin } from '@/lib/auth/server';
import TenantDashboardClient from './TenantDashboardClient';

export const metadata = {
  title: 'דשבורד עסקים | Super Admin',
  description: 'סקירת מכירות ותשלומים לכל העסקים',
};

export default async function TenantDashboardPage() {
  await requireAdmin();
  return <TenantDashboardClient />;
}
