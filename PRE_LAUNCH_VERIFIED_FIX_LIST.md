# VIPO Verified Pre-Launch Fix List

## 1. Current GO / NO-GO
Status: **NO-GO**
Reason: Current verification shows active P0 blockers in build/release, auth/role/tenant enforcement, and demo-payment exposure policy.

## 2. Audit Issues Re-Verified
| Issue from audit | Current status | Evidence | Active blocker | Required fix |
|---|---|---|---|---|
| Build fails with `/_document` PageNotFoundError | NOT REPRODUCIBLE | Current `npm run build` fails with a different error (`.next/types/app/admin/crm/automations/page.ts` missing); `pages/_document.js` exists | No (specific `/_document` symptom) | Rebuild in clean CI, clear `.next`, and fix current build type-artifact error path |
| Secret hygiene: `.env.local` plaintext risk | PARTIALLY FIXED | `.env.local` is ignored by `.gitignore`; `git ls-files --error-unmatch .env.local` fails (not tracked) | No immediate tracked-file proof from this pass | Keep `.env.local` ignored; run secret scanner over tracked history and rotate high-risk credentials if previously exposed |
| Middleware auth-only for `/business/**` and weak role enforcement | ACTIVE | `middleware.js` protects auth but not business role; `app/business/layout.jsx` is client-only and allows non-business role path (`if (role !== 'business_admin') return children`) | **Yes** | Add server-side role guard at `/business` layout/page boundary and API layer |
| `/api/business/stats` missing business role check | ACTIVE | `app/api/business/stats/route.js` checks only `requireAuthApi` + `user.tenantId`; no business/admin role enforcement | **Yes** | Require `business_admin`/`admin` role and tenant ownership validation before query |
| Demo/test payment surfaces routable | ACTIVE | `app/checkout-demo/page.jsx` public page; `app/api/orders/demo-complete/route.js` can set order paid/demoPayment; no prod guard in this route | **Yes** | Hard-disable demo completion in production and restrict demo UI route (redirect/404/noindex/disallow) |
| Route protection clarity for private pages | ACTIVE | `/products/new` and `/products/[id]/edit` are client-only role checks; `/reports` has no server guard | No (P1) | Add server-side auth/role checks in page/layout before rendering |
| Validation consistency (missing Zod) | ACTIVE | Critical APIs (`orders`, `payplus`, `sales`, `business/stats`, `products`) use manual validation only | No (P1) | Add Zod schemas for request body/query/headers in sensitive APIs |
| Tenant isolation warning / drift risk | PARTIALLY FIXED | Strong tenant handling in `orders` POST; but `sales` API uses custom auth and tenant logic is less strict, and role model is inconsistent | No (P1) | Standardize auth helper usage and enforce tenant filter + ownership in every sensitive query path |
| SEO duplication `/` and `/homepage` | ACTIVE | `app/page.jsx` and `app/homepage/page.jsx` both live; no redirect/canonical policy on `/homepage` | No (P1) | Redirect `/homepage` to `/` or mark noindex + canonical `/` |
| Robots/sitemap private/demo coverage gaps | ACTIVE | `public/robots.txt` lacks explicit `Disallow: /business` and `Disallow: /checkout-demo`; sitemap does not include those routes by default but robots policy is incomplete | No (P1) | Add explicit disallow rules for business/demo/internal paths and keep sitemap public-only |
| `/api/payplus/create-checkout` ownership strictness | ACTIVE | `app/api/payplus/create-checkout/route.js` loads order by ID before strict owner/admin authorization and permits unauthenticated fallback path | **Yes** | Require authenticated requester and verify owner/admin+tenant before creating payment session |
| `/api/sales` custom JWT + partial role model | ACTIVE | `app/api/sales/route.js` uses custom token parser (`verify`) instead of shared auth guards; role/tenant checks partial | No (P1) | Migrate to `requireAuthApi`/`requireAdminApi` pattern and harden role+tenant checks |

