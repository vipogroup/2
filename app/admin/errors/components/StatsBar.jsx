'use client';

import { useEffect, useMemo, useState } from 'react';

const FIELD_LABELS = {
  totalErrors: 'סה"כ שגיאות',
  criticalCount: 'מקרים קריטיים',
  errorCount: 'שגיאות',
  warnCount: 'אזהרות',
  infoCount: 'מידע',
  uniqueFingerprints: 'טביעות ייחודיות',
  lastErrorAt: 'שגיאה אחרונה',
};

function formatValue(key, value) {
  if (value == null) {
    return '—';
  }
  if (key === 'lastErrorAt') {
    try {
      return value ? new Date(value).toLocaleString() : '—';
    } catch (err) {
      return String(value);
    }
  }
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  return String(value);
}

export default function StatsBar({ window: windowValue }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let abortController = new AbortController();
    setLoading(true);
    setError('');

    fetch(`/api/admin/errors/stats?window=${windowValue}`, {
      credentials: 'include',
      signal: abortController.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => {
        setStats(data || null);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError(String(err?.message || err));
        setLoading(false);
      });

    return () => {
      abortController.abort();
      abortController = null;
    };
  }, [windowValue]);

  const cards = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats)
      .filter(([key]) => !['window', 'from', 'to'].includes(key))
      .map(([key, value]) => ({
        key,
        label: FIELD_LABELS[key] || key,
        value,
      }));
  }, [stats]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="h-28 rounded-2xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%] animate-[stats-skeleton_1.6s_ease_infinite]"
          />
        ))}
        <style jsx>{`
          @keyframes stats-skeleton {
            0% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 shadow-sm">
          לא ניתן לטעון נתוני סטטוס: {error}
        </div>
      )}

      {!error && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.key}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_8px_24px_rgba(8,145,178,0.08)] backdrop-blur"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {card.label}
              </span>
              <span className="text-3xl font-bold text-slate-900">
                {formatValue(card.key, card.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
