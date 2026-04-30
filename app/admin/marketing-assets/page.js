import { requireAdmin } from '@/lib/auth/server';
import MarketingAssetsClient from './MarketingAssetsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MarketingAssetsPage() {
  await requireAdmin();
  return <MarketingAssetsClient />;
}
