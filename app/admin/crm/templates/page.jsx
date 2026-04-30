'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const CATEGORY_LABELS = {
  welcome: 'ברוכים הבאים',
  follow_up: 'מעקב',
  reminder: 'תזכורת',
  promotion: 'מבצע',
  thank_you: 'תודה',
  custom: 'מותאם אישית',
};

const CHANNEL_LABELS = {
  whatsapp: 'וואטסאפ',
  email: 'אימייל',
  sms: 'SMS',
  all: 'הכל',
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('למחוק תבנית זו?')) return;
    try {
      await fetch(`/api/crm/templates/${id}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
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
              תבניות הודעות
            </h1>
          </div>
          <button
            onClick={() => { setEditingTemplate(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            תבנית חדשה
          </button>
        </div>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8 text-gray-500">טוען...</div>
          ) : templates.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              אין תבניות. לחץ על תבנית חדשה כדי ליצור אחת.
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template._id}
                className="rounded-xl p-4 shadow-md"
                style={{
                  border: '2px solid transparent',
                  backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <div className="flex gap-1">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                      {CATEGORY_LABELS[template.category]}
                    </span>
                    <span className="text-xs px-2 py-1 bg-cyan-100 text-cyan-800 rounded">
                      {CHANNEL_LABELS[template.channel]}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-3 whitespace-pre-wrap">
                  {template.content}
                </p>
                
                {template.variables?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.variables.map((v) => (
                      <span key={v} className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>שימושים: {template.usageCount || 0}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingTemplate(template); setShowModal(true); }}
                      className="text-blue-600 hover:underline"
                    >
                      ערוך
                    </button>
                    <button
                      onClick={() => handleDelete(template._id)}
                      className="text-red-600 hover:underline"
                    >
                      מחק
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <TemplateModal
            template={editingTemplate}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              fetchTemplates();
            }}
          />
        )}
      </div>
    </main>
  );
}

function TemplateModal({ template, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: template?.name || '',
    category: template?.category || 'custom',
    channel: template?.channel || 'all',
    subject: template?.subject || '',
    content: template?.content || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const method = template ? 'PATCH' : 'POST';
      const url = template ? `/api/crm/templates/${template._id}` : '/api/crm/templates';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      
      if (res.ok) {
        onSuccess();
      } else {
        alert('שגיאה בשמירת התבנית');
      }
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4" style={{ color: '#1e3a8a' }}>
          {template ? 'עריכת תבנית' : 'תבנית חדשה'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם התבנית *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה</label>
              <select
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ערוץ</label>
              <select
                value={form.channel}
                onChange={(e) => setForm(f => ({ ...f, channel: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {form.channel === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">נושא (לאימייל)</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תוכן ההודעה *</label>
            <textarea
              required
              rows={6}
              value={form.content}
              onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="שלום {{name}}, תודה על פנייתך..."
            />
            <p className="text-xs text-gray-500 mt-1">
              השתמש ב-{`{{name}}`}, {`{{phone}}`}, {`{{email}}`} למשתנים דינמיים
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {saving ? 'שומר...' : 'שמור'}
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
