# Capsule-Pro Generator Implementation Notes

**Date:** 2025-02-06
**Status:** ✅ Working - Route generation and build pipeline validated

## Problem Statement

The Capsule-Pro Manifest generator was creating route files, but they weren't appearing in the Next.js build output. Initial theories about "Next.js silently skipping routes" were incorrect - the actual issue was generating to the wrong app directory.

## Root Cause

**Wrong output directory:** Routes were being generated to `apps/api/src/app/api/...` but the actual Next.js App Router app lives at `apps/app/app/api/...`.

Next.js only discovers routes under the app directory it owns. Generating to `apps/api` (a different app) meant the routes were never discovered or built.

## What Was Fixed

### 1. Route Helpers (`packages/kitchen-ops/src/route-helpers.ts`)

**Problem:** Had app-level dependencies (auth, tenant resolution) that belonged in the app layer, not a shared package.

**Fix:** Removed `setupRouteContext()` function and auth/tenant imports. Now exports only:
- `manifestErrorResponse()` - standard error responses
- `manifestSuccessResponse()` - standard success responses
- Other pure utilities (request parsing, validation)

**Why:** Shared packages shouldn't have app-specific concerns. Auth and tenant resolution should be handled at the app level.

### 2. Kitchen-Ops Index (`packages/kitchen-ops/src/index.ts`)

**Problem:** Duplicate `OverrideRequest` import causing build failures.

**Fix:** Removed duplicate type import from line 2440 (was already imported at line 47).

### 3. Generator Template (`packages/manifest/src/generators/capsule-pro.ts`)

**Problem:** Imported `setupRouteContext` from route-helpers, which no longer exists.

**Fix:** Removed the import from the generated route template.

### 4. Manifest Syntax (`packages/kitchen-ops/manifests/recipe-rules.manifest`)

**Problem:** `contains(self.allergens, "nuts")` - using `contains` as a function call.

**Fix:** Changed to binary operator syntax: `self.allergens contains "nuts"`

**Why:** In Manifest DSL, `contains` is a binary operator (`a contains b`), not a function.

### 5. CLI Async/Await (`packages/manifest/bin/capsule-pro-generate.ts`)

**Problem:** `compileToIR()` returns a Promise but wasn't being awaited.

**Fix:** Added `await` and made `main()` async.

### 6. CLI Path Validation (`packages/manifest/bin/capsule-pro-generate.ts`)

**Problem:** No validation of output path, leading to generating to wrong directory.

**Fix:** Added validation that:
- Requires `/app/api/` in the path (Next.js App Router convention)
- Requires path to end with `/route.ts` (Next.js route handler convention)
- Warns if path doesn't match expected repo structure (`apps/app/app/api/...`)
- Provides clear error messages for invalid paths

**Why:** Prevents generating to wrong directory while remaining flexible for alternative structures.

### 7. Package Export (`packages/kitchen-ops/package.json`)

**Problem:** No export for `./route-helpers` subpath.

**Fix:** Added export entry pointing to `dist/route-helpers.js` and `dist/route-helpers.d.ts`.

### 8. Duplicate Identifier (`packages/kitchen-ops/src/index.ts`)

**Problem:** `OverrideRequest` imported twice (lines 47 and 2440).

**Fix:** Removed duplicate from line 2440.

## Current State

✅ **Working:**
- Manifest compiles to IR successfully
- Generator emits valid Next.js App Router route handlers
- CLI validates output paths according to Next.js conventions
- Route appears in Next.js build output at `/api/kitchen/manifest/recipes`
- kitchen-ops package builds cleanly
- route-helpers are server-safe (no client-only dependencies)

## Key Commands

```bash
# Generate a route (correct path)
npx tsx packages/manifest/bin/capsule-pro-generate.ts \
  Recipe \
  packages/kitchen-ops/manifests/recipe-rules.manifest \
  --output apps/app/app/api/kitchen/manifest/recipes/route.ts

# Build the manifest package
cd packages/manifest && pnpm build

# Build the app that owns the routes
cd apps/app && pnpm build
```

## Architecture Decisions

### 1. Route Helpers Stay Pure
The `route-helpers.ts` module contains only:
- Response formatting functions
- Request parsing utilities
- Validation helpers
- No auth, no tenant resolution, no app-specific logic

**Rationale:** These are shared utilities. App-specific concerns (auth, tenant context) belong in the app layer or generated code, not shared packages.

### 2. Generator Imports App-Level Modules
Generated routes import:
- `@/app/lib/tenant` - app-level tenant resolution
- `@repo/auth/server` - auth from auth package
- `@repo/kitchen-ops/route-helpers` - pure response utilities
- `@repo/kitchen-ops` - runtime and types

**Rationale:** The generated code lives in the app, so it can import app-level modules directly. This keeps shared packages focused.

### 3. Path Validation Follows Next.js Conventions
The CLI validates:
- Path contains `/app/api/` (Next.js App Router for API routes)
- Path ends with `/route.ts` (Next.js route handler convention)
- Warns if not in `apps/app/app/api/...` (repo-specific guidance)

