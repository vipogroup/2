# דוח סריקה — מערכת יצירת תמונות VIPO

מסמך זה מבוסס על קריאת קוד ב־`vipo-agents-stage-deploy` בלבד. לא בוצעו שינויי קוד ולא deploy.

---

## 1. תקציר מנהלים

‏במאגר הנסרק **אין** מימוש מלא של “יצירת תמונות” בתוך הדפדפן עם מודלים כמו Flux או Nano Banana — אלו מוזכרים בתיעוד עסקי/מוצר כ־**אפליקציית Desktop נפרדת** (“VIPO Image Studio”) שנפתחת ב־`vipo-image-studio://` ומתחברת לשרת ה־Next דרך **SSO קצר־חיים** ו־**JWT Bearer** לטעינת חנויות וקטגוריות.  
‏בשרת עצמו מופיעים: **APIי Studio** (אימות, tenants, categories), **גשר מקומי** אופציונלי (`127.0.0.1:19250`), ו־**מודול Social Agent** עם **DALL·E 3** לתמונות שיווקיות (קובץ `lib/socialAgent/mediaAssets.js`) — כולל העלאת תוצאה ל־**Cloudinary** בתיקיית `vipo-social-agent`.  
‏**רמת בשלות:** אינטגרציית Studio↔שרת **מוגדרת היטב** לטעינת הקשר עסקי; **יצירת תמונה “מוצרית” מתקדמת (Flux וכו׳) לא נמצאה בקוד המאגר**; נתיב DALL·E ב־`mediaAssets` **לא מחובר** כרגע ל־`socialPublisher.js` (לא נמצא import ל־`resolveSocialPublishMedia`), ושדה `generateImages` ב־`getSocialAgentConfig()` **לא קיים** — כלומר נתיב יצירת התמונה השיווקית כנראה **לא פעיל** בסביבה סטנדרטית עד חיבור נוסף.

---

## 2. מפת קבצים

| נתיב | תפקיד | הערות |
|------|--------|--------|
| `app/admin/vipo-image-studio/page.jsx` | עמוד ניהול Studio | `requireAdmin` + `isSuperAdminUser`; הסבר על Desktop + APIs |
| `app/admin/vipo-image-studio/VipoImageStudioClient.jsx` | כפתורי פתיחה / Deep Link | `POST /api/studio/auth/sso/start`, ניווט ל־`GET …?redirect=1` |
| `app/api/studio/auth/sso/start/route.js` | יצירת קוד SSO (JWT 120s) | Cookie admin או Bearer דרך `requireAdminApi` (כפי שהמסלול מייבא) |
| `app/api/studio/auth/sso/exchange/route.js` | החלפת קוד SSO ב־JWT שרת 2h | CORS `*`; אימות מול `users` ב־Mongo |
| `app/api/studio/auth/sso/launch/route.js` | SSO + ניסיון גשר ל־localhost:19250 | לא בשימוש ב־`VipoImageStudioClient` הנוכחי |
| `app/api/studio/auth/login/route.js` | התחברות Studio (אימייל/טלפון) | `rateLimiters.login`; JWT 7d/30d; `logSecurityEvent` |
| `app/api/studio/tenants/route.js` | רשימת tenants לסטודיו | super_admin → כל ה־tenants; אחרת tenant יחיד |
| `app/api/studio/tenants/[tenantId]/categories/route.js` | קטגוריות לפי tenant | `categories` collection או fallback מ־`products` |
| `lib/socialAgent/mediaAssets.js` | DALL·E 3 + העלאה ל־Cloudinary | `generateProductHeroImageUrl`, `generateAffiliatePromoImageUrl`, `resolveSocialPublishMedia` |
| `lib/socialAgent/socialPublisher.js` | פרסום חברתי מתוזמן | משתמש ב־`pickProductMedia` — **לא** ב־`resolveSocialPublishMedia` |
| `lib/socialAgent/config.js` | הגדרות env ל־Social Agent | אין `generateImages` |
| `app/api/upload/route.js` | העלאת תמונה ל־Cloudinary | `folder: vipo-products` — לא יצירה |
| `app/admin/simulator/page.jsx` | בדיקות S55 Studio | login, tenants, categories, CORS |
| `app/api/admin/system-status/route.js` | סטטוס `STUDIO_SSO_SECRET` | |
| `scripts/vercel-upsert-studio-sso.mjs` | סקריפט SSO/Vercel | תחזוקת deploy |
| `.github/workflows/vipo-image-studio-release.yml` | CI לסטודיו | מחוץ לסקופ לוגיקת runtime |

