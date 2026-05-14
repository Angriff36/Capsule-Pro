# IMPLEMENTATION_PLAN.md -- v98

> Updated 2026-05-14
> Synthesized from v98 multi-agent audit (27 subagents across 3 phases).
> All 22 P0 items resolved (v65-v72). Test suite repair complete (v77-v80).
> v0.12.2 tag created with RLS fixes and console statements audit baseline.
> **v98 KEY CORRECTIONS OVER v97:**
> - POST handlers: **242** (v97 said 209-211 -- recount)
> - queryRawUnsafe: **6 active runtime** (v97 said 5 -- staffing coverage has 6)
> - Active manifests: **88** (v97 said 86 -- 2 new manifests added)
> - Kitchen manifests: **17** (v97 said 19 -- re-count)
> - Shadow violations: **34** (v97 said 31 -- REGRESSED +3)
> - Pastel violations: **183** (v97 said 115 -- MAJOR REGRESSION +68)
> - Dead packages: **4** (v97 said 3 -- added @repo/security)
> - Events routes: **96** (v97 said 87 -- re-count)
> - Events contract signature: **HAS inline auth** (v97 said "no inline auth" -- CORRECTION)
> - Manifest bypass POST: **75** (v97 said 80 -- improved)
> - Analytics revenue: **2 active methods** (v97 said "5 different ways" -- CORRECTION)
> - Mobile screens: **9** (v97 said 7 -- re-count)
> - Documents: **NOT truly unused** (v97 said "truly unused" -- has API consumers)
> - BROKEN_PRISMA_READ: **31 domains confirmed** (v97 said 30+ -- exact count)
> - `/api/public/` not in `isPublicRoute` middleware (NEW security finding)
> - Test files: **282** (v97 said 325 -- different methodology, consistent counting)
> - test.skip: **8** (v97 said 55 -- MASSIVE improvement, 85% reduction)
> - RLS: **86/210 = 41%** (v97 said 86/217=40% -- denominator corrected)
> - CRM client creation EXISTS (v97 e2e test.fixme is stale)
> - CRM Deal is virtual projection on Proposal (no Prisma model)
> - Marketing contact form does NOT create Lead row (confirmed)
> - Calendar mobile responsive FAIL (grid-cols-7 always)
> - Calendar new sync-client.tsx not wired up
> - Command Board STATUS.md confirmed fabricated (v97 finding upheld)
> - Payroll: **8 states** (v97 said 9/50 -- correction)
>
> **v98 AGENT ERRORS CORRECTED:** POST handlers: v97 said 209-211, **actual: 242**. queryRawUnsafe: v97 said 5, **actual: 6** (staffing coverage). Active manifests: v97 said 86, **actual: 88**. Kitchen manifests: v97 said 19, **actual: 17**. Shadow violations: v97 said 31, **actual: 34** (REGRESSED). Pastel violations: v97 said 115, **actual: 183** (MAJOR REGRESSION). Dead packages: v97 said 3, **actual: 4**. Events routes: v97 said 87, **actual: 96**. Analytics revenue: v97 said "5 different ways", **actual: 2 active methods**. test.skip: v97 said 55, **actual: 8** (85% reduction).

---

## P0 -- Critical Infrastructure

These items block production safety or allow regressions to ship undetected.

### P0.1 -- Remove `ignoreBuildErrors` [NOT YET SAFE]

**Status:** CI typecheck is CURRENTLY FAILING -- removing the flag would break production builds. Flag IS masking real type errors that must be fixed first.

- `apps/app/next.config.ts:195` -- `ignoreBuildErrors: true`
- `apps/api/next.config.ts:102` -- `ignoreBuildErrors: true`
- `apps/web/next.config.ts:17` -- `ignoreBuildErrors: true`
- `skipLibCheck: true` in shared BASE CONFIG (`packages/typescript-config/base.json:16`) -- inherited by ALL packages/apps
- **9** tsconfig files explicitly re-declare skipLibCheck (+ 2 dynamic in manifest-runtime)
- `eslint.ignoreDuringBuilds: true` in `apps/app/next.config.ts:189`
- `strict: true` in base config -- good, but overridden by above

**Verified metrics (v98):**
- `@ts-ignore`: **0** in production code
- `@ts-expect-error`: **13** total (6 production, 4 test, 3 storybook)
- `as any` in production code: **~128** across ~32 files
- `: any` in production code (excl generated): **~50** across ~15 files
- Estimated errors if removed: **150-250+** across 3 Next.js apps
- Key error categories: raw SQL type mismatches (staffing, trash, payroll), manifest runtime AST types, dynamic Prisma model access, React-PDF gaps
- `db-drift-check.mjs` is a COMPLETE NO-OP (prints message, exits 0)
- Biome `noConsole` is OFF -- no prevention

**Steps:**
1. Fix all TypeScript errors that `ignoreBuildErrors` is masking
2. Remove `ignoreBuildErrors` from all three `next.config.ts` files
3. Remove `skipLibCheck: true` from base config + 9 explicit re-declarations
4. Remove `eslint.ignoreDuringBuilds: true` from apps/app
5. Verify `next build` succeeds with ZERO errors
6. Verify CI typecheck passes (`pnpm turbo typecheck`)

### P0.2 -- Add Prisma Generate + db:check to CI [NOT STARTED]

**Status:** ci.yml has NO `prisma generate` before typecheck step. Postinstall hook is fragile. `scripts/db-drift-check.mjs` is a COMPLETE NO-OP. No `prisma validate` or `prisma migrate status` in CI. 4 `continue-on-error: true` steps.

**Steps:**
1. Add explicit `pnpm prisma generate` step before typecheck in main CI job
2. Add `pnpm db:check` after typecheck as hard gate
3. Replace `scripts/db-drift-check.mjs` no-op with real validation
4. Make all steps HARD gates (no `continue-on-error`)

**Files:** `.github/workflows/ci.yml`, `scripts/db-drift-check.mjs`

### P0.3 -- Manifest Route Enforcement [RESOLVED -- DO NOT REOPEN]

**Status:** `manifest-ci.yml` IS a hard gate with 5+ parallel jobs. POST route gap is **ZERO**. 209 filesystem POST routes: 66 matched by manifest IR, 143 matched by allowlist.

