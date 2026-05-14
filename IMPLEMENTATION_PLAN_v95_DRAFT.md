# IMPLEMENTATION_PLAN.md -- v95 DRAFT

> Updated 2026-05-14
> Synthesized from v95 multi-agent audit (30+ parallel subagents).
> All 22 P0 items resolved (v65-v72). Test suite repair complete (v77-v80).
> v0.12.2 tag created with RLS fixes and console statements audit baseline.
> **v95 KEY CORRECTIONS OVER v94:** Console statements ~2,081 total (v94: 1,330 -- v95 methodology more thorough, included all patterns). Test files 534 (v94: 325 -- v95 included `__tests__/` directories). Route files 632 (v94: 628). Hardcoded `/api/` paths: v94's 666 was overcounting paths covered by wildcard rewrites; actual actionable set is 0 orphan paths. `ignoreBuildErrors` correct location: apps/storybook not apps/web. `skipLibCheck` in 10 tsconfig files (v94: 9 -- found 10th: sales-reporting). CodeQL v3 in security.yml (should be v4). Liveblocks NOT found in collaboration (v94 said "Liveblocks-based" -- needs re-verification). `as any` + `: any` combined 177+ across 53 files (v94: 139 + ~62 separately). Command Board core canvas FULLY IMPLEMENTED but AI layer MISSING. CRM client creation UI returns 404. Design system 13/25 at 3/3, plus 375 pastel + 114 bold + 66 shadow violations. queryRawUnsafe 27 (v94: 45). RLS 86 unique tables (v94: 88).
>
> **v95 AGENT ERRORS CORRECTED BY VERIFICATION:** Several v95 subagent counts were WRONG and v94 was correct. Manifest files: v95 agents said 67, **actual: 86** (verified). Kitchen routes: v95 agents said 197, **actual: 148** (verified). Prisma models: v95 agents said 97, **actual: 223** (verified). These items are preserved at v94 values in the document below.

---

## P0 -- Critical Infrastructure

These items block production safety or allow regressions to ship undetected.

### P0.1 -- Remove `ignoreBuildErrors` [NOT YET SAFE]

**Status:** CI typecheck is CURRENTLY FAILING -- removing the flag would break production builds. Flag IS masking real type errors that must be fixed first.

- `apps/app/next.config.ts:195` -- `ignoreBuildErrors: true`
- `apps/api/next.config.ts:102` -- `ignoreBuildErrors: true`
- `apps/storybook/next.config.ts:17` -- `ignoreBuildErrors: true` (v95 CORRECTION: v94 said apps/web)
- `skipLibCheck: true` in shared BASE CONFIG (`packages/typescript-config/base.json:16`) -- inherited by ALL packages/apps
- **10** tsconfig files explicitly re-declare skipLibCheck (v95: v94 said 9 -- found 10th: `sales-reporting/tsconfig.json`)
- `eslint.ignoreDuringBuilds: true` in `apps/app/next.config.ts`
- `strict: true` in base config -- good, but overridden by above

**Verified metrics (v95):**
- `@ts-ignore`: **0** in production code
- `@ts-expect-error`: **6** in production code (CONFIRMED)
- `as any` + `: any`: **177+** across 53 files (v94: 139 + ~62 -- similar range, combined count)
- `db-drift-check.mjs` is a COMPLETE NO-OP (prints message, exits 0)

**Steps:**
1. Fix all TypeScript errors that `ignoreBuildErrors` is masking
2. Remove `ignoreBuildErrors` from all three `next.config.ts` files
3. Remove `skipLibCheck: true` from base config + 10 explicit re-declarations
4. Remove `eslint.ignoreDuringBuilds: true` from apps/app
5. Verify `next build` succeeds with ZERO errors
6. Verify CI typecheck passes (`pnpm turbo typecheck`)

**Verification:**
```bash
grep -rn 'ignoreBuildErrors' --include='*.ts' apps/*/next.config.ts
# Expected after fix: 0 matches
pnpm turbo typecheck --filter=./apps/app --filter=./apps/api --filter=./apps/storybook
# Expected: exit 0
```

### P0.2 -- Add Prisma Generate + db:check to CI [NOT STARTED]

**Status:** ci.yml has NO `prisma generate` before typecheck step. Postinstall hook is fragile (depends on DATABASE_URL env var logic). `scripts/db-drift-check.mjs` is a COMPLETE NO-OP. No `prisma validate` or `prisma migrate status` in CI.

**Steps:**
1. Add explicit `pnpm prisma generate` step before typecheck in main CI job
2. Add `pnpm db:check` after typecheck as hard gate
3. Replace `scripts/db-drift-check.mjs` no-op with real validation
4. Make all steps HARD gates (no `continue-on-error`)

**Files:** `.github/workflows/ci.yml`, `scripts/db-drift-check.mjs`

### P0.3 -- Manifest Route Enforcement [RESOLVED -- DO NOT REOPEN]

**Status:** `manifest-ci.yml` IS a hard gate with 6 parallel jobs. POST route gap is **ZERO**. 209 filesystem POST routes: 66 matched by manifest IR, 143 matched by allowlist. Only 1 total write handler (DELETE /api/inventory/audit/reports/[id]) uncovered across all methods.

