<!-- DB-performance implementation plan. Plan-only artifact. Last updated: 2026-07-12. Synthesis of 17 parallel Sonnet audit sweeps, revised by Opus after 11 focused Sonnet verification agents + a parent gap sweep (2026-07-12). -->

# Database performance — implementation plan (plan-only)

Synthesis of 17 parallel Sonnet audit sweeps, revised 2026-07-12 after **11 focused
verification agents** re-read the actual code + a parent gap sweep against
`specs/db-performance/database-performance.md`. This is a **plan-only artifact** —
nothing here is implemented yet. The spec's "Acceptance criteria" and "Constraints"
sections are the gate; every item ties its acceptance check back to them.

**Status tags** (new this revision): `[VERIFIED]` = claim confirmed by code read;
`[CORRECTED]` = a proven-false specific struck + corrected in place (per the repo's
documentation law); `[NEW]` = surfaced by the 11-agent gap sweep; `[INVESTIGATE]` =
genuinely open. Items not re-touched in this pass retain `[VERIFIED]` from the
original 17-agent audit (no contradicting evidence surfaced).

Two hard rules shape every item:

- `packages/database/prisma/schema/manifest.prisma` is **GENERATED** (stamped DO NOT
  EDIT — confirmed `:1-2`). Index/model-shape changes there must go through
  `manifest/source/**` + `pnpm manifest:build`. `infra.prisma` is **hand-owned** →
  indexes via `pnpm db:dev --create-only`. Canonical DB workflow:
  `docs/database/README.md`.
- `pnpm db:check` must stay clean and `pnpm manifest:ci` green at every commit.

Per the spec constraint "Do not modify `manifest/source/**` **business rules**", the
manifest-source items below touch only pagination defaults, soft-delete filters, and
index declarations (infrastructure), never domain logic.

---

## Prioritized list (highest priority first)

