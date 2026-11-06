# PROJECT_STATUS.md — I AM REEL Master Project Record

**Document type:** Master project status (documentation-only)
**Source of truth after merge:** https://github.com/Amythist144/Iamreel
**Last verified:** November 6, 2026 (America/Chicago)
**Sources:** Founder master instructions (approved requirements); read-only technical audit (`technical-audit.md`, ~09:59 AM CT); website-bot report; Webby inventory; verified handoff reconciliation; I AM REEL bot acknowledgement of sole ownership (~10:06 AM CT); Roses production inventory; Jeeves Dropbox inventory; Local Files Windows inventory (bounded). Restricted inventories stay off this public file — safe pointers only.

---

## 1. Project overview

| Field | Value |
|--------|--------|
| Official business / platform name | **I AM REEL** |
| Incorrect name (do not use) | ~~I AM real REEL~~ — corrected in bot naming and communications. Do **not** rename repositories, domains, or live resources without founder approval after confirming consequences. |
| Official website | https://iamreel.app |
| GitHub repository | https://github.com/Amythist144/Iamreel (public) |
| Founder | Vision, business decisions, expenditure approval, final product approval |
| Central coordinator | Central GrokBot — project management, documentation, handoffs; not a replacement for specialized bots |

**Goal:** One organized business with one clear project-management system.

---

## 2. Launch deadline

| Item | Status |
|------|--------|
| Meeting / sell-start target | **Friday, November 13, 2026** |
| Priority | Present and begin selling personalized products. Deadline takes priority over nonessential website improvements. |
| Full automation | **Not required** to begin selling |
| Untested automation | Must **not** be represented as working |

---

## 3. Product readiness

All products sold through I AM REEL **must** be personalized using the customer photograph. **No** generic products or standalone audio-only meditations.

### 3.1 Violet Flame Meditation — **CRITICAL RISK for Nov 13**

| Aspect | Detail |
|--------|--------|
| Owner | Roses (production); Cursor for coding via ready-to-paste instructions when needed |
| Spec (approved requirement) | Vertical **9:16**; **10 min** = **12 s × 50**; gold robe; amethyst cave; connected violet flames thigh→above head rise/fall; gentle visible breathing; natural skin; recognizable face; fire/breath sounds only (no narration/music/chanting) |
| Approved master image | **NOT located / NOT verified-approved** in searched inventories (Roses, Dropbox bounded search, Windows bounded inventory) |
| Website still candidate | Repo asset `assets/inner-vision-violet-fire.png` — **unapproved candidate** only; do not treat as master |
| Existing clips | Local/cloud candidates include ~25–30 s clips, wrong/unproven aspect for locked 9:16 product template; **no** established approved 12 s loop or 10-minute assembly |
| Runway experiments | **User-reported** historically; Runway account **not inspected**; filename “runway” hits ≠ proven RunwayML provenance |
| Descriptions / prices | Founder-approved launch prices **not set**. Site listings (see §4) are **not** approved launch prices |
| Production readiness | **Not ready** — do **not** substitute a generic clip or call this product ready |
| New generations | **Not authorized** without founder approval |

### 3.2 Ascended Master Portrait — **partial / portrait-first manual pilot**

| Aspect | Detail |
|--------|--------|
| Owner | Roses |
| Requirement | Personalized spiritual portrait from customer photo; preserve recognizable identity; repeatable process |
| Process | Manual repeatable process recovered (intake → colors → generate → deliver in chat). Restricted process/manifest lives in Roses inventory folder — **safe pointer only** in public docs |
| Approval evidence | Green-gold prototype: user feedback **“Great job!”** on **Oct 28, 2026** (America/Chicago) — treated as verified-approved **prototype style**, not general production/SLA approval. Pink-gold delivery: **no** explicit later approval found |
| Scale tested | Two subjects/styles only |
| Unit costs / time / SLA | **Unmeasured** — do not invent |
| Commercial fulfillment test | **None** |
| Site listing price | Historical/site listing (e.g. Portrait $14.99) = **not** approved launch price |
| Nov 13 posture | Best candidate for a **manual pilot** if founder approves price, intake, payment alternative, and delivery SOP |

