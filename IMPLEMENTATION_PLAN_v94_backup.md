# IMPLEMENTATION_PLAN.md — v94

> Updated 2026-05-14
> Synthesized from v94 multi-agent audit (40+ parallel subagents).
> All 22 P0 items resolved (v65-v72). Test suite repair complete (v77-v80).
> v0.12.2 tag created with RLS fixes and console statements audit baseline.
> **v94 KEY CORRECTIONS OVER v93:** Console statements 1,330 (v93: 909 — fuller grep including scripts/). `:any` types ~62 (v93: 17 — word boundary was too strict). `@ts-expect-error` 6 in production (v93: 11 — stricter test exclusion). TODO 17-22 production (v93: 115 — v93 included test/spec files). Hardcoded /api/ paths 666 in apps/app/ (v93: 1,277 — v94 methodology more precise). RLS 88/223=39.5% unique tables (v93: 97/223=43.5% — 9 tables had RLS in multiple migrations). Manifest active .manifest files 86 (v93: 244 — v93 counted total files, not .manifest). Federal bracket copies 3 (v93: 2 — third copy confirmed in payroll/tax/list/route.ts). State tax 8/50 (v93: 9 — corrected to CA,NY,TX,FL,WA,PA,IL,OH). Dead packages 3 (v93: 4 — @repo/cms ALIVE with 11+ consumers). queryRawUnsafe 45 across 7 files (v93: 5 — staffing only). Test blocks 7,203 (v93: 6,982). Test files 325 (v93: 324). E2E spec files 69 (v93: 63). Exemption rules 248 (v93: ~167). /api/manifest/ calls ~84 (v93: 122). 9 missing rewrites with 18 affected frontend calls. 1 orphan rewrite (/api/workorder/). Payroll: tenant_payroll schema DOES NOT EXIST, EmployeeDeduction table name mismatch, division-by-zero risk. No Biome lint in CI. SKIP_ENV_VALIDATION=true in CI build. 28 raw fetch() calls bypass apiFetch. Vendor-contracts: 0 command route directories. 6 test files with zero assertions. 26 packages with zero tests. 8 cron jobs in vercel.json (AGENTS.md says 6).

---

## P0 — Critical Infrastructure

These items block production safety or allow regressions to ship undetected.

### P0.1 — Remove `ignoreBuildErrors` [NOT YET SAFE]

**Status:** CI typecheck is CURRENTLY FAILING — removing the flag would break production builds. Flag IS masking real type errors that must be fixed first.

- `apps/app/next.config.ts:195` — `ignoreBuildErrors: true`
- `apps/api/next.config.ts:102` — `ignoreBuildErrors: true`
- `apps/web/next.config.ts:17` — `ignoreBuildErrors: true`
- `skipLibCheck: true` in shared BASE CONFIG (`packages/typescript-config/base.json:16`) — inherited by ALL packages/apps
- 9 tsconfig files explicitly re-declare skipLibCheck
- `eslint.ignoreDuringBuilds: true` in `apps/app/next.config.ts`
- `strict: true` in base config — good, but overridden by above

**Verified metrics (v94):**
- `@ts-ignore`: **0** in production code
- `@ts-expect-error`: **6** in production code (v93: 11 — stricter test exclusion)
- `as any` casts: **139** in non-test production code (heaviest in manifest-runtime with 55+)
- `: any` type annotations: **~62** (v93: 17 — word boundary was too strict)
- `db-drift-check.mjs` is a COMPLETE NO-OP (prints message, exits 0)

**Steps:**
1. Fix all TypeScript errors that `ignoreBuildErrors` is masking
2. Remove `ignoreBuildErrors` from all three `next.config.ts` files
3. Remove `skipLibCheck: true` from base config + 9 explicit re-declarations
4. Remove `eslint.ignoreDuringBuilds: true` from apps/app
5. Verify `next build` succeeds with ZERO errors
6. Verify CI typecheck passes (`pnpm turbo typecheck`)

**Verification:**
```bash
grep -rn 'ignoreBuildErrors' --include='*.ts' apps/*/next.config.ts
# Expected after fix: 0 matches
pnpm turbo typecheck --filter=./apps/app --filter=./apps/api --filter=./apps/web
# Expected: exit 0
```

### P0.2 — Add Prisma Generate + db:check to CI [NOT STARTED]

**Status:** ci.yml has NO `prisma generate` before typecheck step. Postinstall hook is fragile (depends on DATABASE_URL env var logic). `scripts/db-drift-check.mjs` is a COMPLETE NO-OP. No `prisma validate` or `prisma migrate status` in CI.

**Steps:**
1. Add explicit `pnpm prisma generate` step before typecheck in main CI job
2. Add `pnpm db:check` after typecheck as hard gate
3. Replace `scripts/db-drift-check.mjs` no-op with real validation
4. Make all steps HARD gates (no `continue-on-error`)

**Files:** `.github/workflows/ci.yml`, `scripts/db-drift-check.mjs`

### P0.3 — Manifest Route Enforcement [RESOLVED — DO NOT REOPEN]

**Status:** `manifest-ci.yml` IS a hard gate with 6 parallel jobs. POST route gap is **ZERO**. 209 filesystem POST routes: 66 matched by manifest IR, 143 matched by allowlist. Only 1 total write handler (DELETE /api/inventory/audit/reports/[id]) uncovered across all methods.

### P0.4 — Extend TypeScript Typecheck to Packages + Fix CI Step Label [NOT STARTED]

**Status:** CI typecheck step labeled "Run linting" but runs `pnpm turbo typecheck` (MISLABELED). Only covers 3 of 8 apps (app, api, web). 29 packages have typecheck scripts but NONE run in CI. `event-parser` uses `"type-check"` not `"typecheck"`. 2 apps have no-op typecheck (email, studio: "exit 0"). 2 apps lack typecheck (docs, mobile). 6 packages lack typecheck scripts. **No Biome/Ultracite lint step in CI** — the step labeled "Run linting" actually runs typecheck. 2 custom checks (`check-hardcoded-routes`, `check-repo-ui-imports`) use `continue-on-error: true` (soft-gated, not hard gates). **SKIP_ENV_VALIDATION=true** in CI build step — env schema validation is completely bypassed in production builds.

