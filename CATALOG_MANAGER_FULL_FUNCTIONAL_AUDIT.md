# דוח סריקה מלא — Catalog Manager VIPO

מסמך זה נכתב על בסיס קריאת קוד סטטית ב־repository (ענף/תיקייה `vipo-agents-stage-deploy`) בלבד. לא בוצעו שינויי קוד, לא deploy, ולא שינוי ENV.

---

## 1. תקציר מנהלים

‏**Catalog Manager הראשי** בכתובת `/admin/catalog-manager/standalone` אינו רכיב React ייעודי — הוא **דף Next.js** (`app/admin/catalog-manager/standalone/page.jsx`) שמרנדר **iframe** לקובץ סטטי ענק: `public/_standalone/catalog-manager/index.html` (כ־9,000+ שורות HTML+CSS+JavaScript במסמך אחד).  
‏**מקור האמת לקטלוג “עסקי”** (מחירון מידות, הזמנות למפעל, מיפוי מדיה מקומי) הוא **הדפדפן**: `localStorage` עם קידומת per-tenant (`cm:tenant::<tenantId>::…`). **הפרסום לחנות** מתבצע דרך **POST** ל־`/api/catalog-manager/upload` או `/api/catalog-manager/update` עם `tenantId` + `templateKey` + מערך `products`, ואז **`syncProductUpsert`** בשרת.  
‏**רמת בשלות:** גבוהה לתהליכי תמחור/הזמנה/ייצוא/שיתוף WhatsApp **מקומיים**; גבוהה לפרסום מוצרים **כשמחוברים super_admin** ויש תבניות; **סיכון/פער** בין UI למחיקת מוצרים (ראו סעיף 16).  
‏**האם זה מקור האמת לניהול מוצרים בפועל?** — **כן לפרסום קטלוג נירוסטה/מוצרים מובנים** דרך ה־API הזה; **לא** למצב המוצר הכללי במערכת (יש גם `/admin/products` מבוסס localStorage ו־`ProductsClient` — מחוץ לסקופ מדויק של קובץ זה אך רלוונטי לארכיטקטורה).

---

## 2. מפת קבצים מלאה

| נתיב קובץ | תפקיד | קריטי? | הערות |
|-----------|--------|--------|--------|
| `app/admin/catalog-manager/standalone/page.jsx` | שער Next: `requireAdmin()` + iframe | כן | נקודת הכניסה הרשמית ל־URL standalone |
| `public/_standalone/catalog-manager/index.html` | **כל** UI ולוגיקת הקטלוג | כן | מונולית; אין פיצול ל־components/hooks נפרדים |
| `app/catalog-manager/page.tsx` | הפניה | בינוני | `requireAdmin` + אם לא super → `/admin`; אחרת redirect ל־standalone |
| `app/admin/catalog-manager/page.tsx` | ממשק קטלוג נוסף (React) | בינוני | משתמש ב־`/api/admin/catalog-manager` — לא ה־iframe |
| `app/api/catalog-manager/upload/route.js` | יצירת מוצרים | כן | super_admin; `syncProductUpsert` |
| `app/api/catalog-manager/update/route.js` | עדכון לפי SKU | כן | super_admin; partial success (`notFound`, `errors`) |
| `app/api/catalog-manager/delete-products/route.js` | מחיקה + Cloudinary + audit | כן | **לוגיקת dryRun/אישורים מורכבת** — לא תואמת את ה־fetch מה־HTML |
| `app/api/catalog-manager/tenants/route.js` | רשימת חנויות לdropdown | כן | super_admin; fallback JSON אם DB down |
| `app/api/catalog-manager/cloudinary-config/route.js` | הגדרות Cloudinary ללקוח | בינוני | לניהול מדיה |
| `app/api/catalog-manager/delete-media/route.js` | מחיקת asset ב־Cloudinary | בינוני | |
| `app/api/catalog-manager/remove-product-media/route.js` | עדכון מוצר — הסרת URL מדיה | בינוני | |
| `app/api/catalog-manager/cleanup-media/route.js` | ניקוי מדיה | נמוך | לרוב ידני/תחזוקה |
| `app/api/admin/catalog-templates/route.js` | CRUD תבניות | כן | Mongoose `CatalogTemplate` |
| `app/api/admin/catalog-templates/[id]/route.js` | עריכה/מחיקת תבנית בודדת | כן | |
| `app/api/admin/catalog-manager/route.js` | רשימת פריטים (ממשק admin אחר) | בינוני | |
| `app/api/admin/catalog-manager/tenants/route.js` | tenants לאדמין | בינוני | |
| `app/api/admin/catalog-manager/copy-to-tenant/route.js` | העתקה בין tenants | בינוני | |
| `lib/catalogTemplates.js` | `resolveCatalogTemplate`, seed | כן | נקרא מ־upload/update |
| `lib/catalogTemplatePurchaseMode.js` | מיזוג טקסט מצב רכישה לתיאור | בינוני | |
| `lib/productSync.js` | סנכרון מוצרים לשרת חיצוני | כן | upsert/delete |
| `lib/catalogTemplateSync.js` | סנכרון תבניות | בינוני | |
| `models/Product.js` | מודל Mongoose (מצומצם בקובץ) | כן | פער מול שדות עשירים בפועל — ראו 14 |
| `models/CatalogTemplate.js` | תבניות קטלוג | כן | |
| `models/Tenant.js` | עסק | כן | |
| `lib/auth/server.js` | `requireAdmin`, `requireAdminApi` | כן | **הערת גישה:** `requireAdmin` בודק `role === 'admin'` בלבד |
| `data/fallback-marketplace-tenants.json` | tenants כשה־DB ריק/unavailable | בינוני | |

