# Audit Archive — Pass 11: Auth, Middleware & Integration Services Audit

Auth, middleware, and integration services audit (incl. addenda 1 + 2 covering credential exposure and webhook security). Captured verbatim from `IMPLEMENTATION_PLAN.md` during the 2026-04-28 cleanup.

## Auth, Middleware & Integration Services Audit (11th Pass)

> **Audited:** 2026-04-25
> **Scope:** Auth chain (proxy.ts, middleware/, packages/auth, packages/security, packages/rate-limit), Integration services (apps/api/app/lib/), External integrations (packages/supplier-connectors, packages/payments, packages/webhooks)
> **Method:** 6 parallel subagents — full auth chain trace + route-level auth scan + credential exposure scan + lib file audit (all 16 files) + integration correctness review + external package audit. All agent findings cross-referenced.
> **Prior passes covered:** routes, raw SQL (4 passes), frontend (2 passes), mobile, public website, E2E, packages. Auth chain, integration services, and external packages were NEVER audited before this pass.
> **New findings:** 8 CRITICAL, 16 HIGH, 24 MEDIUM, 15 LOW, 8 INFO

### Part A: Authentication & Authorization

#### Executive Summary

The auth chain follows a solid architecture: Clerk middleware in `proxy.ts` gates all `/api(.*)` routes, extracting `userId` from the JWT. Tenant resolution (`apps/api/app/lib/tenant.ts`) correctly derives `tenantId` from `auth().orgId`, not from user-controllable input. API key authentication (`apps/api/middleware/api-key-auth.ts`) uses timing-safe comparison against bcrypt-hashed keys stored in the database.

However, the audit uncovered **8 exploitable vulnerabilities**: tenant spoofing in the Ably auth route and calendar callbacks, silent webhook event drops, cross-tenant data access in forecasts, and a payload injection in the Svix webhook integration. The global rate limiter is **effectively inert** because it depends on headers (`x-tenant-id`, `x-user-id`) that the middleware never injects from the Clerk session. API key auth is fully implemented but **never used** by any route handler.

The "115 routes lack authentication" claim in prior sections of this document is **not accurate** — only 21 routes lack direct auth imports, of which 15 are legitimately public (with alternative auth mechanisms), 3 are dead code stubs, and 2 are genuinely problematic (missing tenant isolation). The discrepancy arose from not accounting for `requireTenantId()` and `executeManifestCommand()` as indirect auth mechanisms.

#### 1. Middleware Chain

**Architecture (proxy.ts):**
- Clerk middleware matches `["/api(.*)", "/trpc(.*)]` — covers ALL API routes. No routes exist outside this matcher.
- Auth flow: Clerk `auth()` → `userId` extraction → 401 JSON if unauthenticated → global rate limit → route handler.
- Public route exemptions (bypass Clerk auth):
  - `/webhooks(.*)` — webhook receivers
  - `/outbox/publish` — outbox publisher
  - `/api/health(.*)` — health checks
  - `/api/sentry-fixer/process` — Sentry fixer

**Finding A-01 | CRITICAL | Rate Limiter Effectively Inert**
- **File:** `apps/api/middleware/global-rate-limit.ts:38-55`
- The global rate limiter identifies clients by reading `x-tenant-id`, `x-org-id`, `x-user-id` headers. These headers are **never injected** by the middleware or Clerk — they would only be present if the client sends them manually. This means the rate limiter falls back to IP-based identification (via `x-forwarded-for` or `x-real-ip`) for all authenticated requests. Per-tenant and per-user rate limiting does not function as designed. The per-route granular rate limiter (`apps/api/middleware/rate-limiter.ts`) has the same dependency on these headers.
- **Exploitable:** YES — a single user can bypass per-tenant/per-user rate limits by rotating IPs or through a shared corporate proxy.

**Finding A-02 | HIGH | Cron Auth Accepts Spoofable Header**
- **File:** Cron routes verify `Authorization: Bearer ${CRON_SECRET}`, but `cron/inventory-audit` also accepts `x-vercel-cron-secret` header as fallback. Any external request can set this header to any value; it is not compared against an environment variable. If `CRON_SECRET` is not set, the route falls back to accepting the Vercel header without verification.
- **Exploitable:** THEORETICAL — requires missing `CRON_SECRET` env var.

**Finding A-03 | MEDIUM | Webhook Routes Lack Signature Verification**
- **File:** `apps/api/app/api/collaboration/notifications/email/webhook/route.ts`, `apps/api/app/api/collaboration/notifications/sms/webhook/route.ts`
- Both routes have NO signature verification. Comments acknowledge this: "In production, you should verify the webhook signature." Anyone who discovers these endpoints can forge email/SMS delivery status updates.
- Note: `webhooks/supplier-catalog` correctly uses HMAC-SHA256 with `timingSafeEqual` — this is the gold standard pattern.
- **Exploitable:** YES — external attacker can forge delivery status updates.
- **UPDATE 2026-04-26:** Email webhook now has Resend HMAC-SHA256 signature verification with replay protection. SMS webhook remains unfixed.

#### 2. Route-Level Auth Enforcement

**Route Counts:**

| Metric | Count |
|--------|-------|
| Total `route.ts` files | 1347 |
| Routes with Clerk auth (direct or indirect) | 1326 |
| Routes with NO auth in handler code | 21 |
| Legitimately public (alternative auth) | 15 |
| Dead code stubs | 3 |
| Genuinely problematic (missing auth/isolation) | 2 |
| Weak auth (IDOR risk) | 2 |

**Finding A-04 | CRITICAL | Cross-Tenant Data Access in Forecasts**
- **File:** `apps/api/app/api/inventory/forecasts/batch/route.ts`
- Queries `inventoryForecast` by SKU list with NO `tenantId` filter. Middleware enforces Clerk auth, but once authenticated, any user can query forecasts from any tenant by providing their SKUs.
- **Exploitable:** YES

**Finding A-05 | CRITICAL | Calendar Callback IDOR (Cross-Tenant Write)**
- **File:** `apps/api/app/api/calendar/sync/callback/google/route.ts`, `apps/api/app/api/calendar/sync/callback/outlook/route.ts`
- Both extract `tenantId` from the `state` query parameter (base64-encoded, user-controllable). They write calendar provider tokens to that tenant's `providerSync` record without verifying the authenticated user belongs to that tenant. An attacker with a valid Clerk session can manipulate the `state` parameter to write tokens to another tenant's record.
- **Exploitable:** YES

**Finding A-06 | CRITICAL | Ably Auth Tenant Spoofing**
- **File:** `apps/api/app/ably/auth/route.ts:126-135`
- Resolves `tenantId` from `requestBody.tenantId` (user-controllable) as primary source, falling back to `sessionClaims.tenantId`. An authenticated user can POST any `tenantId` and receive an Ably token scoped to another tenant's channel with `subscribe` capability — allowing them to observe all real-time events for that tenant.
- **Exploitable:** YES

**Correction to Prior Plan:** The "115 routes lack authentication" claim (Executive Summary, line 25) overcounts by not accounting for `requireTenantId()` and `executeManifestCommand()` which call `auth()` internally. Actual problematic count: **4 routes** (A-04, A-05, A-06, plus the staffing/recommendations compute endpoint which is LOW risk — no DB access).

#### 3. RBAC Enforcement

**RBAC architecture:**
- **Manifest routes (69):** RBAC enforced through manifest runtime policy system. `executeManifestCommand` passes `currentUser.role` to runtime; policy denials return 403.
- **`requireTenantId()` routes (22):** Get tenant-scoped data access via `auth().orgId` → `tenantId`, but have **NO role checks**. Any authenticated user within the tenant can access all data in these routes.
- **Direct auth routes (majority):** Check `userId` + `orgId` from Clerk session. Role enforcement varies.

**Finding A-07 | MEDIUM | No RBAC on 22 Non-Manifest Routes**
- Routes using only `requireTenantId()` (no manifest) have no role-based access control. Any authenticated user in the tenant can access accounting/payments, accounting/invoices, logistics/dispatch, inventory/reorder-suggestions, etc. Admin-only operations are not restricted.
- **Exploitable:** THEORETICAL — requires valid org membership.

**Finding A-08 | MEDIUM | Auto-Provisioned Users Get Admin Role**
- **File:** `apps/api/app/lib/tenant.ts:184`
- When auto-provisioning a new user, `requireCurrentUser` assigns `role: "admin"` unconditionally. If Clerk org membership is loosely controlled, this grants admin privileges to arbitrary users.
- **Exploitable:** THEORETICAL — depends on Clerk org membership policies.

#### 4. API Key Authentication

