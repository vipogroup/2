# רשימת משתני סביבה לאינטגרציות (VIPO)

מקור האמת ל**רשימת המשתנים לכל שירות** הוא `SERVICE_ENV_CHECKLISTS` בקובץ  
`app/api/admin/system-status/route.js` (מוצג גם ב־API תחת `envChecklist` לכל שירות).

להלן סיכום קריא: **חובה** = כדי שייראה "מחובר" או בלי אזהרה קריטית; **אופציונלי** = מסומן בקוד כ־`optional` או נדרש רק לשימוש מתקדם.

---

## ליבה ואתר

| שירות | משתנים חובה | חלופות (`alt`) | אופציונלי / הערות |
|--------|----------------|------------------|---------------------|
| **mongodb** | `MONGODB_URI` | — | `MONGODB_DB` — אופציונלי (ברירת מחדל נפוצה: `vipo`) |
| **authSecrets** | `JWT_SECRET`, `NEXTAUTH_SECRET` | — | אורך < 32 תווים → אזהרה בפרודקשן |
| **publicSite** | אחד מ־`NEXT_PUBLIC_SITE_URL` או `NEXT_PUBLIC_BASE_URL` | — | לפיתוח: `http://localhost:3001` |

---

## תשלומים

| שירות | משתנים חובה | חלופות | אופציונלי / הערות |
|--------|----------------|--------|---------------------|
| **payplus** | `PAYPLUS_API_KEY`, `PAYPLUS_SECRET`, `PAYPLUS_WEBHOOK_SECRET`, `PAYPLUS_BASE_URL` | — | `PAYPLUS_MOCK_ENABLED=true` → אזהרה (דמו). ברירת URL מקובלת: `https://restapiv2.payplus.co.il/api` |

---

## ERP

| שירות | משתנים חובה (לפי סריקה + `lib/priority/config.js`) | חלופות |
|--------|-----------------------------------------------------|--------|
| **priority** | `PRIORITY_BASE_URL` **או** `PRIORITY_API_URL` | `PRIORITY_API_URL` |
| | `PRIORITY_CLIENT_ID` **או** `PRIORITY_USERNAME` | `PRIORITY_USERNAME` |
| | `PRIORITY_CLIENT_SECRET` **או** `PRIORITY_PASSWORD` | `PRIORITY_PASSWORD` |
| | `PRIORITY_COMPANY_CODE` | — |

אופציונלי: `PRIORITY_ENV`, `PRIORITY_TIMEOUT_MS`, סדרות מסמכים (`PRIORITY_INVOICE_SERIES` וכו').

---

## תקשורת ולקוחות

| שירות | משתנים | הערה |
|--------|---------|------|
| **whatsapp** | **אחד** משניים: `WHATSAPP_SERVER_URL` **או** `TWILIO_WHATSAPP_NUMBER` | `anyOf` — מספיק אחד. (במערכת יש גם `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` ל־Meta API — לא חלק מרשימת הסריקה הזו.) |
| **resend** | `RESEND_API_KEY` | חובה לשליחת מייל דרך Resend |
| **sendgrid** | `SENDGRID_API_KEY` | אופציונלי אם משתמשים רק ב־Resend |
| **twilio** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | `TWILIO_FROM_NUMBER` או `TWILIO_PHONE_NUMBER` — אופציונלי לרשימה אבל נדרש לשליחת SMS |

---

## מדיה ואימות

| שירות | משתנים חובה | חלופות |
|--------|----------------|--------|
| **cloudinary** | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` במקום שם הענן |

---

## פריסה, קוד, חבילות

| שירות | משתנים | הערה |
|--------|---------|------|
| **vercel** | — | בפרודקשן על Vercel לרוב ירוק. `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` אופציונליים לבדיקת API |
| **github** | `GITHUB_TOKEN` או `GH_TOKEN` | אופציונלי — לסריקה עמוקה |
| **npm** | אין | בדיקת זמינות registry |

---

## Google והתראות

| שירות | משתנים חובה (לרשימת הסריקה) | הערה |
|--------|-------------------------------|------|
| **googleOAuth** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | התחברות עם Google |
| **googleAds** | `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN` | אפשר גם להגדיר בטאב אינטגרציות (מסד) |
| **webPush** | `WEB_PUSH_PUBLIC_KEY` או `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`, ו־`WEB_PUSH_PRIVATE_KEY` | VAPID |
| **studioSso** | `STUDIO_SSO_SECRET` | אופציונלי — fallback ל־`JWT_SECRET` |

---

## מה אפשר להשלים "ביחד" בלי סודות חיצוניים

- כתובות **localhost** לפיתוח: `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, `PUBLIC_URL` — `http://localhost:3001` (הפורט בפרויקט: `npm run dev -p 3001`).
- **PayPlus** — `PAYPLUS_BASE_URL` לפי דוגמת הפרויקט (ראה `.env.example`).
- **MongoDB** — `MONGODB_DB=vipo` אם מתאים.
- **Priority** — רק `PRIORITY_ENV=sandbox` כברירת מחדל לסביבת בדיקות; **שאר השדות** מהספק (Priority).

כל **מפתח API, סיסמה, טוקן OAuth, מחרוזת Mongo לפרודקשן** — נקבל מהספק / מסוף השירות ולא "ממלאים" אוטומטית.

---

## איך לראות מה חסר **אצלך** בפועל

1. מרכז בקרה → **אינטגרציות** → **סריקה מעמיקה**.  
2. או: קריאה ל־`GET /api/admin/system-status?deep=1` (מנהל) — לכל שירות יש `envChecklist` עם `present: true/false` לכל משתנה.

עדכון אחרון: נגזר מקוד הפרויקט (שירותי `SERVICE_ENV_CHECKLISTS`).
