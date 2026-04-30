# VIPO Pre-Launch Full Audit Report

## 1. Executive Summary
GO / NO-GO: **NO-GO**
Reason: Production-readiness checks found hard blockers: `npm run build` fails, privileged/business surfaces rely on weak role enforcement in key places, and a local environment file contains live-looking secrets that must not be present in workspace/repo risk surface before public marketing.

## 2. Critical Launch Blockers
| Priority | Area | Problem | File/Route/API | Risk | Required Fix |
|---|---|---|---|---|---|
| P0 | Build/Release | Production build fails with `PageNotFoundError: Cannot find module for page: /_document` | `npm run build` output | Deploy regression risk, broken release pipeline | Reproduce in clean CI container, identify pages/imports expecting Pages Router `_document`, fix/guard, require green `build` in CI gate |
| P0 | Secret Hygiene | Local env file contains plaintext high-risk keys/tokens (DB, OAuth, mail, media, signing) | `.env.local` | Credential leakage and account compromise risk | Rotate all affected credentials immediately, remove sensitive file from tracking/snapshots, enforce secret scanning |
| P0 | Authorization Model | Middleware protects auth only for `/business/**`; many business pages/components do not enforce role server-side | `middleware.js`, `app/business/page.js` | Cross-role access to business UI and potential data exposure depending on API behavior | Add explicit server role guard (`business_admin`/allowed roles) in business layouts/pages and sensitive APIs |
| P0 | Multi-tenant/Role API | Business stats API checks only `tenantId` existence, not role | `app/api/business/stats/route.js` | Any authenticated user with tenantId could pull business KPIs | Require `business_admin`/admin role and verify tenant ownership on server |
| P0 | Public surface (demo/test) | Demo/test flows remain routable in production codebase and require policy confirmation | `/checkout-demo`, `app/api/orders/demo-complete/route.js`, `app/api/admin/test-harness/*` | Abuse/confusion in public marketing environment | Block by environment flag in production and verify routes are hidden/noindexed/disallowed |

## 3. High Priority Before Paid Marketing
| Priority | Area | Problem | File/Route/API | Risk | Required Fix |
|---|---|---|---|---|---|
| P1 | Route protection clarity | Critical routes are not middleware-protected and rely on client/API checks only | `/orders`, `/my-orders`, `/messages`, `/sales`, `/reports`, `/checkout*` | Access-control drift during future refactors | Add server-level guard in page/layout (not client-only) or extend middleware + server checks |
| P1 | Validation consistency | Many sensitive handlers do not use Zod schema validation | Multiple under `app/api/**` | Input tampering/regression risk | Add Zod at least for auth, orders, payments, tenant/admin mutation endpoints |
| P1 | Tenant isolation | Marketplace/home query warning indicates missing tenant filter in DB query path | `app/page.jsx` runtime warning from `test:ui` | Potential tenant data mixing | Enforce tenant filter or explicitly justify global marketplace query contract |
| P1 | SEO canonical duplication | Both `/` and `/homepage` act as homepage variants without enforced canonical/redirect strategy | `app/page.jsx`, `app/homepage/page.jsx` | SEO dilution and paid campaign landing inconsistency | Keep `/` canonical; redirect `/homepage` to `/` or set `noindex` + canonical |
| P1 | Robots/sitemap policy | `robots.txt` does not explicitly block some private surfaces (`/business`, `/checkout-demo`, `/homepage`) | `public/robots.txt`, `app/sitemap.js` | Accidental indexing of non-marketing routes | Expand disallow rules and verify sitemap includes only intended public routes |

## 4. Non-Blocking Improvements
| Area | Recommendation | Why it matters |
|---|---|---|
| CI/CD | Make `build` + `lint` + `typecheck` + `test:api` mandatory on PR | Prevent last-minute release failures |
| Rate limiting | Move from in-memory limiter to distributed store (Redis/Upstash) | In-memory limits are weak on multi-instance Vercel |
| Auth consistency | Standardize on `requireAuthApi`/`requireAdminApi` (avoid custom JWT parsing per-file) | Reduces auth drift and bypass bugs |
| Legal UX | Add explicit group-buy failure/cancellation/deposit terms in checkout flow copy | Improves trust and reduces dispute risk |
| Observability | Add explicit dashboards/alerts for payment failures and webhook retries | Faster incident response during campaigns |

