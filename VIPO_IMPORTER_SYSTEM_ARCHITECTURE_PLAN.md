# VIPO — תוכנית ארכיטקטורה לשדרוג מערכת קטלוג וייבוא מוצרים

מסמך זה נכתב כאפיון ותכנון בלבד, על בסיס שני דוחות הסריקה הקיימים במאגר (`CATALOG_MANAGER_FULL_FUNCTIONAL_AUDIT.md`, `IMAGE_GENERATION_SYSTEM_AUDIT.md`) ועקרונות ארכיטקטורה מקובלים. אין כאן מימוש קוד.

---

## 1. תקציר מנהלים

‏**מה המערכת עושה היום:** VIPO מפעילה **Catalog Manager** כ־iframe סטטי עתיר לוגיקה, עם **מקור אמת מקומי** לתמחור/טבלה/הזמנות ב־`localStorage` per-tenant, ופרסום ל־Mongo דרך **`POST /api/catalog-manager/upload`** ו־**`POST /api/catalog-manager/update`** (super_admin, `templateKey`, `syncProductUpsert`). במקביל קיימים ממשקי מוצרים נוספים (למשל `ProductsClient` / localStorage אדמין) שאינם ממורכזים עם הקטלוג.  
‏**הבעיה המרכזית:** אין **שכבת טיוטה, אישור, מקור (source trace), או בקרת סיכונים אחידה** בין ייבוא/AI לבין `products`. ייבוא JSON/CSV בקטלוג הוא **overwrite מקומי** ללא שרת; פרסום הוא **כתיבה ישירה** לקולקציית מוצרים. דוחות הסריקה מזהים **פערים מסוכנים** (מחיקה: dryRun ברירת מחדל מול UI; סנכרון סטטוסים מול `GET /api/products`; פער סכימת Mongoose מול payload עשיר).  
‏**החזון:** פלטפורמת **Import Center** עם Jobs ו־Drafts ב־DB, נורמליזציה ב־AI עם confidence וביקורת אדם, זיהוי כפילויות, staging למדיה, חיבור מבוקר ל־**אותם endpoints פרסום** שכבר קיימים, ואוטומציית SEO/חברתי **רק אחרי** שהייבוא והפרסום הבסיסיים יציבים.

---

## 2. מצב קיים לפי הדוחות

‏**Catalog Manager:** דף Next + `iframe` ל־`index.html` מונוליתי; טבלה, אשף העלאה, מנהל מדיה (Cloudinary מהדפדפן), תבניות דרך `/api/admin/catalog-templates`, פרסום bulk.  
‏**localStorage:** מפתחות scoped ל־tenant (`cm:tenant::…`), מיפוי מדיה, גיבויים, העדפות — **אינם** audit ולא multi-user.  
‏**upload/update API:** ליבת הפרסום; ולידציות (למשל מינימום תמונות ב־upload); `update` מחזיר `notFound`/`errors`.  
‏**tenant handling:** בחירת tenant ב־UI; שרת דורש `tenantId`; קטגוריות Studio נפרדות מקטלוג אך דומות ברוח (`/api/studio/tenants/.../categories`).  
‏**media handling:** מיפוי מקומי + Cloudinary; מחיקה/ניקוי דרך נתיבי `catalog-manager/*`.  
‏**Image generation / Desktop Studio:** SSO קצר, JWT ל־Desktop; **Flux וכו׳ לא בקוד המאגר**.  
‏**Social image pipeline:** קוד DALL·E 3 ב־`mediaAssets.js` — **לא מחובר** ל־`socialPublisher.js`; `generateImages` לא ב־config — נתיב כנראה **מת**.  
‏**בעיות שהתגלו:** מחיקת מוצרים (dryRun מול UI); `GET /api/products?tenantId` לעומת route בפועל; מחיר fallback `12345`; ייבוא JSON ללא ולידציה; `uploadOptionsModal` מת; `requireAdmin` מצומצם מול super_admin בדפים מסוימים; CORS `*` ב־Studio; אי־עקביות אפשרית ב־`lib/auth/server.js` מול ייבואי `requireAdminApi`.

---

## 3. עקרונות תכנון מחייבים

