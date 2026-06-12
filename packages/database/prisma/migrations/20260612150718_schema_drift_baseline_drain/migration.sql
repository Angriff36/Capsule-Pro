-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT DEFAULT '',
ADD COLUMN     "lockedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EntityVersion" ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EventWaitlistEntry" ADD COLUMN     "seatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FacilitySchedule" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LogisticsDispatch" ADD COLUMN     "departedAt" TIMESTAMP(3),
ADD COLUMN     "failureReason" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "StaffPerformance" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "acknowledgementNotes" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT DEFAULT '',
ADD COLUMN     "blacklistedAt" TIMESTAMP(3),
ADD COLUMN     "blacklistedReason" TEXT DEFAULT '',
ADD COLUMN     "lastContactAddedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedReason" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "VersionApproval" ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant"."knowledge_base_entries" ADD COLUMN     "view_count" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_accounting"."collection_actions" ADD COLUMN     "completed_at" TIMESTAMPTZ(6),
ADD COLUMN     "direction" TEXT,
ADD COLUMN     "next_action_date" TIMESTAMPTZ(6),
ADD COLUMN     "promise_amount" MONEY,
ADD COLUMN     "promise_date" TIMESTAMPTZ(6),
ADD COLUMN     "scheduled_for" TIMESTAMPTZ(6),
ADD COLUMN     "status" TEXT DEFAULT 'PENDING',
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "tenant_accounting"."collection_cases" ADD COLUMN     "assigned_at" TIMESTAMPTZ(6),
ADD COLUMN     "closed_at" TIMESTAMPTZ(6),
ADD COLUMN     "dispute_reason" TEXT,
ADD COLUMN     "dispute_resolved_at" TIMESTAMPTZ(6),
ADD COLUMN     "last_activity_at" TIMESTAMPTZ(6),
ADD COLUMN     "legal_case_number" TEXT,
ADD COLUMN     "legal_firm" TEXT,
ADD COLUMN     "next_payment_due" TIMESTAMPTZ(6),
ADD COLUMN     "payment_plan_id" UUID,
ADD COLUMN     "resolved_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_accounting"."collection_payment_plans" ADD COLUMN     "completed_at" TIMESTAMPTZ(6),
ADD COLUMN     "completed_installments" INTEGER DEFAULT 0,
ADD COLUMN     "defaulted_at" TIMESTAMPTZ(6),
ADD COLUMN     "installment_amount" MONEY;

-- AlterTable
ALTER TABLE "tenant_accounting"."invoices" ADD COLUMN     "last_reminder_at" TIMESTAMPTZ(6),
ADD COLUMN     "overdue_since" TIMESTAMPTZ(6),
ADD COLUMN     "reminder_count" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_accounting"."payment_methods" ADD COLUMN     "bank_account_last_four" TEXT,
ADD COLUMN     "bank_account_type" TEXT,
ADD COLUMN     "bank_routing_number" TEXT,
ADD COLUMN     "card_expiry_month" INTEGER,
ADD COLUMN     "card_expiry_year" INTEGER,
ADD COLUMN     "card_holder_name" TEXT,
ADD COLUMN     "expires_at" TIMESTAMPTZ(6),
ADD COLUMN     "external_method_id" TEXT,
ADD COLUMN     "fraud_flagged" BOOLEAN,
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "verification_method" TEXT,
ADD COLUMN     "verified_at" TIMESTAMPTZ(6),
ADD COLUMN     "wallet_email" TEXT,
ADD COLUMN     "wallet_provider" TEXT;

-- AlterTable
ALTER TABLE "tenant_accounting"."payments" ADD COLUMN     "chargeback_at" TIMESTAMPTZ(6),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "fraud_score" DOUBLE PRECISION,
ADD COLUMN     "fraud_status" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMPTZ(6),
ADD COLUMN     "reviewed_by" TEXT;

-- AlterTable
ALTER TABLE "tenant_admin"."reports" ADD COLUMN     "is_shared" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "tenant_crm"."client_interactions" ADD COLUMN     "escalated_at" TIMESTAMPTZ(6),
ADD COLUMN     "escalated_to" TEXT,
ADD COLUMN     "priority" TEXT DEFAULT 'normal',
ADD COLUMN     "status" TEXT DEFAULT 'open';

-- AlterTable
ALTER TABLE "tenant_crm"."interaction_attachments" ADD COLUMN     "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "uploaded_by" TEXT;

-- AlterTable
ALTER TABLE "tenant_crm"."proposals" ADD COLUMN     "line_item_count" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_events"."board_annotations" ADD COLUMN     "position_x" INTEGER,
ADD COLUMN     "position_y" INTEGER;

