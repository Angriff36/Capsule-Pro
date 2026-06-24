# Migration: Repair Drift - Index Fix (20260203220243)

## Overview

**Migration ID:** `20260203220243_repair_drift`
**Date:** 2026-02-03
**Purpose:** Fix event_reports index definition

## Summary

Minor drift repair to correctly define the `event_reports_event_id_idx` index with proper composite key structure.

### Changes

| Operation | Target | Description |
|-----------|--------|-------------|
| DROP INDEX | `event_reports_event_id_idx` | Remove incorrectly defined index |
| CREATE INDEX | `event_reports_event_id_idx` | Recreate with correct composite structure |

## Changes

### Index Correction

**Problem**: Index was defined without `tenant_id` prefix, breaking composite FK lookup pattern

**Fix**:
```sql
DROP INDEX IF EXISTS "tenant_events"."event_reports_event_id_idx";

CREATE INDEX IF NOT EXISTS "event_reports_event_id_idx"
ON "tenant_events"."event_reports"("tenant_id", "event_id");
```

**Why this matters**:
- All tenant-scoped indexes should include `tenant_id` first
- Enables efficient lookups filtering by tenant first
- Matches composite FK pattern: `(tenant_id, event_id)`
- Improves query performance for tenant-isolated queries

## Impact

### Performance

- **Before**: Index on `event_id` only → poor tenant filtering
- **After**: Index on `(tenant_id, event_id)` → fast tenant-scoped lookups
- **Query benefit**: Queries like `WHERE tenant_id = X AND event_id = Y` use index efficiently

### Data

- **No data changes**: Index-only migration
- **No downtime**: Index operations are concurrent-safe
- **No application changes**: Transparent optimization

## Related Migrations

- **Previous**: `20260203214030_repair_drift` (created original index)
- **Next**: `20260205000000_admin_tasks`

---

Last updated: 2026-02-03