**Steps:**
1. Rename step from "Run linting" to "Run typecheck"
2. Add `pnpm turbo typecheck` (no filter) to CI to cover all apps + packages
3. Fix `event-parser` script name (`"type-check"` -> `"typecheck"`)
4. Add typecheck scripts to missing packages (or explicitly exclude infrastructure packages)
5. Add `pnpm lint` step for Biome/Ultracite (currently MISSING from CI)
6. Remove `continue-on-error: true` from CI steps
7. Add `pnpm test` for packages (currently only app + api tested in CI)
8. Remove SKIP_ENV_VALIDATION=true from CI build or gate it behind a flag

**Files:** `.github/workflows/ci.yml`, `packages/event-parser/package.json`

### P0.5 — [RESERVED — DO NOT REOPEN]
~Was @repo/observability zero-import claim — RESOLVED v85~

### P0.6 — Frontend Calls to Non-Existent API Routes [v94 CORRECTION]

**Status:** ~84 frontend calls to `/api/manifest/` across ~45 files (v93: 122 — methodology corrected). 30 existing rewrites in next.config.ts. **9 missing rewrites** identified, plus **1 orphan rewrite** (/api/workorder/ has rewrite but no backend directory).

**Missing rewrites (v94 — 18 affected frontend calls):**
| Path | Calls | Severity |
|---|---|---|
| `/api/manifest/` | ~84 | **CRITICAL** |
| `/api/cateringorder/` | 4 | HIGH |
| `/api/alertsconfig/` | 4 | HIGH |
| `/api/warehouse/` | 2 | MEDIUM |
| `/api/variancereport/` | 3 | MEDIUM |
| `/api/marketing/` | 1 | LOW |
| `/api/contracts/` | 1 | LOW |
| `/api/smsautomationrule/` | 1 | LOW |
| `/api/lead/` | 1 | LOW |

**Orphan rewrite:** `/api/workorder/` — has rewrite but no backend directory.

**Steps:**
1. **CRITICAL:** Add `/api/manifest/` rewrite to next.config.ts (unblocks ~84 calls)
2. Add rewrites for remaining 8 paths
3. Remove orphan `/api/workorder/` rewrite or create matching backend
4. Fix frontend paths where backend routes exist at different paths
5. Verify all frontend `apiFetch()` calls resolve correctly

### P0.7 — Calendar OAuth Tokens Stored Plaintext [NOT STARTED]

**Status:** `ProviderSync` model stores `accessToken`/`refreshToken` as plaintext `String @db.Text`. 3 routes write tokens without encryption (Google callback, Outlook callback, connect endpoint). 2 routes read tokens back directly (trigger, disconnect). NO encryption utility exists anywhere in the codebase. `EmployeePin.pin_encrypted` field exists but NO actual encryption implementation found. Only crypto usage is `randomUUID()` and SHA-256 hashing.

**Steps:**
1. Implement token encryption at rest (application-level encryption before DB write)
2. Migrate existing plaintext tokens to encrypted storage
3. Add decryption layer in calendar sync read path

**Files:** `packages/database/prisma/schema.prisma`, calendar sync routes

---

## P1 — High Priority

### P1.A — Payroll Runtime Bugs [v94 ESCALATION]

**Status:** Multiple runtime-level bugs prevent correct payroll operation. Worse than previously documented.

**CRITICAL (will crash at runtime):**
- `tenant_payroll` schema **DOES NOT EXIST** — `tax/list/route.ts` queries `tenant_payroll.tax_configurations` and will crash
- `EmployeeDeduction` table name mismatch: Prisma expects PascalCase `"EmployeeDeduction"` but raw SQL queries `employee_deductions` (snake_case)

**Data integrity risks:**
- Division by zero when `hoursRegular=0` in PrismaPayrollDataSource
- Deductions JSON parsing type confusion: Prisma returns object, code casts to string then `JSON.parse()` — will double-parse or crash
- No YTD Social Security wage base tracking (over-withholding risk)

**Missing infrastructure:**
- No FUTA/SUTA unemployment tax calculations
- No W-2/1099 generation
- No pay stub generation — CONFIRMED
- W-4/withholding: Zod schema exists but NO API routes

**v94 CORRECTIONS:**
- Federal bracket inconsistency: **3 divergent copies** (v93 said 2) — `taxEngine.ts`, `payroll/tax/brackets/route.ts`, `payroll/tax/list/route.ts` — all have different bracket thresholds
- State coverage: **8/50 states** (v93 said 9) — CA, NY, TX, FL, WA, PA, IL, OH confirmed
- EmployeeTaxInfo IS a Prisma model at line 3785 in `tenant_staff` schema (v92 said "Zod schema only" — WRONG)

- No spec at `specs/payroll.md`

### P1.B — CRM Pipeline [NEEDS FUNCTIONAL VERIFICATION]

**Status:** Deal model CONFIRMED MISSING (virtual projection over Proposals). Pipeline stage changes work via manifest command `Deal.updateStage` but needs end-to-end verification. 41 route files, 19 frontend pages. Pipeline stage consistency gap identified. No spec at `specs/crm.md`.

### P1.C — Console Statement Cleanup [v94: 1,330]

**Status:** v94 verified count: **1,330** (v93: 909 — fuller grep including scripts/).

**Breakdown:**
- `console.error`: 638 (largest share — prioritize replacing first)
- `console.log`: 633
- `console.warn`: 54
- `console.info`: 4
- `console.debug`: 1

**Distribution:**
- `scripts/`: 364
- `apps/`: 549
- `packages/`: 405
- Excluding scripts: ~966 in apps + packages (production-relevant)

**CRITICAL:** No lint rule prevents new console statements — Biome `noConsole` rule is OFF.

**@repo/observability:** 407 file imports. The replacement path IS wired.

### P1.D — Design System: Bare Card [v92 VERIFIED: 453]

**Status:** **453 bare `<Card>`** (53.1% of 853 total Card instances). CONFIRMED. Pastel backgrounds: 210.

### P1.E — TypeScript Strictness [v94 VERIFIED]

**Status:** v94 verified counts (methodology corrected):
- `@ts-ignore`: **0** in production code
- `@ts-expect-error`: **6** in production code (v93: 11 — stricter test/spec exclusion)
- `as any` casts: **139** (heaviest in manifest-runtime with 55+)
- `: any` type annotations: **~62** (v93: 17 — word boundary was too strict)
- TODO: **17-22** production comments across 10 files (v93: 115 — included test/spec files)
- FIXME/HACK: **0** (CONFIRMED)

### P1.F — Accounting: Structural Gaps [v94 EXPANDED]

