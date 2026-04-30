'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { THEME_PRESETS } from '@/app/lib/themePresets';

export default function BusinessBrandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTenantId = searchParams.get('tenantId');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [isUsingGlobal, setIsUsingGlobal] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // צבעים נבחרים - 8 קטגוריות מלאות
  const [colors, setColors] = useState({
    primary: '#1e3a8a',
    secondary: '#0891b2',
    accent: '#06b6d4',
    success: '#16a34a',
    warning: '#eab308',
    danger: '#dc2626',
    background: '#f7fbff',
    text: '#0d1b2a',
  });
  const [logo, setLogo] = useState({ url: '', maxWidth: 150 });
  const [selectedPreset, setSelectedPreset] = useState(null);

  // טעינת נתונים
  const loadData = useCallback(async () => {
    try {
      const tenantParam = urlTenantId ? `?tenantId=${urlTenantId}` : '';
      const res = await fetch(`/api/business/branding${tenantParam}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load');
      }
      
      const data = await res.json();
      setSettings(data.settings);
      setGlobalSettings(data.globalSettings);
      setIsUsingGlobal(data.isUsingGlobal);
      
      if (data.settings?.colors) {
        setColors(data.settings.colors);
      }
      if (data.settings?.logo) {
        setLogo(data.settings.logo);
      }
    } catch (error) {
      console.error('Error loading branding:', error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת הנתונים' });
    } finally {
      setLoading(false);
    }
  }, [router, urlTenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // החלפה בין גלובלי למותאם
  const handleToggleGlobal = async (useGlobal) => {
    if (useGlobal) {
      // חזרה לגלובלי
      try {
        setSaving(true);
        const res = await fetch('/api/business/branding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ useGlobalBranding: true }),
        });
        
        if (res.ok) {
          setIsUsingGlobal(true);
          if (globalSettings?.colors) {
            setColors(globalSettings.colors);
          }
          setMessage({ type: 'success', text: 'העסק משתמש כעת בעיצוב הגלובלי' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'שגיאה בעדכון' });
      } finally {
        setSaving(false);
      }
    } else {
      setIsUsingGlobal(false);
    }
  };

  // שמירת שינויים
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      
      const res = await fetch('/api/business/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useGlobalBranding: false,
          colors,
          logo,
          tenantId: urlTenantId,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'העיצוב עודכן בהצלחה!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'שגיאה בשמירה' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה בשמירה' });
    } finally {
      setSaving(false);
    }
  };

  // בחירת Preset
  const handlePresetSelect = (presetId) => {
    setSelectedPreset(presetId);
    const preset = THEME_PRESETS[presetId];
    if (preset?.colors) {
      setColors({
        primary: preset.colors.primaryColor || '#1e3a8a',
        secondary: preset.colors.secondaryColor || '#0891b2',
        accent: preset.colors.accentColor || '#06b6d4',
        success: preset.colors.successColor || '#16a34a',
        warning: preset.colors.warningColor || '#f59e0b',
        danger: preset.colors.dangerColor || '#dc2626',
        background: preset.colors.backgroundColor || '#f7fbff',
        text: preset.colors.textColor || '#0d1b2a',
      });
    }
  };

  // גרדיאנט לתצוגה מקדימה
  const previewGradient = `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link 
              href="/business" 
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <div>
              <h1 
                className="text-2xl md:text-3xl font-bold"
                style={{
                  background: previewGradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                עיצוב העסק שלי
              </h1>
              <p className="text-gray-600 text-sm">התאם את המראה של החנות שלך</p>
            </div>
          </div>
          
          {!isUsingGlobal && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50"
              style={{ background: previewGradient }}
            >
              {saving ? 'שומר...' : 'שמור שינויים'}
            </button>
          )}
        </div>

        {/* הודעות */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* בחירה: גלובלי או מותאם */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">בחר סוג עיצוב</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* אפשרות גלובלי */}
            <button
              onClick={() => handleToggleGlobal(true)}
              className={`p-4 rounded-xl border-2 transition-all text-right ${
                isUsingGlobal 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isUsingGlobal ? 'border-green-500 bg-green-500' : 'border-gray-300'
                }`}>
                  {isUsingGlobal && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="font-bold">עיצוב גלובלי</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    השתמש בעיצוב הכללי של המערכת - תמיד מעודכן אוטומטית
                  </p>
                </div>
              </div>
            </button>
            
            {/* אפשרות מותאם */}
            <button
              onClick={() => handleToggleGlobal(false)}
              className={`p-4 rounded-xl border-2 transition-all text-right ${
                !isUsingGlobal 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  !isUsingGlobal ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {!isUsingGlobal && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="font-bold">עיצוב מותאם אישית</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    בחר צבעים ולוגו משלך
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* הגדרות מותאמות - רק אם לא גלובלי */}
        {!isUsingGlobal && (
          <>
            {/* ערכות עיצוב מוכנות */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <h2 className="text-lg font-bold mb-4">ערכות עיצוב מוכנות</h2>
              <p className="text-sm text-gray-600 mb-4">בחר ערכה מוכנה או התאם ידנית</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(THEME_PRESETS).map(([id, preset]) => (
                  <button
                    key={id}
                    onClick={() => handlePresetSelect(id)}
                    className={`p-3 rounded-xl border-2 transition-all text-right ${
                      selectedPreset === id 
                        ? 'border-blue-500 bg-blue-50 scale-105' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div 
                      className="h-8 rounded-lg mb-2"
                      style={{ 
                        background: preset.colors.backgroundGradient || 
                          `linear-gradient(135deg, ${preset.colors.primaryColor} 0%, ${preset.colors.secondaryColor} 100%)` 
                      }}
                    />
                    <p className="font-medium text-xs sm:text-sm truncate">{preset.name}</p>
                  </button>
                ))}
                
                {/* התאמה ידנית */}
                <button
                  onClick={() => setSelectedPreset(null)}
                  className={`p-3 rounded-xl border-2 transition-all text-right ${
                    selectedPreset === null 
                      ? 'border-blue-500 bg-blue-50 scale-105' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="h-8 rounded-lg mb-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="font-medium text-xs sm:text-sm">התאמה ידנית</p>
                </button>
              </div>
            </div>

            {/* לוגו */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <h2 className="text-lg font-bold mb-4">לוגו העסק</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    קישור ללוגו (URL)
                  </label>
                  <input
                    type="url"
                    value={logo.url || ''}
                    onChange={(e) => setLogo(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                {logo.url && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500 mb-2">תצוגה מקדימה:</p>
                    <Image 
                      src={logo.url} 
                      alt="לוגו" 
                      width={150}
                      height={64}
                      className="max-h-16 object-contain"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </div>

            {/* צבעים */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <h2 className="text-lg font-bold mb-4">צבעים</h2>
              <p className="text-sm text-gray-600 mb-4">
                התאם את צבעי המותג שלך - 8 קטגוריות לשליטה מלאה
              </p>
              
              {/* צבעים ראשיים */}
              <h3 className="text-sm font-bold text-gray-800 mb-3 mt-2">צבעי מותג</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* צבע ראשי */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    צבע ראשי
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={colors.primary}
                      onChange={(e) => setColors(prev => ({ ...prev, primary: e.target.value }))}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                    />
                    <input
                      type="text"
                      value={colors.primary}
                      onChange={(e) => setColors(prev => ({ ...prev, primary: e.target.value }))}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>

                {/* צבע משני */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    צבע משני
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={colors.secondary}
                      onChange={(e) => setColors(prev => ({ ...prev, secondary: e.target.value }))}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                    />
                    <input
                      type="text"
                      value={colors.secondary}
                      onChange={(e) => setColors(prev => ({ ...prev, secondary: e.target.value }))}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>

                {/* צבע הדגשה */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    צבע הדגשה
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={colors.accent}
                      onChange={(e) => setColors(prev => ({ ...prev, accent: e.target.value }))}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                    />
                    <input
                      type="text"
                      value={colors.accent}
                      onChange={(e) => setColors(prev => ({ ...prev, accent: e.target.value }))}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* צבעי סטטוס */}
              <h3 className="text-sm font-bold text-gray-800 mb-3 mt-6">צבעי סטטוס</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* הצלחה */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    הצלחה (ירוק)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={colors.success}
                      onChange={(e) => setColors(prev => ({ ...prev, success: e.target.value }))}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                    />
                    <input
                      type="text"
                      value={colors.success}
                      onChange={(e) => setColors(prev => ({ ...prev, success: e.target.value }))}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>

                {/* התראה */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    התראה (צהוב)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={colors.warning}
                      onChange={(e) => setColors(prev => ({ ...prev, warning: e.target.value }))}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                    />
                    <input
                      type="text"
                      value={colors.warning}
                      onChange={(e) => setColors(prev => ({ ...prev, warning: e.target.value }))}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>

                {/* שגיאה */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    שגיאה/מחיקה (אדום)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={colors.danger}
                      onChange={(e) => setColors(prev => ({ ...prev, danger: e.target.value }))}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                    />
                    <input
                      type="text"
                      value={colors.danger}
                      onChange={(e) => setColors(prev => ({ ...prev, danger: e.target.value }))}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* צבעי רקע וטקסט */}
              <h3 className="text-sm font-bold text-gray-800 mb-3 mt-6">רקע וטקסט</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* רקע */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    צבע רקע
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={colors.background}
                      onChange={(e) => setColors(prev => ({ ...prev, background: e.target.value }))}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                    />
                    <input
                      type="text"
                      value={colors.background}
                      onChange={(e) => setColors(prev => ({ ...prev, background: e.target.value }))}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>

                {/* טקסט */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    צבע טקסט
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={colors.text}
                      onChange={(e) => setColors(prev => ({ ...prev, text: e.target.value }))}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                    />
                    <input
                      type="text"
                      value={colors.text}
                      onChange={(e) => setColors(prev => ({ ...prev, text: e.target.value }))}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* הערה */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>טיפ:</strong> צבעי המותג (ראשי, משני, הדגשה) משמשים לכפתורים וכותרות. צבעי הסטטוס משמשים להודעות הצלחה/שגיאה.
                </p>
              </div>
            </div>

            {/* תצוגה מקדימה */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-lg font-bold mb-4">תצוגה מקדימה</h2>
              
              <div className="space-y-4">
                {/* Header */}
                <div 
                  className="p-4 rounded-xl text-white"
                  style={{ background: previewGradient }}
                >
                  <div className="flex items-center justify-between">
                    {logo.url ? (
                      <Image src={logo.url} alt="לוגו" width={100} height={32} className="h-8 object-contain" unoptimized />
                    ) : (
                      <span className="font-bold text-lg">העסק שלי</span>
                    )}
                    <div className="flex gap-4 text-sm">
                      <span>ראשי</span>
                      <span>מוצרים</span>
                      <span>צור קשר</span>
                    </div>
                  </div>
                </div>
                
                {/* כפתור */}
                <div className="flex gap-4">
                  <button
                    className="px-6 py-3 text-white font-bold rounded-xl"
                    style={{ background: previewGradient }}
                  >
                    כפתור ראשי
                  </button>
                  <button
                    className="px-6 py-3 font-bold rounded-xl border-2"
                    style={{ borderColor: colors.secondary, color: colors.primary }}
                  >
                    כפתור משני
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* מידע על עיצוב גלובלי */}
        {isUsingGlobal && globalSettings && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-bold mb-4">העיצוב הגלובלי הנוכחי</h2>
            
            <div 
              className="p-4 rounded-xl text-white mb-4"
              style={{ 
                background: `linear-gradient(135deg, ${globalSettings.colors?.primary || '#1e3a8a'} 0%, ${globalSettings.colors?.secondary || '#0891b2'} 100%)` 
              }}
            >
              <p className="font-bold">כך נראה העיצוב שלך</p>
              <p className="text-sm opacity-90">העיצוב מתעדכן אוטומטית כשהמנהל משנה אותו</p>
            </div>
            
            <p className="text-sm text-gray-600">
              רוצה לוגו וצבעים משלך? לחץ על עיצוב מותאם אישית למעלה.
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
