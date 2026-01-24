-- MIGRATION: 20251225000124_fix_audit_action_enum.sql
-- Fix audit trigger to cast TG_OP to lowercase for core.action_type enum.

CREATE OR REPLACE FUNCTION core.fn_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_audit_level text;
  v_old_values jsonb;
  v_new_values jsonb;
  v_tenant_id uuid;
BEGIN
  SELECT audit_level INTO v_audit_level
  FROM core.audit_config
  WHERE table_schema = TG_TABLE_SCHEMA
    AND table_name = TG_TABLE_NAME;

  IF v_audit_level IS NULL THEN
    v_audit_level := 'full';
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_tenant_id := OLD.tenant_id;
    v_old_values := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_tenant_id := NEW.tenant_id;
    v_new_values := to_jsonb(NEW);
  ELSE
    v_tenant_id := NEW.tenant_id;
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
  END IF;

  INSERT INTO platform.audit_log
    (tenant_id, table_schema, table_name, record_id, action, old_values, new_values, performed_by)
  VALUES
    (v_tenant_id, TG_TABLE_SCHEMA, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), lower(TG_OP)::core.action_type, v_old_values, v_new_values, auth.uid());

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN undefined_column THEN
  INSERT INTO platform.audit_log
    (tenant_id, table_schema, table_name, record_id, action, old_values, new_values, performed_by)
  VALUES
    (NULL, TG_TABLE_SCHEMA, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), lower(TG_OP)::core.action_type, v_old_values, v_new_values, auth.uid());
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