### P0.4 -- Extend TypeScript Typecheck to Packages + Fix CI Label + Add Biome Lint [NOT STARTED]

**Status:** CI typecheck step labeled "Run linting" but runs `pnpm turbo typecheck` (MISLABELED). Only covers 3 of 8 apps. 29 packages have typecheck scripts but NONE run in CI. **No Biome/Ultracite lint step in ANY CI workflow.** Duplicate CodeQL scans: security.yml uses v3, codeql.yml uses v4 (both scan same code). CodeQL codeql.yml includes unnecessary Python scan. Trivy pinned to `master` (unstable). **SKIP_ENV_VALIDATION=true** in 5+ workflows. **7 total workflow files** (ci.yml, security.yml, performance.yml, codeql.yml, manifest-ci.yml, vercel-compat.yml, deploy.yml). **No concurrency limits** on ci.yml or security.yml.

**Steps:**
1. Rename step from "Run linting" to "Run typecheck"
2. Add `pnpm turbo typecheck` (no filter) to CI
3. Fix `event-parser` script name (`"type-check"` -> `"typecheck"`)
4. Add `pnpm lint` step for Biome/Ultracite
5. Remove `continue-on-error: true` from 4 CI steps
6. Upgrade CodeQL in security.yml from v3 to v4 (or consolidate into codeql.yml)
7. Remove Python from codeql.yml language matrix
8. Pin Trivy to specific release tag
9. Remove or gate SKIP_ENV_VALIDATION=true
10. Add concurrency groups to ci.yml and security.yml

### P0.5 -- [RESERVED -- DO NOT REOPEN]
~Was @repo/observability zero-import claim -- RESOLVED v85~

### P0.6 -- Frontend Calls to Non-Existent API Routes [v97: 11 prefixes, ~53+ calls]

**Status:** 31 rewrite rules in `apps/app/next.config.ts`. 11 missing rewrite prefixes that will 404 in production:

| Missing Rewrite | Frontend Calls | Severity | Note |
|---|---|---|---|
| `/api/manifest/:path*` | **35+** | **CRITICAL** | CQRS command layer -- breaks virtually all write ops |
| `/api/cateringorder/:path*` | 4 | HIGH | Routes exist under events/catering-orders/ |
| `/api/alertsconfig/:path*` | 4 | HIGH | Routes exist under kitchen/alerts-config/commands/ |
| `/api/variancereport/:path*` | 3 | MEDIUM | Routes may exist under inventory/ |
| `/api/warehouse/:path*` | 2 | MEDIUM | |
| `/api/marketing/:path*` | 1 | MEDIUM | |
| `/api/lead/:path*` | 1 | MEDIUM | |
| `/api/menu-story/:path*` | 1 | MEDIUM | |
| `/api/smsautomationrule/:path*` | 1 | LOW | |
| `/api/contracts/:path*` | 1 | LOW | Bypasses via full URL |
| `/api/user-preferences/:path*` | 0 (internal) | LOW | |

**Root cause:** Routes EXIST on backend under different paths. Missing rewrites in apps/app/next.config.ts cause 404s on Vercel client-side (invisible in dev because apiFetch points directly to localhost:2223).

**Steps:**
1. **CRITICAL:** Add `/api/manifest/` rewrite (unblocks ~35+ CQRS commands)
2. Add rewrites for remaining 10 prefixes
3. Verify all frontend `apiFetch()` calls resolve correctly

### P0.7 -- Calendar OAuth Tokens Stored Plaintext [NOT STARTED]

**Status:** `ProviderSync` stores `accessToken`/`refreshToken` as plaintext `@db.Text`. 3 routes write raw tokens. ZERO encryption infrastructure. `EmployeePin.pin_encrypted` is misleading -- no encryption code. Only crypto: HMAC (state signing), SHA-256 (API keys), randomUUID. DB compromise exposes all OAuth tokens for all tenants.

**Steps:**
1. Implement token encryption at rest (application-level encryption before DB write)
2. Migrate existing plaintext tokens to encrypted storage
3. Add decryption layer in calendar sync read path

**Files:** `packages/database/prisma/schema.prisma`, calendar sync routes

### P0.8 -- /api/public/ Not in isPublicRoute Middleware [v98 NEW]

**Status:** `/api/public/` prefix is rate-limit exempt (in `EXEMPT_PATTERNS`) but NOT in `isPublicRoute` middleware check. This means Clerk auth middleware may reject public contract signing/proposal response endpoints that should be accessible without authentication. The public signing endpoint at `/api/public/contracts/[token]/sign` is confirmed functional but the auth middleware gap creates fragility.

**Steps:**
1. Add `/api/public/` to `isPublicRoute` in middleware
2. Verify public endpoints work without Clerk session

---

## P1 -- High Priority

### P1.A -- Payroll Runtime Bugs [v98: ALL 11 CONFIRMED, 8 states]

**Status:** Multiple runtime-level bugs prevent correct payroll operation. All 11 bugs verified with exact evidence.

**CRITICAL (will crash at runtime):**
- `tenant_payroll` schema **DOES NOT EXIST** -- `tax/list/route.ts` queries it -- guaranteed crash
- `EmployeeDeduction` table name mismatch: Prisma `@@map("EmployeeDeduction")` (PascalCase) vs raw SQL `employee_deductions` (snake_case) -- queries hit different tables
- Deductions JSON double-parse: Prisma auto-parses `Json` column, then code calls `JSON.parse()` again -- runtime `SyntaxError`

**Data integrity risks:**
- Division by zero: `regularPay / hoursRegular || 0` stores `Infinity` when hoursRegular=0 and regularPay>0
- YTD Social Security wages **never passed** to tax engine -- defaults to zero, causing SS over-taxation
- 3 divergent federal bracket copies with DIFFERENT values ($125-$1925 per bracket):
  - `taxEngine.ts`: 0-11725, 11725-47525...
  - `tax/brackets/route.ts`: 0-11600, 11600-47150...
  - Client sees different brackets than engine uses

**Missing infrastructure:**
- No FUTA/SUTA employer taxes
- No W-2/1099 generation
- No pay stub generation
- W-4 schema exists (`EmployeeTaxInfo`) but NO API routes to populate it

**Coverage:** 8/50 states (v98: v97 said 9). No spec at `specs/payroll.md`. 7 test files.

### P1.B -- CRM Pipeline [v98 UNCHANGED]

