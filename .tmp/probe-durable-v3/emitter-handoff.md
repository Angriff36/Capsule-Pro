# Manifest Package Emitter Handoff — feat/prisma-projection

**Target branch:** `feat/prisma-projection` in `@angriff36/manifest`
**Scope:** PrismaProjection emitter fixes ONLY. No Capsule-Pro source changes.

---

## Bug 1: `[object Object]` in Generated Schema (HIGH)

JS objects are string-coerced instead of resolving to field names in two code paths.

**Reproduction:**
```typescript
import { PrismaProjection } from '@angriff36/manifest/projections/prisma';
const projection = new PrismaProjection();
const result = projection.generate(ir, { surface: 'prisma.schema', options: config });
// artifacts[0].code contains literal "[object Object]" where field names should be
```

**Affected models** (from Capsule-Pro validation, schema-post.prisma):
```prisma
// Line 74-75 — PurchaseRequisitionItem
  [object Object] String
  requisition PurchaseRequisition @relation(fields: [[object Object]], references: [tenantId, id], onDelete: Cascade)

// Line 135-136 — PurchaseRequisitionItem or InventoryTransaction
  [object Object] String
  purchaseOrder PurchaseOrder @relation(fields: [[object Object]], references: [id], onDelete: Cascade)
```

**Expected:**
```prisma
  requisitionId String
  requisition PurchaseRequisition @relation(fields: [requisitionId], references: [tenantId, id], onDelete: Cascade)
```

**Root cause hypothesis:** In `generator.ts`, `emitField()` or `emitRelation()` calls `String(value)` or template-literal interpolation on a config object (columnMappings / foreignKeys entry) instead of resolving the field name property.

**Count:** 4 validation errors (2 field-name lines + 2 relation fields lines, across 2 model blocks)

**Fix locations to check:**
- `projections/prisma/generator.ts` — `emitField()`, `emitRelation()`, `resolveFieldName()`
- `projections/prisma/options.ts` — `normalizeOptions()` — how foreignKeys are resolved

---

## Bug 2: `Char(N)` Type Mapping (MEDIUM)

The emitter emits `Char(2)?` as the Prisma type, which is invalid. It should emit `String?` with `@db.Char(2)`.

**Current output:**
```prisma
countryCode Char(2)? @default("") @map("country_code") @db.Char(2)
```

**Expected output:**
```prisma
countryCode String? @default("") @map("country_code") @db.Char(2)
```

**Fix location:** `projections/prisma/type-mapping.ts` — `resolvePrismaScalar()` — `Char(N)` should map to `String` + `@db.Char(N)` attribute.

**Count:** 2 occurrences (countryCode fields on vendor/client entities)

**Note:** This bug was masked before because the pre-patch schema had 22 total errors. After semantic normalization, it resolves to 0 Char errors because those entities are now in the durable store set. Verify with projection-config `typeMappings` that include `Char` entries.

---

## Bug 3: Duplicate `@default` Suppression (MEDIUM)

When `fieldAttributes` config provides a `@default(...)` AND the Manifest field has a default value (`= 0`, `= now()`, etc.), both get emitted, producing invalid Prisma with duplicate `@default` on the same field.

**Expected behavior:** `fieldAttributes` config `@default` should suppress the Manifest-field-derived `@default`. Config wins over semantic default.

**Count:** ~80 potential occurrences across emitted models

**Fix location:** `projections/prisma/generator.ts` — where `@default` is appended. Check if `fieldAttributes` already contains `@default` before emitting.

---

## Required Tests

Add to the Manifest package test suite:

```
projections/prisma/
  object-serialization.test.ts   — relation fields render names, not [object Object]
  char-mapping.test.ts           — Char(N) maps to String + @db.Char(N)
  duplicate-default.test.ts      — @default appears at most once per field
  schema-validation.test.ts      — prisma validate passes on generated schema
```

**Test IR fixtures** (minimal, per-bug):
1. Entity with composite foreign key via columnMappings/foreignKeys
2. Entity with `Char` type in typeMappings
3. Entity with `= 0` default AND `@default` in fieldAttributes

## Verification

After fixes, regenerate Capsule-Pro schema and confirm:
- `grep -c '[object Object]' schema.prisma` → 0
- `grep -c 'Char(' schema.prisma | grep -v '@db.Char'` → 0
- `grep -c '@default.*@default' schema.prisma` → 0
- `npx prisma validate --schema=schema.prisma` → 0 errors
