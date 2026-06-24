# Engineering & Platform Features

Catalog of the 36 engineering/platform features built via `.aboardai/` (June 2026).
These are **not** the business-domain milestones in `feature_list.md` (Events /
Kitchen / CRM / …) — they are cross-cutting platform, observability, codegen,
governance, and UI infrastructure. Lives here so the two lists don't get conflated.

Each entry: **what it does**, the **dev note that still matters**, and a
**VERIFIED status** cross-checked against the repo (2026-06-23). Where the dev's
original comment has since gone stale, the verified status says so — do **not**
re-do that work.

---

## 🔴 Verified-open items (act on these)

| # | Feature | What's still open | Verified |
|---|---------|-------------------|----------|
| 1 | Schema Migration Dry-Run Gate | Workflow is live when both secrets are set. **Verified:** `NEON_API_KEY` + `NEON_DATABASE_URL` exist on `Angriff36/Capsule-Pro` GitHub secrets. Point `NEON_DATABASE_URL` at **dev** (`ep-square-dust`), not prod (`ep-divine-math`). | secrets verified 2026-06-23 |
| 2 | Read Replica Routing | Create a Neon read replica on **dev** (`ep-square-dust`) or **prod** (`ep-divine-math`) + set `ANALYTICS_DATABASE_URL` in Infisical/Vercel. Code routes analytics/reporting reads through `analyticsDatabase` (`packages/database/analytics-database.ts`) and falls back to primary when unset. | **code implemented 2026-06-23**; replica + env still required to activate |
| 3 | Governed UserPreference entity | Persistence rides the non-governed `/api/user-preferences` route (auth-bound to session `userId` — IDOR fixed). A governed `UserPreference` Manifest entity+command (§9) is a documented follow-up. | design follow-up, open |
| 4 | Mobile high-contrast (full app) | RN toggle + WCAG AAA palette provider + persistence via `/api/mobile/app-settings` added 2026-06-23. Remaining: propagate `useHighContrast().colors` to all mobile screens (Settings is wired; other screens still use static styles). | partial — toggle works, palette rollout incomplete |

## ✅ Recently resolved (2026-06-23 cross-check)

| # | Feature | Was claimed open | Actual status |
|---|---------|------------------|---------------|
| 1 | Reaction Observability Dashboard | "`reaction_logs` migration never applied" | **RESOLVED.** Migration exists in `packages/database/prisma/migrations/20260619001610_repair_drift/migration.sql` (creates `tenant_admin.reaction_logs` + indexes). Run `pnpm db:deploy` if the table is missing on a given DB. |
| 2 | Per-Command P95 / Reactions-log dashboards | "Built but not wired into nav" | **RESOLVED.** Nav links added under Tools (`/tools/reactions-log`, `/tools/command-perf`) and Analytics sidebar. |

## ✅ Dev claims that are now STALE (resolved — do NOT redo)

- **`@angriff36/manifest` version skew** ("pins 2.8.0, installed 2.10.7/2.11.0/2.14.0 → typecheck red") → **RESOLVED.** Capsule is now pinned to **2.16.1** across `apps/api`, `manifest/runtime`, root, `packages/mcp-server`.
- **OpenTelemetry "5 files uncommitted, please commit"** → **RESOLVED.** Telemetry files are tracked (`apps/api/lib/manifest/telemetry.ts`, `issue-log-telemetry.ts`, `manifest/runtime/src/manifest-telemetry-collector.ts`).
- **"Orphan" async handler `inventory-transfer-received-stock-movement-handler.ts` not wired** → **RESOLVED.** It is now referenced in `middleware/index.ts` and `middleware-registry.ts`.
- **`/api/user-preferences` IDOR via query-param `userId`** → **RESOLVED.** Route binds reads/writes to Clerk session `userId` (see `apps/api/app/api/user-preferences/route.ts`).
- **e2e/Playwright "harness broken"** — Clerk session expiry + missing `e2e/` helpers were the recurring reason ~all UI features couldn't be browser-verified. Treat per-feature "couldn't Playwright" notes as an environment artifact, not a feature defect; re-verify in a live authed session when convenient.

---

## Catalog (36 features)

