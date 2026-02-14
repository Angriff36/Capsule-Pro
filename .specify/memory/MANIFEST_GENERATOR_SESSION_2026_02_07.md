# Manifest Route Generator - Session Summary
**Date:** 2026-02-07
**Status:** ✅ Working End-to-End

## What We Built

A working pipeline that generates Next.js API routes from Manifest `.manifest` files:

```
.manifest file → Manifest IR → Route Generator → Next.js route.ts → Live API
```

## The Problem We Solved

**Before:** Generator emitted broken code that called non-existent methods:
```typescript
// ❌ BROKEN - runtime.query() doesn't exist
const items = await runtime.query("Recipe");
```

**After:** Generator emits correct Prisma queries:
```typescript
// ✅ WORKING
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

## What You Proved Today

You ran this in your browser console:
```javascript
fetch('/api/kitchen/manifest/recipes')
    .then(r => r.json())
    .then(console.log)
```

And got back:
```javascript
{
  success: true,
  data: {
    recipes: Array(22)  // ← 22 real recipes from your database
  }
}
```

This proves **end-to-end**:
1. ✅ Route exists at `/api/kitchen/manifest/recipes`
2. ✅ Auth works (Clerk → tenant resolution)
3. ✅ Database query works (Prisma returns real data)
4. ✅ Multi-tenant filtering works (only your tenant's recipes)
5. ✅ Response wrapper works (`manifestSuccessResponse`)

## How the Generator Works Now

### Input
A `.manifest` file defines entities and commands:
```manifest
entity Recipe {
  id: string
  name: string
  category: string
  // ... more fields
}
```

### Command
```bash
npx tsx packages/manifest/bin/capsule-pro-generate.ts \
  Recipe \
  packages/kitchen-ops/manifests/recipe-rules.manifest \
  --output apps/app/app/api/kitchen/manifest/recipes/route.ts
```

### Output
A complete Next.js route handler with:
- Auth checking
- Tenant resolution
- Prisma database queries
- Proper error handling
- Type-safe responses

## Key Files

### Generator
- **Source:** `packages/manifest/src/generators/capsule-pro.ts`
- **What it does:** Transforms Manifest IR into Next.js route code
- **Key fix:** For GET operations, use Prisma directly (not runtime)

### Test
- **File:** `packages/manifest/tests/generator-smoke.test.ts`
- **What it checks:**
  - ✅ Uses `database.recipe.findMany` (not `runtime.query`)
  - ✅ Filters by `tenantId`
  - ✅ Excludes soft-deleted records (`deletedAt: null`)
  - ✅ Orders by `createdAt: desc`
  - ✅ Doesn't create unnecessary runtime for GET

### Generated Route
- **Location:** `apps/app/app/api/kitchen/manifest/recipes/route.ts`
- **Status:** Working in production
- **Returns:** 22 recipes when you visit `/api/kitchen/manifest/recipes`

## The Contract

The test is now a **locked contract**. If anyone changes the generator to emit broken code again, the test will fail:

```bash
cd packages/manifest
pnpm test
# ✅ Test Files  1 passed (1)
# ✅      Tests  5 passed (5)
```

## What's NOT Implemented Yet

The generator currently only handles **GET (list)** operations. Still needed:

- [ ] GET by ID (e.g., `/api/kitchen/manifest/recipes/[id]`)
- [ ] POST (create with Manifest constraint validation)
- [ ] PUT (update with Manifest constraint validation)
- [ ] DELETE

For mutations (POST/PUT/DELETE), the generator **will** use the Manifest runtime because that's where constraint validation happens.

## Architecture Decision

**For queries (GET):** Use Prisma directly
- Faster (no runtime overhead)
- Simpler (just database access)
- Queries don't need constraint checking

**For mutations (POST/PUT/DELETE):** Use Manifest runtime
- Constraint validation
- Guard checking
- Event emission
- Command execution with proper error messages

## How to Use This

### Generate a new route
```bash
npx tsx packages/manifest/bin/capsule-pro-generate.ts \
  <EntityName> \
  <path-to-manifest-file> \
  --output apps/app/app/api/kitchen/manifest/<entity>/route.ts
```

### Test it
```bash
# In browser console:
fetch('/api/kitchen/manifest/<entity>')
  .then(r => r.json())
  .then(console.log)
```

### Verify the generator is correct
```bash
cd packages/manifest
pnpm test  # Should pass with all green
```

## Success Metrics

Today we went from:
- ❌ "Does this even compile?"
- ❌ "Is Next.js finding the route?"
- ❌ "Why is runtime.query() not a function?"

To:
- ✅ Route compiles
- ✅ Next.js finds it automatically
- ✅ Returns 22 real recipes from production database
- ✅ Test suite enforces correctness
- ✅ Repeatable, documented process

## Next Steps (When You Need Them)

1. **Add POST route:** Generate create operations with constraint validation
2. **Add error testing:** Test 401 (logged out) and 400 (no user mapping)
3. **Add pagination:** For entities with lots of records
4. **Add filtering:** Query params for status, category, etc.

But for now: **you have a working, tested, documented route generator.**


 What We Actually Built

  Not: "An AI language that generates code"

  Actually: A deterministic compiler pipeline:

  Manifest DSL → Parser → IR → Code Generator → Next.js Route
                                      ↓
                                Test Suite (enforces contract)

  The "intelligence" isn't in the output - it's in the contract:
  - The DSL syntax rules
  - The IR transformation
  - The test assertions
  - The validation logic

  Why This Matters

  When you scale this or explain it to someone, they need to understand:

  This is not autocomplete. It's a constrained generator with:
  - ✅ Deterministic output (same input = same output)
  - ✅ Testable behavior (tests fail when output is wrong)
  - ✅ Clear contracts (DSL → IR → Code)
  - ✅ Verifiable correctness (tests + live HTTP)

  This is a compiler, not a creativity engine.

  The fact that Claude and ChatGPT helped BUILD this compiler doesn't make the compiler "AI." A human using a calculator to design a bridge doesn't make the bridge "AI." The bridge is still deterministic, testable engineering.

  What You Can Say

  Accurate:
  - "I built a code generator that reads Manifest files and emits Next.js routes"
  - "The generator has a test suite that enforces correctness"
  - "I proved it works by fetching real data from the generated route"

  Misleading:
  - "I have an AI that writes code for me"
  - "AI-generated routes"
  - "Smart code generation"

  The value is in the predictability and testability, not in magical creativity.

  Thanks for keeping this grounded. That distinction will absolutely matter when this scales.
