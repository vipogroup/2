'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import {
  ATTRIBUTION_CONSENT_EVENT,
  captureAttributionFromSearchParams,
} from '@/lib/attributionClient';

/**
 * Site-wide UTM / gclid / fbclid capture (first-touch + last-touch).
 * Keeps parity with enterprise analytics: params need not appear on checkout URL.
 */
function AttributionCaptureInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureAttributionFromSearchParams(searchParams);
  }, [pathname, searchParams]);

  useEffect(() => {
    const onConsent = () => {
      if (typeof window === 'undefined') return;
      captureAttributionFromSearchParams(new URLSearchParams(window.location.search));
    };
    window.addEventListener(ATTRIBUTION_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(ATTRIBUTION_CONSENT_EVENT, onConsent);
  }, []);

  return null;
}

export default function AttributionCapture() {
  return (
    <Suspense fallback={null}>
      <AttributionCaptureInner />
    </Suspense>
  );
}
