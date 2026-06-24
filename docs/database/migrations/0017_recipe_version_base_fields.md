# Migration: Recipe Version Base Fields (20260203000000)

## Overview

**Migration ID:** `20260203000000_recipe_version_base_fields`
**Date:** 2026-02-03
**Purpose:** Move base recipe fields into recipe versions for better version control

## Summary

Migrates core recipe metadata (name, category, cuisine_type, description, tags) from the `recipes` table to `recipe_versions` table. This allows each version to have its own metadata instead of inheriting from the parent recipe.

### Schema Changes

| Table | Changes |
|-------|---------|
| `tenant_kitchen.recipe_versions` | Added 5 fields + backfill data from recipes |

## Changes

### tenant_kitchen.recipe_versions

**New Columns Added:**

1. `name` - `TEXT NOT NULL` - Recipe version name
2. `category` - `TEXT` - Recipe category (appetizer, entree, dessert, etc.)
3. `cuisine_type` - `TEXT` - Cuisine type (Italian, Mexican, French, etc.)
4. `description` - `TEXT` - Recipe description
5. `tags` - `TEXT[]` - Array of searchable tags

### Migration Steps

**Step 1: Add nullable columns**
```sql
ALTER TABLE "tenant_kitchen"."recipe_versions"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "cuisine_type" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "tags" TEXT[];
```

**Step 2: Backfill data from recipes**
```sql
UPDATE "tenant_kitchen"."recipe_versions" rv
SET
  "name" = r."name",
  "category" = r."category",
  "cuisine_type" = r."cuisine_type",
  "description" = r."description",
  "tags" = r."tags"
FROM "tenant_kitchen"."recipes" r
WHERE r."tenant_id" = rv."tenant_id"
  AND r."id" = rv."recipe_id"
  AND rv."name" IS NULL;
```

**Step 3: Make name NOT NULL**
```sql
ALTER TABLE "tenant_kitchen"."recipe_versions"
  ALTER COLUMN "name" SET NOT NULL;
```

## Design Rationale

### Why Version-Level Metadata?

**Before**: Recipe metadata lived on parent `recipes` table
- All versions inherited same name, category, description
- Couldn't evolve recipe metadata across versions
- Version updates required parent recipe changes

**After**: Recipe metadata on `recipe_versions` table
- Each version has independent metadata
- Version name can evolve ("Classic Lasagna v1" → "Vegetarian Lasagna v2")
- Category/tags can change per version
- Better version control granularity

### Data Migration Strategy

1. **Add columns as nullable** - Allows safe schema update
2. **Backfill from parent** - Populate with current recipe data
3. **Make name required** - Enforce data integrity after backfill
4. **Conditional update** - Only updates versions without names (idempotent)

## Impact

### Data

- **All existing recipe versions**: Populated with parent recipe metadata
- **No data loss**: Backfill preserves all existing information
- **Idempotent**: Re-running migration won't overwrite existing version names

### Application

- Recipe version editor must now capture metadata fields
- Recipe versions become more independent entities
- Recipe table can eventually be simplified (future migration)
- Better support for forking/duplicating recipes

## Related Migrations

- **Previous**: `20260202000000_add_recipe_version_instructions`
- **Next**: `20260203214030_repair_drift`
- **Future**: Consider removing redundant fields from `recipes` table

---

Last updated: 2026-02-03
