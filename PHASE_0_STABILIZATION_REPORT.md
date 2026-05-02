# Phase 0 — Stabilization Report

Reference: `VIPO_IMPORTER_ARCHITECTURE_SUPPLEMENT_V1.md` (Phase 0 scope only).

## Plan (before code changes)

1. Catalog delete: keep server-side guards; add explicit dry-run → confirm → real delete in standalone UI; never treat dry-run as success; map API auth errors to 401/403.
2. `GET /api/products`: centralize tenant access checks; force tenant scope for `admin` users that carry a `tenantId`; preserve super-admin and legacy tenantless-admin behavior per `isSuperAdminUser`.
3. Auth helpers: keep `requireAdmin` / `requireAdminApi` behavior; document effective permission matrix from code.
4. Price `12345`: forbid on server upload/update; forbid silent client fallback; block publish/upload paths when USD price missing.
5. DALL·E / social: document dead code; no wiring without approval.
6. Tests: unit tests for guards and tenant scope; run Vitest subset.

## Files changed / added

| File | Change |
|------|--------|
| `lib/products/productListScope.js` | **New** — `assertTenantAccessOrThrow` (401/403, super / same-tenant / business_admin / admin rules). |
| `lib/catalogDeleteGuards.js` | **New** — `normalizeList`, `hasExactCoverage`, `catalogRealDeleteGuardsOk` (real-delete confirmation parity with route). |
| `app/api/products/route.js` | Uses `assertTenantAccessOrThrow` from lib; **scopes** non–super `admin` with `tenantId` to own tenant when no `tenantId` query param. |
| `app/api/catalog-manager/delete-products/route.js` | `requireAdminApi` wrapped for 401/403; guards delegated to `catalogRealDeleteGuardsOk`; outer catch returns `err.status` when set. |
| `public/_standalone/catalog-manager/index.html` | Two-step delete (`dryRun: true` then guarded `dryRun: false`); no success UI on dry-run; upload/update path skips invalid prices and blocks when fallback price rows exist. |
| `lib/auth/server.js` | (Prior session) `requireAdminApi`; `requireAdmin` allows `super_admin`. |
| `lib/catalogPriceGuards.js` | (Prior) forbidden price helper. |
| `app/api/catalog-manager/upload/route.js` / `update/route.js` | (Prior) reject `12345` / non-positive prices. |
| `lib/auth/requireAuth.js` | (Prior) JWT `sub` for user id. |
| Other admin routes | (Prior) `requireAdminApi` usage fixes where applicable. |
| `tests/lib/productListScope.test.js` | **New** — tenant access matrix. |
| `tests/lib/catalogDeleteGuards.test.js` | **New** — dry-run vs real delete guard expectations. |
| `tests/lib/catalogPriceGuards.test.js` | **New** — placeholder / invalid prices. |

## What was fixed

‏**מחיקת קטלוג:** זרימת UI דו־שלבית מיושרת ל־API — dry-run, אישור, סיבה, ואז בקשה עם כל שדות האישור שהשרת דורש; אין עדכון DOM/הודעת הצלחה כש־`dryRun` בלבד. טיפול שגיאות מ־`requireAdminApi` מחזיר סטטוס HTTP נכון במקום 500 שקט.

‏**GET /api/products:** בידוד tenant — משתמש מאומת עם `tenantId` ששייך לחנות רשאה ל־`tenantId` תואם בלבד; `business_admin` ו־`admin` (עם tenant) לא יכולים לשאול tenant אחר; `super_admin` / legacy `isSuperAdminUser` נשארים עם גישה רחבה כפי שהוגדר בקוד קיים; `admin` עם tenant נסגר אוטומטית לטננט שלו גם בלי פרמטר ב־URL (מניעת רשימה גלובלית בשוגג).

‏**מחיר 12345 / מחיר חסר:** שרת דוחה ערכים אסורים; ב־HTML אין fallback שקט ל־12345; שורות ללא מחיר תקף לא נדחפות ל־payload ומועלות/עדכון נחסמים עם הודעה אם יש שורות כאלה.

