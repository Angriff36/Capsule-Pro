# Audit Archive — Pass 14: Error Handling & API Resilience Audit

Error handling and API resilience audit (3 sections: original, second pass, 2026-04-25 third). Captured verbatim from `IMPLEMENTATION_PLAN.md` during the 2026-04-28 cleanup.

## Error Handling & API Resilience Audit (14th Pass)

**Focus**: Error handling patterns, API resilience, partial failure safety, and observability. All prior passes (1–13) covered correctness, security, performance, and test quality. This pass exclusively audits *what happens when things go wrong*.

### Severity Legend

- **CRITICAL** — Will cause data corruption, silent failure, or security breach
- **HIGH** — Poor error handling that will cause issues under load or in edge cases
- **MEDIUM** — Inconsistent but not immediately dangerous
- **LOW** — Style/cosmetic

---

### Part A: Route-Level Error Handling Patterns

#### A1: Try/Catch Coverage (1347 route files scanned)

| Category | Count | Pct |
|---|---|---|
| Has try/catch (top-level) | 1254 | 93.1% |
| Partial try/catch (auth/tenant outside try) | 51 | 3.8% |
| Delegated to `executeManifestCommand` (safe) | 26 | 1.9% |
| **No try/catch at all** | **13** | **1.0%** |
| Disabled/empty | ~3 | — |

**Routes with NO try/catch (13 files)**:

1. `apps/api/app/api/collaboration/auth/route.ts` — delegates to `authenticate()`, DB failure unhandled
2. `apps/api/app/api/events/[eventId]/waitlist/route.ts` — 2× `$queryRawUnsafe` (lines 27-33, 37-58)
3. `apps/api/app/api/events/[eventId]/waitlist/commands/add-guest/route.ts` — 4× `$queryRawUnsafe` (lines 45-51, 60-64, 73-80, 84-109)
4. `apps/api/app/api/events/[eventId]/waitlist/commands/promote/route.ts` — 3× `$queryRawUnsafe` (lines 34-41, 51-60, 63-69)
5. `apps/api/app/api/events/[eventId]/waitlist/commands/update-rsvp/route.ts` — 4× `$queryRawUnsafe` (lines 45-52, 62-79, 83-91, 95-100)
6. `apps/api/app/api/events/imports/[importId]/route.ts` — uses parameterized `$queryRaw`, lower risk
7. `apps/api/app/api/health/sentry-canary/route.ts` — intentional canary, no DB
8. `apps/api/app/api/kitchen/events/today/route.ts` — 5 Prisma calls (lines 26-105) with no try/catch
9. `apps/api/app/api/kitchen/tasks/[id]/claim/route.ts` — complex 14-step route with `$transaction`, no try/catch
10. `apps/api/app/api/kitchen/tasks/available/route.ts` — 3 Prisma calls (lines 24-84)
11. `apps/api/app/api/kitchen/tasks/my-tasks/route.ts` — 2 Prisma calls (lines 22-53)
12. `apps/api/app/api/kitchen/waste/reports/route.ts` — 2 Prisma calls (lines 43-128)
13. `apps/api/app/api/kitchen/waste/trends/route.ts` — multiple helper DB calls

**Severity**: HIGH — The waitlist domain (files 2-5) uses `$queryRawUnsafe` with zero error handling. The kitchen/tasks domain (files 8-11) has complex operations including transactions without any error catching.

**Partial try/catch (51 routes)** — Auth/tenant resolution runs BEFORE the try block. Key examples:
- All cron routes (`cron/webhook-retry`, `cron/inventory-audit`, `cron/email-reminders`, `cron/contract-expiration-alerts`, `cron/idempotency-cleanup`)
- All analytics routes (`analytics/finance`, `analytics/kitchen`, `analytics/staff/summary`)
- `kitchen/waste/entries/route.ts` — heavy route with transaction but auth outside try
- `timecards/bulk/route.ts` — raw SQL queries with auth outside try

#### A2: Error Response Consistency

**Three distinct error response formats** used inconsistently:

| Format | Count | Example |
|---|---|---|
| `manifestErrorResponse("Internal server error", 500)` → `{ success: false, message }` | 1038 | Dominant/safe pattern |
| `{ error: "..." }` | 137 | Auth/policy errors |
| `{ message: "..." }` | 124 | Mixed into many domains |
| `{ success: false, message, details }` | 7 | Kitchen tasks domain |

**Severity**: MEDIUM — Inconsistent but not dangerous. The events domain is the worst offender, mixing all three formats within the same subdomain.

**46 routes leak `error.message` to clients on 5xx errors** — CRITICAL/HIGH. These routes pass raw error messages into client-visible responses, exposing Prisma error details (table names, column names, constraint names, SQL fragments). Key domains affected:
- **Collaboration notifications** (email preferences, send, webhook, workflows, SMS) — 11 routes
- **Kitchen recipes** (scale, update-with-version, restore-version, cost, create-with-version) — 8 routes
- **Kitchen tasks** (sync-claims, bundle-claim) — 5 routes
- **Cron jobs** (inventory-audit, email-reminders, webhook-retry, contract-expiration-alerts, idempotency-cleanup) — 10 routes
- **Inventory** (forecasts, alerts, reorder-suggestions, supplier-sync, PO export) — 6 routes
- **Events** (documents/parse, import, export) — 6 routes

Example leak from `kitchen/recipes/[recipeId]/scale/route.ts:207`:
```typescript
const message = error instanceof Error ? error.message : "Failed to scale recipe";
return manifestErrorResponse(message, 500);
// Client sees: "Unique constraint failed on the fields: (`tenant_id`,`recipe_version`)"
```

#### A3: Prisma Error Handling

**ZERO routes check Prisma error codes**. Searched across all 1347 files:
- `error.code === "P2002"` (unique constraint) — 0 matches
- `error.code === "P2025"` (record not found) — 0 matches
- `error.code === "P2003"` (foreign key) — 0 matches
- `PrismaClientKnownRequestError` — 0 matches

No route translates Prisma errors to appropriate HTTP status codes:
- P2002 (unique constraint) should → 409 Conflict (currently → 500)
- P2025 (record not found) should → 404 Not Found (currently → 500)
- P2003 (foreign key) should → 400 Bad Request (currently → 500)

**Severity**: MEDIUM — Users get generic 500s for what should be 404/409 errors. Not dangerous, but poor API design.

#### A4: Raw SQL Error Handling

| Method | File Count |
|---|---|
| `$queryRaw` (parameterized) | 141 files |
| `$executeRaw` | 23 files |
| `$queryRawUnsafe` | 27 files |
| **Total** | **~160 files** |

**$queryRawUnsafe without try/catch** (4 files, all waitlist domain):
- `events/[eventId]/waitlist/route.ts` — 2 calls, lines 27-58
- `events/[eventId]/waitlist/commands/add-guest/route.ts` — 4 calls, lines 45-109
- `events/[eventId]/waitlist/commands/promote/route.ts` — 3 calls, lines 34-69
- `events/[eventId]/waitlist/commands/update-rsvp/route.ts` — 4 calls, lines 45-100

**SQL injection vectors** (2 locations) — CRITICAL:
1. `apps/api/app/api/kitchen/allergens/matrix/route.ts:115` — user-controlled `dishIds` interpolated into `$queryRawUnsafe`:
   ```
   AND d.id IN (${dishIds.map((id) => `'${id}'`).join(", ")})
   ```
2. `apps/api/app/api/kitchen/allergens/matrix/route.ts:272` — same pattern with `recipeIds`

No UUID validation on the interpolated values. If `dishIds`/`recipeIds` contain malicious strings, SQL injection is possible.

**Additional SQL injection smell**:
- `apps/api/app/api/staffing/coverage/route.ts:67` — **N/A — FILE DOES NOT EXIST.** The file was never created.
- `apps/api/app/api/events/allergens/check/route.ts:308` — uses `Prisma.raw()` to interpolate IDs

---

### Part B: Partial Failure & State Consistency

#### B1: Transaction Rollback Analysis

**40+ `$transaction()` call sites found**. All use interactive mode. Zero use `isolationLevel`. Zero specify `timeout`.

**Most dangerous transaction pattern** — `apps/api/app/api/kitchen/overrides/route.ts:96-135` — CRITICAL:
```typescript
try {
  await database.$transaction(async (tx) => {
    await tx.overrideAudit.create({ ... });
    await tx.outboxEvent.create({ ... });
  });
} catch (error) {
  logger.warn("Override audit + outbox transaction failed", { error: String(error) });
}
// ALWAYS returns success, even if the transaction failed
return NextResponse.json({ success: true, override: { ... } });
```
The transaction error is caught and swallowed. The override is authorized with **no audit trail** and **no real-time notification**. The caller believes the override succeeded with full audit.

**Side effects outside transactions**:
- `apps/api/app/api/events/budgets/route.ts:241-244` — `fetchCreatedBudget()` runs outside tx, but only affects response, not data
- `apps/app/app/(authenticated)/events/actions.ts:269-276` — `revalidatePath` + `redirect` outside tx (acceptable)

**No transaction timeout or isolation level** — All 40+ transactions use Prisma defaults (READ COMMITTED, 5s timeout). Command board merge operations (`command-board/simulations/merge/route.ts:265`, `command-board/simulations/[id]/apply/route.ts:351`) perform many sequential writes and could exceed the default timeout.

#### B2: Multi-Step Operations Without Transactions

**15 multi-step operations lacking transaction wrapping**, ranked by risk:

| # | File:Line | Operations | Risk |
|---|---|---|---|
| 1 | `inventory/cycle-count/sessions/[id]/finalize/route.ts:80-313` | Per-item: create transaction → update inventory → update variance report. Then: createMany variance reports → processAdjustments → update session → create audit log | **CRITICAL** |
| 2 | `apps/api/app/lib/goodshuffle-invoice-sync-service.ts:260-308` | Budget INSERT then N line item INSERTs in loop | **CRITICAL** |
| 3 | `apps/api/app/lib/goodshuffle-invoice-sync-service.ts:338-371` | DELETE existing line items then INSERT new ones | **CRITICAL** |
| 4 | `apps/api/app/lib/goodshuffle-event-sync-service.ts:151-192` | Create event then create sync record | HIGH |
| 5 | `apps/api/app/lib/goodshuffle-inventory-sync-service.ts:146-186` | Create inventory item then create sync record | HIGH |
| 6 | `apps/api/app/lib/nowsta-sync-service.ts:284-411` | Upsert schedule → INSERT shift → upsert sync record | HIGH |
| 7 | `apps/app/app/(authenticated)/events/actions/event-dishes.ts:93-157` | INSERT dish → separate SELECT for ID → INSERT event_dishes | HIGH |
| 8 | `integrations/webhooks/trigger/route.ts:113-199` | create delivery log → send webhook → update log → update webhook stats | MEDIUM |
| 9 | `integrations/webhooks/retry/route.ts:96-256` | update delivery → create DLQ entry → update webhook stats | MEDIUM |
| 10 | `integrations/webhooks/dlq/[id]/retry/route.ts:104-193` | create log → send → update log → update DLQ → update webhook | MEDIUM |

**Outbox pattern** is used extensively and correctly:
- `packages/realtime/src/outbox/create.ts` — `createOutboxEvent()` supports both `PrismaClient` and `TransactionClient`
- `apps/api/app/outbox/publish/route.ts` — uses `FOR UPDATE SKIP LOCKED` for concurrent safety
- Routes properly write outbox events INSIDE transactions (`inventory/stock-levels/adjust`, `inventory/purchase-orders/[id]/items/[itemId]/quantity`, `kitchen/waste/entries`)

**Positive example**: The outbox pattern is well-implemented and consistently used for critical write paths.

