-- 000_external_auth_stub.sql
-- Purpose:
-- - On Supabase: auth schema is managed externally; do nothing.
-- - On plain Postgres tooling envs: create minimal stubs so references compile.

DO LANGUAGE plpgsql $guard$
BEGIN
  -- If auth already exists (Supabase), leave it alone.
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    RETURN;
  END IF;

  -- Otherwise, create minimal stubs (tooling-only).
  -- If we don't have privileges, just skip silently.
  BEGIN
    EXECUTE 'CREATE SCHEMA auth';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RETURN;
  END;

  BEGIN
    EXECUTE 'CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY)';

    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION auth.uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $body$ SELECT NULL::uuid $body$
    $sql$;

    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION auth.jwt()
      RETURNS jsonb
      LANGUAGE sql
      STABLE
      AS $body$ SELECT '{}'::jsonb $body$
    $sql$;

  EXCEPTION
    WHEN insufficient_privilege THEN
      RETURN;
  END;
END
$guard$;
