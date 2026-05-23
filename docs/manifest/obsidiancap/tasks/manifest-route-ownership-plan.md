# Plan: Manifest Deterministic Write-Route Ownership

> **Created:** 2026-02-28
> **Status:** Enforcement wired (rollout mode). See `tasks/manifest-route-ownership-handoff.md` for remaining work.
> **Prerequisite reading:**
> - `docs/manifest/generation.md`
> - `docs/manifest/FILES_TO_EDIT.md`
> - `packages/manifest-ir/ir/kitchen/kitchen.ir.json` (commands[] array shape)
> - `scripts/manifest/generate.mjs` (materializeRemappedOutput, ENTITY_DOMAIN_MAP)
> - `packages/manifest-runtime/packages/cli/src/commands/audit-routes.ts`

---

## Problem Statement

Manifest is supposed to own mutation routes. In practice:

- Some write routes call `runCommand` or `executeManifestCommand` correctly (58 routes).
- 80 routes bypass the runtime entirely — direct Prisma, raw SQL, or external SDK calls.
- Generator uses a marker-check heuristic to decide what to overwrite — fragile and implicit.
- No machine-enforceable rule separates "Manifest owns this" from "someone wrote this manually."

This plan makes the ownership boundary explicit, deterministic, and CI-enforced.

---

## Core Rules (Non-negotiable)

1. IR commands define the complete, closed set of Manifest-owned write routes.
2. All Manifest-owned write routes live under `*/commands/<command>/route.ts`.
3. Generator overwrites command-namespace routes unconditionally.
4. Generator never overwrites routes outside the commands namespace (unless they carry a generated marker).
5. No filesystem scanning for ownership inference — ownership derives from IR only.
6. Manual write routes outside commands must be explicitly registered in an exemption registry or they fail audit.
7. Same IR in → byte-identical route files out, every time.

---

## Architecture Decisions

### Projection-agnostic compile output

`compile.mjs` emits `kitchen.commands.json` with stable, projection-agnostic fields only:

```json
[
  { "entity": "AlertsConfig", "command": "create", "commandId": "AlertsConfig.create" },
  { "entity": "AlertsConfig", "command": "update", "commandId": "AlertsConfig.update" }
]
```

- Sorted deterministically: `entity ASC`, `command ASC`.
- **No URL paths, no domain mappings** — compile knows nothing about Next.js conventions.
- `generate.mjs` turns this list into routes using its own `ENTITY_DOMAIN_MAP`.
- Rationale: keeping path conventions out of compile means a second projection (tRPC, Express) can consume the same `commands.json` without recompiling.

### Commands namespace is the only legal write surface

- `*/commands/*` = Manifest-owned, unconditionally overwritten, must call `runCommand`.
- Everything else = manual territory, protected from overwrite, fails audit if it exports write methods unless exempted.

### Explicit exemption registry

Manual write routes that legitimately exist outside Manifest ownership must be declared in a checked-in file:

`packages/manifest-runtime/packages/cli/src/commands/audit-routes-exemptions.json`

Format:
```json
[
  {
    "path": "apps/api/app/api/webhooks/clerk/route.ts",
    "methods": ["POST"],
    "reason": "Auth callback — not domain logic",
    "category": "webhook"
  }
]
```

- Exemptions are explicitly reviewed, checked in, and visible in PRs.
- Removing an exemption without fixing the route fails CI immediately.
- Adding a new write route outside commands that is NOT in the exemption registry fails CI.

---

## Changes Required

### 1. `scripts/manifest/compile.mjs`

After producing `kitchen.ir.json`, derive and emit `kitchen.commands.json`.