**Status:** Deal model CONFIRMED MISSING (virtual projection over Proposals). **Client creation EXISTS** at `/crm/clients/new` (DO NOT REOPEN). Pipeline 6 stages. Deal manifest disconnected. e2e test.fixme for client creation is STALE -- client creation works.

### P1.C -- Console Statement Cleanup [v98: ~1,044 apps/packages]

**Status:** v98 verified count: **~1,044** in apps/packages (unchanged from v97).

**Breakdown:**
- `console.log`: 760
- `console.error`: 41
- `console.info`: 112
- `console.debug`: 144
- Biome `noConsole` is OFF. **254** files import @repo/observability as replacement path.

### P1.D -- Design System: Shell Compliance [v98: REGRESSION]

**Status:** **27/27 module landings at 3/3** (unchanged -- all modules pass).

**Remaining violations (v98 REGRESSION):**
- Shadow utilities: **34** across 15 files (v97: 31 -- REGRESSED +3)
- Decorative pastels: **183** across 34 files (v97: 115 -- MAJOR REGRESSION +68)
- Sidebar contract deviations: charcoal not deep-green, SidebarGroupLabel not MonoLabel, icons 16x16 not 20x20
- Several marketing/search pages don't use BlogFilterChip, ResearchTable, ContactFormCard

### P1.E -- TypeScript Strictness [v98 UNCHANGED]

**Status:**
- `@ts-ignore`: **0** in production code
- `@ts-expect-error`: **13** total (6 production, 4 test, 3 storybook)
- `as any` in production: **~128** across ~32 files
- `: any` in production (excl generated): **~50** across ~15 files
- TODO: **17-22** production comments across 10 files
- FIXME/HACK: **0**

### P1.F -- Accounting: Structural Gaps [v98 UNCHANGED]

**Status:** Multiple structural gaps confirmed with exact evidence. **15 route handler files**.

- Financial reports expenses **hardcoded to zero** via `.reduce(() => 0, 0)` at `financial-reports/route.ts:262`
- Journal entries / general ledger: **MISSING ENTIRELY** -- no Prisma models, no routes, no data structures
- Bank reconciliation: **FULLY SIMULATED** -- no BankReconciliation model, state derived from Payment+ChartOfAccount
- No double-entry bookkeeping infrastructure
- 10 test files but **none for core accounting logic** (financial reports, reconciliation, chart of accounts)
- No spec

### P1.G -- Inventory Route Manifest Gap [v98: 12 manifests, 58 routes]

**Status:** Inventory has **58 routes**. **12 manifest files**. PO frontend EXISTS under `procurement/`. ~20 routes (34%) have no frontend consumers. Duplicate PO API: 7 under inventory/ + 4 under procurement/. 7 test files. No spec.

### P1.H -- BROKEN_PRISMA_READ Pattern [v98: 31 DOMAINS CONFIRMED]

**Status:** v96 identified Lead + RolePolicy. v97 discovered this pattern is pervasive. v98 confirms **31 domains** with exact evidence.

**Pattern:** Writes go through `executeManifestCommand` (Manifest runtime -> PrismaStore), reads query Prisma directly via `database.*`. If Manifest ever uses non-Prisma store, reads will desync.

**Affected domains (v98 exact list):**
Lead, RolePolicy, Shipment, TimeEntry, PayrollPeriod, PayrollApprovalHistory, EmployeeDeduction, BattleBoard, LaborBudget, AdminTask, ChartOfAccount, Proposal, Client, EventContract, EventReport, EventGuest, EventBudget, KitchenTask, PrepList, InventoryItem, CycleCountSession, EmailWorkflow, EmailTemplate, RateLimitConfig, StaffShift, TimeOffRequest, Employee, StaffAvailability, Certification, TrainingModule, LaborBudgetAlert

**Note:** Some reads use raw SQL (TimeEntry, PayrollPeriod, StaffShift, etc.) creating even worse divergence risk.

---

## P2 -- Medium Priority

### P2.A -- Calendar (8 routes)
- [x] Drag-and-drop (dnd-kit), ResearchTable, BlogFilterChip -- DONE
- [ ] OAuth tokens PLAINTEXT -- escalated to P0.7
- [ ] Reschedule lacks optimistic concurrency, RBAC, manifest dispatch
- [ ] **v98 NEW: Mobile responsive FAIL** -- grid-cols-7 layout always, no breakpoints for viewports < 768px
- [ ] **v98 NEW: sync-client.tsx not wired up** -- new compliant sync page exists but not integrated into navigation/routing

### P2.B -- Accounting (15 route handlers)
- [x] Invoicing, payments, revenue recognition, collections
- [ ] Financial reports expenses HARDCODED TO ZERO (P1.F)
- [ ] Journal entries / general ledger: MISSING. Bank reconciliation: SIMULATED
- [ ] No double-entry bookkeeping infrastructure
- [ ] 10 test files but none for core logic

### P2.C -- Contracts (1 top-level route + public signing)
- [x] 8 EventContract commands, 10 VendorContract commands (manifest IR only)
- [ ] Public signing **bypasses manifest** -- direct DB writes (FR-504 violation)
- [ ] **No idempotency** on signingToken -- race condition, no transaction wrapping, returns 400 not 409
- [ ] **3-way status spelling inconsistency**: validation.ts "canceled", status/route.ts "cancelled", types.ts omits both -- could allow signing canceled contracts
- [ ] No rate limiting on public signing endpoint (explicitly exempted)
- [ ] No DB-level uniqueness constraint on ContractSignature per contract
- [ ] VendorContract `renew` only updates endDate -- doesn't create new contract per spec FR-604
- [ ] Command route files don't exist on disk -- only in manifest IR

### P2.D -- Events (96 routes -- v98 recount)

**Spec coverage: ~85-90%.** Spec EXISTS at `specs/events/SPEC.md`.

**EventDish RESOLUTION:** EXISTS but raw-mapped (snake_case model `event_dishes`, no `@map` annotations). DO NOT REOPEN as missing.

**v98 NEW:** Contract signature endpoint **HAS inline auth** (v97 incorrectly said "no inline auth"). Verified: route validates signingToken and contract status before allowing signature.

