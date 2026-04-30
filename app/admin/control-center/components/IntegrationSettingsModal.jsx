'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/** קישורים למסכים קיימים במערכת (כשיש) */
const SERVICE_ACTIONS = {
  mongodb: {
    hint: 'מסד הנתונים מוגדר רק בשרת — ערוך את קובץ .env.local (או משתני Vercel בפרודקשן).',
  },
  payplus: {
    hint: 'אפשר להגדיר PayPlus גלובלי ב-env, או לכל עסק בנפרד.',
    link: '/admin/control-center?tab=integrations',
    linkLabel: 'טאב אינטגרציות — בדיקת PayPlus',
  },
  priority: {
    link: '/admin/control-center?tab=integrations',
    linkLabel: 'טאב אינטגרציות — Priority',
    hint: 'כל משתני Priority מוגדרים ב-env (לא נשמרים במסך נפרד כרגע).',
  },
  whatsapp: {
    hint: 'שרת WhatsApp או Twilio — ערכים ב-.env.local.',
  },
  cloudinary: {
    hint: 'העתק מפתחות מ-Dashboard של Cloudinary ל-.env.local.',
  },
  vercel: {
    hint: 'ב-localhost: אופציונלי להוסיף VERCEL_TOKEN + VERCEL_PROJECT_ID; בפרודקשן על Vercel זה נסגר אוטומטית.',
  },
  github: {
    hint: 'לסריקה עמוקה: אפשר להוסיף GITHUB_TOKEN ל-.env.',
  },
  resend: {
    hint: 'מפתח מ-Resend Dashboard → RESEND_API_KEY ב-.env.local.',
  },
  twilio: {
    hint: 'מפתחות מחשבון Twilio — ב-.env.local.',
  },
  npm: {
    hint: 'אין משתני חובה — הבדיקה היא זמינות רשת ל-registry.',
  },
  sendgrid: {
    hint: 'אופציונלי אם משתמשים ב-Resend בלבד.',
  },
  googleOAuth: {
    hint: 'מ-Google Cloud Console — OAuth Client לדומיין שלך.',
    link: '/admin/control-center?tab=integrations',
    linkLabel: 'אינטגרציות (גם Google Ads קשור)',
  },
  authSecrets: {
    hint: 'JWT_SECRET / NEXTAUTH_SECRET — ב-.env.local בלבד (לא מוצגים כאן מטעמי אבטחה).',
  },
  webPush: {
    hint: 'מפתחות VAPID — ניתן ליצור עם סקריפט validate-vapid או ידנית.',
  },
  googleAds: {
    link: '/admin/control-center?tab=integrations',
    linkLabel: 'טאב אינטגרציות — טופס Google Ads מלא',
    hint: 'אפשר למלא טופס בממשק (נשמר במסד) או להגדיר ב-env — ראה טאב אינטגרציות.',
  },
  studioSso: {
    hint: 'STUDIO_SSO_SECRET ב-.env — או fallback ל-JWT_SECRET.',
  },
  publicSite: {
    hint: 'NEXT_PUBLIC_SITE_URL או NEXT_PUBLIC_BASE_URL — ב-.env.local.',
  },
};

/**
 * ערכים לא-סודיים שמתאימים לפרויקט הזה (מ-.env.local.example, package.json).
 * אפשר להעתיק ל-.env.local — לא כולל מפתחות/סיסמאות.
 */
