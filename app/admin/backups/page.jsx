'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function BackupsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const tab = searchParams.get('tab') || 'main';
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.user.role !== 'admin' && data.user.role !== 'super_admin') {
          router.push('/');
          return;
        }
        setUser(data.user);
        
        // Load backups list and activity logs
        await Promise.all([loadBackups(), loadActivityLogs()]);
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // טעינת לוג פעילויות
  async function loadActivityLogs() {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/admin/activity-logs?limit=20&action=backup');
      if (res.ok) {
        const data = await res.json();
        // סינון רק פעילויות גיבוי/עדכון/deploy
        const systemLogs = (data.logs || []).filter(log => 
          ['backup', 'restore', 'deploy', 'update', 'gitpush'].includes(log.action) ||
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

  async function runAction(actionType, actionName) {
    setIsRunning(true);
    setCurrentAction(actionName);
    setProgress(0);
    setMessage(`מבצע ${actionName}...`);
    
    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        const increment = actionType === 'deploy' ? 2 : actionType === 'update' ? 3 : 5;
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
        
        // If backup saved to folder, show folder info
        if (actionType === 'backup' && data.backupFolder) {
          msg = `${data.message}\n\nתיקייה: backups/database/${data.backupFolder}\nאוספים: ${data.collectionsCount}\nמסמכים: ${data.totalDocs}`;
        }
        
        // If redirect to Vercel needed, open in new tab
        if (data.redirectToVercel && data.vercelUrl) {
          window.open(data.vercelUrl, '_blank');
          msg = 'נפתח דף Vercel בטאב חדש - בצע Redeploy משם';
        }
        
        // Show commands if provided
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

  const runBackup = () => runAction('backup', 'גיבוי');
  const runDeploy = () => runAction('deploy', 'Deploy ל-Vercel');
  const runGitPush = () => runAction('gitpush', 'Push ל-GitHub');
  const runUpdate = () => runAction('update', 'עדכון מערכת');
  const runServer = () => runAction('server', 'הפעלת שרת מקומי');

  // גיבוי מלא - קוד + DB + הגדרות
  async function runFullBackup() {
    setIsRunning(true);
    setCurrentAction('גיבוי מלא');
    setProgress(0);
    setMessage('מכין גיבוי מלא (קוד + DB + הגדרות)...');

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return Math.min(prev + 5, 90);
      });
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
        // Download the ZIP file
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
      setTimeout(() => {
        setIsRunning(false);
        setProgress(0);
        setCurrentAction('');
      }, 2000);
    }
  }

  // שחזור גיבוי והעלאה ל-Vercel
  async function runRestoreAndDeploy(backupName) {
    if (!confirm(`שחזור גיבוי "${backupName}" והעלאה ל-Vercel\n\nפעולה זו תחליף את כל הנתונים הקיימים במערכת ותעלה את השינויים ל-Vercel.\n\nהאם להמשיך?`)) {
      return;
    }

    setIsRunning(true);
    setCurrentAction('שחזור והעלאה ל-Vercel');
    setProgress(0);
    setMessage('מתחיל שחזור...');

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return Math.min(prev + 3, 90);
      });
    }, 500);

    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restoreAndDeploy', backupName })
      });
      const data = await res.json();

      clearInterval(progressInterval);
      setProgress(100);

      if (res.ok) {
        let msg = `${data.message || 'שחזור והעלאה ל-Vercel הושלמו בהצלחה!'}`;
        if (data.restored) {
          msg += '\n\nקולקציות ששוחזרו:\n';
          msg += data.restored.map(c => `• ${c.name}: ${c.count} רשומות`).join('\n');
        }
        if (data.deployUrl) {
          msg += `\n\nVercel Deploy URL:\n${data.deployUrl}`;
        }
        setMessage(msg);
        await loadBackups();
      } else {
        setMessage('שגיאה: ' + (data.error || 'השחזור נכשל'));
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

  // בדיקת תקינות קובץ גיבוי
  function validateBackupFile(fileContent) {
    try {
      const data = JSON.parse(fileContent);
      const issues = [];
      
      // בדיקה שיש collections
      if (!data.collections && !Array.isArray(Object.keys(data))) {
        // אם זה פורמט ישן - קבצי JSON נפרדים
        if (typeof data !== 'object') {
          issues.push('פורמט קובץ לא תקין');
        }
      }
      
      // בדיקת גודל
      const size = new Blob([fileContent]).size;
      if (size < 100) {
        issues.push('קובץ קטן מדי - ייתכן שריק');
      }
      
      return {
        valid: issues.length === 0,
        issues,
        size: formatBytes(size),
        collectionsCount: data.collections ? Object.keys(data.collections).length : 'לא ידוע'
      };
    } catch (e) {
      return { valid: false, issues: ['קובץ JSON לא תקין: ' + e.message] };
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // פורמט תאריך לעברית
  function formatDate(dateStr) {
    if (!dateStr) return 'לא ידוע';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('he-IL') + ' ' + date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  }

  // אייקון לפי סוג פעולה
  function getActionIcon(action) {
    const icons = {
      backup: 'B',
      restore: 'R',
      deploy: 'D',
      update: 'U',
      gitpush: 'G'
    };
    return icons[action] || '-';
  }

  function getActionColor(action) {
    const colors = {
      backup: '#0891b2',
      restore: '#d97706',
      deploy: '#0891b2',
      update: '#0891b2',
      gitpush: '#1f2937'
    };
    return colors[action] || '#6b7280';
  }

  // Handle file upload for restore with validation
  async function handleRestoreFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setRestoreFile(file);
      setBackupValidation(null);
      
      // בדיקת סוג הקובץ
      if (file.name.endsWith('.zip')) {
        // קובץ ZIP - נבדוק אותו בשרת
        setBackupValidation({ valid: true, issues: [], isZip: true, size: formatBytes(file.size) });
      } else {
        // קובץ JSON - בדיקת תקינות
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
    // בדיקה אם נבחר גיבוי מהרשימה או הועלה קובץ
    if (!restoreFile && !selectedBackupName) {
      setMessage('יש לבחור גיבוי מהרשימה או להעלות קובץ');
      return;
    }

    // Confirm before restore
    if (!confirm('שחזור יחליף את כל הנתונים הקיימים במערכת!\n\nהאם אתה בטוח שברצונך להמשיך?')) {
      return;
    }

    setIsRunning(true);
    setCurrentAction('שחזור מגיבוי');
    setProgress(0);
    setMessage('מתחיל שחזור...');

    try {
      let res, data;

      // אם נבחר גיבוי מהרשימה - משתמש ב-restoreAndDeploy API (בלי Deploy)
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
        // קובץ ZIP - שולח לשרת לחילוץ ושחזור
        setMessage('מעלה קובץ ZIP...');
        setProgress(20);
        
        const formData = new FormData();
        formData.append('file', restoreFile);
        formData.append('action', 'restoreFromZip');
        
        res = await fetch('/api/admin/backups/upload', {
          method: 'POST',
          body: formData
        });
        data = await res.json();
      } else {
        // אם הועלה קובץ JSON - משתמש בשיטה הישנה
        setMessage('קורא קובץ גיבוי...');
        const fileContent = await restoreFile.text();
        let backupData;
        
        try {
          backupData = JSON.parse(fileContent);
        } catch (parseErr) {
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
        if (data.errors && data.errors.length > 0) {
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
      setTimeout(() => {
        setIsRunning(false);
        setProgress(0);
        setCurrentAction('');
      }, 2000);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white p-4 sm:p-6 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header removed - sidebar provides navigation */}

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg whitespace-pre-line ${message.includes('הושלם') || message.includes('הורד') ? 'bg-green-50 text-green-800' : message.includes('שגיאה') ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
            {message}
          </div>
        )}

        {/* Progress Bar */}
        {isRunning && (
          <div className="mb-6 p-4 rounded-xl bg-white shadow-md" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{currentAction}</span>
              <span className="text-sm font-bold" style={{ color: '#0891b2' }}>{progress}%</span>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{ 
                  width: `${progress}%`,
                  background: progress === 100 
                    ? 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)' 
                    : 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)'
                }}
              />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <span>מעבד... אנא המתן</span>
            </div>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Backup */}
          <div className="p-6 rounded-xl bg-white shadow-md" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </span>
              <div>
                <h3 className="font-bold text-gray-900">גיבוי חדש</h3>
                <p className="text-sm text-gray-500">יצירת גיבוי של בסיס הנתונים</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={runBackup} 
              disabled={isRunning}
              className="w-full py-2 px-4 rounded-lg text-white font-medium transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {isRunning ? 'מבצע...' : '1. גיבוי עכשיו'}
            </button>
          </div>

          {/* Full Backup - Code + DB */}
          <div className="p-6 rounded-xl bg-white shadow-md" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </span>
              <div>
                <h3 className="font-bold text-gray-900">2. גיבוי מלא</h3>
                <p className="text-sm text-gray-500">קוד + DB + הגדרות</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={runFullBackup}
              disabled={isRunning}
              className="w-full py-2 px-4 rounded-lg text-white font-medium transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {isRunning ? 'מגבה...' : '2. גיבוי מלא (הורדה)'}
            </button>
          </div>

          {/* Update System */}
          <div className="p-6 rounded-xl bg-white shadow-md" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </span>
              <div>
                <h3 className="font-bold text-gray-900">3. עדכון מערכת</h3>
                <p className="text-sm text-gray-500">משיכת קוד חדש מ-GitHub</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={runUpdate}
              disabled={isRunning}
              className="w-full py-2 px-4 rounded-lg text-white font-medium transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {isRunning ? 'מעדכן...' : '3. עדכן מערכת'}
            </button>
          </div>

          {/* Start Server - 4 */}
          <div className="p-6 rounded-xl bg-white shadow-md" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #0891b2, #06b6d4)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </span>
              <div>
                <h3 className="font-bold text-gray-900">4. הפעל שרת מקומי</h3>
                <p className="text-sm text-gray-500">סוגר שרת קיים + מפעיל חדש + Auto-Restart</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={runServer}
              disabled={isRunning}
              className="w-full py-2 px-4 rounded-lg text-white font-medium transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)' }}
            >
              {isRunning ? 'מפעיל...' : '4. הפעל שרת מקומי'}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">יסגור שרת קיים, יפעיל חדש, ויפעיל מחדש אוטומטית בכל שינוי קוד</p>
          </div>

          {/* Git Push - 5 */}
          <div className="p-6 rounded-xl bg-white shadow-md" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1f2937, #374151)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)' }}>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </span>
              <div>
                <h3 className="font-bold text-gray-900">5. Push לGitHub</h3>
                <p className="text-sm text-gray-500">שמירת שינויים ב-GitHub</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={runGitPush}
              disabled={isRunning}
              className="w-full py-2 px-4 rounded-lg text-white font-medium transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)' }}
            >
              {isRunning ? 'שולח...' : '5. Push לGitHub'}
            </button>
          </div>

          {/* Deploy */}
          <div className="p-6 rounded-xl bg-white shadow-md" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </span>
              <div>
                <h3 className="font-bold text-gray-900">6. Deploy לVercel</h3>
                <p className="text-sm text-gray-500">העלאה לאתר החי באינטרנט</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={runDeploy}
              disabled={isRunning}
              className="w-full py-2 px-4 rounded-lg text-white font-medium transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {isRunning ? 'מעלה...' : '6. Deploy לVercel'}
            </button>
          </div>

          {/* Restore - ללא מספר (פעולה נדירה) */}
          <div className="p-6 rounded-xl bg-white shadow-md" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #d97706, #fbbf24)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </span>
              <div>
                <h3 className="font-bold text-gray-900">שחזור גיבוי</h3>
                <p className="text-sm text-gray-500">שחזור מקובץ JSON (פעולה נדירה)</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setShowRestoreModal(true)}
              disabled={isRunning}
              className="w-full py-2 px-4 rounded-lg text-white font-medium transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)' }}
            >
              {isRunning ? 'משחזר...' : 'שחזר מגיבוי'}
            </button>
          </div>
        </div>

        {/* Deploy Hook Setup Guide */}
        <div className="bg-cyan-50 rounded-xl p-6 mb-8" style={{ border: '2px solid #0891b2' }}>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            הגדרת Deploy אוטומטי (Vercel Hook)
          </h2>
          <div className="bg-white p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-700 mb-3">
              להפעלת Deploy אוטומטי ללא צורך בפתיחת Vercel, יש להגדיר Deploy Hook:
            </p>
            <ol className="text-sm text-gray-600 space-y-2 mr-4 list-decimal">
              <li>היכנס ל-<a href="https://vercel.com/vipos-projects-0154d019/vipo-agents-test/settings/git" target="_blank" rel="noopener noreferrer" style={{ color: '#0891b2' }} className="underline">Vercel Settings → Git</a></li>
              <li>גלול למטה ל-<strong>Deploy Hooks</strong></li>
              <li>לחץ <strong>Create Hook</strong>, תן שם (למשל: dashboard-deploy)</li>
              <li>בחר branch: <code className="bg-gray-100 px-1 rounded">main</code></li>
              <li>העתק את ה-URL שנוצר</li>
              <li>הוסף לקובץ <code className="bg-gray-100 px-1 rounded">.env.local</code>:</li>
            </ol>
            <div className="mt-3 p-2 bg-gray-900 rounded-lg">
              <code className="text-green-400 text-xs">VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...</code>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              לאחר ההגדרה, לחיצה על &quot;Deploy לVercel&quot; תפעיל פריסה אוטומטית ללא צורך בפתיחת טאב חדש.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              <strong>להתראות במייל על כשלונות:</strong>
            </p>
            <div className="p-2 bg-gray-900 rounded-lg">
              <code className="text-green-400 text-xs block">RESEND_API_KEY=re_xxxxx</code>
              <code className="text-green-400 text-xs block">ADMIN_EMAIL=your@email.com</code>
            </div>
          </div>
        </div>

        {/* Scripts Info */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            סקריפטים זמינים
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-semibold text-gray-900 mb-2">backup.cmd</h3>
              <p className="text-sm text-gray-600 mb-2">גיבוי בסיס הנתונים</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block">backups\database\backup.cmd</code>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-semibold text-gray-900 mb-2">update-all.cmd</h3>
              <p className="text-sm text-gray-600 mb-2">עדכון כל המערכת</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block">backups\database\update-all.cmd</code>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-semibold text-gray-900 mb-2">upgrade-backup.cmd</h3>
              <p className="text-sm text-gray-600 mb-2">שדרוג וגיבוי</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block">backups\database\upgrade-backup.cmd</code>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-semibold text-gray-900 mb-2">deploy-vercel.cmd</h3>
              <p className="text-sm text-gray-600 mb-2">העלאה לVercel</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block">backups\database\deploy-vercel.cmd</code>
            </div>
          </div>
        </div>

        {/* Backups History */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            היסטוריית גיבויים
          </h2>
          {backups.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-4 font-medium text-gray-600">שם הגיבוי</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">תאריך</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">גודל</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">
                        <div className="flex items-center gap-2">
                          {backup.type === 'full' ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-cyan-100 text-cyan-700">מלא</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">DB</span>
                          )}
                          <span className="text-xs text-gray-500">{backup.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{backup.date}</td>
                      <td className="py-3 px-4 text-gray-600">{backup.size}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => runRestoreAndDeploy(backup.name)}
                            disabled={isRunning}
                            className="px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1.5"
                            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            שחזר
                          </button>
                          {backup.hasZip && (
                            <a
                              href={`/api/admin/backups/download?name=${backup.name}`}
                              className="px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all flex items-center gap-1.5"
                              style={{ background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)' }}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              ZIP
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              <p>הגיבויים נמצאים בתיקייה המקומית</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block">backups/database/</code>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-3 text-center">
            נשמרים 10 גיבויים אחרונים בלבד - גיבויים ישנים יותר נמחקים אוטומטית
          </p>
        </div>

        {/* Activity Logs */}
        <div className="bg-white rounded-xl shadow-md p-6 mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            לוג פעילויות מערכת
          </h2>
          {logsLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-500 text-sm">טוען לוג פעילויות...</p>
            </div>
          ) : activityLogs.length > 0 ? (
            <div className="space-y-2">
              {activityLogs.map((log, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all">
                  <span 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                    style={{ backgroundColor: getActionColor(log.action) }}
                  >
                    {log.action === 'backup' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                    )}
                    {log.action === 'restore' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {log.action === 'deploy' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    )}
                    {log.action === 'update' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    )}
                    {log.action === 'gitpush' && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{log.description || log.action}</p>
                    <p className="text-xs text-gray-500">
                      {log.userEmail || 'מערכת'} • {formatDate(log.createdAt)}
                    </p>
                  </div>
                  {log.metadata?.success !== undefined && (
                    <span className={`text-xs px-2 py-1 rounded-full ${log.metadata.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {log.metadata.success ? 'הצלחה' : 'נכשל'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>אין פעילויות מערכת להצגה</p>
            </div>
          )}
        </div>
      </div>

      {/* Restore Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                שחזור מגיבוי
              </h3>
              <button 
                onClick={() => { setShowRestoreModal(false); setRestoreFile(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>שחזור יחליף את כל הנתונים הקיימים במערכת! מומלץ לבצע גיבוי לפני.</span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                בחר גיבוי לשחזור
              </label>
              {backups.length > 0 ? (
                <select
                  value={selectedBackupName}
                  onChange={(e) => setSelectedBackupName(e.target.value)}
                  className="w-full p-3 border-2 border-amber-200 rounded-lg text-sm bg-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="">-- בחר גיבוי --</option>
                  {backups.map((backup, index) => (
                    <option key={index} value={backup.name}>
                      {backup.date} | {backup.size}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">אין גיבויים זמינים</p>
              )}
              {selectedBackupName && (
                <div className="mt-2 p-2 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>נבחר: {selectedBackupName}</span>
                </div>
              )}
              
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">או העלה קובץ גיבוי ידנית:</p>
                <input
                  type="file"
                  accept=".json,.zip"
                  onChange={handleRestoreFileChange}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
                {restoreFile && (
                  <p className="mt-1 text-xs text-green-600">קובץ: {restoreFile.name}</p>
                )}
                <p className="mt-2 text-xs text-blue-600">ניתן להעלות קובץ JSON או ZIP מגיבוי מלא</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={runRestore}
                disabled={(!restoreFile && !selectedBackupName) || isRunning}
                className="flex-1 py-2 px-4 rounded-lg text-white font-medium transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)' }}
              >
                {isRunning ? 'משחזר...' : 'התחל שחזור'}
              </button>
              <button
                onClick={() => { setShowRestoreModal(false); setRestoreFile(null); }}
                className="py-2 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function BackupsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    }>
      <BackupsContent />
    </Suspense>
  );
}
