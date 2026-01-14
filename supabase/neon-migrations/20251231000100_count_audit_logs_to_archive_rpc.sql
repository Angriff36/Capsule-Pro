-- MIGRATION: 20251231000100_count_audit_logs_to_archive_rpc.sql
-- Adds platform.count_audit_logs_to_archive RPC for server-side aggregation

-- Counts audit logs older than the provided cutoff date, grouped by tenant_id.
--
-- Notes:
-- - Returns BIGINT counts for accuracy on large tables.
-- - Marked STABLE (read-only) for planner optimizations.
-- - Uses SECURITY DEFINER so callers (service role / jobs) can run without relying on table RLS.

CREATE OR REPLACE FUNCTION platform.count_audit_logs_to_archive(
  p_cutoff_date timestamptz
)
RETURNS TABLE(tenant_id uuid, count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = platform, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT al.tenant_id, COUNT(*)::bigint
  FROM platform.audit_log al
  WHERE al.created_at < p_cutoff_date
  GROUP BY al.tenant_id;
END;
$$;

-- Restrict execution: allow service_role (and postgres) only by default.
REVOKE ALL ON FUNCTION platform.count_audit_logs_to_archive(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.count_audit_logs_to_archive(timestamptz) TO service_role;