**Rationale:** Validates actual platform rules (Next.js) while remaining flexible for different monorepo structures.

## File Structure

```
apps/app/app/api/kitchen/manifest/
└── recipes/
    └── route.ts          # Generated: GET /api/kitchen/manifest/recipes

packages/kitchen-ops/
├── src/
│   ├── index.ts          # Exports runtimes, types, prisma-store
│   ├── route-helpers.ts  # Pure response utilities (no auth/tenant)
│   └── prisma-store.ts    # Prisma store adapters
├── manifests/
│   └── recipe-rules.manifest  # Manifest DSL file
└── package.json          # Exports: ., ./runtime, ./prisma-store, ./route-helpers

packages/manifest/
├── bin/
│   └── capsule-pro-generate.ts  # CLI with path validation
├── src/
│   ├── generators/
│   │   └── capsule-pro.ts       # Route generator template
│   └── cli-validation.test.ts   # Smoke tests for path validation
└── package.json          # Exports and CLI entry points
```

## Gotchas

### 1. Wrong App Directory
**Symptom:** Route file exists but doesn't appear in build output.

**Diagnosis:** Check which app you're building. Routes in `apps/api` won't be built when you build `apps/app`, and vice versa.

**Fix:** Generate to the correct app directory: `apps/app/app/api/...`

### 2. Manifest `contains` Syntax
**Wrong:** `contains(self.allergens, "nuts")`
**Right:** `self.allergens contains "nuts"`

**Why:** `contains` is a binary operator in Manifest DSL, not a function.

### 3. Package Exports
**Symptom:** `Cannot find module '@repo/kitchen-ops/route-helpers'`

**Diagnosis:** The package.json `exports` field must list the subpath.

**Fix:** Add to package.json exports:
```json
"./route-helpers": {
  "types": "./dist/route-helpers.d.ts",
  "import": "./dist/route-helpers.js"
}
```

### 4. Async Functions in CLI
**Symptom:** CLI returns `Promise<CompileToIRResult>` as `[object Object]`

**Fix:** Always `await` async function calls, even in CLI scripts.

## Validation Rules

The CLI enforces these rules for output paths:

1. **Must contain `/app/api/`** - This is Next.js's App Router convention for API routes
2. **Must end with `/route.ts`** - Next.js route handlers are `route.ts` files
3. **Warns if not `apps/app/app/api/...`** - Advisory, doesn't fail

**Examples:**
- ✅ `apps/app/app/api/kitchen/manifest/recipes/route.ts`
- ✅ `other-app/app/api/kitchen/manifest/recipes/route.ts` (warns but accepts)
- ❌ `apps/api/src/pages/kitchen/recipes.ts` (fails - wrong pattern)
- ❌ `apps/app/app/api/kitchen/recipes/handler.ts` (fails - wrong filename)

## Testing

### Smoke Test
A smoke test exists at `packages/manifest/src/cli-validation.test.ts` that verifies:
- Valid Next.js paths are accepted
- Invalid paths are rejected with helpful errors
- Repo structure warning works correctly

Run with:
```bash
cd packages/manifest
pnpm test src/cli-validation.test.ts
```

### Manual Verification
1. Generate a route
2. Build the app (`cd apps/app && pnpm build`)
3. Check route appears in build output
4. Verify imports resolve

## Runtime Behavior

The generated route:
1. Checks auth via `@repo/auth/server`
2. Resolves tenant via `@/app/lib/tenant`
3. Creates Manifest runtime with PrismaStore
4. Executes operation (list/get/create/update/delete)
5. Returns structured response via `manifestErrorResponse/manifestSuccessResponse`

## Dev Server Issue (2026-02-06)

**Symptom:** All API routes return 404 in dev mode (`pnpm dev`), including:
- Generated `/api/kitchen/manifest/recipes`
- Generated `/api/kitchen/manifest/dishes`
- Existing `/api/kitchen/prep-lists`
- Existing `/api/events/allergens/check`

**Build is fine:** Production build correctly registers all routes in build output

**Error seen earlier:**
```
TypeError: Cannot read properties of undefined (reading 'call')
```

This webpack module loading error indicates corrupted dev server cache.

**Potential fixes to try:**
1. Kill dev server and clear `.next` directory:
   ```bash
   # Kill dev server
   taskkill //F //PID <PID>

   # Clear cache (may need elevated permissions on Windows)
   rm -rf apps/app/.next

   # Restart dev server
   cd apps/app && pnpm dev
   ```

2. Restart entire development environment
3. Check for module resolution conflicts in dependencies

**Status:** Route generation and build pipeline are ✅ working. Dev server runtime testing is ⏸️ blocked by cache/webpack issue.

## References

- [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route)
- [Next.js Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Capsule-Pro Projection Contract](.specify/memory/CAPSULE_PRO_MANIFEST_PROJECTION.md)
