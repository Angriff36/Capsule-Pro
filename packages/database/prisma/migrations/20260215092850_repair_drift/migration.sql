ALTER TABLE "tenant"."OutboxEvent" ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE "tenant_kitchen"."menu_dishes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "tenant_kitchen"."menus" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS "client_contacts_client_id_idx" ON "tenant_crm"."client_contacts"("client_id");

CREATE INDEX IF NOT EXISTS "client_interactions_client_id_idx" ON "tenant_crm"."client_interactions"("client_id");

CREATE INDEX IF NOT EXISTS "client_interactions_lead_id_idx" ON "tenant_crm"."client_interactions"("lead_id");

CREATE INDEX IF NOT EXISTS "proposals_client_id_idx" ON "tenant_crm"."proposals"("client_id");

CREATE INDEX IF NOT EXISTS "proposals_lead_id_idx" ON "tenant_crm"."proposals"("lead_id");

CREATE INDEX IF NOT EXISTS "proposals_event_id_idx" ON "tenant_crm"."proposals"("event_id");

CREATE INDEX IF NOT EXISTS "event_staff_assignments_event_id_idx" ON "tenant_events"."event_staff_assignments"("event_id");

CREATE INDEX IF NOT EXISTS "event_staff_assignments_employee_id_idx" ON "tenant_events"."event_staff_assignments"("employee_id");

CREATE INDEX IF NOT EXISTS "event_timeline_event_id_idx" ON "tenant_events"."event_timeline"("event_id");

CREATE INDEX IF NOT EXISTS "events_client_id_idx" ON "tenant_events"."events"("client_id");

CREATE INDEX IF NOT EXISTS "events_location_id_idx" ON "tenant_events"."events"("location_id");

CREATE INDEX IF NOT EXISTS "shipments_location_id_idx" ON "tenant_inventory"."shipments"("location_id");

CREATE INDEX IF NOT EXISTS "recipe_ingredients_recipe_version_id_idx" ON "tenant_kitchen"."recipe_ingredients"("recipe_version_id");

CREATE INDEX IF NOT EXISTS "recipe_versions_recipe_id_idx" ON "tenant_kitchen"."recipe_versions"("recipe_id");

CREATE INDEX IF NOT EXISTS "task_claims_employee_id_idx" ON "tenant_kitchen"."task_claims"("employee_id");

CREATE INDEX IF NOT EXISTS "employees_role_id_idx" ON "tenant_staff"."employees"("role_id");