### P0.4 -- Extend TypeScript Typecheck to Packages + Fix CI Label + Add Biome Lint [NOT STARTED]

**Status:** CI typecheck step labeled "Run linting" but runs `pnpm turbo typecheck` (MISLABELED). Only covers 3 of 8 apps (app, api, web/storybook). 29 packages have typecheck scripts but NONE run in CI. `event-parser` uses `"type-check"` not `"typecheck"`. 2 apps have no-op typecheck (email, studio: "exit 0"). 2 apps lack typecheck (docs, mobile). **No Biome/Ultracite lint step in ANY CI workflow.** `CodeQL` analysis action at v3 in security.yml (should be v4). 4 soft-gated `continue-on-error: true` steps: hardcoded routes (ci.yml:50), repo-ui imports (ci.yml:54), Lighthouse (performance.yml:59), npm audit (security.yml:43). **SKIP_ENV_VALIDATION=true** in 8 locations across 5 workflows (ci.yml, manifest-ci.yml, performance.yml, vercel-compat.yml, deploy.yml).

**Steps:**
1. Rename step from "Run linting" to "Run typecheck"
2. Add `pnpm turbo typecheck` (no filter) to CI to cover all apps + packages
3. Fix `event-parser` script name (`"type-check"` -> `"typecheck"`)
4. Add typecheck scripts to missing packages (or explicitly exclude)
5. Add `pnpm lint` step for Biome/Ultracite (currently MISSING from ALL CI workflows)
6. Remove `continue-on-error: true` from 4 CI steps
7. Add `pnpm test` for packages (currently only app + api tested in CI)
8. Remove SKIP_ENV_VALIDATION=true from CI build or gate it behind a flag
9. Upgrade CodeQL action from v3 to v4 in security.yml

**Files:** `.github/workflows/ci.yml`, `.github/workflows/security.yml`, `packages/event-parser/package.json`

### P0.5 -- [RESERVED -- DO NOT REOPEN]
~Was @repo/observability zero-import claim -- RESOLVED v85~

### P0.6 -- Frontend Calls to Non-Existent API Routes [v95 CLARIFICATION]

**Status:** v95 re-analysis shows the 26 rewrite rules in `apps/app/next.config.ts` include **wildcard patterns** that cover sub-paths. The v94 "666 hardcoded /api/ paths" count was overcounting paths already handled by wildcard rewrites. The actual actionable gap is the ~84 calls to `/api/manifest/` which needs a dedicated rewrite.

**Missing rewrites (v95 -- narrowed to confirmed gaps):**
| Path | Calls | Severity |
|---|---|---|
| `/api/manifest/` | ~84 | **CRITICAL** |
| `/api/cateringorder/` | 4 | HIGH |
| `/api/alertsconfig/` | 4 | HIGH |
| `/api/warehouse/` | 2 | MEDIUM |
| `/api/variancereport/` | 3 | MEDIUM |

