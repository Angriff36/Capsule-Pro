-- AlterTable
ALTER TABLE "tenant_crm"."crm_scoring_rules" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_events"."event_followups" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6);
