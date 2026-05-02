# VIPO Importer — השלמת ארכיטקטורה (Supplement) גרסה 1

מסמך זה משלים את `VIPO_IMPORTER_SYSTEM_ARCHITECTURE_PLAN.md` ואת `VIPO_IMPORTER_ARCHITECTURE_REVIEW.md`, ומבוסס גם על `CATALOG_MANAGER_FULL_FUNCTIONAL_AUDIT.md` ו־`IMAGE_GENERATION_SYSTEM_AUDIT.md`. אין כאן מימוש קוד.

---

## 1. מטרת המסמך

‏מסמך זה **סוגר חורים אדריכליים** שזוהו בביקורת ומונעים התחלת Phase 1 בביטחון: חוזה פרסום לקטלוג, חוזה סכימה מול Mongoose, תור עבודה, אחסון, OCR, בקרת עלות AI, idempotency/retry, מכונת מצבים לטיוטות, SKU, מיפוי ספקים, זכויות מדיה, IAM, audit, ו־scope מפורט ל־Phase 0 ו־Phase 1.  
‏המסמך מהווה **Supplement V1** — ניתן לאשר אותו כתנאי סף לפני Sprint של Draft System; שינויים עתידיים יתועדו כ־V2.

---

## 2. החלטה רשמית: מותר להתחיל Phase 0

### מותר ב־Phase 0

‏- תיקונים ב־**`delete-products`** ו/או ב־**HTML של הקטלוג** כדי **ליישר** dryRun, confirm, ENV, והודעות UI עם תשובת השרת.  
‏- תיקון/אימות **`GET /api/products`** (או endpoint ייעודי) כך ש־**`tenantId` יסונן בשרת** ולא יוחזרו מוצרים של tenant אחר.  
‏- איחוד/תיקון **`requireAdmin`** מול **`requireAdminApi`** ו־**`super_admin`** (דפים ו־API) לפי מטריצת IAM של סעיף 14.  
‏- החלטה והטמעה על **מחיר fallback** (למשל איסור `12345` בשקט, או חסימת publish).  
‏- **חיבור מחדש** של `resolveSocialPublishMedia` ל־`socialPublisher` **או** הסרה/סימון מפורש של dead code + עדכון `getSocialAgentConfig` — **בחירה אחת** שתועד במסמך שחרור.  
‏- יצירת **מסמך Catalog Publish Contract** (סעיף 3 במסמך זה) כקובץ נלווה מאושר — אפשר כחלק מ־Phase 0 או כ־PR נפרד מיד לאחריו.  
‏- בדיקות אוטומטיות ו־QA ידני לפי סעיף 16.

### אסור ב־Phase 0

‏- יצירת **`product_import_*`** collections, APIs תחת `/api/import/*`, או UI של Import Center.  
‏- הוספת **PDF parsing**, **crawl**, **Alibaba**, **AI normalization**, **media staging** חדש, או **Publish Service** שקורא ל־upload/update מטיוטות.  
‏- שינוי **ארכיטקטורת iframe** ל־rewrite מלא של Catalog Manager.  
‏- **Deploy** לייצור ללא קריטריון הצלחה וסיכום סיכונים.

---

## 3. חוזה פרסום לקטלוג (Catalog Publish Contract)

‏חוזה זה מגדיר מה **Publish Service (עתידי)** חייב לבנות לפני קריאה ל־`POST /api/catalog-manager/upload` או `POST /api/catalog-manager/update`, בהתאם לקוד ולדוח הקטלוג.

### שדות חובה ברמת הבקשה (גוף HTTP)

‏- **`tenantId`**: מחרוזת ObjectId תקפה של tenant קיים ב־Mongo (כפי שמגיע מה־UI היום).  
‏- **`templateKey`**: מחרוזת לא ריקה; חייבת להתאים לתבנית ש־`resolveCatalogTemplate(templateKey, tenantId)` מחזירה — אחרת 400.  
‏- **`products`**: מערך לא ריק של אובייקטי מוצר.

### שדות חובה לכל איבר ב־`products[]` (לפי ולידציית upload)

