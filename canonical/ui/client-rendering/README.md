# Client Rendering & Manifest Hooks

Canonical ID: `ui.client-rendering`

Type: `feature`

Owner decision status: `needs-ryan`

Implementation status: `working`

Last reviewed: 2026-06-26

Last updated by: `agent`

---

## 1. What This Is

Plain-English purpose:

```text
How the Next.js app consumes Manifest-generated artifacts on the client: generated TanStack Query hooks (manifest-hooks/), the typed command client (manifest-client/), the optimistic command hook, SSE realtime subscriptions, and domain-specific analytics hooks. This layer defines the server/client component boundary and the single canonical path for UI-to-Manifest communication.
```

Real app impact:

```text
When correct:
- All governed reads use generated TanStack Query hooks from manifest-hooks/.
- All governed writes use executeCommand from manifest-client.ts (never raw fetch or ad-hoc API calls).
- Optimistic UI updates reconcile with the authoritative server response via useOptimisticCommand.
- Realtime events arrive via SSE (useRealtimeChannel), replacing the previous Ably dependency.
- Server components handle data loading; client components handle interactivity.

When wrong:
- Components bypass generated hooks with raw fetch() calls to entity endpoints.
- Commands are dispatched to non-canonical API paths.
- Optimistic updates diverge from server state without reconciliation.
- Generated hooks are stale relative to the Manifest IR.
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
The generated hook/client infrastructure exists and is working (pilot adoption with 3 domains, full generated library with 1358+ hooks). However, the adoption strategy (pilot file vs. direct imports), the domain-specific analytics hooks (use-finance-analytics, use-kitchen-analytics, etc.) placement, and how to handle the generated hook drift gate need Ryan's input.
```

Do not do:

```text
Do not import from manifest-hooks.generated.ts or manifest-client.generated.ts directly — use the barrel index or the pilot re-exports.
Do not create raw fetch() calls to entity list/detail endpoints in components — use generated hooks.
Do not dispatch governed commands through any path other than executeCommand from manifest-client.ts.
Do not create local type interfaces for Manifest command payloads — use generated types.
Do not re-add Ably SDK — it has been replaced by native SSE (useRealtimeChannel).
```

---

## 3. Current Status

Current recorded status:

```text
Working. Manifest generates typed TanStack Query hooks (manifest-hooks/) and a typed command client (manifest-client/) across 6 domain modules (core, events, kitchen, finance, staffing, crm, logistics). The hook library contains 171 list + 188 detail + 999 mutation hooks (per manifest-hooks-pilot.ts comment). Pilot adoption covers 3 domains (InventoryItem, Client, Recipe) via manifest-hooks-pilot.ts re-exports. The typed command client (manifest-client.ts) provides executeCommand with CommandEnvelope<T> response typing and friendly-error mapping. useOptimisticCommand wraps executeCommand for optimistic UI updates. Realtime is SSE-based (useRealtimeChannel), no Ably.
```

Known gaps:

```text
1. manifest-hooks-pilot.ts is a "pilot" re-export file for 3 domains — unclear if this is the intended adoption pattern or a stepping stone to direct imports.
2. manifest-hooks.generated.ts and manifest-client.generated.ts exist at the top level (app/lib/) alongside the manifest-hooks/ and manifest-client/ directories — two parallel structures with unclear ownership.
3. 10 domain-specific analytics hooks (use-event-budgets, use-event-profitability, use-finance-analytics, use-forecasts, use-kitchen-analytics, use-locations, use-recipe-costing, use-event-export, use-realtime-channel, use-optimistic-command) are hand-written in app/lib/ — not generated.
4. No CI drift gate exists for generated hooks/clients being stale relative to Manifest IR (manifest:react-query:check exists but its coverage is UNKNOWN).
5. manifest-field-hints.ts / manifest-field-hints.generated.ts exist — purpose and consumers are UNKNOWN.
6. manifest-editor/ directory exists in app/lib/ (kitchen-ir.ts) — purpose is UNKNOWN (possibly an IR editing tool, not a runtime artifact).
```

Confidence: `high`

Evidence:

```text
- apps/app/app/lib/manifest-client.ts — typed CommandClient class, executeCommand(), CommandSuccess<T>, CommandError, CommandFailedError, CommandEnvelope<T>. NOT "use client" (server-compatible).
- apps/app/app/lib/manifest-client/ — 8 generated domain files (core, events, kitchen, finance, staffing, crm, logistics, index) + dynamic domain loader (loadClientDomain). All are "use client".
- apps/app/app/lib/manifest-hooks-pilot.ts — "use client", re-exports selected hooks for 3 pilot domains from manifest-hooks.generated.ts. Explicitly labeled "Pilot adoption of generated TanStack Query hooks (Task 5.2)."
- apps/app/app/lib/manifest-hooks/ — 8 generated domain barrel files (core, events, kitchen, finance, staffing, crm, logistics, index). Generated by manifest:generate-hooks.
- apps/app/app/lib/manifest-hooks.generated.ts — top-level generated file (NOT in subdirectory). Purpose unclear relative to manifest-hooks/.
- apps/app/app/lib/manifest-client.generated.ts — top-level generated file (NOT in subdirectory). Purpose unclear relative to manifest-client/.
- apps/app/app/lib/manifest-types.generated.ts — generated TypeScript types.
- apps/app/app/lib/manifest-field-hints.ts + .generated.ts — purpose UNKNOWN.
- apps/app/app/lib/manifest-editor/ — contains kitchen-ir.ts; purpose UNKNOWN.
- apps/app/app/lib/use-optimistic-command.ts — "use client", optimistic dispatch + rollback for governed commands.
- apps/app/app/lib/use-realtime-channel.ts — "use client", SSE subscription to /api/realtime/events, replaces Ably.
- apps/app/app/lib/use-event-budgets.ts, use-event-profitability.ts, use-finance-analytics.ts, use-forecasts.ts, use-kitchen-analytics.ts, use-locations.ts, use-recipe-costing.ts, use-event-export.ts — hand-written domain analytics hooks (not generated).
- 16 files in manifest-hooks/ and manifest-client/ subdirectories carry "use client" directive.
- manifest-client.ts does NOT carry "use client" (server-compatible).
```

---

## 4. Where It Lives

Canonical decision file:

```text
canonical/ui/client-rendering/README.md
```

Source location:

```text
apps/app/app/lib/ (manifest-client.ts, manifest-hooks-pilot.ts, use-*.ts, manifest-*.generated.ts)
apps/app/app/lib/manifest-client/ (generated per-domain client chunks)
apps/app/app/lib/manifest-hooks/ (generated per-domain hook chunks)
```

Generated output location:

```text
apps/app/app/lib/manifest-hooks/*.generated.ts (generated by manifest:generate-hooks)
apps/app/app/lib/manifest-client/*.generated.ts (generated by manifest:client)
apps/app/app/lib/manifest-types.generated.ts (generated by manifest type generator)
apps/app/app/lib/manifest-hooks.generated.ts (top-level generated file)
apps/app/app/lib/manifest-client.generated.ts (top-level generated file)
apps/app/app/lib/manifest-field-hints.generated.ts (generated)
```

Runtime location:

```text
apps/app/app/lib/ (imported by "use client" page components)
```

UI location:

```text
All "use client" components that dispatch commands or query entity data
```

Test location:

```text
NONE — no test files for generated hooks/clients
```

Docs location:

```text
NONE — manifest-hooks-pilot.ts contains inline adoption documentation
```

---

## 5. Entry Points

User-facing route:

```text
NONE (infrastructure layer consumed by all routes)
```

Route file:

```text
NONE
```

API route / dispatcher:

```text
manifest-client.ts dispatches to POST /api/manifest/{entity}/commands/{command}
status-transition-badge.tsx fetches from GET /api/manifest/{entity}/transitions?status=...
use-realtime-channel.ts subscribes to GET /api/realtime/events (SSE)
```

CLI command:

```text
manifest:generate-hooks (generates manifest-hooks/)
manifest:client (generates manifest-client/)
```

Background job / cron / worker:

```text
NONE
```

---

## 6. What Consumes It

Direct consumers:

```text
- apps/app/app/components/inline-edit-field.tsx — imports useOptimisticCommand, executeCommand
- apps/app/app/components/status-transition-badge.tsx — imports executeCommand
- apps/app/app/components/bulk-actions.tsx — imports executeCommand
- Page components importing from manifest-hooks-pilot.ts (useInventoryItemList, useClientList, useRecipeDetail, etc.)
- Page components importing domain analytics hooks (use-finance-analytics, use-kitchen-analytics, etc.)
- Page components using useRealtimeChannel for SSE subscriptions
```

Indirect consumers:

```text
Every interactive page that reads entity data or dispatches governed commands.
```

Generated consumers:

```text
- manifest-hooks-pilot.ts re-exports from manifest-hooks.generated.ts
- manifest-client/ domain chunks import from manifest-client.ts (CommandSuccess, CommandError types)
```

Human consumers:

```text
Ryan, frontend developers, coding agents.
```

---

## 7. What It Is Wired To

Manifest entities:

```text
All 6+ entity domains: core, events, kitchen, finance, staffing, crm, logistics (via generated hooks/clients)
```

Manifest commands:

```text
All governed commands (dispatched via executeCommand through POST /api/manifest/{entity}/commands/{command})
```

Manifest events:

```text
Consumed indirectly via useRealtimeChannel (SSE) for optimistic UI reconciliation
```

Manifest policies / access rules:

```text
NONE at the client-rendering layer (policies are server-enforced)
```

Database tables / collections:

```text
NONE (indirect via API)
```

Generated types:

```text
- manifest-types.generated.ts
- CommandEnvelope<T>, CommandSuccess<T>, CommandError (hand-typed in manifest-client.ts)
```

Generated client/hooks:

```text
- manifest-hooks/*.generated.ts (TanStack Query hooks per domain)
- manifest-client/*.generated.ts (typed client functions per domain)
- use-optimistic-command.ts (optimistic dispatch wrapper)
```

