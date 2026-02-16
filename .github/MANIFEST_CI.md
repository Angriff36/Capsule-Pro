# Manifest CI/CD Pipeline Documentation

This document describes the automated CI/CD pipeline for manifest validation and code generation in Capsule-Pro.

## Overview

The Manifest CI pipeline ensures that:
1. All manifest files are syntactically valid
2. Generated code is kept up-to-date with manifest changes
3. TypeScript compilation succeeds for generated code
4. All integration tests pass (172 tests across 6 domains)
5. Snapshots are synchronized when code generation changes

## Workflow Files

### `.github/workflows/manifest-ci.yml`

Main GitHub Actions workflow that runs on:
- Pull requests to `main` or `develop` branches
- Changes to manifest files, manifest package, or generated API routes
- Manual workflow dispatch (for snapshot checks)

## Jobs

### 1. Manifest Validation (`manifest-validate`)

Validates that all manifest files compile without syntax errors.

**Steps:**
- Compiles each `.manifest` file in `packages/kitchen-ops/manifests/`
- Runs conformance tests from `packages/manifest/src/manifest/conformance/`
- Fails if any manifest has compilation errors

**Error Messages:**
- `Manifest compilation failed for <file>` - Syntax error in manifest file
- Check the error output for line/column information

**Local Testing:**
```bash
# Validate all manifests
pnpm manifest:compile

# Run kitchen tests
cd apps/api
pnpm test __tests__/kitchen/ -- --run
```

### 2. Code Generation Check (`manifest-codegen-check`)

Verifies that generated code is up-to-date with manifest definitions.

**Steps:**
- Runs `pnpm run analyze` (includes Prisma code generation)
- Checks git diff for any uncommitted changes
- Fails if generated files have changed

**Error Messages:**
- `Generated code is out of date. Please run 'pnpm run analyze' locally and commit the changes.`

**Fix:**
```bash
# Regenerate code
pnpm run analyze

# Commit generated files
git add apps/api/app/api/kitchen/
git commit -m "feat: regenerate manifest-generated routes"
```

### 3. TypeScript Check (`manifest-typescript-check`)

Ensures all generated code compiles without TypeScript errors.

**Steps:**
- Runs `pnpm run check` (TypeScript type checking)
- Validates type safety across all packages

**Error Messages:**
- TypeScript compilation errors with file paths and line numbers

**Common Issues:**
- Missing runtime factory exports in `apps/api/lib/manifest-runtime.ts`
- Incorrect import paths in generated handlers
- Type mismatches in generated route handlers

### 4. Integration Tests (`manifest-tests`)

Runs all manifest integration tests from `apps/api/__tests__/kitchen/`.

**Test Coverage:**
- 172 tests across 6 domains
- HTTP integration tests (42 routes)
- Command-level constraint tests (23 tests)
- Runtime behavior tests
- Snapshot verification tests

**Test Files:**
- `manifest-http-integration.test.ts` - HTTP endpoint tests
- `manifest-constraints-http.test.ts` - Constraint violation tests
- `manifest-command-constraints.test.ts` - Command-level constraint tests
- `manifest-preptask-runtime.test.ts` - Runtime behavior tests
- `manifest-projection-snapshot.test.ts` - Snapshot verification

**Local Testing:**
```bash
cd apps/api
pnpm test __tests__/kitchen/ -- --run
```

### 5. Snapshot Check (`snapshot-check`)

Optional job for validating snapshot tests (manual trigger only).

**Trigger:**
- Manual workflow dispatch with `snapcheck: true` input

**Steps:**
- Runs snapshot tests in check mode
- Verifies no snapshot files have changed
- Fails if snapshots need updating

**Error Messages:**
- `Snapshot tests are out of date. Please update snapshots locally...`

**Fix:**
```bash
cd apps/api
pnpm test __tests__/kitchen/manifest-projection-snapshot.test.ts -u
git add __tests__/kitchen/__snapshots__/
git commit -m "test: update manifest snapshots"
```

## PR Template Guidance

When creating a PR that modifies manifest files, the `.github/pull_request_template.md` provides:

1. **Pre-submission Checklist** - Steps to validate changes locally
2. **CI Checks Description** - What checks will run
3. **Common Issues** - How to fix common failures
4. **Resources** - Links to documentation

## Manifest Files

