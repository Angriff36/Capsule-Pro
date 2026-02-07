# Tasks: Fix Linting Errors

## Overview
Fix all 1016 pre-commit linting errors from Ultracite/Biome to enable commits.

## Task List

- [ ] 1.1 Fix regex literals not at top level (useTopLevelRegex)
  - **Do**: Move all regex literals from inside functions to module-level constants
  - **Files**:
    - `apps/api/app/api/events/documents/parse/route.ts`
    - `apps/api/app/api/inventory/stock-levels/validation.ts`
    - `apps/api/app/api/kitchen/prep-lists/[id]/route.ts`
    - `apps/api/app/api/kitchen/prep-lists/items/[id]/route.ts`
    - `e2e/playwright-verify-suggestions.spec.ts`
  - **Done when**: All regex literals are defined as top-level constants
  - **Verify**: `pnpm dlx ultracite check | grep useTopLevelRegex`
  - **Commit**: "fix: move regex literals to top level for performance"

- [ ] 1.2 Fix `any` type usages (noExplicitAny)
  - **Do**: Replace all `as any` with proper types in guest route
  - **Files**: `apps/api/app/api/events/guests/[guestId]/route.ts`
  - **Done when**: No `any` types remain in the file
  - **Verify**: `pnpm dlx ultracite check apps/api/app/api/events/guests/[guestId]/route.ts | grep noExplicitAny`
  - **Commit**: "fix: replace `any` types with proper typed responses"

- [ ] 1.3 Fix nested ternary expression (noNestedTernary)
  - **Do**: Convert nested ternary to if-else statement in stock-levels route
  - **Files**: `apps/api/app/api/inventory/stock-levels/route.ts`
  - **Done when**: Nested ternary is replaced with clear if-else logic
  - **Verify**: `pnpm dlx ultracite check apps/api/app/api/inventory/stock-levels/route.ts | grep noNestedTernary`
  - **Commit**: "fix: replace nested ternary with if-else statement"

- [ ] 1.4 Fix collapsible if statement (useCollapsedIf)
  - **Do**: Combine nested if statements in transactions route
  - **Files**: `apps/api/app/api/inventory/stock-levels/transactions/route.ts`
  - **Done when**: If statements are collapsed into single condition
  - **Verify**: `pnpm dlx ultracite check apps/api/app/api/inventory/stock-levels/transactions/route.ts | grep useCollapsedIf`
  - **Commit**: "fix: collapse nested if statements"

- [ ] 1.5 Refactor buildUpdateData function (complexity 33 -> 20)
  - **Do**: Extract validation logic into separate helper functions
  - **Files**: `apps/api/app/api/events/guests/[guestId]/route.ts`
  - **Done when**: Cognitive complexity <= 20
  - **Verify**: `pnpm dlx ultracite check apps/api/app/api/events/guests/[guestId]/route.ts | grep noExcessiveCognitiveComplexity`
  - **Commit**: "refactor: reduce buildUpdateData cognitive complexity"

- [ ] 1.6 Refactor buildSessionUpdateData function (complexity 21 -> 20)
  - **Do**: Extract conditional logic into smaller helper functions
  - **Files**: `apps/api/app/api/inventory/cycle-count/sessions/[sessionId]/route.ts`
  - **Done when**: Cognitive complexity <= 20
  - **Verify**: `pnpm dlx ultracite check apps/api/app/api/inventory/cycle-count/sessions/[sessionId]/route.ts | grep noExcessiveCognitiveComplexity`
  - **Commit**: "refactor: reduce buildSessionUpdateData cognitive complexity"

- [ ] 1.7 Refactor validateCompleteReceivingRequest function (complexity 21 -> 20)
  - **Do**: Extract validation checks into separate validators
  - **Files**: `apps/api/app/api/inventory/purchase-orders/validation.ts`
  - **Done when**: Cognitive complexity <= 20
  - **Verify**: `pnpm dlx ultracite check apps/api/app/api/inventory/purchase-orders/validation.ts | grep noExcessiveCognitiveComplexity`
  - **Commit**: "refactor: reduce validateCompleteReceivingRequest cognitive complexity"

- [ ] 1.8 Refactor GET function in stock-levels route (complexity 39 -> 20)
  - **Do**: Extract filter building and query logic into helper functions
  - **Files**: `apps/api/app/api/inventory/stock-levels/route.ts`
  - **Done when**: Cognitive complexity <= 20
  - **Verify**: `pnpm dlx ultracite check apps/api/app/api/inventory/stock-levels/route.ts | grep noExcessiveCognitiveComplexity`
  - **Commit**: "refactor: reduce GET stock-levels cognitive complexity"

- [ ] 1.9 Refactor POST function in allergen detect-conflicts route (complexity 40 -> 20)
  - **Do**: Extract conflict detection logic into separate service
  - **Files**: `apps/api/app/api/kitchen/allergens/detect-conflicts/route.ts`
  - **Done when**: Cognitive complexity <= 20
  - **Verify**: `pnpm dlx ultracite check apps/api/app/api/kitchen/allergens/detect-conflicts/route.ts | grep noExcessiveCognitiveComplexity`
  - **Commit**: "refactor: reduce allergen conflict detection cognitive complexity"

- [ ] 1.10 Run full validation check
  - **Do**: Run all validation commands to ensure all fixes are complete
  - **Verify**: `pnpm dlx ultracite check` returns with no errors
  - **Commit**: "chore: complete all linting fixes"

## Notes
- Total errors: 1016 (many may be duplicates or cascading fixes)
- Main categories: regex placement, `any` types, nested ternary, complexity
- Complexity issues require extracting helper functions or services

## Implementation Patterns
See `.specify/memory/AGENTS.md` for discoverable patterns to follow when implementing features.

## Backpressure
After implementing changes, verify with:

```bash
# 1. Check for database drift (fails if schema changed without migration)
pnpm db:check

# 2. Run tests for constraint enforcement
pnpm test apps/api/__tests__/kitchen/manifest-constraints.test.ts

# 3. Full lint check
pnpm dlx ultracite check

# 4. Build check
pnpm build
```

If `db:check` fails, schema changes were made without migrations - run `pnpm db:repair` to generate migration.
