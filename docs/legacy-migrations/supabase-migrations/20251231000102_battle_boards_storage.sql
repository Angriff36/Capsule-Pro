-- =====================================================================
-- BATTLE BOARDS STORAGE SETUP
-- =====================================================================
-- Purpose: Configure Supabase Storage for battle board documents
-- Buckets: battle-boards-documents (tenant-isolated)
-- Supported formats: PDF, CSV, Excel, JSON
-- Author: Claude Code
-- Date: 2025-12-31
-- =====================================================================

-- =====================================================================
-- STORAGE BUCKET CREATION
-- =====================================================================

-- Create battle-boards-documents bucket (tenant-isolated, private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'battle-boards-documents',
  'battle-boards-documents',
  false,  -- Private bucket (requires authentication)
  52428800,  -- 50 MB limit (50 * 1024 * 1024)
  ARRAY[
    'application/pdf',                                                          -- PDF documents
    'text/csv',                                                                 -- CSV files
    'application/vnd.ms-excel',                                                 -- Excel (old format)
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',        -- Excel (.xlsx)
    'application/json',                                                         -- Battle board JSON exports
    'text/plain'                                                                -- Plain text
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- STORAGE RLS POLICIES (Tenant Isolation)
-- =====================================================================

-- Note: RLS is already enabled on storage.objects by Supabase
-- We just need to create the policies

-- Policy 1: SELECT - Tenant members can read their own documents
CREATE POLICY "battle_boards_documents_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'battle-boards-documents'
  AND (storage.foldername(name))[1] = core.fn_get_jwt_tenant_id()::text
);

-- Policy 2: INSERT - Tenant members can upload to their own folder
CREATE POLICY "battle_boards_documents_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'battle-boards-documents'
  AND (storage.foldername(name))[1] = core.fn_get_jwt_tenant_id()::text
  AND (storage.foldername(name))[1] IS NOT NULL  -- Ensure tenant_id prefix exists
);

-- Policy 3: UPDATE - Tenant members can update their own documents
CREATE POLICY "battle_boards_documents_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'battle-boards-documents'
  AND (storage.foldername(name))[1] = core.fn_get_jwt_tenant_id()::text
);

-- Policy 4: DELETE - Tenant members can delete their own documents
CREATE POLICY "battle_boards_documents_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'battle-boards-documents'
  AND (storage.foldername(name))[1] = core.fn_get_jwt_tenant_id()::text
);

-- Policy 5: SERVICE ROLE - Admin bypass for migrations/cleanup
CREATE POLICY "battle_boards_documents_service"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'battle-boards-documents')
WITH CHECK (bucket_id = 'battle-boards-documents');

-- =====================================================================
-- FILE PATH STRUCTURE
-- =====================================================================

/*
Battle boards documents follow this path convention:

{tenant_id}/documents/{document_type}/{timestamp}-{hash}.{ext}

Examples:
  00000000-0000-0000-0000-000000000005/documents/source-pdf/1704067200-a1b2c3d4.pdf
  00000000-0000-0000-0000-000000000005/documents/imported-csv/1704067200-e5f6g7h8.csv
  00000000-0000-0000-0000-000000000005/documents/exported-json/1704067200-i9j0k1l2.json
  00000000-0000-0000-0000-000000000005/documents/goodshuffle-export/1704067200-m3n4o5p6.xlsx

Where:
  - tenant_id: UUID of the tenant (for RLS enforcement)
  - document_type: source-pdf, imported-csv, exported-json, goodshuffle-export, etc.
  - timestamp: Unix timestamp in seconds
  - hash: Short hash (8 chars) to prevent collisions
  - ext: File extension (pdf, csv, json, xlsx, xls, txt)
*/

-- =====================================================================
-- LIFECYCLE / CLEANUP POLICIES
-- =====================================================================