## 5. Commands Run
| Command | Result | Notes |
|---|---|---|
| `npm run prelaunch:gate` | PASS | Wrote `reports/pre-launch-gate.json` with `ok=true` |
| `npm run build` | FAIL | `PageNotFoundError: Cannot find module for page: /_document` |
| `npm run lint` | PASS | No lint failures reported |
| `npm run typecheck` | PASS | `tsc --noEmit` succeeded |
| `npm run test` | FAIL (missing script) | Automation gap, not a code failure |
| `npm run test:api` | PASS | 9 files / 30 tests passed |
| `npm run test:ui` | PASS with warning | Runtime warning: missing tenantId in product query path |
| `npm run` | PASS | Used to confirm available/missing scripts |

## 6. Files Inspected
- **Audit source docs:** `docs/CONSOLIDATED_FIX_AND_UPGRADE_LIST.md`, `docs/PRE_LAUNCH_PAGE_AUDIT.md`, `docs/INTEGRATION-ENV-CHECKLIST-he.md`, `docs/UPGRADE-ROADMAP-he.md`, `reports/pre-launch-gate.json`
- **Routing/security core:** `middleware.js`, `next.config.js`, `app/**/page.*` inventory (140 pages), `lib/auth/server.js`, `lib/auth/requireAuth.js`, `lib/authz.js`, `lib/tenantGuard.js`, `lib/tenantContext.js`
- **Payments/orders:** `app/api/payplus/create-checkout/route.js`, `app/api/payplus/webhook/route.js`, `lib/payplus/config.js`, `lib/payplus/client.js`, `app/api/orders/route.js`, `app/api/orders/[id]/route.js`, `app/api/orders/[id]/status/route.js`, `app/api/orders/demo-complete/route.js`, `app/checkout/page.jsx`, `app/checkout/success/page.jsx`, `app/checkout-demo/page.jsx`
- **Product/admin/business sensitive:** `app/api/products/route.js`, `app/api/products/[id]/route.js`, `app/api/uploads/products/route.js`, `app/api/catalog-manager/delete-products/route.js`, `app/api/business/stats/route.js`, `app/admin/page.js`, `app/admin/layout.js`, `app/business/page.js`
- **SEO/marketing/legal:** `app/sitemap.js`, `public/robots.txt`, `public/home/robots.txt`, `app/page.jsx`, `app/homepage/page.jsx`, `app/products/[id]/page.jsx`, `app/privacy/page.jsx`, `app/terms/page.jsx`, `app/returns-policy/page.jsx`, `app/contact/page.jsx`
- **Environment/integration:** `.env.example`, `.env.local` (keys and risk posture reviewed; secrets redacted in this report), `app/api/admin/system-status/route.js`

## 7. Route Security Review
| Route | Public/Private | Middleware protected | Server protected | Risk | Fix |
|---|---|---|---|---|---|
| `/` | Public marketing | No | Yes (server component fetches) | Medium (tenant filter warning seen) | Enforce/clarify tenant strategy for marketplace query |
| `/homepage` | Public marketing | No | Minimal | Medium SEO duplication | Redirect/noindex+canonical to `/` |
| `/products` | Public catalog | No | API-based filtering | Medium | Keep public, ensure strict published-only + tenant policy |
| `/products/new` | Private admin intent | No | **Client-only role check in page** | High | Add server-side role guard in page/layout |
| `/products/[id]/edit` | Private admin intent | No | **Client-only role check in page** | High | Add server-side role guard in page/layout |
| `/checkout` | Private purchase | No | API auth enforced for order creation | Medium | Add explicit server redirect for unauthenticated users |
| `/checkout/success` | Semi-private | No | Fetches `/api/orders/:id` (auth gated) | Medium | Keep server verification; avoid trusting query-only state |
| `/checkout-demo` | Internal/demo/dev | No | None | High in prod | Disable in production or guard by env + noindex |
| `/orders` | Customer/private | No | API guarded (`requireAuthApi`) | Medium | Add page-level server auth for defense in depth |
| `/messages` | Customer/private | No | Yes (`requireAuth`) | Low/Medium | Keep + validate tenant scoping in message APIs |
| `/sales` | Role-private | No | API enforces auth, role logic partial | Medium/High | Add server role guard in page + strengthen API role checks |
| `/reports` | Role-private | No | None in page | Medium | Add explicit server guard and remove placeholder exposure |
| `/catalog-manager` | Admin-only | Yes | Yes (`requireAdmin`) | Low | Keep |
| `/catalog-preview` | Internal | No | Redirect only | Medium | Gate or noindex if not public intent |
| `/admin/**` | Admin/private | Yes | Mixed (some pages guarded, layout client only) | Medium | Enforce server role guard at layout boundary |
| `/business/**` | Business/private | Yes (auth-only) | Weak in key pages | High | Enforce role (`business_admin`) server-side consistently |
| `/agent/**` | Agent/private | Yes | Some pages only auth (not strict role) | Medium | Enforce role where needed |

