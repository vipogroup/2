'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const STATUS_LABELS = {
  pending: 'ממתינה',
  paused: 'מושהית',
  completed: 'הושלם',
  cancelled: 'בוטל',
};

const RECURRENCE_LABELS = {
  none: 'ללא חזרה',
  daily: 'יומי',
  weekly: 'שבועי',
  interval: 'חוזר',
};

const TEMPLATE_HEBREW_NAMES = {
  welcome_user: 'ברוכים הבאים',
  admin_new_registration: 'הרשמה חדשה למנהל',
  order_confirmation: 'אישור הזמנה',
  agent_commission_awarded: 'עמלה לסוכן',
  admin_agent_sale: 'מכירה דרך סוכן',
  admin_payment_completed: 'תשלום הושלם',
  order_new: 'הזמנה חדשה',
  agent_daily_digest: 'דוח יומי לסוכן',
  product_new_release: 'מוצר חדש',
  group_buy_weekly_reminder: 'תזכורת קנייה קבוצתית',
  group_buy_last_call: 'קריאה אחרונה',
  group_buy_closed: 'קנייה קבוצתית נסגרה',
};

function formatDateTime(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function TemplateBadge({ template }) {
  const enabled = template.enabled !== false;
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide',
        enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600',
      )}
    >
      {enabled ? (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}
      <span>{template.type}</span>
    </span>
  );
}

