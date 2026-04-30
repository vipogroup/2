# VIPO Agents — Pre-launch page audit (App Router)

**Scope:** Every `page.{js,jsx,ts,tsx}` under `app/` (140 routes after typo cleanup).  
**Not in scope:** `app/api/**` (283 route handlers — separate audit), static assets, middleware-only behavior except where noted.  
**Method:** Filesystem inventory + `middleware.js` matcher + `next.config.js` redirects.  
**Manual QA:** Not executed in this pass — use the checklist at the end before broad marketing.

### Automated release gate (CI / local)

From repo root:

```bash
npm run prelaunch:gate
```

Runs `lint` → cleans `.next` → `build` → `typecheck` → verifies critical files exist; writes `reports/pre-launch-gate.json`. Exit code `0` = all automated checks passed (still complete manual QA below).

- Fast path (no build): `PRELAUNCH_SKIP_BUILD=1 npm run prelaunch:gate` — only use when `.next` is already fresh from a recent `next build`.

---

## Executive summary

- **140 user-facing routes** are defined in the App Router. Many are **role-specific** (admin / business / agent); several are **public storefront and checkout** — these are the highest priority before wide sales marketing.
- **Middleware** protects only: `/admin`, `/dashboard`, `/agent`, `/business`, `/catalog-manager`, `/login` (not the entire site). Public catalog, cart, checkout, and marketing pages rely on **per-page and per-API** auth and validation.
- **Redirects:** `/shop` → `/` (permanent); `/p/:slug` → `/products/:slug` (permanent); **`/businesss` → `/business`** (permanent, typo hardening). Old links may still appear in SEO — verify sitemap and canonicals.
- **Duplicate entry points:** both **`/`** (`app/page.jsx`) and **`/homepage`** (`app/homepage/page.jsx`) exist — decide single canonical home for SEO and ads (content differs today).

---

## Full route inventory (140)

Route groups like `(public)` do **not** appear in the URL.

### Public — auth & registration (8)

| URL |
|-----|
| `/login` |
| `/login/google` |
| `/register` |
| `/register-agent` |
| `/register-business` |
| `/forgot-password` |
| `/reset-password/[token]` |
| `/auth/complete-google` |
| `/auth/otp` |

### Public — marketing & content (11)

| URL |
|-----|
| `/` |
| `/homepage` |
| `/about` |
| `/contact` |
| `/for-agents` |
| `/for-business` |
| `/join` |
| `/agents` |
| `/privacy` |
| `/terms` |
| `/returns-policy` |
| `/shop` *(redirects to `/`)* |

### Storefront — catalog & product discovery (9)

| URL |
|-----|
| `/products` |
| `/products/new` |
| `/products/[id]` |
| `/products/[id]/edit` |
| `/products/shared-container/[id]` |
| `/t/[slug]` |
| `/p/[slug]` *(redirects to `/products/:slug`)* |
| `/v/[id]` |
| `/stainless/[seoCategory]` |

### Checkout & cart (6)

| URL |
|-----|
| `/cart` |
| `/checkout` |
| `/checkout/[productId]` |
| `/checkout/success` |
| `/checkout/cancel` |
| `/checkout-demo` |

### Customer / signed-in shopper (9)

| URL |
|-----|
| `/customer` |
| `/profile` |
| `/my-orders` |
| `/orders` |
| `/orders/[id]` |
| `/messages` |
| `/dashboard` |
| `/dashboard/reports` |
| `/dashboard/admin/withdrawals` |

### Sales (internal / role — confirm who may access) (3)

| URL |
|-----|
| `/sales` |
| `/sales/new` |
| `/sales/[id]` |

### Reports (standalone) (1)

| URL |
|-----|
| `/reports` |

### Catalog tools (URLs at root — verify access control in page/API) (2)

| URL |
|-----|
| `/catalog-manager` |
| `/catalog-preview` |

### Agent app (5)

| URL |
|-----|
| `/agent` |
| `/agent/about` |
| `/agent/products` |
| `/agent/marketing` |
| `/agent/share/[productId]` |

### Business app (24)

| URL |
|-----|
| `/business` |
| `/business/agents` |
| `/business/analytics` |
| `/business/bot-manager` |
| `/business/branding` |
| `/business/commissions` |
| `/business/crm` |
| `/business/crm/dashboard` |
| `/business/integrations` |
| `/business/marketing` |
| `/business/notifications` |
| `/business/orders` |
| `/business/products` |
| `/business/products/new` |
| `/business/products/[id]` |
| `/business/products/[id]/edit` |
| `/business/reports` |
| `/business/sales-status` |
| `/business/settings` |
| `/business/settings/integrations` |
| `/business/site-texts` |
| `/business/site-texts/homepage` |
| `/business/transactions` |
| `/business/users` |
| `/business/withdrawals` |
| `/business/[businessId]/bot-manager` |

