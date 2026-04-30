'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminBrandingPage() {
  const embedded = false;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [presets, setPresets] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // צבעים נבחרים
  const [colors, setColors] = useState({
    primary: '#1e3a8a',
    secondary: '#0891b2',
    accent: '#6366f1',
  });
  const [selectedPreset, setSelectedPreset] = useState(null);

  // טעינת נתונים
  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/branding');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load');
      }
      
      const data = await res.json();
      setSettings(data.settings);
      setStats(data.stats);
      setPresets(data.presets || {});
      
      if (data.settings?.colors) {
        setColors(data.settings.colors);
      }
      if (data.settings?.presetId) {
        setSelectedPreset(data.settings.presetId);
      }
    } catch (error) {
      console.error('Error loading branding:', error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת הנתונים' });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // בחירת Preset
  const handlePresetSelect = (presetId) => {
    setSelectedPreset(presetId);
    if (presets[presetId]) {
      setColors(presets[presetId].colors);
    }
  };

  // שמירת שינויים
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      
      const body = selectedPreset 
        ? { presetId: selectedPreset }
        : { colors };
      
      const res = await fetch('/api/admin/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'העיצוב עודכן בהצלחה! הדף יתרענן...' });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'שגיאה בשמירה' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה בשמירה' });
    } finally {
      setSaving(false);
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
    <main className={embedded ? 'bg-white p-3' : 'min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 md:p-6 lg:p-8'}>
      <div className={embedded ? 'w-full' : 'max-w-6xl mx-auto'}>
        
        {/* Header */}
        {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link 
              href="/admin" 
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
                ניהול עיצוב וצבעים
              </h1>
              <p className="text-gray-600 text-sm">שנה את העיצוב הגלובלי של המערכת</p>
            </div>
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50"
            style={{ background: previewGradient }}
          >
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
        </div>
        )}

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

        {/* סטטיסטיקות */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-md border-r-4" style={{ borderColor: colors.primary }}>
              <p className="text-sm text-gray-500">סה״כ עסקים</p>
              <p className="text-2xl font-bold" style={{ color: colors.primary }}>{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md border-r-4" style={{ borderColor: colors.secondary }}>
              <p className="text-sm text-gray-500">משתמשים בעיצוב גלובלי</p>
              <p className="text-2xl font-bold" style={{ color: colors.secondary }}>{stats.usingGlobal}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md border-r-4 border-cyan-500">
              <p className="text-sm text-gray-500">עיצוב מותאם אישית</p>
              <p className="text-2xl font-bold text-cyan-600">{stats.customized}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* בחירת Preset */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.primary }}>
              ערכות עיצוב מוכנות
            </h2>
            <p className="text-gray-600 text-sm mb-4">בחר ערכה מוכנה או התאם ידנית</p>
            
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(presets).map(([id, preset]) => (
                <button
                  key={id}
                  onClick={() => handlePresetSelect(id)}
                  className={`p-3 rounded-xl border-2 transition-all text-right ${
                    selectedPreset === id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div 
                    className="h-8 rounded-lg mb-2"
                    style={{ 
                      background: `linear-gradient(135deg, ${preset.colors.primary} 0%, ${preset.colors.secondary} 100%)` 
                    }}
                  />
                  <p className="font-medium text-sm">{preset.name}</p>
                </button>
              ))}
              
              {/* Custom */}
              <button
                onClick={() => setSelectedPreset(null)}
                className={`p-3 rounded-xl border-2 transition-all text-right ${
                  selectedPreset === null 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="h-8 rounded-lg mb-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="font-medium text-sm">התאמה ידנית</p>
              </button>
            </div>
          </div>

          {/* בחירת צבעים ידנית */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.primary }}>
              התאמת צבעים
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              {selectedPreset ? 'לחץ "התאמה ידנית" כדי לערוך' : 'בחר צבעים מותאמים אישית'}
            </p>
            
            <div className="space-y-4">
              {/* צבע ראשי */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  צבע ראשי (Primary)
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={colors.primary}
                    onChange={(e) => {
                      setSelectedPreset(null);
                      setColors(prev => ({ ...prev, primary: e.target.value }));
                    }}
                    className="w-16 h-10 rounded-lg cursor-pointer border-2 border-gray-200"
                  />
                  <input
                    type="text"
                    value={colors.primary}
                    onChange={(e) => {
                      setSelectedPreset(null);
                      setColors(prev => ({ ...prev, primary: e.target.value }));
                    }}
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg font-mono text-sm"
                  />
                </div>
              </div>

              {/* צבע משני */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  צבע משני (Secondary)
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={colors.secondary}
                    onChange={(e) => {
                      setSelectedPreset(null);
                      setColors(prev => ({ ...prev, secondary: e.target.value }));
                    }}
                    className="w-16 h-10 rounded-lg cursor-pointer border-2 border-gray-200"
                  />
                  <input
                    type="text"
                    value={colors.secondary}
                    onChange={(e) => {
                      setSelectedPreset(null);
                      setColors(prev => ({ ...prev, secondary: e.target.value }));
                    }}
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg font-mono text-sm"
                  />
                </div>
              </div>

              {/* צבע הדגשה */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  צבע הדגשה (Accent)
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={colors.accent}
                    onChange={(e) => {
                      setSelectedPreset(null);
                      setColors(prev => ({ ...prev, accent: e.target.value }));
                    }}
                    className="w-16 h-10 rounded-lg cursor-pointer border-2 border-gray-200"
                  />
                  <input
                    type="text"
                    value={colors.accent}
                    onChange={(e) => {
                      setSelectedPreset(null);
                      setColors(prev => ({ ...prev, accent: e.target.value }));
                    }}
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* צבעי סטטוס - קבועים */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">צבעי סטטוס (קבועים)</h3>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-xs text-green-700">הצלחה</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 rounded-lg">
                  <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                  <span className="text-xs text-yellow-700">התראה</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span className="text-xs text-red-700">שגיאה</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* תצוגה מקדימה */}
        <div className="mt-6 bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.primary }}>
            תצוגה מקדימה
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* כפתור ראשי */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-2">כפתור ראשי</p>
              <button
                className="w-full px-4 py-3 text-white font-bold rounded-xl"
                style={{ background: previewGradient }}
              >
                לחץ כאן
              </button>
            </div>
            
            {/* כותרת */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-2">כותרת</p>
              <h3 
                className="text-2xl font-bold"
                style={{
                  background: previewGradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                כותרת לדוגמה
              </h3>
            </div>
            
            {/* כרטיס */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-2">כרטיס עם מסגרת</p>
              <div 
                className="p-4 bg-white rounded-xl"
                style={{
                  border: '2px solid transparent',
                  backgroundImage: `linear-gradient(white, white), ${previewGradient}`,
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                }}
              >
                <p className="font-medium">תוכן הכרטיס</p>
              </div>
            </div>
            
            {/* Header */}
            <div className="p-4 bg-gray-50 rounded-xl md:col-span-2 lg:col-span-3">
              <p className="text-sm text-gray-500 mb-2">Header</p>
              <div 
                className="p-4 rounded-xl text-white"
                style={{ background: previewGradient }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg">VIPO</span>
                  <div className="flex gap-4">
                    <span>ראשי</span>
                    <span>מוצרים</span>
                    <span>אודות</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