‏- **`purchaseType`**: `'regular'` או `'group'`.  
‏- אם `purchaseType === 'group'`: **`groupPurchaseType`** חייב להיות `'group'` או `'shared_container'`.  
‏- **`images`**: לפחות **5** כתובות URL לא ריקות (מחרוזת או `{ url }`); אחרת השרת דוחה את המוצר עם שגיאה לפי SKU.  
‏- **`sku`**: מומלץ כחובה לוגית לכל פריט (ה־update מזהה לפי `{ tenantId, sku }`). ללא SKU תקף — סיכון כשלון או יצירת שורות לא צפויות.

### שדות אופציונליים / נגזרים (מילוי בשרת אם חסר)

‏- `name` / `title`, `description`, `fullDescription`, `category`, `subCategory`, `price`, `groupPrice`, `originalPrice`, `commission`, `stockCount`, `inStock`, `videoUrl`, `features`, `specs`, `suitableFor`, `whyChooseUs`, `warranty`, `groupPurchaseDetails`, `stainless` (אובייקט מימדים), וכו׳ — השרת משלים מברירות מחדל ומתבנית.

### פורמט media

‏- **`media.images`**: מערך אובייקטים `{ url: string, alt: string, position: number }` — נבנה בשרת מה־`images[]` שהלקוח שלח.  
‏- **`media.videoUrl`**: מחרוזת (אופציונלי).  
‏- מקור URL: Cloudinary או URL אחר שאושר במדיניות אבטחה; ב־Importer עתידי — העדפת **staging → publicId** לפני publish.

### פורמט seo

‏- אובייקט **`seo`** עם לפחות: `slug` (נגזר בשרת אם לא סופק במלואו), `slugPrefix`, `metaTitle`, `metaDescription`, `keywords[]`.

### פורמט stainless / specs

‏- **`stainless`**: `{ length, width, height, thickness, material, layers, hasMiddleShelf }` — מספרים/מחרוזות לפי הקיים; חסרים → `null` או ברירות מחדל בטקסט `specs`.  
‏- **`specs`**: מחרוזת טקסטואלית; אם חסר — נבנה טקסט ברירת מחדל מ־`stainless`.

### פורמט tenantId

‏- **מחרוזת** המתאימה ל־`Tenant.findById(tenantId)`; אין לשלוח שם עסק במקום מזהה.

### פורמט sku

‏- מחרוזת יציבה per tenant; תמיכה במצב הקיים של **וריאנטים**: `sku`, `sku-GROUP`, `sku-SC` (כפי שמופיע בטבלת DOM בקטלוג).  
‏- כללי תווים: להגדיר בארגון (למשל אותיות־מספרים־מקף); **אסור** רווחים מובילים/מסיימים.

### purchaseType / מצבי קבוצה

‏- **`purchaseType`**: `regular` | `group`.  
‏- **`type` בפנים Mongo** (ב־upload): ממופה ל־`online` עבור regular ול־`group` עבור group (לפי הקוד הקיים).  
‏- **`groupPurchaseType`**: `group` | `shared_container` כאשר `purchaseType === 'group'`; אחרת הלוגיקה בשרת מגדירה ערך פנימי — ה־Importer חייב לשלוח ערכים עקביים עם אותו מיפוי.

### כללי ולידציה (חובה לשכבת Importer לפני שליחה)

‏1) `tenantId` + `templateKey` קיימים ותואמים.  
‏2) לכל מוצר: `purchaseType` + תנאי `groupPurchaseType`.  
‏3) **לפחות 5 תמונות** לפני upload של מוצר חדש (ל־update — לפי מדיניות שתאושר; הקוד הנוכחי דומה).  
‏4) **אסור** לשלוח מחיר 0 או placeholder (`12345`) בלי דגל `needsHumanReview` בטיוטה ובלי חסימת publish — ראה Phase 0.  
‏5) אין לשלוח שדות שמבטיחים פעולה שלא נתמכת ב־API (למשל `dryRun` בתוך גוף upload — לא קיים).

### דוגמת payload מלאה (מינימום תקין ל־upload)

