'use client';

import { useEffect } from 'react';

const THIRTY_DAYS = 30 * 24 * 60 * 60;

export default function ReferralCookieSetter({ couponCode, tenantId }) {
  useEffect(() => {
    if (!couponCode || typeof document === 'undefined') {
      return;
    }

    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const commonAttributes = `path=/; max-age=${THIRTY_DAYS}; SameSite=Lax${isSecure ? '; Secure' : ''}`;

    try {
      document.cookie = `refSource=${encodeURIComponent(couponCode)}; ${commonAttributes}`;
      document.cookie = `autoCoupon=${encodeURIComponent(couponCode)}; ${commonAttributes}`;
      
      // Multi-Tenant: Set tenant cookie for product filtering
      if (tenantId) {
        document.cookie = `refTenant=${encodeURIComponent(tenantId)}; ${commonAttributes}`;
        localStorage.setItem('refTenantId', tenantId);
      }
    } catch (err) {
      console.error('[ReferralCookieSetter] Failed to set referral cookies', err);
    }
  }, [couponCode, tenantId]);

  return null;
}