**Critical spec gaps:**
- [ ] Battle Board **concept completely different from spec**: spec describes dish-voting workspace (nominate/vote/finalize). Actual implementation is a **timeline/Gantt chart** for task management. No voting, no dish nomination, no finalize-to-EventDish flow.
- [ ] Event Reports **concept completely different from spec**: spec describes post-event analytical reports (financial, guest satisfaction, kitchen performance). Actual implementation is **pre-event review checklists** with completion percentage.
- [ ] `EventSummary` missing `confidence` field -- AI confidence pills impossible
- [ ] **Event missing `importWorkflowId`** field -- cannot link events to import workflows
- [ ] EventImport model name mismatch: Prisma `EventImport` vs spec/API `EventImportWorkflow`
- [ ] BudgetAlert in wrong schema (`tenant_staff` not `tenant_events`)
- [ ] Several sub-tab pages use legacy `Header` instead of PageCanvas shell
- [ ] **14 test files** (confirmed)

### P2.E -- Kitchen (148 routes -- VERIFIED)

**13 singular/plural duplicate pairs CONFIRMED.** 76 of 148 routes (51.4%) are in duplicate directories.

- [ ] **148 route directories, 31 frontend pages**, **17 active manifests** (v98: v97 said 19)
- [ ] Zero-UUID placeholders at import route lines 338, 360
- [ ] NO spec document (only inaccurate overview in docs)
- [ ] QA routes are read-only (no create/update/delete)
- [ ] Nutrition database hardcoded to 16 ingredients
- [ ] Documentation claims 264 routes -- actual: 148

### P2.F -- Logistics (5 routes, 0 manifest commands, GPS SIMULATED)
### P2.G -- Staffing
- [x] Coverage/Recommendations APIs fully implemented
- [ ] CoverageBar primitive NOT implemented (6 inline patterns need extraction)
- [ ] Labor budget alerts COMPLETELY MISSING from staffing (model exists in Prisma)
- [ ] AI recommendations frontend severely non-compliant (8 bare Cards, zero shell primitives)
- [ ] **v98: 6 `queryRawUnsafe` instances** (v97 said 5 -- staffing coverage route has 6)
- [ ] Raw SQL locationId crash: no UUID format validation, invalid UUID causes 500

### P2.H -- Staff (35 routes -- scheduling domain)
### P2.I -- Settings (10 routes)
- [x] Audit log, API key revocation, role assignment, integrations, role policies, rate limits -- ALL DONE
- [ ] AlertsConfig routes exist at kitchen/alerts-config/commands/ (frontend calls wrong path)
- [ ] Billing page P3/blocked -- no Subscription/Plan/Tier/BillingAccount Prisma models

### P2.J -- Analytics (5 routes, revenue computed 2 active methods)
- [ ] v98 CORRECTION: Only **2 active revenue computation methods** (v97 said "5 different ways" -- overcounted)
- [ ] No spec

### P2.K -- Marketing (~75% spec compliance)
- [x] Leads pipeline, email workflows, SMS automation rules ALL fully implemented
- [x] SMS 5 missing routes RESOLVED (all exist under communications/sms/automation-rules/)
- [ ] Dual-path inconsistency: legacy /api/smsautomationrule/ + new /api/communications/sms/automation-rules/
- [ ] sms-new.ts is dead code (identical to sms.ts, zero imports)
- [ ] **v98 CONFIRMED:** Public website contact form sends email but does NOT create Lead row (missed conversion opportunity)
- [ ] Missing: campaign management UI (deferred), BlogFilterChip, ResearchTable usage

### P2.L -- Command Board (22 routes) [v98: STATUS.md CONFIRMED FABRICATED]

**STATUS.md claims are almost entirely fabricated.** Only 5 of 30+ claimed files exist. The entire UI is a **single 974-line board-canvas.tsx** using plain HTML/SVG.

| Category | Count |
|---|---|
| WORKS AS CLAIMED | **0** |
| PARTIALLY WORKS | 5 (basic drag, shift-click select, browser shell, board create, search input) |
| NOT IMPLEMENTED | 18 (entity cards, command palette, AI chat UI, undo/redo, Liveblocks, MiniMap, snap-to-grid, fit view, error boundary, etc.) |
| STALE CLAIM | 3 (React Flow used, AI chat frontend, templates) |

**Backend is substantially complete**: API routes, Prisma models, manifest commands, simulation engine, AI tool registry, chat agent loop. Frontend consumes almost none of it.

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
### P2.Q -- Procurement (24 routes) [v98: vendor-contracts ZERO command routes -- AGENTS.md FABRICATED]