**Architecture (`apps/api/middleware/api-key-auth.ts` + `apps/api/app/lib/api-key-service.ts`):**
- Keys are prefixed (`cpk_`), hashed with bcrypt (10 rounds), stored in `ApiKey` Prisma model.
- Validation uses `timingSafeEqual` for the key prefix check, then bcrypt for the secret portion.
- Keys are scoped to `tenantId` and have configurable permissions/scopes.

**Finding A-09 | HIGH | API Key Auth Never Used in Routes**
- Grep for `withApiKeyAuth` and `authenticateApiKey` across all route handlers returned **zero results**. API key authentication is fully implemented but no route actually invokes it. All routes rely exclusively on Clerk auth or are public.
- **Exploitable:** NO — this is a completeness gap, not a vulnerability.

**Finding A-10 | MEDIUM | API Key Scope Enforcement is Opt-In**
- **File:** `apps/api/middleware/api-key-auth.ts:85-112`
- Scope/permission checking on API keys is optional — the `withApiKeyAuth` wrapper accepts a `requiredScopes` parameter, but it's not enforced at the key validation level. Any key with `isActive: true` passes authentication regardless of scopes.
- **Exploitable:** THEORETICAL — requires routes to actually use API key auth first.

#### 5. Session & Token Handling

**Finding A-11 | CRITICAL | Tracked `.env` Files in Git**
- **File:** Root `.env` and `packages/database/.env` appear to be tracked by git despite being listed in `.gitignore`. These need to be untracked with `git rm --cached` to prevent potential secret exposure.
- **Exploitable:** YES — if repo is shared or CI logs expose file contents.

**Finding A-12 | HIGH | Server Secrets Exposed via NEXT_PUBLIC_ Prefix**
- **File:** `packages/observability/next-config.ts:83-91`
- Better Stack/Logtail source tokens use `NEXT_PUBLIC_` env var prefix, which embeds them in client-side JavaScript bundles at build time.
- **Exploitable:** YES — tokens are publicly readable in production JS bundles.

**Finding A-13 | INFO | Clerk JWT Token Refresh**
- Token refresh is handled automatically by Clerk's client-side SDK. Server-side routes call `auth()` which reads the current session. There is no mid-request token expiry issue because each route handler gets a fresh session from the middleware.

**Finding A-14 | ~~INFO~~ → SUPERSEDED | Hardcoded Secrets Found in Root Scripts**
- **Original claim (WRONG):** "No hardcoded secret values found in source files." The grep only covered `apps/` and `packages/` — it missed 5 tracked root scripts.
- **Actual state (per Addendum 2):** Three root scripts contain a hardcoded Clerk secret key (`sk_test_...`), two contain a hardcoded Neon database connection string. See findings AE2-A01 and AE2-A02 in Addendum 2. Production source code (`apps/`, `packages/`) correctly loads secrets via `process.env` with Zod validation via `@t3-oss/env-nextjs`. The hardcoded secrets are exclusively in ad-hoc test/debug scripts at the repository root.

### Part B: Integration Services

#### 1. Goodshuffle Integration

**Architecture:** Poll-based sync (no webhooks). Client (`goodshuffle-client.ts`) makes paginated REST API calls. Three sync services handle events, inventory, and invoices respectively. Credentials loaded from database per-tenant.

**Finding B-G01 | HIGH | No Fetch Timeout**
- **File:** `apps/api/app/lib/goodshuffle-client.ts:132-158`
- `request<T>()` has zero timeout configuration. If Goodshuffle API is slow/unresponsive, fetch calls hang indefinitely (or until Node.js default socket timeout, which can be minutes). Affects all paginated `getAll*()` methods.
- **Data loss risk:** POTENTIAL — stalled sync leaves `lastSyncStatus` inconsistent.

**Finding B-G02 | HIGH | No Retry Logic**
- **File:** `apps/api/app/lib/goodshuffle-client.ts:132-158`
- No retry or exponential backoff. A transient 5xx response immediately fails the entire sync. Mid-pagination failures produce partial datasets treated as complete by sync services.
- **Data loss risk:** POTENTIAL — partial data treated as full dataset.

**Finding B-G03 | HIGH | No Transaction Wrapping — Duplicates on Failure**
- **File:** `apps/api/app/lib/goodshuffle-event-sync-service.ts:124-198` (also `inventory-sync:119-192`, `invoice-sync:93-166`)
- Sync loops perform multiple DB writes per item without transactions. Crash mid-loop creates items without sync records, causing duplicate creation on next sync.
- **Data loss risk:** YES — duplicate events/inventory/invoices on re-sync.

**Finding B-G04 | MEDIUM | Conflict Detection Dead Code**
- **File:** `apps/api/app/lib/goodshuffle-event-sync-service.ts:28-87` (also `inventory-sync:26-85`, `invoice-sync:30-56`)
- `_detectConflicts()` functions are defined but never called (underscore-prefixed). Sync unconditionally overwrites Convoy data with Goodshuffle data. Local modifications to event names, dates, guest counts, inventory quantities, or budget amounts are silently overwritten.
- **Data loss risk:** YES — local corrections overwritten on every sync.

**Finding B-G05 | MEDIUM | Sync Direction Option Ignored**
- **File:** `apps/api/app/lib/goodshuffle-event-sync-service.ts:20-23`
- `EventSyncOptions.direction` accepts `"convoy_to_goodshuffle" | "goodshuffle_to_convoy" | "both"` but is never used. Only `goodshuffle_to_convoy` is implemented. Users selecting bidirectional sync get one-way behavior silently.
- **Data loss risk:** POTENTIAL — users may believe bidirectional sync is active.

**Finding B-G06 | MEDIUM | Destructive Invoice Line Item Replacement**
- **File:** `apps/api/app/lib/goodshuffle-invoice-sync-service.ts:340-345`
- `updateConvoyBudgetFromGoodshuffle()` DELETEs ALL budget line items with `category = 'invoice'` and recreates them. No transaction wrapping. Failure between DELETE and INSERT permanently loses line items.
- **Data loss risk:** YES

**Finding B-G07 | MEDIUM | Inventory Quantity Overwrite Ignores Local Corrections**
- **File:** `apps/api/app/lib/goodshuffle-inventory-sync-service.ts:297-308`
- Unconditionally overwrites `quantity_on_hand` with Goodshuffle's `quantity_available`. Manual stock adjustments are reverted on next sync. Also does not check `deleted_at`, potentially updating soft-deleted items.
- **Data loss risk:** YES

**Finding B-G08 | MEDIUM | No Input Validation on External Data**
- **File:** `apps/api/app/lib/goodshuffle-event-sync-service.ts:240-287`
- No validation of incoming Goodshuffle data before raw SQL INSERT. Fields could be empty, invalid dates, or negative numbers.
- **Data loss risk:** NO (data corruption risk)

**Finding B-G09 | LOW | Unbounded Pagination Loop**
- **File:** `apps/api/app/lib/goodshuffle-client.ts:263-280`
- `getAll*()` methods have no maximum page count. If the API reports `total` incorrectly, these loop forever.
- **Data loss risk:** NO

#### 2. QuickBooks Export

**Architecture:** File-based IIF/CSV export (not API-based). No OAuth, no direct QuickBooks API calls. Users download generated files and manually import into QuickBooks Desktop. This is a deliberate design choice.

**Finding B-QB1 | MEDIUM | CSV Formula Injection**
- **File:** `apps/api/app/lib/quickbooks-bill-export.ts:132-141`, `apps/api/app/lib/quickbooks-invoice-export.ts:128-137`
- `escapeCSV` only escapes commas, double quotes, and newlines. Does not sanitize formula injection payloads (cells beginning with `=`, `+`, `-`, `@`). If a vendor name or description starts with `=`, it will be interpreted as a formula when opened in Excel.
- **Exploitable:** THEORETICAL — requires attacker-controlled vendor/item names.

**Finding B-QB2 | LOW | No Export Deduplication**
- **File:** `apps/api/app/lib/quickbooks-bill-export.ts:435-457`, `apps/api/app/lib/quickbooks-invoice-export.ts:435-457`
- Same bill/invoice can be exported and imported into QuickBooks multiple times. No "already exported" tracking.
- **Data loss risk:** NO (data duplication, not loss)

**Finding B-QB3 | LOW | Zero Line Item Bills**
- **File:** `apps/api/app/lib/quickbooks-bill-export.ts:195-261`
- No validation that `lineItems` is non-empty. A bill with zero line items produces an invalid IIF `TRNS...ENDTRNS` block.

#### 3. Nowsta Integration

**Architecture:** One-way sync (Nowsta → Convoy). Client (`nowsta-client.ts`) makes paginated REST API calls. Sync service handles employee matching (by email) and shift synchronization.

