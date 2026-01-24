-- Migration: 20260107190000_docling_documents.sql
-- Purpose: Add PDF document storage and parsing tracking for Docling feature
-- Follows Schema Contract v2 patterns for multi-tenancy

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create tenant.documents table for PDF document tracking
CREATE TABLE tenant.documents (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES platform.accounts(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    storage_path TEXT,
    parsed_data JSONB,
    parse_status TEXT NOT NULL DEFAULT 'pending' CHECK (parse_status IN ('pending', 'processing', 'completed', 'failed')),
    parse_error TEXT,
    parsed_at TIMESTAMPTZ,
    event_id UUID,
    battle_board_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,

    -- Composite unique constraint for tenant-scoped uniqueness
    UNIQUE(tenant_id, id)
);

-- Add foreign key constraints (composite PK references must be added separately)
ALTER TABLE tenant.documents
    ADD CONSTRAINT documents_event_fk
    FOREIGN KEY (tenant_id, event_id)
    REFERENCES tenant_events.events(tenant_id, id)
    ON DELETE SET NULL;

ALTER TABLE tenant.documents
    ADD CONSTRAINT documents_battle_board_fk
    FOREIGN KEY (tenant_id, battle_board_id)
    REFERENCES tenant_events.battle_boards(tenant_id, id)
    ON DELETE SET NULL;

-- Create partial indexes for performance (active records only)
CREATE INDEX idx_tenant_documents_tenant_id_deleted_at ON tenant.documents(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenant_documents_parse_status ON tenant.documents(parse_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenant_documents_event_id ON tenant.documents(event_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenant_documents_battle_board_id ON tenant.documents(battle_board_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenant_documents_file_name ON tenant.documents(file_name) WHERE deleted_at IS NULL;

-- RLS (Row Level Security) Policies
ALTER TABLE tenant.documents ENABLE ROW LEVEL SECURITY;

-- 1. SELECT policy - Allow reading own tenant's documents, soft-deleted excluded
CREATE POLICY tenant_documents_select ON tenant.documents
    FOR SELECT USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        AND deleted_at IS NULL
    );

-- 2. INSERT policy - Allow inserting with own tenant_id
CREATE POLICY tenant_documents_insert ON tenant.documents
    FOR INSERT WITH CHECK (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );

-- 3. UPDATE policy - Allow updating own tenant's documents
CREATE POLICY tenant_documents_update ON tenant.documents
    FOR UPDATE USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );

-- 4. DELETE policy - Block hard delete, soft delete only
CREATE POLICY tenant_documents_delete ON tenant.documents
    FOR DELETE USING (false);

-- 5. SERVICE policy - Allow service_role bypass for admin operations
CREATE POLICY tenant_documents_service ON tenant.documents
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Create triggers for timestamp updates, tenant mutation prevention, and audit logging

-- 200 - Update timestamp trigger
CREATE OR REPLACE FUNCTION tenant.trg_documents_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER _200_update_timestamp
    BEFORE UPDATE ON tenant.documents
    FOR EACH ROW
    EXECUTE FUNCTION tenant.trg_documents_update_timestamp();

-- 300 - Prevent tenant mutation trigger
CREATE OR REPLACE FUNCTION tenant.trg_documents_prevent_tenant_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
        RAISE EXCEPTION 'Tenant mutation not allowed on documents table';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER _300_prevent_tenant_mutation
    BEFORE UPDATE ON tenant.documents
    FOR EACH ROW
    EXECUTE FUNCTION tenant.trg_documents_prevent_tenant_mutation();

-- 400 - Audit trigger for documents table
CREATE OR REPLACE FUNCTION tenant.trg_documents_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO tenant.audit_log (
            tenant_id,
            table_name,
            record_id,
            operation,
            old_data,
            changed_at,
            changed_by
        ) VALUES (
            OLD.tenant_id,
            'tenant.documents',
            OLD.id::text,
            'DELETE',
            jsonb_build_object(
                'file_name', OLD.file_name,
                'file_type', OLD.file_type,
                'file_size', OLD.file_size,
                'storage_path', OLD.storage_path,
                'parse_status', OLD.parse_status,
                'parse_error', OLD.parse_error,
                'parsed_at', OLD.parsed_at,
                'event_id', OLD.event_id,
                'battle_board_id', OLD.battle_board_id,
                'metadata', OLD.metadata
            ),
            now(),
            (auth.jwt() ->> 'sub')::uuid
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO tenant.audit_log (
            tenant_id,
            table_name,
            record_id,
            operation,
            old_data,
            new_data,
            changed_at,
            changed_by
        ) VALUES (
            NEW.tenant_id,
            'tenant.documents',
            NEW.id::text,
            'UPDATE',
            jsonb_build_object(
                'file_name', OLD.file_name,
                'file_type', OLD.file_type,
                'file_size', OLD.file_size,
                'storage_path', OLD.storage_path,
                'parse_status', OLD.parse_status,
                'parse_error', OLD.parse_error,
                'parsed_at', OLD.parsed_at,
                'event_id', OLD.event_id,
                'battle_board_id', OLD.battle_board_id,
                'metadata', OLD.metadata
            ),
            jsonb_build_object(
                'file_name', NEW.file_name,
                'file_type', NEW.file_type,
                'file_size', NEW.file_size,
                'storage_path', NEW.storage_path,
                'parse_status', NEW.parse_status,
                'parse_error', NEW.parse_error,
                'parsed_at', NEW.parsed_at,
                'event_id', NEW.event_id,
                'battle_board_id', NEW.battle_board_id,
                'metadata', NEW.metadata
            ),
            now(),
            (auth.jwt() ->> 'sub')::uuid
        );
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO tenant.audit_log (
            tenant_id,
            table_name,
            record_id,
            operation,
            new_data,
            changed_at,
            changed_by
        ) VALUES (
            NEW.tenant_id,
            'tenant.documents',
            NEW.id::text,
            'INSERT',
            jsonb_build_object(
                'file_name', NEW.file_name,
                'file_type', NEW.file_type,
                'file_size', NEW.file_size,
                'storage_path', NEW.storage_path,
                'parse_status', NEW.parse_status,
                'parse_error', NEW.parse_error,
                'parsed_at', NEW.parsed_at,
                'event_id', NEW.event_id,
                'battle_board_id', NEW.battle_board_id,
                'metadata', NEW.metadata
            ),
            now(),
            (auth.jwt() ->> 'sub')::uuid
        );
    END IF;
    RETURN COALESCE(OLD, NEW);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER _400_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tenant.documents
    FOR EACH ROW
    EXECUTE FUNCTION tenant.trg_documents_audit_trigger();

-- Utility functions with function security (SET search_path = '')

-- Function to get document by ID with tenant isolation
CREATE OR REPLACE FUNCTION tenant.fn_get_document_by_id(p_document_id UUID)
RETURNS TABLE (
    id UUID,
    tenant_id UUID,
    file_name TEXT,
    file_type TEXT,
    file_size INTEGER,
    storage_path TEXT,
    parsed_data JSONB,
    parse_status TEXT,
    parse_error TEXT,
    parsed_at TIMESTAMPTZ,
    event_id UUID,
    battle_board_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    SET search_path = '', 'tenant';
    RETURN QUERY
    SELECT
        d.id,
        d.tenant_id,
        d.file_name,
        d.file_type,
        d.file_size,
        d.storage_path,
        d.parsed_data,
        d.parse_status,
        d.parse_error,
        d.parsed_at,
        d.event_id,
        d.battle_board_id,
        d.metadata,
        d.created_at,
        d.updated_at
    FROM tenant.documents d
    WHERE d.id = p_document_id
    AND d.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND d.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update parse status for a document
CREATE OR REPLACE FUNCTION tenant.fn_update_document_parse_status(
    document_id UUID,
    new_status TEXT,
    parsed_data JSONB DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    error_details TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    SET search_path = '', 'tenant';
    UPDATE tenant.documents
    SET
        parse_status = new_status,
        parsed_data = COALESCE(parsed_data, parsed_data),
        parse_error = CASE
            WHEN new_status = 'failed' THEN COALESCE(error_message, error_details)
            ELSE NULL
        END,
        parsed_at = CASE
            WHEN new_status = 'completed' THEN now()
            ELSE NULL
        END
    WHERE id = document_id
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete documents by tenant
CREATE OR REPLACE FUNCTION tenant.fn_delete_documents_by_ids(document_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    SET search_path = '', 'tenant';
    UPDATE tenant.documents
    SET deleted_at = now()
    WHERE id = ANY(document_ids)
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON tenant.documents TO authenticated, service_role;
GRANT DELETE ON tenant.documents TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA tenant TO authenticated, service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION tenant.fn_get_document_by_id(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION tenant.fn_update_document_parse_status(UUID, TEXT, JSONB, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION tenant.fn_delete_documents_by_ids(UUID[]) TO authenticated, service_role;
