# Feature Inventory

Generated for cp-092 on 2026-04-13.

## Scope and method

- Audited route files under `apps/api/app/api/**/route.ts` and page routes under `apps/app/app/**/page.tsx?` plus `apps/web/app/**/page.tsx?`.
- Read canonical data model from `packages/database/prisma/schema.prisma`.
- Route -> data mapping is based on direct `database.<model>` calls plus manifest `entityName` declarations in route files. Indirect service-layer table access may exist beyond what the route file shows.

## Route surface summary

- API route handlers: **1346**
- Main app page routes: **187**
- Marketing/content page routes: **6**
- Prisma models: **195** across schemas: **core, platform, tenant, tenant_accounting, tenant_admin, tenant_crm, tenant_events, tenant_facilities, tenant_inventory, tenant_kitchen, tenant_logistics, tenant_staff**

## Prisma schema inventory by database schema

| DB schema | Model count | Representative models |
|---|---:|---|
| `core` | 6 | audit_config, status_transitions, status_types, unit_conversions, units, WasteReason |
| `platform` | 7 | Account, audit_archive, audit_log, sent_emails, Tenant, SentryFixJob |
| `tenant` | 8 | Location, Venue, documents, settings, OutboxEvent, ManifestEntity |
| `tenant_accounting` | 7 | ChartOfAccount, Invoice, PaymentMethod, Payment, CollectionCase, CollectionAction |
| `tenant_admin` | 37 | Report, AdminTask, AdminChatThread, AdminChatParticipant, AdminChatMessage, Workflow |
| `tenant_crm` | 8 | Client, ClientContact, ClientPreference, Lead, ClientInteraction, Proposal |
| `tenant_events` | 25 | Event, EventProfitability, EventSummary, EventReport, EventBudget, BudgetLineItem |
| `tenant_facilities` | 3 | FacilityArea, MaintenanceWorkOrder, PreventiveMaintenanceSchedule |
| `tenant_inventory` | 25 | InventoryItem, InventoryTransaction, InventorySupplier, SupplierSyncLog, InventoryAlert, InventoryStock |
| `tenant_kitchen` | 33 | KitchenTask, PrepTask, KitchenTaskClaim, KitchenTaskProgress, PrepList, PrepListItem |
| `tenant_logistics` | 2 | DeliveryRoute, RouteStop |
| `tenant_staff` | 34 | User, UserPreference, Schedule, ScheduleShift, TimeEntry, TimecardEditRequest |

## Feature module summary

| Feature module | API routes | Main app pages | Touched models/tables | Example endpoints |
|---|---:|---:|---|---|
| `kitchen` | 259 | 32 | AlertsConfig, AllergenWarning, Container, CorrectiveAction, Dish, Event, EventGuest, Ingredient, InventoryItem, IoTAlert, KitchenTask, KitchenTaskClaim | /api/kitchen/ai/bulk-generate/prep-tasks, /api/kitchen/ai/bulk-generate/prep-tasks/save, /api/kitchen/alerts-config/[id] |
| `events` | 141 | 16 | AllergenWarning, BattleBoard, BudgetAlert, BudgetLineItem, CateringOrder, Client, ContractSignature, Dish, Event, EventBudget, EventContract, EventDish (manifest) | /api/events/[eventId]/export/csv, /api/events/[eventId]/guests, /api/events/[eventId]/shipments/generate |
| `inventory` | 102 | 9 | AlertsConfig, AuditSchedule, BulkOrderRule, CycleCountAuditLog, CycleCountRecord, CycleCountSession, InventoryForecast, InventoryItem, InventoryStock, InventorySupplier, InventoryTransaction, InventoryTransfer | /api/inventory/alerts/subscribe, /api/inventory/audit/discrepancies/[id]/resolve, /api/inventory/audit/discrepancies/[id] |
| `crm` | 61 | 18 | CateringOrder, Client, ClientContact, ClientInteraction, ClientPreference, Event, Lead, Proposal, ProposalLineItem, ProposalTemplate, User | /api/crm/client-contacts/[id], /api/crm/client-contacts/commands/create, /api/crm/client-contacts/commands/remove |
| `staff` | 50 | 9 | BudgetAlert, EmployeeCertification (manifest), LaborBudget, Schedule, ScheduleShift, TimeOffRequest (manifest), User, employee_availability, employee_certifications | /api/staff/availability/[id], /api/staff/availability/batch, /api/staff/availability/commands/create |
| `command-board` | 39 | 0 | BoardAnnotation, BoardProjection, CommandBoard, CommandBoardCard, CommandBoardConnection, CommandBoardGroup, CommandBoardLayout, OutboxEvent, User | /api/command-board/[boardId]/replay, /api/command-board/[boardId], /api/command-board/boards/[id] |
| `procurement` | 37 | 10 | EventContract, PurchaseOrder, PurchaseRequisition (manifest), User, VendorContract (manifest) | /api/procurement/approvals/action, /api/procurement/approvals/list, /api/procurement/budget/[id] |
| `payroll` | 35 | 10 | ApprovalHistory, EmployeeDeduction, LaborBudget, PayrollApprovalHistory (manifest), PayrollPeriod (manifest), PayrollRun (manifest), User, payroll_periods, payroll_runs | /api/payroll/approval-history/[id], /api/payroll/approval-history/commands/create, /api/payroll/approval-history/list |
| `collaboration` | 25 | 0 | EmailTemplate (manifest), EmailWorkflow, Notification, User, Workflow, email_templates, sms_logs | /api/collaboration/auth, /api/collaboration/notifications/[id], /api/collaboration/notifications/commands/create |
| `integrations` | 24 | 0 | GoodshuffleConfig, GoodshuffleEventSync, GoodshuffleInventorySync, GoodshuffleInvoiceSync, NowstaConfig, NowstaEmployeeMapping, OutboundWebhook, WebhookDeadLetterQueue, WebhookDeliveryLog | /api/integrations/goodshuffle/config, /api/integrations/goodshuffle/events, /api/integrations/goodshuffle/inventory |
| `administrative` | 22 | 5 | AdminChatMessage, AdminChatParticipant, AdminChatThread, AdminTask, User | /api/administrative/chat/participants/[id], /api/administrative/chat/participants/commands/archive, /api/administrative/chat/participants/commands/clear-history |
| `timecards` | 22 | 0 | EmployeeTimeOffRequest, TimeEntry, TimeOffRequest (manifest), TimecardEditRequest, User | /api/timecards/[id], /api/timecards/bulk, /api/timecards/edit-requests/[id] |
| `eventimportworkflow` | 18 | 0 | EventImportWorkflow (manifest) | /api/eventimportworkflow/cancel, /api/eventimportworkflow/complete-activating, /api/eventimportworkflow/complete-extraction |
| `shipments` | 18 | 0 | Shipment, ShipmentItem, User | /api/shipments/[id]/items/[itemId], /api/shipments/[id]/items, /api/shipments/[id] |
| `accounting` | 17 | 4 | ChartOfAccount, Client, CollectionCase, Event, Invoice, Payment, PaymentMethod, User | /api/accounting/accounts/[id], /api/accounting/accounts, /api/accounting/chart-of-accounts/[id] |
| `preptaskplanworkflow` | 16 | 0 | PrepTaskPlanWorkflow (manifest) | /api/preptaskplanworkflow/approve-plan, /api/preptaskplanworkflow/cancel, /api/preptaskplanworkflow/complete-generation |
| `settings` | 14 | 10 | ApiKey, RateLimitConfig, RateLimitEvent, RateLimitUsage, User | /api/settings/api-keys/[id]/revoke, /api/settings/api-keys/[id]/rotate, /api/settings/api-keys/[id] |
| `logistics` | 13 | 7 | DeliveryRoute, RouteStop | /api/logistics/dispatch/commands/assign, /api/logistics/dispatch, /api/logistics/drivers/commands/create |
| `preptask` | 13 | 0 | PrepTask | /api/preptask/cancel, /api/preptask/claim, /api/preptask/complete |
| `communications` | 12 | 0 | EmailTemplate (manifest), EmailWorkflow, SmsAutomationRule (manifest), User, email_templates, sms_automation_rules | /api/communications/email-templates/[id], /api/communications/email-templates/commands/create, /api/communications/email-templates/commands/soft-delete |
| `facilities` | 12 | 5 | - | /api/facilities/areas/commands/create, /api/facilities/areas/list, /api/facilities/assets/commands/create |
| `training` | 12 | 0 | TrainingAssignment, TrainingModule, User | /api/training/assignments/[id], /api/training/assignments/commands/create, /api/training/assignments/commands/soft-delete |
| `kitchentask` | 11 | 0 | KitchenTask | /api/kitchentask/add-tag, /api/kitchentask/cancel, /api/kitchentask/claim |
| `event` | 10 | 0 | Event | /api/event/archive, /api/event/cancel, /api/event/confirm |
| `preplist` | 10 | 0 | PrepList | /api/preplist/activate, /api/preplist/cancel, /api/preplist/create |
| `rolepolicy` | 10 | 0 | RolePolicy, User | /api/rolepolicy/[id], /api/rolepolicy/grant, /api/rolepolicy/list |
| `admintask` | 8 | 0 | AdminTask | /api/admintask/cancel, /api/admintask/complete, /api/admintask/create |
| `calendar` | 8 | 2 | EmployeeTimeOffRequest, Event, ProviderSync, ScheduleShift | /api/calendar/reschedule, /api/calendar, /api/calendar/sync/callback/google |
| `eventcontract` | 8 | 0 | EventContract | /api/eventcontract/cancel, /api/eventcontract/create, /api/eventcontract/expire |
| `battleboard` | 7 | 0 | BattleBoard | /api/battleboard/add-dish, /api/battleboard/create, /api/battleboard/finalize |
| `inventoryitem` | 7 | 0 | InventoryItem | /api/inventoryitem/adjust, /api/inventoryitem/consume, /api/inventoryitem/create |
| `proposal` | 7 | 0 | Proposal | /api/proposal/accept, /api/proposal/create, /api/proposal/mark-viewed |
| `purchaseorder` | 7 | 0 | PurchaseOrder | /api/purchaseorder/approve, /api/purchaseorder/cancel, /api/purchaseorder/create |
| `station` | 7 | 0 | Station | /api/station/activate, /api/station/assign-task, /api/station/create |
| `cateringorder` | 6 | 0 | CateringOrder | /api/cateringorder/cancel, /api/cateringorder/confirm, /api/cateringorder/create |
| `knowledge-base` | 6 | 1 | KnowledgeBaseEntry | /api/knowledge-base/entries/[slug], /api/knowledge-base/entries/commands/create, /api/knowledge-base/entries/commands/delete |
| `preplistitem` | 6 | 0 | PrepListItem | /api/preplistitem/create, /api/preplistitem/mark-completed, /api/preplistitem/mark-uncompleted |
| `aieventsetupsession` | 5 | 0 | AiEventSetupSession (manifest) | /api/aieventsetupsession/cancel, /api/aieventsetupsession/confirm, /api/aieventsetupsession/mark-created |
| `allergenwarning` | 5 | 0 | AllergenWarning | /api/allergenwarning/acknowledge, /api/allergenwarning/apply-override, /api/allergenwarning/create |
| `analytics` | 5 | 9 | Account, AllergenWarning, BudgetAlert, User, WasteEntry | /api/analytics/events/profitability, /api/analytics/finance, /api/analytics/kitchen |
| `apikey` | 5 | 0 | ApiKey | /api/apikey/create, /api/apikey/record-usage, /api/apikey/revoke |
| `commandboardcard` | 5 | 0 | CommandBoardCard | /api/commandboardcard/create, /api/commandboardcard/move, /api/commandboardcard/remove |
| `cron` | 5 | 0 | AuditSchedule, CycleCountSession, EmailWorkflow, EventContract, KitchenTask, KitchenTaskClaim, Location, ManifestIdempotency, OutboundWebhook, ScheduleShift, User, WebhookDeadLetterQueue | /api/cron/contract-expiration-alerts, /api/cron/email-reminders, /api/cron/idempotency-cleanup |
| `cyclecountsession` | 5 | 0 | CycleCountSession | /api/cyclecountsession/cancel, /api/cyclecountsession/complete, /api/cyclecountsession/create |
| `dish` | 5 | 0 | Dish | /api/dish/create, /api/dish/deactivate, /api/dish/update |
| `ingredient` | 5 | 0 | Ingredient | /api/ingredient/create, /api/ingredient/deactivate, /api/ingredient/update |
| `lead` | 5 | 0 | Lead | /api/lead/archive, /api/lead/convert-to-client, /api/lead/create |
| `smsautomationrule` | 5 | 0 | SmsAutomationRule (manifest) | /api/smsautomationrule/activate, /api/smsautomationrule/create, /api/smsautomationrule/deactivate |
| `timeoffrequest` | 5 | 0 | TimeOffRequest (manifest) | /api/timeoffrequest/approve, /api/timeoffrequest/cancel, /api/timeoffrequest/create |
| `user` | 5 | 0 | User | /api/user/create, /api/user/deactivate, /api/user/terminate |
| `client` | 4 | 0 | Client | /api/client/archive, /api/client/create, /api/client/reactivate |
| `clientcontact` | 4 | 0 | ClientContact | /api/clientcontact/create, /api/clientcontact/remove, /api/clientcontact/set-primary |
| `commandboard` | 4 | 0 | CommandBoard | /api/commandboard/activate, /api/commandboard/create, /api/commandboard/deactivate |
| `cyclecountrecord` | 4 | 0 | CycleCountRecord | /api/cyclecountrecord/create, /api/cyclecountrecord/remove, /api/cyclecountrecord/update |
| `eventbudget` | 4 | 0 | EventBudget | /api/eventbudget/approve, /api/eventbudget/create, /api/eventbudget/finalize |
| `eventreport` | 4 | 0 | EventReport | /api/eventreport/approve, /api/eventreport/complete, /api/eventreport/create |
| `menu` | 4 | 0 | Menu | /api/menu/activate, /api/menu/create, /api/menu/deactivate |
| `notification` | 4 | 0 | Notification | /api/notification/create, /api/notification/mark-dismissed, /api/notification/mark-read |
| `prepcomment` | 4 | 0 | PrepComment | /api/prepcomment/create, /api/prepcomment/resolve, /api/prepcomment/soft-delete |
| `public` | 4 | 0 | Account, ContractSignature, Event, EventContract, Proposal, ProposalLineItem | /api/public/contracts/[token], /api/public/contracts/[token]/sign, /api/public/proposals/[token]/respond |
| `recipe` | 4 | 0 | Recipe | /api/recipe/activate, /api/recipe/create, /api/recipe/deactivate |
| `recipeingredient` | 4 | 0 | RecipeIngredient | /api/recipeingredient/create, /api/recipeingredient/remove, /api/recipeingredient/update-quantity |
| `schedule` | 4 | 0 | Schedule | /api/schedule/close, /api/schedule/create, /api/schedule/release |
| `timeentry` | 4 | 0 | TimeEntry | /api/timeentry/add-entry, /api/timeentry/clock-in, /api/timeentry/clock-out |
| `workflow` | 4 | 0 | Workflow | /api/workflow/activate, /api/workflow/create, /api/workflow/deactivate |
| `workforceoptimization` | 4 | 0 | WorkforceOptimization (manifest) | /api/workforceoptimization/complete, /api/workforceoptimization/create, /api/workforceoptimization/fail |
| `adminchatparticipant` | 3 | 0 | AdminChatParticipant | /api/adminchatparticipant/archive, /api/adminchatparticipant/clear-history, /api/adminchatparticipant/unarchive |
| `alertsconfig` | 3 | 0 | AlertsConfig | /api/alertsconfig/create, /api/alertsconfig/remove, /api/alertsconfig/update |
| `budgetlineitem` | 3 | 0 | BudgetLineItem | /api/budgetlineitem/create, /api/budgetlineitem/remove, /api/budgetlineitem/update |
| `bulkorderrule` | 3 | 0 | BulkOrderRule | /api/bulkorderrule/create, /api/bulkorderrule/soft-delete, /api/bulkorderrule/update |
| `chartofaccount` | 3 | 0 | ChartOfAccount | /api/chartofaccount/create, /api/chartofaccount/deactivate, /api/chartofaccount/update |
| `clientinteraction` | 3 | 0 | ClientInteraction | /api/clientinteraction/complete, /api/clientinteraction/create, /api/clientinteraction/update |
| `clientpreference` | 3 | 0 | ClientPreference | /api/clientpreference/create, /api/clientpreference/remove, /api/clientpreference/update |
| `commandboardgroup` | 3 | 0 | CommandBoardGroup | /api/commandboardgroup/create, /api/commandboardgroup/remove, /api/commandboardgroup/update |
| `commandboardlayout` | 3 | 0 | CommandBoardLayout | /api/commandboardlayout/create, /api/commandboardlayout/remove, /api/commandboardlayout/update |
| `container` | 3 | 0 | Container | /api/container/create, /api/container/deactivate, /api/container/update |
| `documents` | 3 | 0 | DocumentVersion | /api/documents/versions/commands/create, /api/documents/versions/commands/restore, /api/documents/versions/list |
| `emailtemplate` | 3 | 0 | EmailTemplate (manifest) | /api/emailtemplate/create, /api/emailtemplate/soft-delete, /api/emailtemplate/update |
| `emailworkflow` | 3 | 0 | EmailWorkflow | /api/emailworkflow/create, /api/emailworkflow/soft-delete, /api/emailworkflow/update |
| `employeeavailability` | 3 | 0 | employee_availability | /api/employeeavailability/create, /api/employeeavailability/soft-delete, /api/employeeavailability/update |
| `employeecertification` | 3 | 0 | EmployeeCertification (manifest) | /api/employeecertification/create, /api/employeecertification/soft-delete, /api/employeecertification/update |
| `eventguest` | 3 | 0 | EventGuest | /api/eventguest/create, /api/eventguest/soft-delete, /api/eventguest/update |
| `eventprofitability` | 3 | 0 | EventProfitability | /api/eventprofitability/create, /api/eventprofitability/recalculate, /api/eventprofitability/update |
| `eventsummary` | 3 | 0 | EventSummary | /api/eventsummary/create, /api/eventsummary/refresh, /api/eventsummary/update |
| `inventorysupplier` | 3 | 0 | InventorySupplier | /api/inventorysupplier/create, /api/inventorysupplier/deactivate, /api/inventorysupplier/update |
| `laborbudget` | 3 | 0 | LaborBudget | /api/laborbudget/create, /api/laborbudget/soft-delete, /api/laborbudget/update |
| `menudish` | 3 | 0 | MenuDish | /api/menudish/create, /api/menudish/remove, /api/menudish/update-course |
| `prepmethod` | 3 | 0 | PrepMethod | /api/prepmethod/create, /api/prepmethod/deactivate, /api/prepmethod/update |
| `pricingtier` | 3 | 0 | PricingTier | /api/pricingtier/create, /api/pricingtier/soft-delete, /api/pricingtier/update |
| `proposallineitem` | 3 | 0 | ProposalLineItem | /api/proposallineitem/create, /api/proposallineitem/remove, /api/proposallineitem/update |
| `purchaseorderitem` | 3 | 0 | PurchaseOrderItem | /api/purchaseorderitem/create, /api/purchaseorderitem/remove, /api/purchaseorderitem/update |
| `recipestep` | 3 | 0 | RecipeStep (manifest) | /api/recipestep/create, /api/recipestep/remove, /api/recipestep/update-instruction |
| `recipeversion` | 3 | 0 | RecipeVersion | /api/recipeversion/create, /api/recipeversion/restore, /api/recipeversion/update-costs |
| `sampledata` | 3 | 0 | SampleData (manifest) | /api/sampledata/clear, /api/sampledata/reseed, /api/sampledata/seed |
| `scheduleshift` | 3 | 0 | ScheduleShift | /api/scheduleshift/create, /api/scheduleshift/remove, /api/scheduleshift/update |
| `timecardeditrequest` | 3 | 0 | TimecardEditRequest | /api/timecardeditrequest/approve, /api/timecardeditrequest/create, /api/timecardeditrequest/reject |
| `trainingmodule` | 3 | 0 | TrainingModule | /api/trainingmodule/create, /api/trainingmodule/soft-delete, /api/trainingmodule/update |
| `variancereport` | 3 | 0 | VarianceReport | /api/variancereport/approve, /api/variancereport/create, /api/variancereport/review |
| `vendorcatalog` | 3 | 0 | VendorCatalog | /api/vendorcatalog/create, /api/vendorcatalog/soft-delete, /api/vendorcatalog/update |
| `wasteentry` | 3 | 0 | WasteEntry | /api/wasteentry/create, /api/wasteentry/soft-delete, /api/wasteentry/update |
| `activity-feed` | 2 | 0 | ActivityFeed | /api/activity-feed/list, /api/activity-feed/stats |
| `ai` | 2 | 0 | AllergenWarning, Dish, Event, EventStaffAssignment, InventoryAlert, InventoryItem, PrepTask | /api/ai/suggestions, /api/ai/summaries/[eventId] |
| `budgetalert` | 2 | 0 | BudgetAlert | /api/budgetalert/acknowledge, /api/budgetalert/resolve |
| `commandboardconnection` | 2 | 0 | CommandBoardConnection | /api/commandboardconnection/create, /api/commandboardconnection/remove |
| `contractsignature` | 2 | 0 | ContractSignature | /api/contractsignature/create, /api/contractsignature/soft-delete |
| `eventdish` | 2 | 0 | EventDish (manifest) | /api/eventdish/create, /api/eventdish/remove |
| `eventstaff` | 2 | 0 | EventStaff (manifest) | /api/eventstaff/assign, /api/eventstaff/unassign |
| `overrideaudit` | 2 | 0 | OverrideAudit | /api/overrideaudit/authorize, /api/overrideaudit/create |
| `staffing` | 2 | 5 | - | /api/staffing/coverage, /api/staffing/recommendations |
| `trainingassignment` | 2 | 0 | TrainingAssignment | /api/trainingassignment/create, /api/trainingassignment/soft-delete |
| `ai-event-setup` | 1 | 0 | - | /api/ai-event-setup/parse |
| `conflicts` | 1 | 0 | InventoryAlert, InventoryItem, PrepTask | /api/conflicts/detect |
| `employeededuction` | 1 | 0 | EmployeeDeduction | /api/employeededuction/create |
| `health` | 1 | 0 | - | /api/health/sentry-canary |
| `inventorytransaction` | 1 | 0 | InventoryTransaction | /api/inventorytransaction/create |
| `locations` | 1 | 0 | - | /api/locations |
| `payrollapprovalhistory` | 1 | 0 | PayrollApprovalHistory (manifest) | /api/payrollapprovalhistory/create |
| `payrollperiod` | 1 | 0 | PayrollPeriod (manifest) | /api/payrollperiod/create |
| `payrollrun` | 1 | 0 | PayrollRun (manifest) | /api/payrollrun/update-status |
| `performanceprediction` | 1 | 0 | PerformancePrediction (manifest) | /api/performanceprediction/create |
| `sales-reporting` | 1 | 0 | - | /api/sales-reporting/generate |
| `search` | 1 | 1 | Client, ClientContact, Event, InventoryItem, KnowledgeBaseEntry, Venue | /api/search |
| `sentry-fixer` | 1 | 0 | - | /api/sentry-fixer/process |
| `user-preferences` | 1 | 0 | - | /api/user-preferences |
| `webhooks` | 1 | 0 | InventorySupplier, VendorCatalog | /api/webhooks/supplier-catalog |

## Frontend route inventory

### apps/app

| Feature | Pages | Example routes |
|---|---:|---|
| `kitchen` | 32 | /(authenticated)/kitchen/allergen-warning-test, /(authenticated)/kitchen/allergens, /(authenticated)/kitchen/equipment, /(authenticated)/kitchen/inventory, /(authenticated)/kitchen/iot |
| `crm` | 18 | /(authenticated)/crm/clients/[id], /(authenticated)/crm/clients/new, /(authenticated)/crm/clients, /(authenticated)/crm/communications, /(authenticated)/crm |
| `events` | 16 | /(authenticated)/events/[eventId]/battle-board, /(authenticated)/events/[eventId]/follow-ups, /(authenticated)/events/[eventId], /(authenticated)/events/[eventId]/waitlist, /(authenticated)/events/battle-boards/[boardId] |
| `payroll` | 10 | /(authenticated)/payroll/direct-deposit, /(authenticated)/payroll/overview, /(authenticated)/payroll, /(authenticated)/payroll/payouts, /(authenticated)/payroll/periods |
| `procurement` | 10 | /(authenticated)/procurement/approvals, /(authenticated)/procurement/budget, /(authenticated)/procurement, /(authenticated)/procurement/purchase-orders/[id], /(authenticated)/procurement/purchase-orders/new |
| `settings` | 10 | /(authenticated)/settings/audit-log, /(authenticated)/settings/email-templates/[id], /(authenticated)/settings/email-templates/new, /(authenticated)/settings/email-templates, /(authenticated)/settings/integrations |
| `analytics` | 9 | /(authenticated)/analytics/activity-feed, /(authenticated)/analytics/clients, /(authenticated)/analytics/events, /(authenticated)/analytics/finance, /(authenticated)/analytics/kitchen |
| `inventory` | 9 | /(authenticated)/inventory/forecasts, /(authenticated)/inventory/import, /(authenticated)/inventory/items, /(authenticated)/inventory/levels, /(authenticated)/inventory |
| `staff` | 9 | /(authenticated)/staff/availability, /(authenticated)/staff/mobile/timeclock, /(authenticated)/staff, /(authenticated)/staff/performance, /(authenticated)/staff/schedule |
| `scheduling` | 8 | /(authenticated)/scheduling/availability, /(authenticated)/scheduling/budgets, /(authenticated)/scheduling, /(authenticated)/scheduling/requests, /(authenticated)/scheduling/settings/manifest-editor |
| `dev-console` | 7 | /(dev-console)/dev-console/api-keys, /(dev-console)/dev-console/audit-logs, /(dev-console)/dev-console/constraint-diagnostics, /(dev-console)/dev-console, /(dev-console)/dev-console/tenants |
| `logistics` | 7 | /(authenticated)/logistics/dispatch, /(authenticated)/logistics/drivers, /(authenticated)/logistics, /(authenticated)/logistics/routes, /(authenticated)/logistics/shipments |
| `warehouse` | 7 | /(authenticated)/warehouse/audits/[sessionId], /(authenticated)/warehouse/audits, /(authenticated)/warehouse/inventory, /(authenticated)/warehouse, /(authenticated)/warehouse/receiving |
| `administrative` | 5 | /(authenticated)/administrative/chat, /(authenticated)/administrative/kanban, /(authenticated)/administrative/overview-boards, /(authenticated)/administrative, /(authenticated)/administrative/trash |
| `facilities` | 5 | /(authenticated)/facilities/areas, /(authenticated)/facilities/assets, /(authenticated)/facilities, /(authenticated)/facilities/schedules, /(authenticated)/facilities/work-orders |
| `staffing` | 5 | /(authenticated)/staffing/availability, /(authenticated)/staffing/coverage, /(authenticated)/staffing, /(authenticated)/staffing/recommendations, /(authenticated)/staffing/shifts |
| `accounting` | 4 | /(authenticated)/accounting/chart-of-accounts, /(authenticated)/accounting/invoices, /(authenticated)/accounting, /(authenticated)/accounting/payments |
| `calendar` | 2 | /(authenticated)/calendar, /(authenticated)/calendar/sync |
| `cycle-counting` | 2 | /(authenticated)/cycle-counting/[sessionId], /(authenticated)/cycle-counting |
| `marketing` | 2 | /(authenticated)/marketing/campaigns, /(authenticated)/marketing |
| `(root)` | 1 | / |
| `[module]` | 1 | /(authenticated)/[module]/settings |
| `contracts` | 1 | /(authenticated)/contracts |
| `knowledge-base` | 1 | /(authenticated)/knowledge-base |
| `plasmic` | 1 | /plasmic/[[...slug]] |
| `search` | 1 | /(authenticated)/search |
| `sign` | 1 | /(unauthenticated)/sign/contract/[token] |
| `sign-in` | 1 | /(unauthenticated)/sign-in/[[...sign-in]] |
| `sign-up` | 1 | /(unauthenticated)/sign-up/[[...sign-up]] |
| `view` | 1 | /(unauthenticated)/view/proposal/[token] |

