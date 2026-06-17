# APPLY — using this charter with the live repo

This charter is **documentation that describes the real `capsule-pro` @ `feat/convex-compile-path-a`**
— not a fresh scaffold. The repo already has the pipeline, scripts, drift gate, and architecture
guard. These files explain and govern what exists; they don't install a parallel system.

## What's here

| File | Purpose | Status |
|---|---|---|
| `CONSTITUTION.md` | Binding architecture + rules | Accurate to the live repo |
| `AGENTS.md` | Tactical agent rules | Accurate |
| `CLAUDE.md` | Repo orientation for Claude Code | Accurate |
| `SCRIPTS-AND-CONFIG.md` | Map of the **real** scripts + `manifest.config.yaml` options | Accurate |
| `MIGRATION-DELETE-KEEP.md` | Delete/keep/clean buckets + phase tracker + live counts | Accurate |
| `.github/workflows/manifest-governance.yml` | CI that runs `pnpm manifest:ci` + strict guard | Drop-in |

## How to apply

1. Copy the four docs to the repo root: `CONSTITUTION.md`, `AGENTS.md`, `CLAUDE.md`,
   `SCRIPTS-AND-CONFIG.md`. Copy `MIGRATION-DELETE-KEEP.md` to `manifest/`.
   (These coexist with the repo's existing `manifest/convex-phase-out-registry.json`, which they cite.)
2. Add `.github/workflows/manifest-governance.yml` and make `manifest-governance` a **required
   status check** on the branch — that's what makes the gate binding.
3. Do **not** add any scripts from earlier charter drafts — the repo's `manifest/scripts/*` are
   authoritative (`compile.mjs`, `generate-convex.mjs`, `generate-convex-client.mjs`,
   `check-convex-drift.mjs`, `enforce-convex-architecture.mjs`).

Local repo: `C:\projects\capsule-pro`. Remote mirror: `/home/oc/projects/capsule-pro-convex`.
To push onto the remote: `scp <file> openclaw:/home/oc/projects/capsule-pro-convex/...`.

## Remaining work (Hermes's phases — see MIGRATION-DELETE-KEEP.md for live counts)

- **Phase 1** — fix the 5 `reactions.manifest` type issues (arrays `= []`, money/decimal string literals).
- **Phase 3 (finish)** — `apiFetch` (~113) + last `@repo/database` (~14) → generated client.
- **Phase 4 (optional, real-time)** — put live surfaces on `convex/react` `useQuery`.
- **Phase 5** — Clerk-Convex auth + tenant filtering, flip/verify `policyMode: enforce` live. (Security-critical.)
- **Phase 6** — migrate data Postgres → Convex (Convex DB is empty).
- **Phase 7** — delete `apps/api`, `packages/database`, `manifest/runtime`; remove the `nextjs`
  projection block from `manifest.config.yaml`.

## Open decisions (flagged, not assumed)

- **Real-time scope:** which surfaces get native `convex/react` vs stay on the one-shot async client.
- **`manifest-hooks.generated` (TanStack):** adopt for client CRUD, or delete (currently ~unused).
- **External HTTP door:** keep `convex.http` for webhooks, or drop.