**Finding B-N01 | HIGH | No Fetch Timeout**
- **File:** `apps/api/app/lib/nowsta-client.ts:74-103`
- Same as B-G01. Zero timeout configuration on all fetch calls.

**Finding B-N02 | HIGH | No Retry Logic**
- **File:** `apps/api/app/lib/nowsta-client.ts:74-103`
- Same as B-G02. No retry or backoff. Partial data on pagination failure.

**Finding B-N03 | HIGH | No Transaction Wrapping — Duplicate Shifts**
- **File:** `apps/api/app/lib/nowsta-sync-service.ts:283-410`
- `processShift()` performs multiple DB operations (find/create schedule, find location, create/update shift, create sync record) without transaction wrapping. Failure between creating a shift and its sync record creates an orphaned shift; next sync creates a duplicate.
- **Data loss risk:** YES

**Finding B-N04 | HIGH | Failed Shifts Skipped Permanently**
- **File:** `apps/api/app/lib/nowsta-sync-service.ts:188-198`
- Individual shift processing failures are caught and logged but skipped permanently until next full sync. No retry mechanism or flagging for manual review.
- **Data loss risk:** POTENTIAL

**Finding B-N05 | MEDIUM | Sync Resurrects Soft-Deleted Shifts**
- **File:** `apps/api/app/lib/nowsta-sync-service.ts:339-349`
- UPDATE query does not check `deleted_at`. Soft-deleted shifts are silently un-deleted by sync.
- **Data loss risk:** YES

**Finding B-N06 | MEDIUM | Email-Only Matching Breaks on Email Change**
- **File:** `apps/api/app/lib/nowsta-sync-service.ts:52-64`
- Employee matching uses email as sole key. If an employee changes email in Nowsta, the next sync treats them as unmapped. Shifts assigned to this employee fail to sync.
- **Data loss risk:** POTENTIAL

**Finding B-N07 | MEDIUM | No Conflict Resolution (One-Way Sync)**
- **File:** `apps/api/app/lib/nowsta-sync-service.ts:104-144`
- Only Nowsta → Convoy direction is implemented. Local Convoy changes to employee data (name, role, phone) are not pushed back to Nowsta and are overwritten on re-sync if the update path triggers.
- **Data loss risk:** YES

#### 4. Shared Libraries

**`activity-feed-service.ts`:**
- Tenant isolation is correctly enforced throughout (all queries filter by `tenantId`).
- **MEDIUM** — `getCorrelatedActivities` has no limit parameter; unbounded result set on large correlation sets (`activity-feed-service.ts:319-330`).
- **LOW** — `getActivityStats` runs `COUNT(*)` with no date filter on the `total` query (`activity-feed-service.ts:457`) — slow on large tables.
- **INFO** — Query functions (`getActivities`, `getEntityActivities`, etc.) have no active route consumers — never load-tested.

**`tenant.ts`:**
- Tenant resolution is **correct and secure**: derives `tenantId` from `auth().orgId`, never from user-controllable input.
- **LOW** — Race condition in `getTenantIdForOrg`: `findFirst` then `create` without unique constraint handling (`tenant.ts:11-23`). `requireCurrentUser` at line 200 handles this correctly but `getTenantIdForOrg` does not.
- **LOW** — `console.log` statements include `clerkId` and `tenantId` (`tenant.ts:114,148,170`).

**`cors.ts`:**
- **MEDIUM** — When origin doesn't match allowed origins, falls back to `allowedOrigins[0]` instead of rejecting (`cors.ts:22-23`). Browser enforces origin match, but server behavior is misleading.
- **LOW** — `Access-Control-Allow-Headers` hardcoded to only `"Content-Type"` (`cors.ts:28`) — will break requests with `Authorization` header.
- **LOW** — Empty string in `ABLY_AUTH_CORS_ORIGINS` produces `[""]` which passes truthy check (`cors.ts:12-17`).

**`invariant.ts`:**
- **INFO** — Clean implementation. `InvariantError` extends `Error`, uses `asserts condition` for type narrowing. Consistently used across 20+ files.

**`recipe-costing.ts`:**
- **CRITICAL** — Division by zero in `scaleRecipeCost` when `currentYield` is 0. Produces `Infinity` propagated to `scaledTotalCost` and persisted (`recipe-costing.ts:340`).
- **CRITICAL** — `updateEventBudgetsForRecipe` uses additive budget accumulation: each call appends total recipe cost rather than replacing. Repeated calls inflate budget indefinitely (`recipe-costing.ts:469-478`).
- **HIGH** — N+1 pattern: `loadUnitConversions` issues unfiltered `SELECT * FROM core.unit_conversions` once per ingredient, fetching entire table each time (`recipe-costing.ts:43-53, 120`).
- **HIGH** — Case-sensitive inventory matching: `ii.name = i.name` silently produces 0 cost for case mismatches (`recipe-costing.ts:105-108`).
- **HIGH** — `recalculateRecipeCostsForInventoryItem` accepts `tenantId` as raw parameter without deriving from auth (`recipe-costing.ts:385-427`).

**`recipe-version-helpers.ts`:**
- **CRITICAL** — `getNextVersionNumber` race condition: reads `MAX(version_number)` and returns `max + 1` with no locking. Concurrent requests produce duplicate version numbers (`recipe-version-helpers.ts:166-177`).
- **HIGH** — Manifest + Prisma writes not in a single transaction. If Manifest write succeeds but Prisma fails, systems desync (`recipe-version-helpers.ts:243-308, 341-420`).
- **HIGH** — `copyIngredientsFromVersion` and `copyStepsFromVersion` insert one-at-a-time with no transaction (`recipe-version-helpers.ts:523-537, 546-594`).
- **MEDIUM** — Error responses include raw error messages, potentially leaking SQL errors and connection strings (`recipe-version-helpers.ts:296-307`).
- **MEDIUM** — Falsy coercion: `prepTimeMinutes || null` coerces explicit `0` to `null` (`recipe-version-helpers.ts:786-790`).

**`inventory-forecasting.ts`:**
- **HIGH** — Hardcoded `0.1` units/guest for event usage estimation regardless of item type (pencils = steak = 0.1 units/guest) (`inventory-forecasting.ts:307-309`).
- **HIGH** — `saveForecastToDatabase` does 62 sequential queries per SKU for a 30-day horizon, with no transaction and no unique constraint on `tenantId + sku + date` (`inventory-forecasting.ts:598-605`).
- **HIGH** — `batchCalculateForecasts` processes SKUs sequentially: 300+ queries for 100 items (`inventory-forecasting.ts:559-576`).
- **MEDIUM** — Event projections use empty SKU string, meaning every SKU gets identical event usage projections (`inventory-forecasting.ts:337-339`).
- **MEDIUM** — `dailyAverage` divides by 30 (lookback window) instead of `dataPoints` (actual days with usage), understating average for sporadically-used items (`inventory-forecasting.ts:245-253`).
- **MEDIUM** — MAPE label is misleading: metric is `(averageErrorDays / 30) * 100`, not actual Mean Absolute Percentage Error (`inventory-forecasting.ts:770-771`).
- **MEDIUM** — Confidence accuracy formula produces meaningless units (`100 - avgDaysError`) labeled as percentages (`inventory-forecasting.ts:797-808`).

### Part C: External Integration Packages

#### 1. Supplier Connectors (`packages/supplier-connectors/`)

**Supported suppliers:** US Foods (EDI-based stub), Charlie's Produce (REST API stub).

**Finding C-SC1 | HIGH | No Implementation Distinction**
- **File:** `charlies-produce.ts:64-68`, `us-foods.ts:64-68`
- Both connectors return `false`/empty results with no mechanism to distinguish "not implemented" from "auth failed" from "service down." `console.warn` includes credential key names.

**Finding C-SC2 | HIGH | Sync Transaction Error Handling**
- **File:** `sync-service.ts:88-135`
- `syncCatalog` collects Promise operations eagerly before `$transaction`. If any throws during Promise construction (not execution), the entire sync fails.

**Finding C-SC3 | MEDIUM | N+1 in syncChanges**
- **File:** `sync-service.ts:176-260`
- `syncChanges` runs sequential `findFirst` + `update`/`create` per product with no batching or transaction.

**Finding C-SC4 | MEDIUM | Unstructured Credential Storage**
- **File:** `types.ts:79`
- `credentials: Record<string, string>` with no constraints, encryption, or validation. API keys flow through as plain strings.

**Finding C-SC5 | INFO | Shared Connector Instances**
- **File:** `registry.ts:44-46`
- Singleton `connectorRegistry` is module-scoped and shared across all tenants.

#### 2. Payments (`packages/payments/`)

