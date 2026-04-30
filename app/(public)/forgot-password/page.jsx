'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || 'שגיאה בשליחת הבקשה');
      }

      setStatus({
        type: 'success',
        message: 'אם הכתובת קיימת במערכת, נשלח אליך מייל עם קישור לאיפוס הסיסמה.',
      });
      setEmail('');
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'שגיאה בשליחת הבקשה. נסה שוב.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
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
              שכחת סיסמה?
            </h1>
            <p className="text-gray-600 text-sm">
              הזן את כתובת האימייל שלך ונשלח קישור לאיפוס הסיסמה
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                כתובת אימייל
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                style={{ borderColor: '#d1d5db' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#0891b2')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            {status.message && (
              <div
                className={`px-4 py-3 rounded-lg border text-sm ${
                  status.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
                role="alert"
              >
                {status.message}
              </div>
            )}

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
              {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
            </button>
          </form>

          <button
            type="button"
            className="mt-6 text-sm"
            style={{ color: '#0891b2' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0e7490')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#0891b2')}
            onClick={() => router.push('/login')}
          >
            חזרה למסך התחברות
          </button>
        </div>
      </div>
    </main>
  );
}