### apps/web

| `[locale]` | 1 | /[locale]/pricing |

## Detailed API route inventory

Grouped by top-level `/api/<feature>` segment.

### kitchen

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/kitchen/ai/bulk-generate/prep-tasks` | - | - | `apps/api/app/api/kitchen/ai/bulk-generate/prep-tasks/route.ts` |
| `/api/kitchen/ai/bulk-generate/prep-tasks/save` | - | - | `apps/api/app/api/kitchen/ai/bulk-generate/prep-tasks/save/route.ts` |
| `/api/kitchen/alerts-config/[id]` | GET | AlertsConfig | `apps/api/app/api/kitchen/alerts-config/[id]/route.ts` |
| `/api/kitchen/alerts-config/commands/create` | POST | AlertsConfig, User | `apps/api/app/api/kitchen/alerts-config/commands/create/route.ts` |
| `/api/kitchen/alerts-config/commands/remove` | POST | AlertsConfig, User | `apps/api/app/api/kitchen/alerts-config/commands/remove/route.ts` |
| `/api/kitchen/alerts-config/commands/update` | POST | AlertsConfig, User | `apps/api/app/api/kitchen/alerts-config/commands/update/route.ts` |
| `/api/kitchen/alerts-config/list` | GET | AlertsConfig | `apps/api/app/api/kitchen/alerts-config/list/route.ts` |
| `/api/kitchen/allergen-warnings/[id]` | GET | AllergenWarning | `apps/api/app/api/kitchen/allergen-warnings/[id]/route.ts` |
| `/api/kitchen/allergen-warnings/commands/acknowledge` | POST | AllergenWarning, User | `apps/api/app/api/kitchen/allergen-warnings/commands/acknowledge/route.ts` |
| `/api/kitchen/allergen-warnings/commands/apply-override` | POST | AllergenWarning, User | `apps/api/app/api/kitchen/allergen-warnings/commands/apply-override/route.ts` |
| `/api/kitchen/allergen-warnings/commands/create` | POST | AllergenWarning, User | `apps/api/app/api/kitchen/allergen-warnings/commands/create/route.ts` |
| `/api/kitchen/allergen-warnings/commands/resolve` | POST | AllergenWarning, User | `apps/api/app/api/kitchen/allergen-warnings/commands/resolve/route.ts` |
| `/api/kitchen/allergen-warnings/commands/soft-delete` | POST | AllergenWarning, User | `apps/api/app/api/kitchen/allergen-warnings/commands/soft-delete/route.ts` |
| `/api/kitchen/allergen-warnings/list` | GET | AllergenWarning | `apps/api/app/api/kitchen/allergen-warnings/list/route.ts` |
| `/api/kitchen/allergens/detect-conflicts` | POST | AllergenWarning, Event, EventGuest | `apps/api/app/api/kitchen/allergens/detect-conflicts/route.ts` |
| `/api/kitchen/allergens/matrix` | GET | - | `apps/api/app/api/kitchen/allergens/matrix/route.ts` |
| `/api/kitchen/allergens/update-dish` | POST | Dish | `apps/api/app/api/kitchen/allergens/update-dish/route.ts` |
| `/api/kitchen/allergens/warnings` | GET | AllergenWarning | `apps/api/app/api/kitchen/allergens/warnings/route.ts` |
| `/api/kitchen/containers/[id]` | GET | Container | `apps/api/app/api/kitchen/containers/[id]/route.ts` |
| `/api/kitchen/containers/commands/create` | POST | Container, User | `apps/api/app/api/kitchen/containers/commands/create/route.ts` |
| `/api/kitchen/containers/commands/deactivate` | POST | Container, User | `apps/api/app/api/kitchen/containers/commands/deactivate/route.ts` |
| `/api/kitchen/containers/commands/update` | POST | Container, User | `apps/api/app/api/kitchen/containers/commands/update/route.ts` |
| `/api/kitchen/containers/list` | GET | Container | `apps/api/app/api/kitchen/containers/list/route.ts` |
| `/api/kitchen/dish/[id]` | GET | Dish | `apps/api/app/api/kitchen/dish/[id]/route.ts` |
| `/api/kitchen/dish/list` | GET | Dish | `apps/api/app/api/kitchen/dish/list/route.ts` |
| `/api/kitchen/dishes/[id]` | GET | Dish | `apps/api/app/api/kitchen/dishes/[id]/route.ts` |
| `/api/kitchen/dishes/commands/create` | POST | Dish | `apps/api/app/api/kitchen/dishes/commands/create/route.ts` |
| `/api/kitchen/dishes/commands/deactivate` | POST | Dish | `apps/api/app/api/kitchen/dishes/commands/deactivate/route.ts` |
| `/api/kitchen/dishes/commands/update` | POST | Dish | `apps/api/app/api/kitchen/dishes/commands/update/route.ts` |
| `/api/kitchen/dishes/commands/update-lead-time` | POST | Dish | `apps/api/app/api/kitchen/dishes/commands/update-lead-time/route.ts` |
| `/api/kitchen/dishes/commands/update-pricing` | POST | Dish | `apps/api/app/api/kitchen/dishes/commands/update-pricing/route.ts` |
| `/api/kitchen/dishes/list` | GET | Dish | `apps/api/app/api/kitchen/dishes/list/route.ts` |
| `/api/kitchen/dishes` | GET | Dish | `apps/api/app/api/kitchen/dishes/route.ts` |
| `/api/kitchen/equipment/alerts` | GET | - | `apps/api/app/api/kitchen/equipment/alerts/route.ts` |
| `/api/kitchen/equipment/commands/create` | POST | - | `apps/api/app/api/kitchen/equipment/commands/create/route.ts` |
| `/api/kitchen/equipment/commands/record-usage` | POST | - | `apps/api/app/api/kitchen/equipment/commands/record-usage/route.ts` |
| `/api/kitchen/equipment/commands/schedule-maintenance` | POST | - | `apps/api/app/api/kitchen/equipment/commands/schedule-maintenance/route.ts` |
| `/api/kitchen/equipment/commands/update-status` | POST | - | `apps/api/app/api/kitchen/equipment/commands/update-status/route.ts` |
| `/api/kitchen/equipment/list` | GET | - | `apps/api/app/api/kitchen/equipment/list/route.ts` |
| `/api/kitchen/events/today` | GET | Event, KitchenTask, KitchenTaskClaim, PrepList, PrepListItem | `apps/api/app/api/kitchen/events/today/route.ts` |
| `/api/kitchen/ingredient/[id]` | GET | Ingredient | `apps/api/app/api/kitchen/ingredient/[id]/route.ts` |
| `/api/kitchen/ingredient/list` | GET | Ingredient | `apps/api/app/api/kitchen/ingredient/list/route.ts` |
| `/api/kitchen/ingredients/[id]` | GET | Ingredient | `apps/api/app/api/kitchen/ingredients/[id]/route.ts` |
| `/api/kitchen/ingredients/commands/create` | POST | Ingredient | `apps/api/app/api/kitchen/ingredients/commands/create/route.ts` |
| `/api/kitchen/ingredients/commands/deactivate` | POST | Ingredient | `apps/api/app/api/kitchen/ingredients/commands/deactivate/route.ts` |
| `/api/kitchen/ingredients/commands/update` | POST | Ingredient | `apps/api/app/api/kitchen/ingredients/commands/update/route.ts` |
| `/api/kitchen/ingredients/commands/update-allergens` | POST | Ingredient | `apps/api/app/api/kitchen/ingredients/commands/update-allergens/route.ts` |
| `/api/kitchen/ingredients/commands/update-shelf-life` | POST | Ingredient | `apps/api/app/api/kitchen/ingredients/commands/update-shelf-life/route.ts` |
| `/api/kitchen/ingredients/list` | GET | Ingredient | `apps/api/app/api/kitchen/ingredients/list/route.ts` |
| `/api/kitchen/ingredients` | GET | Ingredient | `apps/api/app/api/kitchen/ingredients/route.ts` |
| `/api/kitchen/inventory/[id]` | GET | InventoryItem | `apps/api/app/api/kitchen/inventory/[id]/route.ts` |
| `/api/kitchen/inventory/commands/adjust` | POST | InventoryItem | `apps/api/app/api/kitchen/inventory/commands/adjust/route.ts` |
| `/api/kitchen/inventory/commands/consume` | POST | InventoryItem | `apps/api/app/api/kitchen/inventory/commands/consume/route.ts` |
| `/api/kitchen/inventory/commands/create` | POST | InventoryItem | `apps/api/app/api/kitchen/inventory/commands/create/route.ts` |
| `/api/kitchen/inventory/commands/release-reservation` | POST | InventoryItem | `apps/api/app/api/kitchen/inventory/commands/release-reservation/route.ts` |
| `/api/kitchen/inventory/commands/reserve` | POST | InventoryItem | `apps/api/app/api/kitchen/inventory/commands/reserve/route.ts` |
| `/api/kitchen/inventory/commands/restock` | POST | InventoryItem | `apps/api/app/api/kitchen/inventory/commands/restock/route.ts` |
| `/api/kitchen/inventory/commands/waste` | POST | InventoryItem | `apps/api/app/api/kitchen/inventory/commands/waste/route.ts` |
| `/api/kitchen/inventory/list` | GET | InventoryItem | `apps/api/app/api/kitchen/inventory/list/route.ts` |
| `/api/kitchen/inventoryitem/[id]` | GET | InventoryItem | `apps/api/app/api/kitchen/inventoryitem/[id]/route.ts` |
| `/api/kitchen/inventoryitem/list` | GET | InventoryItem | `apps/api/app/api/kitchen/inventoryitem/list/route.ts` |
| `/api/kitchen/iot/alerts` | GET, POST | IoTAlert | `apps/api/app/api/kitchen/iot/alerts/route.ts` |
| `/api/kitchen/iot/probes` | GET, POST | TemperatureProbe | `apps/api/app/api/kitchen/iot/probes/route.ts` |
| `/api/kitchen/iot/readings` | GET, POST | IoTAlert, TemperatureProbe, TemperatureReading | `apps/api/app/api/kitchen/iot/readings/route.ts` |
| `/api/kitchen/kitchen-tasks/[id]` | GET | KitchenTask | `apps/api/app/api/kitchen/kitchen-tasks/[id]/route.ts` |
| `/api/kitchen/kitchen-tasks/commands/add-tag` | POST | KitchenTask | `apps/api/app/api/kitchen/kitchen-tasks/commands/add-tag/route.ts` |
| `/api/kitchen/kitchen-tasks/commands/cancel` | POST | KitchenTask | `apps/api/app/api/kitchen/kitchen-tasks/commands/cancel/route.ts` |
| `/api/kitchen/kitchen-tasks/commands/claim` | POST | KitchenTask, User | `apps/api/app/api/kitchen/kitchen-tasks/commands/claim/route.ts` |
| `/api/kitchen/kitchen-tasks/commands/complete` | POST | KitchenTask | `apps/api/app/api/kitchen/kitchen-tasks/commands/complete/route.ts` |
| `/api/kitchen/kitchen-tasks/commands/create` | POST | KitchenTask | `apps/api/app/api/kitchen/kitchen-tasks/commands/create/route.ts` |
| `/api/kitchen/kitchen-tasks/commands/reassign` | POST | KitchenTask | `apps/api/app/api/kitchen/kitchen-tasks/commands/reassign/route.ts` |
| `/api/kitchen/kitchen-tasks/commands/release` | POST | KitchenTask | `apps/api/app/api/kitchen/kitchen-tasks/commands/release/route.ts` |
| `/api/kitchen/kitchen-tasks/commands/remove-tag` | POST | KitchenTask | `apps/api/app/api/kitchen/kitchen-tasks/commands/remove-tag/route.ts` |
| `/api/kitchen/kitchen-tasks/commands/start` | POST | KitchenTask | `apps/api/app/api/kitchen/kitchen-tasks/commands/start/route.ts` |
| `/api/kitchen/kitchen-tasks/commands/update-complexity` | POST | KitchenTask | `apps/api/app/api/kitchen/kitchen-tasks/commands/update-complexity/route.ts` |
| `/api/kitchen/kitchen-tasks/commands/update-priority` | POST | KitchenTask | `apps/api/app/api/kitchen/kitchen-tasks/commands/update-priority/route.ts` |
| `/api/kitchen/kitchen-tasks/list` | GET | KitchenTask | `apps/api/app/api/kitchen/kitchen-tasks/list/route.ts` |
| `/api/kitchen/menu/[id]` | GET | Menu | `apps/api/app/api/kitchen/menu/[id]/route.ts` |
| `/api/kitchen/menu/list` | GET | Menu | `apps/api/app/api/kitchen/menu/list/route.ts` |
| `/api/kitchen/menu-dishes/[id]` | GET | MenuDish | `apps/api/app/api/kitchen/menu-dishes/[id]/route.ts` |
| `/api/kitchen/menu-dishes/commands/create` | POST | MenuDish | `apps/api/app/api/kitchen/menu-dishes/commands/create/route.ts` |
| `/api/kitchen/menu-dishes/commands/remove` | POST | MenuDish | `apps/api/app/api/kitchen/menu-dishes/commands/remove/route.ts` |
| `/api/kitchen/menu-dishes/commands/update-course` | POST | MenuDish | `apps/api/app/api/kitchen/menu-dishes/commands/update-course/route.ts` |
| `/api/kitchen/menu-dishes/list` | GET | MenuDish | `apps/api/app/api/kitchen/menu-dishes/list/route.ts` |
| `/api/kitchen/menudish/[id]` | GET | MenuDish | `apps/api/app/api/kitchen/menudish/[id]/route.ts` |
| `/api/kitchen/menudish/list` | GET | MenuDish | `apps/api/app/api/kitchen/menudish/list/route.ts` |
| `/api/kitchen/menus/[id]` | GET | Menu | `apps/api/app/api/kitchen/menus/[id]/route.ts` |
| `/api/kitchen/menus/commands/activate` | POST | Menu | `apps/api/app/api/kitchen/menus/commands/activate/route.ts` |
| `/api/kitchen/menus/commands/create` | POST | Menu | `apps/api/app/api/kitchen/menus/commands/create/route.ts` |
| `/api/kitchen/menus/commands/deactivate` | POST | Menu | `apps/api/app/api/kitchen/menus/commands/deactivate/route.ts` |
| `/api/kitchen/menus/commands/update` | POST | Menu | `apps/api/app/api/kitchen/menus/commands/update/route.ts` |
| `/api/kitchen/menus/dishes/commands/create` | POST | MenuDish | `apps/api/app/api/kitchen/menus/dishes/commands/create/route.ts` |
| `/api/kitchen/menus/list` | GET | Menu | `apps/api/app/api/kitchen/menus/list/route.ts` |
| `/api/kitchen/menus` | GET | Menu | `apps/api/app/api/kitchen/menus/route.ts` |
| `/api/kitchen/nutrition-labels/generate` | POST | Ingredient, Recipe, RecipeIngredient, RecipeVersion | `apps/api/app/api/kitchen/nutrition-labels/generate/route.ts` |
| `/api/kitchen/nutrition-labels/list` | GET | Recipe, RecipeIngredient, RecipeVersion | `apps/api/app/api/kitchen/nutrition-labels/list/route.ts` |
| `/api/kitchen/override-audits/[id]` | GET | OverrideAudit | `apps/api/app/api/kitchen/override-audits/[id]/route.ts` |
| `/api/kitchen/override-audits/commands/authorize` | POST | OverrideAudit, User | `apps/api/app/api/kitchen/override-audits/commands/authorize/route.ts` |
| `/api/kitchen/override-audits/commands/create` | POST | OverrideAudit, User | `apps/api/app/api/kitchen/override-audits/commands/create/route.ts` |
| `/api/kitchen/override-audits/list` | GET | OverrideAudit | `apps/api/app/api/kitchen/override-audits/list/route.ts` |
| `/api/kitchen/overrides` | GET, POST | OverrideAudit, User | `apps/api/app/api/kitchen/overrides/route.ts` |
| `/api/kitchen/prep-comments/[id]` | GET | PrepComment | `apps/api/app/api/kitchen/prep-comments/[id]/route.ts` |
| `/api/kitchen/prep-comments/commands/create` | POST | PrepComment, User | `apps/api/app/api/kitchen/prep-comments/commands/create/route.ts` |
| `/api/kitchen/prep-comments/commands/resolve` | POST | PrepComment, User | `apps/api/app/api/kitchen/prep-comments/commands/resolve/route.ts` |
| `/api/kitchen/prep-comments/commands/soft-delete` | POST | PrepComment, User | `apps/api/app/api/kitchen/prep-comments/commands/soft-delete/route.ts` |
| `/api/kitchen/prep-comments/commands/unresolve` | POST | PrepComment, User | `apps/api/app/api/kitchen/prep-comments/commands/unresolve/route.ts` |
| `/api/kitchen/prep-comments/list` | GET | PrepComment | `apps/api/app/api/kitchen/prep-comments/list/route.ts` |
| `/api/kitchen/prep-list-items/[id]` | GET | PrepListItem | `apps/api/app/api/kitchen/prep-list-items/[id]/route.ts` |
| `/api/kitchen/prep-list-items/commands/create` | POST | PrepListItem | `apps/api/app/api/kitchen/prep-list-items/commands/create/route.ts` |
| `/api/kitchen/prep-list-items/commands/mark-completed` | POST | PrepListItem | `apps/api/app/api/kitchen/prep-list-items/commands/mark-completed/route.ts` |
| `/api/kitchen/prep-list-items/commands/mark-uncompleted` | POST | PrepListItem | `apps/api/app/api/kitchen/prep-list-items/commands/mark-uncompleted/route.ts` |
| `/api/kitchen/prep-list-items/commands/update-prep-notes` | POST | PrepListItem | `apps/api/app/api/kitchen/prep-list-items/commands/update-prep-notes/route.ts` |
| `/api/kitchen/prep-list-items/commands/update-quantity` | POST | PrepListItem | `apps/api/app/api/kitchen/prep-list-items/commands/update-quantity/route.ts` |
| `/api/kitchen/prep-list-items/commands/update-station` | POST | PrepListItem | `apps/api/app/api/kitchen/prep-list-items/commands/update-station/route.ts` |
| `/api/kitchen/prep-list-items/list` | GET | PrepListItem | `apps/api/app/api/kitchen/prep-list-items/list/route.ts` |
| `/api/kitchen/prep-lists/[id]/items/[itemId]/complete` | POST | PrepListItem | `apps/api/app/api/kitchen/prep-lists/[id]/items/[itemId]/complete/route.ts` |
| `/api/kitchen/prep-lists/[id]` | DELETE, GET, PATCH | Event, PrepList, PrepListItem | `apps/api/app/api/kitchen/prep-lists/[id]/route.ts` |
| `/api/kitchen/prep-lists/autogenerate/process` | GET, POST | OutboxEvent | `apps/api/app/api/kitchen/prep-lists/autogenerate/process/route.ts` |
| `/api/kitchen/prep-lists/commands/activate` | POST | PrepList | `apps/api/app/api/kitchen/prep-lists/commands/activate/route.ts` |
| `/api/kitchen/prep-lists/commands/cancel` | POST | PrepList | `apps/api/app/api/kitchen/prep-lists/commands/cancel/route.ts` |
| `/api/kitchen/prep-lists/commands/create` | POST | PrepList | `apps/api/app/api/kitchen/prep-lists/commands/create/route.ts` |
| `/api/kitchen/prep-lists/commands/create-from-seed` | POST | PrepList | `apps/api/app/api/kitchen/prep-lists/commands/create-from-seed/route.ts` |
| `/api/kitchen/prep-lists/commands/deactivate` | POST | PrepList | `apps/api/app/api/kitchen/prep-lists/commands/deactivate/route.ts` |
| `/api/kitchen/prep-lists/commands/finalize` | POST | PrepList | `apps/api/app/api/kitchen/prep-lists/commands/finalize/route.ts` |
| `/api/kitchen/prep-lists/commands/mark-completed` | POST | PrepList | `apps/api/app/api/kitchen/prep-lists/commands/mark-completed/route.ts` |
| `/api/kitchen/prep-lists/commands/reopen` | POST | PrepList | `apps/api/app/api/kitchen/prep-lists/commands/reopen/route.ts` |
| `/api/kitchen/prep-lists/commands/update` | POST | PrepList | `apps/api/app/api/kitchen/prep-lists/commands/update/route.ts` |
| `/api/kitchen/prep-lists/commands/update-batch-multiplier` | POST | PrepList | `apps/api/app/api/kitchen/prep-lists/commands/update-batch-multiplier/route.ts` |
| `/api/kitchen/prep-lists/generate` | POST | Event | `apps/api/app/api/kitchen/prep-lists/generate/route.ts` |
| `/api/kitchen/prep-lists/items/[id]` | DELETE, PATCH | PrepListItem | `apps/api/app/api/kitchen/prep-lists/items/[id]/route.ts` |
| `/api/kitchen/prep-lists/list` | GET | PrepList | `apps/api/app/api/kitchen/prep-lists/list/route.ts` |
| `/api/kitchen/prep-lists` | GET, POST | Event, PrepList, PrepListItem | `apps/api/app/api/kitchen/prep-lists/route.ts` |
| `/api/kitchen/prep-lists/save-db` | POST | PrepList, PrepListItem | `apps/api/app/api/kitchen/prep-lists/save-db/route.ts` |
| `/api/kitchen/prep-methods/[id]` | GET | PrepMethod | `apps/api/app/api/kitchen/prep-methods/[id]/route.ts` |
| `/api/kitchen/prep-methods/commands/create` | POST | PrepMethod, User | `apps/api/app/api/kitchen/prep-methods/commands/create/route.ts` |
| `/api/kitchen/prep-methods/commands/deactivate` | POST | PrepMethod, User | `apps/api/app/api/kitchen/prep-methods/commands/deactivate/route.ts` |
| `/api/kitchen/prep-methods/commands/update` | POST | PrepMethod, User | `apps/api/app/api/kitchen/prep-methods/commands/update/route.ts` |
| `/api/kitchen/prep-methods/list` | GET | PrepMethod | `apps/api/app/api/kitchen/prep-methods/list/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/[id]` | GET | - | `apps/api/app/api/kitchen/prep-task-plan-workflows/[id]/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/commands/approve-plan` | POST | PrepTaskPlanWorkflow (manifest), User | `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/approve-plan/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/commands/cancel` | POST | PrepTaskPlanWorkflow (manifest), User | `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/cancel/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/commands/complete-generation` | POST | PrepTaskPlanWorkflow (manifest), User | `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/complete-generation/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/commands/complete-instantiation` | POST | PrepTaskPlanWorkflow (manifest), User | `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/complete-instantiation/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/commands/complete-review` | POST | PrepTaskPlanWorkflow (manifest), User | `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/complete-review/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/commands/complete-scheduling` | POST | PrepTaskPlanWorkflow (manifest), User | `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/complete-scheduling/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/commands/create` | POST | PrepTaskPlanWorkflow (manifest), User | `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/create/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/commands/fail` | POST | PrepTaskPlanWorkflow (manifest), User | `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/fail/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/commands/quick-approve` | POST | PrepTaskPlanWorkflow (manifest), User | `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/quick-approve/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/commands/reject-plan` | POST | PrepTaskPlanWorkflow (manifest), User | `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/reject-plan/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/commands/retry` | POST | PrepTaskPlanWorkflow (manifest), User | `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/retry/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/commands/start-approving` | POST | PrepTaskPlanWorkflow (manifest), User | `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/start-approving/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/commands/start-generating` | POST | PrepTaskPlanWorkflow (manifest), User | `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/start-generating/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/commands/start-instantiating` | POST | PrepTaskPlanWorkflow (manifest), User | `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/start-instantiating/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/commands/start-reviewing` | POST | PrepTaskPlanWorkflow (manifest), User | `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/start-reviewing/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/commands/start-scheduling` | POST | PrepTaskPlanWorkflow (manifest), User | `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/start-scheduling/route.ts` |
| `/api/kitchen/prep-task-plan-workflows/list` | GET | - | `apps/api/app/api/kitchen/prep-task-plan-workflows/list/route.ts` |
| `/api/kitchen/prep-tasks/[id]` | GET | PrepTask | `apps/api/app/api/kitchen/prep-tasks/[id]/route.ts` |
| `/api/kitchen/prep-tasks/commands/cancel` | POST | PrepTask | `apps/api/app/api/kitchen/prep-tasks/commands/cancel/route.ts` |
| `/api/kitchen/prep-tasks/commands/claim` | POST | PrepTask | `apps/api/app/api/kitchen/prep-tasks/commands/claim/route.ts` |
| `/api/kitchen/prep-tasks/commands/complete` | POST | PrepTask | `apps/api/app/api/kitchen/prep-tasks/commands/complete/route.ts` |
| `/api/kitchen/prep-tasks/commands/create` | POST | PrepTask | `apps/api/app/api/kitchen/prep-tasks/commands/create/route.ts` |
| `/api/kitchen/prep-tasks/commands/reassign` | POST | PrepTask | `apps/api/app/api/kitchen/prep-tasks/commands/reassign/route.ts` |
| `/api/kitchen/prep-tasks/commands/release` | POST | PrepTask | `apps/api/app/api/kitchen/prep-tasks/commands/release/route.ts` |
| `/api/kitchen/prep-tasks/commands/start` | POST | PrepTask | `apps/api/app/api/kitchen/prep-tasks/commands/start/route.ts` |
| `/api/kitchen/prep-tasks/commands/unclaim` | POST | PrepTask | `apps/api/app/api/kitchen/prep-tasks/commands/unclaim/route.ts` |
| `/api/kitchen/prep-tasks/commands/update-assignment` | POST | PrepTask | `apps/api/app/api/kitchen/prep-tasks/commands/update-assignment/route.ts` |
| `/api/kitchen/prep-tasks/commands/update-due-date` | POST | PrepTask | `apps/api/app/api/kitchen/prep-tasks/commands/update-due-date/route.ts` |
| `/api/kitchen/prep-tasks/commands/update-priority` | POST | PrepTask | `apps/api/app/api/kitchen/prep-tasks/commands/update-priority/route.ts` |
| `/api/kitchen/prep-tasks/commands/update-quantity` | POST | PrepTask | `apps/api/app/api/kitchen/prep-tasks/commands/update-quantity/route.ts` |
| `/api/kitchen/prep-tasks/commands/update-status` | POST | PrepTask | `apps/api/app/api/kitchen/prep-tasks/commands/update-status/route.ts` |
| `/api/kitchen/prep-tasks/list` | GET | PrepTask | `apps/api/app/api/kitchen/prep-tasks/list/route.ts` |
| `/api/kitchen/prep-tasks` | GET | PrepTask | `apps/api/app/api/kitchen/prep-tasks/route.ts` |
| `/api/kitchen/preplist/[id]` | GET | PrepList | `apps/api/app/api/kitchen/preplist/[id]/route.ts` |
| `/api/kitchen/preplist/list` | GET | PrepList | `apps/api/app/api/kitchen/preplist/list/route.ts` |
| `/api/kitchen/preplistitem/[id]` | GET | PrepListItem | `apps/api/app/api/kitchen/preplistitem/[id]/route.ts` |
| `/api/kitchen/preplistitem/list` | GET | PrepListItem | `apps/api/app/api/kitchen/preplistitem/list/route.ts` |
| `/api/kitchen/preptask/[id]` | GET | PrepTask | `apps/api/app/api/kitchen/preptask/[id]/route.ts` |
| `/api/kitchen/preptask/list` | GET | PrepTask | `apps/api/app/api/kitchen/preptask/list/route.ts` |
| `/api/kitchen/quality-assurance/checks/commands/complete` | POST | QualityCheck, QualityCheckItem | `apps/api/app/api/kitchen/quality-assurance/checks/commands/complete/route.ts` |
| `/api/kitchen/quality-assurance/checks/commands/create` | POST | QualityCheck | `apps/api/app/api/kitchen/quality-assurance/checks/commands/create/route.ts` |
| `/api/kitchen/quality-assurance/checks/list` | GET | QualityCheck | `apps/api/app/api/kitchen/quality-assurance/checks/list/route.ts` |
| `/api/kitchen/quality-assurance/corrective-actions/commands/create` | POST | CorrectiveAction | `apps/api/app/api/kitchen/quality-assurance/corrective-actions/commands/create/route.ts` |
| `/api/kitchen/quality-assurance/corrective-actions/commands/resolve` | POST | CorrectiveAction | `apps/api/app/api/kitchen/quality-assurance/corrective-actions/commands/resolve/route.ts` |
| `/api/kitchen/quality-assurance/corrective-actions/list` | GET | CorrectiveAction | `apps/api/app/api/kitchen/quality-assurance/corrective-actions/list/route.ts` |
| `/api/kitchen/quality-assurance/temperature-logs/commands/log` | POST | TemperatureLog | `apps/api/app/api/kitchen/quality-assurance/temperature-logs/commands/log/route.ts` |
| `/api/kitchen/quality-assurance/temperature-logs/list` | GET | TemperatureLog | `apps/api/app/api/kitchen/quality-assurance/temperature-logs/list/route.ts` |
| `/api/kitchen/recipe/[id]` | GET | Recipe | `apps/api/app/api/kitchen/recipe/[id]/route.ts` |
| `/api/kitchen/recipe/list` | GET | Recipe | `apps/api/app/api/kitchen/recipe/list/route.ts` |
| `/api/kitchen/recipe-ingredients/[id]` | GET | RecipeIngredient | `apps/api/app/api/kitchen/recipe-ingredients/[id]/route.ts` |
| `/api/kitchen/recipe-ingredients/commands/create` | POST | RecipeIngredient | `apps/api/app/api/kitchen/recipe-ingredients/commands/create/route.ts` |
| `/api/kitchen/recipe-ingredients/commands/remove` | POST | RecipeIngredient | `apps/api/app/api/kitchen/recipe-ingredients/commands/remove/route.ts` |
| `/api/kitchen/recipe-ingredients/commands/update-quantity` | POST | RecipeIngredient | `apps/api/app/api/kitchen/recipe-ingredients/commands/update-quantity/route.ts` |
| `/api/kitchen/recipe-ingredients/commands/update-waste-factor` | POST | RecipeIngredient | `apps/api/app/api/kitchen/recipe-ingredients/commands/update-waste-factor/route.ts` |
| `/api/kitchen/recipe-ingredients/list` | GET | RecipeIngredient | `apps/api/app/api/kitchen/recipe-ingredients/list/route.ts` |
| `/api/kitchen/recipe-steps/[id]` | GET | recipe_steps | `apps/api/app/api/kitchen/recipe-steps/[id]/route.ts` |
| `/api/kitchen/recipe-steps/commands/create` | POST | RecipeStep (manifest), User | `apps/api/app/api/kitchen/recipe-steps/commands/create/route.ts` |
| `/api/kitchen/recipe-steps/commands/remove` | POST | RecipeStep (manifest), User | `apps/api/app/api/kitchen/recipe-steps/commands/remove/route.ts` |
| `/api/kitchen/recipe-steps/commands/update-instruction` | POST | RecipeStep (manifest), User | `apps/api/app/api/kitchen/recipe-steps/commands/update-instruction/route.ts` |
| `/api/kitchen/recipe-steps/list` | GET | recipe_steps | `apps/api/app/api/kitchen/recipe-steps/list/route.ts` |
| `/api/kitchen/recipe-versions/[id]` | GET | RecipeVersion | `apps/api/app/api/kitchen/recipe-versions/[id]/route.ts` |
| `/api/kitchen/recipe-versions/commands/create` | POST | RecipeVersion | `apps/api/app/api/kitchen/recipe-versions/commands/create/route.ts` |
| `/api/kitchen/recipe-versions/commands/restore` | POST | RecipeVersion | `apps/api/app/api/kitchen/recipe-versions/commands/restore/route.ts` |
| `/api/kitchen/recipe-versions/commands/update-costs` | POST | RecipeVersion | `apps/api/app/api/kitchen/recipe-versions/commands/update-costs/route.ts` |
| `/api/kitchen/recipe-versions/list` | GET | RecipeVersion | `apps/api/app/api/kitchen/recipe-versions/list/route.ts` |
| `/api/kitchen/recipeingredient/[id]` | GET | RecipeIngredient | `apps/api/app/api/kitchen/recipeingredient/[id]/route.ts` |
| `/api/kitchen/recipeingredient/list` | GET | RecipeIngredient | `apps/api/app/api/kitchen/recipeingredient/list/route.ts` |
| `/api/kitchen/recipes/[recipeId]/composite/restore-version` | POST | RecipeIngredient, RecipeStep (manifest), RecipeVersion, recipe_steps | `apps/api/app/api/kitchen/recipes/[recipeId]/composite/restore-version/route.ts` |
| `/api/kitchen/recipes/[recipeId]/composite/update-with-version` | POST | Recipe, RecipeIngredient, RecipeStep (manifest), RecipeVersion | `apps/api/app/api/kitchen/recipes/[recipeId]/composite/update-with-version/route.ts` |
| `/api/kitchen/recipes/[recipeId]/cost` | GET, POST | Ingredient, RecipeIngredient, RecipeVersion | `apps/api/app/api/kitchen/recipes/[recipeId]/cost/route.ts` |
| `/api/kitchen/recipes/[recipeId]/ingredients` | GET | Ingredient, Recipe, RecipeIngredient, RecipeVersion, units | `apps/api/app/api/kitchen/recipes/[recipeId]/ingredients/route.ts` |
| `/api/kitchen/recipes/[recipeId]` | GET | Recipe | `apps/api/app/api/kitchen/recipes/[recipeId]/route.ts` |
| `/api/kitchen/recipes/[recipeId]/scale` | GET, PATCH, POST | Ingredient, RecipeIngredient, RecipeVersion | `apps/api/app/api/kitchen/recipes/[recipeId]/scale/route.ts` |
| `/api/kitchen/recipes/[recipeId]/steps` | GET | Recipe, RecipeVersion, recipe_steps, units | `apps/api/app/api/kitchen/recipes/[recipeId]/steps/route.ts` |
| `/api/kitchen/recipes/[recipeId]/update-budgets` | POST | - | `apps/api/app/api/kitchen/recipes/[recipeId]/update-budgets/route.ts` |
| `/api/kitchen/recipes/[recipeId]/versions/[versionId]` | GET | - | `apps/api/app/api/kitchen/recipes/[recipeId]/versions/[versionId]/route.ts` |
| `/api/kitchen/recipes/[recipeId]/versions/compare` | GET | - | `apps/api/app/api/kitchen/recipes/[recipeId]/versions/compare/route.ts` |
| `/api/kitchen/recipes/[recipeId]/versions` | GET | - | `apps/api/app/api/kitchen/recipes/[recipeId]/versions/route.ts` |
| `/api/kitchen/recipes/commands/activate` | POST | Recipe | `apps/api/app/api/kitchen/recipes/commands/activate/route.ts` |
| `/api/kitchen/recipes/commands/create` | POST | Recipe | `apps/api/app/api/kitchen/recipes/commands/create/route.ts` |
| `/api/kitchen/recipes/commands/deactivate` | POST | Recipe | `apps/api/app/api/kitchen/recipes/commands/deactivate/route.ts` |
| `/api/kitchen/recipes/commands/update` | POST | Recipe | `apps/api/app/api/kitchen/recipes/commands/update/route.ts` |
| `/api/kitchen/recipes/composite/create-with-version` | POST | Recipe, RecipeIngredient, RecipeStep (manifest), RecipeVersion | `apps/api/app/api/kitchen/recipes/composite/create-with-version/route.ts` |
| `/api/kitchen/recipes/list` | GET | Recipe | `apps/api/app/api/kitchen/recipes/list/route.ts` |
| `/api/kitchen/recipes` | GET | Recipe | `apps/api/app/api/kitchen/recipes/route.ts` |
| `/api/kitchen/recipes/versions/commands/create` | POST | RecipeVersion | `apps/api/app/api/kitchen/recipes/versions/commands/create/route.ts` |
| `/api/kitchen/recipeversion/[id]` | GET | RecipeVersion | `apps/api/app/api/kitchen/recipeversion/[id]/route.ts` |
| `/api/kitchen/recipeversion/list` | GET | RecipeVersion | `apps/api/app/api/kitchen/recipeversion/list/route.ts` |
| `/api/kitchen/station/[id]` | GET | Station | `apps/api/app/api/kitchen/station/[id]/route.ts` |
| `/api/kitchen/station/list` | GET | Station | `apps/api/app/api/kitchen/station/list/route.ts` |
| `/api/kitchen/stations/[id]` | GET | Station | `apps/api/app/api/kitchen/stations/[id]/route.ts` |
| `/api/kitchen/stations/commands/activate` | POST | Station | `apps/api/app/api/kitchen/stations/commands/activate/route.ts` |
| `/api/kitchen/stations/commands/assign-task` | POST | Station | `apps/api/app/api/kitchen/stations/commands/assign-task/route.ts` |
| `/api/kitchen/stations/commands/create` | POST | Station | `apps/api/app/api/kitchen/stations/commands/create/route.ts` |
| `/api/kitchen/stations/commands/deactivate` | POST | Station | `apps/api/app/api/kitchen/stations/commands/deactivate/route.ts` |
| `/api/kitchen/stations/commands/remove-task` | POST | Station | `apps/api/app/api/kitchen/stations/commands/remove-task/route.ts` |
| `/api/kitchen/stations/commands/update-capacity` | POST | Station | `apps/api/app/api/kitchen/stations/commands/update-capacity/route.ts` |
| `/api/kitchen/stations/commands/update-equipment` | POST | Station | `apps/api/app/api/kitchen/stations/commands/update-equipment/route.ts` |
| `/api/kitchen/stations/list` | GET | Station | `apps/api/app/api/kitchen/stations/list/route.ts` |
| `/api/kitchen/stations` | GET | PrepListItem, Station | `apps/api/app/api/kitchen/stations/route.ts` |
| `/api/kitchen/tasks/[id]/claim` | POST | User | `apps/api/app/api/kitchen/tasks/[id]/claim/route.ts` |
| `/api/kitchen/tasks/[id]/claim-shadow-manifest` | POST | PrepTask | `apps/api/app/api/kitchen/tasks/[id]/claim-shadow-manifest/route.ts` |
| `/api/kitchen/tasks/[id]/release` | POST | KitchenTask | `apps/api/app/api/kitchen/tasks/[id]/release/route.ts` |
| `/api/kitchen/tasks/[id]` | DELETE, PATCH | KitchenTask | `apps/api/app/api/kitchen/tasks/[id]/route.ts` |
| `/api/kitchen/tasks/available` | GET | KitchenTask, KitchenTaskClaim, User | `apps/api/app/api/kitchen/tasks/available/route.ts` |
| `/api/kitchen/tasks/bundle-claim` | POST | KitchenTaskClaim, PrepTask, User | `apps/api/app/api/kitchen/tasks/bundle-claim/route.ts` |
| `/api/kitchen/tasks/my-tasks` | GET | KitchenTask, KitchenTaskClaim, User | `apps/api/app/api/kitchen/tasks/my-tasks/route.ts` |
| `/api/kitchen/tasks` | GET, POST | KitchenTask, KitchenTaskClaim, User | `apps/api/app/api/kitchen/tasks/route.ts` |
| `/api/kitchen/tasks/sync-claims` | POST | KitchenTask, User | `apps/api/app/api/kitchen/tasks/sync-claims/route.ts` |
| `/api/kitchen/waste/entries/[id]` | DELETE, GET, PUT | WasteEntry | `apps/api/app/api/kitchen/waste/entries/[id]/route.ts` |
| `/api/kitchen/waste/entries` | GET, POST | InventoryItem, User, WasteEntry, WasteReason | `apps/api/app/api/kitchen/waste/entries/route.ts` |
| `/api/kitchen/waste/reasons` | GET | WasteReason | `apps/api/app/api/kitchen/waste/reasons/route.ts` |
| `/api/kitchen/waste/reports` | GET | WasteEntry, WasteReason | `apps/api/app/api/kitchen/waste/reports/route.ts` |
| `/api/kitchen/waste/trends` | GET | - | `apps/api/app/api/kitchen/waste/trends/route.ts` |
| `/api/kitchen/waste/units` | GET | - | `apps/api/app/api/kitchen/waste/units/route.ts` |
| `/api/kitchen/waste-entries/[id]` | GET | WasteEntry | `apps/api/app/api/kitchen/waste-entries/[id]/route.ts` |
| `/api/kitchen/waste-entries/commands/create` | POST | User, WasteEntry | `apps/api/app/api/kitchen/waste-entries/commands/create/route.ts` |
| `/api/kitchen/waste-entries/commands/soft-delete` | POST | User, WasteEntry | `apps/api/app/api/kitchen/waste-entries/commands/soft-delete/route.ts` |
| `/api/kitchen/waste-entries/commands/update` | POST | User, WasteEntry | `apps/api/app/api/kitchen/waste-entries/commands/update/route.ts` |
| `/api/kitchen/waste-entries/list` | GET | WasteEntry | `apps/api/app/api/kitchen/waste-entries/list/route.ts` |

### events

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/events/[eventId]/export/csv` | - | Event | `apps/api/app/api/events/[eventId]/export/csv/route.ts` |
| `/api/events/[eventId]/guests` | GET, POST | Event, EventGuest | `apps/api/app/api/events/[eventId]/guests/route.ts` |
| `/api/events/[eventId]/shipments/generate` | GET, POST | Event, InventoryItem, Shipment, ShipmentItem | `apps/api/app/api/events/[eventId]/shipments/generate/route.ts` |
| `/api/events/[eventId]/waitlist/commands/add-guest` | POST | - | `apps/api/app/api/events/[eventId]/waitlist/commands/add-guest/route.ts` |
| `/api/events/[eventId]/waitlist/commands/promote` | POST | - | `apps/api/app/api/events/[eventId]/waitlist/commands/promote/route.ts` |
| `/api/events/[eventId]/waitlist/commands/update-rsvp` | POST | - | `apps/api/app/api/events/[eventId]/waitlist/commands/update-rsvp/route.ts` |
| `/api/events/[eventId]/waitlist` | GET | - | `apps/api/app/api/events/[eventId]/waitlist/route.ts` |
| `/api/events/[eventId]/warnings` | GET | AllergenWarning, Event | `apps/api/app/api/events/[eventId]/warnings/route.ts` |
| `/api/events/allergens/check` | POST | Event, EventGuest | `apps/api/app/api/events/allergens/check/route.ts` |
| `/api/events/allergens/warnings/acknowledge` | POST | AllergenWarning | `apps/api/app/api/events/allergens/warnings/acknowledge/route.ts` |
| `/api/events/automated-followups/commands/complete` | POST | - | `apps/api/app/api/events/automated-followups/commands/complete/route.ts` |
| `/api/events/automated-followups/commands/create` | POST | - | `apps/api/app/api/events/automated-followups/commands/create/route.ts` |
| `/api/events/automated-followups/commands/generate` | POST | - | `apps/api/app/api/events/automated-followups/commands/generate/route.ts` |
| `/api/events/automated-followups/commands/skip` | POST | - | `apps/api/app/api/events/automated-followups/commands/skip/route.ts` |
| `/api/events/automated-followups/list` | GET | - | `apps/api/app/api/events/automated-followups/list/route.ts` |
| `/api/events/battle-boards/[id]` | GET | BattleBoard | `apps/api/app/api/events/battle-boards/[id]/route.ts` |
| `/api/events/battle-boards/commands/add-dish` | POST | BattleBoard, User | `apps/api/app/api/events/battle-boards/commands/add-dish/route.ts` |
| `/api/events/battle-boards/commands/create` | POST | BattleBoard, User | `apps/api/app/api/events/battle-boards/commands/create/route.ts` |
| `/api/events/battle-boards/commands/finalize` | POST | BattleBoard, User | `apps/api/app/api/events/battle-boards/commands/finalize/route.ts` |
| `/api/events/battle-boards/commands/open` | POST | BattleBoard, User | `apps/api/app/api/events/battle-boards/commands/open/route.ts` |
| `/api/events/battle-boards/commands/remove-dish` | POST | BattleBoard, User | `apps/api/app/api/events/battle-boards/commands/remove-dish/route.ts` |
| `/api/events/battle-boards/commands/start-voting` | POST | BattleBoard, User | `apps/api/app/api/events/battle-boards/commands/start-voting/route.ts` |
| `/api/events/battle-boards/commands/vote` | POST | BattleBoard, User | `apps/api/app/api/events/battle-boards/commands/vote/route.ts` |
| `/api/events/battle-boards/list` | GET | BattleBoard | `apps/api/app/api/events/battle-boards/list/route.ts` |
| `/api/events/battle-boards` | GET, POST | BattleBoard | `apps/api/app/api/events/battle-boards/route.ts` |
| `/api/events/budget-alerts/[id]` | GET | BudgetAlert | `apps/api/app/api/events/budget-alerts/[id]/route.ts` |
| `/api/events/budget-alerts/commands/acknowledge` | POST | BudgetAlert, User | `apps/api/app/api/events/budget-alerts/commands/acknowledge/route.ts` |
| `/api/events/budget-alerts/commands/resolve` | POST | BudgetAlert, User | `apps/api/app/api/events/budget-alerts/commands/resolve/route.ts` |
| `/api/events/budget-alerts/list` | GET | BudgetAlert | `apps/api/app/api/events/budget-alerts/list/route.ts` |
| `/api/events/budget-line-items/[id]` | GET | BudgetLineItem | `apps/api/app/api/events/budget-line-items/[id]/route.ts` |
| `/api/events/budget-line-items/commands/create` | POST | BudgetLineItem, User | `apps/api/app/api/events/budget-line-items/commands/create/route.ts` |
| `/api/events/budget-line-items/commands/remove` | POST | BudgetLineItem, User | `apps/api/app/api/events/budget-line-items/commands/remove/route.ts` |
| `/api/events/budget-line-items/commands/update` | POST | BudgetLineItem, User | `apps/api/app/api/events/budget-line-items/commands/update/route.ts` |
| `/api/events/budget-line-items/list` | GET | BudgetLineItem | `apps/api/app/api/events/budget-line-items/list/route.ts` |
| `/api/events/budgets/[id]/line-items/[lineItemId]` | DELETE, GET, PUT | BudgetLineItem | `apps/api/app/api/events/budgets/[id]/line-items/[lineItemId]/route.ts` |
| `/api/events/budgets/[id]/line-items` | GET, POST | BudgetLineItem, EventBudget | `apps/api/app/api/events/budgets/[id]/line-items/route.ts` |
| `/api/events/budgets/[id]` | DELETE, GET, PUT | EventBudget | `apps/api/app/api/events/budgets/[id]/route.ts` |
| `/api/events/budgets/commands/approve` | POST | EventBudget, User | `apps/api/app/api/events/budgets/commands/approve/route.ts` |
| `/api/events/budgets/commands/create` | POST | EventBudget, User | `apps/api/app/api/events/budgets/commands/create/route.ts` |
| `/api/events/budgets/commands/finalize` | POST | EventBudget, User | `apps/api/app/api/events/budgets/commands/finalize/route.ts` |
| `/api/events/budgets/commands/update` | POST | EventBudget, User | `apps/api/app/api/events/budgets/commands/update/route.ts` |
| `/api/events/budgets/list` | GET | EventBudget | `apps/api/app/api/events/budgets/list/route.ts` |
| `/api/events/budgets` | GET, POST | Event, EventBudget | `apps/api/app/api/events/budgets/route.ts` |
| `/api/events/catering-orders/[id]` | GET | CateringOrder | `apps/api/app/api/events/catering-orders/[id]/route.ts` |
| `/api/events/catering-orders/commands/cancel` | POST | CateringOrder, User | `apps/api/app/api/events/catering-orders/commands/cancel/route.ts` |
| `/api/events/catering-orders/commands/confirm` | POST | CateringOrder, User | `apps/api/app/api/events/catering-orders/commands/confirm/route.ts` |
| `/api/events/catering-orders/commands/create` | POST | CateringOrder, User | `apps/api/app/api/events/catering-orders/commands/create/route.ts` |
| `/api/events/catering-orders/commands/mark-complete` | POST | CateringOrder, User | `apps/api/app/api/events/catering-orders/commands/mark-complete/route.ts` |
| `/api/events/catering-orders/commands/start-prep` | POST | CateringOrder, User | `apps/api/app/api/events/catering-orders/commands/start-prep/route.ts` |
| `/api/events/catering-orders/commands/update` | POST | CateringOrder, User | `apps/api/app/api/events/catering-orders/commands/update/route.ts` |
| `/api/events/catering-orders/list` | GET | CateringOrder | `apps/api/app/api/events/catering-orders/list/route.ts` |
| `/api/events/contract-signatures/[id]` | GET | ContractSignature | `apps/api/app/api/events/contract-signatures/[id]/route.ts` |
| `/api/events/contract-signatures/commands/create` | POST | ContractSignature, User | `apps/api/app/api/events/contract-signatures/commands/create/route.ts` |
| `/api/events/contract-signatures/commands/soft-delete` | POST | ContractSignature, User | `apps/api/app/api/events/contract-signatures/commands/soft-delete/route.ts` |
| `/api/events/contract-signatures/list` | GET | ContractSignature | `apps/api/app/api/events/contract-signatures/list/route.ts` |
| `/api/events/contracts/[id]/document` | POST | EventContract | `apps/api/app/api/events/contracts/[id]/document/route.ts` |
| `/api/events/contracts/[id]/history` | GET | ContractSignature, EventContract | `apps/api/app/api/events/contracts/[id]/history/route.ts` |
| `/api/events/contracts/[id]` | DELETE, GET, PUT | Client, Event, EventContract | `apps/api/app/api/events/contracts/[id]/route.ts` |
| `/api/events/contracts/[id]/send` | POST | EventContract | `apps/api/app/api/events/contracts/[id]/send/route.ts` |
| `/api/events/contracts/[id]/signature` | POST | ContractSignature | `apps/api/app/api/events/contracts/[id]/signature/route.ts` |
| `/api/events/contracts/[id]/signatures` | GET, POST | ContractSignature, EventContract | `apps/api/app/api/events/contracts/[id]/signatures/route.ts` |
| `/api/events/contracts/[id]/status` | PATCH | EventContract | `apps/api/app/api/events/contracts/[id]/status/route.ts` |
| `/api/events/contracts/commands/cancel` | POST | EventContract, User | `apps/api/app/api/events/contracts/commands/cancel/route.ts` |
| `/api/events/contracts/commands/create` | POST | EventContract, User | `apps/api/app/api/events/contracts/commands/create/route.ts` |
| `/api/events/contracts/commands/expire` | POST | EventContract, User | `apps/api/app/api/events/contracts/commands/expire/route.ts` |
| `/api/events/contracts/commands/mark-viewed` | POST | EventContract, User | `apps/api/app/api/events/contracts/commands/mark-viewed/route.ts` |
| `/api/events/contracts/commands/send` | POST | EventContract, User | `apps/api/app/api/events/contracts/commands/send/route.ts` |
| `/api/events/contracts/commands/sign` | POST | EventContract, User | `apps/api/app/api/events/contracts/commands/sign/route.ts` |
| `/api/events/contracts/commands/soft-delete` | POST | EventContract, User | `apps/api/app/api/events/contracts/commands/soft-delete/route.ts` |
| `/api/events/contracts/commands/update` | POST | EventContract, User | `apps/api/app/api/events/contracts/commands/update/route.ts` |
| `/api/events/contracts/expiring` | GET | Client, ContractSignature, Event, EventContract | `apps/api/app/api/events/contracts/expiring/route.ts` |
| `/api/events/contracts/list` | GET | EventContract | `apps/api/app/api/events/contracts/list/route.ts` |
| `/api/events/contracts` | GET, POST | Client, Event, EventContract | `apps/api/app/api/events/contracts/route.ts` |
| `/api/events/documents/parse` | GET, POST | BattleBoard, Dish, Event, EventImport, EventReport, Recipe | `apps/api/app/api/events/documents/parse/route.ts` |
| `/api/events/event/[id]` | GET | Event | `apps/api/app/api/events/event/[id]/route.ts` |
| `/api/events/event/commands/archive` | POST | Event, User | `apps/api/app/api/events/event/commands/archive/route.ts` |
| `/api/events/event/commands/cancel` | POST | Event, User | `apps/api/app/api/events/event/commands/cancel/route.ts` |
| `/api/events/event/commands/confirm` | POST | Event, User | `apps/api/app/api/events/event/commands/confirm/route.ts` |
| `/api/events/event/commands/create` | POST | Event, User | `apps/api/app/api/events/event/commands/create/route.ts` |
| `/api/events/event/commands/finalize` | POST | Event, User | `apps/api/app/api/events/event/commands/finalize/route.ts` |
| `/api/events/event/commands/unfinalize` | POST | Event, User | `apps/api/app/api/events/event/commands/unfinalize/route.ts` |
| `/api/events/event/commands/update` | POST | Event, User | `apps/api/app/api/events/event/commands/update/route.ts` |
| `/api/events/event/commands/update-date` | POST | Event, User | `apps/api/app/api/events/event/commands/update-date/route.ts` |
| `/api/events/event/commands/update-guest-count` | POST | Event, User | `apps/api/app/api/events/event/commands/update-guest-count/route.ts` |
| `/api/events/event/commands/update-location` | POST | Event, User | `apps/api/app/api/events/event/commands/update-location/route.ts` |
| `/api/events/event/list` | GET | Event | `apps/api/app/api/events/event/list/route.ts` |
| `/api/events/event-dishes/[id]` | GET | event_dishes | `apps/api/app/api/events/event-dishes/[id]/route.ts` |
| `/api/events/event-dishes/commands/create` | POST | EventDish (manifest), User | `apps/api/app/api/events/event-dishes/commands/create/route.ts` |
| `/api/events/event-dishes/commands/remove` | POST | EventDish (manifest), User | `apps/api/app/api/events/event-dishes/commands/remove/route.ts` |
| `/api/events/event-dishes/list` | GET | event_dishes | `apps/api/app/api/events/event-dishes/list/route.ts` |
| `/api/events/export/csv` | GET | - | `apps/api/app/api/events/export/csv/route.ts` |
| `/api/events/export/quickbooks` | POST | - | `apps/api/app/api/events/export/quickbooks/route.ts` |
| `/api/events/guests/[id]` | GET | EventGuest | `apps/api/app/api/events/guests/[id]/route.ts` |
| `/api/events/guests/commands/create` | POST | EventGuest, User | `apps/api/app/api/events/guests/commands/create/route.ts` |
| `/api/events/guests/commands/soft-delete` | POST | EventGuest, User | `apps/api/app/api/events/guests/commands/soft-delete/route.ts` |
| `/api/events/guests/commands/update` | POST | EventGuest, User | `apps/api/app/api/events/guests/commands/update/route.ts` |
| `/api/events/guests/list` | GET | EventGuest | `apps/api/app/api/events/guests/list/route.ts` |
| `/api/events/import/server-to-server` | POST | - | `apps/api/app/api/events/import/server-to-server/route.ts` |
| `/api/events/import-workflows/[id]` | GET | EventImport | `apps/api/app/api/events/import-workflows/[id]/route.ts` |
| `/api/events/import-workflows/commands/cancel` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/cancel/route.ts` |
| `/api/events/import-workflows/commands/complete-activating` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/complete-activating/route.ts` |
| `/api/events/import-workflows/commands/complete-extraction` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/complete-extraction/route.ts` |
| `/api/events/import-workflows/commands/complete-parsing` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/complete-parsing/route.ts` |
| `/api/events/import-workflows/commands/complete-proposing` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/complete-proposing/route.ts` |
| `/api/events/import-workflows/commands/complete-reserving` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/complete-reserving/route.ts` |
| `/api/events/import-workflows/commands/complete-validation` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/complete-validation/route.ts` |
| `/api/events/import-workflows/commands/create` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/create/route.ts` |
| `/api/events/import-workflows/commands/fail` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/fail/route.ts` |
| `/api/events/import-workflows/commands/pause` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/pause/route.ts` |
| `/api/events/import-workflows/commands/resume` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/resume/route.ts` |
| `/api/events/import-workflows/commands/retry` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/retry/route.ts` |
| `/api/events/import-workflows/commands/start-activating` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/start-activating/route.ts` |
| `/api/events/import-workflows/commands/start-extracting` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/start-extracting/route.ts` |
| `/api/events/import-workflows/commands/start-parsing` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/start-parsing/route.ts` |
| `/api/events/import-workflows/commands/start-proposing` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/start-proposing/route.ts` |
| `/api/events/import-workflows/commands/start-reserving` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/start-reserving/route.ts` |
| `/api/events/import-workflows/commands/start-validating` | POST | EventImportWorkflow (manifest), User | `apps/api/app/api/events/import-workflows/commands/start-validating/route.ts` |
| `/api/events/import-workflows/list` | GET | EventImport | `apps/api/app/api/events/import-workflows/list/route.ts` |
| `/api/events/imports/[importId]` | - | - | `apps/api/app/api/events/imports/[importId]/route.ts` |
| `/api/events/profitability/[id]` | GET | EventProfitability | `apps/api/app/api/events/profitability/[id]/route.ts` |
| `/api/events/profitability/commands/create` | POST | EventProfitability, User | `apps/api/app/api/events/profitability/commands/create/route.ts` |
| `/api/events/profitability/commands/recalculate` | POST | EventProfitability, User | `apps/api/app/api/events/profitability/commands/recalculate/route.ts` |
| `/api/events/profitability/commands/update` | POST | EventProfitability, User | `apps/api/app/api/events/profitability/commands/update/route.ts` |
| `/api/events/profitability/list` | GET | EventProfitability | `apps/api/app/api/events/profitability/list/route.ts` |
| `/api/events/reports/[id]` | GET | EventReport | `apps/api/app/api/events/reports/[id]/route.ts` |
| `/api/events/reports/commands/approve` | POST | EventReport, User | `apps/api/app/api/events/reports/commands/approve/route.ts` |
| `/api/events/reports/commands/complete` | POST | EventReport, User | `apps/api/app/api/events/reports/commands/complete/route.ts` |
| `/api/events/reports/commands/create` | POST | EventReport, User | `apps/api/app/api/events/reports/commands/create/route.ts` |
| `/api/events/reports/commands/submit` | POST | EventReport, User | `apps/api/app/api/events/reports/commands/submit/route.ts` |
| `/api/events/reports/list` | GET | EventReport | `apps/api/app/api/events/reports/list/route.ts` |
| `/api/events/reports` | GET, POST | EventReport | `apps/api/app/api/events/reports/route.ts` |
| `/api/events` | GET | Event | `apps/api/app/api/events/route.ts` |
| `/api/events/staff/[id]` | GET | EventStaffAssignment | `apps/api/app/api/events/staff/[id]/route.ts` |
| `/api/events/staff/commands/assign` | POST | EventStaff (manifest), User | `apps/api/app/api/events/staff/commands/assign/route.ts` |
| `/api/events/staff/commands/unassign` | POST | EventStaff (manifest), User | `apps/api/app/api/events/staff/commands/unassign/route.ts` |
| `/api/events/staff/list` | GET | EventStaffAssignment | `apps/api/app/api/events/staff/list/route.ts` |
| `/api/events/summaries/[id]` | GET | EventSummary | `apps/api/app/api/events/summaries/[id]/route.ts` |
| `/api/events/summaries/commands/create` | POST | EventSummary, User | `apps/api/app/api/events/summaries/commands/create/route.ts` |
| `/api/events/summaries/commands/refresh` | POST | EventSummary, User | `apps/api/app/api/events/summaries/commands/refresh/route.ts` |
| `/api/events/summaries/commands/update` | POST | EventSummary, User | `apps/api/app/api/events/summaries/commands/update/route.ts` |
| `/api/events/summaries/list` | GET | EventSummary | `apps/api/app/api/events/summaries/list/route.ts` |

### inventory

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/inventory/alerts/subscribe` | POST | AlertsConfig | `apps/api/app/api/inventory/alerts/subscribe/route.ts` |
| `/api/inventory/audit/discrepancies/[id]/resolve` | POST | User, VarianceReport | `apps/api/app/api/inventory/audit/discrepancies/[id]/resolve/route.ts` |
| `/api/inventory/audit/discrepancies/[id]` | GET, PATCH | CycleCountSession, InventoryItem, User, VarianceReport | `apps/api/app/api/inventory/audit/discrepancies/[id]/route.ts` |
| `/api/inventory/audit/discrepancies` | GET | VarianceReport | `apps/api/app/api/inventory/audit/discrepancies/route.ts` |
| `/api/inventory/audit/reports/[id]` | DELETE, GET | CycleCountSession, Report, VarianceReport | `apps/api/app/api/inventory/audit/reports/[id]/route.ts` |
| `/api/inventory/audit/reports` | GET, POST | CycleCountSession, Report, VarianceReport | `apps/api/app/api/inventory/audit/reports/route.ts` |
| `/api/inventory/audit/schedule` | DELETE, GET, PATCH, POST | AuditSchedule | `apps/api/app/api/inventory/audit/schedule/route.ts` |
| `/api/inventory/barcode-lookup` | GET | - | `apps/api/app/api/inventory/barcode-lookup/route.ts` |
| `/api/inventory/batch` | POST | - | `apps/api/app/api/inventory/batch/route.ts` |
| `/api/inventory/bulk-order-rules/[id]` | GET | BulkOrderRule | `apps/api/app/api/inventory/bulk-order-rules/[id]/route.ts` |
| `/api/inventory/bulk-order-rules/commands/create` | POST | BulkOrderRule, User | `apps/api/app/api/inventory/bulk-order-rules/commands/create/route.ts` |
| `/api/inventory/bulk-order-rules/commands/soft-delete` | POST | BulkOrderRule, User | `apps/api/app/api/inventory/bulk-order-rules/commands/soft-delete/route.ts` |
| `/api/inventory/bulk-order-rules/commands/softDelete` | POST | BulkOrderRule, User | `apps/api/app/api/inventory/bulk-order-rules/commands/softDelete/route.ts` |
| `/api/inventory/bulk-order-rules/commands/update` | POST | BulkOrderRule, User | `apps/api/app/api/inventory/bulk-order-rules/commands/update/route.ts` |
| `/api/inventory/bulk-order-rules/list` | GET | BulkOrderRule | `apps/api/app/api/inventory/bulk-order-rules/list/route.ts` |
| `/api/inventory/cycle-count/audit-logs` | GET | CycleCountAuditLog, CycleCountSession | `apps/api/app/api/inventory/cycle-count/audit-logs/route.ts` |
| `/api/inventory/cycle-count/records/[id]` | DELETE, GET, PUT | CycleCountRecord | `apps/api/app/api/inventory/cycle-count/records/[id]/route.ts` |
| `/api/inventory/cycle-count/records/commands/create` | POST | CycleCountRecord, User | `apps/api/app/api/inventory/cycle-count/records/commands/create/route.ts` |
| `/api/inventory/cycle-count/records/commands/remove` | POST | CycleCountRecord, User | `apps/api/app/api/inventory/cycle-count/records/commands/remove/route.ts` |
| `/api/inventory/cycle-count/records/commands/update` | POST | CycleCountRecord, User | `apps/api/app/api/inventory/cycle-count/records/commands/update/route.ts` |
| `/api/inventory/cycle-count/records/commands/verify` | POST | CycleCountRecord, User | `apps/api/app/api/inventory/cycle-count/records/commands/verify/route.ts` |
| `/api/inventory/cycle-count/records/list` | GET | CycleCountRecord | `apps/api/app/api/inventory/cycle-count/records/list/route.ts` |
| `/api/inventory/cycle-count/sessions/[id]/finalize` | POST | CycleCountAuditLog, CycleCountRecord, CycleCountSession, InventoryItem, InventoryTransaction, User, VarianceReport | `apps/api/app/api/inventory/cycle-count/sessions/[id]/finalize/route.ts` |
| `/api/inventory/cycle-count/sessions/[id]/records` | GET, POST | CycleCountRecord, CycleCountSession | `apps/api/app/api/inventory/cycle-count/sessions/[id]/records/route.ts` |
| `/api/inventory/cycle-count/sessions/[id]` | GET | CycleCountSession | `apps/api/app/api/inventory/cycle-count/sessions/[id]/route.ts` |
| `/api/inventory/cycle-count/sessions/[id]/variance-reports` | GET | CycleCountSession, VarianceReport | `apps/api/app/api/inventory/cycle-count/sessions/[id]/variance-reports/route.ts` |
| `/api/inventory/cycle-count/sessions/commands/cancel` | POST | CycleCountSession, User | `apps/api/app/api/inventory/cycle-count/sessions/commands/cancel/route.ts` |
| `/api/inventory/cycle-count/sessions/commands/complete` | POST | CycleCountSession, User | `apps/api/app/api/inventory/cycle-count/sessions/commands/complete/route.ts` |
| `/api/inventory/cycle-count/sessions/commands/create` | POST | CycleCountSession, User | `apps/api/app/api/inventory/cycle-count/sessions/commands/create/route.ts` |
| `/api/inventory/cycle-count/sessions/commands/finalize` | POST | CycleCountSession, User | `apps/api/app/api/inventory/cycle-count/sessions/commands/finalize/route.ts` |
| `/api/inventory/cycle-count/sessions/commands/start` | POST | CycleCountSession, User | `apps/api/app/api/inventory/cycle-count/sessions/commands/start/route.ts` |
| `/api/inventory/cycle-count/sessions/list` | GET | CycleCountSession | `apps/api/app/api/inventory/cycle-count/sessions/list/route.ts` |
| `/api/inventory/cycle-count/sessions` | GET, POST | CycleCountSession | `apps/api/app/api/inventory/cycle-count/sessions/route.ts` |
| `/api/inventory/cycle-count/variance-reports/[id]` | GET | VarianceReport | `apps/api/app/api/inventory/cycle-count/variance-reports/[id]/route.ts` |
| `/api/inventory/cycle-count/variance-reports/commands/approve` | POST | User, VarianceReport | `apps/api/app/api/inventory/cycle-count/variance-reports/commands/approve/route.ts` |
| `/api/inventory/cycle-count/variance-reports/commands/create` | POST | User, VarianceReport | `apps/api/app/api/inventory/cycle-count/variance-reports/commands/create/route.ts` |
| `/api/inventory/cycle-count/variance-reports/commands/review` | POST | User, VarianceReport | `apps/api/app/api/inventory/cycle-count/variance-reports/commands/review/route.ts` |
| `/api/inventory/cycle-count/variance-reports/list` | GET | VarianceReport | `apps/api/app/api/inventory/cycle-count/variance-reports/list/route.ts` |
| `/api/inventory/forecasts/alerts` | GET | InventoryItem | `apps/api/app/api/inventory/forecasts/alerts/route.ts` |
| `/api/inventory/forecasts/batch` | GET | InventoryForecast | `apps/api/app/api/inventory/forecasts/batch/route.ts` |
| `/api/inventory/forecasts` | GET | InventoryForecast | `apps/api/app/api/inventory/forecasts/route.ts` |
| `/api/inventory/import` | POST | - | `apps/api/app/api/inventory/import/route.ts` |
| `/api/inventory/items/[id]` | DELETE, GET, PUT | InventoryItem | `apps/api/app/api/inventory/items/[id]/route.ts` |
| `/api/inventory/items` | GET, POST | InventoryItem | `apps/api/app/api/inventory/items/route.ts` |
| `/api/inventory/pricing-tiers/[id]` | GET | PricingTier | `apps/api/app/api/inventory/pricing-tiers/[id]/route.ts` |
| `/api/inventory/pricing-tiers/commands/create` | POST | PricingTier, User | `apps/api/app/api/inventory/pricing-tiers/commands/create/route.ts` |
| `/api/inventory/pricing-tiers/commands/soft-delete` | POST | PricingTier, User | `apps/api/app/api/inventory/pricing-tiers/commands/soft-delete/route.ts` |
| `/api/inventory/pricing-tiers/commands/softDelete` | POST | PricingTier, User | `apps/api/app/api/inventory/pricing-tiers/commands/softDelete/route.ts` |
| `/api/inventory/pricing-tiers/commands/update` | POST | PricingTier, User | `apps/api/app/api/inventory/pricing-tiers/commands/update/route.ts` |
| `/api/inventory/pricing-tiers/list` | GET | PricingTier | `apps/api/app/api/inventory/pricing-tiers/list/route.ts` |
| `/api/inventory/purchase-order-items/[id]` | GET | PurchaseOrderItem | `apps/api/app/api/inventory/purchase-order-items/[id]/route.ts` |
| `/api/inventory/purchase-order-items/commands/create` | POST | PurchaseOrderItem, User | `apps/api/app/api/inventory/purchase-order-items/commands/create/route.ts` |
| `/api/inventory/purchase-order-items/commands/remove` | POST | PurchaseOrderItem, User | `apps/api/app/api/inventory/purchase-order-items/commands/remove/route.ts` |
| `/api/inventory/purchase-order-items/commands/update` | POST | PurchaseOrderItem, User | `apps/api/app/api/inventory/purchase-order-items/commands/update/route.ts` |
| `/api/inventory/purchase-order-items/list` | GET | PurchaseOrderItem | `apps/api/app/api/inventory/purchase-order-items/list/route.ts` |
| `/api/inventory/purchase-orders/[id]/complete` | POST | PurchaseOrder | `apps/api/app/api/inventory/purchase-orders/[id]/complete/route.ts` |
| `/api/inventory/purchase-orders/[id]/items/[itemId]/quality` | PUT | PurchaseOrderItem | `apps/api/app/api/inventory/purchase-orders/[id]/items/[itemId]/quality/route.ts` |
| `/api/inventory/purchase-orders/[id]/items/[itemId]/quantity` | PUT | PurchaseOrder, PurchaseOrderItem | `apps/api/app/api/inventory/purchase-orders/[id]/items/[itemId]/quantity/route.ts` |
| `/api/inventory/purchase-orders/[id]` | GET | InventoryItem, PurchaseOrder | `apps/api/app/api/inventory/purchase-orders/[id]/route.ts` |
| `/api/inventory/purchase-orders/commands/approve` | POST | PurchaseOrder, User | `apps/api/app/api/inventory/purchase-orders/commands/approve/route.ts` |
| `/api/inventory/purchase-orders/commands/cancel` | POST | PurchaseOrder, User | `apps/api/app/api/inventory/purchase-orders/commands/cancel/route.ts` |
| `/api/inventory/purchase-orders/commands/create` | POST | PurchaseOrder, User | `apps/api/app/api/inventory/purchase-orders/commands/create/route.ts` |
| `/api/inventory/purchase-orders/commands/mark-ordered` | POST | PurchaseOrder, User | `apps/api/app/api/inventory/purchase-orders/commands/mark-ordered/route.ts` |
| `/api/inventory/purchase-orders/commands/mark-received` | POST | PurchaseOrder, User | `apps/api/app/api/inventory/purchase-orders/commands/mark-received/route.ts` |
| `/api/inventory/purchase-orders/commands/reject` | POST | PurchaseOrder, User | `apps/api/app/api/inventory/purchase-orders/commands/reject/route.ts` |
| `/api/inventory/purchase-orders/commands/submit` | POST | PurchaseOrder, User | `apps/api/app/api/inventory/purchase-orders/commands/submit/route.ts` |
| `/api/inventory/purchase-orders/export/quickbooks` | POST | - | `apps/api/app/api/inventory/purchase-orders/export/quickbooks/route.ts` |
| `/api/inventory/purchase-orders/list` | GET | PurchaseOrder | `apps/api/app/api/inventory/purchase-orders/list/route.ts` |
| `/api/inventory/purchase-orders` | GET | InventoryItem, PurchaseOrder | `apps/api/app/api/inventory/purchase-orders/route.ts` |
| `/api/inventory/reorder-suggestions` | GET, POST | ReorderSuggestion | `apps/api/app/api/inventory/reorder-suggestions/route.ts` |
| `/api/inventory/stock-levels/adjust` | POST | InventoryItem | `apps/api/app/api/inventory/stock-levels/adjust/route.ts` |
| `/api/inventory/stock-levels/locations` | GET | - | `apps/api/app/api/inventory/stock-levels/locations/route.ts` |
| `/api/inventory/stock-levels` | GET | InventoryItem, InventoryStock | `apps/api/app/api/inventory/stock-levels/route.ts` |
| `/api/inventory/stock-levels/transactions` | GET | InventoryItem, InventoryTransaction, User | `apps/api/app/api/inventory/stock-levels/transactions/route.ts` |
| `/api/inventory/supplier-catalogs/commands/create` | POST | User, VendorCatalog | `apps/api/app/api/inventory/supplier-catalogs/commands/create/route.ts` |
| `/api/inventory/supplier-catalogs/commands/softDelete` | POST | User, VendorCatalog | `apps/api/app/api/inventory/supplier-catalogs/commands/softDelete/route.ts` |
| `/api/inventory/supplier-catalogs/commands/update` | POST | User, VendorCatalog | `apps/api/app/api/inventory/supplier-catalogs/commands/update/route.ts` |
| `/api/inventory/supplier-catalogs/list` | GET | VendorCatalog | `apps/api/app/api/inventory/supplier-catalogs/list/route.ts` |
| `/api/inventory/supplier-sync/connectors` | GET | - | `apps/api/app/api/inventory/supplier-sync/connectors/route.ts` |
| `/api/inventory/supplier-sync` | GET, POST | - | `apps/api/app/api/inventory/supplier-sync/route.ts` |
| `/api/inventory/supplier-sync/status` | GET | InventorySupplier, VendorCatalog | `apps/api/app/api/inventory/supplier-sync/status/route.ts` |
| `/api/inventory/suppliers/[id]` | GET | InventorySupplier | `apps/api/app/api/inventory/suppliers/[id]/route.ts` |
| `/api/inventory/suppliers/commands/create` | POST | InventorySupplier, User | `apps/api/app/api/inventory/suppliers/commands/create/route.ts` |
| `/api/inventory/suppliers/commands/deactivate` | POST | InventorySupplier, User | `apps/api/app/api/inventory/suppliers/commands/deactivate/route.ts` |
| `/api/inventory/suppliers/commands/update` | POST | InventorySupplier, User | `apps/api/app/api/inventory/suppliers/commands/update/route.ts` |
| `/api/inventory/suppliers/list` | GET | InventorySupplier | `apps/api/app/api/inventory/suppliers/list/route.ts` |
| `/api/inventory/transactions/[id]` | GET | InventoryTransaction | `apps/api/app/api/inventory/transactions/[id]/route.ts` |
| `/api/inventory/transactions/commands/create` | POST | InventoryTransaction, User | `apps/api/app/api/inventory/transactions/commands/create/route.ts` |
| `/api/inventory/transactions/list` | GET | InventoryTransaction | `apps/api/app/api/inventory/transactions/list/route.ts` |
| `/api/inventory/transfers/commands/approve` | POST | InventoryTransfer | `apps/api/app/api/inventory/transfers/commands/approve/route.ts` |
| `/api/inventory/transfers/commands/cancel` | POST | InventoryTransfer | `apps/api/app/api/inventory/transfers/commands/cancel/route.ts` |
| `/api/inventory/transfers/commands/create` | POST | InventoryTransfer | `apps/api/app/api/inventory/transfers/commands/create/route.ts` |
| `/api/inventory/transfers/commands/receive` | POST | InventoryTransfer | `apps/api/app/api/inventory/transfers/commands/receive/route.ts` |
| `/api/inventory/transfers/commands/ship` | POST | InventoryTransfer | `apps/api/app/api/inventory/transfers/commands/ship/route.ts` |
| `/api/inventory/transfers/list` | GET | InventoryTransfer | `apps/api/app/api/inventory/transfers/list/route.ts` |
| `/api/inventory/vendor-catalogs/[id]` | GET | VendorCatalog | `apps/api/app/api/inventory/vendor-catalogs/[id]/route.ts` |
| `/api/inventory/vendor-catalogs/commands/create` | POST | User, VendorCatalog | `apps/api/app/api/inventory/vendor-catalogs/commands/create/route.ts` |
| `/api/inventory/vendor-catalogs/commands/deactivate` | POST | User, VendorCatalog | `apps/api/app/api/inventory/vendor-catalogs/commands/deactivate/route.ts` |
| `/api/inventory/vendor-catalogs/commands/soft-delete` | POST | User, VendorCatalog | `apps/api/app/api/inventory/vendor-catalogs/commands/soft-delete/route.ts` |
| `/api/inventory/vendor-catalogs/commands/update` | POST | User, VendorCatalog | `apps/api/app/api/inventory/vendor-catalogs/commands/update/route.ts` |
| `/api/inventory/vendor-catalogs/commands/update-cost` | POST | User, VendorCatalog | `apps/api/app/api/inventory/vendor-catalogs/commands/update-cost/route.ts` |
| `/api/inventory/vendor-catalogs/list` | GET | VendorCatalog | `apps/api/app/api/inventory/vendor-catalogs/list/route.ts` |

