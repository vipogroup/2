# META_INTEGRATION_STATUS_REPORT

**מערכת:** VIPO (`vipo-agents-stage-deploy`)  
**סוג:** סריקת קוד ומבנה בלבד — **ללא** שינוי קוד, deploy, ENV או מחיקות.  
**תאריך דוח:** 2026-05-01  

---

## 1. מצב נוכחי

**מה קיים בפועל בקוד:**

| תחום | מצב |
|------|-----|
| **קטלוג XML ל־Meta (RSS + `g:`)** | Route קיים: `GET /api/marketplace/meta-feed` — מחזיר XML כש־`META_FEED_ENABLED=true` ו־`META_FEED_TENANT_ID` תקין; אחרת 404 / 503. |
| **מיפוי מוצר → שדות קטלוג** | קיים ב־`lib/meta/metaFeedMapper.js` + גuards ב־`metaFeedGuards.js` + קבועים ב־`metaFeedConstants.js`. |
| **פרסום לרשתות (Graph API)** | קיים ב־`lib/socialAgent/metaClient.js` (Facebook Page, IG Business, Reels, Stories) + אורכסטרציה ב־`socialPublisher.js` + Cron ב־`/api/cron/social-publisher`. |
| **WhatsApp — Cloud API (שליחה)** | `lib/notifications/sendWhatsApp.js` — `graph.facebook.com/v19.0/.../messages` עם `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID`; ללא טוקן = DRY_RUN בלוג. |
| **WhatsApp — Webhook נכנס (CRM)** | `POST` (וגם לוגיקה) ב־`/api/crm/whatsapp/webhook` — פרסור 360dialog / Cloud API ו־פורמט פנימי; יצירת Lead/Conversation. |
| **WhatsApp — שירות CRM מרובה־ספק** | `lib/crm/whatsappService.js` — `internal` / `local` (שרת `whatsapp-web.js`) / `twilio` / `360dialog` / `mock`. |
| **UI** | קישורי `wa.me` בדפים (למשל `app/p/[slug]/page.jsx`, `ReferralCard.jsx`); שדות רשתות ב־`SettingsForm.jsx`; אדמין: `/admin/social-posts`, `/admin/social-audit`. |
| **אנליטיקס צד לקוח** | Google Analytics / `gtag` — **לא** נמצא Meta Pixel / `fbq` בחיפוש בקבצי האפליקציה (רק התאמות לא רלוונטיות כמו `maxDiffPixels`). |

**מה התנהגות ה־feed בפועל (לוגיקה):**

- סינון **מלאי בלבד**: `stockCount > 0`, `inStock: true`, מצב קטלוג `stock` דרך `passesStockOnlyCatalogMode`, לא `group` / shared container חסומים.
- **מחיר:** `price > 0` בשאילתה; בmapper — `formatGPrice` דורש מספר חיובי.
- **תמונה:** לפחות `media.images.0` בשאילתה; בmapper — URL `https` באורך סביר (`isValidHttpsImageUrl`).
- **Tenant:** מזהה מ־`META_FEED_TENANT_ID` (ObjectId); אימות קיום ב־`tenants`.

---

## 2. מה הושלם

- **Meta Feed (שלב 1 — בסיס קטלוג):** route + `lib/meta/*` + תאימות ל־**RSS 2.0** עם מרחב שמות **`xmlns:g`** (פורמט מוכר לקטלוגי מוצרים / Meta).
- **מיפוי שדות:** `g:id`, `g:title`, `g:description`, `g:availability`, `g:condition`, `g:price`, `g:link`, `g:image_link`, `g:brand`, אופציונלי `g:inventory`, `g:product_type`.
- **Graph API לפרסום:** פונקציות server-side ב־`metaClient.js` (לא SDK צד דפדפן).
- **Insights בסיסי:** `getPostInsights` ב־`metaClient.js`.
- **Social agent config:** `lib/socialAgent/config.js` — `META_APP_ID`, `META_APP_SECRET`, `META_ACCESS_TOKEN`, `META_PAGE_ID`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `META_GRAPH_API_VERSION`, דגלים ל־`SOCIAL_AGENT_*`.
- **כותרות Cache:** `next.config.js` + `META_FEED_CACHE_HEADERS` על ה־route.
- **WhatsApp נכנס + CRM:** webhook + מודלים (לפי הקוד ב־route).
- **אדמין חברתי:** דפי social-posts / social-audit.

---

## 3. מה לא הושלם / מה חלקי