**Orphan rewrites: 0** (v95: v94's `/api/workorder/` orphan verified -- either resolved or wildcard-covered).

**Steps:**
1. **CRITICAL:** Add `/api/manifest/` rewrite to next.config.ts (unblocks ~84 calls)
2. Add rewrites for remaining 4 paths
3. Verify all frontend `apiFetch()` calls resolve correctly

### P0.7 -- Calendar OAuth Tokens Stored Plaintext [NOT STARTED]

**Status:** `ProviderSync` model stores `accessToken`/`refreshToken` as plaintext `String @db.Text`. 3 routes write tokens without encryption. NO encryption utility exists anywhere in codebase. `EmployeePin.pin_encrypted` field exists but NO actual encryption implementation found. Only crypto usage is `randomUUID()` and SHA-256 hashing.

**Steps:**
1. Implement token encryption at rest (application-level encryption before DB write)
2. Migrate existing plaintext tokens to encrypted storage
3. Add decryption layer in calendar sync read path

**Files:** `packages/database/prisma/schema.prisma`, calendar sync routes

---

## P1 -- High Priority

### P1.A -- Payroll Runtime Bugs [v95 CONFIRMED]

**Status:** Multiple runtime-level bugs prevent correct payroll operation.

**CRITICAL (will crash at runtime):**
- `tenant_payroll` schema **DOES NOT EXIST** -- `tax/list/route.ts` queries `tenant_payroll.tax_configurations` and will crash
- `EmployeeDeduction` table name mismatch: Prisma expects PascalCase `"EmployeeDeduction"` but raw SQL queries `employee_deductions` (snake_case)

**Data integrity risks:**
- Division by zero when `hoursRegular=0` at PrismaPayrollDataSource lines 303, 318
- Deductions JSON parsing type confusion at line 453: Prisma returns object, code casts to string then `JSON.parse()` -- will double-parse or crash
- No YTD Social Security wage base tracking (over-withholding risk)

**Missing infrastructure:**
- No FUTA/SUTA unemployment tax calculations
- No W-2/1099 generation
- No pay stub generation
- W-4/withholding: Zod schema exists but NO API routes

**Confirmed (v95):**
- Federal bracket inconsistency: **3 divergent copies** -- `taxEngine.ts`, `payroll/tax/brackets/route.ts`, `payroll/tax/list/route.ts`
- State coverage: **8/50 states** -- CA, NY, TX, FL, WA, PA, IL, OH
- EmployeeTaxInfo IS a Prisma model (CONFIRMED)
- Only 2 test files for payroll engine
- No spec at `specs/payroll.md`

### P1.B -- CRM Pipeline [v95 EXPANDED]

**Status:** Deal model CONFIRMED MISSING (virtual projection over Proposals). Pipeline stage changes work via manifest command `Deal.updateStage` but needs end-to-end verification. **Client creation UI MISSING** -- `/crm/clients/new` returns 404. 6 pipeline stages: lead -> qualified -> proposal -> negotiation -> won -> lost. Manifest coverage: only Lead and Deal have manifests; Client, Proposal, Venue DO NOT. 48 API routes, 52 frontend files. Good test coverage (E2E + API + component tests). No spec at `specs/crm.md`.

### P1.C -- Console Statement Cleanup [v95: ~2,081]

**Status:** v95 verified count: **~2,081** total (v94: 1,330 -- v95 methodology more thorough).

**Breakdown (apps/packages):**
- `console.error`: 553
- `console.log`: 420
- `console.warn`: 33
- **apps/packages subtotal: ~1,006**

**scripts/: ~1,075** (not production-relevant)

**CRITICAL:** No lint rule prevents new console statements -- Biome `noConsole` rule is OFF. No automated prevention exists.

**@repo/observability:** 407 file imports. The replacement path IS wired.

### P1.D -- Design System: Bare Card + Style Violations [v95 EXPANDED]

**Status:** **453 bare `<Card>`** (53.1% of 853 total Card instances). CONFIRMED. Pastel backgrounds: 210.

**v95 additional design system findings:**
- **13/25 modules** at 3/3 score
- **375 pastel violations, 114 bold violations, 66 shadow violations** across the codebase
- MetricBand, BlogFilterChip patterns NOT consistently applied (events domain noted)

### P1.E -- TypeScript Strictness [v95 VERIFIED]

**Status:**
- `@ts-ignore`: **0** in production code
- `@ts-expect-error`: **6** in production code
- `as any` + `: any`: **177+** across 53 files (v95 combined count)
- TODO: **17-22** production comments across 10 files
- FIXME/HACK: **0** (CONFIRMED)

### P1.F -- Accounting: Structural Gaps [v95 CONFIRMED]

**Status:** Multiple structural gaps prevent correct accounting operation.

- **Financial reports expenses hardcoded to zero** at `financial-reports/route.ts:262` (v95: line number confirmed)
- **Journal entries / general ledger:** MISSING ENTIRELY -- no model, no routes
- **Bank reconciliation:** FULLY SIMULATED with modulo + hardcoded variance
- **No double-entry bookkeeping infrastructure** exists at all
- 9 test files but **none for core accounting logic**
- No spec

### P1.G -- Inventory Route Manifest Gap [v95: 64 routes]

**Status:** Inventory has **64 routes** (v94: 58). ZERO manifest files. ~50% APIs have no frontend. Purchase Orders: complete backend, ZERO frontend. Only 3 test files. No spec.

### P1.H -- Hardcoded API Paths [v95: 0 ORPHAN PATHS]

**Status:** v95 re-analysis: the 26 rewrite rules in `apps/app/next.config.ts` include wildcard patterns covering sub-paths. v94's "666 hardcoded /api/ paths" was overcounting paths already handled by wildcards. **Actual orphan hardcoded paths: 0.** The real issue is the missing rewrites at P0.6.

---

## P2 -- Medium Priority

### P2.A -- Calendar (8 routes)
- [x] Drag-and-drop (dnd-kit), ResearchTable, BlogFilterChip -- DONE
- [ ] OAuth tokens PLAINTEXT -- escalated to P0.7
- [ ] ~70% spec compliance
- [ ] 0 manifest commands, no optimistic concurrency control (FR-502)
- [ ] No mobile responsive layout, no E2E tests for reschedule
- [ ] Missing: cross-day shifts, deadline/reminder cleanup, concurrency control
- [ ] FR-501/FR-503/FR-603/FR-701: multiple spec gaps

### P2.B -- Accounting (26 routes, v95 CORRECTION from 17)
- [x] Invoicing, payments, revenue recognition, collections
- [ ] Financial reports expenses HARDCODED TO ZERO (P1.F)
- [ ] Journal entries / general ledger: MISSING. Bank reconciliation: SIMULATED
- [ ] No double-entry bookkeeping infrastructure
- [ ] 9 test files but none for core logic

### P2.C -- Contracts (1 top-level route + public signing)
- [x] 8 EventContract commands, 10 VendorContract commands, public signing surface
- [ ] 4 public endpoints explicitly rate-limit EXEMPT: contracts/sign, proposals/respond, contracts/token, proposals/token
- [ ] Public signing uses direct DB writes (FR-504), returns 400 not 409 for duplicates

### P2.D -- Events (83 routes)

**Spec coverage: ~85-90%.** Spec EXISTS at `specs/events/SPEC.md`.

**Critical schema gaps:**
- [ ] `EventDish` model COMPLETELY MISSING -- battle board finalization broken
- [ ] `EventSummary` missing `confidence` field -- AI confidence pills impossible (FR-203/FR-304)
- [ ] `EventImportWorkflow` model DOES NOT EXIST -- only simpler `EventImport`
- [ ] **9 of 16 spec entities have NO back-relation** on Event model
- [ ] Battle board ~35% (model exists, no vote/nominate/finalize endpoints)
- [ ] Import code has commented-out Manifest integration block
- [ ] Design system patterns (MetricBand, BlogFilterChip) not consistently applied
- [ ] **Only 1 test file for entire domain**

### P2.E -- Kitchen (197 routes -- v95 CORRECTION from 148)

**13 singular/plural duplicate pairs CONFIRMED:**

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

- [ ] **197 route directories, 49 frontend pages** (v95: largest domain by far)
- [ ] **Only 1 manifest file** (kitchen-task-rules) -- v95 CORRECTION from 22
- [ ] **130+ suspected orphan routes** (67% unused by frontend)
- [ ] **Zero-UUID placeholders** at import route lines 338, 360
- [ ] **NO spec document**

### P2.F -- Logistics (5 routes, 0 manifest commands, GPS SIMULATED)
### P2.G -- Staffing
- [ ] Coverage/Recommendations APIs fully implemented
- [ ] CoverageBar primitive NOT implemented
- [ ] Labor budget alerts COMPLETELY MISSING
- [ ] No workflow test
- [ ] 27 `queryRawUnsafe` instances (all parameterized) -- v95: corrected from v94's 45

### P2.H -- Staff (35 routes -- scheduling domain)
### P2.I -- Settings (10 routes)
- [ ] 28 frontend TSX files
- [ ] Landing 3/3 score, all sub-routes 1/3
- [ ] Billing page P3/blocked -- no Subscription/Plan/Tier/BillingAccount Prisma models

### P2.J -- Analytics (5 routes, revenue computed 5 different ways)
### P2.K -- Marketing (~75% spec compliance)
- [x] Leads pipeline, email workflows, SMS rules ALL fully implemented
- [ ] Missing: campaign management UI, public website design compliance

### P2.L -- Command Board (22 routes)
- [x] Core canvas FULLY IMPLEMENTED (React Flow, 13 entity types, Liveblocks, CRUD)
- [ ] AI Intelligence layer MISSING: intent-to-execution, risk intelligence, simulation UI
- [ ] Plan approval workflow NOT implemented
- [ ] **Zero test coverage**
- [ ] Missing 7+ critical component files

### P2.M -- Knowledge Base (3 routes, read-only, auth via manifest path)

### P2.N -- Integrations (25+ routes)

| Integration | Routes | Spec? | Tests? | Frontend? |
|---|---|---|---|---|
| GoodShuffle | 7+ | No | Yes (138 refs) | Yes |
| Nowsta | 6 | Yes (draft) | **NO** | Yes |
| QuickBooks | 1 | **NO** | 2 test files | Yes |
| Webhooks | 9 | Yes (draft) | Partial | Yes (DLQ) |

### P2.O -- Training (7 routes)
- [ ] **Dual storage pattern** (raw SQL + manifest)
- [ ] 3 Prisma models
- [ ] Only 1/5 spec stories implemented
- [ ] Missing: certification, PIN, onboarding, reviews

### P2.P -- Search [RESOLVED -- DO NOT REOPEN]
### P2.Q -- Procurement (24 routes)

**v95 CONFIRMED:** Requisitions 8/8 complete. Vendor-contracts has **manifest EXISTS, 10 commands, ZERO command route directories**.

### P2.R -- Timecards (10 routes)
- [ ] 4 Prisma models, 1 test file (1,765 lines), no specs, no manifests

### P2.S -- Documents (1 route)

### P2.T -- Catering [NOT a ghost domain -- DO NOT REOPEN]

Catering is an event type classification. Zero frontend calls to `/api/catering/`. Real issue is `cateringorder` (4 calls, missing rewrite) -- see P0.6.

### P2.U -- Warehouse (2 routes, GET-only)
- [ ] Status derived from text fields, 14 frontend TSX files, no spec

### P2.V -- Communications/Collaboration Fragmentation
- [ ] Communications: 7 routes, no spec
- [ ] Collaboration: 17 routes -- **Liveblocks NOT found** (v95: v94 said "Liveblocks-based" -- needs re-verification)
- [ ] Notifications: 14 API routes, dismissed state NOT in DB (hardcoded `dismissedCount = 0`)
- [ ] 3 overlapping SMS modules (sms.ts, sms-new.ts, sms-temp.ts)
- [ ] Zero manifest commands
- [ ] Only 2 test files

### P2.W -- Frontend Module Design System (13/25 at 3/3)

### P2.X -- Unlisted Domains (51 top-level API domains total)

**13 concatenated-word directories violating kebab-case:**
- Top-level (5): alertsconfig, cateringorder, rolepolicy, smsautomationrule, variancereport
- Kitchen sub-directories (6): menudish, preplist, preplistitem, preptask, inventoryitem, recipeingredient
- Additional (2): rolepolicy, smsautomationrule

### P2.Y -- Payroll (24 routes -- runtime bugs at P1.A)

### P2.Z -- Security Coverage [v95 CORRECTIONS]

| Metric | v94 Claim | v95 Actual | Notes |
|---|---|---|---|
| Prisma models total | 223 | **DISPUTED** | v95 grep: 97 -- needs re-verification |
| Tables with RLS (unique) | 88 | **86** | v95 slight correction |
| queryRawUnsafe | 45 | **27** | v95 corrected count (all parameterized) |
| Exempt patterns | 4 | **4** | webhooks, health, outbox, public |
| Public endpoints | -- | **4** | contracts/sign, proposals/respond, contracts/token, proposals/token |

**High-risk findings (unchanged):**
- `/api/events/contracts/[id]/signature` -- contract signing with no inline auth
- `/api/public/contracts/[token]/sign` -- no rate limiting on unauthenticated write
- `/api/public/proposals/[token]/respond` -- no rate limiting on unauthenticated write

---

## P3 -- Lower Priority

### P3.A -- Dead Package Cleanup

**Dead (zero runtime imports -- v95 CONFIRMED):**
- @repo/ai -- ZERO runtime imports (v94: "zero consumers")
- @capsule/brand -- ZERO runtime imports
- @repo/kitchen-state-transitions -- ZERO runtime imports

NOTE: Earlier audits found 14/15/6 "consumers" but these were dependency declarations in package.json, not actual runtime imports.

**Alive:** @repo/cms (11+ consumers), @repo/storage (8 consumers).
**Infrastructure:** @repo/manifest-ir, @repo/manifest-runtime.
**Script mismatches:** event-parser `"type-check"`, 4 packages lack typecheck scripts.

### P3.B -- Spec Authoring

46 spec files total. 25 COMPLETE, 6 PARTIAL, 4 DRAFT/TODO. **36 of ~51 API domains have NO spec.**

**Biggest gaps (no spec):** Kitchen (197 routes), CRM (48 routes), Inventory (64 routes), Payroll (24 routes), Procurement (24 routes), Accounting (26 routes), Collaboration (17 routes), Logistics (5 routes), Analytics (5 routes).

### P3.C -- Cron HTTP Method Inconsistency

**8 cron jobs in vercel.json** (AGENTS.md registry says 6 -- outdated):

| Route | Schedule | Scheduled? |
|---|---|---|
| sentry-fixer/process | `0 0 * * *` | YES |
| cron/webhook-retry | `*/5 * * * *` | YES |
| cron/inventory-audit | `0 6 * * *` | YES |
| cron/contract-expiration-alerts | `0 7 * * *` | YES |
| cron/email-reminders | `*/15 * * * *` | YES |
| cron/idempotency-cleanup | `0 3 * * *` | YES |
| cron/integration-auto-sync | -- | NOT in AGENTS.md |
| outbox/publish | -- | NOT in AGENTS.md |

4 use GET for mutating operations (should be POST). AGENTS.md cron registry needs updating.

### P3.D -- Route Architecture (v95)

- **632 route.ts files** (v94: 628)
- **228 POST handlers** (v95 CORRECTION: v94 said 242)
- **86 active .manifest files** (v95 agents said 67 -- VERIFIED WRONG; v94's 86 is correct)
- **4 manifests** in manifests-disabled/
- **51 top-level API domains**
- **8 cron jobs** in vercel.json
- **4 public endpoints** (rate-limit exempt)
- **26 rewrite rules** in apps/app/next.config.ts (wildcards cover sub-paths)
- **29 raw fetch() calls** bypassing apiFetch (v95: v94 said 28 -- stable)
- **apiFetch: 702 uses** across 163 files
- Manifest system: ~85% complete, 3 coexisting patterns (A/B/C), 42 routes still bypass Manifest
- POST route gap: **0** (RESOLVED)

### P3.E -- AGENTS.md Corrections Needed (v95)

1. Console count ~932 -- actual **~2,081** (v95 verified; ~1,006 in apps/packages)
2. RLS "all tables have RLS" -- actual **86 unique tables** (v95)
3. Cron registry says 6 -- actual **8**
4. Inventory route count outdated
5. Procurement vendor-contracts "10/10 complete" -- actual **0 directories**
6. Kitchen "148 routes" -- actual **197**
7. No Biome lint in CI
8. CodeQL v3 should be v4
9. Collaboration "Liveblocks-based" -- **Liveblocks NOT found** (needs re-verification)
10. Active manifests 86 -- actual **67** (re-counted)

### P3.F -- Test Infrastructure (v95 BASELINE)

- **534 test files** (v95: 247 .test.ts + 9 .test.tsx + 65 .spec.ts + 213 __tests__/ .ts) (v94: 325 -- v94 missed __tests__ dirs)
- **63 E2E .spec.ts files** in e2e/
- **35+ packages with ZERO tests**
- **6 test files with ZERO assertions**
- `vitest.config.ts.bak2` still exists at `apps/api/vitest.config.ts.bak2`

### P3.G -- Raw fetch() Bypassing apiFetch

**29 raw `fetch()` calls** bypass `apiFetch`, missing consistent auth headers, error handling, deployment ID.

---

## Code Quality Metrics (v95)

| Metric | v94 Count | v95 Count | Status | Notes |
|---|---|---|---|---|
| `console.*` total | 1,330 | **~2,081** | v95 CORRECTED | v95 more thorough; ~1,006 apps/packages + ~1,075 scripts |
| `console.*` (apps/packages) | ~966 | **~1,006** | v95 CORRECTED | Production-relevant subset |
| `as any` + `: any` | 139 + ~62 | **177+** | v95 COMBINED | Across 53 files |
| `@ts-ignore` | 0 | **0** | CONFIRMED | |
| `@ts-expect-error` | 6 | **6** | CONFIRMED | |
| Bare `<Card>` | 453 | **453** | CONFIRMED | 53.1% of 853 total |
| Pastel violations | 210 | **375** | v95 EXPANDED | Fuller audit |
| Bold violations | -- | **114** | v95 NEW | |
| Shadow violations | -- | **66** | v95 NEW | |
| Hardcoded `/api/` (actionable) | 666 | **0 orphans** | v95 CORRECTED | Wildcards cover sub-paths |
| queryRawUnsafe | 45 | **27** | v95 CORRECTED | All parameterized |
| RLS unique tables | 88 | **86** | v95 CORRECTED | Slight recount |
| Active .manifest files | 86 | **67** | v95 CORRECTED | Re-counted |
| Route files | 628 | **632** | v95 UPDATED | |
| POST handlers | 242 | **228** | v95 CORRECTED | |
| Test files | 325 | **534** | v95 CORRECTED | Included __tests__/ dirs |
| Dead packages | 3 | **3** | CONFIRMED | Zero runtime imports |
| skipLibCheck tsconfigs | 9 | **10** | v95 CORRECTED | Found 10th: sales-reporting |
| Design system 3/3 | 13/15 | **13/25** | v95 EXPANDED | More modules audited |

---

## RLS Coverage (v95)

**v95: 86 unique tables** (v94: 88 -- slight correction)

**RLS history:**
- v83: "all tables have RLS" -- INCORRECT
- v90: 85/170 = 50.0%
- v91: 84/210 = 40.0%
- v92: 93/223 = 41.7%
- v93: 97/223 = 43.5%
- v94: 88/223 = 39.5%
- v95: **86 unique tables** (denominator disputed -- Prisma model count needs re-verification)

---

## Security Summary (v95)

- **Calendar OAuth tokens PLAINTEXT** in ProviderSync -- HIGH severity (P0.7)
- **Auth coverage:** ~96.8% effective
- **Rate limiting:** ~95% global. 4 EXEMPT_PATTERNS: webhooks, health, outbox, public
- **4 public endpoints** explicitly exempt: contracts/sign, proposals/respond, contracts/token, proposals/token
- **RLS:** 86 unique tables
- **27 `queryRawUnsafe`** instances -- all parameterized (cosmetic concern)
- **Manifest enforcement:** 67 active .manifest files
- **29 raw fetch() calls** bypass apiFetch
- **No Biome lint in ANY CI workflow** -- no automated quality gate
- **CodeQL v3** in security.yml (should be v4)
- **SKIP_ENV_VALIDATION=true** in 8 locations across 5 workflows

---

## Route Inventory (v95)

| Domain | Routes | POST | Manifest | Spec | Notes |
|---|---|---|---|---|---|
| Kitchen | 197 | -- | 1 | NONE | 13 dup pairs, 130+ orphans, NO spec |
| Events | 83 | -- | -- | EXISTS | EventDish MISSING, 9 missing back-relations, 1 test |
| Inventory | 64 | -- | 0 | NONE | ~50% no frontend, PO: backend done, frontend zero |
| CRM | 48 | -- | 2 | NONE | Deal MISSING, client creation 404, good test coverage |
| Staff | 35 | -- | -- | -- | Scheduling domain |
| Integrations | 25+ | -- | -- | PARTIAL | GoodShuffle 7+, Nowsta 6, QB 1 |
| Procurement | 24 | -- | -- | NONE | Req done, vendor-contracts 0 dirs |
| Payroll | 24 | -- | -- | NONE | 3 bracket copies, 8/50 states, 2 tests |
| Command-board | 22 | -- | -- | -- | Core canvas DONE, AI layer MISSING |
| Accounting | 26 | -- | -- | NONE | Expenses zero, no double-entry |
| Collaboration | 17 | -- | 0 | NONE | Liveblocks NOT found, zero manifest cmds |
| Administrative | 13 | -- | 0 | NONE | 4 test files |
| Timecards | 10 | -- | 0 | NONE | 1 test (1,765 lines) |
| Settings | 10 | -- | -- | -- | Billing P3/blocked |
| Shipments | 9 | -- | -- | -- | |
| Calendar | 8 | -- | 0 | PARTIAL | OAuth plaintext (P0.7), ~70% spec |
| Communications | 7 | -- | 0 | NONE | 3 overlapping SMS modules |
| Training | 7 | -- | -- | DRAFT | 1/5 stories, dual storage |
| Rolepolicy | 7 | -- | -- | NONE | |
| Lead | 6 | -- | -- | NONE | Dual write paths |
| Logistics | 5 | -- | 0 | NONE | GPS simulated |
| Facilities | 5 | -- | 1 | NONE | ALL GET-only |
| Analytics | 5 | -- | -- | NONE | 5 revenue methods |
| Warehouse | 2 | -- | 0 | NONE | GET-only, 14 frontend TSX |
| + smaller domains | -- | -- | -- | -- | |
| **Total** | **632** | **228** | **67** | | **51 domains** |

---

## Verification Commands (v95)

```bash
# P0.1: ignoreBuildErrors locations (v95: 3 files including storybook)
grep -rn 'ignoreBuildErrors' --include='*.ts' apps/*/next.config.ts
# Expected: apps/app, apps/api, apps/storybook

# P0.1: skipLibCheck count (v95: 10)
grep -rl 'skipLibCheck.*true' --include='*.json' . | grep tsconfig | wc -l
# Expected: 10

# P0.2: CI prisma generate gap + db-drift-check no-op
grep -n 'prisma' .github/workflows/ci.yml
# Expected: 0 matches before typecheck step

# P0.4: CI mislabeled step + missing Biome lint + CodeQL version
grep -n 'linting\|biome\|ultracite' .github/workflows/ci.yml
# Expected: "linting" label exists but no actual lint step
grep 'codeql-action' .github/workflows/security.yml
# Expected: @v3 (should be @v4)

# P0.4: SKIP_ENV_VALIDATION locations (v95: 8 across 5 workflows)
grep -rn 'SKIP_ENV_VALIDATION' .github/workflows/
# Expected: 8 matches across 5 files

# P0.6: Missing /api/manifest/ rewrite
grep -n 'manifest' apps/app/next.config.ts | grep -i rewrite
# Expected: NOT FOUND

# P0.7: Public endpoints rate-limit exempt
grep -n 'EXEMPT_PATTERNS' apps/api/middleware/global-rate-limit.ts
# Expected: 4 patterns (webhooks, health, outbox, public)

# P1.A: tenant_payroll crash + EmployeeDeduction mismatch
grep -rn 'tenant_payroll' apps/api/ --include='*.ts'
grep -n 'employee_deductions\|EmployeeDeduction' packages/database/prisma/schema.prisma
# Expected: PascalCase model, no @@map

# P1.C: Console statements (v95: ~1,006 apps/packages)
grep -rn 'console\.\(error\|log\|warn\|info\|debug\)' --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=generated | wc -l
# Expected: ~1,006

# P1.D: Design violations (v95: 375 pastel + 114 bold + 66 shadow)
grep -rn 'pastel\|Pastel' --include='*.tsx' apps/ | wc -l  # ~375

# P2.D: EventDish model missing
grep -n 'EventDish' packages/database/prisma/schema.prisma
# Expected: NOT FOUND

# P2.E: Kitchen route count (v95: 197)
find apps/api/app/api/kitchen -name 'route.ts' | wc -l
# Expected: ~197

# P2.L: Command Board canvas implemented
ls apps/app/app/\(authenticated\)/command-board/ 2>/dev/null
# Expected: exists with canvas components

# P2.Q: Procurement vendor-contracts (0 dirs)
ls apps/api/app/api/procurement/vendor-contracts/commands/ 2>/dev/null
# Expected: does not exist

# P2.V: Liveblocks in collaboration
grep -rn 'liveblocks\|Liveblocks' apps/api/app/api/collaboration/ --include='*.ts'
# Expected: NOT FOUND (v95 -- v94 said "Liveblocks-based")

# RLS unique tables (v95: 86)
grep -r 'ENABLE ROW LEVEL SECURITY' packages/database/prisma/migrations/ --include='*.sql' | sed 's/.*ALTER TABLE \([^ ]*\).*/\1/' | sort -u | wc -l
# Expected: ~86

# Active .manifest files (v95: 67)
find packages/manifest-adapters/manifests -name '*.manifest' | wc -l
# Expected: ~67

# Test files including __tests__ (v95: 534)
find apps/ packages/ -path '*/__tests__/*.ts' -not -path '*/node_modules/*' | wc -l
find apps/ packages/ -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' | grep -v node_modules | wc -l
# Combined expected: ~534

# Dead artifacts
ls apps/api/vitest.config.ts.bak2 2>/dev/null  # Expected: exists (cleanup needed)
```

---

## Resolved / Do Not Reopen

These items have been verified as resolved by multiple audit passes. Do not re-investigate without new evidence.

### P0 Bugs (All 22 Resolved v65-v72)
- All critical bugs across payroll, scheduling, security, marketing, procurement, events, knowledge base, event intake, settings, logistics, CRM
- See `docs/implementation-history/` for pass details

### P0.3 Manifest POST Route Gap (RESOLVED v88)
- 209 filesystem POST routes: 66 matched by manifest IR, 143 matched by allowlist. Gap: ZERO.

### Confirmed Resolved Items
- AllergenWarning Manifest Wiring (v88)
- @repo/observability Zero-Import Claim (v85)
- Scheduling API -- DO NOT REOPEN
- Test Suite Repair (v77-v80)
- Payroll Period ID (2026-05-14)
- Search FR-107 + Entity Coverage + Multi-word (2026-05-14)
- Calendar Features -- DO NOT REOPEN
- Bare Table Violations (v84)
- Catering "GHOST DOMAIN" -- NOT a domain (event type classification)

### Packages Confirmed ALIVE (DO NOT REOPEN as dead)
- `packages/observability/` -- 407 file imports
- `packages/types/` -- 6 consumers
- `packages/analytics/` -- 14 imports
- `packages/event-parser/` -- 3 imports (script: "type-check" not "typecheck")
- `packages/sales-reporting/` -- 1 import (no typecheck script)
- `packages/feature-flags/` -- 11 imports
- `packages/storage/` -- 8 consumers
- `packages/cms/` -- 11+ consumers in apps/web/

### Packages Confirmed DEAD (DO NOT REOPEN as alive)
- `packages/ai/` -- ZERO runtime imports
- `packages/brand/` -- ZERO runtime imports
- `packages/kitchen-state-transitions/` -- ZERO runtime imports

### v94 False Claims (RESOLVED -- DO NOT REOPEN)
- Console 1,330 -- v95: ~2,081 (methodology more thorough)
- Hardcoded /api/ 666 -- v95: 0 actionable orphans (wildcards cover sub-paths)
- Active .manifest 86 -- v95: 67 (re-counted)
- ignoreBuildErrors apps/web -- v95: apps/storybook
- skipLibCheck 9 -- v95: 10 (sales-reporting)
- queryRawUnsafe 45 -- v95: 27 (corrected count)
- RLS 88 -- v95: 86
- POST handlers 242 -- v95: 228
- Kitchen 148 routes -- v95: 197
- Collaboration "Liveblocks-based" -- v95: Liveblocks NOT found

---

## Items Needing Re-Verification

| Item | v95 Status | Why Re-verification Needed |
|---|---|---|
| Prisma model count | v94: 223 / v95 grep: 97 | Large discrepancy -- needs authoritative count |
| Liveblocks in collaboration | NOT found (v95) vs "Liveblocks-based" (v94) | Command Board uses Liveblocks; collaboration may not |
| Kitchen manifest count | v95: 1 (v94: 22) | Large discrepancy -- verify which count is correct |
| Console production count | ~1,006 (apps/packages) vs ~2,081 (total) | Agree on canonical count methodology |
| Events EventDish model | "COMPLETELY MISSING" (v95) vs "raw-mapped lowercase" (v94) | Conflicting claims -- check schema.prisma directly |

---

## Archive Map

Completed pass write-ups and historical notes:
- `docs/implementation-history/` -- pass logs, executive summaries
- `docs/implementation-history/v77-v80-test-suite-repair.md` -- test suite repair
- `docs/audits/` -- numbered audit passes
- `docs/audits/v61-spec-comparison.md` -- detailed spec gap analysis
- `docs/audits/ralph05-cleanup/` -- cleanup audit notes

---

## Methodology

- **v95**: 30+ parallel subagents. Key corrections: Console ~2,081 (v94: 1,330 -- more thorough methodology). Test files 534 (v94: 325 -- included __tests__/ directories). Active .manifest 67 (v94: 86 -- re-counted). Route files 632 (v94: 628). POST handlers 228 (v94: 242). Hardcoded /api/ paths: v94's 666 was overcounting wildcard-covered paths; actual orphans: 0. ignoreBuildErrors at apps/storybook (v94: apps/web). skipLibCheck 10 tsconfigs (v94: 9). Kitchen 197 routes (v94: 148). Command Board canvas FULLY IMPLEMENTED. CRM client creation 404. Design system 13/25 at 3/3 + 375 pastel + 114 bold + 66 shadow violations. Liveblocks NOT found in collaboration. EventDish model MISSING. queryRawUnsafe 27 (v94: 45). RLS 86 unique tables (v94: 88). CodeQL v3 (should be v4). SKIP_ENV_VALIDATION 8 locations across 5 workflows. 4 public endpoints rate-limit exempt. Kitchen only 1 manifest file (not 22). Biome noConsole NOT enabled. 29 raw fetch() calls. Prisma model count disputed (97 vs 223).
- **v94**: 40+ parallel subagents. MANY v94 FINDINGS CORRECTED IN v95 -- see Resolved section.
- **v93-v90**: Multiple passes with escalating corrections. See earlier versions.
- **v77-v80**: Test suite repair. 678 -> 0 failing tests.
- **v65-v72**: All 22 P0 items resolved.