#### B3: Webhook & Integration Failure Handling

**Webhook delivery pipeline** is well-architected:
- HMAC-SHA256 signature generation (`packages/notifications/outbound-webhook-service.ts:59`)
- Configurable timeout with `AbortController` (line 147)
- Exponential backoff: `baseDelay * 2^(attempt-1)`, capped at 30s (lines 96-99)
- Auto-disable after 5 consecutive failures (line 280-282)
- Full delivery logging with `WebhookDeliveryLog`
- DLQ with manual retry and resolution endpoints

**Webhook weaknesses**:
- **No jitter on backoff** — pure exponential causes thundering herd on mass failures
- **No circuit breaker** — disabled webhooks stay disabled until manual re-enable (no half-open state testing)
- **Retry requires external cron** — if cron isn't configured, failed webhooks sit forever

**Goodshuffle sync** — per-event error handling but no transaction wrapping and no rollback:
- Partial failures cause duplicate creation on next sync (entity created, sync record not)
- Invoice sync DELETE+INSERT pattern can lose all line items (finding #3 above)

**Nowsta sync** — same pattern: per-shift error handling, no transactions, partial failures cause duplicates.

**Fire-and-forget patterns**: Zero found. All async operations are properly awaited.

---

### Part C: Unhandled Promise Rejections & Silent Failures

#### C1: Unhandled Async Errors

| Pattern | Count | Risk |
|---|---|---|
| `.then()` without `.catch()` | 2 (both in same file, safe) | LOW |
| `Promise.all` | 49 calls across ~35 files | MEDIUM |
| `Promise.allSettled` | **0** (not used anywhere) | — |
| Fire-and-forget async | 0 | NONE |

The 2 `.then()` calls are in `collaboration/notifications/email/workflows/[id]/route.ts` (lines 84, 109) and delegate to a try/catch-enabled handler — safe.

49 `Promise.all` vs 0 `Promise.allSettled`: Some bulk operations (e.g., `inventory/purchase-orders/[id]/complete/route.ts` lines 87, 130, 179; `events/documents/parse/route.ts` lines 608, 711, 903) process multiple items where partial success would be meaningful. These should use `Promise.allSettled`.

**Global unhandled rejection handler**: None custom. Sentry SDK registers its own handler via `@sentry/nextjs` init in `packages/observability/server.ts`.

#### C2: Silent Error Swallowing

- **Empty catch blocks**: 0 truly empty catches found. One intentional empty catch in `apps/api/lib/manifest-command-handler.ts:101` for optional request body — acceptable.
- **Silent `.catch(() => ({}))` on request.json()**: 3 instances, all acceptable defaults for optional bodies.
- **Dangerous `.catch(() => [])`**: `inventory/supplier-sync/route.ts:197` — silently swallows `$queryRawUnsafe` errors, returning empty sync logs with comment "Table may not exist yet".
- **Routes returning success despite failure**: 0 found. All catch blocks return error responses.
- **~36 older flat routes** use `console.error` without `captureException` — errors invisible to Sentry monitoring. Includes business-critical routes (payroll period creation, proposals, time entries).

**Most dangerous silent failure** — `apps/api/app/api/kitchen/overrides/route.ts:96-135` — transaction error caught, swallowed (warn only), returns success. Audit trail and real-time notifications silently lost.

#### C3: Error Logging Quality

**Logging infrastructure exists but is almost entirely unused**:

| Pattern | Count |
|---|---|
| `console.error` | 331 occurrences, 250 files |
| `console.log` | 279 occurrences, 250 files |
| `log.error` (structured, from `@repo/observability`) | **4 occurrences, 3 files** |
| `log.info`/`log.warn`/`log.debug` (structured) | 15 occurrences, 3 files |
| `captureException` (Sentry) | 534 occurrences, 250 files |

**Only 3 of 1347+ routes use structured logging** (`log` from `@repo/observability/log`):
- `sentry-fixer/process/route.ts`
- `conflicts/detect/route.ts`
- `health/sentry-canary/route.ts`

**Correlation ID usage**: Only 1 route (`conflicts/detect/route.ts`) extracts/generates correlation IDs. The entire `correlation.ts` utility module in `@repo/observability` is essentially unused across the API.

**Severity**: CRITICAL — The observability infrastructure exists but is adopted by <0.3% of routes. 99.7% of routes use raw `console.error` with no structured fields, no correlation IDs, and no tenant/user context. Debugging production issues across the API is extremely difficult.

---

### Part D: Rate Limiting & Circuit Breaking

#### D1: External API Call Resilience

**21 outbound HTTP call sites identified**. Only 1 has proper timeout + retry + failure tracking (the outbound webhook service).

**Zero circuit breakers exist** anywhere in the codebase.

**External calls WITHOUT timeout protection** (can block indefinitely):
- Nowsta client (`apps/api/app/lib/nowsta-sync-service.ts`)
- Goodshuffle client (`apps/api/app/lib/goodshuffle-*-sync-service.ts`)
- All OAuth callback flows
- All AI/LLM calls (direct `fetch()` to OpenAI, bypassing the Agent class timeout)
- Slack webhook notifications
- Metrics/analytics webhooks

**Severity**: HIGH — A slow or unresponsive external service can block API request threads indefinitely.

#### D2: Rate Limiting Coverage

Two-layer architecture:
1. **Global middleware** (`apps/api/middleware/global-rate-limit.ts`) — 100 req/min, applied in `proxy.ts`
2. **Per-route HOF** (`apps/api/middleware/rate-limiter.ts`) — `withRateLimit` for stricter limits

**16 route handlers use explicit `withRateLimit`**.

**Rate limit gaps**:
- Public routes (`/api/public/*`) are fully exempt
- Webhook routes (`/webhooks/*`, `/api/webhooks/*`) are fully exempt
- `/api/public/proposals/[token]/respond` and `/api/public/contracts/[token]/sign` are publicly accessible, token-gated only, with no rate limiting
- Four bypass patterns exist: no tenant ID, Redis failure (fail-open), skip flag, broad exempt patterns

**Severity**: HIGH — Public proposal response and contract signing endpoints have no rate limiting.

#### D3: Timeout Configuration

Only **9 timeout configurations** exist across the entire codebase:

- Outbound webhook service: configurable timeout via `AbortController` (default 5s)
- Prisma connection: 15s connection timeout to Neon (in connection string)
- **No per-query timeouts**
- **No external API client timeouts** (Nowsta, Goodshuffle, OAuth, AI)
- **No sync operation timeouts** (Goodshuffle, Nowsta)
- **No transaction timeouts** (all 40+ transactions use Prisma 5s default)

**Severity**: HIGH — Long-running queries or external calls can consume resources indefinitely.

---

### Part E: Domain-Specific Error Handling Deep Dives

#### E1: Event Import (server-to-server)

**Files**: `eventimportworkflow/create`, `start-activating`, `complete-activating`, `fail` routes; `events/event-dishes/commands/create`

**Finding**: The event import workflow is a multi-step state machine via separate REST calls. Each call persists independently to `PrismaJsonStore` (JSON blob in `ManifestEntity` table). Dish creation is a completely separate API call.

**What happens on failure**: If dish creation fails mid-import, the workflow stays in "activating" state. Already-created dishes persist. No automatic rollback. The `fail` route exists but must be explicitly called by the client. No compensating transaction.

**Severity**: HIGH — Partially imported data (events with some dishes but not others) persists with no cleanup.

#### E2: Procurement PO Creation

**Files**: `inventory/purchase-orders/commands/create/route.ts`, `inventory/purchase-order-items/commands/create/route.ts`

**Finding**: PO header and line items are created via separate API calls to separate routes. Each creates an independent manifest runtime instance. PO uses `PrismaJsonStore` (no dedicated model). No transaction wrapping across header + line items.

**What happens on failure**: If PO header creation succeeds but line item creation fails, the header persists as a JSON blob with no line items. No retry mechanism. No compensating transaction.

**Severity**: HIGH — Orphaned PO headers with no line items.

#### E3: Inventory Cycle Count Finalization

**Files**: `inventory/cycle-count/sessions/[id]/finalize/route.ts` (lines 168-334)

**Finding**: The finalize handler performs N sequential operations WITHOUT a transaction:
1. `database.varianceReport.createMany()` (line 247) — bulk insert variance reports
2. **Per item in loop** (lines 80-152):
   - `database.inventoryTransaction.create()` (line 108) — adjustment transaction
   - `database.inventoryItem.update()` (line 124) — update on-hand quantity
   - `database.varianceReport.updateMany()` (line 137) — mark report approved
3. `database.cycleCountSession.update()` (line 273) — mark session finalized
4. `database.cycleCountAuditLog.create()` (line 293) — audit log

**What happens on failure**: If the 50th variance record fails, 49 items have adjusted quantities, 49 transactions created, 49 reports marked "approved". Remaining items untouched. Session NOT marked finalized. Data in inconsistent state with no safe retry path (re-running would double-apply adjustments to the first 49).

**Severity**: CRITICAL — Inventory quantities (affecting financial reporting and reorder calculations) become incorrect with no automated way to detect or repair.

#### E4: Payroll Run Generation

**Files**: `payroll/generate/route.ts` (lines 39-112), `packages/payroll-engine/src/services/payrollService.ts` (lines 80-200), `packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts` (lines 172-283)

**Finding**: Payroll generation performs 3 sequential DB write operations without transactions:
1. `savePayrollPeriod()` — creates period record
2. `savePayrollRecords()` — creates run + N line items via individual `upsert()` calls in a loop
3. `savePayrollAudit()` — creates audit (currently console-only)

Critical: `PrismaPayrollDataSource` **explicitly removes `$transaction`** from the Prisma client type (line 22-24):
```typescript
readonly #prisma: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
```
The data source CANNOT use transactions even if it wanted to.

**What happens on failure**: If a line item INSERT fails partway, the payroll run record exists with status "completed" but partial line items. The `PayrollService` catches the error and returns `{ status: "failed" }` with all-zero totals — misleading because partial data exists in DB.

**Severity**: CRITICAL — Incorrect payroll records affect compliance and employee payments.

#### E5: Webhook Delivery Pipeline

**Files**: `integrations/webhooks/trigger/route.ts`, `packages/notifications/outbound-webhook-service.ts`, `cron/webhook-retry/route.ts`, DLQ routes

**Finding**: The webhook pipeline is well-architected end-to-end:
- Outbox writes are inside transactions (when using manifest runtime)
- Publisher uses `FOR UPDATE SKIP LOCKED` for concurrent safety
- Delivery has configurable timeout, exponential backoff, signature generation
- Auto-disable after 5 consecutive failures
- Full DLQ with listing, retry (with URL override), and resolution

**Failure points**:
- Outbox write failure → route returns 500, event is lost (no retry for outbox write)
- Ably publish failure → event marked "failed" with error details, stays in outbox
- Webhook delivery failure → retry with backoff, eventually DLQ
- DLQ entries require manual intervention

**Severity**: MEDIUM — The pipeline is robust. The main risk is no automatic retry scheduling (requires external cron).

#### E6: Goodshuffle Full Sync

**Files**: `apps/api/app/lib/goodshuffle-event-sync-service.ts`, `goodshuffle-inventory-sync-service.ts`, `goodshuffle-invoice-sync-service.ts`

**Finding**: Per-entity error handling catches errors and continues. Sync status tracked on config record (`lastSyncStatus`: "success", "partial", "error"). No transaction wrapping for entity + sync record creation. No resume mechanism — failed entities are NOT retried on next sync.

**What happens on interruption**: Already-created entities persist without sync records. Next sync creates duplicates. Invoice sync DELETE+INSERT pattern can lose line item data.

**Severity**: HIGH — No resume capability. Partial syncs cause duplicate data on retry.

---

### Findings Summary — Priority Actions

| # | Finding | Severity | Location | Action |
|---|---------|----------|----------|--------|
| F1 | Cycle count finalization: no transaction, partial adjustments leave inventory inconsistent | CRITICAL | `inventory/cycle-count/sessions/[id]/finalize/route.ts:80-313` | Wrap entire finalization in `$transaction` |
| F2 | Payroll generation: `$transaction` explicitly removed from data source, partial line items persist | CRITICAL | `packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts:22-24` | Add `$transaction` back, wrap savePayrollRecords |
| F3 | Kitchen override audit: transaction error swallowed, returns success with no audit trail | CRITICAL | `kitchen/overrides/route.ts:96-135` | Propagate error or at minimum return error response |
| F4 | SQL injection: user-controlled IDs interpolated into `$queryRawUnsafe` | CRITICAL | `kitchen/allergens/matrix/route.ts:115,272` | Parameterize or validate as UUIDs |
| F5 | Goodshuffle invoice sync: DELETE+INSERT without transaction can lose line items | CRITICAL | `goodshuffle-invoice-sync-service.ts:260-371` | Wrap in `$transaction` |
| F6 | 46 routes leak `error.message` to clients, exposing DB schema details | HIGH | See A2 list | Replace with generic error message |
| F7 | 13 routes have no try/catch, including 4 waitlist routes with `$queryRawUnsafe` | HIGH | Waitlist domain + kitchen tasks domain | Add try/catch |
| F8 | Zero external API timeouts (Nowsta, Goodshuffle, OAuth, AI calls) | HIGH | All sync services + OAuth callbacks | Add `AbortController` timeouts |
| F9 | Public proposal/contract endpoints have no rate limiting | HIGH | `/api/public/proposals/[token]/respond`, `/api/public/contracts/[token]/sign` | Apply rate limiting |
| F10 | Structured logging used in only 3 of 1347 routes | CRITICAL | API-wide | Adopt `@repo/observability/log` across routes |
| F11 | Correlation IDs used in only 1 of 1347 routes | CRITICAL | API-wide | Adopt `@repo/observability/correlation` across routes |
| F12 | ~36 older flat routes missing `captureException` (Sentry) | HIGH | `payrollperiod/create`, `proposal/create`, etc. | Add `captureException` to all catch blocks |
| F13 | Goodshuffle/Nowsta sync: entity + sync record not transactional, causing duplicates | HIGH | All 3 sync services | Wrap entity+sync creation in `$transaction` |
| F14 | Event dish creation: INSERT + separate SELECT + INSERT, race condition | HIGH | `events/actions/event-dishes.ts:93-157` | Use transaction with `RETURNING` or `$transaction` |
| F15 | Zero Prisma error code handling — all Prisma errors return 500 | MEDIUM | API-wide | Add Prisma error → HTTP status mapping |
| F16 | 3 inconsistent error response formats across domains | MEDIUM | API-wide | Standardize on `manifestErrorResponse` |
| F17 | 49 `Promise.all` with 0 `Promise.allSettled` in bulk operations | MEDIUM | Various bulk routes | Use `Promise.allSettled` for partial-failure-tolerant ops |
| F18 | Webhook retry requires external cron, no jitter on backoff | MEDIUM | `cron/webhook-retry` + outbound service | Add jitter, verify cron config |
| F19 | Event import workflow: no rollback, partially imported data persists | HIGH | `eventimportworkflow/*` routes | Add compensating transactions or cleanup |
| F20 | PO creation: header + line items via separate API calls, not atomic | HIGH | `purchase-orders/commands/create`, `purchase-order-items/commands/create` | Wrap in single transaction or saga |

---

## Error Handling & API Resilience Audit (14th Pass)

> **Date:** 2026-04-25
> **Method:** 7 parallel subagent investigations (A1 try/catch coverage, A2 error response consistency, A3-A4 Prisma & raw SQL errors, B partial failure & state consistency, C unhandled promises & silent failures, D rate limiting & resilience, E domain-specific deep dives).
> **Scope:** Error handling patterns, transaction safety, error response consistency, external API resilience, and end-to-end flow tracing. All prior passes (1-13) focused on correctness, security, performance, and test quality; error handling was never systematically audited.
> **Key stats:** 1,347 route files, 43 without try/catch (25 are bugs), 30 `$transaction()` call sites, 251+ raw SQL call sites, 0 specific Prisma error code checks, 2099 `console.*` calls (13 use structured logging), 44 `Promise.all` with 0 `Promise.allSettled`.

### Executive Summary

The codebase has a solid foundation — the outbound webhook pipeline (exponential backoff, DLQ, auto-disable), global rate limiting (Upstash Redis, 100 req/min), and the Manifest Runtime's atomic command execution are well-designed. However, the hand-written routes (the majority of the API) suffer from systematic error handling gaps:

1. **Zero Prisma error translation** — No route anywhere checks for P2002/P2025/P2003 error codes. All database constraint violations surface as generic 500s.
2. **Three incompatible error response shapes** — `{ message }`, `{ error }`, and `{ success: false, message }` coexist even within the same domain.
3. **25 routes do async work without try/catch** — including 4 waitlist routes executing raw SQL with zero error handling.
4. **Multi-step operations without transactions** — The three most financially sensitive flows (PO creation, cycle count finalize, payroll generation) are not atomic and can leave corrupted state on partial failure.
5. **No timeouts on any external API client** — Goodshuffle, Nowsta, Google, and Microsoft clients all use bare `fetch()` with no AbortController.
6. **Raw `error.message` leaked in 5xx responses** — 7+ routes return Prisma/SQL error details to clients.

### Severity Counts

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 12 | Data corruption, SQL injection, silent success on failure, unbounded external calls |
| HIGH | 16 | Missing transaction wrapping, no retry/timeout on integrations, error info leakage |
| MEDIUM | 15 | Inconsistent error formats, partial try/catch, no structured logging |
| LOW | 8 | Acceptable fire-and-forget, webhook 200-on-failure intentional |

---

### Part A: Route-Level Error Handling Patterns

#### A1: Try/Catch Coverage

**Total route files:** 1,347
**With try/catch:** 1,304
**Without try/catch:** 43

Of the 43 without try/catch:
- **3 files** are disabled/stub files (comment placeholders)
- **15 files** delegate entirely to `executeManifestCommand` — ACCEPTABLE (the wrapper has its own comprehensive try/catch at `apps/api/lib/manifest-command-handler.ts:93-186`)
- **25 files** do direct database queries, `request.json()`, or other async work with NO error handling — BUGS

**CRITICAL — Routes doing raw SQL ($queryRawUnsafe) without any try/catch:**

| File | Lines | Issue |
|------|-------|-------|
| `events/[eventId]/waitlist/commands/add-guest/route.ts` | 12-112 | 4x `$queryRawUnsafe` + `request.json()`, zero try/catch |
| `events/[eventId]/waitlist/commands/promote/route.ts` | 14-72 | 3x `$queryRawUnsafe` + `request.json()`, zero try/catch |
| `events/[eventId]/waitlist/commands/update-rsvp/route.ts` | 19-116 | 5x `$queryRawUnsafe` including UPDATEs + `request.json()`, zero try/catch |
| `events/[eventId]/waitlist/route.ts` | 11-87 | 2x `$queryRawUnsafe`, zero try/catch |

**CRITICAL — Routes doing direct DB queries without try/catch (GET handlers):**

| File | Lines | Issue |
|------|-------|-------|
| `administrative/tasks/route.ts` | 11-65 | `auth()`, `database.adminTask.count()`, `database.adminTask.findMany()` all unprotected |
| `kitchen/events/today/route.ts` | 13-212 | 6 separate `database.*` queries, all unprotected |
| `kitchen/tasks/available/route.ts` | 14-141 | 4 `database.*` queries, all unprotected |
| `kitchen/tasks/[id]/claim/route.ts` | 44-206 | 14-step handler with `$transaction()`, zero error handling |
| `kitchen/tasks/my-tasks/route.ts` | 12-96 | 3 `database.*` queries, all unprotected |
| `kitchen/tasks/route.ts` | 8-103 | GET handler has 3 `database.*` queries, unprotected |
| `kitchen/waste/reports/route.ts` | 17-185 | 2 `database.*` queries, complex aggregation, no try/catch |
| `staff/availability/[id]/route.ts` | 17-122 | GET calls `database.$queryRaw`, unprotected |
| `staff/availability/route.ts` | 23-180 | GET calls 2x `database.$queryRaw`, unprotected |
| `staff/certifications/[id]/route.ts` | 17-117 | GET calls `database.$queryRaw`, unprotected |
| `staff/certifications/route.ts` | 20-129 | GET calls 2x `database.$queryRaw`, unprotected |
| `staff/employees/[id]/route.ts` | 16-99 | GET calls `database.$queryRaw`, unprotected |
| `staff/shifts/route.ts` | 21-131 | GET calls 2x `database.$queryRaw`, unprotected |
| `staff/time-off/requests/[id]/route.ts` | 13-141 | GET calls `database.$queryRaw`, unprotected |
| `staff/time-off/requests/route.ts` | 28-161 | GET calls 2x `database.$queryRaw`, unprotected |
| `timecards/[id]/route.ts` | 8-168 | GET calls `database.$queryRaw` (120+ line query), unprotected |
| `timecards/route.ts` | 21-201 | GET calls 2x `database.$queryRaw` (massive CTEs), unprotected |
| `training/assignments/route.ts` | 23-203 | GET calls 2x `database.$queryRaw`, unprotected |
| `training/modules/[id]/route.ts` | 17-115 | GET calls `database.$queryRaw`, unprotected |
| `training/modules/route.ts` | 25-153 | GET calls 2x `database.$queryRaw`, unprotected |

**CRITICAL — Routes with PARTIAL try/catch (async operations outside try block):**

| File | Lines | Issue |
|------|-------|-------|
| `training/complete/route.ts` | 31, 42, 77 vs try at 93 | `request.json()`, 2x `database.$queryRaw` BEFORE try block |
| `kitchen/tasks/bundle-claim/route.ts` | 60, 104, 127 vs try at 168 | `database.user.findFirst()`, `database.kitchenTaskClaim.findMany()`, `database.prepTask.findMany()` BEFORE try block |
| `kitchen/overrides/route.ts` | 38, 52 vs try at 95 | `request.json()`, `database.user.findFirst()` BEFORE try block |
| `kitchen/waste/entries/route.ts` | 531, 534 vs try at 540 | `request.json()`, `validateWasteRequest()` BEFORE try block |
| `webhooks/supplier-catalog/route.ts` | 160 vs try | `database.inventorySupplier.findFirst()` outside try block |

#### A2: Error Response Consistency

**HIGH — THREE incompatible error response shapes coexist:**

| Shape | Key | Used by | Example files |
|-------|-----|---------|---------------|
| `{ message: string }` | `message` | Direct routes (accounts, inventory, kitchen, staff) | `accounting/accounts/route.ts`, `inventory/items/route.ts` |
| `{ error: string }` | `error` | Direct routes (invoices, payments, employees, logistics) | `accounting/invoices/route.ts`, `staff/employees/route.ts` |
| `{ success: false, message: string }` | `success` + `message` | Manifest routes | All `commands/create` routes under events, procurement, facilities |

**Within the accounting domain alone**, `accounts/` uses `{ message }` while `invoices/` and `payments/` use `{ error }`. The frontend cannot parse errors uniformly.

**HIGH — Zero Prisma error code translation:**
No route in the entire codebase checks for `error.code === 'P2002'` (unique constraint), `P2025` (not found), or `P2003` (FK violation). All database constraint violations surface as generic 500s instead of proper 409/404/422.

**CRITICAL — Raw `error.message` leaked in 5xx responses:**

| File | Lines | Issue |
|------|-------|-------|
| `kitchen/waste/entries/route.ts` | 577-583 | Returns `error: error.message` on 500 — Prisma errors leak table/column names |
| `kitchen/ai/bulk-generate/prep-tasks/route.ts` | 81-87 | Returns `error: message` on 500 |
| `staff/shifts/bulk-assignment/route.ts` | 124 | Returns `error: error.message` on 500 |
| `kitchen/tasks/sync-claims/route.ts` | 91, 137 | Returns `error: error.message` on 500 |
| `conflicts/detect/route.ts` | 114 | Returns `error: error.message` on 500 |
| `command-board/simulations/merge/route.ts` | 550, 598 | Returns `error: error.message` on 500 |
| `events/[eventId]/export/csv/route.ts` | 339 | Returns `message: error.message` on 500 from `$queryRawUnsafe` |
| `events/[eventId]/export/pdf/route.tsx` | 388 | Same leak pattern from `$queryRawUnsafe` |
| `events/[eventId]/battle-board/pdf/route.tsx` | 358 | Same leak pattern from `$queryRawUnsafe` |
| `events/export/csv/route.ts` | 338 | Same leak pattern from `$queryRawUnsafe` |
| `events/budgets/route.ts` | 252 | Serializes entire error object as `errors: error` |

#### A3: Prisma Error Handling

**Finding:** The codebase uses a consistent pattern of catching `InvariantError` (from the manifest/assertion layer) and returning 400, while all other errors (including Prisma errors) get a generic 500 with no classification. There are zero instances of `PrismaClientKnownRequestError` or `error.code` checks for Prisma-specific errors.

**Impact:** Unique constraint violations return 500 instead of 409 Conflict. Record-not-found returns 500 instead of 404. FK violations return 500 instead of 400/422. The only 409 responses in the codebase come from manually coded duplicate checks.

#### A4: Raw SQL Error Handling

**251+ raw SQL call sites** across the API:
- `database.$queryRaw` (tagged template): ~130 sites — parameterized, safe from injection
- `database.$queryRawUnsafe`: ~80+ sites across ~30 files
- `database.$executeRaw`: ~65 sites
- `database.$executeRawUnsafe`: 4 sites across 3 files

**CRITICAL — SQL injection via `buildRuleCondition()`:**
- `apps/api/app/api/crm/scoring/calculate/route.ts`, lines 31-60, 147-157
- `buildRuleCondition()` constructs SQL WHERE clauses via string interpolation. The `field` parameter falls back to raw value if not in `FIELD_COLUMN_MAP` (line 36: `FIELD_COLUMN_MAP[field] ?? field`). Values have basic single-quote escaping but this is insufficient.
- If CRM scoring rules are user-controllable, this is a direct SQL injection vector via `$executeRawUnsafe`.

**HIGH — 4 waitlist routes with `$queryRawUnsafe` and zero try/catch** (see A1 above).

**MEDIUM — 6 export routes leak SQL error details** via `error.message` on 500 (see A2 above).

---

### Part B: Partial Failure & State Consistency

#### B1: Transaction Safety Issues

**CRITICAL — Transaction failure caught and success returned anyway:**
- `apps/api/app/api/kitchen/overrides/route.ts`, lines 96-148
- The `$transaction` (lines 96-129) writes an `overrideAudit` record and an `outboxEvent`. The catch block (line 130) only logs via `logger.warn()`. Execution proceeds to `return NextResponse.json({ success: true, ... })` at line 137.
- If the transaction fails, the client receives `{ success: true }` but no audit trail was recorded and no outbox event was emitted. Compliance violation.

**CRITICAL — `$transaction` explicitly removed from Payroll Data Source:**
- `packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts`, lines 22-24
- `readonly #prisma: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;`
- `savePayrollRecords` (lines 196-284) performs multiple sequential writes without any transaction capability. If a line item write fails, the payroll run exists with partial data.

**CRITICAL — Cycle count finalization without transaction:**
- `apps/api/app/api/inventory/cycle-count/sessions/[id]/finalize/route.ts`, lines 80-313
- 5+ sequential DB operations: `createMany` variance reports, loop creating `inventoryTransaction` + updating `inventoryItem.quantityOnHand` + updating `varianceReport` status per record, then update session to finalized, then create audit log. None wrapped in `$transaction`.
- If processing fails on the 50th of 100 variance records: 49 items have adjusted quantities, 51 do not. Session is not finalized. No rollback capability.

**CRITICAL — Goodshuffle invoice sync DELETE + INSERT without transaction:**
- `apps/api/app/lib/goodshuffle-invoice-sync-service.ts`, lines 338-370
- `updateConvoyBudgetFromGoodshuffle` DELETEs all invoice-sourced line items, then loops to INSERT new ones. If the process crashes after DELETE but before all INSERTs, the budget has zero line items — data loss.

**HIGH — Supplier sync eagerly-resolved promises in batch transaction:**
- `packages/supplier-connectors/src/sync-service.ts`, lines 88-135
- `createOps`/`updateOps` arrays contain already-executing promises (not deferred operations). Passed to `$transaction()` batch form which expects unresolved operations. Preceding operations may have already committed outside the transaction scope.

**HIGH — Outbox events written after transaction commits:**
- `apps/api/app/api/kitchen/tasks/bundle-claim/route.ts`, lines 242-256
- The `$transaction` creates claims and updates tasks atomically, but `createOutboxEvent()` calls happen OUTSIDE the transaction block. If the process crashes between transaction commit and outbox writes, real-time subscribers never receive notification.
- Note: The single-task claim route (`tasks/[id]/claim/route.ts:140`) correctly writes outbox events inside the transaction. Only the bundle-claim route has this bug.

**HIGH — Goodshuffle event/inventory sync: entity + sync record not transactional:**
- `apps/api/app/lib/goodshuffle-event-sync-service.ts`, lines 93-235
- `apps/api/app/lib/goodshuffle-inventory-sync-service.ts`, lines 91-225
- For each item, creates a Convoy entity via `$queryRaw INSERT`, then separately creates a sync record. If sync record creation fails, the next sync run creates a duplicate entity.

**HIGH — Nowsta sync: multi-step shift creation without transaction:**
- `apps/api/app/lib/nowsta-sync-service.ts`, lines 236-412
- `processShift` performs 5+ sequential DB operations (find sync record, lookup employee, find/create schedule, create shift, create/update sync record) without a transaction.

**MEDIUM — Outbox writes use separate transaction when no override provided:**
- `packages/manifest-adapters/src/manifest-runtime-factory.ts`, lines 363-371
- When `deps.prismaOverride` is not provided, outbox writes are wrapped in their own `$transaction`, separate from the command's mutations. If the command succeeded but the outbox transaction fails, the outbox event is lost while the mutation persists.

**MEDIUM — No `isolationLevel` or `timeout` on any transaction:**
- All 70+ `$transaction()` call sites use default Prisma settings (5s timeout). No explicit `isolationLevel`, `maxWait`, or `timeout` configured anywhere.

#### B2: Outbox Pattern

**POSITIVE — Outbox pattern is well-implemented:**
- `packages/realtime/src/outbox/create.ts` accepts `PrismaClient | Prisma.TransactionClient` — can be called inside transactions
- Most transaction routes correctly write outbox events inside `$transaction` blocks
- Outbox publisher uses `FOR UPDATE SKIP LOCKED` for concurrent safety
- One exception: `bundle-claim` route writes outbox events outside transaction (see B1 above)

---

### Part C: Unhandled Promise Rejections & Silent Failures

#### C1: Async Error Patterns

**LOW — `.then()` chains without `.catch()`:**
- Only 1 file uses this pattern: `collaboration/notifications/email/workflows/[id]/route.ts` (lines 84, 109)
- Mitigated: the returned promise delegates to `executeManifestCommand` which has comprehensive try/catch

**LOW — Promise.all usage:**
- 49 `Promise.all()` calls, 0 `Promise.allSettled()` calls
- All 49 are appropriate: pagination data+count pairs, operations inside transactions, or metrics where partial data is useless
- No instances require `Promise.allSettled()`

**LOW — No fire-and-forget `void` patterns found** in the API route layer.

#### C2: Silent Error Swallowing

**MEDIUM — Catch blocks that silently swallow errors:**

| File | Lines | Issue |
|------|-------|-------|
| `administrative/trash/analyze/route.ts` | 461-463 | `catch { return null; }` — entity lookup failure silently returns null |
| `calendar/sync/trigger/route.ts` | 215-217, 274-276 | `catch { errors++; }` — individual event import errors discarded (only count kept) |
| `cron/contract-expiration-alerts/route.ts` | 70-71 | `catch { return DEFAULT_CONFIG; }` — config parse failure silently falls back |

**MEDIUM — Webhook routes returning 200 on processing failure (intentional):**
- `collaboration/notifications/sms/webhook/route.ts:89` — Returns 200 to prevent Twilio retry loop (correct)
- `collaboration/notifications/email/webhook/route.ts:97` — Returns `received: true` when log not found
- `webhooks/supplier-catalog/route.ts:266-272` — Returns `received: true` with error count but no retry for failed items

**POSITIVE — The catch-then-log-then-return-500 pattern is well-established** across 250+ route files:
```typescript
catch (error) {
  captureException(error);
  console.error("Description:", error);
  return NextResponse.json({ error: "message" }, { status: 500 });
}
```

#### C3: Error Logging Quality

**MEDIUM — Inconsistent structured logging adoption:**
- Structured logging library exists: `packages/observability/log.ts` wraps `@logtail/next` (Logtail/Better Stack)
- Only **13 of 250+ route files** use the structured `log` export
- The remaining 250+ files use raw `console.error`/`console.log` (412 total `console.*` calls)
- In production, `console.*` calls may not be captured by log aggregation

**MEDIUM — Correlation/request IDs not propagated:**
- Correlation ID utility exists: `packages/observability/correlation.ts` with `generateCorrelationId()`, `getOrCreateCorrelationId()`
- Only **1 route** (`conflicts/detect/route.ts`) uses correlation IDs
- The remaining 250+ routes have no way to correlate logs from a single request across services

**POSITIVE — Sentry integration is thorough:** `captureException` used in 376 catch blocks across 250 files.

---

### Part D: Rate Limiting & Circuit Breaking

#### D1: External API Call Resilience

**CRITICAL — No timeouts on external API clients:**

| Client | File | Line | Issue |
|--------|------|------|-------|
| Nowsta Client | `apps/api/app/lib/nowsta-client.ts` | 80 | `fetch()` with no AbortController, no timeout |
| Goodshuffle Client | `apps/api/app/lib/goodshuffle-client.ts` | 138 | `fetch()` with no AbortController, no timeout |
| Google OAuth (3 calls) | `calendar/sync/callback/google/route.ts` | 56, 82, 98 | Token exchange + userinfo + calendar, no timeout |
| Microsoft OAuth (3 calls) | `calendar/sync/callback/outlook/route.ts` | 56, 85, 102 | Token exchange + userinfo + calendar, no timeout |
| Calendar sync trigger | `calendar/sync/trigger/route.ts` | 176, 240 | Google Calendar + Microsoft Graph, no timeout |

Node.js `fetch` has no default timeout. A hung connection blocks the serverless function until the Vercel function timeout (10-60s).

**CRITICAL — No retry on external API clients:**

| Client | File | Issue |
|--------|------|-------|
| Nowsta Client | `apps/api/app/lib/nowsta-client.ts` | Throws `NowstaApiError` immediately, no retry |
| Goodshuffle Client | `apps/api/app/lib/goodshuffle-client.ts` | Throws `GoodshuffleApiError` immediately, no retry |
| Google/Microsoft OAuth | Both callback routes | Transient network failure loses the entire OAuth flow |
| Calendar sync | `calendar/sync/trigger/route.ts` | Failures recorded as `lastSyncStatus: "error"`, no auto-retry |

**HIGH — No circuit breaking anywhere in codebase:**
- Zero instances of circuit breaker, half-open state, or automatic recovery
- Closest approximation: outbound webhook auto-disable (5 consecutive failures), but this lacks half-open state and automatic recovery

**HIGH — No Prisma connection pool or query timeout configuration:**
- `packages/database/prisma/schema.prisma` has no `connection_limit`, `pool_timeout`, `queryTimeout`, or `interactiveTransactions` settings
- Connection pool size defaults to `num_cpus * 2 + 1`
- No explicit query timeout

**HIGH — Public endpoints have NO rate limiting:**
- `/api/public/(.*)` is explicitly exempt in `apps/api/middleware/global-rate-limit.ts:35`
- These are the most abuse-prone endpoints

**MEDIUM — No retry on notification providers:**
- Email (Resend): `packages/notifications/email-notification-service.ts` — single try, no retry
- SMS (Twilio): `packages/notifications/sms-notification-service.ts` — single try, no retry
- Slack: `packages/sentry-integration/src/slack.ts` — no retry, notification silently lost on failure

**MEDIUM — No timeout on internal webhooks:**
- Slack webhook: `packages/sentry-integration/src/slack.ts:244` — no timeout
- AI Metrics webhook: `packages/ai/src/metrics.ts:139` — no timeout

**POSITIVE — Outbound webhook service has proper resilience:**
- `packages/notifications/outbound-webhook-service.ts`: AbortController with configurable timeout (default 30s), exponential backoff retry (3 retries, 1s/2s/4s capped at 30s), auto-disable after 5 consecutive failures, HMAC-SHA256 signatures, delivery logging
- This is the **only** outbound HTTP call in the codebase with timeout AND retry

#### D2: Rate Limiting Coverage

**POSITIVE — Two-layer rate limiting architecture:**
1. Global middleware (all `/api(.*)` routes): 100 req/min per tenant+endpoint via Upstash Redis sliding window, fail-open on Redis errors, returns informative 429 with `retry-after` header
2. Per-route `withRateLimit()` HOF: 14 routes have additional stricter limits (API key management, bulk operations, AI generation, exports)

**MEDIUM — Webhook receivers have no rate limiting:**
- `/webhooks/(.*)` is exempt from rate limiting in global middleware
- While providers (Stripe, Clerk, Twilio) are trusted, endpoints can be abused

**LOW — Admin endpoints rely on global rate limiting only** — same 100 req/min as all other routes.

---

### Part E: Domain-Specific Error Handling Deep Dives

#### E1: Event Import (server-to-server) — MEDIUM

**Files:** `apps/api/app/api/eventimportworkflow/*` routes, `packages/manifest-adapters/src/event-import-runtime.ts`
**Architecture:** State machine with 12+ phases, each phase is a separate HTTP POST.
**Per-step integrity:** GOOD — each step's state mutation + outbox event are atomic via `$transaction`.
**Gap:** No overall transaction wrapping the entire import. If a later phase fails, prior phases' data persists. No compensating-transaction or saga pattern for rollback.
**Relies on:** Caller to handle retries via explicit `/retry` endpoint.

#### E2: Procurement PO Creation — CRITICAL (legacy route)

**Files:** `apps/api/app/api/purchaseorder/create/route.ts` (legacy), `apps/api/app/api/procurement/purchase-orders/commands/create/route.ts` (Manifest)
**Legacy route (CRITICAL):** Generates PO number, creates header via `$queryRaw` INSERT, then creates line items in a for-loop with individual `$queryRaw` INSERT calls — NO transaction. If line item #3 of 5 fails, the PO header + items 1-2 are committed with incorrect totals.
**Manifest route (GOOD):** Delegates to `runtime.runCommand("create", ...)` which is atomic via Manifest JSON store.
**Fix:** Migrate to Manifest route or wrap legacy route in `$transaction()`.

#### E3: Inventory Cycle Count Finalization — CRITICAL

**Files:** `apps/api/app/api/inventory/cycle-count/sessions/[id]/finalize/route.ts`, lines 80-313
**Operations:** `createMany` variance reports → loop: create `inventoryTransaction` + update `inventoryItem.quantityOnHand` + update `varianceReport` per record → update session to `finalized` → create audit log.
**If fails on 50th record:** 49 items have adjusted quantities, 51 do not. No rollback. Data is unrecoverable.
**Fix:** Wrap entire operation in `$transaction()`.

#### E4: Payroll Run Generation — CRITICAL

**Files:** `apps/api/app/api/payroll/generate/route.ts`, `packages/payroll-engine/src/services/payrollService.ts`, `packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts`
**Operations:** `savePayrollPeriod` → `savePayrollRecords` (upsert payroll run + loop upsert line items) → `savePayrollAudit`.
**Root cause:** `$transaction` is deliberately excluded from the `PrismaPayrollDataSource` type (line 22-24). Even callers cannot wrap it.
**If line item #7 of 10 fails:** Payroll period and run header exist with partial line items. No rollback possible.
**Fix:** Add `$transaction` back to the data source and wrap multi-step saves.

#### E5: Webhook Delivery Pipeline — GOOD (mostly)

**Files:** `packages/notifications/outbound-webhook-service.ts`, `apps/api/app/api/integrations/webhooks/trigger/route.ts`, `apps/api/app/cron/webhook-retry/route.ts`, `apps/api/app/api/integrations/webhooks/dlq/`
**Full pipeline:**
1. Manifest command emits event → written to `OutboxEvent` table atomically with state change (via `$transaction`)
2. Outbox publisher uses `FOR UPDATE SKIP LOCKED` → publishes to Ably → marks as published/failed
3. Webhook trigger creates delivery log → sends webhook → updates log → updates stats
4. Cron retry processes `retrying` deliveries with exponential backoff (1s/2s/4s, max 30s)
5. After 3 failed retries, creates DLQ entry
6. Auto-disable after 5 consecutive failures
7. DLQ retry endpoint with `overrideUrl` support and re-enable

**Gaps:** `pending` deliveries created during trigger step have no automatic retry path. Webhook trigger's delivery log + send + update are not atomic (MEDIUM severity).

#### E6: Goodshuffle Full Sync — HIGH

**Files:** `apps/api/app/lib/goodshuffle-event-sync-service.ts`, `goodshuffle-inventory-sync-service.ts`, `goodshuffle-invoice-sync-service.ts`
**Per-item error handling:** GOOD — errors caught per-item, loop continues, errors collected in `result.errors`.
**Gap 1:** Entity creation + sync record creation not transactional → duplicate data risk on retry (event sync:93-235, inventory sync:91-225).
**Gap 2:** Invoice sync DELETE+INSERT without transaction → line item data loss (invoice sync:338-370).
**Gap 3:** No checkpoint/cursor mechanism → cannot resume from interruption point.
**Nextsta sync** has identical issues: `apps/api/app/lib/nowsta-sync-service.ts:236-412`.

---

### Consolidated Findings Table

| ID | Severity | Finding | Location | Fix |
|----|----------|---------|----------|-----|
| EH-01 | CRITICAL | SQL injection via `buildRuleCondition()` | `crm/scoring/calculate/route.ts:31-60,147-157` | Parameterize field names or use strict allowlist without fallback |
| EH-02 | CRITICAL | 4 waitlist routes: `$queryRawUnsafe` + zero try/catch | `events/[eventId]/waitlist/{,commands/*}/route.ts` | Add try/catch with sanitized error responses |
| EH-03 | CRITICAL | 21 routes: direct DB queries without try/catch | `kitchen/tasks/*`, `staff/*`, `timecards/*`, `training/*` GET handlers | Add try/catch wrapping all async operations |
| EH-04 | CRITICAL | Transaction failure caught + success returned | `kitchen/overrides/route.ts:96-148` | Return 500 in catch block, not success |
| EH-05 | CRITICAL | `$transaction` removed from PayrollDataSource | `packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts:22-24` | Add `$transaction` back, wrap multi-step saves |
| EH-06 | CRITICAL | Cycle count finalize: 5+ ops without transaction | `inventory/cycle-count/sessions/[id]/finalize/route.ts:80-313` | Wrap in `$transaction()` |
| EH-07 | CRITICAL | PO creation: header + line items not atomic | `purchaseorder/create/route.ts:28-72` | Wrap in `$transaction()` or migrate to Manifest route |
| EH-08 | CRITICAL | Goodshuffle invoice: DELETE+INSERT without transaction | `goodshuffle-invoice-sync-service.ts:338-370` | Wrap in `$transaction()` |
| EH-09 | CRITICAL | No timeouts on Nowsta/Goodshuffle/Google/Microsoft clients | `nowsta-client.ts:80`, `goodshuffle-client.ts:138`, OAuth callbacks | Add AbortController with timeout to all `fetch()` calls |
| EH-10 | CRITICAL | Unbounded sync pagination without timeout | Goodshuffle sync (getAll*), Nowsta sync (getAll*) | Add per-request timeout + overall sync timeout |
| EH-11 | CRITICAL | Raw `error.message` leaked in 5xx responses | 7+ routes (kitchen/waste, staff/shifts, conflicts, exports) | Return generic message on 500, log details server-side |
| EH-12 | CRITICAL | 5 routes with partial try/catch (async ops outside try) | `training/complete`, `kitchen/tasks/bundle-claim`, `kitchen/overrides`, `kitchen/waste/entries`, `webhooks/supplier-catalog` | Move all async operations inside try blocks |
| EH-13 | HIGH | 3 incompatible error response shapes | API-wide: `{ message }` vs `{ error }` vs `{ success, message }` | Standardize on single format, e.g., `{ error: { code, message } }` |
| EH-14 | HIGH | Zero Prisma error code translation (P2002/P2025/P2003) | All catch blocks in API routes | Add Prisma error classification middleware or utility |
| EH-15 | HIGH | No retry on external API clients | `nowsta-client.ts`, `goodshuffle-client.ts`, OAuth callbacks, calendar sync | Add retry with exponential backoff for transient failures |
| EH-16 | HIGH | No circuit breaking anywhere | All external integration code | Add circuit breaker for Goodshuffle/Nowsta/Google/Microsoft |
| EH-17 | HIGH | Public endpoints have no rate limiting | `global-rate-limit.ts:35` exempts `/api/public/` | Apply separate rate limiting to public endpoints |
| EH-18 | HIGH | Outbox events written after transaction commits | `kitchen/tasks/bundle-claim/route.ts:242-256` | Move outbox writes inside transaction block |
| EH-19 | HIGH | Goodshuffle/Nowsta sync: entity+sync record not transactional | All 3 goodshuffle-sync + nowsta-sync services | Wrap entity creation + sync record in `$transaction()` |
| EH-20 | HIGH | No Prisma connection pool or query timeout config | `packages/database/prisma/schema.prisma` | Add `connection_limit`, `pool_timeout`, `queryTimeout` to datasource |
| EH-21 | HIGH | Goodshuffle/Nowsta sync: no checkpoint/resume | All sync services | Add cursor/checkpoint mechanism for resumable syncs |
| EH-22 | HIGH | Supplier sync: eagerly-resolved promises in batch transaction | `packages/supplier-connectors/src/sync-service.ts:88-135` | Defer promise creation or use interactive transaction |
| EH-23 | MEDIUM | Only 13/250 routes use structured logging | API-wide (412 `console.*` calls) | Migrate to `@repo/observability/log` structured logger |
| EH-24 | MEDIUM | Correlation IDs not propagated (only 1 route uses them) | API-wide (only `conflicts/detect` uses correlation) | Add correlation ID middleware to propagate request IDs |
| EH-25 | MEDIUM | Webhook receivers have no rate limiting | `global-rate-limit.ts:31` exempts `/webhooks/` | Apply rate limiting to webhook receivers with higher limits |
| EH-26 | MEDIUM | No retry on notification providers (Resend, Twilio, Slack) | `email-notification-service.ts`, `sms-notification-service.ts`, `slack.ts` | Add retry with backoff for transient failures |
| EH-27 | MEDIUM | Outbox writes use separate transaction when no override | `manifest-runtime-factory.ts:363-371` | Ensure outbox writes always happen inside the command's transaction |
| EH-28 | MEDIUM | Webhook trigger: delivery log + send not atomic | `integrations/webhooks/trigger/route.ts:111-207` | Add cleanup for orphaned `pending` deliveries |
| EH-29 | MEDIUM | Silent error swallowing in 3 routes | `trash/analyze`, `calendar/sync/trigger`, `contract-expiration-alerts` | Log errors, return appropriate status codes |
| EH-30 | MEDIUM | No `isolationLevel` or `timeout` on any transaction | All 70+ `$transaction()` call sites | Add explicit timeout for long-running transactions |
| EH-31 | LOW | Acceptable fire-and-forget patterns (rate limit logging, API key lastUsedAt) | `rate-limiter.ts:296-314`, `api-key-auth.ts:220-222` | No action needed |
| EH-32 | LOW | Webhook 200-on-failure is intentional (prevent retry loops) | SMS/email/supplier webhook receivers | No action needed |
| EH-33 | LOW | Admin endpoints have no stricter rate limits | API-wide | Consider stricter limits for admin operations |
| EH-34 | LOW | `Promise.allSettled` not needed for current use cases | 49 `Promise.all` all appropriate | Monitor if batch operations need partial failure support |
| EH-35 | LOW | No global `unhandledRejection` handler | Expected for Next.js (framework handles) | Confirm Next.js error boundary properly configured |

### Positive Patterns Worth Noting

1. **Manifest Runtime atomicity** — Commands that use `executeManifestCommand` get consistent error handling (auth, tenant, invariant, policy, guard) and atomic state + outbox writes. The newer Manifest-generated routes avoid all the issues found in hand-written routes.
2. **Outbound webhook pipeline** — Exponential backoff, DLQ, auto-disable, HMAC signatures, concurrent publisher safety (`FOR UPDATE SKIP LOCKED`), manual retry with override URL. The most robust integration in the codebase.
3. **Global rate limiting** — Two-layer architecture (global middleware + per-route HOF), informative 429 responses with `retry-after` headers, fail-open on Redis errors, rate limit event logging with IP hashing for privacy.
4. **Sentry integration** — `captureException` used in 376 catch blocks across 250 files, providing structured error tracking even where structured logging is absent.
5. **`catch-then-log-then-500` pattern** — The dominant error handling pattern across 250+ route files is correct: capture to Sentry, log to console, return sanitized 500.

### Root Cause Analysis

The systemic issues trace to a single architectural split:

- **Manifest-generated routes** (newer, ~600 routes): Use `executeManifestCommand` → consistent error handling, atomic writes, proper status codes. These routes are mostly fine.
- **Hand-written routes** (older, ~750 routes): Each implements its own error handling → inconsistent response formats, missing try/catch, no Prisma error translation, multi-step operations without transactions. These routes have the problems.

The fix strategy should be:
1. **Immediate patches** for the 12 CRITICAL findings (data corruption and security risks)
2. **Shared error handling middleware** to unify response formats and add Prisma error translation
3. **Gradual migration** of hand-written routes to Manifest commands where possible
4. **External API client wrapper** with timeout, retry, and circuit breaking for all integration clients

---

## Error Handling & API Resilience Audit (14th Pass — 2026-04-25)

> **Method:** 6 parallel subagents covering Parts A–E of the error handling audit. All findings verified against actual code at file:line level.
> **Scope:** Error handling patterns, API resilience, transaction safety, rate limiting, external API timeouts, and domain-specific failure modes. Does NOT re-audit anything from passes 1–13.
> **Totals:** 12 CRITICAL, 16 HIGH, 14 MEDIUM, 7 LOW findings across 5 audit sections.

### Executive Summary

The codebase has a **two-tier error handling architecture** with a stark quality divide:

- **Manifest-generated routes** (~1,025 routes via `executeManifestCommand`): Centralized error handling with Sentry capture, standardized responses, policy/guard error mapping. Generally solid.
- **Hand-written routes** (~320 routes): Inconsistent error responses, missing try/catch on GET handlers, zero Prisma error code translation, multi-step operations without transactions. Most findings live here.

The most dangerous systemic patterns are: (1) zero Prisma-specific error translation across ALL routes, (2) multi-step database writes without transactions in event import, procurement PO, and payroll engine, (3) all external API clients (Goodshuffle, Nowsta, Google, Microsoft) have no timeouts or retries, (4) 95 files leak `error.message` to clients including database schema details.

### Root Cause

The architectural split between manifest-generated and hand-written routes means error handling quality depends entirely on which code generator produced the route. There is no shared error middleware at the Next.js route handler level — the only middleware handles auth + rate limiting, not error classification.

---

### Part A: Route-Level Error Handling Patterns

#### A.1 Try/Catch Coverage

| Metric | Count |
|--------|-------|
| Total `route.ts` files with handlers | ~1,347 |
| Files with try/catch | ~1,305 (97%) |
| Files with NO try/catch | 42 (3%) |
| Files delegating to `executeManifestCommand` | ~1,025 (76%) |

**42 files with no try/catch** break into three categories:

- **Category A (safe):** 10 manifest-delegated command routes — `executeManifestCommand` has its own comprehensive try/catch. LOW risk.
- **Category B (concerning):** 27 GET handlers across kitchen, staff, training, timecards — raw SQL queries, data transforms, zero error handling. If a query throws, Next.js returns a generic error (potentially HTML, not JSON). Files include:
  - `apps/api/app/api/kitchen/tasks/route.ts` (3 DB queries)
  - `apps/api/app/api/kitchen/tasks/available/route.ts` (4 DB queries)
  - `apps/api/app/api/kitchen/events/today/route.ts` (5 DB queries)
  - `apps/api/app/api/staff/shifts/route.ts` (2 raw SQL CTEs)
  - `apps/api/app/api/timecards/route.ts` (2 complex raw SQL CTEs)
  - All `/api/staff/availability/`, `/api/staff/certifications/`, `/api/training/modules/` GET handlers
- **Category C (stubs):** 3 CRM venue routes disabled with "model does not exist" comments.

**Most common partial pattern:** "Split architecture" files where POST/PUT/DELETE delegate to `executeManifestCommand` (safe) but GET handlers have no try/catch (unsafe).

#### A.2 Error Response Consistency

**Three incompatible error response shapes** coexist:

| Shape | Used by | Files |
|-------|---------|-------|
| `{ message: "..." }` | GET/list handlers, staff domain | ~136 |
| `{ error: "..." }` | Accounting, integrations, webhooks | ~155 |
| `{ success: false, message: "..." }` | Manifest command handlers | ~1,025 |

A client calling `GET /api/staff/shifts` gets `{ message: "Unauthorized" }`, but `POST /api/staff/shifts` gets `{ success: false, message: "Unauthorized" }`. This makes uniform client-side error handling impossible.

**Shared error utilities exist** but are not consistently used:
- `packages/manifest-adapters/src/route-helpers.ts` — `manifestErrorResponse`, `manifestSuccessResponse`, `unauthorizedResponse`, `badRequestResponse`, `forbiddenResponse`, `notFoundResponse`, `serverErrorResponse`
- `apps/api/lib/manifest-response.ts` — app-level wrapper
- `apps/api/app/lib/invariant.ts` — `InvariantError` class

#### A.3 Prisma Error Handling — Zero Specific Handling

**CRITICAL FINDING A.3-1: No Prisma error code translation anywhere**

Zero route files in the entire codebase check for `Prisma.PrismaClientKnownRequestError` or `error.code === 'P2...'`. Every Prisma error falls through to generic 500 responses:
- P2002 (unique constraint) → 500 instead of 409 Conflict
- P2025 (record not found) → 500 instead of 404
- P2003 (foreign key violation) → 500 instead of 400/422
- P2014 (relation violation) → 500 instead of 400/422

Only `InvariantError` is specifically caught (39 files), returning 400 with `error.message`.

#### A.4 Schema Detail Leakage

**CRITICAL FINDING A.4-1: 95 files leak `error.message` to clients**

Routes returning `error.message` in response bodies expose Prisma error details (table names, column names, constraint names, SQL fragments). Worst offenders:

- `apps/api/app/api/events/documents/parse/route.ts:1235` — also leaks stack trace in development mode
- `apps/api/app/api/administrative/trash/restore/route.ts:292` — leaks in per-entity error array across 100+ entity types
- `apps/api/app/api/integrations/nowsta/sync/route.ts:88` — `Sync failed: ${error.message}`
- `apps/api/app/api/integrations/nowsta/test/route.ts:88,140` — `Connection test failed: ${error.message}`

#### A.5 Raw SQL Error Handling

| Method | Occurrences | Files |
|--------|-------------|-------|
| `$queryRawUnsafe` | 64 | 28 |
| `$queryRaw` (tagged) | ~305 | ~127 |
| `$executeRaw` | ~30 | ~7 |

**CRITICAL FINDING A.5-1: 4 waitlist routes with `$queryRawUnsafe`, no try/catch, no transactions**

- `apps/api/app/api/events/[eventId]/waitlist/commands/add-guest/route.ts` — 4 raw SQL INSERTs, no error handling
- `apps/api/app/api/events/[eventId]/waitlist/commands/promote/route.ts` — 3 raw SQL UPDATEs, no error handling
- `apps/api/app/api/events/[eventId]/waitlist/commands/update-rsvp/route.ts` — 5 dependent raw SQL queries, no error handling, no transaction. If promotion UPDATE fails after decline UPDATE, guest is declined but nobody is promoted.
- `apps/api/app/api/events/[eventId]/waitlist/route.ts` — 2 `$queryRawUnsafe` SELECTs, no error handling

---

### Part B: Partial Failure & State Consistency

#### B.1 Transaction Coverage

26 `$transaction()` calls found in `apps/api/` (excluding tests):
- 21 are safe — proper error propagation, atomic operations
- 5 have issues — side effects after commit, swallowed errors, or pre-tx writes

**CRITICAL FINDING B.1-1: Override audit transaction silently swallowed**
- File: `apps/api/app/api/kitchen/overrides/route.ts:96-135`
- The `$transaction` creating `OverrideAudit` + `OutboxEvent` is wrapped in try/catch that logs a warning and continues. The endpoint returns `{ success: true }` even when the audit trail was NOT recorded and no outbox event was emitted. Comment says "If the audit table doesn't exist yet" but the catch handles ALL failures.
- Severity: **CRITICAL** — compliance audit trail silently missing.

**CRITICAL FINDING B.1-2: Bundle-claim outbox events outside transaction**
- File: `apps/api/app/api/kitchen/tasks/bundle-claim/route.ts:169-256`
- The task-claiming transaction commits at line 242, then outbox events are created in a sequential loop OUTSIDE the transaction. A crash mid-loop means some claimed tasks never emit real-time events. The single-claim endpoint (`[id]/claim/route.ts:170`) does this correctly (inside the transaction).

**HIGH FINDING B.1-3: Pre-transaction write in recipe cost route**
- File: `apps/api/app/api/kitchen/recipes/[recipeId]/cost/route.ts:200-207`
- `recipeIngredient.updateMany` executes BEFORE the `$transaction` at line 212. If the transaction fails, ingredient cost timestamps are updated but the RecipeVersion cost is stale.

**HIGH FINDING B.1-4: Allergen conflict detection — delete outside transaction**
- File: `apps/api/app/api/kitchen/allergens/detect-conflicts/route.ts:229-243`
- `deleteMany` at line 230 executes before the transaction creating new warnings. If the transaction fails, ALL existing warnings are gone.

#### B.2 Multi-Step Operations Without Transactions

**CRITICAL FINDING B.2-1: Goodshuffle sync services — no transaction wrapping**
- `apps/api/app/lib/goodshuffle-invoice-sync-service.ts:260-308` — budget header created via `$queryRaw`, then line items in a loop. No transaction. Partial budget on failure.
- `apps/api/app/lib/goodshuffle-event-sync-service.ts:124-192` — entity created, then sync record separately. No transaction. Orphaned entity on failure.
- `apps/api/app/lib/goodshuffle-inventory-sync-service.ts:119-186` — same pattern.
- `apps/api/app/lib/nowsta-sync-service.ts:279-411` — schedule + shift + sync record, three separate writes. No transaction.

**HIGH FINDING B.2-2: Webhook trigger — delivery log, send, update — all separate writes**
- File: `apps/api/app/api/integrations/webhooks/trigger/route.ts:113-206`
- Creates delivery log ("pending"), sends webhook, updates log with result, updates webhook stats — four sequential non-transactional operations. If step 3 fails after step 2 succeeds, the delivery was sent but the log says "pending" forever (never retried, never DLQ'd).

#### B.3 Outbox Pattern Coverage

The outbox pattern is **well-established in core domain routes**:
- Used correctly inside transactions in: stock adjustment, PO quantity, single task claim, waste entries, overrides, shared task helpers, recipe version helpers
- Outbox publisher uses `FOR UPDATE SKIP LOCKED` for concurrent safety
- **NOT used for:** webhook delivery (separate inline system), integration syncs (no events emitted)

---

### Part C: Unhandled Promise Rejections & Silent Failures

#### C.1 Unhandled Async Errors

- **`.then()` without `.catch()`:** 2 occurrences in `apps/api/app/api/collaboration/notifications/email/workflows/[id]/route.ts:84,109` — `context.params.then(...)` without `.catch()`
- **`Promise.all()` usage:** ~45 occurrences in production code. All are appropriate all-or-nothing semantics (pagination + count, analytics, inside transactions)
- **`Promise.allSettled()` usage:** 0 occurrences. One candidate exists: `apps/api/lib/staff/auto-assignment.ts:673` where multi-shift assignment suggestions lose ALL results if one fails
- **`process.on('unhandledRejection')`:** Not defined anywhere. Next.js serverless runtime handles it, but no application-level safety net exists.
- **Fire-and-forget patterns:** None found. All async operations use `await`.

#### C.2 Silent Error Swallowing

**24 empty `catch {}` blocks** found. Most are intentional (JSON parse fallbacks, URL validation). Higher-risk ones:
- `apps/api/app/outbox/publish/route.ts:189` — failed outbox event status update silently swallowed
- `apps/api/app/api/administrative/trash/analyze/route.ts:461` — entity lookup failure returns null with no logging
- `apps/api/app/api/kitchen/tasks/shared-task-helpers.ts:194` — runtime creation failure returns `{ success: false }` with no logging

**~50+ legacy manifest command routes** use only `console.error` without `captureException`, making errors **invisible to Sentry**. These include routes for dishes, prep lists, employee availability, workforce optimization, recipe steps, clients, allergen warnings, time entries, and inventory items.

**CRITICAL FINDING C.2-1: Override audit returns `{ success: true }` on transaction failure**
(Same as B.1-1 — the override audit is both a state consistency and a silent failure issue)

**HIGH FINDING C.2-2: GET overrides returns empty array on error**
- File: `apps/api/app/api/kitchen/overrides/route.ts:185-189`
- `GET /api/kitchen/overrides` catches any error and returns `{ overrides: [] }` with status 200. Looks like successful empty data instead of an error.

#### C.3 Error Logging Quality

| Component | Usage |
|-----------|-------|
| `@repo/observability/log` (structured) | 18 files |
| Sentry `captureException` | 250+ files (529 occurrences) |
| Raw `console.error/log/warn` | 490 occurrences across 250 files |
| Correlation ID support | 3 routes (conflicts/detect, sentry-canary, sentry webhook) |

**Missing:**
- No Prisma error enrichment (error codes, query context, model names)
- ~50+ legacy routes use only `console.error` — invisible to production monitoring
- 200+ routes have no correlation ID handling — errors cannot be traced to specific requests
- Correlation infrastructure exists in `@repo/observability/correlation` but is wired into only 3 routes

---

### Part D: Rate Limiting & External API Resilience

#### D.1 External API Call Resilience

| Service | Timeout | Retry | Circuit Breaking |
|---------|---------|-------|------------------|
| Goodshuffle Client (`goodshuffle-client.ts`) | **NONE** | **NONE** | **NONE** |
| Nowsta Client (`nowsta-client.ts`) | **NONE** | **NONE** | **NONE** |
| Microsoft OAuth (3 sequential fetches) | **NONE** | **NONE** | **NONE** |
| Google OAuth (3 sequential fetches) | **NONE** | **NONE** | **NONE** |
| Calendar sync trigger | **NONE** | **NONE** | **NONE** |
| Slack webhook | **NONE** | **NONE** | **NONE** |
| AI metrics webhook | **NONE** | **NONE** | **NONE** |
| Resend email SDK | SDK default | **NONE** | **NONE** |
| Twilio SMS SDK | SDK default | **NONE** | **NONE** |
| **Outbound webhook delivery** | **30s (configurable)** | **YES (exp. backoff, 3 retries)** | **Partial (auto-disable after 5 failures)** |

Only the outbound webhook delivery service has proper resilience. All other external calls will hang indefinitely if the target is slow.

**CRITICAL FINDING D.1-1: Goodshuffle/Nowsta clients — no timeout, no retry, unbounded pagination**
- `apps/api/app/lib/goodshuffle-client.ts:138` — `fetch()` with no `AbortController`. `getAllEvents()`, `getAllInventoryItems()`, `getAllInvoices()` loop over paginated responses with no upper bound. A slow Goodshuffle API blocks the request indefinitely, exhausting serverless function concurrency.
- `apps/api/app/lib/nowsta-client.ts:80` — identical pattern.

**CRITICAL FINDING D.1-2: Calendar OAuth callbacks — 3 sequential fetches, no timeout**
- `apps/api/app/api/calendar/sync/callback/outlook/route.ts:56,85,102`
- `apps/api/app/api/calendar/sync/callback/google/route.ts:56,82,98`
- Each chains 3 external HTTP calls with no timeout. A slow Microsoft/Google API hangs the user's browser redirect.

**CRITICAL FINDING D.1-3: Webhook retry cron can exceed `maxDuration`**
- File: `apps/api/app/cron/webhook-retry/route.ts`
- `maxDuration = 60` seconds. Each delivery has up to 30s timeout. Processes up to 100 retries sequentially. Two slow deliveries exhaust the budget. The cron is killed mid-processing, leaving delivery logs in inconsistent state.

#### D.2 Rate Limiting Coverage

**Two-tier architecture:**
- Tier 1: Global middleware — 100 req/min per tenant+endpoint, applied to all authenticated API routes
- Tier 2: Per-route `withRateLimit()` HOF — adds response headers but uses same 100 req/min default

**Exempt from global rate limiting:** `/webhooks/*`, `/api/health/*`, `/outbox/*`, `/api/public/*`

**HIGH FINDING D.2-1: Public contract-signing and proposal endpoints have no rate limiting**
- `apps/api/app/api/public/contracts/[token]/sign/route.ts` — publicly accessible, no rate limit
- `apps/api/app/api/public/proposals/[token]/respond/route.ts` — publicly accessible, no rate limit
- `apps/api/app/api/public/proposals/[token]/route.ts` — publicly accessible, no rate limit
- An attacker with a valid token can spam these endpoints.

**HIGH FINDING D.2-2: Email/SMS send endpoints have no per-route rate limit**
- `apps/api/app/api/collaboration/notifications/email/send/route.ts` — accepts arrays of recipients, no `withRateLimit()`
- `apps/api/app/api/collaboration/notifications/sms/send/route.ts` — same
- A single request triggers dozens of Resend/Twilio API calls, 100 such requests per minute under global limit.

**HIGH FINDING D.2-3: Search endpoint not rate-limited beyond global default**
- `apps/api/app/api/search/route.ts` — runs up to 6 concurrent `findMany` + `count` queries with `contains` filters. Only global 100 req/min applies.

#### D.3 Timeout Configuration

- **Database queries:** No `queryTimeout` set on Prisma client (`packages/database/index.ts:41`). No `statement_timeout` in migrations or config. Default: no timeout.
- **Route `maxDuration`:** Only 3 routes set it (webhook retry cron, sentry fixer, command board chat). All others use platform default.
- **`AbortController` usage:** Only 1 location in production code — outbound webhook delivery (`packages/notifications/outbound-webhook-service.ts:146-156`).

---

### Part E: Domain-Specific Error Handling Deep Dives

#### E.1 Event Import (Server-to-Server)

**CRITICAL FINDING E.1-1: No transaction wrapping — entire import is non-atomic**
- File: `apps/api/app/api/events/import/server-to-server/route.ts:587-671`
- Every database write uses standalone `database.$queryRaw`/`$executeRaw` — auto-committed. If dish creation fails on the 5th of 10 menu items, the event exists with a partial menu. No rollback.
- Venue and location entities created by `ensureLocationId`/`findOrCreateVenue` are never cleaned up on event failure.

**CRITICAL FINDING E.1-2: Tenant ID null not checked**
- File: same, line 751
- `getTenantIdForOrg(session.orgId)` can return `undefined`, but code proceeds to use `tenantId` in raw SQL queries. Will crash on first query.

**HIGH FINDING E.1-3: Batch ID not persisted — no resume capability**
- File: same, line 774
- `batchId = randomUUID()` is generated and returned but never stored. No way to resume a partially failed import.

#### E.2 Procurement PO Creation

**CRITICAL FINDING E.2-1: PO create — header + line items not transactional**
- File: `apps/api/app/api/procurement/purchase-orders/commands/create/route.ts:42-70`
- PO header INSERT (line 42) and line item INSERTs (lines 59-70) are separate auto-committed statements. Partial PO on any line item failure.

**CRITICAL FINDING E.2-2: PO receive — item updates + inventory adjustments not transactional**
- File: `apps/api/app/api/procurement/purchase-orders/commands/receive/route.ts:24-54`
- Each item: update PO item (line 32), then update inventory (line 46). Two separate SQL statements per item. If inventory update fails, PO item shows "received" but stock not increased.

**HIGH FINDING E.2-3: PO number race condition**
- File: same as E.2-1, lines 28-32
- PO number generated by counting rows + 1. Two concurrent requests can generate the same number.

#### E.3 Inventory Cycle Count Finalization

**CRITICAL FINDING E.3-1: Manifest runtime action loop — no transaction wrapping**
- File: `packages/manifest-runtime/src/manifest/runtime-engine.ts:1283-1350`
- Actions are applied one at a time via `store.update()`, each auto-committing. If action N fails, actions 1 through N-1 are already committed with no rollback. Entity is in partially mutated state.

**HIGH FINDING E.3-2: Phantom failure from outbox write error**
- File: `packages/manifest-adapters/src/manifest-runtime-factory.ts:360-381`
- Outbox write (telemetry hook) runs AFTER `runCommand` succeeds. If outbox write fails, it throws → client gets 500, but data was already committed. Client may retry, causing duplicate state transitions.

**MEDIUM FINDING E.3-3: No idempotency on finalize/complete**
- The generated routes do NOT pass an idempotency key. Retried finalize operations will execute again.

#### E.4 Payroll Run Generation

**CRITICAL FINDING E.4-1: Payroll generation NOT atomic**
- File: `packages/payroll-engine/src/services/payrollService.ts:140-142`
- Three sequential saves without transaction: `savePayrollPeriod` → `savePayrollRecords` → audit. If `savePayrollRecords` fails, period is "finalized" with zero line items.

**HIGH FINDING E.4-2: Payroll line items saved one-by-one without transaction**
- File: `packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts:243-283`
- `savePayrollRecords()` loops `upsert` per line item. If the 5th of 10 fails, 5 items are persisted, 5 are not. No error thrown.

**HIGH FINDING E.4-3: generatePayroll catches errors, returns "failed" status instead of throwing**
- File: `packages/payroll-engine/src/services/payrollService.ts:184-199`
- Catch block returns `{ status: "failed", estimatedTotals: { totalGross: 0, ... } }`. Caller never sees an exception. QuickBooks export downstream fails with confusing "No payroll records found" error.

#### E.5 Webhook Delivery Pipeline

**CRITICAL FINDING E.5-1: Trigger endpoint is synchronous, processes webhooks sequentially**
- File: `apps/api/app/api/integrations/webhooks/trigger/route.ts:111-207`
- All matched webhooks sent in `for` loop, each with up to 30s timeout. N webhooks × 30s = serverless timeout for N ≥ 3.

**HIGH FINDING E.5-2: No outbox pattern for webhook delivery**
- Webhook triggers are called directly from API routes, not through the outbox. If the process dies mid-delivery, the event is lost with no replay mechanism.

**HIGH FINDING E.5-3: Stuck "pending" deliveries never retried**
- Retry endpoint only queries `status: "retrying"` (`apps/api/app/api/integrations/webhooks/retry/route.ts:71`). Deliveries stuck in "pending" (log created but send never happened) are never retried and never moved to DLQ.

**MEDIUM FINDING E.5-4: Per-webhook retryDelayMs config ignored**
- `packages/notifications/outbound-webhook-service.ts:259-263` — `calculateRetryDelay` always uses `DEFAULT_CONFIG` values, ignoring the webhook's stored `retryDelayMs`.

#### E.6 Goodshuffle Full Sync

**CRITICAL FINDING E.6-1: No transaction for create-then-sync-record — duplicates guaranteed under DB failures**
- `apps/api/app/lib/goodshuffle-event-sync-service.ts:149-173` — entity created, sync record created separately. If sync record fails, entity is orphaned. Next sync creates a duplicate.
- Same pattern in inventory sync and invoice sync.

**HIGH FINDING E.6-2: GoodshuffleClient has no request timeout**
- `apps/api/app/lib/goodshuffle-client.ts:136-157` — `fetch()` with no `AbortController`. Paginated `getAll*()` methods loop unbounded.

**MEDIUM FINDING E.6-3: Sync status update can fail, leaving stale status**
- `apps/api/app/lib/goodshuffle-event-sync-service.ts:200-215` — config's `lastSyncStatus` updated after processing. If this update fails, status shows previous sync's result.

---

### Findings Summary by Severity

#### CRITICAL (12)

| ID | Category | Finding | File:Line |
|----|----------|---------|-----------|
| A.3-1 | Error Handling | Zero Prisma error code translation — all Prisma errors return 500 | All ~250 route files |
| A.4-1 | Security | 95 files leak `error.message` (schema details) to clients | 95 files (see list) |
| A.5-1 | Data Integrity | 4 waitlist routes: `$queryRawUnsafe` + no try/catch + no transactions | `events/[eventId]/waitlist/commands/{add-guest,promote,update-rsvp}/route.ts`, `events/[eventId]/waitlist/route.ts` |
| B.1-1 | Silent Failure | Override audit transaction failure silently swallowed, returns success | `kitchen/overrides/route.ts:96-135` |
| B.2-1 | Data Integrity | Goodshuffle/Nowsta sync services: no transaction wrapping | `goodshuffle-*-sync-service.ts`, `nowsta-sync-service.ts` |
| D.1-1 | Resilience | Goodshuffle/Nowsta clients: no timeout, no retry, unbounded pagination | `goodshuffle-client.ts:138`, `nowsta-client.ts:80` |
| D.1-2 | Resilience | Calendar OAuth callbacks: 3 sequential fetches, no timeout | `calendar/sync/callback/{outlook,google}/route.ts` |
| D.1-3 | Resilience | Webhook retry cron exceeds `maxDuration` | `cron/webhook-retry/route.ts` |
| E.1-1 | Data Integrity | Event import: no transaction, partial events on failure | `events/import/server-to-server/route.ts:587-671` |
| E.2-1 | Data Integrity | PO create: header + line items not transactional | `procurement/purchase-orders/commands/create/route.ts:42-70` |
| E.2-2 | Data Integrity | PO receive: items + inventory not transactional | `procurement/purchase-orders/commands/receive/route.ts:24-54` |
| E.5-1 | Resilience | Webhook trigger: synchronous sequential processing, guaranteed timeout | `integrations/webhooks/trigger/route.ts:111-207` |

#### HIGH (16)

| ID | Category | Finding | File:Line |
|----|----------|---------|-----------|
| B.1-2 | State Consistency | Bundle-claim outbox events outside transaction | `kitchen/tasks/bundle-claim/route.ts:242-256` |
| B.1-3 | State Consistency | Pre-transaction write in recipe cost route | `kitchen/recipes/[recipeId]/cost/route.ts:200-207` |
| B.1-4 | State Consistency | Allergen delete outside transaction | `kitchen/allergens/detect-conflicts/route.ts:230` |
| B.2-2 | State Consistency | Webhook trigger: 4 sequential non-transactional writes | `integrations/webhooks/trigger/route.ts:113-206` |
| C.2-2 | Silent Failure | GET overrides returns empty array on error (200 status) | `kitchen/overrides/route.ts:185-189` |
| D.2-1 | Security | Public contract/proposal endpoints: no rate limiting | `public/contracts/[token]/sign/route.ts`, `public/proposals/[token]/respond/route.ts` |
| D.2-2 | Security | Email/SMS send: no per-route rate limit | `notifications/email/send/route.ts`, `notifications/sms/send/route.ts` |
| D.2-3 | Performance | Search endpoint: no per-route rate limit | `search/route.ts` |
| E.1-2 | Crash | Event import: tenant ID null not checked | `events/import/server-to-server/route.ts:751` |
| E.1-3 | Resilience | Event import: batch ID not persisted, no resume | `events/import/server-to-server/route.ts:774` |
| E.2-3 | Race Condition | PO number generation not concurrency-safe | `procurement/purchase-orders/commands/create/route.ts:28-32` |
| E.3-1 | Data Integrity | Manifest runtime action loop: no transaction wrapping | `runtime-engine.ts:1283-1350` |
| E.3-2 | Silent Failure | Outbox write error causes phantom failure | `manifest-runtime-factory.ts:360-381` |
| E.4-1 | Data Integrity | Payroll generation NOT atomic | `payrollService.ts:140-142` |
| E.4-2 | Data Integrity | Payroll line items: one-by-one without transaction | `PrismaPayrollDataSource.ts:243-283` |
| E.4-3 | Silent Failure | generatePayroll returns "failed" instead of throwing | `payrollService.ts:184-199` |
| E.5-2 | Resilience | No outbox pattern for webhook delivery | `integrations/webhooks/trigger/route.ts` (architecture) |
| E.5-3 | Data Loss | Stuck "pending" deliveries never retried | `integrations/webhooks/retry/route.ts:71` |
| E.6-1 | Data Integrity | Goodshuffle sync: per-item failures create orphans | `goodshuffle-event-sync-service.ts:124-198` |
| E.6-2 | Resilience | GoodshuffleClient: no request timeout | `goodshuffle-client.ts:136-157` |

#### MEDIUM (14)

| ID | Category | Finding |
|----|----------|---------|
| A.5-2 | Best Practice | 28 files use `$queryRawUnsafe` where `$queryRaw` would be safer |
| B.3 | Logging | ~50+ legacy routes use only `console.error`, invisible to Sentry |
| C.1 | Observability | Correlation IDs only wired into 3 of 200+ routes |
| D.1-4 | Performance | No Prisma `queryTimeout` configured |
| D.2-4 | Performance | Clerk `getUserList()` fetches all users without pagination |
| E.3-3 | Resilience | No idempotency on finalize/complete commands |
| E.4-4 | Validation | QB export doesn't validate period state |
| E.4-5 | Validation | Null tenantId not checked in QB export |
| E.5-4 | Config | Per-webhook retryDelayMs ignored |
| E.5-5 | Cleanup | Pending deliveries for deleted webhooks linger |
| E.6-3 | Observability | Sync status update can fail, leaving stale status |
| E.6-4 | Cleanup | Config delete leaves orphaned sync records |
| E.6-5 | UX | Invoice sync throws on missing event link with unhelpful error |
| E.6-6 | API | `direction` parameter accepted but only one direction implemented |

#### LOW (7)

| ID | Category | Finding |
|----|----------|---------|
| A.2-1 | DX | Three incompatible error response shapes |
| A.5-3 | Style | `$queryRawUnsafe` vs `$queryRaw` usage in analytics |
| C.1-2 | Style | 2 `.then()` chains without `.catch()` |
| E.4-6 | Validation | Clock-in/clock-out rely solely on manifest guards |
| E.6-7 | Dead Code | Conflict detection functions defined but never called |
| C.2-3 | Style | 24 empty `catch {}` blocks (mostly intentional) |
| C.3-1 | Style | Inconsistent error context in logs |

### Positive Examples

1. **`executeManifestCommand`** (`apps/api/lib/manifest-command-handler.ts`): Gold standard. Centralized try/catch, Sentry capture, standardized responses, policy/guard error mapping, idempotency support.
2. **Outbound webhook delivery** (`packages/notifications/outbound-webhook-service.ts`): Only external call with timeout (30s), retry (exponential backoff, 3 retries), and circuit breaking (auto-disable after 5 failures).
3. **Outbox publisher** (`apps/api/app/outbox/publish/route.ts`): Uses `FOR UPDATE SKIP LOCKED` for concurrent safety. Failed events marked with error details.
4. **`requireCurrentUser`** (`apps/api/app/lib/tenant.ts`): Sophisticated error handling with unique constraint race condition retry and user-friendly error messages.
5. **Webhook supplier-catalog** (`apps/api/app/api/webhooks/supplier-catalog/route.ts`): Granular per-step try/catch, timing-safe signature comparison, structured error counting.
6. **Conflicts/detect route** (`apps/api/app/api/conflicts/detect/route.ts`): Correlation ID generated, threaded through every log call, included in response header. The only route with full request tracing.

### Recommended Fix Strategy

1. **Immediate patches** for 12 CRITICAL findings (data corruption, security, and guaranteed-failure scenarios)
2. **Shared Prisma error middleware** — centralized mapping of P2002→409, P2025→404, P2003→400
3. **External API client wrapper** — `AbortController` timeout (10s default), retry with backoff, circuit breaking for Goodshuffle/Nowsta/Google/Microsoft
4. **Transaction wrapping** for all multi-step writes in event import, PO create/receive, payroll engine, sync services
5. **`error.message` sanitization** — replace all raw `error.message` in responses with generic messages; log details server-side only
6. **Unified error response format** — adopt `{ success: false, message: "..." }` everywhere; add `code` field for machine-readable classification

---