‏1) **לא שוברים את Catalog Manager** — שומרים על iframe/לוגיקת תמחור קיימת בתקופת מעבר; שינויים הדרגתיים דרך adapter ולא rewrite בבת אחת.  
‏2) **לא כותבים ישירות ל־`products` בלי draft** — כל ייבוא חיצוני נכנס ל־`product_import_drafts` (או מקביל) עד אישור.  
‏3) **כל ייבוא עובר preview ואישור** — גם “ייבוא קטן”; אפשר לאשר bulk עם סיכום סיכונים.  
‏4) **כל פעולה מסוכנת: dryRun + confirm** — כולל מחיקה, publish bulk, החלפת tenant, מחיקת מדיה.  
‏5) **כל מוצר חייב `tenantId` ברור** — אין publish בלי tenant; בדיקת התאמה ל־session.  
‏6) **כל מוצר חייב source trace** — `supplierId`, `sourceType`, `sourceUri`/`fileHash`, `extractedAt`, `jobId`.  
‏7) **כל תמונה חייבת metadata** — `sha256`, `width`/`height`, `mime`, `origin` (upload/generated/imported), `altProposal`, `stagingUrl` לעומת `publishedPublicId`.  
‏8) **כל פרסום חייב audit log** — מי, מתי, איזה draft, איזה payload ל־upload/update, תוצאה.  
‏9) **כל פלט AI חייב בדיקת איכות** — JSON schema, טווחים, sanity מחיר, רשימת שדות חובה, confidence + דגל “דורש עריכה ידנית”.

---

## 4. ארכיטקטורה מוצעת ברמה גבוהה

```
PDF / Website / Alibaba
    → Source Adapter (ממשק אחיד: fetchRaw + parseMetadata)
    → Extraction (מבנה גולמי: טבלאות, HTML, תמונות, מטא־דאטה)
    → AI Normalization (מיפוי לשדות VIPO + confidence + warnings)
    → Product Drafts (Mongo, סטטוס draft/review/rejected)
    → Duplicate Detection (SKU, שם+מידות, תמונה hash רך)
    → Media Quality Check (רזולוציה, כמות, עקביות SKU)
    → Optional Image Generation (מחובר ל־Connector — DALL·E/Studio)
    → Admin Preview (UI חדש, לא ה־iframe)
    → Approval (אישור מפורש + סיכום dryRun publish)
    → Publish via Catalog Manager API (upload/update בלבד — ללא שכפול לוגיקת מחירון מה־HTML)
    → Sync / Marketplace / SEO / Social (שלבים עתידיים, אחרי יציבות)
```

---

## 5. מודולים חדשים נדרשים

### 5.1 Import Center UI
‏**אחריות:** ניהול jobs, drafts, סטטוסים, אישורים.  
‏**קבצים צפויים:** `app/admin/import-center/**` (או שם מוצרי), רכיבי טבלה/מסכי review.  
‏**API צפוי:** עוטף את `/api/import/*` (להלן).  
‏**DB:** קורא/כותב `product_import_jobs`, `product_import_drafts`, `import_logs`.  
‏**תלות:** Publish Service, Auth.  
‏**סיכונים:** עומס על אדמינים אם UX גרוע; חשיפת מידע בין tenants אם לא מסננים.

### 5.2 Import Jobs API
‏**אחריות:** יצירה, הרצה, מעקב, ביטול, dryRun.  
‏**קבצים:** `app/api/import/jobs/**`.  
‏**API:** REST לפי סעיף 7.  
‏**DB:** `product_import_jobs`.  
‏**תלות:** Adapters, Normalization, Logs.  
‏**סיכונים:** jobs ארוכים — צריך queue (מומלץ worker נפרד בשלב מאוחר יותר).

### 5.3 Product Import Drafts
‏**אחריות:** ייצוג מוצר לפני publish.  
‏**DB:** `product_import_drafts`.  
‏**תלות:** Catalog templates (לשדות ברירת מחדל), tenants.  
‏**סיכונים:** נפח מסמכים — אינדקסים וריטנשן.

### 5.4 Source Adapters
‏**אחריות:** PDF / Website / Alibaba — אותו ממשק פנימי.  
‏**קבצים:** `lib/import/adapters/*.ts` (או js).  
‏**תלות:** extraction libs, רשת, אחסון קבצים זמני.  
‏**סיכונים:** ToS, חסימות IP, תוכן זדוני בקבצים.