Priority = user-facing latency impact × leverage × low-risk-first, AND spec ordering
(measurement first because the spec mandates evidence + the dev DB is empty; then
foundational connection-correctness, spec criterion #1).

### 1. `[VERIFIED]` Measurement & evidence instrumentation
- **What:** Generalize the existing per-query timing `$extends` into `packages/database` so both apps inherit it; add a per-request DB-time accumulator and a slow-query warn threshold.
- **Why / evidence:** Spec requires timings/query-plans + before/after on ≥3 routes. Timing already half-built at `apps/app/app/lib/data/db.ts:16-57` (`PRISMA_LOG_QUERIES=1`-gated `$extends` emitting `[prisma:query] model.op Xms`, plus a `timedQueryRaw()` helper), but `apps/api` — where most N+1s live — has **no** query timing. The existing `withManifestIssueLog` `$extends` in `packages/database` is **error-only, no timing**. Prisma 7 driver-adapter mode **ignores** `log:[{emit:'event',level:'query'}]`, so the `$extends` hook is the only correct timing path. BONUS verified this revision: within `apps/app`, timing coverage is **PARTIAL** — several files import `database` directly from `@repo/database`, bypassing `../data/db`; centralizing into `packages/database` fixes that too.
- **Fix:** Move the `$extends` into `packages/database`; env-gate via `DB_PERF_LOG` (or reuse `PRISMA_LOG_QUERIES`); add a slow-threshold warn (e.g. >50ms). Add a per-request `AsyncLocalStorage` DB-time accumulator + thin route wrapper to get total-DB-time vs total-request-time. Attribute Next.js dev-compile vs DB via cold (first hit) vs warm (2nd hit) subtraction.
- **Scope:** `measurement`
- **Acceptance check:** With the gate on, a representative `apps/api` GET emits per-query ms + a request-level DB-time total; cold-vs-warm subtraction isolates compile time; `apps/app` files importing the singleton directly also get timing. Satisfies spec criteria "identified with evidence" and the before/after-on-3-routes requirement.

### 2. `[NEW]` CI deploy `directUrl` wiring (foundational connection-correctness)
- **What:** Make CI `prisma migrate deploy` consume the direct (non-pooled) endpoint the workflow already exports, per Neon guidance — instead of running migrations through the pooled production URL.
- **Why / evidence:** `pnpm db:deploy` is plain `prisma migrate deploy` (root `package.json:81`, no `--url` override), run from `packages/database`, so it uses `packages/database/prisma.config.ts` whose `datasource.url = process.env.DATABASE_URL` (`:17-22`); `directUrl` is **not** declared there, nor in the generated `packages/database/prisma/prisma.config.ts:8`. The deploy workflow (`.github/workflows/deploy.yml:99-121`) sets `DATABASE_URL` to the pooled prod URL (`PRODUCTION_DATABASE_URL` secret, `:102`), derives `DIRECT_URL` (`:103,110-112`) and `export`s both (`:113`) — but **nothing consumes `DIRECT_URL`**, so `migrate deploy` runs through the **pooled** production URL. The author clearly *intended* direct (comment `:108-109` + derive logic), so this is a latent wiring bug. Migrations may currently *succeed* because Neon's pooler tolerates Prisma's prepared statements (`max_prepared_statements=1000`), so this is a **guidance deviation + latent migration-safety risk**, not necessarily a live breakage — verify against current Neon + Prisma docs. Local dev is correct (`.env` carries the direct endpoint). Maps directly to spec criterion #1 ("pooled vs direct endpoints for runtime vs migrations").
- **Fix:** Make CI `migrate deploy` use the direct endpoint. `[INVESTIGATE]` the exact Prisma 7.8 mechanism first — confirm whether `defineConfig({ datasource })` accepts a `directUrl` field (mirror the existing `shadowDatabaseUrl` conditional), or whether `db:deploy` needs a `--url`/`--schema` override pointing at `DIRECT_URL`; both prisma configs declare only `url` today. Then wire it so the exported `DIRECT_URL` is consumed, and confirm the CI deploy log shows `migrate deploy` on the non-`-pooler` host.
- **Scope:** `config`
- **Acceptance check:** A CI deploy log shows `migrate deploy` connecting via the non-`-pooler` host; `pnpm db:check` clean; `pnpm migrate:status` green post-deploy. Ties to spec criterion "pooled vs direct endpoints for runtime vs migrations."

### 3. `[VERIFIED]` MCP server DB client correctness + stale-comment fix
- **What:** Stop the MCP server building its own Prisma client; import the shared singleton; correct the stale comment that claims parity with `@repo/database/index.ts`.
- **Why / evidence:** `packages/mcp-server/src/lib/database.ts:14-15,26-27,84-89` builds its own client with `@prisma/adapter-neon` (HTTP/WebSocket, `poolQueryViaFetch=true` `:27`, `sslmode=require` `:47`), **no** `globalThis` singleton guard, **no** `transactionOptions`. The MCP server is a long-lived stdio Node process — and `packages/database/index.ts:7-14` explicitly documents that the neon HTTP driver "caused ConnectTimeoutError on :443 and multi-second 'fetch failed' stalls" from persistent Node. The comment at `packages/mcp-server/src/lib/database.ts:10` ("matching the configuration in @repo/database/index.ts") is **FALSE** (index.ts uses adapter-pg). Verified enabler: it already imports the `PrismaClient` *type* from `@repo/database/standalone` (`:16-19`), so the fix is to import the `database` *instance* instead.
- **Fix:** `import { database } from "@repo/database/standalone"` instead of constructing a client (`standalone.ts` is safe to import — no server-only guard; yields adapter-pg TCP + singleton + transactionOptions + verify-full). Strike the stale comment and insert the corrected statement (CLAUDE.md documentation law).
- **Scope:** `config`
- **Acceptance check:** MCP process reuses the singleton; no `new PrismaClient` in `packages/mcp-server`; comment matches reality; a multi-call MCP session shows no "fetch failed" stalls. Ties to spec criterion "singleton pattern everywhere in apps/" and "either fixed or documented."

### 4. `[VERIFIED]` Connection config rationale (pgbouncer / verify-full / connection_limit / pool_timeout)
- **What:** Record the (now-resolved) `pgbouncer` / `connection_limit` / `pool_timeout` decisions as inline rationale; confirm `sslmode=verify-full` end-to-end.
- **Why / evidence:** `packages/database/keys.ts:17-43` rewrites to the `-pooler` host + `connect_timeout=15` + `sslmode=verify-full` but never sets `pgbouncer=true`. Verified this revision: `pgbouncer`, `connection_limit`, and `pool_timeout` are all correctly **ABSENT** — N/A for the `pg`/TCP driver path (pool controlled by `create-pg-adapter.ts` `max:20`; prepared-statement control is at the pg-driver level, not URL params). Each absence needs a one-line inline rationale comment so it is not re-litigated.
- **Fix:** Add dated inline comments in `keys.ts` / `create-pg-adapter.ts` next to each absent flag explaining why (pg driver, Fluid/Vercel long-lived Node, `max:20` pool). Optional: confirm under concurrent load via item 1's instrumentation that no prepared-statement errors surface.
- **Scope:** `config`
- **Acceptance check:** Dated comments record the decision for all three flags; `db:check` clean; (optional) concurrent-load probe shows no prepared-statement errors. Ties to spec criterion "either fixed or documented with a reason."

### 5. `[CORRECTED]` Manifest list-route generator: unbounded `findMany` (no `take`/`skip`) on ~all generated list routes
- **What:** One upstream generator change gives all ~60+ generated list routes bounded pagination by default.
- **Why / evidence:** ~60+ manifest-GENERATED list routes (`apps/api/app/api/**/*/list/route.ts`, stamped "Generated from Manifest IR - DO NOT EDIT") each do unbounded `findMany` (no `take`/`skip`). The gold standard already exists at the hand-written `apps/api/app/api/manifest/[entity]/route.ts:92-100` (`Promise.all([count, findMany({take, skip})])`).
  - ~~and several **omit `deletedAt: null`** — a correctness bug (soft-deleted rows returned). Confirmed across `accounting/collections/actions/list`, `collections/payment-plans/list`, `bank-accounts/list`, `budgets/list`, `payment-refunds/list`, `chart-of-accounts/list`.~~
  > **(revised 2026-07-12 verification):** The "deletedAt correctness bug" sub-claim is **FALSE**. The generator is field-aware — it emits `deletedAt: null` ONLY on entities that declare a `deletedAt` column. `CollectionAction`, `CollectionPaymentPlan`, `PaymentRefundAttempt`, and `ChartOfAccount` have **no** `deletedAt` column, so omitting the filter is correct. Additionally, 3 of the 6 cited routes are **HAND-WRITTEN** (`payroll/bank-accounts`, `procurement/budget`, `chart-of-accounts`), not generated. The real systemic issue is purely **UNBOUNDED `findMany`** (no `take`/`skip`) on ~all generated list routes — not a correctness bug.
- **Fix:**
  - ~~In the manifest list-route generator/template (verify: locate the generator that emits the "Generated from Manifest IR" list routes — likely in the `@repo/manifest-runtime` compiler or a route template), default to a `take` clamp and inject `deletedAt: null` on entities that carry soft-delete. Regenerate via `pnpm manifest:build`.~~
  > **(revised 2026-07-12 verification):** The generator is **UPSTREAM** — `node_modules/@angriff36/manifest/dist/manifest/projections/nextjs/generator.js` (`generatePrismaQuery()` :330-356, `_generateGetRoute()` :1738-1784). The in-repo `manifest/scripts/generate.mjs` only invokes the upstream `NextJsProjection` and writes its output — it does **not** modify the template, which emits ONLY `where`+`orderBy`, never `take`/`skip`/`count`/searchParams. So this is **NOT** fixable by "edit generator + `pnpm manifest:build`" in-repo. Real options: (i) upstream PR to `@angriff36/manifest` adding pagination options + pin bump; (ii) a post-generation patch step added to `generate.mjs`; (iii) until then, accept the systemic unbounded read and bound the worst hot routes individually. **Trade-off noted:** the systemic fix is upstream-dependent; individual route bounding is the stopgap and must land first on the hottest routes.
- **Scope:** `manifest-source` (upstream) / `route` (stopgap)
- **Acceptance check:** Generated list routes include bounded `take`/`skip` (via upstream PR + pin, or post-gen patch); ~~the 6 cited routes no longer return soft-deleted rows;~~ individual hot routes are bounded as a stopgap; `pnpm manifest:ci` green; `db:check` clean. Still the largest single leverage point — but upstream-gated, so the stopgap bounds the worst routes first.

### 6. `[CORRECTED]` Cron N+1, per-tenant sweeps, and `getSystemUserId` memoization
- **What:** Bound and batch the per-tenant/per-row work in the four DB-heavy crons; memoize the shared `getSystemUserId(tenantId)` helper per tenant.
- **Why / evidence:** `cron/inventory-audit/route.ts` (unbounded `auditSchedule.findMany` `:192`; per-tenant `getFirstActiveLocation` `:238` + `getSystemUserId` `:247` + serial `createCycleCountSession` `:255`; fallback path `:374/380/385`; `getSystemUserId` fires 2× `user.findFirst` `:102/116`), `cron/email-reminders/route.ts`, `cron/contract-expiration-alerts/route.ts` (per-tenant `eventContract.findMany` `:159` + serial trigger `:206`; `getSystemUserId` per-contract `:127`), `cron/webhook-retry/route.ts:89` (per-row `outboundWebhook.findFirst` in a loop of 100, same `webhookId` re-fetched). Shared helper `getSystemUserId(tenantId)` (`inventory-audit:100`, `email-reminders:121`, `contract-expiration:99`) fires up to 2 `user.findFirst` per call and is re-invoked once per row/claim/contract.
  - ~~`cron/email-reminders/route.ts` (per-tenant `findMany`×3 + serial `triggerEmailWorkflows` per claim/shift; unbounded `emailWorkflow.findMany`)~~
  > **(revised 2026-07-12 verification):** email-reminders is **2** unbounded `emailWorkflow.findMany` (`:182`/`:332`) + per-tenant domain queries — **not** 3 workflow `findMany`. Serial `triggerEmailWorkflows` fires per-claim (`:268`) and per-shift (`:410`). The **highest amplification** is `getSystemUserId` firing PER CLAIM/SHIFT via the `makeGovernedUpdateLastTriggered` callback (`:149-150`).
  - `[NEW]` `cron/integration-auto-sync/route.ts:82,125` — unbounded `goodshuffleConfig.findMany` + `nowstaConfig.findMany` + per-config serial sync dispatch (not in the original audit).
- **Fix:** Memoize `getSystemUserId` per `tenantId` (one-line, compounds across 3 crons — biggest single win for email-reminders). Batch locations/admin-users via `tenantId: { in: [...] }` + `Map` lookups. Bound the `findMany` sweeps with a `take` and process in pages. Crons contend with user traffic on shared Neon compute, so background cost is user-facing latency.
- **Scope:** `route`
- **Acceptance check:** Each cron does O(tenants) system-user lookups instead of O(rows); sweeps are paged; measurement (item 1) shows per-tick DB-time drop on a seeded tenant set.

### 7. `[CORRECTED]` Analytics per-location N+1 + missing `location_id` filters → `GROUP BY`
- **What:** Collapse the per-location loops that fire N raw SQL each into single `GROUP BY location_id` queries; fix the genuinely-missing `location_id` predicates; drop the dead aggregate.
- **Why / evidence:**
  - ~~`analytics/consolidated/route.ts:153-178` (inventory — no location filter), `:221-236` (`recipe.count` — no location filter), `:251-269` (waste), `:284-298` (staff), `:351-417` (`GET_LOCATIONS` — `inventoryCount` no location filter)~~
  > **(revised 2026-07-12 verification):** Only the **inventory** loop (`:153-178`) and the **`recipe.count`** loop (`:221-236`) genuinely **MISS** the `location_id` filter (correctness); `GET_LOCATIONS` `inventoryCount` (`:354-358`) also misses it. The **waste** loop (`:251-269`, filters at `:256`) and **staff** loop (`:284-298`, filters at `:288`) **BOTH already filter by `locationId`** — they are N round-trips (volume/connection-pressure), NOT correctness bugs. So missing-filter bugs = inventory (×2) + `recipe.count` + `GET_LOCATIONS`-inventoryCount only.
  - `analytics/multi-location/route.ts:200-479` fires 11×N concurrent queries (all DO filter — cost is volume/connection-pressure, not a filter bug).
  - `analytics/events/advanced/route.ts:109-142` — unbounded 12mo events fetch, no `LIMIT`.
  - `[NEW]` dead query: `analytics/consolidated/route.ts:133-143` — a tenant-wide inventory aggregate is computed then **IGNORED** (`lowStockItems` hardcoded 0). Remove it.
- **Fix:** Rewrite each per-location loop as one `GROUP BY location_id` raw query; add the missing `location_id` predicate on the inventory/recipe/GET_LOCATIONS paths; add a `LIMIT` to the events fetch; delete the dead aggregate.
- **Scope:** `route`
- **Acceptance check:** 11×N queries collapse to ~1 per metric; results unchanged for the single-location case and now correct per-location on the 3 previously-leaking paths; dead aggregate gone; before/after on the analytics routes from item 1.

### 8. `[VERIFIED]` Search route waterfall + knowledge-base tsvector GIN index
- **What:** Parallelize the global search waterfall and add a tsvector GIN index for knowledge-base `ILIKE`.
- **Why / evidence:** `apps/api/app/api/search/route.ts` + `apps/app/app/api/search/route.ts`: when `type` is omitted, ~15 sequential `findMany`+`count` blocks (serial waterfall) — up to 14 queries/keystroke, no server debounce. Knowledge-base `ILIKE` on content (`search/route.ts:327`) is an unindexed full-text scan.
- **Fix:** Wrap the independent search blocks in `Promise.all`; add server-side debounce. Add a tsvector GIN index on the knowledge-base content column (via `manifest/source` since the model is generated) + use it for the KB clause.
- **Scope:** `route` + `manifest-source` (the tsvector GIN index)
- **Acceptance check:** Omni-type search does one round-trip batch, not 15; KB search hits the GIN index (`EXPLAIN` confirms); before/after on the search route.

### 9. `[VERIFIED]` Public proposal/contract parallel queries
- **What:** Collapse the serial independent reads on the public proposal and contract token routes.
- **Why / evidence:** `public/proposals/[token]/route.ts:33-188` runs 6 serial independent queries (proposal, lineItems, client, lead, event, account); `public/contracts/[token]/route.ts:32,71,85` runs triple `findFirst` on the same `signingToken`. These are user-facing (externally shared links). (Cross-ref item #21 for the unauthenticated `public/contracts/[token]/sign/route.ts:75` over-fetch.)
- **Fix:** One `Promise.all` for the independent reads; collapse the triple `findFirst` to one query with `select`.
- **Scope:** `route`
- **Acceptance check:** Public proposal route does 1 round-trip batch instead of 6; contract route 1 instead of 3; before/after measured.

### 10. `[VERIFIED]` Calendar sync N+1 batch preload
- **What:** Batch-load existing events once per calendar sync instead of per external event.
- **Why / evidence:** `calendar/sync/trigger/route.ts:262,270,371,377` — `syncGoogleCalendar` + `syncOutlookCalendar`: up to 250 external events × `await database.event.findFirst(...)` per iteration ≈ 500 sequential round-trips per sync.
- **Fix:** Pre-load existing events matching the batch by `(title, eventDate, eventType)` into a `Map`; in-memory lookup per external event.
- **Scope:** `route`
- **Acceptance check:** Per-sync round-trips drop from ~500 to ~1 preload + writes; before/after measured.

### 11. `[VERIFIED]` CRM scoring batch recompute
- **What:** Stop the per-lead governed round-trips in score calculation; recompute in memory and batch.
- **Why / evidence:** `crm/scoring/calculate/route.ts:136-148,177-209` loops every lead calling `runManifestCommand` + `updateMany` per row (2N serial governed round-trips) on both the zero-rules and happy paths.
- **Fix:** Recompute scores in memory from the loaded rules + leads; one batched `updateMany` (or chunked) per tenant.
- **Scope:** `route`
- **Acceptance check:** Score recompute is O(leads) in memory + O(chunks) writes, not 2N governed calls; correctness parity on a seeded tenant.

### 12. `[NEW]` Await-in-loop N+1 sweep (governed writes + per-row reads)
- **What:** Collapse the 10 verified await-in-loop sites into batched writes / preloaded maps. Worst-first.
- **Why / evidence (file:line):**
  - `kitchen/allergens/detect-conflicts/route.ts:250` — **NESTED O(guests×dishes)** governed warning writes (highest cost).
  - `apps/app/app/api/inventory/import/route.ts:157` — `$queryRaw` existence check + `runManifestCommand` create/update per item = N+1 upsert.
  - `app/outbox/publish/route.ts:127` — `outboxEvent.update` per pending event, up to 100.
  - `payroll/timecards/generate/route.ts:216` — `runManifestCommand` per shift.
  - `crm/proposal-automation/route.ts:195` — `generateForEvent` per event.
  - `staff/availability/batch/route.ts:93,131` — two per-pattern loops (validation + create).
  - `administrative/trash/list/route.ts:279` + `administrative/trash/analyze/route.ts:490` — `delegate.findMany` per entity/dependent type, up to 10.
- **Fix:** Batch via `updateMany`/`createMany`/`VALUES` CTE where the governed-write constitution allows; preload existence-check rows into a `Set`/`Map`; keep domain mutations on `RuntimeEngine.runCommand()` (no raw-SQL bypass). Conceptually overlaps item #18's per-row-write batching — prioritize the nested allergen loop + inventory import + outbox publish first.
- **Scope:** `route`
- **Acceptance check:** Each cited loop collapses to O(1) or O(chunks) round-trips; transaction/governance semantics preserved; before/after on allergen-conflict + inventory-import.

### 13. `[VERIFIED]` Marketing analytics SQL `GROUP BY`
- **What:** Push the in-memory JS aggregation of email logs + leads into SQL.
- **Why / evidence:** `marketing/analytics/route.ts:34-88` does unbounded `emailLog` + `lead` `findMany` materialized into memory for JS aggregation (could be 100k+ rows). The SMS query in the same file already does the SQL `GROUP BY` correctly — a repo pattern to copy.
- **Fix:** Rewrite the email/lead aggregation as SQL `GROUP BY` mirroring the existing SMS query.
- **Scope:** `route`
- **Acceptance check:** No unbounded materialization; row count read is O(groups); before/after on the marketing analytics route.

### 14. `[VERIFIED]` Analytics write-on-read fix
- **What:** Remove the findFirst-then-conditional-create on a GET in two analytics routes.
- **Why / evidence:** `analytics/events/advanced/route.ts:7-24` and `analytics/events/profitability/route.ts:7-24` — `getTenantIdForOrg` does `findFirst` + conditional `create` on a GET (write-on-read; also a race). Correctness + perf.
- **Fix:** Make the tenant resolution read-only on GET (create elsewhere, e.g. first write); or use an upsert anchored to a non-GET path.
- **Scope:** `route`
- **Acceptance check:** GET analytics routes issue no writes; no race; before/after measured.

### 15. `[VERIFIED]` `infra.prisma` P1 indexes (hand-owned, additive migration)
- **What:** Add the 5 high-value composite indexes on infra tables.
- **Why / evidence:** `admin_audit_trail [tenant_id, created_at]` + `[tenant_id, entity_type, entity_id]` (high-volume audit, seq-scan today); `admin_users [auth_user_id]` (login/auth path, cross-tenant); `OutboxEvent [tenantId, createdAt]` (polling sweep, unbounded growth); `report_schedules [tenant_id, next_run_at]` (cron "due now" = full scan each tick). Verified this revision: ALL 5 infra.prisma P1 indexes confirmed ABSENT; `settings` redundant `@@index` (`:1515`) duplicates `@@unique` (`:1514`) — cleanup nit.
  - `[INVESTIGATE]` **OutboxEvent schema ownership**: verification reports the generated `manifest.prisma` `OutboxEvent` already carries `@@index([status,createdAt])` + `@@index([tenantId])`. Confirm whether the `[tenantId, createdAt]` gap belongs in `infra.prisma` (this item) or `manifest.prisma` (item #19) before creating the migration — do not double-add.
- **Fix:** Add indexes in `infra.prisma`; generate via `pnpm db:dev --create-only`; review SQL; remove the redundant `settings @@index`. Justify each with the measurement from item 1 (seq-scan on the hot path).
- **Scope:** `prisma-migration`
- **Acceptance check:** `EXPLAIN` shows index scans on the 5 hot paths; `db:check` clean; `manifest:ci` green; migration committed (not applied to prod without the deploy gate).

### 16. `[VERIFIED]` Serial `count` + `findMany` → `Promise.all` sweep
- **What:** Convert ~25+ list routes that run `count` then `findMany` serially to `Promise.all`.
- **Why / evidence:** Across kitchen/inventory/shipments/accounting/sales/staff/events list routes, e.g. `inventory/items/route.ts:181,184`, `kitchen/recipes/route.ts`, `events/contracts/route.ts`, `settings/rate-limits/events/route.ts:84`, `crm/clients/[id]/{interactions,events}/route.ts`.
- **Fix:** Wrap each `count`+`findMany` pair in `Promise.all` (mechanical, matches the gold-standard `manifest/[entity]/route.ts:92-100`).
- **Scope:** `route`
- **Acceptance check:** Each swept route does 1 round-trip batch for count+page; spot before/after on 2-3 representative routes.

### 17. `[VERIFIED]` Unclamped `limit` → `clampLimit()` sweep
- **What:** Replace bare `parseInt(searchParams.get("limit"))` with the existing `clampLimit()` helper everywhere.
- **Why / evidence:** Unclamped `limit` → `?limit=999999` unbounded read in ~7 staff/timecard routes (`staff/schedules`, `staff/certifications`, `staff/shifts`, `staff/time-off/requests`, `staff/availability`, `timecards/route.ts`) + goodshuffle `{events, inventory, invoices}` routes. A `clampLimit()` helper already exists at `@/lib/pagination` (used in `training/modules/route.ts`).
- **Fix:** Use `clampLimit()` at every unvalidated `limit`→`take` site.
- **Scope:** `route`
- **Acceptance check:** No `parseInt(limit)` reaches `take` without clamping; grep confirms zero remaining unclamped sites.

### 18. `[VERIFIED]` Serial per-row UPDATE/upsert loops → batch inside transactions
- **What:** Batch the per-row write loops across completion/simulation/webhook routes.
- **Why / evidence:** `inventory/purchase-orders/[id]/complete/route.ts:120-160,212-231` (per-item `purchaseOrderItem.update` + `inventoryItem.update`), `command-board/simulations/{[id]/apply, merge}/route.ts` (per-projection update inside `$transaction`), `webhooks/supplier-catalog/route.ts:209-306` (per-product governed upsert; `payload.products` unbounded), `integrations/webhooks/{retry, trigger}/route.ts` (per-row create/update).
- **Fix:** Batch via `updateMany` / `createMany` / a `VALUES` CTE where the governed-write constitution allows; keep governance via `RuntimeEngine.runCommand()` for domain mutations (do not bypass to raw SQL).
- **Scope:** `route`
- **Acceptance check:** Per-row write loops collapse to chunked batches; transaction semantics preserved; before/after on the PO-complete path.

### 19. `[CORRECTED]` `manifest.prisma` flagship event/staff index set (generated)
- **What:** Add the P0 hot-path indexes for the flagship event/staff surfaces via `manifest/source` + `pnpm manifest:build`.
- **Why / evidence:**
  - ~~62% of the 210 generated models have **zero** `@@index` beyond the composite `@@id([tenantId, id])`~~
  > **(revised 2026-07-12 verification):** Actual: **~50% (104 of 210)** generated models have zero `@@index` beyond the composite `@@id([tenantId, id])` (which only covers PK lookups, not range/secondary scans). Nuance: `ClientInteraction` already has **UNSCOPED** `@@index([clientId])` / `@@index([leadId])` but lacks the composite `[tenantId, clientId]`; `OutboxEvent` has `@@index([status,createdAt])` + `@@index([tenantId])` but lacks composite `[tenantId, createdAt]` (see item #15 `[INVESTIGATE]` for schema-ownership question).
  - P0 flagship set: `EventStaff [tenantId, eventId]` + `[tenantId, staffMemberId]`; `EventDish [tenantId, eventId]` + `[tenantId, dishId]`; `EventBudget` / `EventReport` / `EventImportWorkflow [tenantId, eventId]`; `BattleBoard [tenantId, eventId]`; `ScheduleShift [tenantId, employeeId]` + `[tenantId, scheduleId]`; `TimeEntry [tenantId, employeeId]` + `[tenantId, shiftId]`; `PayrollLineItem [tenantId, employeeId]` + `[tenantId, payrollRunId]`; plus compound `[tenantId, createdAt]` / `[tenantId, status]` on Event/KitchenTask/AdminTask/Notification; `ClientInteraction [tenantId, clientId]`. Verified this revision: ALL 10 flagship event/staff indexes confirmed ABSENT. Worst schema gaps: `tenant_staff` (26/32 unindexed), `public` (27/27), `tenant_inventory` (16/30).
- **Fix:** Declare these `@@index` entries in the relevant `manifest/source/**.manifest` model blocks; rebuild; let the generator produce the migration SQL. Justify each via measurement from item 1 (the long tail of ~104 single-FK gaps is **out of scope** this pass and triaged by measurement).
- **Scope:** `manifest-source`
- **Acceptance check:** Regenerated `manifest.prisma` carries the flagship indexes; `EXPLAIN` confirms index scans on event/staff hot paths; `db:check` clean; `manifest:ci` green.

### 20. `[VERIFIED]` MED cluster: event / AI / kitchen / logistics over-fetch + N+1
- **What:** Bundle of medium-impact route cleanups: parallelize independent reads, add `take:1` / `select`, push JS filters to SQL; two newly-verified low-severity additions folded here.
- **Why / evidence:** `events/[eventId]/run-sheet/route.ts:66-157` (8 sequential queries; `recipeVersion.findMany` `:93` missing `take:1`, fetches all versions and picks latest in JS); `events/export/csv/route.ts:212` (`take:5000` but no `select` for ~14 exported columns); `events/budgets/route.ts:53-63` (`include: { lineItems }` over-fetches on list — detail route does it correctly); `ai/bulk-tasks/confirm/route.ts:121-200` (serial for-of, 2 governed round-trips/task); `ai/suggestions/route.ts:179-208` (`eventStaff.findMany` no event/date filter + 2nd event query); `ai/summaries/[eventId]/route.ts:61-167` (5 sequential, 4 independent); `kitchen/nutrition-labels/list/route.ts:38-74` (per-recipe N+1 = 2N+1); `logistics/vehicles/list/route.ts:38-49` (per-vehicle `driver.count` → `groupBy`); `inventory/items/route.ts:163-177,229-235` (low-stock filter applied in JS after pagination; count uses `lte:0` — correctness + perf).
  - `[NEW]` `staff/shifts/bulk-assignment-suggestions/route.ts:156` — broken null filter (`employeeId` is non-nullable so the intended `employeeId = null` filter was silently dropped) returns ALL shifts, not just unassigned. **Correctness bug with a DB cost.**
  - `[NEW]` `apps/app/.../events/[eventId]/board/actions.ts:306,338` — unbounded `findMany` (`take:200`, no search) on User + Dish every command-board load to populate assignment-dropdown palettes. Server action (not covered by item #5's API-route scope).
- **Fix:** `Promise.all` independent reads; add `take:1`/`select`; move the low-stock predicate into the SQL `where`; restore the intended unassigned-shift filter; bound/persist the board palette.
- **Scope:** `route`
- **Acceptance check:** Each cited route drops round-trips / over-fetch; low-stock list returns correct counts; bulk-assignment returns only unassigned shifts; before/after on run-sheet + nutrition-labels.

### 21. `[NEW]` Over-fetch: rich text/JSON entities read without `select`
- **What:** Add focused `select` projections to 24 `findFirst`/`findMany` on rich text/JSON entities; prioritize the unauthenticated public contract route and the unpaginated no-select list routes.
- **Why / evidence:** proposals (3 routes), contracts (**8 — incl. the token-gated, no-Clerk-session `public/contracts/[token]/sign/route.ts:75`**), recipes/recipeVersions (3), knowledge-base (4), chat messages/threads (2 — **unpaginated AND no-select**), audit reports (2). Worst are the unpaginated manifest-GENERATED list routes that ALSO lack `select`: `recipe-versions/list`, `knowledge-base/list`, `chat messages+threads list`. The public contract-sign route is the most sensitive (payload size + DB cost on an endpoint with no session — access is token-scoped, but minimize what it returns).
- **Fix:** Add `select` projections to each cited site; for the generated list routes, this is coupled to item #5's upstream pagination work (post-gen patch or hand-bound). Cap the chat/knowledge-base list routes.
- **Scope:** `route` (+ couples to item #5 for generated list routes)
- **Acceptance check:** Payload sizes shrink on the 24 sites; the public contract-sign route returns only the fields it renders; `manifest:ci` green; before/after on the contract-sign + a chat list route.

### 22. `[VERIFIED]` LOW cluster: detail-route `select` + raw-SQL parameterization
- **What:** Long-tail safety/over-fetch cleanup on detail routes and one raw-SQL injection point.
- **Why / evidence:** Detail `findFirst` without `select` pulling large text/JSON: `crm/clients/[id]`, `crm/venues/[id]`, `crm/proposals/[id]`, `staff/employees/route.ts:23`, `staff/performance/list`. Plus `analytics/menu-engineering/route.ts:59-91` — `$queryRawUnsafe` string-interpolates `locationFilter` (parameterize via tagged-template `$queryRaw`). Verified this revision: this is the **only** raw-SQL interpolation point — all other `$queryRawUnsafe`/`$executeRawUnsafe` are safely parameterized (see "Verified correct").
- **Fix:** Add focused `select` projections; convert the raw query to a tagged-template `$queryRaw` with bind parameters.
- **Scope:** `route`
- **Acceptance check:** Payload sizes on cited detail routes shrink; raw query uses bound params (no string interpolation); `manifest:ci` green.

### 23. `[VERIFIED]` Connection dependency cleanup
- **What:** After items #2/#3, move the neon driver packages out of runtime deps where they no longer belong.
- **Why / evidence:** `packages/database/package.json:33-34` lists `@prisma/adapter-neon` + `@neondatabase/serverless` as runtime deps, but the runtime path uses `@prisma/adapter-pg`; after item #3 only scripts use neon. Several packages redeclare them (`apps/app`, `packages/mcp-server`).
- **Fix:** Move both to `devDependencies` / script-level in `packages/database`; drop redundant redeclarations.
- **Scope:** `config`
- **Acceptance check:** `pnpm manifest:ci` green; app + API boot with adapter-pg only; no runtime import of `@prisma/adapter-neon` outside scripts.

### 24. `[NEW]` (Optional, LOW) Test / regression-guard harness
- **What:** Give the perf work an automated regression guard by wiring the one real-DB integration test in CI and/or adding a query-count + timing assertion harness built on item #1.
- **Why / evidence:** 99 `apps/api/__tests__` files fully mock `@repo/database` (`vi.fn` stubs) — no real SQL executes. The ONE real-DB integration test (`apps/api/__tests__/manifest/flip-durable-smoke.integration.test.ts:189`) is `describe.skipIf(!(ENABLED && TENANT_ID))` — **silently skipped in CI**. So every N+1 fix and index addition in this plan has no automated regression guard. Spec scope is config + query perf (not test infra), hence OPTIONAL and LOW — but the risk is real: future changes can silently regress any fix here with no signal.
- **Fix (optional):** (a) wire `flip-durable-smoke` to run in CI against a seeded Neon shadow DB (`RUN_DB_SMOKE=1`); and/or (b) add a query-count/timing assertion helper derived from item #1's `$extends` timing, asserted on ≥3 representative routes.
- **Scope:** `test-infra` (explicitly auxiliary to the spec's perf scope)
- **Acceptance check:** At least one real-DB integration test runs green in CI; optional query-count assertion fails on a deliberately-introduced N+1.

---

## Verified correct — no action needed (documented per spec criterion "either fixed or documented with a reason")

- **Driver adapter + pool sizing (A4):** `@prisma/adapter-pg` + `max: 20` pool is correct for long-lived Node / Vercel Fluid. `apps/app/next.config.ts` externalizes `adapter-neon` as `serverExternalPackage`; `index.ts` JSDoc names Fluid. `idleTimeoutMillis: 300s` correctly overrides Prisma v7's 10s default (the P1017 fix is already shipped). `transactionOptions { maxWait: 10s, timeout: 30s }` is consistent across `index.ts` + `standalone.ts`. Migrations use the DIRECT endpoint in local dev, runtime uses POOLED (`keys.ts`) — the correct Neon split (item #2 closes the CI gap).
- **Singleton integrity (A6):** **0 violations.** All 8 `new PrismaClient` hits = 3 singleton files (`index.ts`/`standalone.ts`/`analytics-database.ts`) + 4 one-shot scripts/seeds + 1 known MCP-server exception (item #3). `apps/app/app/lib/data/db.ts:22` is a `$extends` timing wrapper over the imported singleton (not a violation).
- **`pgbouncer` / `connection_limit` / `pool_timeout` correctly ABSENT:** N/A for the `pg`/TCP driver path; pool controlled by `create-pg-adapter.ts` `max:20`. Each gets a one-line inline rationale comment (item #4).
- **Raw-SQL parameterization:** 0 new injection risks. `analytics/menu-engineering/route.ts` is the **only** string-interpolated `$queryRawUnsafe` (item #22). All other `$queryRawUnsafe`/`$executeRawUnsafe` are safely parameterized.
- **0 unscoped `findMany`:** every `findMany` carries a `where` (all include `tenantId`). No bare `findMany()` without a predicate exists.
- **Gold-standard list pattern:** the generic `apps/api/app/api/manifest/[entity]/route.ts:92-100` list is the correct `Promise.all([count, findMany({ take, skip })])` shape that item #5 generalizes.
- **AsyncReactionJob partial indexes** are already correctly in migration SQL (no action).
- **`tenantDatabase(tenantId)` (A5):** zero runtime call sites in `apps/` (only test mocks) — this is a **governance note** (tenant-scoping `$extends` not applied on prod read paths; routes hand-write `tenantId` where-clauses), **not** a perf bug. Documented here per spec; excluded from the prioritized list.
- **Spec coverage:** the existing spec + this plan cover all 7 spec goal areas (pooling, pooled-vs-direct endpoints, client instantiation, connection limits, driver adapters, indexes, N+1). **No new spec file is needed.**

---

## Explicitly out of scope / excluded

- **Constitution-mandated governed-write read-before-write serial reads (D12):** `administrative/chat/threads` `ensureTeamThread`, `administrative/trash/restore` existence checks, and message read-after-write are governance-required (governed writes go through `RuntimeEngine.runCommand()`). These serial reads are **not bugs** and are excluded from the prioritized list.
- **`tenantDatabase` tenant-scoping rollout (A5):** governance decision, not a perf fix (see above).
- **Next.js compile-time performance** (webpack/turbopack): per spec out-of-scope. Measured only to *attribute* latency (cold-vs-warm subtraction in item #1), not fixed here.
- **The Manifest native-source rewrite:** separate plan, `manifest/NATIVE-REWRITE-PLAN.md`.
- **Swapping databases, ORMs, or hosting:** per spec out-of-scope.
- **The index long tail (~104 single-FK gaps + 508 compound opportunities beyond the flagship event/staff set):** deferred — triaged by measurement from item #1, not this pass.
- **Modifying `manifest/source/**` business rules:** excluded by spec constraint. The manifest-source items here (item #5, item #8's index, item #19) touch only pagination defaults, soft-delete filters, and index declarations.
- **Test-infrastructure overhaul:** item #24 is an optional low-priority guard only; the spec scope is config + query perf, not a test-platform rebuild.
- **Stub routes blocked on schema (not perf):** `integrations/quickbooks/history` (no persistence model yet), `command-board/templates` ×2 (blocked on `CommandBoard` `shareId`/`isPublic` fields). Excluded — not DB-perf issues.

---

## Test/regression-guard gap

**Risk (NEW-6):** the test suite has near-zero DB-perf regression guard. 99 `apps/api/__tests__` files fully mock `@repo/database` (`vi.fn` stubs) — no real SQL ever executes. The one real-DB integration test (`apps/api/__tests__/manifest/flip-durable-smoke.integration.test.ts:189`) is `describe.skipIf(!(ENABLED && TENANT_ID))` — **silently skipped in CI**.

**Consequence:** every N+1 fix, index addition, and `select` projection in this plan (items #5, #6–#14, #15, #19, #21) has no automated regression signal. A future change can reintroduce an unbounded `findMany` or drop an index with no test failure.

**Mitigation:** item #24 (optional, LOW) wires the smoke test in CI and/or adds a query-count + timing assertion harness derived from item #1's instrumentation. Treated as auxiliary because the spec scope is config + query perf, not test infra — but flagged here so the gap is visible at review time.

---

## Measurement & evidence plan

The instrumentation is half-built and is the reason item #1 is P0, not an afterthought.

- **Existing (reuse):** `apps/app/app/lib/data/db.ts:16-57` already has a `PRISMA_LOG_QUERIES=1`-gated `$extends` emitting `[prisma:query] model.op Xms` per model query, plus a `timedQueryRaw()` helper for raw `$queryRaw` (which bypasses `$extends`). The existing `withManifestIssueLog` `$extends` in `packages/database` is error-only, no timing.
- **Gotcha (B2):** Prisma 7 driver-adapter mode **ignores** `log: [{ emit: 'event', level: 'query' }]`. Timing MUST use the `$extends` hook, not the `log` constructor option.
- **Gotcha (verified this revision):** `apps/app` timing coverage is PARTIAL — several files import `database` directly from `@repo/database`, bypassing `../data/db` and so missing the timing hook. `apps/api` has NO query timing. Centralizing the `$extends` into `packages/database` (item #1) fixes both.
- **Action (B3):** generalize the timing `$extends` into `packages/database` so both apps inherit it; env-gate (`DB_PERF_LOG` or reuse `PRISMA_LOG_QUERIES`); add a slow-threshold warn (>50ms). Add a per-request `AsyncLocalStorage` DB-time accumulator + thin route wrapper for total-DB-time vs total-request-time. Attribute Next.js dev-compile vs DB via cold (first hit) vs warm (2nd hit) subtraction.
- **Query plans (B4):** `EXPLAIN (ANALYZE, BUFFERS)` via `psql "$DATABASE_URL"` for any slow query surfaced by the above.
- **Representative before/after routes:** `apps/api/app/api/events/route.ts` (event list, joins), `apps/api/app/api/accounting/chart-of-accounts/list/route.ts`, `apps/api/app/api/inventory/purchase-orders/route.ts`.
- **Empty-tenant attribution:** the Neon dev DB is basically empty (1 tenant, 0 events). Some "slow" pages are empty-tenant or cold-start, not DB-bound. Before measuring, seed representative volume (the repo has a sample-data seed), and always record cold-vs-warm + row counts so a fix can be proven DB-bound rather than chasing compile/empty-tenant artifacts.

---

## Priority rationale

Measurement (item #1) is first because the spec mandates evidence and the empty dev DB makes attribution impossible without it; it is also low-risk instrumentation. Next come the foundational connection-correctness items — **item #2 (CI `directUrl`) is new this revision and inserted alongside #3/#4** because it is a migration-safety risk mapping directly to spec criterion #1 ("pooled vs direct endpoints for runtime vs migrations") and a small config fix. Items #3/#4 (MCP client, pgbouncer/verify-full rationale) follow because they affect every query on long-lived processes and are direct spec acceptance criteria. The highest-leverage systemic code fix (item #5: manifest list-route generator — now correctly framed as **upstream-gated**, with a stopgap) follows because one change bounds 60+ routes; then the targeted high-impact hot-path N+1s (items #6–#11), the new await-in-loop sweep (item #12, MED-HIGH — worst-first into the governed-write cluster), and more N+1s (#13–#14). Low-risk additive indexes land next (#15 infra, then #19 manifest after the code fixes that may remove the need for some and must be evidence-backed per spec; #19's ~50%-not-62% figure and the ClientInteraction/OutboxEvent nuances are corrected this revision). Mechanical low-risk sweeps (#16–#18), the MED/LOW long tail (#20, with two newly-verified low-severity findings folded in; #21 new over-fetch with the sensitive public contract route; #22 LOW), the post-fix dep cleanup (#23), and the optional test-guard harness (#24) close out the plan.
