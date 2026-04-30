'use client';

import { useMemo, useState } from 'react';

export default function VipoImageStudioClient() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastDeepLink, setLastDeepLink] = useState('');

  const baseUrl = useMemo(() => {
    try {
      return window.location.origin;
    } catch {
      return 'http://localhost:3001';
    }
  }, []);

  async function generateDeepLink() {
    const res = await fetch('/api/studio/auth/sso/start', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !data?.code) {
      throw new Error(data?.error || 'Failed to start SSO');
    }

    const deepLink = `vipo-image-studio://sso?code=${encodeURIComponent(data.code)}&baseUrl=${encodeURIComponent(baseUrl)}`;
    setLastDeepLink(deepLink);
    return deepLink;
  }

  async function ensureDeepLink() {
    if (lastDeepLink) return lastDeepLink;
    return generateDeepLink();
  }

  function openStudio() {
    if (busy) return;
    setError('');
    setBusy(true);

    try {
      // Important for hosted/HTTPS: server cannot reach the user's localhost.
      // We do a same-origin navigation that immediately 302-redirects to the custom protocol deep link.
      const url = `/api/studio/auth/sso/start?redirect=1&baseUrl=${encodeURIComponent(baseUrl)}`;
      window.location.assign(url);
    } catch (err) {
      setError(err?.message || 'שגיאה בפתיחת הסטודיו');
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={openStudio}
          disabled={busy}
          className="px-4 py-2.5 rounded-xl text-white font-bold disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          {busy ? 'פותח...' : 'פתח סטודיו'}
        </button>

        {lastDeepLink ? (
          <button
            type="button"
            onClick={async () => {
              try {
                const deepLink = await ensureDeepLink();
                if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(deepLink);
                  alert('הועתק ללוח');
                } else {
                  prompt('העתק את הקישור:', deepLink);
                }
              } catch {
                try {
                  const deepLink = await ensureDeepLink();
                  prompt('העתק את הקישור:', deepLink);
                } catch (e) {
                  alert(e?.message || 'שגיאה ביצירת הקישור');
                }
              }
            }}
            className="px-4 py-2.5 rounded-xl border border-gray-200 font-semibold"
          >
            העתק Deep Link
          </button>
        ) : (
          <button
            type="button"
            onClick={async () => {
              try {
                setError('');
                const deepLink = await ensureDeepLink();
                if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(deepLink);
                  alert('הועתק ללוח');
                } else {
                  prompt('העתק את הקישור:', deepLink);
                }
              } catch (e) {
                setError(e?.message || 'שגיאה ביצירת הקישור');
              }
            }}
            className="px-4 py-2.5 rounded-xl border border-gray-200 font-semibold"
          >
            העתק Deep Link
          </button>
        )}
      </div>

      {error ? (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>
      ) : null}

      <div className="mt-3 text-xs text-gray-500">
        אם הסטודיו לא נפתח:
        <br />
        1) ודא שהסטודיו מותקן/רץ במחשב
        <br />
        2) אפשר גם להעתיק את ה־Deep Link ולהדביק ב־Run (Windows+R)
      </div>
    </div>
  );
}
