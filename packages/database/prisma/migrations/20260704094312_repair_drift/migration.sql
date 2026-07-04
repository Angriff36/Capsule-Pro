DO $$ BEGIN
  CREATE TYPE "BudgetStatus" AS ENUM ('draft', 'active', 'closed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DealStatus" AS ENUM ('open', 'won', 'lost', 'abandoned');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "KitchenTaskStatus" AS ENUM ('pending', 'in_progress', 'done', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MenuStatus" AS ENUM ('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayrollPeriodStatus" AS ENUM ('open', 'closed', 'locked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayrollRunStatus" AS ENUM ('pending', 'processing', 'approved', 'paid', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PrepListStatus" AS ENUM ('draft', 'finalized', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PrepTaskPlanWorkflowStatus" AS ENUM ('created', 'generating', 'awaiting_review', 'reviewing', 'awaiting_approval', 'approving', 'instantiating', 'scheduling', 'completed', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PrepTaskStatus" AS ENUM ('open', 'pending', 'in_progress', 'done', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProposalStatus" AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'withdrawn', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "QACheckStatus" AS ENUM ('pending', 'completed', 'reinspection_required');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RecipeVersionStatus" AS ENUM ('draft', 'published');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ScheduleStatus" AS ENUM ('draft', 'approved', 'published', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ShipmentStatus" AS ENUM ('draft', 'scheduled', 'preparing', 'in_transit', 'delivered', 'returned', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WorkOrderStatus" AS ENUM ('open', 'assigned', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "platform"."api_keys" ALTER COLUMN "name" SET DEFAULT '',
ALTER COLUMN "key_prefix" SET DEFAULT '',
ALTER COLUMN "hashed_key" SET DEFAULT '',
ALTER COLUMN "expires_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "AiEventSetupSession" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "AutomatedFollowup" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "status" "BudgetStatus" DEFAULT 'draft',
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "status" "DealStatus" DEFAULT 'open',
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "EntityVersion" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "EventWaitlistEntry" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "FacilitySchedule" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "FacilityWorkOrder" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "LogisticsDispatch" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PerformancePrediction" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "expiresAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "SampleData" ALTER COLUMN "seededAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "StaffPerformance" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Vendor" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "VersionApproval" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "VersionedEntity" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "WorkforceOptimization" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "tenant"."documents" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant"."knowledge_base_entries" ALTER COLUMN "content" SET DEFAULT '',
ALTER COLUMN "category" SET DEFAULT 'general',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant"."venues" ALTER COLUMN "name" SET DEFAULT '',
ALTER COLUMN "address_line1" SET DEFAULT '',
ALTER COLUMN "address_line2" SET DEFAULT '',
ALTER COLUMN "city" SET DEFAULT '',
ALTER COLUMN "state_province" SET DEFAULT '',
ALTER COLUMN "postal_code" SET DEFAULT '',
ALTER COLUMN "country_code" SET DEFAULT '',
ALTER COLUMN "contact_name" SET DEFAULT '',
ALTER COLUMN "contact_phone" SET DEFAULT '',
ALTER COLUMN "contact_email" SET DEFAULT '',
ALTER COLUMN "access_notes" SET DEFAULT '',
ALTER COLUMN "catering_notes" SET DEFAULT '',
ALTER COLUMN "layout_image_url" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_accounting"."chart_of_accounts" ALTER COLUMN "account_number" SET DEFAULT '',
ALTER COLUMN "account_name" SET DEFAULT '',
ADD COLUMN IF NOT EXISTS "account_type" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_accounting"."collection_actions" ALTER COLUMN "action_type" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "outcome" SET DEFAULT '',
ALTER COLUMN "direction" SET DEFAULT '',
ALTER COLUMN "next_action_date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "promise_amount" SET DEFAULT 0,
ALTER COLUMN "promise_date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "scheduled_for" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_accounting"."collection_cases" ALTER COLUMN "invoice_number" SET DEFAULT '',
ALTER COLUMN "client_name" SET DEFAULT '',
ALTER COLUMN "original_amount" SET DEFAULT 0,
ALTER COLUMN "outstanding_amount" SET DEFAULT 0,
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN IF NOT EXISTS "dunning_stage" TEXT NOT NULL DEFAULT 'CURRENT',
ALTER COLUMN "aging_bucket" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "dispute_reason" SET DEFAULT '',
ALTER COLUMN "last_activity_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "legal_case_number" SET DEFAULT '',
ALTER COLUMN "legal_firm" SET DEFAULT '';

ALTER TABLE "tenant_accounting"."collection_payment_plans" ALTER COLUMN "total_amount" SET DEFAULT 0,
ALTER COLUMN "installments" SET DEFAULT 1,
ALTER COLUMN "start_date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "installment_amount" SET DEFAULT 0;

ALTER TABLE "tenant_accounting"."invoices" ALTER COLUMN "invoice_number" SET DEFAULT '',
ADD COLUMN IF NOT EXISTS "invoice_type" TEXT NOT NULL DEFAULT 'FINAL_PAYMENT',
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "subtotal" SET DEFAULT 0,
ALTER COLUMN "total" SET DEFAULT 0,
ALTER COLUMN "amount_due" SET DEFAULT 0,
ALTER COLUMN "deposit_percentage" SET DEFAULT 0,
ALTER COLUMN "deposit_required" SET DEFAULT 0,
ALTER COLUMN "deposit_paid" SET DEFAULT 0,
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "internal_notes" SET DEFAULT '',
ALTER COLUMN "line_items" SET DEFAULT '[]',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_accounting"."payment_methods" ALTER COLUMN "type" SET DEFAULT 'CREDIT_CARD',
ALTER COLUMN "card_last_four" SET DEFAULT '',
ALTER COLUMN "card_network" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "bank_account_last_four" SET DEFAULT '',
ALTER COLUMN "bank_account_type" SET DEFAULT '',
ALTER COLUMN "bank_routing_number" SET DEFAULT '',
ALTER COLUMN "card_expiry_month" SET DEFAULT 0,
ALTER COLUMN "card_expiry_year" SET DEFAULT 0,
ALTER COLUMN "card_holder_name" SET DEFAULT '',
ALTER COLUMN "external_method_id" SET DEFAULT '',
ALTER COLUMN "fraud_flagged" SET DEFAULT false,
ALTER COLUMN "nickname" SET DEFAULT '',
ALTER COLUMN "verification_method" SET DEFAULT '',
ALTER COLUMN "wallet_email" SET DEFAULT '',
ALTER COLUMN "wallet_provider" SET DEFAULT '';

ALTER TABLE "tenant_accounting"."payment_refund_attempts" ALTER COLUMN "requested_amount" SET DEFAULT 0,
ALTER COLUMN "effective_amount" SET DEFAULT 0,
ALTER COLUMN "refund_reason" SET DEFAULT '',
ALTER COLUMN "success" SET DEFAULT false;

ALTER TABLE "tenant_accounting"."payments" ALTER COLUMN "amount" SET DEFAULT 0,
ALTER COLUMN "method_type" SET DEFAULT 'CREDIT_CARD',
ALTER COLUMN "gateway_transaction_id" SET DEFAULT '',
ALTER COLUMN "gateway_payment_method_id" SET DEFAULT '',
ALTER COLUMN "processor" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "fraud_score" SET DEFAULT 0,
ALTER COLUMN "fraud_status" SET DEFAULT 'NOT_CHECKED',
ALTER COLUMN "reviewed_by" SET DEFAULT '';

ALTER TABLE "tenant_accounting"."revenue_recognition_lines" ALTER COLUMN "amount" SET DEFAULT 0,
ALTER COLUMN "due_date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "milestone_name" SET DEFAULT '',
ALTER COLUMN "milestone_description" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_accounting"."revenue_recognition_schedules" ALTER COLUMN "total_amount" SET DEFAULT 0,
ALTER COLUMN "remaining_amount" SET DEFAULT 0,
ALTER COLUMN "method" SET DEFAULT 'IMMEDIATE',
ALTER COLUMN "start_date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "end_date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "recognition_period" SET DEFAULT 0,
ALTER COLUMN "service_start_date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "service_end_date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_admin"."admin_chat_messages" ALTER COLUMN "author_name" SET DEFAULT '',
ALTER COLUMN "text" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_admin"."admin_chat_participants" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_admin"."admin_chat_threads" ALTER COLUMN "thread_type" SET DEFAULT 'direct',
ALTER COLUMN "slug" SET DEFAULT '',
ALTER COLUMN "direct_key" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_admin"."admin_task_attachments" ALTER COLUMN "file_name" SET DEFAULT '',
ALTER COLUMN "file_url" SET DEFAULT '',
ALTER COLUMN "file_size" SET DEFAULT 0,
ALTER COLUMN "mime_type" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_admin"."admin_task_comments" ALTER COLUMN "author_name" SET DEFAULT '',
ALTER COLUMN "text" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_admin"."admin_task_dev_meta" ALTER COLUMN "environment" SET DEFAULT '',
ALTER COLUMN "steps_to_repro" SET DEFAULT '',
ALTER COLUMN "expected_result" SET DEFAULT '',
ALTER COLUMN "actual_result" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_admin"."admin_task_file_refs" ALTER COLUMN "ref_type" SET DEFAULT '',
ALTER COLUMN "ref_label" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_admin"."admin_tasks" ALTER COLUMN "title" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ADD COLUMN IF NOT EXISTS "status" "AdminTaskStatus" NOT NULL DEFAULT 'backlog',
ALTER COLUMN "category" SET DEFAULT '',
ALTER COLUMN "source_type" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "estimated_hours" SET DEFAULT 0;

ALTER TABLE "tenant_admin"."board_configs" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_admin"."email_templates" ALTER COLUMN "name" SET DEFAULT '',
ADD COLUMN IF NOT EXISTS "template_type" TEXT NOT NULL DEFAULT 'custom',
ALTER COLUMN "subject" SET DEFAULT '',
ALTER COLUMN "body" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_admin"."email_workflows" ALTER COLUMN "name" SET DEFAULT '',
ADD COLUMN IF NOT EXISTS "trigger_type" TEXT NOT NULL DEFAULT 'custom',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_admin"."notifications" ALTER COLUMN "notification_type" SET DEFAULT '',
ALTER COLUMN "title" SET DEFAULT '',
ALTER COLUMN "body" SET DEFAULT '',
ALTER COLUMN "action_url" SET DEFAULT '',
ALTER COLUMN "correlation_id" SET DEFAULT '';

ALTER TABLE "tenant_admin"."rate_limit_configs" ALTER COLUMN "name" SET DEFAULT '',
ALTER COLUMN "endpoint_pattern" SET DEFAULT '',
ALTER COLUMN "window_ms" SET DEFAULT 60000,
ALTER COLUMN "max_requests" SET DEFAULT 100,
ALTER COLUMN "burst_allowance" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_admin"."reports" ALTER COLUMN "name" SET DEFAULT '',
ALTER COLUMN "report_type" SET DEFAULT '',
ALTER COLUMN "query_config" SET DEFAULT '{}',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_admin"."sms_automation_rules" ALTER COLUMN "name" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ADD COLUMN IF NOT EXISTS "trigger_type" TEXT NOT NULL DEFAULT 'custom_event',
ALTER COLUMN "custom_message" SET DEFAULT '',
ADD COLUMN IF NOT EXISTS "recipient_type" TEXT NOT NULL DEFAULT 'employee',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_admin"."workflows" ALTER COLUMN "name" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "trigger_type" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_crm"."call_planning_sessions" ALTER COLUMN "transcript_text" SET DEFAULT '',
ALTER COLUMN "metadata" SET DEFAULT '{}',
ALTER COLUMN "started_at" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_crm"."client_contacts" ALTER COLUMN "first_name" SET DEFAULT '',
ALTER COLUMN "last_name" SET DEFAULT '',
ALTER COLUMN "title" SET DEFAULT '',
ALTER COLUMN "email" SET DEFAULT '',
ALTER COLUMN "phone" SET DEFAULT '',
ALTER COLUMN "phone_mobile" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_crm"."client_interactions" ALTER COLUMN "interaction_type" SET DEFAULT 'note',
ALTER COLUMN "subject" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "correlation_id" SET DEFAULT '',
ALTER COLUMN "escalated_to" SET DEFAULT '';

ALTER TABLE "tenant_crm"."client_preferences" ALTER COLUMN "preference_type" SET DEFAULT '',
ALTER COLUMN "preference_key" SET DEFAULT '',
ALTER COLUMN "preference_value" SET DEFAULT '{}',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_crm"."clients" ALTER COLUMN "company_name" SET DEFAULT '',
ALTER COLUMN "first_name" SET DEFAULT '',
ALTER COLUMN "last_name" SET DEFAULT '',
ALTER COLUMN "email" SET DEFAULT '',
ALTER COLUMN "phone" SET DEFAULT '',
ALTER COLUMN "website" SET DEFAULT '',
ALTER COLUMN "address_line1" SET DEFAULT '',
ALTER COLUMN "address_line2" SET DEFAULT '',
ALTER COLUMN "city" SET DEFAULT '',
ALTER COLUMN "state_province" SET DEFAULT '',
ALTER COLUMN "postal_code" SET DEFAULT '',
ALTER COLUMN "country_code" SET DEFAULT '',
ALTER COLUMN "tax_id" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "source" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_crm"."crm_scoring_rules" ALTER COLUMN "rule_name" SET DEFAULT '',
ALTER COLUMN "field" SET DEFAULT '',
ALTER COLUMN "condition" SET DEFAULT '',
ALTER COLUMN "value" SET DEFAULT '',
ALTER COLUMN "points" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_crm"."event_planning_drafts" ALTER COLUMN "client_name" SET DEFAULT '',
ALTER COLUMN "event_type" SET DEFAULT '',
ALTER COLUMN "event_time" SET DEFAULT '',
ALTER COLUMN "guest_count" SET DEFAULT 0,
ALTER COLUMN "guest_count_min" SET DEFAULT 0,
ALTER COLUMN "guest_count_max" SET DEFAULT 0,
ALTER COLUMN "venue_preference" SET DEFAULT '',
ALTER COLUMN "service_style" SET DEFAULT '',
ALTER COLUMN "dietary_restrictions" SET DEFAULT '',
ALTER COLUMN "menu_preferences" SET DEFAULT '{}',
ALTER COLUMN "budget_min" SET DEFAULT 0,
ALTER COLUMN "budget_max" SET DEFAULT 0,
ALTER COLUMN "custom_items" SET DEFAULT '{}',
ALTER COLUMN "timeline_notes" SET DEFAULT '',
ALTER COLUMN "special_notes" SET DEFAULT '',
ALTER COLUMN "ai_summary" SET DEFAULT '',
ALTER COLUMN "overall_confidence" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_crm"."interaction_attachments" ALTER COLUMN "file_name" SET DEFAULT '',
ALTER COLUMN "file_url" SET DEFAULT '',
ALTER COLUMN "file_type" SET DEFAULT '',
ALTER COLUMN "file_size" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "uploaded_by" SET DEFAULT '';

ALTER TABLE "tenant_crm"."leads" ALTER COLUMN "source" SET DEFAULT '',
ALTER COLUMN "company_name" SET DEFAULT '',
ALTER COLUMN "contact_name" SET DEFAULT '',
ALTER COLUMN "contact_email" SET DEFAULT '',
ALTER COLUMN "contact_phone" SET DEFAULT '',
ALTER COLUMN "event_type" SET DEFAULT '',
ALTER COLUMN "estimated_guests" SET DEFAULT 0,
ALTER COLUMN "estimated_value" SET DEFAULT 0,
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_crm"."proposal_drafts" ALTER COLUMN "user_id" SET DEFAULT '',
ALTER COLUMN "title" SET DEFAULT '',
ALTER COLUMN "client_name" SET DEFAULT '',
ALTER COLUMN "client_email" SET DEFAULT '',
ALTER COLUMN "client_phone" SET DEFAULT '',
ALTER COLUMN "timeline" SET DEFAULT '{}',
ALTER COLUMN "upgrade_options" SET DEFAULT '{}',
ALTER COLUMN "vision_summary" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "next_steps" SET DEFAULT '',
ALTER COLUMN "magic_token" SET DEFAULT '',
ALTER COLUMN "html_content" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_crm"."proposal_line_items" ALTER COLUMN "item_type" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "quantity" SET DEFAULT 0,
ALTER COLUMN "unit_price" SET DEFAULT 0,
ALTER COLUMN "total" SET DEFAULT 0,
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "category" SET DEFAULT '',
ALTER COLUMN "total_price" SET DEFAULT 0,
ALTER COLUMN "unit_of_measure" SET DEFAULT '';

ALTER TABLE "tenant_crm"."proposal_templates" ALTER COLUMN "name" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "event_type" SET DEFAULT '',
ALTER COLUMN "default_terms" SET DEFAULT '',
ALTER COLUMN "default_notes" SET DEFAULT '',
ALTER COLUMN "logo_url" SET DEFAULT '',
ALTER COLUMN "primary_color" SET DEFAULT '',
ALTER COLUMN "secondary_color" SET DEFAULT '',
ALTER COLUMN "accent_color" SET DEFAULT '',
ALTER COLUMN "font_family" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_crm"."proposals" ALTER COLUMN "proposal_number" SET DEFAULT '',
ALTER COLUMN "title" SET DEFAULT '',
ALTER COLUMN "event_type" SET DEFAULT '',
ALTER COLUMN "guest_count" SET DEFAULT 0,
ALTER COLUMN "venue_name" SET DEFAULT '',
ALTER COLUMN "venue_address" SET DEFAULT '',
ADD COLUMN IF NOT EXISTS "status" "ProposalStatus" NOT NULL DEFAULT 'draft',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "terms_and_conditions" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_events"."battle_boards" ALTER COLUMN "board_name" SET DEFAULT '',
ALTER COLUMN "document_url" SET DEFAULT '',
ALTER COLUMN "source_document_type" SET DEFAULT '',
ALTER COLUMN "document_imported_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "client_id" SET DEFAULT '',
ALTER COLUMN "guest_count" SET DEFAULT 0,
ALTER COLUMN "inherited_context" SET DEFAULT '{}',
ALTER COLUMN "location_id" SET DEFAULT '',
ALTER COLUMN "venue_address" SET DEFAULT '',
ALTER COLUMN "venue_name" SET DEFAULT '';

ALTER TABLE "tenant_events"."board_annotations" ALTER COLUMN "label" SET DEFAULT '',
ALTER COLUMN "color" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "position_x" SET DEFAULT 0,
ALTER COLUMN "position_y" SET DEFAULT 0;

ALTER TABLE "tenant_events"."board_projections" ADD COLUMN IF NOT EXISTS "entity_type" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_events"."budget_line_items" ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_events"."catering_orders" ALTER COLUMN "delivery_time" SET DEFAULT '',
ALTER COLUMN "deposit_amount" SET DEFAULT 0,
ALTER COLUMN "venue_name" SET DEFAULT '',
ALTER COLUMN "venue_address" SET DEFAULT '',
ALTER COLUMN "venue_city" SET DEFAULT '',
ALTER COLUMN "venue_state" SET DEFAULT '',
ALTER COLUMN "venue_zip" SET DEFAULT '',
ALTER COLUMN "venue_contact_name" SET DEFAULT '',
ALTER COLUMN "venue_contact_phone" SET DEFAULT '',
ALTER COLUMN "special_instructions" SET DEFAULT '',
ALTER COLUMN "dietary_restrictions" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_events"."command_board_cards" ALTER COLUMN "title" SET DEFAULT '',
ALTER COLUMN "content" SET DEFAULT '',
ALTER COLUMN "color" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "entity_type" SET DEFAULT '';

ALTER TABLE "tenant_events"."command_board_connections" ALTER COLUMN "label" SET DEFAULT '';

ALTER TABLE "tenant_events"."command_board_groups" ALTER COLUMN "name" SET DEFAULT '',
ALTER COLUMN "color" SET DEFAULT '';

ALTER TABLE "tenant_events"."command_board_layouts" ALTER COLUMN "name" SET DEFAULT '',
ALTER COLUMN "viewport" SET DEFAULT '{}',
ALTER COLUMN "visibleCards" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "tenant_events"."command_boards" ALTER COLUMN "name" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "scope" SET DEFAULT '{}';

ALTER TABLE "tenant_events"."contract_signatures" ALTER COLUMN "signed_at" DROP DEFAULT,
ALTER COLUMN "signature_data" SET DEFAULT '',
ALTER COLUMN "signer_name" SET DEFAULT '',
ALTER COLUMN "signer_email" SET DEFAULT '',
ALTER COLUMN "ip_address" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "invalidation_reason" SET DEFAULT '',
ALTER COLUMN "signer_role" SET DEFAULT '';

ALTER TABLE "tenant_events"."document_versions" ALTER COLUMN "change_summary" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "approved_by" SET DEFAULT '',
ALTER COLUMN "published_by" SET DEFAULT '';

ALTER TABLE "tenant_events"."event_budgets" ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_events"."event_contracts" ALTER COLUMN "contract_number" SET DEFAULT '',
ALTER COLUMN "document_url" SET DEFAULT '',
ALTER COLUMN "document_type" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_events"."event_dishes" ALTER COLUMN "course" SET DEFAULT '',
ALTER COLUMN "special_instructions" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_events"."event_followups" ALTER COLUMN "task_type" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_events"."event_guests" ALTER COLUMN "guest_name" SET DEFAULT '',
ALTER COLUMN "guest_email" SET DEFAULT '',
ALTER COLUMN "guest_phone" SET DEFAULT '',
ALTER COLUMN "dietary_restrictions" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "allergen_restrictions" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "special_meal_notes" SET DEFAULT '',
ALTER COLUMN "table_assignment" SET DEFAULT '',
ALTER COLUMN "meal_preference" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "decline_reason" SET DEFAULT '';

ALTER TABLE "tenant_events"."event_imports" ALTER COLUMN "file_name" SET DEFAULT '',
ALTER COLUMN "mime_type" SET DEFAULT '',
ALTER COLUMN "file_type" SET DEFAULT '',
ALTER COLUMN "parse_errors" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "imported_rows" SET DEFAULT 0,
ALTER COLUMN "skipped_rows" SET DEFAULT 0,
ALTER COLUMN "total_rows" SET DEFAULT 0;

ALTER TABLE "tenant_events"."event_profitability" ALTER COLUMN "calculated_at" DROP DEFAULT,
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_events"."event_reports" ALTER COLUMN "auto_fill_score" SET DEFAULT 0,
ALTER COLUMN "report_config" SET DEFAULT '{}',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "parsed_event_data" SET DEFAULT '{}',
ALTER COLUMN "review_notes" SET DEFAULT '',
ALTER COLUMN "rejection_reason" SET DEFAULT '';

ALTER TABLE "tenant_events"."event_staff" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "tenant_events"."event_summaries" ALTER COLUMN "overall_summary" SET DEFAULT '',
ALTER COLUMN "generated_at" DROP DEFAULT,
ALTER COLUMN "generation_duration_ms" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_events"."event_timeline" ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "duration_minutes" SET DEFAULT 0;

ALTER TABLE "tenant_events"."events" ALTER COLUMN "event_number" SET DEFAULT '',
ALTER COLUMN "event_type" SET DEFAULT 'general',
ALTER COLUMN "status" SET DEFAULT 'draft',
ALTER COLUMN "budget" SET DEFAULT 0,
ALTER COLUMN "venue_name" SET DEFAULT '',
ALTER COLUMN "venue_address" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "tags" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "ticket_price" SET DEFAULT 0,
ALTER COLUMN "ticket_tier" SET DEFAULT '',
ALTER COLUMN "event_format" SET DEFAULT '',
ALTER COLUMN "accessibility_options" DROP DEFAULT,
ALTER COLUMN "featured_media_url" SET DEFAULT '',
ALTER COLUMN "template_id" SET DEFAULT '';

ALTER TABLE "tenant_events"."notes" ALTER COLUMN "title" SET DEFAULT '',
ALTER COLUMN "content" SET DEFAULT '',
ALTER COLUMN "color" SET DEFAULT '',
ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "entity_type" SET DEFAULT '';

ALTER TABLE "tenant_events"."timeline_tasks" ALTER COLUMN "title" SET DEFAULT '',
ALTER COLUMN "status" SET DEFAULT 'pending',
ALTER COLUMN "category" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "sort_order" SET DEFAULT 0;

ALTER TABLE "tenant_facilities"."facilities" ALTER COLUMN "code" SET DEFAULT '',
ALTER COLUMN "address_line1" SET DEFAULT '',
ALTER COLUMN "address_line2" SET DEFAULT '',
ALTER COLUMN "city" SET DEFAULT '',
ALTER COLUMN "state" SET DEFAULT '',
ALTER COLUMN "postal_code" SET DEFAULT '',
ALTER COLUMN "country" SET DEFAULT '',
ALTER COLUMN "phone" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_facilities"."facility_areas" ALTER COLUMN "code" SET DEFAULT '',
ALTER COLUMN "floor" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "square_feet" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_facilities"."facility_assets" ALTER COLUMN "serial_number" SET DEFAULT '',
ALTER COLUMN "manufacturer" SET DEFAULT '',
ALTER COLUMN "model" SET DEFAULT '',
ALTER COLUMN "purchase_cost" SET DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'operational',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "current_value" SET DEFAULT 0;

ALTER TABLE "tenant_facilities"."maintenance_work_orders" ALTER COLUMN "work_order_number" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "total_cost" SET DEFAULT 0,
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "estimated_cost" SET DEFAULT 0,
ALTER COLUMN "parts_used" SET DEFAULT '';

ALTER TABLE "tenant_facilities"."preventive_maintenance_schedules" ALTER COLUMN "schedule_number" SET DEFAULT '',
ALTER COLUMN "title" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "estimated_hours" SET DEFAULT 0,
ALTER COLUMN "estimated_cost" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."alerts_config" ALTER COLUMN "channel" SET DEFAULT '',
ALTER COLUMN "destination" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."audit_schedules" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."bulk_order_rules" ALTER COLUMN "rule_name" SET DEFAULT '',
ALTER COLUMN "minimum_quantity" SET DEFAULT 1,
ALTER COLUMN "rule_type" SET DEFAULT 'discount',
ALTER COLUMN "threshold_quantity" SET DEFAULT 0,
ALTER COLUMN "action" SET DEFAULT 'discount',
ALTER COLUMN "discount_percent" SET DEFAULT 0,
ALTER COLUMN "free_item_quantity" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."cycle_count_records" ALTER COLUMN "expected_quantity" SET DEFAULT 0,
ALTER COLUMN "counted_quantity" SET DEFAULT 0,
ALTER COLUMN "count_date" DROP DEFAULT,
ALTER COLUMN "barcode" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "offline_id" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."cycle_count_sessions" ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."forecast_inputs" ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "events" SET DEFAULT '{}',
ALTER COLUMN "promotions" SET DEFAULT '{}';

ALTER TABLE "tenant_inventory"."inventory_alerts" ALTER COLUMN "triggered_at" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "acknowledged_by" SET DEFAULT '',
ALTER COLUMN "resolved_by" SET DEFAULT '',
ALTER COLUMN "status" SET DEFAULT 'active';

ALTER TABLE "tenant_inventory"."inventory_forecasts" ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "confidence" SET DEFAULT 0;

ALTER TABLE "tenant_inventory"."inventory_items" ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "description" SET DEFAULT '';

ALTER TABLE "tenant_inventory"."inventory_stock" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."inventory_suppliers" ALTER COLUMN "supplier_number" SET DEFAULT '',
ALTER COLUMN "contact_person" SET DEFAULT '',
ALTER COLUMN "email" SET DEFAULT '',
ALTER COLUMN "phone" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "approved_by" SET DEFAULT '',
ALTER COLUMN "blacklisted_reason" SET DEFAULT '',
ALTER COLUMN "suspended_reason" SET DEFAULT '';

ALTER TABLE "tenant_inventory"."inventory_transactions" ALTER COLUMN "quantity" SET DEFAULT 0,
ALTER COLUMN "total_cost" SET DEFAULT 0,
ALTER COLUMN "reference" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "transaction_date" DROP DEFAULT,
ALTER COLUMN "reference_type" SET DEFAULT '',
ALTER COLUMN "reversed_by" SET DEFAULT '';

ALTER TABLE "tenant_inventory"."inventory_transfer_items" ALTER COLUMN "quantity" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."inventory_transfers" ALTER COLUMN "status" SET DEFAULT 'draft',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "discrepancy_notes" SET DEFAULT '';

ALTER TABLE "tenant_inventory"."pricing_tiers" ALTER COLUMN "tier_name" SET DEFAULT '',
ALTER COLUMN "min_quantity" SET DEFAULT 1,
ALTER COLUMN "max_quantity" SET DEFAULT 0,
ALTER COLUMN "unit_cost" SET DEFAULT 0,
ALTER COLUMN "discount_percent" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."procurement_budget_alerts" ALTER COLUMN "utilization_pct" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."procurement_budgets" ALTER COLUMN "budget_amount" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."purchase_order_items" ALTER COLUMN "quantity_ordered" SET DEFAULT 0,
ALTER COLUMN "unit_id" SET DEFAULT 0,
ALTER COLUMN "unit_cost" SET DEFAULT 0,
ALTER COLUMN "total_cost" SET DEFAULT 0,
ALTER COLUMN "discrepancy_type" SET DEFAULT '',
ALTER COLUMN "discrepancy_amount" SET DEFAULT 0,
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."purchase_orders" ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."purchase_requisition_items" ALTER COLUMN "item_name" SET DEFAULT '',
ALTER COLUMN "quantity_requested" SET DEFAULT 0,
ALTER COLUMN "unit_id" SET DEFAULT 0,
ALTER COLUMN "estimated_unit_cost" SET DEFAULT 0,
ALTER COLUMN "estimated_total_cost" SET DEFAULT 0,
ALTER COLUMN "suggested_vendor_name" SET DEFAULT '',
ALTER COLUMN "specifications" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."purchase_requisitions" ALTER COLUMN "department" SET DEFAULT '',
ALTER COLUMN "justification" SET DEFAULT '',
ALTER COLUMN "rejection_reason" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "item_category" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."shipment_items" ALTER COLUMN "unit_id" SET DEFAULT 0,
ALTER COLUMN "condition_notes" SET DEFAULT '',
ALTER COLUMN "lot_number" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."shipments" ADD COLUMN IF NOT EXISTS "status" "ShipmentStatus" NOT NULL DEFAULT 'draft',
ALTER COLUMN "tracking_number" SET DEFAULT '',
ALTER COLUMN "carrier" SET DEFAULT '',
ALTER COLUMN "shipping_method" SET DEFAULT '',
ALTER COLUMN "received_by" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "reference" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "internal_notes" SET DEFAULT '';

ALTER TABLE "tenant_inventory"."storage_locations" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."variance_reports" ALTER COLUMN "expected_quantity" SET DEFAULT 0,
ALTER COLUMN "counted_quantity" SET DEFAULT 0,
ALTER COLUMN "variance" SET DEFAULT 0,
ALTER COLUMN "variance_pct" SET DEFAULT 0,
ALTER COLUMN "accuracy_score" SET DEFAULT 0,
ALTER COLUMN "adjustment_type" SET DEFAULT '',
ALTER COLUMN "adjustment_amount" SET DEFAULT 0,
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "generated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "resolution_notes" SET DEFAULT '',
ALTER COLUMN "root_cause" SET DEFAULT '',
ALTER COLUMN "rejected_by" SET DEFAULT '',
ALTER COLUMN "rejection_reason" SET DEFAULT '';

ALTER TABLE "tenant_inventory"."vendor_catalogs" ALTER COLUMN "item_number" SET DEFAULT '',
ALTER COLUMN "item_name" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "category" SET DEFAULT '',
ALTER COLUMN "base_unit_cost" SET DEFAULT 0,
ALTER COLUMN "unit_of_measure" SET DEFAULT 'each',
ALTER COLUMN "lead_time_days" SET DEFAULT 0,
ALTER COLUMN "lead_time_min_days" SET DEFAULT 0,
ALTER COLUMN "lead_time_max_days" SET DEFAULT 0,
ALTER COLUMN "minimum_order_quantity" SET DEFAULT 0,
ALTER COLUMN "order_multiple" SET DEFAULT 0,
ALTER COLUMN "supplier_sku" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."vendor_contacts" ALTER COLUMN "contact_email" SET DEFAULT '',
ALTER COLUMN "contact_phone" SET DEFAULT '',
ALTER COLUMN "contact_role" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."vendor_contracts" ALTER COLUMN "vendor_name" SET DEFAULT '',
ALTER COLUMN "start_date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "renewal_term_days" SET DEFAULT 0,
ALTER COLUMN "delivery_terms" SET DEFAULT '',
ALTER COLUMN "termination_reason" SET DEFAULT '',
ALTER COLUMN "contract_url" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."vendor_ratings" ALTER COLUMN "category" DROP DEFAULT,
ALTER COLUMN "rating" SET DEFAULT 0,
ALTER COLUMN "comment" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."allergen_warnings" ALTER COLUMN "warning_type" SET DEFAULT '',
ALTER COLUMN "allergens" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "affected_guests" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "override_reason" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "escalated_to" SET DEFAULT '';

ALTER TABLE "tenant_kitchen"."bulk_combine_rules" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."containers" ALTER COLUMN "size_description" SET DEFAULT '',
ALTER COLUMN "capacity_volume_ml" SET DEFAULT 0,
ALTER COLUMN "capacity_weight_g" SET DEFAULT 0,
ALTER COLUMN "capacity_portions" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."corrective_actions" ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."dishes" ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "category" SET DEFAULT '',
ALTER COLUMN "service_style" SET DEFAULT '',
ALTER COLUMN "presentation_image_url" SET DEFAULT '',
ALTER COLUMN "max_prep_lead_days" SET DEFAULT 0,
ALTER COLUMN "portion_size_description" SET DEFAULT '',
ALTER COLUMN "dietary_tags" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "allergens" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "price_per_person" SET DEFAULT 0,
ALTER COLUMN "cost_per_person" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "eighty_six_reason" SET DEFAULT '',
ALTER COLUMN "season_label" SET DEFAULT '';

ALTER TABLE "tenant_kitchen"."equipment" ALTER COLUMN "serial_number" SET DEFAULT '',
ALTER COLUMN "manufacturer" SET DEFAULT '',
ALTER COLUMN "model" SET DEFAULT '',
ALTER COLUMN "purchase_date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."ingredients" ALTER COLUMN "category" SET DEFAULT '',
ALTER COLUMN "default_unit_id" SET DEFAULT 0,
ALTER COLUMN "density_g_per_ml" SET DEFAULT 0,
ALTER COLUMN "shelf_life_days" SET DEFAULT 0,
ALTER COLUMN "storage_instructions" SET DEFAULT '',
ALTER COLUMN "allergens" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "current_lot_number" SET DEFAULT '',
ALTER COLUMN "recall_reason" SET DEFAULT '';

ALTER TABLE "tenant_kitchen"."iot_alert_rules" ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "severity" DROP DEFAULT,
ALTER COLUMN "notify_channels" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."iot_alerts" ALTER COLUMN "alert_number" SET DEFAULT '',
ALTER COLUMN "alert_type" SET DEFAULT '',
ALTER COLUMN "severity" DROP DEFAULT,
ALTER COLUMN "title" SET DEFAULT '',
ALTER COLUMN "temperature" SET DEFAULT 0,
ALTER COLUMN "triggered_at" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."kitchen_tasks" ADD COLUMN IF NOT EXISTS "status" "KitchenTaskStatus" NOT NULL DEFAULT 'pending',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."menu_dishes" ALTER COLUMN "course" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "price_override" SET DEFAULT 0;

ALTER TABLE "tenant_kitchen"."menus" ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "category" SET DEFAULT '',
ALTER COLUMN "base_price" SET DEFAULT 0,
ALTER COLUMN "price_per_person" SET DEFAULT 0,
ALTER COLUMN "min_guests" SET DEFAULT 0,
ALTER COLUMN "max_guests" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "season_label" SET DEFAULT '',
ALTER COLUMN "season_year" SET DEFAULT 0,
ADD COLUMN IF NOT EXISTS "status" "MenuStatus" DEFAULT 'draft';

ALTER TABLE "tenant_kitchen"."method_videos" ALTER COLUMN "duration_seconds" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."override_audit" ALTER COLUMN "entity_type" SET DEFAULT '',
ALTER COLUMN "constraint_id" SET DEFAULT '',
ALTER COLUMN "guard_expression" SET DEFAULT '',
ALTER COLUMN "override_reason" SET DEFAULT '';

ALTER TABLE "tenant_kitchen"."prep_comments" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."prep_list_items" ALTER COLUMN "category" SET DEFAULT '',
ALTER COLUMN "base_quantity" SET DEFAULT 0,
ALTER COLUMN "base_unit" SET DEFAULT '',
ALTER COLUMN "scaled_quantity" SET DEFAULT 0,
ALTER COLUMN "scaled_unit" SET DEFAULT '',
ALTER COLUMN "preparation_notes" SET DEFAULT '',
ALTER COLUMN "allergens" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "dietary_substitutions" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "dish_name" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."prep_lists" ALTER COLUMN "dietary_restrictions" SET DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "status" "PrepListStatus" NOT NULL DEFAULT 'draft',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "generated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."prep_methods" ALTER COLUMN "category" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "estimated_duration_minutes" SET DEFAULT 0,
ALTER COLUMN "requires_certification" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."prep_task_plan_workflows" ADD COLUMN IF NOT EXISTS "status" "PrepTaskPlanWorkflowStatus" NOT NULL DEFAULT 'created',
ALTER COLUMN "idempotency_key" SET DEFAULT '',
ALTER COLUMN "generation_options" SET DEFAULT '{}',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "errors" SET DEFAULT '[]',
ALTER COLUMN "generated_tasks" SET DEFAULT '[]',
ALTER COLUMN "reviewed_tasks" SET DEFAULT '[]',
ALTER COLUMN "approved_task_ids" SET DEFAULT '[]',
ALTER COLUMN "rejected_task_ids" SET DEFAULT '[]',
ALTER COLUMN "instantiated_task_ids" SET DEFAULT '[]',
ALTER COLUMN "scheduled_windows" SET DEFAULT '{}',
ALTER COLUMN "constraint_outcomes" SET DEFAULT '[]',
ALTER COLUMN "warnings" SET DEFAULT '[]',
ALTER COLUMN "reviewed_by" SET DEFAULT '',
ALTER COLUMN "approved_by" SET DEFAULT '';

ALTER TABLE "tenant_kitchen"."prep_tasks" ALTER COLUMN "quantity_total" SET DEFAULT 0,
ALTER COLUMN "quantity_unit_id" SET DEFAULT 0,
ALTER COLUMN "servings_total" SET DEFAULT 0,
ALTER COLUMN "start_by_date" SET DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "status" "PrepTaskStatus" NOT NULL DEFAULT 'open',
ALTER COLUMN "estimated_minutes" SET DEFAULT 0,
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "station_id" SET DEFAULT '';

ALTER TABLE "tenant_kitchen"."qa_checks" ADD COLUMN IF NOT EXISTS "status" "QACheckStatus" NOT NULL DEFAULT 'pending',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."quality_check_items" ALTER COLUMN "passed" SET DEFAULT false,
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."quality_checks" ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."recipe_ingredients" ALTER COLUMN "preparation_notes" SET DEFAULT '',
ALTER COLUMN "sort_order" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."recipe_steps" ALTER COLUMN "duration_minutes" SET DEFAULT 0,
ALTER COLUMN "temperature_value" SET DEFAULT 0,
ALTER COLUMN "temperature_unit" SET DEFAULT '',
ALTER COLUMN "equipment_needed" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "tips" SET DEFAULT '',
ALTER COLUMN "video_url" SET DEFAULT '',
ALTER COLUMN "image_url" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."recipe_versions" ALTER COLUMN "version_number" SET DEFAULT 1,
ALTER COLUMN "yield_quantity" SET DEFAULT 1,
ALTER COLUMN "yield_unit_id" SET DEFAULT 1,
ALTER COLUMN "yield_description" SET DEFAULT '',
ALTER COLUMN "prep_time_minutes" SET DEFAULT 0,
ALTER COLUMN "cook_time_minutes" SET DEFAULT 0,
ALTER COLUMN "rest_time_minutes" SET DEFAULT 0,
ALTER COLUMN "difficulty_level" SET DEFAULT 1,
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "instructions" SET DEFAULT '',
ALTER COLUMN "category" SET DEFAULT '',
ALTER COLUMN "cuisine_type" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "approved_by" SET DEFAULT '',
ADD COLUMN IF NOT EXISTS "status" "RecipeVersionStatus" DEFAULT 'draft';

ALTER TABLE "tenant_kitchen"."recipes" ALTER COLUMN "category" SET DEFAULT '',
ALTER COLUMN "cuisine_type" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "tags" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."stations" ALTER COLUMN "station_type" SET DEFAULT 'prep-station',
ALTER COLUMN "equipmentList" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "current_task_count" SET DEFAULT 0,
ALTER COLUMN "in_maintenance" SET DEFAULT false,
ALTER COLUMN "maintenance_reason" SET DEFAULT '';

ALTER TABLE "tenant_kitchen"."task_bundles" ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."task_claims" ALTER COLUMN "claimed_at" DROP DEFAULT,
ALTER COLUMN "release_reason" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."task_progress" ALTER COLUMN "notes" SET DEFAULT '';

ALTER TABLE "tenant_kitchen"."temperature_logs" ALTER COLUMN "logged_at" DROP DEFAULT,
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."temperature_probes" ALTER COLUMN "min_temp" DROP DEFAULT,
ALTER COLUMN "max_temp" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."waste_entries" ALTER COLUMN "reason_id" SET DEFAULT 0,
ALTER COLUMN "quantity" SET DEFAULT 0,
ALTER COLUMN "unit_id" SET DEFAULT 0,
ALTER COLUMN "logged_at" DROP DEFAULT,
ALTER COLUMN "unitCost" SET DEFAULT 0,
ALTER COLUMN "totalCost" SET DEFAULT 0,
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."work_orders" ALTER COLUMN "equipment_name" SET DEFAULT '',
ADD COLUMN IF NOT EXISTS "status" "WorkOrderStatus" NOT NULL DEFAULT 'open',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_logistics"."delivery_routes" ALTER COLUMN "route_number" SET DEFAULT '',
ALTER COLUMN "name" SET DEFAULT '',
ALTER COLUMN "status" SET DEFAULT 'planned',
ALTER COLUMN "total_distance" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_logistics"."drivers" ALTER COLUMN "phone" SET DEFAULT '',
ALTER COLUMN "email" SET DEFAULT '',
ALTER COLUMN "license_number" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_logistics"."route_stops" ALTER COLUMN "stop_number" SET DEFAULT 0,
ALTER COLUMN "name" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_logistics"."vehicles" ALTER COLUMN "year" SET DEFAULT 0,
ALTER COLUMN "plate_number" SET DEFAULT '',
ALTER COLUMN "vin" SET DEFAULT '',
ALTER COLUMN "capacity_weight" SET DEFAULT 0,
ALTER COLUMN "capacity_volume" SET DEFAULT 0,
ALTER COLUMN "fuel_type" SET DEFAULT '',
ALTER COLUMN "mileage" SET DEFAULT 0,
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."EmployeeDeduction" ALTER COLUMN "type" SET DEFAULT '',
ALTER COLUMN "name" SET DEFAULT '',
ALTER COLUMN "amount" SET DEFAULT 0,
ALTER COLUMN "percentage" SET DEFAULT 0,
ALTER COLUMN "max_annual_amount" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."action_milestones" ALTER COLUMN "title" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."budget_alerts" ALTER COLUMN "alert_type" SET DEFAULT '',
ALTER COLUMN "utilization" SET DEFAULT 0,
ALTER COLUMN "message" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."disciplinary_actions" ALTER COLUMN "action_type" SET DEFAULT '',
ALTER COLUMN "issued_date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "reason" SET DEFAULT '',
ALTER COLUMN "status" SET DEFAULT 'open',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "escalation_reason" SET DEFAULT '';

ALTER TABLE "tenant_staff"."employee_availability" ALTER COLUMN "day_of_week" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "suspend_reason" SET DEFAULT '';

ALTER TABLE "tenant_staff"."employee_certifications" ALTER COLUMN "certification_type" SET DEFAULT '',
ALTER COLUMN "certification_name" SET DEFAULT '',
ALTER COLUMN "document_url" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."employee_time_off_requests" ALTER COLUMN "request_type" SET DEFAULT '',
ALTER COLUMN "reason" SET DEFAULT '',
ALTER COLUMN "rejection_reason" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "balance_snapshot" SET DEFAULT 0,
ALTER COLUMN "balance_unit" SET DEFAULT '';

ALTER TABLE "tenant_staff"."employees" ALTER COLUMN "first_name" SET DEFAULT '',
ALTER COLUMN "last_name" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "auth_user_id" SET DEFAULT '',
ALTER COLUMN "employee_number" SET DEFAULT '',
ALTER COLUMN "phone" SET DEFAULT '',
ADD COLUMN IF NOT EXISTS "employment_type" TEXT NOT NULL DEFAULT 'full_time',
ALTER COLUMN "hourly_rate" SET DEFAULT 0,
ALTER COLUMN "salary_annual" SET DEFAULT 0,
ALTER COLUMN "avatar_url" SET DEFAULT '';

ALTER TABLE "tenant_staff"."labor_budgets" ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "budget_type" SET DEFAULT 'weekly',
ALTER COLUMN "budget_target" SET DEFAULT 0,
ALTER COLUMN "actual_spend" SET DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'draft',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."onboarding_completions" ALTER COLUMN "completed_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."onboarding_tasks" ALTER COLUMN "title" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "task_type" SET DEFAULT 'OTHER',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."open_shifts" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."payroll_approval_history" ALTER COLUMN "action" SET DEFAULT '',
ALTER COLUMN "previous_status" SET DEFAULT '',
ALTER COLUMN "new_status" SET DEFAULT '',
ALTER COLUMN "reason" SET DEFAULT '';

ALTER TABLE "tenant_staff"."payroll_line_items" ALTER COLUMN "rate_regular" SET DEFAULT 0,
ALTER COLUMN "rate_overtime" SET DEFAULT 0,
ALTER COLUMN "gross_pay" SET DEFAULT 0,
ALTER COLUMN "net_pay" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."payroll_periods" ADD COLUMN IF NOT EXISTS "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'open',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."payroll_runs" ADD COLUMN IF NOT EXISTS "status" "PayrollRunStatus" NOT NULL DEFAULT 'pending',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "reject_reason" SET DEFAULT '';

ALTER TABLE "tenant_staff"."performance_reviews" ALTER COLUMN "review_type" SET DEFAULT '',
ALTER COLUMN "status" SET DEFAULT 'draft',
ALTER COLUMN "rating" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."role_policies" ALTER COLUMN "role_name" SET DEFAULT '',
ALTER COLUMN "permissions" SET DEFAULT '[]',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."schedule_shifts" ALTER COLUMN "role_during_shift" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "inherited_context" SET DEFAULT '';

ALTER TABLE "tenant_staff"."schedules" ADD COLUMN IF NOT EXISTS "status" "ScheduleStatus" NOT NULL DEFAULT 'draft',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "notes" SET DEFAULT '';

ALTER TABLE "tenant_staff"."staff_members" ALTER COLUMN "displayName" SET DEFAULT 'Unnamed',
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "tenant_staff"."staff_training_signals" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."time_entries" ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."timecard_approvals" ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "notes" SET DEFAULT '';

ALTER TABLE "tenant_staff"."timecard_edit_requests" ALTER COLUMN "requested_break_minutes" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."tip_pools" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."training_assignments" ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "attempt_count" SET DEFAULT 0,
ALTER COLUMN "due_date_review_needed" SET DEFAULT false,
ALTER COLUMN "last_attempt_id" SET DEFAULT '',
ALTER COLUMN "last_score_percent" SET DEFAULT 0,
ALTER COLUMN "manager_review_required" SET DEFAULT false,
ALTER COLUMN "max_attempts" SET DEFAULT 3,
ALTER COLUMN "module_code" SET DEFAULT '',
ALTER COLUMN "module_title" SET DEFAULT '',
ALTER COLUMN "pass_threshold_percent" SET DEFAULT 80,
ALTER COLUMN "staff_role" SET DEFAULT 'staff',
ALTER COLUMN "waiver_approved_by" SET DEFAULT '',
ALTER COLUMN "waiver_reason" SET DEFAULT '';

ALTER TABLE "tenant_staff"."training_attempts" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."training_completions" ALTER COLUMN "score" SET DEFAULT 0,
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."training_modules" ALTER COLUMN "title" SET DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "content_url" SET DEFAULT '',
ALTER COLUMN "duration_minutes" SET DEFAULT 0,
ALTER COLUMN "category" SET DEFAULT '',
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "code" SET DEFAULT '',
ALTER COLUMN "max_attempts" SET DEFAULT 3,
ALTER COLUMN "notes" SET DEFAULT '',
ALTER COLUMN "pass_threshold_percent" SET DEFAULT 80,
ALTER COLUMN "required_role" SET DEFAULT 'staff';

ALTER TABLE "tenant_staff"."training_questions" ALTER COLUMN "updated_at" DROP DEFAULT;

CREATE INDEX IF NOT EXISTS "api_keys_tenant_id_name_idx" ON "platform"."api_keys"("tenant_id", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "EntityVersion_id_key" ON "EntityVersion"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "Vendor_id_key" ON "Vendor"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "VersionedEntity_id_key" ON "VersionedEntity"("id");

CREATE INDEX IF NOT EXISTS "documents_tenant_id_id_idx" ON "tenant"."documents"("tenant_id", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "documents_id_key" ON "tenant"."documents"("id");

CREATE INDEX IF NOT EXISTS "venues_tenant_id_id_idx" ON "tenant"."venues"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "chart_of_accounts_id_idx" ON "tenant_accounting"."chart_of_accounts"("id");

CREATE INDEX IF NOT EXISTS "collection_actions_id_idx" ON "tenant_accounting"."collection_actions"("id");

CREATE INDEX IF NOT EXISTS "collection_cases_tenant_id_status_idx" ON "tenant_accounting"."collection_cases"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "collection_cases_id_idx" ON "tenant_accounting"."collection_cases"("id");

CREATE INDEX IF NOT EXISTS "collection_payment_plans_id_idx" ON "tenant_accounting"."collection_payment_plans"("id");

CREATE INDEX IF NOT EXISTS "invoices_tenant_id_status_idx" ON "tenant_accounting"."invoices"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "invoices_id_idx" ON "tenant_accounting"."invoices"("id");

CREATE INDEX IF NOT EXISTS "payment_methods_id_idx" ON "tenant_accounting"."payment_methods"("id");

CREATE INDEX IF NOT EXISTS "payment_refund_attempts_tenant_id_created_at_idx" ON "tenant_accounting"."payment_refund_attempts"("tenant_id", "created_at");

CREATE INDEX IF NOT EXISTS "payment_refund_attempts_id_idx" ON "tenant_accounting"."payment_refund_attempts"("id");

CREATE INDEX IF NOT EXISTS "payments_id_idx" ON "tenant_accounting"."payments"("id");

CREATE INDEX IF NOT EXISTS "revenue_recognition_lines_id_idx" ON "tenant_accounting"."revenue_recognition_lines"("id");

CREATE INDEX IF NOT EXISTS "revenue_recognition_schedules_id_idx" ON "tenant_accounting"."revenue_recognition_schedules"("id");

CREATE INDEX IF NOT EXISTS "admin_chat_participants_tenant_id_thread_id_user_id_idx" ON "tenant_admin"."admin_chat_participants"("tenant_id", "thread_id", "user_id");

CREATE INDEX IF NOT EXISTS "admin_chat_threads_tenant_id_slug_idx" ON "tenant_admin"."admin_chat_threads"("tenant_id", "slug");

CREATE INDEX IF NOT EXISTS "admin_chat_threads_tenant_id_direct_key_idx" ON "tenant_admin"."admin_chat_threads"("tenant_id", "direct_key");

CREATE INDEX IF NOT EXISTS "email_templates_tenant_id_template_type_idx" ON "tenant_admin"."email_templates"("tenant_id", "template_type");

CREATE UNIQUE INDEX IF NOT EXISTS "email_templates_id_key" ON "tenant_admin"."email_templates"("id");

CREATE INDEX IF NOT EXISTS "email_workflows_tenant_id_trigger_type_idx" ON "tenant_admin"."email_workflows"("tenant_id", "trigger_type");

CREATE INDEX IF NOT EXISTS "rate_limit_configs_tenant_id_name_idx" ON "tenant_admin"."rate_limit_configs"("tenant_id", "name");

CREATE INDEX IF NOT EXISTS "sms_automation_rules_tenant_id_trigger_type_idx" ON "tenant_admin"."sms_automation_rules"("tenant_id", "trigger_type");

CREATE INDEX IF NOT EXISTS "clients_id_idx" ON "tenant_crm"."clients"("id");

CREATE INDEX IF NOT EXISTS "leads_id_idx" ON "tenant_crm"."leads"("id");

CREATE INDEX IF NOT EXISTS "proposal_templates_tenant_id_id_idx" ON "tenant_crm"."proposal_templates"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "proposals_tenant_id_id_idx" ON "tenant_crm"."proposals"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "board_projections_entity_type_entity_id_idx" ON "tenant_events"."board_projections"("entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "board_projections_board_id_entity_type_entity_id_idx" ON "tenant_events"."board_projections"("board_id", "entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "command_board_connections_board_id_from_card_id_to_card_id__idx" ON "tenant_events"."command_board_connections"("board_id", "from_card_id", "to_card_id", "relationship_type");

CREATE INDEX IF NOT EXISTS "command_board_layouts_board_id_user_id_name_idx" ON "tenant_events"."command_board_layouts"("board_id", "user_id", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "command_boards_id_key" ON "tenant_events"."command_boards"("id");

CREATE INDEX IF NOT EXISTS "event_profitability_calculated_at_idx" ON "tenant_events"."event_profitability"("calculated_at");

CREATE INDEX IF NOT EXISTS "event_summaries_generated_at_idx" ON "tenant_events"."event_summaries"("generated_at");

CREATE INDEX IF NOT EXISTS "events_tenant_id_id_idx" ON "tenant_events"."events"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "facilities_tenant_id_code_idx" ON "tenant_facilities"."facilities"("tenant_id", "code");

CREATE UNIQUE INDEX IF NOT EXISTS "facilities_id_key" ON "tenant_facilities"."facilities"("id");

CREATE INDEX IF NOT EXISTS "facility_areas_tenant_id_code_idx" ON "tenant_facilities"."facility_areas"("tenant_id", "code");

CREATE UNIQUE INDEX IF NOT EXISTS "facility_areas_id_key" ON "tenant_facilities"."facility_areas"("id");

CREATE INDEX IF NOT EXISTS "maintenance_work_orders_tenant_id_work_order_number_idx" ON "tenant_facilities"."maintenance_work_orders"("tenant_id", "work_order_number");

CREATE INDEX IF NOT EXISTS "preventive_maintenance_schedules_tenant_id_schedule_number_idx" ON "tenant_facilities"."preventive_maintenance_schedules"("tenant_id", "schedule_number");

CREATE INDEX IF NOT EXISTS "inventory_items_tenant_id_id_idx" ON "tenant_inventory"."inventory_items"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "inventory_suppliers_tenant_id_id_idx" ON "tenant_inventory"."inventory_suppliers"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "inventory_suppliers_tenant_id_supplier_number_idx" ON "tenant_inventory"."inventory_suppliers"("tenant_id", "supplier_number");

CREATE INDEX IF NOT EXISTS "purchase_orders_tenant_id_id_idx" ON "tenant_inventory"."purchase_orders"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "purchase_requisitions_tenant_id_id_idx" ON "tenant_inventory"."purchase_requisitions"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "shipment_items_tenant_id_id_idx" ON "tenant_inventory"."shipment_items"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "shipments_tenant_id_status_idx" ON "tenant_inventory"."shipments"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "shipments_tenant_id_id_idx" ON "tenant_inventory"."shipments"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "vendor_catalogs_tenant_id_supplier_id_item_number_idx" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "supplier_id", "item_number");

CREATE INDEX IF NOT EXISTS "vendor_contracts_tenant_id_id_idx" ON "tenant_inventory"."vendor_contracts"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "corrective_actions_tenant_id_action_number_idx" ON "tenant_kitchen"."corrective_actions"("tenant_id", "action_number");

CREATE INDEX IF NOT EXISTS "equipment_tenant_id_id_idx" ON "tenant_kitchen"."equipment"("tenant_id", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "equipment_id_key" ON "tenant_kitchen"."equipment"("id");

CREATE INDEX IF NOT EXISTS "iot_alert_rules_tenant_id_id_idx" ON "tenant_kitchen"."iot_alert_rules"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "iot_alerts_tenant_id_alert_number_idx" ON "tenant_kitchen"."iot_alerts"("tenant_id", "alert_number");

CREATE INDEX IF NOT EXISTS "menu_dishes_tenant_id_menu_id_dish_id_idx" ON "tenant_kitchen"."menu_dishes"("tenant_id", "menu_id", "dish_id");

CREATE INDEX IF NOT EXISTS "override_audit_tenant_id_created_at_idx" ON "tenant_kitchen"."override_audit"("tenant_id", "created_at");

CREATE INDEX IF NOT EXISTS "override_audit_tenant_id_id_idx" ON "tenant_kitchen"."override_audit"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "prep_lists_status_idx" ON "tenant_kitchen"."prep_lists"("status");

CREATE INDEX IF NOT EXISTS "prep_task_plan_workflows_tenant_id_created_at_idx" ON "tenant_kitchen"."prep_task_plan_workflows"("tenant_id", "created_at");

CREATE INDEX IF NOT EXISTS "prep_task_plan_workflows_tenant_id_idempotency_key_idx" ON "tenant_kitchen"."prep_task_plan_workflows"("tenant_id", "idempotency_key");

CREATE UNIQUE INDEX IF NOT EXISTS "prep_tasks_id_key" ON "tenant_kitchen"."prep_tasks"("id");

CREATE INDEX IF NOT EXISTS "qa_checks_tenant_id_status_idx" ON "tenant_kitchen"."qa_checks"("tenant_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "qa_checks_id_key" ON "tenant_kitchen"."qa_checks"("id");

CREATE INDEX IF NOT EXISTS "quality_checks_tenant_id_check_number_idx" ON "tenant_kitchen"."quality_checks"("tenant_id", "check_number");

CREATE INDEX IF NOT EXISTS "recipe_steps_tenant_id_recipe_version_id_step_number_idx" ON "tenant_kitchen"."recipe_steps"("tenant_id", "recipe_version_id", "step_number");

CREATE INDEX IF NOT EXISTS "recipe_versions_tenant_id_recipe_id_version_number_idx" ON "tenant_kitchen"."recipe_versions"("tenant_id", "recipe_id", "version_number");

CREATE INDEX IF NOT EXISTS "stations_tenant_id_id_idx" ON "tenant_kitchen"."stations"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "temperature_logs_tenant_id_log_number_idx" ON "tenant_kitchen"."temperature_logs"("tenant_id", "log_number");

CREATE INDEX IF NOT EXISTS "temperature_probes_tenant_id_probe_id_idx" ON "tenant_kitchen"."temperature_probes"("tenant_id", "probe_id");

CREATE INDEX IF NOT EXISTS "waste_entries_tenant_id_logged_at_idx" ON "tenant_kitchen"."waste_entries"("tenant_id", "logged_at");

CREATE INDEX IF NOT EXISTS "work_orders_tenant_id_status_idx" ON "tenant_kitchen"."work_orders"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "work_orders_tenant_id_id_idx" ON "tenant_kitchen"."work_orders"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "delivery_routes_tenant_id_route_number_idx" ON "tenant_logistics"."delivery_routes"("tenant_id", "route_number");

CREATE UNIQUE INDEX IF NOT EXISTS "drivers_id_key" ON "tenant_logistics"."drivers"("id");

CREATE INDEX IF NOT EXISTS "route_stops_route_id_stop_number_idx" ON "tenant_logistics"."route_stops"("route_id", "stop_number");

CREATE INDEX IF NOT EXISTS "employees_tenant_id_id_idx" ON "tenant_staff"."employees"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "employees_tenant_id_auth_user_id_idx" ON "tenant_staff"."employees"("tenant_id", "auth_user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "employees_id_key" ON "tenant_staff"."employees"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "labor_budgets_id_key" ON "tenant_staff"."labor_budgets"("id");

CREATE INDEX IF NOT EXISTS "onboarding_completions_tenant_id_employee_id_task_id_idx" ON "tenant_staff"."onboarding_completions"("tenant_id", "employee_id", "task_id");

CREATE UNIQUE INDEX IF NOT EXISTS "payroll_periods_id_key" ON "tenant_staff"."payroll_periods"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "payroll_runs_id_key" ON "tenant_staff"."payroll_runs"("id");

CREATE INDEX IF NOT EXISTS "role_policies_tenant_id_role_id_idx" ON "tenant_staff"."role_policies"("tenant_id", "role_id");

CREATE UNIQUE INDEX IF NOT EXISTS "role_policies_id_key" ON "tenant_staff"."role_policies"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "staff_members_id_key" ON "tenant_staff"."staff_members"("id");

CREATE INDEX IF NOT EXISTS "timecard_edit_requests_tenant_id_time_entry_id_idx" ON "tenant_staff"."timecard_edit_requests"("tenant_id", "time_entry_id");

CREATE UNIQUE INDEX IF NOT EXISTS "training_assignments_id_key" ON "tenant_staff"."training_assignments"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "training_attempts_id_key" ON "tenant_staff"."training_attempts"("id");

CREATE INDEX IF NOT EXISTS "training_completions_tenant_id_employee_id_module_id_idx" ON "tenant_staff"."training_completions"("tenant_id", "employee_id", "module_id");

CREATE UNIQUE INDEX IF NOT EXISTS "training_modules_id_key" ON "tenant_staff"."training_modules"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "training_questions_id_key" ON "tenant_staff"."training_questions"("id");