const SERVICE_KNOWN_DEFAULTS = {
  payplus: [
    {
      key: 'PAYPLUS_BASE_URL',
      value: 'https://restapiv2.payplus.co.il/api',
      note: 'כתובת REST מהדוגמה הרשמית בפרויקט (.env.local.example)',
    },
    {
      key: 'PAYPLUS_ENV',
      value: 'sandbox',
      note: 'סביבת בדיקות PayPlus (לפני פרודקשן)',
    },
  ],
  mongodb: [
    {
      key: 'MONGODB_DB',
      value: 'vipo',
      note: 'אופציונלי — שם מסד ברירת המחדל בדוגמת ה-env של הפרויקט',
    },
  ],
  priority: [
    {
      key: 'PRIORITY_ENV',
      value: 'sandbox',
      note: 'סביבת בדיקות; URL ו-credentials מקבלים מפריוריטי',
    },
  ],
  publicSite: [
    {
      key: 'NEXT_PUBLIC_BASE_URL',
      value: 'http://localhost:3001',
      note: 'פיתוח מקומי: בפרויקט `npm run dev` רץ על פורט 3001',
    },
    {
      key: 'NEXT_PUBLIC_SITE_URL',
      value: 'http://localhost:3001',
      note: 'בפיתוח אפשר לאותו ערך ל-BASE (קישורים ו-SEO מקומיים)',
    },
  ],
  resend: [
    {
      key: '—',
      value: '',
      note: 'מקבלים RESEND_API_KEY מ-dashboard של Resend — אין ברירת מחדל בקוד',
    },
  ],
  whatsapp: [
    {
      key: '—',
      value: '',
      note: 'לסריקה: מספיק אחד מ־WHATSAPP_SERVER_URL או TWILIO_WHATSAPP_NUMBER. ל-API נפרד יש גם WHATSAPP_TOKEN / WHATSAPP_PHONE_ID בפרויקט.',
    },
  ],
  googleOAuth: [
    {
      key: '—',
      value: '',
      note: 'GOOGLE_CLIENT_ID / SECRET מ-Google Cloud Console (OAuth)',
    },
  ],
  googleAds: [
    {
      key: '—',
      value: '',
      note: 'אפשר למלא בטאב אינטגרציות (נשמר במסד) או ב-GOOGLE_ADS_* ב-env',
    },
  ],
  studioSso: [
    {
      key: '—',
      value: '',
      note: 'אופציונלי: STUDIO_SSO_SECRET; אם חסר — fallback ל-JWT_SECRET (אזהרה בסריקה)',
    },
  ],
  npm: [
    {
      key: '—',
      value: '',
      note: 'אין משתני env נדרשים — הבדיקה היא זמינות npm registry ברשת',
    },
  ],
};

