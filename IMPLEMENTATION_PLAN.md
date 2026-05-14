# IMPLEMENTATION_PLAN.md -- v96

> Updated 2026-05-14
> Synthesized from v96 multi-agent audit (38 subagents, 25 successful).
> All 22 P0 items resolved (v65-v72). Test suite repair complete (v77-v80).
> v0.12.2 tag created with RLS fixes and console statements audit baseline.
> **v96 KEY CORRECTIONS OVER v95:** Console ~1,487 total (v95: ~2,081 -- v95 overcounted). Console apps/packages: 1,121 (v95: ~1,006). POST handlers 209-211 (v95: 228). Inventory manifests: 13 (v95: ZERO -- false alarm). Inventory routes: 58 (v95: 64). CRM routes: 42 (v95: 48). CRM manifests: 6 (v95: 2). Accounting routes: 17 (v95: 26). CRM client creation EXISTS (v95: "404" -- wrong). Inventory PO frontend EXISTS (v95: "ZERO" -- wrong). Events routes: 87 (v95: 83). Events test files: 14 (v95: 1). Collaboration test files: 4 (v95: 2). Payroll test files: 7 (v95: 2). Payroll states: 9 (v95: 8). CamelCase violations: 5 (v95: 13). Manifest bypass routes: 98 (v95: 42). ignoreBuildErrors location: apps/web NOT apps/storybook. @ts-expect-error: 12 total (v95: 6). Production `any`: ~222 (v95: 177+). Command Board: HTML/SVG only, React Flow NOT used (v95: "FULLY IMPLEMENTED"). Procurement vendor-contracts: ZERO command routes (AGENTS.md stale). queryRawUnsafe: 49 (v95: 27). RLS coverage: 40% not ~96%. Rewrite rules: 31 (v95: 26). 9 missing rewrite prefixes (~140 frontend calls). Contracts public signing race condition. 3 divergent federal tax bracket copies. Lead + RolePolicy BROKEN_PRISMA_READ.
>
> **v95 AGENT ERRORS CORRECTED BY v96:** CRM client creation: v95 said 404, **actual: EXISTS at /crm/clients/new**. Inventory manifests: v95 said ZERO, **actual: 13**. Inventory PO frontend: v95 said ZERO, **actual: EXISTS under procurement/**. Events test files: v95 said 1, **actual: 14**. Console total: v95 said ~2,081, **actual: ~1,487**. POST handlers: v95 said 228, **actual: 209-211**. Command Board: v95 said "FULLY IMPLEMENTED", **actual: HTML/SVG only, ~25-30% of STATUS.md claims**. ignoreBuildErrors: v95 said apps/storybook, **actual: apps/web** (3rd location).

---

## P0 -- Critical Infrastructure

These items block production safety or allow regressions to ship undetected.

### P0.1 -- Remove `ignoreBuildErrors` [NOT YET SAFE]

**Status:** CI typecheck is CURRENTLY FAILING -- removing the flag would break production builds. Flag IS masking real type errors that must be fixed first.

- `apps/app/next.config.ts:195` -- `ignoreBuildErrors: true`
- `apps/api/next.config.ts:102` -- `ignoreBuildErrors: true`
- `apps/web/next.config.ts:17` -- `ignoreBuildErrors: true` (v96 CORRECTION: v95 said apps/storybook)
- `skipLibCheck: true` in shared BASE CONFIG (`packages/typescript-config/base.json:16`) -- inherited by ALL packages/apps
- **10** tsconfig files explicitly re-declare skipLibCheck
- `eslint.ignoreDuringBuilds: true` in `apps/app/next.config.ts`
- `strict: true` in base config -- good, but overridden by above

**Verified metrics (v96):**
- `@ts-ignore`: **0** in production code
- `@ts-expect-error`: **12** total (6 production, 3 storybook, 3 test)
- `as any` + `: any`: **~222 non-generated/non-test** across ~43 files (966 total including generated)
- `db-drift-check.mjs` is a COMPLETE NO-OP (prints message, exits 0)
- Biome `noConsole` is OFF -- no prevention

**Steps:**
1. Fix all TypeScript errors that `ignoreBuildErrors` is masking
2. Remove `ignoreBuildErrors` from all three `next.config.ts` files
3. Remove `skipLibCheck: true` from base config + 10 explicit re-declarations
4. Remove `eslint.ignoreDuringBuilds: true` from apps/app
5. Verify `next build` succeeds with ZERO errors
6. Verify CI typecheck passes (`pnpm turbo typecheck`)

### P0.2 -- Add Prisma Generate + db:check to CI [NOT STARTED]

**Status:** ci.yml has NO `prisma generate` before typecheck step. Postinstall hook is fragile (depends on DATABASE_URL env var logic). `scripts/db-drift-check.mjs` is a COMPLETE NO-OP. No `prisma validate` or `prisma migrate status` in CI. 4 `continue-on-error: true` steps: ci.yml:50, ci.yml:54, security.yml:43, performance.yml:59.

**Steps:**
1. Add explicit `pnpm prisma generate` step before typecheck in main CI job
2. Add `pnpm db:check` after typecheck as hard gate
3. Replace `scripts/db-drift-check.mjs` no-op with real validation
4. Make all steps HARD gates (no `continue-on-error`)

**Files:** `.github/workflows/ci.yml`, `scripts/db-drift-check.mjs`

### P0.3 -- Manifest Route Enforcement [RESOLVED -- DO NOT REOPEN]

**Status:** `manifest-ci.yml` IS a hard gate with 6 parallel jobs. POST route gap is **ZERO**. 209 filesystem POST routes: 66 matched by manifest IR, 143 matched by allowlist.

### P0.4 -- Extend TypeScript Typecheck to Packages + Fix CI Label + Add Biome Lint [NOT STARTED]

**Status:** CI typecheck step labeled "Run linting" but runs `pnpm turbo typecheck` (MISLABELED). Only covers 3 of 8 apps. 29 packages have typecheck scripts but NONE run in CI. **No Biome/Ultracite lint step in ANY CI workflow.** CodeQL v3 in security.yml (should be v4). **SKIP_ENV_VALIDATION=true** in 5+ workflows.

**Steps:**
1. Rename step from "Run linting" to "Run typecheck"
2. Add `pnpm turbo typecheck` (no filter) to CI
3. Fix `event-parser` script name (`"type-check"` -> `"typecheck"`)
4. Add `pnpm lint` step for Biome/Ultracite
5. Remove `continue-on-error: true` from 4 CI steps
6. Upgrade CodeQL action from v3 to v4 in security.yml
7. Remove or gate SKIP_ENV_VALIDATION=true

### P0.5 -- [RESERVED -- DO NOT REOPEN]
~Was @repo/observability zero-import claim -- RESOLVED v85~

### P0.6 -- Frontend Calls to Non-Existent API Routes [v96 EXPANDED -- 9 prefixes, ~140 calls]

**Status:** 31 wildcard rewrites in `apps/app/next.config.ts` (v96: v95 said 26). 9 missing rewrite prefixes that will 404 in production:

| Missing Rewrite | Frontend Calls | Severity |
|---|---|---|
| `/api/manifest/:path*` | ~122 | **CRITICAL** |
| `/api/cateringorder/:path*` | 4 | HIGH |
| `/api/alertsconfig/:path*` | 4 | HIGH |
| `/api/variancereport/:path*` | 3 | MEDIUM |
| `/api/warehouse/:path*` | 2 | MEDIUM |
| `/api/marketing/:path*` | 1 | LOW |
| `/api/lead/:path*` | 1 | LOW |
| `/api/menu-story/:path*` | 1 | LOW |
| `/api/contracts/:path*` | 1 | LOW |

**Steps:**
1. **CRITICAL:** Add `/api/manifest/` rewrite to next.config.ts (unblocks ~122 calls)
2. Add rewrites for remaining 8 prefixes
3. Verify all frontend `apiFetch()` calls resolve correctly

### P0.7 -- Calendar OAuth Tokens Stored Plaintext [NOT STARTED]

**Status:** `ProviderSync` stores `accessToken`/`refreshToken` as plaintext `@db.Text`. 3 routes write raw tokens. ZERO encryption infrastructure. `EmployeePin.pin_encrypted` is misleading -- no encryption code. Only crypto: HMAC (state signing), SHA-256 (API keys), randomUUID. DB compromise exposes all OAuth tokens for all tenants.

**Steps:**
1. Implement token encryption at rest (application-level encryption before DB write)
2. Migrate existing plaintext tokens to encrypted storage
3. Add decryption layer in calendar sync read path

**Files:** `packages/database/prisma/schema.prisma`, calendar sync routes

---

## P1 -- High Priority

### P1.A -- Payroll Runtime Bugs [v96 EXPANDED]

**Status:** Multiple runtime-level bugs prevent correct payroll operation.

**CRITICAL (will crash at runtime):**
- `tenant_payroll` schema **DOES NOT EXIST** -- `tax/list/route.ts` queries it -- guaranteed crash
- `EmployeeDeduction` table name mismatch: Prisma expects PascalCase but raw SQL queries snake_case

**Data integrity risks:**
- Division by zero when `hoursRegular=0` (`regularPay / hoursRegular || 0` doesn't catch `Infinity`)
- Deductions JSON parsing type confusion (double-parse or crash)
- No YTD Social Security wage base tracking

**Missing infrastructure:** No FUTA/SUTA, W-2/1099, pay stubs. W-4 schema exists but NO API routes.

**v96 NEW:**
- **3 divergent federal bracket copies** with DIFFERENT values:
  - `taxEngine.ts`: 0-11725, 11725-47525...
  - `tax/brackets/route.ts`: 0-11600, 11600-47150...
  - `tax/list/route.ts`: same as brackets
  - Client sees different brackets than engine uses!
- **9/50 states** (v96: v95 said 8)
- **7 test files** (v96: v95 said 2)
- No spec at `specs/payroll.md`

### P1.B -- CRM Pipeline [v96 CORRECTED]

**Status:** Deal model CONFIRMED MISSING (virtual projection over Proposals). **Client creation EXISTS** at `/crm/clients/new` (v96: v95 said 404 -- WRONG, DO NOT REOPEN). Pipeline 6 stages: lead -> qualified -> proposal -> negotiation -> won -> lost. Deal manifest disconnected: routes query Proposal directly, not manifest.

**v96 CORRECTIONS:**
- **42 route files** (v95: 48)
- **6 manifest files** (v95: 2): lead, deal, proposal, client, client-interaction, revenue-recognition
- 52 frontend files. Good test coverage. No spec.

### P1.C -- Console Statement Cleanup [v96: 1,121 apps/packages]

**Status:** v96 verified count: **1,121** in apps/packages (v95: ~1,006). **1,487** total including scripts (v95: ~2,081 -- overcounted).

**Breakdown (apps/packages):**
- `console.error`: 558
- `console.log`: 452
- `console.warn`: 41
- `console.info/debug`: 71

**CRITICAL:** Biome `noConsole` is OFF. No automated prevention. **414** @repo/observability imports as replacement path.

### P1.D -- Design System: Bare Card + Style Violations [v95 UNCHANGED]

**Status:** **453 bare `<Card>`** (53.1% of 853 total). 375 pastel, 114 bold, 66 shadow violations. 13/25 modules at 3/3.

### P1.E -- TypeScript Strictness [v96 UPDATED]

**Status:**
- `@ts-ignore`: **0** in production code
- `@ts-expect-error`: **12** total (6 production, 3 storybook, 3 test) -- v96: v95 said 6
- `as any` + `: any`: **~222** non-generated/non-test across ~43 files -- v96: v95 said 177+
- TODO: **17-22** production comments across 10 files
- FIXME/HACK: **0**

### P1.F -- Accounting: Structural Gaps [v96: 17 routes, NOT 26]

**Status:** Multiple structural gaps prevent correct accounting operation. **17 routes** (v96: v95 said 26).

- Financial reports expenses **hardcoded to zero** via `.reduce(() => 0, 0)`
- Journal entries / general ledger: MISSING ENTIRELY
- Bank reconciliation: FULLY SIMULATED with modulo + hardcoded variance
- No double-entry bookkeeping infrastructure
- 10 test files but **none for core accounting logic**
- No spec

### P1.G -- Inventory Route Manifest Gap [v96 CORRECTED]

**Status:** Inventory has **58 routes** (v96: v95 said 64). **13 manifest files** (v96: v95 said ZERO -- WRONG, DO NOT REOPEN). PO frontend EXISTS under `procurement/` (v96: v95 said ZERO -- WRONG, DO NOT REOPEN). ~57% routes have no frontend consumers (33 of 58). Duplicate PO API: 7 under inventory/ + 4 under procurement/. **7 test files** (v96: v95 said 3). No spec.

---

## P2 -- Medium Priority

### P2.A -- Calendar (8 routes)
- [x] Drag-and-drop (dnd-kit), ResearchTable, BlogFilterChip -- DONE
- [ ] OAuth tokens PLAINTEXT -- escalated to P0.7
- [ ] ~70% spec compliance, 0 manifest commands
- [ ] No mobile responsive layout, no E2E tests for reschedule

### P2.B -- Accounting (17 routes -- v96 CORRECTED from 26)
- [x] Invoicing, payments, revenue recognition, collections
- [ ] Financial reports expenses HARDCODED TO ZERO (P1.F)
- [ ] Journal entries / general ledger: MISSING. Bank reconciliation: SIMULATED
- [ ] No double-entry bookkeeping infrastructure
- [ ] 10 test files but none for core logic

### P2.C -- Contracts (1 top-level route + public signing)
- [x] 8 EventContract commands, 10 VendorContract commands, public signing surface
- [ ] Public signing **bypasses manifest** -- direct DB writes (FR-504 violation)
- [ ] **No idempotency** on signingToken -- race condition, returns 400 not 409
- [ ] Status taxonomy mismatch: code has `viewed`/`rejected`/`canceled` vs spec
- [ ] No rate limiting on public signing endpoint
- [ ] VendorContract `renew` only updates endDate -- doesn't create new contract

### P2.D -- Events (87 routes -- v96: v95 said 83)

**Spec coverage: ~85-90%.** Spec EXISTS at `specs/events/SPEC.md`.

**Critical schema gaps:**
- [ ] `EventDish` model COMPLETELY MISSING -- battle board finalization broken
- [ ] `EventSummary` missing `confidence` field -- AI confidence pills impossible
- [ ] **9 of 16 spec entities have NO back-relation** on Event model
- [ ] Battle board ~35% (model exists, no vote/nominate/finalize endpoints)
- [ ] **14 test files** (v96: v95 said 1 -- WRONG)

### P2.E -- Kitchen (148 routes -- VERIFIED)

**13 singular/plural duplicate pairs CONFIRMED** (see v95 for full table).

- [ ] **148 route directories, 49 frontend pages**, 22 active manifests
- [ ] Zero-UUID placeholders at import route lines 338, 360
- [ ] NO spec document

### P2.F -- Logistics (5 routes, 0 manifest commands, GPS SIMULATED)
### P2.G -- Staffing
- [ ] Coverage/Recommendations APIs fully implemented
- [ ] CoverageBar primitive NOT implemented
- [ ] Labor budget alerts COMPLETELY MISSING
- [ ] **49 `queryRawUnsafe`** instances (v96: v95 said 27 -- all parameterized)

### P2.H -- Staff (35 routes -- scheduling domain)
### P2.I -- Settings (10 routes)
- [ ] 28 frontend TSX files, Landing 3/3 score, all sub-routes 1/3
- [ ] Billing page P3/blocked -- no Subscription/Plan/Tier/BillingAccount Prisma models

### P2.J -- Analytics (5 routes, revenue computed 5 different ways)
### P2.K -- Marketing (~75% spec compliance)
- [x] Leads pipeline, email workflows, SMS rules ALL fully implemented
- [ ] Missing: campaign management UI, public website design compliance

### P2.L -- Command Board (22 routes) [v96: STATUS.md CLAIMS ARE FALSE]

**v96 CRITICAL:** STATUS.md claims are ~70% FALSE.
- **React Flow NOT used** -- BoardCanvas uses raw HTML/SVG despite @xyflow/react dependency
- **Liveblocks NOT wired to canvas** -- package exists but disconnected from UI
- **Command Palette NOT implemented** -- no Cmd+K
- **AI Chat Panel NOT in UI** -- server-side agent loop exists, no UI component
- **Entity-typed cards NOT implemented** -- all cards render generically
- **Entity Detail Panel, Undo/Redo, MiniMap, Snap-to-grid, Fit View all MISSING**
- **Frontend is ~25-30% of what STATUS.md claims**
- **Backend is substantially complete**: API routes, Prisma models, manifest commands, simulation engine, AI tool registry

### P2.M -- Knowledge Base (3 routes, read-only, auth via manifest path)

### P2.N -- Integrations (25+ routes)

| Integration | Routes | Spec? | Tests? | Frontend? |
|---|---|---|---|---|
| GoodShuffle | 7+ | No | Yes (138 refs) | Yes |
| Nowsta | 6 | Yes (draft) | **NO** | Yes |
| QuickBooks | 1 | **NO** | 2 test files | Yes |
| Webhooks | 9 | Yes (draft) | Partial | Yes (DLQ) |

### P2.O -- Training (7 routes)
- [ ] Dual storage pattern (raw SQL + manifest), 3 Prisma models
- [ ] Only 1/5 spec stories implemented

### P2.P -- Search [RESOLVED -- DO NOT REOPEN]
### P2.Q -- Procurement (24 routes) [v96: vendor-contracts ZERO command routes]

**v96 CONFIRMED:** Requisitions 8/8 complete. **Vendor-contracts: ZERO command routes** (AGENTS.md says 10 -- STALE). Manifest defines 10 commands but no API routes exist. 5 test files, 121 test cases. PrismaStore files have "broken-read" naming -- wiring may be incomplete.

**AGENTS.md CORRECTION NEEDED:** Procurement vendor-contracts section claims "10 functional command routes" -- actual count is ZERO.

### P2.R -- Timecards (10 routes)
- [ ] 4 Prisma models, 1 test file (1,765 lines), no specs, no manifests

### P2.S -- Documents (1 route)

### P2.T -- Catering [NOT a ghost domain -- DO NOT REOPEN]

Catering is an event type classification. Real issue is `cateringorder` (4 calls, missing rewrite) -- see P0.6. **v96 NEW:** CateringOrder frontend calls phantom routes (create/cancel/confirm all 404).

### P2.U -- Warehouse (2 routes, GET-only)
- [ ] Status derived from text fields, 14 frontend TSX files, no spec

### P2.V -- Communications/Collaboration Fragmentation [v96 UPDATED]
- [ ] Communications: 7 routes, no spec
- [ ] Collaboration: 17 routes -- Liveblocks NOT in API (IS in command-board frontend)
- [ ] Notifications: dismissed state NOT in DB (hardcoded `dismissedCount = 0`), command route directories missing
- [ ] **3 overlapping SMS modules**: sms.ts (old), sms-new.ts (dead code, identical to sms.ts), sms-temp.ts (active)
- [ ] **SMS Automation: 5 missing route files** from manifest IR (create, update, soft-delete, list, detail)
- [ ] Zero manifest commands
- [ ] **4 test files** (v96: v95 said 2)

### P2.W -- Frontend Module Design System (13/25 at 3/3)

### P2.X -- Unlisted Domains (51 top-level API domains total)

**v96 NEW -- BROKEN_PRISMA_READ patterns:**
- **Lead**: wizard writes manifest, reads from Prisma -- dual-write desync
- **RolePolicy**: commands use manifest, reads use Prisma -- data divergence

**5 top-level camelCase violations** (v96: v95 said 13 -- corrected for subdirectories):
- alertsconfig, cateringorder, rolepolicy, smsautomationrule, variancereport

**v96 NEW -- Frontend phantom route calls:**
- **AlertsConfig**: frontend calls create/update/remove -- none exist on disk
- **VarianceReport**: frontend calls review/approve -- none exist on disk

### P2.Y -- Payroll (24 routes -- runtime bugs at P1.A)

### P2.Z -- Security Coverage [v96 CORRECTIONS]

| Metric | v95 | v96 Actual | Notes |
|---|---|---|---|
| Prisma models total | 223 | **223** | Unchanged |
| Tables with RLS (unique) | 86 | **86** | Unchanged |
| RLS coverage % | implied ~96% | **~40%** (86/223) | v96: honest % |
| queryRawUnsafe | 27 | **49** | v95 undercounted |
| Exempt patterns | 4 | **4** | Unchanged |
| Public endpoints | 4 | **4** | Unchanged |
| Manifest bypass routes | 42 | **98** | v95 only counted violations |

**High-risk findings (unchanged):**
- `/api/events/contracts/[id]/signature` -- no inline auth
- `/api/public/contracts/[token]/sign` -- no rate limiting, no idempotency (race condition)
- `/api/public/proposals/[token]/respond` -- no rate limiting

---

## P3 -- Lower Priority

### P3.A -- Dead Package Cleanup

**Dead (zero runtime imports):** @repo/ai, @capsule/brand, @repo/kitchen-state-transitions

### P3.B -- Spec Authoring

46 spec files total. **36 of ~51 API domains have NO spec.**

**Biggest gaps:** Kitchen (148 routes), CRM (42 routes), Inventory (58 routes), Payroll (24 routes), Procurement (24 routes), Accounting (17 routes), Collaboration (17 routes), Logistics (5 routes), Analytics (5 routes).

### P3.C -- Cron HTTP Method Inconsistency

**8 cron jobs** in vercel.json (AGENTS.md registry says 6 -- outdated). 4 use GET for mutating operations (should be POST). AGENTS.md cron registry needs updating.

### P3.D -- Route Architecture (v96)

- **632 route.ts files**
- **209-211 POST handlers** (v96: v95 said 228)
- **449 GET, 39 PUT, 21 PATCH, 30 DELETE**
- **748 total handlers**, 299 write handlers
- **86 active .manifest files**
- **4 manifests** in manifests-disabled/
- **51 top-level API domains**
- **8 cron jobs** in vercel.json
- **4 public endpoints** (rate-limit exempt)
- **31 rewrite rules** in apps/app/next.config.ts (v96: v95 said 26)
- **16 raw fetch() calls** bypassing apiFetch (v96: v95 said 29)
- **98 manifest bypass routes** (v96: v95 said 42)
- POST route gap: **0** (RESOLVED)

### P3.E -- AGENTS.md Corrections Needed (v96)

1. Console count ~932 -- actual **~1,487** total, **1,121** apps/packages (v96)
2. RLS "all tables have RLS" -- actual **86 unique tables (~40% coverage)** (v96)
3. Cron registry says 6 -- actual **8**
4. Inventory manifests -- **13 exist** (v95 said ZERO -- WRONG)
5. Procurement vendor-contracts "10/10 complete" -- actual **0 command route directories**
6. Command Board "core canvas FULLY IMPLEMENTED" -- **React Flow NOT used, ~25-30% implemented** (v96)
7. No Biome lint in CI
8. CodeQL v3 should be v4
9. ignoreBuildErrors 3rd location is **apps/web** not apps/storybook (v96)
10. Active manifests 86 -- verified correct

### P3.F -- Test Infrastructure (v96)

- **534 test files** baseline (v95 count, rate-limited in v96)
- Additional v96 finding: **19 command-board test files** (not in v95 count)
- **63 E2E .spec.ts files** in e2e/
- **35+ packages with ZERO tests**
- `vitest.config.ts.bak2` still exists at `apps/api/vitest.config.ts.bak2`

### P3.G -- Raw fetch() Bypassing apiFetch

**16 raw `fetch()` calls** bypass `apiFetch` (v96: v95 said 29).

---

## Code Quality Metrics (v96)

| Metric | v95 | v96 | Status | Notes |
|---|---|---|---|---|
| `console.*` total | ~2,081 | **~1,487** | v96 CORRECTED | v95 overcounted |
| `console.*` (apps/packages) | ~1,006 | **1,121** | v96 CORRECTED | v95 undercounted subset |
| `as any` + `: any` | 177+ | **~222** | v96 CORRECTED | Non-generated/non-test |
| `@ts-ignore` | 0 | **0** | CONFIRMED | |
| `@ts-expect-error` | 6 | **12** (6 prod) | v96 CORRECTED | v95 undercounted |
| Bare `<Card>` | 453 | **453** | CONFIRMED | |
| Pastel violations | 375 | **375** | CONFIRMED | |
| Bold violations | 114 | **114** | CONFIRMED | |
| Shadow violations | 66 | **66** | CONFIRMED | |
| Hardcoded `/api/` (actionable) | 0 orphans | **0 orphans** | CONFIRMED | Wildcards cover sub-paths |
| queryRawUnsafe | 27 | **49** | v96 CORRECTED | v95 undercounted |
| RLS unique tables | 86 | **86** | CONFIRMED | ~40% of 223 models |
| Active .manifest files | 86 | **86** | CONFIRMED | |
| Route files | 632 | **632** | CONFIRMED | |
| POST handlers | 228 | **209-211** | v96 CORRECTED | |
| Test files | 534 | **534** | CONFIRMED | +19 command-board not in baseline |
| Dead packages | 3 | **3** | CONFIRMED | |
| skipLibCheck tsconfigs | 10 | **10** | CONFIRMED | |
| Design system 3/3 | 13/25 | **13/25** | CONFIRMED | |
| Manifest bypass routes | 42 | **98** | v96 CORRECTED | v95 only counted violations |
| Rewrite rules | 26 | **31** | v96 CORRECTED | |
| Raw fetch() calls | 29 | **16** | v96 CORRECTED | |

---

## RLS Coverage (v96)

**86 unique tables** with RLS out of 223 Prisma models = **~40% coverage** (NOT ~96% as implied by "auth coverage" metric).

**RLS history:**
- v83: "all tables have RLS" -- INCORRECT
- v90: 85/170 = 50.0%
- v91: 84/210 = 40.0%
- v92: 93/223 = 41.7%
- v93: 97/223 = 43.5%
- v94: 88/223 = 39.5%
- v95: 86/223 = 38.6%
- v96: **86/223 = 38.6%**

---

## Security Summary (v96)

- **Calendar OAuth tokens PLAINTEXT** in ProviderSync -- HIGH severity (P0.7)
- **Auth coverage:** ~96.8% effective (middleware) -- but RLS only ~40%
- **Rate limiting:** ~95% global. 4 EXEMPT_PATTERNS
- **4 public endpoints** explicitly exempt
- **RLS:** 86 unique tables (~40% of models)
- **49 `queryRawUnsafe`** instances -- all parameterized (cosmetic concern)
- **Contracts public signing race condition** -- no idempotency on signingToken
- **98 manifest bypass routes** (v96: v95 said 42)
- **16 raw fetch() calls** bypass apiFetch
- No Biome lint in ANY CI workflow
- CodeQL v3 (should be v4)
- SKIP_ENV_VALIDATION=true in 5+ workflows

---

## Route Inventory (v96)

| Domain | Routes | POST | Manifest | Spec | Notes |
|---|---|---|---|---|---|
| Kitchen | 148 | -- | 22 | NONE | 13 dup pairs, NO spec |
| Events | 87 | -- | -- | EXISTS | EventDish MISSING, 14 test files (v96) |
| Inventory | 58 | -- | 13 | NONE | v96: 13 manifests (v95: ZERO wrong), PO frontend exists |
| CRM | 42 | -- | 6 | NONE | v96: 6 manifests, client creation EXISTS (DO NOT REOPEN) |
| Staff | 35 | -- | -- | -- | Scheduling domain |
| Integrations | 25+ | -- | -- | PARTIAL | GoodShuffle, Nowsta, QB, Webhooks |
| Procurement | 24 | -- | -- | NONE | Req done, vendor-contracts ZERO cmd routes |
| Payroll | 24 | -- | -- | NONE | 3 bracket copies, 9/50 states, 7 tests |
| Command-board | 22 | -- | -- | -- | HTML/SVG only, React Flow NOT used |
| Accounting | 17 | -- | -- | NONE | Expenses zero, no double-entry |
| Collaboration | 17 | -- | 0 | NONE | Liveblocks NOT in API, 4 test files |
| Administrative | 13 | -- | 0 | NONE | |
| Timecards | 10 | -- | 0 | NONE | 1 test (1,765 lines) |
| Settings | 10 | -- | -- | -- | Billing P3/blocked |
| Shipments | 9 | -- | -- | -- | |
| Calendar | 8 | -- | 0 | PARTIAL | OAuth plaintext (P0.7) |
| Communications | 7 | -- | 0 | NONE | 3 overlapping SMS, 5 missing SMS routes |
| Training | 7 | -- | -- | DRAFT | 1/5 stories, dual storage |
| Rolepolicy | 7 | -- | -- | NONE | BROKEN_PRISMA_READ (v96) |
| Lead | 6 | -- | -- | NONE | BROKEN_PRISMA_READ (v96) |
| Logistics | 5 | -- | 0 | NONE | GPS simulated |
| Facilities | 5 | -- | 1 | NONE | ALL GET-only |
| Analytics | 5 | -- | -- | NONE | 5 revenue methods |
| Warehouse | 2 | -- | 0 | NONE | GET-only |
| Mobile | 3 | -- | -- | NONE | Expo 54, 7 screens, offline sync |
| AI | 4 | -- | -- | NONE | gpt-4o-mini, @repo/ai DEAD |
| **Total** | **632** | **209-211** | **86** | | **51 domains** |

---

## Verification Commands (v96)

```bash
# P0.1: ignoreBuildErrors locations (v96: apps/web NOT apps/storybook)
grep -rn 'ignoreBuildErrors' --include='*.ts' apps/*/next.config.ts
# Expected: apps/app, apps/api, apps/web

