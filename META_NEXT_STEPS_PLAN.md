# META_NEXT_STEPS_PLAN — תכנון אופרטיבי

**מבוסס על:** `META_INTEGRATION_STATUS_REPORT.md`  
**סוג:** מסמך תכנון בלבד — **ללא** שינוי קוד, **ללא** deploy.  
**תאריך:** 2026-05-01  

---

## 1. מה כבר מוכן לשימוש מיידי

| פריט | הערה אופרטיבית |
|------|------------------|
| **Meta Catalog Feed (קוד)** | Route `GET /api/marketplace/meta-feed` + `lib/meta/*` — מוכן ברגע ש־ENV מוגדרים וה־DB מכיל מוצרים שעוברים את הסינון. |
| **מיפוי וולידציה ב־feed** | מלאי, מחיר > 0, תמונה HTTPS, tenant, סינון קבוצתי/shared — כבר בלוגיקה. |
| **Graph API (שרת)** | `metaClient.js` + `socialPublisher.js` — מוכן כש־ENV של Social Agent מלאים ו־Cron מאומת. |
| **WhatsApp Cloud שליחה (קוד)** | `sendWhatsApp.js` — מוכן עם `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` (אחרת DRY_RUN). |
| **Webhook נכנס (CRM)** | `/api/crm/whatsapp/webhook` — מוכן לבדיקת אינטגרציה מול ספק. |
| **אדמין חברתי** | `/admin/social-posts`, `/admin/social-audit` — לניטור/תפעול לאחר שהצינור חי. |

---

## 2. מה מסוכן להפעיל עכשיו (בלי הכנה)

| סיכון | למה |
|--------|-----|
| **`META_FEED_ENABLED=true` בפרודקשן בלי בדיקה** | קטלוג Meta יימשך מנתונים חיים; שגיאות בשדות/תמונות יתקעו בדיאגנוסטיקה בצד Meta. |
| **Cron `social-publisher` עם טוקן חי ו־`SOCIAL_AGENT_ENABLED` בלי Preview** | פרסומים אמיתיים לפייסבוק/אינסטגרם — קשה לבטל מהר. |
| **שינוי ENV של WhatsApp “בעיניים עצומות”** | כפילות נתיבים (`sendWhatsApp.js` מול `whatsappService.js`) — שליחה לכיוון הלא נכון או כפולה. |
| **הפעלת Pixel/CAPI בלי מדיניות פרטיות** | חשיפת אירועים ומשתמשים — סיכון משפטי/מוצרי. |

---

## 3. מה חייבים לבדוק ידנית ב־Meta Business Suite

- **Commerce Manager / Catalog:** הזנת URL ה־feed, סטטוס סנכרון, שגיאות שדות (מחיר, תמונה, מזהה, זמינות).
- **התאמת דומיין ו־URL מוצר:** שהלינקים ב־XML (כיום מבוססים על origin קשיח בקוד) תואמים לאתר החי שממנו Meta מצפה לגלוש.
- **הרשאות וטוקנים:** Page ID, IG Business Account, System User / Long-lived token — תוקף ותחומים (scopes).
- **Webhooks (אם Cloud API):** אימות חתימה, URL ציבורי, מצב sandbox מול prod.
- **מדיניות תוכן / דחיות קטלוג:** מוצרים שנפלטים מה־feed מול מה שמאושר בקטלוג.

---

## 4. סדר פעולות מומלץ (Phases)

### Phase 1 — Meta Catalog Feed only
1. Preview או סביבת בדיקה: `META_FEED_ENABLED=true`, `META_FEED_TENANT_ID` נכון.  
2. `GET /api/marketplace/meta-feed` → 200, XML תקין.  
3. Meta Commerce Manager → Data source מה־URL → תיקון שגיאות עד ירוק.  
4. **רק אז** שקילה לפרודקשן.

### Phase 2 — Pixel / Events
1. החלטת מוצר: אילו אירועים (ViewContent, Purchase וכו’).  
2. תכנון CAPI מול Pixel (אם נדרש) + פרטיות.  
3. הטמעה ב־**Preview** → אימות ב־Events Manager.  
4. פרודקשן.

