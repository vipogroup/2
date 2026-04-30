'use client';

import { useEffect } from 'react';

const ROLE_COPY = {
  customer: {
    title: 'התראות חכמות ללקוחות VIPO',
    lead: 'נשלח רק עדכונים חשובים שיעזרו לך לא לפספס מבצעים והזמנות.',
    bullets: [
      'אישור רכישה וקבלה מיד לאחר התשלום',
      'תזכורות לפני סגירת רכישה קבוצתית',
      'התראות על מוצרים והנחות שמתאימים לך',
    ],
  },
  agent: {
    title: 'התראות חכמות לסוכני VIPO',
    lead: 'נעדכן אותך ברגע שיש פעילות דרך הלינקים או הקוד שלך.',
    bullets: [
      'עמלה חדשה שנרשמה עבורך',
      'דוחות יומיים על ביצועים, הזמנות ועמלות',
      'לקוחות שביקשו מעקב או סיוע דרכך',
    ],
  },
  admin: {
    title: 'התראות ניהוליות למנהלי המערכת',
    lead: 'קבל התראה מיידית על פעילות חשובה של המערכת והמשתמשים.',
    bullets: [
      'רישום משתמשים חדשים ופעילות חשודה',
      'תשלומים שהתקבלו או נכשלו',
      'תקלות שדורשות התערבות מהירה',
    ],
  },
};

const DEFAULT_COPY = {
  title: 'התראות VIPO',
  lead: 'התראות חכמות שיעזרו לך להישאר מעודכנים בזמן אמת.',
  bullets: [
    'התראות בזמן אמת על פעולות חשובות',
    'תזכורות שלא נותנות לפספס כלום',
    'אפשרות לכבות את ההתראות בכל רגע',
  ],
};

export default function PushConsentModal({ open, role = 'customer', onAccept, onDecline }) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!open) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Prevent closing on ESC key
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) return null;

  const copy = ROLE_COPY[role] || DEFAULT_COPY;

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => e.stopPropagation()} // Prevent closing on backdrop click
    >
      <div 
        className="relative w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()} // Prevent event bubbling
      >
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 35%, #ec4899 100%)',
          }}
        />
        <div className="relative p-6 sm:p-8 text-white space-y-6">
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-white/70">VIPO Notifications</p>
            <h2 className="text-2xl sm:text-3xl font-bold leading-snug">{copy.title}</h2>
            <p className="text-sm sm:text-base text-white/80">{copy.lead}</p>
          </header>

          <ul className="space-y-3 text-sm sm:text-base">
            {copy.bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-white/40 text-xs font-semibold">
                  [v]
                </span>
                <span className="leading-relaxed text-white/90">{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-2xl bg-white/15 p-4 text-xs sm:text-sm text-white/85">
            <p>
              ההרשמה להתראות תלויה בהפעלת ההרשאה בדפדפן. ניתן לבטל את ההתראות בכל שלב דרך ההגדרות שלך או ישירות מהדפדפן.
            </p>
            <p className="mt-2">
              אנחנו מכבדים את פרטיותך: לא נשלח ספאם ולא נשתף את המידע שלך עם גורמים חיצוניים.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:items-center gap-3">
            <button
              type="button"
              onClick={onDecline}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/60 text-white/90 font-semibold transition hover:bg-white/10"
            >
              אולי אחר כך
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-gray-900 font-semibold shadow-lg shadow-black/15 transition hover:scale-[1.01]"
            >
              כן, תעדכנו אותי
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