---

## 3. מפת קומפוננטות UI

‏**קומפוננטה ראשית:** אין — הכל ב־`index.html` בתוך iframe.  
‏**אזורים עיקריים:**  
‏- **סרגל כלים עליון:** חיפוש, מצב תצוגה (`viewMode`: הכל / במלאי / רכישה קבוצתית), צ׳קבוקסים "רק מסומנים", "רק בהזמנה", כפתורי תמחור/הזמנה/ייצוא/WhatsApp/JSON/CSV, איפוס קטלוג, בחירה המונית, שכפול.  
‏- **פאנל נראות מרקטפלייס:** שלושה כפתורי מצב (`toggleMarketplaceVis`) → `POST /api/settings`.  
‏- **פאנל העלאה לחנות:** בחירת tenant, בחירת `templateKey`, כפתורי "העלה" (אשף), "עדכן חנות", "מחק מוצרים", "מחק חנויות", "ניהול מדיה", סטטוס טקסט.  
‏- **מודאלים:** אשף העלאה (טאבים: מצב העלאה / מדיה / תבנית), מודאל בחירת מצב העלאה (קיים ב־DOM; **הפונקציה `openUploadOptionsModal` לא נקראת מכפתור ב־HTML שנסרק** — נתיב מת), הגדרות סרגל כלים, הגדרות מנהל, הגדרות טאבים בטבלה, מנהל תבניות, מנהל מדיה, מחיקת חנויות.  
‏- **טבלת מוצרים:** טאבים דינמיים (מוצר / תמחור / מלאי / הזמנה / לוגיסטיקה) — חלק מוסתר בברירת מחדל; שורות קטגוריה + שורות `data-row`.  
‏- **state:** משתנים גלובליים ב־script (`tenantStorage`, `mediaMappings`, `uploadWizardState`, מונים, מטמון תבניות).

---

## 4. טבלת כל הכפתורים והפעולות (עיקריים)