### crm

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/crm/client-contacts/[id]` | GET | ClientContact | `apps/api/app/api/crm/client-contacts/[id]/route.ts` |
| `/api/crm/client-contacts/commands/create` | POST | ClientContact, User | `apps/api/app/api/crm/client-contacts/commands/create/route.ts` |
| `/api/crm/client-contacts/commands/remove` | POST | ClientContact, User | `apps/api/app/api/crm/client-contacts/commands/remove/route.ts` |
| `/api/crm/client-contacts/commands/set-primary` | POST | ClientContact, User | `apps/api/app/api/crm/client-contacts/commands/set-primary/route.ts` |
| `/api/crm/client-contacts/commands/update` | POST | ClientContact, User | `apps/api/app/api/crm/client-contacts/commands/update/route.ts` |
| `/api/crm/client-contacts/list` | GET | ClientContact | `apps/api/app/api/crm/client-contacts/list/route.ts` |
| `/api/crm/client-interactions/[id]` | GET | ClientInteraction | `apps/api/app/api/crm/client-interactions/[id]/route.ts` |
| `/api/crm/client-interactions/commands/complete` | POST | ClientInteraction, User | `apps/api/app/api/crm/client-interactions/commands/complete/route.ts` |
| `/api/crm/client-interactions/commands/create` | POST | ClientInteraction, User | `apps/api/app/api/crm/client-interactions/commands/create/route.ts` |
| `/api/crm/client-interactions/commands/update` | POST | ClientInteraction, User | `apps/api/app/api/crm/client-interactions/commands/update/route.ts` |
| `/api/crm/client-interactions/list` | GET | ClientInteraction | `apps/api/app/api/crm/client-interactions/list/route.ts` |
| `/api/crm/client-preferences/[id]` | GET | ClientPreference | `apps/api/app/api/crm/client-preferences/[id]/route.ts` |
| `/api/crm/client-preferences/commands/create` | POST | ClientPreference, User | `apps/api/app/api/crm/client-preferences/commands/create/route.ts` |
| `/api/crm/client-preferences/commands/remove` | POST | ClientPreference, User | `apps/api/app/api/crm/client-preferences/commands/remove/route.ts` |
| `/api/crm/client-preferences/commands/update` | POST | ClientPreference, User | `apps/api/app/api/crm/client-preferences/commands/update/route.ts` |
| `/api/crm/client-preferences/list` | GET | ClientPreference | `apps/api/app/api/crm/client-preferences/list/route.ts` |
| `/api/crm/clients/[id]/contacts` | GET, POST | Client, ClientContact | `apps/api/app/api/crm/clients/[id]/contacts/route.ts` |
| `/api/crm/clients/[id]/events` | GET | Client, Event | `apps/api/app/api/crm/clients/[id]/events/route.ts` |
| `/api/crm/clients/[id]/interactions/[interactionId]` | DELETE, PUT | ClientInteraction | `apps/api/app/api/crm/clients/[id]/interactions/[interactionId]/route.ts` |
| `/api/crm/clients/[id]/interactions` | GET, POST | Client, ClientInteraction | `apps/api/app/api/crm/clients/[id]/interactions/route.ts` |
| `/api/crm/clients/[id]/preferences` | GET, POST | Client, ClientPreference | `apps/api/app/api/crm/clients/[id]/preferences/route.ts` |
| `/api/crm/clients/[id]` | DELETE, GET, PUT | CateringOrder, Client, ClientContact, ClientInteraction, ClientPreference, Event | `apps/api/app/api/crm/clients/[id]/route.ts` |
| `/api/crm/clients/commands/archive` | POST | Client, User | `apps/api/app/api/crm/clients/commands/archive/route.ts` |
| `/api/crm/clients/commands/create` | POST | Client, User | `apps/api/app/api/crm/clients/commands/create/route.ts` |
| `/api/crm/clients/commands/reactivate` | POST | Client, User | `apps/api/app/api/crm/clients/commands/reactivate/route.ts` |
| `/api/crm/clients/commands/update` | POST | Client, User | `apps/api/app/api/crm/clients/commands/update/route.ts` |
| `/api/crm/clients/list` | GET | Client | `apps/api/app/api/crm/clients/list/route.ts` |
| `/api/crm/clients` | GET, POST | Client | `apps/api/app/api/crm/clients/route.ts` |
| `/api/crm/deals/commands/update-stage` | POST | Proposal | `apps/api/app/api/crm/deals/commands/update-stage/route.ts` |
| `/api/crm/deals/list` | GET | Proposal | `apps/api/app/api/crm/deals/list/route.ts` |
| `/api/crm/leads/[id]` | GET | Lead | `apps/api/app/api/crm/leads/[id]/route.ts` |
| `/api/crm/leads/commands/archive` | POST | Lead, User | `apps/api/app/api/crm/leads/commands/archive/route.ts` |
| `/api/crm/leads/commands/convert-to-client` | POST | Lead, User | `apps/api/app/api/crm/leads/commands/convert-to-client/route.ts` |
| `/api/crm/leads/commands/create` | POST | Lead, User | `apps/api/app/api/crm/leads/commands/create/route.ts` |
| `/api/crm/leads/commands/disqualify` | POST | Lead, User | `apps/api/app/api/crm/leads/commands/disqualify/route.ts` |
| `/api/crm/leads/commands/update` | POST | Lead, User | `apps/api/app/api/crm/leads/commands/update/route.ts` |
| `/api/crm/leads/list` | GET | Lead | `apps/api/app/api/crm/leads/list/route.ts` |
| `/api/crm/proposal-line-items/[id]` | GET | ProposalLineItem | `apps/api/app/api/crm/proposal-line-items/[id]/route.ts` |
| `/api/crm/proposal-line-items/commands/create` | POST | ProposalLineItem, User | `apps/api/app/api/crm/proposal-line-items/commands/create/route.ts` |
| `/api/crm/proposal-line-items/commands/remove` | POST | ProposalLineItem, User | `apps/api/app/api/crm/proposal-line-items/commands/remove/route.ts` |
| `/api/crm/proposal-line-items/commands/update` | POST | ProposalLineItem, User | `apps/api/app/api/crm/proposal-line-items/commands/update/route.ts` |
| `/api/crm/proposal-line-items/list` | GET | ProposalLineItem | `apps/api/app/api/crm/proposal-line-items/list/route.ts` |
| `/api/crm/proposals/[id]` | DELETE, GET, PUT | Client, Event, Lead, Proposal, ProposalLineItem | `apps/api/app/api/crm/proposals/[id]/route.ts` |
| `/api/crm/proposals/[id]/send` | POST | Proposal | `apps/api/app/api/crm/proposals/[id]/send/route.ts` |
| `/api/crm/proposals/commands/accept` | POST | Proposal, User | `apps/api/app/api/crm/proposals/commands/accept/route.ts` |
| `/api/crm/proposals/commands/create` | POST | Proposal, User | `apps/api/app/api/crm/proposals/commands/create/route.ts` |
| `/api/crm/proposals/commands/mark-viewed` | POST | Proposal, User | `apps/api/app/api/crm/proposals/commands/mark-viewed/route.ts` |
| `/api/crm/proposals/commands/reject` | POST | Proposal, User | `apps/api/app/api/crm/proposals/commands/reject/route.ts` |
| `/api/crm/proposals/commands/send` | POST | Proposal, User | `apps/api/app/api/crm/proposals/commands/send/route.ts` |
| `/api/crm/proposals/commands/update` | POST | Proposal, User | `apps/api/app/api/crm/proposals/commands/update/route.ts` |
| `/api/crm/proposals/commands/withdraw` | POST | Proposal, User | `apps/api/app/api/crm/proposals/commands/withdraw/route.ts` |
| `/api/crm/proposals/list` | GET | Proposal | `apps/api/app/api/crm/proposals/list/route.ts` |
| `/api/crm/proposals` | GET, POST | Client, Lead, Proposal, ProposalLineItem | `apps/api/app/api/crm/proposals/route.ts` |
| `/api/crm/proposals/templates` | GET | ProposalTemplate | `apps/api/app/api/crm/proposals/templates/route.ts` |
| `/api/crm/scoring/[id]` | DELETE, PUT | - | `apps/api/app/api/crm/scoring/[id]/route.ts` |
| `/api/crm/scoring/calculate` | POST | - | `apps/api/app/api/crm/scoring/calculate/route.ts` |
| `/api/crm/scoring/distribution` | GET | - | `apps/api/app/api/crm/scoring/distribution/route.ts` |
| `/api/crm/scoring` | GET, POST | - | `apps/api/app/api/crm/scoring/route.ts` |
| `/api/crm/venues/[id]/events` | - | - | `apps/api/app/api/crm/venues/[id]/events/route.ts` |
| `/api/crm/venues/[id]` | - | - | `apps/api/app/api/crm/venues/[id]/route.ts` |
| `/api/crm/venues` | - | - | `apps/api/app/api/crm/venues/route.ts` |

### staff

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/staff/availability/[id]` | DELETE, GET, PATCH | employee_availability | `apps/api/app/api/staff/availability/[id]/route.ts` |
| `/api/staff/availability/batch` | - | - | `apps/api/app/api/staff/availability/batch/route.ts` |
| `/api/staff/availability/commands/create` | POST | User, employee_availability | `apps/api/app/api/staff/availability/commands/create/route.ts` |
| `/api/staff/availability/commands/soft-delete` | POST | User, employee_availability | `apps/api/app/api/staff/availability/commands/soft-delete/route.ts` |
| `/api/staff/availability/commands/update` | POST | User, employee_availability | `apps/api/app/api/staff/availability/commands/update/route.ts` |
| `/api/staff/availability/employees` | GET | - | `apps/api/app/api/staff/availability/employees/route.ts` |
| `/api/staff/availability/list` | GET | employee_availability | `apps/api/app/api/staff/availability/list/route.ts` |
| `/api/staff/availability` | GET, POST | employee_availability | `apps/api/app/api/staff/availability/route.ts` |
| `/api/staff/budgets/[id]` | DELETE, GET, PUT | LaborBudget | `apps/api/app/api/staff/budgets/[id]/route.ts` |
| `/api/staff/budgets/alerts` | GET, POST | BudgetAlert | `apps/api/app/api/staff/budgets/alerts/route.ts` |
| `/api/staff/budgets` | GET, POST | LaborBudget | `apps/api/app/api/staff/budgets/route.ts` |
| `/api/staff/certifications/[id]` | DELETE, GET, PUT | EmployeeCertification (manifest) | `apps/api/app/api/staff/certifications/[id]/route.ts` |
| `/api/staff/certifications/commands/create` | POST | EmployeeCertification (manifest), User | `apps/api/app/api/staff/certifications/commands/create/route.ts` |
| `/api/staff/certifications/commands/soft-delete` | POST | EmployeeCertification (manifest), User | `apps/api/app/api/staff/certifications/commands/soft-delete/route.ts` |
| `/api/staff/certifications/commands/update` | POST | EmployeeCertification (manifest), User | `apps/api/app/api/staff/certifications/commands/update/route.ts` |
| `/api/staff/certifications/list` | GET | employee_certifications | `apps/api/app/api/staff/certifications/list/route.ts` |
| `/api/staff/certifications` | GET, POST | EmployeeCertification (manifest) | `apps/api/app/api/staff/certifications/route.ts` |
| `/api/staff/employees/[id]` | GET, PATCH, PUT | User | `apps/api/app/api/staff/employees/[id]/route.ts` |
| `/api/staff/employees/commands/create` | POST | User | `apps/api/app/api/staff/employees/commands/create/route.ts` |
| `/api/staff/employees/commands/deactivate` | POST | User | `apps/api/app/api/staff/employees/commands/deactivate/route.ts` |
| `/api/staff/employees/commands/terminate` | POST | User | `apps/api/app/api/staff/employees/commands/terminate/route.ts` |
| `/api/staff/employees/commands/update` | POST | User | `apps/api/app/api/staff/employees/commands/update/route.ts` |
| `/api/staff/employees/commands/update-role` | POST | User | `apps/api/app/api/staff/employees/commands/update-role/route.ts` |
| `/api/staff/employees/list` | GET | User | `apps/api/app/api/staff/employees/list/route.ts` |
| `/api/staff/employees` | GET | - | `apps/api/app/api/staff/employees/route.ts` |
| `/api/staff/performance/commands/complete` | POST | - | `apps/api/app/api/staff/performance/commands/complete/route.ts` |
| `/api/staff/performance/commands/create` | POST | - | `apps/api/app/api/staff/performance/commands/create/route.ts` |
| `/api/staff/performance/employees` | GET | User | `apps/api/app/api/staff/performance/employees/route.ts` |
| `/api/staff/performance/list` | GET | - | `apps/api/app/api/staff/performance/list/route.ts` |
| `/api/staff/schedules/[id]` | GET | Schedule | `apps/api/app/api/staff/schedules/[id]/route.ts` |
| `/api/staff/schedules/commands/close` | POST | Schedule, User | `apps/api/app/api/staff/schedules/commands/close/route.ts` |
| `/api/staff/schedules/commands/create` | POST | Schedule, User | `apps/api/app/api/staff/schedules/commands/create/route.ts` |
| `/api/staff/schedules/commands/release` | POST | Schedule, User | `apps/api/app/api/staff/schedules/commands/release/route.ts` |
| `/api/staff/schedules/commands/update` | POST | Schedule, User | `apps/api/app/api/staff/schedules/commands/update/route.ts` |
| `/api/staff/schedules/list` | GET | Schedule | `apps/api/app/api/staff/schedules/list/route.ts` |
| `/api/staff/schedules` | GET | - | `apps/api/app/api/staff/schedules/route.ts` |
| `/api/staff/shifts/[id]/assignment-suggestions` | GET, POST | - | `apps/api/app/api/staff/shifts/[id]/assignment-suggestions/route.ts` |
| `/api/staff/shifts/[id]` | GET | ScheduleShift | `apps/api/app/api/staff/shifts/[id]/route.ts` |
| `/api/staff/shifts/available-employees` | GET | - | `apps/api/app/api/staff/shifts/available-employees/route.ts` |
| `/api/staff/shifts/bulk-assignment` | - | - | `apps/api/app/api/staff/shifts/bulk-assignment/route.ts` |
| `/api/staff/shifts/bulk-assignment-suggestions` | - | - | `apps/api/app/api/staff/shifts/bulk-assignment-suggestions/route.ts` |
| `/api/staff/shifts/commands/create` | POST | ScheduleShift, User | `apps/api/app/api/staff/shifts/commands/create/route.ts` |
| `/api/staff/shifts/commands/create-validated` | POST | ScheduleShift, User | `apps/api/app/api/staff/shifts/commands/create-validated/route.ts` |
| `/api/staff/shifts/commands/remove` | POST | ScheduleShift, User | `apps/api/app/api/staff/shifts/commands/remove/route.ts` |
| `/api/staff/shifts/commands/update` | POST | ScheduleShift, User | `apps/api/app/api/staff/shifts/commands/update/route.ts` |
| `/api/staff/shifts/commands/update-validated` | POST | ScheduleShift, User | `apps/api/app/api/staff/shifts/commands/update-validated/route.ts` |
| `/api/staff/shifts/list` | GET | ScheduleShift | `apps/api/app/api/staff/shifts/list/route.ts` |
| `/api/staff/shifts` | GET, POST | ScheduleShift | `apps/api/app/api/staff/shifts/route.ts` |
| `/api/staff/time-off/requests/[id]` | DELETE, GET, PATCH | TimeOffRequest (manifest) | `apps/api/app/api/staff/time-off/requests/[id]/route.ts` |
| `/api/staff/time-off/requests` | GET, POST | TimeOffRequest (manifest) | `apps/api/app/api/staff/time-off/requests/route.ts` |