**v98 CONFIRMED:** Requisitions 8/8 complete. **Vendor-contracts: ZERO command route directories** (AGENTS.md says 10 -- **FABRICATED**). Frontend scaffolding calls /commands/* routes that 404. 5 test files, 121 test cases.

**AGENTS.md CORRECTION NEEDED:** Procurement vendor-contracts section claims "10 functional command routes" -- actual count is ZERO.

### P2.R -- Timecards (10 routes)
- [ ] 4 Prisma models, 1 test file (1,765 lines), no specs, no manifests

### P2.S -- Documents (1 route) -- [v98: NOT truly unused]

**v98 CORRECTION:** Documents has API consumers (not "truly unused" as v97 claimed). The route is functional and consumed by other API endpoints, though no dedicated frontend page exists.

### P2.T -- Catering [NOT a ghost domain -- DO NOT REOPEN]

Catering is an event type classification. Real issue is `cateringorder` (4 calls, missing rewrite) -- see P0.6.

### P2.U -- Warehouse (2 routes, GET-only)
- [ ] Status derived from text fields, 14 frontend TSX files, no spec

### P2.V -- Communications/Collaboration Fragmentation
- [ ] Communications: 7 routes, no spec
- [ ] Collaboration: 17 routes -- Liveblocks NOT in API (IS in command-board frontend)
- [ ] Notifications: dismissed state NOT in DB (hardcoded `dismissedCount = 0`)
- [ ] **3 overlapping SMS modules**: sms.ts (old), sms-new.ts (dead code), sms-temp.ts (active)
- [ ] SMS Automation routes: **ALL 5 NOW RESOLVED** under communications/sms/automation-rules/
- [ ] Zero manifest commands
- [ ] **4 test files**

### P2.W -- Frontend Module Design System (27/27 at 3/3)

### P2.X -- Unlisted Domains (50 top-level API domains total)

**BROKEN_PRISMA_READ expanded to 31 domains** (see P1.H)

**0 top-level camelCase violations** (confirmed clean)

**v98 -- Truly unused domains (no frontend, no API consumers):**
- `sales-reporting` -- 1 route, planned UI never built
- `user-preferences` -- 1 route, no UI

**v98 -- NOT truly unused (has API consumers):**
- `documents` -- has API consumers (v97 incorrectly said "truly unused")

**v98 -- Internal-only domains (correctly non-frontend):**
- `cron` (6 routes), `webhooks` (1), `health` (1), `sentry-fixer` (1), `public` (4), `mobile` (3)

### P2.Y -- Payroll (24 routes -- runtime bugs at P1.A)

### P2.Z -- Security Coverage [v98 CORRECTIONS]

| Metric | v97 | v98 Actual | Notes |
|---|---|---|---|
| Prisma models total | 223 | **223** | Unchanged |
| Tables with RLS (unique) | 86 | **86** | Unchanged |
| RLS coverage % | ~40% | **41%** (86/210) | v98: denominator corrected |
| queryRawUnsafe | 5 active runtime | **6 active runtime** | v98: staffing coverage has 6 |
| Exempt patterns | 4 | **4** | Unchanged |
| Public endpoints | 4 | **4** | Unchanged |
| Manifest bypass routes | 80 POST bypass | **75 POST bypass** | v98: improved from 80 |
| Raw fetch() bypass apiFetch | ~59 | **~59** | Unchanged |
| `/api/public/` in isPublicRoute | -- | **NO** (v98 NEW) | Middleware gap |

**High-risk findings:**
- `/api/events/contracts/[id]/signature` -- **v98: HAS inline auth** (v97 incorrectly said no auth)
- `/api/public/contracts/[token]/sign` -- no rate limiting, no idempotency, race condition, no transaction wrapping
- `/api/public/proposals/[token]/respond` -- no rate limiting
- **v98 NEW:** `/api/public/` NOT in `isPublicRoute` middleware -- auth middleware may interfere

**v98 -- per-schema RLS coverage:**
| Schema | Coverage |
|---|---|
| tenant_logistics | 100% (4/4) |
| tenant_facilities | 100% (5/5) |
| tenant_accounting | 91% (10/11) |
| tenant_crm | 75% (6/8) |
| tenant_inventory | 55% (18/33) |
| tenant_staff | 43% (16/37) |
| tenant_kitchen | 26% (11/43) |
| tenant_events | 25% (7/28) |
| tenant_admin | 22% (8/36) |
| tenant (bare) | 13% (1/8) |
| tenant_facility (orphan) | 0% (0/4) |

---

## P3 -- Lower Priority

### P3.A -- Dead Package Cleanup

**Dead (zero runtime imports):** @repo/ai, @capsule/brand, @repo/kitchen-state-transitions, **@repo/security** (v98 NEW)

### P3.B -- Spec Authoring

38 spec files total. **~35 of ~50 API domains have NO spec.**

**Biggest gaps:** Kitchen (148 routes), CRM (42 routes), Inventory (58 routes), Payroll (24 routes), Procurement (24 routes), Accounting (17 routes), Collaboration (17 routes), Logistics (5 routes), Analytics (5 routes).

### P3.C -- Cron HTTP Method Inconsistency

**8 cron jobs** in vercel.json (AGENTS.md registry says 6 -- outdated). Missing from AGENTS.md: `integration-auto-sync` (every 15 min), `outbox/publish` (every minute).

### P3.D -- Route Architecture (v98)

- **632 route.ts files**
- **242 POST handlers** (v98: v97 said 209-211 -- recount)
- **455 GET, 30 PUT, 39 PATCH, 21 DELETE**
- **748 total handlers**, 299 write handlers
- **88 active .manifest files** (v98: v97 said 86)
- **6 manifests** in manifests-disabled/
- **50 top-level API domains**
- **8 cron jobs** in vercel.json
- **4 public endpoints** (rate-limit exempt)
- **31 rewrite rules** in apps/app/next.config.ts
- **~59 raw fetch() calls** bypassing apiFetch
- **75 POST routes bypassing manifest** (v98: v97 said 80 -- improved, 31.0% of POST handlers)
- **0 camelCase domain directories**
- POST route gap: **0** (RESOLVED)

### P3.E -- AGENTS.md Corrections Needed (v98)

1. Console count ~932 -- actual **~1,044** apps/packages
2. RLS "all tables have RLS" -- actual **86 unique tables (~41% coverage)**
3. Cron registry says 6 -- actual **8** (add integration-auto-sync, outbox/publish)
4. Inventory manifests -- **12 exist**
5. Procurement vendor-contracts "10/10 complete" -- actual **0 command route directories -- FABRICATED**
6. Command Board "core canvas FULLY IMPLEMENTED" -- **~5-10% implemented, STATUS.md fabricated**
7. No Biome lint in CI
8. CodeQL v3 should be v4 (or consolidate duplicate CodeQL workflows)
9. ignoreBuildErrors 3rd location is **apps/web** not apps/storybook
10. Active manifests **88** -- v98 updated from 86
11. Design system 3/3: **27/27** not 13/25
12. queryRawUnsafe: **6 active runtime** not 5 (v98 updated)
13. Kitchen manifests: **17** not 19 (v98 updated)
14. SMS automation routes: **RESOLVED** not missing
15. Command Board STATUS.md: **fabricated** -- 5 of 30+ claimed files exist
16. **v98 NEW:** Events contract signature HAS auth (AGENTS.md may reference old finding)

### P3.F -- Test Infrastructure (v98)

- **282 test files** (v98 count -- v97 said 325, different methodology)
- **145 API test files** in apps/api/__tests__/
- **64 E2E spec files** (49 top-level, 15 workflows, 2 apps/app, 3 orphaned at repo root)
- **25/35 packages have ZERO tests** (including auth, payments, security, webhooks, storage, email)
- **4/9 apps have ZERO tests**
- **8 test.skip** (v98: v97 said 55 -- **MASSIVE 85% IMPROVEMENT**)
- **5 describe.skip** across files
- Entire sales-reporting test suite describe.skip'd
- Kitchen tests: 35 files (24% of all API tests cover one domain)
- 14 domains have only 1 test file each
- Mobile: 9 screens (v98: v97 said 7 -- re-count)

### P3.G -- Raw fetch() Bypassing apiFetch

**~59 raw `fetch()` calls** bypass `apiFetch`. Highest concentrations in events guests/staff/timeline/waitlist pages.

### P3.H -- Stale Backup Files

- `apps/app/package.json.bak` -- should be removed

---

## Code Quality Metrics (v98)

| Metric | v97 | v98 | Status | Notes |
|---|---|---|---|---|
| `console.*` (apps/packages) | ~1,044 | **~1,044** | CONFIRMED | Unchanged |
| `as any` (production) | ~128 | **~128** | CONFIRMED | Unchanged |
| `: any` (production, excl gen) | ~50 | **~50** | CONFIRMED | Unchanged |
| `@ts-ignore` | 0 | **0** | CONFIRMED | |
| `@ts-expect-error` | 13 (6 prod) | **13** (6 prod) | CONFIRMED | |
| Bare `<Card>` without tone | 0 (default tone) | **0** (default tone) | CONFIRMED | |
| Shadow violations | 31 | **34** | v98 REGRESSED | +3 from v97 |
| Pastel violations | 115 | **183** | v98 REGRESSED | +68 from v97 -- MAJOR |
| queryRawUnsafe | 5 active runtime | **6 active runtime** | v98 UPDATED | Staffing coverage route |
| Raw fetch() calls | ~59 | **~59** | CONFIRMED | |
| RLS unique tables | 86 | **86** | CONFIRMED | 41% of 210 models |
| Active .manifest files | 86 | **88** | v98 UPDATED | 2 new manifests |
| Kitchen manifests | 19 | **17** | v98 CORRECTED | Re-counted |
| Route files | 632 | **632** | CONFIRMED | |
| POST handlers | 209-211 | **242** | v98 CORRECTED | Full recount |
| Test files | 325 | **282** | v98 RECOUNT | Consistent methodology |
| test.skip | 55 | **8** | v98 IMPROVED | 85% reduction |
| Dead packages | 3 | **4** | v98 UPDATED | Added @repo/security |
| skipLibCheck tsconfigs | 9+2 dynamic | **9+2 dynamic** | CONFIRMED | |
| Design system 3/3 | 27/27 | **27/27** | CONFIRMED | |
| Manifest bypass POST routes | 80 | **75** | v98 IMPROVED | Down from 80 |
| Rewrite rules | 31 | **31** | CONFIRMED | |
| Module landings 3/3 | 27/27 | **27/27** | CONFIRMED | |
| BROKEN_PRISMA_READ domains | 30+ | **31** | v98 EXACT | Exact count confirmed |
| @repo/observability imports | 254 | **254** | CONFIRMED | |
| Events routes | 87 | **96** | v98 CORRECTED | Recount |
| Mobile screens | 7 | **9** | v98 UPDATED | Recount |

---

## RLS Coverage (v98)

**86 unique tables** with RLS out of 210 tenant-scoped tables = **41% coverage**.

**RLS history:**
- v83: "all tables have RLS" -- INCORRECT
- v90: 85/170 = 50.0%
- v91: 84/210 = 40.0%
- v92: 93/223 = 41.7%
- v93: 97/223 = 43.5%
- v94: 88/223 = 39.5%
- v95: 86/223 = 38.6%
- v96: 86/223 = 38.6%
- v97: 86/217 = ~40%
- v98: **86/210 = 41%** (denominator corrected from 217 to actual DB tables)

**Pattern inconsistency:** `payroll_audit_log` uses `current_setting('app.current_tenant')` instead of standard `auth.jwt() ->> 'tenant_id'` pattern.

---

## Security Summary (v98)

- **Calendar OAuth tokens PLAINTEXT** in ProviderSync -- HIGH severity (P0.7)
- **Auth coverage:** ~96.8% effective (middleware) -- but RLS only ~41%
- **Rate limiting:** ~95% global. 4 EXEMPT_PATTERNS (including /api/public/)
- **4 public endpoints** explicitly exempt
- **`/api/public/` NOT in `isPublicRoute`** middleware -- potential auth interference (P0.8)
- **RLS:** 86 unique tables (~41% of 210 DB tables)
- **6 `queryRawUnsafe`** active runtime instances -- all parameterized (staffing/coverage)
- **Contracts public signing race condition** -- no transaction wrapping, no idempotency, no rate limiting
- **3-way status spelling inconsistency** in contracts -- could allow signing canceled contracts
- **75 POST routes bypass manifest** (31.0%)
- **~59 raw fetch() calls** bypass apiFetch
- No Biome lint in ANY CI workflow
- Duplicate CodeQL (v3 in security.yml, v4 in codeql.yml)
- Trivy pinned to `master` (unstable)
- SKIP_ENV_VALIDATION=true in 5+ workflows
- No concurrency limits on ci.yml or security.yml

---

## Route Inventory (v98)

| Domain | Routes | POST | Manifest | Spec | Notes |
|---|---|---|---|---|---|
| Kitchen | 148 | -- | 17 | NONE | 13 dup pairs (51.4%), NO spec, v98: 17 manifests |
| Events | 96 | -- | -- | EXISTS | v98: 96 routes (v97 said 87), contract signature HAS auth |
| Inventory | 58 | -- | 12 | NONE | ~20 routes unused, PO frontend exists |
| CRM | 42 | -- | 6 | NONE | 6 manifests, client creation EXISTS, Deal is virtual |
| Staff | 35 | -- | -- | -- | Scheduling domain |
| Integrations | 25+ | -- | -- | PARTIAL | GoodShuffle, Nowsta, QB, Webhooks |
| Procurement | 24 | -- | -- | NONE | Req done, vendor-contracts ZERO cmd routes |
| Payroll | 24 | -- | -- | NONE | All 11 bugs confirmed, 8/50 states, 7 tests |
| Command-board | 22 | -- | -- | -- | ~5-10% of STATUS.md claims, STATUS.md FABRICATED |
| Accounting | 17 | -- | -- | NONE | Expenses zero, no double-entry |
| Collaboration | 17 | -- | 0 | NONE | Liveblocks NOT in API, 4 test files |
| Administrative | 13 | -- | 0 | NONE | |
| Timecards | 10 | -- | 0 | NONE | 1 test (1,765 lines) |
| Settings | 10 | -- | -- | -- | Billing P3/blocked, most features DONE |
| Shipments | 9 | -- | -- | -- | |
| Calendar | 8 | -- | 0 | PARTIAL | OAuth plaintext (P0.7), mobile responsive FAIL |
| Communications | 7 | -- | 0 | NONE | 3 SMS modules, 5 routes RESOLVED |
| Training | 7 | -- | -- | DRAFT | 1/5 stories, dual storage |
| Rolepolicy | 7 | -- | -- | NONE | BROKEN_PRISMA_READ (P1.H) |
| Lead | 6 | -- | -- | NONE | BROKEN_PRISMA_READ (P1.H) |
| Logistics | 5 | -- | 0 | NONE | GPS simulated |
| Facilities | 5 | -- | 1 | NONE | ALL GET-only |
| Analytics | 5 | -- | -- | NONE | v98: 2 active revenue methods |
| Warehouse | 2 | -- | 0 | NONE | GET-only |
| Documents | 1 | -- | -- | NONE | v98: has API consumers (NOT truly unused) |
| Sales-reporting | 1 | -- | -- | NONE | Truly unused (no UI, no API consumers) |
| User-preferences | 1 | -- | -- | NONE | Truly unused (no UI, no API consumers) |
| Mobile | 3 | -- | -- | NONE | Expo 54, 9 screens, offline sync |
| AI | 4 | -- | -- | NONE | gpt-4o-mini, @repo/ai DEAD |
| Search | 1 | -- | -- | EXISTS | 15 entities, missing BlogFilterChip |
| **Total** | **632** | **242** | **88** | | **50 domains** |

---

## Verification Commands (v98)

```bash
# P0.1: ignoreBuildErrors locations
grep -rn 'ignoreBuildErrors' --include='*.ts' apps/*/next.config.ts
# Expected: apps/app, apps/api, apps/web

