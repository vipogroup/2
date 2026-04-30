'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/app/components/layout/MainLayout';

const ROLE_LABELS = {
  agent: 'סוכן',
  customer: 'לקוח',
  admin: 'מנהל מערכת',
  manager: 'מנהל',
};

function buildCouponCode(user) {
  if (!user) return '';

  if (user.couponCode) {
    return String(user.couponCode).trim();
  }

  const rawName = String(user.fullName || user.name || 'סוכן').trim();
  const sanitizedName = rawName.replace(/\s+/g, '');
  const baseName = sanitizedName || 'סוכן';

  let sequence = user?.couponSequence;
  if (sequence === undefined || sequence === null || sequence === '') {
    const numericFromId = String(user?._id ?? '')
      .replace(/\D/g, '')
      .slice(-3);
    if (numericFromId) {
      sequence = numericFromId;
    }
  }

  const sequenceStr = String(sequence ?? '1').trim() || '1';
  return `${baseName}${sequenceStr}`;
}

function getInitials(user) {
  const name = String(user?.fullName || user?.name || '').trim();
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name[0].toUpperCase();
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          throw new Error('AUTH_FAILED');
        }

        const data = await res.json();
        let mergedUser = data?.user || null;

        if (mergedUser) {
          try {
            const profileRes = await fetch('/api/users/me');
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              if (profileData?.user) {
                mergedUser = { ...mergedUser, ...profileData.user };
              }
            }
          } catch (profileError) {
            console.error('Failed to fetch extended profile:', profileError);
          }
        }

        setUser(mergedUser);
        setError('');
        setFormData({
          fullName: mergedUser?.fullName || '',
          phone: mergedUser?.phone || '',
          email: mergedUser?.email || '',
        });
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setUser(null);
        setError('אירעה שגיאה בטעינת הפרופיל. נסה שוב מאוחר יותר.');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  const couponCode = buildCouponCode(user);
  const roleLabel = ROLE_LABELS[user?.role] || 'משתמש';
  const initials = getInitials(user);

  const handleEditClick = () => {
    setFormError('');
    setFormSuccess('');
    setFormData({
      fullName: user?.fullName || user?.name || '',
      phone: user?.phone || '',
      email: user?.email || '',
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaving(false);
    setFormError('');
    setFormSuccess('');
    setFormData({
      fullName: user?.fullName || user?.name || '',
      phone: user?.phone || '',
      email: user?.email || '',
    });
  };

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;

    const trimmed = {
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
    };

    if (!trimmed.fullName) {
      setFormError('יש להזין שם מלא');
      return;
    }

    setSaving(true);
    setFormError('');
    setFormSuccess('');

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trimmed),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'שמירת הפרופיל נכשלה');
      }

      if (data?.user) {
        setUser(data.user);
        setFormSuccess('הפרטים נשמרו בהצלחה');
        setIsEditing(false);
        setFormData({
          fullName: data.user.fullName || data.user.name || '',
          phone: data.user.phone || '',
          email: data.user.email || '',
        });
      } else {
        setFormSuccess('הפרטים עודכנו');
      }
    } catch (submitError) {
      console.error('Failed to save profile:', submitError);
      setFormError(submitError.message || 'שמירת הפרופיל נכשלה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-64px)] bg-white">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="bg-white border border-rose-100 text-rose-600 rounded-3xl shadow-sm p-8 text-center">
              <p className="text-lg font-semibold mb-2">לא הצלחנו לטעון את הפרופיל</p>
              <p className="text-sm text-rose-500">{error}</p>
            </div>
          ) : user ? (
            <div>
              {/* Header with gradient */}
              <div
                className="relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                }}
              >
                <div className="px-4 sm:px-6 py-8 sm:py-12">
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-lg">
                      {initials}
                    </div>
                    <div className="flex-1 text-center sm:text-right">
                      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                        {user.fullName || user.name || 'סוכן VIPO'}
                      </h1>
                      <p className="text-white/90 text-sm sm:text-base">{roleLabel}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 sm:px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Personal Info Card */}
                  <div className="lg:col-span-2 border border-gray-200 rounded-lg p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">מידע אישי</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">
                          שם מלא
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {user.fullName || user.name || '—'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">
                          תפקיד
                        </label>
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: '#1e3a8a', color: 'white' }}
                        >
                          {roleLabel}
                        </span>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">
                          טלפון
                        </label>
                        <p className="text-sm font-medium text-gray-900">{user.phone || '—'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">
                          אימייל
                        </label>
                        <p className="text-sm font-medium text-gray-900">{user.email || '—'}</p>
                      </div>
                      {user?.createdAt && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">
                            תאריך הצטרפות
                          </label>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(user.createdAt).toLocaleDateString('he-IL')}
                          </p>
                        </div>
                      )}
                      {couponCode && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">
                            קוד קופון
                          </label>
                          <code
                            className="inline-block bg-blue-50 px-3 py-1 rounded text-sm font-bold"
                            style={{ color: '#1e3a8a' }}
                          >
                            {couponCode.toUpperCase()}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions Card */}
                  <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">פעולות מהירות</h2>
                    <div className="space-y-3">
                      <a
                        href="mailto:vipogroup1@gmail.com"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        שלח מייל
                      </a>
                      <a
                        href="https://wa.me/972533752633"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>

                {/* Edit Section */}
                <div className="border-t border-gray-200 pt-4 sm:pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                      עדכון פרטים
                    </h3>
                    {!isEditing && (
                      <button
                        onClick={handleEditClick}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        עריכה
                      </button>
                    )}
                  </div>

                  {formSuccess && (
                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {formSuccess}
                    </div>
                  )}
                  {formError && (
                    <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {formError}
                    </div>
                  )}

                  {isEditing ? (
                    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                            שם מלא
                          </label>
                          <input
                            type="text"
                            value={formData.fullName}
                            onChange={handleChange('fullName')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="שם מלא"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                            טלפון
                          </label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange('phone')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="מספר טלפון"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                            אימייל
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={handleChange('email')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="אימייל"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                          disabled={saving}
                        >
                          בטל
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400"
                          disabled={saving}
                        >
                          {saving ? 'שומר...' : 'שמור'}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 text-center">
              <p className="text-slate-600">לא נמצאו נתוני משתמש להצגה.</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