-- AlterTable
ALTER TABLE "tenant_events"."catering_orders" ADD COLUMN     "delivered_at" TIMESTAMPTZ(6),
ADD COLUMN     "prep_started_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_events"."contract_signatures" ADD COLUMN     "invalidated_at" TIMESTAMPTZ(6),
ADD COLUMN     "invalidation_reason" TEXT,
ADD COLUMN     "is_valid" BOOLEAN DEFAULT true,
ADD COLUMN     "signer_role" TEXT,
ADD COLUMN     "verified_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_events"."document_versions" ADD COLUMN     "approved_at" TIMESTAMPTZ(6),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "published_at" TIMESTAMPTZ(6),
ADD COLUMN     "published_by" TEXT,
ADD COLUMN     "status" TEXT DEFAULT 'draft',
ADD COLUMN     "superseded_at" TIMESTAMPTZ(6),
ADD COLUMN     "superseded_by" UUID;

-- AlterTable
ALTER TABLE "tenant_events"."event_contracts" ADD COLUMN     "canceled_by" UUID,
ADD COLUMN     "sent_at" TIMESTAMPTZ(6),
ADD COLUMN     "signed_at" TIMESTAMPTZ(6),
ADD COLUMN     "viewed_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_events"."event_guests" ADD COLUMN     "checked_in_at" TIMESTAMPTZ(6),
ADD COLUMN     "decline_reason" TEXT;

-- AlterTable
ALTER TABLE "tenant_events"."event_imports" ADD COLUMN     "imported_rows" INTEGER,
ADD COLUMN     "skipped_rows" INTEGER,
ADD COLUMN     "total_rows" INTEGER;

-- AlterTable
ALTER TABLE "tenant_events"."event_reports" ADD COLUMN     "rejected_at" TIMESTAMPTZ(6),
ADD COLUMN     "rejected_by" UUID,
ADD COLUMN     "rejection_reason" TEXT;

-- AlterTable
ALTER TABLE "tenant_events"."event_timeline" ADD COLUMN     "duration_minutes" INTEGER;

-- AlterTable
ALTER TABLE "tenant_events"."notes" ADD COLUMN     "entity_id" UUID,
ADD COLUMN     "entity_type" TEXT;

-- AlterTable
ALTER TABLE "tenant_events"."timeline_tasks" ADD COLUMN     "completed_at" TIMESTAMPTZ(6),
ADD COLUMN     "sort_order" INTEGER;

-- AlterTable
ALTER TABLE "tenant_facilities"."facility_assets" ADD COLUMN     "current_value" DECIMAL(12,2),
ADD COLUMN     "facility_id" UUID,
ADD COLUMN     "last_maintenance_at" TIMESTAMPTZ(6),
ADD COLUMN     "next_maintenance_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_facilities"."maintenance_work_orders" ADD COLUMN     "estimated_cost" DECIMAL(10,2),
ADD COLUMN     "parts_used" TEXT;

-- AlterTable
ALTER TABLE "tenant_inventory"."alerts_config" ADD COLUMN     "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "tenant_inventory"."audit_schedules" ADD COLUMN     "last_run_at" TIMESTAMPTZ(6),
ADD COLUMN     "next_run_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_alerts" ADD COLUMN     "acknowledged_at" TIMESTAMPTZ(6),
ADD COLUMN     "acknowledged_by" TEXT,
ADD COLUMN     "resolved_by" TEXT,
ADD COLUMN     "severity" TEXT,
ADD COLUMN     "status" TEXT;

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_items" ADD COLUMN     "quantity_reserved" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_suppliers" ADD COLUMN     "approved_at" TIMESTAMPTZ(6),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "blacklisted_at" TIMESTAMPTZ(6),
ADD COLUMN     "blacklisted_reason" TEXT,
ADD COLUMN     "is_active" BOOLEAN DEFAULT true,
ADD COLUMN     "open_po_count" INTEGER DEFAULT 0,
ADD COLUMN     "qualification_status" TEXT DEFAULT 'pending',
ADD COLUMN     "suspended_at" TIMESTAMPTZ(6),
ADD COLUMN     "suspended_reason" TEXT;

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_transactions" ADD COLUMN     "is_reversed" BOOLEAN DEFAULT false,
ADD COLUMN     "reverse_of_transaction_id" UUID,
ADD COLUMN     "reversed_at" TIMESTAMPTZ(6),
ADD COLUMN     "reversed_by" TEXT;

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_transfer_items" ADD COLUMN     "unit_id" TEXT;

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_transfers" ADD COLUMN     "discrepancy_notes" TEXT,
ADD COLUMN     "has_discrepancy" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "tenant_inventory"."procurement_budget_alerts" ADD COLUMN     "triggered_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_inventory"."purchase_orders" ADD COLUMN     "item_count" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_inventory"."purchase_requisitions" ADD COLUMN     "item_count" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_inventory"."variance_reports" ADD COLUMN     "rejected_at" TIMESTAMPTZ(6),
ADD COLUMN     "rejected_by" TEXT,
ADD COLUMN     "rejection_reason" TEXT;

