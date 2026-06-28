# Migration: Admin Tasks Table (20260205000000)

## Overview

**Migration ID:** `20260205000000_admin_tasks`
**Date:** 2026-02-05
**Purpose:** Create admin tasks table for managing administrative TODOs

## Summary

Adds `tenant_admin.admin_tasks` table to track administrative tasks with assignment, priority, and categorization support.

### Schema Changes

| Table | Operation |
|-------|-----------|
| `tenant_admin.admin_tasks` | Created |

## Table Structure

### tenant_admin.admin_tasks

```sql
CREATE TABLE "tenant_admin"."admin_tasks" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'backlog',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "category" TEXT,
    "due_date" DATE,
    "assigned_to" UUID,
    "created_by" UUID,
    "source_type" TEXT,
    "source_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_tasks_pkey" PRIMARY KEY ("tenant_id","id")
);
```

### Fields

- **title**: Task title (required)
- **description**: Detailed task description
- **status**: Task status (default: 'backlog') - e.g., 'backlog', 'in_progress', 'done'
- **priority**: Task priority (default: 'medium') - e.g., 'low', 'medium', 'high', 'urgent'
- **category**: Optional categorization for grouping tasks
- **due_date**: Optional due date
- **assigned_to**: UUID of assigned employee
- **created_by**: UUID of employee who created the task
- **source_type**: Type of source entity that generated task (e.g., 'event', 'client')
- **source_id**: UUID of source entity
- **Soft delete**: Uses `deleted_at` for soft deletion

### Indexes

```sql
CREATE INDEX "admin_tasks_tenant_idx" ON "tenant_admin"."admin_tasks"("tenant_id");
CREATE INDEX "admin_tasks_status_idx" ON "tenant_admin"."admin_tasks"("tenant_id", "status");
CREATE INDEX "admin_tasks_due_idx" ON "tenant_admin"."admin_tasks"("tenant_id", "due_date");
CREATE INDEX "admin_tasks_active_idx" ON "tenant_admin"."admin_tasks"("tenant_id", "deleted_at")
    WHERE "deleted_at" IS NULL;
```

## ⚠️ RLS Policies Included (NOT IN USE)

This migration includes Row Level Security (RLS) policies and triggers. **IMPORTANT: These are NOT actually used in production.**

**Included but unused:**
- RLS policies for SELECT, INSERT, UPDATE, DELETE
- `auth.jwt()` tenant isolation (Supabase pattern)
- Triggers for `fn_update_timestamp()` and `fn_prevent_tenant_mutation()`

**Why they're here:**
- Leftover from Supabase template
- Not harmful (just ignored)
- Clerk handles actual authentication and tenant isolation

**Actual tenant isolation:**
- Handled by Clerk middleware at application level
- No database-level RLS enforcement
- Policies are defined but not enforced

**Future cleanup:**
- These RLS policies should be removed in a future migration
- See `KNOWN_ISSUES.md` for tracking

## Use Cases

### Task Creation Sources

**Manual:**
- Admin creates task directly in task manager
- `source_type` and `source_id` are NULL

**Auto-generated:**
- Event needs review → creates task with `source_type='event'`, `source_id=event_id`
- Client onboarding incomplete → creates task from CRM
- Inventory low stock → creates procurement task

### Task Workflow

1. **Created**: Task in 'backlog' status
2. **Assigned**: Set `assigned_to` employee
3. **Prioritized**: Set priority level
4. **Scheduled**: Set `due_date`
5. **In Progress**: Update status
6. **Completed**: Update status to 'done'
7. **Archived**: Soft delete via `deleted_at`

### Filtering & Views

**By Status:**
```sql
WHERE tenant_id = X AND status = 'in_progress' AND deleted_at IS NULL
```

**By Due Date:**
```sql
WHERE tenant_id = X AND due_date <= CURRENT_DATE AND status != 'done' AND deleted_at IS NULL
ORDER BY due_date ASC
```

**By Source:**
```sql
WHERE tenant_id = X AND source_type = 'event' AND source_id = Y
```

## Impact

### Application

- Task management UI can now track administrative TODOs
- Automated task creation from events, clients, inventory alerts
- Assignment and prioritization support
- Due date tracking and reminders

### Performance

- Indexed on common query patterns (status, due date, tenant)
- Partial index on active tasks for efficiency
- Composite indexes support multi-column filters

## Related Migrations

- **Previous**: `20260203220243_repair_drift`
- **Next**: `20260206023831_repair_drift` (admin chat tables)

## TODO

- [ ] Remove unused RLS policies in future migration
- [ ] Add foreign key constraints for `assigned_to` and `created_by` → `employees`
- [ ] Consider adding enum types for `status` and `priority` values

---

Last updated: 2026-02-05