### 5.5 AI Normalization Service
‏**אחריות:** טרנספורמציה מובנית + validation.  
‏**API:** פנימי או `/api/import/normalize` (אופציונלי).  
‏**DB:** שומה על `rawExtract` ו־`normalized` בטיוטה.  
‏**סיכונים:** hallucinations, עלות טוקנים.

### 5.6 Duplicate Detection Service
‏**אחריות:** השוואה ל־`products` לפי tenant.  
‏**API:** `/api/import/detect-duplicates`.  
‏**סיכונים:** false positive/negative — חייב UI לאישור.

### 5.7 Media Staging Service
‏**אחריות:** העלאה ל־Cloudinary תחת prefix טיוטה, קישור לטיוטה.  
‏**DB:** `import_media_staging`.  
‏**תלות:** Cloudinary config קיים.  
‏**סיכונים:** עלות אחסון; ניקוי כשלים.

### 5.8 Image Generation Connector
‏**אחריות:** גשר ל־Desktop Studio ו/או DALL·E server-side; לעולם לא ישירות ל־products.  
‏**API:** `/api/import/media/generate` (אסינכרוני).  
‏**תלות:** Studio SSO/JWT או מפתח OpenAI מאושר.  
‏**סיכונים:** זהות מוצר שגויה; עלויות; תוכן לא אתי — חייב policy.

### 5.9 Publish Service
‏**אחריות:** בניית payload זהה לקטלוג הקיים וקריאה ל־`upload`/`update` **אחרי** אישור ו־dryRun.  
‏**תלות:** Catalog templates, `syncProductUpsert` (קיים).  
‏**סיכונים:** שגיאות partial — טרנזקציות ברמת מוצר או דוח שגיאות מפורט.

### 5.10 Audit / Logs
‏**אחריות:** `import_logs` + אולי שימוש חוזר ב־`auditlogs`.  
‏**סיכונים:** PII בלוגים — מיסוך.

### 5.11 Supplier Sources
‏**אחריות:** זיהוי ספק, credentials מוצפנים (אם API), מדיניות שימוש.  
‏**DB:** `supplier_sources`.  
‏**סיכונים:** סיסמאות; Alibaba ToS.

### 5.12 Mapping Templates
‏**אחריות:** מיפוי עמודות PDF/שדות אתר לשדות VIPO.  
‏**DB:** `import_mapping_templates`.  
‏**תלות:** per tenant + per קטגוריה.

---

## 6. DB Collections מוצעות

### 6.1 `product_import_jobs`
‏**מטרה:** מעקב אחר ריצת ייבוא.  
‏**שדות מרכזיים:** `_id`, `tenantId`, `createdBy`, `sourceType` (pdf|website|alibaba|manual), `supplierSourceId`, `status` (queued|running|paused|completed|failed|cancelled), `progress` (אחוז/שלב), `input` (uri, fileId, options), `startedAt`, `finishedAt`, `errorSummary`, `stats` (rows, draftsCreated, duplicates).  
‏**אינדקסים:** `{ tenantId:1, createdAt:-1 }`, `{ status:1, createdAt:1 }`.  
‏**קשרים:** `tenantId` → tenants; `createdBy` → users.  
‏**Retention:** 90 יום למצב completed/failed (ארכיון ל־S3 אופציונלי); שמירת `input` מינימלית (hash במקום קובץ גדול).

### 6.2 `product_import_drafts`
‏**מטרה:** טיוטת מוצר לפני publish.  
‏**שדות:** `jobId`, `tenantId`, `targetSku` (מוצע), `normalizedProduct` (אובייקט תואם לקטלוג), `rawExtract` (מוגבל בגודל או pointer), `confidence`, `warnings[]`, `duplicateOfProductId`, `mediaStagingIds[]`, `status` (draft|needs_review|approved|rejected|published), `approvedBy`, `approvedAt`, `publishedProductId`, `sourceTrace`.  
‏**אינדקסים:** `{ tenantId:1, status:1, updatedAt:-1 }`, `{ jobId:1 }`, `{ targetSku:1, tenantId:1 }`.  
‏**קשרים:** לאחר publish → `products._id`.  
‏**Retention:** לאחר publish — עדכון ל־published + ארכיון 180 יום; rejected — 30 יום.