### Admin app (64)

| URL |
|-----|
| `/admin` |
| `/admin/about` |
| `/admin/agents` |
| `/admin/agents/[id]` |
| `/admin/analytics` |
| `/admin/backups` |
| `/admin/bot-manager` |
| `/admin/branding` |
| `/admin/catalog` |
| `/admin/catalog-manager` |
| `/admin/catalog-manager/price-table` |
| `/admin/catalog-manager/standalone` |
| `/admin/commissions` |
| `/admin/control-center` |
| `/admin/crm` |
| `/admin/crm/dashboard` |
| `/admin/crm/import` |
| `/admin/crm/automations` |
| `/admin/crm/reports` |
| `/admin/crm/templates` |
| `/admin/crm/whatsapp` |
| `/admin/dashboard-improved` |
| `/admin/emergency-backup` |
| `/admin/errors` |
| `/admin/finance` |
| `/admin/google-links` |
| `/admin/integrations` |
| `/admin/management` |
| `/admin/marketing-assets` |
| `/admin/media-usage` |
| `/admin/monitor` |
| `/admin/notification-logs` |
| `/admin/notifications` |
| `/admin/orders` |
| `/admin/payments` |
| `/admin/products` |
| `/admin/products/new` |
| `/admin/products/categories` |
| `/admin/products/[id]/edit` |
| `/admin/registration-links` |
| `/admin/reports` |
| `/admin/security` |
| `/admin/settings` |
| `/admin/settings-hub` |
| `/admin/simulator` |
| `/admin/site-texts` |
| `/admin/site-texts/homepage` |
| `/admin/social-audit` |
| `/admin/system-reports` |
| `/admin/tasks` |
| `/admin/tenants` |
| `/admin/tenants/dashboard` |
| `/admin/theme-selector` |
| `/admin/transactions` |
| `/admin/users` |
| `/admin/users/[id]` |
| `/admin/vipo-image-studio` |
| `/admin/withdrawals` |

---

## Middleware vs pages (launch-critical)

**Matcher today:** `/admin/*`, `/dashboard/*`, `/agent/*`, `/business/*`, `/catalog-manager/*`, `/login`.

**Implications for broad sales:**

- **Cart, checkout, product pages, `/customer`, `/orders`, `/messages`, `/sales`, `/reports`, `/catalog-*`** are **not** gated by middleware — they must enforce auth/tenant in **Server Components, layout, or API** used by those pages.
- **`/catalog-manager`** at site root **is** in the matcher (super-admin style gate in middleware). Confirm UX: marketing links should never point casual shoppers here.

---

## Pre-launch checklist (run before wide marketing)

### Storefront & revenue

- [ ] Happy path: browse → product → add to cart → checkout → PayPlus (or configured PSP) → success/cancel pages, email/receipt if applicable.
- [ ] **Mobile:** cart, checkout, product gallery, RTL if you sell in Hebrew.
- [ ] **Empty states:** no products, out of stock, invalid slug (`/t/[slug]`, `/products/[id]`).
- [ ] **SEO:** canonical for `/` vs `/homepage`; sitemap includes only public URLs you want indexed; `robots.txt` if used.

### Trust & legal

- [ ] `/privacy`, `/terms`, `/returns-policy` copy matches what you actually do (payments, cookies, marketing, WhatsApp, etc.).
- [ ] Contact details on `/contact` and footer match production support.

### Security & abuse

- [ ] No **demo** or **dev-only** flows reachable in production (`/checkout-demo`, any dev API — confirm env guards).
- [ ] Rate limits on auth/register/checkout where applicable (see `lib/rateLimit.js`).

### Operations

- [ ] Error monitoring (e.g. existing error logging) receives a test event from a failing page.
- [ ] Admin-only tools: smoke test login as each role; confirm **403/redirect** on wrong role for sensitive `/admin` and `/business` pages.

---

## Suggested post-launch improvements (non-blocking)

- Unify **home** strategy (`/` vs `/homepage`).
- Add **automated smoke** (Playwright) for: home, product, cart, checkout, login — already partially covered by `npm run test:ui` / `ci:all` if you wire CI.

---

## Files referenced

- `middleware.js` — `config.matcher`
- `next.config.js` — `redirects`, security headers
- `app/**/page.*` — 140 pages (this inventory)

**Generated for:** go/no-go before broad product-sales marketing. Re-run inventory after adding/removing `page` files. Run `npm run prelaunch:gate` before each release candidate.
