# SYSTEM AUDIT - VIPO Agents & Group-Buy Platform

**תאריך:** 2 בדצמבר 2025  
**גרסה:** vipo-agents v0.1.0  
**סטאק טכנולוגי:** Next.js 14, MongoDB, Tailwind CSS, PayPlus, Twilio, Cloudinary

---

## 1. סקירה כללית

מערכת VIPO היא פלטפורמת מסחר אלקטרוני עם מערכת סוכנים (Agents), קופונים, עמלות והפניות (Referrals). המערכת כוללת שלושה סוגי משתמשים: **לקוח (Customer)**, **סוכן (Agent)**, ו**מנהל (Admin)**.

### מבנה תיקיות ראשי

```
vipo-agents-test/
├── app/                    # Next.js App Router
│   ├── admin/              # דפי מנהל
│   ├── agent/              # דפי סוכן
│   ├── api/                # API Routes (41+ endpoints)
│   ├── cart/               # עגלת קניות
│   ├── checkout/           # תהליך תשלום
│   ├── customer/           # דשבורד לקוח
│   ├── products/           # קטלוג מוצרים
│   ├── components/         # קומפוננטות משותפות
│   └── context/            # React Context (Cart, Theme)
├── lib/                    # ספריות עזר
│   ├── auth/               # אימות
│   ├── payplus/            # אינטגרציית תשלומים
│   └── db.js               # חיבור MongoDB
├── models/                 # Mongoose Schemas
├── middleware.js           # הגנה על נתיבים
└── components/             # קומפוננטות נוספות
```

---

## 2. Routes Overview

### דפים ציבוריים (Public)

| נתיב             | תיאור          | סטטוס  |
| ---------------- | -------------- | ------ |
| `/`              | דף בית         | ✅ מלא |
| `/products`      | קטלוג מוצרים   | ✅ מלא |
| `/products/[id]` | דף מוצר בודד   | ✅ מלא |
| `/login`         | התחברות        | ✅ מלא |
| `/join`          | הרשמה          | ✅ מלא |
| `/contact`       | צור קשר        | ✅ מלא |
| `/p/[slug]`      | דף נחיתה לסוכן | ✅ מלא |

### דפי לקוח (Customer) - מוגנים

| נתיב        | תיאור            | סטטוס                |
| ----------- | ---------------- | -------------------- |
| `/customer` | דשבורד לקוח      | ✅ מלא               |
| `/cart`     | עגלת קניות       | 🟡 חלקי - קופון mock |
| `/checkout` | תהליך תשלום      | ✅ מלא עם Stepper    |
| `/orders`   | היסטוריית הזמנות | ✅ מלא               |
| `/profile`  | פרופיל משתמש     | ✅ מלא               |

### דפי סוכן (Agent) - מוגנים

| נתיב                 | תיאור           | סטטוס  |
| -------------------- | --------------- | ------ |
| `/agent`             | דשבורד סוכן     | ✅ מלא |
| `/agent/products`    | מוצרים לסוכן    | ✅ מלא |
| `/dashboard`         | דשבורד כללי     | ✅ מלא |
| `/dashboard/agent`   | סטטיסטיקות סוכן | ✅ מלא |
| `/dashboard/reports` | דוחות           | ✅ מלא |
| `/sales`             | מכירות          | ✅ מלא |

### דפי מנהל (Admin) - מוגנים

| נתיב                  | תיאור         | סטטוס  |
| --------------------- | ------------- | ------ |
| `/admin`              | דשבורד מנהל   | ✅ מלא |
| `/admin/users`        | ניהול משתמשים | ✅ מלא |
| `/admin/agents`       | ניהול סוכנים  | ✅ מלא |
| `/admin/products`     | ניהול מוצרים  | ✅ מלא |
| `/admin/orders`       | ניהול הזמנות  | ✅ מלא |
| `/admin/settings`     | הגדרות מערכת  | ✅ מלא |
| `/admin/reports`      | דוחות מנהל    | ✅ מלא |
| `/admin/transactions` | עסקאות        | ✅ מלא |

---

## 3. Role-Based Feature Map

### 👤 CLIENT (לקוח)

