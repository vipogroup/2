'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [hasInstalledPWA, setHasInstalledPWA] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [promptCount, setPromptCount] = useState(0);

  // Check prompt count on mount
  useEffect(() => {
    try {
      const count = parseInt(localStorage.getItem('installPromptCount') || '0', 10);
      setPromptCount(count);
    } catch (e) {
      console.log('localStorage not available');
    }
  }, []);

  // האזנה לאירוע beforeinstallprompt - עם תזמון של 12 שניות
  useEffect(() => {
    let promptTimer = null;
    
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if we've shown the prompt 3 times already
      try {
        const count = parseInt(localStorage.getItem('installPromptCount') || '0', 10);
        if (count >= 3) return; // Don't show after 3 times
      } catch (err) {
        // Continue if localStorage fails
      }
      // הצג את הבאנר רק אחרי 12 שניות
      promptTimer = setTimeout(() => {
        setShowPrompt(true);
        // Increment count when shown
        try {
          const currentCount = parseInt(localStorage.getItem('installPromptCount') || '0', 10);
          localStorage.setItem('installPromptCount', String(currentCount + 1));
          setPromptCount(currentCount + 1);
        } catch (err) {
          // Ignore localStorage errors
        }
      }, 12000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (promptTimer) clearTimeout(promptTimer);
    };
  }, []);

  // בדיקת פלטפורמה ומצב התקנה
  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    const checkInstallation = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone ||
        document.referrer.includes('android-app://');
      setHasInstalledPWA(isStandalone);
      if (isStandalone) setShowPrompt(false);
    };

    checkInstallation();
    window.addEventListener('appinstalled', checkInstallation);
    return () => window.removeEventListener('appinstalled', checkInstallation);
  }, []);

  // הצגת הבאנר ל-iOS - עם תזמון של 12 שניות
  useEffect(() => {
    if (isIOS && !hasInstalledPWA) {
      // Check if we've shown the prompt 3 times already
      try {
        const count = parseInt(localStorage.getItem('installPromptCount') || '0', 10);
        if (count >= 3) return; // Don't show after 3 times
      } catch (err) {
        // Continue if localStorage fails
      }
      const timer = setTimeout(() => {
        setShowPrompt(true);
        // Increment count when shown
        try {
          const currentCount = parseInt(localStorage.getItem('installPromptCount') || '0', 10);
          localStorage.setItem('installPromptCount', String(currentCount + 1));
          setPromptCount(currentCount + 1);
        } catch (err) {
          // Ignore localStorage errors
        }
      }, 12000); // הצג אחרי 12 שניות
      return () => clearTimeout(timer);
    }
  }, [isIOS, hasInstalledPWA]);

  if (!showPrompt || hasInstalledPWA) return null;

  // iOS Guide Modal
  if (showIOSGuide) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
        <div className="bg-white w-full max-w-md rounded-t-3xl p-6 animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Image
                src="/icons/vipo-icon.svg"
                alt="VIPO"
                width={40}
                height={40}
                className="rounded-xl"
              />
              <h2 className="text-xl font-bold text-gray-900">התקנת VIPO</h2>
            </div>
            <button
              onClick={() => {
                setShowIOSGuide(false);
                setShowPrompt(false);
              }}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-2">לחץ על כפתור השיתוף</p>
                <div className="flex items-center gap-2 text-blue-600">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
                  </svg>
                  <span className="text-sm">בתחתית המסך ב-Safari</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4 p-4 bg-cyan-50 rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-2">גלול ומצא</p>
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-medium text-gray-900">הוסף למסך הבית</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center font-bold" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                3
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-2">לחץ על ״הוסף״</p>
                <p className="text-sm text-gray-600">האפליקציה תופיע במסך הבית שלך!</p>
              </div>
            </div>
          </div>

          {/* Bottom button */}
          <button
            onClick={() => {
              setShowIOSGuide(false);
              setShowPrompt(false);
            }}
            className="w-full mt-6 py-4 rounded-xl font-bold text-white text-lg"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
            }}
          >
            הבנתי, תודה!
          </button>
        </div>
      </div>
    );
  }

  // Regular prompt - עיצוב מקורי עם מיקום חדש
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999] px-3 pb-3">
      <div 
        className="bg-white shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{ 
          border: '2px solid transparent', 
          backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', 
          backgroundOrigin: 'border-box', 
          backgroundClip: 'padding-box, border-box', 
          boxShadow: '0 8px 25px rgba(8, 145, 178, 0.25)' 
        }}
      >
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        
        <p className="text-xs text-gray-600 flex-1">
          {isIOS ? 'הוסף את VIPO למסך הבית' : 'התקן את VIPO לגישה מהירה'}
        </p>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {isIOS ? (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="text-white text-xs font-semibold px-4 py-2 rounded-xl"
              style={{ 
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', 
                boxShadow: '0 2px 8px rgba(8, 145, 178, 0.3)' 
              }}
            >
              איך?
            </button>
          ) : (
            <button
              onClick={async () => {
                if (deferredPrompt) {
                  try {
                    await deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                      setShowPrompt(false);
                    }
                  } catch (err) {
                    console.error('Installation failed:', err);
                  } finally {
                    setDeferredPrompt(null);
                  }
                } else {
                  setShowPrompt(false);
                }
              }}
              className="text-white text-xs font-semibold px-4 py-2 rounded-xl"
              style={{ 
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', 
                boxShadow: '0 2px 8px rgba(8, 145, 178, 0.3)' 
              }}
            >
              התקן
            </button>
          )}
          <button
            onClick={() => setShowPrompt(false)}
            className="text-gray-500 hover:text-gray-700 text-xs px-2 py-2"
          >
            לא עכשיו
          </button>
        </div>
      </div>
    </div>
  );
}
