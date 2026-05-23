# Scripts Directory

This directory contains utility scripts for Capsule-Pro development.

## validate-manifests.mjs

Manifest validation script that runs locally before pushing changes.

### Usage

```bash
pnpm manifest:validate
```

Or directly:

```bash
node scripts/validate-manifests.mjs
```

### What It Checks

1. **Manifest Directory** - Verifies manifest files exist
2. **Manifest Compilation** - Validates all `.manifest` files compile without errors
3. **Conformance Tests** - Runs manifest language conformance tests (41 fixtures)
4. **Integration Tests** - Runs kitchen domain integration tests (172 tests)
5. **Generated Code** - Checks if generated code is up-to-date
6. **TypeScript** - Validates TypeScript compilation across all packages

### Exit Codes

- `0` - All checks passed
- `1` - One or more checks failed

### Output

The script provides colored output showing:
- Blue headers for each step
- Green checkmarks for passing checks
- Red X marks for failing checks
- Yellow warnings for issues that need attention

### Example Output

```
Manifest Validation
======================

Step 1: Check manifest directory
  ✓ Found 6 manifest file(s)
    - prep-task-rules.manifest
    - recipe-rules.manifest
    ...

Step 2: Validate manifest compilation
  Checking prep-task-rules.manifest...
  ✓ prep-task-rules.manifest compiled successfully
  ...

Step 3: Run conformance tests
  Running manifest package tests...
  ✓ Conformance tests passed

Step 4: Run integration tests
  Running kitchen integration tests...
  ✓ Integration tests passed

Step 5: Check generated code is up-to-date
  Running pnpm run analyze...
  ✓ Code generation completed
  Checking for uncommitted changes...
  ✓ Generated code is up-to-date

Step 6: TypeScript compilation check
  Running pnpm run check...
  ✓ TypeScript compilation passed

Summary
=======

  ✓ Manifest Directory
  ✓ Manifest Compilation
  ✓ Conformance Tests
  ✓ Integration Tests
  ✓ Generated Code
  ✓ TypeScript Check

All checks passed!
You're ready to push your manifest changes.
```

### Troubleshooting

If checks fail:

1. **Manifest Compilation Failed**
   - Check the error output for line/column information
   - Review manifest syntax against examples in `packages/manifest/src/manifest/conformance/fixtures/`
   - Fix syntax errors in the manifest file

2. **Conformance Tests Failed**
   - Run `cd packages/manifest && pnpm test` to see detailed error messages
   - Check for manifest language specification violations

3. **Integration Tests Failed**
   - Run `cd apps/api && pnpm test __tests__/kitchen/` to see detailed error messages
   - Check runtime behavior and HTTP integration issues

4. **Generated Code Out of Date**
   - Run `pnpm run analyze` to regenerate code
   - Commit the generated files: `git add apps/api/app/api/kitchen/`

5. **TypeScript Compilation Failed**
   - Check for type errors in generated code
   - Verify runtime factories are exported correctly
   - Ensure import paths match your app structure

### Related Documentation

- **CI/CD Pipeline**: `.github/MANIFEST_CI.md`
- **PR Template**: `.github/pull_request_template.md`
- **Implementation Plan**: `IMPLEMENTATION_PLAN.md` (Task #10)
- **Manifest README**: `packages/manifest/README.md`

### CI Integration

This script mirrors the checks in `.github/workflows/manifest-ci.yml`. Running it locally before pushing helps catch issues early and prevents CI failures.