| נושא | פירוט |
|------|--------|
| **חיבור “אוטומטי” ל־Meta Commerce** | אין בקוד **Catalog API** / דחיפת מוצרים ישירות ל־Meta — רק **feed URL** שממנו Meta יכולה למשוך (Phase 1 לפי תיאור הערוץ ב־XML). |
| **Instagram Shopping כמוצר קטלוג** | יש **פרסום תוכן** ל־IG Business דרך Graph; **לא** נמצאה הפרדה מפורשת ל־“Shopping / product tagging” מול קטלוג Meta. |
| **Meta Pixel / CAPI** | **לא** אותרו בקוד האפליקציה (אין `fbq` / Meta Pixel script מובנה בחיפוש). |
| **Business Manager “מלא”** | אין זרימת OAuth/UI להרשאות Meta בתוך האפליקציה — הסתמכות על **טוקנים ו־IDs ב־ENV** ל־Social Agent. |
| **`META_FEED_*` בתבניות ENV** | המשתנים **מוזכרים רק בקוד ה־route**; **לא** הופיעו ב־`.env.example` / `.env.local.example` בחיפוש — סיכון לתצורה “שקטה” בפרודקשן בלי תיעוד אחיד. |
| **`validateSocialAgentConfig`** | בודק `META_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `OPENAI_API_KEY` — **לא** דורש במפורש `META_PAGE_ID`, בעוד ש־`socialPublisher` דורש `metaPageId` לפלטפורמת `facebook_page`. |

---

## 4. סיכונים

- **ENV לא מתועד ל־Meta Feed:** קל לשכוח `META_FEED_ENABLED` / `META_FEED_TENANT_ID` בפרודקשן → feed 404/503 בלי סיבה ברורה למפעילים.
- **כפילות מסלולי WhatsApp:** `sendWhatsApp.js` (Cloud API) מול `whatsappService.js` (ספקים שונים) — סיכון לבלבול איזה נתיב בשימוש בכל פיצ’ר.
- **`META_FEED_CANONICAL_ORIGIN` קשיח** ב־`metaFeedConstants.js` ל־`https://www.vipo-group.com` — אם דומיין/tenant משתנים, הלינקים ב־feed עלולים שלא להתאים לסביבה (Preview/Staging).
- **Cron social-publisher:** תלוי `CRON_SECRET` / `CRON_API_TOKEN` + ENV מלא של Social Agent — כשל שקט אם חסר.
- **`whatsapp-web.js` ב־`package.json`:** תלות כבדה; אם לא בשימוש בפועל — עומס אבטחה/תחזוקה.

---

## 5. מה חסר טכנית (רשימה ממוקדת)

1. **תיעוד ENV אחיד** ל־`META_FEED_ENABLED`, `META_FEED_TENANT_ID` (וגם `META_FEED_*` / origin אם יועבר ל־ENV).
2. **אימות תצורה** ל־Social Agent שכולל גם `META_PAGE_ID` כשפלטפורמה כוללת Facebook Page.
3. **Pixel / Conversions API** — אם נדרש למדידה ושיווק: הוספת שכבת צד־לקוח + אופציונלי CAPI server-side.
4. **מסלול WhatsApp יחיד מוסכם** — מתי Cloud API (`sendWhatsApp.js`) מול CRM service מול Twilio.
5. **אימות ידני ב־Meta Business Suite:** הזנת URL ה־feed, מיפוי שדות, תדירות ריענון — **מחוץ** לקוד.
6. **Instagram Shopping / קישור קטלוג** — הגדרות בצד Meta + וידוא שהמוצרים ב־feed תואמים למדיניות תוכן.

---

## 6. שלבים להשלמה (מומלץ לפי סדר)

**שלב 1:** לאשר ב־Vercel (או סביבת היעד) את `META_FEED_ENABLED=true` ו־`META_FEED_TENANT_ID` הנכון; לבדוק `GET /api/marketplace/meta-feed` (200 + XML).

**שלב 2:** ב־Meta Commerce Manager — ליצור/לחבר Data Source מה־URL של ה־feed; לבדוק שגיאות שדות ותמונות.

**שלב 3:** להשלים ENV של Social Agent (`META_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `META_PAGE_ID`, `OPENAI_API_KEY`, `SOCIAL_AGENT_ENABLED`) ולבדוק `/api/cron/social-publisher` עם סוד Cron ב־Preview.

**שלב 4:** WhatsApp — להחליט ספק יחיד; להגדיר `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_ID` או Twilio או webhook מול ספק; לבדוק `/api/crm/whatsapp/webhook` מול חתימת Meta.

**שלב 5:** אם נדרש Pixel/CAPI — תכנון הטמעה + מדיניות פרטיות.

**שלב 6:** תיעוד פנימי קצר (Runbook): “איך מפעילים feed + איך מפעילים פרסום חברתי”.

---

## 7. המלצה מקצועית

- **לא לשבור את המערכת:** להפעיל שינויים ב־**Preview** בלבד; לשמור על **feed כשכבה אופציונלית** (`META_FEED_ENABLED`) עד שבדקתם XML מול Meta.
- **להפריד אחריות:** ה־feed מטפל ב־**קטלוג מוצרים**; ה־Social Agent ב־**תוכן שיווקי**; WhatsApp ב־**הודעות ו־CRM** — שלושה מסלולים; לא למזג הגדרות בלי תכנון.
- **לתעד ENV במקום אחד** (למשל טבלה ב־Confluence / README פנימי) כדי שלא יסתמכו רק על `.env.local` מקומי.
- **לפני Pixel/CAPI:** החלטת מוצר ופרטיות — זה מגע בנתוני משתמשים.

---

### נספח — קבצים עיקריים שנסרקו

| נושא | נתיבים |
|------|--------|
| Feed | `app/api/marketplace/meta-feed/route.js`, `lib/meta/*`, `next.config.js` (headers) |
| Graph / פרסום | `lib/socialAgent/metaClient.js`, `socialPublisher.js`, `app/api/cron/social-publisher/route.js`, `lib/socialAgent/config.js` |
| WhatsApp שליחה | `lib/notifications/sendWhatsApp.js`, `app/api/sales/[id]/route.js`, `app/api/test-whatsapp/route.js` |
| WhatsApp CRM | `app/api/crm/whatsapp/webhook/route.js`, `lib/crm/whatsappService.js` |
| UI אדמין | `app/admin/social-posts/*`, `app/admin/social-audit/*`, `app/components/admin/SettingsForm.jsx` |
