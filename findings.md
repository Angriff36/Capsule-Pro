# Findings: Events Module (Convoy)

## Capsule-Pro Web Build (Basehub)
- basehub-types.d.ts has no post/log matches; likely schema lacks blog definitions or typegen branch mismatch.
- Vercel build fails in `apps/web` due to TypeScript mismatch in blog pages (`_title`/`description` missing on `Post`).
- `pnpm --filter web build` used earlier; should be `pnpm --filter web run build` (or `pnpm --filter ./apps/web run build`).
- Basehub type generation (`pnpm --filter @repo/cms build`) ran successfully; blog schema fields still need confirmation.
- `apps/email` pulls Next via `@react-email/preview-server`; keep a single Next version by moving preview-server to devDependencies and adding a root `pnpm.overrides.next`.
## Initial Repo Scan
- No Events routes or modules found under `apps/app/app/(authenticated)`.
- `spec.md` identifies Events + Battle Boards as the first web/admin module to implement.
- No `docs:list` or `docs-list` script detected in this repo.

## Structure Notes
- `apps/app` is the main Next.js app for authenticated/admin flows.
- `packages/database` appears to be a Prisma stub (per `spec.md`).

## Capsule Events Migrations Summary
- `tenant_events.events` table defines core event fields (event_number, title, event_type, event_date, guest_count, status, budget, venue, tags, notes, assigned_to, client_id, location_id) with composite PK `(tenant_id, id)` and soft delete.
- Status values in SQL: `confirmed`, `tentative`, `cancelled`, `completed`, `postponed`.
- Auto-numbering function generates `ENVT-YYYY-NNNN`; later fix ensures sequence parsing via `split_part` and trigger only on INSERT.
- Related tables: `tenant_events.event_dishes`, `tenant_events.event_staff_assignments`, `tenant_events.event_timeline` (all tenant-scoped, soft delete, RLS).
- RLS updates for events use `core.fn_get_jwt_tenant_id()`; delete is blocked (soft delete only).
## Convoy Supabase Import
- Copied Capsule `supabase/migrations` plus `Schema Contract v2.txt` and `Schema Registry v2.txt` into `convoy/supabase`.

## Neon Compatibility
- `supabase/neon-migrations` is a patched copy for Neon (drops `20251222000100_*` pg_dump file, removes `SET ROLE`/`ALTER OWNER`, adds role bootstrap for `service_role/authenticated/anon`).

## Authenticated App Layout
- `apps/app/app/(authenticated)/layout.tsx` wraps pages with `GlobalSidebar` and `NotificationsProvider`.
- `apps/app/app/(authenticated)/page.tsx` uses `@repo/database` and `@repo/auth` (orgId check) and renders a simple dashboard grid.

## Database Package
- `packages/database` uses Prisma + Neon adapter; currently only a stub `Page` model in `schema.prisma`.
- `apps/app/(authenticated)/page.tsx` reads `database.page.findMany()`.

## Events Wiring Gaps
- `packages/database/prisma/schema.prisma` does not yet include the Events model or multi-schema config; generated client already has Events, so schema/prisma client are out of sync.


