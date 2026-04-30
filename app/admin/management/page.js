export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
import { requireAdmin } from '@/lib/auth/server';
import ManagementClient from './ManagementClient';

export default async function ManagementPage() {
  await requireAdmin();

  return <ManagementClient />;
}
