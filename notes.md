# Notes: Convoy Salvage Sources

## Guardrails
- Stack: Prisma + Neon; no Supabase RLS.
- Multi-tenant: shared DB with `tenant_id`.
- Realtime: Ably via outbox pipeline.
- Priority order: kitchen tasks, then events, then scheduling.
- Clerk.
- Mint docs at http://localhost:2232/introduction

## Sources

### Capsule
- Key: Supabase schema contract and migrations across tenant_* schemas.
- Artifacts: `supabase/Schema Contract v2.txt`, `supabase/migrations/`.

### Shift-Stream
- Key: Scheduling data model (companies, users, venues, shifts, time off).
- Artifacts: `shared/schema.ts`.

### Battle-Boards
- Key: CSV + TPP PDF parsing; print-ready battle board UI.
- Artifacts: `shared/` parsers, `Event-Battle-Board/src/`.

### Kitchen-Manager-Module
- Key: Event/run-report JSON schemas, policies.
- Artifacts: `schemas/event.schema.json`, `schemas/runreport.schema.json`.

### Mikes Module
- Key: PDF parsing pipeline + allergen/policy configs + review flow.
- Artifacts: `kitchen-prep-app/src/lib/`, `config/`.

### PrepChefApp
- Key: Prep lists, recipes, tasks, event integration; mobile-first workflows.

### caterkingapp
- Key: OpenAPI contracts for prep lists, recipes, events, tasks, CRM.
- Artifacts: `specs/001-catering-ops-platform/contracts/*.yaml`.

### codemachine
- Key: Monorepo blueprint + system scope inventory.

### hq-operations
- Key: Module separation and integration diagrams.

## Synthesized Findings

### Database + RLS
- Capsule contract is the most complete, enforceable multi-tenant model.
- Use SQL migrations to preserve RLS, audit, and realtime requirements.
- Current direction: shared DB with `tenant_id` (no per-tenant DBs).

### Realtime priorities
- Kitchen task claims/progress first.
- Events board second.
- Scheduling third.

### Modules to prioritize
- Events + Battle Boards (highest leverage, clear import pipeline).
- Kitchen tasks and prep lists (mobile + realtime).
- Scheduling (Shift-Stream model maps cleanly).

## Handoff
- Vercel deploy failing in pps/web due to Basehub blog type mismatch; fix requires aligning schema fields in packages/cms fragments and blog pages (no casts).
- Do not revert unrelated styling/font changes; other agent is updating those files.
- Deployment fix in progress: enforce single Next.js version via root `pnpm.overrides` and move `@react-email/preview-server` to devDependencies in `apps/email`.
- Vercel CLI installed and authenticated; use `vercel inspect <url> --logs` to see build errors.
- Current hard error: `apps/app` build fails on `packages/design-system/lib/fonts.ts` because `next/font/google` can’t be resolved; fix is adding `next` to `@repo/design-system` deps and updating lockfile.
- User requested focus on local dev build stability before deployment.
- Events module wiring updated; manual UI verification still pending.
- CSV import and seed script added; PDF import is placeholder.
- Events module works; UI needs polish. Seed data shows duplicates (multiple events per CSV).
- New task: build long-term feature list from CaterKing docs; update task docs every few responses.
- Main sidebar now shows real modules; module routes include local sidebars and stub screens.
- Dev console UI added under `/dev-console` with separate sidebar and styling.
- Theme tokens updated in app styles to make light mode sharper with a dark sidebar.
- Kitchen overview dashboard UI added on `/kitchen` (static for now).
- Modules now live in a global header; left sidebar renders module-specific items with a per-module settings link.
- Vercel build fix: use Uint8Array in event import download response for type compatibility.
- Updated marketing copy for the landing page (en dictionary).
- Synced landing page copy and testimonial images across all locales.
- Added marketing image assets and replaced landing page placeholders with real UI imagery.
- Updated fonts to match Mangia-inspired style (Playfair Display + Source Sans 3).