## 3. Build Verification
Command results:
- `npm run build` -> **FAIL**; `Type error: File '.next/types/app/admin/crm/automations/page.ts' not found` (launch blocker: **Yes**; matches audit report: **No**, different failure)
- `npm run prelaunch:gate` -> **FAIL/HUNG**; process hung with no step output and was terminated; previous `reports/pre-launch-gate.json` shows stale/partial results (launch blocker: **Yes**, automation unreliable; matches audit report: **No**)
- `npm run lint` -> **PASS** (launch blocker: No; matches audit report: Yes)
- `npm run typecheck` -> **PASS** (launch blocker: No; matches audit report: Yes)
- `npm run test:api` -> **FAIL**; suite timeout in `tests/api/products-media-ssot.test.js` hook (launch blocker: No for launch, Yes for CI quality; matches audit report: No)
- `npm run test:ui` -> **FAIL**; Playwright webServer timeout and `.next` runtime module errors (`webpack-runtime.js`, `Cannot find module '../../webpack-runtime.js'`) (launch blocker: No direct production blocker, but high verification risk; matches audit report: No)

Root cause if failing:
- Build and UI test failures are now `.next` artifact/runtime/type generation issues, not the previous `/_document` symptom.

Files involved:
- `.next/types/app/admin/crm/automations/page.ts` (missing generated type file)
- `.next/server/webpack-runtime.js` and `.next/server/app/_not-found/page.js` runtime chain
- `reports/pre-launch-gate.json` (stale/inconsistent gating output)

Minimal fix:
- Enforce clean pre-build in CI (`rimraf .next` equivalent), regenerate Next artifacts, and fail fast if type generation misses files.

## 4. Secret Hygiene Verification
Risk status:
- **PARTIAL RISK REMAINS** (policy and code masking are good; historical exposure cannot be fully disproven in this pass).

Files involved:
- `.gitignore`
- `.env.example`, `.env.development.example`, `.env.local.example`, `.env.local.TEMPLATE`, `env.production.template`
- `app/api/admin/system-status/route.js`

Tracked/untracked status:
- `.env.local` is currently ignored and not tracked (`git ls-files --error-unmatch .env.local` fails).
- Example env files are untracked in current working tree snapshot.

Rotation required:
- **Recommended** if any past exposure happened (audit previously flagged live-looking secrets). This pass did not print values and did not prove active tracked secret values.

Required fix:
- Keep `.env.*` ignore policy strict, run repository secret scanning (including history), and rotate sensitive credentials previously used in local tracked contexts.

## 5. Demo/Test Payment Surface Verification
| Route/API | File | Public? | Production guarded? | Can mutate data? | Risk | Required fix |
|---|---|---:|---:|---:|---|---|
| `/checkout-demo` | `app/checkout-demo/page.jsx` | Yes | No | No direct DB mutation | High | Disable in production and mark noindex/disallow |
| `/api/orders/demo-complete` | `app/api/orders/demo-complete/route.js` | No (auth required) | No explicit prod guard | **Yes** (`status='paid'`, `demoPayment=true`) | **Critical** | Block endpoint in production via env + admin/test-harness gate |
| `/api/admin/test-harness/status` and related harness routes | `app/api/admin/test-harness/*` | No | Yes via `isTestHarnessEnabled` + admin permission gate | Some routes mutate state | Medium | Keep disabled by default in production and require explicit enable + monitoring |
| `/api/dev/magic-login` | `app/api/dev/magic-login/route.js` | No | Yes (`NODE_ENV !== production` + secret) | Sets auth cookies | Medium | Ensure production env cannot satisfy dev conditions and secret remains unset |
| `PAYPLUS_MOCK_ENABLED` behavior | `lib/payplus/config.js` | N/A | Throws in production if true | Could affect payment mode if bypassed elsewhere | Medium | Keep hard throw and add startup/health fail if mock enabled in prod |

