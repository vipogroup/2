'use client';

import { useBusinessContext, BusinessError, BusinessLoading } from '../BusinessContext';
import ProductsClient from '@/app/admin/products/ProductsClient';

/**
 * Business Products Page
 * 
 * Uses BusinessContext to get tenantId and passes it to ProductsClient.
 * This ensures products are filtered by the business's tenant.
 */
export default function BusinessProductsPage() {
  const { loading, error, tenantId, refresh } = useBusinessContext();

  if (loading) {
    return <BusinessLoading />;
  }

  if (error) {
    return <BusinessError error={error} onRetry={refresh} />;
  }

  // Pass tenantId to ProductsClient for filtering
  return <ProductsClient tenantId={tenantId} />;
}