```json
{
  "tenantId": "674a1b2c3d4e5f6789012345",
  "templateKey": "stainless-worktable-v1",
  "products": [
    {
      "sku": "WT-304-180x80",
      "name": "שולחן עבודה נירוסטה 180×80",
      "title": "שולחן עבודה נירוסטה 180×80",
      "category": "שולחנות",
      "purchaseType": "regular",
      "price": 8900,
      "stockCount": 3,
      "inStock": true,
      "images": [
        "https://res.cloudinary.com/.../img1.jpg",
        "https://res.cloudinary.com/.../img2.jpg",
        "https://res.cloudinary.com/.../img3.jpg",
        "https://res.cloudinary.com/.../img4.jpg",
        "https://res.cloudinary.com/.../img5.jpg"
      ],
      "stainless": {
        "length": 180,
        "width": 80,
        "height": 90,
        "thickness": "1.2",
        "material": "304",
        "layers": 1,
        "hasMiddleShelf": false
      },
      "description": "תיאור קצר למוצר",
      "fullDescription": "<p>תיאור מלא...</p>"
    }
  ]
}
```

### מה אסור לשלוח

‏- מוצרים בלי **`purchaseType`** תקף או בלי **`groupPurchaseType`** כשצריך.  
‏- פחות מ־**5** תמונות ביצירה חדשה (upload) — ייכשל בשרת.  
‏- `tenantId` של tenant אחר מזה של המפעיל (חייב נבדק ב־Importer לפני publish).  
‏- שדות “פנימיים” שאינם חלק מהחוזה ומסתמכים על withdrawing strict mode — ראו סעיף 4.  
‏- JSON גולמי מייבוא קטלוג ללא sanitize — **לא** עובר ישירות ל־publish.

**הערת גרסה:** עם שינוי ב־`upload`/`update`, יש לעדכן **`catalogPublishContractVersion`** בטיוטה וב־audit.

---

## 4. חוזה סכימת מוצר (Mongoose)

### המצב בקוד היום

‏קובץ `models/Product.js` במאגר מציג **סכימה מינימלית** (`name`, `description`, `price`, `imageUrl`, `images[]`, `category`), בעוד ש־`upload/route.js` בונה אובייקט **עשיר** (`fullDescription`, `media`, `seo`, `stainless`, `purchaseType`, …) ושומרו ב־Mongo. לפי דוח הקטלוג, קיימת **אי־התאמה** בין הסכימה המוצהית לבין המציאות.

### האם להרחיב את Product schema

‏**כן — מומלץ ב־Phase 0 או בתחילת Phase 1** להביא את `ProductSchema` לייצג את השדות ש־upload/update באמת כותבים (לפחות ברמת `type`/מבנה, גם אם חלקם `Schema.Types.Mixed` זמנית). זה מאפשר ולידציה, אינדקסים, ודוקומנטציה.

### האם להשתמש ב־`strict: false`

‏**אפשרי כ־גשר קצר** אם יש שדות דינמיים שלא רוצים לנעול עדיין — **אבל** זה מגביר סיכון של שדות זבל, קושי ל־duplicate detection, ופערי אבטחה. **לא מומלץ** כיעד ארוך טווח.

### המלצה

‏1) **להרחיב את הסכימה** לשדות הליבה: `tenantId`, `sku`, `purchaseType`, `groupPurchaseType`, `type`, `media`, `seo`, `stainless`, `status`, `templateKey`, מחירים, מלאי.  
‏2) להשאיר `strict: true` (ברירת מחדל) ולהוסיף שדות עם `default` היכן שצריך.  
‏3) **Publish Service** חייב לבנות אובייקט שעובר **אימות מול אותה סכימה** לפני קריאה ל־route (שכבת `validateCatalogProductPayload` משותפת).

### סיכונים

‏| אפשרות | סיכון |
|--------|--------|
| סכימה צרה ו־strict=true | כשל שמירה אם השדה חסר — **טוב לייצור**, דורש התאמת נתונים |
| סכימה מינימלית ו־strict מרומז | שדות “נעלמים” או לא מוגדרים — **בינוני/גבוה** לפי גרסת Mongoose והגדרות |
| strict=false | גמישות מקסימלית — **סיכון עקביות ואבטחה** |

---

## 5. אסטרטגיית worker ותור משימות

### Phase 1 בלי worker מלא

‏- Jobs הם **מטא־דאטה ב־Mongo** (`product_import_jobs`) עם סטטוס `queued` / `running` / `completed` / `failed` / `cancelled`.  
‏- **אין** הרצת extraction ארוכה בשרת ב־Phase 1.  
‏- מעבר מצבים ידני או **סימולציה** (API שמעדכן סטטוס לצורך בדיקות) — לפי scope סעיף 17.

### מתי חייב worker אמיתי

