'use client';

import { useCallback, useEffect, useState } from 'react';
import { hasActiveSubscription, subscribeToPush, ensureNotificationPermission } from '@/app/lib/pushClient';
import { fetchAuthUser } from '@/lib/clientAuthCache';

const DISMISSED_KEY = 'vipo_push_banner_dismissed';
const AUTH_CACHE_TTL_MS = 45 * 1000;

export default function PushNotificationBanner({ role = 'customer' }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState(role);

  useEffect(() => {
    async function checkStatus() {
      // Check if user is logged in first
      try {
        const user = await fetchAuthUser({ ttlMs: AUTH_CACHE_TTL_MS });
        if (!user) {
          // User not logged in - don't show banner
          return;
        }
        // Update role from user data
        setUserRole(user.role || 'customer');
      } catch (_) {
        // Not logged in
        return;
      }

      // Don't show if already dismissed recently
      try {
        const dismissed = localStorage.getItem(DISMISSED_KEY);
        if (dismissed) {
          const dismissedDate = new Date(dismissed);
          const now = new Date();
          // Show again after 1 hour
          if (now - dismissedDate < 1 * 60 * 60 * 1000) {
            return;
          }
        }
      } catch (_) {}

      // Check if notifications are supported
      if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
        return;
      }

      // Check if already subscribed
      const subscribed = await hasActiveSubscription();
      if (subscribed) {
        return;
      }

      // Check if permission was denied
      if (Notification.permission === 'denied') {
        return;
      }

      // Show banner
      setShow(true);
    }

    // Delay check to not block initial render
    const timer = setTimeout(checkStatus, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const permission = await ensureNotificationPermission();
      if (!permission.granted) {
        if (permission.reason === 'ios_install_required') {
          setError('יש להתקין את האפליקציה למסך הבית כדי לקבל התראות');
        } else if (permission.reason === 'insecure_context') {
          setError('כדי להפעיל התראות צריך לפתוח את המערכת ב-HTTPS (או localhost).');
        } else if (permission.reason === 'denied') {
          setError('ההרשאה נדחתה. יש לאפשר התראות בהגדרות הדפדפן');
        } else {
          setError('לא ניתן להפעיל התראות במכשיר זה');
        }
        setLoading(false);
        return;
      }

      await subscribeToPush({
        tags: [userRole],
        consentAt: new Date().toISOString(),
        consentVersion: '1.0',
        consentMeta: { source: 'banner', role: userRole },
      });

      setShow(false);
    } catch (err) {
      console.error('Push subscription failed:', err);
      setError('שגיאה בהפעלת התראות. נסה שוב');
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, new Date().toISOString());
    } catch (_) {}
    setShow(false);
  }, []);

  if (!show) return null;

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl p-4 shadow-lg"
      style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white mb-1">קבל התראות על מוצרים חדשים</h3>
          <p className="text-xs text-white/80 mb-3">
            הפעל התראות כדי לקבל עדכונים על מוצרים חדשים, מבצעים והודעות חשובות
          </p>
          
          {error && (
            <p className="text-xs text-red-200 mb-2">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="flex-1 bg-white text-blue-800 text-xs font-semibold py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-70"
            >
              {loading ? 'מפעיל...' : 'הפעל התראות'}
            </button>
            <button
              onClick={handleDismiss}
              className="text-white/70 text-xs py-2 px-3 hover:text-white transition-colors"
            >
              לא עכשיו
            </button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-white/50 hover:text-white transition-colors"
          aria-label="סגור"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