### 6.3 `supplier_sources`
‏**מטרה:** קונפיגורציית מקורות.  
‏**שדות:** `tenantId`, `type`, `name`, `baseUrl`, `apiCredentialsRef` (לא plaintext), `legalNotes`, `active`, `rateLimitPolicy`.  
‏**אינדקסים:** `{ tenantId:1, type:1, active:1 }`.  
‏**Retention:** כל עוד פעיל; גרסאות שינוי ב־`import_logs`.

### 6.4 `import_logs`
‏**מטרה:** audit צעד־צעד.  
‏**שדות:** `jobId`, `draftId`, `level`, `action`, `actorId`, `ip`, `payloadDigest`, `result`, `durationMs`.  
‏**אינדקסים:** `{ jobId:1, ts:-1 }`, `{ actorId:1, ts:-1 }`.  
‏**Retention:** 12–24 חודש לפי צורך ציות.

### 6.5 `import_media_staging`
‏**מטרה:** מדיה לפני קישור למוצר חי.  
‏**שדות:** `draftId`, `tenantId`, `url`, `publicId`, `sha256`, `width`, `height`, `mime`, `origin`, `altProposal`, `expiresAt`.  
‏**אינדקסים:** `{ draftId:1 }`, `{ expiresAt:1 }` (TTL אינדקס מומלץ).  
‏**Retention:** TTL 14–30 יום אם לא פורסם.

### 6.6 `import_mapping_templates`
‏**מטרה:** מיפוי שדות לפי ספק/פורמט.  
‏**שדות:** `tenantId`, `name`, `version`, `rules` (JSON), `createdBy`.  
‏**אינדקסים:** `{ tenantId:1, name:1, version:-1 }`.

### 6.7 `ai_generation_jobs`
‏**מטרה:** תורים ליצירת תמונה/טקסט.  
‏**שדות:** `draftId`, `kind` (product_hero|banner|social), `provider` (dalle|studio|…), `status`, `costEstimate`, `resultMediaStagingId`, `error`.  
‏**אינדקסים:** `{ status:1, createdAt:1 }`, `{ draftId:1 }`.  
‏**Retention:** כמו staging + לוג עלויות.

---

## 7. API מוצעים

| Method | Route | מטרה | הרשאות | Payload (תמצית) | Response (תמצית) | dryRun | audit |
|--------|-------|------|---------|-------------------|------------------|--------|------|
| POST | `/api/import/jobs` | יצירת job | super_admin או admin לפי מדיניות | `tenantId`, `sourceType`, `input`, `options` | `{ jobId }` | אופציונלי ל־validate בלבד | כן |
| GET | `/api/import/jobs` | רשימת jobs | כנ"ל | query: `tenantId`, `status`, `page` | `{ jobs[] }` | לא | נמוך |
| GET | `/api/import/jobs/:id` | פירוט job | כנ"ל | — | job + progress | לא | נמוך |
| POST | `/api/import/jobs/:id/run` | הרצה | כנ"ל | `dryRun?`, `limit?` | סטטוס/סטטיסטיקה | **מומלץ true לברירת מחדל** | כן |
| GET | `/api/import/drafts` | רשימת טיוטות | כנ"ל | filters | `{ drafts[] }` | לא | נמוך |
| PATCH | `/api/import/drafts/:id` | עריכה ידנית | כנ"ל | שדות מותרים בלבד | draft מעודכן | לא | כן |
| POST | `/api/import/drafts/:id/approve` | אישור | כנ"ל | `comment`, `confirmToken?` | סטטוס | לא | כן |
| POST | `/api/import/drafts/:id/reject` | דחייה | כנ"ל | `reason` | סטטוס | לא | כן |
| POST | `/api/import/drafts/:id/publish` | פרסום | super_admin (או מצומצם) | `dryRun` חובה ראשון; אישור שני | תוצאת upload/update | **חובה דו-שלבי** | כן |
| POST | `/api/import/detect-duplicates` | זיהוי כפול | כנ"ל | `tenantId`, `candidates[]` | התאמות | לא | בינוני |
| POST | `/api/import/media/check` | בדיקת איכות | כנ"ל | `urls[]` או `stagingIds[]` | דוח | לא | בינוני |
| POST | `/api/import/media/generate` | יצירת תמונה | מוגבל + תקרת עלות | `draftId`, `kind`, `provider` | `ai_generation_jobs` | לא (אבל **מצב preview** בתוך draft) | כן |
| POST | `/api/import/suppliers` | יצירת ספק | super_admin | גוף מקור | id | לא | כן |
| GET | `/api/import/suppliers` | רשימה | admin+tenant scope | — | רשימה | לא | נמוך |

