-- AlterTable
ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS     "approvedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "approvedBy" TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS     "lockedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EntityVersion" ADD COLUMN IF NOT EXISTS     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EventWaitlistEntry" ADD COLUMN IF NOT EXISTS     "seatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FacilitySchedule" ADD COLUMN IF NOT EXISTS     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LogisticsDispatch" ADD COLUMN IF NOT EXISTS     "departedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "failureReason" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "StaffPerformance" ADD COLUMN IF NOT EXISTS     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "acknowledgementNotes" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS     "approvedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "approvedBy" TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS     "blacklistedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "blacklistedReason" TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS     "lastContactAddedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "suspendedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "suspendedReason" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "VersionApproval" ADD COLUMN IF NOT EXISTS     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant"."knowledge_base_entries" ADD COLUMN IF NOT EXISTS     "view_count" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_accounting"."collection_actions" ADD COLUMN IF NOT EXISTS     "completed_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "direction" TEXT,
ADD COLUMN IF NOT EXISTS     "next_action_date" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "promise_amount" MONEY,
ADD COLUMN IF NOT EXISTS     "promise_date" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "scheduled_for" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "status" TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS     "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "tenant_accounting"."collection_cases" ADD COLUMN IF NOT EXISTS     "assigned_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "closed_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "dispute_reason" TEXT,
ADD COLUMN IF NOT EXISTS     "dispute_resolved_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "last_activity_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "legal_case_number" TEXT,
ADD COLUMN IF NOT EXISTS     "legal_firm" TEXT,
ADD COLUMN IF NOT EXISTS     "next_payment_due" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "payment_plan_id" UUID,
ADD COLUMN IF NOT EXISTS     "resolved_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_accounting"."collection_payment_plans" ADD COLUMN IF NOT EXISTS     "completed_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "completed_installments" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS     "defaulted_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "installment_amount" MONEY;

-- AlterTable
ALTER TABLE "tenant_accounting"."invoices" ADD COLUMN IF NOT EXISTS     "last_reminder_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "overdue_since" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "reminder_count" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_accounting"."payment_methods" ADD COLUMN IF NOT EXISTS     "bank_account_last_four" TEXT,
ADD COLUMN IF NOT EXISTS     "bank_account_type" TEXT,
ADD COLUMN IF NOT EXISTS     "bank_routing_number" TEXT,
ADD COLUMN IF NOT EXISTS     "card_expiry_month" INTEGER,
ADD COLUMN IF NOT EXISTS     "card_expiry_year" INTEGER,
ADD COLUMN IF NOT EXISTS     "card_holder_name" TEXT,
ADD COLUMN IF NOT EXISTS     "expires_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "external_method_id" TEXT,
ADD COLUMN IF NOT EXISTS     "fraud_flagged" BOOLEAN,
ADD COLUMN IF NOT EXISTS     "nickname" TEXT,
ADD COLUMN IF NOT EXISTS     "verification_method" TEXT,
ADD COLUMN IF NOT EXISTS     "verified_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "wallet_email" TEXT,
ADD COLUMN IF NOT EXISTS     "wallet_provider" TEXT;

-- AlterTable
ALTER TABLE "tenant_accounting"."payments" ADD COLUMN IF NOT EXISTS     "chargeback_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "description" TEXT,
ADD COLUMN IF NOT EXISTS     "fraud_score" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS     "fraud_status" TEXT,
ADD COLUMN IF NOT EXISTS     "reviewed_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "reviewed_by" TEXT;

-- AlterTable
ALTER TABLE "tenant_admin"."reports" ADD COLUMN IF NOT EXISTS     "is_shared" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "tenant_crm"."client_interactions" ADD COLUMN IF NOT EXISTS     "escalated_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "escalated_to" TEXT,
ADD COLUMN IF NOT EXISTS     "priority" TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS     "status" TEXT DEFAULT 'open';

-- AlterTable
ALTER TABLE "tenant_crm"."interaction_attachments" ADD COLUMN IF NOT EXISTS     "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS     "uploaded_by" TEXT;

-- AlterTable
ALTER TABLE "tenant_crm"."proposals" ADD COLUMN IF NOT EXISTS     "line_item_count" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_events"."board_annotations" ADD COLUMN IF NOT EXISTS     "position_x" INTEGER,
ADD COLUMN IF NOT EXISTS     "position_y" INTEGER;