-- AlterTable
ALTER TABLE "tenant_inventory"."vendor_ratings" ADD COLUMN     "rated_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_kitchen"."allergen_warnings" ADD COLUMN     "escalated_at" TIMESTAMPTZ(6),
ADD COLUMN     "escalated_to" TEXT;

-- AlterTable
ALTER TABLE "tenant_kitchen"."corrective_actions" ADD COLUMN     "escalated_at" TIMESTAMPTZ(6),
ADD COLUMN     "escalated_to" UUID,
ADD COLUMN     "escalation_reason" TEXT;

-- AlterTable
ALTER TABLE "tenant_kitchen"."dishes" ADD COLUMN     "eighty_six_at" TIMESTAMPTZ(6),
ADD COLUMN     "eighty_six_reason" TEXT,
ADD COLUMN     "is_eighty_six" BOOLEAN DEFAULT false,
ADD COLUMN     "is_seasonal" BOOLEAN DEFAULT false,
ADD COLUMN     "season_end_month" SMALLINT DEFAULT 0,
ADD COLUMN     "season_label" TEXT,
ADD COLUMN     "season_start_month" SMALLINT DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_kitchen"."ingredients" ADD COLUMN     "current_lot_expires_at" TIMESTAMPTZ(6),
ADD COLUMN     "current_lot_number" TEXT,
ADD COLUMN     "current_lot_received_at" TIMESTAMPTZ(6),
ADD COLUMN     "inventory_item_id" UUID,
ADD COLUMN     "is_recalled" BOOLEAN DEFAULT false,
ADD COLUMN     "recall_reason" TEXT,
ADD COLUMN     "recalled_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_kitchen"."iot_alerts" ADD COLUMN     "rule_id" UUID,
ADD COLUMN     "value" DECIMAL(6,2);

-- AlterTable
ALTER TABLE "tenant_kitchen"."menu_dishes" ADD COLUMN     "price_override" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "tenant_kitchen"."menus" ADD COLUMN     "archived_at" TIMESTAMPTZ(6),
ADD COLUMN     "is_seasonal" BOOLEAN DEFAULT false,
ADD COLUMN     "published_at" TIMESTAMPTZ(6),
ADD COLUMN     "season_label" TEXT,
ADD COLUMN     "season_year" INTEGER,
ADD COLUMN     "status" TEXT DEFAULT 'draft';

-- AlterTable
ALTER TABLE "tenant_kitchen"."prep_lists" ADD COLUMN     "is_active" BOOLEAN DEFAULT true;

-- AlterTable
ALTER TABLE "tenant_kitchen"."prep_tasks" ADD COLUMN     "prep_list_id" UUID,
ADD COLUMN     "station_id" TEXT;

-- AlterTable
ALTER TABLE "tenant_kitchen"."recipe_versions" ADD COLUMN     "approved_at" TIMESTAMPTZ(6),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "published_at" TIMESTAMPTZ(6),
ADD COLUMN     "status" TEXT DEFAULT 'draft';

-- AlterTable
ALTER TABLE "tenant_kitchen"."stations" ADD COLUMN     "current_task_count" INTEGER,
ADD COLUMN     "in_maintenance" BOOLEAN,
ADD COLUMN     "maintenance_reason" TEXT,
ADD COLUMN     "maintenance_start_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_kitchen"."task_claims" ADD COLUMN     "status" TEXT DEFAULT 'active';

-- AlterTable
ALTER TABLE "tenant_kitchen"."task_progress" ADD COLUMN     "progress_pct" DECIMAL(5,2),
ADD COLUMN     "recorded_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_kitchen"."temperature_readings" ADD COLUMN     "within_range" BOOLEAN;

-- AlterTable
ALTER TABLE "tenant_kitchen"."waste_entries" ADD COLUMN     "approved_at" TIMESTAMPTZ(6),
ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "status" TEXT DEFAULT 'logged';