---

## 8. UI/UX מוצע

לכל מסך: **מטרה | שדות | כפתורים | טעינה | שגיאות | הרשאות | UX safety**.

‏**Import Center dashboard:** סיכום jobs, שגיאות 24ש, עלות AI — super_admin רואה הכול; business_admin רק tenant. טעינה: skeleton; שגיאות: toast + קוד; safety: אין פעולות הרס בלי אישור.

‏**New Import Job:** בחירת tenant (חובה), סוג מקור, העלאת קובץ/URL — כפתורי "שמור טיוטה" / "הרץ ניתוח". שגיאות: ולידציה מפורשת; safety: **לא publish**.

‏**Source Selection:** רדיו PDF / Website / Alibaba — הסבר סיכונים ל־Alibaba.

‏**Upload PDF:** drag&drop, גודל מקסימום, virus scan אופציונלי — כפתור "המשך"; שגיאות פורמט.

‏**Factory Website URL:** URL, עומק crawl, כיבוד robots — "תצוגה מקדימה" (dry run).

‏**Alibaba URL:** אזהרה משפטית, מצב "רק ניתוח" — מינימום שדות.

‏**Job Progress:** שלבים, לוג מצומצם, ביטול — admin; safety: cancel לא מוחק drafts שפורסמו.

‏**Draft Review Table:** סינון לפי confidence, duplicate — bulk approve **אסור** בלי סיכום סיכונים.

‏**Product Detail Review:** JSON צד־לצד, diff מול מוצר קיים — שדות נעולים לפי הרשאה.

‏**Duplicate Review:** הצבעה merge/skip/new sku — audit.

‏**Media Review:** גלריה, חוסר רזולוציה, החלפת סדר — קישור ל־staging.

‏**AI SEO Review:** שלב עתידי — disabled עד Phase מאוחר.

‏**Publish Confirmation:** שני שלבים: (1) dryRun תוצאה מ־API קטלוג (2) הקלדת confirm או checkbox מפורש — **רק super_admin** לפי דוח הקטלוג.

‏**Import History:** טבלה + ייצוא audit — viewer אופציונלי read-only.

---

## 9. חיבור ל־Catalog Manager הקיים

‏**מה לא משנים:** את `index.html` ואת מחירון ה־localStorage ככלי עבודה יומיומי לצוות קיים — לא migration אגרסיבי ביום אחד.  
‏**Endpoints קיימים:** `POST /api/catalog-manager/upload`, `POST /api/catalog-manager/update` — **נקודת publish יחידה** לשכבת Publish Service.  
‏**Adapter:** שירות שממיר `product_import_drafts.normalizedProduct` למבנה **זהה** לקטלוג היום (כולל `purchaseType`, `media.images`, `stainless`, וכו׳) לפי אותם כללי אשף.  
‏**לא לשכפל לוגיקה:** לא מעתיקים את נוסחת המחיר מ־HTML לשרת — או משאירים חישוב בלקוח עד שמחליטים על מקור אמת שרתי, או מגדירים שירות מחיר **אחד** בשרת בשלב מאוחר.  
‏**מה לתקן לפני חיבור:** (1) מחיקת מוצרים — יישור dryRun/confirm עם UI; (2) `GET /api/products` עם `tenantId` או endpoint ייעודי לסנכרון; (3) איחוד `Product` schema עם reality.  
‏**localStorage:** מוגדר כ־**cache עבודה** בלבד; אין לוות עליו לייבוא רשמי — ה־Importer כותב ל־DB.  
‏**dryRun מחיקה:** כל קריאה מ־Import Center לפעולות מסוכנות חייבת לעבור את אותם guardים כמו ב־`delete-products` (כולל `confirm`, רשימות, ENV) — **לא** לשחזר את באג ה־HTML הנוכחי.