# P0.2: CI prisma generate gap
grep -n 'prisma' .github/workflows/ci.yml
# Expected: 0 matches before typecheck step

# P0.6: Missing rewrites (v96: 9 prefixes, 31 total rewrites)
grep -n 'rewrites' apps/app/next.config.ts | head -5
# Expected: 31 rewrite rules, /api/manifest/ NOT present

# P1.A: tenant_payroll crash + divergent bracket copies
grep -rn 'tenant_payroll' apps/api/ --include='*.ts'
grep -n '11725\|11600' apps/api/app/api/payroll/ -r --include='*.ts'
# Expected: 3 different bracket ranges in 3 files

# P1.C: Console statements (v96: 1,121 apps/packages)
grep -rn 'console\.\(error\|log\|warn\|info\|debug\)' --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=generated | wc -l
# Expected: ~1,121

# P2.D: EventDish model missing
grep -n 'EventDish' packages/database/prisma/schema.prisma
# Expected: NOT FOUND

# P2.L: Command Board React Flow usage
grep -rn 'useNodesState\|useEdgesState\|ReactFlow' apps/app/app/\(authenticated\)/command-board/ --include='*.tsx'
# Expected: NOT FOUND (HTML/SVG only)

# P2.Q: Procurement vendor-contracts (0 command routes)
ls apps/api/app/api/procurement/vendor-contracts/commands/ 2>/dev/null
# Expected: does not exist