‏- לפני **Phase 3 (PDF)**, **Phase 6 (Website crawl)**, וכל שלב שחורג מ־**~10–60 שניות** ב־timeout של פלטפורמת האירוח.  
‏- כאשר נדרש **retry**, **backoff**, **concurrency** מוגבלת, או **עיבוד מקבילי**.

### האם Vercel מספיק

‏- ל־**API קצר + כתיבת טיוטה** — כן.  
‏- ל־**PDF גדול / OCR / crawl** — לא כשרת יחיד בלי **background function** או worker חיצוני.

### המלצה טכנולוגית

‏| פתרון | מתאים ל |
|--------|---------|
| **Inngest** (או דומה) | צעדים מובנים, retries, תזמון, פחות תשתית |
| **BullMQ + Redis** | שליטה מלאה, throughput גבוה, דורש תחזוקה |
| **Worker נפרד** (Node על VM/Container) | עומס כבד, ספריות מקומיות (Tesseract), חיבור ל־Redis |

**המלצה:** Inngest או worker נפרד לפי מגבלות עלות וצוות; BullMQ אם כבר יש Redis מנוהל.

### ניסיון חוזר, תור כשלים, timeout וביטול

‏- **ניסיון חוזר:** exponential backoff לשגיאות זמינות (5xx, rate limit); **ללא** ניסיון חוזר אוטומטי על 4xx תחבירי.  
‏- **תור כשלים (DLQ):** לאחר N כשלים — `status=failed` + `errorSummary` + קישור ל־`import_logs`; אופציונלי תור DLQ ב־Inngest/Bull.  
‏- **Timeout:** מוגדר לכל שלב (למשל parse 120 שניות, רשת 30 שניות); חריגה → failed עם סיבה.  
‏- **ביטול:** `POST .../cancel` מסמן `cancel_requested`; worker בודק דגל בין שלבים; **לא** מוחק drafts שפורסמו (לפי האפיון המקורי).

---

## 6. אסטרטגיית אחסון קבצים

### סביבת פיתוח מקומית

‏- אחסון ב־**תיקייה מקומית** או **אחסון Blob לפיתוח** — ללא ייצור; מחיקה אוטומטית אחרי 24–48 שעות.

### ייצור

‏- **מומלץ:** אובייקט סטורג' מנוהל (**S3**, **GCS**, או **Vercel Blob** בתשלום) עם מפתח אובייקט: `imports/{tenantId}/{jobId}/{fileHash}.pdf`.  
‏- **לא** לשמור PDF מלא ב־Mongo — רק `storageKey`, `sha256`, `sizeBytes`, `mime`.

### שירות Cloudinary

‏- לשימוש ב־**מדיה ויזואלית** (תמונות/וידאו) — לא כמאגר ראשי ל־PDF אם המדיניות דורשת הפרדה; אם משתמשים — בתיקייה מבודדת `imports/raw/`.

### הצפנה

‏- **במנוחה:** SSE-KMS (S3) או מקביל; **במעבר:** TLS בלבד מספיק אם אין דרישת ציות מחמירה.

### מגבלות

‏- **גודל מקסימום:** ברירת מחדל מוצעת **25MB** ל־PDF; ניתן להעלות ל־100MB רק עם worker ייעודי.  
‏- **Retention:** 7–30 יום לקבצי מקור לאחר סיום job (או ארכיון ל־cold storage).  
‏- **מחיקה:** job מסומן `completed`/`failed`/`cancelled` → משימת ניקוי מוחקת אובייקט.

### סריקת וירוסים ובטיחות

‏- אופציונלי ב־Phase 3+; בינתיים: סף גודל, MIME allowlist (`application/pdf`), סריקה בסיסית של magic bytes, ו־**sandbox** בעתיד אם תקציב.

---

## 7. אסטרטגיית OCR

### Phase 3 — PDF טקסטואלי בלבד

‏- שימוש ב־`pdf-parse` (או מקביל) ל־PDF עם טקסט נבחר; **ללא OCR**.

### מתי OCR נכנס

‏- כאשר זוהה PDF **סרוק** (דף ללא טקסט נבחר / אחוז תווים נמוך) — מעבר לשלב OCR **אחרי** MVP טקסטואלי.

### שפות

‏- **עברית ואנגלית:** Tesseract עם `osd` + `heb+eng` או שירות ענן (Google Document AI / AWS Textract) — החלטה לפי דיוק ועלות.  
‏- **סינית (Alibaba):** נדרש מודל שפה ייעודי; **לא** ב־MVP.

