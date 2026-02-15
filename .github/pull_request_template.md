## Description

Please provide a brief description of the changes introduced in this pull request.

## Related Issues

Closes #<issue_number>

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have performed a self-review of my code.
- [ ] I have commented my code, particularly in hard-to-understand areas.
- [ ] I have updated the documentation, if necessary.
- [ ] I have added tests that prove my fix is effective or my feature works.
- [ ] New and existing tests pass locally with my changes.

## Manifest Changes (if applicable)

If this PR modifies manifest files in `packages/manifest-adapters/manifests/`:

### Manifest Validation Required

Before submitting, ensure you have:

1. **Validated manifest syntax** - All manifest files must compile without errors
   ```bash
   # Compile all manifests
   pnpm manifest:compile
   ```

2. **Run integration tests** - Verify generated code works correctly
   ```bash
   cd apps/api
   pnpm test __tests__/kitchen/ -- --run
   ```

3. **Regenerate code** - If you modified manifests, regenerate API routes
   ```bash
   # Run code generation
   pnpm run analyze

   # Commit the generated files
   git add apps/api/app/api/kitchen/
   git commit -m "feat: regenerate manifest-generated routes"
   ```

5. **Update snapshots** - If code generation changed, update snapshots
   ```bash
   cd apps/api
   pnpm test __tests__/kitchen/manifest-projection-snapshot.test.ts -u
   git add __tests__/kitchen/__snapshots__/
   git commit -m "test: update manifest snapshots"
   ```

### CI Checks

This PR will trigger the following CI checks:
- **Manifest Validation** - Validates all manifest files compile without errors
- **Code Generation Check** - Verifies generated code is up-to-date
- **TypeScript Check** - Ensures generated code compiles without errors
- **Integration Tests** - Runs all manifest integration tests (172 tests)
- **Snapshot Check** (manual) - Optional snapshot validation when manually triggered

### Common Issues

**"Generated code is out of date"**
- Run `pnpm run analyze` locally
- Commit the generated files

**"Snapshot tests are out of date"**
- Run `cd apps/api && pnpm test __tests__/kitchen/manifest-projection-snapshot.test.ts -u`
- Commit the updated snapshots

**"Manifest compilation failed"**
- Check manifest syntax errors
- Review error messages for line/column information
- Run `pnpm manifest:compile` locally to test compilation

**"TypeScript compilation errors"**
- Ensure generated routes have proper types
- Check that runtime factories are exported correctly
- Verify import paths match your app structure

### Resources

- **Manifest Docs**: `packages/manifest/README.md`
- **Usage Guide**: `packages/manifest/USAGE.md`
- **Integration Guide**: `packages/manifest/INTEGRATION.md`
- **Test Notes**: `apps/api/__tests__/kitchen/MANIFEST_TESTING_NOTES.md`
- **Implementation Plan**: `IMPLEMENTATION_PLAN.md` (Task #10)

## Screenshots (if applicable)

<!-- Add screenshots to help explain your changes, especially if this is a UI-related PR. -->

## Additional Notes

<!-- Add any additional information or context about the pull request here. -->