# P0.2: CI prisma generate gap
grep -n 'prisma' .github/workflows/ci.yml
# Expected: 0 matches before typecheck step

# P0.6: Missing rewrites (11 prefixes, 31 total rewrites)
grep -n 'rewrites' apps/app/next.config.ts | head -5
# Expected: 31 rewrite rules, /api/manifest/ NOT present

# P0.8: /api/public/ not in isPublicRoute
grep -rn 'isPublicRoute' apps/app/middleware.ts apps/api/middleware.ts
# Expected: /api/public/ NOT listed

# P1.A: tenant_payroll crash + divergent bracket copies
grep -rn 'tenant_payroll' apps/api/ --include='*.ts'
grep -n '11725\|11600' apps/api/app/api/payroll/ -r --include='*.ts'
# Expected: 3 different bracket ranges in 3 files

# P1.C: Console statements (~1,044 apps/packages)
grep -rn 'console\.\(error\|log\|warn\|info\|debug\)' --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=generated | wc -l
# Expected: ~1,044

# P1.H: BROKEN_PRISMA_READ (31 domains)
grep -rn 'executeManifestCommand' apps/api/ --include='*.ts' | wc -l
# Expected: 100+ manifest write calls
grep -rn 'database\.\(lead\|rolePolicy\|shipment\|battleBoard\)\.' apps/api/ --include='*.ts' | head -20
# Expected: Direct Prisma reads in same domains

