import { redirect } from 'next/navigation';
import { getUserFromCookies } from '@/lib/auth/server';
import BusinessClientLayout from './BusinessClientLayout';

const ALLOWED_BUSINESS_ROLES = new Set(['business_admin', 'admin', 'super_admin']);

export default async function BusinessLayout({ children }) {
  const user = await getUserFromCookies();

  if (!user?.id) {
    redirect('/login');
  }

  if (!ALLOWED_BUSINESS_ROLES.has(user.role)) {
    redirect('/');
  }

  if (user.role === 'business_admin' && !user.tenantId) {
    redirect('/');
  }

  return <BusinessClientLayout>{children}</BusinessClientLayout>;
}