| שם כפתור/פעולה (כפי שב־UI) | קובץ | פונקציה | API | Payload / השפעה | הרשאה (אפקטיבית) | סיכון |
|----------------------------|------|---------|-----|------------------|-------------------|--------|
| הגדרת סרגל כלים | `index.html` | `openToolbarSettingsModal` / `saveToolbarSettings` | — | שמירת העדפות ב־`localStorage` | כל מי שנכנס לדף | נמוך |
| הגדרות מנהל | `index.html` | `openAdminSettingsModal` / `saveAdminSettings` | — | לרוב העדפות מקומיות | כל מי שנכנס | נמוך |
| איפוס חיפוש | `index.html` | `clearSearchBtn` (listener) | — | מנקה `#search` | — | נמוך |
| עדכון מחירים וסיכום | `index.html` | `recalculate()` | — | חישובי תצוגה + עדכון DOM | — | נמוך |
| נקה הזמנה | `index.html` | `clearFactoryOrder()` | — | מאפס שדות הזמנה ב־DOM + storage | — | נמוך |
| יצוא הזמנה למפעל (CSV) | `index.html` | `exportFactoryOrderToCSV()` | — | הורדת קובץ מקומי | — | נמוך |
| שלח הזמנה למפעל (WhatsApp) | `index.html` | `shareFactoryOrderToWhatsApp()` | `https://wa.me/?text=…` | טקסט מהשורות עם כמות הזמנה | — | בינוני (חשיפת מחירים/מידות בערוץ חיצוני) |
| שיתוף ב־WhatsApp (נבחרים) | `index.html` | `shareSelectedToWhatsApp()` | `wa.me` | מחירים/מלאי לפי שורות מסומנות | — | בינוני |
| יצוא CSV | `index.html` | `exportSelectedToCSV()` | — | קובץ מקומי לפי **נבחרים** | — | נמוך |
| הורד תמונה | `index.html` | `downloadSelectedAsImage()` | — | `html2canvas` → PNG | — | נמוך |
| גיבוי JSON | `index.html` | `exportBackupJSON()` | — | מייצא מבנה `version`+`settings`+`products` מה־DOM | — | נמוך |
| יבוא JSON | `index.html` | `triggerImportJSON` + listener | — | `JSON.parse` → `applyBackupObjectToDom` | — | בינוני (אין ולידציית אבטחה על תוכן JSON) |
| יבוא CSV | `index.html` | `triggerImportCSV` + listener | — | `parseCsvToProducts` → DOM | — | בינוני |
| איפוס קטלוג | `index.html` | `resetCatalogStorage()` | — | מוחק מפתחות `localStorage` scoped לtenant + `location.reload()` | confirm | בינוני (מחיקת עבודה מקומית) |
| בחר הכל (מוצג) / נקה בחירה | `index.html` | `selectAllVisibleRows` | — | צ׳קבוקסים | — | נמוך |
| שכפל נבחרים | `index.html` | `duplicateSelectedRows()` | — | שכפול שורות DOM + `copyMediaMappings` | alert בלבד | נמוך |
| זמין במלאי / רכישה קבוצתית / מכולה משותפת | `index.html` | `toggleMarketplaceVis(key)` | `GET`+`POST /api/settings` | `{ settings: { [key]: boolean } }` | משתמש מחובר עם הרשאת שינוי settings (בפועל אדמין) | בינוני (משפיע על לקוחות) |
| ניהול תבניות | `index.html` | `openTemplateManager` / `saveTemplate` / `deleteTemplate` | `GET/POST/PATCH/DELETE /api/admin/catalog-templates…` | tenantId בquery; גוף תבנית | `checkTemplateAdminAccess`: **admin או super_admin** | בינוני |
| העלה (אשף) | `index.html` | `openUploadWizard` → `confirmUploadWizard` | `POST /api/catalog-manager/upload` | `{ tenantId, templateKey, products[] }` | **super_admin** בצד שרת | גבוה (כתיבה ל־DB) |
| עדכן חנות | `index.html` | `uploadToStore('update')` | `POST /api/catalog-manager/update` | כנ"ל | super_admin | גבוה |
| מחק מוצרים | `index.html` | `deleteFromStore` | `POST /api/catalog-manager/delete-products` | `{ tenantId, skus }` בלבד | super_admin (API) | **קריטי** — ראו 16 |
| מחק חנויות | `index.html` | `confirmDeleteTenants` | `DELETE /api/tenants/:id` | לולאה על נבחרים | תלוי מימוש API tenants | **גבוה מאוד** |
| ניהול מדיה | `index.html` | `openMediaManager`, `saveMediaMapping`, Cloudinary upload | `GET /api/catalog-manager/cloudinary-config`, `POST …/delete-media`, `POST …/remove-product-media` | קבצים/URLs | super_admin לרוב נתיבי קטלוג | גבוה |
| טען הזמנות (לוגיסטיקה) | `index.html` | `fetchLogisticsOrdersPage` | `GET /api/orders?tenantId=…` | | | בינוני |
| אישור מצב העלאה (מודאל ישן) | `index.html` | `confirmUploadOptions` | קורא ל־`uploadToStore('upload', selected)` | — | **לא מחובר לכפתור ב־HTML** | — |

