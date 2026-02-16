Loaded Prisma config from prisma.config.ts.

-- DropForeignKey
ALTER TABLE "tenant"."documents" DROP CONSTRAINT "fk_documents_battle_board";

-- DropForeignKey
ALTER TABLE "tenant"."documents" DROP CONSTRAINT "fk_documents_event";

-- DropForeignKey
ALTER TABLE "tenant_admin"."notifications" DROP CONSTRAINT "fk_notifications_recipient";

-- DropForeignKey
ALTER TABLE "tenant_admin"."report_history" DROP CONSTRAINT "fk_report_history_generated_by";

-- DropForeignKey
ALTER TABLE "tenant_admin"."report_history" DROP CONSTRAINT "fk_report_history_report";

-- DropForeignKey
ALTER TABLE "tenant_admin"."report_history" DROP CONSTRAINT "fk_report_history_schedule";

-- DropForeignKey
ALTER TABLE "tenant_admin"."report_schedules" DROP CONSTRAINT "fk_report_schedules_report";

-- DropForeignKey
ALTER TABLE "tenant_admin"."reports" DROP CONSTRAINT "fk_reports_created_by";

-- DropForeignKey
ALTER TABLE "tenant_admin"."workflow_executions" DROP CONSTRAINT "fk_workflow_executions_step";

-- DropForeignKey
ALTER TABLE "tenant_admin"."workflow_executions" DROP CONSTRAINT "fk_workflow_executions_triggered_by";

-- DropForeignKey
ALTER TABLE "tenant_admin"."workflow_executions" DROP CONSTRAINT "fk_workflow_executions_workflow";

-- DropForeignKey
ALTER TABLE "tenant_admin"."workflow_steps" DROP CONSTRAINT "fk_workflow_steps_failure";

-- DropForeignKey
ALTER TABLE "tenant_admin"."workflow_steps" DROP CONSTRAINT "fk_workflow_steps_success";

-- DropForeignKey
ALTER TABLE "tenant_admin"."workflow_steps" DROP CONSTRAINT "fk_workflow_steps_workflow";

-- DropForeignKey
ALTER TABLE "tenant_crm"."client_contacts" DROP CONSTRAINT "fk_client_contacts_client";

-- DropForeignKey
ALTER TABLE "tenant_crm"."client_interactions" DROP CONSTRAINT "fk_client_interactions_client";

-- DropForeignKey
ALTER TABLE "tenant_crm"."client_interactions" DROP CONSTRAINT "fk_client_interactions_employee";

-- DropForeignKey
ALTER TABLE "tenant_crm"."client_interactions" DROP CONSTRAINT "fk_client_interactions_lead";

-- DropForeignKey
ALTER TABLE "tenant_crm"."client_preferences" DROP CONSTRAINT "fk_client_preferences_client";

-- DropForeignKey
ALTER TABLE "tenant_crm"."clients" DROP CONSTRAINT "fk_clients_assigned_to";

-- DropForeignKey
ALTER TABLE "tenant_crm"."leads" DROP CONSTRAINT "fk_leads_assigned_to";

-- DropForeignKey
ALTER TABLE "tenant_crm"."leads" DROP CONSTRAINT "fk_leads_converted_client";

-- DropForeignKey
ALTER TABLE "tenant_crm"."proposal_line_items" DROP CONSTRAINT "fk_proposal_line_items_proposal";

-- DropForeignKey
ALTER TABLE "tenant_crm"."proposals" DROP CONSTRAINT "fk_proposals_client";

-- DropForeignKey
ALTER TABLE "tenant_crm"."proposals" DROP CONSTRAINT "fk_proposals_event";

-- DropForeignKey
ALTER TABLE "tenant_crm"."proposals" DROP CONSTRAINT "fk_proposals_lead";

-- DropForeignKey
ALTER TABLE "tenant_events"."battle_boards" DROP CONSTRAINT "fk_battle_boards_event";

-- DropForeignKey
ALTER TABLE "tenant_events"."budget_line_items" DROP CONSTRAINT "budget_line_items_tenant_id_budget_id_foreign";

-- DropForeignKey
ALTER TABLE "tenant_events"."budget_line_items" DROP CONSTRAINT "budget_line_items_tenant_id_foreign";

-- DropForeignKey
ALTER TABLE "tenant_events"."budget_line_items" DROP CONSTRAINT "fk_budget_line_items_budget";

-- DropForeignKey
ALTER TABLE "tenant_events"."catering_orders" DROP CONSTRAINT "fk_catering_orders_customer";

-- DropForeignKey
ALTER TABLE "tenant_events"."catering_orders" DROP CONSTRAINT "fk_catering_orders_event";