**Provider:** Stripe. Exports: `stripe` client, `Stripe` type, `keys()` env validator, `paymentsAgentToolkit` (Stripe AI agent toolkit).

**Finding C-PAY1 | CRITICAL | Stripe Key in Client Bundle Risk**
- **File:** `packages/payments/index.ts:1`
- `import "server-only"` is the sole guard preventing Stripe secret key from entering client bundles. If `server-only` is misconfigured in the build, the secret key is exposed. Key validation only checks `sk_` prefix — no distinction between test and live keys.
- **Exploitable:** THEORETICAL — depends on build configuration failure.

**Finding C-PAY2 | HIGH | No Tenant Scoping on AI Toolkit**
- **File:** `packages/payments/ai.ts:4-18`
- `paymentsAgentToolkit` initialized with the platform Stripe key, granting access to the entire account. No tenant scoping. An AI agent using this toolkit could affect any tenant's data.
- **Exploitable:** THEORETICAL — depends on AI agent usage patterns.

**Finding C-PAY3 | MEDIUM | Optional Webhook Secret**
- **File:** `packages/payments/keys.ts:9`
- `STRIPE_WEBHOOK_SECRET` is optional. If webhook endpoints exist without this env var, signature verification is skipped, allowing forged payloads.

#### 3. Webhooks (`packages/webhooks/`)

**Provider:** Svix. Exports: `webhooks.send()`, `webhooks.getAppPortal()`, `keys()`.

**Finding C-WH1 | CRITICAL | Silent Event Drops**
- **File:** `packages/webhooks/lib/svix.ts:8-31`
- `send` silently returns `undefined` when `orgId` is falsy (line 18). No error thrown, no logging, no indication the event was dropped. Callers cannot detect silent event loss. This violates event-driven system reliability — dropped events cause downstream data inconsistency.
- **Exploitable:** YES — events can be silently lost without detection.

**Finding C-WH2 | CRITICAL | Payload Injection via Spread**
- **File:** `packages/webhooks/lib/svix.ts:20-30`
- Payload construction spreads caller payload AFTER setting `eventType`:
  ```typescript
  payload: { eventType, ...payload }
  ```
  If caller's payload contains an `eventType` key, it overwrites the top-level eventType. A caller can inject `{ eventType: "different.event.type" }` to change the actual event type delivered by the webhook.
- **Exploitable:** YES

**Finding C-WH3 | HIGH | No Retry on Send Failure**
- **File:** `packages/webhooks/lib/svix.ts`
- `svix.message.create()` failures propagate to caller with no retry. Svix has its own delivery retry for created messages, but creation failures are not retried.

**Finding C-WH4 | MEDIUM | New Client Per Call**
- **File:** `packages/webhooks/lib/svix.ts:6, 38`
- New `Svix` client instance created on every `send()` and `getAppPortal()` call. Inefficient for high-volume event streams.

**Finding C-WH5 | MEDIUM | No Idempotency**
- **File:** `packages/webhooks/lib/svix.ts`
- No idempotency key support. Duplicate `send()` calls produce duplicate webhook deliveries. Svix supports `MessageIn.idempotencyKey` but it is not used.

### Recommended Actions

#### Tier 0 — Exploitable Vulnerabilities (fix immediately)

| # | Finding | File:Line | Action |
|---|---------|-----------|--------|
| A11-1 | A-06: Ably tenant spoofing | `apps/api/app/ably/auth/route.ts:126-135` | Derive `tenantId` exclusively from `auth().orgId` via `getTenantIdForOrg()`. Never accept from request body. |
| A11-2 | A-04: Cross-tenant forecast access | `apps/api/app/api/inventory/forecasts/batch/route.ts` | ~~Add `tenantId` filter from `requireTenantId()`.~~ **FIXED 2026-04-26**: Added `requireTenantId()` auth check and `tenantId` filter to the Prisma query. Endpoint was completely unauthenticated and returned inventory forecast data from ALL tenants; now properly scoped to the authenticated user's tenant. |
| A11-3 | A-05: Calendar callback IDOR | `apps/api/app/api/calendar/sync/callback/google/route.ts`, `outlook/route.ts` | Verify authenticated user belongs to the `tenantId` from the `state` param before writing. |
| A11-4 | A-11: Tracked .env files | Root `.env`, `packages/database/.env` | Run `git rm --cached` on both files immediately. |
| A11-5 | C-WH1: Silent webhook drops | `packages/webhooks/lib/svix.ts:18` | Throw error or log warning when `orgId` is missing. Never silently drop events. |
| A11-6 | C-WH2: Webhook payload injection | `packages/webhooks/lib/svix.ts:20-30` | Spread caller payload BEFORE `eventType`, or namespace under a key that cannot collide. |

#### Tier 1 — Security Hardening (fix next)

| # | Finding | File:Line | Action |
|---|---------|-----------|--------|
| A11-7 | A-12: NEXT_PUBLIC_ tokens | `packages/observability/next-config.ts:83-91` | Remove `NEXT_PUBLIC_` prefix; read server-side only. |
| A11-8 | A-01: Rate limiter inert | `apps/api/middleware/global-rate-limit.ts:38-55` | Inject `x-tenant-id`, `x-user-id` headers from Clerk session in proxy.ts before rate limit check. |
| A11-9 | A-03: Webhook signature missing | `collaboration/notifications/email/webhook`, `sms/webhook` | ~~Implement HMAC signature verification (follow the pattern in `webhooks/supplier-catalog`).~~ **Email webhook FIXED 2026-04-26** — Resend HMAC-SHA256 with replay protection. SMS webhook still unfixed. |
| A11-10 | C-PAY3: Optional Stripe webhook secret | `packages/payments/keys.ts:9` | Make `STRIPE_WEBHOOK_SECRET` required when webhook endpoints are deployed. |
| A11-11 | C-PAY1: Server-only guard | `packages/payments/index.ts:1` | Verify `server-only` is correctly configured in build pipeline. |

#### Tier 2 — Data Integrity (integration services)

| # | Finding | File:Line | Action |
|---|---------|-----------|--------|
| A11-12 | B-G03, B-N03: No transactions | Goodshuffle sync services, Nowsta sync service | Wrap multi-step sync operations in `database.$transaction()`. |
| A11-13 | B-G01, B-N01: No fetch timeout | `goodshuffle-client.ts:132`, `nowsta-client.ts:74` | Add `AbortController` with configurable timeout (30s default). |
| A11-14 | B-G02, B-N02: No retry | Same files | Add retry with exponential backoff for 5xx and network errors (3 retries max). |
| A11-15 | B-G04: Conflict detection dead code | Goodshuffle sync services | Either wire `_detectConflicts()` into sync flow or remove and document last-write-wins behavior. |
| A11-16 | B-N05: Resurrects soft-deleted | `nowsta-sync-service.ts:339-349` | Add `AND deleted_at IS NULL` to all sync UPDATE queries. |
| A11-17 | B-RC01: Division by zero | `recipe-costing.ts:340` | Guard `currentYield > 0`; validate `targetPortions > 0`. |
| A11-18 | B-RC02: Additive budget | `recipe-costing.ts:469-478` | ~~Rewrite to delta-based or replace-based budget update.~~ **FIXED 2026-04-26** in `update-budgets/route.ts`: Changed from additive `COALESCE(e.budget, 0) + cost` to assignment `COALESCE(cost, 0)`. |
| A11-19 | B-RV01: Version race condition | `recipe-version-helpers.ts:166-177` | Use `SELECT ... FOR UPDATE` or database sequence for atomic version numbering. |
| A11-20 | B-IF08: Empty SKU in forecasts | `inventory-forecasting.ts:337-339` | Pass actual SKU to `getUpcomingEventsUsingInventory` and implement SKU-to-event-menu mapping. |

#### Tier 3 — Reliability & Correctness

| # | Finding | File:Line | Action |
|---|---------|-----------|--------|
| A11-21 | B-RC03: N+1 unit conversions | `recipe-costing.ts:43-53` | Cache `loadUnitConversions` results; call once per `calculateAllRecipeCosts` batch. |
| A11-22 | B-RC04: Case-sensitive matching | `recipe-costing.ts:105-108` | Use `LOWER()` for case-insensitive matching. |
| A11-23 | B-IF01: Hardcoded 0.1 usage | `inventory-forecasting.ts:307-309` | Replace with per-item consumption rates from recipe data. |
| A11-24 | B-RV02: Manifest/Prisma desync | `recipe-version-helpers.ts:243-308` | Wrap in compensating-transaction pattern; persist Prisma first with outbox for retry. |
| A11-25 | C-WH3: No webhook retry | `packages/webhooks/lib/svix.ts` | Add retry with backoff for `svix.message.create()` failures. |
| A11-26 | B-QB1: CSV formula injection | Both QuickBooks export libs | Prefix cells starting with `=`, `+`, `-`, `@` with single quote. |