---

## 5. Flow טעינת מוצרים

‏1) `DOMContentLoaded` → `loadTenants()` (`/api/auth/me` ואז `GET /api/catalog-manager/tenants` עם cookies).  
‏2) שחזור `tenantId` מ־`localStorage` (`catalog_manager_tenant_id`).  
‏3) `handleTenantSelectionChange` / הקשר tenant → טעינת מצב מקומי, תבניות (`loadCatalogTemplates` → `GET /api/admin/catalog-templates?tenantId=`), טבלה ראשונית מקובץ HTML או מיזוג מודלים ברירת מחדל (`getDefaultNewModelsV1` + `applyDefaultNewModelsOnceIfNeeded`).  
‏4) `syncStatusesFromStore(tenantId)` — `GET /api/products?tenantId=…&includeInactive=true` (הערה: בקובץ `app/api/products/route.js` הנוכחי **אין** פרמטרים — ראו 16).  
‏5) `enhanceTable`, `loadStockFromStorage`, `applyFilters`.

---

## 6. Flow סינון ובחירת מוצרים

‏- **חיפוש טקסט:** `#search` — `applyFilters` משווה מחרוזת ל־`id`, `size`, `category`.  
‏- **מצב תצוגה:** `stock` = מלאי > 0; `group` = דגל רכישה קבוצתית בשורה.  
‏- **רק מסומנים / רק בהזמנה:** מסננים לפי checkbox או `order_qty > 0`.  
‏- **בחירה:** עמודת `row-select`; "בחר הכל" בכותרת משפיע על כל השורות; `selectAllVisibleRows` רק על שורות גלויות.

---

## 7. Flow יצירה/עדכון מוצר

‏**יצירה:** בחירת שורות + תבנית + (תמונות דרך מנהל מדיה; אשף דורש לפחות 5 תמונות) → בניית מערך `products` (יכול לכלול וריאנטים `sku`, `sku-GROUP`, `sku-SC`) → `POST /api/catalog-manager/upload` → שמירת סטטוס מקומי `product_status_*`.  
‏**עדכון:** אותו מבנה אך `POST /api/catalog-manager/update` — בשרת `findOneAndUpdate({ tenantId, sku })`; תשובה עם `updated`, `notFound`, `errors`.  
‏**מחירים:** מחושבים מ־USD בשורה, שער (`rate`), מרווח (`markup`), מכפילים (`factor`, `groupFactor`, `sharedContainerFactor`).

---

## 8. Flow פעולות Bulk

‏- **העלאה/עדכון:** רק שורות עם `.row-select:checked`.  
‏- **יצוא CSV / תמונה / WhatsApp:** לפי **נבחרים** (לא כל המסננים אלא checkbox).  
‏- **מחיקה:** כל ה־SKUs מהשורות המסומנות (ראו סעיף 16 לגבי ביצוע בפועל).  
‏- **שכפול:** יוצר `id-copyN` בשורות DOM בלבד.

---

## 9. Flow ייבוא JSON/CSV/תמונות

‏**JSON:** קובץ → `applyBackupObjectToDom` — מנקה state מקומי רלוונטי, מחיל הגדרות תמחור, בונה מחדש טבלה, משחזר מלאי/מחירים/הזמנות, מסמן נבחרים אם בקובץ. **אין שרת**; **אין preview** לפני החלה; שגיאה → `alert`.  
‏**CSV:** `parseCsvToProducts` (כותרות גמישות או 10 עמודות קבועות) → `{ products }` ל־`applyBackupObjectToDom`.  
‏**תמונות (לפרסום):** דרך מנהל מדיה — העלאה ל־Cloudinary (דרך לוגיקה ב־HTML), שמירת `mediaMappings` ב־`localStorage`; בעת upload נשלחות מערכי URL.  
‏**ולידציה לפני שרת:** ב־upload route — סוג רכישה, מינימום **5 תמונות** לייבוא חדש; ב־אשף — אותו דבר.  
‏**Rollback:** אין אחרי פרסום; ייבוא JSON הוא overwrite מקומי בלבד.  
‏**partial success:** ב־update כן (`notFound`/`errors`); ב־upload לולאת שרת אוספת `errors[]`.  
‏**tenantId / templateKey:** חובה בפרסום לשרת.  
‏**syncProductUpsert:** כן אחרי יצירה/עדכון מוצרים מהשרת.  
‏**שכבת ביניים:** אין — הייבוא המקומי **לא** כותב ל־Mongo; רק **העלאה** כותבת.

