# Task: EmailWorkflow governance migration (Task 8.3 — server action)

Migrate `apps/app/app/(authenticated)/settings/email-workflows/actions.ts` (4 direct
`database.emailWorkflow.*` writes) to route through the Manifest runtime, per constitution §9.
EmailWorkflow is a top-level settings entity (no parent-from-child creation → no parent-context
requirement). Fixes the source-command drift the migration depends on first (constitution §14).

## Why
- 4 governed-entity direct writes bypass Manifest (audit: `manifest:audit-direct-writes`).
- The IR `update` command is **missing `triggerType`** (silent bug: update can't change trigger type).
- Toggle (isActive only) has no partial-update command — the `update` command does full-field
  overwrite, so a toggle through it would clobber name/config.
- The action writes `emailTemplateTenantId` (composite FK tenant key for the template-name read
  join); the IR doesn't model it → migrating would silently break the `emailTemplate` include.

## Plan
- [ ] Source `email-workflow-rules.manifest`:
  - [ ] Add `property emailTemplateTenantId: string = ""`.
  - [ ] `create`: add param + mutate `emailTemplateTenantId`.
  - [ ] `update`: add params + mutates `triggerType`, `emailTemplateTenantId`.
  - [ ] Add `command setActive(isActive: boolean)` (guard not-deleted; mutate isActive; emit Updated).
- [ ] Recompile IR: `pnpm manifest:compile` (regenerates kitchen.ir.json + commands.registry.json).
- [ ] Runtime governance test `email-workflow-governance.test.ts` (mirror venue-governance.test.ts):
      create persists full field surface incl Json configs + emailTemplateTenantId; update changes
      triggerType (regression guard); setActive toggles isActive only; softDelete sets deletedAt +
      blocks update; registry carries create/update/setActive/softDelete.
- [ ] Migrate `actions.ts`: requireCurrentUser → runManifestCommand for create/update/toggle/delete;
      preserve return shapes via read-back. Keep all GET helpers as direct Prisma reads (allowed §10).
- [ ] Verify: manifest-runtime test (new), `pnpm --filter app typecheck`,
      `pnpm manifest:audit-direct-writes` (EmailWorkflow server-action violation gone).

## Out of scope (documented for follow-up)
- `packages/notifications/email-workflow-triggers.ts` `lastTriggeredAt` write (Task 8.4): needs a
  `markTriggered()` command + threading the runtime into `triggerEmailWorkflows` (called by 3 cron
  routes). Separate increment.

## Notes / coercion facts (verified)
- `emailTemplateId`/`emailTemplateTenantId` are nullable `@db.Uuid`; GenericPrismaStore coerces
  optional strings via `asNullableString("") → null`, so "" is safe (no UUID reject).
- `triggerConfig`/`recipientConfig` are `Json` columns modeled as `string`; `asJsonInput` passes the
  value through (no parse) → pass **objects**, not JSON strings. Verified by the runtime test.
- Migration enforces `EmailWorkflowDefaultAccess` policy (role in manager/admin) — intended
  governance tightening for an admin settings surface.

## Review (DONE 2026-06-05)
- Source: added `emailTemplateTenantId` property + create/update params; added `triggerType` to
  `update`; added `setActive` partial-toggle command. Recompiled IR (953 commands; registry carries
  all 4 EmailWorkflow commands).
- Server action: 4 writes → `runManifestCommand` (create/update/setActive/softDelete). `update`/
  toggle load-merge existing row to keep partial-update semantics through the full-field command.
  Read-backs `invariant`-guarded to preserve non-null return contract (fixed `new/page.tsx` consumer).
- Test: `email-workflow-governance.test.ts` (7 tests) — all green; runtime suite 76/76.
- Gates: app typecheck 0, route-drift 0, parent-context strict 0, governed direct-writes 56→55.
- Deferred: notifications package `lastTriggeredAt` write → Task 8.4 (needs markTriggered + runtime
  threading into the 3 cron callers). Documented pre-existing `"use server"` const-export lint.