### Tesseract מול ענן

‏| קריטריון | Tesseract | ענן |
|-----------|-----------|-----|
| עלות | נמוכה יותר | לפי שימוש |
| דיוק טבלאות | בינוני | גבוה יותר |
| תפעול | worker עם בינאריות | API keys + ציות |

**המלצה:** MVP טקסט → Tesseract self-hosted לשלב ביניים → ענן לייצור כבד.

### confidence ו־fallback

‏- לכל דף OCR: `confidence` ממוצע; מתחת לסף (למשל **0.75**) → `needsHumanReview=true` ואין מעבר אוטומטי ל־`approved`.  
‏- **Fallback ידני:** הורדת תמונות הדף + תיוג ידני ב־UI או החלפת קובץ.

---

## 8. בקרת עלות AI

### מכסה יומית

‏- מונה גלובלי **`ai_tokens_daily`** / **`ai_images_daily`** (Redis או Mongo) עם איפוס UTC.

### מכסה לפי דייר

‏- מונה נפרד **`ai_usage_by_tenant:{date}`**; חריגה → חסימה או דרישת super_admin.

### עצירה קשיחה

‏- אם `AI_IMPORT_HARD_STOP=true` ב־ENV — כל קריאה ל־normalize/generate נדחית ב־503/403 עם קוד עסקי.

### הערכת עלות לפני הרצה (dry-run)

‏- לפני job: הערכת טוקנים לפי אורך `rawExtract` מצומצם; אם מעל תקרה — דורש אישור מפורש.

### רישום פעילות (לוגים)

‏- כל קריאה: `tenantId`, `jobId`, `draftId`, `model`, `inputTokens`, `outputTokens`, `costUsd` (מחושב), `actorId`.

### מתג כיבוי ב־ENV

‏- `AI_IMPORT_ENABLED`, `AI_IMPORT_MAX_USD_PER_DAY`, `AI_IMPORT_MAX_CALLS_PER_TENANT_PER_DAY`.

### מי רשאי להפעיל AI

‏- לפי סעיף 14: ברירת מחדל **super_admin** בלבד; **admin** לפי מדיניות ארגון בכתב.

---

## 9. מפתח חזרתיות, ניסיונות חוזרים ובטיחות פרסום

### מפתח חזרתיות (idempotencyKey)

‏- ב־`POST /api/import/jobs`: כותרת אופציונלית `Idempotency-Key` או שדה גוף; אם קיים job זהה ב־24h — מחזירים אותו `jobId`.

### מזהה ניסיון פרסום (publishAttemptId)

‏- UUID לכל ניסיון publish; נשמר ב־`import_logs` ובתגובת ה־API.

### מדיניות ניסיונות חוזרים (retry)

‏- רשת/5xx: עד 3 ניסיונים, backoff 1s/4s/10s.  
‏- 401/403: ללא retry.

### לחיצה כפולה

‏- אותו `publishAttemptId` או hash של payload בתוך חלון זמן — השרת מחזיר תוצאה **זהה** (409 או 200 עם אותו מזהה).

### פרסום חלקי

‏- כאשר bulk upload/update מחזיר `errors[]` / `notFound[]` — הטיוטה או אצווה הכללית עוברת ל־**`published_partial`** עם רשימת הצלחות/כשלים.

### חזרה אחורה ופיצוי (rollback / compensating)

‏- **אין** rollback אוטומטי של Mongo אחרי publish מוצלח חלקי — רק **פעולה מתגמלת ידנית** (רשימת SKU לביטול, סקריפט תחזוקה) מתועדת ב־runbook.  
‏- לפני publish: **dryRun** דרך אותו נתיב (אם נתמך) או סימולציה שבודקת payload מול schema.

### מצב `published_partial`

‏- נשמר ב־draft או ב־`job.stats`; UI חובה מציג “דורש טיפול”; **אין** מעבר אוטומטי ל־`published`.

---

## 10. Draft State Machine

‏הערה: חלק מהמצבים הם **ברמת job** וחלק **ברמת draft**. להלן פירוט **טיוטה** כברירת מחדל; `extracting`/`normalized` יכולים להיות גם ב־job.

