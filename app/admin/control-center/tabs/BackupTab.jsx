'use client';

import { useState, useEffect } from 'react';

export default function BackupTab({ user }) {
  const [backups, setBackups] = useState([]);
  const [message, setMessage] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [backupValidation, setBackupValidation] = useState(null);
  const [selectedBackupName, setSelectedBackupName] = useState('');

  useEffect(() => {
    if (user) {
      loadBackups();
      loadActivityLogs();
    }
  }, [user]);

  async function loadBackups() {
    try {
      const res = await fetch('/api/admin/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch (error) {
      console.error('Failed to load backups:', error);
    }
  }

  async function loadActivityLogs() {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/admin/activity-logs?limit=20&action=backup');
      if (res.ok) {
        const data = await res.json();
        const systemLogs = (data.logs || []).filter(log =>
          ['backup', 'restore', 'deploy', 'localDeploy', 'update', 'gitpush'].includes(log.action) ||
          log.entity === 'system'
        );
        setActivityLogs(systemLogs.slice(0, 10));
      }
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    } finally {
      setLogsLoading(false);
    }
  }

  async function runAction(actionType, actionName) {
    setIsRunning(true);
    setCurrentAction(actionName);
    setProgress(0);
    setMessage(`מבצע ${actionName}...`);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        const increment = (actionType === 'deploy' || actionType === 'localDeploy') ? 2 : actionType === 'update' ? 3 : 5;
        return Math.min(prev + increment, 90);
      });
    }, 500);

    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType })
      });
      const data = await res.json();

      clearInterval(progressInterval);
      setProgress(100);

      if (res.ok) {
        let msg = `${data.message || actionName + ' הושלם בהצלחה!'}`;
        if (actionType === 'backup' && data.backupFolder) {
          msg = `${data.message}\n\nתיקייה: backups/database/${data.backupFolder}\nאוספים: ${data.collectionsCount}\nמסמכים: ${data.totalDocs}`;
        }
        if (data.redirectToVercel && data.vercelUrl) {
          window.open(data.vercelUrl, '_blank');
          msg = 'נפתח דף Vercel בטאב חדש - בצע Redeploy משם';
        }
        if (data.commands) {
          msg += '\n\nפקודות:\n' + data.commands.join('\n');
        }
        if (data.info) {
          msg += '\n\n' + data.info;
        }
        setMessage(msg);
        if (actionType === 'backup') await loadBackups();
      } else {
        setMessage('שגיאה: ' + (data.error || data.details || 'הפעולה נכשלה'));
      }
    } catch (error) {
      clearInterval(progressInterval);
      setProgress(0);
      setMessage('שגיאה: ' + error.message);
    } finally {
      setTimeout(() => {
        setIsRunning(false);
        setProgress(0);
        setCurrentAction('');
      }, 2000);
    }
  }

  function openVercelDeployments() {
    window.open('https://vercel.com/vipos-projects-0154d019/vipo-agents-test/deployments', '_blank');
    setMessage('נפתח דף ה-Deployments ב-Vercel.\n\nדיפלוי מתבצע רק דרך שלב 5 (Push ל-GitHub) כדי למנוע כפילויות.');
  }

  async function runFullBackup() {
    setIsRunning(true);
    setCurrentAction('גיבוי מלא');
    setProgress(0);
    setMessage('מכין גיבוי מלא (קוד + DB + הגדרות)...');

    const progressInterval = setInterval(() => {
      setProgress(prev => prev >= 90 ? prev : Math.min(prev + 5, 90));
    }, 500);

    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fullBackup' })
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vipo-full-backup-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        setMessage('גיבוי מלא הורד בהצלחה!\n\nהקובץ כולל:\n- קוד המערכת\n- מסד נתונים\n- קובץ הגדרות (.env.local)\n- הוראות שחזור');
      } else {
        const data = await res.json();
        setMessage('שגיאה: ' + (data.error || 'הגיבוי נכשל'));
      }
    } catch (error) {
      clearInterval(progressInterval);
      setProgress(0);
      setMessage('שגיאה: ' + error.message);
    } finally {
      setTimeout(() => { setIsRunning(false); setProgress(0); setCurrentAction(''); }, 2000);
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function validateBackupFile(fileContent) {
    try {
      const data = JSON.parse(fileContent);
      const issues = [];
      if (!data.collections && !Array.isArray(Object.keys(data))) {
        if (typeof data !== 'object') issues.push('פורמט קובץ לא תקין');
      }
      const size = new Blob([fileContent]).size;
      if (size < 100) issues.push('קובץ קטן מדי - ייתכן שריק');
      return { valid: issues.length === 0, issues, size: formatBytes(size), collectionsCount: data.collections ? Object.keys(data.collections).length : 'לא ידוע' };
    } catch (e) {
      return { valid: false, issues: ['קובץ JSON לא תקין: ' + e.message] };
    }
  }

  async function handleRestoreFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setRestoreFile(file);
      setBackupValidation(null);
      if (file.name.endsWith('.zip')) {
        setBackupValidation({ valid: true, issues: [], isZip: true, size: formatBytes(file.size) });
      } else {
        try {
          const content = await file.text();
          const validation = validateBackupFile(content);
          setBackupValidation(validation);
        } catch (err) {
          setBackupValidation({ valid: false, issues: ['לא ניתן לקרוא את הקובץ'] });
        }
      }
    }
  }

  async function runRestore() {
    if (!restoreFile && !selectedBackupName) {
      setMessage('יש לבחור גיבוי מהרשימה או להעלות קובץ');
      return;
    }
    if (!confirm('שחזור יחליף את כל הנתונים הקיימים במערכת!\n\nהאם אתה בטוח שברצונך להמשיך?')) return;

    setIsRunning(true);
    setCurrentAction('שחזור מגיבוי');
    setProgress(0);
    setMessage('מתחיל שחזור...');

    try {
      let res, data;
      if (selectedBackupName && !restoreFile) {
        setMessage(`משחזר מגיבוי: ${selectedBackupName}...`);
        setProgress(30);
        res = await fetch('/api/admin/backups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restoreFromLocal', backupName: selectedBackupName })
        });
        data = await res.json();
      } else if (restoreFile.name.endsWith('.zip')) {
        setMessage('מעלה קובץ ZIP...');
        setProgress(20);
        const formData = new FormData();
        formData.append('file', restoreFile);
        formData.append('action', 'restoreFromZip');
        res = await fetch('/api/admin/backups/upload', { method: 'POST', body: formData });
        data = await res.json();
      } else {
        setMessage('קורא קובץ גיבוי...');
        const fileContent = await restoreFile.text();
        let backupData;
        try { backupData = JSON.parse(fileContent); } catch {
          setMessage('קובץ הגיבוי לא תקין - לא ניתן לפרסר JSON');
          setIsRunning(false);
          return;
        }
        setProgress(30);
        setMessage('משחזר נתונים...');
        res = await fetch('/api/admin/backups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore', backupData })
        });
        data = await res.json();
      }

      setProgress(100);
      if (res.ok) {
        let msg = `${data.message}`;
        if (data.restored) {
          msg += '\n\nקולקציות ששוחזרו:\n';
          msg += data.restored.map(c => `- ${c.name}: ${c.count} רשומות`).join('\n');
        }
        if (data.errors?.length > 0) {
          msg += '\n\nשגיאות:\n';
          msg += data.errors.map(e => `- ${e.collection}: ${e.error}`).join('\n');
        }
        setMessage(msg);
        setShowRestoreModal(false);
        setRestoreFile(null);
        setSelectedBackupName('');
      } else {
        setMessage('שגיאה: ' + (data.error || 'השחזור נכשל'));
      }
    } catch (error) {
      setMessage('שגיאה: ' + error.message);
    } finally {
      setTimeout(() => { setIsRunning(false); setProgress(0); setCurrentAction(''); }, 2000);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'לא ידוע';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('he-IL') + ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  }

  function getActionColor(action) {
    const c = { backup: '#0891b2', restore: '#d97706', deploy: '#0891b2', localDeploy: '#0891b2', update: '#0891b2', gitpush: '#1f2937' };
    return c[action] || '#6b7280';
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  const ACTIONS = [
    { type: 'backup', name: '1. גיבוי חדש', desc: 'יצירת גיבוי של בסיס הנתונים', icon: 'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4', grad: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', bg: 'rgba(30,58,138,0.08)', fn: () => runAction('backup', 'גיבוי') },
    { type: 'fullBackup', name: '2. גיבוי מלא', desc: 'קוד + DB + הגדרות (הורדת ZIP)', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4', grad: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', bg: 'rgba(8,145,178,0.08)', fn: runFullBackup },
    { type: 'update', name: '3. עדכון מערכת', desc: 'משיכת קוד חדש מ-GitHub', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', grad: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', bg: 'rgba(30,58,138,0.08)', fn: () => runAction('update', 'עדכון מערכת') },
    { type: 'server', name: '4. הפעל שרת מקומי', desc: 'סוגר תהליך קיים ומפעיל מחדש', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01', grad: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', bg: 'rgba(8,145,178,0.1)', fn: () => runAction('server', 'הפעלת שרת מקומי') },
    { type: 'gitpush', name: '5. Push ל-GitHub', desc: 'Auto Deploy — המסלול היחיד לדיפלוי', icon: null, grad: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', bg: 'rgba(15,23,42,0.1)', fn: () => runAction('gitpush', 'Push ל-GitHub'), github: true },
    { type: 'vercelStatus', name: '6. סטטוס ב-Vercel', desc: 'צפייה בדיפלויים (לא מפעיל דיפלוי)', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', grad: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', bg: 'rgba(30,58,138,0.08)', fn: openVercelDeployments },
  ];

  const lastLog = activityLogs[0];

  /** תואם ל-runAction / runFullBackup שמגדירים את currentAction */
  function isThisActionRunning(action) {
    if (!isRunning || !currentAction) return false;
    const byType = {
      backup: 'גיבוי',
      fullBackup: 'גיבוי מלא',
      update: 'עדכון מערכת',
      server: 'הפעלת שרת מקומי',
      gitpush: 'Push ל-GitHub',
    };
    return byType[action.type] === currentAction;
  }

  return (
    <div className="space-y-4 animate-fadeIn" dir="rtl">
      {/* Hero — aligned with Paid Promotion / control center tier */}
      <div className="rounded-xl overflow-hidden text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 45%, #0891b2 100%)' }}>
        <div className="px-5 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5v3m0 3v.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">גיבוי ועדכון</h2>
              <p className="text-cyan-100/95 text-xs mt-1 max-w-xl leading-relaxed">
                גיבוי מסד, גיבוי מלא, עדכון מקור, דיפלוי דרך GitHub ו-Vercel — באותו שפה ויזואלית כמו שאר מרכז הבקרה
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.14)' }}>
              גיבויים: {backups.length}
            </span>
            <button
              type="button"
              onClick={() => { loadBackups(); loadActivityLogs(); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all hover:opacity-95"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              רענן רשימות
            </button>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label: 'גיבויים זמינים', value: backups.length, hint: 'מתוך /api/admin/backups', color: '#1e3a8a' },
          { label: 'רשומות פעילות', value: activityLogs.length, hint: 'היסטוריה אחרונה', color: '#0891b2' },
          { label: 'מצב', value: isRunning ? 'מבצע…' : 'מוכן', hint: currentAction || 'ללא פעולה', color: isRunning ? '#d97706' : '#16a34a' },
          { label: 'פעולה אחרונה', value: lastLog ? (lastLog.action || '—') : '—', hint: lastLog ? formatDate(lastLog.createdAt) : 'אין עדיין', color: '#64748b' },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-3 text-center">
            <div className="text-[10px] text-gray-500 font-semibold">{c.label}</div>
            <div className="text-base font-extrabold mt-0.5 truncate" style={{ color: c.color }}>{String(c.value)}</div>
            <div className="text-[10px] text-gray-400 truncate">{c.hint}</div>
          </div>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm whitespace-pre-line shadow-sm ${
            message.includes('הושלם') || message.includes('הורד')
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : message.includes('שגיאה')
                ? 'bg-red-50 text-red-900 border-red-200'
                : 'bg-sky-50 text-sky-900 border-sky-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="leading-relaxed">{message}</span>
            <button type="button" onClick={() => setMessage('')} className="text-[11px] font-bold text-gray-400 hover:text-gray-700 flex-shrink-0 px-1">
              סגור
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      {isRunning && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-800">{currentAction}</span>
            <span className="text-xs font-extrabold tabular-nums" style={{ color: '#0891b2' }}>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                background: progress === 100 ? 'linear-gradient(90deg, #16a34a, #22c55e)' : 'linear-gradient(90deg, #1e3a8a, #0891b2)',
              }}
            />
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500">
            <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span>מעבד… נא לא לסגור את הדף</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div>
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2 px-0.5">פעולות תחזוקה</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {ACTIONS.map((action) => (
            <div
              key={action.type}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col min-h-[132px] transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-3 mb-3 flex-1">
                <div
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 text-white shadow-sm"
                  style={{ background: action.grad }}
                >
                  {action.github ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">{action.name}</h3>
                  <p className="text-[11px] text-gray-500 mt-1 leading-snug">{action.desc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={action.fn}
                disabled={isRunning}
                className="w-full py-2.5 px-3 rounded-lg text-white text-[12px] font-bold transition-all disabled:opacity-45 disabled:cursor-not-allowed hover:opacity-95 shadow-sm"
                style={{ background: action.grad }}
              >
                {isThisActionRunning(action) ? 'מבצע…' : action.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/80 px-4 py-3 text-[11px] text-amber-950 leading-relaxed shadow-sm">
        <span className="font-bold">דיפלוי:</span>{' '}
        מסלול יחיד — שלב 5 (Push ל-GitHub + Auto Deploy). שלב 6 הוא צפייה ב-Vercel בלבד.
      </div>

      {/* Restore CTA */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ background: 'linear-gradient(135deg, rgba(217,119,6,0.08) 0%, rgba(251,191,36,0.06) 100%)', borderBottom: '1px solid #fff7ed' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">שחזור גיבוי</h3>
              <p className="text-[11px] text-gray-600">JSON / ZIP או בחירה מהרשימה — פעולה הרסנית, להשתמש בזהירות</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRestoreModal(true)}
            disabled={isRunning}
            className="px-4 py-2.5 rounded-lg text-white text-[12px] font-bold shadow-sm transition-all disabled:opacity-45 hover:opacity-95 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' }}
          >
            פתח שחזור
          </button>
        </div>
      </div>

      {/* Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" dir="rtl">
          <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" aria-label="סגור" onClick={() => setShowRestoreModal(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 text-white flex items-center justify-between gap-2" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0891b2 100%)' }}>
              <h3 className="text-base font-extrabold">שחזור גיבוי</h3>
              <button type="button" onClick={() => setShowRestoreModal(false)} className="text-white/80 hover:text-white text-xl leading-none px-1">
                ×
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-right">
              {backups.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-gray-600 mb-1.5 block">בחר מרשימת גיבויים</label>
                  <select
                    value={selectedBackupName}
                    onChange={(e) => { setSelectedBackupName(e.target.value); setRestoreFile(null); setBackupValidation(null); }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50/80 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 outline-none"
                  >
                    <option value="">— בחר גיבוי —</option>
                    {backups.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.name} {b.date ? `(${formatDate(b.date)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1.5 block">או העלה קובץ</label>
                <input
                  type="file"
                  accept=".json,.zip"
                  onChange={handleRestoreFileChange}
                  className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>

              {backupValidation && (
                <div className={`rounded-xl px-3 py-2.5 text-[11px] border ${backupValidation.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                  <div className="font-bold mb-1">{backupValidation.valid ? 'קובץ תקין' : 'בעיות בקובץ'}</div>
                  {backupValidation.size && <div>גודל: {backupValidation.size}</div>}
                  {backupValidation.collectionsCount && <div>אוספים: {backupValidation.collectionsCount}</div>}
                  {backupValidation.issues?.map((issue, i) => (
                    <div key={i}>• {issue}</div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={runRestore}
                  disabled={isRunning || (!restoreFile && !selectedBackupName)}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-45 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' }}
                >
                  {isRunning ? 'משחזר…' : 'שחזר עכשיו'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRestoreModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[280px]">
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100" style={{ background: 'linear-gradient(180deg, #fafbfc 0%, #fff 100%)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(30,58,138,0.08)' }}>
                <svg className="w-4 h-4" style={{ color: '#1e3a8a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-800">גיבויים שמורים</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{backups.length}</span>
            </div>
            <button type="button" onClick={loadBackups} className="text-[11px] font-bold text-cyan-700 hover:text-cyan-900">
              רענן
            </button>
          </div>
          <div className="divide-y divide-gray-50 flex-1 overflow-y-auto max-h-[320px]">
            {backups.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-2xl mb-2 opacity-40">📦</div>
                <div className="text-xs font-semibold text-gray-500">אין גיבויים ברשימה</div>
                <div className="text-[10px] text-gray-400 mt-1">צור גיבוי חדש מהפעולות למעלה</div>
              </div>
            ) : (
              backups.map((b, i) => (
                <div key={b.name || i} className="px-4 py-3 flex items-start justify-between gap-2 hover:bg-slate-50/80 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[11px] font-semibold text-gray-900 break-all">{b.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {b.date ? formatDate(b.date) : ''}
                      {b.size ? ` · ${b.size}` : ''}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => copyText(b.name)}
                      className="text-[10px] font-bold text-cyan-700 hover:underline"
                    >
                      העתק שם
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedBackupName(b.name); setShowRestoreModal(true); }}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
                    >
                      שחזור
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[280px]">
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100" style={{ background: 'linear-gradient(180deg, #fafbfc 0%, #fff 100%)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(8,145,178,0.08)' }}>
                <svg className="w-4 h-4" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-800">היסטוריית פעולות</h3>
            </div>
            <button type="button" onClick={loadActivityLogs} disabled={logsLoading} className="text-[11px] font-bold text-cyan-700 hover:text-cyan-900 disabled:opacity-50">
              {logsLoading ? 'טוען…' : 'רענן'}
            </button>
          </div>
          <div className="divide-y divide-gray-50 flex-1 overflow-y-auto max-h-[320px]">
            {activityLogs.length === 0 ? (
              <div className="p-10 text-center text-xs text-gray-400">אין היסטוריה להצגה</div>
            ) : (
              activityLogs.map((log, i) => (
                <div key={log._id || i} className="px-4 py-3 flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-extrabold flex-shrink-0 shadow-sm"
                    style={{ background: getActionColor(log.action) }}
                  >
                    {(log.action || '-')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-800 leading-snug">{log.description}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{formatDate(log.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
