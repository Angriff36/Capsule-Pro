# IMPLEMENTATION_PLAN.md — v89

> Updated 2026-05-14
> Synthesized from v89 multi-agent verification correcting v88 metric errors.
> All 22 P0 items resolved (v65-v72). Test suite repair complete (v77-v80).
> v0.12.2 tag created with RLS fixes and console statements audit baseline.
> **v89 KEY CORRECTIONS:** Console statements total 864 (v88 overcounted by 214; info=4 not 70). Pastel backgrounds 210 (v88 undercounted by 93). Hardcoded /api/ paths 705 (+85). RLS 86/218=39.4% (+4/+4). tenant_facilities 5/5=100% (v88 said 2/6=33.3%). NEW tenant_facility (singular) schema 0/4=0% RLS. Kitchen 149 routes (+1). Events 90 routes (+3). Unlisted domains 20/83 routes (v88 said 22/96). Inventory 5/58 manifest commands (v88 said 0). NEW P0.6: 8 frontend 404s. NEW P0.7: OAuth plaintext. NEW P2.Z: security gaps (auth 78.6%, rate-limit 3.8%). NEW P2.AA: 176/632 orphan routes. P0.1 NOW REMOVABLE (all apps pass tsc --noEmit). P0.2 CI gap: no prisma generate before typecheck. P0.4 CI step mislabeled, no Biome lint, 2 package script mismatches.

---

## P0 — Critical Infrastructure

These items block production safety or allow regressions to ship undetected.

### P0.1 — Remove `ignoreBuildErrors` [NOW REMOVABLE]

**Status:** All 3 apps pass `tsc --noEmit` with ZERO errors. Flag is not masking any type errors. Safe to remove.

- `apps/app/next.config.ts:17` — `ignoreBuildErrors: true`
- `apps/api/next.config.ts:102` — `ignoreBuildErrors: true`
- `apps/web/next.config.ts:196` — `ignoreBuildErrors: true`
- `skipLibCheck: true` in 8 tsconfig files

**Steps:**
1. Remove `ignoreBuildErrors` from all three `next.config.ts` files
2. Verify `next build` succeeds (currently fails on missing RESEND_FROM/RESEND_TOKEN env vars, not TS)
3. Monitor next Vercel deployment for parenthesized route group lstat issue

### P0.2 — Add Prisma Generate + db:check to CI [NOT STARTED]