-- AlterTable
ALTER TABLE "tenant_events"."catering_orders" ADD COLUMN IF NOT EXISTS     "delivered_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "prep_started_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_events"."contract_signatures" ADD COLUMN IF NOT EXISTS     "invalidated_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "invalidation_reason" TEXT,
ADD COLUMN IF NOT EXISTS     "is_valid" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS     "signer_role" TEXT,
ADD COLUMN IF NOT EXISTS     "verified_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_events"."document_versions" ADD COLUMN IF NOT EXISTS     "approved_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "approved_by" TEXT,
ADD COLUMN IF NOT EXISTS     "published_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "published_by" TEXT,
ADD COLUMN IF NOT EXISTS     "status" TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS     "superseded_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "superseded_by" UUID;

-- AlterTable
ALTER TABLE "tenant_events"."event_contracts" ADD COLUMN IF NOT EXISTS     "canceled_by" UUID,
ADD COLUMN IF NOT EXISTS     "sent_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "signed_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "viewed_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_events"."event_guests" ADD COLUMN IF NOT EXISTS     "checked_in_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "decline_reason" TEXT;

-- AlterTable
ALTER TABLE "tenant_events"."event_imports" ADD COLUMN IF NOT EXISTS     "imported_rows" INTEGER,
ADD COLUMN IF NOT EXISTS     "skipped_rows" INTEGER,
ADD COLUMN IF NOT EXISTS     "total_rows" INTEGER;

-- AlterTable
ALTER TABLE "tenant_events"."event_reports" ADD COLUMN IF NOT EXISTS     "rejected_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "rejected_by" UUID,
ADD COLUMN IF NOT EXISTS     "rejection_reason" TEXT;

-- AlterTable
ALTER TABLE "tenant_events"."event_timeline" ADD COLUMN IF NOT EXISTS     "duration_minutes" INTEGER;

-- AlterTable
ALTER TABLE "tenant_events"."notes" ADD COLUMN IF NOT EXISTS     "entity_id" UUID,
ADD COLUMN IF NOT EXISTS     "entity_type" TEXT;

-- AlterTable
ALTER TABLE "tenant_events"."timeline_tasks" ADD COLUMN IF NOT EXISTS     "completed_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "sort_order" INTEGER;

-- AlterTable
ALTER TABLE "tenant_facilities"."facility_assets" ADD COLUMN IF NOT EXISTS     "current_value" DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS     "facility_id" UUID,
ADD COLUMN IF NOT EXISTS     "last_maintenance_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "next_maintenance_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_facilities"."maintenance_work_orders" ADD COLUMN IF NOT EXISTS     "estimated_cost" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS     "parts_used" TEXT;

-- AlterTable
ALTER TABLE "tenant_inventory"."alerts_config" ADD COLUMN IF NOT EXISTS     "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "tenant_inventory"."audit_schedules" ADD COLUMN IF NOT EXISTS     "last_run_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "next_run_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_alerts" ADD COLUMN IF NOT EXISTS     "acknowledged_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "acknowledged_by" TEXT,
ADD COLUMN IF NOT EXISTS     "resolved_by" TEXT,
ADD COLUMN IF NOT EXISTS     "severity" TEXT,
ADD COLUMN IF NOT EXISTS     "status" TEXT;

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_items" ADD COLUMN IF NOT EXISTS     "quantity_reserved" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_suppliers" ADD COLUMN IF NOT EXISTS     "approved_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "approved_by" TEXT,
ADD COLUMN IF NOT EXISTS     "blacklisted_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "blacklisted_reason" TEXT,
ADD COLUMN IF NOT EXISTS     "is_active" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS     "open_po_count" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS     "qualification_status" TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS     "suspended_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "suspended_reason" TEXT;

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_transactions" ADD COLUMN IF NOT EXISTS     "is_reversed" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS     "reverse_of_transaction_id" UUID,
ADD COLUMN IF NOT EXISTS     "reversed_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "reversed_by" TEXT;

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_transfer_items" ADD COLUMN IF NOT EXISTS     "unit_id" TEXT;

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_transfers" ADD COLUMN IF NOT EXISTS     "discrepancy_notes" TEXT,
ADD COLUMN IF NOT EXISTS     "has_discrepancy" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "tenant_inventory"."procurement_budget_alerts" ADD COLUMN IF NOT EXISTS     "triggered_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_inventory"."purchase_orders" ADD COLUMN IF NOT EXISTS     "item_count" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_inventory"."purchase_requisitions" ADD COLUMN IF NOT EXISTS     "item_count" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_inventory"."variance_reports" ADD COLUMN IF NOT EXISTS     "rejected_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "rejected_by" TEXT,
ADD COLUMN IF NOT EXISTS     "rejection_reason" TEXT;