## 8. API Security Review
| API | Auth | Role | Tenant | Validation | Risk | Fix |
|---|---|---|---|---|---|---|
| `/api/payplus/create-checkout` | Partial (`requireAuthApi` optional fallback) | Missing strict ownership role check | Weak (order fetched by id before ownership check) | Minimal manual checks | High | Require authenticated owner/admin for orderId before session creation |
| `/api/payplus/webhook` | Signature-based | N/A | Derived from order | No Zod schema | Medium | Add strict schema validation + replay window check |
| `/api/orders` (POST) | Yes | Yes | Strong product-derived tenant assignment | Manual validation (no Zod) | Medium | Add Zod + idempotency key for duplicate submit |
| `/api/orders/[id]` | Yes | Yes | Tenant checks present | Manual | Medium | Keep; add schema and stronger 403 semantics |
| `/api/business/stats` | Yes | **No explicit business role** | Tenant required | No Zod | High | Require `business_admin`/admin + tenant ownership check |
| `/api/sales` | Custom JWT parsing | Partial | Tenant from current tenant helper | No Zod | Medium/High | Migrate to shared auth helpers + role/tenant hardening |
| `/api/products` (POST) | Yes (`requireAdminApi`) | Yes | Tenant assigned | Manual checks only | Medium | Add Zod for create/update payloads |
| `/api/products/[id]` (PUT) | Yes | Yes | Tenant ownership check | Manual | Medium | Add Zod and reduce complex mutable surface |
| `/api/uploads/products` | Yes | Yes | N/A | MIME/size checks | Low/Medium | Keep; add content scanning if required |
| `/api/orders/demo-complete` | Yes | Permits creator/agent/admin | Not strict | Minimal | High (if enabled in prod) | Disable or environment-guard for production |
| `/api/admin/test-harness/*` | Yes | Admin + harness gate | N/A | Varies | Medium | Verify strict prod disable policy and monitor access |
| `/api/dev/magic-login` | Env guarded | Secret header/query | N/A | Minimal | Medium | Keep disabled in prod; verify secret unset in production |

## 9. Payment Flow Review
Current flow is **not fully safe for immediate broad paid traffic**.
- Checkout currently uses WhatsApp submission path in UI (`app/checkout/page.jsx`) while PayPlus APIs exist separately, increasing flow divergence risk.
- PayPlus webhook includes signature verification and idempotency model, which is positive.
- `create-checkout` path should enforce strict order ownership before session issuance.
- Demo payment completion endpoint exists and can mutate order status.
- Order creation does server-side price/stock recomputation from DB (good), including stock reservation and rollback logic.

Verdict: **Needs hardening and environment gating before real payment scale-up.**

## 10. SEO Review
- Canonical duplication exists between `/` and `/homepage`; this must be unified.
- Product route metadata/JSON-LD/canonical implementation is strong in `app/products/[id]/page.jsx`.
- Sitemap logic is robust and excludes most private surfaces by explicit inclusion strategy, but confirm no accidental internal URLs from fallback data.
- `robots.txt` blocks many private routes but should explicitly include `/business`, `/checkout-demo`, and any internal/demo routes.
- Redirects required by launch rule are present in `next.config.js`:
  - `/shop -> /`
  - `/p/:slug -> /products/:slug`
  - `/businesss -> /business`