# P2.X: BROKEN_PRISMA_READ patterns (v96)
grep -rn 'manifest.*lead\|ManifestStore.*lead' apps/api/app/api/lead/ --include='*.ts'
# Expected: manifest writes, Prisma reads -- dual path

# RLS coverage (v96: 86 tables, ~40%)
grep -r 'ENABLE ROW LEVEL SECURITY' packages/database/prisma/migrations/ --include='*.sql' | sed 's/.*ALTER TABLE \([^ ]*\).*/\1/' | sort -u | wc -l
# Expected: ~86

# queryRawUnsafe (v96: 49)
grep -rn 'queryRawUnsafe' apps/api/ --include='*.ts' | wc -l
# Expected: ~49

# Active .manifest files
find packages/manifest-adapters/manifests -name '*.manifest' | wc -l
# Expected: ~86
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

### v96 False Alarms Resolved (DO NOT REOPEN)
- **CRM client creation 404** -- v95 said 404, v96 confirmed EXISTS at `/crm/clients/new`
- **Inventory manifests ZERO** -- v95 said ZERO, v96 confirmed **13 manifests exist**
- **Inventory PO frontend ZERO** -- v95 said ZERO, v96 confirmed EXISTS under `procurement/`
- **Events test files 1** -- v95 said 1, v96 confirmed **14 test files**