### Observability & performance
- **Reaction Execution Observability Dashboard** (`refactor`) — Tenant-scoped dashboard streaming reaction/command execution history (success + silent no-op/guard-failures) via a new `onCommandSettled` telemetry hook → append-only `reaction_logs`. Migration in `20260619001610_repair_drift`; nav at `/tools/reactions-log`.
- **Per-Command P95 Latency Tracking + slow-command alerting** (`enhancement`) — Ranked P95 per command from the reactions log, configurable threshold (`MANIFEST_PERF_P95_THRESHOLD_MS`, default 2000ms). Nav at `/tools/command-perf`.
- **OpenTelemetry Tracing Through Command Dispatcher** (`refactor`) — `manifest.command` spans with entity/command/tenant/actor attrs; nested dispatch nests as child spans. Files committed (stale claim resolved).
- **IR Command Registry Compiled Lookup Index** (`enhancement`) — Memoize per-call `ResolvedCommand` construction (was 2 allocs/dispatch); all 1054 commands resolve by reference. Behavior-identical.
- **DataLoader Batching for Prisma Reads in Reaction Chains** (`enhancement`) — Request-scoped read cache that dedups governed-state reads and invalidates on write; read-path only (§10). 5 unit tests cover read-after-write freshness.
- **Read Replica Routing for Analytics/Reporting Queries** (`enhancement`) — Heavy OLAP reads route to `ANALYTICS_DATABASE_URL` when set via `analyticsDatabase`, else primary. *Open item #2 (ops/env).*

### Async reactions & middleware
- **Async Reaction Dispatch via Pg_Notify Queue** (`refactor`) — 20 async reactions (2 pilots + 18) on an at-least-once idempotent worker; two-hook state-capture middleware correctly stays sync. ~30 low-ROI single-dispatch middleware remain sync (migrate on demand).
- **Async Reaction Queue with Retry and DLQ** (`refactor`) — Queue infra with retry + dead-letter. ~18 middleware still to migrate (3-line factory edit each); 30s drain / batchSize 25 recommended.
- **Formal Command Middleware Registry with Typed Contracts** (`refactor`) — Contract layer over imperative middleware; `middleware-registry` (24 tests). Future: collapse the standard `storeProvider+dispatch` subset into registry-driven construction.

### Codegen, IR & validation
- **Domain-Split Code Generation for Client Bundle** (`refactor`) — Client split into domain chunks (core/events/kitchen/finance/staffing/crm/logistics); `manifest-types.generated.ts` stays monolithic (type-only). Regenerate via `pnpm manifest:client` + `manifest:generate-hooks`; `react-query:check` validates all chunks.
- **Static Compiled IR Snapshot Embedded at Build Time** (`enhancement`) — 7.3MB IR embedded so the serverless fn is decoupled from monorepo layout; `manifest:ir:embed:check` drift gate. Commit both `kitchen.ir.json` + `kitchen.ir.generated.json` after IR changes.
- **IR Source Maps for .manifest DSL Error Attribution** (`refactor`) — Deterministic `command-source-map.json` sidecar so runtime errors point at the originating `.manifest` file+line. Lives in `manifest/runtime/`.
- **Zod Pre-Validation Short-Circuit Before RuntimeEngine** (`enhancement`) — Fast-fails missing-required / wrong-primitive-type before the engine; non-strict subset. Regenerate via `pnpm manifest:command-schemas`.
- **Manifest Command Param Type Conformance CI Gate** (`refactor`) — CI gate (in `manifest:audit:strict`) catching command-param type drift across Prisma/OpenAPI/Zod. 43 pre-existing violations baselined (27× string→DateTime, …); fails only on NEW drift.
- **Schema Migration Dry-Run Gate on .manifest Changes** (`refactor`) — GH Actions workflow that spins an ephemeral Neon branch and validates `schema.prisma`↔migrations on `.manifest`/schema PRs. *Open item #1 (needs Neon secrets).*

### Governance & runtime
- **Tenant-Scoped Feature Flags Backed by Manifest IR** (`refactor`) — `FeatureFlag` entity persisted in the shared `manifest_entity` JSON-blob table (no migration); governed create/enable/disable/setRollout; rollout % + deterministic bucketing. `flagKey` uniqueness is reader-deduped, not DB-enforced.
- **Governed Command Batch Endpoint** (`enhancement`) — `POST /api/manifest/batch` runs multiple commands in one transaction (rollback on any failure); webhooks intentionally skipped for batch. Route correctly registered (not shadowed by `[entity]` sibling).
- **Inline Manifest Command Error Translator** (`enhancement`) — Maps runtime failures to friendly errors + deep links (`friendlyError`/`blockingEntity.link`); backwards-compatible. Extend `ENTITY_META` in `friendly-error-mapper.ts` as new entities gain detail pages.

