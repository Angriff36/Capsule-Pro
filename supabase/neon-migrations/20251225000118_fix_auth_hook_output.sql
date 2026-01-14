-- MIGRATION: 20251225000118_fix_auth_hook_output.sql
-- Fix custom access token hook to return { "claims": ... } as required by Supabase

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_employee_record RECORD;
  v_claims jsonb := '{}'::jsonb;
  v_existing_claims jsonb;
BEGIN
  v_user_id := (event ->> 'user_id')::uuid;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('claims', '{}'::jsonb);
  END IF;

  SELECT
    e.tenant_id,
    e.id AS employee_id,
    e.role AS employee_role,
    e.is_active,
    e.deleted_at
  INTO v_employee_record
  FROM tenant_staff.employees e
  WHERE e.auth_user_id = v_user_id
    AND e.deleted_at IS NULL
  LIMIT 1;

  IF FOUND AND v_employee_record.is_active THEN
    v_claims := jsonb_build_object(
      'tenant_id', v_employee_record.tenant_id::text,
      'employee_id', v_employee_record.employee_id::text,
      'employee_role', v_employee_record.employee_role
    );

    v_existing_claims := (event -> 'claims')::jsonb;

    RETURN jsonb_build_object(
      'claims',
      coalesce(v_existing_claims, '{}'::jsonb) || v_claims
    );
  END IF;

  RETURN jsonb_build_object('claims', '{}'::jsonb);
END;
$$;