**חשוב:** מודלים מסוג Flux / nano-banana-pro **לא מופיעים במחרוזות או קבצים** ב־`vipo-agents-stage-deploy` שנסרקו — הם צפויים להיות ממומשים **באפליקציית ה־Desktop** (לא כלולה במאגר זה).

---

## 3. מפת UI

‏**עמוד `/admin/vipo-image-studio` (super_admin בלבד):**  
‏- כותרת והסבר על סטודיו Desktop.  
‏- ארבעה “כרטיסים”: הוראות הפעלה (`npm run dev` בתיקייה חיצונית), כפתור **“פתח סטודיו”** (ניווט ל־`/api/studio/auth/sso/start?redirect=1&baseUrl=…`), כפתור **“העתק Deep Link”**.  
‏- טקסט קבוע: כתובת שרת (`PUBLIC_URL` / localhost), התחברות עם JWT Bearer.  
‏- אין בחירת מודל, אין prompt, אין preview — הכול באפליקציה החיצונית.

---

## 4. מודלים נתמכים (לפי קוד במאגר)

| מודל | ספק | שימוש מומלץ (לפי הקוד) | איכות / מהירות / מגבלות (מוערך מהקוד) |
|------|------|-------------------------|----------------------------------------|
| `dall-e-3` | OpenAI Images API | תמונת “הירו” שיווקית למוצר; גרפיקה שותפים | `quality: 'standard'`, `1024x1024`, `n:1` — מהירות בינונית, עלות לפי תמחור OpenAI |
| — | — | Flux / nano-banana / וכו׳ | **לא נמצאו במאגר** — צפויים ב־Desktop Studio בלבד |

---

## 5. Flow יצירת תמונה

### א. VIPO Image Studio (Desktop — לפי שרת + UI)

‏1) משתמש super_admin נכנס ל־`/admin/vipo-image-studio`.  
‏2) לחיצה על “פתח סטודיו” → `GET /api/studio/auth/sso/start?redirect=1&baseUrl=…` (עם cookie אדמין) → JWT קצר → redirect ל־`vipo-image-studio://sso?code=…`.  
‏3) האפליקציה המקומית קוראת כנראה ל־`POST /api/studio/auth/sso/exchange` עם `code` → מקבלת `token` (2h) + `user`.  
‏4) עם הטוקן: `GET /api/studio/tenants` → בחירת tenant → `GET /api/studio/tenants/:id/categories`.  
‏5) יצירת תמונה, שמירה, סנכרון — **מחוץ למאגר זה**.

### ב. DALL·E (שרת — `mediaAssets.js`)

‏1) קריאה ל־`resolveSocialPublishMedia` עם `cfg`, `product`, `platform`, `format`, `postKind`, `baseMedia`.  
‏2) אם חסרה תמונה ומתקיימים תנאים (IG story/post מוצר, FB מוצר וכו׳) ו־`canGen` — קריאה ל־OpenAI → URL זמני.  
‏3) `mirrorImageUrlToCloudinary` → `secure_url` בתיקיית `vipo-social-agent`.  
‏4) (במימוש מחובר) החזרת URL לשכבת הפרסום.

---

## 6. Prompt System