### UI / UX
- **Propagation Impact Preview Before Saving** (`enhancement`) — Modal previewing downstream cascade impact when editing an event (board re-sync, prep rescale, staffing, invoice terms).
- **Multi-Step Event Wizard with Auto-Save Checkpoints** (`enhancement`) — Wizard with checkpoint auto-save; `Event.update` needs full fields so the step overlays its slice.
- **Entity Breadcrumb Trail with Quick-Jump Context** (`enhancement`) — Sticky breadcrumb with clickable ancestors; `SEGMENT_LABELS`/`DYNAMIC_CHILD_LABELS` degrade gracefully for unknown routes (add entries for custom labels). Note: commit `702b9b758` bundled unrelated changes.
- **Command Board Onboarding Overlay** (`enhancement`) — First-use overlay (per-user/per-surface `localStorage`); reset via `capsule-board-onboarding:` keys.
- **Form Field Business Rule Tooltips** (`enhancement`) — Static IR-derived constraint tooltips via `getFieldHint`; regenerate with `pnpm manifest:field-hints` (`:check` is drift-gate-ready).
- **Contextual Empty State Templates per Module** (`enhancement`) — Reusable empty-state + sample-data-seed CTA; named modules wired (leads/prep/vendors/shifts/clients/inventory), remaining list views adopt in ~2 lines each.
- **Screen Reader Semantic Markup for Analytics Dashboards** (`enhancement`) — Vega-Lite charts get ARIA + audible summary automatically. Executive dashboard + menu-engineering use Recharts (separate treatment if needed).
- **Interactive FSM Status Badge with Transition Menu** (`enhancement`) — IR-driven status badge with transition menu; disabled transitions surface required params. Invoice detail still hard-codes per-status buttons (§4 smell, left alongside).
- **Event Overview Mini-Map with Conflict Indicators** (`enhancement`) — Phase segments with derived conflict flags; staffing ratio is a heuristic (`GUESTS_PER_STAFF=25`) — replace with a real `Event.requiredStaff` field when it exists.
- **Role-Aware Permission Dimming with Upgrade Tooltip** (`enhancement`) — `<PermissionGate>` dims restricted controls + tooltip; keep `roles.ts` tiers in sync with `apps/api/app/lib/auth-roles.ts`.
- **Print-Optimized Run Sheet & Prep List Layouts** (`enhancement`) — Print CSS strips nav/aside/buttons, adds QR footer; `qrcode.react` is transitive (declare explicitly if preferred).
- **Inline Edit for Scalar Fields** (`enhancement`) — `<InlineEditField>` for governed single-param updates; one-line rollout per field. Use `localhost:2221` (not 127.0.0.1) for Playwright.
- **Bulk Selection Mode for List Views** (`enhancement`) — Shared `BulkActionBar` + `useBulkSelection`; wired to governed lists. Shifts (no governed command) + prep-lists (generation UI, not flat governed rows) intentionally NOT wired.
- **Optimistic UI with Governed Command Rollback** (`enhancement`) — `useOptimisticCommand` hook (optimistic → revert on failure). `StatusTransitionBadge` is an easy next adopter (not wired).
- **System-Wide High-Contrast Mode** (`enhancement`) — Ctrl/Cmd+Alt+C toggle, AAA 21:1 palettes, tenant-persisted (no FOUC). Web complete; mobile toggle added 2026-06-23 (full-screen palette rollout still open — item #4).
- **Visible Focus Ring System + Skip-Navigation** (`enhancement`) — `:focus-visible` 3px ring + WCAG 2.4.1 skip link; pure UI/CSS.
- **Adjustable Font Size & Text Density Controls** (`enhancement`) — Root font-size + density CSS vars, persisted via user-prefs. *Governed-pref follow-up (#3).*

### Build / lint
- **Domain Package Boundary Lint via Turborepo Constraints** (`refactor`) — `pnpm boundaries` (`turbo boundaries`) enforces domain-tag deny-matrix. 57 pre-existing unrelated issues to clean up before wiring into CI.
