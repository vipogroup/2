'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MediaUpload from '@/app/components/MediaUpload';

const initialForm = {
  id: null,
  title: '',
  type: 'video',
  mediaUrl: '',
  thumbnailUrl: '',
  messageTemplate: '',
  isActive: true,
};

function useBasePath() {
  const pathname = usePathname();
  return pathname?.startsWith('/business') ? '/business' : '/admin';
}

export default function MarketingAssetsClient({ embedded = false }) {
  const basePath = useBasePath();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadAssets();
  }, []);

  const filteredAssets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (filterType !== 'all' && asset.type !== filterType) {
        return false;
      }
      if (!term) return true;
      return (
        asset.title.toLowerCase().includes(term) ||
        asset.messageTemplate.toLowerCase().includes(term) ||
        (asset.mediaUrl || '').toLowerCase().includes(term)
      );
    });
  }, [assets, search, filterType]);

  async function loadAssets() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/marketing-assets', { cache: 'no-store' });
      if (!res.ok) {
        console.error('Failed to load assets');
        return;
      }
      const data = await res.json();
      if (data?.ok) {
        setAssets(data.items || []);
      }
    } catch (error) {
      console.error('loadAssets error', error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setErrors({});
  }

  function startEdit(asset) {
    setForm({
      id: asset.id,
      title: asset.title,
      type: asset.type,
      mediaUrl: asset.mediaUrl,
      thumbnailUrl: asset.thumbnailUrl || '',
      messageTemplate: asset.messageTemplate || '',
      isActive: asset.isActive,
    });
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate() {
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'יש להזין שם נכס';
    if (!['video', 'image'].includes(form.type)) nextErrors.type = 'סוג אינו תקין';
    if (!form.mediaUrl.trim()) nextErrors.mediaUrl = 'יש להזין כתובת מדיה';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        mediaUrl: form.mediaUrl.trim(),
        thumbnailUrl: form.thumbnailUrl.trim() || undefined,
        messageTemplate: form.messageTemplate,
        isActive: form.isActive,
      };

      let endpoint = '/api/admin/marketing-assets';
      let method = 'POST';
      if (form.id) {
        endpoint = `/api/admin/marketing-assets/${form.id}`;
        method = 'PATCH';
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const message = data?.details ? Object.values(data.details)[0] : data?.error || 'שמירה נכשלה';
        alert(message);
        return;
      }

      await loadAssets();
      resetForm();
      alert('נשמר בהצלחה');
    } catch (error) {
      console.error('save asset error', error);
      alert('שמירה נכשלה');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(asset) {
    if (!confirm(`למחוק את "${asset.title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/marketing-assets/${asset.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        alert(data?.error || 'מחיקה נכשלה');
        return;
      }
      await loadAssets();
      if (form.id === asset.id) {
        resetForm();
      }
    } catch (error) {
      console.error('delete asset error', error);
      alert('מחיקה נכשלה');
    }
  }

  return (
    <div className={embedded ? 'bg-white p-3' : 'min-h-screen bg-white p-4 sm:p-6 md:p-8'}>
      <div className={embedded ? 'space-y-4' : 'max-w-6xl mx-auto space-y-6'}>
        {!embedded && (<header className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-bold mb-2"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              ספריית תוכן שיווקי
            </h1>
            <p className="text-gray-600 text-sm">
              נהל כאן סרטונים ותמונות שיווק עבור הסוכנים. כל נכס פעיל יוצג בדשבורד הסוכן להעתקה ושיתוף.
            </p>
          </div>
          <Link
            href={basePath}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            חזרה
          </Link>
        </header>)}

        <section
          className="rounded-xl p-5"
          style={{
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 4px 15px rgba(8, 145, 178, 0.12)',
          }}
        >
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">שם הנכס*</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="לדוגמה: סרטון השקה לחורף"
              />
              {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">סוג הנכס*</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="video">וידאו</option>
                <option value="image">תמונה</option>
              </select>
              {errors.type && <p className="text-xs text-red-600 mt-1">{errors.type}</p>}
            </div>

            <div>
              <MediaUpload
                value={form.mediaUrl}
                onChange={(url) => {
                  setForm((prev) => ({ ...prev, mediaUrl: url }));
                  if (errors.mediaUrl) {
                    setErrors((prev) => ({ ...prev, mediaUrl: undefined }));
                  }
                }}
                label="קישור למדיה (MP4 / JPG / PNG)*"
                type={form.type}
              />
              {errors.mediaUrl && <p className="text-xs text-red-600 mt-1">{errors.mediaUrl}</p>}
            </div>

            <div>
              <MediaUpload
                value={form.thumbnailUrl}
                onChange={(url) => setForm((prev) => ({ ...prev, thumbnailUrl: url }))}
                label="תמונה ממוזערת (לא חובה)"
                type="image"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">טקסט הודעה (משתנים: {'{link}'}, {'{coupon}'}, {'{discount}'})</label>
              <textarea
                name="messageTemplate"
                value={form.messageTemplate}
                onChange={handleChange}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="דוגמה: היי! קבלו \n{link}\nקוד {coupon} נותן {discount} הנחה"
              />
            </div>

            <div className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                נכס פעיל (יוצג לסוכנים)
              </label>
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-3 justify-end">
              {form.id && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm"
                  disabled={submitting}
                >
                  ביטול עריכה
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
              >
                {submitting ? 'שומר...' : form.id ? 'עדכן נכס' : 'הוסף נכס'}
              </button>
            </div>
          </form>
        </section>

        <section
          className="rounded-xl p-5"
          style={{
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #0891b2, #1e3a8a)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 4px 15px rgba(8, 145, 178, 0.12)',
          }}
        >
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש לפי שם או טקסט..."
                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full sm:w-32 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">כל הסוגים</option>
                <option value="video">וידאו</option>
                <option value="image">תמונה</option>
              </select>
            </div>
            <div className="text-sm text-gray-700">
              נמצאו {filteredAssets.length} נכסים (סה״כ {assets.length})
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border border-gray-200 rounded-lg overflow-hidden">
              <thead
                style={{
                  background: 'linear-gradient(135deg, rgba(30,58,138,0.1) 0%, rgba(8,145,178,0.1) 100%)',
                }}
              >
                <tr className="text-xs sm:text-sm text-gray-600">
                  <th className="px-3 py-2 border-b border-gray-200">שם</th>
                  <th className="px-3 py-2 border-b border-gray-200">סוג</th>
                  <th className="px-3 py-2 border-b border-gray-200">סטטוס</th>
                  <th className="px-3 py-2 border-b border-gray-200">מדיה</th>
                  <th className="px-3 py-2 border-b border-gray-200">עודכן</th>
                  <th className="px-3 py-2 border-b border-gray-200">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      טוען נתונים...
                    </td>
                  </tr>
                ) : filteredAssets.length ? (
                  filteredAssets.map((asset) => {
                    const updatedLabel = asset.updatedAt
                      ? new Date(asset.updatedAt).toLocaleDateString('he-IL')
                      : '';
                    return (
                      <tr key={asset.id} className="text-xs sm:text-sm border-t border-gray-100">
                        <td className="px-3 py-3 font-semibold text-gray-900">{asset.title}</td>
                        <td className="px-3 py-3 text-gray-600">{asset.type === 'video' ? 'וידאו' : 'תמונה'}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              asset.isActive
                                ? 'text-white'
                                : 'text-gray-600'
                            }`}
                            style={{
                              background: asset.isActive
                                ? 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)'
                                : 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
                            }}
                          >
                            {asset.isActive ? 'פעיל' : 'מושבת'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-blue-600 underline">
                          <a href={asset.mediaUrl} target="_blank" rel="noopener noreferrer">
                            צפייה
                          </a>
                        </td>
                        <td className="px-3 py-3 text-gray-500">{updatedLabel}</td>
                        <td className="px-3 py-3 space-x-0 space-y-0 flex flex-wrap gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => startEdit(asset)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                          >
                            עריכה
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(asset)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                            style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' }}
                          >
                            מחיקה
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      לא נמצאו נכסים תואמים.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
