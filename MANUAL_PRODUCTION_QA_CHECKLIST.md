# Manual production QA checklist (before paid ads)

**Purpose:** Human verification on the **live production domain** (not localhost only). Do not mark items complete until tested in the real environment.

**Security note:** `robots.txt` and SEO settings are not access control. Confirm sensitive routes still return 401/403/redirect from the server when accessed directly.

---

## 1. Guest QA

- [ ] Homepage `/` loads without 5xx; primary content and navigation visible
- [ ] Product list / marketplace loads (including pagination or filters if used)
- [ ] At least one product detail page loads (`/products/...`)
- [ ] Product images / gallery load (no broken primary image)
- [ ] WhatsApp / contact buttons use correct numbers or URLs
- [ ] Mobile layout: no horizontal overflow; tap targets usable
- [ ] RTL layout: Hebrew (or RTL locale) reads correctly; no mirrored icons where inappropriate

---

## 2. Customer QA

- [ ] Register (new account) succeeds; validation messages are sensible
- [ ] Login succeeds; session persists across refresh
- [ ] Logout clears session / cannot access private routes after logout
- [ ] **My orders** lists only the logged-in user’s orders
- [ ] **Order detail** — cannot open another user’s order by changing URL (expect deny or empty)
- [ ] Cart: add/remove/update quantity; prices match product page
- [ ] Checkout start: redirects / errors as designed for guest vs logged-in
- [ ] **Success** page: reflects paid state from server, not query string alone
- [ ] **Cancel** page: order state remains correct; user can retry safely

---

## 3. Business QA

- [ ] **business_admin** can log in and reach `/business` dashboard
- [ ] Normal **customer** cannot access `/business` (redirect to `/` or login as designed)
- [ ] **Agent** cannot access `/business` unless product policy explicitly allows (confirm expected behavior)
- [ ] `/api/business/stats` (Network tab): returns KPIs only for the tenant tied to that business user; no cross-tenant data when switching accounts

---

## 4. Admin QA

- [ ] Admin / super-admin login
- [ ] Product management: list, edit, save (non-destructive test product if available)
- [ ] Order management: list, open order, status aligns with payment
- [ ] Tenant filtering: switching tenant context does not leak other tenants’ data
- [ ] Reports (if enabled in your build): loads and respects role/tenant

---

## 5. Security QA

- [ ] Direct `/admin` (or deep link) as **guest** → login or deny, no admin UI
- [ ] Direct `/business` as **guest** → login or deny
- [ ] Direct `/business` as **normal logged-in customer** → blocked
- [ ] `POST` PayPlus **create-checkout** with another user’s `orderId` → `404` / no payment URL (no existence leak)
- [ ] Wrong-tenant or guessed order URL in UI/API behaves safely
- [ ] Production: `/checkout-demo` not usable as a public demo (redirect / 404 per deployment)
- [ ] Production: `POST /api/orders/demo-complete` returns **404** unless test harness is explicitly enabled (should be off in prod)

---

## 6. Payment QA

- [ ] **Sandbox** successful payment end-to-end (per PayPlus test policy)
- [ ] Canceled payment: order stays unpaid; user messaging clear
- [ ] Failed / declined card: no false “paid” state
- [ ] Webhook **retry** (or simulate): no duplicate financial side-effects; idempotent behavior
- [ ] Refresh **success** page: no duplicate order or double charge
- [ ] Duplicate webhook delivery: order does not flip incorrectly twice
- [ ] **PAYPLUS_MOCK_ENABLED** is **false** (or absent) in production; mock cannot simulate paid orders in prod

---

## 7. SEO QA

- [ ] `/` is the canonical homepage; loads as expected
- [ ] `/homepage` **redirects** to `/` (308/301 as deployed)
- [ ] `https://<domain>/robots.txt` is reachable and matches policy you expect
- [ ] `https://<domain>/sitemap.xml` loads; URLs are public marketing + products + intended tenant storefront URLs only
- [ ] Sample product URLs: canonical / slug behavior matches strategy (slug vs id) where applicable

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Owner | | | |
| QA | | | |
