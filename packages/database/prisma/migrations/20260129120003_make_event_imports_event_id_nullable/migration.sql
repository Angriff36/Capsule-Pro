-- Make event_imports.event_id nullable to allow imports without an event

-- First drop the FK constraint
ALTER TABLE tenant_events.event_imports
DROP CONSTRAINT IF EXISTS fk_event_imports_event;

-- Drop the NOT NULL constraint on event_id
ALTER TABLE tenant_events.event_imports
ALTER COLUMN event_id DROP NOT NULL;

-- Re-add the FK constraint (allows NULL values)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_imports_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_imports
        ADD CONSTRAINT fk_event_imports_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