### command-board

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/command-board/[boardId]/replay` | GET | CommandBoard, CommandBoardCard, CommandBoardConnection, OutboxEvent | `apps/api/app/api/command-board/[boardId]/replay/route.ts` |
| `/api/command-board/[boardId]` | DELETE, GET, PUT | CommandBoard | `apps/api/app/api/command-board/[boardId]/route.ts` |
| `/api/command-board/boards/[id]` | GET | CommandBoard | `apps/api/app/api/command-board/boards/[id]/route.ts` |
| `/api/command-board/boards/commands/activate` | POST | CommandBoard, User | `apps/api/app/api/command-board/boards/commands/activate/route.ts` |
| `/api/command-board/boards/commands/create` | POST | CommandBoard, User | `apps/api/app/api/command-board/boards/commands/create/route.ts` |
| `/api/command-board/boards/commands/deactivate` | POST | CommandBoard, User | `apps/api/app/api/command-board/boards/commands/deactivate/route.ts` |
| `/api/command-board/boards/commands/update` | POST | CommandBoard, User | `apps/api/app/api/command-board/boards/commands/update/route.ts` |
| `/api/command-board/boards/list` | GET | CommandBoard | `apps/api/app/api/command-board/boards/list/route.ts` |
| `/api/command-board/cards/[id]` | GET | CommandBoardCard | `apps/api/app/api/command-board/cards/[id]/route.ts` |
| `/api/command-board/cards/commands/create` | POST | CommandBoardCard, User | `apps/api/app/api/command-board/cards/commands/create/route.ts` |
| `/api/command-board/cards/commands/move` | POST | CommandBoardCard, User | `apps/api/app/api/command-board/cards/commands/move/route.ts` |
| `/api/command-board/cards/commands/remove` | POST | CommandBoardCard, User | `apps/api/app/api/command-board/cards/commands/remove/route.ts` |
| `/api/command-board/cards/commands/resize` | POST | CommandBoardCard, User | `apps/api/app/api/command-board/cards/commands/resize/route.ts` |
| `/api/command-board/cards/commands/update` | POST | CommandBoardCard, User | `apps/api/app/api/command-board/cards/commands/update/route.ts` |
| `/api/command-board/cards/list` | GET | CommandBoardCard | `apps/api/app/api/command-board/cards/list/route.ts` |
| `/api/command-board/connections/[id]` | GET | CommandBoardConnection | `apps/api/app/api/command-board/connections/[id]/route.ts` |
| `/api/command-board/connections/commands/create` | POST | CommandBoardConnection, User | `apps/api/app/api/command-board/connections/commands/create/route.ts` |
| `/api/command-board/connections/commands/remove` | POST | CommandBoardConnection, User | `apps/api/app/api/command-board/connections/commands/remove/route.ts` |
| `/api/command-board/connections/list` | GET | CommandBoardConnection | `apps/api/app/api/command-board/connections/list/route.ts` |
| `/api/command-board/groups/[id]` | GET | CommandBoardGroup | `apps/api/app/api/command-board/groups/[id]/route.ts` |
| `/api/command-board/groups/commands/create` | POST | CommandBoardGroup, User | `apps/api/app/api/command-board/groups/commands/create/route.ts` |
| `/api/command-board/groups/commands/remove` | POST | CommandBoardGroup, User | `apps/api/app/api/command-board/groups/commands/remove/route.ts` |
| `/api/command-board/groups/commands/update` | POST | CommandBoardGroup, User | `apps/api/app/api/command-board/groups/commands/update/route.ts` |
| `/api/command-board/groups/list` | GET | CommandBoardGroup | `apps/api/app/api/command-board/groups/list/route.ts` |
| `/api/command-board/layouts/[id]` | GET | CommandBoardLayout | `apps/api/app/api/command-board/layouts/[id]/route.ts` |
| `/api/command-board/layouts/commands/create` | POST | CommandBoardLayout, User | `apps/api/app/api/command-board/layouts/commands/create/route.ts` |
| `/api/command-board/layouts/commands/remove` | POST | CommandBoardLayout, User | `apps/api/app/api/command-board/layouts/commands/remove/route.ts` |
| `/api/command-board/layouts/commands/update` | POST | CommandBoardLayout, User | `apps/api/app/api/command-board/layouts/commands/update/route.ts` |
| `/api/command-board/layouts/list` | GET | CommandBoardLayout | `apps/api/app/api/command-board/layouts/list/route.ts` |
| `/api/command-board/layouts` | GET, POST | CommandBoardLayout | `apps/api/app/api/command-board/layouts/route.ts` |
| `/api/command-board` | GET, POST | CommandBoard | `apps/api/app/api/command-board/route.ts` |
| `/api/command-board/simulations/[id]/apply` | POST | CommandBoard | `apps/api/app/api/command-board/simulations/[id]/apply/route.ts` |
| `/api/command-board/simulations/[id]/delta` | GET | CommandBoard | `apps/api/app/api/command-board/simulations/[id]/delta/route.ts` |
| `/api/command-board/simulations/[id]/discard` | POST | CommandBoard | `apps/api/app/api/command-board/simulations/[id]/discard/route.ts` |
| `/api/command-board/simulations/[id]` | DELETE, GET | CommandBoard | `apps/api/app/api/command-board/simulations/[id]/route.ts` |
| `/api/command-board/simulations/merge` | GET, POST | CommandBoard | `apps/api/app/api/command-board/simulations/merge/route.ts` |
| `/api/command-board/simulations` | GET, POST | BoardAnnotation, BoardProjection, CommandBoard, CommandBoardGroup | `apps/api/app/api/command-board/simulations/route.ts` |
| `/api/command-board/templates/[shareId]` | GET, POST | - | `apps/api/app/api/command-board/templates/[shareId]/route.ts` |
| `/api/command-board/templates` | GET | - | `apps/api/app/api/command-board/templates/route.ts` |

### procurement

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/procurement/approvals/action` | POST | - | `apps/api/app/api/procurement/approvals/action/route.ts` |
| `/api/procurement/approvals/list` | GET | - | `apps/api/app/api/procurement/approvals/list/route.ts` |
| `/api/procurement/budget/[id]` | GET | - | `apps/api/app/api/procurement/budget/[id]/route.ts` |
| `/api/procurement/budget/commands/create` | POST | - | `apps/api/app/api/procurement/budget/commands/create/route.ts` |
| `/api/procurement/budget/commands/delete` | POST | - | `apps/api/app/api/procurement/budget/commands/delete/route.ts` |
| `/api/procurement/budget/commands/refresh` | POST | - | `apps/api/app/api/procurement/budget/commands/refresh/route.ts` |
| `/api/procurement/budget/commands/update` | POST | - | `apps/api/app/api/procurement/budget/commands/update/route.ts` |
| `/api/procurement/budget/list` | GET | - | `apps/api/app/api/procurement/budget/list/route.ts` |
| `/api/procurement/purchase-orders/[id]` | GET | - | `apps/api/app/api/procurement/purchase-orders/[id]/route.ts` |
| `/api/procurement/purchase-orders/commands/create` | POST | - | `apps/api/app/api/procurement/purchase-orders/commands/create/route.ts` |
| `/api/procurement/purchase-orders/commands/receive` | POST | - | `apps/api/app/api/procurement/purchase-orders/commands/receive/route.ts` |
| `/api/procurement/purchase-orders/commands/update-status` | POST | - | `apps/api/app/api/procurement/purchase-orders/commands/update-status/route.ts` |
| `/api/procurement/purchase-orders/list` | GET | - | `apps/api/app/api/procurement/purchase-orders/list/route.ts` |
| `/api/procurement/requisitions/commands/approve-finance` | POST | PurchaseRequisition (manifest), User | `apps/api/app/api/procurement/requisitions/commands/approve-finance/route.ts` |
| `/api/procurement/requisitions/commands/approve-manager` | POST | PurchaseRequisition (manifest), User | `apps/api/app/api/procurement/requisitions/commands/approve-manager/route.ts` |
| `/api/procurement/requisitions/commands/cancel` | POST | PurchaseRequisition (manifest), User | `apps/api/app/api/procurement/requisitions/commands/cancel/route.ts` |
| `/api/procurement/requisitions/commands/convert-to-po` | POST | PurchaseRequisition (manifest), User | `apps/api/app/api/procurement/requisitions/commands/convert-to-po/route.ts` |
| `/api/procurement/requisitions/commands/create` | POST | PurchaseRequisition (manifest), User | `apps/api/app/api/procurement/requisitions/commands/create/route.ts` |
| `/api/procurement/requisitions/commands/reject` | POST | PurchaseRequisition (manifest), User | `apps/api/app/api/procurement/requisitions/commands/reject/route.ts` |
| `/api/procurement/requisitions/commands/submit` | POST | PurchaseRequisition (manifest), User | `apps/api/app/api/procurement/requisitions/commands/submit/route.ts` |
| `/api/procurement/requisitions/commands/update` | POST | PurchaseRequisition (manifest), User | `apps/api/app/api/procurement/requisitions/commands/update/route.ts` |
| `/api/procurement/requisitions/list` | GET | PurchaseOrder | `apps/api/app/api/procurement/requisitions/list/route.ts` |
| `/api/procurement/vendor-contracts/commands/activate` | POST | User, VendorContract (manifest) | `apps/api/app/api/procurement/vendor-contracts/commands/activate/route.ts` |
| `/api/procurement/vendor-contracts/commands/approve` | POST | User, VendorContract (manifest) | `apps/api/app/api/procurement/vendor-contracts/commands/approve/route.ts` |
| `/api/procurement/vendor-contracts/commands/create` | POST | User, VendorContract (manifest) | `apps/api/app/api/procurement/vendor-contracts/commands/create/route.ts` |
| `/api/procurement/vendor-contracts/commands/reject` | POST | User, VendorContract (manifest) | `apps/api/app/api/procurement/vendor-contracts/commands/reject/route.ts` |
| `/api/procurement/vendor-contracts/commands/submit` | POST | User, VendorContract (manifest) | `apps/api/app/api/procurement/vendor-contracts/commands/submit/route.ts` |
| `/api/procurement/vendor-contracts/commands/terminate` | POST | User, VendorContract (manifest) | `apps/api/app/api/procurement/vendor-contracts/commands/terminate/route.ts` |
| `/api/procurement/vendor-contracts/commands/update-compliance` | POST | User, VendorContract (manifest) | `apps/api/app/api/procurement/vendor-contracts/commands/update-compliance/route.ts` |
| `/api/procurement/vendor-contracts/list` | GET | EventContract | `apps/api/app/api/procurement/vendor-contracts/list/route.ts` |
| `/api/procurement/vendors/[id]` | GET | - | `apps/api/app/api/procurement/vendors/[id]/route.ts` |
| `/api/procurement/vendors/commands/add-contact` | POST | - | `apps/api/app/api/procurement/vendors/commands/add-contact/route.ts` |
| `/api/procurement/vendors/commands/create` | POST | - | `apps/api/app/api/procurement/vendors/commands/create/route.ts` |
| `/api/procurement/vendors/commands/delete` | POST | - | `apps/api/app/api/procurement/vendors/commands/delete/route.ts` |
| `/api/procurement/vendors/commands/rate` | POST | - | `apps/api/app/api/procurement/vendors/commands/rate/route.ts` |
| `/api/procurement/vendors/commands/update` | POST | - | `apps/api/app/api/procurement/vendors/commands/update/route.ts` |
| `/api/procurement/vendors/list` | GET | - | `apps/api/app/api/procurement/vendors/list/route.ts` |