---

## 10. Flow ייצוא JSON/CSV/WhatsApp

‏- **JSON:** כל הטבלה (לפי DOM) דרך `buildBackupObjectFromDom` — כולל `settings` + לכל שורה: קטגוריות, id, size, priceUsd, כמויות, דגלים, הזמנה, `cbmOverride`, `selected`. **לא** כולל מפורשות תמונות/וידאו בפורמט הגיבוי (המדיה ב־`mediaMappings` נפרד).  
‏- **CSV יצוא נבחרים:** קטגוריה, מידה, מלאי, מחיר במלאי ₪, מחיר קבוצתי ₪, זמן אספקה.  
‏- **CSV הזמנה למפעל:** דגם, מידה להזמנה, כמות, נירוסטה, עובי, הערות — לפי שורות עם `order_qty > 0`.  
‏- **WhatsApp:** אותן נתונים כטקסט — **ללא API פנימי**.

---

## 11. Flow מדיה

‏- **מיפוי:** אובייקט `mediaMappings` (מפתח SKU) ב־`localStorage`.  
‏- **Cloudinary:** `GET /api/catalog-manager/cloudinary-config`; העלאה עם SDK מהדפדפן (בקטעי script בקובץ).  
‏- **מחיקה:** `POST /api/catalog-manager/delete-media` (publicId/url); `remove-product-media` לעדכון מסמך מוצר בשרת כשצריך.  
‏- **סדר תמונות:** מערך `images` עם `position` בבניית payload בשרת (ב־`update`/`upload` routes).  
‏- **וידאו:** `videoUrl` בשדה מוצר.  
‏- **אימות מינימום תמונות:** בשרת upload (5); ב־אשף וב־`uploadToStore` ליצירה — חסימה אם אין תמונה (למעט fallback תמונה גנרית ל־WORKTABLE בנתיב מסוים).  
‏- **alt / publicId:** נבנה בשרת בעדכון (`buildMediaPayload`); בלקוח יש תמיכה ב־`publicId` מהעלאה.  
‏- **resize:** טרנספורמציות Cloudinary בצד URL (לא הורחב כאן).

---

## 12. Flow חנויות / Tenants

‏- **טעינה:** `GET /api/catalog-manager/tenants` — **דורש super_admin**; אחרת 403 ובאנר אזהרה.  
‏- **בחירה:** `<select id="tenantSelect">`; נשמר `catalog_manager_tenant_id` ב־`localStorage`.  
‏- **שיוך מוצר בפרסום:** `tenantId` בגוף הבקשה ל־upload/update.  
‏- **מחיקת חנויות:** `DELETE /api/tenants/:id` — מחוץ לקטלוג manager אך זמין מהמודאל.  
‏- **ObjectId/string:** ה־UI עובד עם מחרוזות `_id`; ב־Mongo לרוב `ObjectId` — תלוי אחידות ב־Mongoose query (`{ tenantId, sku }`).

---

## 13. API Routes מלאים (רלוונטיים ל־Catalog Manager)