-- DropForeignKey
ALTER TABLE "tenant_events"."command_board_cards" DROP CONSTRAINT "fk_command_board_cards_board";

-- DropForeignKey
ALTER TABLE "tenant_events"."command_boards" DROP CONSTRAINT "fk_command_boards_event";

-- DropForeignKey
ALTER TABLE "tenant_events"."contract_signatures" DROP CONSTRAINT "fk_contract_signatures_contract";

-- DropForeignKey
ALTER TABLE "tenant_events"."event_budgets" DROP CONSTRAINT "event_budgets_event_tenant_id_event_id_foreign";

-- DropForeignKey
ALTER TABLE "tenant_events"."event_budgets" DROP CONSTRAINT "event_budgets_tenant_id_foreign";

-- DropForeignKey
ALTER TABLE "tenant_events"."event_budgets" DROP CONSTRAINT "fk_event_budgets_event";

-- DropForeignKey
ALTER TABLE "tenant_events"."event_contracts" DROP CONSTRAINT "fk_event_contracts_client";

-- DropForeignKey
ALTER TABLE "tenant_events"."event_contracts" DROP CONSTRAINT "fk_event_contracts_event";

-- DropForeignKey
ALTER TABLE "tenant_events"."event_dishes" DROP CONSTRAINT "fk_event_dishes_dish";

-- DropForeignKey
ALTER TABLE "tenant_events"."event_dishes" DROP CONSTRAINT "fk_event_dishes_event";

-- DropForeignKey
ALTER TABLE "tenant_events"."event_guests" DROP CONSTRAINT "fk_event_guests_event";

-- DropForeignKey
ALTER TABLE "tenant_events"."event_imports" DROP CONSTRAINT "fk_event_imports_event";

-- DropForeignKey
ALTER TABLE "tenant_events"."event_profitability" DROP CONSTRAINT "fk_event_profitability_event";

-- DropForeignKey
ALTER TABLE "tenant_events"."event_staff_assignments" DROP CONSTRAINT "fk_event_staff_assignments_employee";

-- DropForeignKey
ALTER TABLE "tenant_events"."event_staff_assignments" DROP CONSTRAINT "fk_event_staff_assignments_event";

-- DropForeignKey
ALTER TABLE "tenant_events"."event_summaries" DROP CONSTRAINT "fk_event_summaries_event";

-- DropForeignKey
ALTER TABLE "tenant_events"."event_timeline" DROP CONSTRAINT "fk_event_timeline_event";

-- DropForeignKey
ALTER TABLE "tenant_events"."events" DROP CONSTRAINT "fk_events_assigned_to";

-- DropForeignKey
ALTER TABLE "tenant_events"."events" DROP CONSTRAINT "fk_events_client";

-- DropForeignKey
ALTER TABLE "tenant_events"."events" DROP CONSTRAINT "fk_events_location";

-- DropForeignKey
ALTER TABLE "tenant_events"."events" DROP CONSTRAINT "fk_events_venue";

-- DropForeignKey
ALTER TABLE "tenant_events"."timeline_tasks" DROP CONSTRAINT "fk_timeline_tasks_assignee";

-- DropForeignKey
ALTER TABLE "tenant_events"."timeline_tasks" DROP CONSTRAINT "fk_timeline_tasks_event";

-- DropForeignKey
ALTER TABLE "tenant_inventory"."inventory_alerts" DROP CONSTRAINT "fk_inventory_alerts_item";

-- DropForeignKey
ALTER TABLE "tenant_inventory"."inventory_stock" DROP CONSTRAINT "fk_inventory_stock_item";

-- DropForeignKey
ALTER TABLE "tenant_inventory"."inventory_stock" DROP CONSTRAINT "fk_inventory_stock_location";

-- DropForeignKey
ALTER TABLE "tenant_inventory"."inventory_transactions" DROP CONSTRAINT "fk_inventory_transactions_item";

-- DropForeignKey
ALTER TABLE "tenant_inventory"."inventory_transactions" DROP CONSTRAINT "fk_inventory_transactions_location";

-- DropForeignKey
ALTER TABLE "tenant_inventory"."purchase_order_items" DROP CONSTRAINT "fk_purchase_order_items_item";

-- DropForeignKey
ALTER TABLE "tenant_inventory"."purchase_order_items" DROP CONSTRAINT "fk_purchase_order_items_po";

-- DropForeignKey
ALTER TABLE "tenant_inventory"."purchase_orders" DROP CONSTRAINT "fk_purchase_orders_location";

-- DropForeignKey
ALTER TABLE "tenant_inventory"."purchase_orders" DROP CONSTRAINT "fk_purchase_orders_vendor";