**Status:** Multiple structural gaps prevent correct accounting operation.

- **Financial reports expenses hardcoded to zero** at TWO locations: `.reduce(() => 0, 0)` pattern in `financial-reports/route.ts` (both the reduce call and individual line items)
- **Journal entries / general ledger:** MISSING ENTIRELY — no model, no routes
- **Bank reconciliation:** FULLY SIMULATED with modulo + hardcoded variance (fabricated data)
- **No double-entry bookkeeping infrastructure** exists at all
- No spec

### P1.G — Inventory Route Manifest Gap [v93: 58 routes]

**Status:** Inventory has **58 routes**. ZERO manifest files. **~27 orphan routes**. No spec.

### P1.H — Hardcoded API Paths [v94: 666]

**Status:** **666 hardcoded `/api/` paths** across 192 files in `apps/app/` (v93: 1,277 — v94 methodology more precise, scoped to apps/app/ only).

---

## P2 — Medium Priority

### P2.A — Calendar (8 routes)
- [x] Drag-and-drop (dnd-kit), ResearchTable, BlogFilterChip — DONE
- [ ] OAuth tokens PLAINTEXT — escalated to P0.7
- [ ] 0 manifest commands, no optimistic concurrency control (FR-502)
- [ ] No mobile responsive layout for drag-and-drop, no E2E tests for reschedule
- [ ] FR-504: Reschedule does direct DB updates, not manifest commands
- [ ] FR-102/FR-204: Sync page uses bare Card instead of design-system primitives
- [ ] FR-501: No timeoff rejection with specific error code
- [ ] FR-503: No shift-vs-timeoff conflict check, no RBAC
- [ ] FR-603: List view ?view=list not synced to URL
- [ ] FR-701: No mobile-adaptive month view layout
- [ ] No E2E tests for calendar

### P2.B — Accounting (17 routes)
- [x] Invoicing, payments, revenue recognition, collections
- [ ] Financial reports expenses HARDCODED TO ZERO at TWO locations (P1.F)
- [ ] Journal entries / general ledger: MISSING. Bank reconciliation: SIMULATED
- [ ] No double-entry bookkeeping infrastructure

### P2.C — Contracts (1 top-level route + public signing)
- [x] 8 EventContract commands, 10 VendorContract commands, public signing surface
- [ ] Public signing uses direct DB writes (FR-504), returns 400 not 409 for duplicates
- [ ] No rate limiting on unauthenticated public signing endpoint
- [ ] `/api/public/` is EXPLICITLY EXEMPT from rate limiting in `global-rate-limit.ts` EXEMPT_PATTERNS array

### P2.D — Events (83 routes — v94 CORRECTION from 87)

**Spec coverage: ~85-90%.** Spec EXISTS at `specs/events/SPEC.md`.

**Critical schema gaps:**
- [ ] `EventImportWorkflow` model DOES NOT EXIST — only simpler `EventImport` with `parseStatus` (naming mismatch with manifest layer)
- [ ] `event_dishes` model EXISTS but as raw-mapped lowercase with NO Prisma relations to Event or Dish
- [ ] `Event.importWorkflowId` absent — cannot link imported events to import workflow
- [ ] `EventSummary.confidence` absent — AI confidence pill (FR-203/FR-304) impossible
- [ ] **9 of 16 spec entities have NO back-relation** on Event model (EventProfitability, EventSummary, EventStaffAssignment, EventGuest, AllergenWarning, event_dishes, EventTimeline, EventImport, BattleBoard)
- [ ] Import code at `documents/parse/route.ts:936-979` has commented-out Manifest integration block
- [ ] Battle board ~35% (model exists, no vote/nominate/finalize endpoints)
- [ ] AI confidence field STILL MISSING from EventSummary
- [ ] 29 frontend pages, 10 manifest files

### P2.E — Kitchen (148 routes — v93 CORRECTION)

**13 singular/plural duplicate pairs (v93: 13, v92 said 14 — CORRECTED):**

| Singular | Plural | Entity |
|---|---|---|
| dish/ | dishes/ | Dish |
| ingredient/ | ingredients/ | Ingredient |
| menu/ | menus/ | Menu |
| recipe/ | recipes/ | Recipe |
| station/ | stations/ | Station |
| preplist/ | prep-lists/ | Prep List |
| preplistitem/ | prep-list-items/ | Prep List Item |
| preptask/ | prep-tasks/ | Prep Task |
| recipeversion/ | recipe-versions/ | Recipe Version |
| recipeingredient/ | recipe-ingredients/ | Recipe Ingredient |
| menudish/ | menu-dishes/ | Menu Dish |
| inventoryitem/ | inventory/ | Inventory |
| waste/entries/ | waste-entries/ | Waste Entries |

- [ ] **64 auto-generated manifest routes**
- [ ] **17 canonical routes**
- [ ] **~67 mixed routes**
- [ ] **23+ orphan route groups**
- [ ] 31 frontend pages, 18 client components
- [ ] 22 active manifest files, 4 disabled
- [ ] 2 zero-UUID placeholders in import route (lines 338, 360)
- [ ] No spec

### P2.F — Logistics (5 routes, 0 manifest commands, GPS SIMULATED)
### P2.G — Staffing (2 routes, 5 queryRawUnsafe in staffing domain — all parameterized)
- [ ] **v94:** 45 total `queryRawUnsafe` calls across 7 files (v93: 5 — was staffing-only). All parameterized but cosmetic concern.
- [ ] Recommendations page: 23+ raw Card usages, doesn't use design-system primitives
- [ ] CoverageBar primitive: doesn't exist
- [ ] Labor budget alerts: entirely unimplemented
- [ ] E2E test: staffing-recommendations.workflow.spec.ts doesn't exist
### P2.H — Staff (35 routes — scheduling domain)
### P2.I — Settings (10 routes)
- [ ] 28 frontend TSX files
- [ ] 1 console.error in auto-generated route
- [ ] Rate-limit CRUD is ahead of spec (spec says read-only)
- [ ] **Billing page explicitly P3/blocked** — spec says billing is gated on billing model decision. No Subscription/Plan/Tier/BillingAccount Prisma models exist.
### P2.J — Analytics (5 routes, revenue computed **5 different ways**)
### P2.K — Marketing (1 route, minimal)
### P2.L — Command Board (22 routes, shell 3/3, AI Chat/Simulation UI NOT IMPLEMENTED)
### P2.M — Knowledge Base (3 routes, read-only, auth via manifest path)