---

## 10. חיבור למערכת יצירת תמונות

‏**קיים:** Desktop Studio (SSO, tenants, categories), DALL·E ב־`mediaAssets.js` + Cloudinary mirror.  
‏**לא מחובר:** `resolveSocialPublishMedia` ↔ `socialPublisher`; אין `generateImages` ב־config.  
‏**Image Generation Connector:**  
‏- API שרת `/api/import/media/generate` שיוצר `ai_generation_jobs`, קורא ל־provider (DALL·E או bridge ל־Studio אם יתווסף), שומר ל־`import_media_staging`, מקשר ל־`draftId`.  
‏**מתי להפעיל:** רק אחרי `media/check` שמסמן חוסר/איכות נמוכה, ובהסכמת מדיניות עלות.  
‏**טיוטה:** תוצאה לא נדחפת ל־`products.media` עד אישור ב־Draft Review.  
‏**מניעת תמונות שגויות:** הצלבה `draft.sku` + `prompt` + איסור שימוש בשם מותג ספק; human checkbox.  
‏**זהות מוצר:** לא משתמשים ב־DALL·E כ“צילום מוצר”; לפוטוגרפיה — Studio או העלאה ידנית בלבד.  
‏**עלויות:** תקרה יומית, חיוב לפי tenant, דוח ב־Import Center.

---

## 11. PDF Importer — אפיון

‏**העלאה:** ל־אחסון זמני (S3/Vercel blob) + hash; virus scan אופציונלי.  
‏**טקסט:** שכבת `pdf-parse` / OCR (Tesseract או שירות cloud) ל־PDF סרוק.  
‏**טבלאות:** זיהוי טבלאות לפי גיאומטריה + כללי `mapping_templates`.  
‏**תמונות:** חילוץ embedded images + checksum.  
‏**זיהוי מוצרים:** לפי שורות טבלה + כותרות קטגוריה; כללים per ספק.  
‏**SKU / MOQ / מחיר / מידות:** מיפוי עמודות + ולידציה מספרית; MOQ נכנס ל־`warnings` אם לא נתמך ב־VIPO היום.  
‏**PDF סרוק:** נתיב OCR + confidence נמוך → חובה review אנושי.  
‏**AI:** מקבל טקסט גולמי מצומצם + schema ל־`normalizedProduct`; שומר `rawExtract`.  
‏**Drafts:** לכל שורה/מוצר מזוהה — draft נפרד או קיבוץ לפי החלטה.  
‏**אישור ידני:** תמיד למחיר, ל־SKU חדש, ולתמונות חסרות.

---

## 12. Factory Website Importer — אפיון

‏**Crawling:** BFS עם עומק מוגבל, רשימת allowlist דומיינים.  
‏**Sitemap:** נקודת כניסה מועדפת.  
‏**schema.org:** `Product`, `Offer` — חילוץ מובנה כשקיים.  
‏**דפי מוצר:** heuristics ל־כותרת, מחיר, גלריה, JSON-LD.  
‏**תמונות:** הורדה ל־staging בלבד; כיבוד `robots.txt`.  
‏**Rate limits:** תור + backoff; שמירת `lastFetchAt` per domain ב־`supplier_sources`.  
‏**מיפוי:** `mapping_templates` per אתר.  
‏**כפולים:** התאמה ל־SKU ו־URL canonical.  
‏**סקירה ידנית:** חובה לשינויי מחיר חריגים.

---

## 13. Alibaba Importer — אפיון

‏**מורכבות:** שינויי DOM, התחברות, anti-bot, זכויות תמונה, ToS.  
‏**API רשמי מול scraping:** העדפה חד־משמעית ל־API/ייצוא מורשה; scraping רק עם חוות דעת משפטית.  
‏**MOQ / price tiers / variations:** נשמרים ב־`rawExtract`; נורמליזציה הדרגתית.  
‏**סיכוני session/login:** לא לאחסן סיסמאות בטקסט גלוי; vault.  
‏**Legal/ToS:** סיכון חוסם אם אין אישור — **לא לפתוח Phase Alibaba לפני PDF+Website יציבים**.  
‏**המלצה:** להתחיל ב־**ייבוא ידני מייצוא CSV רשמי** של Alibaba (אם קיים) לפני אוטומציה.

