'use client';
import { useEffect, useState } from 'react';

export default function UpdateNotifier() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // בדיקת Service Worker קיים
    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);

      // בדיקה אם יש עדכון ממתין
      if (reg.waiting) {
        setShowUpdateBanner(true);
      }

      // האזנה לעדכונים חדשים
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // יש גרסה חדשה זמינה
              setShowUpdateBanner(true);
            }
          });
        }
      });
    });

    // האזנה להודעות מ-Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NEW_VERSION_ACTIVATED') {
        // גרסה חדשה הופעלה - רענן את הדף
        window.location.reload();
      }
    });

    // בדיקת עדכונים כל דקה
    const interval = setInterval(() => {
      navigator.serviceWorker.ready.then((reg) => {
        reg.update();
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      // שלח הודעה ל-Service Worker להפעיל את הגרסה החדשה
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setShowUpdateBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdateBanner(false);
  };

  if (!showUpdateBanner) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
      style={{
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <div
        className="rounded-lg shadow-2xl p-4 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">עדכון חדש זמין!</p>
          <p className="text-white/80 text-xs mt-1">גרסה חדשה של המערכת מוכנה להתקנה</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleUpdate}
            className="px-4 py-2 bg-white text-blue-900 rounded-md text-sm font-bold hover:bg-blue-50 transition-colors shadow-lg"
          >
            עדכן עכשיו
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translate(-50%, 100px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
