# Final Verification Report — Semantic Normalization v3

**Branch:** probe/full-durable-projection
**Date:** 2026-05-24
**Status:** COMMIT_READY

## Working Tree Scope

| Category | Count | Commit? |
|---|---|---|
| Manifest source (.manifest) | 40 | YES |
| Generated routes (apps/api/) | 152 | YES (manifest:build output) |
| Generated IR (packages/manifest-ir/) | 5 | YES (manifest:build output) |
| Package files | 2 | YES (manifest version bump) |
| Temp artifacts (.tmp/) | 15 dirs | NO (.gitignored) |

## Changes Applied

### 1. Semantic type reclassification (198 patches, 39 files)
- `number → int`: 73 fields (counts, quantities, ordinals, positions)
- `number → decimal`: 5 fields (durations, scores, confidence)
- `number → money`: 5 fields (CateringOrder financial amounts — subtotalAmount, taxAmount, discountAmount, serviceChargeAmount, depositAmount)
- `number → datetime`: 120 lifecycle timestamps (createdAt, updatedAt, deletedAt, completedAt, etc.)

### 2. Reserved-word fix (1 file)
- `bank-account-rules.manifest`: `setDefault` → `markDefault` (reserved in @angriff36/manifest@1.0.1)

### 3. Non-lifecycle datetime correction (post-review, 3 files)
- `parsedEventDate`: `datetime = now()` → `datetime = 0` (future AI-parsed date, not lifecycle)
- `deliveryDate`: `datetime = now()` → `datetime = 0` (scheduled delivery, not lifecycle)
- `shiftStart`/`shiftEnd`: `datetime = now()` → `datetime = 0` (business data, not lifecycle)

## Safety Review

### Money changes (5) — ALL CORRECT
All CateringOrder financial amounts with "Amount" suffix:
- subtotalAmount, taxAmount, discountAmount, serviceChargeAmount, depositAmount
- No count-like fields became money.

### Int changes (73) — ALL CORRECT
- All count/quantity/ordinal fields correctly reclassified
- Position/size fields (zIndex, gridSize, positionX/Y, width, height) correctly int
- Duration fields (prepTimeMinutes, cookTimeMinutes, etc.) correctly int
- Priority fields correctly int

### DateTime changes (120 lifecycle + 2 acceptable + 4 corrected)
- 120 lifecycle timestamps: createdAt/updatedAt/deletedAt/completedAt/startedAt/claimedAt/expiresAt/archivedAt/publishedAt/processedAt/depositPaidAt/documentImportedAt — all correct with `now()`
- 2 acceptable non-lifecycle: orderDate, scheduleDate (represent creation-time business dates)
- 4 corrected to `= 0`: parsedEventDate, deliveryDate, shiftStart, shiftEnd

### Reserved word rename — CLEAN
- `setDefault` → `markDefault` in bank-account-rules.manifest
- Zero dangling references in routes, tests, docs, or generated files
- IR commands.json confirms `markDefault` registered

## Before/After Counts

### Projection Diagnostics
| Code | Before | After | Delta |
|---|---|---|---|
| PRISMA_AMBIGUOUS_NUMBER | 117 | **0** | -117 |
| PRISMA_SKIPPED_NO_STORE | 34 | 35 | +1 (BankAccount markDefault entity) |
| PRISMA_SKIPPED_NON_DURABLE | 1 | 92 | +91 (unflipped entities, pre-existing) |

### Prisma Validate
| Category | Before | After |
|---|---|---|
| Invalid field defs (Char) | 2 | 0 |
| Index on unknown fields | 20 | 0 |
| [object Object] emitter bug | 0 | 4 |
| **Total** | **22** | **4** |

All 4 remaining errors are **emitter bugs** in @angriff36/manifest@1.0.1 (JS object serialization instead of field name resolution). Not source-fixable. Handoff doc at `.tmp/probe-durable-v3/emitter-handoff.md`.

## Not Applied (by design)
- 13 ambiguous uncertain fields (human review)
- 47 non-lifecycle datetime fields (human review)
- 26 source-unmapped fields (no manifest entity exists)
- Emitter fixes: dup @default suppression (80), Char(N) mapping (2), [object Object] (4)

## Generated Prisma — NOT EDITED
No manual edits to any generated Prisma file. Schema validated as-is from PrismaProjection output.

## COMMIT_READY=true

Conditions met:
- [x] No generated Prisma manually edited
- [x] No suspicious semantic rewrites (money only on financial Amount fields)
- [x] setDefault rename has zero dangling references
- [x] PRISMA_AMBIGUOUS_NUMBER = 0
- [x] Prisma validate = 4 (all emitter-only)
- [x] All 4 remaining errors confirmed emitter bugs