-- AlterTable
ALTER TABLE "tenant_inventory"."vendor_ratings" ADD COLUMN IF NOT EXISTS     "rated_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_kitchen"."allergen_warnings" ADD COLUMN IF NOT EXISTS     "escalated_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "escalated_to" TEXT;

-- AlterTable
ALTER TABLE "tenant_kitchen"."corrective_actions" ADD COLUMN IF NOT EXISTS     "escalated_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "escalated_to" UUID,
ADD COLUMN IF NOT EXISTS     "escalation_reason" TEXT;

-- AlterTable
ALTER TABLE "tenant_kitchen"."dishes" ADD COLUMN IF NOT EXISTS     "eighty_six_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "eighty_six_reason" TEXT,
ADD COLUMN IF NOT EXISTS     "is_eighty_six" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS     "is_seasonal" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS     "season_end_month" SMALLINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS     "season_label" TEXT,
ADD COLUMN IF NOT EXISTS     "season_start_month" SMALLINT DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_kitchen"."ingredients" ADD COLUMN IF NOT EXISTS     "current_lot_expires_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "current_lot_number" TEXT,
ADD COLUMN IF NOT EXISTS     "current_lot_received_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "inventory_item_id" UUID,
ADD COLUMN IF NOT EXISTS     "is_recalled" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS     "recall_reason" TEXT,
ADD COLUMN IF NOT EXISTS     "recalled_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_kitchen"."iot_alerts" ADD COLUMN IF NOT EXISTS     "rule_id" UUID,
ADD COLUMN IF NOT EXISTS     "value" DECIMAL(6,2);

-- AlterTable
ALTER TABLE "tenant_kitchen"."menu_dishes" ADD COLUMN IF NOT EXISTS     "price_override" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "tenant_kitchen"."menus" ADD COLUMN IF NOT EXISTS     "archived_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "is_seasonal" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS     "published_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "season_label" TEXT,
ADD COLUMN IF NOT EXISTS     "season_year" INTEGER,
ADD COLUMN IF NOT EXISTS     "status" TEXT DEFAULT 'draft';

-- AlterTable
ALTER TABLE "tenant_kitchen"."prep_lists" ADD COLUMN IF NOT EXISTS     "is_active" BOOLEAN DEFAULT true;

-- AlterTable
ALTER TABLE "tenant_kitchen"."prep_tasks" ADD COLUMN IF NOT EXISTS     "prep_list_id" UUID,
ADD COLUMN IF NOT EXISTS     "station_id" TEXT;

-- AlterTable
ALTER TABLE "tenant_kitchen"."recipe_versions" ADD COLUMN IF NOT EXISTS     "approved_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "approved_by" TEXT,
ADD COLUMN IF NOT EXISTS     "published_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "status" TEXT DEFAULT 'draft';

-- AlterTable
ALTER TABLE "tenant_kitchen"."stations" ADD COLUMN IF NOT EXISTS     "current_task_count" INTEGER,
ADD COLUMN IF NOT EXISTS     "in_maintenance" BOOLEAN,
ADD COLUMN IF NOT EXISTS     "maintenance_reason" TEXT,
ADD COLUMN IF NOT EXISTS     "maintenance_start_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_kitchen"."task_claims" ADD COLUMN IF NOT EXISTS     "status" TEXT DEFAULT 'active';

-- AlterTable
ALTER TABLE "tenant_kitchen"."task_progress" ADD COLUMN IF NOT EXISTS     "progress_pct" DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS     "recorded_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_kitchen"."temperature_readings" ADD COLUMN IF NOT EXISTS     "within_range" BOOLEAN;

-- AlterTable
ALTER TABLE "tenant_kitchen"."waste_entries" ADD COLUMN IF NOT EXISTS     "approved_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "approved_by" UUID,
ADD COLUMN IF NOT EXISTS     "status" TEXT DEFAULT 'logged';

-- AlterTable
ALTER TABLE "tenant_logistics"."delivery_routes" ADD COLUMN IF NOT EXISTS     "completed_stops" INTEGER,
ADD COLUMN IF NOT EXISTS     "delay_minutes" INTEGER;

