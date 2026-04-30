'use client';

import { useMemo, useState } from 'react';

function formatTimestamp(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString();
  } catch (err) {
    return String(ts);
  }
}

function formatMeta(meta) {
  if (!meta || typeof meta !== 'object') return '—';
  try {
    return JSON.stringify(meta, null, 2);
  } catch (err) {
    return String(meta);
  }
}

function copyToClipboard(text) {
  if (!text) return;
  if (typeof navigator?.clipboard?.writeText === 'function') {
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback will be handled silently
    });
  }
}

export default function EventRow({ event }) {
  const [expanded, setExpanded] = useState(false);
  const tsLabel = useMemo(() => formatTimestamp(event?.ts || event?.createdAt), [event]);
  const metaPretty = useMemo(() => formatMeta(event?.meta), [event]);

  const cardBg = useMemo(() => {
    switch (event?.severity) {
      case 'critical':
        return 'bg-gradient-to-l from-red-50 via-red-50 to-amber-50';
      case 'error':
        return 'bg-gradient-to-l from-red-50 via-red-50 to-orange-50';
      case 'warn':
        return 'bg-gradient-to-l from-amber-50 via-amber-50 to-yellow-50';
      case 'info':
      default:
        return 'bg-gradient-to-l from-sky-50 via-sky-50 to-blue-50';
    }
  }, [event?.severity]);

  const borderColor = useMemo(() => {
    switch (event?.severity) {
      case 'critical':
        return 'border-red-300';
      case 'error':
        return 'border-orange-300';
      case 'warn':
        return 'border-amber-300';
      case 'info':
      default:
        return 'border-sky-300';
    }
  }, [event?.severity]);

  const stack = event?.stack;

  return (
    <article className={`flex flex-col gap-4 rounded-2xl border bg-white/95 p-5 shadow-[0_12px_32px_rgba(8,145,178,0.08)] transition hover:shadow-[0_18px_40px_rgba(8,145,178,0.12)] ${borderColor}`}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex flex-col gap-3 text-right"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`min-w-[72px] rounded-full px-3 py-1 text-center text-sm font-semibold text-slate-900 ${cardBg}`}
          >
            {event?.severity || 'unknown'}
          </span>
          <span className="text-sm text-slate-500">{tsLabel}</span>
          <span className="text-sm text-slate-600">
            {event?.status || '—'} | {event?.method || '—'}
          </span>
          <span className="text-sm font-medium text-slate-800" style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}>
            {event?.route || '—'}
          </span>
          <span className="text-sm font-semibold text-[#0891b2]">{event?.source || '—'}</span>
        </div>
        <div className="text-base font-medium text-slate-900">{event?.message || '—'}</div>
      </button>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-600">Request ID:</span>
          <span className="font-mono text-slate-700" style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}>{event?.requestId || '—'}</span>
          <button
            type="button"
            onClick={() => copyToClipboard(event?.requestId)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            העתק
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-600">Fingerprint:</span>
          <span className="font-mono text-slate-700" style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}>{event?.fingerprint || '—'}</span>
          <button
            type="button"
            onClick={() => copyToClipboard(event?.fingerprint)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            העתק
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Meta</h3>
            <pre
              className="w-full overflow-x-auto rounded-2xl bg-slate-950/95 p-5 text-left font-mono text-xs leading-6 text-slate-100 shadow-inner"
              dir="ltr"
            >
              {metaPretty}
            </pre>
          </div>

          {stack && (
            <div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">Stack</h3>
              <pre
                className="w-full overflow-x-auto rounded-2xl bg-slate-900/95 p-5 text-left font-mono text-xs leading-6 text-slate-100 shadow-inner"
                dir="ltr"
              >
                {stack}
              </pre>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
