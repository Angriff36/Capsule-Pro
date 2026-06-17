# CLAUDE.md — capsule-pro (Convex compile path)

Binding authority: [`CONSTITUTION.md`](./CONSTITUTION.md). Tactics:
[`AGENTS.md`](./AGENTS.md). Scripts/config: [`SCRIPTS-AND-CONFIG.md`](./SCRIPTS-AND-CONFIG.md).
Read them before non-trivial work.

## Project

capsule-pro is a catering/event platform. On branch `feat/convex-compile-path-a`, its governed
domain (212 entities, ~1054 commands, 103 `.manifest` files) is **compiled to a Convex backend**
by the official Manifest `ConvexProjection`. This is a **brownfield migration off Prisma**, ~Phase
3 of 7. `main` is still Prisma; this branch is Convex.

- Source of truth: `manifest/source/**` → compiled IR `manifest/ir/kitchen.ir.json`.
- Backend: `convex/{schema,queries,mutations,crons,http,sagas}.ts` (generated, ~200 tables, ~1045
  mutations). Governance compiled in, fail-closed.
- Frontend data layer: generated trio in `apps/app/app/lib/` (`manifest-types.generated`,
  `manifest-client.generated`, `manifest-hooks.generated`).
- Proven by the `convex-example` POC (same domain, native `convex/react`).

## Essential commands

```
pnpm manifest:compile             source → manifest/ir/kitchen.ir.json
pnpm manifest:generate-convex     IR → convex/
pnpm manifest:client              IR → the apps/app generated trio
pnpm manifest:check-convex-drift  drift gate
pnpm manifest:enforce-convex-architecture[:strict]   architecture guard (baseline-based)
pnpm manifest:ci                  full gate — must be green to be "done"
pnpm test
```

A green `pnpm test` over drifted `convex/` is **not** done. `pnpm manifest:ci` is.

## Architecture

```
manifest/source/*.manifest
  │ pnpm manifest:compile  (compileProjectToIR)
  ▼
manifest/ir/kitchen.ir.json          ← contract / source of truth
  │ pnpm manifest:generate-convex (ConvexProjection)   │ pnpm manifest:client
  ▼                                                     ▼
convex/{6 files}  (governed backend)        apps/app/app/lib/manifest-{types,client,hooks}.generated.ts
  ▼                                                     │
Convex runtime (executes mutations, persists, reactive) │
                                                        ▼
                          pages: server → client.listX() (one-shot) · live → useQuery(api.queries) (convex/react)
                                 writes → executeCommand → api.mutations.X
```

Options (in `manifest.config.yaml`): `referenceMode: stringId`, `policyMode: enforce`,
`eventsTable: manifestEvents`. `stringId` is load-bearing — do not change.

## Danger zones

1. **`.manifest` / IR** — semantics live here; IR-first, then regenerate.
2. **Generated `convex/` + `*.generated.ts`** — never hand-edit; edits are drift, CI fails.
3. **Tenant isolation** — Convex has no RLS; tenant is server-injected from Clerk, never
   client-supplied (`CONSTITUTION §6`). Still `MISSING ENFORCEMENT` until Phase 5.
4. **Real-time** — only `convex/react` `useQuery` is live; the async client is one-shot. Opt in
   per surface (`CONSTITUTION §4`).
5. **`@angriff36/manifest` version** — pinned; bumping = regenerate `convex/` + trio together.

## Definition of done

- `pnpm manifest:ci` green: no IR/convex drift, no new architecture violations, registries committed.
- Behavior changes went IR-first (source → regenerate), not hand-edited.
- No `ctx.db` write outside generated `convex/`; no `@repo/database`/`@prisma/client`/
  `createManifestRuntime` added.
- New governed-mutation call sites inject tenant server-side.

## What NOT to do

- Don't hand-edit `convex/*` or `apps/app/app/lib/*.generated.ts`.
- Don't add Prisma, `@repo/database`, `createManifestRuntime`, or a hand-written Convex mutation.
- Don't invent new compile/generate/guard scripts — the repo has them (SCRIPTS-AND-CONFIG.md).
- Don't accept a client-supplied tenant on a governed write.
- Don't mark done on `pnpm test` alone — run `pnpm manifest:ci`.

## Platform

Local working copy `C:\projects\capsule-pro` (Windows), branch `feat/convex-compile-path-a`;
mirror on the remote (`/home/oc/projects/capsule-pro-convex`). pnpm + Convex + Next.js.
