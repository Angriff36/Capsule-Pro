-- =====================================================================
-- BATTLE BOARDS MODULE
-- =====================================================================
-- Purpose: Visual event planning boards with document import support
-- Schema: tenant_events.battle_boards
-- Version: mangia-battle-board@1
-- Author: Claude Code
-- Date: 2025-12-31
-- =====================================================================

-- Create the battle_boards table
CREATE TABLE tenant_events.battle_boards (
  -- Multi-tenant composite PK pattern
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (tenant_id, id),

  -- Unique constraint for composite FK safety
  UNIQUE (tenant_id, id),

  -- Event association (nullable for generic/template boards)
  event_id uuid,
  FOREIGN KEY (tenant_id, event_id) REFERENCES tenant_events.events(tenant_id, id) ON DELETE CASCADE,

  -- Board metadata
  board_name text NOT NULL,
  board_type text NOT NULL DEFAULT 'event-specific' CHECK (
    board_type IN ('generic', 'event-specific', 'template')
  ),

  -- Schema versioning for future compatibility
  schema_version text NOT NULL DEFAULT 'mangia-battle-board@1',

  -- JSONB data column for battle board structure
  board_data jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Document source information
  document_url text,  -- Cloud storage URL (S3, Supabase Storage, etc)
  source_document_type text CHECK (
    source_document_type IS NULL OR
    source_document_type IN ('pdf', 'csv', 'excel', 'goodshuffle', 'nowsta', 'manual')
  ),
  document_imported_at timestamptz,

  -- Status and visibility
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'active', 'archived', 'template')
  ),
  is_template boolean NOT NULL DEFAULT false,

  -- Notes and metadata
  description text,
  notes text,
  tags text[],

  -- Standard timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

-- =====================================================================
-- INDEXES
-- =====================================================================

-- Primary queries: get active boards for event
CREATE INDEX idx_battle_boards_event_active
  ON tenant_events.battle_boards(tenant_id, event_id)
  WHERE deleted_at IS NULL AND status = 'active';

-- Template boards lookup
CREATE INDEX idx_battle_boards_templates
  ON tenant_events.battle_boards(tenant_id)
  WHERE deleted_at IS NULL AND is_template = true;

-- Board type filtering
CREATE INDEX idx_battle_boards_type
  ON tenant_events.battle_boards(tenant_id, board_type, status)
  WHERE deleted_at IS NULL;

-- JSONB board data queries (GIN index for JSON path queries)
CREATE INDEX idx_battle_boards_data_gin
  ON tenant_events.battle_boards USING gin(board_data);

-- Tag searches
CREATE INDEX idx_battle_boards_tags_gin
  ON tenant_events.battle_boards USING gin(tags);

-- =====================================================================
-- ROW LEVEL SECURITY (5 policies per table)
-- =====================================================================

ALTER TABLE tenant_events.battle_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_events.battle_boards FORCE ROW LEVEL SECURITY;

-- 1. SELECT - Tenant isolation + soft delete filter
CREATE POLICY "battle_boards_select" ON tenant_events.battle_boards
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

-- 2. INSERT - Tenant isolation with NOT NULL enforcement
CREATE POLICY "battle_boards_insert" ON tenant_events.battle_boards
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

-- 3. UPDATE - Prevent tenant_id mutation
CREATE POLICY "battle_boards_update" ON tenant_events.battle_boards
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- 4. DELETE - Blocked (soft delete only via UPDATE)
CREATE POLICY "battle_boards_delete" ON tenant_events.battle_boards
  FOR DELETE USING (false);

-- 5. SERVICE ROLE - Bypass for admin/background jobs
CREATE POLICY "battle_boards_service" ON tenant_events.battle_boards
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Trigger: Update timestamp on UPDATE
CREATE TRIGGER _200_update_timestamp
  BEFORE UPDATE ON tenant_events.battle_boards
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_update_timestamp();

-- Trigger: Prevent tenant_id mutation
CREATE TRIGGER _300_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_events.battle_boards
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Trigger: Audit trail
CREATE TRIGGER _400_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_events.battle_boards
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_audit_trigger();

-- =====================================================================
-- COMMENTS (for schema documentation)
-- =====================================================================

COMMENT ON TABLE tenant_events.battle_boards IS
  'Visual event planning boards with JSONB schema storage. Supports document import (PDF/CSV/Excel/Goodshuffle), schema versioning, and template boards.';

COMMENT ON COLUMN tenant_events.battle_boards.board_data IS
  'JSONB column storing battle board layout and content. Schema version defined by schema_version column (e.g., mangia-battle-board@1).';

COMMENT ON COLUMN tenant_events.battle_boards.schema_version IS
  'Battle board schema version identifier (e.g., mangia-battle-board@1). Enables forward compatibility when board structure evolves.';

COMMENT ON COLUMN tenant_events.battle_boards.document_url IS
  'Cloud storage URL for source document (Supabase Storage, S3, etc). NULL for manually created boards.';

COMMENT ON COLUMN tenant_events.battle_boards.event_id IS
  'Optional FK to tenant_events.events. NULL for generic boards or templates.';

-- =====================================================================
-- VALIDATION QUERIES (for testing)
-- =====================================================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'tenant_events'
    AND tablename = 'battle_boards'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on tenant_events.battle_boards';
  END IF;
END $$;

-- Verify required indexes exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'tenant_events'
    AND tablename = 'battle_boards'
    AND indexname = 'idx_battle_boards_event_active'
  ) THEN
    RAISE EXCEPTION 'Missing index: idx_battle_boards_event_active';
  END IF;
END $$;

-- =====================================================================
-- SAMPLE DATA STRUCTURE (for reference)
-- =====================================================================

/*
Sample board_data structure (mangia-battle-board@1):

{
  "version": "1.0",
  "metadata": {
    "created_from": "goodshuffle_pdf",
    "import_date": "2025-12-31T12:00:00Z",
    "layout_type": "timeline"
  },
  "sections": [
    {
      "id": "staff-roster",
      "title": "Staff Roster",
      "order": 1,
      "items": [
        {
          "employee_id": "uuid-here",
          "name": "John Doe",
          "role": "Chef de Partie",
          "start_time": "14:00",
          "end_time": "22:00"
        }
      ]
    },
    {
      "id": "timeline",
      "title": "Event Timeline",
      "order": 2,
      "items": [
        {
          "time": "16:00",
          "description": "Start appetizer prep",
          "responsible": "Kitchen Lead"
        },
        {
          "time": "18:00",
          "description": "Service begins",
          "responsible": "Front of House"
        }
      ]
    },
    {
      "id": "tasks",
      "title": "Prep Tasks",
      "order": 3,
      "items": [
        {
          "task_id": "uuid-here",
          "name": "Prepare Caesar Salad",
          "quantity": "50 portions",
          "assigned_to": "uuid-here"
        }
      ]
    }
  ],
  "custom_fields": {}
}
*/
