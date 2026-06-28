# Migration: Add Recipe Version Instructions v1 (20260201010000)

## Overview

**Migration ID:** `20260201010000_add_recipe_version_instructions`
**Date:** 2026-02-01
**Purpose:** Add instructions field to recipe versions

## Summary

Adds an `instructions` column to `tenant_kitchen.recipe_versions` table to store cooking/preparation instructions per recipe version.

### Schema Changes

| Table | Changes |
|-------|---------|
| `tenant_kitchen.recipe_versions` | Added `instructions` column |

## Changes

### tenant_kitchen.recipe_versions

**New Column:**
- `instructions` - `TEXT` - Nullable text field for recipe preparation instructions

### SQL

```sql
ALTER TABLE "tenant_kitchen"."recipe_versions"
  ADD COLUMN IF NOT EXISTS "instructions" TEXT;
```

## Design Notes

- Uses `IF NOT EXISTS` for idempotency
- Column is nullable to support recipes without instructions
- Instructions are version-specific (not inherited from recipe)

## Impact

### Data

- **Backward compatible**: Column is nullable
- **No data migration needed**
- **Existing versions**: Will have NULL instructions

### Application

- Recipe version editor can now capture detailed instructions
- Instructions are versioned separately from base recipe
- Each recipe version can have different preparation steps

## Related Migrations

- **Previous**: `20260201000000_event_detail_fields`
- **Next**: `20260202000000_add_recipe_version_instructions` (duplicate/correction)

---

Last updated: 2026-02-01