| מצב | מי מעביר | נתיב API | ביקורת (audit) | rollback אפשרי |
|-----|-----------|-----------|----------------|-----------------|
| `created` | מערכת אחרי יצירת רשומה | `POST .../drafts` (פנימי) | כן | מחיקה רכה |
| `extracting` | worker / מערכת | עדכון פנימי מ־job | כן | חזרה ל־`failed` + ניקוי pointer קובץ |
| `normalized` | שירות נורמליזציה (עתידי) | פנימי | כן | אם לא פורסם — כן |
| `needs_review` | מערכת (ביטחון נמוך) / אדמין | `PATCH` לטיוטה | כן | כן |
| `approved` | `business_admin`/`admin` לפי IAM | `POST .../approve` | כן | חזרה ל־`needs_review` רק ע״י super_admin + סיבה |
| `publishing_dry_run` | מערכת לפני פרסום | `POST .../publish` עם `dryRun:true` | כן | לא רלוונטי |
| `ready_to_publish` | מערכת אחרי dry-run מוצלח | אוטומטי או `PATCH` | כן | חזרה ל־`approved` |
| `publishing` | מערכת בתחילת פרסום אמיתי | `POST .../publish` | כן | לא אוטומטי |
| `published` | מערכת אחרי הצלחה מלאה | סיום פרסום | כן | ידני בלבד |
| `published_partial` | מערכת | סיום פרסום עם שגיאות חלקיות | כן | תכנון ידני |
| `failed` | מערכת על שגיאה בלתי ניתנת להמשך | פנימי / timeout | כן | יצירת draft חדש |
| `rejected` | אדמין | `POST .../reject` | כן | לא |
| `cancelled` | אדמין / מערכת | `POST .../jobs/:id/cancel` | כן | לא מפרסם |

‏**Phase 1:** מצבים פעילים: `created`, `needs_review`, `approved`, `rejected`, `cancelled` (ללא פרסום אמיתי — מצבי `publishing*` רק כדמה או מאחורי דגל תצורה).

---

## 11. SKU Strategy

‏- **SKU חובה** לפני כל ניסיון publish (מחרוזת לא ריקה).  
‏- **ייחודיות:** ייחודי per `(tenantId, sku)` בהתאם לשאילתת `update` הקיימת.  
‏- **SKU זמני:** קידומת `TMP-` + `shortId` עד אישור אדמין; ה־Importer חוסם publish עד החלפה.  
‏- **GROUP / SC:** שמירה על suffixes `-GROUP` / `-SC` כפי שמקטלוג בונה וריאנטים; duplicate detection בודק גם בסיס SKU.  
‏- **כפולים:** שירות duplicates מחזיר התאמה; המשתמש בוחר merge/skip/new — ללא החלטה אוטומטית בייצור.  
‏- **AI:** אסור לקבל `sku` ממודל בלי `source: "ai_proposed"` + `needsHumanReview`; publish נחסם עד אישור ידני.

---

## 12. Supplier Mapping Strategy

‏- **`import_mapping_templates`:** שדה `version` שלם עולה; **אין** overwrite של גרסה קיימת — רק יצירת גרסה חדשה.  
‏- **`supplier_sources`:** `configVersion` או קישור ל־`templateVersion` אחרון שאושר.  
‏- **Regression:** לכל תבנית — שמירת **`goldenSample.pdf`** (בסטורג’) + צפי שדות JSON; CI מריץ חילוץ ומשווה diff מבוקר.  
‏- **שינוי מבנה PDF:** גרסה חדשה של template; job ישן נשאר על גרסה ישנה; job חדש משתמש בגרסה חדשה לאחר אישור.

---

## 13. Media Ownership & Rights

‏- **מקור תמונה:** enum: `uploaded_by_merchant`, `imported_from_supplier_url`, `generated_marketing`, `unknown`.  
‏- **URL מקור:** חובה לשמור לצורך הוכחה/DMCA.  
‏- **שימוש:** רק אם `legalNotes` של הספק/ToS מאשרים; אחרת `needsHumanReview`.  
‏- **Alibaba:** ללא אישור משפטי — `origin=unknown` + חסימת publish.  
‏- **איסור הסרת watermark** — כל זיהוי עיבוד כזה → `rejected`.  
‏- **metadata חובה:** `sha256`, `width`, `height`, `mime`, `origin` (כפי באפיון המקורי).  
‏- **DMCA / evidence:** שמירת `sourceUri`, timestamp, `actorId` של המאשר.