### payroll

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/payroll/approval-history/[id]` | GET | ApprovalHistory | `apps/api/app/api/payroll/approval-history/[id]/route.ts` |
| `/api/payroll/approval-history/commands/create` | POST | PayrollApprovalHistory (manifest), User | `apps/api/app/api/payroll/approval-history/commands/create/route.ts` |
| `/api/payroll/approval-history/list` | GET | ApprovalHistory | `apps/api/app/api/payroll/approval-history/list/route.ts` |
| `/api/payroll/approvals/[approvalId]` | PUT | - | `apps/api/app/api/payroll/approvals/[approvalId]/route.ts` |
| `/api/payroll/approvals/history` | GET | - | `apps/api/app/api/payroll/approvals/history/route.ts` |
| `/api/payroll/approvals` | GET, POST | PayrollApprovalHistory (manifest) | `apps/api/app/api/payroll/approvals/route.ts` |
| `/api/payroll/bank-accounts/commands/create` | POST | - | `apps/api/app/api/payroll/bank-accounts/commands/create/route.ts` |
| `/api/payroll/bank-accounts/commands/delete` | POST | - | `apps/api/app/api/payroll/bank-accounts/commands/delete/route.ts` |
| `/api/payroll/bank-accounts/commands/set-default` | POST | - | `apps/api/app/api/payroll/bank-accounts/commands/set-default/route.ts` |
| `/api/payroll/bank-accounts/commands/update` | POST | - | `apps/api/app/api/payroll/bank-accounts/commands/update/route.ts` |
| `/api/payroll/bank-accounts/commands/verify` | POST | - | `apps/api/app/api/payroll/bank-accounts/commands/verify/route.ts` |
| `/api/payroll/bank-accounts/list` | GET | - | `apps/api/app/api/payroll/bank-accounts/list/route.ts` |
| `/api/payroll/deductions/[id]` | GET | EmployeeDeduction | `apps/api/app/api/payroll/deductions/[id]/route.ts` |
| `/api/payroll/deductions/commands/create` | POST | EmployeeDeduction, User | `apps/api/app/api/payroll/deductions/commands/create/route.ts` |
| `/api/payroll/deductions/list` | GET | EmployeeDeduction | `apps/api/app/api/payroll/deductions/list/route.ts` |
| `/api/payroll/deductions` | GET, POST | EmployeeDeduction | `apps/api/app/api/payroll/deductions/route.ts` |
| `/api/payroll/export/quickbooks` | - | - | `apps/api/app/api/payroll/export/quickbooks/route.ts` |
| `/api/payroll/generate` | POST | - | `apps/api/app/api/payroll/generate/route.ts` |
| `/api/payroll/labor-budgets/[id]` | GET | LaborBudget | `apps/api/app/api/payroll/labor-budgets/[id]/route.ts` |
| `/api/payroll/labor-budgets/commands/create` | POST | LaborBudget, User | `apps/api/app/api/payroll/labor-budgets/commands/create/route.ts` |
| `/api/payroll/labor-budgets/commands/soft-delete` | POST | LaborBudget, User | `apps/api/app/api/payroll/labor-budgets/commands/soft-delete/route.ts` |
| `/api/payroll/labor-budgets/commands/update` | POST | LaborBudget, User | `apps/api/app/api/payroll/labor-budgets/commands/update/route.ts` |
| `/api/payroll/labor-budgets/list` | GET | LaborBudget | `apps/api/app/api/payroll/labor-budgets/list/route.ts` |
| `/api/payroll/periods/[id]` | GET | payroll_periods | `apps/api/app/api/payroll/periods/[id]/route.ts` |
| `/api/payroll/periods/commands/create` | POST | PayrollPeriod (manifest), User | `apps/api/app/api/payroll/periods/commands/create/route.ts` |
| `/api/payroll/periods/list` | GET | payroll_periods | `apps/api/app/api/payroll/periods/list/route.ts` |
| `/api/payroll/periods` | GET, POST | PayrollPeriod (manifest) | `apps/api/app/api/payroll/periods/route.ts` |
| `/api/payroll/reports/[periodId]` | GET | - | `apps/api/app/api/payroll/reports/[periodId]/route.ts` |
| `/api/payroll/runs/[id]` | GET | payroll_runs | `apps/api/app/api/payroll/runs/[id]/route.ts` |
| `/api/payroll/runs/commands/update-status` | POST | PayrollRun (manifest), User | `apps/api/app/api/payroll/runs/commands/update-status/route.ts` |
| `/api/payroll/runs/list` | GET | payroll_runs | `apps/api/app/api/payroll/runs/list/route.ts` |
| `/api/payroll/runs` | GET | - | `apps/api/app/api/payroll/runs/route.ts` |
| `/api/payroll/tax/brackets` | GET, PUT | - | `apps/api/app/api/payroll/tax/brackets/route.ts` |
| `/api/payroll/tax/list` | GET, PUT | - | `apps/api/app/api/payroll/tax/list/route.ts` |
| `/api/payroll/timecards/generate` | POST | - | `apps/api/app/api/payroll/timecards/generate/route.ts` |

### collaboration

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/collaboration/auth` | - | - | `apps/api/app/api/collaboration/auth/route.ts` |
| `/api/collaboration/notifications/[id]` | GET | Notification | `apps/api/app/api/collaboration/notifications/[id]/route.ts` |
| `/api/collaboration/notifications/commands/create` | POST | Notification, User | `apps/api/app/api/collaboration/notifications/commands/create/route.ts` |
| `/api/collaboration/notifications/commands/mark-dismissed` | POST | Notification, User | `apps/api/app/api/collaboration/notifications/commands/mark-dismissed/route.ts` |
| `/api/collaboration/notifications/commands/mark-read` | POST | Notification, User | `apps/api/app/api/collaboration/notifications/commands/mark-read/route.ts` |
| `/api/collaboration/notifications/commands/remove` | POST | Notification, User | `apps/api/app/api/collaboration/notifications/commands/remove/route.ts` |
| `/api/collaboration/notifications/email/history` | GET | - | `apps/api/app/api/collaboration/notifications/email/history/route.ts` |
| `/api/collaboration/notifications/email/preferences` | GET, POST | - | `apps/api/app/api/collaboration/notifications/email/preferences/route.ts` |
| `/api/collaboration/notifications/email/send` | POST | - | `apps/api/app/api/collaboration/notifications/email/send/route.ts` |
| `/api/collaboration/notifications/email/templates/[id]` | DELETE, GET, PUT | EmailTemplate (manifest), email_templates | `apps/api/app/api/collaboration/notifications/email/templates/[id]/route.ts` |
| `/api/collaboration/notifications/email/templates` | GET, POST | EmailTemplate (manifest), email_templates | `apps/api/app/api/collaboration/notifications/email/templates/route.ts` |
| `/api/collaboration/notifications/email/webhook` | POST | - | `apps/api/app/api/collaboration/notifications/email/webhook/route.ts` |
| `/api/collaboration/notifications/email/workflows/[id]` | DELETE, GET, PUT | EmailWorkflow | `apps/api/app/api/collaboration/notifications/email/workflows/[id]/route.ts` |
| `/api/collaboration/notifications/email/workflows` | GET, POST | EmailWorkflow | `apps/api/app/api/collaboration/notifications/email/workflows/route.ts` |
| `/api/collaboration/notifications/list` | GET | Notification | `apps/api/app/api/collaboration/notifications/list/route.ts` |
| `/api/collaboration/notifications/sms/history` | GET | - | `apps/api/app/api/collaboration/notifications/sms/history/route.ts` |
| `/api/collaboration/notifications/sms/preferences` | GET, POST | - | `apps/api/app/api/collaboration/notifications/sms/preferences/route.ts` |
| `/api/collaboration/notifications/sms/send` | POST | - | `apps/api/app/api/collaboration/notifications/sms/send/route.ts` |
| `/api/collaboration/notifications/sms/webhook` | POST | sms_logs | `apps/api/app/api/collaboration/notifications/sms/webhook/route.ts` |
| `/api/collaboration/workflows/[id]` | GET | Workflow | `apps/api/app/api/collaboration/workflows/[id]/route.ts` |
| `/api/collaboration/workflows/commands/activate` | POST | User, Workflow | `apps/api/app/api/collaboration/workflows/commands/activate/route.ts` |
| `/api/collaboration/workflows/commands/create` | POST | User, Workflow | `apps/api/app/api/collaboration/workflows/commands/create/route.ts` |
| `/api/collaboration/workflows/commands/deactivate` | POST | User, Workflow | `apps/api/app/api/collaboration/workflows/commands/deactivate/route.ts` |
| `/api/collaboration/workflows/commands/update` | POST | User, Workflow | `apps/api/app/api/collaboration/workflows/commands/update/route.ts` |
| `/api/collaboration/workflows/list` | GET | Workflow | `apps/api/app/api/collaboration/workflows/list/route.ts` |

