'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const TRIGGER_LABELS = {
  lead_created: 'ליד חדש נוצר',
  lead_status_change: 'שינוי סטטוס ליד',
  no_contact: 'אין קשר (ימים)',
  task_due: 'משימה מתקרבת',
  order_created: 'הזמנה חדשה',
  custom: 'מותאם אישית',
};

const ACTION_LABELS = {
  send_message: 'שלח הודעה',
  create_task: 'צור משימה',
  update_lead: 'עדכן ליד',
  notify_user: 'שלח התראה',
  webhook: 'Webhook',
};

export default function AutomationsPage() {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm/automations');
      const data = await res.json();
      setAutomations(data.automations || []);
    } catch (error) {
      console.error('Error fetching automations:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await fetch(`/api/crm/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchAutomations();
    } catch (error) {
      console.error('Error toggling automation:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('למחוק אוטומציה זו?')) return;
    try {
      await fetch(`/api/crm/automations/${id}`, { method: 'DELETE' });
      fetchAutomations();
    } catch (error) {
      console.error('Error deleting automation:', error);
    }
  };

  return (
    <main className="min-h-screen bg-white p-3 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/crm" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <h1
              className="text-xl sm:text-2xl md:text-3xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              אוטומציות
            </h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            אוטומציה חדשה
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-6 h-6 text-cyan-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-cyan-800">
            <strong>אוטומציות</strong> מאפשרות לך להפעיל פעולות אוטומטיות בתגובה לאירועים במערכת.
            לדוגמה: שליחת הודעת ברוכים הבאים כשליד חדש נוצר, או יצירת משימת מעקב אחרי 3 ימים ללא קשר.
          </div>
        </div>

        {/* Automations List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">טוען...</div>
          ) : automations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              אין אוטומציות. לחץ על אוטומציה חדשה כדי ליצור אחת.
            </div>
          ) : (
            automations.map((auto) => (
              <div
                key={auto._id}
                className="rounded-xl p-4 shadow-md"
                style={{
                  border: '2px solid transparent',
                  backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                  opacity: auto.isActive ? 1 : 0.6,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleActive(auto._id, auto.isActive)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        auto.isActive ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                          auto.isActive ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900">{auto.name}</h3>
                      {auto.description && (
                        <p className="text-sm text-gray-500">{auto.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500">
                      הופעל {auto.executionCount || 0} פעמים
                    </div>
                    <button
                      onClick={() => handleDelete(auto._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Flow visualization */}
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg">
                    {TRIGGER_LABELS[auto.trigger?.type] || auto.trigger?.type}
                  </span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  {auto.delayMinutes > 0 && (
                    <>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg">
                        המתן {auto.delayMinutes} דקות
                      </span>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg">
                    {ACTION_LABELS[auto.action?.type] || auto.action?.type}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <AutomationModal
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              fetchAutomations();
            }}
          />
        )}
      </div>
    </main>
  );
}

function AutomationModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    triggerType: 'lead_created',
    actionType: 'create_task',
    delayMinutes: 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const res = await fetch('/api/crm/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          trigger: { type: form.triggerType },
          action: { type: form.actionType },
          delayMinutes: parseInt(form.delayMinutes) || 0,
        }),
      });
      
      if (res.ok) {
        onSuccess();
      } else {
        alert('שגיאה ביצירת האוטומציה');
      }
    } catch (error) {
      console.error('Error creating automation:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4" style={{ color: '#1e3a8a' }}>
          אוטומציה חדשה
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="מעקב אחרי ליד חדש"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">טריגר (מה מפעיל)</label>
            <select
              value={form.triggerType}
              onChange={(e) => setForm(f => ({ ...f, triggerType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">השהייה (דקות)</label>
            <input
              type="number"
              min="0"
              value={form.delayMinutes}
              onChange={(e) => setForm(f => ({ ...f, delayMinutes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">פעולה</label>
            <select
              value={form.actionType}
              onChange={(e) => setForm(f => ({ ...f, actionType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {saving ? 'שומר...' : 'צור אוטומציה'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