### P2.N — Integrations (25 routes — v93 CORRECTIONS)

| Integration | Routes | Spec? | Tests? | Frontend? |
|---|---|---|---|---|
| GoodShuffle | 10 | No | Yes (138 refs) | Yes (7 refs) |
| Nowsta | 6 | Yes (draft `_TODO`) | **NO** | Yes (7 refs) |
| QuickBooks | 1 | **NO** | **2 test files** | Yes (2 refs) |
| Webhook Mgmt | 9 | Yes (draft `_TODO`) | Partial | Yes |
| Supplier Webhook | 1 | No | Partial | N/A (inbound) |

### P2.O — Training (7 routes)
- [ ] **Dual storage pattern documented:** Training modules POST validates via manifest runtime but persists via raw SQL INSERT because PrismaJsonStore doesn't match the GET handler's storage
- [ ] 3 Prisma models
- [ ] Only 1/5 spec stories implemented
- [ ] Draft spec only in `_TODO` directory
### P2.P — Search [RESOLVED — DO NOT REOPEN]
### P2.Q — Procurement (24 routes)

**v94 CONFIRMED:** Requisitions 8/8 complete. Vendor-contracts has **30-field Prisma model + 10 commands in manifest + ZERO command route directories**. All frontend writes to vendor-contracts will 404.

- [ ] Requisitions: 8 command dirs (DONE)
- [ ] Vendor-contracts: **0 command dirs**. Frontend calls will 404.
- [ ] No spec

### P2.R — Timecards (10 routes)
- [ ] 4 Prisma models
- [ ] 1 test file (1,765 lines)
- [ ] No spec, no manifests
### P2.S — Documents (1 route)

### P2.T — Catering [v94 CORRECTION: NOT a ghost domain]

**v94 CORRECTION:** Catering is an **event type classification**, not a separate domain. Zero frontend calls to `/api/catering/`. The actual issue is `cateringorder` (4 calls, missing rewrite) — see P0.6 missing rewrites.

### P2.U — Warehouse (2 routes, GET-only)
- [ ] Status derived from text fields
- [ ] 14 frontend TSX files
- [ ] No spec

### P2.V — Communications/Collaboration Fragmentation
- [ ] Communications: 7 routes (overlaps with collaboration domain), no spec
- [ ] Collaboration: 17 routes (Liveblocks-based), 4 Prisma models, no spec
- [ ] Notifications: 14 API routes under collaboration/notifications
- [ ] 3 overlapping SMS modules (sms.ts, sms-new.ts, sms-temp.ts)
- [ ] Dismissed state not modeled in DB
- [ ] Dual API surface (collaboration + manifest)

### P2.W — Frontend Module Design System (13/15 at 3/3; Kitchen 2/3)

### P2.X — Unlisted Domains (27 domains, 83 routes)

Additional domains: administrative (13 routes, 4 test files, no spec, no manifests), rolepolicy (7 routes, auth via manifest path, route duplication issue, no tests, no spec), lead (6 routes, part of CRM, Lead model exists, dual write paths: public + operator, no spec), facilities (5 routes, ALL GET-only, 4 Prisma models, 1 active + 1 disabled manifest, no mutation routes, frontend read-only, no spec), shipments (9 routes).

**13 concatenated-word directories violating kebab-case:**
- Top-level (5): alertsconfig, cateringorder, rolepolicy, smsautomationrule, variancereport
- Kitchen sub-directories (6): menudish, preplist, preplistitem, preptask, inventoryitem, recipeingredient
- Additional (2): rolepolicy, smsautomationrule

### P2.Y — Payroll (24 routes — runtime bugs at P1.A)

### P2.Z — Security Coverage [v94 CORRECTIONS]

| Metric | v93 Claim | v94 Actual | Notes |
|---|---|---|---|
| Prisma models total | 223 | **223** | CONFIRMED |
| Tables with RLS (unique) | 97 | **88** | v94: 9 tables had RLS in multiple migrations |
| RLS ENABLE statements | 97 | **97** | 97 total, but only 88 unique tables |
| Auth coverage (effective) | ~96.8% | **~96.8%** | Confirmed |
| Per-route rate limiting | 14 files | **14 files** | CONFIRMED |
| Global rate limiting | ~95% | **~95%** | CONFIRMED |
| Manifest .manifest files active | 244 | **86** | v93 counted total files; v94 counts .manifest files |
| Manifest files disabled | 6 | **6** | CONFIRMED |
| Non-command POST routes | 86 | **86** | CONFIRMED |
| Exemptions | 167 | **248** | v94 precise count |
| queryRawUnsafe | 5 | **45** | v93 was staffing-only; 45 across 7 files, all parameterized |

**v94 NEW findings:**
- `/api/public/` is in EXEMPT_PATTERNS array in `global-rate-limit.ts` — public POST endpoints (contract signing, proposal response) have ZERO rate limiting
- No Biome/Ultracite lint in CI — no automated check prevents new console statements or style violations
- `SKIP_ENV_VALIDATION=true` in CI build — env schema validation bypassed
- 28 raw `fetch()` calls bypass `apiFetch` — miss consistent auth headers, error handling, deployment ID

**High-risk findings (remaining):**
- `/api/events/contracts/[id]/signature` — contract signing with no inline auth
- `/api/public/contracts/[token]/sign` — no rate limiting on unauthenticated write
- `/api/public/proposals/[token]/respond` — no rate limiting on unauthenticated write

### P2.AA — Orphan Route Cleanup [v93 UPDATED]

| Domain | Backend Routes | Frontend Refs | Orphans | % |
|---|---|---|---|---|
| Kitchen | 148 | ~47 | **23+** | 16%+ |
| Inventory | 58 | ~22 | **~27** | 47% |
| Collaboration | 17 | ~8 | **~9** | 53% |
| Administrative | 13 | ~5 | **~8** | 62% |
| Communications | 7 | ~2 | **~5** | 71% |

### P2.AB — Manifest IR Bloat [v94 CLARIFICATION]

**Status:** IR declares **589 POST routes** but filesystem only has **242**. The **347 "ghost POST routes"** are NOT broken — they are served by the **dynamic command dispatcher** at `/api/manifest/[entity]/commands/[command]/route.ts`. This is by design: the dispatcher handles any manifest-declared entity/command pair without needing individual filesystem routes.