### 3.3 Third personalized product

| Aspect | Detail |
|--------|--------|
| Definition | **Undefined** — **no work** until founder approves definition |
| Status | **Blocked** |

---

## 4. Website, Vision Guide, payments, backend

**Active owner:** **I AM REEL bot** — sole active website/backend ownership acknowledged **Nov 6, 2026 ~10:06 AM America/Chicago** (all eight handoff acknowledgement points). **Responsibility handoff COMPLETE.** Unfinished features remain unfinished. **Webby** = historical reference only; preserved; no new I AM REEL development. Do **not** modify static Enlightening Vibrations.

| Area | Status (evidence) |
|------|-------------------|
| Live site | https://iamreel.app → **HTTP 200**, hosted on **Vercel** (technical audit Nov 6, 2026) |
| Deploy | Auto-deploy from GitHub **main**; production commit `fc1a002a7b66a8653bdd877eb803c26f5f04bc1c` |
| Vercel | Project `iamreel`, team slug `i-am-reel`; connected user billing **Hobby**; team plan not separately exposed — do not overstate a distinct team free plan |
| Dashboard | https://vercel.com/i-am-reel/iamreel — sign-in https://vercel.com/login |
| `iamreel.vercel.app` | **200** — do **not** blanket-claim every `*.vercel.app` blocked |
| Other deployment aliases | Some **302 → Vercel SSO** (expected for non-custom-domain aliases) |
| GitHub Pages overlap | Still enabled with CNAME `iamreel.app`; live traffic is Vercel — do not disable without approval |
| Vision Guide | UI + `api/guide.js` present; account/cloud-save not fully E2E verified; **retain** original dreams/browser data |
| Supabase | Project “I AM REEL Vision Guide” ref `jtlqvxcmbgqtcpdhldbm`; **ACTIVE_HEALTHY**; org **free** |
| `generate-wallpaper` | In repo; live **404** (not deployed) |
| Catalog | Site listings vs DB rows **differ**; missing product rows for some codes; launch SKUs not modeled as dedicated aligned products |
| Site-listed prices (listings only, **NOT** approved launch prices) | Portrait $14.99; Trio $29; Board $39; MeditationVideo $49; Reel $199 |
| PayPal / entitlements | **No verified** checkout/capture/webhook/paid entitlement. Preview flags ≠ authorization. Absence of PayPal keys on Vercel **does not prove** absence of secrets in Supabase (secrets **not inspected**) |
| Photo upload / fulfillment | **Unverified** E2E; orders/production tables empty in audit |
| `teaser_sessions` RLS | RLS enabled with **no policies** = **default-deny** (not proof of a public data leak) |
| Leaked-password protection advisor | Noted in audit — **do not enable / do not spend** on paid Supabase upgrades without founder approval |

**Do not commit to GitHub:** credentials, customer data, `docs/I-AM-REEL-Grok-Implementation-Memory.md`, backups, `_shots/`, `PAGES.md`, private inventories with personal paths.

---

## 5. Automation / production engine

| Area | Owner | Status |
|------|--------|--------|
| Product specs, templates, QC | Roses | Portrait process partial; Violet master missing; costs unknown |
| Coding when needed | Cursor Free via one ready-to-paste instruction | As needed |
| Paid APIs / subscriptions | Forbidden without founder approval | No spend authorized |

---

## 6. Current assignments by bot

| Bot | Role | Status |
|-----|------|--------|
| Central GrokBot | Chief coordinator | Master docs + launch tracking |
| I AM REEL | Website / backend / Vision Guide / PayPal / Supabase / hosting | **Active sole owner** (handoff complete Nov 6, 2026 ~10:06 AM CT) |
| Webby | Historical website reference | Preserved; **no** new I AM REEL development |
| Roses | Personalized production | Portrait-first pilot planning; Violet search continue; no new gens without approval |
| Local Files | Windows organization | Bounded inventory received; Windows search for approved Violet still open as needed |
| Jeeves | Dropbox organization | Bounded inventory received; no I AM REEL canonical root found in searched coverage |
| Cursor | Coding implementation | Not daily-managed |

