# AGENTS.md — capsule-pro (Convex compile path)

Tactical rules. Authority: [`CONSTITUTION.md`](./CONSTITUTION.md). Scripts/config:
[`SCRIPTS-AND-CONFIG.md`](./SCRIPTS-AND-CONFIG.md). Migration map:
[`MIGRATION-DELETE-KEEP.md`](./MIGRATION-DELETE-KEEP.md).

## One-sentence model

Domain is compiled from `.manifest` → IR (`kitchen.ir.json`) → Convex backend + a generated
frontend client, by the official `ConvexProjection`. Change behavior in `.manifest` and
regenerate — never hand-edit `convex/` or the `*.generated.ts` files. No Prisma, no RuntimeEngine.

## Where you are (Hermes's 7 phases)

Backend generated ✅. Reads ~90% migrated to the async client ✅. **Phase 3 in progress.**
Remaining: `apiFetch` (113 files) → Phase 4 (native hooks, optional real-time) → Phase 5 (auth +
tenant) → Phase 6 (data) → Phase 7 (delete carcass).

## Data layer — what to call in a page

| Page/component | Use |
|---|---|
| Server component / action, static/detail/report | `await client.listX()` / `getX()` / `executeCommand(...)` (`manifest-client.generated`) |
| Client component needing **live** updates (board, kanban, dashboard) | `useQuery(api.queries.listX)` / `useMutation(api.mutations.X)` from `convex/react` |

The async client is **one-shot** (`client.query()`), not reactive. Real-time exists **only** via
native `convex/react`. Pick per surface. The TanStack `manifest-hooks.generated` is ~unused —
don't introduce it as a third path without a decision.

## Hard rules (enforced by `manifest:ci` + `enforce-convex-architecture`)

1. **No drift** — committed `convex/` and `manifest/ir/kitchen.ir.json` must equal a fresh regen.
   Run `pnpm manifest:check-convex-drift` before pushing.
2. **No hand-edited generated code** — `convex/*` and `apps/app/app/lib/*.generated.ts` regenerate
   only (`manifest:generate-convex`, `manifest:client`).
3. **Governed writes only via generated mutations** — `executeCommand` → `api.mutations.X`. No
   `ctx.db` writes outside generated `convex/` files.
4. **No forbidden imports** — `@prisma/client`, `@repo/database`, `prismaOverride`,
   `createManifestRuntime`. The guard grandfathers ~289 baselined; **fails on new ones.**
5. **Server-injected tenant** — never client-supplied (Convex has no RLS).

## Commands

```
pnpm manifest:compile               source → manifest/ir/kitchen.ir.json
pnpm manifest:generate-convex       IR → convex/
pnpm manifest:client                IR → apps/app/app/lib/manifest-{types,client,hooks}.generated.ts
pnpm manifest:check-convex-drift    drift gate
pnpm manifest:enforce-convex-architecture[:strict]   architecture guard
pnpm manifest:ci                    the full gate (run before you push)
```

Migration helpers (don't reinvent): `codemod-prisma-to-manifest-client.mjs`,
`migrate-prisma-imports.mjs`, `remove-dead-database-imports.mjs`.

## Change protocol

```
edit manifest/source/*.manifest
  → pnpm manifest:compile
  → pnpm manifest:generate-convex && pnpm manifest:client
  → pnpm manifest:ci
```

IR first, generated second. Never the reverse.

## On conflict

Existing code isn't automatically right (a passing test that bypasses generated mutations, a
committed `convex/` that differs from a regen, an `@repo/database` import — all suspect). Report:

```
NONCONFORMANCE:
- file: / behavior: / violated rule: / safer replacement: / whether patched:
```

Fix the legal way: change IR → regenerate → pass the gate. Use the existing migration helpers for
read swaps. Don't revive Prisma/RuntimeEngine. Don't re-decide the architecture.

## Loop discipline

- Hand-tweaking a generated file → STOP, that's drift; change IR.
- Inventing a new compile/generate/guard script → STOP, the repo already has it (see SCRIPTS-AND-CONFIG).
- A green `pnpm test` ≠ done. `pnpm manifest:ci` green = done.
