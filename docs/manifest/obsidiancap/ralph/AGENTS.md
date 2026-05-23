## Build & Run

- Ralph loop runs from the **ralph** folder. Application source lives in the **parent monorepo**: `../apps/app/`.
- To build or run the app: from **monorepo root** (`cd ..` from ralph): `pnpm install`, `pnpm dev` (or `pnpm dev:apps`). Do not start the dev server unless the user asks.
- Use **pnpm only** (no npm/yarn). Follow parent repo rules: see `../AGENTS.md` and `../CLAUDE.md` for hard rules (no `any`, Prisma/Neon, Ultracite, etc.).

## Validation

Run these from **monorepo root** after implementing (e.g. `cd ..` then):

- Install: `pnpm install`
- Check: `pnpm check` (or `pnpm lint` then `pnpm format`)
- Tests: `pnpm test`
- Build: `pnpm build`

If any fail, stop and fix or document in @IMPLEMENTATION_PLAN.md.

## Operational Notes

- **Events area:** `../apps/app/app/(authenticated)/events/`
- **EventId page/layout:** `../apps/app/app/(authenticated)/events/[eventId]/` (page.tsx, layout, event-details-client.tsx, event-details-sections.tsx, etc.)
- Shared UI: `../packages/design-system/`, app-level lib: `../apps/app/app/lib/`
- Windows: use backslashes in paths when using the edit tool (e.g. `c:\Projects\capsule-pro\...`).

### Codebase Patterns

- Use design-system components and existing app patterns; do not invent new UI primitives where shared ones exist.
- Events-area components should follow the same loading/error/empty state and accessibility patterns as the rest of the app.
- Keep @IMPLEMENTATION_PLAN.md and progress in the plan file; keep this file to build/run and validation only.