**Policy:** Do not create additional bots without founder approval.

---

## 7. Completed (this coordination pass)

- Name correction direction: use **I AM REEL**
- Read-only technical audit complete
- Webby inventory received; verified handoff reconciliation prepared; **I AM REEL bot acknowledgement → responsibility handoff COMPLETE**
- Roses, Jeeves, Local Files inventories received (restricted details stay private)
- These five master Markdown documents prepared for documentation-only PR

---

## 8. Work in progress / blocked

| Item | Status |
|------|--------|
| Violet Flame sellable path | **Blocked** — approved master not located; no approved 12 s / 10 min pipeline |
| Portrait Nov 13 pilot | **Partial** — needs founder price, intake, payment/delivery SOP, dry-run |
| Third product | **Blocked** on definition |
| Automated PayPal | **Blocked** until sandbox E2E approved and proven |
| Catalog alignment to launch SKUs | Open |
| Docs publication | Documentation-only PR (this change set) — **no merge** without separate approval |
| Asset moves / Dropbox or Windows reorganization | **Proposal only** — not authorized |

---

## 9. Decisions awaiting founder approval

1. **Definition of the third personalized product** (essential)
2. **Launch prices** for sellable SKUs (do not use site listings as approval)
3. **Portrait-first manual/semi-auto fulfillment** for Nov 13 (proposal only until approved + full dry-run)
4. Any **paid API / subscription / Supabase paid feature**
5. DNS / Pages disable / deploy / access changes
6. File moves after folder proposals
7. Merge of this documentation PR (explicitly **not** approved yet — open PR only)
8. Any new image/video generations

---

## 10. Important locations (public-safe)

| Location | Purpose |
|----------|---------|
| https://github.com/Amythist144/Iamreel | Code + (after merge) project docs |
| https://iamreel.app | Live site |
| https://vercel.com/i-am-reel/iamreel | Hosting dashboard |
| Restricted inventories (private; not in GitHub) | Webby handoff inventory; technical audit; verified-handoff; Roses production inventory; Dropbox inventory; Windows inventory CSV — ask Central for access |

Local reference paths (box; not all for publish): repo mirrors, Vision Guide workbench, icon original, early prototype folder — see handoff notes via Central.

---

## 11. Seven-day plan (Nov 6–12) + Nov 13 gate — **portrait-first**

Times in **America/Chicago**.

| Day | Date | Focus |
|-----|------|--------|
| Thu | Nov 6 | Freeze honest status in master docs; open docs-only PR; no disruptive changes; no new generations |
| Fri | Nov 7 | Portrait-first: founder confirms pilot SKU copy + **price**; document manual intake/payment/delivery SOP (I AM REEL + Roses); continue **approved Violet master** search (Windows/Dropbox) without creating new assets |
| Sat | Nov 8 | Dry-run portrait path once (photo → order record → produce → deliver) if payment alternative approved; log real time observed (do not invent SLA) |
| Sun | Nov 9 | Founder decision window: third product definition **or** explicitly sell two; Violet go/no-go for meeting demo |
| Mon | Nov 10 | If Violet still without approved master: meeting demo = portrait + honest Violet status; do **not** fake readiness |
| Tue | Nov 11 | End-to-end retest of whatever is claimed sellable; fix only blockers |
| Wed | Nov 12 | Freeze claims to tested reality; pack demos |
| Thu | **Nov 13** | **Demo/selling gate:** sell only products with approved description/price + verified intake→payment→production→delivery test; disclose manual steps |

**Gate rule:** Prefer genuinely sellable (even semi-manual) over unfinished automation theater. Violet remains **critical risk** until an approved master and loop pipeline exist.

---

## 12. Development workflow

1. Identify requirement → 2. Assign bot → 3. Confirm status → 4. Plan → 5. Dependencies/costs → 6. Approve when needed → 7. Implement/test → 8. Record → 9. Update this file → 10. Report next action.

Separate branches for substantial work; one file owner per workstream; preserve existing code/docs; protect customer data.

---

*End of PROJECT_STATUS.md — Nov 6, 2026 (America/Chicago).*