# P2.D: EventDish raw-mapped (EXISTS, not missing)
grep -n 'event_dishes' packages/database/prisma/schema.prisma
# Expected: Found (snake_case model, no @map)

# P2.L: Command Board React Flow usage
grep -rn 'useNodesState\|useEdgesState\|ReactFlow' apps/app/app/\(authenticated\)/command-board/ --include='*.tsx'
# Expected: NOT FOUND (HTML/SVG only)

# P2.Q: Procurement vendor-contracts (0 command routes)
ls apps/api/app/api/procurement/vendor-contracts/commands/ 2>/dev/null
# Expected: does not exist

# RLS coverage (86 tables, ~41%)
grep -r 'ENABLE ROW LEVEL SECURITY' packages/database/prisma/migrations/ --include='*.sql' | sed 's/.*ALTER TABLE \([^ ]*\).*/\1/' | sort -u | wc -l
# Expected: ~86

# queryRawUnsafe (6 active runtime)
grep -rn '\$queryRawUnsafe' apps/api/app/api/ --include='*.ts' | grep -v '__tests__' | wc -l
# Expected: 6

# BROKEN_PRISMA_READ pattern verification
grep -rn 'executeManifestCommand' apps/api/app/api/staffing/ --include='*.ts'
# Expected: 0 (staffing uses direct Prisma writes, not manifest)
grep -rn 'database\.' apps/api/app/api/staffing/coverage/route.ts | head -5
# Expected: Direct Prisma reads

# test.skip count (v98: 8)
grep -rn 'test\.skip\|it\.skip' apps/ packages/ --include='*.ts' --include='*.tsx' --exclude-dir=node_modules | wc -l
# Expected: ~8

# Manifest bypass POST routes (v98: 75)
grep -rn 'export.*POST' apps/api/app/api/ --include='*.ts' | grep -v 'executeManifestCommand\|runCommand' | wc -l
# Expected: ~75
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
- **CRM client creation 404** -- EXISTS at `/crm/clients/new`
- **Inventory manifests ZERO** -- 12 exist
- **Inventory PO frontend ZERO** -- EXISTS under `procurement/`
- **Events test files 1** -- 14 test files

### v97 New Resolutions (DO NOT REOPEN)
- **SMS Automation 5 missing routes** -- ALL RESOLVED under `/api/communications/sms/automation-rules/`
- **EventDish model MISSING** -- EXISTS (raw-mapped snake_case `event_dishes`)
- **Design system 13/25** -- NOW 27/27 at 3/3
- **CamelCase route directories 5** -- NOW 0 (confirmed clean)

### v98 New Resolutions (DO NOT REOPEN)
- **Events contract signature "no inline auth"** -- HAS inline auth (signingToken validation)
- **Analytics "5 revenue methods"** -- 2 active methods (v97 overcounted)
- **Documents "truly unused"** -- has API consumers (v97 incorrect)
- **test.skip 55** -- NOW 8 (85% reduction)
- **Payroll 9/50 states** -- actual 8/50 (v97 overcounted)
- **CRM client creation e2e test.fixme** -- STALE (client creation works)
- **CRM Deal model** -- virtual projection over Proposal (not missing, by design)

