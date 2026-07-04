# Migration: Add Recipe Version Instructions v2 (20260202000000)

## Overview

**Migration ID:** `20260202000000_add_recipe_version_instructions`
**Date:** 2026-02-02
**Purpose:** Redundant migration - adds same instructions field as previous migration

## Summary

This migration is a **duplicate** of `20260201010000_add_recipe_version_instructions`. It adds the same `instructions` column to `recipe_versions` table.

### Schema Changes

| Table | Changes |
|-------|---------|
| `tenant_kitchen.recipe_versions` | Added `instructions` column (duplicate) |

## Changes

### SQL

```sql
ALTER TABLE "tenant_kitchen"."recipe_versions"
  ADD COLUMN IF NOT EXISTS "instructions" TEXT;
```

## Notes

**Why this migration exists:**

This migration was likely generated due to:
1. Schema file changes made without applying previous migration first
2. Prisma detecting missing column in local database
3. Auto-generation creating duplicate migration

**Safety:**

- Uses `IF NOT EXISTS` so it's safe to run even if column exists
- No data loss or conflicts
- Column already created by previous migration `20260201010000`

## Impact

### Runtime

- **No effect**: Column already exists from migration 0015
- **Idempotent**: SQL uses `IF NOT EXISTS`
- **Safe to keep**: Does not break anything

## Related Migrations

- **Previous**: `20260201010000_add_recipe_version_instructions` (original)
- **Next**: `20260203000000_recipe_version_base_fields`

---

Last updated: 2026-02-02
