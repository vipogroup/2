'use client';

import { Suspense } from 'react';
import SocialAuditClient from './SocialAuditClient';

export default function SocialAuditPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    }>
      <SocialAuditClient />
    </Suspense>
  );
}
