'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage({ params }) {
  const router = useRouter();
  const token = params?.token || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'הסיסמאות אינן תואמות' });
      return;
    }

    if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Zא-ת]/.test(password)) {
      setStatus({ type: 'error', message: 'הסיסמה חייבת לכלול לפחות 8 תווים, מספר ואות' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || 'שגיאה באיפוס הסיסמה');
      }

      setStatus({
        type: 'success',
        message: 'הסיסמה עודכנה בהצלחה! ניתן להתחבר כעת עם הסיסמה החדשה.',
      });
      setPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      const message =
        error.message === 'invalid_or_expired'
          ? 'הקישור לאיפוס אינו תקף או שפג תוקפו. יש לבקש איפוס חדש.'
          : 'שגיאה באיפוס הסיסמה. נסה שוב.';
      setStatus({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">איפוס סיסמה</h1>
            <p className="text-gray-600 text-sm">הזן סיסמה חדשה עבור חשבונך</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                סיסמה חדשה
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                אימות סיסמה חדשה
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="••••••••"
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? 'מעדכן...' : 'עדכן סיסמה'}
            </button>
          </form>

          <button
            type="button"
            className="mt-6 text-sm text-blue-600 hover:text-blue-700"
            onClick={() => router.push('/login')}
          >
            חזרה למסך התחברות
          </button>
        </div>
      </div>
    </main>
  );
}