---

## 14. אבטחה והרשאות (IAM)

### תפקידים

‏- **super_admin:** גישה גלובלית; יכול לעקוף מגבלות דייר בתרחישים מתועדים.  
‏- **admin:** גלובלי או ארגוני לפי מדיניות — מוגדר בכתב בארגון.  
‏- **business_admin:** רק `tenantId` שלו מ־JWT; לא יוצר מדיניות ספק גלובלית.  
‏- **viewer:** צפייה בלבד בלוגים/טיוטות לפי דייר.

### מטריצת פעולות (ברירת מחדל מוצעת)

| פעולה | super_admin | admin | business_admin | viewer |
|--------|-------------|-------|------------------|--------|
| יצירת job | כן | לפי מדיניות | לא / לפי מדיניות | לא |
| העלאת קובץ | כן | כן | כן (דייר) | לא |
| הרצת חילוץ | כן | כן | לא (Phase 1) | לא |
| עריכת טיוטה | כן | כן | כן (דייר) | לא |
| אישור טיוטה | כן | כן | כן (דייר) | לא |
| פרסום | כן | לא (ברירת מחדל) | לא | לא |
| יצירת תמונה | כן | לא | לא | לא |
| מחיקת staging | כן | כן | כן (דייר) | לא |
| צפייה בלוגים | כן | כן | כן (דייר) | כן (דייר) |

**הערה:** יישור עם ממצא הקטלוג — `requireAdmin` שבודק רק `admin` **חייב** לכלול `super_admin` או להפריד דפים; זה חלק מ־Phase 0.

---

## 15. חוזה ביקורת (Audit)

### אירועים חובה

‏- יצירת/ביטול job; יצירת/עדכון/אישור/דחיית טיוטה; ניסיון פרסום (dry-run ואמיתי); כשל פרסום; גישה ללוגים רגישים; שינוי הרשאות; מחיקת staging.

### תמצית payload (payloadDigest)

‏- SHA-256 על JSON קנוני של payload **לאחר הסרת שדות רגישים** (מפתחות API, טוקנים); שמירת 16 תווים ראשונים + salt פנימי.

### מיסוך

‏- מספרי טלפון, אימיילים, כתובות URL עם מפתחות — `***`.

### שמירת נתונים (retention)

‏- **12 חודשים** לפחות לפעולות פרסום/מחיקה; שאר הפעולות 90 יום אלא אם ציות דורש יותר.

### מי רואה

‏- **viewer ומעלה** לפי דייר; **super_admin** לכל; ייצוא לוגים — super_admin בלבד.

### מחיקת רשומות ביקורת

‏- **אסור** למחיקה שגרתית; רק **מחיקה משפטית** (GDPR) בתהליך מאושר עם רישום מטא־ביקורת (מי מחק ומתי).

---

## 16. Phase 0 Detailed Scope

### תיקון אי־התאמת dryRun במחיקה

‏- **קבצים צפויים:** `public/_standalone/catalog-manager/index.html` (פונקציית מחיקה), `app/api/catalog-manager/delete-products/route.js`.  
‏- **בדיקות:** אינטגרציה — בקשה ללא `dryRun:false` לא משנה Mongo; UI לא מציג “נמחק” כש־`dryRun`.  
‏- **הצלחה:** מחיקה אמיתית רק אחרי שני שלבים ו־ENV; הודעות תואמות תשובה.  
‏- **לא עושים:** שינוי לוגיקת Cloudinary מעבר לנדרש.

### `GET /api/products` וסינון לפי דייר

‏- **קבצים:** `app/api/products/route.js` (או מיקום בפועל), הקטלוג `index.html` אם נדרש query אחר.  
‏- **בדיקות:** tenant A לא רואה מוצרי B; כולל `includeInactive` אם קיים.  
‏- **הצלחה:** סנכרון סטטוסים בקטלוג תואם DB.  
‏- **לא:** שינוי סכימת Product מלא בלי סעיף 4.

### requireAdmin / requireAdminApi

‏- **קבצים:** `lib/auth/server.js`, דפי `standalone`, `vipo-image-studio`, routes קטלוג.  
‏- **בדיקות:** JWT `super_admin` מקבל גישה היכן שנדרש; 403 עקבי.  
‏- **הצלחה:** מטריצת IAM מסעיף 14 מתקיימת.  
‏- **לא:** הרחבת תפקידים חדשים בלי מסמך.