-- DropForeignKey
ALTER TABLE "tenant_inventory"."shipment_items" DROP CONSTRAINT "fk_shipment_items_item";

-- DropForeignKey
ALTER TABLE "tenant_inventory"."shipment_items" DROP CONSTRAINT "fk_shipment_items_shipment";

-- DropForeignKey
ALTER TABLE "tenant_inventory"."shipments" DROP CONSTRAINT "fk_shipments_event";

-- DropForeignKey
ALTER TABLE "tenant_inventory"."shipments" DROP CONSTRAINT "fk_shipments_location";

-- DropForeignKey
ALTER TABLE "tenant_inventory"."shipments" DROP CONSTRAINT "fk_shipments_supplier";

-- DropForeignKey
ALTER TABLE "tenant_inventory"."storage_locations" DROP CONSTRAINT "fk_storage_locations_location";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."allergen_warnings" DROP CONSTRAINT "fk_allergen_warnings_acknowledged_by";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."allergen_warnings" DROP CONSTRAINT "fk_allergen_warnings_dish";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."allergen_warnings" DROP CONSTRAINT "fk_allergen_warnings_event";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."containers" DROP CONSTRAINT "fk_containers_location";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."dishes" DROP CONSTRAINT "fk_dishes_container";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."dishes" DROP CONSTRAINT "fk_dishes_recipe";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."menu_dishes" DROP CONSTRAINT "fk_menu_dishes_dish";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."menu_dishes" DROP CONSTRAINT "fk_menu_dishes_menu";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."prep_comments" DROP CONSTRAINT "fk_prep_comments_employee";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."prep_comments" DROP CONSTRAINT "fk_prep_comments_resolved_by";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."prep_comments" DROP CONSTRAINT "fk_prep_comments_task";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."prep_list_items" DROP CONSTRAINT "fk_prep_list_items_completed_by";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."prep_list_items" DROP CONSTRAINT "fk_prep_list_items_dish";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."prep_list_items" DROP CONSTRAINT "fk_prep_list_items_ingredient";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."prep_list_items" DROP CONSTRAINT "fk_prep_list_items_list";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."prep_list_items" DROP CONSTRAINT "fk_prep_list_items_recipe_version";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."prep_lists" DROP CONSTRAINT "fk_prep_lists_event";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."prep_tasks" DROP CONSTRAINT "fk_prep_tasks_container";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."prep_tasks" DROP CONSTRAINT "fk_prep_tasks_dish";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."prep_tasks" DROP CONSTRAINT "fk_prep_tasks_event";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."prep_tasks" DROP CONSTRAINT "fk_prep_tasks_import";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."prep_tasks" DROP CONSTRAINT "fk_prep_tasks_location";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."prep_tasks" DROP CONSTRAINT "fk_prep_tasks_method";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."prep_tasks" DROP CONSTRAINT "fk_prep_tasks_recipe_version";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."recipe_ingredients" DROP CONSTRAINT "fk_recipe_ingredients_ingredient";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."recipe_ingredients" DROP CONSTRAINT "fk_recipe_ingredients_version";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."recipe_steps" DROP CONSTRAINT "fk_recipe_steps_version";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."recipe_versions" DROP CONSTRAINT "fk_recipe_versions_locked_by";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."recipe_versions" DROP CONSTRAINT "fk_recipe_versions_recipe";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."task_bundle_items" DROP CONSTRAINT "fk_task_bundle_items_bundle";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."task_bundle_items" DROP CONSTRAINT "fk_task_bundle_items_task";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."task_bundles" DROP CONSTRAINT "fk_task_bundles_event";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."task_claims" DROP CONSTRAINT "fk_task_claims_employee";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."task_claims" DROP CONSTRAINT "fk_task_claims_task";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."task_progress" DROP CONSTRAINT "fk_task_progress_employee";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."task_progress" DROP CONSTRAINT "fk_task_progress_task";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."waste_entries" DROP CONSTRAINT "fk_waste_entries_event";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."waste_entries" DROP CONSTRAINT "fk_waste_entries_item";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."waste_entries" DROP CONSTRAINT "fk_waste_entries_location";

-- DropForeignKey
ALTER TABLE "tenant_kitchen"."waste_entries" DROP CONSTRAINT "fk_waste_entries_logged_by";

-- DropForeignKey
ALTER TABLE "tenant_staff"."budget_alerts" DROP CONSTRAINT "budget_alerts_tenant_id_budget_id_foreign";

-- DropForeignKey
ALTER TABLE "tenant_staff"."budget_alerts" DROP CONSTRAINT "budget_alerts_tenant_id_foreign";

-- DropForeignKey
ALTER TABLE "tenant_staff"."budget_alerts" DROP CONSTRAINT "fk_budget_alerts_acknowledged_by";

