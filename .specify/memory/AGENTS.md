# Implementation Patterns for Ralph Agents

This file contains discoverable patterns that Ralph agents should follow when implementing features. When adding new patterns, make them explicit and include examples.

---

## Database Schema Changes Pattern

**Critical**: When modifying Prisma schema, you MUST apply migrations before committing.

### The Pattern

```bash
# After editing packages/database/prisma/schema.prisma:

# 1. Check for drift (see if DB needs migration)
pnpm db:check

# 2. If drift detected, generate migration
pnpm db:repair

# 3. Apply migration to development database
pnpm migrate

# 4. Commit both schema change AND migration files
```

### Why This Matters

- `pnpm dev` will fail with database drift error
- Schema changes without migrations break other developers
- Production deployments require migration files
- `db:check` runs automatically in predev hook - it's your backpressure

### Schema Change Checklist

When editing `packages/database/prisma/schema.prisma`:

- [ ] Model added/modified in schema.prisma
- [ ] Run `pnpm db:repair` to generate migration
- [ ] Review generated migration in `packages/database/prisma/migrations/`
- [ ] Run `pnpm migrate` to apply to local DB
- [ ] Commit both schema.prisma AND migration files together

### Common Mistakes

❌ **WRONG**: Edit schema, commit, forget migration
→ Next `pnpm dev` fails with drift error

❌ **WRONG**: Run `prisma migrate reset` instead of generating migration
→ Loses all production data, can't deploy

✅ **CORRECT**: Edit schema → `pnpm db:repair` → commit migration
→ Clean deployment path

---

## Manifest Runtime Integration Pattern

**Critical**: When integrating Manifest runtime into API routes or server actions, you MUST handle constraint outcomes. Simply calling the runtime is not enough.

### The Pattern

```typescript
// ❌ WRONG - Ignores constraint outcomes
const runtime = await createRecipeRuntime(context);
await runtime.createInstance("Recipe", { ... });
// Proceeds to Prisma sync regardless of constraints!

// ✅ CORRECT - Checks and handles constraints
const runtime = await createRecipeRuntime(context);

// 1. Call runtime and capture return value
const result = await runtime.createInstance("Recipe", { ... });

// 2. Check for constraint failure (undefined return)
if (result === undefined) {
  // 3. Get constraint details
  const failures = await runtime.checkConstraints("Recipe", data);

  // 4. Return error response using api-response utilities
  return apiError("BLOCKING_CONSTRAINT", {
    constraints: failures.map(f => ({
      code: f.code,
      message: f.message,
      severity: f.severity,
    })),
  });
}

// 5. Only sync to Prisma if constraints pass
await database.recipe.create({ ... });
```

### Why This Matters

- `runtime.createInstance()` returns `undefined` when constraints fail
- `runtime.executeCommand()` returns command result with constraint outcomes
- BLOCK constraints should reject requests (4xx status)
- WARN constraints should allow requests but include warnings (2xx with warning payload)
- Tests exist that verify this behavior - they will fail if you ignore constraints

### Discoverable Utilities

Use the standardized response utilities in `packages/kitchen-ops/src/api-response.ts`:

- `apiSuccess(data)` - Success response
- `apiError(code, details)` - Error response with constraint details
- `formatCommandResult(result)` - Format Manifest command results
- `createNextResponse(result)` - Convert to Next.js Response

### Test Backpressure

The following test WILL FAIL if you ignore constraints:

```bash
# This test verifies BLOCK constraints actually block
apps/api/__tests__/kitchen/manifest-constraints.test.ts
```

Run tests after implementing Manifest integration:

```bash
pnpm test apps/api/__tests__/kitchen/manifest-constraints.test.ts
```

---

## Testing Requirements

When adding new features, ensure tests exist that verify:

1. **Constraint enforcement** - BLOCK constraints reject invalid data
2. **Success paths** - Valid requests succeed
3. **Error responses** - Include constraint details in response body

Tests serve as backpressure - they fail when implementation is incorrect, guiding Ralph to fix issues.

---

## Discovery Protocol

When implementing a feature:

1. Search for existing patterns in the codebase
2. Check `packages/kitchen-ops/src/api-response.ts` for response utilities
3. Run relevant tests to verify your implementation
4. If a pattern doesn't exist, document it here for future agents