## 6. Auth / Role / Tenant Verification
| Route/API | Auth | Role | Tenant | Client-only? | Risk | Required fix |
|---|---|---|---|---|---|---|
| `/business/**` | Middleware auth | Weak in layout/page | Partial | **Yes** (`app/business/layout.jsx`) | **P0** | Add server role guard (`business_admin`) |
| `/agent` | Yes | Not strict role check | N/A | No | Medium | Enforce explicit agent/admin allowed roles |
| `/products/new` | Via client `/api/auth/me` | Client admin check only | N/A | **Yes** | **P0** | Convert page to server auth/role guard |
| `/products/[id]/edit` | Via client `/api/auth/me` | Client admin check only | N/A | **Yes** | **P0** | Convert page to server auth/role guard |
| `/reports` | None on page | None | N/A | **Yes** | Medium | Add server auth/role or remove placeholder from protected nav |
| `/messages` page + API | Yes | API role-aware | Tenant filters present | No | Low/Medium | Keep; add schema validation and tighten delete semantics if needed |
| `/api/business/stats` | Yes | **Missing business role** | Uses tenantId only | No | **P0** | Require business/admin role + ownership |
| `/api/sales` | Custom token auth | Partial | Partial | No | High (P1) | Replace custom auth with shared guards and strict tenant ownership |
| `/api/payplus/create-checkout` | Optional auth fallback | Weak owner/admin enforcement | Weak before authz | No | **P0** | Enforce authenticated owner/admin+tenant before session creation |
| `/api/orders` POST | Yes | Yes | Strong product-derived tenant | No | Medium | Add Zod + idempotency key |
| `/catalog-manager` page | Yes | Super-admin enforced | N/A | No | Low | Keep |
| `/catalog-preview` page | No | None | N/A | No | Medium | Gate or noindex/disallow if internal-only |

## 7. Payment Flow Verification
| Check | PASS/FAIL/UNCLEAR | Evidence | Required fix |
|---|---|---|---|
| 1. Price recalculated server-side from DB | PASS | `app/api/orders/route.js` rebuilds item prices from products collection | None |
| 2. Client cannot force final price | PASS | Server computes subtotal/discount/total in orders API | None |
| 3. Quantity validated server-side | PASS | `invalid_quantity` checks and stock reservation logic | None |
| 4. Product belongs to correct tenant | PASS | Single-tenant product set enforced; mixed-tenant order blocked | None |
| 5. Order linked to tenantId | PASS | Tenant derived from product/coupon/current tenant and enforced | None |
| 6. Order linked to user/customer/session | PASS | `createdBy` set from authenticated user | None |
| 7. Create-checkout verifies owner/admin before payment session | FAIL | `app/api/payplus/create-checkout/route.js` lacks strict ownership check before session creation | Add owner/admin+tenant authorization guard |
| 8. Success page does not trust query alone | PASS | `app/checkout/success/page.jsx` fetches `/api/orders/:id` (auth-protected) | None |
| 9. Webhook validates signature/secret | PASS | `verifyPayPlusSignature` in webhook route | None |
| 10. Webhook idempotent | PASS | `PaymentEvent` eventId dedupe check | None |
| 11. Duplicate webhook does not duplicate paid state | PASS | Existing processed event short-circuits | None |
| 12. Refresh success page does not duplicate order | PASS | Success page reads existing order only; no create on success page | None |
| 13. Cancel/failure flow safe | PARTIAL | Cancel page exists; no mutation seen, but full end-to-end cancel semantics need QA | Manual QA + explicit status mapping tests |
| 14. Demo completion cannot update production orders | FAIL | `/api/orders/demo-complete` can set paid/demoPayment without prod guard | Disable endpoint in prod |
| 15. `PAYPLUS_MOCK_ENABLED` cannot simulate paid orders in production | PASS | `lib/payplus/config.js` throws if mock enabled in production | Keep startup enforcement and monitor |

## 8. SEO Verification
| Area | Current behavior | Risk | Required fix |
|---|---|---|---|
| Homepage canonical (`/` vs `/homepage`) | Both routes exist; no redirect/noindex strategy on `/homepage` | Medium | Redirect `/homepage` -> `/` (preferred) |
| Sitemap private/demo inclusion | `app/sitemap.js` builds explicit public routes/products/tenants only | Low | Keep explicit allowlist approach |
| Robots private/demo blocking | `public/robots.txt` blocks many private paths but not explicit `/business` and `/checkout-demo` | Medium | Add explicit disallow lines |
| Product canonical slug policy | Product page has strong canonical/redirect logic | Low | Keep |
| Required redirects | `/shop`, `/p/:slug`, `/businesss` redirects exist in `next.config.js` | Low | Keep |

