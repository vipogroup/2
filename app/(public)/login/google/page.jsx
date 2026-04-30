'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

/**
 * Google Sign-in intermediate page
 * Collects name and phone before redirecting to Google OAuth
 * Updated: 2024-12-29
 */
function GoogleLoginPageContent() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Phone validation
  const isPhoneValid = (p) => p.replace(/\D/g, '').length >= 9;

  // Save referral to cookie before OAuth redirect
  const saveReferralToCookie = () => {
    const ref = searchParams.get('ref');
    if (ref) {
      document.cookie = `refSource=${ref}; path=/; max-age=86400`;
    }
  };

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    setErr('');
    setPhoneError('');

    if (!fullName.trim()) {
      setErr('יש להזין שם מלא');
      return;
    }
    
    if (!phone || !isPhoneValid(phone)) {
      setPhoneError('יש להזין מספר טלפון תקין');
      document.getElementById('phone')?.focus();
      return;
    }

    if (!acceptTerms) {
      setErr('יש לאשר את תנאי השימוש');
      return;
    }

    setLoading(true);
    
    // Save data to localStorage for after OAuth
    try {
      localStorage.setItem('pendingGooglePhone', phone);
      localStorage.setItem('pendingGoogleName', fullName.trim());
    } catch (e) {
      console.log('localStorage not available');
    }

    // Save referral cookie
    saveReferralToCookie();

    try {
      await signIn('google', { callbackUrl: '/auth/complete-google' });
    } catch (e) {
      setErr('שגיאה בהתחברות עם Google');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4 py-8">
      <div className="w-full max-w-md">
        <div
          className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8"
          style={{
            border: '2px solid transparent',
            backgroundImage:
              'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h1
              className="text-2xl sm:text-3xl font-bold mb-2"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              התחברות עם Google
            </h1>
            <p className="text-gray-500 text-sm">מלא את הפרטים הבאים להשלמת ההתחברות</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                שם מלא
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="ישראל ישראלי"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 transition-all disabled:bg-gray-100"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                טלפון
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="053-375-2633"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-cyan-500 transition-all disabled:bg-gray-100 ${phoneError ? 'border-red-500' : 'border-gray-300'}`}
              />
              {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3">
              <input
                id="terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="h-4 w-4 mt-1 rounded border-gray-300"
                style={{ accentColor: '#0891b2' }}
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                מסכים/ה ל
                <a href="/terms" className="text-cyan-600 hover:underline mx-1">תנאי השימוש</a>
                ול
                <a href="/privacy" className="text-cyan-600 hover:underline mx-1">מדיניות הפרטיות</a>
              </label>
            </div>

            {/* Error */}
            {err && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {err}
              </div>
            )}

            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 font-medium py-3 px-6 rounded-lg transition-all hover:bg-gray-50 disabled:opacity-50"
              style={{
                border: '2px solid transparent',
                backgroundImage:
                  'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
              }}
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                  מתחבר...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  המשך עם Google
                </>
              )}
            </button>

            {/* Back Link */}
            <p className="text-center text-sm text-gray-600 mt-4">
              <a href="/login" className="font-semibold text-cyan-600 hover:text-cyan-700">
                ← חזרה להתחברות
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function GoogleLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    }>
      <GoogleLoginPageContent />
    </Suspense>
  );
}