| פיצ'ר                  | סטטוס   | קבצים                                          | הערות                     |
| ---------------------- | ------- | ---------------------------------------------- | ------------------------- |
| הרשמה/התחברות          | ✅ עובד | `api/auth/register`, `api/auth/login`          | תומך email + phone        |
| OTP אימות              | ✅ עובד | `api/auth/send-otp`, `api/auth/verify-otp`     | Twilio (או mock)          |
| צפייה במוצרים          | ✅ עובד | `app/products/page.jsx`                        | קטלוג מלא                 |
| עגלת קניות             | ✅ עובד | `app/cart/page.jsx`, `context/CartContext.jsx` | localStorage              |
| הזנת קופון בעגלה       | 🟡 חלקי | `app/cart/page.jsx`                            | **משתמש ב-mock coupons!** |
| תהליך Checkout         | ✅ עובד | `app/checkout/page.jsx`                        | Stepper 4 שלבים           |
| אימות קופון ב-Checkout | ✅ עובד | `api/coupons/validate`                         | מחובר ל-API אמיתי         |
| יצירת הזמנה            | ✅ עובד | `api/orders` POST                              | כולל קופון + referral     |
| היסטוריית הזמנות       | ✅ עובד | `app/orders/page.jsx`                          |                           |
| שדרוג לסוכן            | ✅ עובד | `api/users/upgrade-to-agent`                   |                           |

### 🤝 AGENT (סוכן)

| פיצ'ר            | סטטוס   | קבצים                          | הערות                                   |
| ---------------- | ------- | ------------------------------ | --------------------------------------- |
| דשבורד סוכן      | ✅ עובד | `app/agent/page.jsx`           | KPIs מלאים                              |
| קוד קופון ייחודי | ✅ עובד | `models/User.js` (couponCode)  | נוצר אוטומטית                           |
| לינק הפניה       | ✅ עובד | `User.refLink` virtual         |                                         |
| מעקב הפניות      | ✅ עובד | `referredBy`, `referralsCount` |                                         |
| חישוב עמלות      | ✅ עובד | `api/orders`                   | `commissionPercent`, `commissionAmount` |
| יתרת עמלות       | ✅ עובד | `commissionBalance` בUser      |                                         |
| רשימת לקוחות     | ✅ עובד | `api/agent/customers`          |                                         |
| סטטיסטיקות       | ✅ עובד | `api/agent/stats`              |                                         |
| Gamification     | ✅ עובד | `api/gamification/*`           | levels, goals, bonuses                  |

### 👑 ADMIN (מנהל)

| פיצ'ר         | סטטוס   | קבצים                       | הערות                          |
| ------------- | ------- | --------------------------- | ------------------------------ |
| דשבורד מנהל   | ✅ עובד | `app/admin/page.js`         | מוגן עם requireAdmin           |
| ניהול משתמשים | ✅ עובד | `api/users/*`               | CRUD מלא                       |
| ניהול סוכנים  | ✅ עובד | `api/agents/*`              | אישור, חסימה                   |
| ניהול מוצרים  | ✅ עובד | `api/products/*`            | CRUD + קטלוגים                 |
| ניהול הזמנות  | ✅ עובד | `api/orders/*`              | צפייה, עדכון סטטוס             |
| דוחות         | ✅ עובד | `api/admin/reports/*`       | by-agent, by-product, overview |
| הגדרות עיצוב  | ✅ עובד | `api/settings`, `api/theme` | ThemeContext                   |
| התראות        | ✅ עובד | `api/admin/notifications`   |                                |
| עסקאות        | ✅ עובד | `api/transactions`          |                                |

---

## 4. Auth & Middleware

### מנגנון אימות

```javascript
// middleware.js
const PROTECTED_PREFIXES = ['/app', '/admin', '/agent', '/api/private', '/dashboard', '/customer'];
```

- **סוג אימות:** JWT בקוקי (`auth_token`)
- **תוקף:** 7 ימים
- **ספריית JWT:** `jose` (middleware) + `jsonwebtoken` (API)

### בדיקות הרשאה

| נתיב               | בדיקה                 | קובץ                 |
| ------------------ | --------------------- | -------------------- |
| `/admin/*`         | `requireAdmin()`      | `lib/auth/server.js` |
| `/agent/*`         | JWT בלבד              | middleware.js        |
| `/customer/*`      | JWT בלבד              | middleware.js        |
| `/api/orders` GET  | role check            | route.js             |
| `/api/orders` POST | `requireAuth()`       | route.js             |
| `/api/admin/*`     | role check בתוך route | משתנה                |

### פערי אבטחה פוטנציאליים