-- Track temporary/abandoned uploads for cleanup
CREATE TABLE IF NOT EXISTS tenant_events.battle_board_uploads (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (tenant_id, id),

  -- File metadata
  file_path text NOT NULL,  -- Storage path
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  original_filename text NOT NULL,

  -- Upload status
  upload_status text NOT NULL DEFAULT 'pending' CHECK (
    upload_status IN ('pending', 'processing', 'completed', 'failed', 'expired')
  ),

  -- Battle board reference (NULL until linked)
  battle_board_id uuid,
  FOREIGN KEY (tenant_id, battle_board_id) REFERENCES tenant_events.battle_boards(tenant_id, id) ON DELETE CASCADE,

  -- Timestamps
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '90 days',  -- 90-day retention
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

-- Enable RLS
ALTER TABLE tenant_events.battle_board_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_events.battle_board_uploads FORCE ROW LEVEL SECURITY;

-- RLS Policies for battle_board_uploads
CREATE POLICY "battle_board_uploads_select" ON tenant_events.battle_board_uploads
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "battle_board_uploads_insert" ON tenant_events.battle_board_uploads
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY "battle_board_uploads_update" ON tenant_events.battle_board_uploads
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY "battle_board_uploads_delete" ON tenant_events.battle_board_uploads
  FOR DELETE USING (false);

CREATE POLICY "battle_board_uploads_service" ON tenant_events.battle_board_uploads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes for uploads table
CREATE INDEX idx_battle_board_uploads_status
  ON tenant_events.battle_board_uploads(tenant_id, upload_status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_battle_board_uploads_expiry
  ON tenant_events.battle_board_uploads(expires_at)
  WHERE deleted_at IS NULL AND upload_status IN ('pending', 'failed');

CREATE INDEX idx_battle_board_uploads_board_ref
  ON tenant_events.battle_board_uploads(tenant_id, battle_board_id)
  WHERE deleted_at IS NULL;

-- Triggers for battle_board_uploads
CREATE TRIGGER _200_update_timestamp
  BEFORE UPDATE ON tenant_events.battle_board_uploads
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER _300_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_events.battle_board_uploads
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER _400_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_events.battle_board_uploads
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_audit_trigger();

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Function: Generate storage path for battle board document
CREATE OR REPLACE FUNCTION tenant_events.fn_generate_battle_board_storage_path(
  p_tenant_id uuid,
  p_document_type text,
  p_file_extension text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_timestamp bigint;
  v_hash text;
  v_path text;
BEGIN
  -- Generate timestamp (Unix seconds)
  v_timestamp := EXTRACT(EPOCH FROM now())::bigint;

  -- Generate short hash (first 8 chars of random UUID)
  v_hash := substring(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  -- Build path: {tenant_id}/documents/{document_type}/{timestamp}-{hash}.{ext}
  v_path := format(
    '%s/documents/%s/%s-%s.%s',
    p_tenant_id,
    p_document_type,
    v_timestamp,
    v_hash,
    p_file_extension
  );

  RETURN v_path;
END;
$$;

COMMENT ON FUNCTION tenant_events.fn_generate_battle_board_storage_path IS
  'Generates standardized storage path for battle board documents with tenant isolation';

-- =====================================================================
-- VALIDATION QUERIES
-- =====================================================================

-- Verify bucket exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'battle-boards-documents'
  ) THEN
    RAISE EXCEPTION 'Storage bucket battle-boards-documents not created';
  END IF;
END $$;

-- Verify RLS policies exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'battle_boards_documents_select'
  ) THEN
    RAISE EXCEPTION 'RLS policy battle_boards_documents_select not created';
  END IF;
END $$;

-- Verify battle_board_uploads table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'tenant_events'
    AND tablename = 'battle_board_uploads'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'Table tenant_events.battle_board_uploads not created with RLS';
  END IF;
END $$;

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE tenant_events.battle_board_uploads IS
  'Tracks battle board document uploads with 90-day retention. Links uploaded files to battle boards.';

COMMENT ON COLUMN tenant_events.battle_board_uploads.file_path IS
  'Storage path in battle-boards-documents bucket. Format: {tenant_id}/documents/{type}/{timestamp}-{hash}.{ext}';

COMMENT ON COLUMN tenant_events.battle_board_uploads.expires_at IS
  '90-day retention policy. Unlinked uploads expire and get cleaned up by background job.';

COMMENT ON COLUMN tenant_events.battle_board_uploads.battle_board_id IS
  'FK to battle_boards table. NULL for orphaned/temporary uploads. Set when document is linked to a board.';