‏**DALL·E מוצר (`generateProductHeroImageUrl`):**  
‏Prompt באנגלית, קבועים סגנון e-commerce + “לא טקסט/לוגו על התמונה” + שם מוצר (עד 120 תווים) + תיאור קצר (עד 350) + אזכור VIPO. **אין** מערכת templates חיצונית; **אין** “preserve product identity” בצילום — המסמך מצהיר במפורש שזו השראה שיווקית ולא צילום מדויק.

‏**DALL·E affiliate (`generateAffiliatePromoImageUrl`):**  
‏צורות אבסטרקטיות, ללא טקסט על התמונה; `siteUrl` רק כהקשר טקסטואלי.

---

## 7. שמירת תמונות

| מנגנון | איפה | קישור למוצר/tenant |
|--------|------|---------------------|
| Cloudinary upload ממראה DALL·E | `mirrorImageUrlToCloudinary` → `vipo-social-agent/` | אין `productId` בשם הקובץ בקוד — רק URL מוחזר לשכבה הקוראת |
| העלאת קבצים כללית | `app/api/upload/route.js` → `vipo-products` | לפי שימוש בלקוח |
| `public/uploads/products` | API נפרד (`/api/uploads/products`) | לא יצירה |
| שמירת תוצאת Studio ב־DB | **לא במאגר** | הדף מציין `storeProfile` לtenant — כנראה בלוגיקת Desktop |

---

## 8. API Routes

| Method | Route | Payload (עיקרי) | Response (עיקרי) | הרשאות |
|--------|-------|------------------|------------------|---------|
| POST | `/api/studio/auth/login` | `identifier`, `password`, `rememberMe` | `{ ok, token, user }` | משתמש פעיל + role admin/super_admin/business_admin; **rate limit** |
| POST | `/api/studio/auth/sso/start` | JSON `{ baseUrl }` או query | `{ ok, code, expiresAt, baseUrl }` | אדמין (cookie/Bearer לפי `requireAdminApi`) |
| GET | `/api/studio/auth/sso/start?redirect=1` | — | HTML + JS לפתיחת deep link | כנ"ל |
| POST | `/api/studio/auth/sso/exchange` | `{ code }` | `{ ok, token, user, baseUrl }` | קוד JWT חתום; CORS `*` |
| POST | `/api/studio/auth/sso/launch` | `{ baseUrl? }` | `{ ok, launched, deepLink }` | אדמין |
| GET | `/api/studio/tenants` | — | `{ ok, tenants[] }` | super_admin או business_admin (tenant יחיד) |
| GET | `/api/studio/tenants/:tenantId/categories` | — | `{ ok, tenantId, categories[] }` | super_admin או התאמת tenantId לsession |

**הערה:** נתיבי Studio משתמשים ב־CORS `Access-Control-Allow-Origin: *` — מתאים לאפליקציית Desktop, מגביר חשיבות לאימות JWT.

---

## 9. DB / Collections

| Collection / אזור | קשר לתמונות / Studio |
|---------------------|---------------------|
| `users` | `sso/exchange` טוען משתמש לפי `userId` מה־JWT |
| `tenants` | רשימה ל־`/api/studio/tenants` |
| `categories` | מקור ראשון לקטגוריות לפי `tenantId` |
| `products` | fallback ל־`distinct(category/subCategory)` אם אין קטגוריות |
| `SocialPublishHistory` / פרסום | לא נסרקו לעומק כאן; קשור לתיעוד פרסומים לא ל־Studio |

**אין** במאגר זה collection בשם `image_generations` / `studio_jobs` וכדומה.

---

## 10. הרשאות, עלויות ו־Rate Limits

‏- **דף אדמין Studio:** `isSuperAdminUser` בלבד.  
‏- **Login Studio:** `rateLimiters.login` — מגבלת ניסיונות התחברות.  
‏- **SSO code:** תוקף **120 שניות**; חתימה עם `STUDIO_SSO_SECRET` או fallback ל־`JWT_SECRET`.  
‏- **JWT לאחר exchange/login:** עד **שעתיים** (exchange) או 7d/30d (login).  
‏- **עלויות OpenAI / Cloudinary:** אין במאגר מעקב מרכזי (dashboard עלויות) ל־DALL·E; עלות היא לפי שימוש חיצוני.  
‏- **Desktop Studio:** עלויות מודל (Flux וכו׳) — **מחוץ למאגר**.