**Rules:**
- Source: `ir.commands[]` array only. No filesystem reads.
- Fields: `entity`, `command`, `commandId` (`${entity}.${command}`). Nothing else.
- Sort: `entity ASC`, `command ASC` — stable across runs.
- Write to: `packages/manifest-ir/ir/kitchen/kitchen.commands.json`.
- If IR has zero commands, write an empty array (don't skip the file).
- **Not allowed:** computing URL paths, importing `ENTITY_DOMAIN_MAP`, or any Next.js-specific logic.

---

### 2. `scripts/manifest/generate.mjs`

Replace heuristic overwrite logic for commands namespace with deterministic, validated materialization.

**Changes to `materializeRemappedOutput`:**

1. Load `kitchen.commands.json` at start of materialization.
2. Compute expected set of command route paths from `commands.json` + `ENTITY_DOMAIN_MAP`.
3. After staging, run three checks — **fail hard on any violation:**
   - **Forward check:** every staged `*/commands/*` route maps to exactly one entry in `commands.json`. If not found: error.
   - **Reverse/mirror check:** every entry in `commands.json` has a corresponding staged route. If missing: error (catches generator template drift).
   - **Method check:** any `*/commands/*` route staged with a GET export is rejected — commands namespace is write-only.
4. For `*/commands/*` destinations: overwrite unconditionally (no marker check).
5. For all other destinations: retain current behavior (skip non-generated files, warn).

**Hard failures (non-zero exit):**
- A write-method route staged outside `*/commands/*`.
- A `*/commands/*` route staged that isn't in the manifest.
- A manifest entry has no staged route.

**Determinism invariant:** given the same `kitchen.ir.json`, `generate.mjs` must produce byte-identical `route.ts` files. No timestamps, random IDs, or `new Date()` in generated route templates.

---

### 3. `packages/manifest-runtime/packages/cli/src/commands/audit-routes.ts`

**Three new rules:**

#### `WRITE_OUTSIDE_COMMANDS_NAMESPACE` (error)
- Trigger: `route.ts` exports `POST/PUT/PATCH/DELETE` and path does NOT contain `/commands/`.
- Exempt: paths declared in the exemption registry.
- Suggestion: "Move this route to `commands/<command>/route.ts` or register an explicit exemption."

#### `COMMAND_ROUTE_MISSING_RUNTIME_CALL` (error)
- Trigger: `route.ts` path contains `/commands/` and does NOT call `runCommand`.
- No exemptions — commands namespace always goes through runtime.
- Suggestion: "All command routes must execute through runtime.runCommand."

#### `COMMAND_ROUTE_ORPHAN` (error)
- Trigger: `route.ts` path contains `/commands/` but is NOT listed in `kitchen.commands.json`.
- Suggestion: "This command route has no IR backing. Delete it or add the command to your manifest."

**Existing rules kept as-is:**
- `READ_MISSING_TENANT_SCOPE`, `READ_MISSING_SOFT_DELETE_FILTER`, `READ_LOCATION_REFERENCE_WITHOUT_FILTER`
- `WRITE_ROUTE_BYPASSES_RUNTIME` — retained as secondary signal

**New CLI options:**
- `--commands-manifest <path>` — defaults to `packages/manifest-ir/ir/kitchen/kitchen.commands.json` relative to repo root. **Always auto-detected. Never requires explicit flag for normal use.**
- `--exemptions <path>` — defaults to `packages/manifest-runtime/packages/cli/src/commands/audit-routes-exemptions.json`.

**Rollout strategy:**
- New rules ship as `warnings` behind `--strict` in first PR.
- Second PR flips to errors by default after burn-down.
- This prevents panic-disabling of rules on first merge.

---

### 4. Initial Exemption Registry

Based on full route enumeration (138 manual write routes identified). Pre-populated exemptions grouped by category:

#### Webhooks (never Manifest-owned — external callbacks)
```
app/webhooks/auth/route.ts                          POST  "Clerk/Svix auth webhook"
app/webhooks/payments/route.ts                      POST  "Stripe webhook"
app/webhooks/sentry/route.ts                        POST  "Sentry issue-alert webhook"
app/api/collaboration/notifications/email/webhook/route.ts  POST  "Resend delivery-status webhook"
app/api/collaboration/notifications/sms/webhook/route.ts    POST  "Twilio delivery-status callback"
app/api/integrations/webhooks/route.ts              POST  "Register outbound webhook subscription"
app/api/integrations/webhooks/[id]/route.ts         PUT, DELETE
app/api/integrations/webhooks/retry/route.ts        POST
app/api/integrations/webhooks/trigger/route.ts      POST
```

#### Auth callbacks
```
app/ably/auth/route.ts          POST  "Ably token request for real-time auth"
app/api/collaboration/auth/route.ts  POST  "Liveblocks collaboration auth token"
```

#### Infrastructure / outbox
```
app/outbox/publish/route.ts                         POST  "Outbox drain worker — not domain logic"
app/api/kitchen/prep-lists/autogenerate/process/route.ts  POST  "Cron outbox worker"
app/api/cron/contract-expiration-alerts/route.ts    POST  "Cron job — infrastructure"
app/api/cron/email-reminders/route.ts               POST  "Cron job — infrastructure"
app/api/sentry-fixer/process/route.ts               POST  "AI auto-fix worker — infrastructure"
```

#### Integrations (third-party sync — not domain commands)
```
app/api/integrations/goodshuffle/config/route.ts    POST, DELETE
app/api/integrations/goodshuffle/inventory/sync/route.ts  POST
app/api/integrations/goodshuffle/invoices/sync/route.ts   POST
app/api/integrations/goodshuffle/sync/route.ts      POST
app/api/integrations/goodshuffle/test/route.ts      POST
app/api/integrations/nowsta/config/route.ts         POST, DELETE
app/api/integrations/nowsta/employees/map/route.ts  POST, DELETE
app/api/integrations/nowsta/sync/route.ts           POST
app/api/integrations/nowsta/test/route.ts           POST
```

#### Public (unauthenticated — cannot go through manifest auth context)
```
app/api/public/contracts/[token]/sign/route.ts      POST  "Public contract signing — no auth context"
app/api/public/proposals/[token]/respond/route.ts   POST  "Public proposal accept/reject — no auth context"
```

#### File uploads
```
app/api/events/contracts/[id]/document/route.ts     POST  "File upload — not a command"
app/api/events/documents/parse/route.ts             POST  "PDF/CSV parsing — not a command"
```

#### Export/reporting (read-aggregation, not mutations)
```
app/api/events/export/quickbooks/route.ts           POST
app/api/inventory/purchase-orders/export/quickbooks/route.ts  POST
app/api/payroll/export/quickbooks/route.ts          POST
app/api/sales-reporting/generate/route.ts           POST
```

#### Timecards bulk (legacy transaction — migrate to aggregate command)
```
app/api/timecards/bulk/route.ts  POST  "Legacy $transaction — migrate to Timecard.bulkUpsert command"
```

#### Training (legacy manual — migrate to Manifest commands)
```
app/api/training/modules/route.ts          POST       "Legacy manual write — migrate to Manifest command"
app/api/training/modules/[id]/route.ts     PUT, DELETE "Legacy manual write — migrate to Manifest command"
app/api/training/assignments/route.ts      POST       "Legacy manual write — migrate to Manifest command"
app/api/training/complete/route.ts         POST       "Legacy manual write — migrate to Manifest command"
```

#### Known issues to also fix (not just exempt)
- `app/conflicts/detect/route.ts` — duplicate of `app/api/conflicts/detect/route.ts` with **no auth guard**. Fix before or during this session.
- `user-preferences/route.ts` — exports `GET_KEY`, `PUT_KEY`, `DELETE_KEY` as named exports, which are silently ignored by Next.js router. Fix invalid export pattern.
- `kitchen/prep-lists/save/route.ts` — legacy direct-Prisma path alongside the Manifest-backed `save-db/route.ts`. Should be deleted.

**Domain-logic routes that are NOT exempted (should migrate to commands namespace):**

The following are domain writes that currently bypass Manifest and should eventually migrate, but are too large to scope into this PR. They should **fail the audit** to make migration pressure explicit. The implementing session must decide the final list — the options are:

1. Add each as an explicit timed exemption with a follow-up task linked.
2. Migrate the simplest ones in this same PR.

Routes in this bucket (non-exhaustive, confirm during implementation):
- `accounting/accounts/**` — CRUD with no manifest commands defined
- `administrative/tasks/**` — CRUD with no manifest commands defined
- `command-board/**` (non-commands paths) — partially manifest, partially manual
- `events/contracts/**` — contract lifecycle with no manifest commands
- `events/guests/**`, `events/allergens/**`
- `inventory/items/[id]/route.ts`, `inventory/stock-levels/adjust/route.ts`
- `payroll/**` — full payroll domain not in manifest
- `staff/availability/**`, `staff/certifications/**`, `staff/budgets/**`
- `shipments/[id]/route.ts`, `shipments/[id]/status/route.ts`

---

### 5. Tests

#### Test A — Determinism: `commands.json`
- Given: same `kitchen.ir.json` content compiled twice.
- Assert: `kitchen.commands.json` is byte-identical both times.

#### Test B — Determinism: generated route content
- Given: same IR run through `generate.mjs` twice.
- Assert: all `*/commands/*` route files are byte-identical both times.
- Catches: template changes introducing `new Date()`, random IDs, or non-stable ordering.

#### Test C — Manual GET route untouched
- Given: `route.ts` at `prep-tasks/route.ts` with no generated marker, GET only.
- Run: full `materializeRemappedOutput` over staged output including `prep-tasks/commands/create/route.ts`.
- Assert: `prep-tasks/route.ts` is byte-identical before and after.

#### Test D — Orphan command route detection
- Given: `commands/foo/route.ts` exists on disk. Not in `commands.json`.
- Assert: `manifest audit-routes` fails with `COMMAND_ROUTE_ORPHAN`.

#### Test E — Write outside commands namespace
- Given: `timecards/route.ts` exports `POST`, no exemption registered.
- Assert: `manifest audit-routes` fails with `WRITE_OUTSIDE_COMMANDS_NAMESPACE`.

#### Test F — Exemption suppresses violation
- Given: same route from Test E, but registered in exemptions file.
- Assert: `manifest audit-routes` passes for that file.

#### Test G — Mirror check catches generator drift
- Given: `commands.json` declares `PrepTask.archive` but generator templates produce no staged file for it.
- Assert: `generate.mjs` exits non-zero with explicit error naming the missing route.

---

## Execution Order (for implementing session)

1. Update `scripts/manifest/compile.mjs` → emit `kitchen.commands.json` (projection-agnostic).
2. Run `pnpm manifest:compile` → verify `kitchen.commands.json` produced, spot-check sort order and field shape.
3. Update `scripts/manifest/generate.mjs` → forward/mirror/method checks, unconditional commands overwrite.
4. Run `pnpm manifest:generate` → verify command routes written/overwritten, confirm no parent `route.ts` modified.
5. Create `audit-routes-exemptions.json` → populate with initial exemption list from this plan (verify list before writing).
6. Update `audit-routes.ts` → three new rules + `--commands-manifest` + `--exemptions` + rollout flag.
7. Add Tests A–G to `audit-routes.test.ts`.
8. Run `pnpm manifest:route-audit --strict` → verify new rules fire on current violations, exemptions suppress correct entries.
9. Run `npm test` in `packages/manifest-runtime` → all tests green.
10. Fix known issues (conflicts duplicate, user-preferences exports, prep-lists/save legacy).
11. Republish `@angriff36/manifest` as patch version.

---

## Open Items for Implementing Session

### Must decide before writing exemptions file
- Confirm full list of domain-logic routes that get timed exemptions vs. migrate-now.
- Decide whether `accounting/**`, `administrative/**`, and `payroll/**` get timed exemptions or are out of scope entirely.

### Known issues to fix in same session
- `app/conflicts/detect/route.ts` — no auth guard (security gap).
- `user-preferences/route.ts` — invalid named exports `GET_KEY`/`PUT_KEY`/`DELETE_KEY`.
- `kitchen/prep-lists/save/route.ts` — legacy path, delete.

### Follow-up tasks (out of scope for this PR)
- `timecards/bulk` → model as `Timecard.bulkUpsert` aggregate command.
- `training/**` → author manifest commands for training domain.
- Domain-logic routes in accounting, payroll, administrative → author manifest commands.

---

## Invariant Table

| Invariant | Enforced By |
|---|---|
| IR commands = complete set of write routes | `kitchen.commands.json` derived from IR, no filesystem |
| Generator never guesses ownership | Forward + mirror validation before any copy |
| Command routes always use runtime | `COMMAND_ROUTE_MISSING_RUNTIME_CALL` audit rule |
| Manual writes are explicit, not silent | `WRITE_OUTSIDE_COMMANDS_NAMESPACE` + exemption registry |
| No orphan command routes | `COMMAND_ROUTE_ORPHAN` audit rule |
| Same IR → same routes | Determinism tests A + B |
| Manual reads untouched | Non-commands marker-check guard retained |
| Exemptions are visible and reviewed | Checked-in JSON file, visible in PRs |
| Second projection is possible | compile output has no Next.js path conventions |
