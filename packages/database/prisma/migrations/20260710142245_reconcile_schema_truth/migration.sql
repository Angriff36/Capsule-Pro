/*
  Warnings:

  - The primary key for the `documents` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `battle_board_id` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `event_id` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `file_name` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `file_size` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `file_type` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `parse_error` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `parse_status` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `parsed_at` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `parsed_data` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `storage_path` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `knowledge_base_entries` table. All the data in the column will be lost.
  - You are about to drop the column `equipment_list` on the `venues` table. All the data in the column will be lost.
  - You are about to drop the column `preferred_vendors` on the `venues` table. All the data in the column will be lost.
  - The `account_type` column on the `chart_of_accounts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `contacted_at` on the `collection_actions` table. All the data in the column will be lost.
  - You are about to drop the column `clientTenantId` on the `collection_cases` table. All the data in the column will be lost.
  - You are about to drop the column `eventTenantId` on the `collection_cases` table. All the data in the column will be lost.
  - The `status` column on the `collection_cases` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `priority` column on the `collection_cases` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `dunning_stage` column on the `collection_cases` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `frequency_days` on the `collection_payment_plans` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `versionAt` on the `invoices` table. All the data in the column will be lost.
  - The `invoice_type` column on the `invoices` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `invoices` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `deposit_percentage` on the `invoices` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to drop the column `failure_reason` on the `payment_refund_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `original_gateway_transaction_id` on the `payment_refund_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `refund_transaction_id` on the `payment_refund_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `versionAt` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `last_read_at` on the `admin_chat_participants` table. All the data in the column will be lost.
  - The `template_type` column on the `email_templates` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `trigger_type` column on the `email_workflows` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `is_system` on the `reports` table. All the data in the column will be lost.
  - The `trigger_type` column on the `sms_automation_rules` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `recipient_type` column on the `sms_automation_rules` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `annotation_type` on the `board_annotations` table. All the data in the column will be lost.
  - You are about to drop the column `from_projection_id` on the `board_annotations` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `board_annotations` table. All the data in the column will be lost.
  - You are about to drop the column `style` on the `board_annotations` table. All the data in the column will be lost.
  - You are about to drop the column `to_projection_id` on the `board_annotations` table. All the data in the column will be lost.
  - You are about to drop the column `collapsed` on the `board_projections` table. All the data in the column will be lost.
  - You are about to drop the column `color_override` on the `board_projections` table. All the data in the column will be lost.
  - You are about to drop the column `group_id` on the `board_projections` table. All the data in the column will be lost.
  - You are about to drop the column `pinned` on the `board_projections` table. All the data in the column will be lost.
  - You are about to drop the column `z_index` on the `board_projections` table. All the data in the column will be lost.
  - The `entity_type` column on the `board_projections` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `version` on the `catering_orders` table. All the data in the column will be lost.
  - You are about to drop the column `versionAt` on the `catering_orders` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `event_guests` table. All the data in the column will be lost.
  - You are about to drop the column `versionAt` on the `event_guests` table. All the data in the column will be lost.
  - You are about to drop the column `battle_board_id` on the `event_imports` table. All the data in the column will be lost.
  - You are about to drop the column `blob_url` on the `event_imports` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `event_imports` table. All the data in the column will be lost.
  - You are about to drop the column `report_id` on the `event_imports` table. All the data in the column will be lost.
  - You are about to drop the column `actual_gross_margin_pct` on the `event_profitability` table. All the data in the column will be lost.
  - You are about to drop the column `budgeted_gross_margin_pct` on the `event_profitability` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `versionAt` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `historical_usage` on the `forecast_inputs` table. All the data in the column will be lost.
  - You are about to drop the column `seasonality_factors` on the `forecast_inputs` table. All the data in the column will be lost.
  - You are about to alter the column `threshold_value` on the `inventory_alerts` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,3)` to `Decimal(12,2)`.
  - You are about to drop the column `accuracy_tracked` on the `inventory_forecasts` table. All the data in the column will be lost.
  - You are about to drop the column `actual_depletion_date` on the `inventory_forecasts` table. All the data in the column will be lost.
  - You are about to drop the column `error_days` on the `inventory_forecasts` table. All the data in the column will be lost.
  - You are about to drop the column `forecast` on the `inventory_forecasts` table. All the data in the column will be lost.
  - You are about to drop the column `horizon_days` on the `inventory_forecasts` table. All the data in the column will be lost.
  - You are about to drop the column `last_updated` on the `inventory_forecasts` table. All the data in the column will be lost.
  - You are about to drop the column `lower_bound` on the `inventory_forecasts` table. All the data in the column will be lost.
  - You are about to drop the column `upper_bound` on the `inventory_forecasts` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `inventory_items` table. All the data in the column will be lost.
  - You are about to drop the column `versionAt` on the `inventory_items` table. All the data in the column will be lost.
  - You are about to drop the column `last_counted_by` on the `inventory_stock` table. All the data in the column will be lost.
  - You are about to drop the column `connector_credentials` on the `inventory_suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `connector_type` on the `inventory_suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `received_quantity` on the `inventory_transfer_items` table. All the data in the column will be lost.
  - You are about to drop the column `approved_at` on the `inventory_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `transfer_number` on the `inventory_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `justification` on the `reorder_suggestions` table. All the data in the column will be lost.
  - You are about to drop the column `lead_time_days` on the `reorder_suggestions` table. All the data in the column will be lost.
  - You are about to drop the column `recommended_order_qty` on the `reorder_suggestions` table. All the data in the column will be lost.
  - You are about to drop the column `reorder_point` on the `reorder_suggestions` table. All the data in the column will be lost.
  - You are about to drop the column `safety_stock` on the `reorder_suggestions` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `vendor_contracts` table. All the data in the column will be lost.
  - You are about to drop the column `versionAt` on the `vendor_contracts` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `bulk_combine_rules` table. All the data in the column will be lost.
  - You are about to drop the column `is_automatic` on the `bulk_combine_rules` table. All the data in the column will be lost.
  - You are about to drop the column `escalated_at` on the `corrective_actions` table. All the data in the column will be lost.
  - You are about to drop the column `escalated_to` on the `corrective_actions` table. All the data in the column will be lost.
  - You are about to drop the column `escalation_reason` on the `corrective_actions` table. All the data in the column will be lost.
  - You are about to drop the column `related_check_id` on the `corrective_actions` table. All the data in the column will be lost.
  - You are about to drop the column `related_temp_log_id` on the `corrective_actions` table. All the data in the column will be lost.
  - You are about to drop the column `current_sensor_data` on the `equipment` table. All the data in the column will be lost.
  - You are about to drop the column `iot_device_type` on the `equipment` table. All the data in the column will be lost.
  - You are about to drop the column `last_heartbeat` on the `equipment` table. All the data in the column will be lost.
  - You are about to drop the column `threshold` on the `iot_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `is_template` on the `menus` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `method_videos` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `method_videos` table. All the data in the column will be lost.
  - You are about to drop the column `method_id` on the `method_videos` table. All the data in the column will be lost.
  - You are about to drop the column `sort_order` on the `method_videos` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail_url` on the `method_videos` table. All the data in the column will be lost.
  - You are about to drop the column `video_url` on the `method_videos` table. All the data in the column will be lost.
  - You are about to drop the column `external_id` on the `prep_list_imports` table. All the data in the column will be lost.
  - You are about to drop the column `import_metadata` on the `prep_list_imports` table. All the data in the column will be lost.
  - You are about to drop the column `imported_by` on the `prep_list_imports` table. All the data in the column will be lost.
  - You are about to drop the column `source_system` on the `prep_list_imports` table. All the data in the column will be lost.
  - You are about to drop the column `container_id` on the `prep_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `import_id` on the `prep_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `method_id` on the `prep_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `recipe_version_id` on the `prep_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `quality_check_items` table. All the data in the column will be lost.
  - You are about to drop the column `assigned_to` on the `quality_checks` table. All the data in the column will be lost.
  - You are about to drop the column `adjusted_quantity` on the `recipe_ingredients` table. All the data in the column will be lost.
  - You are about to drop the column `cost_calculated_at` on the `recipe_ingredients` table. All the data in the column will be lost.
  - You are about to drop the column `is_locked` on the `recipe_versions` table. All the data in the column will be lost.
  - You are about to drop the column `locked_at` on the `recipe_versions` table. All the data in the column will be lost.
  - You are about to drop the column `locked_by` on the `recipe_versions` table. All the data in the column will be lost.
  - The primary key for the `task_bundle_items` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `bundle_id` on the `task_bundle_items` table. All the data in the column will be lost.
  - You are about to drop the column `task_id` on the `task_bundle_items` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `task_bundles` table. All the data in the column will be lost.
  - You are about to drop the column `is_template` on the `task_bundles` table. All the data in the column will be lost.
  - You are about to drop the column `quantity_completed` on the `task_progress` table. All the data in the column will be lost.
  - You are about to drop the column `corrective_action` on the `temperature_logs` table. All the data in the column will be lost.
  - You are about to drop the column `target_temp` on the `temperature_logs` table. All the data in the column will be lost.
  - You are about to drop the column `area_id` on the `temperature_probes` table. All the data in the column will be lost.
  - You are about to drop the column `battery_level` on the `temperature_probes` table. All the data in the column will be lost.
  - You are about to drop the column `calibration_interval_days` on the `temperature_probes` table. All the data in the column will be lost.
  - You are about to drop the column `last_reading` on the `temperature_probes` table. All the data in the column will be lost.
  - You are about to drop the column `last_reading_at` on the `temperature_probes` table. All the data in the column will be lost.
  - You are about to drop the column `next_calibration` on the `temperature_probes` table. All the data in the column will be lost.
  - You are about to drop the column `probe_type` on the `temperature_probes` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `temperature_probes` table. All the data in the column will be lost.
  - You are about to drop the column `battery_level` on the `temperature_readings` table. All the data in the column will be lost.
  - You are about to drop the column `signal_strength` on the `temperature_readings` table. All the data in the column will be lost.
  - You are about to drop the column `actual_cost` on the `work_orders` table. All the data in the column will be lost.
  - You are about to drop the column `estimated_cost` on the `work_orders` table. All the data in the column will be lost.
  - You are about to drop the column `parts_used` on the `work_orders` table. All the data in the column will be lost.
  - You are about to drop the column `vendor_id` on the `work_orders` table. All the data in the column will be lost.
  - You are about to drop the column `actual_distance` on the `delivery_routes` table. All the data in the column will be lost.
  - You are about to drop the column `actual_end_time` on the `delivery_routes` table. All the data in the column will be lost.
  - You are about to drop the column `actual_start_time` on the `delivery_routes` table. All the data in the column will be lost.
  - You are about to drop the column `completed_stops` on the `delivery_routes` table. All the data in the column will be lost.
  - You are about to drop the column `delay_minutes` on the `delivery_routes` table. All the data in the column will be lost.
  - You are about to drop the column `end_time` on the `delivery_routes` table. All the data in the column will be lost.
  - You are about to drop the column `optimization_algorithm` on the `delivery_routes` table. All the data in the column will be lost.
  - You are about to drop the column `optimization_score` on the `delivery_routes` table. All the data in the column will be lost.
  - You are about to drop the column `start_time` on the `delivery_routes` table. All the data in the column will be lost.
  - You are about to drop the column `actual_departure` on the `route_stops` table. All the data in the column will be lost.
  - You are about to drop the column `country_code` on the `route_stops` table. All the data in the column will be lost.
  - You are about to drop the column `distance_from_previous` on the `route_stops` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `route_stops` table. All the data in the column will be lost.
  - You are about to drop the column `location_id` on the `route_stops` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `route_stops` table. All the data in the column will be lost.
  - You are about to drop the column `planned_duration` on the `route_stops` table. All the data in the column will be lost.
  - You are about to drop the column `state_province` on the `route_stops` table. All the data in the column will be lost.
  - You are about to drop the column `stopType` on the `route_stops` table. All the data in the column will be lost.
  - You are about to drop the column `time_from_previous` on the `route_stops` table. All the data in the column will be lost.
  - You are about to drop the column `venue_id` on the `route_stops` table. All the data in the column will be lost.
  - You are about to drop the column `closed_at` on the `disciplinary_actions` table. All the data in the column will be lost.
  - You are about to drop the column `closed_by` on the `disciplinary_actions` table. All the data in the column will be lost.
  - You are about to drop the column `end_date` on the `disciplinary_actions` table. All the data in the column will be lost.
  - You are about to drop the column `improvement_plan` on the `disciplinary_actions` table. All the data in the column will be lost.
  - You are about to drop the column `outcome` on the `disciplinary_actions` table. All the data in the column will be lost.
  - You are about to drop the column `hours` on the `employee_time_off_requests` table. All the data in the column will be lost.
  - You are about to drop the column `department_id` on the `employees` table. All the data in the column will be lost.
  - The `employment_type` column on the `employees` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `threshold_100_pct` on the `labor_budgets` table. All the data in the column will be lost.
  - You are about to drop the column `threshold_80_pct` on the `labor_budgets` table. All the data in the column will be lost.
  - You are about to drop the column `threshold_90_pct` on the `labor_budgets` table. All the data in the column will be lost.
  - You are about to drop the column `document_url` on the `onboarding_completions` table. All the data in the column will be lost.
  - You are about to drop the column `signature_data` on the `onboarding_completions` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `onboarding_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `assigned_shift_id` on the `open_shifts` table. All the data in the column will be lost.
  - You are about to drop the column `claimed_at` on the `open_shifts` table. All the data in the column will be lost.
  - You are about to drop the column `location_id` on the `open_shifts` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `open_shifts` table. All the data in the column will be lost.
  - You are about to drop the column `areas_for_improvement` on the `performance_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `employee_comments` on the `performance_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `goals_next_period` on the `performance_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `manager_comments` on the `performance_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `schedule_shifts` table. All the data in the column will be lost.
  - You are about to drop the column `versionAt` on the `schedule_shifts` table. All the data in the column will be lost.
  - You are about to drop the column `reject_reason` on the `timecard_approvals` table. All the data in the column will be lost.
  - You are about to drop the column `reviewed_at` on the `timecard_approvals` table. All the data in the column will be lost.
  - You are about to drop the column `reviewed_by` on the `timecard_approvals` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "platform"."api_keys_tenant_id_name_key";

-- DropIndex
DROP INDEX "tenant"."documents_tenant_id_id_key";

-- DropIndex
DROP INDEX "tenant"."knowledge_base_entries_slug_key";

-- DropIndex
DROP INDEX "tenant"."knowledge_base_entries_tenant_id_slug_key";

-- DropIndex
DROP INDEX "tenant"."venues_id_key";

-- DropIndex
DROP INDEX "tenant"."venues_tenant_id_id_key";

-- DropIndex
DROP INDEX "tenant_accounting"."chart_of_accounts_account_number_key";

-- DropIndex
DROP INDEX "tenant_accounting"."chart_of_accounts_id_key";

-- DropIndex
DROP INDEX "tenant_accounting"."collection_actions_id_key";

-- DropIndex
DROP INDEX "tenant_accounting"."collection_cases_id_key";

-- DropIndex
DROP INDEX "tenant_accounting"."collection_payment_plans_id_key";

-- DropIndex
DROP INDEX "tenant_accounting"."invoices_id_key";

-- DropIndex
DROP INDEX "tenant_accounting"."invoices_invoice_number_key";

-- DropIndex
DROP INDEX "tenant_accounting"."payment_methods_id_key";

-- DropIndex
DROP INDEX "tenant_accounting"."payment_refund_attempts_id_key";

-- DropIndex
DROP INDEX "tenant_accounting"."payment_refund_attempts_tenant_id_created_at_idx";

-- DropIndex
DROP INDEX "tenant_accounting"."revenue_recognition_lines_id_key";

-- DropIndex
DROP INDEX "tenant_accounting"."revenue_recognition_schedules_id_key";

-- DropIndex
DROP INDEX "tenant_admin"."admin_chat_message_active_idx";

-- DropIndex
DROP INDEX "tenant_admin"."admin_chat_message_author_idx";

-- DropIndex
DROP INDEX "tenant_admin"."admin_chat_message_thread_created_idx";

-- DropIndex
DROP INDEX "tenant_admin"."admin_chat_participant_archived_idx";

-- DropIndex
DROP INDEX "tenant_admin"."admin_chat_participant_thread_idx";

-- DropIndex
DROP INDEX "tenant_admin"."admin_chat_participant_unique";

-- DropIndex
DROP INDEX "tenant_admin"."admin_chat_participant_user_idx";

-- DropIndex
DROP INDEX "tenant_admin"."admin_chat_thread_direct_key_unique";

-- DropIndex
DROP INDEX "tenant_admin"."admin_chat_thread_last_message_idx";

-- DropIndex
DROP INDEX "tenant_admin"."admin_chat_thread_slug_unique";

-- DropIndex
DROP INDEX "tenant_admin"."admin_chat_thread_type_idx";

-- DropIndex
DROP INDEX "tenant_admin"."admin_task_attachments_task_idx";

-- DropIndex
DROP INDEX "tenant_admin"."admin_task_comments_task_idx";

-- DropIndex
DROP INDEX "tenant_admin"."admin_task_dev_meta_task_unique";

-- DropIndex
DROP INDEX "tenant_admin"."admin_task_file_refs_task_idx";

-- DropIndex
DROP INDEX "tenant_admin"."admin_tasks_due_idx";

-- DropIndex
DROP INDEX "tenant_admin"."admin_tasks_status_idx";

-- DropIndex
DROP INDEX "tenant_admin"."admin_tasks_status_position_idx";

-- DropIndex
DROP INDEX "tenant_admin"."admin_tasks_tenant_idx";

-- DropIndex
DROP INDEX "tenant_admin"."board_configs_tenant_idx";

-- DropIndex
DROP INDEX "tenant_admin"."notifications_created_at_idx";

-- DropIndex
DROP INDEX "tenant_admin"."notifications_recipient_read_idx";

-- DropIndex
DROP INDEX "tenant_admin"."rate_limit_configs_tenant_id_name_key";

-- DropIndex
DROP INDEX "tenant_admin"."workflows_tenant_idx";

-- DropIndex
DROP INDEX "tenant_crm"."call_planning_sessions_status_idx";

-- DropIndex
DROP INDEX "tenant_crm"."call_planning_sessions_user_idx";

-- DropIndex
DROP INDEX "tenant_crm"."client_interactions_employee_idx";

-- DropIndex
DROP INDEX "tenant_crm"."clients_tags_idx";

-- DropIndex
DROP INDEX "tenant_crm"."crm_scoring_rules_tenant_active_priority_idx";

-- DropIndex
DROP INDEX "tenant_crm"."event_planning_drafts_session_idx";

-- DropIndex
DROP INDEX "tenant_crm"."event_planning_drafts_status_idx";

-- DropIndex
DROP INDEX "tenant_crm"."proposal_drafts_draft_idx";

-- DropIndex
DROP INDEX "tenant_crm"."proposal_drafts_magic_token_key";

-- DropIndex
DROP INDEX "tenant_crm"."proposal_drafts_status_idx";

-- DropIndex
DROP INDEX "tenant_crm"."proposal_templates_id_key";

-- DropIndex
DROP INDEX "tenant_crm"."proposal_templates_tenant_id_id_key";

-- DropIndex
DROP INDEX "tenant_crm"."proposals_public_token_key";

-- DropIndex
DROP INDEX "tenant_crm"."proposals_template_id_idx";

-- DropIndex
DROP INDEX "tenant_crm"."proposals_tenant_id_id_key";

-- DropIndex
DROP INDEX "tenant_events"."idx_battle_boards_data_gin";

-- DropIndex
DROP INDEX "tenant_events"."idx_battle_boards_tags_gin";

-- DropIndex
DROP INDEX "tenant_events"."board_projections_board_id_entity_type_entity_id_key";

-- DropIndex
DROP INDEX "tenant_events"."budget_line_items_budget_id_idx";

-- DropIndex
DROP INDEX "tenant_events"."budget_line_items_category_idx";

-- DropIndex
DROP INDEX "tenant_events"."catering_orders_id_key";

-- DropIndex
DROP INDEX "tenant_events"."catering_orders_order_number_key";

-- DropIndex
DROP INDEX "tenant_events"."unique_connection_per_board";

-- DropIndex
DROP INDEX "tenant_events"."command_board_layouts_board_id_user_id_name_key";

-- DropIndex
DROP INDEX "tenant_events"."idx_command_boards_tags_gin";

-- DropIndex
DROP INDEX "tenant_events"."document_versions_tenant_id_document_type_document_id_idx";

-- DropIndex
DROP INDEX "tenant_events"."document_versions_tenant_id_document_type_document_id_versi_key";

-- DropIndex
DROP INDEX "tenant_events"."event_budgets_event_id_idx";

-- DropIndex
DROP INDEX "tenant_events"."event_budgets_id_key";

-- DropIndex
DROP INDEX "tenant_events"."event_budgets_status_idx";

-- DropIndex
DROP INDEX "tenant_events"."event_contracts_signing_token_idx";

-- DropIndex
DROP INDEX "tenant_events"."event_contracts_signing_token_key";

-- DropIndex
DROP INDEX "tenant_events"."event_guests_allergen_restrictions_idx";

-- DropIndex
DROP INDEX "tenant_events"."event_guests_dietary_restrictions_idx";

-- DropIndex
DROP INDEX "tenant_events"."event_guests_event_id_waitlist_position_idx";

-- DropIndex
DROP INDEX "tenant_events"."event_imports_created_idx";

-- DropIndex
DROP INDEX "tenant_events"."event_imports_event_idx";

-- DropIndex
DROP INDEX "tenant_events"."event_imports_id_key";

-- DropIndex
DROP INDEX "tenant_events"."event_imports_status_idx";

-- DropIndex
DROP INDEX "tenant_events"."event_profitability_calculated_at_idx";

-- DropIndex
DROP INDEX "tenant_events"."event_reports_event_id_idx";

-- DropIndex
DROP INDEX "tenant_events"."event_reports_id_key";

-- DropIndex
DROP INDEX "tenant_events"."event_reports_status_idx";

-- DropIndex
DROP INDEX "tenant_events"."idx_event_reports_data_gin";

-- DropIndex
DROP INDEX "tenant_events"."event_summaries_generated_at_idx";

-- DropIndex
DROP INDEX "tenant_events"."events_tenant_id_id_key";

-- DropIndex
DROP INDEX "tenant_events"."idx_events_venue_entity_id";

-- DropIndex
DROP INDEX "tenant_events"."idx_events_venue_id";

-- DropIndex
DROP INDEX "tenant_events"."timeline_tasks_dependencies_idx";

-- DropIndex
DROP INDEX "tenant_events"."timeline_tasks_is_on_critical_path_idx";

-- DropIndex
DROP INDEX "tenant_events"."timeline_tasks_priority_idx";

-- DropIndex
DROP INDEX "tenant_facilities"."facilities_tenant_id_code_key";

-- DropIndex
DROP INDEX "tenant_facilities"."facility_areas_tenant_id_code_key";

-- DropIndex
DROP INDEX "tenant_facilities"."maintenance_work_orders_tenant_id_work_order_number_key";

-- DropIndex
DROP INDEX "tenant_facilities"."preventive_maintenance_schedules_tenant_id_schedule_number_key";

-- DropIndex
DROP INDEX "tenant_inventory"."cycle_count_records_tenant_item_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."cycle_count_records_tenant_offline_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."cycle_count_records_tenant_session_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."cycle_count_records_tenant_sync_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."cycle_count_sessions_session_id_key";

-- DropIndex
DROP INDEX "tenant_inventory"."cycle_count_sessions_tenant_location_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."cycle_count_sessions_tenant_scheduled_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."cycle_count_sessions_tenant_status_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."forecast_inputs_tenant_sku_date_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_alerts_tenant_item_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_alerts_tenant_triggered_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_alerts_tenant_type_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_forecasts_tenant_sku_date_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_items_tenant_id_id_key";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_stock_tenant_id_item_id_storage_location_id_key";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_stock_tenant_item_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_stock_tenant_location_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_suppliers_id_key";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_suppliers_tenant_id_id_key";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_suppliers_tenant_id_supplier_number_key";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_transactions_tenant_date_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_transactions_tenant_item_fk_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_transactions_tenant_item_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_transactions_tenant_location_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_transactions_tenant_type_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_transfers_tenant_id_requested_at_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."inventory_transfers_tenant_id_transfer_number_key";

-- DropIndex
DROP INDEX "tenant_inventory"."procurement_budget_alerts_ack_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."procurement_budget_alerts_budget_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."procurement_budgets_tenant_category_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."procurement_budgets_tenant_status_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."procurement_budgets_tenant_year_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_order_items_tenant_item_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_order_items_tenant_po_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_orders_po_number_key";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_orders_tenant_date_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_orders_tenant_id_id_key";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_orders_tenant_status_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_orders_tenant_vendor_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_requisition_items_id_key";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_requisition_items_tenant_item_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_requisition_items_tenant_req_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_requisitions_converted_to_po_id_key";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_requisitions_id_key";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_requisitions_requisition_number_key";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_requisitions_tenant_date_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_requisitions_tenant_department_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_requisitions_tenant_id_id_key";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_requisitions_tenant_requester_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."purchase_requisitions_tenant_status_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."reorder_suggestions_tenant_sku_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."shipment_items_id_key";

-- DropIndex
DROP INDEX "tenant_inventory"."shipment_items_tenant_id_id_key";

-- DropIndex
DROP INDEX "tenant_inventory"."shipments_id_key";

-- DropIndex
DROP INDEX "tenant_inventory"."shipments_shipment_number_key";

-- DropIndex
DROP INDEX "tenant_inventory"."shipments_tenant_id_id_key";

-- DropIndex
DROP INDEX "tenant_inventory"."variance_reports_tenant_item_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."variance_reports_tenant_session_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."variance_reports_tenant_status_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."vendor_catalogs_tenant_id_supplier_id_item_number_key";

-- DropIndex
DROP INDEX "tenant_inventory"."vendor_contacts_tenant_supplier_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."vendor_contracts_contract_number_key";

-- DropIndex
DROP INDEX "tenant_inventory"."vendor_contracts_id_key";

-- DropIndex
DROP INDEX "tenant_inventory"."vendor_contracts_tenant_end_date_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."vendor_contracts_tenant_id_id_key";

-- DropIndex
DROP INDEX "tenant_inventory"."vendor_contracts_tenant_status_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."vendor_contracts_tenant_vendor_idx";

-- DropIndex
DROP INDEX "tenant_inventory"."vendor_ratings_tenant_supplier_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."allergen_warnings_allergens_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."containers_location_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."corrective_actions_tenant_id_action_number_key";

-- DropIndex
DROP INDEX "tenant_kitchen"."corrective_actions_tenant_id_event_id_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."corrective_actions_tenant_id_severity_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."equipment_tenant_id_iot_device_id_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."ingredients_allergens_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."iot_alert_rules_tenant_id_id_key";

-- DropIndex
DROP INDEX "tenant_kitchen"."iot_alerts_tenant_id_alert_number_key";

-- DropIndex
DROP INDEX "tenant_kitchen"."kitchen_tasks_tags_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."menu_dishes_tenant_id_menu_id_dish_id_key";

-- DropIndex
DROP INDEX "tenant_kitchen"."override_audit_tenant_id_created_at_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."prep_methods_certifications_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."prep_task_plan_workflows_tenant_id_created_at_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."prep_task_plan_workflows_tenant_idempotency_key";

-- DropIndex
DROP INDEX "tenant_kitchen"."prep_tasks_container_id_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."prep_tasks_method_id_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."prep_tasks_recipe_version_id_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."quality_checks_tenant_id_check_number_key";

-- DropIndex
DROP INDEX "tenant_kitchen"."quality_checks_tenant_id_event_id_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."recipe_steps_tenant_id_recipe_version_id_step_number_key";

-- DropIndex
DROP INDEX "tenant_kitchen"."recipe_versions_locked_by_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."recipe_versions_tenant_id_recipe_id_version_number_key";

-- DropIndex
DROP INDEX "tenant_kitchen"."recipes_tags_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."task_bundle_items_tenant_bundle_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."task_bundle_items_tenant_task_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."task_progress_tenant_task_created_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."temperature_logs_tenant_id_event_id_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."temperature_logs_tenant_id_log_number_key";

-- DropIndex
DROP INDEX "tenant_kitchen"."temperature_probes_probe_id_key";

-- DropIndex
DROP INDEX "tenant_kitchen"."temperature_probes_tenant_id_next_calibration_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."temperature_probes_tenant_id_probe_id_key";

-- DropIndex
DROP INDEX "tenant_kitchen"."temperature_probes_tenant_id_status_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."temperature_readings_tenant_id_event_id_idx";

-- DropIndex
DROP INDEX "tenant_kitchen"."waste_entries_tenant_id_logged_at_idx";

-- DropIndex
DROP INDEX "tenant_logistics"."delivery_routes_id_key";

-- DropIndex
DROP INDEX "tenant_logistics"."delivery_routes_tenant_id_route_number_key";

-- DropIndex
DROP INDEX "tenant_logistics"."route_stops_id_key";

-- DropIndex
DROP INDEX "tenant_logistics"."route_stops_route_id_stop_number_key";

-- DropIndex
DROP INDEX "tenant_staff"."employee_deductions_employee_idx";

-- DropIndex
DROP INDEX "tenant_staff"."action_milestones_action_idx";

-- DropIndex
DROP INDEX "tenant_staff"."budget_alerts_acknowledged_idx";

-- DropIndex
DROP INDEX "tenant_staff"."budget_alerts_budget_idx";

-- DropIndex
DROP INDEX "tenant_staff"."budget_alerts_type_idx";

-- DropIndex
DROP INDEX "tenant_staff"."disciplinary_actions_employee_idx";

-- DropIndex
DROP INDEX "tenant_staff"."disciplinary_actions_status_idx";

-- DropIndex
DROP INDEX "tenant_staff"."employee_availability_employee_idx";

-- DropIndex
DROP INDEX "tenant_staff"."employee_certifications_employee_idx";

-- DropIndex
DROP INDEX "tenant_staff"."employee_time_off_requests_employee_idx";

-- DropIndex
DROP INDEX "tenant_staff"."employee_time_off_requests_start_date_idx";

-- DropIndex
DROP INDEX "tenant_staff"."employee_time_off_requests_status_idx";

-- DropIndex
DROP INDEX "tenant_staff"."employees_tenant_auth_user_idx";

-- DropIndex
DROP INDEX "tenant_staff"."employees_tenant_id_unique_idx";

-- DropIndex
DROP INDEX "tenant_staff"."labor_budgets_event_idx";

-- DropIndex
DROP INDEX "tenant_staff"."labor_budgets_location_idx";

-- DropIndex
DROP INDEX "tenant_staff"."labor_budgets_period_idx";

-- DropIndex
DROP INDEX "tenant_staff"."onboarding_completions_employee_idx";

-- DropIndex
DROP INDEX "tenant_staff"."onboarding_completions_unique";

-- DropIndex
DROP INDEX "tenant_staff"."onboarding_tasks_type_idx";

-- DropIndex
DROP INDEX "tenant_staff"."payroll_line_items_employee_idx";

-- DropIndex
DROP INDEX "tenant_staff"."performance_reviews_employee_idx";

-- DropIndex
DROP INDEX "tenant_staff"."performance_reviews_reviewer_idx";

-- DropIndex
DROP INDEX "tenant_staff"."performance_reviews_scheduled_idx";

-- DropIndex
DROP INDEX "tenant_staff"."role_policies_tenant_id_role_id_key";

-- DropIndex
DROP INDEX "tenant_staff"."schedule_shifts_employee_idx";

-- DropIndex
DROP INDEX "tenant_staff"."schedule_shifts_location_idx";

-- DropIndex
DROP INDEX "tenant_staff"."staff_training_signals_assignment_idx";

-- DropIndex
DROP INDEX "tenant_staff"."staff_training_signals_staff_member_idx";

-- DropIndex
DROP INDEX "tenant_staff"."time_entries_employee_idx";

-- DropIndex
DROP INDEX "tenant_staff"."timecard_approvals_employee_idx";

-- DropIndex
DROP INDEX "tenant_staff"."timecard_approvals_run_idx";

-- DropIndex
DROP INDEX "tenant_staff"."timecard_approvals_status_idx";

-- DropIndex
DROP INDEX "tenant_staff"."timecard_edit_requests_employee_idx";

-- DropIndex
DROP INDEX "tenant_staff"."timecard_edit_requests_unique_entry";

-- DropIndex
DROP INDEX "tenant_staff"."tip_pools_period_idx";

-- DropIndex
DROP INDEX "tenant_staff"."training_assignments_employee_idx";

-- DropIndex
DROP INDEX "tenant_staff"."training_assignments_module_idx";

-- DropIndex
DROP INDEX "tenant_staff"."training_assignments_status_idx";

-- DropIndex
DROP INDEX "tenant_staff"."training_attempts_assignment_idx";

-- DropIndex
DROP INDEX "tenant_staff"."training_attempts_module_idx";

-- DropIndex
DROP INDEX "tenant_staff"."training_attempts_staff_member_idx";

-- DropIndex
DROP INDEX "tenant_staff"."training_completions_employee_idx";

-- DropIndex
DROP INDEX "tenant_staff"."training_completions_module_idx";

-- DropIndex
DROP INDEX "tenant_staff"."training_completions_unique";

-- DropIndex
DROP INDEX "tenant_staff"."training_modules_category_idx";

-- DropIndex
DROP INDEX "tenant_staff"."training_modules_required_idx";

-- DropIndex
DROP INDEX "tenant_staff"."training_questions_id_key";

-- DropIndex
DROP INDEX "tenant_staff"."training_questions_module_idx";

-- AlterTable
ALTER TABLE "tenant"."documents" DROP CONSTRAINT "documents_pkey",
DROP COLUMN "battle_board_id",
DROP COLUMN "event_id",
DROP COLUMN "file_name",
DROP COLUMN "file_size",
DROP COLUMN "file_type",
DROP COLUMN "metadata",
DROP COLUMN "parse_error",
DROP COLUMN "parse_status",
DROP COLUMN "parsed_at",
DROP COLUMN "parsed_data",
DROP COLUMN "storage_path",
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("tenant_id", "id");

-- AlterTable
ALTER TABLE "tenant"."knowledge_base_entries" DROP COLUMN "slug",
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant"."venues" DROP COLUMN "equipment_list",
DROP COLUMN "preferred_vendors";

-- AlterTable
ALTER TABLE "tenant_accounting"."chart_of_accounts" DROP COLUMN "account_type",
ADD COLUMN     "account_type" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "tenant_accounting"."collection_actions" DROP COLUMN "contacted_at";

-- AlterTable
ALTER TABLE "tenant_accounting"."collection_cases" DROP COLUMN "clientTenantId",
DROP COLUMN "eventTenantId",
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
DROP COLUMN "priority",
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
DROP COLUMN "dunning_stage",
ADD COLUMN     "dunning_stage" TEXT NOT NULL DEFAULT 'CURRENT',
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_accounting"."collection_payment_plans" DROP COLUMN "frequency_days";

-- AlterTable
ALTER TABLE "tenant_accounting"."invoices" DROP COLUMN "version",
DROP COLUMN "versionAt",
DROP COLUMN "invoice_type",
ADD COLUMN     "invoice_type" TEXT NOT NULL DEFAULT 'FINAL_PAYMENT',
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "deposit_percentage" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "voided_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_accounting"."payment_methods" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_accounting"."payment_refund_attempts" DROP COLUMN "failure_reason",
DROP COLUMN "original_gateway_transaction_id",
DROP COLUMN "refund_transaction_id";

-- AlterTable
ALTER TABLE "tenant_accounting"."payments" DROP COLUMN "version",
DROP COLUMN "versionAt",
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_accounting"."revenue_recognition_lines" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_accounting"."revenue_recognition_schedules" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_admin"."admin_chat_participants" DROP COLUMN "last_read_at";

-- AlterTable
ALTER TABLE "tenant_admin"."email_templates" DROP COLUMN "template_type",
ADD COLUMN     "template_type" TEXT NOT NULL DEFAULT 'custom';

-- AlterTable
ALTER TABLE "tenant_admin"."email_workflows" DROP COLUMN "trigger_type",
ADD COLUMN     "trigger_type" TEXT NOT NULL DEFAULT 'custom';

-- AlterTable
ALTER TABLE "tenant_admin"."reports" DROP COLUMN "is_system";

-- AlterTable
ALTER TABLE "tenant_admin"."sms_automation_rules" DROP COLUMN "trigger_type",
ADD COLUMN     "trigger_type" TEXT NOT NULL DEFAULT 'custom_event',
DROP COLUMN "recipient_type",
ADD COLUMN     "recipient_type" TEXT NOT NULL DEFAULT 'employee',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_events"."battle_boards" ALTER COLUMN "document_imported_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_events"."board_annotations" DROP COLUMN "annotation_type",
DROP COLUMN "from_projection_id",
DROP COLUMN "metadata",
DROP COLUMN "style",
DROP COLUMN "to_projection_id";

-- AlterTable
ALTER TABLE "tenant_events"."board_projections" DROP COLUMN "collapsed",
DROP COLUMN "color_override",
DROP COLUMN "group_id",
DROP COLUMN "pinned",
DROP COLUMN "z_index",
DROP COLUMN "entity_type",
ADD COLUMN     "entity_type" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "tenant_events"."catering_orders" DROP COLUMN "version",
DROP COLUMN "versionAt",
ALTER COLUMN "order_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "delivery_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deposit_paid_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "delivered_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "prep_started_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_events"."event_budgets" ALTER COLUMN "variance_percentage" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "tenant_events"."event_followups" ALTER COLUMN "due_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_events"."event_guests" DROP COLUMN "version",
DROP COLUMN "versionAt";

-- AlterTable
ALTER TABLE "tenant_events"."event_imports" DROP COLUMN "battle_board_id",
DROP COLUMN "blob_url",
DROP COLUMN "content",
DROP COLUMN "report_id";

-- AlterTable
ALTER TABLE "tenant_events"."event_profitability" DROP COLUMN "actual_gross_margin_pct",
DROP COLUMN "budgeted_gross_margin_pct";

-- AlterTable
ALTER TABLE "tenant_events"."event_timeline" ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_events"."events" DROP COLUMN "version",
DROP COLUMN "versionAt";

-- AlterTable
ALTER TABLE "tenant_facilities"."facilities" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_facilities"."facility_areas" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_facilities"."facility_assets" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_facilities"."maintenance_work_orders" ALTER COLUMN "reported_at" DROP NOT NULL,
ALTER COLUMN "reported_at" DROP DEFAULT,
ALTER COLUMN "reported_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "started_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_facilities"."preventive_maintenance_schedules" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_inventory"."audit_schedules" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_inventory"."forecast_inputs" DROP COLUMN "historical_usage",
DROP COLUMN "seasonality_factors",
ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_alerts" ALTER COLUMN "threshold_value" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "triggered_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "resolved_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_forecasts" DROP COLUMN "accuracy_tracked",
DROP COLUMN "actual_depletion_date",
DROP COLUMN "error_days",
DROP COLUMN "forecast",
DROP COLUMN "horizon_days",
DROP COLUMN "last_updated",
DROP COLUMN "lower_bound",
DROP COLUMN "upper_bound",
ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_items" DROP COLUMN "version",
DROP COLUMN "versionAt";

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_stock" DROP COLUMN "last_counted_by",
ALTER COLUMN "quantity_on_hand" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "unit_id" SET DATA TYPE INTEGER,
ALTER COLUMN "last_counted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_suppliers" DROP COLUMN "connector_credentials",
DROP COLUMN "connector_type",
ALTER COLUMN "performance_rating" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_transactions" ALTER COLUMN "unit_cost" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "transaction_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_transfer_items" DROP COLUMN "received_quantity";

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_transfers" DROP COLUMN "approved_at",
DROP COLUMN "transfer_number",
ALTER COLUMN "requested_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_inventory"."procurement_budget_alerts" ALTER COLUMN "resolved_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_inventory"."procurement_budgets" ALTER COLUMN "threshold_warning_pct" SET DATA TYPE INTEGER,
ALTER COLUMN "threshold_critical_pct" SET DATA TYPE INTEGER,
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_inventory"."reorder_suggestions" DROP COLUMN "justification",
DROP COLUMN "lead_time_days",
DROP COLUMN "recommended_order_qty",
DROP COLUMN "reorder_point",
DROP COLUMN "safety_stock",
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_inventory"."storage_locations" ALTER COLUMN "temperature_unit" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_inventory"."vendor_contracts" DROP COLUMN "version",
DROP COLUMN "versionAt";

-- AlterTable
ALTER TABLE "tenant_inventory"."vendor_ratings" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."bulk_combine_rules" DROP COLUMN "deleted_at",
DROP COLUMN "is_automatic",
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."corrective_actions" DROP COLUMN "escalated_at",
DROP COLUMN "escalated_to",
DROP COLUMN "escalation_reason",
DROP COLUMN "related_check_id",
DROP COLUMN "related_temp_log_id",
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."equipment" DROP COLUMN "current_sensor_data",
DROP COLUMN "iot_device_type",
DROP COLUMN "last_heartbeat",
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "equipment_pkey" PRIMARY KEY ("tenant_id", "id");

-- DropIndex
DROP INDEX "tenant_kitchen"."equipment_tenant_id_id_key";

-- AlterTable
ALTER TABLE "tenant_kitchen"."iot_alert_rules" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."iot_alerts" DROP COLUMN "threshold",
ALTER COLUMN "acknowledged_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "resolved_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."kitchen_tasks" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."menus" DROP COLUMN "is_template",
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."method_videos" DROP COLUMN "deleted_at",
DROP COLUMN "is_active",
DROP COLUMN "method_id",
DROP COLUMN "sort_order",
DROP COLUMN "thumbnail_url",
DROP COLUMN "video_url",
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."override_audit" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "override_audit_pkey" PRIMARY KEY ("tenant_id", "id");

-- DropIndex
DROP INDEX "tenant_kitchen"."override_audit_tenant_id_id_key";

-- AlterTable
ALTER TABLE "tenant_kitchen"."prep_list_imports" DROP COLUMN "external_id",
DROP COLUMN "import_metadata",
DROP COLUMN "imported_by",
DROP COLUMN "source_system",
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."prep_lists" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."prep_task_plan_workflows" ALTER COLUMN "generation_options" SET DATA TYPE TEXT,
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "errors" SET DATA TYPE TEXT,
ALTER COLUMN "generated_tasks" SET DATA TYPE TEXT,
ALTER COLUMN "reviewed_tasks" SET DATA TYPE TEXT,
ALTER COLUMN "approved_task_ids" SET DATA TYPE TEXT,
ALTER COLUMN "rejected_task_ids" SET DATA TYPE TEXT,
ALTER COLUMN "instantiated_task_ids" SET DATA TYPE TEXT,
ALTER COLUMN "scheduled_windows" SET DATA TYPE TEXT,
ALTER COLUMN "constraint_outcomes" SET DATA TYPE TEXT,
ALTER COLUMN "warnings" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "tenant_kitchen"."prep_tasks" DROP COLUMN "container_id",
DROP COLUMN "import_id",
DROP COLUMN "method_id",
DROP COLUMN "recipe_version_id",
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "do_not_complete_until" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."qa_checks" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."quality_check_items" DROP COLUMN "value";

-- AlterTable
ALTER TABLE "tenant_kitchen"."quality_checks" DROP COLUMN "assigned_to",
ALTER COLUMN "scheduled_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."recipe_ingredients" DROP COLUMN "adjusted_quantity",
DROP COLUMN "cost_calculated_at";

-- AlterTable
ALTER TABLE "tenant_kitchen"."recipe_versions" DROP COLUMN "is_locked",
DROP COLUMN "locked_at",
DROP COLUMN "locked_by",
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "cost_calculated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."recipes" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."stations" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "stations_pkey" PRIMARY KEY ("tenant_id", "id");

-- DropIndex
DROP INDEX "tenant_kitchen"."stations_tenant_id_id_key";

-- AlterTable
ALTER TABLE "tenant_kitchen"."task_bundle_items" DROP CONSTRAINT "task_bundle_items_pkey",
DROP COLUMN "bundle_id",
DROP COLUMN "task_id",
ALTER COLUMN "sort_order" SET DATA TYPE INTEGER,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "task_bundle_items_pkey" PRIMARY KEY ("tenant_id", "id");

-- AlterTable
ALTER TABLE "tenant_kitchen"."task_bundles" DROP COLUMN "deleted_at",
DROP COLUMN "is_template",
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."task_progress" DROP COLUMN "quantity_completed";

-- AlterTable
ALTER TABLE "tenant_kitchen"."temperature_logs" DROP COLUMN "corrective_action",
DROP COLUMN "target_temp",
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."temperature_probes" DROP COLUMN "area_id",
DROP COLUMN "battery_level",
DROP COLUMN "calibration_interval_days",
DROP COLUMN "last_reading",
DROP COLUMN "last_reading_at",
DROP COLUMN "next_calibration",
DROP COLUMN "probe_type",
DROP COLUMN "status",
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_kitchen"."temperature_readings" DROP COLUMN "battery_level",
DROP COLUMN "signal_strength";

-- AlterTable
ALTER TABLE "tenant_kitchen"."work_orders" DROP COLUMN "actual_cost",
DROP COLUMN "estimated_cost",
DROP COLUMN "parts_used",
DROP COLUMN "vendor_id",
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "work_orders_pkey" PRIMARY KEY ("tenant_id", "id");

-- DropIndex
DROP INDEX "tenant_kitchen"."work_orders_tenant_id_id_key";

-- AlterTable
ALTER TABLE "tenant_logistics"."delivery_routes" DROP COLUMN "actual_distance",
DROP COLUMN "actual_end_time",
DROP COLUMN "actual_start_time",
DROP COLUMN "completed_stops",
DROP COLUMN "delay_minutes",
DROP COLUMN "end_time",
DROP COLUMN "optimization_algorithm",
DROP COLUMN "optimization_score",
DROP COLUMN "start_time",
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_logistics"."drivers" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_logistics"."route_stops" DROP COLUMN "actual_departure",
DROP COLUMN "country_code",
DROP COLUMN "distance_from_previous",
DROP COLUMN "latitude",
DROP COLUMN "location_id",
DROP COLUMN "longitude",
DROP COLUMN "planned_duration",
DROP COLUMN "state_province",
DROP COLUMN "stopType",
DROP COLUMN "time_from_previous",
DROP COLUMN "venue_id";

-- AlterTable
ALTER TABLE "tenant_staff"."action_milestones" ALTER COLUMN "due_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completed_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."budget_alerts" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."disciplinary_actions" DROP COLUMN "closed_at",
DROP COLUMN "closed_by",
DROP COLUMN "end_date",
DROP COLUMN "improvement_plan",
DROP COLUMN "outcome",
ALTER COLUMN "issued_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "escalated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."employee_time_off_requests" DROP COLUMN "hours",
ALTER COLUMN "submitted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."employees" DROP COLUMN "department_id",
DROP COLUMN "employment_type",
ADD COLUMN     "employment_type" TEXT NOT NULL DEFAULT 'full_time';

-- AlterTable
ALTER TABLE "tenant_staff"."labor_budgets" DROP COLUMN "threshold_100_pct",
DROP COLUMN "threshold_80_pct",
DROP COLUMN "threshold_90_pct",
ADD COLUMN     "threshold100_pct" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "threshold80_pct" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "threshold90_pct" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "tenant_staff"."onboarding_completions" DROP COLUMN "document_url",
DROP COLUMN "signature_data",
ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."onboarding_tasks" DROP COLUMN "is_active",
ALTER COLUMN "sort_order" SET DATA TYPE INTEGER,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."open_shifts" DROP COLUMN "assigned_shift_id",
DROP COLUMN "claimed_at",
DROP COLUMN "location_id",
DROP COLUMN "notes",
ALTER COLUMN "shift_start" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "shift_end" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."payroll_approval_history" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."performance_reviews" DROP COLUMN "areas_for_improvement",
DROP COLUMN "employee_comments",
DROP COLUMN "goals_next_period",
DROP COLUMN "manager_comments",
ALTER COLUMN "scheduled_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completed_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "employee_acknowledged_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."schedule_shifts" DROP COLUMN "version",
DROP COLUMN "versionAt";

-- AlterTable
ALTER TABLE "tenant_staff"."schedules" ALTER COLUMN "schedule_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "published_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."staff_training_signals" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."timecard_approvals" DROP COLUMN "reject_reason",
DROP COLUMN "reviewed_at",
DROP COLUMN "reviewed_by",
ALTER COLUMN "submitted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."timecard_edit_requests" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."tip_pools" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."training_assignments" ALTER COLUMN "assigned_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."training_attempts" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."training_completions" ALTER COLUMN "started_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."training_questions" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- DropEnum
DROP TYPE "core"."KitchenTaskStatus";

-- DropEnum
DROP TYPE "core"."ShipmentStatus";

-- CreateTable
CREATE TABLE "async_reaction_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "reaction_name" TEXT NOT NULL,
    "triggering_event" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "initial_backoff_ms" BIGINT NOT NULL DEFAULT 1000,
    "max_backoff_ms" BIGINT NOT NULL DEFAULT 60000,
    "next_attempt_at" BIGINT NOT NULL,
    "last_error" TEXT,
    "idempotency_key" TEXT,
    "correlation_id" TEXT,
    "causation_id" TEXT,
    "enqueued_at" BIGINT NOT NULL,
    "claimed_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "dead_lettered_at" TIMESTAMPTZ,
    "inserted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "async_reaction_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "async_reaction_dlq" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "reaction_name" TEXT NOT NULL,
    "triggering_event" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL,
    "max_attempts" INTEGER NOT NULL,
    "last_error" TEXT,
    "idempotency_key" TEXT,
    "correlation_id" TEXT,
    "causation_id" TEXT,
    "enqueued_at" BIGINT NOT NULL,
    "dead_lettered_at" BIGINT NOT NULL,
    "inserted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "async_reaction_dlq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_async_reaction_tenant_status" ON "async_reaction_jobs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_async_reaction_dlq_tenant" ON "async_reaction_dlq"("tenant_id", "dead_lettered_at" DESC);

-- CreateIndex
CREATE INDEX "idx_async_reaction_dlq_reaction" ON "async_reaction_dlq"("reaction_name", "dead_lettered_at" DESC);

-- CreateIndex
CREATE INDEX "collection_cases_tenant_id_status_idx" ON "tenant_accounting"."collection_cases"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_status_idx" ON "tenant_accounting"."invoices"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "payment_refund_attempts_tenant_id_created_at_idx" ON "tenant_accounting"."payment_refund_attempts"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "email_templates_tenant_id_template_type_idx" ON "tenant_admin"."email_templates"("tenant_id", "template_type");

-- CreateIndex
CREATE INDEX "email_workflows_tenant_id_trigger_type_idx" ON "tenant_admin"."email_workflows"("tenant_id", "trigger_type");

-- CreateIndex
CREATE INDEX "sms_automation_rules_tenant_id_trigger_type_idx" ON "tenant_admin"."sms_automation_rules"("tenant_id", "trigger_type");

-- CreateIndex
CREATE INDEX "board_projections_entity_type_entity_id_idx" ON "tenant_events"."board_projections"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "board_projections_board_id_entity_type_entity_id_idx" ON "tenant_events"."board_projections"("board_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "event_profitability_calculated_at_idx" ON "tenant_events"."event_profitability"("calculated_at");

-- CreateIndex
CREATE INDEX "event_summaries_generated_at_idx" ON "tenant_events"."event_summaries"("generated_at");

-- CreateIndex
CREATE INDEX "override_audit_tenant_id_created_at_idx" ON "tenant_kitchen"."override_audit"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "prep_task_plan_workflows_tenant_id_created_at_idx" ON "tenant_kitchen"."prep_task_plan_workflows"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "waste_entries_tenant_id_logged_at_idx" ON "tenant_kitchen"."waste_entries"("tenant_id", "logged_at");

-- RenameIndex
ALTER INDEX "tenant_admin"."admin_task_dev_meta_task_idx" RENAME TO "admin_task_dev_meta_tenant_id_task_id_idx";

-- RenameIndex
ALTER INDEX "tenant_inventory"."inventory_stock_tenant_item_location_idx" RENAME TO "inventory_stock_tenant_id_item_id_storage_location_id_idx";

-- Custom SQL (not expressible in Prisma schema): partial indexes + status CHECK
-- for the async-reaction queue. Mirrors manifest/runtime/src/pg-pool.ts
-- ensureManifestSchema() exactly; runtime bootstrap uses IF NOT EXISTS and
-- becomes a no-op on migrated databases.
ALTER TABLE "async_reaction_jobs" ADD CONSTRAINT "async_reaction_jobs_status_check"
  CHECK (status IN ('pending','running','delivered','retry','dead_letter'));

CREATE INDEX "idx_async_reaction_pending"
  ON "async_reaction_jobs" ("next_attempt_at")
  WHERE status = 'pending';

CREATE INDEX "idx_async_reaction_running_claimed"
  ON "async_reaction_jobs" ("claimed_at")
  WHERE status = 'running' AND claimed_at IS NOT NULL;

CREATE INDEX "idx_async_reaction_idempotency"
  ON "async_reaction_jobs" ("idempotency_key")
  WHERE idempotency_key IS NOT NULL;
