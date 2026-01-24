-- MIGRATION: 20251222000107_kitchen_realtime.sql
-- Supabase Realtime Setup for live multi-user kitchen collaboration
-- Enables PostgreSQL logical replication for real-time subscriptions via Supabase Realtime

-- ============================================
-- REALTIME SUPPORT
-- ============================================
-- REPLICA IDENTITY FULL enables Supabase Realtime to send the complete row state
-- (before and after) on UPDATE/DELETE operations, not just the primary key.
-- This is required for real-time dashboard features like:
-- - Live task claim updates (who's working what)
-- - Progress updates as employees work through tasks
-- - Status changes for prep tasks and events

-- NOTE: tenant_kitchen tables (task_claims, task_progress, prep_tasks)
-- were configured in 20251222000106_kitchen_recipes.sql. This migration
-- adds tenant_events.events for completeness.

-- ============================================
-- TENANT_EVENTS.EVENTS
-- ============================================

ALTER TABLE tenant_events.events REPLICA IDENTITY FULL;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify REPLICA IDENTITY settings for all realtime tables
SELECT
  schemaname,
  tablename,
  CASE relreplident
    WHEN 'd' THEN 'default (PK only)'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full (all columns)'
    WHEN 'i' THEN 'index (specific index)'
  END AS replica_identity
FROM pg_tables p
JOIN pg_class c ON p.tablename = c.relname
WHERE schemaname IN ('tenant_kitchen', 'tenant_events')
  AND tablename IN ('task_claims', 'task_progress', 'prep_tasks', 'events')
ORDER BY schemaname, tablename;

-- Expected results:
-- tenant_kitchen | task_claims   | full (all columns)
-- tenant_kitchen | task_progress | full (all columns)
-- tenant_kitchen | prep_tasks    | full (all columns)
-- tenant_events  | events        | full (all columns)

-- ============================================
-- USAGE NOTES
-- ============================================
-- Realtime subscriptions respect RLS policies.
-- Example Supabase client subscription:
--
-- const channel = supabase
--   .channel('task_claims_changes')
--   .on(
--     'postgres_changes',
--     {
--       event: '*',  -- INSERT, UPDATE, DELETE
--       schema: 'tenant_kitchen',
--       table: 'task_claims',
--       filter: 'tenant_id=eq.<tenant_id>'
--     },
--     (payload) => console.log('Change:', payload)
--   )
--   .subscribe();