### מחיר ברירת מחדל 12345

‏- **קבצים:** מיקום בניית payload ב־`index.html` / עזרי מחיר.  
‏- **בדיקות:** מחיר 0 לא נשלח כ־12345 בשקט; אזהרה או חסימה.  
‏- **הצלחה:** מדיניות כתובה ב־ENV + התנהגות אחידה.  
‏- **לא:** שינוי נוסחת תמחור מלאה.

### קוד מת של DALL·E

‏- **קבצים:** `lib/socialAgent/socialPublisher.js`, `lib/socialAgent/mediaAssets.js`, `lib/socialAgent/config.js`.  
‏- **בדיקות:** או נתיב פעיל עם feature flag או הסרה עם בדיקת build.  
‏- **הצלחה:** אין קוד “מת” ללא תיעוד.  
‏- **לא:** הוספת Importer.

### יצירת Catalog Publish Contract

‏- **מסמך:** אושר כ־Supplement סעיף 3 או קובץ `CATALOG_PUBLISH_CONTRACT.md` עתידי.  
‏- **בדיקות:** בדיקת יחידה על validator מול דוגמאות תקינות/פסולות.  
‏- **הצלחה:** צוות מסכים על החוזה.  
‏- **לא:** מימוש Publish Service.

---

## 17. Phase 1 Detailed Scope

### אוספי מסד נתונים מינימליים

‏- `product_import_jobs` — ללא הרצת worker; שדות: `tenantId`, `createdBy`, `status`, `sourceType` (רק `manual`), `input` (מינימלי), `timestamps`, `idempotencyKey?`.  
‏- `product_import_drafts` — `tenantId`, `targetSku`, `normalizedProduct` (JSON), `status`, `lockVersion`, `sourceTrace`, `schemaVersion`.  
‏- `import_logs` — לפי סעיף 15.

### נתיבי API מינימליים

‏- `POST/GET /api/import/jobs`, `POST /api/import/jobs/:id/cancel`.  
‏- `GET/PATCH /api/import/drafts`, `GET /api/import/drafts/:id`.  
‏- `POST .../approve`, `POST .../reject`.  
‏- **ללא** `publish` אמיתי — או stub שמחזיר 501 עם הודעה.

### מכונת מצבים

‏- מימוש מצבי סעיף 10 המסומנים ל־Phase 1 בלבד.

### ביקורת (audit)

‏- כל הקריאות ל־API לעיל נרשמות.

### הפרדת דיירים

‏- בדיקה כפולה: JWT tenant מול `tenantId` בגוף/נתיב; בדיקות אוטומטיות 403.

### במפורש לא ב־Phase 1

‏- PDF, crawl, Alibaba, AI, publish אמיתי, Cloudinary staging חדש, duplicate service מלא.

---

## 18. Open Questions Before Coding Phase 1

‏1) האם `business_admin` יקבל יצירת job בייצור או רק עריכת טיוטה?  
‏2) האם נדרש **soft delete** לטיוטות או מחיקה פיזית?  
‏3) גרסת Mongo ל־transactions — האם נדרש multi-document transaction ל־approve+audit?  
‏4) האם `normalizedProduct` ב־Phase 1 הוא אובייקט חופשי או מתחיל מ־JSON Schema מוסכם?  
‏5) האם מותר ל־`super_admin` לשנות `tenantId` על טיוטה (עם audit)?  
‏6) פורמט `lockVersion` — מספר שלם או etag מחרוזת?

---

## 19. Final Recommendation

‏- **להתחיל Phase 0 מיד** לפי סעיף 16 — הוא מפחית סיכון קריטי ומתן בסיס לחוזה.  
‏- **לא להתחיל Phase 1** עד **אישור מסמך Supplement V1** (או V1.1 עם תשובות לסעיף 18) על ידי בעל מוצר/טכנולוגיה.  
‏- **סדר עבודה מומלץ:** Phase 0 (כולל הרחבת Product schema או החלטה מפורשת על strict) → אישור חוזה פרסום → Phase 1 (מסד נתונים + API + audit + בדיקות הפרדת דיירים) → Phase 2 ממשק.

---

מסמך זה הוא השלמת אפיון בלבד. לא בוצעו שינויי קוד, לא בוצע deploy, ולא שונו נתוני מערכת.
