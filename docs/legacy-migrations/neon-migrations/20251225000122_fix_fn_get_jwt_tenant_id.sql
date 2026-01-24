-- MIGRATION: 20251225000122_fix_fn_get_jwt_tenant_id.sql
-- Fix tenant_id extraction from app_metadata to avoid jsonb cast errors.

CREATE OR REPLACE FUNCTION core.fn_get_jwt_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claims jsonb;
  v_tenant_id text;
BEGIN
  v_claims := auth.jwt();
  v_tenant_id := v_claims ->> 'tenant_id';

  IF v_tenant_id IS NULL THEN
    v_tenant_id := v_claims #>> '{app_metadata,tenant_id}';
  END IF;

  RETURN v_tenant_id::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