### integrations

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/integrations/goodshuffle/config` | DELETE, GET, POST | GoodshuffleConfig | `apps/api/app/api/integrations/goodshuffle/config/route.ts` |
| `/api/integrations/goodshuffle/events` | GET | GoodshuffleEventSync | `apps/api/app/api/integrations/goodshuffle/events/route.ts` |
| `/api/integrations/goodshuffle/inventory` | GET | GoodshuffleInventorySync | `apps/api/app/api/integrations/goodshuffle/inventory/route.ts` |
| `/api/integrations/goodshuffle/inventory/sync` | POST | - | `apps/api/app/api/integrations/goodshuffle/inventory/sync/route.ts` |
| `/api/integrations/goodshuffle/invoices` | GET | GoodshuffleInvoiceSync | `apps/api/app/api/integrations/goodshuffle/invoices/route.ts` |
| `/api/integrations/goodshuffle/invoices/sync` | POST | - | `apps/api/app/api/integrations/goodshuffle/invoices/sync/route.ts` |
| `/api/integrations/goodshuffle/status` | GET | - | `apps/api/app/api/integrations/goodshuffle/status/route.ts` |
| `/api/integrations/goodshuffle/sync` | POST | - | `apps/api/app/api/integrations/goodshuffle/sync/route.ts` |
| `/api/integrations/goodshuffle/test` | GET, POST | GoodshuffleConfig | `apps/api/app/api/integrations/goodshuffle/test/route.ts` |
| `/api/integrations/nowsta/config` | DELETE, GET, POST | NowstaConfig | `apps/api/app/api/integrations/nowsta/config/route.ts` |
| `/api/integrations/nowsta/employees/map` | DELETE, POST | NowstaEmployeeMapping | `apps/api/app/api/integrations/nowsta/employees/map/route.ts` |
| `/api/integrations/nowsta/employees` | GET | NowstaConfig, NowstaEmployeeMapping | `apps/api/app/api/integrations/nowsta/employees/route.ts` |
| `/api/integrations/nowsta/status` | GET | NowstaConfig | `apps/api/app/api/integrations/nowsta/status/route.ts` |
| `/api/integrations/nowsta/sync` | POST | - | `apps/api/app/api/integrations/nowsta/sync/route.ts` |
| `/api/integrations/nowsta/test` | GET, POST | NowstaConfig | `apps/api/app/api/integrations/nowsta/test/route.ts` |
| `/api/integrations/webhooks/[id]` | DELETE, GET, PUT | OutboundWebhook | `apps/api/app/api/integrations/webhooks/[id]/route.ts` |
| `/api/integrations/webhooks/delivery-logs` | GET | WebhookDeliveryLog | `apps/api/app/api/integrations/webhooks/delivery-logs/route.ts` |
| `/api/integrations/webhooks/dlq/[id]/resolve` | POST | WebhookDeadLetterQueue | `apps/api/app/api/integrations/webhooks/dlq/[id]/resolve/route.ts` |
| `/api/integrations/webhooks/dlq/[id]/retry` | POST | OutboundWebhook, WebhookDeadLetterQueue, WebhookDeliveryLog | `apps/api/app/api/integrations/webhooks/dlq/[id]/retry/route.ts` |
| `/api/integrations/webhooks/dlq/[id]` | DELETE, GET | WebhookDeadLetterQueue | `apps/api/app/api/integrations/webhooks/dlq/[id]/route.ts` |
| `/api/integrations/webhooks/dlq` | GET | WebhookDeadLetterQueue | `apps/api/app/api/integrations/webhooks/dlq/route.ts` |
| `/api/integrations/webhooks/retry` | POST | OutboundWebhook, WebhookDeadLetterQueue, WebhookDeliveryLog | `apps/api/app/api/integrations/webhooks/retry/route.ts` |
| `/api/integrations/webhooks` | GET, POST | OutboundWebhook | `apps/api/app/api/integrations/webhooks/route.ts` |
| `/api/integrations/webhooks/trigger` | POST | OutboundWebhook, WebhookDeliveryLog | `apps/api/app/api/integrations/webhooks/trigger/route.ts` |

### administrative

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/administrative/chat/participants/[id]` | GET | AdminChatParticipant | `apps/api/app/api/administrative/chat/participants/[id]/route.ts` |
| `/api/administrative/chat/participants/commands/archive` | POST | AdminChatParticipant, User | `apps/api/app/api/administrative/chat/participants/commands/archive/route.ts` |
| `/api/administrative/chat/participants/commands/clear-history` | POST | AdminChatParticipant, User | `apps/api/app/api/administrative/chat/participants/commands/clear-history/route.ts` |
| `/api/administrative/chat/participants/commands/unarchive` | POST | AdminChatParticipant, User | `apps/api/app/api/administrative/chat/participants/commands/unarchive/route.ts` |
| `/api/administrative/chat/participants/list` | GET | AdminChatParticipant | `apps/api/app/api/administrative/chat/participants/list/route.ts` |
| `/api/administrative/chat/threads/[threadId]/messages` | GET, POST | AdminChatMessage, AdminChatParticipant, AdminChatThread, User | `apps/api/app/api/administrative/chat/threads/[threadId]/messages/route.ts` |
| `/api/administrative/chat/threads/[threadId]` | PATCH | AdminChatParticipant, AdminChatThread, User | `apps/api/app/api/administrative/chat/threads/[threadId]/route.ts` |
| `/api/administrative/chat/threads` | GET, POST | AdminChatParticipant, AdminChatThread, User | `apps/api/app/api/administrative/chat/threads/route.ts` |
| `/api/administrative/tasks/[id]` | DELETE, GET, PATCH | AdminTask | `apps/api/app/api/administrative/tasks/[id]/route.ts` |
| `/api/administrative/tasks/commands/cancel` | POST | AdminTask, User | `apps/api/app/api/administrative/tasks/commands/cancel/route.ts` |
| `/api/administrative/tasks/commands/complete` | POST | AdminTask, User | `apps/api/app/api/administrative/tasks/commands/complete/route.ts` |
| `/api/administrative/tasks/commands/create` | POST | AdminTask, User | `apps/api/app/api/administrative/tasks/commands/create/route.ts` |
| `/api/administrative/tasks/commands/move-to-todo` | POST | AdminTask, User | `apps/api/app/api/administrative/tasks/commands/move-to-todo/route.ts` |
| `/api/administrative/tasks/commands/reopen` | POST | AdminTask, User | `apps/api/app/api/administrative/tasks/commands/reopen/route.ts` |
| `/api/administrative/tasks/commands/soft-delete` | POST | AdminTask, User | `apps/api/app/api/administrative/tasks/commands/soft-delete/route.ts` |
| `/api/administrative/tasks/commands/start-progress` | POST | AdminTask, User | `apps/api/app/api/administrative/tasks/commands/start-progress/route.ts` |
| `/api/administrative/tasks/commands/update` | POST | AdminTask, User | `apps/api/app/api/administrative/tasks/commands/update/route.ts` |
| `/api/administrative/tasks/list` | GET | AdminTask | `apps/api/app/api/administrative/tasks/list/route.ts` |
| `/api/administrative/tasks` | GET, POST | AdminTask | `apps/api/app/api/administrative/tasks/route.ts` |
| `/api/administrative/trash/analyze` | GET | - | `apps/api/app/api/administrative/trash/analyze/route.ts` |
| `/api/administrative/trash/list` | GET | - | `apps/api/app/api/administrative/trash/list/route.ts` |
| `/api/administrative/trash/restore` | DELETE, POST | - | `apps/api/app/api/administrative/trash/restore/route.ts` |

### timecards

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/timecards/[id]` | DELETE, GET, PUT | TimeEntry | `apps/api/app/api/timecards/[id]/route.ts` |
| `/api/timecards/bulk` | - | - | `apps/api/app/api/timecards/bulk/route.ts` |
| `/api/timecards/edit-requests/[id]` | GET | TimecardEditRequest | `apps/api/app/api/timecards/edit-requests/[id]/route.ts` |
| `/api/timecards/edit-requests/commands/approve` | POST | TimecardEditRequest, User | `apps/api/app/api/timecards/edit-requests/commands/approve/route.ts` |
| `/api/timecards/edit-requests/commands/create` | POST | TimecardEditRequest, User | `apps/api/app/api/timecards/edit-requests/commands/create/route.ts` |
| `/api/timecards/edit-requests/commands/reject` | POST | TimecardEditRequest, User | `apps/api/app/api/timecards/edit-requests/commands/reject/route.ts` |
| `/api/timecards/edit-requests/list` | GET | TimecardEditRequest | `apps/api/app/api/timecards/edit-requests/list/route.ts` |
| `/api/timecards/entries/[id]` | GET | TimeEntry | `apps/api/app/api/timecards/entries/[id]/route.ts` |
| `/api/timecards/entries/commands/add-entry` | POST | TimeEntry, User | `apps/api/app/api/timecards/entries/commands/add-entry/route.ts` |
| `/api/timecards/entries/commands/clock-in` | POST | TimeEntry, User | `apps/api/app/api/timecards/entries/commands/clock-in/route.ts` |
| `/api/timecards/entries/commands/clock-out` | POST | TimeEntry, User | `apps/api/app/api/timecards/entries/commands/clock-out/route.ts` |
| `/api/timecards/entries/commands/soft-delete` | POST | TimeEntry, User | `apps/api/app/api/timecards/entries/commands/soft-delete/route.ts` |
| `/api/timecards/entries/list` | GET | TimeEntry | `apps/api/app/api/timecards/entries/list/route.ts` |
| `/api/timecards/me` | GET | - | `apps/api/app/api/timecards/me/route.ts` |
| `/api/timecards` | GET, POST | TimeEntry | `apps/api/app/api/timecards/route.ts` |
| `/api/timecards/time-off-requests/[id]` | GET | EmployeeTimeOffRequest | `apps/api/app/api/timecards/time-off-requests/[id]/route.ts` |
| `/api/timecards/time-off-requests/commands/approve` | POST | TimeOffRequest (manifest), User | `apps/api/app/api/timecards/time-off-requests/commands/approve/route.ts` |
| `/api/timecards/time-off-requests/commands/cancel` | POST | TimeOffRequest (manifest), User | `apps/api/app/api/timecards/time-off-requests/commands/cancel/route.ts` |
| `/api/timecards/time-off-requests/commands/create` | POST | TimeOffRequest (manifest), User | `apps/api/app/api/timecards/time-off-requests/commands/create/route.ts` |
| `/api/timecards/time-off-requests/commands/reject` | POST | TimeOffRequest (manifest), User | `apps/api/app/api/timecards/time-off-requests/commands/reject/route.ts` |
| `/api/timecards/time-off-requests/commands/soft-delete` | POST | TimeOffRequest (manifest), User | `apps/api/app/api/timecards/time-off-requests/commands/soft-delete/route.ts` |
| `/api/timecards/time-off-requests/list` | GET | EmployeeTimeOffRequest | `apps/api/app/api/timecards/time-off-requests/list/route.ts` |

### eventimportworkflow

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/eventimportworkflow/cancel` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/cancel/route.ts` |
| `/api/eventimportworkflow/complete-activating` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/complete-activating/route.ts` |
| `/api/eventimportworkflow/complete-extraction` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/complete-extraction/route.ts` |
| `/api/eventimportworkflow/complete-parsing` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/complete-parsing/route.ts` |
| `/api/eventimportworkflow/complete-proposing` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/complete-proposing/route.ts` |
| `/api/eventimportworkflow/complete-reserving` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/complete-reserving/route.ts` |
| `/api/eventimportworkflow/complete-validation` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/complete-validation/route.ts` |
| `/api/eventimportworkflow/create` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/create/route.ts` |
| `/api/eventimportworkflow/fail` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/fail/route.ts` |
| `/api/eventimportworkflow/pause` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/pause/route.ts` |
| `/api/eventimportworkflow/resume` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/resume/route.ts` |
| `/api/eventimportworkflow/retry` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/retry/route.ts` |
| `/api/eventimportworkflow/start-activating` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/start-activating/route.ts` |
| `/api/eventimportworkflow/start-extracting` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/start-extracting/route.ts` |
| `/api/eventimportworkflow/start-parsing` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/start-parsing/route.ts` |
| `/api/eventimportworkflow/start-proposing` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/start-proposing/route.ts` |
| `/api/eventimportworkflow/start-reserving` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/start-reserving/route.ts` |
| `/api/eventimportworkflow/start-validating` | POST | EventImportWorkflow (manifest) | `apps/api/app/api/eventimportworkflow/start-validating/route.ts` |

### shipments

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/shipments/[id]/items/[itemId]` | DELETE, PUT | Shipment, ShipmentItem | `apps/api/app/api/shipments/[id]/items/[itemId]/route.ts` |
| `/api/shipments/[id]/items` | GET, POST | Shipment, ShipmentItem | `apps/api/app/api/shipments/[id]/items/route.ts` |
| `/api/shipments/[id]` | DELETE, GET, PUT | Shipment | `apps/api/app/api/shipments/[id]/route.ts` |
| `/api/shipments/[id]/status` | POST | Shipment | `apps/api/app/api/shipments/[id]/status/route.ts` |
| `/api/shipments` | GET, POST | Shipment | `apps/api/app/api/shipments/route.ts` |
| `/api/shipments/shipment/[id]` | GET | Shipment | `apps/api/app/api/shipments/shipment/[id]/route.ts` |
| `/api/shipments/shipment/commands/cancel` | POST | Shipment, User | `apps/api/app/api/shipments/shipment/commands/cancel/route.ts` |
| `/api/shipments/shipment/commands/create` | POST | Shipment, User | `apps/api/app/api/shipments/shipment/commands/create/route.ts` |
| `/api/shipments/shipment/commands/mark-delivered` | POST | Shipment, User | `apps/api/app/api/shipments/shipment/commands/mark-delivered/route.ts` |
| `/api/shipments/shipment/commands/schedule` | POST | Shipment, User | `apps/api/app/api/shipments/shipment/commands/schedule/route.ts` |
| `/api/shipments/shipment/commands/ship` | POST | Shipment, User | `apps/api/app/api/shipments/shipment/commands/ship/route.ts` |
| `/api/shipments/shipment/commands/start-preparing` | POST | Shipment, User | `apps/api/app/api/shipments/shipment/commands/start-preparing/route.ts` |
| `/api/shipments/shipment/commands/update` | POST | Shipment, User | `apps/api/app/api/shipments/shipment/commands/update/route.ts` |
| `/api/shipments/shipment/list` | GET | Shipment | `apps/api/app/api/shipments/shipment/list/route.ts` |
| `/api/shipments/shipment-items/[id]` | GET | ShipmentItem | `apps/api/app/api/shipments/shipment-items/[id]/route.ts` |
| `/api/shipments/shipment-items/commands/create` | POST | ShipmentItem, User | `apps/api/app/api/shipments/shipment-items/commands/create/route.ts` |
| `/api/shipments/shipment-items/commands/update-received` | POST | ShipmentItem, User | `apps/api/app/api/shipments/shipment-items/commands/update-received/route.ts` |
| `/api/shipments/shipment-items/list` | GET | ShipmentItem | `apps/api/app/api/shipments/shipment-items/list/route.ts` |

### accounting

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/accounting/accounts/[id]` | DELETE, GET, PUT | ChartOfAccount | `apps/api/app/api/accounting/accounts/[id]/route.ts` |
| `/api/accounting/accounts` | GET, POST | ChartOfAccount | `apps/api/app/api/accounting/accounts/route.ts` |
| `/api/accounting/chart-of-accounts/[id]` | GET | ChartOfAccount | `apps/api/app/api/accounting/chart-of-accounts/[id]/route.ts` |
| `/api/accounting/chart-of-accounts/commands/create` | POST | ChartOfAccount, User | `apps/api/app/api/accounting/chart-of-accounts/commands/create/route.ts` |
| `/api/accounting/chart-of-accounts/commands/deactivate` | POST | ChartOfAccount, User | `apps/api/app/api/accounting/chart-of-accounts/commands/deactivate/route.ts` |
| `/api/accounting/chart-of-accounts/commands/update` | POST | ChartOfAccount, User | `apps/api/app/api/accounting/chart-of-accounts/commands/update/route.ts` |
| `/api/accounting/chart-of-accounts/list` | GET | ChartOfAccount | `apps/api/app/api/accounting/chart-of-accounts/list/route.ts` |
| `/api/accounting/collections/cases/[id]` | GET, PATCH | CollectionCase | `apps/api/app/api/accounting/collections/cases/[id]/route.ts` |
| `/api/accounting/collections/cases` | GET, POST | CollectionCase, Invoice | `apps/api/app/api/accounting/collections/cases/route.ts` |
| `/api/accounting/invoices/[id]` | DELETE, GET, POST, PUT | Invoice | `apps/api/app/api/accounting/invoices/[id]/route.ts` |
| `/api/accounting/invoices` | GET, POST | Client, Event, Invoice | `apps/api/app/api/accounting/invoices/route.ts` |
| `/api/accounting/payment-methods/[id]` | DELETE, GET, PUT | PaymentMethod | `apps/api/app/api/accounting/payment-methods/[id]/route.ts` |
| `/api/accounting/payment-methods` | GET, POST | Client, PaymentMethod | `apps/api/app/api/accounting/payment-methods/route.ts` |
| `/api/accounting/payments/[id]` | GET, POST, PUT | Invoice, Payment | `apps/api/app/api/accounting/payments/[id]/route.ts` |
| `/api/accounting/payments` | GET, POST | Event, Invoice, Payment | `apps/api/app/api/accounting/payments/route.ts` |
| `/api/accounting/revenue-recognition/schedules/[id]` | GET, PATCH | - | `apps/api/app/api/accounting/revenue-recognition/schedules/[id]/route.ts` |
| `/api/accounting/revenue-recognition/schedules` | GET, POST | - | `apps/api/app/api/accounting/revenue-recognition/schedules/route.ts` |

### preptaskplanworkflow

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/preptaskplanworkflow/approve-plan` | POST | PrepTaskPlanWorkflow (manifest) | `apps/api/app/api/preptaskplanworkflow/approve-plan/route.ts` |
| `/api/preptaskplanworkflow/cancel` | POST | PrepTaskPlanWorkflow (manifest) | `apps/api/app/api/preptaskplanworkflow/cancel/route.ts` |
| `/api/preptaskplanworkflow/complete-generation` | POST | PrepTaskPlanWorkflow (manifest) | `apps/api/app/api/preptaskplanworkflow/complete-generation/route.ts` |
| `/api/preptaskplanworkflow/complete-instantiation` | POST | PrepTaskPlanWorkflow (manifest) | `apps/api/app/api/preptaskplanworkflow/complete-instantiation/route.ts` |
| `/api/preptaskplanworkflow/complete-review` | POST | PrepTaskPlanWorkflow (manifest) | `apps/api/app/api/preptaskplanworkflow/complete-review/route.ts` |
| `/api/preptaskplanworkflow/complete-scheduling` | POST | PrepTaskPlanWorkflow (manifest) | `apps/api/app/api/preptaskplanworkflow/complete-scheduling/route.ts` |
| `/api/preptaskplanworkflow/create` | POST | PrepTaskPlanWorkflow (manifest) | `apps/api/app/api/preptaskplanworkflow/create/route.ts` |
| `/api/preptaskplanworkflow/fail` | POST | PrepTaskPlanWorkflow (manifest) | `apps/api/app/api/preptaskplanworkflow/fail/route.ts` |
| `/api/preptaskplanworkflow/quick-approve` | POST | PrepTaskPlanWorkflow (manifest) | `apps/api/app/api/preptaskplanworkflow/quick-approve/route.ts` |
| `/api/preptaskplanworkflow/reject-plan` | POST | PrepTaskPlanWorkflow (manifest) | `apps/api/app/api/preptaskplanworkflow/reject-plan/route.ts` |
| `/api/preptaskplanworkflow/retry` | POST | PrepTaskPlanWorkflow (manifest) | `apps/api/app/api/preptaskplanworkflow/retry/route.ts` |
| `/api/preptaskplanworkflow/start-approving` | POST | PrepTaskPlanWorkflow (manifest) | `apps/api/app/api/preptaskplanworkflow/start-approving/route.ts` |
| `/api/preptaskplanworkflow/start-generating` | POST | PrepTaskPlanWorkflow (manifest) | `apps/api/app/api/preptaskplanworkflow/start-generating/route.ts` |
| `/api/preptaskplanworkflow/start-instantiating` | POST | PrepTaskPlanWorkflow (manifest) | `apps/api/app/api/preptaskplanworkflow/start-instantiating/route.ts` |
| `/api/preptaskplanworkflow/start-reviewing` | POST | PrepTaskPlanWorkflow (manifest) | `apps/api/app/api/preptaskplanworkflow/start-reviewing/route.ts` |
| `/api/preptaskplanworkflow/start-scheduling` | POST | PrepTaskPlanWorkflow (manifest) | `apps/api/app/api/preptaskplanworkflow/start-scheduling/route.ts` |

### settings

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/settings/api-keys/[id]/revoke` | - | ApiKey | `apps/api/app/api/settings/api-keys/[id]/revoke/route.ts` |
| `/api/settings/api-keys/[id]/rotate` | - | ApiKey | `apps/api/app/api/settings/api-keys/[id]/rotate/route.ts` |
| `/api/settings/api-keys/[id]` | - | ApiKey | `apps/api/app/api/settings/api-keys/[id]/route.ts` |
| `/api/settings/api-keys/commands/create` | POST | ApiKey, User | `apps/api/app/api/settings/api-keys/commands/create/route.ts` |
| `/api/settings/api-keys/commands/record-usage` | POST | ApiKey, User | `apps/api/app/api/settings/api-keys/commands/record-usage/route.ts` |
| `/api/settings/api-keys/commands/revoke` | POST | ApiKey, User | `apps/api/app/api/settings/api-keys/commands/revoke/route.ts` |
| `/api/settings/api-keys/commands/soft-delete` | POST | ApiKey, User | `apps/api/app/api/settings/api-keys/commands/soft-delete/route.ts` |
| `/api/settings/api-keys/commands/update` | POST | ApiKey, User | `apps/api/app/api/settings/api-keys/commands/update/route.ts` |
| `/api/settings/api-keys/list` | GET | ApiKey | `apps/api/app/api/settings/api-keys/list/route.ts` |
| `/api/settings/api-keys` | - | ApiKey | `apps/api/app/api/settings/api-keys/route.ts` |
| `/api/settings/rate-limits/[id]` | DELETE, GET, PATCH | RateLimitConfig | `apps/api/app/api/settings/rate-limits/[id]/route.ts` |
| `/api/settings/rate-limits/analytics` | GET | RateLimitEvent, RateLimitUsage | `apps/api/app/api/settings/rate-limits/analytics/route.ts` |
| `/api/settings/rate-limits/events` | GET | RateLimitEvent | `apps/api/app/api/settings/rate-limits/events/route.ts` |
| `/api/settings/rate-limits` | GET, POST | RateLimitConfig | `apps/api/app/api/settings/rate-limits/route.ts` |

### logistics

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/logistics/dispatch/commands/assign` | POST | DeliveryRoute | `apps/api/app/api/logistics/dispatch/commands/assign/route.ts` |
| `/api/logistics/dispatch` | GET | DeliveryRoute | `apps/api/app/api/logistics/dispatch/route.ts` |
| `/api/logistics/drivers/commands/create` | POST | - | `apps/api/app/api/logistics/drivers/commands/create/route.ts` |
| `/api/logistics/drivers/commands/delete` | POST | - | `apps/api/app/api/logistics/drivers/commands/delete/route.ts` |
| `/api/logistics/drivers/commands/update` | POST | - | `apps/api/app/api/logistics/drivers/commands/update/route.ts` |
| `/api/logistics/drivers/list` | GET | - | `apps/api/app/api/logistics/drivers/list/route.ts` |
| `/api/logistics/routes/commands/create` | POST | DeliveryRoute | `apps/api/app/api/logistics/routes/commands/create/route.ts` |
| `/api/logistics/routes/commands/optimize` | POST | - | `apps/api/app/api/logistics/routes/commands/optimize/route.ts` |
| `/api/logistics/routes/commands/update-status` | POST | DeliveryRoute, RouteStop | `apps/api/app/api/logistics/routes/commands/update-status/route.ts` |
| `/api/logistics/routes/list` | GET | DeliveryRoute | `apps/api/app/api/logistics/routes/list/route.ts` |
| `/api/logistics/vehicles/commands/create` | POST | - | `apps/api/app/api/logistics/vehicles/commands/create/route.ts` |
| `/api/logistics/vehicles/commands/update` | POST | - | `apps/api/app/api/logistics/vehicles/commands/update/route.ts` |
| `/api/logistics/vehicles/list` | GET | - | `apps/api/app/api/logistics/vehicles/list/route.ts` |