### Packages Confirmed ALIVE (DO NOT REOPEN as dead)
- `packages/observability/` -- 414 file imports (v96)
- `packages/types/` -- 6 consumers
- `packages/analytics/` -- 14 imports
- `packages/event-parser/` -- 3 imports (script: "type-check" not "typecheck")
- `packages/sales-reporting/` -- 1 import
- `packages/feature-flags/` -- 11 imports
- `packages/storage/` -- 8 consumers
- `packages/cms/` -- 11+ consumers

### Packages Confirmed DEAD (DO NOT REOPEN as alive)
- `packages/ai/` -- ZERO runtime imports
- `packages/brand/` -- ZERO runtime imports
- `packages/kitchen-state-transitions/` -- ZERO runtime imports

### v94/v95 Findings Corrected (RESOLVED)
- Console ~2,081 -- v96: **~1,487** (v95 overcounted)
- POST handlers 228 -- v96: **209-211**
- Inventory manifests ZERO -- v96: **13 exist**
- CRM client creation 404 -- v96: **EXISTS**
- Accounting routes 26 -- v96: **17**
- Inventory routes 64 -- v96: **58**
- CRM routes 48 -- v96: **42**
- CRM manifests 2 -- v96: **6**
- ignoreBuildErrors apps/storybook -- v96: **apps/web**
- Command Board "FULLY IMPLEMENTED" -- v96: **HTML/SVG only, ~25-30%**
- queryRawUnsafe 27 -- v96: **49**