function AudienceChips({ audience = [] }) {
  const normalized = Array.isArray(audience) ? audience : [];
  if (!normalized.length) return <span className="text-xs text-gray-400">ברירת מחדל</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {normalized.map((item) => (
        <span
          key={item}
          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function VariablesList({ variables = [] }) {
  if (!variables.length) {
    return <span className="text-xs text-gray-400">ללא משתנים דינמיים</span>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {variables.map((variable) => (
        <span
          key={variable}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 py-1 text-[11px] text-slate-600"
        >
          {'{'}
          {variable}
          {'}'}
        </span>
      ))}
    </div>
  );
}

function StatusPill({ status }) {
  const baseClass = 'rounded-full px-3 py-1 text-xs font-semibold';
  switch (status) {
    case 'pending':
      return <span className={`${baseClass} bg-blue-100 text-blue-700`}>ממתינה</span>;
    case 'paused':
      return <span className={`${baseClass} bg-yellow-100 text-yellow-700`}>מושהית</span>;
    case 'completed':
      return <span className={`${baseClass} bg-emerald-100 text-emerald-700`}>הושלם</span>;
    case 'cancelled':
      return <span className={`${baseClass} bg-rose-100 text-rose-700`}>בוטל</span>;
    default:
      return <span className={`${baseClass} bg-gray-100 text-gray-600`}>{status || '-'}</span>;
  }
}

const initialScheduleForm = {
  templateType: '',
  scheduleAt: '',
  timezone: 'Asia/Jerusalem',
  recurrence: {
    type: 'none',
    every: 1,
    unit: 'day',
  },
  audience: [],
  payloadOverrides: {
    title: '',
    body: '',
    tags: [],
    userIds: [],
    url: '',
  },
  metadata: {},
};

export default function NotificationsManagerClient({ embedded = false }) {
  const pathname = usePathname();
  const basePath = pathname?.startsWith('/business') ? '/business' : '/admin';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [scheduled, setScheduled] = useState([]);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(initialScheduleForm);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [tab, setTab] = useState('templates');
  const [subTab, setSubTab] = useState('edit');
  const [quickScheduleDate, setQuickScheduleDate] = useState('');
  const [quickScheduleTime, setQuickScheduleTime] = useState('');
  const [schedulingQuick, setSchedulingQuick] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [sendingLive, setSendingLive] = useState(false);
  const [liveResult, setLiveResult] = useState(null);
  const [newTemplateFormOpen, setNewTemplateFormOpen] = useState(false);
  const [newTemplateForm, setNewTemplateForm] = useState({ type: '', name: '', title: '', body: '' });
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const templateMap = useMemo(() => {
    const map = new Map();
    templates.forEach((tpl) => map.set(tpl.type, tpl));
    return map;
  }, [templates]);

  const selectedTemplateData = useMemo(() => {
    if (!selectedTemplate) return null;
    return templateMap.get(selectedTemplate) || null;
  }, [selectedTemplate, templateMap]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/notifications', { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_load');
      }
      const data = await res.json();
      setTemplates(data.templates || []);
      setScheduled(data.scheduled || []);
      if (!selectedTemplate && data.templates?.length) {
        setSelectedTemplate(data.templates[0].type);
      }
    } catch (err) {
      console.error('load_notifications_error', err);
      setError(err.message || 'load_failed');
    } finally {
      setLoading(false);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTemplateSelect = useCallback((type) => {
    setSelectedTemplate(type);
  }, []);

  const handleTemplateFieldChange = useCallback((field, value) => {
    setTemplates((prev) =>
      prev.map((tpl) => (tpl.type === selectedTemplate ? { ...tpl, [field]: value } : tpl)),
    );
  }, [selectedTemplate]);

  const handleTemplateAudienceChange = useCallback((value) => {
    setTemplates((prev) =>
      prev.map((tpl) => (tpl.type === selectedTemplate ? { ...tpl, audience: value } : tpl)),
    );
  }, [selectedTemplate]);

  const handleTemplateVariablesChange = useCallback((value) => {
    setTemplates((prev) =>
      prev.map((tpl) => (tpl.type === selectedTemplate ? { ...tpl, variables: value } : tpl)),
    );
  }, [selectedTemplate]);

  const handleTemplateEnabledToggle = useCallback((value) => {
    setTemplates((prev) =>
      prev.map((tpl) =>
        tpl.type === selectedTemplate
          ? {
              ...tpl,
              enabled: value,
            }
          : tpl,
      ),
    );
  }, [selectedTemplate]);

  const saveTemplate = useCallback(async () => {
    if (!selectedTemplateData) return;
    setSavingTemplate(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/notifications/${encodeURIComponent(selectedTemplateData.type)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedTemplateData.name,
          title: selectedTemplateData.title,
          body: selectedTemplateData.body,
          description: selectedTemplateData.description,
          audience: selectedTemplateData.audience,
          variables: selectedTemplateData.variables,
          enabled: selectedTemplateData.enabled,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_save_template');
      }
      await loadData();
    } catch (err) {
      console.error('save_template_error', err);
      setError(err.message || 'save_failed');
    } finally {
      setSavingTemplate(false);
    }
  }, [selectedTemplateData, loadData]);

  const resetScheduleForm = useCallback(() => {
    setScheduleForm(initialScheduleForm);
  }, []);

  const openScheduleForm = useCallback(() => {
    setScheduleForm((prev) => ({
      ...initialScheduleForm,
      templateType: selectedTemplate || prev.templateType,
    }));
    setScheduleFormOpen(true);
  }, [selectedTemplate]);

  const closeScheduleForm = useCallback(() => {
    setScheduleFormOpen(false);
  }, []);

  const handleScheduleFieldChange = useCallback((path, value) => {
    setScheduleForm((prev) => {
      const next = structuredClone(prev);
      const segments = Array.isArray(path) ? path : String(path).split('.');
      let ref = next;
      for (let i = 0; i < segments.length - 1; i += 1) {
        const key = segments[i];
        ref[key] = ref[key] || {};
        ref = ref[key];
      }
      ref[segments[segments.length - 1]] = value;
      return next;
    });
  }, []);

  const saveSchedule = useCallback(async () => {
    setSavingSchedule(true);
    setError('');
    try {
      const payload = {
        templateType: scheduleForm.templateType,
        scheduleAt: scheduleForm.scheduleAt,
        recurrence:
          scheduleForm.recurrence?.type && scheduleForm.recurrence.type !== 'none'
            ? scheduleForm.recurrence
            : null,
        audience: scheduleForm.audience,
        timezone: scheduleForm.timezone,
        payloadOverrides: scheduleForm.payloadOverrides,
        metadata: scheduleForm.metadata,
      };

      const res = await fetch('/api/admin/notifications/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
 
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_schedule');
      }

      await loadData();
      resetScheduleForm();
      closeScheduleForm();
    } catch (err) {
      console.error('save_schedule_error', err);
      setError(err.message || 'schedule_failed');
    } finally {
      setSavingSchedule(false);
    }
  }, [scheduleForm, loadData, resetScheduleForm, closeScheduleForm]);

  const handleQuickSchedule = useCallback(async () => {
    if (!selectedTemplate || !quickScheduleDate || !quickScheduleTime) {
      setError('יש לבחור תאריך ושעה');
      return;
    }
    setSchedulingQuick(true);
    setError('');
    try {
      const scheduleAt = new Date(`${quickScheduleDate}T${quickScheduleTime}`);
      if (Number.isNaN(scheduleAt.getTime())) {
        throw new Error('תאריך או שעה לא תקינים');
      }
      const payload = {
        templateType: selectedTemplate,
        scheduleAt: scheduleAt.toISOString(),
        timezone: 'Asia/Jerusalem',
        audience: selectedTemplateData?.audience || [],
      };
      const res = await fetch('/api/admin/notifications/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_schedule');
      }
      setQuickScheduleDate('');
      setQuickScheduleTime('');
      await loadData();
      setTab('scheduled');
    } catch (err) {
      console.error('quick_schedule_error', err);
      setError(err.message || 'schedule_failed');
    } finally {
      setSchedulingQuick(false);
    }
  }, [selectedTemplate, selectedTemplateData, quickScheduleDate, quickScheduleTime, loadData]);

  const handleSendTestNotification = useCallback(async () => {
    setSendingTest(true);
    setTestResult(null);
    setError('');
    try {
      // Get title and body from preview (with overrides if set)
      const titleOverride = scheduleForm.payloadOverrides?.titleOverride;
      const bodyAppend = scheduleForm.payloadOverrides?.bodyAppend;
      const finalTitle = titleOverride || selectedTemplateData?.title;
      const finalBody = bodyAppend
        ? `${selectedTemplateData?.body || ''}\n\n${bodyAppend}`
        : selectedTemplateData?.body;

      const res = await fetch('/api/push/send-test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          body: finalBody,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const errorMsg = data.hint ? `${data.error}\n${data.hint}` : data.error;
        throw new Error(errorMsg || 'failed_to_send_test');
      }
      setTestResult({ success: true, message: data.message || `נשלחו ${data.sent} התראות בהצלחה!` });
    } catch (err) {
      console.error('test_notification_error', err);
      setTestResult({ success: false, message: err.message || 'שגיאה בשליחת התראת בדיקה' });
    } finally {
      setSendingTest(false);
    }
  }, [selectedTemplateData, scheduleForm.payloadOverrides]);

  const handleSendLiveNotification = useCallback(async () => {
    if (!selectedTemplateData) return;
    setSendingLive(true);
    setLiveResult(null);
    setError('');
    try {
      const titleOverride = scheduleForm.payloadOverrides?.titleOverride;
      const bodyAppend = scheduleForm.payloadOverrides?.bodyAppend;
      const combinedBody = bodyAppend
        ? `${selectedTemplateData.body || ''}\n\n${bodyAppend}`
        : selectedTemplateData.body;
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: selectedTemplateData.type || selectedTemplate,
          variables: {},
          audienceRoles:
            Array.isArray(selectedTemplateData.audience) && selectedTemplateData.audience.length
              ? selectedTemplateData.audience
              : ['all'],
          payloadOverrides: {
            title: titleOverride || selectedTemplateData.title,
            body: combinedBody,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'failed_to_send_notification');
      }

      const deliveries = data.result?.deliveries || [];
      const totalDelivered = deliveries.reduce((sum, delivery) => sum + (delivery.count || 0), 0);
      const breakdown = deliveries
        .filter((delivery) => delivery.count !== undefined)
        .map((delivery) => `${delivery.channel}: ${delivery.count}`)
        .join(' · ');

      setLiveResult({
        success: true,
        message:
          totalDelivered > 0
            ? `נשלחו ${totalDelivered} התראות${breakdown ? ` (${breakdown})` : ''}`
            : 'הבקשה נשלחה (לא אותרו מכשירים מחוברים)',
      });
    } catch (err) {
      console.error('live_notification_error', err);
      setLiveResult({ success: false, message: err.message || 'שגיאה בשליחת התראה' });
    } finally {
      setSendingLive(false);
    }
  }, [selectedTemplateData, selectedTemplate, scheduleForm.payloadOverrides?.titleOverride, scheduleForm.payloadOverrides?.bodyAppend]);

  const handleCreateTemplate = useCallback(async () => {
    if (!newTemplateForm.type.trim()) {
      setError('יש להזין מזהה לתבנית');
      return;
    }
    setCreatingTemplate(true);
    setError('');
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newTemplateForm.type.trim(),
          name: newTemplateForm.name.trim() || newTemplateForm.type.trim(),
          title: newTemplateForm.title.trim(),
          body: newTemplateForm.body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error === 'template_already_exists' ? 'תבנית עם מזהה זה כבר קיימת' : data.error || 'שגיאה ביצירת תבנית');
      }
      setNewTemplateForm({ type: '', name: '', title: '', body: '' });
      setNewTemplateFormOpen(false);
      await loadData();
      setSelectedTemplate(data.template?.type);
    } catch (err) {
      console.error('create_template_error', err);
      setError(err.message || 'שגיאה ביצירת תבנית');
    } finally {
      setCreatingTemplate(false);
    }
  }, [newTemplateForm, loadData]);

  const availableTemplates = templates;

  return (
    <div className={embedded ? 'bg-gray-50' : 'min-h-screen bg-gray-50'}>
      <div className={embedded ? 'px-3 sm:px-6 py-4' : 'mx-auto max-w-6xl px-3 sm:px-6 py-6 sm:py-10'}>
        {!embedded && (
        <header className="flex flex-col gap-3 sm:gap-4 pb-6 sm:pb-8">
          <div className="flex items-start sm:items-center justify-between">
            <div className="flex items-start sm:items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">ניהול התראות מערכת</h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  עריכת תבניות הודעה, תזמון שליחות והתראות על מצב מערכת VIPO
                </p>
              </div>
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
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setTab('templates')}
              className={classNames(
                'rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all',
                tab === 'templates'
                  ? 'text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300',
              )}
              style={tab === 'templates' ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
            >
              תבניות התראה
            </button>
            <button
              type="button"
              onClick={() => setTab('scheduled')}
              className={classNames(
                'rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all',
                tab === 'scheduled'
                  ? 'text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300',
              )}
              style={tab === 'scheduled' ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
            >
              שליחות מתוזמנות
            </button>
            <button
              type="button"
              onClick={() => setNewTemplateFormOpen(true)}
              className="rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                תבנית חדשה
              </span>
            </button>
          </div>
        </header>
        )}

        {/* New Template Modal */}
        {newTemplateFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3
                className="text-xl font-bold mb-6"
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                יצירת תבנית חדשה
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">מזהה תבנית (באנגלית)</label>
                  <input
                    type="text"
                    value={newTemplateForm.type}
                    onChange={(e) => setNewTemplateForm({ ...newTemplateForm, type: e.target.value })}
                    placeholder="my_custom_notification"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">שם התבנית (לתצוגה)</label>
                  <input
                    type="text"
                    value={newTemplateForm.name}
                    onChange={(e) => setNewTemplateForm({ ...newTemplateForm, name: e.target.value })}
                    placeholder="הודעה מותאמת אישית"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">כותרת ההתראה</label>
                  <input
                    type="text"
                    value={newTemplateForm.title}
                    onChange={(e) => setNewTemplateForm({ ...newTemplateForm, title: e.target.value })}
                    placeholder="כותרת ההודעה"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">תוכן ההודעה</label>
                  <textarea
                    value={newTemplateForm.body}
                    onChange={(e) => setNewTemplateForm({ ...newTemplateForm, body: e.target.value })}
                    placeholder="תוכן ההודעה..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTemplateFormOpen(false);
                      setNewTemplateForm({ type: '', name: '', title: '', body: '' });
                    }}
                    className="px-4 py-2 border-2 rounded-lg font-medium transition-all"
                    style={{ borderColor: '#e5e7eb' }}
                  >
                    ביטול
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateTemplate}
                    disabled={creatingTemplate}
                    className="px-4 py-2 text-white rounded-lg font-medium transition-all shadow-md disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                  >
                    {creatingTemplate ? 'יוצר...' : 'צור תבנית'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
            שגיאה: {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-lg">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            <p className="text-sm text-gray-600">טוען נתוני תבניות ותזמונים...</p>
          </div>
        ) : (
          <div className="space-y-10">
            {tab === 'templates' && selectedTemplateData && (
              <section className="space-y-6">
                {/* Template Selector */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <h2 className="text-base sm:text-lg font-bold text-gray-900">בחר תבנית</h2>
                    </div>
                    <TemplateBadge template={selectedTemplateData} />
                  </div>
                  <div className="relative">
                    <select
                      value={selectedTemplate || ''}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                      className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base font-semibold text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all appearance-none cursor-pointer"
                    >
                      {availableTemplates.map((tpl) => (
                        <option key={tpl.type} value={tpl.type}>
                          {tpl.type} ({tpl.name || TEMPLATE_HEBREW_NAMES[tpl.type] || tpl.type})
                        </option>
                      ))}
                    </select>
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {selectedTemplateData?.description && (
                    <div className="mt-3 sm:mt-4 rounded-lg bg-blue-50 border border-blue-200 p-2.5 sm:p-3">
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{selectedTemplateData.description}</p>
                    </div>
                  )}
                </div>

                {/* Sub Tabs */}
                <div className="flex gap-1 sm:gap-2 border-b border-gray-200 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setSubTab('edit')}
                    className={classNames(
                      'px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap',
                      subTab === 'edit'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      עריכת תוכן
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab('schedule')}
                    className={classNames(
                      'px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap',
                      subTab === 'schedule'
                        ? 'text-emerald-600 border-b-2 border-emerald-600'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      תזמון
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab('preview')}
                    className={classNames(
                      'px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap',
                      subTab === 'preview'
                        ? 'text-cyan-600 border-b-2 border-cyan-600'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      תצוגה מקדימה
                    </div>
                  </button>
                </div>

                {/* Content Based on Sub Tab */}
                {subTab === 'edit' && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
                      <div className="flex flex-col lg:flex-row lg:flex-wrap items-start gap-4">
                        <div className="w-full lg:flex-1 space-y-4 sm:space-y-5">
                          <div>
                            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2">
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              שם התבנית (לתצוגה)
                            </label>
                            <input
                              type="text"
                              value={selectedTemplateData.name || TEMPLATE_HEBREW_NAMES[selectedTemplateData.type] || ''}
                              onChange={(e) => handleTemplateFieldChange('name', e.target.value)}
                              placeholder={TEMPLATE_HEBREW_NAMES[selectedTemplateData.type] || selectedTemplateData.type}
                              className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2">
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              כותרת ההתראה
                            </label>
                            <input
                              type="text"
                              value={selectedTemplateData.title || ''}
                              onChange={(e) => handleTemplateFieldChange('title', e.target.value)}
                              className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2">
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                              </svg>
                              תוכן ההודעה
                            </label>
                            <textarea
                              value={selectedTemplateData.body || ''}
                              onChange={(e) => handleTemplateFieldChange('body', e.target.value)}
                              rows={4}
                              className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                            />
                          </div>
                        </div>
                        <div className="w-full lg:max-w-[240px] space-y-3 sm:space-y-4 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 p-4 sm:p-5 text-xs sm:text-sm">
                          <div className="flex items-center gap-1.5 sm:gap-2 border-b border-cyan-200 pb-2">
                            <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm sm:text-base font-bold text-gray-900">פרטי תבנית</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">מצב תבנית</p>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-800 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedTemplateData.enabled !== false}
                                onChange={(e) => handleTemplateEnabledToggle(e.target.checked)}
                              />
                              פעילה לשליחה
                            </label>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-700 mb-2">קהל יעד</p>
                            <AudienceChips audience={selectedTemplateData.audience} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-700 mb-2">משתנים</p>
                            <VariablesList variables={selectedTemplateData.variables} />
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 space-y-4 border-t border-gray-200 pt-4">
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span>קהל יעד מותאם:</span>
                            <div className="flex items-center gap-3">
                              {[
                                { value: 'customer', label: 'לקוחות' },
                                { value: 'agent', label: 'סוכנים' },
                                { value: 'admin', label: 'מנהלים' },
                              ].map((option) => (
                                <label
                                  key={option.value}
                                  className="inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(selectedTemplateData.audience || []).includes(option.value)}
                                    onChange={(e) => {
                                      const current = selectedTemplateData.audience || [];
                                      if (e.target.checked) {
                                        handleTemplateAudienceChange([...current, option.value]);
                                      } else {
                                        handleTemplateAudienceChange(current.filter((v) => v !== option.value));
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                                  />
                                  <span className="text-gray-700">{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span>משתנים דינמיים:</span>
                            <div className="flex flex-wrap items-center gap-2">
                              {[
                                { value: 'order_id', label: 'מזהה הזמנה' },
                                { value: 'customer_name', label: 'שם לקוח' },
                                { value: 'total_amount', label: 'סכום' },
                                { value: 'product_name', label: 'שם מוצר' },
                                { value: 'product_url', label: 'קישור מוצר' },
                                { value: 'agent_name', label: 'שם סוכן' },
                                { value: 'commission_percent', label: 'אחוז עמלה' },
                                { value: 'datetime', label: 'תאריך ושעה' },
                                { value: 'user_type', label: 'סוג משתמש' },
                              ].map((option) => (
                                <label
                                  key={option.value}
                                  className="inline-flex items-center gap-1 cursor-pointer bg-gray-100 rounded px-2 py-1 hover:bg-gray-200 border border-gray-200"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(selectedTemplateData.variables || []).includes(option.value)}
                                    onChange={(e) => {
                                      const current = selectedTemplateData.variables || [];
                                      if (e.target.checked) {
                                        handleTemplateVariablesChange([...current, option.value]);
                                      } else {
                                        handleTemplateVariablesChange(current.filter((v) => v !== option.value));
                                      }
                                    }}
                                    className="w-3 h-3 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                                  />
                                  <span className="text-gray-600 text-[10px]">{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-center sm:justify-end gap-2 sm:gap-3">
                          <button
                            type="button"
                            onClick={saveTemplate}
                            disabled={savingTemplate}
                            className={classNames(
                              'rounded-xl px-6 py-2.5 sm:px-4 sm:py-2 text-sm font-semibold transition-all w-full sm:w-auto',
                              savingTemplate
                                ? 'bg-gray-300 text-gray-500 cursor-wait'
                                : 'text-white shadow-lg hover:scale-[1.01]',
                            )}
                            style={!savingTemplate ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
                          >
                            {savingTemplate ? 'שומר...' : 'שמור תבנית'}
                          </button>
                          <button
                            type="button"
                            onClick={handleSendTestNotification}
                            disabled={sendingTest}
                            className={classNames(
                              'rounded-xl px-6 py-2.5 sm:px-4 sm:py-2 text-sm font-semibold transition-all w-full sm:w-auto flex items-center justify-center gap-2',
                              sendingTest
                                ? 'bg-gray-300 text-gray-500 cursor-wait'
                                : 'text-white shadow-lg hover:scale-[1.01]',
                            )}
                            style={!sendingTest ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
                          >
                            {sendingTest ? (
                              <>
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                שולח בדיקה...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                שלח בדיקה
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleSendLiveNotification}
                            disabled={sendingLive}
                            className={classNames(
                              'rounded-xl px-6 py-2.5 sm:px-4 sm:py-2 text-sm font-semibold transition-all w-full sm:w-auto flex items-center justify-center gap-2',
                              sendingLive
                                ? 'bg-gray-300 text-gray-500 cursor-wait'
                                : 'text-white shadow-lg hover:scale-[1.01]',
                            )}
                            style={!sendingLive ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
                          >
                            {sendingLive ? (
                              <>
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                שולח לכולם...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-18 4v5a2 2 0 002 2h14a2 2 0 002-2v-5" />
                                </svg>
                                שלח לקהל היעד
                              </>
                            )}
                          </button>
                        </div>
                        {/* Results in edit tab */}
                        {(testResult || liveResult) && (
                          <div className="mt-4 space-y-2">
                            {testResult && (
                              <div className={classNames(
                                'p-3 rounded-lg text-sm text-center',
                                testResult.success
                                  ? 'bg-green-100 text-green-700 border border-green-200'
                                  : 'bg-red-100 text-red-700 border border-red-200'
                              )}>
                                {testResult.message}
                              </div>
                            )}
                            {liveResult && (
                              <div className={classNames(
                                'p-3 rounded-lg text-sm text-center',
                                liveResult.success
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  : 'bg-red-100 text-red-700 border border-red-200'
                              )}>
                                {liveResult.message}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Schedule Tab */}
                {subTab === 'schedule' && (
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-900">תזמון שליחה:</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <label className="text-xs text-gray-600 whitespace-nowrap">תאריך:</label>
                        <input
                          type="date"
                          value={quickScheduleDate}
                          onChange={(e) => setQuickScheduleDate(e.target.value)}
                          className="flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 sm:px-3 text-xs sm:text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <label className="text-xs text-gray-600 whitespace-nowrap">שעה:</label>
                        <input
                          type="time"
                          value={quickScheduleTime}
                          onChange={(e) => setQuickScheduleTime(e.target.value)}
                          className="flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 sm:px-3 text-xs sm:text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleQuickSchedule}
                        disabled={schedulingQuick || !quickScheduleDate || !quickScheduleTime}
                        className={classNames(
                          'rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all w-full sm:w-auto',
                          schedulingQuick || !quickScheduleDate || !quickScheduleTime
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg hover:scale-[1.02]',
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {schedulingQuick ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                          {schedulingQuick ? 'מתזמן...' : 'תזמן שליחה'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Preview Tab */}
                {subTab === 'preview' && (
                  <div className="rounded-2xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4 border-b border-cyan-200 pb-2 sm:pb-3">
                      <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <h3 className="text-sm sm:text-base font-bold text-gray-900">תצוגה מקדימה - כך ההתראה תיראה</h3>
                    </div>
                    <div className="mx-auto max-w-sm">
                      <div className="rounded-2xl border border-gray-300 bg-white p-3 sm:p-4 shadow-xl">
                        <div className="flex items-start gap-2.5 sm:gap-3">
                          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">VIPO</p>
                            <p className="text-xs sm:text-sm font-bold text-gray-900 mb-0.5 sm:mb-1 line-clamp-2">{selectedTemplateData?.title || 'כותרת ההתראה'}</p>
                            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed line-clamp-3">{selectedTemplateData?.body || 'תוכן ההודעה יופיע כאן'}</p>
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-center text-gray-500">התצוגה בפועל עשויה להשתנות בהתאם למכשיר</p>
                      
                      {/* Test Notification Button */}
                      <div className="mt-4 sm:mt-6 pt-4 border-t border-cyan-200">
                        <button
                          type="button"
                          onClick={handleSendTestNotification}
                          disabled={sendingTest}
                          className={classNames(
                            'w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2',
                            sendingTest
                              ? 'bg-gray-300 text-gray-500 cursor-wait'
                              : 'bg-gradient-to-r from-cyan-500 to-pink-500 text-white shadow-lg hover:scale-[1.02]',
                          )}
                        >
                          {sendingTest ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              שולח התראת בדיקה...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                              שלח התראת בדיקה
                            </>
                          )}
                        </button>
                        {testResult && (
                          <div className={classNames(
                            'mt-3 p-3 rounded-lg text-sm text-center',
                            testResult.success
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-red-100 text-red-700 border border-red-200'
                          )}>
                            {testResult.message}
                          </div>
                        )}
                        <p className="mt-2 text-[10px] text-center text-cyan-600">ההתראה תישלח למכשיר שלך לבדיקה</p>
                      </div>

                      <div className="mt-6 sm:mt-8 pt-4 border-t border-cyan-200 space-y-4">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                              כותרת מותאמת (אופציונלי)
                            </label>
                            <input
                              type="text"
                              className="w-full rounded-xl border border-cyan-200 bg-white p-3 text-xs sm:text-sm text-gray-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 transition"
                              placeholder="אם תזין כאן טקסט - הוא יחליף את הכותרת הנוכחית"
                              value={scheduleForm.payloadOverrides?.titleOverride || ''}
                              onChange={(e) =>
                                handleScheduleFieldChange(['payloadOverrides', 'titleOverride'], e.target.value)
                              }
                            />
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                              תוכן נוסף להודעה (אופציונלי)
                            </label>
                            <textarea
                              className="w-full rounded-xl border border-cyan-200 bg-white p-3 text-xs sm:text-sm text-gray-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 transition"
                              rows={3}
                              placeholder="הוסף טקסט נוסף שיופיע בסוף ההודעה"
                              value={scheduleForm.payloadOverrides?.bodyAppend || ''}
                              onChange={(e) =>
                                handleScheduleFieldChange(['payloadOverrides', 'bodyAppend'], e.target.value)
                              }
                            />
                            <p className="mt-1 text-[10px] text-gray-500">
                              ההודעה תישלח לכל מי שמוגדר בתבנית. אם לא תוסיף טקסט, תישלח ההודעה המקורית כמו שהיא.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleSendLiveNotification}
                          disabled={sendingLive}
                          className={classNames(
                            'w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2',
                            sendingLive
                              ? 'bg-gray-300 text-gray-500 cursor-wait'
                              : 'bg-gradient-to-r from-indigo-600 via-cyan-600 to-pink-500 text-white shadow-lg hover:scale-[1.02]'
                          )}
                        >
                          {sendingLive ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              שולח לכל המשתמשים...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-18 4v5a2 2 0 002 2h14a2 2 0 002-2v-5" />
                              </svg>
                              שלח את ההתראה לכל הקהל
                            </>
                          )}
                        </button>

                        {liveResult && (
                          <div
                            className={classNames(
                              'p-3 rounded-lg text-sm text-center',
                              liveResult.success
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-red-100 text-red-700 border border-red-200'
                            )}
                          >
                            {liveResult.message}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {tab === 'scheduled' && (
              <section className="space-y-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-white">שליחות מתוזמנות</h2>
                    <p className="text-sm text-white/60">ניהול תורים וקריאות של התראות אוטומטיות</p>
                  </div>
                  <button
                    type="button"
                    onClick={openScheduleForm}
                    className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 hover:scale-[1.03]"
                  >
                    [*] תזמן התראה חדשה
                  </button>
                </div>

                <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-inner">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white/10 text-xs uppercase tracking-wide text-white/60">
                      <tr>
                        <th className="px-4 py-3 text-left">תבנית</th>
                        <th className="px-4 py-3 text-left">מצב</th>
                        <th className="px-4 py-3 text-left">שליחה הבאה</th>
                        <th className="px-4 py-3 text-left">קהל יעד</th>
                        <th className="px-4 py-3 text-left">חזרה</th>
                        <th className="px-4 py-3 text-left">פעולות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-white/80">
                      {scheduled.map((item) => (
                        <tr key={item._id || item.templateType}>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold">{item.templateType}</span>
                              {item.payloadOverrides?.title && (
                                <span className="text-xs text-white/60">{item.payloadOverrides.title}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={item.status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span>{formatDateTime(item.nextRunAt)}</span>
                              <span className="text-xs text-white/50">{formatDateTime(item.lastRunAt)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <AudienceChips audience={item.audience} />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-white/70">
                              {item.recurrence?.unit === 'week' ? 'שבועי' : item.recurrence?.unit === 'day' ? 'יומי' : 'ללא'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white hover:bg-white/10"
                              >
                                ערוך
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-rose-500/40 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                              >
                                ביטול
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {scheduled.length === 0 && (
                    <div className="p-12 text-center text-white/50">אין כרגע שליחות מתוזמנות</div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
