'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

function RegisterAgentPageContent() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get('tenant');

  const isPasswordValid = (pwd) => {
    if (pwd.length < 8) return false;
    if (!/\d/.test(pwd)) return false;
    if (!/[a-zA-Zא-ת]/.test(pwd)) return false;
    return true;
  };

  const isPhoneValid = (p) => p.replace(/\D/g, '').length >= 9;

  const handleGoogleSignIn = async () => {
    setErr('');
    setPhoneError('');
    
    if (!phone || !isPhoneValid(phone)) {
      setPhoneError('יש להזין מספר טלפון תקין');
      document.getElementById('phone')?.focus();
      return;
    }

    if (!acceptTerms) {
      setErr('יש לאשר את תנאי השימוש');
      return;
    }

    setGoogleLoading(true);
    
    try {
      localStorage.setItem('pendingGooglePhone', phone);
      localStorage.setItem('pendingGoogleRole', 'agent');
      if (tenantSlug) {
        localStorage.setItem('pendingGoogleTenant', tenantSlug);
      }
    } catch (e) {
      console.log('localStorage not available');
    }

    try {
      await signIn('google', { callbackUrl: '/auth/complete-google' });
    } catch (e) {
      setErr('שגיאה בהתחברות עם Google');
      setGoogleLoading(false);
    }
  };

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setMsg('');

    if (!acceptTerms) {
      setErr('יש לאשר את תנאי השימוש');
      return;
    }

    if (!isPasswordValid(password)) {
      setErr('הסיסמה חייבת לכלול לפחות 8 תווים, מספר אחד ואות אחת');
      return;
    }

    if (!isPhoneValid(phone)) {
      setErr('מספר טלפון לא תקין');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone, email, password, role: 'agent', tenantSlug }),
      });
      const j = await res.json().catch(() => ({}));
      
      if (!res.ok || !j?.ok) {
        let errorMsg = j?.message || j?.error || 'הרשמה נכשלה';
        if (j?.error === 'phone exists') errorMsg = 'מספר הטלפון כבר רשום';
        else if (j?.error === 'email exists') errorMsg = 'האימייל כבר רשום';
        throw new Error(errorMsg);
      }

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password }),
      });

      setMsg('נרשמת בהצלחה כסוכן!');

      if (loginRes.ok) {
        setTimeout(() => router.push('/agent'), 1500);
      } else {
        setTimeout(() => router.push('/login'), 1500);
      }
    } catch (e) {
      setErr(e.message || 'שגיאה בהרשמה');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              הרשמה כסוכן
            </h1>
            {tenantSlug && (
              <p className="text-sm text-gray-500 mt-2">
                הצטרפות לעסק: <span className="font-medium text-gray-700">{tenantSlug}</span>
              </p>
            )}
          </div>

          {msg && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm text-center">
              {msg}
            </div>
          )}
          {err && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm text-center">
              {err}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                placeholder="הזן את שמך המלא"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                required
                className={`w-full px-4 py-3 rounded-lg border ${phoneError ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all`}
                placeholder="050-0000000"
              />
              {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all pl-12"
                  placeholder="לפחות 8 תווים, מספר ואות"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                אני מאשר/ת את{' '}
                <Link href="/terms" className="text-cyan-600 hover:underline">תנאי השימוש</Link>
                {' '}ו
                <Link href="/privacy" className="text-cyan-600 hover:underline">מדיניות הפרטיות</Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg text-white font-medium transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {loading ? 'נרשם...' : 'הרשמה כסוכן'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">או</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full py-3 px-4 rounded-lg border-2 border-gray-200 bg-white text-gray-700 font-medium flex items-center justify-center gap-3 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'מתחבר...' : 'הרשמה עם Google'}
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            כבר רשום?{' '}
            <Link href={tenantSlug ? `/login?tenant=${tenantSlug}` : '/login'} className="text-cyan-600 font-medium hover:underline">
              התחבר כאן
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterAgentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <RegisterAgentPageContent />
    </Suspense>
  );
}