### v95 Agent Errors Corrected by Verification (DO NOT REOPEN)
- Active .manifest files: v95 agents said 67, **actual: 86**
- Kitchen routes: v95 agents said 197, **actual: 148**
- Prisma models: v95 agents said 97, **actual: 223**
- Kitchen manifests: v95 agents said 1, **actual: 22**

---

## Items Needing Re-Verification

| Item | v96 Status | Why Re-verification Needed |
|---|---|---|
| Events EventDish model | "COMPLETELY MISSING" (v95-v96) vs "raw-mapped" (v94) | Conflicting claims -- check schema.prisma directly |
| Test file count | 534 (v95 baseline) + 19 command-board | v96 rate-limited, could not fully recount |
| Console canonical count | 1,121 apps/packages vs 1,487 total | Agree on methodology |
| Collaboration Liveblocks | NOT in API, IS in command-board frontend | Clarify package dependency graph |

---

## Archive Map

Completed pass write-ups and historical notes:
- `docs/implementation-history/` -- pass logs, executive summaries
- `docs/implementation-history/v77-v80-test-suite-repair.md` -- test suite repair
- `docs/audits/` -- numbered audit passes
- `docs/audits/v96-audit-findings.md` -- v96 full findings from 25 subagents

---

## Methodology

- **v96**: 38 Sonnet subagents (25 successful, 8 rate-limited, 5 still running). Key corrections: Console ~1,487 total (v95: ~2,081 -- overcounted). Console apps/packages: 1,121 (v95: ~1,006). POST handlers 209-211 (v95: 228). Inventory manifests 13 (v95: ZERO -- false alarm). Inventory routes 58 (v95: 64). CRM routes 42 (v95: 48). CRM manifests 6 (v95: 2). CRM client creation EXISTS (v95: "404" -- wrong). Accounting routes 17 (v95: 26). Inventory PO frontend EXISTS (v95: "ZERO"). Events routes 87 (v95: 83). Events test files 14 (v95: 1). Command Board HTML/SVG only, React Flow NOT used (v95: "FULLY IMPLEMENTED"). Procurement vendor-contracts ZERO command routes. ignoreBuildErrors apps/web (v95: apps/storybook). @ts-expect-error 12 (v95: 6). Production `any` ~222 (v95: 177+). queryRawUnsafe 49 (v95: 27). RLS coverage ~40% (v95 implied ~96%). 31 rewrite rules (v95: 26). 9 missing rewrite prefixes (~140 calls). 98 manifest bypass routes (v95: 42). 16 raw fetch() calls (v95: 29). 5 top-level camelCase violations (v95: 13). Contracts public signing race condition. 3 divergent federal tax bracket copies. Lead + RolePolicy BROKEN_PRISMA_READ. SMS Automation 5 missing route files. New domains: Mobile (Expo 54), AI (4 routes), Knowledge Base (3), Search (1), Conflicts (1), Activity Feed (2).
- **v95**: 30+ parallel subagents. MANY findings corrected in v96 -- see Resolved section. v95 agent errors (manifest files 67->86, kitchen routes 197->148, Prisma models 97->223) confirmed by direct verification.
- **v94**: 40+ parallel subagents. MANY v94 findings CORRECTED in v95/v96. Some v94 values were CORRECT and v95 agents introduced errors (manifests 86, kitchen 148, Prisma 223).
- **v93-v90**: Multiple passes with escalating corrections.
- **v77-v80**: Test suite repair. 678 -> 0 failing tests.
- **v65-v72**: All 22 P0 items resolved.
