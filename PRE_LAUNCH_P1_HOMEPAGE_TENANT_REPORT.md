# VIPO — P1 Homepage Tenant Strategy (Summary Report)

**מיקום הקובץ (מלא, לניווט ידני בתיקייה):**  
`C:\Users\ALFA DPM\Desktop\New Agent System Miriam\vipo-agents-stage-deploy\PRE_LAUNCH_P1_HOMEPAGE_TENANT_REPORT.md`

**תאריך:** 27 Apr 2026 (לפי הקשר הפרויקט)

---

## 1. מה `app/page.jsx` עשה לפני התיקון

- `buildItemListSchema()` שאל את MongoDB (דרך `getDb()`) את קולקציית `products`.
- הפילטר היה רק: `status: 'published'` ו-`active: { $ne: false }`.
- לא הייתה אסטרטגיית **tenant** מפורשת: גלובלית/חנות/מעורב — זה היה "ברירת מחדל" ללא `tenantId` בפילטר, מה שעלול לגעת בכל עסק או בלי קשר לסטטוס ה-tenant.
- `lib/db.js` ב-development מזהיר על שאילתות `products` בלי `tenantId` (DEV tenant warn).

**ה-UI** (`MarketplaceHome`) מושך מוצרים בפועל מ-`/api/marketplace/products` — שם כבר מוגדרת אסטרטגיית מרקטפלייס גלובלית (עסקים פעילים + מוצרים ללא tenant).

---

## 2. האם עמוד הבית הוא global marketplace או tenant-specific

**Global public marketplace (מרקטפלייס ציבורי).**

- `MarketplaceHome` + `/api/marketplace/products` מייצגים "מוצרים מכל העסקים" (עם בחירת tenant אופציונלית ב-UI), לא חנות של tenant בודד בנתיב `/` בלי החלפה.

---

## 3. איזה collections נשלחים, ואילו פילטרים (אחרי התיקון)

**ב-`app/page.jsx` (רק JSON-LD ItemList, לא ה-grid):**

1. `tenants` — טעינת עסקים במצב: `active` / `pending` (תואם ל-`GET /api/marketplace/products`).
2. `products` — שאילתה עם:
   - `status: 'published'`
   - `active: { $ne: false }`
   - `$or`:
     - `tenantId` ∈ עסקים פעילים במרקטפלייס
     - `tenantId` לא קיים
     - `tenantId: null` (מוצרים גלובליים)

כך **לא** נשענים על "חוסר `tenantId` בטעות" — יש הכלל מפורש: רק מוצרים ששייכים לעסקים במצב הופעה במרקטפלייס, או מוצרים מוגדרים כגלובליים.

---

## 4. קבצים ששונו

- `app/page.jsx` — הוספת `buildHomepagePublicMarketplaceFilter` + הערות אסטרטגיה, שימוש ב-`query` ב-`buildItemListSchema`.

**לא** נגעו ב: PayPlus, webhooks, הזמנות, `middleware`, `Business*`, API אחרים (לפי היקף P1).

---

## 5. בדיקות שרצו

| פקודה | תוצאה |
|--------|--------|
| `npm run build` | PASS |
| `npm run prelaunch:gate` | PASS (כולל lint, build, typecheck, test:api, test:ui) |

דוח JSON של ה-gate: `reports/pre-launch-gate.json` (אם הורסם מחדש — יתעדכן).

---

## 6. אישור: לא שינינו נתוני DB

- השינויים הם **קריאה בלבד** בזמן ריצה/SSR (שאילתות).
- **לא** בוצעו `update`, `delete`, migration, seed, או סקריפטים destructive.

---

## 7. מה עדיין עשוי להיות "לא מיושר" ל-100% (מודעים)

- ה-grid של המרקטפלייס עדיין מגיע מ-`/api/marketplace/products` (לא שונה במסגרת P1). אם יידרש איחוד מלא 1:1 בין JSON-LD ל-API, זה P2/שיפור נפרד.
- `productPassesMarketplaceVisibility` (מנגנון "מדדי נראות" מההגדרות) לא הוזרק ל-`buildItemListSchema` — כדי מינימום שינוי; אפשרי כהמשך אם ItemList ב-JSON-LD חייב להתאים בדיוק ל-visibility toggles.

---

**סיום:** אסטרטגיית tenant לעמוד הבית (שכבת ה-ItemList) מוגדרת מפורשות כ-**global public marketplace** עם סינון tenant בטוח, ולא נתוני DB.
