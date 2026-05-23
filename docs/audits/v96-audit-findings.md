# v96 Audit Findings — Synthesized from 25 Parallel Subagents

> Date: 2026-05-14
> Methodology: 38 Sonnet subagents launched (25 successful, 8 rate-limited, 5 still running at synthesis time)
> Direct verification via Bash for key metrics

---

## v96 CORRECTIONS TO v95

### Metric Corrections (verified)

| Metric | v95 | v96 Actual | Notes |
|---|---|---|---|
| ignoreBuildErrors location #3 | apps/storybook | **apps/web** | Direct grep confirmed |
| @ts-expect-error | 6 | **12** | Includes storybook + test files; production-only ~6 |
| `as any` + `: any` | 177+ | **~222 non-generated/non-test** (966 total) | Broader count including generated |
| Events test files | 1 | **14** | v95 massively undercounted |
| Events routes | 83 | **87** | More thorough count |
| Inventory routes | 64 | **58** | v95 overcounted |
| Inventory manifests | ZERO | **13** | MAJOR v95 error |
| Inventory PO frontend | ZERO | **EXISTS under procurement/** | v95 wrong |
| Inventory test files | 3 | **7** | Undercounted |
| CRM routes | 48 | **42** (56 handlers) | v95 overcounted |
| CRM manifests | 2 | **6** | v95 undercounted |
| CRM client creation 404 | 404 | **EXISTS at /crm/clients/new** | v95 wrong |
| Accounting routes | 26 | **17** | v95 overcounted |
| Payroll test files | 2 | **7** | Undercounted |
| Payroll state coverage | 8 | **9** | Minor correction |
| POST handlers | 228 | **209-211** | v95 overcounted by 17-19 |
| Console (apps+packages) | ~1,006 | **1,121** | Console agent count |
| Console (total) | ~2,081 | **1,487** | v95 overcounted total |
| CamelCase violations (top-level) | 13 | **5** | v95 included subdirectories |
| Manifest bypass routes | 42 | **98** | v95 only counted violations, not all bypasses |
| Collaboration test files | 2 | **4** | Undercounted |
| Command Board | "Core canvas FULLY IMPLEMENTED" | **HTML/SVG only; React Flow NOT used** | STATUS.md claims false |
| Procurement vendor-contracts command routes | AGENTS.md says 10 functional | **ZERO command routes exist** | AGENTS.md STALE |

### Items CONFIRMED correct in v95

- Route files: **632** ✓
- Active manifests: **86** ✓
- Disabled manifests: **6** ✓
- Top-level domains: **51** ✓
- RLS unique tables: **86** ✓
- Dead packages: 3 (@repo/ai, @repo/brand, @repo/kitchen-state-transitions) ✓
- Public endpoints: **4** ✓
- Cron jobs: **8** ✓

---

## P0 STATUS (v96 verified)

### P0.1 — ignoreBuildErrors [NOT YET SAFE]

- **3 locations**: apps/api/next.config.ts:102, apps/app/next.config.ts:195, apps/web/next.config.ts:17
- **apps/app comment**: "Next.js's built-in type checker crashes on Vercel when lstat-ing parenthesized route groups like `(authenticated)/`" — this is a Next.js bug, not code quality
- **skipLibCheck**: 10 tsconfig files (matches v95)
- **@ts-ignore**: 0 (confirmed)
- **@ts-expect-error**: 12 total (6 production, 3 storybook, 3 test)
- **Production `any`**: ~222 non-generated, non-test across ~43 files
- **eslint.ignoreDuringBuilds**: 1 occurrence in apps/app (commented: "Build-time linting is handled by Biome")
- **Biome noConsole**: DISABLED (off in ultracite/biome/core)
- **Steps remain same as v95**

### P0.2 — Prisma Generate + db:check in CI [NOT STARTED]

- **NO explicit `prisma generate` in ci.yml** — works only via fragile postinstall hook
- **db-drift-check.mjs is a complete no-op** (prints message, exits 0) — confirmed
- **No `prisma validate` in CI** — confirmed
- **4 `continue-on-error: true` steps**: ci.yml:50, ci.yml:54, security.yml:43, performance.yml:59
- **Steps remain same as v95**

### P0.4 — CI Typecheck/Lint [NOT STARTED]

- Rate-limited agent; v95 findings still valid
- Additional from other agents: **CodeQL v3** confirmed, **SKIP_ENV_VALIDATION** in 5+ workflows
- Steps remain same as v95

### P0.6 — Missing API Rewrites [CRITICAL — 9 prefixes, ~140 calls]

- **31 wildcard rewrites** in apps/app/next.config.ts (v95 said 26 — more thorough count)
- **9 missing rewrite prefixes** that will 404 in production:

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

### P0.7 — Calendar OAuth Tokens Plaintext [NOT STARTED]

- **CONFIRMED**: ProviderSync stores accessToken/refreshToken as plaintext `@db.Text`
- **ZERO encryption infrastructure** in codebase
- **3 routes write raw tokens**: callback/google, callback/outlook, connect
- **EmployeePin.pin_encrypted** is misleading — no encryption code exists
- Only crypto: HMAC (state signing), SHA-256 (API keys), randomUUID
- **Severity**: DB compromise exposes all OAuth tokens for all tenants

---

## P1 STATUS (v96 verified)

### P1.A — Payroll Runtime Bugs [CRITICAL]

- **`tenant_payroll` schema DOES NOT EXIST**: tax/list/route.ts queries it — runtime crash
- **3 divergent federal bracket copies** with DIFFERENT values:
  - taxEngine.ts: 0-11725, 11725-47525...
  - tax/brackets/route.ts: 0-11600, 11600-47150...
  - tax/list/route.ts: same as brackets
  - Client sees different brackets than engine uses!
- **Division-by-zero**: `regularPay / hoursRegular || 0` doesn't catch `Infinity`
- **9/50 states** (CA, NY, TX, FL, WA, PA, IL, OH + 1 more)
- **No FUTA/SUTA, W-2/1099, pay stubs**
- **7 test files** (v95 said 2)
- **No spec document**

### P1.B — CRM Pipeline [v96 CORRECTIONS]

- **Deal model MISSING** — confirmed (virtual view over Proposal)
- **Client creation EXISTS** at /crm/clients/new (v95 said 404 — WRONG)
- **6 manifest files** (v95 said 2 — WRONG): lead, deal, proposal, client, client-interaction, revenue-recognition
- **Pipeline 6 stages implemented**: lead→qualified→proposal→negotiation→won→lost
- **42 route files** (v95 said 48)
- **Deal manifest disconnected**: routes query Proposal directly, not manifest

### P1.C — Console Statements [v96: 1,121 apps/packages]

- **1,121** in apps/packages (v95 said ~1,006)
- **1,487** total including scripts (v95 said ~2,081)
- **Breakdown**: console.error 558, console.log 452, console.warn 41, console.info/debug 71
- **Biome noConsole is OFF** — no prevention
- **Top file**: manifest-runtime doctor.ts with 106
- **414 @repo/observability imports** as replacement path

### P1.D — Design System

- Rate-limited agent; v95 findings still valid
- 453 bare Card, 375 pastel, 114 bold, 66 shadow violations

### P1.E — TypeScript Strictness

- **@ts-ignore**: 0 ✓
- **@ts-expect-error**: 12 (6 production)
- **Production `any`**: ~222 across 43 files
- **TODO**: 17-22 production comments across 10 files

### P1.F — Accounting [v96: 17 routes, NOT 26]

- **Financial reports expenses HARDCODED TO ZERO** via `.reduce(() => 0, 0)` — confirmed
- **Journal entries / general ledger**: MISSING ENTIRELY
- **Bank reconciliation**: FULLY SIMULATED with modulo + hardcoded variance
- **No double-entry bookkeeping**
- **10 test files** but none for core accounting logic
- **17 routes** (v95 said 26)

### P1.G — Inventory [v96: 58 routes, 13 manifests]

- **58 routes** (v95 said 64)
- **13 manifests** (v95 said ZERO — MAJOR correction)
- **PO frontend EXISTS** under procurement/ (v95 said ZERO)
- **~57% routes have no frontend consumers** (33 of 58 orphan)
- **Duplicate PO API**: 7 under inventory/ + 4 under procurement/
- **7 test files** (v95 said 3)

---

## P2 STATUS (v96 key updates)

### P2.C — Contracts

- Public signing **bypasses manifest** — direct DB writes (FR-504 violation)
- **No idempotency** on signingToken — race condition, returns 400 not 409
- **Status taxonomy mismatch**: code has `viewed`/`rejected`/`canceled` vs spec
- **Bare Card violations** in contract-detail-client.tsx
- **No rate limiting** on public signing endpoint
- **VendorContract `renew`** only updates endDate — doesn't create new contract

### P2.E — Kitchen (148 routes, rate-limited agent)

- v95 findings still valid: 148 routes, 22 manifests, 13 dup pairs, no spec
- Additional from other agents: zero-UUID placeholders confirmed

### P2.L — Command Board [v96: STATUS.md claims are FALSE]

- **React Flow NOT used** — BoardCanvas uses raw HTML/SVG despite @xyflow/react dependency
- **Liveblocks NOT wired to canvas** — package exists but disconnected from UI
- **Command Palette NOT implemented** — no Cmd+K
- **AI Chat Panel NOT in UI** — server-side agent loop exists, no UI component
- **Entity-typed cards NOT implemented** — all cards render generically
- **Entity Detail Panel NOT implemented**
- **Undo/Redo, MiniMap, Snap-to-grid, Fit View all MISSING**
- **Frontend is ~25-30% of what STATUS.md claims**
- **Backend is substantially complete**: API routes, Prisma models, manifest commands, simulation engine, AI tool registry

### P2.Q — Procurement [v96: vendor-contracts ZERO command routes]

- Requisitions: 8/8 command routes confirmed ✓
- **Vendor-contracts: ZERO command routes** (AGENTS.md says 10 — STALE)
- Manifest defines 10 commands but no API routes to execute them
- 5 test files, 121 test cases
- **PrismaStore files have "broken-read" naming** — wiring may be incomplete

### P2.V — Collaboration/Communications

- Liveblocks NOT in collaboration API (confirmed) — IS in command-board frontend
- **4 test files** (v95 said 2)
- **3 overlapping SMS modules**: sms.ts (old), sms-new.ts (dead code), sms-temp.ts (active)
- **sms-new.ts is identical to sms.ts** — dead code, never imported
- **Notification dismissed state**: list route doesn't filter, command route directories missing

### P2.X — New v96 Findings

- **CateringOrder**: stale duplicate of events/catering-orders; frontend calls phantom routes
- **AlertsConfig**: frontend calls create/update/remove — none exist on disk
- **VarianceReport**: frontend calls review/approve — none exist on disk
- **SMS Automation**: 5 missing route files (create, update, soft-delete, list, detail)
- **Lead dual-write**: BROKEN_PRISMA_READ — wizard writes manifest, reads from Prisma
- **RolePolicy**: BROKEN_PRISMA_READ — commands use manifest, reads use Prisma

---

## P3 STATUS (v96 key updates)

### P3.D — Route Architecture

- **632 route files** ✓
- **209-211 POST handlers** (v95 said 228 — CORRECTED)
- **449 GET, 39 PUT, 21 PATCH, 30 DELETE**
- **748 total handlers**, 299 write handlers
- **51 domains** ✓
- **5 top-level camelCase violations** (v95 said 13)
- **8 cron jobs** ✓, 4 use GET for mutations
- **16 raw fetch() calls** bypass apiFetch

### P3.F — Test Infrastructure

- Rate-limited agent; v95 count of 534 still best available
- Additional: 19 command-board test files found (not counted in v95)

### New Domains Audited (not in v95)

**Mobile (3 routes)**: Push tokens, app settings, notification preferences. React Native (Expo 54) app exists at apps/mobile/. Zero API tests.

**AI (4 routes)**: Suggestions, bulk-tasks, summaries. Uses gpt-4o-mini via Vercel AI SDK. @repo/ai package is DEAD. Zero AI route tests.

**Knowledge Base (3 routes)**: Read via dedicated routes, write via manifest commands. 25 test blocks.

**Search (1 route)**: 15 entity types, multi-word AND semantics. ~31 test blocks. Frontend has zero spec compliance.

**Conflicts (1 route)**: 1100+ lines, 7 conflict detectors. Zero tests.

**Activity Feed (2 routes)**: List + stats. ~30 test blocks.

---

## NEW ISSUES NOT IN v95

1. **9 missing rewrite prefixes** affecting ~140 frontend API calls (P0.6 expanded)
2. **Procurement vendor-contracts AGENTS.md STALE** — claims 10 command routes, zero exist
3. **CateringOrder frontend calls phantom routes** — create/cancel/confirm all 404
4. **AlertsConfig frontend calls phantom routes** — create/update/remove all 404
5. **VarianceReport frontend calls phantom routes** — review/approve all 404
6. **Command Board STATUS.md is fantasy** — React Flow not used, 70% of claimed features missing
7. **3 divergent federal tax bracket copies** with different numeric values
8. **Payroll tax/list queries nonexistent schema** — guaranteed runtime crash
9. **Contracts public signing race condition** — no idempotency guarantee
10. **SMS Automation 5 missing route files** from manifest IR
11. **Lead + RolePolicy BROKEN_PRISMA_READ** patterns
12. **Mobile native app is real and functional** (Expo 54, 7 screens, offline sync)

---

## SPEC GAPS (no spec document exists)

Kitchen (148 routes), CRM (42 routes), Inventory (58 routes), Payroll (24 routes), Procurement (24 routes), Accounting (17 routes), Collaboration (17 routes), Logistics (5 routes), Analytics (5 routes), Mobile (3 routes), AI (4 routes), Conflicts (1 route), Activity Feed (2 routes), Role Policy (7 routes)

---

## DOMAINS NEEDING SPECS AUTHORED

Per the user's instruction: "If an element is missing, search first to confirm it doesn't exist, then if needed author the specification at specs/FILENAME.md."

Domains confirmed to have NO spec and sufficient complexity to warrant one:
1. **specs/kitchen/SPEC.md** — 148 routes, 22 manifests, no spec
2. **specs/inventory/SPEC.md** — 58 routes, 13 manifests, no spec
3. **specs/payroll/SPEC.md** — 24 routes, runtime bugs, no spec
4. **specs/procurement/SPEC.md** — 24 routes, partial manifest coverage, no spec
5. **specs/accounting/SPEC.md** — 17 routes, fundamental gaps, no spec
6. **specs/collaboration/SPEC.md** — 17 routes, zero manifest commands, no spec
7. **specs/logistics/SPEC.md** — 5 routes, GPS simulated, no spec
8. **specs/analytics/SPEC.md** — 5 routes, 5 revenue methods, no spec