| Method | Route | קובץ | תפקיד | הרשאות | Payload עיקרי | תגובה / DB | מתאים ל־Importer? |
|--------|-------|------|--------|---------|---------------|-------------|-------------------|
| GET | `/api/catalog-manager/tenants` | `app/api/catalog-manager/tenants/route.js` | רשימת חנויות | `requireAdminApi` + **super_admin** | — | `tenants[]` / fallback | לא ישירות |
| GET | `/api/catalog-manager/cloudinary-config` | `cloudinary-config/route.js` | קונפיג לקליינט | מחובר (לפי route) | — | — | אולי לstaging תמונות |
| POST | `/api/catalog-manager/upload` | `upload/route.js` | יצירת מוצרים | super_admin | `{ tenantId, templateKey, products[] }` | `Product.save`, `syncProductUpsert` | **כן — נקודת publish** |
| POST | `/api/catalog-manager/update` | `update/route.js` | עדכון לפי SKU | super_admin | כנ"ל | `findOneAndUpdate` | כן |
| POST | `/api/catalog-manager/delete-products` | `delete-products/route.js` | מחיקה | super_admin + אישורים | `{ tenantId, skus, dryRun?, confirm?, … }` | `deleteMany`, Cloudinary, `auditlogs` | לא; דרוש שכבת בטיחות |
| POST | `/api/catalog-manager/delete-media` | `delete-media/route.js` | מחיקת קובץ בענן | לפי route | `{ url }` | Cloudinary | חלקי |
| POST | `/api/catalog-manager/remove-product-media` | `remove-product-media/route.js` | ניתוק מדיה ממוצר | לפי route | tenantId, url וכו' | עדכון מוצר | חלקי |
| POST | `/api/catalog-manager/cleanup-media` | `cleanup-media/route.js` | ניקוי | לרוב מוגבל | | | תחזוקה |
| GET | `/api/admin/catalog-templates` | `admin/catalog-templates/route.js` | רשימת תבניות | `requireAdminApi` (+ לוגיקה פנימית) | `?tenantId=` | Mongo `catalogtemplates` | כן — מיפוי שדות |
| POST/PATCH/DELETE | `/api/admin/catalog-templates` … | `[id]/route.js` | CRUD | אדמין | גוף תבנית | Mongo | כן |
| GET/POST | `/api/settings` | `app/api/settings/route.js` (לא נפתח במלואו כאן) | נראות מרקטפלייס | מחובר | `settings` | DB settings | שולי |
| GET | `/api/products?tenantId=…` | בשימוש מה־HTML | סנכרון סטטוס | cookies | — | תלוי מימוש route | לבדיקת duplicates |

---

## 14. DB / Models / Collections

| Collection / Model | שדות / שימוש עיקרי | הערות |
|--------------------|-------------------|--------|
| `products` | מוצרי חנות: `tenantId`, `sku`, `name`/`title`, `media`, `seo`, `stainless`, `purchaseType`, `groupPurchaseType`, `price`, `stockCount`, … | עדכון ב־Catalog משתמש ב־`Product` Mongoose; **הסכמה בקובץ `models/Product.js` מינימלית** — ייתכן strict=false במודל אחר או שדות נשמרים בלי schema מלא |
| `tenants` | `_id`, `name`, `status` | נטען לdropdown |
| `catalogtemplates` (מודל `CatalogTemplate`) | `key`, `name`, SEO, `purchaseModeBlocks`, תוכן HTML/מבנה | נשלף לפי `tenantId` |
| `auditlogs` | רישום אחרי מחיקת מוצרים **רק כשמחיקה אמיתית עוברת שכבת האישורים** | |
| — | `mediaMappings` | **רק ב־localStorage בדפדפן** — לא collection |

---

## 15. הרשאות ואבטחה

‏- **כניסה ל־`/admin/catalog-manager/standalone`:** `requireAdmin()` בדף Next — בודק JWT עם **`role === 'admin'` בלבד** (לא כולל `super_admin` במפורש). **סיכון:** משתמשים עם JWT `super_admin` בלבד עלולים להידחות אם אין להם גם `admin` — יש לוודא מול סביבת הייצור.  
‏- **טעינת חנויות ופרסום קטלוג:** רוב נתיבי `/api/catalog-manager/*` — `requireAdminApi` + **`isSuperAdminUser`**.  
‏- **תבניות:** `checkTemplateAdminAccess` — **admin או super_admin**.  
‏- **ייבוא/ייצוא מקומי:** אין אימות שרת — כל בעל גישה לדף יכול לטעון JSON.  
‏- **WhatsApp:** יציאה לדומיין חיצוני עם טקסט רגיש.  
‏- **CSRF:** מסתמך על cookies + SameSite לפי הגדרות האפליקציה; אין token ייעודי בקובץ הסטטי.  
‏- **מחיקת מוצרים:** שרת דורש dry-run, אישור טוקן, סיבה, ENV — ה־UI **לא שולח** — ראו 16.

---

## 16. בעיות קריטיות שהתגלו