#### Tier 4 — Code Quality

| # | Finding | File:Line | Action |
|---|---------|-----------|--------|
| A11-27 | A-09: API key auth unused | Middleware + routes | Add `withApiKeyAuth` to routes that should support API key access (webhook receivers, cron). |
| A11-28 | A-07: No RBAC on 22 routes | Non-manifest routes using `requireTenantId()` | Add role checks for admin-only operations. |
| A11-29 | A-08: Auto-admin on provision | `tenant.ts:184` | Default new users to `role: "member"`. Admin requires explicit promotion. |
| A11-30 | B-N08: Email-only matching | `nowsta-sync-service.ts:52-64` | Add secondary matching key (e.g., employee ID) to handle email changes. |
| A11-31 | C-SC2/3: Sync batching | `supplier-connectors/sync-service.ts` | Batch `syncChanges` operations; fix eager Promise construction in `syncCatalog`. |
| A11-32 | B-IF04: Wrong average denominator | `inventory-forecasting.ts:245-253` | Divide by `dataPoints` instead of `daysToLookBack`. |
| A11-33 | B-RV07: Falsy coercion bug | `recipe-version-helpers.ts:786-790` | Replace `||` with `??` for numeric fields (`prepTimeMinutes`, `cookTimeMinutes`, etc.). |

---

## 11th Pass Addendum: Extended Deep-Dive Findings

> **Audited:** 2026-04-25 (second pass over same scope)
> **Method:** 6 parallel subagents re-auditing auth chain, route-level auth, integration services, external packages, and credential exposure. Findings cross-referenced against existing 11th pass. Only genuinely NEW findings are listed below.
> **Why a second pass:** The original 11th pass was a single-session effort. This addendum covers findings missed in the first pass, provides additional detail on existing findings, and corrects a factual inaccuracy in the API key hashing description.

### Corrections to Existing Findings

**Correction to A-09/A-10 (API Key Auth):**
- The existing 11th pass states API keys are "hashed with bcrypt (10 rounds)." This is incorrect. Per `apps/api/app/lib/api-key-service.ts:61-63`, keys are hashed with **SHA-256** (`crypto.createHash("sha256").update(...).digest("hex")`), not bcrypt. The timing-safe comparison at lines 73-82 is a custom XOR loop, not Node.js `crypto.timingSafeEqual`.
- **Impact:** SHA-256 is a fast hash. While acceptable here (the input is a high-entropy 32-byte random key, not a password), bcrypt would be more resistant if key entropy were ever reduced.

### New Findings — Part A: Authentication & Authorization

#### A-15 | MEDIUM | Sentry-Fixer GET Exposes Configuration Without Auth

- **File:** `apps/api/app/api/sentry-fixer/process/route.ts:416-444`
- The GET handler at `/api/sentry-fixer/process` is public (covered by the `/api/sentry-fixer/process` public route matcher). While the POST handler requires CRON_SECRET, the GET handler returns configuration details including: enabled status, whether GitHub/OpenAI/Slack secrets are configured, and operational state — all without any authentication.
- **Exploitable:** THEORETICAL — information disclosure only, no state mutation.

#### A-16 | HIGH | API Key Lookup Not Scoped by TenantId

- **File:** `apps/api/middleware/api-key-auth.ts:147-166`
- The `findFirst` query filters by `keyPrefix` and `deletedAt: null` but does **NOT** filter by `tenantId`. A key prefix lookup returns the first matching key across all tenants. While the 8-char random prefix makes collisions unlikely, the query allows any key to validate against any tenant's record. Once validated, the `ApiKeyContext` at line 41 includes `tenantId` from the matched record — meaning the caller inherits whichever tenant the first match belongs to.
- **Exploitable:** THEORETICAL — requires key prefix collision (extremely unlikely with 8-char random prefix). However, this is a defense-in-depth gap.
- **Note:** This finding is moot until API key auth is actually used by routes (see A-09).

#### A-17 | LOW | Timing-Safe Comparison Has Theoretical Length Leak

- **File:** `apps/api/app/lib/api-key-service.ts:96-98`
- If `computedHash.length !== hashedKey.length`, the function returns `false` immediately before the constant-time loop. SHA-256 hex strings are always 64 chars, so this never triggers in practice. But the early-return is technically a timing side-channel.
- **Exploitable:** NO — SHA-256 output is always 64 hex chars.

#### A-18 | MEDIUM | Rate Limiter Fail-Open on Redis Errors

- **File:** `apps/api/middleware/global-rate-limit.ts:183-187`, `apps/api/middleware/rate-limiter.ts:414-423`
- Both rate limiters catch Redis errors and allow the request through. If Redis is down or unreachable, all rate limiting is disabled. An attacker could target Redis to disable rate limiting across the platform.
- **Exploitable:** THEORETICAL — requires Redis to be down.

#### A-19 | LOW | Rate Limiter Instantiated Per-Request

- **File:** `apps/api/middleware/rate-limiter.ts:371-374`
- `createRateLimiter()` is called for every request, creating a new `Ratelimit` instance and Redis client wrapper. The global rate limiter at `global-rate-limit.ts:43-46` correctly creates the limiter once at module scope. The per-route limiter should follow the same pattern.
- **Exploitable:** NO — performance concern only.

#### A-20 | MEDIUM | IP Rate Limit Bypass via X-Forwarded-For Spoofing

- **File:** `apps/api/middleware/rate-limiter.ts:157-159`
- Falls back to `x-forwarded-for` header for rate limit identity when tenant headers are missing (which is always — see A-01). Takes `forwardedFor.split(",")[0]` which is the leftmost value — the one most easily spoofed. An attacker can rotate `X-Forwarded-For` values to bypass IP-based rate limits.
- **Exploitable:** YES — when behind a trusted reverse proxy, Vercel overwrites this header, mitigating the risk. Self-hosted deployments are vulnerable.

#### A-21 | INFO | Exempt Patterns Broader Than Needed

- **File:** `apps/api/middleware/global-rate-limit.ts:31-36`
- Exempts `/api/public/*` from rate limiting, but no `/api/public/*` routes exist in the codebase. The exemption is harmless but suggests planned-but-unimplemented public routes.

#### A-22 | THEORETICAL | CSP Allows unsafe-inline and unsafe-eval

- **File:** `apps/app/next.config.ts:251-258`
- The CSP in the web app allows `'unsafe-inline'` and `'unsafe-eval'` in `script-src`. This significantly weakens XSS protection. While Clerk SDK requires `unsafe-eval` for its authentication flows, `unsafe-inline` could potentially be replaced with nonce-based CSP.
- **Note:** This finding applies to the web app (`apps/app`), not the API app. The API app at `apps/api/next.config.ts` sets security headers but no CSP. The `packages/security/proxy.ts:12-13` explicitly disables CSP (`contentSecurityPolicy: false`).

### New Findings — Part B: Integration Services

#### B-G10 | LOW | response.json() Called on DELETE Endpoints (204 No Content)

- **File:** `apps/api/app/lib/goodshuffle-client.ts:245-249, 349-353, 456-460`
- `deleteEvent()`, `deleteInventoryItem()`, and `deleteInvoice()` call `this.request<void>(...)` which attempts `response.json()` at line 157. DELETE endpoints typically return 204 No Content with no body, causing `JSON.parse("")` to throw. The error is caught by the generic error handler, but this means delete operations always appear to "fail" even when they succeed.

#### B-G11 | MEDIUM | Event Status Always Set to 'draft'

- **File:** `apps/api/app/lib/goodshuffle-event-sync-service.ts:278`
- `createConvoyEventFromGoodshuffle()` hardcodes event status to `'draft'` regardless of the Goodshuffle event's actual status. A confirmed/booked event in Goodshuffle appears as draft in Convoy. The status field from Goodshuffle is available in the mapped data but is not used.
- **Data loss risk:** YES — event status information is silently lost on sync.

#### B-G12 | LOW | Inventory Items Created Without Supplier Link Silently

- **File:** `apps/api/app/lib/goodshuffle-inventory-sync-service.ts:240-249`
- When creating inventory items, the code runs `SELECT ... ORDER BY created_at ASC LIMIT 1` to find a default supplier. If no supplier exists, `supplierId` is null and the item is created without a supplier link — no warning or error logged.

#### B-G13 | LOW | Currency Hardcoded to USD

- **File:** `apps/api/app/lib/goodshuffle-invoice-sync-service.ts:274`
- Invoice budget items are created with `currency: 'USD'` hardcoded. Multi-currency tenants will have incorrect currency data on all Goodshuffle-sourced invoices.