All manifest files are located in:
```
packages/manifest-adapters/manifests/
├── prep-task-rules.manifest
├── recipe-rules.manifest
├── menu-rules.manifest
├── prep-list-rules.manifest
├── inventory-rules.manifest
└── station-rules.manifest
```

## Generated Code

Generated API routes are located in:
```
apps/api/app/api/kitchen/
├── menus/commands/
├── stations/commands/
├── prep-lists/commands/
├── prep-lists/items/commands/
├── inventory/commands/
├── recipes/commands/
├── ingredients/commands/
├── recipe-ingredients/commands/
└── dishes/commands/
```

## Troubleshooting

### "Manifest compilation failed"

**Cause:** Syntax error in manifest file

**Solution:**
1. Check the error output for line/column information
2. Review manifest syntax against examples in `packages/manifest/src/manifest/conformance/fixtures/`
3. Use `manifest-compile` CLI locally to test compilation
4. Common issues:
   - Missing semicolons
   - Invalid constraint syntax
   - Undefined variables or functions
   - Incorrect entity or command names

### "Generated code is out of date"

**Cause:** Manifest was changed but generated code wasn't updated

**Solution:**
```bash
pnpm run analyze
git add apps/api/app/api/kitchen/
git commit -m "feat: regenerate manifest-generated routes"
```

### "Snapshot tests are out of date"

**Cause:** Code generator output changed but snapshots weren't updated

**Solution:**
```bash
cd apps/api
pnpm test __tests__/kitchen/manifest-projection-snapshot.test.ts -u
git add __tests__/kitchen/__snapshots__/
git commit -m "test: update manifest snapshots"
```

### "TypeScript compilation errors"

**Cause:** Generated code has type errors

**Solution:**
1. Check that runtime factories are exported in `apps/api/lib/manifest-runtime.ts`
2. Verify import paths match your app structure
3. Ensure Prisma client is generated (`pnpm run analyze`)
4. Check for missing type definitions

### Integration tests failing

**Cause:** Runtime behavior or HTTP integration issues

**Solution:**
1. Run tests locally to see detailed error messages
2. Check that runtime factories are correctly configured
3. Verify auth and tenant resolution mocks are working
4. Review test logs for specific failure reasons

## Testing Locally

Before pushing, run these commands locally:

```bash
# 1. Validate manifests
pnpm manifest:compile

# 2. Generate code
pnpm run analyze

# 3. Type check
pnpm run check

# 4. Run integration tests
cd apps/api
pnpm test __tests__/kitchen/ -- --run

# 5. Check git status (should be clean)
git status
```

## CI/CD Best Practices

1. **Always run locally first** - Validate changes before pushing
2. **Commit generated files** - Never skip code generation step
3. **Update snapshots** - Keep snapshots synchronized with generator output
4. **Check CI logs** - Review detailed error messages in GitHub Actions
5. **Test on multiple manifests** - Validate changes work across all domains
6. **Review test coverage** - Ensure new features have test coverage

## Manual Workflow Dispatch

To run snapshot checks manually:

1. Go to Actions tab in GitHub
2. Select "Manifest CI" workflow
3. Click "Run workflow"
4. Enable "Run snapshot check mode"
5. Click "Run workflow"

This will run the snapshot check job without modifying any files.

## Related Documentation

- **Implementation Plan**: `IMPLEMENTATION_PLAN.md` (Task #10)
- **Manifest README**: `packages/manifest/README.md`
- **Usage Guide**: `packages/manifest/USAGE.md`
- **Integration Guide**: `packages/manifest/INTEGRATION.md`
- **Test Notes**: `apps/api/__tests__/kitchen/MANIFEST_TESTING_NOTES.md`
- **Constraint Summary**: `apps/api/__tests__/kitchen/CONSTRAINT_SEVERITY_TEST_SUMMARY.md`

## Status

**Current Status**: Operational (2026-02-09)

**Test Coverage**: 172/172 tests passing

**Manifests Validated**: 6 domains (PrepTask, Recipe, Menu, PrepList, Inventory, Station)

**Generated Routes**: 42 command handlers + 7 base query endpoints

## Maintenance

To update this workflow:

1. Edit `.github/workflows/manifest-ci.yml`
2. Test changes in a feature branch
3. Update this documentation if adding new jobs or steps
4. Notify team of workflow changes

For questions or issues, refer to `IMPLEMENTATION_PLAN.md` Task #10 or contact the maintainers.
