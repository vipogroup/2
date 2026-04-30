# VIPO P1 SEO / Robots / Final QA Report

**File location:**  
`C:\Users\ALFA DPM\Desktop\New Agent System Miriam\vipo-agents-stage-deploy\PRE_LAUNCH_P1_SEO_ROBOTS_AND_FINAL_QA_REPORT.md`

**Scope:** SEO/robots/sitemap hygiene + manual QA artifact + env/git checks. **No** changes to PayPlus, orders, auth P0 paths, or DB data in this pass.

---

## 1. Status

**READY FOR PAID MARKETING AFTER MANUAL QA**

Rationale: `/homepage` duplicate risk and `robots.txt` gaps called out in `PRE_LAUNCH_FINAL_GO_NO_GO_REPORT.md` are **addressed in code**; `app/sitemap.js` was verified to emit **only** intended public URLs; `npm run lint`, `typecheck`, `build`, `test:api`, `test:ui`, and `prelaunch:gate` **all passed** after changes. **Paid marketing** still requires completing **`MANUAL_PRODUCTION_QA_CHECKLIST.md`** on the **live** domain and running a **secret scan / git history check on the real `origin` repository** (this workspace is largely **untracked** — see §5).

---

## 2. /homepage Strategy

| Field | Detail |
|-------|--------|
| **File changed** | `app/homepage/page.jsx` |
| **Chosen strategy** | **Permanent server redirect** to `/` via `permanentRedirect('/')` from `next/navigation`. Removed duplicate `metadata` and `HomePage` client render so `/` is the only canonical homepage content. |
| **Behavior** | Requests to `/homepage` resolve as a **308** permanent redirect to `/` (Next.js `permanentRedirect`). No duplicate marketing body or meta on `/homepage`. |
| **Sitemap** | `app/sitemap.js` did **not** list `/homepage` before or after; **no sitemap edit required**. |

**Verification**

| Check | Result |
|-------|--------|
| `/` still the main marketplace home | **PASS** (unchanged `app/page.jsx`) |
| `/homepage` → `/` | **PASS** (by code inspection; confirm on deployed host) |
| `npm run build` | **PASS** |
| `npm run prelaunch:gate` | **PASS** (`reports/pre-launch-gate.json`: `ok: true`, `stale: false`, run `2026-04-27T04:16:12Z`–`04:21:59Z`) |

---

## 3. Robots Hardening

| Field | Detail |
|-------|--------|
| **File changed** | `public/robots.txt` |
| **`app/robots.js`** | **Not present** (no change). |
| **`next.config.js` / `middleware.js`** | **Not modified** (redirects for `/shop`, `/p/:slug`, `/businesss` already exist; auth unchanged). |

**Blocked routes (explicit `Disallow` added or confirmed)** — at minimum:

- `/admin/`, `/business/`, `/agent/`, `/api/`, `/dashboard/`
- `/checkout-demo`, `/checkout-demo/`, `/checkout`, `/checkout/`
- `/reports`, `/reports/`, `/sales`, `/sales/`
- `/catalog-preview`, `/catalog-preview/`, `/catalog-manager`, `/catalog-manager/`
- `/orders`, `/orders/`, `/my-orders`, `/my-orders/`, `/messages`, `/messages/`, `/profile`, `/profile/`
- `/cart`, `/login`, `/login/`, `/register`, `/register/`
- `/reset`, `/reset/`, `/reset-password`, `/reset-password/` (app uses `reset-password/[token]`)
- `/products/new`, `/products/*/edit`, `/products/shared-container/`
- `/homepage`, `/homepage/` (belt-and-suspenders with redirect)
- `/p/`, `/shop` (legacy; redirects in `next.config.js`)

**Remaining risk**

- **Robots is not security** — crawlers may ignore; direct URLs must remain server-protected (already P0 scope elsewhere).
- **Wildcard rules** (`/products/*/edit`) depend on crawler support; primary enforcement remains server-side.
- **Forgot-password** and other `(public)` auth routes are not exhaustively listed; add later if SEO audits require.

---

## 4. Sitemap Verification

| Topic | Result |
|-------|--------|
| **Public URLs kept** | `/` (`SITE_URL`), `/about`, `/contact`, `/for-business`, `/for-agents`, `/join`, `/privacy`, `/terms`, `/returns-policy`; stainless hub URLs from `stainlessCategoryPages`; tenant `/t/{slug}` for qualifying tenants; `/products/...` from `getProductPublicPath(product)` for published products. |
| **Excluded private/internal** | Grep in `app/sitemap.js` found **no** URLs for: `homepage`, `admin`, `business`, `checkout-demo`, `dashboard`, `login`, `register`, `sales`, `reports`, `orders`, `messages`, `profile`, `api`. Static block does not emit edit/new/checkout routes. |
| **Files changed** | **None** for sitemap — policy already aligned. |