---

## 11. בעיות וסיכונים

‏1) **פער מימוש Social:** `resolveSocialPublishMedia` לא מיובא ב־`socialPublisher.js`; `cfg.generateImages` לא מוגדר ב־`getSocialAgentConfig` — נתיב DALL·E כנראה **מת**.  
‏2) **CORS פתוח** על `/api/studio/*` — מסתמך על חוזקת JWT ועל אי חשיפת token.  
‏3) **מקור אמת למודלים מתקדמים:** לא ניתן לבצע code review ל־Flux/Nano בלי מאגר האפליקציה.  
‏4) **שמירת זהות מוצר:** ב־DALL·E המוגדר — במכוון “לא צילום מדויק”; לא מתאים ל־SKU פוטוגרפי ללא pipeline נפרד.  
‏5) **`requireAdmin` בעמוד Studio:** משתמש ב־`getUserFromCookies` עם בדיקת `role === 'admin'` בלבד בקובץ `server.js` — עלול לחפוף עם `super_admin` (תלוי JWT בפועל).  
‏6) **פער אפשרי ב־`lib/auth/server.js`:** רבים מייבאים `requireAdminApi` מאותו נתיב; הקובץ במאגר הקצר לא מכיל את הייצוא — **סיכון פער סנכרון/בילד** (ראו בדיקה מול סביבתכם).

---

## 12. איך לחבר ל־Product Importer (המלצה)

‏Pipeline מוצע:  
‏**Importer → Draft Product (Mongo/collection ייעודית) → בדיקת איכות תמונה (heuristic: רזולוציה, מספר תמונות, שחזור hash מול PDF) → אם חלש: Job “Image Generation Draft” →**  
‏- אופציה א׳: קריאה ל־**API פנימי חדש** שעוטף את לוגיקת `mediaAssets` / מודל עתידי עם prompt מבוסס תבנית מוצר + tenant.  
‏- אופציה ב׳: ייצוא רשימת מוצרים חסרי מדיה ל־**Desktop Studio** דרך אותם endpoints (`tenants`/`categories`) + מזהה מוצר ב־payload (דורש הרחבת API).  
‏**Preview לפני פרסום:** שמירת `draftMedia[]` בטיוטת ה־Importer, אישור אדמין, ואז עדכון `Product.media` או העלאה ל־Catalog Manager כפי שכבר קיים.

---

## 13. החלטות לפני פיתוח

‏1) האם מאגר ה־Desktop Studio ייכנס ל־monorepo או יישאר קניין נפרד.  
‏2) האם לחבר מחדש `resolveSocialPublishMedia` ל־`socialPublisher` או להסיר dead code.  
‏3) איך מגדירים `generateImages` וסף עלות ב־ENV.  
‏4) האם ה־Importer קורא ל־DALL·E (מהיר, שיווקי) או ל־Flux (איכות) — ומי משלם.  
‏5) האם נדרש API שרת ליצירת תמונה **עם** `productId`/`tenantId` לאודיט.

---

## 14. המלצה סופית

‏**להשאיר את יצירת התמונות המתקדמת כמודול נפרד (Desktop Studio)** המתחבר ל־VIPO דרך ה־APIים הקיימים, ולהוסיף בשרת **שכבת Importer** קטנה (טיוטות + jobs) שמתזמנת או מפעילה יצירה — בלי לשכפל UI של Studio בתוך הדפדפן. עבור תמונות שיווקיות אוטומטיות בפוסטים — לתקן חיבור `mediaAssets` ↔ `socialPublisher` או להחליף ב־שירות ייעודי אחיד.

---

לא בוצעו שינויי קוד. לא בוצע deploy. זהו דוח סריקה ואפיון בלבד.