**Status:** ci.yml has NO `prisma generate` before typecheck step — latent ordering bug (typecheck runs before build's implicit generate). `scripts/db-drift-check.mjs` confirmed unconditional no-op. No `prisma migrate status` or `prisma validate` in CI.

**Steps:**
1. Add `pnpm prisma:check` before typecheck step in main CI job
2. Replace `scripts/db-drift-check.mjs` no-op with real validation
3. Make both HARD gates (no `continue-on-error`)

**Files:** `.github/workflows/ci.yml`, `scripts/db-drift-check.mjs`

### P0.3 — Manifest Route Enforcement [RESOLVED — DO NOT REOPEN]

**Status:** `manifest-ci.yml` IS a hard gate. POST route gap is now **ZERO**. 209 filesystem POST routes: 66 matched by manifest IR, 143 matched by allowlist. Only 1 total write handler (DELETE /api/inventory/audit/reports/[id]) uncovered across all methods.

~Moved to Resolved section.~

### P0.4 — Extend TypeScript Typecheck to Packages + Fix CI Step Label [NOT STARTED]

**Status:** CI typecheck step labeled "Run linting" but actually runs typecheck. Only covers 3 apps. 28 packages have typecheck scripts but none run in CI. `event-parser` has `"type-check"` instead of `"typecheck"` (naming mismatch). `sales-reporting` has no typecheck script. No Biome/Ultracite lint step in CI.

**Steps:**
1. Rename step from "Run linting" to "Run typecheck"
2. Add `pnpm turbo typecheck` (no filter) to CI
3. Fix 2 package script naming mismatches
4. Add `pnpm lint` step for Biome

**Files:** `.github/workflows/ci.yml`, `packages/event-parser/package.json`, `packages/sales-reporting/package.json`

### P0.5 — [RESERVED — DO NOT REOPEN]
~Was @repo/observability zero-import claim — RESOLVED v85~

### P0.6 — Frontend Calls to Non-Existent API Routes [NEW — NOT STARTED]

**Status:** 8 frontend calls will cause runtime 404s:

- 3 alertsconfig commands (create, update, remove) — `settings/alerts/alerts-client.tsx`
- 2 cateringorder commands (create, cancel) — `events/catering/catering-client.tsx` (commands live at `events/catering-orders/commands/`)
- 2 variancereport commands (approve, review) — `inventory/variance-reports/variance-reports-client.tsx`
- 1 menus command (create) — no `/api/menus/` exists

**Steps:**
1. Fix frontend paths to match actual API route locations
2. Create missing `/api/menus/` route or remove dead frontend call

### P0.7 — Calendar OAuth Tokens Stored Plaintext [NEW — NOT STARTED]

**Status:** `ProviderSync` model stores `accessToken`/`refreshToken` as plaintext `String @db.Text`. Zero encryption. Calendar sync callbacks write tokens directly from provider response. **HIGH severity** — if DB is compromised, all connected calendar tokens are immediately usable.

**Steps:**
1. Implement token encryption at rest (application-level encryption before DB write)
2. Migrate existing plaintext tokens to encrypted storage
3. Add decryption layer in calendar sync read path

**Files:** `packages/database/prisma/schema.prisma`, calendar sync routes

---

## P1 — High Priority

### P1.A — Payroll Runtime Bugs [NOT STARTED]

**Status:** Multiple runtime-level bugs prevent correct payroll operation.

- **CRITICAL:** `tenant_payroll` schema crash CONFIRMED — `tax/list/route.ts` references nonexistent schema
- **CRITICAL:** Federal bracket inconsistency — 3 files with 2 different value sets:
  - `taxEngine.ts`: 11,725 / 47,525 / 101,175 / 193,250 / 245,650 / 609,300
  - `brackets/route.ts` + `list/route.ts`: 11,600 / 47,150 / 100,525 / 191,950 / 243,725 / 609,350
- Prisma models exist in correct `tenant_staff` schema (NOT "wrong schema context")
- State coverage: 8/50 (5 with tax logic + 3 zero-tax states)
- No pay stub generation — CONFIRMED
- No W-4/withholding form management — CONFIRMED
- No spec at `specs/payroll.md` — CONFIRMED

### P1.B — CRM Pipeline Persistence Broken [NOT STARTED]

**Status:** Deal model DOES NOT EXIST — CONFIRMED. Deals are virtual view over Proposals with derived stages. No PUT/PATCH for pipeline stage changes — drag-and-drop cannot persist. 41 route files. No spec at `specs/crm.md`.

### P1.C — Console Statement Cleanup [CORRECTED — 864 TOTAL]

**Status:** v89 CORRECTION: **864 console statements** (NOT 1,078 — v88 overcounted by 214).

**Breakdown (v89 verified):**
- 527 `console.error` (NOT 555)
- 304 `console.log` (NOT 420)
- 30 `console.warn` (NOT 33)
- 4 `console.info` (NOT 70 — v88 MAJOR overcount)
- 1 `console.debug` (unchanged)

**@repo/observability:** 390 file imports. The replacement path IS wired.

**Priority:** Replace `console.error` first (527), then `console.log` (304).

### P1.D — Design System: Pastel Backgrounds + Bare Card [CORRECTED]

**Status:** Bare Card 279 (unchanged). Pastel backgrounds **210** (v88 said 117 — undercounted by 93).

- Bare `<Card>` without tone: **279**
- Pastel background violations: **210** (v88 said 117)
- shadow-* violations: **39 total** (37 standard + 2 non-standard naming patterns)
- BlogFilterChip: 39 imports, ResearchTable: 23 imports, StatusPill: 67 imports

### P1.E — TypeScript Strictness [CORRECTED]

**Status:** v89 CORRECTION: `:any` types in apps is **14** (NOT 18 — 4 were in packages/). New full-scope metric: **98 `:any` types across apps+packages**.
- `:any` types (apps): **14** (NOT 18)
- `:any` types (apps+packages): **98** (NEW metric)
- `@ts-ignore`: **0** (clean)
- `@ts-expect-error` (apps): **2** (5 others in packages/)
- `@ts-expect-error` (apps+packages): **7** (unchanged)
- TODO in production: **7**, FIXME: **0**, HACK: **0**

### P1.F — Accounting: Financial Reports Expenses Hardcoded to Zero [CONFIRMED]

**Status:** `.reduce(() => 0, 0)` at `financial-reports/route.ts:258-262` CONFIRMED STILL PRESENT. Journal entries/general ledger MISSING ENTIRELY. Bank reconciliation FULLY SIMULATED (no Prisma model, fake data via modular arithmetic). Accounts receivable handled implicitly through invoices/payments. No spec.

### P1.G — Inventory Route Manifest Gap [CORRECTED]

**Status:** v89 CORRECTION: Inventory has **58 routes, 5 manifest commands** (9% — NOT 0% as v88 claimed). Transfer lifecycle incomplete — only list route exists. **28/58 routes (48%) have NO frontend consumer.** No spec.

### P1.H — Hardcoded API Paths [CORRECTED — 705]

**Status:** v89 CORRECTION: **705 hardcoded `/api/` paths** (NOT 620 — growing, +85 since v88).

---

## P2 — Medium Priority

### P2.A — Calendar (8 routes)

- [x] Drag-and-drop (dnd-kit), ResearchTable, BlogFilterChip — DONE
- [ ] OAuth tokens PLAINTEXT — escalated to P0.7
- [ ] 0 manifest commands, no optimistic concurrency control (FR-502)
- [ ] No mobile responsive layout for drag-and-drop, no E2E tests for reschedule

### P2.B — Accounting (17 routes)

- [x] Invoicing, payments, revenue recognition, collections
- [ ] Financial reports expenses HARDCODED TO ZERO (P1.F)
- [ ] Journal entries / general ledger: MISSING. Bank reconciliation: SIMULATED

### P2.C — Contracts (1 top-level route + public signing)

- [x] 8 EventContract commands, 10 VendorContract commands, public signing surface
- [ ] Public signing uses direct DB writes (FR-504), returns 400 not 409 for duplicates
- [ ] No rate limiting on unauthenticated public signing endpoint

### P2.D — Events (90 routes — v89 CORRECTION)

**v89 CORRECTION:** Events has **90 routes** (v88 said 87). Spec EXISTS at `specs/events/SPEC.md`.

- [ ] `Event.importWorkflowId` STILL MISSING from schema
- [ ] `EventImportWorkflow` model PARTIALLY exists (EventImport lacks 6-stage columns)
- [ ] Import code at `documents/parse/route.ts:936-979` STILL COMMENTED OUT
- [ ] 6-stage workflow ~50% (16 manifest commands, flat Prisma model)
- [ ] Battle board ~35% (model exists, no vote/nominate/finalize endpoints)
- [ ] AI confidence field STILL MISSING from EventSummary
- [ ] Event model missing back-relations to EventSummary, EventGuest, EventStaffAssignment, EventImport
- [ ] Legacy Header: 14/28 pages
- [ ] **NEW: 65/90 routes outside manifest IR (72%)**

### P2.E — Kitchen (149 routes — v89 CORRECTION)

**v89 CORRECTION:** Kitchen has **149 routes** (v88 said 148). Manifest coverage **25.5%** (38/149 — NOT 14.2%).

- [ ] **12 singular/plural duplicate pairs** (22 routes should be deleted)
- [ ] 46 orphan routes (no frontend consumer)
- [ ] 2 zero-UUID placeholders in import route
- [ ] Server actions bypass API layer with raw SQL
- [ ] No spec

### P2.F — Logistics (5 routes, 0 manifest commands, GPS SIMULATED)
### P2.G — Staffing (2 routes, 5 queryRawUnsafe — all parameterized, cosmetic only)
### P2.H — Staff (35 routes — scheduling domain)
### P2.I — Settings (10 routes, fully implemented)
### P2.J — Analytics (5 routes, revenue computed 4 different ways)
### P2.K — Marketing (1 route, minimal)
### P2.L — Command Board (22 routes, shell 3/3, AI Chat/Simulation UI NOT IMPLEMENTED)
### P2.M — Knowledge Base (3 routes, read-only)
### P2.N — Integrations (25 routes: GoodShuffle 10, Nowsta 6, QuickBooks 1, Webhooks 9)
### P2.O — Training (7 routes)
### P2.P — Search [RESOLVED — DO NOT REOPEN]
### P2.Q — Procurement (24 routes, requisitions 8/8 complete, vendor-contracts 10/10 complete)
### P2.R — Timecards (10 routes)
### P2.S — Documents (1 route)
### P2.T — Catering (1 route, list only)
### P2.U — Warehouse (2 routes, GET-only)
### P2.V — Communications/Collaboration Fragmentation (zero manifest commands)
### P2.W — Frontend Module Design System (13/15 at 3/3; Kitchen 2/3)

### P2.X — Unlisted Domains (20 domains, 83 routes — v89 CORRECTION)

**v89 CORRECTION:** **20 domains with 83 routes** (v88 said 22/96). Need individual assessment.

### P2.Y — Payroll (24 routes — runtime bugs at P1.A)

### P2.Z — Security Coverage Gaps [NEW]

- **Auth coverage:** 78.6% (497/632 routes call `auth()`) — 135 routes lack auth
- **Rate limiting:** 3.8% (24/632 routes) — 608 routes unprotected
- **tenant_facility (singular):** 4 tables with 0% RLS (facility_spaces, facility_bookings, utility_meters, utility_readings)
- **`$queryRawUnsafe`:** 5 calls in `staffing/coverage/route.ts` — potential SQL injection if user input interpolated
- **Public contract signing:** no rate limiting on unauthenticated endpoint

### P2.AA — Orphan Route Cleanup [NEW]

- **176/632 API routes (28%)** have no frontend consumer
- Kitchen: 66 orphans (45%), Inventory: 26 (45%), Collaboration: 8 (47%), Administrative: 7 (54%), Communications: 5 (71%)
- 20 unlisted domains with 83 routes need individual assessment

---

## P3 — Lower Priority

### P3.A — Dead Package Cleanup

**Dead (zero consumers):** packages/storage, packages/ai, packages/brand, packages/kitchen-state-transitions (282 LOC), packages/apps/app (dead shell), packages/mcp-server (standalone).

### P3.B — Spec Authoring

| Domain | Routes | Priority | Notes |
|--------|--------|----------|-------|
| Kitchen | 149 | CRITICAL | Largest, no spec |
| Events | 90 | CRITICAL | Spec EXISTS at specs/events/SPEC.md |
| Inventory | 58 | HIGH | No spec |
| CRM | 41 | HIGH | Pipeline broken |
| Payroll | 24 | HIGH | Runtime bugs |
| Procurement | 24 | MEDIUM | No spec |
| Accounting | 17 | MEDIUM | Expenses hardcoded to zero |
| Logistics | 5 | HIGH | GPS simulated |
| Analytics | 5 | HIGH | Revenue computed 4 ways |

### P3.C — Cron HTTP Method Inconsistency

8 cron jobs in vercel.json; 4 use GET for mutating operations (should be POST): webhook-retry, inventory-audit, idempotency-cleanup, integration-auto-sync.

### P3.D — Route Architecture

- **632 total API route files**, 86 active manifests, 6 disabled
- **40 manifest runtime commands**, `routes.manifest.json`: 849 routes (589 POST + 260 GET)
- **POST route gap: 0** (RESOLVED). Only 1 uncovered: DELETE /api/inventory/audit/reports/[id]
- Manifest wiring: User BROKEN_RAW_SQL, ShipmentItem BROKEN_PRISMA_READ

### P3.E — AGENTS.md Corrections Needed

1. Console count ~932 — actual **864** (v89)
2. RLS implied all tables — actual **86/218=39.4%** (v89)
3. Cron registry says 6 — actual 8
4. Inventory says 24 routes — actual **58**
5. Events not listed — actual **90 routes**
6. Staff vs Staffing not clarified (staff=35, staffing=2)

---

## Code Quality Metrics

| Metric | v88 Count | v89 Count | Change | Notes |
|--------|-----------|-----------|--------|-------|
| `console.*` statements | 1,078 | **864** | -214 | v88 overcounted |
| console.error | 555 | **527** | -28 | |
| console.log | 420 | **304** | -116 | |
| console.warn | 33 | **30** | -3 | |
| console.info | 70 | **4** | -66 | v88 MAJOR overcount |
| console.debug | 1 | **1** | — | |
| `:any` types (apps) | 18 | **14** | -4 | 4 were in packages/ |
| `:any` types (apps+pkgs) | — | **98** | NEW | Full-scope metric |
| `@ts-ignore` | 0 | **0** | — | CLEAN |
| `@ts-expect-error` (apps) | 7 | **2** | -5 | 5 others in packages/ |
| `@ts-expect-error` (all) | 7 | **7** | — | |
| Bare `<Card>` | 279 | **279** | — | STABLE |
| Pastel backgrounds | 117 | **210** | +93 | v88 MAJOR undercount |
| Hardcoded `/api/` paths | 620 | **705** | +85 | Growing |
| shadow-* violations | 37 | **39** | +2 | 37 std + 2 non-standard |
| Auth coverage | — | **78.6%** | NEW | 497/632 routes |
| Rate limit coverage | — | **3.8%** | NEW | 24/632 routes |
| Orphan routes | — | **176/632** | NEW | 28% no frontend consumer |

---

## RLS Coverage (86/218 = 39.4%)

**v89 CORRECTION:** v88 reported 82/214=38.3%. Actual: **86/218=39.4%** — +4 RLS policies, +4 tables discovered.

| Schema | Tables | RLS | Coverage | v88 Delta |
|--------|--------|-----|----------|-----------|
| tenant_facilities | 5 | 5 | 100% | v88 said 2/6=33.3% — CORRECTED |
| tenant_logistics | 4 | 4 | 100% | VERIFIED |
| tenant_accounting | 11 | 10 | 90.9% | +1 table, unchanged RLS |
| tenant_crm | 8 | 6 | 75.0% | Table count corrected |
| tenant_inventory | 33 | 18 | 54.5% | Table count corrected |
| tenant_staff | 37 | 16 | 43.2% | Table count corrected |
| tenant_admin | 36 | 8 | 22.2% | Table count corrected |
| tenant_events | 29 | 7 | 24.1% | Table count corrected |
| tenant_kitchen | 43 | 11 | 25.6% | Table count corrected |
| tenant_facility (singular) | 4 | 0 | 0% | NEW schema, 0% RLS |
| tenant (core) | 8 | 1 | 12.5% | VERIFIED |
| **TOTAL** | **218** | **86** | **39.4%** | +4/+4 from v88 |

**Gaps:** tenant_kitchen (32 unprotected), tenant_admin (28 unprotected), tenant_events (22 unprotected), tenant_facility singular (4 unprotected).

---

## Security Summary

- **5 `queryRawUnsafe` calls** in 1 file (staffing/coverage) — potential SQL injection risk if user input interpolated
- **Calendar OAuth tokens PLAINTEXT** in ProviderSync — HIGH severity (P0.7)
- **Contracts public signing:** no rate limiting on unauthenticated endpoint
- **Auth coverage:** 78.6% (497/632 routes call `auth()`) — 135 routes lack auth
- **Rate limiting:** 3.8% (24/632 routes have rate limiting) — 608 unprotected
- **RLS:** 86/218=39.4% — tenant_kitchen (32), tenant_admin (28), tenant_events (22), tenant_facility singular (4) unprotected
- **POST route gap: 0** (RESOLVED)
- **tenant_facility (singular):** 4 tables with 0% RLS

---

## Resolved / Do Not Reopen

These items have been verified as resolved by multiple audit passes. Do not re-investigate without new evidence.

### P0 Bugs (All 22 Resolved v65-v72)
- All critical bugs across payroll, scheduling, security, marketing, procurement, events, knowledge base, event intake, settings, logistics, CRM
- See `docs/implementation-history/` for pass details

### P0.3 Manifest POST Route Gap (RESOLVED v88)
- 242 unregistered POST routes reduced to ZERO
- 209 filesystem POST routes: 66 matched by manifest IR, 143 matched by allowlist
- Only 1 write handler uncovered across all methods (DELETE /api/inventory/audit/reports/[id])
- manifest-ci.yml IS a hard gate — enforcement framework fully operational

### AllergenWarning Manifest Wiring (RESOLVED v88)
- Now present in ENTITIES_WITH_SPECIFIC_STORES (line 194 of manifest-runtime-factory.ts)
- Has full AllergenWarningPrismaStore class

### @repo/observability Zero-Import Claim (RESOLVED v85)
- v84 P0.5 claimed zero imports — WRONG. v88 found 390 file imports.
- The console replacement path IS wired.

### RLS Coverage (Partially Resolved 2026-05-14)
- v83: "all tables have RLS" — INCORRECT
- v84/v85: 97/113=85.8% — INCORRECT
- v86: 86/221=38.9% — INCORRECT
- v87: 97/221=43.8% — INCORRECT (duplicate counts, wrong totals)
- v88: 82/214=38.3% — CORRECTED
- **v89: 86/218=39.4%**
- `20260514000000_add_rls_tenant_accounting` added RLS to all tenant_accounting tables

### Scheduling API (RESOLVED — DO NOT REOPEN)
- Scheduling is fully implemented under `apps/api/app/api/staff/` with 35 routes

### Test Suite (RESOLVED v77-v80)
- 241 test files (139 API + 41 app + 61 E2E), 47 skips, 0 failing
- v88 verified: 6 API skips + 41 E2E skips, 0 test.todo, 0 .only

### Payroll Period ID (RESOLVED 2026-05-14)
### Search FR-107 + Entity Coverage + Multi-word (RESOLVED 2026-05-14)
### Calendar Features (RESOLVED — DO NOT REOPEN)
### Bare Table Violations (RESOLVED v84)

### v88 False Claims (RESOLVED as FALSE — DO NOT REOPEN)
- Console 1,078 — FALSE (actual: 864; v88 overcounted by 214)
- Console info=70 — FALSE (actual: 4; v88 MAJOR overcount)
- Pastel backgrounds 117 — FALSE (actual: 210; v88 undercounted by 93)
- Hardcoded /api/ 620 — FALSE (actual: 705; growing)
- RLS 82/214=38.3% — FALSE (actual: 86/218=39.4%)
- tenant_facilities 2/6=33.3% — FALSE (actual: 5/5=100%)
- Events 87 routes — FALSE (actual: 90)
- Kitchen 148 routes — FALSE (actual: 149)
- Inventory 0 manifest commands — FALSE (actual: 5, 9%)
- :any types 18 (apps) — FALSE (actual: 14; 4 were in packages/)
- @ts-expect-error 7 (apps) — FALSE (actual: 2; 5 in packages/)
- shadow-* 37 — FALSE (actual: 39; 2 non-standard naming)
- Unlisted domains 22/96 — FALSE (actual: 20/83)

### v87 False Claims (RESOLVED as FALSE — DO NOT REOPEN)
- Console 891 — FALSE (actual: 864; v87 also had debug/log and warn/info SWAPPED)
- Hardcoded /api/ 331 — FALSE (actual: 705)
- RLS 97/221=43.8% — FALSE (actual: 86/218=39.4%)
- Inventory 24 routes — FALSE (actual: 58)
- Events "8 routes" — FALSE (actual: 90)
- Procurement 58 routes — FALSE (actual: 24; v87 included inventory)
- Documents 7 routes — FALSE (actual: 1)
- tenant_facilities 100% — FALSE (actual: 100% — v88 wrongly corrected to 33.3%)
- packages/ai ALIVE 12 imports — FALSE (DEAD, zero imports)
- packages/brand ALIVE 8 files — FALSE (DEAD, zero imports)
- packages/feature-flags "does not exist" — FALSE (exists with 11 imports)
- packages/sales-reporting 7 imports — FALSE (actual: 1)
- packages/auth OMITTED — FALSE (714 imports, 2nd heaviest)
- :any types 12 — FALSE (actual: 14 apps / 98 apps+pkgs)
- Pastel backgrounds 138 — FALSE (actual: 210)
- Test files 243 — FALSE (actual: 241)
- Test skips 42 — FALSE (actual: 47)
- API skips 5 — FALSE (actual: 6)
- E2E skips 37 — FALSE (actual: 41)
- Manifest runtime 37 commands — FALSE (actual: 40)
- Integrations 23 routes — FALSE (actual: 25)
- Payroll 25 routes — FALSE (actual: 24)

### v86 False Claims (RESOLVED as FALSE — DO NOT REOPEN)
- queryRawUnsafe "60 across 9 files" — FALSE (actual: 5 in 1 file)
- Bare Card "~2,750" — FALSE (actual: 279)
- TODO "517" — FALSE (actual: 7)
- FIXME "22" / HACK "4" — FALSE (actual: 0/0)
- Timecards dual implementation — FALSE
- Total routes 632 — VERIFIED correct
- Command-board shell 2/3 — FALSE (actual: 3/3)
- Kitchen shell 1/3 — FALSE (actual: 2/3)
- CRM routes 47 — FALSE (actual: 41)
- Manifest CI "no enforcement" — FALSE
- Kitchen manifest commands 39 — FALSE (actual: 38 in v89)

### Packages Confirmed ALIVE (v88 — DO NOT REOPEN as dead)
- `packages/observability/` — 390 file imports
- `packages/types/` — 6 consumers
- `packages/analytics/` — 14 imports
- `packages/event-parser/` — 3 imports
- `packages/cms/` — 8 imports
- `packages/sales-reporting/` — 1 import
- `packages/feature-flags/` — 11 imports

### Packages Confirmed DEAD (v88 — DO NOT REOPEN as alive)
- `packages/ai/` — ZERO imports
- `packages/brand/` — ZERO imports

---

## Route Inventory (v89 Complete)

| Domain | Routes | Manifest | Spec | Notes |
|--------|--------|----------|------|-------|
| Kitchen | 149 | 38 (25.5%) | NONE | 12 duplicate pairs, 46 orphans |
| Events | 90 | — | EXISTS | 65/90 outside IR (72%) |
| Inventory | 58 | 5 (9%) | NONE | 28 orphans (48%) |
| CRM | 41 | — | NONE | Pipeline broken |
| Staff | 35 | — | — | Scheduling domain |
| Logistics | 5 | 0 | NONE | GPS simulated |
| Procurement | 24 | 8+10 | NONE | Requisitions + vendor-contracts complete |
| Payroll | 24 | — | NONE | Runtime bugs |
| Integrations | 25 | — | — | GoodShuffle/Nowsta/QB/Webhooks |
| Command-board | 22 | 10 writes | — | Shell 3/3 |
| Accounting | 17 | 21 refs | NONE | Expenses hardcoded to zero |
| Staffing | 2 | — | — | 5 queryRawUnsafe (parameterized) |
| Settings | 10 | — | — | Fully implemented |
| Calendar | 8 | 0 | — | OAuth plaintext (P0.7) |
| Marketing | 1 | — | — | Minimal |
| Documents | 1 | — | — | |
| +20 other domains | 83 | — | — | Not individually tracked |
| **Total** | **632** | **40** | | |

---

## Verification Commands (v89)

```bash
# P0.1: ignoreBuildErrors (NOW REMOVABLE)
grep -rn 'ignoreBuildErrors' --include='*.ts' apps/*/next.config.ts
# Expected: 3 matches — safe to remove

# P0.6: Frontend 404s
grep -rn 'alertsconfig' apps/app/app --include='*.tsx' | head -5
grep -rn 'cateringorder' apps/app/app --include='*.tsx' | head -5

# Metrics
grep -rn 'console\.' --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules --exclude-dir=.next | wc -l
# Expected: ~864

# RLS
grep -r 'ENABLE ROW LEVEL SECURITY' packages/database/prisma/migrations/ --include='*.sql' | sort -u | wc -l
# Expected: 86

# Design system
grep -rn 'bg-blue-50\|bg-green-50\|bg-red-50\|bg-yellow-50' apps/app/app --include='*.tsx' | wc -l
# Expected: ~210

# Hardcoded API paths
grep -rn '"/api/\|`/api/' --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules | wc -l
# Expected: ~705
```

---

## Archive Map

Completed pass write-ups and historical notes:
- `docs/implementation-history/` — pass logs, executive summaries
- `docs/implementation-history/v77-v80-test-suite-repair.md` — test suite repair (v77-v80)
- `docs/audits/` — numbered audit passes
- `docs/audits/v61-spec-comparison.md` — detailed spec gap analysis
- `docs/audits/ralph05-cleanup/` — cleanup audit notes

---

## Methodology

- **v89**: Multi-agent verification correcting v88 metric errors. Key corrections: console 864 (v88 overcounted by 214; info=4 not 70, log=304 not 420, error=527 not 555). Pastel backgrounds 210 (v88 undercounted by 93). Hardcoded /api/ 705 (+85). RLS 86/218=39.4% (+4/+4). tenant_facilities 5/5=100% (v88 wrongly said 2/6=33.3%). NEW tenant_facility (singular) schema 0/4=0%. Kitchen 149 routes (+1). Events 90 routes (+3). Inventory 5 manifest commands (v88 said 0). NEW P0.6: 8 frontend 404s. NEW P0.7: OAuth plaintext HIGH. NEW P2.Z: security gaps (auth 78.6%, rate-limit 3.8%, queryRawUnsafe risk). NEW P2.AA: 176/632 orphan routes (28%). P0.1 NOW REMOVABLE. :any 14 apps / 98 total. @ts-expect-error 2 apps / 7 total. Unlisted domains 20/83 (v88 said 22/96). Kitchen manifest 25.5% (v88 said 14.2%).
- **v88**: Parallel re-audit correcting v87 errors. Console 1,078 (v87 had debug/log SWAPPED). /api/ 620. RLS 82/214=38.3%. Inventory 58. Events 87. **MANY v88 FINDINGS PROVEN FALSE IN v89** — see Resolved section.
- **v87**: Parallel re-audit correcting v86 errors. **MANY v87 FINDINGS PROVEN FALSE** — see Resolved section.
- **v86-v81**: See prior versions. Multiple false claims corrected in later passes.
- **v77-v80**: Test suite repair. 678 -> 0 failing tests.
- **v65-v72**: All 22 P0 items resolved.
