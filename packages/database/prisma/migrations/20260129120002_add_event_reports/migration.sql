-- Create event_reports table for tenant_events schema

CREATE TABLE tenant_events.event_reports (
    tenant_id       UUID NOT NULL,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL,
    name            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft',
    completion      INTEGER NOT NULL DEFAULT 0,
    auto_fill_score SMALLINT,
    report_config   JSONB,
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6),

    CONSTRAINT event_reports_pkey PRIMARY KEY (tenant_id, id)
);

CREATE INDEX event_reports_event_id_idx ON tenant_events.event_reports(event_id);

-- Add foreign key constraint for event_reports.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_reports_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_reports
        ADD CONSTRAINT fk_event_reports_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
