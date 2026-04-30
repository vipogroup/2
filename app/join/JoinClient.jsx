"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Toast from "../components/Toast";

/**
 * הגדרות קבועות
 */
const COOKIE_NAME = "refSource";
// כמה ימים לשמור את ה-cookie
const COOKIE_DAYS = 30; // Changed to 30 days as per Stage 15.4 requirements
// לאן מפנים אחרי שנשמר ה-cookie
const REDIRECT_AFTER_MS = 2000;
const REDIRECT_URL = "/register"; // Redirect to register for better UX

// בדיקה בסיסית לתבנית referralId: אותיות/ספרות, 8–32 תווים
const REF_ID_REGEX = /^[a-z0-9]{8,32}$/i;

export default function JoinClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("idle");
  const [showToast, setShowToast] = useState(false);

  const refId = useMemo(() => (searchParams?.get("ref") || "").trim(), [searchParams]);

  useEffect(() => {
    // אם חסר ref -> ננקה cookie קיים (למקרה שנכנס בלי ref) ונציג הודעה
    if (!refId) {
      // מחיקה ע"י Max-Age=0
      document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
      setStatus("missing");
      return;
    }

    // ולידציה בסיסית (לא לחסום אגרסיבי – רק sanity check)
    if (!REF_ID_REGEX.test(refId)) {
      setStatus("invalid");
      return;
    }

    // שמירת ה-cookie
    const maxAge = COOKIE_DAYS * 24 * 60 * 60;
    // לא לשים Secure בסביבת dev אם אין HTTPS. SameSite=Lax מספיק.
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(refId)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;

    // Save to localStorage as fallback
    try {
      localStorage.setItem("referrerId", refId);
    } catch (e) {
      console.log("localStorage not available");
    }

    setStatus("saved");
    setShowToast(true); // Show toast notification

    // הפניה עדינה לאחר הודעה קצרה
    const t = setTimeout(() => {
      router.push(REDIRECT_URL);
    }, REDIRECT_AFTER_MS);
    return () => clearTimeout(t);
  }, [refId, router]);

  const View = () => {
    switch (status) {
      case "saved":
        return (
          <Msg
            title="קוד הפניה נשמר ✔"
            subtitle={`refSource=${refId}`}
            hint={`את/ה מועבר/ת ל${REDIRECT_URL}...`}
          />
        );
      case "missing":
        return (
          <Msg
            title="לא התקבל קוד הפניה"
            subtitle="הפרמטר ?ref חסר ב-URL"
            hint="אפשר לבקש קישור מלא מסוכן/ממליץ."
          />
        );
      case "invalid":
        return (
          <Msg
            title="קוד הפניה לא תקין"
            subtitle="בדיקת תקינות בסיסית נכשלה"
            hint="בקשי/ה קישור חדש."
          />
        );
      default:
        return <Msg title="בודק קוד הפניה..." subtitle="" hint="" />;
    }
  };

  return (
    <>
      {/* Toast Notification - Stage 15.4 */}
      {showToast && status === "saved" && (
        <Toast
          message="קישור שותפים הופעל בהצלחה ✓"
          type="success"
          duration={3000}
          onClose={() => setShowToast(false)}
        />
      )}

      <main className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl shadow-lg p-6 border bg-white">
          <View />
        </div>
      </main>
    </>
  );
}

function Msg({ title, subtitle, hint }) {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle ? <p className="opacity-80 break-all">{subtitle}</p> : null}
      {hint ? <p className="text-sm opacity-60">{hint}</p> : null}
    </div>
  );
}