‏**DALL·E / Social:** `resolveSocialPublishMedia` ב־`mediaAssets.js` לא מיובא ב־`socialPublisher.js` (המפרסם משתמש ב־`pickProductMedia`). ב־`config.js` אין `generateImages`; יצירת תמונות דרך DALL·E לא מופעלת בזרימה הסטנדרטית עד החלטת מוצר (חיבור או הסרה) — **מומלץ בשלב נפרד:** או לחבר במפורש עם דגל קונפיגורציה ומדיניות עלות, או להסיר/לבודד dead code כדי שלא יניחו שהתמונה “כבר קיימת”.

## What was not changed / limitations

‏לא בוצע **refactor** רחב של מודולי Social מעבר לדוח.

‏בדיקות **אינטגרציה** מלאות ל־`POST /api/catalog-manager/delete-products` עם Mongo/Cloudinary דורשות סביבת בדיקות עם DB; בוצעו בדיקות יחידה ללוגיקת guards ו־tenant scope.

‏`requireAdminApi` לא נלווה בבדיקת יחידה שמדמה JWT — ההתנהגות נגזרת מ־`verifyJwt` ומ־Mongo; מומלץ smoke ידני: login כ־admin / business_admin / super ולוודא קודי תגובה.

## Permission matrix (as implemented)

| Role | `requireAdmin()` (pages) | `requireAdminApi()` | Catalog delete API | Catalog upload API | `GET /api/products` + `tenantId` |
|------|-------------------------|---------------------|--------------------|--------------------|----------------------------------|
| `admin` (tenantless, legacy) | Allowed | Allowed if active | Super path only (`isSuperAdminUser`) | Super path | Broad access (super) |
| `admin` (with `tenantId`) | Allowed | Allowed | Super only if `isSuperAdminUser` (email-based super still possible) | Super only | Scoped to own tenant |
| `super_admin` | Allowed | Allowed | Super | Super | Any tenant when param set; no forced filter if no param |
| `business_admin` | Not via `requireAdmin` (redirect) | Allowed | Super check fails → blocked | Super check fails → blocked | Own tenant; param must match |
| non-admin | Redirect login | 403 | N/A | N/A | `tenantId` without auth → 401; own tenant only if same `tenantId` on user |

*Note:* `requireAdmin` still only allows `admin` and `super_admin` (not `business_admin`) for server components — unchanged except `super_admin` inclusion.

## Tests run

```bash
npm run test:api -- tests/lib/productListScope.test.js tests/lib/catalogDeleteGuards.test.js tests/lib/catalogPriceGuards.test.js
```

**Result:** 3 files, 17 tests, all passed (Vitest).

## Remaining risks

‏**Legacy `isSuperAdminUser`:** אדמין ללא `tenantId` נחשב super — זה מכוון בקוד אבל רחב; שקלו צמצום לפי email/role בלבד בשלב עתידי.

‏**קטלוג production:** מחיקה אמיתית עדיין דורשת `ALLOW_CATALOG_PRODUCT_DELETE=true` ב־production — ודאו env לפני תרחישי מחיקה.

‏**לקוחות קיימים:** אם `admin` עם tenant הסתמך על רשימת כל המוצרים בלי `tenantId` ב־query — ההתנהגות השתנתה לטובת אבטחה; ייתכן צורך לעדכן קריאות API בצד הלקוח.

## Phase 1 readiness

‏**כן, בכיוון:** ייצוב Phase 0 (מחיקה, tenant listing, מחיר placeholder, דוח dead code) מכוסה ברמת קוד ובדיקות יחידה.

‏**תנאים לפני Phase 1:** smoke על סביבת staging עם משתמשים אמיתיים; החלטה על `resolveSocialPublishMedia` (חיבור מבוקר מול הסרה).

---

Phase 0 בוצע/נבדק בלבד. לא נבנה Importer, לא נוצרו collections חדשות, ולא בוצע deploy.