### preptask

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/preptask/cancel` | POST | PrepTask | `apps/api/app/api/preptask/cancel/route.ts` |
| `/api/preptask/claim` | POST | PrepTask | `apps/api/app/api/preptask/claim/route.ts` |
| `/api/preptask/complete` | POST | PrepTask | `apps/api/app/api/preptask/complete/route.ts` |
| `/api/preptask/create` | POST | PrepTask | `apps/api/app/api/preptask/create/route.ts` |
| `/api/preptask/reassign` | POST | PrepTask | `apps/api/app/api/preptask/reassign/route.ts` |
| `/api/preptask/release` | POST | PrepTask | `apps/api/app/api/preptask/release/route.ts` |
| `/api/preptask/start` | POST | PrepTask | `apps/api/app/api/preptask/start/route.ts` |
| `/api/preptask/unclaim` | POST | PrepTask | `apps/api/app/api/preptask/unclaim/route.ts` |
| `/api/preptask/update-assignment` | POST | PrepTask | `apps/api/app/api/preptask/update-assignment/route.ts` |
| `/api/preptask/update-due-date` | POST | PrepTask | `apps/api/app/api/preptask/update-due-date/route.ts` |
| `/api/preptask/update-priority` | POST | PrepTask | `apps/api/app/api/preptask/update-priority/route.ts` |
| `/api/preptask/update-quantity` | POST | PrepTask | `apps/api/app/api/preptask/update-quantity/route.ts` |
| `/api/preptask/update-status` | POST | PrepTask | `apps/api/app/api/preptask/update-status/route.ts` |

### communications

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/communications/email-templates/[id]` | GET | email_templates | `apps/api/app/api/communications/email-templates/[id]/route.ts` |
| `/api/communications/email-templates/commands/create` | POST | EmailTemplate (manifest), User | `apps/api/app/api/communications/email-templates/commands/create/route.ts` |
| `/api/communications/email-templates/commands/soft-delete` | POST | EmailTemplate (manifest), User | `apps/api/app/api/communications/email-templates/commands/soft-delete/route.ts` |
| `/api/communications/email-templates/commands/update` | POST | EmailTemplate (manifest), User | `apps/api/app/api/communications/email-templates/commands/update/route.ts` |
| `/api/communications/email-templates/list` | GET | email_templates | `apps/api/app/api/communications/email-templates/list/route.ts` |
| `/api/communications/email-workflows/[id]` | GET | EmailWorkflow | `apps/api/app/api/communications/email-workflows/[id]/route.ts` |
| `/api/communications/email-workflows/commands/create` | POST | EmailWorkflow, User | `apps/api/app/api/communications/email-workflows/commands/create/route.ts` |
| `/api/communications/email-workflows/commands/soft-delete` | POST | EmailWorkflow, User | `apps/api/app/api/communications/email-workflows/commands/soft-delete/route.ts` |
| `/api/communications/email-workflows/commands/update` | POST | EmailWorkflow, User | `apps/api/app/api/communications/email-workflows/commands/update/route.ts` |
| `/api/communications/email-workflows/list` | GET | EmailWorkflow | `apps/api/app/api/communications/email-workflows/list/route.ts` |
| `/api/communications/sms/automation-rules/[id]` | DELETE, GET, PATCH | SmsAutomationRule (manifest), sms_automation_rules | `apps/api/app/api/communications/sms/automation-rules/[id]/route.ts` |
| `/api/communications/sms/automation-rules` | GET, POST | SmsAutomationRule (manifest), sms_automation_rules | `apps/api/app/api/communications/sms/automation-rules/route.ts` |

### facilities

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/facilities/areas/commands/create` | POST | - | `apps/api/app/api/facilities/areas/commands/create/route.ts` |
| `/api/facilities/areas/list` | GET | - | `apps/api/app/api/facilities/areas/list/route.ts` |
| `/api/facilities/assets/commands/create` | POST | - | `apps/api/app/api/facilities/assets/commands/create/route.ts` |
| `/api/facilities/assets/commands/delete` | POST | - | `apps/api/app/api/facilities/assets/commands/delete/route.ts` |
| `/api/facilities/assets/commands/update` | POST | - | `apps/api/app/api/facilities/assets/commands/update/route.ts` |
| `/api/facilities/assets/list` | GET | - | `apps/api/app/api/facilities/assets/list/route.ts` |
| `/api/facilities/schedules/commands/complete` | POST | - | `apps/api/app/api/facilities/schedules/commands/complete/route.ts` |
| `/api/facilities/schedules/commands/create` | POST | - | `apps/api/app/api/facilities/schedules/commands/create/route.ts` |
| `/api/facilities/schedules/list` | GET | - | `apps/api/app/api/facilities/schedules/list/route.ts` |
| `/api/facilities/work-orders/commands/create` | POST | - | `apps/api/app/api/facilities/work-orders/commands/create/route.ts` |
| `/api/facilities/work-orders/commands/update-status` | POST | - | `apps/api/app/api/facilities/work-orders/commands/update-status/route.ts` |
| `/api/facilities/work-orders/list` | GET | - | `apps/api/app/api/facilities/work-orders/list/route.ts` |

### training

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/training/assignments/[id]` | GET | TrainingAssignment | `apps/api/app/api/training/assignments/[id]/route.ts` |
| `/api/training/assignments/commands/create` | POST | TrainingAssignment, User | `apps/api/app/api/training/assignments/commands/create/route.ts` |
| `/api/training/assignments/commands/soft-delete` | POST | TrainingAssignment, User | `apps/api/app/api/training/assignments/commands/soft-delete/route.ts` |
| `/api/training/assignments/list` | GET | TrainingAssignment | `apps/api/app/api/training/assignments/list/route.ts` |
| `/api/training/assignments` | GET, POST | TrainingAssignment | `apps/api/app/api/training/assignments/route.ts` |
| `/api/training/complete` | POST | - | `apps/api/app/api/training/complete/route.ts` |
| `/api/training/modules/[id]` | DELETE, GET, PUT | TrainingModule | `apps/api/app/api/training/modules/[id]/route.ts` |
| `/api/training/modules/commands/create` | POST | TrainingModule, User | `apps/api/app/api/training/modules/commands/create/route.ts` |
| `/api/training/modules/commands/soft-delete` | POST | TrainingModule, User | `apps/api/app/api/training/modules/commands/soft-delete/route.ts` |
| `/api/training/modules/commands/update` | POST | TrainingModule, User | `apps/api/app/api/training/modules/commands/update/route.ts` |
| `/api/training/modules/list` | GET | TrainingModule | `apps/api/app/api/training/modules/list/route.ts` |
| `/api/training/modules` | GET, POST | TrainingModule | `apps/api/app/api/training/modules/route.ts` |

### kitchentask

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/kitchentask/add-tag` | POST | KitchenTask | `apps/api/app/api/kitchentask/add-tag/route.ts` |
| `/api/kitchentask/cancel` | POST | KitchenTask | `apps/api/app/api/kitchentask/cancel/route.ts` |
| `/api/kitchentask/claim` | POST | KitchenTask | `apps/api/app/api/kitchentask/claim/route.ts` |
| `/api/kitchentask/complete` | POST | KitchenTask | `apps/api/app/api/kitchentask/complete/route.ts` |
| `/api/kitchentask/create` | POST | KitchenTask | `apps/api/app/api/kitchentask/create/route.ts` |
| `/api/kitchentask/reassign` | POST | KitchenTask | `apps/api/app/api/kitchentask/reassign/route.ts` |
| `/api/kitchentask/release` | POST | KitchenTask | `apps/api/app/api/kitchentask/release/route.ts` |
| `/api/kitchentask/remove-tag` | POST | KitchenTask | `apps/api/app/api/kitchentask/remove-tag/route.ts` |
| `/api/kitchentask/start` | POST | KitchenTask | `apps/api/app/api/kitchentask/start/route.ts` |
| `/api/kitchentask/update-complexity` | POST | KitchenTask | `apps/api/app/api/kitchentask/update-complexity/route.ts` |
| `/api/kitchentask/update-priority` | POST | KitchenTask | `apps/api/app/api/kitchentask/update-priority/route.ts` |

### event

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/event/archive` | POST | Event | `apps/api/app/api/event/archive/route.ts` |
| `/api/event/cancel` | POST | Event | `apps/api/app/api/event/cancel/route.ts` |
| `/api/event/confirm` | POST | Event | `apps/api/app/api/event/confirm/route.ts` |
| `/api/event/create` | POST | Event | `apps/api/app/api/event/create/route.ts` |
| `/api/event/finalize` | POST | Event | `apps/api/app/api/event/finalize/route.ts` |
| `/api/event/unfinalize` | POST | Event | `apps/api/app/api/event/unfinalize/route.ts` |
| `/api/event/update` | POST | Event | `apps/api/app/api/event/update/route.ts` |
| `/api/event/update-date` | POST | Event | `apps/api/app/api/event/update-date/route.ts` |
| `/api/event/update-guest-count` | POST | Event | `apps/api/app/api/event/update-guest-count/route.ts` |
| `/api/event/update-location` | POST | Event | `apps/api/app/api/event/update-location/route.ts` |

### preplist

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/preplist/activate` | POST | PrepList | `apps/api/app/api/preplist/activate/route.ts` |
| `/api/preplist/cancel` | POST | PrepList | `apps/api/app/api/preplist/cancel/route.ts` |
| `/api/preplist/create` | POST | PrepList | `apps/api/app/api/preplist/create/route.ts` |
| `/api/preplist/create-from-seed` | POST | PrepList | `apps/api/app/api/preplist/create-from-seed/route.ts` |
| `/api/preplist/deactivate` | POST | PrepList | `apps/api/app/api/preplist/deactivate/route.ts` |
| `/api/preplist/finalize` | POST | PrepList | `apps/api/app/api/preplist/finalize/route.ts` |
| `/api/preplist/mark-completed` | POST | PrepList | `apps/api/app/api/preplist/mark-completed/route.ts` |
| `/api/preplist/reopen` | POST | PrepList | `apps/api/app/api/preplist/reopen/route.ts` |
| `/api/preplist/update` | POST | PrepList | `apps/api/app/api/preplist/update/route.ts` |
| `/api/preplist/update-batch-multiplier` | POST | PrepList | `apps/api/app/api/preplist/update-batch-multiplier/route.ts` |

### rolepolicy

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/rolepolicy/[id]` | GET | RolePolicy | `apps/api/app/api/rolepolicy/[id]/route.ts` |
| `/api/rolepolicy/grant` | POST | RolePolicy | `apps/api/app/api/rolepolicy/grant/route.ts` |
| `/api/rolepolicy/list` | GET | RolePolicy | `apps/api/app/api/rolepolicy/list/route.ts` |
| `/api/rolepolicy/policies/[id]` | GET | RolePolicy | `apps/api/app/api/rolepolicy/policies/[id]/route.ts` |
| `/api/rolepolicy/policies/commands/grant` | POST | RolePolicy, User | `apps/api/app/api/rolepolicy/policies/commands/grant/route.ts` |
| `/api/rolepolicy/policies/commands/revoke` | POST | RolePolicy, User | `apps/api/app/api/rolepolicy/policies/commands/revoke/route.ts` |
| `/api/rolepolicy/policies/commands/update` | POST | RolePolicy, User | `apps/api/app/api/rolepolicy/policies/commands/update/route.ts` |
| `/api/rolepolicy/policies/list` | GET | RolePolicy | `apps/api/app/api/rolepolicy/policies/list/route.ts` |
| `/api/rolepolicy/revoke` | POST | RolePolicy | `apps/api/app/api/rolepolicy/revoke/route.ts` |
| `/api/rolepolicy/update` | POST | RolePolicy | `apps/api/app/api/rolepolicy/update/route.ts` |

### admintask

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/admintask/cancel` | POST | AdminTask | `apps/api/app/api/admintask/cancel/route.ts` |
| `/api/admintask/complete` | POST | AdminTask | `apps/api/app/api/admintask/complete/route.ts` |
| `/api/admintask/create` | POST | AdminTask | `apps/api/app/api/admintask/create/route.ts` |
| `/api/admintask/move-to-todo` | POST | AdminTask | `apps/api/app/api/admintask/move-to-todo/route.ts` |
| `/api/admintask/reopen` | POST | AdminTask | `apps/api/app/api/admintask/reopen/route.ts` |
| `/api/admintask/soft-delete` | POST | AdminTask | `apps/api/app/api/admintask/soft-delete/route.ts` |
| `/api/admintask/start-progress` | POST | AdminTask | `apps/api/app/api/admintask/start-progress/route.ts` |
| `/api/admintask/update` | POST | AdminTask | `apps/api/app/api/admintask/update/route.ts` |

### calendar

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/calendar/reschedule` | PATCH | Event, ScheduleShift | `apps/api/app/api/calendar/reschedule/route.ts` |
| `/api/calendar` | GET | EmployeeTimeOffRequest, Event, ScheduleShift | `apps/api/app/api/calendar/route.ts` |
| `/api/calendar/sync/callback/google` | GET | ProviderSync | `apps/api/app/api/calendar/sync/callback/google/route.ts` |
| `/api/calendar/sync/callback/outlook` | GET | ProviderSync | `apps/api/app/api/calendar/sync/callback/outlook/route.ts` |
| `/api/calendar/sync/connect` | POST | ProviderSync | `apps/api/app/api/calendar/sync/connect/route.ts` |
| `/api/calendar/sync/disconnect` | POST | ProviderSync | `apps/api/app/api/calendar/sync/disconnect/route.ts` |
| `/api/calendar/sync/status` | GET | ProviderSync | `apps/api/app/api/calendar/sync/status/route.ts` |
| `/api/calendar/sync/trigger` | POST | Event, ProviderSync | `apps/api/app/api/calendar/sync/trigger/route.ts` |

### eventcontract

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/eventcontract/cancel` | POST | EventContract | `apps/api/app/api/eventcontract/cancel/route.ts` |
| `/api/eventcontract/create` | POST | EventContract | `apps/api/app/api/eventcontract/create/route.ts` |
| `/api/eventcontract/expire` | POST | EventContract | `apps/api/app/api/eventcontract/expire/route.ts` |
| `/api/eventcontract/mark-viewed` | POST | EventContract | `apps/api/app/api/eventcontract/mark-viewed/route.ts` |
| `/api/eventcontract/send` | POST | EventContract | `apps/api/app/api/eventcontract/send/route.ts` |
| `/api/eventcontract/sign` | POST | EventContract | `apps/api/app/api/eventcontract/sign/route.ts` |
| `/api/eventcontract/soft-delete` | POST | EventContract | `apps/api/app/api/eventcontract/soft-delete/route.ts` |
| `/api/eventcontract/update` | POST | EventContract | `apps/api/app/api/eventcontract/update/route.ts` |

### battleboard

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/battleboard/add-dish` | POST | BattleBoard | `apps/api/app/api/battleboard/add-dish/route.ts` |
| `/api/battleboard/create` | POST | BattleBoard | `apps/api/app/api/battleboard/create/route.ts` |
| `/api/battleboard/finalize` | POST | BattleBoard | `apps/api/app/api/battleboard/finalize/route.ts` |
| `/api/battleboard/open` | POST | BattleBoard | `apps/api/app/api/battleboard/open/route.ts` |
| `/api/battleboard/remove-dish` | POST | BattleBoard | `apps/api/app/api/battleboard/remove-dish/route.ts` |
| `/api/battleboard/start-voting` | POST | BattleBoard | `apps/api/app/api/battleboard/start-voting/route.ts` |
| `/api/battleboard/vote` | POST | BattleBoard | `apps/api/app/api/battleboard/vote/route.ts` |

### inventoryitem

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/inventoryitem/adjust` | POST | InventoryItem | `apps/api/app/api/inventoryitem/adjust/route.ts` |
| `/api/inventoryitem/consume` | POST | InventoryItem | `apps/api/app/api/inventoryitem/consume/route.ts` |
| `/api/inventoryitem/create` | POST | InventoryItem | `apps/api/app/api/inventoryitem/create/route.ts` |
| `/api/inventoryitem/release-reservation` | POST | InventoryItem | `apps/api/app/api/inventoryitem/release-reservation/route.ts` |
| `/api/inventoryitem/reserve` | POST | InventoryItem | `apps/api/app/api/inventoryitem/reserve/route.ts` |
| `/api/inventoryitem/restock` | POST | InventoryItem | `apps/api/app/api/inventoryitem/restock/route.ts` |
| `/api/inventoryitem/waste` | POST | InventoryItem | `apps/api/app/api/inventoryitem/waste/route.ts` |

### proposal

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/proposal/accept` | POST | Proposal | `apps/api/app/api/proposal/accept/route.ts` |
| `/api/proposal/create` | POST | Proposal | `apps/api/app/api/proposal/create/route.ts` |
| `/api/proposal/mark-viewed` | POST | Proposal | `apps/api/app/api/proposal/mark-viewed/route.ts` |
| `/api/proposal/reject` | POST | Proposal | `apps/api/app/api/proposal/reject/route.ts` |
| `/api/proposal/send` | POST | Proposal | `apps/api/app/api/proposal/send/route.ts` |
| `/api/proposal/update` | POST | Proposal | `apps/api/app/api/proposal/update/route.ts` |
| `/api/proposal/withdraw` | POST | Proposal | `apps/api/app/api/proposal/withdraw/route.ts` |

### purchaseorder

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/purchaseorder/approve` | POST | PurchaseOrder | `apps/api/app/api/purchaseorder/approve/route.ts` |
| `/api/purchaseorder/cancel` | POST | PurchaseOrder | `apps/api/app/api/purchaseorder/cancel/route.ts` |
| `/api/purchaseorder/create` | POST | PurchaseOrder | `apps/api/app/api/purchaseorder/create/route.ts` |
| `/api/purchaseorder/mark-ordered` | POST | PurchaseOrder | `apps/api/app/api/purchaseorder/mark-ordered/route.ts` |
| `/api/purchaseorder/mark-received` | POST | PurchaseOrder | `apps/api/app/api/purchaseorder/mark-received/route.ts` |
| `/api/purchaseorder/reject` | POST | PurchaseOrder | `apps/api/app/api/purchaseorder/reject/route.ts` |
| `/api/purchaseorder/submit` | POST | PurchaseOrder | `apps/api/app/api/purchaseorder/submit/route.ts` |

### station

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/station/activate` | POST | Station | `apps/api/app/api/station/activate/route.ts` |
| `/api/station/assign-task` | POST | Station | `apps/api/app/api/station/assign-task/route.ts` |
| `/api/station/create` | POST | Station | `apps/api/app/api/station/create/route.ts` |
| `/api/station/deactivate` | POST | Station | `apps/api/app/api/station/deactivate/route.ts` |
| `/api/station/remove-task` | POST | Station | `apps/api/app/api/station/remove-task/route.ts` |
| `/api/station/update-capacity` | POST | Station | `apps/api/app/api/station/update-capacity/route.ts` |
| `/api/station/update-equipment` | POST | Station | `apps/api/app/api/station/update-equipment/route.ts` |

### cateringorder

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/cateringorder/cancel` | POST | CateringOrder | `apps/api/app/api/cateringorder/cancel/route.ts` |
| `/api/cateringorder/confirm` | POST | CateringOrder | `apps/api/app/api/cateringorder/confirm/route.ts` |
| `/api/cateringorder/create` | POST | CateringOrder | `apps/api/app/api/cateringorder/create/route.ts` |
| `/api/cateringorder/mark-complete` | POST | CateringOrder | `apps/api/app/api/cateringorder/mark-complete/route.ts` |
| `/api/cateringorder/start-prep` | POST | CateringOrder | `apps/api/app/api/cateringorder/start-prep/route.ts` |
| `/api/cateringorder/update` | POST | CateringOrder | `apps/api/app/api/cateringorder/update/route.ts` |

### knowledge-base

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/knowledge-base/entries/[slug]` | GET | KnowledgeBaseEntry | `apps/api/app/api/knowledge-base/entries/[slug]/route.ts` |
| `/api/knowledge-base/entries/commands/create` | POST | KnowledgeBaseEntry | `apps/api/app/api/knowledge-base/entries/commands/create/route.ts` |
| `/api/knowledge-base/entries/commands/delete` | POST | KnowledgeBaseEntry | `apps/api/app/api/knowledge-base/entries/commands/delete/route.ts` |
| `/api/knowledge-base/entries/commands/publish` | POST | KnowledgeBaseEntry | `apps/api/app/api/knowledge-base/entries/commands/publish/route.ts` |
| `/api/knowledge-base/entries/commands/update` | POST | KnowledgeBaseEntry | `apps/api/app/api/knowledge-base/entries/commands/update/route.ts` |
| `/api/knowledge-base/entries/list` | GET | KnowledgeBaseEntry | `apps/api/app/api/knowledge-base/entries/list/route.ts` |

### preplistitem

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/preplistitem/create` | POST | PrepListItem | `apps/api/app/api/preplistitem/create/route.ts` |
| `/api/preplistitem/mark-completed` | POST | PrepListItem | `apps/api/app/api/preplistitem/mark-completed/route.ts` |
| `/api/preplistitem/mark-uncompleted` | POST | PrepListItem | `apps/api/app/api/preplistitem/mark-uncompleted/route.ts` |
| `/api/preplistitem/update-prep-notes` | POST | PrepListItem | `apps/api/app/api/preplistitem/update-prep-notes/route.ts` |
| `/api/preplistitem/update-quantity` | POST | PrepListItem | `apps/api/app/api/preplistitem/update-quantity/route.ts` |
| `/api/preplistitem/update-station` | POST | PrepListItem | `apps/api/app/api/preplistitem/update-station/route.ts` |

### aieventsetupsession

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/aieventsetupsession/cancel` | POST | AiEventSetupSession (manifest) | `apps/api/app/api/aieventsetupsession/cancel/route.ts` |
| `/api/aieventsetupsession/confirm` | POST | AiEventSetupSession (manifest) | `apps/api/app/api/aieventsetupsession/confirm/route.ts` |
| `/api/aieventsetupsession/mark-created` | POST | AiEventSetupSession (manifest) | `apps/api/app/api/aieventsetupsession/mark-created/route.ts` |
| `/api/aieventsetupsession/parse` | POST | AiEventSetupSession (manifest) | `apps/api/app/api/aieventsetupsession/parse/route.ts` |
| `/api/aieventsetupsession/update-confidence` | POST | AiEventSetupSession (manifest) | `apps/api/app/api/aieventsetupsession/update-confidence/route.ts` |

### allergenwarning

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/allergenwarning/acknowledge` | POST | AllergenWarning | `apps/api/app/api/allergenwarning/acknowledge/route.ts` |
| `/api/allergenwarning/apply-override` | POST | AllergenWarning | `apps/api/app/api/allergenwarning/apply-override/route.ts` |
| `/api/allergenwarning/create` | POST | AllergenWarning | `apps/api/app/api/allergenwarning/create/route.ts` |
| `/api/allergenwarning/resolve` | POST | AllergenWarning | `apps/api/app/api/allergenwarning/resolve/route.ts` |
| `/api/allergenwarning/soft-delete` | POST | AllergenWarning | `apps/api/app/api/allergenwarning/soft-delete/route.ts` |

### analytics

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/analytics/events/profitability` | GET | Account | `apps/api/app/api/analytics/events/profitability/route.ts` |
| `/api/analytics/finance` | GET | BudgetAlert | `apps/api/app/api/analytics/finance/route.ts` |
| `/api/analytics/kitchen` | GET | AllergenWarning, WasteEntry | `apps/api/app/api/analytics/kitchen/route.ts` |
| `/api/analytics/staff/employees/[employeeId]` | GET | User | `apps/api/app/api/analytics/staff/employees/[employeeId]/route.ts` |
| `/api/analytics/staff/summary` | GET | - | `apps/api/app/api/analytics/staff/summary/route.ts` |

### apikey

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/apikey/create` | POST | ApiKey | `apps/api/app/api/apikey/create/route.ts` |
| `/api/apikey/record-usage` | POST | ApiKey | `apps/api/app/api/apikey/record-usage/route.ts` |
| `/api/apikey/revoke` | POST | ApiKey | `apps/api/app/api/apikey/revoke/route.ts` |
| `/api/apikey/soft-delete` | POST | ApiKey | `apps/api/app/api/apikey/soft-delete/route.ts` |
| `/api/apikey/update` | POST | ApiKey | `apps/api/app/api/apikey/update/route.ts` |

### commandboardcard

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/commandboardcard/create` | POST | CommandBoardCard | `apps/api/app/api/commandboardcard/create/route.ts` |
| `/api/commandboardcard/move` | POST | CommandBoardCard | `apps/api/app/api/commandboardcard/move/route.ts` |
| `/api/commandboardcard/remove` | POST | CommandBoardCard | `apps/api/app/api/commandboardcard/remove/route.ts` |
| `/api/commandboardcard/resize` | POST | CommandBoardCard | `apps/api/app/api/commandboardcard/resize/route.ts` |
| `/api/commandboardcard/update` | POST | CommandBoardCard | `apps/api/app/api/commandboardcard/update/route.ts` |

### cron

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/cron/contract-expiration-alerts` | POST | EmailWorkflow, EventContract | `apps/api/app/api/cron/contract-expiration-alerts/route.ts` |
| `/api/cron/email-reminders` | POST | EmailWorkflow, KitchenTask, KitchenTaskClaim, Location, ScheduleShift, User | `apps/api/app/api/cron/email-reminders/route.ts` |
| `/api/cron/idempotency-cleanup` | GET | ManifestIdempotency | `apps/api/app/api/cron/idempotency-cleanup/route.ts` |
| `/api/cron/inventory-audit` | GET | AuditSchedule, CycleCountSession, Location, User | `apps/api/app/api/cron/inventory-audit/route.ts` |
| `/api/cron/webhook-retry` | GET | OutboundWebhook, WebhookDeadLetterQueue, WebhookDeliveryLog | `apps/api/app/api/cron/webhook-retry/route.ts` |

### cyclecountsession

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/cyclecountsession/cancel` | POST | CycleCountSession | `apps/api/app/api/cyclecountsession/cancel/route.ts` |
| `/api/cyclecountsession/complete` | POST | CycleCountSession | `apps/api/app/api/cyclecountsession/complete/route.ts` |
| `/api/cyclecountsession/create` | POST | CycleCountSession | `apps/api/app/api/cyclecountsession/create/route.ts` |
| `/api/cyclecountsession/finalize` | POST | CycleCountSession | `apps/api/app/api/cyclecountsession/finalize/route.ts` |
| `/api/cyclecountsession/start` | POST | CycleCountSession | `apps/api/app/api/cyclecountsession/start/route.ts` |

### dish

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/dish/create` | POST | Dish | `apps/api/app/api/dish/create/route.ts` |
| `/api/dish/deactivate` | POST | Dish | `apps/api/app/api/dish/deactivate/route.ts` |
| `/api/dish/update` | POST | Dish | `apps/api/app/api/dish/update/route.ts` |
| `/api/dish/update-lead-time` | POST | Dish | `apps/api/app/api/dish/update-lead-time/route.ts` |
| `/api/dish/update-pricing` | POST | Dish | `apps/api/app/api/dish/update-pricing/route.ts` |

### ingredient

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/ingredient/create` | POST | Ingredient | `apps/api/app/api/ingredient/create/route.ts` |
| `/api/ingredient/deactivate` | POST | Ingredient | `apps/api/app/api/ingredient/deactivate/route.ts` |
| `/api/ingredient/update` | POST | Ingredient | `apps/api/app/api/ingredient/update/route.ts` |
| `/api/ingredient/update-allergens` | POST | Ingredient | `apps/api/app/api/ingredient/update-allergens/route.ts` |
| `/api/ingredient/update-shelf-life` | POST | Ingredient | `apps/api/app/api/ingredient/update-shelf-life/route.ts` |

### lead

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/lead/archive` | POST | Lead | `apps/api/app/api/lead/archive/route.ts` |
| `/api/lead/convert-to-client` | POST | Lead | `apps/api/app/api/lead/convert-to-client/route.ts` |
| `/api/lead/create` | POST | Lead | `apps/api/app/api/lead/create/route.ts` |
| `/api/lead/disqualify` | POST | Lead | `apps/api/app/api/lead/disqualify/route.ts` |
| `/api/lead/update` | POST | Lead | `apps/api/app/api/lead/update/route.ts` |

### smsautomationrule

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/smsautomationrule/activate` | POST | SmsAutomationRule (manifest) | `apps/api/app/api/smsautomationrule/activate/route.ts` |
| `/api/smsautomationrule/create` | POST | SmsAutomationRule (manifest) | `apps/api/app/api/smsautomationrule/create/route.ts` |
| `/api/smsautomationrule/deactivate` | POST | SmsAutomationRule (manifest) | `apps/api/app/api/smsautomationrule/deactivate/route.ts` |
| `/api/smsautomationrule/soft-delete` | POST | SmsAutomationRule (manifest) | `apps/api/app/api/smsautomationrule/soft-delete/route.ts` |
| `/api/smsautomationrule/update` | POST | SmsAutomationRule (manifest) | `apps/api/app/api/smsautomationrule/update/route.ts` |

