'use client';

import { useCallback, useEffect, useState } from 'react';
import { hasActiveSubscription, subscribeToPush, ensureNotificationPermission } from '@/app/lib/pushClient';
import { fetchAuthUser } from '@/lib/clientAuthCache';

const AUTH_CACHE_TTL_MS = 45 * 1000;

function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return window.navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)')?.matches;
}

export default function PushNotificationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('customer');
  const [step, setStep] = useState('ask'); // 'ask', 'success', 'error'

  useEffect(() => {
    async function checkAndShow() {
      console.log('PUSH_MODAL: Starting check...');

      const hostname = window.location?.hostname || '';
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
      if (!window.isSecureContext && !isLocalhost) {
        return;
      }
      
      // Wait for service worker to be ready
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.ready;
          console.log('PUSH_MODAL: Service worker is ready');
        } catch (swErr) {
          console.log('PUSH_MODAL: Service worker not ready', swErr);
        }
      }
      
      // Check if user is logged in
      try {
        const user = await fetchAuthUser({ ttlMs: AUTH_CACHE_TTL_MS });
        if (!user) {
          console.log('PUSH_MODAL: User not logged in');
          return;
        }
        
        // Don't show for admin
        if (user.role === 'admin') {
          console.log('PUSH_MODAL: User is admin, skipping');
          return;
        }

        const ios = isIOSDevice();
        const standalone = isStandaloneMode();
        if (ios && !standalone) {
          console.log('PUSH_MODAL: iOS not standalone, skipping enforcement');
          return;
        }

        setUserRole(user.role || 'customer');

        // Check if notifications are supported
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
          console.log('PUSH_MODAL: Notifications not supported');
          setError('הדפדפן או המכשיר אינם תומכים בהתראות דחיפה.');
          setStep('error');
          setIsOpen(true);
          return;
        }

        // Check if already subscribed
        const subscribed = await hasActiveSubscription();
        console.log('PUSH_MODAL: Already subscribed?', subscribed);
        if (subscribed) return;

        // Check if permission was denied before
        if (Notification.permission === 'denied') {
          console.log('PUSH_MODAL: Permission denied');
          setError('ההרשאה להתראות נחסמה. יש לאפשר התראות בהגדרות הדפדפן כדי להמשיך.');
          setStep('error');
          setIsOpen(true);
          return;
        }

        console.log('PUSH_MODAL: Showing modal now (mandatory)');
        setIsOpen(true);
      } catch (err) {
        console.error('PUSH_MODAL: Error in checkAndShow', err);
      }
    }

    checkAndShow();
  }, []);

  const handleEnable = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const permission = await ensureNotificationPermission();
      
      if (!permission.granted) {
        if (permission.reason === 'ios_install_required') {
          setError('ב-iPhone יש להוסיף את האתר למסך הבית תחילה');
        } else if (permission.reason === 'insecure_context') {
          setError('כדי להפעיל התראות צריך לפתוח את המערכת ב-HTTPS (או localhost).');
        } else if (permission.reason === 'denied') {
          setError('ההרשאה נדחתה. ניתן לשנות בהגדרות הדפדפן');
        } else {
          setError('לא ניתן להפעיל התראות במכשיר זה');
        }
        setStep('error');
        setLoading(false);
        return;
      }

      await subscribeToPush({
        tags: [userRole],
        consentAt: new Date().toISOString(),
        consentVersion: '1.0',
        consentMeta: { source: 'login_modal', role: userRole },
      });

      // Dispatch event to sync with PushNotificationsToggle
      window.dispatchEvent(new CustomEvent('push-subscription-changed', { detail: { subscribed: true } }));

      setStep('success');
      
      // Auto close after success - short delay to show success message
      setTimeout(() => setIsOpen(false), 1500);
    } catch (err) {
      console.error('Push subscription failed:', err);
      setError('שגיאה בהפעלת התראות');
      setStep('error');
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div
        className="bg-white shadow-2xl rounded-2xl px-6 py-6 w-full max-w-sm"
        style={{
          border: '2px solid transparent',
          backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: '0 12px 30px rgba(8, 145, 178, 0.25)',
        }}
      >
        {step === 'ask' && (
          <>
            <div className="text-center mb-5">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
              >
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <h2
                className="text-lg font-bold mb-2"
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                הפעלת התראות
              </h2>
              <p className="text-sm text-gray-600">כדי להמשיך להשתמש במערכת יש לאשר התראות.</p>
            </div>

            <button
              onClick={handleEnable}
              disabled={loading}
              className="w-full text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {loading ? 'מפעיל...' : 'אפשר התראות'}
            </button>
          </>
        )}

        {step === 'success' && (
          <>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-emerald-100">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-700">ההתראות הופעלו בהצלחה.</p>
            </div>
          </>
        )}

        {step === 'error' && (
          <>
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-100">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                </svg>
              </div>
              <p className="text-sm text-red-600">{error}</p>
            </div>

            <button
              onClick={() => {
                setStep('ask');
                setError('');
              }}
              className="w-full text-white font-semibold py-3 rounded-xl transition-all"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              נסה שוב
            </button>
          </>
        )}
      </div>
    </div>
  );
}
