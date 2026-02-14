# Constraint Severity Test Summary

## Test File
`apps/api/__tests__/kitchen/manifest-constraint-severity.test.ts`

## What the Test Proves

This test proves the runtime-engine.ts severity fix is working correctly for entity-level constraints:

### 1. Warn constraints do NOT block operations
**Test:** `should allow creation when warn constraint fails (warnOverdue)`
- Creates a PrepTask with overdue date (triggers `warnOverdue:warn`)
- `checkConstraints` returns a failed outcome with `severity: "warn"`
- `createInstance` **succeeds** and returns a valid instance
- **Before the fix:** Would have returned `undefined` (blocked)
- **After the fix:** Returns instance (not blocked)

### 2. Block constraints still block operations
**Test:** `should block creation when block constraint fails (validStatus)`
- Creates a PrepTask with invalid status (triggers `validStatus:block`)
- `checkConstraints` returns a failed outcome with `severity: "block"`
- `createInstance` **fails** and returns `undefined`
- **Behavior consistent before and after fix** (block constraints always block)

### 3. Warn constraints don't block updates
**Test:** `should allow entity update when warn constraint fails`
- Updates PrepTask to trigger warn-severity constraint
- `updateInstance` **succeeds** despite warn constraint
- **Before the fix:** Would have returned `undefined` (blocked)
- **After the fix:** Returns updated instance (not blocked)

## Test Output

```
✓ should allow creation when warn constraint fails (warnOverdue)
  [Manifest Runtime] Non-blocking constraint outcomes: warnOverdue

✓ should block creation when block constraint fails (validStatus)
  [Manifest Runtime] Blocking constraint validation failed: validStatus

✓ should allow entity update when warn constraint fails
  [Manifest Runtime] Non-blocking constraint outcomes: warnOverdue

Test Files  1 passed (1)
Tests       3 passed (3)
```

## How to Run

```bash
pnpm --filter api test manifest-constraint-severity
```

## What Changed in runtime-engine.ts

The fix filters constraint outcomes by severity before blocking:

```typescript
// Only block on severity='block' constraints that failed
const blockingFailures = constraintOutcomes.filter(
  o => !o.passed && o.severity === 'block'
);

if (blockingFailures.length > 0) {
  return undefined;
}

// Log non-blocking outcomes (warn/ok) for diagnostics
const nonBlockingOutcomes = constraintOutcomes.filter(
  o => !o.passed && o.severity !== 'block'
);
```

This applies to both `createInstance` and `updateInstance` operations.