#### B-G14 | MEDIUM | Client Objects Store Credentials as Plain Properties

- **File:** `apps/api/app/lib/goodshuffle-client.ts:122-124`, `apps/api/app/lib/nowsta-client.ts:62-65`
- Both client classes store `apiKey` and `apiSecret` as plain class properties with no `toString()` or `toJSON()` override. If the object is logged (e.g., by Sentry error capture or `console.log`), credentials would be exposed in logs/telemetry.

#### B-QB4 | MEDIUM | IIF Column Count Mismatch

- **File:** `apps/api/app/lib/quickbooks-bill-export.ts:291-419`, `apps/api/app/lib/quickbooks-invoice-export.ts:289-419`
- IIF format has mismatched column counts between row types: TRNS rows have 16 fields, SPL rows have 14 fields, but the header declares 16/18 columns respectively. QuickBooks Desktop strictly validates column alignment — mismatched counts cause import failures or data misalignment.

#### B-N08 | LOW | Dry-Run Mode Inflates Import Counters

- **File:** `apps/api/app/lib/nowsta-sync-service.ts:190-192`
- When `dryRun: true`, `processShift()` returns at line 248 without importing, but the caller at line 190-192 still increments `result.shiftsImported++`. Dry-run reports show inflated import counts that don't match actual behavior.

#### B-N09 | MEDIUM | No Aggregate Warning When All Shifts Fail

- **File:** `apps/api/app/lib/nowsta-sync-service.ts:333-334`
- `processShift()` throws if no location is found, which fails the individual shift. If NO location exists for a tenant (misconfiguration), ALL shifts fail individually with no aggregate warning. The sync result just shows `shiftsFailed: N` with no indication that the root cause is missing locations.

#### B-RV08 | HIGH | Duplicated Manifest createInstance() Call

- **File:** `apps/api/app/lib/recipe-version-helpers.ts:243-420`
- `createVersionViaManifest()` (lines 243-308) calls `runtime.createInstance()`. `createVersionWithConstraints()` (lines 311-420) ALSO calls `runtime.createInstance()` AND `createRecipeVersion()`. The duplication means the Manifest side-effect (`createInstance`) runs twice when constraints are used, creating orphaned Manifest instances.

### New Findings — Part C: External Integration Packages

#### C-SC6 | HIGH | Supplier Sync Env Var Injection via connectorId

- **File:** `apps/api/app/api/inventory/supplier-sync/route.ts:93-105`
- Credential keys are constructed dynamically: `process.env[\`SUPPLIER_${connectorId.toUpperCase().replace(/-/g, "_")}_API_KEY\`]`. The `connectorId` comes from user input (parsed from request body at line 62). While Zod validates it as `z.string().min(1)`, there is no constraint limiting it to known connector IDs before the env lookup. A malicious `connectorId` could probe unexpected environment variables.
- **Exploitable:** THEORETICAL — requires valid Clerk auth + knowledge of env var names. But the pattern is dangerous.

#### C-SC7 | MEDIUM | Incremental Sync Fetches Entire Catalog

- **File:** `packages/supplier-connectors/src/sync-service.ts:188-196`
- `syncChanges()` calls `connector.fetchCatalog(config)` to retrieve the entire catalog, then filters by `effectiveFrom >= since` in JavaScript. The `since` parameter is never sent to the supplier API. For large catalogs, this is wasteful and increases the window for data inconsistency if pricing changes between fetch and filter.

#### C-PAY4 | LOW | Hardcoded Stripe API Version

- **File:** `packages/payments/index.ts:6`
- `apiVersion: "2026-01-28.clover"` is hardcoded. When Stripe deprecates this version, the integration may silently break or receive unexpected response shapes.

#### C-PAY5 | MEDIUM | No Refund Handling

- **File:** `packages/payments/` (entire package)
- No refund logic exists. The webhook handler processes `checkout.session.completed` and `subscription_schedule.canceled` but does not handle `charge.refunded`, `payment_intent.payment_failed`, or dispute events. Refunds processed in Stripe Dashboard are never reflected in the application.

#### C-PAY6 | MEDIUM | Webhook Handler Does Full User Scan

- **File:** `apps/api/app/webhooks/payments/route.ts:12-20`
- `getUserFromCustomerId()` calls `clerk.users.getUserList()` with no filters, loading all users into memory, then searches client-side for a matching `stripeCustomerId`. Clerk paginates at 100 users by default — this silently fails for tenants with >100 users.

#### C-WH6 | LOW | Svix Token Cached at Module Level

- **File:** `packages/webhooks/lib/svix.ts:6`
- `const svixToken = keys().SVIX_TOKEN` is called once at module load. If the env var changes at runtime (key rotation), the stale token persists until process restart.

#### C-WH7 | LOW | Test Tokens Accepted in Production

- **File:** `packages/webhooks/keys.ts:8-10`
- Zod schema accepts both `sk_` (production) and `testsk_` (test) prefixed tokens with no environment-aware gating. A `testsk_` token in production routes messages to Svix's test infrastructure.

### New Findings — Cross-Cutting

#### X-01 | MEDIUM | dangerouslySetInnerHTML Usage Without Sanitization

- **Files:**
  - `packages/design-system/components/ui/chart.tsx:117`
  - `packages/seo/json-ld.tsx:17`
  - `apps/app/app/(authenticated)/components/ai-assistant/ai-assistant-panel.tsx:168`
  - `packages/manifest-runtime/src/App.tsx:262`
- Four components use `dangerouslySetInnerHTML`. The JSON-LD component is likely safe (structured data). The AI assistant panel at line 168 is highest risk — renders AI-generated content without sanitization.
- **Exploitable:** THEORETICAL — requires malicious AI response or stored content.

#### X-02 | INFO | Zero Test Coverage Across Integration Packages

- **Files:** `packages/supplier-connectors/`, `packages/payments/`, `packages/webhooks/`
- None of the three packages contain test files. No `.test.ts` or `.spec.ts` files exist. For packages handling financial transactions (payments) and data synchronization (supplier connectors), this is a significant reliability gap.

#### X-03 | LOW | Console.log Statements Include Sensitive IDs

- **File:** `apps/api/app/lib/tenant.ts:114, 148, 170`
- `console.log` statements include `tenantId`, `clerkId`, and `userId`. In production, these are captured by observability tools (Sentry, Better Stack) and may be accessible to support staff who should not see cross-tenant identifiers.

### Additional Recommended Actions

| # | Finding | File:Line | Action |
|---|---------|-----------|--------|
| A11-34 | A-20: IP rate limit bypass | `rate-limiter.ts:157-159` | Trust only the last `X-Forwarded-For` value (set by CDN/proxy), not the first (client-settable). |
| A11-35 | A-18: Redis fail-open | `global-rate-limit.ts:183-187` | Consider fail-closed for production: return 429 when Redis is unreachable. |
| A11-36 | A-16: API key unscoped lookup | `api-key-auth.ts:147` | Add `tenantId` to the `findFirst` where clause (or restructure to hash-based lookup). |
| A11-37 | B-G11: Event status hardcoded to draft | `goodshuffle-event-sync-service.ts:278` | Map Goodshuffle status field to Convoy status enum. |
| A11-38 | B-RV08: Duplicated Manifest call | `recipe-version-helpers.ts:243-420` | Refactor to single code path; `createVersionWithConstraints` should call the base version's logic, not duplicate it. |
| A11-39 | C-SC6: Env var injection | `inventory/supplier-sync/route.ts:93-105` | Validate `connectorId` against `connectorRegistry.listMetadata()` before constructing env var names. |
| A11-40 | C-PAY5: No refund handling | `packages/payments/` | Add handlers for `charge.refunded`, `payment_intent.payment_failed`, and dispute events. |
| A11-41 | C-PAY6: Full user scan | `webhooks/payments/route.ts:12-20` | Replace `getUserList()` with Clerk metadata query or local customer-to-user mapping table. |
| A11-42 | X-01: dangerouslySetInnerHTML | AI assistant panel, chart component | Add DOMPurify or similar sanitizer before rendering HTML content. |
| A11-43 | B-G10: 204 parse failure | `goodshuffle-client.ts:245-249` | Check `response.status === 204` before calling `response.json()` in delete methods. |

---

## 11th Pass Addendum 2: Credential Exposure & Webhook Security Deep-Dive

> **Audited:** 2026-04-25 (third sub-pass over same scope)
> **Method:** 5 parallel subagents — credential exposure scan across all `apps/` + `packages/`, webhook receiver deep-audit, route-level auth re-verification, integration services re-audit, external package re-audit. Findings cross-referenced against existing 11th pass + Addendum 1. Only genuinely NEW findings listed.
> **Why a third sub-pass:** The original 11th pass did not scan for hardcoded secrets in tracked scripts (only grepped source files under `apps/api/` and `packages/`). It also accepted the supplier-catalog webhook as the "gold standard" without verifying the conditional signature check. This addendum corrects both gaps.