---

## 14. AI Normalization

‏**קלט:** `rawExtract` מצומצם + `mapping_template` + כללי tenant.  
‏**פלט:** JSON עם schema קשיח (גרסה `schemaVersion`).  
‏**Validation:** AJV/Zod; דחייה אם שדות חובה חסרים.  
‏**Hallucinations:** temperature נמוך; איסור המצאת SKU; השוואה לטבלת מקור.  
‏**rawData מול normalizedData:** שניהם נשמרים; UI מציג diff.  
‏**confidence:** 0–1 per שדה + `needsHumanReview` גלובלי.  
‏**אישור אנושי:** שער לפני מעבר ל־`approved`.

---

## 15. SEO / Content / Social future

‏**עתידי אחרי Importer בסיסי:** יצירת `metaTitle`, `metaDescription`, `slug`, `alt` — כטיוטות ב־draft או טבלת `seo_proposals`.  
‏**פוסט חברתי / FB / IG creative:** שימוש ב־`mediaAssets` או Studio אחרי חיבור מחדש; **לא** לפני publish יציב של מוצר.  
‏**Meta catalog feed:** רק כשהמוצרים והמדיה עקביים.  
‏**WhatsApp טקסט:** ייצוא מתוך draft — לא אוטומטי ללא opt-in.

---

## 16. Security / Permissions / Audit

| תפקיד | יכולות מוצעות |
|--------|----------------|
| super_admin | כל ה־tenants, jobs, publish, suppliers, הגדרות סיכון |
| admin | לרוב read + הפעלה מוגבלת — להגדיר במדיניות הארגון |
| business_admin | רק `tenantId` שלו; drafts ו־publish לtenant שלו אם מאושר במדיניות |
| viewer (אופציונלי) | read-only histories |

‏**כל פעולה:** publish/delete/media generate → audit; ייבוא חיצוני → audit; כשל login studio כבר קיים כדוגמה.  
‏**dryRun:** publish, delete, crawl ראשוני.  
‏**confirm:** publish אמיתי, מחיקה, שינוי tenant על draft.  
‏**tenant isolation:** כל שאילתה עם `tenantId` + בדיקה מול JWT.

---

## 17. Risks & Mitigations

| סיכון | חומרה | איפה | פתרון | חוסם פיתוח? |
|--------|--------|------|--------|--------------|
| schema mismatch | גבוהה | Product Mongoose מול payload | איחוד schema + migration מדורג | לא, אבל חוסם scale בטוח |
| localStorage legacy | בינונית | Catalog iframe | לא לאמת ייבוא; DB drafts | לא |
| dryRun delete mismatch | גבוהה | catalog HTML מול API | תיקון לפני publish מרכזי | **חוסם go-live לייבוא** אם משתמשים באותו כפתור |
| bad AI output | גבוהה | normalization | schema + confidence + human | לא |
| duplicate products | גבוהה | publish | duplicate service + UI | לא |
| wrong tenant | קריטית | כל הזרמים | בדיקה כפולה בשרת | לא |
| bad price | גבוהה | AI/PDF | טווחים, השוואה למקור, איסור fallback שקט | לא |
| bad image | בינונית | staging | media check + אישור | לא |
| Alibaba blocking | גבוהה | רשת | API רשמי / CSV ידני | לא לפתוח שם מוקדם |
| cost explosion | גבוהה | AI + תמונות | quotas, alerts | לא |
| security leaks | קריטית | logs, CORS | צמצום CORS בעתיד, מיסוך לוגים | לא |

---

## 18. תוכנית פיתוח בשלבים

### Phase 0 — Stabilization
‏**מטרה:** ייצור בטוח. **Scope:** תיקון מחיקה dryRun↔UI, `GET /api/products`+tenant, בדיקת `requireAdmin`/`requireAdminApi`, חיבור או הסרת `resolveSocialPublishMedia`. **קבצים:** קטלוג API, auth, אופציונלי HTML. **בדיקות:** אינטגרציה למחיקה. **הצלחה:** אין מחיקה שקטה; סנכרון סטטוסים אמין. **לא:** Importer.

