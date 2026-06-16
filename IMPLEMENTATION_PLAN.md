# Implementation Plan — Convex Migration (clone repo)

See `manifest/task_plan.md` and **`manifest/convex-phase-out-registry.json`** for the authoritative bucket list.

## Current state

- Convex projection wired: `pnpm manifest:generate-convex` → `convex/`
- Prisma runtime still active (legacy — delete per registry after Convex store adapter)
- `apps/app` still uses `/api/...` + `@repo/database` in many callsites

## Next work (in order)

1. **Convex store adapter** — replace `createManifestRuntime` Prisma provider
2. **Frontend migration** — Convex client/hooks in `apps/app`, retire apiFetch shims
3. **Port list** — Sentry, supplier sync, payroll, MCP, command-board commit, recipe/inventory actions
4. **Delete list** — Prisma package, domain API routes, generated Prisma metadata (registry)
