# TECHNICAL_INTEGRATIONS.md — I AM REEL Services & Integrations

**Last verified:** November 6, 2026 (America/Chicago)
**Primary evidence:** Read-only technical audit Nov 6, 2026 (~09:59 AM CT) plus cross-checks from website-bot / Webby inventories.
**Security:** Never store passwords, private API keys, tokens, or customer PII here. Record config **names** only when verified. Absence of a key on one host does **not** prove absence elsewhere if secrets were not inspected.

**Change policy:** No DNS, hosting, deployment, access-permission, or merge-to-production changes without explicit founder approval.

---

## 1. GitHub

| Field | Value |
|-------|--------|
| Repository | https://github.com/Amythist144/Iamreel |
| Visibility | Public |
| Default branch | `main` |
| HEAD at audit | `fc1a002a7b66a8653bdd877eb803c26f5f04bc1c` |
| Auto-deploy | Yes → Vercel production from `main` |
| Master docs | Added via documentation-only PR branch (do not merge without separate approval) |
| Diverged branch note | `customer-journey-redesign` diverged — do not merge without review |
| Exclude from commits | Memory requirements doc, backups, `_shots/`, `PAGES.md`, credentials, customer data, private inventories |

---

## 2. Website hosting — Vercel (verified)

| Field | Value |
|-------|--------|
| Public site | https://iamreel.app → HTTP **200**, `server: Vercel` |
| Provider | **Vercel** (verified — not assumption) |
| Project | `iamreel` |
| Team slug | `i-am-reel` |
| Billing | Connected user plan **Hobby** (active). Team plan not separately exposed — describe as Hobby / free-tier **class** only |
| Dashboard | https://vercel.com/i-am-reel/iamreel |
| Sign-in | https://vercel.com/login |
| Team overview | https://vercel.com/i-am-reel |
| Domains (project) | `iamreel.app`, `www.iamreel.app`, `iamreel.co`, `www.iamreel.co`, `iamreel.vercel.app` (+ git aliases) |
| `iamreel.vercel.app` | HTTP **200** |
| SSO-protected aliases | Some team/deployment hostnames **302 → SSO** — expected; prefer custom domain for public QA |
| GitHub Pages | Still enabled with CNAME `iamreel.app` while live traffic is Vercel — dual config; do not disable without approval |
| Env keys observed on Vercel (names only) | `XAI_API_KEY` for `/api/guide` |
| Owner bot | **I AM REEL** (sole active; handoff complete Nov 6, 2026 ~10:06 AM CT) |

**Bot access diagnosis (multi-layer; no single root cause without failing-bot logs):** public site reachable; SSO on some aliases; dashboard auth separate; connector grants vary; Supabase email confirmation affects customer cloud-save (not hosting). Confirm failing bot’s exact URL/error.

---

## 3. Supabase (verified)

| Field | Value |
|-------|--------|
| Org plan | **Free** |
| Project | I AM REEL Vision Guide |
| Ref | `jtlqvxcmbgqtcpdhldbm` |
| Status | ACTIVE_HEALTHY |
| Dashboard | https://supabase.com/dashboard/project/jtlqvxcmbgqtcpdhldbm |
| Edge functions (deployed examples) | `vision-teaser`, `vision-guide`, `paypal-checkout` (presence ≠ working payments) |
| `generate-wallpaper` | In repo; live gateway **404 NOT_FOUND** |
| Catalog | FE/DB mismatch; missing product rows for some enum codes |
| `teaser_sessions` | RLS on, **no policies** → **default-deny** (not evidence of public leak) |
| Auth advisor: leaked-password protection | Noted disabled — **do not enable / do not purchase upgrades** without founder approval |
| Publishable key in frontend config | Expected for client; **never** commit service_role |

---

## 4. PayPal

| Field | Value |
|-------|--------|
| Requirement | Checkout + sandbox testing |
| Verified working capture/webhook/entitlement | **No** |
| Preview / local flags | **Not** authorization |
| Vercel PayPal env keys | Not observed |
| Supabase function secrets | **Not inspected** — do not claim “no backend secrets” |
| Owner | I AM REEL bot |

---

## 5. Accounts, photos, fulfillment

| Capability | Status |
|------------|--------|
| Auth / Sanctuary sync | Code present; E2E cloud-save QA open; retain local dream/browser data |
| Photo upload/storage | E2E **unverified** |
| Orders / production jobs | Empty in audit snapshot |
| Vision Guide ↔ production | Not verified |

---

## 6. Runway & production APIs

| Field | Value |
|-------|--------|
| Runway account inspection | **Not done** |
| Paid calls | Forbidden without founder approval |
| Violet / portrait assets | See ASSET_DIRECTORY.md — restricted inventories via Central |
| Exact generation arguments | **Omit** from public docs |

---

## 7. Cursor

Cursor Free for specialized coding via complete ready-to-paste instructions; not a daily-managed bot.

---

## 8. Site-listed prices (reference only — NOT launch approvals)

| Listing label | Amount |
|---------------|--------|
| Portrait | $14.99 |
| Trio | $29 |
| Board | $39 |
| MeditationVideo | $49 |
| Reel | $199 |

DB rows differ from site listings. Launch SKUs (Violet Flame Meditation, Ascended Master Portrait, third TBD) are **not** aligned dedicated products yet. Founder must approve Nov 13 prices separately.

---

## 9. Ownership / handoff

| Item | Status |
|------|--------|
| Webby → I AM REEL responsibility | **COMPLETE** Nov 6, 2026 ~10:06 AM America/Chicago (receiver acknowledged all required points) |
| Unfinished features | Remain unfinished (PayPal, catalog, photo fulfillment, etc.) |
| Webby / EV | Historical preserve; EV static untouched |

---

## 10. Open verification / approval items

1. Founder launch prices + third product definition
2. Portrait manual pilot approval + dry-run
3. Approved Violet master location (continue search; no new gens)
4. PayPal sandbox E2E only with approval
5. Docs PR **merge** (separate from open-PR approval)
6. Any DNS/Pages/access changes
7. Folder reorganization proposals (not authorized to execute)

---

*End of TECHNICAL_INTEGRATIONS.md — Nov 6, 2026 (America/Chicago).*