-- DropForeignKey
ALTER TABLE "tenant_staff"."budget_alerts" DROP CONSTRAINT "fk_budget_alerts_budget";

-- DropForeignKey
ALTER TABLE "tenant_staff"."employee_availability" DROP CONSTRAINT "fk_employee_availability_employee";

-- DropForeignKey
ALTER TABLE "tenant_staff"."employee_certifications" DROP CONSTRAINT "fk_employee_certifications_employee";

-- DropForeignKey
ALTER TABLE "tenant_staff"."employee_locations" DROP CONSTRAINT "fk_employee_locations_employee";

-- DropForeignKey
ALTER TABLE "tenant_staff"."employee_locations" DROP CONSTRAINT "fk_employee_locations_location";

-- DropForeignKey
ALTER TABLE "tenant_staff"."employee_seniority" DROP CONSTRAINT "fk_employee_seniority_employee";

-- DropForeignKey
ALTER TABLE "tenant_staff"."employee_skills" DROP CONSTRAINT "fk_employee_skills_employee";

-- DropForeignKey
ALTER TABLE "tenant_staff"."employee_skills" DROP CONSTRAINT "fk_employee_skills_skill";

-- DropForeignKey
ALTER TABLE "tenant_staff"."employee_skills" DROP CONSTRAINT "fk_employee_skills_verified_by";

-- DropForeignKey
ALTER TABLE "tenant_staff"."labor_budgets" DROP CONSTRAINT "fk_labor_budgets_event";

-- DropForeignKey
ALTER TABLE "tenant_staff"."labor_budgets" DROP CONSTRAINT "fk_labor_budgets_location";

-- DropForeignKey
ALTER TABLE "tenant_staff"."open_shifts" DROP CONSTRAINT "fk_open_shifts_assigned_shift";

-- DropForeignKey
ALTER TABLE "tenant_staff"."open_shifts" DROP CONSTRAINT "fk_open_shifts_claimed_by";

-- DropForeignKey
ALTER TABLE "tenant_staff"."open_shifts" DROP CONSTRAINT "fk_open_shifts_location";

-- DropForeignKey
ALTER TABLE "tenant_staff"."open_shifts" DROP CONSTRAINT "fk_open_shifts_schedule";

-- DropForeignKey
ALTER TABLE "tenant_staff"."payroll_line_items" DROP CONSTRAINT "fk_payroll_line_items_employee";

-- DropForeignKey
ALTER TABLE "tenant_staff"."payroll_line_items" DROP CONSTRAINT "fk_payroll_line_items_run";

-- DropForeignKey
ALTER TABLE "tenant_staff"."payroll_runs" DROP CONSTRAINT "fk_payroll_runs_approved_by";

-- DropForeignKey
ALTER TABLE "tenant_staff"."payroll_runs" DROP CONSTRAINT "fk_payroll_runs_period";

-- DropForeignKey
ALTER TABLE "tenant_staff"."schedule_shifts" DROP CONSTRAINT "fk_schedule_shifts_employee";

-- DropForeignKey
ALTER TABLE "tenant_staff"."schedule_shifts" DROP CONSTRAINT "fk_schedule_shifts_location";

-- DropForeignKey
ALTER TABLE "tenant_staff"."schedule_shifts" DROP CONSTRAINT "fk_schedule_shifts_schedule";

-- DropForeignKey
ALTER TABLE "tenant_staff"."schedules" DROP CONSTRAINT "fk_schedules_location";

-- DropForeignKey
ALTER TABLE "tenant_staff"."schedules" DROP CONSTRAINT "fk_schedules_published_by";

-- DropForeignKey
ALTER TABLE "tenant_staff"."time_entries" DROP CONSTRAINT "fk_time_entries_approved_by";

-- DropForeignKey
ALTER TABLE "tenant_staff"."time_entries" DROP CONSTRAINT "fk_time_entries_employee";

-- DropForeignKey
ALTER TABLE "tenant_staff"."time_entries" DROP CONSTRAINT "fk_time_entries_location";

-- DropForeignKey
ALTER TABLE "tenant_staff"."time_entries" DROP CONSTRAINT "fk_time_entries_shift";

-- DropForeignKey
ALTER TABLE "tenant_staff"."timecard_edit_requests" DROP CONSTRAINT "fk_timecard_edit_requests_employee";

-- DropForeignKey
ALTER TABLE "tenant_staff"."timecard_edit_requests" DROP CONSTRAINT "fk_timecard_edit_requests_entry";

-- AlterTable
ALTER TABLE "tenant_kitchen"."recipe_versions" ADD COLUMN     "instructions" TEXT;