### Corrections to Existing Findings

**CRITICAL Correction to A-14 ("No Hardcoded Secrets Found"):**
- The original 11th pass states: "Grep for `sk_live`, `sk_test` ... no hardcoded secret values found in source files." This is **incorrect**. The grep only covered `apps/` and `packages/` directories — it missed **5 tracked scripts in the repository root** that contain hardcoded credentials. See findings AE2-A01 and AE2-A02 below. Finding A-14 should be revised to acknowledge these exceptions.

**Correction to A-03 Assessment ("supplier-catalog is gold standard"):**
- The original 11th pass states: "`webhooks/supplier-catalog` correctly uses HMAC-SHA256 with `timingSafeEqual` — this is the gold standard pattern." While the HMAC implementation itself is correct, the signature check is **conditional** — it only runs when the `x-supplier-signature` header is present. Requests without this header are processed without verification. See finding AE2-A04 below. The "gold standard" assessment should be qualified.

### New Findings — Part A: Credential Exposure & Webhook Security

#### AE2-A01 | CRITICAL | Hardcoded Clerk Secret Key in Tracked Scripts

- **Files:**
  - `test-cp031-cp048-cp049.mjs:15`
  - `test-final.mjs:16`
  - `debug-ticket.mjs:7`
- All four tracked-in-git scripts contained an identical hardcoded Clerk `secretKey` (value redacted, prefix `sk_test_8hl...FOGHr`). This key grants full backend API access to the Clerk instance — user impersonation, org management, session creation. Anyone with repository read access could extract it from git history.
- **Exploitable:** YES — key is in git history even though source has been refactored.
- **UPDATE 2026-04-27:** PARTIALLY FIXED. All four scripts (`test-final.mjs`, `test-cp031-cp048-cp049.mjs`, `e2e-prod-test.mjs`, `debug-ticket.mjs`) refactored to read from `process.env.CLERK_SECRET_KEY` with fail-fast guard. **STILL REQUIRED:** Rotate the Clerk secret key — git history still contains the literal value. Treat as a credential breach if ever pushed to a public remote.

#### AE2-A02 | CRITICAL | Hardcoded Database Connection String in Tracked Scripts

- **Files:**
  - `check-new-event.mjs:4`
  - `test-cp086.mjs:119-120`
- Three tracked scripts (`check-new-event.mjs`, `test-cp086.mjs`, `packages/database/test-query.ts`) contained a real Neon PostgreSQL connection string with owner-level credentials (host: `ep-divine-math-ah5lmxku.*.aws.neon.tech`, password redacted, prefix `npg_4xR...`).
- **Exploitable:** YES — direct database access with owner-level credentials. Value remains in git history.
- **UPDATE 2026-04-27:** PARTIALLY FIXED. All three scripts refactored to read from `process.env.DATABASE_URL` with fail-fast guard. **STILL REQUIRED:** Rotate the Neon database password — git history still contains the literal value.

#### AE2-A03 | CRITICAL | Clerk Webhook Body Round-Trip Breaks Signature Verification

- **File:** `apps/api/app/webhooks/auth/route.ts:166-167`
- The Clerk webhook handler reads the body via `request.json()` and then re-serializes with `JSON.stringify(payload)` before passing to Svix's `webhook.verify()`. This JSON round-trip can alter whitespace, key ordering, and number formatting compared to the raw bytes Svix signed. A legitimate webhook could be rejected (false negative), or an attacker could craft a payload that passes verification after the round-trip transformation (theoretical false positive).
- **Contrast:** The Stripe webhook handler at `apps/api/app/webhooks/payments/route.ts:70` correctly uses `request.text()` for the raw body — this is the correct pattern.
- **Exploitable:** YES — legitimate webhooks may be rejected, causing user creation/update events to be silently lost.
- **Action:** Replace `request.json()` + `JSON.stringify()` with `request.text()` and pass the raw string to `webhook.verify()`.

#### AE2-A04 | HIGH | Supplier Catalog Webhook Signature Check Bypassed by Omitting Header

- **File:** `apps/api/app/api/webhooks/supplier-catalog/route.ts:124-157`
- The HMAC-SHA256 signature verification is **conditional**: `if (signature)` at line 125. If the `x-supplier-signature` header is absent, the entire verification block is skipped and the payload is processed without any authentication. An attacker can inject arbitrary vendor catalog data (pricing, availability, product details) by sending POST requests without a signature header.
- **Note:** The HMAC implementation itself is correct (uses `timingSafeEqual`), but the conditional guard makes it ineffective against attackers who simply omit the header.
- **Exploitable:** YES — any external party can submit catalog updates without credentials.
- **Action:** Reject requests where `x-supplier-signature` header is missing. Change `if (signature)` to a required check that returns 401 when absent.

#### AE2-A05 | HIGH | PII Logged in Clerk Webhook Body

- **File:** `apps/api/app/webhooks/auth/route.ts:192`
- After Svix signature verification, the full webhook body is logged: `log.info("Webhook", { id, eventType, body })`. This body contains user PII — email addresses, phone numbers, first/last names, avatar URLs. The PII enters the observability pipeline (Sentry, Better Stack) and may be accessible to support staff and developers.
- **Exploitable:** NO — but PII exposure to internal teams violates data minimization.
- **Action:** Remove the `body` field from the log statement, or redact to only `eventType` + `id` + timestamp.

#### AE2-A06 | HIGH | Unscoped Raw SQL in Email Webhook

- **File:** `apps/api/app/api/collaboration/notifications/email/webhook/route.ts:81-88`
- The unauthenticated Resend email webhook performs a raw SQL `$queryRaw` lookup by `email_id` (Resend ID) without any `tenant_id` filter. Combined with the lack of authentication (A-03), any external caller can enumerate email IDs and trigger database queries across all tenants. The query is parameterized (no SQL injection), but the lack of auth + lack of tenant scoping means this endpoint leaks cross-tenant email metadata.
- **Exploitable:** YES — in conjunction with A-03 (no signature verification).
- **Action:** Add HMAC signature verification (as A-03 recommends) AND add `tenant_id` filter to the query.
- **UPDATE 2026-04-26:** FIXED. Added Resend HMAC-SHA256 signature verification with 5-minute replay protection. The endpoint now rejects unauthenticated requests.

### New Findings — Part B: Security Configuration

#### AE2-B01 | MEDIUM | CSP Completely Disabled

- **File:** `packages/security/proxy.ts:13`
- Content Security Policy is explicitly set to `false`: `contentSecurityPolicy: false`. The comment notes "values depend on which Next Forge features are enabled." The web app (`apps/app/next.config.ts:250-265`) does set comprehensive CSP headers, but the API app (`apps/api/next.config.ts:81-96`) does not — it sets X-Frame-Options, X-Content-Type-Options, and HSTS but has no CSP at all. The `packages/security/` Nosecone config is the centralized place for this.
- **Exploitable:** THEORETICAL — depends on whether XSS vectors exist.
- **Action:** Configure at least a basic CSP in `packages/security/proxy.ts` or in `apps/api/next.config.ts` headers.

#### AE2-B02 | MEDIUM | Inconsistent CRON_SECRET Handling Across Cron Endpoints

- **Files:**
  - `apps/api/app/api/cron/inventory-audit/route.ts:131` — returns 503 when CRON_SECRET not set (correct)
  - `apps/api/app/api/cron/idempotency-cleanup/route.ts` — returns 503 when CRON_SECRET not set (correct)
  - `apps/api/app/api/cron/email-reminders/route.ts:27-29` — **allows access** when CRON_SECRET not set
  - `apps/api/app/api/cron/contract-expiration-alerts/route.ts:42-44` — **allows access** when CRON_SECRET not set
  - `apps/api/app/api/cron/webhook-retry/route.ts` — uses CRON_SECRET (correct)
- Two of five cron endpoints have `verifyCronAuth()` functions that return `true` when `CRON_SECRET` is not configured, effectively making those endpoints publicly accessible in environments where the env var is accidentally unset.
- **Exploitable:** YES — in misconfigured deployments.
- **Action:** Make all cron endpoints return 503 when `CRON_SECRET` is not set (follow the `inventory-audit` pattern).

#### AE2-B03 | MEDIUM | Public Routes at `/api/public/*` Blocked by Clerk Middleware