-- AlterTable
ALTER TABLE "tenant_staff"."disciplinary_actions" ADD COLUMN IF NOT EXISTS     "escalated_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "escalated_to" UUID,
ADD COLUMN IF NOT EXISTS     "escalation_reason" TEXT,
ADD COLUMN IF NOT EXISTS     "severity" TEXT DEFAULT 'low';

-- AlterTable
ALTER TABLE "tenant_staff"."employee_availability" ADD COLUMN IF NOT EXISTS     "is_suspended" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS     "reinstated_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "suspend_reason" TEXT,
ADD COLUMN IF NOT EXISTS     "suspended_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_staff"."employee_bank_accounts" ADD COLUMN IF NOT EXISTS     "verification_failed_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "verification_failure_reason" TEXT;

-- AlterTable
ALTER TABLE "tenant_staff"."employee_certifications" ADD COLUMN IF NOT EXISTS     "status" TEXT DEFAULT 'active';

-- AlterTable
ALTER TABLE "tenant_staff"."employee_time_off_requests" ADD COLUMN IF NOT EXISTS     "balance_snapshot" DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS     "balance_unit" TEXT;

-- AlterTable
ALTER TABLE "tenant_staff"."labor_budgets" ADD COLUMN IF NOT EXISTS     "approved_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "approved_by" UUID;

-- AlterTable
ALTER TABLE "tenant_staff"."payroll_line_items" ADD COLUMN IF NOT EXISTS     "hours_worked" DECIMAL(6,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS     "total_deductions" DECIMAL(10,2) DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_staff"."payroll_runs" ADD COLUMN IF NOT EXISTS     "rejected_by" UUID;

-- AlterTable
ALTER TABLE "tenant_staff"."schedule_shifts" ADD COLUMN IF NOT EXISTS     "swap_accepted_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "swap_offered_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "swap_offered_to" UUID,
ADD COLUMN IF NOT EXISTS     "swap_status" TEXT DEFAULT 'none';

-- AlterTable
ALTER TABLE "tenant_staff"."schedules" ADD COLUMN IF NOT EXISTS     "approved_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "approved_by" UUID,
ADD COLUMN IF NOT EXISTS     "notes" TEXT;

-- AlterTable
ALTER TABLE "tenant_staff"."timecard_approvals" ADD COLUMN IF NOT EXISTS     "notes" TEXT;

-- AlterTable
ALTER TABLE "tenant_staff"."tip_pools" ADD COLUMN IF NOT EXISTS     "distributed_amount" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS     "distributed_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "distributed_by" UUID,
ADD COLUMN IF NOT EXISTS     "status" TEXT DEFAULT 'open';

-- AlterTable
ALTER TABLE "tenant_staff"."training_assignments" ADD COLUMN IF NOT EXISTS     "attempt_count" INTEGER,
ADD COLUMN IF NOT EXISTS     "completed_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "due_date_review_needed" BOOLEAN,
ADD COLUMN IF NOT EXISTS     "first_shift_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "last_attempt_id" TEXT,
ADD COLUMN IF NOT EXISTS     "last_score_percent" INTEGER,
ADD COLUMN IF NOT EXISTS     "manager_review_required" BOOLEAN,
ADD COLUMN IF NOT EXISTS     "max_attempts" INTEGER,
ADD COLUMN IF NOT EXISTS     "module_code" TEXT,
ADD COLUMN IF NOT EXISTS     "module_title" TEXT,
ADD COLUMN IF NOT EXISTS     "pass_threshold_percent" INTEGER,
ADD COLUMN IF NOT EXISTS     "reminder_sent_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "staff_role" TEXT,
ADD COLUMN IF NOT EXISTS     "started_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "waived_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "waiver_approved_by" TEXT,
ADD COLUMN IF NOT EXISTS     "waiver_reason" TEXT;

-- AlterTable
ALTER TABLE "tenant_staff"."training_modules" ADD COLUMN IF NOT EXISTS     "archived_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "code" TEXT,
ADD COLUMN IF NOT EXISTS     "max_attempts" INTEGER,
ADD COLUMN IF NOT EXISTS     "notes" TEXT,
ADD COLUMN IF NOT EXISTS     "pass_threshold_percent" INTEGER,
ADD COLUMN IF NOT EXISTS     "published_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS     "required_role" TEXT,
ADD COLUMN IF NOT EXISTS     "status" TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS     "version" INTEGER DEFAULT 1;