### Phase 1 — Draft System
‏**מטרה:** collections + APIs מינימליים ל־drafts/jobs/logs. **בדיקות:** tenant isolation. **לא:** UI מלא.

### Phase 2 — Import Center UI
‏**מטרה:** dashboard + draft table. **לא:** Alibaba.

### Phase 3 — PDF Importer MVP
‏**מטרה:** PDF טקסטואלי + טבלאות פשוטות. **לא:** OCR מלא בתחילה.

### Phase 4 — Publish Integration
‏**מטרה:** Publish Service → upload/update. **בדיקות:** dryRun כפול. **לא:** שינוי iframe logic מחיר.

### Phase 5 — Media Review
‏**מטרה:** staging + check. **לא:** generate אוטומטי המוני.

### Phase 6 — Website Importer
‏**מטרה:** sitemap + schema.org. **לא:** כל האינטרנט.

### Phase 7 — Image Generation Connector
‏**מטרה:** חיבור מבוקר ל־Studio/DALL·E. **לא:** החלפת צילום מוצר.

### Phase 8 — Alibaba Importer
‏**מטרה:** רק אחרי יציבות + ייעוץ משפטי. **לא:** scraping אגרסיבי ביום אחד.

### Phase 9 — SEO/Social Automation
‏**מטרה:** טיוטות SEO ופוסטים. **לא:** פרסום אוטומטי ללא approval.

---

## 19. בדיקות חובה

‏- **Unit:** נורמליזציה, מיפוי עמודות, חישוב confidence, בניית payload publish.  
‏- **Integration:** job → drafts → approve → publish (mock catalog API).  
‏- **API:** כל נתיב עם 401/403/tenant wrong.  
‏- **Tenant isolation:** לא לראות drafts של tenant אחר.  
‏- **Import rollback:** ביטול job לא מפרסם; מחיקת staging.  
‏- **Publish tests:** dryRun תואם real; שגיאות partial.  
‏- **Media tests:** גודל, mime, TTL staging.  
‏- **Permission tests:** business_admin גבולות.  
‏- **Manual QA:** רשימת בדיקות מסכים (עברית): publish כפול, duplicate, מחיקה, ייבוא PDF גדול.

---

## 20. החלטות פתוחות

‏1) האם Catalog Manager נשאר iframe לטווח ארוך או מתוכננת אפליקציית React חדשה עם אותו API.  
‏2) האם localStorage נשאר רק לכלי עבודה פנימי ללא “אמת רשמית”.  
‏3) האם Product schema מורחב עכשיו או בשלב 0–1 בלבד לשדות קריטיים.  
‏4) האם Cloudinary תמיד לstaging ולפרסום (מומלץ) מול הורדות ישירות.  
‏5) האם SKU חובה לכל draft (מומלץ כן לקטלוג הנוכחי).  
‏6) האם drafts בcollection נפרדת (מומלץ) מול `status=draft` ב־products.  
‏7) האם Desktop Image Studio נכנס ל־monorepo או נשאר repo נפרד עם מפרט API גרסה.

---

## 21. המלצה סופית

‏**לעשות ראשון:** Phase 0 — בלי זה, כל שכבת Importer תישען על בסיס שבור (מחיקה, סנכרון, auth). מיד אחריו Phase 1–2–3–4 כמסלול הכי בטוח: **טיוטות ב־DB → UI → PDF פשוט → publish דרך API קיים**.  
‏**לא לעשות:** לא לפתוח Alibaba ולא אוטומציית SEO מלאה לפני שהפרסום והמדיה יציבים; לא לכתוב ישירות ל־`products` מייבוא חיצוני; לא להסתמך על localStorage כמקור אמת.  
‏**סדר בטוח:** Stabilization → Drafts → Import UI → PDF → Publish wiring → Media → Website → Image connector → Alibaba → Social/SEO.  
‏**רמה בינלאומית:** שקיפות audit, dryRun כברירת מחדל לפעולות הרסניות, הפרדת tenants, ניהול עלויות AI, ומסמכי מדיניות משפטית לייבוא חיצוני — אלה תנאי סף, לא “נחמד ל_have”.

---

מסמך זה הוא אפיון ותכנון בלבד. לא בוצעו שינויי קוד, לא בוצע deploy, ולא שונו נתוני מערכת.
