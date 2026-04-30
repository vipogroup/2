import { requireAdmin } from '@/lib/auth/server';
import TenantsClient from './TenantsClient';

export const metadata = {
  title: 'ניהול עסקים | Admin',
  description: 'ניהול עסקים במערכת Multi-Tenant',
};

export default async function TenantsPage() {
  await requireAdmin();
  return <TenantsClient />;
}