function statusBadgeClass(status) {
  if (status === 'connected') return 'bg-green-100 text-green-800 border-green-200';
  if (status === 'warning') return 'bg-amber-100 text-amber-900 border-amber-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

function statusLabelHe(status) {
  if (status === 'connected') return 'מחובר';
  if (status === 'warning') return 'חלקי / אזהרה';
  return 'לא מחובר';
}

async function copyEnvLine(key, value) {
  if (!key || key === '—' || !value) return;
  const line = `${key}=${value}`;
  try {
    await navigator.clipboard.writeText(line);
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = line;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch {
      /* ignore */
    }
  }
}

export default function IntegrationSettingsModal({
  isOpen,
  onClose,
  serviceKey,
  serviceLabel,
  value,
}) {
  const [googleAdsExtra, setGoogleAdsExtra] = useState(null);

  useEffect(() => {
    if (!isOpen || serviceKey !== 'googleAds') {
      setGoogleAdsExtra(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/google-ads/config');
        const data = await res.json();
        if (!cancelled && data.ok && data.config) setGoogleAdsExtra(data.config);
      } catch {
        if (!cancelled) setGoogleAdsExtra(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, serviceKey]);

  if (!isOpen || !serviceKey) return null;

  const actions = SERVICE_ACTIONS[serviceKey] || {};
  const checklist = value?.envChecklist;
  const knownDefaults = SERVICE_KNOWN_DEFAULTS[serviceKey];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir="rtl">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        aria-label="סגור"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-labelledby="integration-settings-title"
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.06), rgba(8,145,178,0.06))' }}>
          <div>
            <h2 id="integration-settings-title" className="text-base font-bold text-gray-900">
              הגדרות: {serviceLabel || serviceKey}
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              מה מוגדר בשרת ומה חסר — ערכים רגישים מוסתרים; ציבוריים ו-NEXT_PUBLIC מוצגים
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeClass(value?.status)}`}>
              {statusLabelHe(value?.status)}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-lg leading-none px-1"
              aria-label="סגור"
            >
              ×
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-3 space-y-4 text-right">
          {value?.message && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-[12px] text-gray-700 leading-relaxed">
              {value.message}
            </div>
          )}

          {checklist?.vars?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-700 mb-2">משתני סביבה (בדיקה בשרת)</h3>
              <div className="rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
                <table className="w-full text-[11px] min-w-[320px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="text-right py-2 px-2 font-semibold">שדה</th>
                      <th className="text-right py-2 px-2 font-semibold">ערך (בטוח להצגה)</th>
                      <th className="text-center py-2 px-2 w-[4.5rem] font-semibold">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checklist.vars.map((row) => (
                      <tr key={row.key} className="border-t border-gray-100">
                        <td className="py-2 px-2 font-mono text-[10px] break-all text-gray-800 align-top">
                          {row.alt ? (
                            <span>
                              {row.key}
                              <span className="text-gray-400"> / </span>
                              {row.alt}
                            </span>
                          ) : (
                            row.key
                          )}
                          {row.optional ? <span className="text-gray-400 mr-1">(אופציונלי)</span> : null}
                          {row.present && row.resolvedKey ? (
                            <div className="text-[9px] text-gray-400 mt-0.5 font-sans">
                              בשימוש: <span className="font-mono">{row.resolvedKey}</span>
                            </div>
                          ) : null}
                        </td>
                        <td className="py-2 px-2 text-[10px] text-gray-700 align-top break-all max-w-[14rem]">
                          {!row.present ? (
                            <span className="text-gray-400">—</span>
                          ) : row.valuePreview ? (
                            <span
                              className={
                                row.valuePreviewKind === 'plain'
                                  ? 'text-gray-900'
                                  : row.valuePreviewKind === 'partial'
                                    ? 'text-emerald-800'
                                    : 'text-gray-600'
                              }
                            >
                              {row.valuePreview}
                            </span>
                          ) : (
                            <span className="text-gray-500">מוגדר</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-bold align-top">
                          {row.present ? (
                            <span className="text-green-600">מוגדר</span>
                          ) : (
                            <span className="text-red-600">חסר</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {checklist.anyOf && (
                <p className={`text-[11px] mt-2 font-semibold ${checklist.anyOfOk ? 'text-green-700' : 'text-amber-800'}`}>
                  {checklist.anyOfOk ? '✓ מוגדר לפחות אחד מהנדרשים' : '○ נדרש למלא לפחות אחד מהשדות למעלה'}
                </p>
              )}
            </div>
          )}

          {Array.isArray(knownDefaults) && knownDefaults.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-700 mb-2">מה אפשר להשלים בביטחון (ללא סודות)</h3>
              <p className="text-[10px] text-gray-500 mb-2">
                ערכים שמגיעים ישירות מהגדרות הפרויקט (דוגמת env / פורט dev). העתק ל-.env.local — מפתחות וסיסמאות חייבים
                לבוא ממקורות שלכם.
              </p>
              <ul className="space-y-2">
                {knownDefaults.map((row) => (
                  <li
                    key={`${row.key}-${row.value}`}
                    className="rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-[11px] text-right"
                  >
                    <div className="font-mono text-[10px] text-gray-800 break-all">
                      {row.value ? (
                        <span>
                          {row.key}=<span className="text-emerald-900">{row.value}</span>
                        </span>
                      ) : (
                        <span className="text-gray-600">{row.note}</span>
                      )}
                    </div>
                    {row.value ? <p className="text-[10px] text-gray-600 mt-1">{row.note}</p> : null}
                    {row.value ? (
                      <button
                        type="button"
                        onClick={() => copyEnvLine(row.key, row.value)}
                        className="mt-2 text-[10px] font-bold text-emerald-800 underline-offset-2 hover:underline"
                      >
                        העתק שורה ל-.env
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {serviceKey === 'googleAds' && googleAdsExtra && (
            <div>
              <h3 className="text-xs font-bold text-gray-700 mb-2">Google Ads — נתונים במערכת (ללא ערכי סוד)</h3>
              <ul className="text-[11px] text-gray-600 space-y-1 rounded-lg border border-cyan-100 bg-cyan-50/50 p-3">
                <li>Client ID: {googleAdsExtra.clientId ? '● מוגדר' : '○ חסר'}</li>
                <li>Client Secret: {googleAdsExtra.hasClientSecret ? '● מוגדר (env או מסד)' : '○ חסר'}</li>
                <li>Developer Token: {googleAdsExtra.hasDeveloperToken ? '● מוגדר (env או מסד)' : '○ חסר'}</li>
                <li>Manager Customer ID: {googleAdsExtra.managerCustomerId ? '● מוגדר' : '○ חסר'}</li>
              </ul>
            </div>
          )}

          {actions.hint && (
            <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-950 leading-relaxed">
              {actions.hint}
            </div>
          )}

          {actions.link && (
            <div className="pt-1">
              <Link
                href={actions.link}
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
              >
                {actions.linkLabel || 'מעבר להגדרות'}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            </div>
          )}

          <p className="text-[10px] text-gray-400 border-t border-gray-100 pt-3">
            ערכי סוד אמיתיים לא נטענים לדפדפן. השלם ב-.env.local (פיתוח) או ב-Vercel → Environment Variables (פרודקשן).
          </p>
        </div>

        <div className="border-t border-gray-100 px-4 py-2 flex justify-end bg-gray-50/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