‏1) **מחיקת מוצרים מה־UI לעומת API:** ה־HTML שולח `POST { tenantId, skus }` בלבד. ב־`delete-products/route.js` **`dryRun` ברירת המחדל היא `true`** (`body?.dryRun !== false`), לכן **הבקשה מהדפדפן היא dry-run בלבד** — לא מוחקת מסמכים. בנוסף, מחיקה אמיתית דורשת `ALLOW_CATALOG_PRODUCT_DELETE`, `confirm`, `acknowledgeDataLoss`, כיסוי מזהי מוצרים וכו'. **הממשק מציג הודעת הצלחה עם `deletedCount`** שלא תואמת תשובת dry-run — חוויית משתמש מטעה וסיכון תפעולי.  
‏2) **`GET /api/products?tenantId=…`:** הקטלוג קורא עם query params; אם ה־route בפועל מתעלם מ־`tenantId`, **סנכרון סטטוסים שגוי או ריק**.  
‏3) **מודאל `uploadOptionsModal`:** לא מחובר לכפתור "העלה" ב־HTML; העלאה עוברת דרך **אשף** (`openUploadWizard`).  
‏4) **מחיר fallback:** אם מחיר USD אפס — נשלח `12345` כמחיר בטוח — סיכון תמחור שגוי בשגיאת נתונים.  
‏5) **ייבוא JSON ללא שרת:** אין audit; אין בדיקת סכימה.  
‏6) **פער סכימת Mongoose** מול payload עשיר (דו"ח קודם) — נשאר סיכון עקביות.  
‏7) **מחיקת חנויות** מתוך אותו מסך — פעולה הרסנית; תלוי הרשאות `DELETE /api/tenants/:id`.

---

## 17. התאמה ל־Product Importer עתידי

‏- **הזרמת Drafts:** מומלץ **לא** דרך `applyBackupObjectToDom` (אין בקרה); אלא collection ייעודית או שירות עם סטטוס `draft`.  
‏- **Publish קיים:** כן — ניתן לאחר אישור לבנות אובייקט זהה ל־`products[]` ולקרוא ל־`/api/catalog-manager/upload` או `update`.  
‏- **Collections מוצעות:** `product_import_jobs`, `product_import_drafts`, `supplier_sources`, `import_logs` — כן.  
‏- **ייבוא קיים:** מסוכן כנקודת כניסה לתוכן זדוני ב־JSON; לא מתאים כ־pipeline ייצור בלי sanitize.  
‏- **Preview / Approval / Duplicate detection / Mapping / AI SEO / Media staging:** חסרים — נדרשים לפני חיבור PDF/אתר/Alibaba.

---

## 18. ארכיטקטורה מוצעת לחיבור Importer

‏**Source Adapter** (PDF / Website / Alibaba) → **Extraction** (טבלאות, HTML, API) → **AI Normalize** (מיפוי לשדות VIPO + שפה + מטבע) → **Drafts** (DB) → **Preview UI** (diff, duplicates, מדיה חסרה) → **Approval** (אדמין) → **Publish** דרך אותו payload כמו Catalog (`upload`/`update`) + אופציונלית `syncProductUpsert`.

---

## 19. החלטות שחייבים לקבל לפני פיתוח

‏1) האם `requireAdmin` צריך לכלול `super_admin` לגישה ל־standalone.  
‏2) איך מתקנים את **מחיקת המוצרים** — האם ה־UI שולח שני שלבים (dry-run → confirm) או מסירים dryRun כברירת מחדל.  
‏3) האם `GET /api/products` יתמוך ב־`tenantId` או שהקטלוג יעבור ל־endpoint ייעודי.  
‏4) מדיניות Alibaba (API רשמי מול scrape).  
‏5) האם טיוטות ב־Mongo או ב־workflow חיצוני.  
‏6) אחידות `Product` schema מול Mongo.

---

## 20. המלצה סופית

‏**לפתח את ה־Importer כמודול נפרד** (API + DB drafts + UI preview) שמתחבר ל־**אותם endpoints של פרסום** (`/api/catalog-manager/upload|update`) אחרי אישור, ולא לשכפל לוגיקת תמחור מתוך ה־HTML. לשפר במקביל את **בטיחות המחיקה** ואת **סנכרון הסטטוסים** בקטלוג הקיים.

---

לא בוצעו שינויי קוד. לא בוצע deploy. זהו דוח סריקה ואפיון בלבד.
