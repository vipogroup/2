export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import CatalogSalesClient from './CatalogSalesClient';

export default function CatalogPage() {
  return <CatalogSalesClient />;
}