- **File:** `apps/api/proxy.ts:6-11`
- The `isPublicRoute` matcher does NOT include `/api/public(.*)`. However, public proposal response and contract signing endpoints exist at `/api/public/proposals/[token]/respond` and `/api/public/contracts/[token]/sign`. Since the middleware matcher is `["/api(.*)"]`, these routes go through Clerk auth. The route handlers use token-based access (no `auth()` call), but the middleware rejects unauthenticated requests with 401 before the handler can validate the token. This means **public proposal/contract links are likely broken for unauthenticated users**.
- **Exploitable:** NO — this is a **functional bug**, not a security vulnerability. The routes are over-protected rather than under-protected.
- **Action:** Add `/api/public(.*)` to the `isPublicRoute` matcher in `proxy.ts`.

#### AE2-B04 | MEDIUM | Sentry Signature Verification Falls Back to Timing-Unsafe Comparison

- **File:** `packages/sentry-integration/src/webhook.ts:41-44`
- The `verifySentrySignature` function catches hex parsing errors and falls back to plain string comparison: `return digest === signature`. This is NOT timing-safe and leaks information about the expected signature via timing side-channels. The comment acknowledges this: "(less secure but handles edge cases)."
- **Exploitable:** THEORETICAL — requires timing measurement capability and hex parsing failure.
- **Action:** Return `false` instead of falling back to `===`. If hex parsing fails, the signature is invalid.

#### AE2-B05 | MEDIUM | Cron Retry Uses Timing-Unsafe Bearer Token Comparison

- **File:** `apps/api/app/api/cron/webhook-retry/route.ts:49-50`
- The CRON_SECRET is compared via string inequality: `authHeader !== \`Bearer ${cronSecret}\``. This is not a timing-safe comparison. An attacker could use timing side-channels to brute-force the CRON_SECRET character by character.
- **Exploitable:** THEORETICAL — requires many requests and precise timing measurement.
- **Action:** Replace with `crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(\`Bearer ${cronSecret}\`))`.

#### AE2-B06 | MEDIUM | Nowsta Sync Exposes Employee Emails in Error Messages

- **File:** `apps/api/app/lib/nowsta-sync-service.ts:173-178`
- The error message concatenates all unmapped employee email addresses: `${unmapped.map((e) => e.email).join(", ")}`. This list is stored in `result.errors`, which is persisted to `nowstaConfig.lastSyncError` in the database (line 208-210). Employee PII (email addresses) are stored in an error log column visible through the admin UI.
- **Exploitable:** NO — internal data exposure to tenant admins.
- **Action:** Store only the count of unmapped employees, not their email addresses. Or log emails to a separate audit table not exposed in the UI.

### New Findings — Part C: Minor & Informational

#### AE2-C01 | LOW | Integration Client Credentials Stored as Plain Class Properties

- **Files:** `apps/api/app/lib/nowsta-client.ts:62-64`, `apps/api/app/lib/goodshuffle-client.ts:126-129`
- Both `NowstaClient` and `GoodshuffleClient` store `apiKey` and `apiSecret` as plain private properties with no `toString()` or `toJSON()` override. If the client instance is accidentally logged (e.g., by Sentry error capture or `console.log`), credentials would be exposed in logs/telemetry.
- **Exploitable:** THEORETICAL — requires accidental logging of the client object.
- **Action:** Add `toJSON()` override that returns `[Client redacted]` or similar.

#### AE2-C02 | LOW | Full Stripe Event Returned in Webhook Response

- **File:** `apps/api/app/webhooks/payments/route.ts:100`
- On successful processing, the full Stripe event object is returned: `NextResponse.json({ result: event, ok: true })`. This includes potentially sensitive customer and subscription details. While the caller is Stripe (low risk in practice), returning full event data is unnecessary.
- **Action:** Return only `{ ok: true, eventId: event.id }`.

#### AE2-C03 | LOW | Integration Test Logs Database URL Host

- **File:** `apps/api/test/setup.integration.ts:26-27`
- Logs the host portion of `DATABASE_URL`: `console.log("[integration] DATABASE_URL host:", process.env.DATABASE_URL?.split("@")[1]?.split("?")[0])`. Credentials are stripped (everything before `@`), but the hostname, region, and database name are logged in test output.
- **Action:** Remove or reduce to just logging whether DATABASE_URL is set.

### Positive Findings (Security Done Right)

These patterns are correctly implemented and should be preserved:

1. **Centralized secrets management** — `@t3-oss/env-nextjs` with Zod validation in per-package `keys.ts` files. All production code loads secrets via `process.env`. (Files: `packages/*/keys.ts`, `apps/api/env.ts`)

2. **Integration secrets masked in API responses** — Both `apps/api/app/api/integrations/goodshuffle/config/route.ts:71-78` and `apps/api/app/api/integrations/nowsta/config/route.ts:67-73` correctly mask API keys (`maskApiKey()` returning first 4 / last 4) and replace secrets with `"********"`.

3. **API key service uses secure patterns** — Keys generated with `crypto.randomBytes(32)`, hashed with SHA-256 (appropriate for high-entropy keys), timing-safe comparison. Plain key returned only once at creation. (File: `apps/api/app/lib/api-key-service.ts`)

4. **Outbound webhook signatures are correct** — HMAC-SHA256 with timestamp-prefixed payload, standard `t=,v1=` format. (File: `packages/notifications/outbound-webhook-service.ts:55-65`)

5. **Security headers on API app** — X-Frame-Options: DENY, X-Content-Type-Options: nosniff, HSTS with preload, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy. (File: `apps/api/next.config.ts:81-96`)

6. **CORS is NOT overly permissive** — Production has no CORS headers; development only allows `http://127.0.0.1:2221`. No `Access-Control-Allow-Origin: *`. (File: `apps/api/app/lib/cors.ts`)

7. **Secretlint configured** — `.secretlintrc.json` with recommended preset. (However, the hardcoded secrets in findings AE2-A01/A02 indicate secretlint is either not run in CI or these root scripts are excluded.)

### Summary of New Findings

| Severity | Count | Finding IDs |
|----------|-------|-------------|
| CRITICAL | 3 | AE2-A01 (Clerk secret in scripts), AE2-A02 (DB creds in scripts), AE2-A03 (webhook body round-trip) |
| HIGH | 3 | AE2-A04 (supplier sig bypass), AE2-A05 (PII in webhook log), AE2-A06 (unscoped email webhook) |
| MEDIUM | 6 | AE2-B01 through AE2-B06 |
| LOW | 3 | AE2-C01 through AE2-C03 |

### Updated Recommended Actions

| # | Finding | Priority | Action |
|---|---------|----------|--------|
| A11-44 | AE2-A01: Clerk secret in scripts | **TIER 0** | Source refactored 2026-04-27 (`process.env.CLERK_SECRET_KEY`, 4 scripts). **STILL REQUIRED:** Rotate the Clerk secret key — git history retains the literal. |
| A11-45 | AE2-A02: DB creds in scripts | **TIER 0** | Source refactored 2026-04-27 (`process.env.DATABASE_URL`). **STILL REQUIRED:** Rotate Neon owner password — git history retains the literal. |
| A11-46 | AE2-A03: Webhook body round-trip | **TIER 0** | Replace `request.json()` + `JSON.stringify(payload)` with `request.text()` in `apps/api/app/webhooks/auth/route.ts:166`. |
| A11-47 | AE2-A04: Supplier sig bypass | **TIER 1** | Make `x-supplier-signature` header required in `supplier-catalog/route.ts:125`. Reject with 401 if absent. |
| A11-48 | AE2-A05: PII in webhook log | **TIER 1** | Remove `body` from `log.info("Webhook", ...)` at `webhooks/auth/route.ts:192`. Log only `id`, `eventType`, `timestamp`. |
| A11-49 | AE2-A06: Unscoped email webhook | **TIER 1** | Add HMAC signature verification (as A-03 recommends) AND add `tenant_id` filter to the raw SQL query. |
| A11-50 | AE2-B02: Inconsistent CRON_SECRET | **TIER 2** | Make `email-reminders` and `contract-expiration-alerts` return 503 when `CRON_SECRET` not set. |
| A11-51 | AE2-B03: Public routes blocked | **TIER 2** | Add `/api/public(.*)` to `isPublicRoute` matcher in `proxy.ts`. |
| A11-52 | AE2-B04: Sentry timing-unsafe fallback | **TIER 3** | Return `false` instead of `digest === signature` in the catch block. |
| A11-53 | AE2-B05: Cron timing-unsafe comparison | **TIER 3** | Replace string comparison with `crypto.timingSafeEqual` for CRON_SECRET check. |
| A11-54 | AE2-B06: Employee emails in errors | **TIER 3** | Store only unmapped count, not email addresses. |
| A11-55 | AE2-B01: CSP disabled | **TIER 3** | Configure at least a basic CSP in `packages/security/proxy.ts`. |

---