## 11. Env / Integration Review
Secrets are intentionally redacted.

| Variable/Group | Usage Location | In Example/Checklist | Production Risk | Launch Blocker |
|---|---|---|---|---|
| `MONGODB_URI`, `MONGODB_DB` | `lib/db.js`, system status checks | Present in `.env.example` | High if invalid/leaked | Yes |
| `JWT_SECRET`, `NEXTAUTH_SECRET` | auth middleware/server helpers | Present | High if weak/leaked | Yes |
| `NEXT_PUBLIC_SITE_URL`/`NEXT_PUBLIC_BASE_URL` | metadata/sitemap/redirect links | Present | Medium SEO/linking | Yes (if wrong) |
| `PAYPLUS_*` core | payplus config/client/webhook | Present | High payment failure/fraud risk | Yes |
| `PAYPLUS_MOCK_ENABLED` | `lib/payplus/config.js` | Present | High if true in production | Yes |
| `CLOUDINARY_*` | upload/media APIs | Present | Medium media failures | No (unless launch depends heavily on uploads) |
| `RESEND_API_KEY`/`SENDGRID_API_KEY` | notification/email | Checklist covers | Medium comms failures | No |
| `WHATSAPP_*`, `TWILIO_*` | checkout comms and OTP flows | Checklist covers | Medium conversion/support degradation | No |
| `GOOGLE_*`, Ads/GSC vars | OAuth/ads/SEO integrations | Checklist covers | Medium analytics/ads connectivity | No |

Additional critical note: local environment file currently contains plaintext sensitive values. Treat as incident and rotate.

## 12. Multi-Tenant Review
- Positive: many order/product paths derive tenant from server-side product/order records and perform tenant checks.
- High-risk gaps:
  - Business KPI endpoint allows any authenticated user with `tenantId`.
  - Middleware does not enforce role per area; only authentication for `/business/**` and `/agent/**`.
  - Runtime warning during UI test indicates missing tenant filter in home query path.
- Admin/super-admin tenant filtering appears implemented in many endpoints, but consistency is **UNCLEAR - needs manual verification** across all admin APIs.

## 13. Manual QA Still Required
- **Desktop:** homepage, catalog, product, cart, checkout, success, cancel, login, register, admin login, business login.
- **Mobile:** homepage, product gallery, cart, checkout, RTL, sticky CTA, WhatsApp button, forms, payment redirect.
- **Roles:** guest, customer, agent, business, admin, super admin.
- **Security:** direct URL access, wrong role access, wrong tenant access, order-id guessing, product edit URL guessing.
- **Payment:** successful test payment, failed payment, canceled payment, duplicate refresh/retry, webhook retry handling.
- **SEO:** verify canonical headers/tags, sitemap content, robots behavior in production domain.
- **Legal:** verify checkout and policy text exactly match real operational/payment/returns behavior.

## 14. Recommended Fix Order
1. **P0 Release gate:** fix `npm run build` failure and enforce CI gate.
2. **P0 Security incident response:** rotate exposed credentials and remove local secret exposure risk.
3. **P0 Access control:** enforce server-side role guards for `/business/**`, `/agent/**`, `/products/new`, `/products/[id]/edit`, and sensitive APIs (`/api/business/stats` first).
4. **P0/P1 Payment hardening:** strict order ownership in checkout session creation; production-disable demo/test payment paths.
5. **P1 Validation:** add Zod to orders/payments/auth/business/admin mutation endpoints.
6. **P1 SEO launch rule:** canonicalize homepage strategy (`/` primary, `/homepage` redirect/noindex+canonical).
7. **P1 Robots/sitemap cleanup:** expand disallow/noindex for internal/demo/private surfaces.
8. **P2 Platform robustness:** migrate rate limiting to shared backend (Redis/Upstash), strengthen observability dashboards/alerts.

## 15. Final Recommendation
- **Not ready for launch**

Rationale: critical blockers remain in build reliability, secret hygiene, and authorization/tenant guard consistency on sensitive surfaces.  
If P0 items are resolved and manual QA passes cleanly, reassess for **soft launch first**, then full paid marketing rollout.
