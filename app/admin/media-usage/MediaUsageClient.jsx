'use client';

import { useEffect, useMemo, useState } from 'react';

function ImageIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M4 16l4-4 4 4 4-6 4 6" />
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="9" r="1.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function MediaUsageClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const includeSize = true;

  const totalMBLabel = useMemo(() => {
    const mb = data?.totals?.totalMB;
    if (typeof mb !== 'number' || Number.isNaN(mb)) return '';
    return mb.toLocaleString('he-IL', { maximumFractionDigits: 1 });
  }, [data?.totals?.totalMB]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const url = includeSize ? '/api/admin/tenant-media-usage?includeSize=1' : '/api/admin/tenant-media-usage';
        const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) {
          setError(json?.error || 'שגיאה בטעינת הדוח');
          setData(null);
          return;
        }
        setData(json);
      } catch (e) {
        setError('שגיאת רשת');
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [includeSize]);

  const generatedAtLabel = useMemo(() => {
    const raw = data?.generatedAt;
    if (!raw) return '';
    try {
      return new Date(raw).toLocaleString('he-IL');
    } catch {
      return '';
    }
  }, [data?.generatedAt]);

  return (
    <div>
      <div className="rounded-xl p-3 sm:p-4 mb-2 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <ImageIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-extrabold truncate">שימוש מדיה לפי חנות</div>
            <div className="text-[10px] sm:text-xs opacity-75">תמונות / ייחודיות / וידאו</div>
          </div>
          <div className="mr-auto text-[10px] sm:text-xs opacity-75">{generatedAtLabel ? `עודכן: ${generatedAtLabel}` : ''}</div>
        </div>
        <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}></div>
        <div className="absolute -bottom-16 right-16 w-72 h-72 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}></div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4">
        {loading && (
          <div className="text-sm text-gray-500">טוען...</div>
        )}

        {!loading && error && (
          <div className="text-sm" style={{ color: '#dc2626' }}>{error}</div>
        )}

        {!loading && !error && data?.tenants?.length > 0 && (
          <>
            <div className={`grid grid-cols-2 ${data?.includeSize ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-2 mb-3`}>
              <div className="rounded-lg p-2 text-center" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.05), rgba(8,145,178,0.05))' }}>
                <div className="text-lg font-extrabold" style={{ color: '#1e3a8a' }}>{data.totals?.imageCount || 0}</div>
                <div className="text-[10px] text-gray-500">תמונות (סך הכל)</div>
              </div>
              <div className="rounded-lg p-2 text-center" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.05), rgba(8,145,178,0.05))' }}>
                <div className="text-lg font-extrabold" style={{ color: '#0891b2' }}>{data.totals?.uniqueImageCount || 0}</div>
                <div className="text-[10px] text-gray-500">תמונות ייחודיות</div>
              </div>
              <div className="rounded-lg p-2 text-center" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.05), rgba(8,145,178,0.05))' }}>
                <div className="text-lg font-extrabold" style={{ color: '#1e3a8a' }}>{data.totals?.videoCount || 0}</div>
                <div className="text-[10px] text-gray-500">וידאו</div>
              </div>
              <div className="rounded-lg p-2 text-center" style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.05), rgba(8,145,178,0.05))' }}>
                <div className="text-lg font-extrabold" style={{ color: '#16a34a' }}>{data.totals?.productCount || 0}</div>
                <div className="text-[10px] text-gray-500">מוצרים</div>
              </div>

              {data?.includeSize && (
                <div className="rounded-lg p-2 text-center" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.05), rgba(8,145,178,0.05))' }}>
                  <div className="text-lg font-extrabold" style={{ color: '#0891b2' }}>{data?.sizeAvailable ? (totalMBLabel || '0') : '—'}</div>
                  <div className="text-[10px] text-gray-500">נפח (MB)</div>
                </div>
              )}
            </div>

            {data?.includeSize && data?.sizeAvailable === false && (
              <div className="text-xs mb-3" style={{ color: '#dc2626' }}>
                {data?.sizeError || 'לא ניתן לחשב נפח. בדוק הגדרות Cloudinary בשרת.'}
              </div>
            )}

            <div className="scroll-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '2px solid #0891b2' }}>
                    <th className="text-right py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>חנות</th>
                    <th className="text-right py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>מוצרים</th>
                    <th className="text-right py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>תמונות</th>
                    <th className="text-right py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>ייחודיות</th>
                    <th className="text-right py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>וידאו</th>
                    {data?.includeSize && (
                      <th className="text-right py-2 px-2 font-semibold" style={{ color: '#1e3a8a' }}>MB</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.tenants.map((t) => (
                    <tr key={String(t.tenantId)} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-2 px-2 font-medium">{t.tenantName}</td>
                      <td className="py-2 px-2">{t.productCount || 0}</td>
                      <td className="py-2 px-2">{t.imageCount || 0}</td>
                      <td className="py-2 px-2">{t.uniqueImageCount || 0}</td>
                      <td className="py-2 px-2">{t.videoCount || 0}</td>
                      {data?.includeSize && (
                        <td className="py-2 px-2">{typeof t.totalMB === 'number' ? t.totalMB.toLocaleString('he-IL', { maximumFractionDigits: 1 }) : '—'}</td>
                      )}
                    </tr>
                  ))}
                  <tr className="font-bold" style={{ borderTop: '2px solid #0891b2' }}>
                    <td className="py-2 px-2" style={{ color: '#1e3a8a' }}>סה&quot;כ</td>
                    <td className="py-2 px-2">{data.totals?.productCount || 0}</td>
                    <td className="py-2 px-2">{data.totals?.imageCount || 0}</td>
                    <td className="py-2 px-2">{data.totals?.uniqueImageCount || 0}</td>
                    <td className="py-2 px-2">{data.totals?.videoCount || 0}</td>
                    {data?.includeSize && (
                      <td className="py-2 px-2">{data?.sizeAvailable ? (totalMBLabel || '0') : '—'}</td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && !error && (!data?.tenants || data.tenants.length === 0) && (
          <div className="text-sm text-gray-500">אין נתונים להצגה</div>
        )}
      </div>
    </div>
  );
}