### Phase 3 — WhatsApp Business
1. בחירת ספק יחיד (Cloud / Twilio / 360dialog / local).  
2. הגדרת ENV בהתאם + בדיקת שליחה ידנית.  
3. חיבור webhook נכנס + בדיקת יצירת Lead ב־CRM.  
4. Runbook: מי מקבל התראות, SLA.

### Phase 4 — Instagram / Facebook product tagging
1. קישור קטלוג Meta למוצרים (בצד Meta) לאחר ש־Phase 1 יציב.  
2. בדיקת תיוג/שופינג לפי דרישות Meta (לא רק פרסום תוכן מ־Graph).  

### Phase 5 — Auto posting / agents
1. `SOCIAL_AGENT_*` + `OPENAI_API_KEY` + טוקנים.  
2. בדיקת Cron ב־Preview עם `CRON_SECRET`.  
3. מצב approval אם קיים (`SOCIAL_AGENT_APPROVAL_MODE`) לפני פרסום אוטומטי מלא.

---

## 5. אילו ENV חסרים לתיעוד (לא לעריכה — רשימה לתכנון)

**חובה לתעד במקום אחד (Runbook / טבלת ENV):**

| משתנה | הקשר |
|--------|------|
| `META_FEED_ENABLED` | הפעלת ה־route |
| `META_FEED_TENANT_ID` | ObjectId של tenant ב־Mongo |
| `META_APP_ID`, `META_APP_SECRET`, `META_ACCESS_TOKEN`, `META_PAGE_ID` | Social Agent / Graph |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `META_GRAPH_API_VERSION` | IG + גרסת API |
| `SOCIAL_AGENT_ENABLED`, `SOCIAL_AGENT_*` (ממשקים, מגבלות יום) | אוטומציית פרסום |
| `OPENAI_API_KEY` | נדרש ל־validateSocialAgentConfig היום |
| `CRON_SECRET` / `CRON_API_TOKEN` | קריאה ל־`/api/cron/social-publisher` |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` | שליחת Cloud API (`sendWhatsApp.js`) |
| `WHATSAPP_PROVIDER`, `WHATSAPP_LOCAL_URL`, משתני Twilio / 360dialog | `whatsappService.js` |

**הערה:** `META_FEED_*` לא מופיעים בתבניות `.env*.example` שנסרקו בדוח — **תיעוד חיצוני חובה** עד שיוסיפו לתבניות (מחוץ לתכנון זה אם נשארים בלי שינוי קוד).

---

## 6. אילו בדיקות אסור לדלג עליהן

- [ ] XML מה־feed מול **Diagnostics** בקטלוג Meta (שגיאות per-item).  
- [ ] דגימת מוצרים: מחיר, מטבע, תמונה HTTPS, קישור 200, מלאי.  
- [ ] בדיקת **tenant נכון** — אין מוצרים “זרים” בקטלוג.  
- [ ] שליחת WhatsApp **בדיקה** ליעד מבוקר לפני הפעלה המונית.  
- [ ] Webhook נכנס: הודעה אחת → Lead/Conversation צפוי.  
- [ ] Cron social: קריאה עם סוד + תוצאה בלי פרסום לא רצוי (או עם approval).  
- [ ] לפני Pixel: עמידה במדיניות פרטיות + בדיקת Events Manager.

---

## 7. המלצה ברורה — מה לעשות ראשון

**להתחיל רק מ־Phase 1:** להפעיל ולבדוק את **`/api/marketplace/meta-feed`** בסביבה מבוקרת (Preview / staging), לחבר את ה־URL ב־**Meta Commerce Manager**, ולסגור את כל שגיאות הקטלוג **לפני** Pixel, WhatsApp מלא, או פרסום אוטומטי.

זה נותן בסיס מוצר אחיד לכל שאר השכבות (שיווק, הודעות, תיוג).