-- AlterTable
ALTER TABLE "tenant_logistics"."delivery_routes" ADD COLUMN     "completed_stops" INTEGER,
ADD COLUMN     "delay_minutes" INTEGER;

-- AlterTable
ALTER TABLE "tenant_staff"."disciplinary_actions" ADD COLUMN     "escalated_at" TIMESTAMPTZ(6),
ADD COLUMN     "escalated_to" UUID,
ADD COLUMN     "escalation_reason" TEXT,
ADD COLUMN     "severity" TEXT DEFAULT 'low';

-- AlterTable
ALTER TABLE "tenant_staff"."employee_availability" ADD COLUMN     "is_suspended" BOOLEAN DEFAULT false,
ADD COLUMN     "reinstated_at" TIMESTAMPTZ(6),
ADD COLUMN     "suspend_reason" TEXT,
ADD COLUMN     "suspended_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tenant_staff"."employee_bank_accounts" ADD COLUMN     "verification_failed_at" TIMESTAMPTZ(6),
ADD COLUMN     "verification_failure_reason" TEXT;

-- AlterTable
ALTER TABLE "tenant_staff"."employee_certifications" ADD COLUMN     "status" TEXT DEFAULT 'active';

-- AlterTable
ALTER TABLE "tenant_staff"."employee_time_off_requests" ADD COLUMN     "balance_snapshot" DECIMAL(6,2),
ADD COLUMN     "balance_unit" TEXT;

-- AlterTable
ALTER TABLE "tenant_staff"."labor_budgets" ADD COLUMN     "approved_at" TIMESTAMPTZ(6),
ADD COLUMN     "approved_by" UUID;

-- AlterTable
ALTER TABLE "tenant_staff"."payroll_line_items" ADD COLUMN     "hours_worked" DECIMAL(6,2) DEFAULT 0,
ADD COLUMN     "total_deductions" DECIMAL(10,2) DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_staff"."payroll_runs" ADD COLUMN     "rejected_by" UUID;

-- AlterTable
ALTER TABLE "tenant_staff"."schedule_shifts" ADD COLUMN     "swap_accepted_at" TIMESTAMPTZ(6),
ADD COLUMN     "swap_offered_at" TIMESTAMPTZ(6),
ADD COLUMN     "swap_offered_to" UUID,
ADD COLUMN     "swap_status" TEXT DEFAULT 'none';

-- AlterTable
ALTER TABLE "tenant_staff"."schedules" ADD COLUMN     "approved_at" TIMESTAMPTZ(6),
ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "tenant_staff"."timecard_approvals" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "tenant_staff"."tip_pools" ADD COLUMN     "distributed_amount" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "distributed_at" TIMESTAMPTZ(6),
ADD COLUMN     "distributed_by" UUID,
ADD COLUMN     "status" TEXT DEFAULT 'open';

-- AlterTable
ALTER TABLE "tenant_staff"."training_assignments" ADD COLUMN     "attempt_count" INTEGER,
ADD COLUMN     "completed_at" TIMESTAMPTZ(6),
ADD COLUMN     "due_date_review_needed" BOOLEAN,
ADD COLUMN     "first_shift_at" TIMESTAMPTZ(6),
ADD COLUMN     "last_attempt_id" TEXT,
ADD COLUMN     "last_score_percent" INTEGER,
ADD COLUMN     "manager_review_required" BOOLEAN,
ADD COLUMN     "max_attempts" INTEGER,
ADD COLUMN     "module_code" TEXT,
ADD COLUMN     "module_title" TEXT,
ADD COLUMN     "pass_threshold_percent" INTEGER,
ADD COLUMN     "reminder_sent_at" TIMESTAMPTZ(6),
ADD COLUMN     "staff_role" TEXT,
ADD COLUMN     "started_at" TIMESTAMPTZ(6),
ADD COLUMN     "waived_at" TIMESTAMPTZ(6),
ADD COLUMN     "waiver_approved_by" TEXT,
ADD COLUMN     "waiver_reason" TEXT;

-- AlterTable
ALTER TABLE "tenant_staff"."training_modules" ADD COLUMN     "archived_at" TIMESTAMPTZ(6),
ADD COLUMN     "code" TEXT,
ADD COLUMN     "max_attempts" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "pass_threshold_percent" INTEGER,
ADD COLUMN     "published_at" TIMESTAMPTZ(6),
ADD COLUMN     "required_role" TEXT,
ADD COLUMN     "status" TEXT DEFAULT 'draft',
ADD COLUMN     "version" INTEGER DEFAULT 1;