SEO blocker status: **ACTIVE SEO ISSUES (not P0), launch-quality impact present.**

## 9. Data Cleanup / Test Orders
Findings:
- Test/demo/data-reset tooling exists across scripts and admin/test-harness surfaces.
- `messages` cleanup endpoint is preview-only (deletion disabled), but many other scripts include destructive operations.
- Demo payment route marks orders with `demoPayment: true`, which is a usable marker.

Do not delete:
- No cleanup/deletion was executed in this pass.

Recommended safe approach:
- Build a dedicated dry-run cleanup script that only targets explicitly marked test/demo records first.
- Suggested safe filters before any deletion:
  - `demoPayment: true`
  - test-harness source markers / known seed user emails / known seed tags
  - non-production creation windows + explicit operator confirmation token
  - tenant-scoped filtering and mandatory backup snapshot before delete

## 10. Exact Recommended Fix Order
P0-1: Fix build pipeline failure (`npm run build`) for missing `.next` generated type file; enforce clean artifact generation in CI.  
P0-2: Add strict owner/admin+tenant authorization to `app/api/payplus/create-checkout/route.js`.  
P0-3: Add server-side role enforcement for `/business/**` and fix permissive client gate in `app/business/layout.jsx`.  
P0-4: Add explicit role guard to `app/api/business/stats/route.js` (`business_admin`/`admin`) with tenant ownership validation.  
P0-5: Disable demo-payment mutation in production (`app/api/orders/demo-complete/route.js`) and gate `/checkout-demo`.  

Then P1:
- Convert `/products/new` and `/products/[id]/edit` to server-protected pages.
- Standardize auth in `/api/sales` and add Zod to critical APIs.
- Resolve `/` vs `/homepage` canonical policy and robots disallow coverage.

Then P2:
- Harden prelaunch automation reliability (`prelaunch:gate` hangs/inconsistency).
- Improve test reliability (`test:api` hook timeout, `test:ui` webServer startup instability).

## 11. Files That Need Editing
| File | Why | Priority | Suggested change |
|---|---|---|---|
| `app/api/payplus/create-checkout/route.js` | Missing strict order ownership authorization | P0 | Require authenticated owner/admin and tenant match before creating session |
| `app/business/layout.jsx` | Client-only permissive business role gate | P0 | Replace with server-side role/tenant guard at layout/page boundary |
| `app/api/business/stats/route.js` | Tenant check without role check | P0 | Enforce `business_admin`/`admin` role + tenant ownership |
| `app/api/orders/demo-complete/route.js` | Can mutate order to paid without prod guard | P0 | Disable in prod and restrict to test harness |
| `app/products/new/page.jsx` | Client-only admin check | P0 | Move auth/role check to server component/layout |
| `app/products/[id]/edit/page.jsx` | Client-only admin check | P0 | Move auth/role check to server component/layout |
| `public/robots.txt` | Missing explicit disallow for some private/demo routes | P1 | Add `/business` and `/checkout-demo` disallow rules |
| `app/homepage/page.jsx` | Duplicate homepage route without canonical handling | P1 | Redirect to `/` or apply noindex+canonical |
| `app/api/sales/route.js` | Custom auth parser and partial role/tenant hardening | P1 | Migrate to shared auth helper + stricter role/tenant checks |
| `scripts/pre-launch-gate.mjs` | Hangs/inconsistent reporting | P1 | Add timeout guards and deterministic step status logging |

## 12. Final Recommendation
- **STILL NO-GO**

Gate criteria not met in this verification pass:
- Build does **not** pass.
- Demo/test payment mutation path is not fully production-guarded.
- Role/tenant P0 issues remain active.
- Payment flow still has authorization hardening gaps in checkout session creation.
