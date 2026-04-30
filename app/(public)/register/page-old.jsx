'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { api } from '../../../lib/http';
import {
  markConsentAccepted,
  markConsentDeclined,
  PUSH_CONSENT_VERSION,
} from '@/app/lib/pushConsent';

function RegisterPageContent() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [wantsPush, setWantsPush] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGoogleMode = searchParams.get('google') === '1';

  // Email verification state
  const [emailStep, setEmailStep] = useState('email'); // 'email' | 'verify' | 'complete'
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Validate phone number (at least 9 digits)
  const isPhoneValid = (phoneValue) => {
    const digitsOnly = phoneValue.replace(/\D/g, '');
    return digitsOnly.length >= 9;
  };

  // Validate password (8+ chars, 1 number, 1 letter)
  const isPasswordValid = (pwd) => {
    if (pwd.length < 8) return false;
    if (!/\d/.test(pwd)) return false; // at least one number
    if (!/[a-zA-Zא-ת]/.test(pwd)) return false; // at least one letter
    return true;
  };

  // Handle Google sign-in (requires phone and terms first)
  const handleGoogleSignIn = async () => {
    setPhoneError('');
    setErr('');
    
    if (!phone || !isPhoneValid(phone)) {
      setPhoneError('יש להזין מספר טלפון תקין');
      document.getElementById('phone')?.focus();
      return;
    }

    if (!acceptTerms) {
      setErr('יש לאשר את תנאי השימוש ומדיניות הפרטיות');
      return;
    }

    setGoogleLoading(true);
    
    // Save phone and role to localStorage so we can use it after Google OAuth
    try {
      localStorage.setItem('pendingGooglePhone', phone);
      localStorage.setItem('pendingGoogleRole', role);
    } catch (e) {
      console.log('localStorage not available');
    }

    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (e) {
      console.error('[REGISTER] Google sign-in error:', e);
      setErr('שגיאה בהתחברות עם Google');
      setGoogleLoading(false);
    }
  };

  async function handleSendEmailCode() {
    if (!email || !email.includes('@')) {
      setVerifyError('אנא הזן כתובת אימייל תקינה');
      return;
    }
    setVerifyLoading(true);
    setVerifyError('');
    try {
      const res = await fetch('/api/auth/send-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'שליחת הקוד נכשלה');
      }
      setEmailStep('verify');
      setCountdown(60);
    } catch (e) {
      setVerifyError(e.message || 'שגיאה בשליחת קוד');
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleVerifyEmailCode() {
    if (!verifyCode || verifyCode.length < 4) {
      setVerifyError('אנא הזן קוד תקין');
      return;
    }
    setVerifyLoading(true);
    setVerifyError('');
    try {
      const res = await fetch('/api/auth/verify-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'קוד שגוי. נסה שוב.');
      }
      setEmailVerified(true);
      setEmailStep('complete');
    } catch (e) {
      setVerifyError(e.message || 'אימות נכשל');
    } finally {
      setVerifyLoading(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setMsg('');

    // Check email verification
    if (!emailVerified) {
      setErr('אנא אמת את כתובת האימייל לפני ההרשמה');
      return;
    }

    // Check terms acceptance
    if (!acceptTerms) {
      setErr('יש לאשר את תנאי השימוש ומדיניות הפרטיות');
      return;
    }

    // Check password strength
    if (!isPasswordValid(password)) {
      setErr('הסיסמה חייבת לכלול לפחות 8 תווים, מספר אחד ואות אחת');
      return;
    }

    setLoading(true);

    // Get referrerId from localStorage (fallback if cookie didn't work)
    let referrerId = null;
    try {
      referrerId = localStorage.getItem('referrerId');
    } catch (err) {
      console.log('localStorage not available');
    }

    // Register
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        phone,
        email,
        password,
        role,
        referrerId,
        wantsPushNotifications: wantsPush,
      }),
    });

    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j?.ok) {
      // Better error messages
      let errorMsg = j?.message || j?.error || 'הרשמה נכשלה';
      if (j?.error === 'phone exists') {
        errorMsg = 'מספר הטלפון הזה כבר רשום במערכת. נסה להתחבר במקום.';
      } else if (j?.error === 'email exists') {
        errorMsg = 'כתובת האימייל הזו כבר רשומה במערכת. נסה להתחבר במקום.';
      } else if (j?.error === 'user exists') {
        errorMsg = 'משתמש עם האימייל או הטלפון הזה כבר קיים. נסה להתחבר במקום.';
      } else if (j?.error === 'missing fields') {
        errorMsg = 'חסרים שדות חובה. אנא מלא את כל השדות המסומנים בכוכבית.';
      } else if (j?.error === 'phone required') {
        errorMsg = 'נדרש מספר טלפון להרשמה.';
      } else if (j?.error === 'email required') {
        errorMsg = 'נדרשת כתובת אימייל להרשמה.';
      } else if (j?.error === 'invalid role') {
        errorMsg = 'סוג משתמש לא תקין.';
      } else if (j?.error === 'TOO_MANY_REQUESTS') {
        errorMsg = 'יותר מדי ניסיונות. נסה שוב מאוחר יותר.';
      }
      setErr(errorMsg);
      setLoading(false);
      return;
    }

    const consentAt = new Date().toISOString();
    try {
      if (wantsPush) {
        markConsentAccepted({
          role,
          version: PUSH_CONSENT_VERSION,
          meta: { source: 'register', consentAt },
        });
      } else {
        markConsentDeclined({
          role,
          version: PUSH_CONSENT_VERSION,
          reason: 'register_opt_out',
        });
      }
    } catch (consentError) {
      console.warn('register_push_consent_error', consentError);
    }

    // Auto-login for customers
    if (role === 'customer') {
      setMsg('נרשמת בהצלחה! מתחבר...');

      const identifier = email || phone;
      const loginRes = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });

      if (loginRes.ok) {
        setTimeout(() => router.push('/customer'), 500);
      } else {
        setMsg('נרשמת בהצלחה, אבל ההתחברות נכשלה. מעביר לעמוד כניסה...');
        setTimeout(() => router.push('/login'), 1500);
      }
    } else {
      // Admin/Agent - manual login required
      setMsg('נרשמת בהצלחה! המתן לאישור מנהל ולאחר מכן התחבר.');
      setTimeout(() => router.push('/login'), 2000);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        {/* Card */}
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
          <div className="text-center mb-6 sm:mb-8">
            <h1
              className="text-2xl sm:text-3xl font-bold mb-2"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              הצטרף אלינו
            </h1>
            <p className="text-gray-600">צור חשבון חדש והתחל למכור</p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                שם מלא <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="ישראל ישראלי"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                aria-describedby="fullName-help"
              />
              <p id="fullName-help" className="text-xs text-gray-500 mt-1">
                השם המלא שלך כפי שיופיע במערכת
              </p>
            </div>

            {/* Email with Verification */}
            <div className="space-y-3">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                כתובת אימייל <span className="text-red-500">*</span>
              </label>
              
              {/* Email Input */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailVerified) {
                      setEmailVerified(false);
                      setEmailStep('email');
                    }
                  }}
                  required
                  disabled={loading || verifyLoading || emailVerified}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {!emailVerified && emailStep === 'email' && (
                  <button
                    type="button"
                    onClick={handleSendEmailCode}
                    disabled={verifyLoading || !email || !email.includes('@')}
                    className="w-full sm:w-auto px-6 py-3 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                  >
                    {verifyLoading ? 'שולח...' : 'שלח קוד'}
                  </button>
                )}
                {emailVerified && (
                  <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-700 font-medium text-sm">מאומת</span>
                  </div>
                )}
              </div>

              {/* Verification Code Input */}
              {emailStep === 'verify' && !emailVerified && (
                <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <p className="text-sm text-blue-800">שלחנו קוד אימות למייל</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="הזן קוד 6 ספרות"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg tracking-widest"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyEmailCode}
                      disabled={verifyLoading || verifyCode.length < 6}
                      className="w-full sm:w-auto px-6 py-3 text-white font-medium rounded-lg transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                    >
                      {verifyLoading ? 'מאמת...' : 'אמת'}
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
                    <button
                      type="button"
                      onClick={handleSendEmailCode}
                      disabled={countdown > 0 || verifyLoading}
                      className="text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                    >
                      {countdown > 0 ? `שלח שוב בעוד ${countdown} שניות` : 'שלח קוד שוב'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEmailStep('email'); setVerifyCode(''); }}
                      className="text-gray-500 hover:underline"
                    >
                      שנה מייל
                    </button>
                  </div>
                </div>
              )}

              {/* Verification Error */}
              {verifyError && (
                <p className="text-sm text-red-600">{verifyError}</p>
              )}
            </div>

            {/* Push Notifications Consent */}
            <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3">
              <input
                id="wantsPush"
                name="wantsPush"
                type="checkbox"
                checked={wantsPush}
                onChange={(e) => setWantsPush(e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="wantsPush" className="text-sm text-gray-700 leading-6">
                אני רוצה לקבל התראות ועדכונים חשובים מ-VIPO ברגע שמתרחש משהו חדש.
              </label>
            </div>
            <p className="text-xs text-gray-500 -mt-2 mb-1">
              ניתן לבטל את ההתראות בכל רגע דרך ההגדרות האישיות שלך במערכת.
            </p>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                סיסמה <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  aria-describedby="password-help"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p id="password-help" className="text-xs text-gray-500 mt-1">
                מינימום 8 תווים, מספר אחד ואות אחת
              </p>
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                סוג משתמש
              </label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                aria-describedby="role-help"
              >
                <option value="customer">לקוח</option>
                <option value="agent">סוכן</option>
              </select>
              <p id="role-help" className="text-xs text-gray-500 mt-1">
                {role === 'customer' && 'לקוח - גישה לרכישת מוצרים'}
                {role === 'agent' && 'סוכן - גישה לדשבורד סוכנים ועמלות'}
              </p>
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="flex items-start gap-3">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 mt-1 rounded border-gray-300"
                style={{ accentColor: '#0891b2' }}
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-700">
                אני מסכים/ה ל
                <a href="/terms" className="text-cyan-600 hover:underline mx-1">תנאי השימוש</a>
                ול
                <a href="/privacy" className="text-cyan-600 hover:underline mx-1">מדיניות הפרטיות</a>
                של האתר <span className="text-red-500">*</span>
              </label>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-3">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-gray-300"
                style={{ accentColor: '#0891b2' }}
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-600">
                זכור אותי במכשיר זה
              </label>
            </div>

            {/* Phone (Required) */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                מספר טלפון <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="053-375-2633"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError('');
                }}
                required
                disabled={loading || googleLoading}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${phoneError ? 'border-red-500 border-2' : 'border-gray-300'}`}
                aria-describedby="phone-help"
              />
              {phoneError ? (
                <p className="text-sm text-red-600 mt-1">{phoneError}</p>
              ) : (
                <p id="phone-help" className="text-xs text-gray-500 mt-1">
                  נדרש לצורך יצירת קשר ואימות
                </p>
              )}
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:cursor-not-allowed"
              style={{
                background: googleLoading
                  ? '#9ca3af'
                  : 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)',
              }}
            >
              {googleLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  מתחבר...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  המשך עם Google
                </>
              )}
            </button>

            {/* Divider before regular form */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">או הרשמה עם אימייל וסיסמה</span>
              </div>
            </div>

            {/* Success Message */}
            {msg && (
              <div
                className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start gap-3"
                role="status"
                aria-live="polite"
              >
                <svg
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <strong className="font-semibold">הצלחה!</strong>
                  <p className="text-sm mt-1">{msg}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {err && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1">
                    <strong className="font-semibold">שגיאה בהרשמה</strong>
                    <p className="text-sm mt-1">{err}</p>
                  </div>
                </div>
                {err.includes('כבר קיים') && (
                  <div className="mt-3">
                    <a
                      href="/login"
                      className="inline-block w-full text-center bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      עבור להתחברות
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:cursor-not-allowed"
              style={{
                background: loading
                  ? '#9ca3af'
                  : 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
              }}
              onMouseEnter={(e) =>
                !loading &&
                (e.currentTarget.style.background =
                  'linear-gradient(135deg, #0891b2 0%, #1e3a8a 100%)')
              }
              onMouseLeave={(e) =>
                !loading &&
                (e.currentTarget.style.background =
                  'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)')
              }
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  נרשם...
                </span>
              ) : (
                'הירשם עכשיו'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">או</span>
            </div>
          </div>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-600">
            כבר יש לך חשבון?{' '}
            <a
              href="/login"
              className="font-semibold focus:outline-none focus:underline"
              style={{ color: '#0891b2' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#0e7490')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#0891b2')}
            >
              התחבר כאן
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          בהרשמה אתה מסכים ל
          <a href="/terms" className="underline hover:text-gray-700">
            {' '}
            תנאי השימוש{' '}
          </a>
          ו
          <a href="/privacy" className="underline hover:text-gray-700">
            מדיניות הפרטיות
          </a>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  );
}