- IR total: 849 routes (589 POST + 260 GET)
- Filesystem POST routes: 242
- Ghost POST routes: 347 (served by dynamic dispatcher — NOT 404s)
- Non-commands POST routes: 171

---

## P3 — Lower Priority

### P3.A — Dead Package Cleanup

**Dead (zero consumers) — v94: 3 (v93: 4 — @repo/cms REVERSED to alive):**
- @repo/ai — zero consumers
- @capsule/brand — zero consumers
- @repo/kitchen-state-transitions — zero consumers

**Alive (v94 REVERSED from v93):** @repo/cms — 11+ consumers in apps/web/ (legal pages, footer, toolbar, sitemap)
**Alive (previously claimed dead):** @repo/storage (8 consumers).
**Infrastructure (not "dead"):** @repo/manifest-ir, @repo/manifest-runtime.
**Script mismatches:** event-parser uses `"type-check"` not `"typecheck"`. 4 packages have no typecheck script: @repo/types, @repo/typescript-config, @capsule/brand, @capsule-pro/sales-reporting.

### P3.B — Spec Authoring

46 spec files total. 25 COMPLETE, 6 PARTIAL, 4 DRAFT/TODO. **36 of ~50 API domains have NO spec.**

| Domain | Routes | Spec Status | Notes |
|---|---|---|---|
| Kitchen | 148 | **NONE** | Largest domain, no spec |
| Events | 83 | EXISTS | ~85-90%, 9 missing back-relations, EventDish raw-mapped |
| Inventory | 58 | **NONE** | ~27 orphans |
| CRM | 41 | **NONE** | Deal model MISSING, pipeline gap |
| Staff | 35 | — | Scheduling domain |
| Integrations | 25 | **PARTIAL** | QB no spec, Nowsta draft |
| Procurement | 24 | **NONE** | Vendor-contracts 0 dirs |
| Payroll | 24 | **NONE** | Runtime bugs, 3 bracket copies |
| Command-board | 22 | — | Shell 3/3 |
| Accounting | 17 | **NONE** | Expenses hardcoded to zero, no double-entry |
| Collaboration | 17 | **NONE** | Zero manifest commands |
| Administrative | 13 | **NONE** | |
| Timecards | 10 | **NONE** | 1 test file (1,765 lines) |
| Settings | 10 | — | Billing P3/blocked |
| Shipments | 9 | — | |
| Calendar | 8 | **PARTIAL** | OAuth plaintext (P0.7) |
| Communications | 7 | **NONE** | |
| Training | 7 | **DRAFT** | 1/5 stories implemented |
| Rolepolicy | 7 | **NONE** | |
| Logistics | 5 | **NONE** | GPS simulated |
| Facilities | 5 | **NONE** | GET-only, read-only |
| Analytics | 5 | **NONE** | 5 revenue methods |
| Warehouse | 2 | **NONE** | GET-only |
| Marketing | 1 | — | |

**Biggest gaps:** Kitchen, CRM, Inventory, Payroll, Procurement, Accounting, Collaboration, Logistics, Analytics — all have NO spec.
**TODO spec directories:** SMS, Nowsta, Training/HRMS, Webhooks.

### P3.C — Cron HTTP Method Inconsistency

**8 cron jobs in vercel.json** (AGENTS.md registry says 6 — outdated):

| Route | Schedule | Method |
|---|---|---|
| sentry-fixer/process | `0 0 * * *` | — |
| cron/webhook-retry | `*/5 * * * *` | — |
| cron/inventory-audit | `0 6 * * *` | — |
| cron/contract-expiration-alerts | `0 7 * * *` | — |
| cron/email-reminders | `*/15 * * * *` | — |
| cron/idempotency-cleanup | `0 3 * * *` | — |
| cron/integration-auto-sync | — | **NOT in AGENTS.md** |
| outbox/publish | — | **NOT in AGENTS.md** |

4 use GET for mutating operations (should be POST). AGENTS.md cron registry needs updating.

### P3.D — Route Architecture

- **628 total API route files**, 86 active .manifest files, 6 disabled
- **242 POST route handlers** (confirmed)
- **40 manifest runtime commands**
- `routes.manifest.json`: 849 routes (589 POST + 260 GET)
- **POST route gap: 0** (RESOLVED). Only 1 uncovered: DELETE /api/inventory/audit/reports/[id]
- **Manifest IR bloat:** 347 ghost POST routes (served by dynamic dispatcher — NOT broken)
- **Non-commands POST routes:** 171 outside commands/ namespace
- **50 top-level API domains**
- **13 concatenated-word directories** violating kebab-case
- **13 singular/plural duplicate pairs** at directory level (kitchen)
- **248 exemptions** (v94 precise count)

### P3.E — AGENTS.md Corrections Needed

