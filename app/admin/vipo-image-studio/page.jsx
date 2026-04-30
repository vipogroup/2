export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/auth/server';
import { isSuperAdminUser } from '@/lib/superAdmins';

import VipoImageStudioClient from './VipoImageStudioClient';

export const metadata = {
  title: 'VIPO Image Studio | ניהול',
};

export default async function VipoImageStudioPage() {
  const user = await requireAdmin();
  if (!isSuperAdminUser(user)) {
    redirect('/admin');
  }

  const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3001';

  return (
    <div className="min-h-screen bg-[#f0f2f5]" dir="rtl">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">VIPO Image Studio</h1>
              <div className="text-sm text-gray-600 mt-1">סטודיו תמונות (Desktop) שמחובר למערכת ומסנכרן חנויות וקטגוריות אוטומטית</div>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-xl text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              חזרה לדשבורד
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="font-bold text-gray-900">איך מפעילים?</div>
              <div className="text-sm text-gray-700 mt-2">
                1) פותחים את תיקיית <code className="px-1 py-0.5 rounded bg-gray-100">vipo סטודיו תמונות</code>
                <br />
                2) מריצים <code className="px-1 py-0.5 rounded bg-gray-100">npm run dev</code>
                <br />
                3) הסטודיו יעלה ויתחבר לשרת
              </div>
              <div className="text-xs text-gray-500 mt-3">(בשלב זה זה מופעל כתוכנה מקומית, לא בתוך הדפדפן)</div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="font-bold text-gray-900">פתיחה מהדשבורד (לחיצה אחת)</div>
              <div className="text-sm text-gray-700 mt-2">
                הכפתור מייצר קוד חד-פעמי קצר-חיים ומנסה לפתוח את הסטודיו עם התחברות אוטומטית.
              </div>
              <VipoImageStudioClient />
            </div>

            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="font-bold text-gray-900">הגדרות התחברות בסטודיו</div>
              <div className="text-sm text-gray-700 mt-2">
                <div>
                  <span className="font-semibold">כתובת שרת:</span>{' '}
                  <code className="px-1 py-0.5 rounded bg-gray-100">{baseUrl}</code>
                </div>
                <div className="mt-2">
                  <span className="font-semibold">משתמש:</span> אימייל/טלפון של מנהל
                </div>
                <div className="mt-1">
                  <span className="font-semibold">סיסמה:</span> הסיסמה של אותו מנהל
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-3">
                הסטודיו משתמש ב־JWT (Bearer token) ולכן לא תלוי בעוגיות של הדפדפן.
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-4 md:col-span-2">
              <div className="font-bold text-gray-900">מה עובד עכשיו?</div>
              <div className="text-sm text-gray-700 mt-2">
                - הסטודיו טוען חנויות מ־<code className="px-1 py-0.5 rounded bg-gray-100">/api/studio/tenants</code>
                <br />
                - לפי חנות הוא טוען קטגוריות מ־<code className="px-1 py-0.5 rounded bg-gray-100">/api/studio/tenants/:tenantId/categories</code>
                <br />
                - אם חסר <code className="px-1 py-0.5 rounded bg-gray-100">storeProfile</code> לחנות, הסטודיו יוצר אוטומטית פרופיל ברירת מחדל כדי לא לחסום יצירה
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
