'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import EventRow from './EventRow';

const WINDOW_TO_MS = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

function computeRange(windowValue) {
  const duration = WINDOW_TO_MS[windowValue] || WINDOW_TO_MS['1h'];
  const to = new Date();
  const from = new Date(to.getTime() - duration);

  return {
    fromISO: from.toISOString(),
    toISO: to.toISOString(),
  };
}

function buildQuery(windowValue, cursor) {
  const { fromISO, toISO } = computeRange(windowValue);
  const params = new URLSearchParams({
    limit: '20',
    from: fromISO,
    to: toISO,
  });

  if (cursor) {
    params.set('cursor', cursor);
  }

  return `/api/admin/errors/events?${params.toString()}`;
}

export default function EventsList({ window: windowValue }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const rangeLabel = useMemo(() => {
    const { fromISO, toISO } = computeRange(windowValue);
    try {
      return `${new Date(fromISO).toLocaleString()} — ${new Date(toISO).toLocaleString()}`;
    } catch (err) {
      return '';
    }
  }, [windowValue]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setEvents([]);
    setNextCursor(null);

    fetch(buildQuery(windowValue), {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => {
        setEvents(Array.isArray(data?.items) ? data.items : []);
        setNextCursor(data?.nextCursor || null);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError(String(err?.message || err));
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [windowValue]);

  const loadMore = useCallback(() => {
    if (!nextCursor) return;
    setLoadingMore(true);
    fetch(buildQuery(windowValue, nextCursor), {
      credentials: 'include',
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => {
        setEvents((prev) => [...prev, ...(Array.isArray(data?.items) ? data.items : [])]);
        setNextCursor(data?.nextCursor || null);
        setLoadingMore(false);
      })
      .catch((err) => {
        setError(String(err?.message || err));
        setLoadingMore(false);
      });
  }, [nextCursor, windowValue]);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-slate-900">אירועי שגיאה</h2>
          <span className="text-xs font-medium text-slate-500">
            טווח נתונים: <span className="font-semibold text-slate-700">{rangeLabel}</span>
          </span>
        </div>
        <p className="text-sm text-slate-500">
          רשימת האירועים העדכנית ביותר בהתאם לחלון הזמן שנבחר. הקליקו על שורה כדי לפתוח פרטים טכניים, חותמות זיהוי ו-Stack Trace.
        </p>
      </header>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-28 rounded-2xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%] animate-[events-skeleton_1.4s_ease_infinite]"
            />
          ))}
          <style jsx>{`
            @keyframes events-skeleton {
              0% {
                background-position: 100% 50%;
              }
              100% {
                background-position: 0% 50%;
              }
            }
          `}</style>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 shadow-sm">
          לא ניתן לטעון אירועים: {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm font-medium text-slate-500 shadow-[0_8px_24px_rgba(8,145,178,0.05)]">
          אין אירועי שגיאה בחלון הזמן הנוכחי.
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <div className="space-y-4">
          {events.map((event) => (
            <EventRow key={`${event.requestId}-${event.ts}-${event.fingerprint}`} event={event} />
          ))}
        </div>
      )}

      {nextCursor && !loading && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-[#1e3a8a] to-[#0891b2] px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-[#0891b2]/30 transition hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891b2] focus-visible:ring-offset-2 disabled:cursor-progress disabled:opacity-60"
          >
            {loadingMore && (
              <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 12a8 8 0 018-8"
                />
              </svg>
            )}
            {loadingMore ? 'טוען…' : 'טען עוד אירועים'}
          </button>
        </div>
      )}
    </section>
  );
}