**Verification**

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** |
| `npm run prelaunch:gate` | **PASS** |
| Dedicated sitemap unit test | **Not present** in repo (none run). |

---

## 5. Env / Git Secret History Check

**Commands run (no secret values printed):**

- `git branch --show-current` → `master`
- `git remote -v` → **no output** in this environment (remote may be unset or empty)
- `git ls-files -- .env.local .env.prod.current .env.prod.verify .env.prod.livecheck` → **empty** (nothing tracked under those paths)
- `git ls-files | findstr /i ".env"` → **exit code 1** (no matching tracked paths — consistent with empty index / untracked tree)
- `git status --short | Select-Object -First 12` → entries are **`??`** (untracked), e.g. `.env.example`, `.gitignore`, etc.

**Conclusions**

| Question | Answer |
|----------|--------|
| Normal tracked repo vs snapshot? | **Snapshot-like:** project files appear **untracked** (`??`); **cannot** prove `origin/main` history from this folder alone. |
| Real env files tracked **here**? | `git ls-files` for common secret filenames → **none** (index empty for those paths). |
| `.gitignore` blocks `.env` / `.env.*`? | **Yes** — see `.gitignore` (`.env`, `.env.*` with `!.env.example` and similar exceptions). |
| Example/templates allowed? | **Yes** — `.env.example`, `.env.local.example`, `.env.local.TEMPLATE`, `.env.development.example` appear as untracked files in status sample. |
| Rotation | If any credential was ever committed on **GitHub**, shared in chat, or in old reports → **rotate** after history scan. |

**Instruction for the real repository**

1. On the machine/CI attached to **GitHub**: `git fetch origin && git checkout main` (or default branch).  
2. Run a **secret scanner** (e.g. GitHub Advanced Security, `gitleaks`, TruffleHog) on **`origin/main` and all tags**.  
3. `git ls-files | rg -i '\.env|secret|credential'` — review hits; **no** pasting values into tickets.  
4. If anything sensitive was ever committed: **rotate** those keys and use `git filter-repo` / support guidance only with team approval (out of scope here).

---

## 6. Manual QA Checklist

| Item | Detail |
|------|--------|
| **File created** | `MANUAL_PRODUCTION_QA_CHECKLIST.md` |
| **What must be tested manually** | Guest, customer, business, admin, security, payment, and **SEO** sections (including `/homepage` redirect, `robots.txt`, `sitemap.xml` on **production** host). Checklist items are **unchecked** by design. |

---

## 7. Commands Run

| Command | Result | Notes |
|---------|--------|--------|
| `npm run lint` | **PASS** | |
| `npm run typecheck` | **PASS** | |
| `npm run build` | **PASS** | |
| `npm run test:api` | **PASS** | |
| `npm run test:ui` | **PASS** | |
| `npm run prelaunch:gate` | **PASS** | `reports/pre-launch-gate.json` updated |
| `git status --short` (sample) | **N/A** | Shows pervasive `??` — see §5 |

---

## 8. Remaining Risks

| Risk | Priority | Required follow-up |
|------|----------|-------------------|
| Production QA not executed from this report | **P0 (process)** | Complete `MANUAL_PRODUCTION_QA_CHECKLIST.md` on live domain |
| GitHub / `origin` secret history unverified here | **P1** | Secret scan on real remote; rotate if leaked |
| Robots / sitemap do not replace auth | **P1 (awareness)** | Keep server guards; periodic security review |
| Other public auth routes not all in `robots.txt` | **P2** | Optional `Disallow` / `noindex` per SEO audit |
| JSON-LD vs marketplace API product set may differ slightly | **P2** | Align only if SEO parity required |

---

## 9. Final Recommendation

- **Soft launch:** **Yes** — P0 remains closed; SEO duplicate and robots gaps for the listed surfaces are **fixed in repo**.  
- **Paid marketing:** **Yes, only after** (1) **manual production QA** using `MANUAL_PRODUCTION_QA_CHECKLIST.md`, (2) **live** confirmation of `/homepage` → `/` and updated `robots.txt` / `sitemap.xml`, (3) **secret/history scan** on the real GitHub repo.  
- **Full “hands off” launch:** **No** without human sign-off on payments and security checklist.

---

**Files touched in this task**

- `app/homepage/page.jsx` — redirect only  
- `public/robots.txt` — expanded `Disallow` list  
- `MANUAL_PRODUCTION_QA_CHECKLIST.md` — **new**  
- `PRE_LAUNCH_P1_SEO_ROBOTS_AND_FINAL_QA_REPORT.md` — **new** (this file)

**Not modified:** `app/sitemap.js`, `next.config.js`, `middleware.js`, PayPlus/order/auth P0 files.
