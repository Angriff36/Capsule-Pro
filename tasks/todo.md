# Feature: Contextual empty states + one-click sample-data import

Feature ID: feature-1781371077191-uor0rsbm8

## Assumptions (interactive prompt unavailable; chose recommended defaults)
- Scope: build reusable infra + wire the explicitly-named modules (leads, vendors, shifts,
  prep tasks) plus clients & inventory; document 1-prop rollout for the rest.
- Sample-data gating: show "Load sample data" when the tenant's `SampleData.isSeeded === false`,
  to manager/admin (server `SampleData.seed` policy is the real gate). No `isSandbox` flag exists.

## Findings
- Contextual empty-state components already exist (`packages/design-system/.../illustrated-empty-states.tsx`)
  but are underutilized; most list views inline generic "No results" markup.
- `SampleData.seed/clear/reseed` governed commands + generated client (`sampleDataSeed`) + hooks exist.
- ROOT-CAUSE GAP: `seedSampleData()`/`clearSampleData()` (packages/database/src/sample-data/seed.ts)
  are NOT wired to the runtime — seed command flips isSeeded without populating data. Must wire.

## Tasks
- [ ] design-system: add optional `secondaryAction` slot to CTA-bearing empty states
- [ ] apps/app: reusable `SampleDataImportButton` (governed `sampleDataSeed()`, gated on isSeeded)
- [ ] Wire contextual empty states + sample-data button into: leads, vendors, shifts, prep tasks, clients, inventory
- [ ] Backend root-cause: export `@repo/database/sample-data`; runtime middleware wires seed/clear effects
- [ ] Verify: typecheck (design-system, apps/app, packages/database, runtime), build, Playwright if feasible

## Tasks (done)
- [x] design-system: `secondaryAction` slot on EmptyListState/NoTasksState/NoClientsState/NoInventoryState
- [x] apps/app: `SampleDataImportButton` (governed `sampleDataSeed`, gated on isSeeded, manager/admin)
- [x] Wired contextual empty states + import button: leads, vendors, shifts, prep tasks, clients, inventory
- [x] Backend root-cause: `@repo/database/sample-data` export + `createSampleDataSeedMiddleware` (runtime)
- [x] Verify: typechecks (design-system✓ runtime✓ database✓; app green except pre-existing generated drift)

## Review
- Reused the existing (underutilized) illustrated empty-state components rather than building new ones;
  added a backward-compatible `secondaryAction` slot (only renders for create-capable roles).
- Wired 6 representative module list views; remaining modules adopt the same pattern (1 component swap +
  `secondaryAction={<SampleDataImportButton onSeeded={reload} />}`).
- Root-caused the dead sample-data seed: the governed `SampleData.seed/clear/reseed` commands only flipped
  the tracking row; `seedSampleData`/`clearSampleData` were never wired. Added a runtime after-emit effect
  middleware (constitution §9 — direct writes permitted inside the runtime effect boundary).
- VERIFICATION GAP (fail-loud): authenticated Playwright run not possible here (Clerk creds for the setup
  project unavailable; test tenant lists likely non-empty; API on 2223 down). Verified via typecheck of all
  changed packages + confirmed the app serves/compiles with changes (redirects to Clerk as expected).
- PRE-EXISTING (not mine): `apps/app/.../manifest-hooks.generated.ts` references `SoftDeletable`/`TenantScoped`
  absent from `manifest-types.generated.ts` — generated-surface drift; fix is regeneration, out of scope.