Forms/pages/components:

```text
All "use client" page components in apps/app/app/(dashboard)/
```

---

## 8. Canonical Behavior

Happy path:

```text
A page component imports a generated query hook (e.g. useEventList) for reads and executeCommand (or a generated mutation hook) for writes. Reads flow through TanStack Query with React Query devtools for debugging. Writes flow through executeCommand -> POST /api/manifest/{entity}/commands/{command} -> Manifest RuntimeEngine. Optimistic writes use useOptimisticCommand for immediate UI feedback with server reconciliation. Realtime updates arrive via SSE useRealtimeChannel.

Server components handle initial data loading (no "use client" needed for static reads). Client components handle interactivity (form inputs, status transitions, optimistic updates).
```

Failure behavior:

```text
If executeCommand returns CommandError, the component surfaces the friendly-error toast (friendlyError.title/message/suggestedFix). If the optimistic update was applied, useOptimisticCommand rolls back to the pre-command snapshot. If the generated hooks are stale, queries may fail with type mismatches — no CI gate currently catches this.
```

Forbidden behavior:

```text
No raw fetch() calls to entity endpoints in UI components.
No governed command dispatch through non-canonical API paths.
No hand-written TanStack Query hooks for entities covered by the generated hooks.
No re-introduction of Ably SDK (replaced by native SSE).
No importing from manifest-hooks.generated.ts or manifest-client.generated.ts top-level files — use the manifest-hooks/ or manifest-client/ subdirectory barrels or the pilot re-exports.
```

---

## 9. Naming Rules

Canonical name:

```text
Client Rendering & Manifest Hooks
```

Allowed aliases:

```text
manifest hooks
generated hooks
manifest client
command client
```

Forbidden aliases:

```text
manifest-hooks-pilot (internal name, not a canonical concept)
```

Casing / slug rules:

```text
Directory: apps/app/app/lib/manifest-hooks/
Directory: apps/app/app/lib/manifest-client/
File: manifest-client.ts (hand-written canonical client)
File: use-optimistic-command.ts (hand-written optimistic hook)
File: use-realtime-channel.ts (hand-written SSE hook)
Hook: use<Entity>List, use<Entity>Detail, use<Entity><Command>Mutation (generated)
Canonical ID: ui.client-rendering
```

---

## 10. Open Questions

Agents may add rows. Agents may not decide for Ryan.

| ID   | Question | Why it matters | Evidence found | Options | Ryan decision |
| ---- | -------- | -------------- | -------------- | ------- | ------------- |
| Q001 | Is the pilot re-export pattern (manifest-hooks-pilot.ts) the intended adoption strategy, or should pages import directly from manifest-hooks/? | The pilot file re-exports 3 domains. Full library has 1358+ hooks. If pilot stays, every new domain needs a manual re-export. | manifest-hooks-pilot.ts re-exports 3 domains from manifest-hooks.generated.ts. Comment says "Pilot adoption of generated TanStack Query hooks (Task 5.2)." | A: Migrate to direct imports from manifest-hooks/ (remove pilot file). B: Keep pilot pattern, add re-exports per domain. C: Auto-generate the pilot barrel. | NEEDS-RYAN |
| Q002 | Why do top-level manifest-hooks.generated.ts and manifest-client.generated.ts exist alongside the manifest-hooks/ and manifest-client/ subdirectories? | Two parallel structures create ambiguity about which is canonical. Risk of importing from the wrong location. | Both manifest-hooks.generated.ts and manifest-hooks/ exist. Both manifest-client.generated.ts and manifest-client/ exist. | A: Top-level files are legacy; delete them. B: Top-level files are the barrel; keep both. C: SOURCE REQUIRED — need generator docs. | NEEDS-RYAN |
| Q003 | Should domain-specific analytics hooks (use-finance-analytics, use-kitchen-analytics, etc.) be generated or remain hand-written? | 10 hand-written hooks exist in app/lib/. If they query governed entities, they could be generated. If they compose complex cross-entity analytics, they must stay hand-written. | use-event-budgets, use-event-profitability, use-finance-analytics, use-forecasts, use-kitchen-analytics, use-locations, use-recipe-costing, use-event-export — all in apps/app/app/lib/. | A: Generate what can be generated, keep analytics composition hand-written. B: All hand-written (current state). C: SOURCE REQUIRED — need hook source analysis. | NEEDS-RYAN |
| Q004 | Should CI gate generated hook/client freshness against Manifest IR? | manifest:react-query:check exists (per memory). If stale hooks ship, pages may break at runtime. | manifest-hooks-pilot.ts comment references "Task 5.2". Memory mentions manifest:react-query:check wired into manifest:ci. | A: Already done (manifest:react-query:check in CI). B: Not yet done, needs wiring. C: SOURCE REQUIRED — verify CI config. | NEEDS-RYAN |

---

## 11. Decision History

| Date       | Decision | Made by | Reason |
| ---------- | -------- | ------- | ------ |