### timeoffrequest

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/timeoffrequest/approve` | POST | TimeOffRequest (manifest) | `apps/api/app/api/timeoffrequest/approve/route.ts` |
| `/api/timeoffrequest/cancel` | POST | TimeOffRequest (manifest) | `apps/api/app/api/timeoffrequest/cancel/route.ts` |
| `/api/timeoffrequest/create` | POST | TimeOffRequest (manifest) | `apps/api/app/api/timeoffrequest/create/route.ts` |
| `/api/timeoffrequest/reject` | POST | TimeOffRequest (manifest) | `apps/api/app/api/timeoffrequest/reject/route.ts` |
| `/api/timeoffrequest/soft-delete` | POST | TimeOffRequest (manifest) | `apps/api/app/api/timeoffrequest/soft-delete/route.ts` |

### user

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/user/create` | POST | User | `apps/api/app/api/user/create/route.ts` |
| `/api/user/deactivate` | POST | User | `apps/api/app/api/user/deactivate/route.ts` |
| `/api/user/terminate` | POST | User | `apps/api/app/api/user/terminate/route.ts` |
| `/api/user/update` | POST | User | `apps/api/app/api/user/update/route.ts` |
| `/api/user/update-role` | POST | User | `apps/api/app/api/user/update-role/route.ts` |

### client

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/client/archive` | POST | Client | `apps/api/app/api/client/archive/route.ts` |
| `/api/client/create` | POST | Client | `apps/api/app/api/client/create/route.ts` |
| `/api/client/reactivate` | POST | Client | `apps/api/app/api/client/reactivate/route.ts` |
| `/api/client/update` | POST | Client | `apps/api/app/api/client/update/route.ts` |

### clientcontact

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/clientcontact/create` | POST | ClientContact | `apps/api/app/api/clientcontact/create/route.ts` |
| `/api/clientcontact/remove` | POST | ClientContact | `apps/api/app/api/clientcontact/remove/route.ts` |
| `/api/clientcontact/set-primary` | POST | ClientContact | `apps/api/app/api/clientcontact/set-primary/route.ts` |
| `/api/clientcontact/update` | POST | ClientContact | `apps/api/app/api/clientcontact/update/route.ts` |

### commandboard

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/commandboard/activate` | POST | CommandBoard | `apps/api/app/api/commandboard/activate/route.ts` |
| `/api/commandboard/create` | POST | CommandBoard | `apps/api/app/api/commandboard/create/route.ts` |
| `/api/commandboard/deactivate` | POST | CommandBoard | `apps/api/app/api/commandboard/deactivate/route.ts` |
| `/api/commandboard/update` | POST | CommandBoard | `apps/api/app/api/commandboard/update/route.ts` |

### cyclecountrecord

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/cyclecountrecord/create` | POST | CycleCountRecord | `apps/api/app/api/cyclecountrecord/create/route.ts` |
| `/api/cyclecountrecord/remove` | POST | CycleCountRecord | `apps/api/app/api/cyclecountrecord/remove/route.ts` |
| `/api/cyclecountrecord/update` | POST | CycleCountRecord | `apps/api/app/api/cyclecountrecord/update/route.ts` |
| `/api/cyclecountrecord/verify` | POST | CycleCountRecord | `apps/api/app/api/cyclecountrecord/verify/route.ts` |

### eventbudget

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/eventbudget/approve` | POST | EventBudget | `apps/api/app/api/eventbudget/approve/route.ts` |
| `/api/eventbudget/create` | POST | EventBudget | `apps/api/app/api/eventbudget/create/route.ts` |
| `/api/eventbudget/finalize` | POST | EventBudget | `apps/api/app/api/eventbudget/finalize/route.ts` |
| `/api/eventbudget/update` | POST | EventBudget | `apps/api/app/api/eventbudget/update/route.ts` |

### eventreport

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/eventreport/approve` | POST | EventReport | `apps/api/app/api/eventreport/approve/route.ts` |
| `/api/eventreport/complete` | POST | EventReport | `apps/api/app/api/eventreport/complete/route.ts` |
| `/api/eventreport/create` | POST | EventReport | `apps/api/app/api/eventreport/create/route.ts` |
| `/api/eventreport/submit` | POST | EventReport | `apps/api/app/api/eventreport/submit/route.ts` |

### menu

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/menu/activate` | POST | Menu | `apps/api/app/api/menu/activate/route.ts` |
| `/api/menu/create` | POST | Menu | `apps/api/app/api/menu/create/route.ts` |
| `/api/menu/deactivate` | POST | Menu | `apps/api/app/api/menu/deactivate/route.ts` |
| `/api/menu/update` | POST | Menu | `apps/api/app/api/menu/update/route.ts` |

### notification

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/notification/create` | POST | Notification | `apps/api/app/api/notification/create/route.ts` |
| `/api/notification/mark-dismissed` | POST | Notification | `apps/api/app/api/notification/mark-dismissed/route.ts` |
| `/api/notification/mark-read` | POST | Notification | `apps/api/app/api/notification/mark-read/route.ts` |
| `/api/notification/remove` | POST | Notification | `apps/api/app/api/notification/remove/route.ts` |

### prepcomment

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/prepcomment/create` | POST | PrepComment | `apps/api/app/api/prepcomment/create/route.ts` |
| `/api/prepcomment/resolve` | POST | PrepComment | `apps/api/app/api/prepcomment/resolve/route.ts` |
| `/api/prepcomment/soft-delete` | POST | PrepComment | `apps/api/app/api/prepcomment/soft-delete/route.ts` |
| `/api/prepcomment/unresolve` | POST | PrepComment | `apps/api/app/api/prepcomment/unresolve/route.ts` |

### public

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/public/contracts/[token]` | GET | Account, ContractSignature, Event, EventContract | `apps/api/app/api/public/contracts/[token]/route.ts` |
| `/api/public/contracts/[token]/sign` | POST | ContractSignature, EventContract | `apps/api/app/api/public/contracts/[token]/sign/route.ts` |
| `/api/public/proposals/[token]/respond` | POST | Proposal | `apps/api/app/api/public/proposals/[token]/respond/route.ts` |
| `/api/public/proposals/[token]` | GET | Account, Proposal, ProposalLineItem | `apps/api/app/api/public/proposals/[token]/route.ts` |

### recipe

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/recipe/activate` | POST | Recipe | `apps/api/app/api/recipe/activate/route.ts` |
| `/api/recipe/create` | POST | Recipe | `apps/api/app/api/recipe/create/route.ts` |
| `/api/recipe/deactivate` | POST | Recipe | `apps/api/app/api/recipe/deactivate/route.ts` |
| `/api/recipe/update` | POST | Recipe | `apps/api/app/api/recipe/update/route.ts` |

### recipeingredient

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/recipeingredient/create` | POST | RecipeIngredient | `apps/api/app/api/recipeingredient/create/route.ts` |
| `/api/recipeingredient/remove` | POST | RecipeIngredient | `apps/api/app/api/recipeingredient/remove/route.ts` |
| `/api/recipeingredient/update-quantity` | POST | RecipeIngredient | `apps/api/app/api/recipeingredient/update-quantity/route.ts` |
| `/api/recipeingredient/update-waste-factor` | POST | RecipeIngredient | `apps/api/app/api/recipeingredient/update-waste-factor/route.ts` |

### schedule

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/schedule/close` | POST | Schedule | `apps/api/app/api/schedule/close/route.ts` |
| `/api/schedule/create` | POST | Schedule | `apps/api/app/api/schedule/create/route.ts` |
| `/api/schedule/release` | POST | Schedule | `apps/api/app/api/schedule/release/route.ts` |
| `/api/schedule/update` | POST | Schedule | `apps/api/app/api/schedule/update/route.ts` |

### timeentry

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/timeentry/add-entry` | POST | TimeEntry | `apps/api/app/api/timeentry/add-entry/route.ts` |
| `/api/timeentry/clock-in` | POST | TimeEntry | `apps/api/app/api/timeentry/clock-in/route.ts` |
| `/api/timeentry/clock-out` | POST | TimeEntry | `apps/api/app/api/timeentry/clock-out/route.ts` |
| `/api/timeentry/soft-delete` | POST | TimeEntry | `apps/api/app/api/timeentry/soft-delete/route.ts` |

### workflow

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/workflow/activate` | POST | Workflow | `apps/api/app/api/workflow/activate/route.ts` |
| `/api/workflow/create` | POST | Workflow | `apps/api/app/api/workflow/create/route.ts` |
| `/api/workflow/deactivate` | POST | Workflow | `apps/api/app/api/workflow/deactivate/route.ts` |
| `/api/workflow/update` | POST | Workflow | `apps/api/app/api/workflow/update/route.ts` |

### workforceoptimization

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/workforceoptimization/complete` | POST | WorkforceOptimization (manifest) | `apps/api/app/api/workforceoptimization/complete/route.ts` |
| `/api/workforceoptimization/create` | POST | WorkforceOptimization (manifest) | `apps/api/app/api/workforceoptimization/create/route.ts` |
| `/api/workforceoptimization/fail` | POST | WorkforceOptimization (manifest) | `apps/api/app/api/workforceoptimization/fail/route.ts` |
| `/api/workforceoptimization/start` | POST | WorkforceOptimization (manifest) | `apps/api/app/api/workforceoptimization/start/route.ts` |

### adminchatparticipant

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/adminchatparticipant/archive` | POST | AdminChatParticipant | `apps/api/app/api/adminchatparticipant/archive/route.ts` |
| `/api/adminchatparticipant/clear-history` | POST | AdminChatParticipant | `apps/api/app/api/adminchatparticipant/clear-history/route.ts` |
| `/api/adminchatparticipant/unarchive` | POST | AdminChatParticipant | `apps/api/app/api/adminchatparticipant/unarchive/route.ts` |

### alertsconfig

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/alertsconfig/create` | POST | AlertsConfig | `apps/api/app/api/alertsconfig/create/route.ts` |
| `/api/alertsconfig/remove` | POST | AlertsConfig | `apps/api/app/api/alertsconfig/remove/route.ts` |
| `/api/alertsconfig/update` | POST | AlertsConfig | `apps/api/app/api/alertsconfig/update/route.ts` |

### budgetlineitem

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/budgetlineitem/create` | POST | BudgetLineItem | `apps/api/app/api/budgetlineitem/create/route.ts` |
| `/api/budgetlineitem/remove` | POST | BudgetLineItem | `apps/api/app/api/budgetlineitem/remove/route.ts` |
| `/api/budgetlineitem/update` | POST | BudgetLineItem | `apps/api/app/api/budgetlineitem/update/route.ts` |

### bulkorderrule

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/bulkorderrule/create` | POST | BulkOrderRule | `apps/api/app/api/bulkorderrule/create/route.ts` |
| `/api/bulkorderrule/soft-delete` | POST | BulkOrderRule | `apps/api/app/api/bulkorderrule/soft-delete/route.ts` |
| `/api/bulkorderrule/update` | POST | BulkOrderRule | `apps/api/app/api/bulkorderrule/update/route.ts` |

### chartofaccount

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/chartofaccount/create` | POST | ChartOfAccount | `apps/api/app/api/chartofaccount/create/route.ts` |
| `/api/chartofaccount/deactivate` | POST | ChartOfAccount | `apps/api/app/api/chartofaccount/deactivate/route.ts` |
| `/api/chartofaccount/update` | POST | ChartOfAccount | `apps/api/app/api/chartofaccount/update/route.ts` |

### clientinteraction

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/clientinteraction/complete` | POST | ClientInteraction | `apps/api/app/api/clientinteraction/complete/route.ts` |
| `/api/clientinteraction/create` | POST | ClientInteraction | `apps/api/app/api/clientinteraction/create/route.ts` |
| `/api/clientinteraction/update` | POST | ClientInteraction | `apps/api/app/api/clientinteraction/update/route.ts` |

### clientpreference

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/clientpreference/create` | POST | ClientPreference | `apps/api/app/api/clientpreference/create/route.ts` |
| `/api/clientpreference/remove` | POST | ClientPreference | `apps/api/app/api/clientpreference/remove/route.ts` |
| `/api/clientpreference/update` | POST | ClientPreference | `apps/api/app/api/clientpreference/update/route.ts` |

### commandboardgroup

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/commandboardgroup/create` | POST | CommandBoardGroup | `apps/api/app/api/commandboardgroup/create/route.ts` |
| `/api/commandboardgroup/remove` | POST | CommandBoardGroup | `apps/api/app/api/commandboardgroup/remove/route.ts` |
| `/api/commandboardgroup/update` | POST | CommandBoardGroup | `apps/api/app/api/commandboardgroup/update/route.ts` |

### commandboardlayout

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/commandboardlayout/create` | POST | CommandBoardLayout | `apps/api/app/api/commandboardlayout/create/route.ts` |
| `/api/commandboardlayout/remove` | POST | CommandBoardLayout | `apps/api/app/api/commandboardlayout/remove/route.ts` |
| `/api/commandboardlayout/update` | POST | CommandBoardLayout | `apps/api/app/api/commandboardlayout/update/route.ts` |

### container

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/container/create` | POST | Container | `apps/api/app/api/container/create/route.ts` |
| `/api/container/deactivate` | POST | Container | `apps/api/app/api/container/deactivate/route.ts` |
| `/api/container/update` | POST | Container | `apps/api/app/api/container/update/route.ts` |

### documents

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/documents/versions/commands/create` | POST | DocumentVersion | `apps/api/app/api/documents/versions/commands/create/route.ts` |
| `/api/documents/versions/commands/restore` | POST | DocumentVersion | `apps/api/app/api/documents/versions/commands/restore/route.ts` |
| `/api/documents/versions/list` | GET | DocumentVersion | `apps/api/app/api/documents/versions/list/route.ts` |

### emailtemplate

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/emailtemplate/create` | POST | EmailTemplate (manifest) | `apps/api/app/api/emailtemplate/create/route.ts` |
| `/api/emailtemplate/soft-delete` | POST | EmailTemplate (manifest) | `apps/api/app/api/emailtemplate/soft-delete/route.ts` |
| `/api/emailtemplate/update` | POST | EmailTemplate (manifest) | `apps/api/app/api/emailtemplate/update/route.ts` |

### emailworkflow

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/emailworkflow/create` | POST | EmailWorkflow | `apps/api/app/api/emailworkflow/create/route.ts` |
| `/api/emailworkflow/soft-delete` | POST | EmailWorkflow | `apps/api/app/api/emailworkflow/soft-delete/route.ts` |
| `/api/emailworkflow/update` | POST | EmailWorkflow | `apps/api/app/api/emailworkflow/update/route.ts` |

### employeeavailability

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/employeeavailability/create` | POST | employee_availability | `apps/api/app/api/employeeavailability/create/route.ts` |
| `/api/employeeavailability/soft-delete` | POST | employee_availability | `apps/api/app/api/employeeavailability/soft-delete/route.ts` |
| `/api/employeeavailability/update` | POST | employee_availability | `apps/api/app/api/employeeavailability/update/route.ts` |

### employeecertification

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/employeecertification/create` | POST | EmployeeCertification (manifest) | `apps/api/app/api/employeecertification/create/route.ts` |
| `/api/employeecertification/soft-delete` | POST | EmployeeCertification (manifest) | `apps/api/app/api/employeecertification/soft-delete/route.ts` |
| `/api/employeecertification/update` | POST | EmployeeCertification (manifest) | `apps/api/app/api/employeecertification/update/route.ts` |

### eventguest

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/eventguest/create` | POST | EventGuest | `apps/api/app/api/eventguest/create/route.ts` |
| `/api/eventguest/soft-delete` | POST | EventGuest | `apps/api/app/api/eventguest/soft-delete/route.ts` |
| `/api/eventguest/update` | POST | EventGuest | `apps/api/app/api/eventguest/update/route.ts` |

### eventprofitability

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/eventprofitability/create` | POST | EventProfitability | `apps/api/app/api/eventprofitability/create/route.ts` |
| `/api/eventprofitability/recalculate` | POST | EventProfitability | `apps/api/app/api/eventprofitability/recalculate/route.ts` |
| `/api/eventprofitability/update` | POST | EventProfitability | `apps/api/app/api/eventprofitability/update/route.ts` |

### eventsummary

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/eventsummary/create` | POST | EventSummary | `apps/api/app/api/eventsummary/create/route.ts` |
| `/api/eventsummary/refresh` | POST | EventSummary | `apps/api/app/api/eventsummary/refresh/route.ts` |
| `/api/eventsummary/update` | POST | EventSummary | `apps/api/app/api/eventsummary/update/route.ts` |

### inventorysupplier

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/inventorysupplier/create` | POST | InventorySupplier | `apps/api/app/api/inventorysupplier/create/route.ts` |
| `/api/inventorysupplier/deactivate` | POST | InventorySupplier | `apps/api/app/api/inventorysupplier/deactivate/route.ts` |
| `/api/inventorysupplier/update` | POST | InventorySupplier | `apps/api/app/api/inventorysupplier/update/route.ts` |

### laborbudget

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/laborbudget/create` | POST | LaborBudget | `apps/api/app/api/laborbudget/create/route.ts` |
| `/api/laborbudget/soft-delete` | POST | LaborBudget | `apps/api/app/api/laborbudget/soft-delete/route.ts` |
| `/api/laborbudget/update` | POST | LaborBudget | `apps/api/app/api/laborbudget/update/route.ts` |

### menudish

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/menudish/create` | POST | MenuDish | `apps/api/app/api/menudish/create/route.ts` |
| `/api/menudish/remove` | POST | MenuDish | `apps/api/app/api/menudish/remove/route.ts` |
| `/api/menudish/update-course` | POST | MenuDish | `apps/api/app/api/menudish/update-course/route.ts` |

### prepmethod

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/prepmethod/create` | POST | PrepMethod | `apps/api/app/api/prepmethod/create/route.ts` |
| `/api/prepmethod/deactivate` | POST | PrepMethod | `apps/api/app/api/prepmethod/deactivate/route.ts` |
| `/api/prepmethod/update` | POST | PrepMethod | `apps/api/app/api/prepmethod/update/route.ts` |

### pricingtier

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/pricingtier/create` | POST | PricingTier | `apps/api/app/api/pricingtier/create/route.ts` |
| `/api/pricingtier/soft-delete` | POST | PricingTier | `apps/api/app/api/pricingtier/soft-delete/route.ts` |
| `/api/pricingtier/update` | POST | PricingTier | `apps/api/app/api/pricingtier/update/route.ts` |

### proposallineitem

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/proposallineitem/create` | POST | ProposalLineItem | `apps/api/app/api/proposallineitem/create/route.ts` |
| `/api/proposallineitem/remove` | POST | ProposalLineItem | `apps/api/app/api/proposallineitem/remove/route.ts` |
| `/api/proposallineitem/update` | POST | ProposalLineItem | `apps/api/app/api/proposallineitem/update/route.ts` |

### purchaseorderitem

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/purchaseorderitem/create` | POST | PurchaseOrderItem | `apps/api/app/api/purchaseorderitem/create/route.ts` |
| `/api/purchaseorderitem/remove` | POST | PurchaseOrderItem | `apps/api/app/api/purchaseorderitem/remove/route.ts` |
| `/api/purchaseorderitem/update` | POST | PurchaseOrderItem | `apps/api/app/api/purchaseorderitem/update/route.ts` |

### recipestep

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/recipestep/create` | POST | RecipeStep (manifest) | `apps/api/app/api/recipestep/create/route.ts` |
| `/api/recipestep/remove` | POST | RecipeStep (manifest) | `apps/api/app/api/recipestep/remove/route.ts` |
| `/api/recipestep/update-instruction` | POST | RecipeStep (manifest) | `apps/api/app/api/recipestep/update-instruction/route.ts` |

### recipeversion

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/recipeversion/create` | POST | RecipeVersion | `apps/api/app/api/recipeversion/create/route.ts` |
| `/api/recipeversion/restore` | POST | RecipeVersion | `apps/api/app/api/recipeversion/restore/route.ts` |
| `/api/recipeversion/update-costs` | POST | RecipeVersion | `apps/api/app/api/recipeversion/update-costs/route.ts` |

### sampledata

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/sampledata/clear` | POST | SampleData (manifest) | `apps/api/app/api/sampledata/clear/route.ts` |
| `/api/sampledata/reseed` | POST | SampleData (manifest) | `apps/api/app/api/sampledata/reseed/route.ts` |
| `/api/sampledata/seed` | POST | SampleData (manifest) | `apps/api/app/api/sampledata/seed/route.ts` |

### scheduleshift

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/scheduleshift/create` | POST | ScheduleShift | `apps/api/app/api/scheduleshift/create/route.ts` |
| `/api/scheduleshift/remove` | POST | ScheduleShift | `apps/api/app/api/scheduleshift/remove/route.ts` |
| `/api/scheduleshift/update` | POST | ScheduleShift | `apps/api/app/api/scheduleshift/update/route.ts` |

### timecardeditrequest

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/timecardeditrequest/approve` | POST | TimecardEditRequest | `apps/api/app/api/timecardeditrequest/approve/route.ts` |
| `/api/timecardeditrequest/create` | POST | TimecardEditRequest | `apps/api/app/api/timecardeditrequest/create/route.ts` |
| `/api/timecardeditrequest/reject` | POST | TimecardEditRequest | `apps/api/app/api/timecardeditrequest/reject/route.ts` |

### trainingmodule

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/trainingmodule/create` | POST | TrainingModule | `apps/api/app/api/trainingmodule/create/route.ts` |
| `/api/trainingmodule/soft-delete` | POST | TrainingModule | `apps/api/app/api/trainingmodule/soft-delete/route.ts` |
| `/api/trainingmodule/update` | POST | TrainingModule | `apps/api/app/api/trainingmodule/update/route.ts` |

### variancereport

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/variancereport/approve` | POST | VarianceReport | `apps/api/app/api/variancereport/approve/route.ts` |
| `/api/variancereport/create` | POST | VarianceReport | `apps/api/app/api/variancereport/create/route.ts` |
| `/api/variancereport/review` | POST | VarianceReport | `apps/api/app/api/variancereport/review/route.ts` |

### vendorcatalog

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/vendorcatalog/create` | POST | VendorCatalog | `apps/api/app/api/vendorcatalog/create/route.ts` |
| `/api/vendorcatalog/soft-delete` | POST | VendorCatalog | `apps/api/app/api/vendorcatalog/soft-delete/route.ts` |
| `/api/vendorcatalog/update` | POST | VendorCatalog | `apps/api/app/api/vendorcatalog/update/route.ts` |

### wasteentry

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/wasteentry/create` | POST | WasteEntry | `apps/api/app/api/wasteentry/create/route.ts` |
| `/api/wasteentry/soft-delete` | POST | WasteEntry | `apps/api/app/api/wasteentry/soft-delete/route.ts` |
| `/api/wasteentry/update` | POST | WasteEntry | `apps/api/app/api/wasteentry/update/route.ts` |

### activity-feed

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/activity-feed/list` | GET | ActivityFeed | `apps/api/app/api/activity-feed/list/route.ts` |
| `/api/activity-feed/stats` | GET | - | `apps/api/app/api/activity-feed/stats/route.ts` |

### ai

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/ai/suggestions` | GET | Dish, Event, EventStaffAssignment, InventoryAlert, InventoryItem, PrepTask | `apps/api/app/api/ai/suggestions/route.ts` |
| `/api/ai/summaries/[eventId]` | - | AllergenWarning, Dish, Event, EventStaffAssignment | `apps/api/app/api/ai/summaries/[eventId]/route.ts` |

### budgetalert

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/budgetalert/acknowledge` | POST | BudgetAlert | `apps/api/app/api/budgetalert/acknowledge/route.ts` |
| `/api/budgetalert/resolve` | POST | BudgetAlert | `apps/api/app/api/budgetalert/resolve/route.ts` |

### commandboardconnection

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/commandboardconnection/create` | POST | CommandBoardConnection | `apps/api/app/api/commandboardconnection/create/route.ts` |
| `/api/commandboardconnection/remove` | POST | CommandBoardConnection | `apps/api/app/api/commandboardconnection/remove/route.ts` |

### contractsignature

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/contractsignature/create` | POST | ContractSignature | `apps/api/app/api/contractsignature/create/route.ts` |
| `/api/contractsignature/soft-delete` | POST | ContractSignature | `apps/api/app/api/contractsignature/soft-delete/route.ts` |

### eventdish

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/eventdish/create` | POST | EventDish (manifest) | `apps/api/app/api/eventdish/create/route.ts` |
| `/api/eventdish/remove` | POST | EventDish (manifest) | `apps/api/app/api/eventdish/remove/route.ts` |

### eventstaff

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/eventstaff/assign` | POST | EventStaff (manifest) | `apps/api/app/api/eventstaff/assign/route.ts` |
| `/api/eventstaff/unassign` | POST | EventStaff (manifest) | `apps/api/app/api/eventstaff/unassign/route.ts` |

### overrideaudit

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/overrideaudit/authorize` | POST | OverrideAudit | `apps/api/app/api/overrideaudit/authorize/route.ts` |
| `/api/overrideaudit/create` | POST | OverrideAudit | `apps/api/app/api/overrideaudit/create/route.ts` |

### staffing

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/staffing/coverage` | GET | - | `apps/api/app/api/staffing/coverage/route.ts` |
| `/api/staffing/recommendations` | GET, POST | - | `apps/api/app/api/staffing/recommendations/route.ts` |

### trainingassignment

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/trainingassignment/create` | POST | TrainingAssignment | `apps/api/app/api/trainingassignment/create/route.ts` |
| `/api/trainingassignment/soft-delete` | POST | TrainingAssignment | `apps/api/app/api/trainingassignment/soft-delete/route.ts` |

### ai-event-setup

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/ai-event-setup/parse` | POST | - | `apps/api/app/api/ai-event-setup/parse/route.ts` |

### conflicts

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/conflicts/detect` | POST | InventoryAlert, InventoryItem, PrepTask | `apps/api/app/api/conflicts/detect/route.ts` |

### employeededuction

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/employeededuction/create` | POST | EmployeeDeduction | `apps/api/app/api/employeededuction/create/route.ts` |

### health

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/health/sentry-canary` | - | - | `apps/api/app/api/health/sentry-canary/route.ts` |

### inventorytransaction

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/inventorytransaction/create` | POST | InventoryTransaction | `apps/api/app/api/inventorytransaction/create/route.ts` |

### locations

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/locations` | GET | - | `apps/api/app/api/locations/route.ts` |

### payrollapprovalhistory

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/payrollapprovalhistory/create` | POST | PayrollApprovalHistory (manifest) | `apps/api/app/api/payrollapprovalhistory/create/route.ts` |

### payrollperiod

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/payrollperiod/create` | POST | PayrollPeriod (manifest) | `apps/api/app/api/payrollperiod/create/route.ts` |

### payrollrun

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/payrollrun/update-status` | POST | PayrollRun (manifest) | `apps/api/app/api/payrollrun/update-status/route.ts` |

### performanceprediction

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/performanceprediction/create` | POST | PerformancePrediction (manifest) | `apps/api/app/api/performanceprediction/create/route.ts` |

### sales-reporting

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/sales-reporting/generate` | - | - | `apps/api/app/api/sales-reporting/generate/route.ts` |

### search

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/search` | GET | Client, ClientContact, Event, InventoryItem, KnowledgeBaseEntry, Venue | `apps/api/app/api/search/route.ts` |

### sentry-fixer

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/sentry-fixer/process` | - | - | `apps/api/app/api/sentry-fixer/process/route.ts` |

### user-preferences

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/user-preferences` | GET, POST | - | `apps/api/app/api/user-preferences/route.ts` |

### webhooks

| Route | Methods | Touched models/tables | Source file |
|---|---|---|---|
| `/api/webhooks/supplier-catalog` | GET, POST | InventorySupplier, VendorCatalog | `apps/api/app/api/webhooks/supplier-catalog/route.ts` |