| בעיה                                | חומרה   | המלצה                 |
| ----------------------------------- | ------- | --------------------- |
| חלק מה-API routes ללא rate limiting | בינונית | הוסף rate limiter     |
| `/api/products` POST ללא auth       | גבוהה   | **הוסף requireAdmin** |
| `/api/delete-all-users` קיים        | קריטית  | **מחק או הגן**        |
| `/api/dev/*` routes                 | גבוהה   | **הסר בפרודקשן**      |

---

## 5. Business-Critical Flows

### A) קופונים (Coupons)

**מודל:** קופון מאוחסן ב-User (סוכן)

```javascript
// models/User.js
couponCode: String,        // קוד ייחודי
discountPercent: Number,   // אחוז הנחה (default: 10)
commissionPercent: Number, // אחוז עמלה (default: 12)
couponStatus: 'active' | 'inactive'
```

**API אימות:** `/api/coupons/validate`

- מחפש סוכן עם `couponCode` תואם
- מחזיר `discountPercent`, `commissionPercent`, `agentId`

**סטטוס:**

- ✅ API אימות קופון עובד
- ✅ Checkout משתמש ב-API אמיתי
- 🟡 **Cart page עדיין משתמש ב-mock coupons!**

### B) Checkout

**תהליך:**

1. לקוח ממלא פרטים (Stepper 4 שלבים)
2. מזין קופון (אופציונלי) → נשלח ל-`/api/coupons/validate`
3. לחיצה על "בצע הזמנה" → POST `/api/orders`
4. Order נוצר עם:
   - `appliedCouponCode`
   - `agentId` (מהקופון או מ-referral cookie)
   - `commissionReferral` (סכום העמלה)
5. PayPlus integration (fallback אם לא מוגדר)

**סטטוס:** ✅ עובד end-to-end

### C) Agent Commission

**חישוב עמלה:**

```javascript
// api/orders/route.js
commissionPercent = couponAgent.commissionPercent || 0;
const baseForCommission = Math.max(0, subtotal - discountAmount);
commissionAmount = (baseForCommission * commissionPercent) / 100;
```

**מעקב:**

- `Order.agentId` - מזהה הסוכן
- `Order.commissionReferral` - סכום העמלה
- `User.commissionBalance` - יתרת עמלות מצטברת

**סטטוס:** ✅ עובד

---

## 6. API Overview

### Auth APIs

| Route                  | Method | Auth | תיאור            |
| ---------------------- | ------ | ---- | ---------------- |
| `/api/auth/register`   | POST   | ❌   | הרשמה            |
| `/api/auth/login`      | POST   | ❌   | התחברות          |
| `/api/auth/logout`     | POST   | ✅   | התנתקות          |
| `/api/auth/me`         | GET    | ✅   | פרטי משתמש נוכחי |
| `/api/auth/send-otp`   | POST   | ❌   | שליחת OTP        |
| `/api/auth/verify-otp` | POST   | ❌   | אימות OTP        |

### Products APIs

| Route                | Method | Auth  | תיאור        |
| -------------------- | ------ | ----- | ------------ |
| `/api/products`      | GET    | ❌    | רשימת מוצרים |
| `/api/products`      | POST   | ❌ ⚠️ | יצירת מוצר   |
| `/api/products/[id]` | GET    | ❌    | מוצר בודד    |
| `/api/products/[id]` | PUT    | ❌ ⚠️ | עדכון מוצר   |
| `/api/products/[id]` | DELETE | ❌ ⚠️ | מחיקת מוצר   |

### Orders APIs

| Route              | Method | Auth | תיאור                   |
| ------------------ | ------ | ---- | ----------------------- |
| `/api/orders`      | GET    | ✅   | רשימת הזמנות (לפי role) |
| `/api/orders`      | POST   | ✅   | יצירת הזמנה             |
| `/api/orders/[id]` | GET    | ✅   | הזמנה בודדת             |
| `/api/orders/[id]` | PATCH  | ✅   | עדכון סטטוס             |

### Agent APIs

| Route                  | Method  | Auth | תיאור           |
| ---------------------- | ------- | ---- | --------------- |
| `/api/agents`          | GET     | ✅   | רשימת סוכנים    |
| `/api/agents/[id]`     | GET/PUT | ✅   | סוכן בודד       |
| `/api/agent/stats`     | GET     | ✅   | סטטיסטיקות סוכן |
| `/api/agent/coupon`    | GET     | ✅   | פרטי קופון      |
| `/api/agent/customers` | GET     | ✅   | לקוחות הסוכן    |

### Admin APIs

