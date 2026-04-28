-- Add foreign-key indexes to PrepComment for kitchen task detail views.
--
-- Why this migration exists:
--   PrepComment defines two FK columns (`task_id`, `employee_id`) but the
--   schema previously declared no covering index for either. Lookups by
--   task (the dominant access pattern from kitchen task detail pages) and
--   by employee (audit / activity views) fell back to sequential scans on
--   the prep_comments table, which scales linearly with the tenant's
--   comment volume. These indexes make both lookups O(log n).
--
-- We do NOT use CREATE INDEX CONCURRENTLY because Prisma migrate wraps
-- each migration in a transaction and CONCURRENTLY is rejected in a
-- transaction. The prep_comments table is still small in production, so
-- a brief write lock during index build is acceptable.

CREATE INDEX IF NOT EXISTS "prep_comments_task_id_idx"
  ON "tenant_kitchen"."prep_comments" ("task_id");

CREATE INDEX IF NOT EXISTS "prep_comments_employee_id_idx"
  ON "tenant_kitchen"."prep_comments" ("employee_id");
