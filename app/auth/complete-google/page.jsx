'use client';

import { useEffect, useState } from 'react';

/**
 * Page that completes Google OAuth registration
 * Reads phone from localStorage and sends to server
 * Processes referral attribution
 */
export default function CompleteGooglePage() {
  const [error, setError] = useState(null);

  useEffect(() => {
    async function completeRegistration() {
      try {
        // Read phone, name and tenant from localStorage
        let phone = null;
        let fullName = null;
        let tenantSlug = null;
        try {
          phone = localStorage.getItem('pendingGooglePhone');
          fullName = localStorage.getItem('pendingGoogleName');
          tenantSlug = localStorage.getItem('pendingGoogleTenant');
        } catch (e) {
          console.log('localStorage not available');
        }

        // Send to server to complete registration
        const res = await fetch('/api/auth/complete-google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, fullName, tenantSlug }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.error('Complete Google error:', data);
          // If not authenticated, redirect to login
          if (data.error === 'not_authenticated') {
            window.location.href = '/login';
            return;
          }
        }

        // Clear localStorage
        try {
          localStorage.removeItem('pendingGooglePhone');
          localStorage.removeItem('pendingGoogleName');
          localStorage.removeItem('pendingGoogleRole');
          localStorage.removeItem('pendingGoogleTenant');
        } catch (e) {
          console.log('localStorage not available');
        }

        // Redirect to tenant store or home page
        if (tenantSlug) {
          window.location.href = `/t/${tenantSlug}`;
        } else {
          window.location.href = '/';
        }
      } catch (e) {
        console.error('Complete Google error:', e);
        setError('שגיאה בהשלמת ההרשמה');
        // Still redirect after error
        setTimeout(() => { window.location.href = '/'; }, 2000);
      }
    }

    completeRegistration();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        {error ? (
          <div className="text-red-600 mb-4">{error}</div>
        ) : (
          <>
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">משלים את ההרשמה...</p>
          </>
        )}
      </div>
    </main>
  );
}