| Route                      | Method   | Auth     | תיאור        |
| -------------------------- | -------- | -------- | ------------ |
| `/api/admin/dashboard`     | GET      | ✅ Admin | נתוני דשבורד |
| `/api/admin/reports/*`     | GET      | ✅ Admin | דוחות        |
| `/api/admin/notifications` | GET/POST | ✅ Admin | התראות       |

---

## 7. Technical Health Check

### TypeScript

- **שימוש:** חלקי (בעיקר JS עם קבצי `.ts` בודדים)
- **tsconfig.json:** קיים ומוגדר
- **Types:** `@types/node`, `@types/react` מותקנים

### Code Quality

- ✅ ESLint מוגדר (`eslint-config-next`)
- ✅ Prettier מוגדר (`.prettierrc`)
- ✅ EditorConfig מוגדר
- ✅ `npm run lint:eslint` עובר ללא שגיאות

### תיקיות לניקוי

| תיקיה/קובץ                              | סיבה                    |
| --------------------------------------- | ----------------------- |
| `export_vipo_products_ui/`              | ריק                     |
| `vipo_products_ui_export/`              | כפילות                  |
| `backup_conflicting_routes/`            | ריק                     |
| `.mock-db/`                             | ריק                     |
| `pages/`                                | ריק (App Router בשימוש) |
| `__dbcheck.js`, `__user_model_hits.txt` | קבצי debug              |
| `*.STAGE_*.md` (רבים)                   | תיעוד ישן               |

### TODO/FIXME

לא נמצאו הערות TODO או FIXME בקוד.

---

## 8. Production Readiness – What's Missing

### 🔴 MUST HAVE (חוסמים להשקה)

| #   | תחום     | תיאור                                           | עדיפות |
| --- | -------- | ----------------------------------------------- | ------ |
| 1   | Security | הוסף auth ל-`/api/products` POST/PUT/DELETE     | קריטי  |
| 2   | Security | הסר `/api/delete-all-users`                     | קריטי  |
| 3   | Security | הסר `/api/dev/*` routes בפרודקשן                | קריטי  |
| 4   | Cart     | החלף mock coupons ב-API אמיתי ב-`cart/page.jsx` | גבוה   |
| 5   | Payment  | הגדר PayPlus ENV variables לפרודקשן             | גבוה   |
| 6   | Auth     | הוסף rate limiting ל-login/register             | גבוה   |
| 7   | Security | הוסף CSRF protection                            | בינוני |

### 🟡 SHOULD HAVE (לאחר השקה)

| #   | תחום          | תיאור                            |
| --- | ------------- | -------------------------------- |
| 1   | UX            | שיפור מסכי שגיאה (404, 500)      |
| 2   | Agent         | דשבורד מתקדם יותר עם גרפים       |
| 3   | Admin         | ייצוא נתונים ל-CSV/Excel         |
| 4   | Notifications | התראות WhatsApp אמיתיות (Twilio) |
| 5   | Orders        | מעקב משלוחים                     |
| 6   | Products      | ניהול מלאי מתקדם                 |

### 🟢 NICE TO HAVE

| #   | תחום      | תיאור                           |
| --- | --------- | ------------------------------- |
| 1   | Analytics | Google Analytics / Mixpanel     |
| 2   | Email     | התראות email (Nodemailer מותקן) |
| 3   | PWA       | שיפור Service Worker            |
| 4   | i18n      | תמיכה בשפות נוספות              |
| 5   | Tests     | הרחבת כיסוי בדיקות              |

---

## 9. סיכום

### נקודות חוזק

1. ✅ מבנה קוד מסודר ונקי
2. ✅ מערכת סוכנים וקופונים מלאה
3. ✅ Checkout עובד end-to-end
4. ✅ חישוב עמלות אוטומטי
5. ✅ דשבורדים לכל התפקידים
6. ✅ ESLint/Prettier מוגדרים

### נקודות לשיפור

1. ⚠️ Cart page עם mock coupons
2. ⚠️ חלק מה-APIs ללא הגנה
3. ⚠️ קבצי debug/dev בפרודקשן
4. ⚠️ חסר rate limiting

### הערכת מוכנות

| קטגוריה      | ציון    |
| ------------ | ------- |
| פונקציונליות | 85%     |
| אבטחה        | 65%     |
| UX           | 80%     |
| קוד          | 90%     |
| **כולל**     | **80%** |

---

_דו"ח זה נוצר אוטומטית על ידי Windsurf AI_
