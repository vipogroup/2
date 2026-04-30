'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function BusinessBotManagerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const businessId = params.businessId;
  
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('texts');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/bot-config?ownerType=business&businessId=${businessId}`);
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && businessId) {
      fetchConfig();
    }
  }, [status, businessId, router, fetchConfig]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/bot-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerType: 'business',
          businessId,
          texts: config.texts,
          buttons: config.buttons,
          placeholders: config.placeholders,
          categories: config.categories,
          settings: config.settings
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'ההגדרות נשמרו בהצלחה!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה בשמירה' });
    } finally {
      setSaving(false);
    }
  };

  const updateText = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const updateCategory = (categoryId, field, value) => {
    setConfig(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId ? { ...cat, [field]: value } : cat
      )
    }));
  };

  const updateQuestion = (categoryId, questionId, field, value) => {
    setConfig(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              questions: cat.questions.map(q =>
                q.id === questionId ? { ...q, [field]: value } : q
              )
            }
          : cat
      )
    }));
  };

  const addCategory = async () => {
    try {
      const res = await fetch('/api/bot-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerType: 'business',
          businessId,
          action: 'addCategory',
          data: { name: 'קטגוריה חדשה' }
        })
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setMessage({ type: 'success', text: 'קטגוריה נוספה!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      }
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const addQuestion = async (categoryId) => {
    try {
      const res = await fetch('/api/bot-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerType: 'business',
          businessId,
          action: 'addQuestion',
          categoryId,
          data: { question: 'שאלה חדשה', answer: 'תשובה חדשה' }
        })
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setMessage({ type: 'success', text: 'שאלה נוספה!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      }
    } catch (error) {
      console.error('Error adding question:', error);
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!confirm('האם למחוק את הקטגוריה?')) return;
    try {
      const res = await fetch(`/api/bot-config?ownerType=business&businessId=${businessId}&action=deleteCategory&categoryId=${categoryId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setMessage({ type: 'success', text: 'הקטגוריה נמחקה!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const deleteQuestion = async (categoryId, questionId) => {
    if (!confirm('האם למחוק את השאלה?')) return;
    try {
      const res = await fetch(`/api/bot-config?ownerType=business&businessId=${businessId}&action=deleteQuestion&categoryId=${categoryId}&questionId=${questionId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setMessage({ type: 'success', text: 'השאלה נמחקה!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      }
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">לא נמצאה תצורת בוט</p>
      </div>
    );
  }

  const tabs = [
    { id: 'texts', label: 'טקסטים', icon: 'fa-font' },
    { id: 'categories', label: 'קטגוריות ושאלות', icon: 'fa-list' },
    { id: 'buttons', label: 'כפתורים', icon: 'fa-square' },
    { id: 'settings', label: 'הגדרות', icon: 'fa-cog' }
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href={`/business/${businessId}`} className="text-gray-500 hover:text-gray-700">
                <i className="fas fa-arrow-right"></i>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                  <i className="fas fa-robot text-white"></i>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">ניהול בוט צאט</h1>
                  <p className="text-sm text-gray-500">דשבורד עסק</p>
                </div>
              </div>
            </div>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-white font-medium transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  שומר...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  שמור שינויים
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg ${
          message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm p-2 mb-6 flex gap-2 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={activeTab === tab.id ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
            >
              <i className={`fas ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {/* Texts Tab */}
          {activeTab === 'texts' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">טקסטים כלליים</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">כותרת הבוט</label>
                  <input
                    type="text"
                    value={config.texts.title}
                    onChange={(e) => updateText('texts', 'title', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">תת-כותרת</label>
                  <input
                    type="text"
                    value={config.texts.subtitle}
                    onChange={(e) => updateText('texts', 'subtitle', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">הודעת פתיחה 1</label>
                  <input
                    type="text"
                    value={config.texts.welcome1}
                    onChange={(e) => updateText('texts', 'welcome1', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">הודעת פתיחה 2</label>
                  <input
                    type="text"
                    value={config.texts.welcome2}
                    onChange={(e) => updateText('texts', 'welcome2', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">הודעת סיום</label>
                  <input
                    type="text"
                    value={config.texts.goodbye}
                    onChange={(e) => updateText('texts', 'goodbye', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">לא נמצאה תשובה</label>
                  <input
                    type="text"
                    value={config.texts.noAnswer}
                    onChange={(e) => updateText('texts', 'noAnswer', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">הודעה נשלחה בהצלחה</label>
                  <input
                    type="text"
                    value={config.texts.sentSuccess}
                    onChange={(e) => updateText('texts', 'sentSuccess', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">שגיאה בשליחה</label>
                  <input
                    type="text"
                    value={config.texts.sendError}
                    onChange={(e) => updateText('texts', 'sendError', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">קטגוריות ושאלות</h2>
                <button
                  onClick={addCategory}
                  className="px-4 py-2 rounded-xl text-white font-medium transition-all hover:scale-105 flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                >
                  <i className="fas fa-plus"></i>
                  הוסף קטגוריה
                </button>
              </div>

              <div className="space-y-4">
                {config.categories.map((category) => (
                  <div key={category.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Category Header */}
                    <div
                      className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <i className={`fas fa-chevron-${expandedCategory === category.id ? 'up' : 'down'} text-gray-400`}></i>
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateCategory(category.id, 'name', e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-cyan-500 outline-none"
                        />
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={category.isActive}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateCategory(category.id, 'isActive', e.target.checked);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded"
                          />
                          פעיל
                        </label>
                        <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">
                          {category.questions.length} שאלות
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCategory(category.id);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>

                    {/* Questions */}
                    {expandedCategory === category.id && !category.isContact && (
                      <div className="p-4 space-y-4 bg-white">
                        {category.questions.map((question) => (
                          <div key={question.id} className="p-4 bg-gray-50 rounded-xl space-y-3">
                            <div className="flex items-start gap-3">
                              <span className="text-sm text-gray-400 mt-3">ש:</span>
                              <input
                                type="text"
                                value={question.question}
                                onChange={(e) => updateQuestion(category.id, question.id, 'question', e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-cyan-500 outline-none"
                                placeholder="שאלה"
                              />
                              <button
                                onClick={() => deleteQuestion(category.id, question.id)}
                                className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                            <div className="flex items-start gap-3">
                              <span className="text-sm text-gray-400 mt-3">ת:</span>
                              <textarea
                                value={question.answer}
                                onChange={(e) => updateQuestion(category.id, question.id, 'answer', e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-cyan-500 outline-none resize-none"
                                rows={2}
                                placeholder="תשובה"
                              />
                            </div>
                          </div>
                        ))}
                        
                        <button
                          onClick={() => addQuestion(category.id)}
                          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-cyan-500 hover:text-cyan-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <i className="fas fa-plus"></i>
                          הוסף שאלה
                        </button>
                      </div>
                    )}

                    {expandedCategory === category.id && category.isContact && (
                      <div className="p-4 bg-yellow-50 text-yellow-700 text-sm">
                        <i className="fas fa-info-circle ml-2"></i>
                        קטגוריית שיחה עם נציג - לחיצה על קטגוריה זו תפתח טופס יצירת קשר
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buttons Tab */}
          {activeTab === 'buttons' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">טקסטים של כפתורים</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">נושא אחר</label>
                  <input
                    type="text"
                    value={config.buttons.otherTopic}
                    onChange={(e) => updateText('buttons', 'otherTopic', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">שיחה עם נציג</label>
                  <input
                    type="text"
                    value={config.buttons.talkAgent}
                    onChange={(e) => updateText('buttons', 'talkAgent', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">זה הכל תודה</label>
                  <input
                    type="text"
                    value={config.buttons.thanks}
                    onChange={(e) => updateText('buttons', 'thanks', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">חזרה לנושאים</label>
                  <input
                    type="text"
                    value={config.buttons.backTopics}
                    onChange={(e) => updateText('buttons', 'backTopics', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">שלח</label>
                  <input
                    type="text"
                    value={config.buttons.send}
                    onChange={(e) => updateText('buttons', 'send', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ביטול</label>
                  <input
                    type="text"
                    value={config.buttons.cancel}
                    onChange={(e) => updateText('buttons', 'cancel', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                  />
                </div>
              </div>

              <h2 className="text-lg font-bold text-gray-800 mt-8 mb-4">Placeholders</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">כתוב הודעה</label>
                  <input
                    type="text"
                    value={config.placeholders.message}
                    onChange={(e) => updateText('placeholders', 'message', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">כתוב שאלה</label>
                  <input
                    type="text"
                    value={config.placeholders.question}
                    onChange={(e) => updateText('placeholders', 'question', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">הגדרות בוט</h2>
              
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={config.settings.isActive}
                    onChange={(e) => updateText('settings', 'isActive', e.target.checked)}
                    className="w-5 h-5 rounded text-cyan-600"
                  />
                  <div>
                    <span className="font-medium text-gray-800">בוט פעיל</span>
                    <p className="text-sm text-gray-500">הצג את הבוט באתר</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={config.settings.showOnAllPages}
                    onChange={(e) => updateText('settings', 'showOnAllPages', e.target.checked)}
                    className="w-5 h-5 rounded text-cyan-600"
                  />
                  <div>
                    <span className="font-medium text-gray-800">הצג בכל הדפים</span>
                    <p className="text-sm text-gray-500">הבוט יופיע בכל דפי האתר</p>
                  </div>
                </label>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-2">מיקום הבוט</label>
                  <select
                    value={config.settings.position}
                    onChange={(e) => updateText('settings', 'position', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 outline-none"
                  >
                    <option value="left">שמאל</option>
                    <option value="right">ימין</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