1. Console count ~932 — actual **1,330** (v94 verified)
2. RLS "all tables have RLS" — actual **88/223 = 39.5%** unique tables (v94 verified)
3. Cron registry says 6 — actual **8** (missing integration-auto-sync, outbox/publish)
4. Inventory says 24 routes — actual **58** (v93)
5. Events not listed — actual **87 routes**
6. Staff vs Staffing not clarified (staff=35, staffing=2)
7. Procurement vendor-contracts "10/10 complete" — actual **0 directories**
8. Kitchen "12 duplicate pairs" — actual **13** (v93 corrected)
9. QuickBooks "zero tests" — actual **2 test files**
10. Payroll "only CA" — actual **8/50 states** (v94: corrected from v93's 9)
11. No Biome lint in CI — CI "linting" step runs typecheck, not Biome
12. queryRawUnsafe count — actual **45** across 7 files (not 5)

### P3.F — Test Infrastructure (v94 BASELINE)

- **325 test files** (247 .test.ts + 9 .test.tsx + 69 .spec.ts) (v93: 324)
- **7,203 total test blocks** (1,654 describe + 5,549 it/test) (v93: 6,982)
- **69 E2E spec files** (48 e2e/ + 15 e2e/workflows/ + other locations) (v93: 63)
- **6 test files with ZERO assertions:** presence-indicators-verification.spec.ts, sample-data.spec.ts, full-site.spider.spec.ts, and 3 manifest tests
- **26 packages with ZERO tests** — including observability, security, payments, storage, rate-limit
- **63 skipped tests** (53 conditional skipIf, 10 unconditional test.skip)
- **0 test.todo markers**
- `vitest.config.ts.bak2` still exists at `apps/api/vitest.config.ts.bak2` (should be cleaned up)

### P3.G — Raw fetch() Bypassing apiFetch [v94 NEW]

**28 raw `fetch()` calls** across the codebase bypass `apiFetch`, missing:
- Consistent auth headers
- Standardized error handling
- Deployment ID passing
- Request/response interceptors

---

## Code Quality Metrics

| Metric | v93 Count | v94 Count | Status | Notes |
|---|---|---|---|---|
| `console.*` statements | 909 | **1,330** | v94 CORRECTED | Fuller grep; 638 error + 633 log + 54 warn |
| `:any` types | 17 | **~62** | v94 CORRECTED | Word boundary was too strict in v93 |
| `as any` casts | 133 | **139** | v94 CORRECTED | Heaviest in manifest-runtime (55+) |
| `@ts-ignore` (production) | 0 | **0** | CONFIRMED | |
| `@ts-expect-error` (production) | 11 | **6** | v94 CORRECTED | Stricter test/spec exclusion |
| Bare `<Card>` | 453 | **453** | CONFIRMED | 53.1% of 853 total |
| Pastel backgrounds | 210 | **210** | CONFIRMED | |
| Hardcoded `/api/` paths | 1,277 | **666** | v94 CORRECTED | Scoped to apps/app/; 192 files |
| Auth coverage (effective) | ~96.8% | **~96.8%** | CONFIRMED | |
| Rate limit (per-route files) | 14 | **14** | CONFIRMED | |
| Rate limit (global) | ~95% | **~95%** | CONFIRMED | |
| queryRawUnsafe | 5 | **45** | v94 CORRECTED | 7 files, all parameterized |
| RLS coverage (unique tables) | 97/223=43.5% | **88/223=39.5%** | v94 CORRECTED | 9 tables had duplicate RLS statements |
| Prisma models total | 223 | **223** | CONFIRMED | |
| TODO (production) | 115 | **17-22** | v94 CORRECTED | v93 included test/spec files |
| FIXME | 0 | **0** | CONFIRMED | |
| HACK | 0 | **0** | CONFIRMED | |
| Observability imports | 407 | **407** | CONFIRMED | |

---

## RLS Coverage [v94 VERIFIED]

**v94: 88/223 = 39.5% unique tables** (v93: 97/223 = 43.5%)

97 total RLS ENABLE statements exist in migrations, but only 88 unique tables — 9 tables have RLS enabled in multiple migrations.

**RLS history:**
- v83: "all tables have RLS" — INCORRECT
- v90: 85/170 = 50.0%
- v91: 84/210 = 40.0%
- v92: 93/223 = 41.7%
- v93: 97/223 = 43.5%
- v94: **88/223 = 39.5%** (unique tables, deduped)

---

## Security Summary

- **Calendar OAuth tokens PLAINTEXT** in ProviderSync — HIGH severity (P0.7)
- **Auth coverage:** ~96.8% effective
- **Rate limiting:** ~95% global. Per-route: 14 files
- **Public endpoints EXPLICITLY EXEMPT** from rate limiting in global-rate-limit.ts EXEMPT_PATTERNS
- **RLS:** 88/223 = 39.5% unique tables (v94 verified)
- **45 `queryRawUnsafe` calls** across 7 files — all parameterized (cosmetic)
- **Manifest enforcement:** 86 active .manifest files, 248 exemptions
- **Remaining high-risk:** contract signing endpoint, public unauthenticated writes
- **POST route gap: 0** (RESOLVED)
- **Manifest IR bloat:** 347 ghost POST routes (served by dynamic dispatcher)
- **28 raw fetch() calls** bypass apiFetch (P3.G)
- **No Biome lint in CI** — no automated style/quality gate
- **SKIP_ENV_VALIDATION=true** in CI — env validation bypassed

---

## Resolved / Do Not Reopen

These items have been verified as resolved by multiple audit passes. Do not re-investigate without new evidence.

### P0 Bugs (All 22 Resolved v65-v72)
- All critical bugs across payroll, scheduling, security, marketing, procurement, events, knowledge base, event intake, settings, logistics, CRM
- See `docs/implementation-history/` for pass details

### P0.3 Manifest POST Route Gap (RESOLVED v88)
- 242 unregistered POST routes reduced to ZERO
- 209 filesystem POST routes: 66 matched by manifest IR, 143 matched by allowlist
- manifest-ci.yml IS a hard gate

### AllergenWarning Manifest Wiring (RESOLVED v88)
### @repo/observability Zero-Import Claim (RESOLVED v85)
### Scheduling API (RESOLVED — DO NOT REOPEN)
### Test Suite (RESOLVED v77-v80)
### Payroll Period ID (RESOLVED 2026-05-14)
### Search FR-107 + Entity Coverage + Multi-word (RESOLVED 2026-05-14)
### Calendar Features (RESOLVED — DO NOT REOPEN)
### Bare Table Violations (RESOLVED v84)

### RLS Coverage History — See RLS Coverage section above

### v93 False Claims (RESOLVED — DO NOT REOPEN)
- Console 909 — v94: 1,330 (fuller grep including scripts/)
- `:any` types 17 — v94: ~62 (word boundary was too strict)
- `as any` casts 133 — v94: 139
- `@ts-expect-error` 11 — v94: 6 (stricter test exclusion)
- TODO 115 — v94: 17-22 production (v93 included test/spec files)
- Hardcoded /api/ 1,277 — v94: 666 in apps/app/ (methodology more precise)
- RLS 97/223=43.5% — v94: 88/223=39.5% (9 duplicate RLS statements)
- Manifest active files 244 — v94: 86 .manifest files (v93 counted total files)
- Federal brackets 2 copies — v94: 3 (third copy in payroll/tax/list/route.ts)
- State tax 9/50 — v94: 8/50 (CA,NY,TX,FL,WA,PA,IL,OH)
- Dead packages 4 — v94: 3 (@repo/cms ALIVE with 11+ consumers)
- queryRawUnsafe 5 — v94: 45 across 7 files
- /api/manifest/ calls 122 — v94: ~84
- Test blocks 6,982 — v94: 7,203
- Test files 324 — v94: 325
- E2E spec files 63 — v94: 69
- Exemptions ~167 — v94: 248
- Catering "GHOST DOMAIN" — v94: NOT a ghost domain (event type classification; cateringorder is the real issue)
- 10 missing rewrites — v94: 9 (catering not a missing rewrite, cateringorder is)

### v92-v90 False Claims (RESOLVED — DO NOT REOPEN)
Key corrections across v90-v92 now superseded by v94: Console 834->1,330. `:any` 111->~62. `as any` 233->139. RLS 93/223->88/223. Dead packages 3->3 (v93 incorrectly added @repo/cms). Payroll states oscillated 8->9->8. Bracket copies 3->2->3. Manifest files 86->244->86. Catering was never a ghost domain. EmployeeTaxInfo IS a Prisma model. Auth ~96.8% (not 78.6%). Kitchen 13 dup pairs (not 12 or 14). Procurement vendor-contracts: 0 directories (not 10/10). P0.1 NOT removable (CI typecheck failing). See earlier versions for full v90-v92 itemization.

### Packages Confirmed ALIVE (v94 — DO NOT REOPEN as dead)
- `packages/observability/` — 407 file imports
- `packages/types/` — 6 consumers
- `packages/analytics/` — 14 imports
- `packages/event-parser/` — 3 imports (script: "type-check" not "typecheck")
- `packages/sales-reporting/` — 1 import (no typecheck script)
- `packages/feature-flags/` — 11 imports
- `packages/storage/` — 8 consumers
- `packages/cms/` — 11+ consumers in apps/web/ (legal pages, footer, toolbar, sitemap) — v94 REVERSED from v93 dead

### Packages Confirmed DEAD (v94 — DO NOT REOPEN as alive)
- `packages/ai/` — ZERO consumers
- `packages/brand/` — ZERO consumers (also no typecheck script)
- `packages/kitchen-state-transitions/` — ZERO consumers

### Packages Confirmed INFRASTRUCTURE (v90 — not "dead")
- `packages/manifest-ir/` — consumed internally
- `packages/manifest-runtime/` — consumed internally

---

## Route Inventory (v94 Updated)

| Domain | Routes | POST | Manifest | Spec | Notes |
|---|---|---|---|---|---|
| Kitchen | 148 | 49 | 38 (25.5%) | NONE | 13 dup pairs, 23+ orphans |
| Events | 83 | 42 | 10 | EXISTS | event_dishes raw-mapped, 9 missing back-relations |
| Inventory | 58 | 19 | 0 | NONE | ~27 orphans |
| CRM | 41 | 18 | — | NONE | Deal model MISSING |
| Staff | 35 | 14 | — | — | Scheduling domain |
| Integrations | 25 | 14 | — | PARTIAL | QB has 2 tests |
| Procurement | 24 | 11 | 8+0 | NONE | Req done, vendor-contracts 0 DIRS |
| Payroll | 24 | 6 | — | NONE | 3 bracket copies, 8/50 states |
| Command-board | 22 | 7 | 10 writes | — | Shell 3/3 |
| Accounting | 17 | 8 | 21 refs | NONE | Expenses hardcoded to zero, no double-entry |
| Collaboration | 17 | 9 | 0 | NONE | Liveblocks, zero manifest commands |
| Administrative | 13 | 4 | 0 | NONE | 4 test files |
| Timecards | 10 | 2 | 0 | NONE | 1 test (1,765 lines) |
| Settings | 10 | 4 | — | — | Billing P3/blocked |
| Shipments | 9 | 3 | — | — | |
| Calendar | 8 | 3 | 0 | PARTIAL | OAuth plaintext (P0.7) |
| Communications | 7 | 2 | 0 | NONE | Overlaps collaboration |
| Training | 7 | 3 | — | DRAFT | 1/5 stories, dual storage pattern |
| Rolepolicy | 7 | 3 | — | NONE | Route duplication, auth OK |
| Lead | 6 | — | — | NONE | Dual write paths (public + operator) |
| Catering | — | 0 | 0 | N/A | **NOT a domain** — event type classification |
| Logistics | 5 | 0 | 0 | NONE | GPS simulated |
| Facilities | 5 | 0 | 1 active | NONE | ALL GET-only, read-only |
| Analytics | 5 | 0 | — | NONE | 5 revenue methods |
| Warehouse | 2 | 0 | 0 | NONE | GET-only, 14 frontend TSX files |
| + 28 smaller domains | 65 | — | — | — | |
| **Total** | **628** | **242** | **40** | | **50 domains** |

---

## Verification Commands (v94)

```bash
# P0.1: ignoreBuildErrors (NOT YET SAFE)
pnpm turbo typecheck --filter=./apps/app --filter=./apps/api --filter=./apps/web
# Expected: FAILS (reason flag cannot be removed yet)

# P0.2: CI prisma generate gap + db-drift-check no-op
grep -n 'prisma' .github/workflows/ci.yml
# Expected: 0 matches before typecheck step
cat scripts/db-drift-check.mjs | head -20
# Expected: prints message, exits 0 (COMPLETE NO-OP)

# P0.4: CI typecheck coverage + SKIP_ENV_VALIDATION
grep 'filter=' .github/workflows/ci.yml
# Expected: only 3 apps filtered, no packages
grep 'SKIP_ENV_VALIDATION' .github/workflows/ci.yml
# Expected: found (should be removed)
grep 'biome\|ultracite\|lint' .github/workflows/ci.yml
# Expected: 0 matches for actual lint step (typecheck mislabeled as linting)

# P0.6: Missing /api/manifest/ rewrite (BIGGEST GAP)
grep -n 'manifest' apps/app/next.config.ts apps/api/next.config.ts | grep -i rewrite
# Expected: NOT FOUND — this is the bug

# P0.6: Frontend 404s count (v94: ~84 calls)
grep -rn 'apiFetch.*manifest' apps/app/app --include='*.tsx' --include='*.ts' | wc -l
# Expected: ~84 calls with no rewrite

# P0.7: Public endpoints explicitly exempt from rate limiting
grep -n 'EXEMPT_PATTERNS\|/api/public/' apps/api/middleware/global-rate-limit.ts
# Expected: /api/public/ in EXEMPT_PATTERNS array

# P1.A: tenant_payroll schema crash
grep -rn 'tenant_payroll' apps/api/ --include='*.ts'
# Expected: references to non-existent schema

# P1.A: EmployeeDeduction table name mismatch
grep -n 'employee_deductions\|EmployeeDeduction' apps/api/ packages/ --include='*.ts' -r
# Expected: raw SQL uses snake_case, Prisma model is PascalCase

# P2.Q: Procurement vendor-contracts (0 dirs) + P2.T: Catering NOT a domain
ls apps/api/app/api/procurement/vendor-contracts/commands/ 2>/dev/null  # Expected: does not exist
ls apps/api/app/api/catering/ 2>/dev/null  # Expected: does not exist (correct — not a domain)

# Console statements (v94: 1,330) / :any types (v94: ~62)
grep -rn 'console\.\(error\|log\|warn\|info\|debug\)' --include='*.ts' --include='*.tsx' apps/ packages/ scripts/ --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=generated | wc -l  # ~1,330
grep -rn ': any' --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=generated | grep -v '__tests__' | grep -v '\.test\.' | grep -v '\.spec\.' | wc -l  # ~62

# RLS unique tables (v94: 88/223)
grep -r 'ENABLE ROW LEVEL SECURITY' packages/database/prisma/migrations/ --include='*.sql' | sed 's/.*ALTER TABLE \([^ ]*\).*/\1/' | sort -u | wc -l
# Expected: ~88 unique tables
grep -c 'model ' packages/database/prisma/schema.prisma
# Expected: 223 models

# @ts-expect-error production (v94: 6) / as any (v94: 139)
grep -rn '@ts-expect-error' --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=generated | grep -v '__tests__' | grep -v '\.test\.' | grep -v '\.spec\.'  # 6
grep -rn 'as any' --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=generated | grep -v '__tests__' | grep -v '\.test\.' | wc -l  # ~139

# Hardcoded /api/ paths in apps/app/ (v94: 666)
grep -rn '"/api/\|`/api/' --include='*.ts' --include='*.tsx' apps/app/ --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=generated | wc -l  # ~666

# Manifest .manifest file count (v94: 86)
find packages/manifest-adapters/manifests -name '*.manifest' | wc -l  # ~86

# Dead test artifact / EmployeeTaxInfo model / raw fetch() bypass
ls apps/api/vitest.config.ts.bak2 2>/dev/null  # Expected: exists (cleanup needed)
grep -n 'model EmployeeTaxInfo' packages/database/prisma/schema.prisma  # FOUND at tenant_staff ~3785
grep -rn 'fetch(' --include='*.ts' --include='*.tsx' apps/app/ --exclude-dir=node_modules --exclude-dir=generated | grep -v 'apiFetch' | grep -v '__tests__' | wc -l  # ~28

# Cron jobs (v94: 8) / Test files with zero assertions (v94: 6)
grep -c 'path' apps/api/vercel.json  # 8 cron entries
grep -rl 'describe\|it\|test' --include='*.spec.ts' --include='*.test.ts' apps/ packages/ | while read f; do grep -c 'expect(' "$f" || echo "0 $f"; done | grep '^0'  # 6 files
```

---

## Items Needing Re-Verification

| Item | v94 Status | Why Re-verification Needed |
|---|---|---|
| Console statement scope | 1,330 (with scripts/) | Scripts are not production code — canonical count may be ~966 (apps+packages only) |
| `:any` type annotation scope | ~62 | Need to confirm these are actionable (not in generated files) |
| Hardcoded /api/ paths scope | 666 in apps/app/ | Client-side only vs total — confirm actionable set |
| Manifest file counting | 86 .manifest vs 244 total | Need to agree on counting: .manifest entities vs all generated files |
| Kitchen dup pairs | 13 (v93/v94) | Stable across two versions — likely correct |
| Payroll bracket copies | 3 (v94) vs 2 (v93) | Third copy confirmed in payroll/tax/list/route.ts — verify divergence |
| @repo/cms alive status | ALIVE (v94) vs DEAD (v93) | v94 confirmed 11+ consumers in apps/web/ — resolved |
| queryRawUnsafe total | 45 across 7 files | Verify none are injection risks (all parameterized per v94) |
| SKIP_ENV_VALIDATION impact | true in CI build | Assess what env checks are being bypassed |

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

- **v94**: 40+ parallel subagents. Key corrections: Console 1,330 (v93: 909 — fuller grep including scripts/). `:any` types ~62 (v93: 17 — word boundary was too strict). `@ts-expect-error` 6 in production (v93: 11 — stricter test exclusion). `as any` 139 (v93: 133). TODO 17-22 production (v93: 115 — included test/spec files). Hardcoded /api/ 666 in apps/app/ (v93: 1,277 — more precise scope). RLS 88/223=39.5% unique tables (v93: 97/223=43.5% — 9 tables had RLS in multiple migrations). Manifest .manifest files 86 (v93: 244 — counted total files not .manifest). Federal bracket copies 3 (v93: 2 — third copy in payroll/tax/list/route.ts). State tax 8/50 (v93: 9 — corrected to CA,NY,TX,FL,WA,PA,IL,OH). Dead packages 3 (v93: 4 — @repo/cms ALIVE with 11+ consumers). queryRawUnsafe 45/7 files (v93: 5 — staffing-only). Test blocks 7,203 (v93: 6,982). Test files 325 (v93: 324). E2E specs 69 (v93: 63). Exemptions 248 (v93: ~167). /api/manifest/ calls ~84 (v93: 122). 9 missing rewrites + 1 orphan. Catering NOT a ghost domain (event type). Payroll: tenant_payroll schema missing, EmployeeDeduction table name mismatch, division-by-zero, JSON type confusion, no YTD SS tracking, no FUTA/SUTA, no W-2/1099. Public endpoints explicitly rate-limit exempt. No Biome lint in CI. SKIP_ENV_VALIDATION=true in CI build. 28 raw fetch() bypass apiFetch. Vendor-contracts 0 command dirs. 6 test files zero assertions. 26 packages zero tests. 8 cron jobs (AGENTS.md says 6). Training dual storage documented. Settings billing P3/blocked. Ghost manifest routes served by dynamic dispatcher (NOT broken).
- **v93**: 40+ parallel subagents. MANY v93 FINDINGS CORRECTED IN v94 — see Resolved section.
- **v92**: 14 parallel subagents. MANY v92 FINDINGS CORRECTED IN v93/v94 — see Resolved section.
- **v91**: 30+ parallel subagents. MANY v91 FINDINGS CORRECTED IN v92-v94 — see Resolved section.
- **v90**: 25+ parallel subagent verification. MANY v90 FINDINGS CORRECTED — see Resolved section.
- **v89-v81**: Multiple passes with escalating corrections. See earlier versions.
- **v77-v80**: Test suite repair. 678 -> 0 failing tests.
- **v65-v72**: All 22 P0 items resolved.
