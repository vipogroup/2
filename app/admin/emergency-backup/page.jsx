'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EmergencyBackupPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [backupInfo, setBackupInfo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [infoModal, setInfoModal] = useState(null);

  const setupStepsInfo = {
    step1: {
      title: 'שלב 1: יצירת חשבונות',
      details: `צריך ליצור חשבונות בשירותים הבאים (אם אין לך כבר):

1. **Vercel** (https://vercel.com)
   - לחץ על "Sign Up"
   - ניתן להירשם עם GitHub
   - חשבון חינמי מספיק

2. **MongoDB Atlas** (https://cloud.mongodb.com)
   - לחץ על "Try Free"
   - צור cluster חדש (בחר באזור קרוב)
   - צור Database User עם סיסמה
   - הוסף IP 0.0.0.0/0 ל-Network Access

3. **Cloudinary** (https://cloudinary.com)
   - לחץ על "Sign Up for Free"
   - חשבון חינמי כולל 25GB אחסון`,
      windsurf: `הוראות ל-Windsurf - שלב 1:

אני צריך עזרה להקים מערכת VIPO חדשה. זהו שלב יצירת החשבונות.

בבקשה עזור לי עם:
1. הסבר איך ליצור חשבון Vercel חדש ולחבר אותו ל-GitHub
2. הסבר איך ליצור cluster חדש ב-MongoDB Atlas:
   - יצירת חשבון
   - יצירת Cluster (M0 Free)
   - יצירת Database User
   - הגדרת Network Access (0.0.0.0/0)
   - קבלת Connection String
3. הסבר איך ליצור חשבון Cloudinary וקבלת API Keys

אני צריך את הפרטים הבאים בסוף:
- MongoDB Connection String
- Cloudinary Cloud Name, API Key, API Secret`
    },
    step2: {
      title: 'שלב 2: שכפול הקוד',
      details: `פתח את הטרמינל (CMD או PowerShell) והרץ:

1. בחר תיקייה במחשב שלך
2. הרץ את הפקודה:
   git clone https://github.com/vipogroup/vipo-agents-test.git

3. היכנס לתיקייה:
   cd vipo-agents-test

**שים לב:** צריך שיהיה מותקן Git במחשב.
אם אין - הורד מ: https://git-scm.com/downloads`,
      windsurf: `הוראות ל-Windsurf - שלב 2:

אני צריך לשכפל את הקוד של מערכת VIPO מ-GitHub.

בבקשה בצע:
1. שכפל את הפרויקט מ-GitHub:
   git clone https://github.com/vipogroup/vipo-agents-test.git

2. היכנס לתיקייה:
   cd vipo-agents-test

3. וודא שהקבצים הורדו בהצלחה - הצג לי את רשימת הקבצים בתיקייה

אם Git לא מותקן, עזור לי להתקין אותו קודם.`
    },
    step3: {
      title: 'שלב 3: הגדרת משתני סביבה',
      details: `1. הורד את קובץ "משתני סביבה" מעמוד זה

2. שנה את שם הקובץ ל: .env.local

3. העתק אותו לתיקיית הפרויקט

4. פתח את הקובץ ועדכן:
   - MONGODB_URI = כתובת ה-MongoDB החדשה
   - NEXTAUTH_URL = כתובת האתר החדש
   
**איך להשיג MONGODB_URI:**
- היכנס ל-MongoDB Atlas
- לחץ על "Connect" ב-Cluster
- בחר "Connect your application"
- העתק את ה-Connection String
- החלף <password> בסיסמה שיצרת`,
      windsurf: `הוראות ל-Windsurf - שלב 3:

אני צריך להגדיר את משתני הסביבה למערכת VIPO.

יש לי קובץ גיבוי של משתני הסביבה (env-backup.txt).

בבקשה בצע:
1. צור קובץ .env.local בתיקיית הפרויקט
2. העתק את התוכן מקובץ הגיבוי
3. עדכן את המשתנים הבאים עם הערכים החדשים שלי:
   - MONGODB_URI=[כתובת MongoDB החדשה]
   - NEXTAUTH_URL=[כתובת האתר החדש]
   - NEXTAUTH_SECRET=[מפתח חדש - צור אחד]
   - JWT_SECRET=[מפתח חדש - צור אחד]

4. וודא שכל המשתנים הקריטיים מוגדרים:
   - Database: MONGODB_URI, MONGODB_DB
   - Auth: JWT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL
   - Cloudinary: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
   - PayPlus: PAYPLUS_API_KEY, PAYPLUS_SECRET (אם יש)

5. הצג לי את הקובץ לאישור (בלי לחשוף סודות)`
    },
    step4: {
      title: 'שלב 4: התקנה והרצה',
      details: `בטרמינל, בתיקיית הפרויקט, הרץ:

1. התקנת חבילות:
   npm install
   (ממתין 2-5 דקות)

2. הפעלת השרת:
   npm run dev

3. פתח בדפדפן:
   http://localhost:3001

**שים לב:** צריך שיהיה מותקן Node.js
אם אין - הורד מ: https://nodejs.org (גרסה LTS)`,
      windsurf: `הוראות ל-Windsurf - שלב 4:

אני צריך להתקין ולהריץ את מערכת VIPO.

בבקשה בצע:
1. וודא ש-Node.js מותקן (גרסה 18 ומעלה):
   node --version

2. אם לא מותקן, הסבר לי איך להתקין

3. התקן את החבילות:
   npm install

4. אם יש שגיאות התקנה - טפל בהן

5. הפעל את השרת בסביבת פיתוח:
   npm run dev

6. וודא שהשרת עלה בהצלחה על פורט 3001

7. אם יש שגיאות - הצג לי ותקן אותן

האתר צריך להיות זמין ב: http://localhost:3001`
    },
    step5: {
      title: 'שלב 5: שחזור מסד נתונים',
      details: `1. היכנס לכתובת:
   http://localhost:3001/admin/backups

2. התחבר עם פרטי מנהל:
   - אימייל: admin@vipo.local
   - סיסמה: 12345678

3. לחץ על "שחזור גיבוי"

4. בחר את קובץ database-backup.json שהורדת

5. המתן לסיום השחזור

6. רענן את הדף וודא שהנתונים נטענו`,
      windsurf: `הוראות ל-Windsurf - שלב 5:

אני צריך לשחזר את מסד הנתונים ממערכת VIPO הקודמת.

יש לי קובץ גיבוי: database-backup.json

בבקשה בצע:
1. צור סקריפט שחזור או השתמש בקיים:
   npm run restore:db

2. אם זה לא עובד, צור API endpoint לשחזור:
   - קרא את קובץ database-backup.json
   - עבור על כל הקולקציות
   - מחק את הנתונים הקיימים
   - הכנס את הנתונים מהגיבוי

3. וודא שהקולקציות הבאות שוחזרו:
   - users (משתמשים)
   - products (מוצרים)
   - orders (הזמנות)
   - transactions (עסקאות)
   - settings (הגדרות)

4. בדוק שיש משתמש מנהל במערכת

5. אם אין - צור משתמש מנהל חדש:
   npm run reset-admin

6. הצג לי סיכום של מה שוחזר`
    },
    step6: {
      title: 'שלב 6: העלאה ל-Vercel',
      details: `1. התקן Vercel CLI (פעם אחת):
   npm install -g vercel

2. התחבר ל-Vercel:
   vercel login

3. העלה את הפרויקט:
   vercel --prod

4. הגדר משתני סביבה ב-Vercel:
   - היכנס ל-vercel.com
   - בחר את הפרויקט
   - Settings → Environment Variables
   - הוסף את כל המשתנים מקובץ .env.local

5. בצע Deploy מחדש:
   vercel --prod

**האתר יהיה זמין בכתובת שתקבל מ-Vercel!**`,
      windsurf: `הוראות ל-Windsurf - שלב 6:

אני צריך להעלות את מערכת VIPO ל-Vercel.

בבקשה בצע:
1. התקן Vercel CLI אם לא מותקן:
   npm install -g vercel

2. התחבר לחשבון Vercel:
   vercel login

3. העלה את הפרויקט (ראשוני):
   vercel
   - בחר לקשר לפרויקט קיים או ליצור חדש
   - הגדר את שם הפרויקט

4. הסבר לי איך להגדיר Environment Variables ב-Vercel Dashboard:
   - כל המשתנים מקובץ .env.local צריכים להיות שם
   - במיוחד: MONGODB_URI, JWT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL

5. בצע Deploy ל-Production:
   vercel --prod

6. וודא שהאתר עלה בהצלחה - בדוק את הכתובת שהתקבלה

7. אם יש שגיאות Build - הצג לי את הלוג ותקן

8. בסוף, תן לי את כתובת האתר הסופית`
    }
  };

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
        await loadBackupInfo();
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  async function loadBackupInfo() {
    try {
      const res = await fetch('/api/admin/emergency-backup');
      if (res.ok) {
        const data = await res.json();
        setBackupInfo(data);
      }
    } catch (error) {
      console.error('Failed to load backup info:', error);
    }
  }

  async function updateEmergencyBackup() {
    if (!confirm('האם לעדכן את גיבוי החירום?\n\nפעולה זו תיצור גיבוי חדש של כל המערכת.')) {
      return;
    }

    setIsUpdating(true);
    setProgress(0);
    setMessage('מתחיל עדכון גיבוי חירום...');

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 90));
    }, 500);

    try {
      const res = await fetch('/api/admin/emergency-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update' })
      });
      const data = await res.json();

      clearInterval(progressInterval);
      setProgress(100);

      if (res.ok) {
        setMessage('גיבוי חירום עודכן בהצלחה!');
        await loadBackupInfo();
      } else {
        setMessage('שגיאה: ' + (data.error || 'העדכון נכשל'));
      }
    } catch (error) {
      clearInterval(progressInterval);
      setMessage('שגיאה: ' + error.message);
    } finally {
      setTimeout(() => {
        setIsUpdating(false);
        setProgress(0);
      }, 2000);
    }
  }

  async function downloadBackup(type) {
    try {
      const res = await fetch(`/api/admin/emergency-backup/download?type=${type}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = type === 'full' ? 'vipo-emergency-backup.zip' : `${type}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        setMessage('שגיאה בהורדה: ' + (data.error || 'נכשל'));
      }
    } catch (error) {
      setMessage('שגיאה בהורדה: ' + error.message);
    }
  }

  const externalServices = [
    { name: 'GoDaddy', url: 'https://dcc.godaddy.com', icon: 'globe', color: '#1bdbdb', description: 'ניהול דומיין' },
    { name: 'GitHub', url: 'https://github.com/vipogroup/vipo-agents-test', icon: 'github', color: '#1f2937', description: 'קוד המערכת' },
    { name: 'Vercel', url: 'https://vercel.com', icon: 'cloud', color: '#000000', description: 'אחסון האתר' },
    { name: 'MongoDB Atlas', url: 'https://cloud.mongodb.com', icon: 'database', color: '#00684A', description: 'מסד נתונים' },
    { name: 'Cloudinary', url: 'https://cloudinary.com/console', icon: 'image', color: '#3448C5', description: 'תמונות ומדיה' },
    { name: 'PayPlus', url: 'https://www.payplus.co.il', icon: 'credit-card', color: '#1e3a8a', description: 'סליקת אשראי' },
    { name: 'Google Cloud Console', url: 'https://console.cloud.google.com', icon: 'key', color: '#4285F4', description: 'OAuth והתחברות' },
    { name: 'Twilio', url: 'https://console.twilio.com', icon: 'phone', color: '#F22F46', description: 'SMS ו-OTP' },
    { name: 'WhatsApp Business', url: 'https://business.facebook.com/wa/manage', icon: 'message-circle', color: '#25D366', description: 'הודעות WhatsApp' },
    { name: 'Priority ERP', url: 'https://priority-software.com', icon: 'briefcase', color: '#FF6B00', description: 'סנכרון הנהח' },
    { name: 'Resend', url: 'https://resend.com', icon: 'mail', color: '#000000', description: 'שליחת מיילים' },
  ];

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
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #f59e0b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            גיבוי חירום - הקמת מערכת חדשה
          </h1>
        </div>

        {/* Alert Box */}
        <div className="mb-6 p-4 rounded-xl bg-red-50 border-2 border-red-200">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-bold text-red-800">עמוד זה מיועד למקרה חירום בלבד</h3>
              <p className="text-sm text-red-700 mt-1">
                כאן תמצאי את כל מה שצריך כדי להקים מערכת VIPO חדשה מאפס.
                <br />
                <strong>חשוב:</strong> יש ללחוץ על כפתור עדכן גיבוי חירום אחרי כל שדרוג מערכת!
              </p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.includes('בהצלחה') ? 'bg-green-50 text-green-800' : message.includes('שגיאה') ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
            {message}
          </div>
        )}

        {/* Progress Bar */}
        {isUpdating && (
          <div className="mb-6 p-4 rounded-xl bg-white shadow-md border-2 border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">מעדכן גיבוי חירום...</span>
              <span className="text-sm font-bold text-amber-600">{progress}%</span>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' }}
              />
            </div>
          </div>
        )}

        {/* Update Button Card */}
        <div className="mb-8 p-6 rounded-xl bg-white shadow-lg border-2 border-amber-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                עדכון גיבוי חירום
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                עדכון אחרון: <strong>{backupInfo?.lastUpdate || 'לא עודכן עדיין'}</strong>
              </p>
            </div>
            <button
              onClick={updateEmergencyBackup}
              disabled={isUpdating}
              className="px-6 py-3 rounded-xl text-white font-bold transition-all disabled:opacity-50 flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isUpdating ? 'מעדכן...' : 'עדכן עכשיו'}
            </button>
          </div>
        </div>

        {/* Download Files Section */}
        <div className="mb-8 p-6 rounded-xl bg-white shadow-md">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            קבצים להורדה
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => downloadBackup('full')}
              className="p-4 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-all text-right"
            >
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-lg bg-green-500 text-white flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </span>
                <div>
                  <span className="font-bold text-gray-900 block">גיבוי מלא (ZIP)</span>
                  <span className="text-xs text-gray-500">DB + ENV + README</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => downloadBackup('database')}
              className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all text-right"
            >
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-lg bg-blue-500 text-white flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </span>
                <div>
                  <span className="font-bold text-gray-900 block">מסד נתונים</span>
                  <span className="text-xs text-gray-500">JSON - כל הקולקציות</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => downloadBackup('env')}
              className="p-4 rounded-lg border-2 border-cyan-200 bg-cyan-50 hover:bg-cyan-100 transition-all text-right"
            >
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-lg text-white flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <div>
                  <span className="font-bold text-gray-900 block">משתני סביבה</span>
                  <span className="text-xs text-gray-500">.env.local</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* External Services */}
        <div className="mb-8 p-6 rounded-xl bg-white shadow-md">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            קישורים לשירותים חיצוניים
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {externalServices.map((service, index) => (
              <a
                key={index}
                href={service.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-lg border hover:shadow-md transition-all flex items-center gap-3"
                style={{ borderColor: service.color + '40' }}
              >
                <span 
                  className="w-10 h-10 rounded-lg text-white flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: service.color }}
                >
                  {service.name.charAt(0)}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 block truncate">{service.name}</span>
                  <span className="text-xs text-gray-500">{service.description}</span>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* Info Modal */}
        {infoModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setInfoModal(null)}>
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                <h3 className="font-bold text-white">{setupStepsInfo[infoModal]?.title}</h3>
                <button onClick={() => setInfoModal(null)} className="text-white/80 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[70vh] space-y-4">
                {/* הסבר כללי */}
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    הסבר כללי
                  </h4>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                    {setupStepsInfo[infoModal]?.details}
                  </pre>
                </div>
                
                {/* הוראות ל-Windsurf */}
                <div className="p-4 rounded-lg bg-cyan-50 border border-cyan-200">
                  <h4 className="font-bold text-cyan-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    הוראות ל-Windsurf (העתק והדבק)
                  </h4>
                  <div className="relative">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed bg-white p-3 rounded border">
                      {setupStepsInfo[infoModal]?.windsurf}
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(setupStepsInfo[infoModal]?.windsurf || '');
                        setMessage('הועתק ללוח!');
                        setTimeout(() => setMessage(''), 2000);
                      }}
                      className="absolute top-2 left-2 px-3 py-1 rounded text-white text-xs font-medium transition-all"
                      style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                    >
                      העתק
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Setup Guide */}
        <div className="mb-8 p-6 rounded-xl bg-white shadow-md">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            מדריך הקמת מערכת חדשה
          </h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-50 border-r-4 flex items-center justify-between" style={{ borderColor: '#0891b2' }}>
              <div>
                <h3 className="font-bold text-gray-900">שלב 1: יצירת חשבונות</h3>
                <p className="text-sm text-gray-600 mt-1">צור חשבונות ב-Vercel, MongoDB Atlas, Cloudinary</p>
              </div>
              <button onClick={() => setInfoModal('step1')} className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-sm transition-all" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>!</button>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border-r-4 flex items-center justify-between" style={{ borderColor: '#0891b2' }}>
              <div>
                <h3 className="font-bold text-gray-900">שלב 2: שכפול הקוד</h3>
                <p className="text-sm text-gray-600 mt-1">
                  <code className="bg-gray-200 px-2 py-1 rounded text-xs">git clone https://github.com/vipogroup/vipo-agents-test.git</code>
                </p>
              </div>
              <button onClick={() => setInfoModal('step2')} className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-sm transition-all" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>!</button>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border-r-4 flex items-center justify-between" style={{ borderColor: '#0891b2' }}>
              <div>
                <h3 className="font-bold text-gray-900">שלב 3: הגדרת משתני סביבה</h3>
                <p className="text-sm text-gray-600 mt-1">העתק את קובץ .env.local מהגיבוי ועדכן את ה-MONGODB_URI</p>
              </div>
              <button onClick={() => setInfoModal('step3')} className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-sm transition-all" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>!</button>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border-r-4 flex items-center justify-between" style={{ borderColor: '#0891b2' }}>
              <div>
                <h3 className="font-bold text-gray-900">שלב 4: התקנה והרצה</h3>
                <p className="text-sm text-gray-600 mt-1">
                  <code className="bg-gray-200 px-2 py-1 rounded text-xs">npm install && npm run dev</code>
                </p>
              </div>
              <button onClick={() => setInfoModal('step4')} className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-sm transition-all" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>!</button>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border-r-4 flex items-center justify-between" style={{ borderColor: '#0891b2' }}>
              <div>
                <h3 className="font-bold text-gray-900">שלב 5: שחזור מסד נתונים</h3>
                <p className="text-sm text-gray-600 mt-1">היכנס ל-/admin/backups ושחזר מקובץ ה-JSON</p>
              </div>
              <button onClick={() => setInfoModal('step5')} className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-sm transition-all" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>!</button>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border-r-4 flex items-center justify-between" style={{ borderColor: '#0891b2' }}>
              <div>
                <h3 className="font-bold text-gray-900">שלב 6: העלאה ל-Vercel</h3>
                <p className="text-sm text-gray-600 mt-1">
                  <code className="bg-gray-200 px-2 py-1 rounded text-xs">vercel --prod</code>
                </p>
              </div>
              <button onClick={() => setInfoModal('step6')} className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-sm transition-all" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>!</button>
            </div>
          </div>
        </div>

        {/* Backup Info */}
        {backupInfo && (
          <div className="p-4 rounded-xl bg-gray-100 text-sm text-gray-600">
            <p><strong>מידע על הגיבוי:</strong></p>
            <p>גודל מסד נתונים: {backupInfo.dbSize || 'לא ידוע'}</p>
            <p>מספר קולקציות: {backupInfo.collectionsCount || 'לא ידוע'}</p>
            <p>תאריך עדכון: {backupInfo.lastUpdate || 'לא עודכן'}</p>
          </div>
        )}
      </div>
    </main>
  );
}