### Packages Confirmed ALIVE (DO NOT REOPEN as dead)
- `packages/observability/` -- 254 file imports
- `packages/types/` -- 6 consumers
- `packages/analytics/` -- 14 imports
- `packages/event-parser/` -- 3 imports (script: "type-check" not "typecheck")
- `packages/sales-reporting/` -- 1 import (has 1 API route, truly unused by frontend but alive)
- `packages/feature-flags/` -- 11 imports
- `packages/storage/` -- 8 consumers
- `packages/cms/` -- 11+ consumers

### Packages Confirmed DEAD (DO NOT REOPEN as alive)
- `packages/ai/` -- ZERO runtime imports
- `packages/brand/` -- ZERO runtime imports
- `packages/kitchen-state-transitions/` -- ZERO runtime imports
- `packages/security/` -- ZERO runtime imports (v98 NEW)

### Prior Findings Corrected (RESOLVED)
- Console ~2,081 -- v98: **~1,044 apps/packages**
- POST handlers 228 -- v98: **242**
- Inventory manifests ZERO -- v98: **12 exist**
- CRM client creation 404 -- v98: **EXISTS**
- Accounting routes 26 -- v98: **15 route handlers**
- Inventory routes 64 -- v98: **58**
- CRM routes 48 -- v98: **42**
- CRM manifests 2 -- v98: **6**
- ignoreBuildErrors apps/storybook -- v98: **apps/web**
- Command Board "FULLY IMPLEMENTED" -- v98: **~5-10% of STATUS.md claims, STATUS.md FABRICATED**
- queryRawUnsafe 49 -- v98: **6 active runtime**
- Raw fetch() 16 -- v98: **~59**
- Design system 13/25 -- v98: **27/27**
- Kitchen manifests 22 -- v98: **17**
- Bare Card 453 -- v98: **0 without default tone**
- CamelCase directories 5 -- v98: **0**
- SMS routes 5 missing -- v98: **ALL RESOLVED**
- BROKEN_PRISMA_READ 2 domains -- v98: **31 domains**
- @repo/observability 414 imports -- v98: **254**
- Events contract signature "no auth" -- v98: **HAS inline auth**
- Analytics revenue "5 methods" -- v98: **2 active methods**
- Documents "truly unused" -- v98: **has API consumers**
- Payroll states 9/50 -- v98: **8/50**

---

## Items Needing Re-Verification

| Item | v98 Status | Why Re-verification Needed |
|---|---|---|
| Test file count | 282 (v98) vs 325 (v97) vs 534 (v96) | Methodology keeps changing -- agree on canonical definition |
| Console canonical count | ~1,044 (v98 = v97) | Stable -- may be safe to close |
| Shadow violations 34 vs 31 | REGRESSED +3 | New code introducing violations -- needs policing |
| Pastel violations 183 vs 115 | MAJOR REGRESSION +68 | New code introducing violations -- needs policing |
| Collaboration Liveblocks | NOT in API, IS in command-board frontend | Clarify package dependency graph |
| Battle Board completion | ~55-60% code exists but wrong concept | Needs product decision: fix concept or document divergence |
| Event Reports completion | ~60% code exists but wrong concept | Needs product decision: pre-event checklists vs post-event analytics |
| Vendor-contracts commands | ZERO on disk, manifest IR has 10 | Determine if auto-generated routes serve these or if implementation needed |

---

## Archive Map

Completed pass write-ups and historical notes:
- `docs/implementation-history/` -- pass logs, executive summaries
- `docs/implementation-history/v77-v80-test-suite-repair.md` -- test suite repair
- `docs/audits/` -- numbered audit passes
- `docs/audits/v96-audit-findings.md` -- v96 full findings from 25 subagents
- `docs/audits/ai-integration-invariant-log.md` -- AI integration audit log
- `docs/audits/ai-integration-invariants-2026-05-13.md` -- AI integration invariants

---

## Methodology

- **v98**: 27 Sonnet subagents across 3 phases. Phase 1 (10 agents): spec inventory, package inventory, route architecture, CI infrastructure, ignoreBuildErrors deep analysis, P0 verification, RLS coverage, code quality, frontend-backend gaps, test infrastructure. Phase 2 (15 agents): Calendar spec comparison, Events spec comparison, Command Board truth table, Marketing spec comparison, Staffing spec comparison, Payroll runtime bug verification, Accounting gap verification, Design system compliance, Route usage verification (all 50 domains), BROKEN_PRISMA_READ pattern verification (31 domains), Contracts security verification, Inventory/Procurement verification, Search/Settings spec comparison, Kitchen deep audit, CRM spec comparison. Phase 3 (2 agents): Route count reconciliation, console count methodology. Key v98 corrections: POST handlers 242 (v97 said 209-211). queryRawUnsafe 6 (v97 said 5). Active manifests 88 (v97 said 86). Kitchen manifests 17 (v97 said 19). Shadow violations REGRESSED to 34 (v97 said 31). Pastel violations MAJOR REGRESSION to 183 (v97 said 115). Dead packages 4 (v97 said 3, added @repo/security). Events routes 96 (v97 said 87). Events contract signature HAS auth (v97 said no auth). test.skip 8 (v97 said 55 -- 85% improvement). Documents has API consumers (v97 said "truly unused"). Payroll 8/50 states (v97 said 9). Analytics 2 active methods (v97 said "5 different ways"). CRM Deal is virtual projection. Calendar mobile responsive FAIL. Calendar sync-client.tsx not wired. /api/public/ not in isPublicRoute middleware (NEW P0.8).
- **v97**: 25 Sonnet subagents across 2 phases. MANY findings corrected in v98.
- **v96**: 38 Sonnet subagents (25 successful, 8 rate-limited, 5 still running). MANY findings corrected in v97/v98.
- **v95**: 30+ parallel subagents. MANY findings corrected in v96/v97/v98.
- **v94**: 40+ parallel subagents. MANY v94 findings CORRECTED in v95/v96/v97/v98.
- **v93-v90**: Multiple passes with escalating corrections.
- **v77-v80**: Test suite repair. 678 -> 0 failing tests.
- **v65-v72**: All 22 P0 items resolved.
