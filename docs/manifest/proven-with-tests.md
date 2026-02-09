# Manifest Integration - Proven with Tests

**Last Updated**: 2026-02-08
**Status**: ✅ **ALL CRITICAL FEATURES VERIFIED**

## What's Been Proven

### 1. ✅ Constraint Severity Enforcement

**Tests**: `apps/api/__tests__/kitchen/manifest-constraint-severity.test.ts` (3/3 passing)

The Manifest runtime correctly enforces constraint severity levels:

- **`severity: ok`** → Informational only, never blocks
- **`severity: warn`** → Produces diagnostic outcome, does NOT block execution
- **`severity: block`** → Blocks execution when constraint fails

**Test Cases**:
```typescript
✓ should allow creation when warn constraint fails (warnOverdue)
✓ should block creation when block constraint fails (validStatus)
✓ should allow entity update when warn constraint fails (warnStationCapacity)
```

**Verification**:
```bash
$ pnpm --filter api test manifest-constraint-severity
Test Files  1 passed (1)
     Tests  3 passed (3)
  Duration  997ms
```

**Runtime Logs**:
```
[Manifest Runtime] Non-blocking constraint outcomes: warnOverdue
[Manifest Runtime] Blocking constraint validation failed: validStatus
```

---

### 2. ✅ Projection System Code Generation

**Tests**: `apps/api/__tests__/kitchen/manifest-projection-preptask-claim.golden.test.ts` (2/2 passing)

The projection system generates valid, production-ready Next.js command handlers:

- Compiles `.manifest` → IR using production compiler
- Generates Next.js App Router POST handlers
- Byte-for-byte reproducible output (golden snapshot test)
- TypeScript-valid code (passes `tsc --noEmit`)

**Test Cases**:
```typescript
✓ Generated code matches golden snapshot (byte-for-byte)
✓ Snapshot typechecks successfully with tsc --noEmit
```

**Generated Handler Includes**:
- Auth handling (configurable: none, clerk, nextauth, custom)
- Tenant resolution (database: `userTenantMapping.findUnique`)
- Runtime instantiation (`createManifestRuntime`)
- Command execution (`runtime.runCommand("claim", ...)`)
- Error handling (policy denial → 403, guard failure → 422, errors → 400)
- Response formatting (`manifestSuccessResponse`, `manifestErrorResponse`)
- Event tracking and emission

**Verification**:
```bash
$ pnpm --filter api test manifest-projection-preptask-claim.golden
Test Files  1 passed (1)
     Tests  2 passed (2)
  Duration  3.46s
```

---

### 3. ✅ Generator Smoke Tests

**Tests**: `packages/manifest/tests/generator-smoke.test.ts` (5/5 passing)

The old generator (`capsule-pro-generate`) produces correct code:

**Test Cases**:
```typescript
✓ generates route with direct Prisma query, not runtime.query()
✓ includes tenant filtering (tenantId in where clause)
✓ includes soft-delete filtering (deletedAt: null)
✓ includes ordering (orderBy: { createdAt: "desc" })
✓ no unnecessary runtime context for GET operations
```

**Generated Code Pattern**:
```typescript
const recipes = await database.recipe.findMany({
  where: {
    tenantId,
    deletedAt: null,
  },
  orderBy: {
    createdAt: "desc",
  },
});
```

**Verification**:
```bash
$ pnpm --filter manifest test generator-smoke
Test Files  1 passed (1)
     Tests  5 passed (5)
  Duration  1.26s
```

---

## Test Summary

| Feature | Test File | Tests | Status |
|---------|-----------|-------|--------|
| Constraint Severity | `manifest-constraint-severity.test.ts` | 3/3 | ✅ Passing |
| Projection Generation | `manifest-projection-preptask-claim.golden.test.ts` | 2/2 | ✅ Passing |
| Generator Output | `generator-smoke.test.ts` | 5/5 | ✅ Passing |
| **TOTAL** | **3 test suites** | **10/10** | **✅ All Passing** |

---

## Command Reference

### Run All Manifest Integration Tests

```bash
# From repo root
pnpm --filter api test manifest

# Individual suites
pnpm --filter api test manifest-constraint-severity
pnpm --filter api test manifest-projection-preptask-claim.golden
pnpm --filter manifest test generator-smoke
```

### Generate a Command Handler

**Using New Projection System**:
```bash
pnpm exec tsx packages/manifest/bin/generate-projection.ts \
  nextjs nextjs.command \
  packages/kitchen-ops/manifests/prep-task-rules.manifest \
  PrepTask claim \
  --output apps/api/app/api/kitchen/prep-tasks/commands/claim/route.ts
```

**Using Old Generator**:
```bash
pnpm --filter manifest exec capsule-pro-generate \
  Recipe recipe-rules.manifest \
  --output apps/app/app/api/kitchen/manifest/recipes/route.ts
```

---

## Implementation Notes

### Severity Fix

**Commit**: `abd1a89d5` in `packages/manifest/src/manifest/runtime-engine.ts`

**Changes**:
1. `validateConstraints()` returns `ConstraintOutcome[]` (with severity) instead of `ConstraintFailure[]`
2. `createInstance()` and `updateInstance()` filter outcomes by `severity === 'block'`
3. Non-blocking outcomes logged via `console.info()` for diagnostics

**Backported From**: Standalone Manifest v0.3.8

### Projection System

**Commits**:
- `624e1462d` - Add projection system from manifest v0.3.8
- `8c309e18e` - Add projection exports and rebuild dist

**Components**:
- `packages/manifest/bin/generate-projection.ts` - CLI tool
- `packages/manifest/src/manifest/projections/` - Registry and generators
- `packages/manifest/src/manifest/projections/nextjs/generator.ts` - Next.js projection

### Generator Fix

**Commit**: `4dcd82a` in standalone manifest

**Fix**: When `includeTenantFilter: false`, include `tenantId: "__no_tenant__"` placeholder instead of omitting tenantId entirely. This ensures consistent runtime context shape.

---

## Next Steps

All critical features are proven and working. The integration is ready for:

1. ✅ **Production use** - Severity enforcement working correctly
2. ✅ **Code generation** - Both generators producing valid code
3. ✅ **Type safety** - Generated code passes TypeScript validation
4. ⏳ **Migration** - Replace manual routes with generated routes (incremental)
5. ⏳ **Expansion** - Add more entities/commands to manifest definitions

---

## Documentation

- **Integration Guide**: `manifest-guide.md`
- **Full Test Results**: `MANIFEST_INTEGRATION_TEST_SUMMARY.md`
- **Projection Tests**: `PROJECTION_TEST_FINAL_RESULTS.md`
