# Persistence Intent Audit

**Date:** 2026-05-24 | **Branch:** probe/full-durable-projection
**Total skipped entities:** 127

## Summary

- **DURABLE_REQUIRED:** 111 — must persist to DB
- **TRANSIENT_OK:** 5 — acceptable as memory/no-store
- **UNKNOWN_REVIEW:** 11 — needs product owner decision

## Flagged Entities

| Entity | Classification | Store | Impact |
|---|---|---|---|
| AiEventSetupSession | TRANSIENT_OK | `none` | AI parsing session — wizard/scratchpad state. In-flight AI e |
| CateringOrder | DURABLE_REQUIRED | `none` | Customer order with line items, payments, delivery. Hard bus |
| Schedule | DURABLE_REQUIRED | `none` | Staff schedule. Operational execution. |
| ScheduleShift | DURABLE_REQUIRED | `none` | Schedule shift. Operational execution. |

## DURABLE_REQUIRED (111)

| Entity | File | Store | Skip | Props | Cmds | Reason |
|---|---|---|---|---|---|---|
| AdminTask | `admin-task-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 13 | 8 | Admin task. Work management. |
| AlertsConfig | `alerts-config-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 4 | 3 | Alert configuration. System config. |
| AllergenWarning | `allergen-warning-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 18 | 5 | Allergen alert. Safety record. |
| ApiKey | `api-key-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 13 | 5 | API key. Security credential. |
| BankAccount | `bank-account-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 13 | 5 | Bank account. Financial record. |
| BattleBoard | `battle-board-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 19 | 7 | Event battle board (menu comparison). Planning artifact. |
| Budget | `budget-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 13 | 4 | Budget entity. Financial planning. |
| BudgetAlert | `labor-budget-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 11 | 2 | Budget threshold alert config. |
| BudgetLineItem | `event-budget-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 14 | 3 | Budget detail line. |
| BulkOrderRule | `bulk-order-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 18 | 3 | Bulk ordering rules. Business config. |
| CateringOrder | `catering-order-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 33 | 6 | Customer order with line items, payments, delivery. Hard business reco... |
| ChartOfAccount | `chart-of-account-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 10 | 3 | Chart of accounts. Financial config. |
| Client | `client-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 26 | 4 | Customer account. Core CRM entity. |
| ClientContact | `client-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 15 | 4 | Customer contact person. Core CRM. |
| ClientInteraction | `client-interaction-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 15 | 3 | Interaction log (call, email, meeting). Audit trail. |
| ClientPreference | `client-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 10 | 3 | Customer preferences. Must persist for service delivery. |
| CollectionAction | `collections-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 21 | 4 | Collection action. Audit trail. |
| CollectionCase | `collections-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 34 | 18 | Collection case. Financial/legal. |
| CollectionPaymentPlan | `collections-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 18 | 5 | Payment plan. Financial obligation. |
| Container | `container-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 14 | 3 | Food container tracking. Inventory asset. |
| ContractSignature | `event-contract-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 11 | 2 | Contract signature. Legal audit trail. |
| CycleCountRecord | `cycle-count-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 23 | 4 | Individual count record. Audit trail. |
| CycleCountSession | `cycle-count-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 21 | 5 | Inventory count session. Audit record. |
| Deal | `deal-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 15 | 2 | Deal/opportunity. Revenue pipeline. |
| Dish | `dish-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 20 | 5 | Dish/menu item definition. Core product catalog. |
| DocumentVersion | `document-version-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 9 | 2 | Document versioning. Audit trail. |
| Driver | `logistics-all-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 14 | 3 | Driver record. Logistics. |
| EmailTemplate | `email-template-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 12 | 3 | Email template. Communication config. |
| EmailWorkflow | `email-workflow-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 11 | 3 | Email workflow config. |
| EmployeeAvailability | `employee-availability-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 12 | 3 | Employee availability. Scheduling. |
| EmployeeCertification | `employee-certification-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 11 | 3 | Certification. Compliance. |
| EmployeeDeduction | `payroll-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 14 | 1 | Payroll deduction. Financial. |
| EntityVersion | `version-control-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 14 | 4 | Entity version record. |
| Equipment | `equipment-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 21 | 7 | Equipment asset. |
| Event | `event-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 25 | 10 | Core event entity. The primary product. |
| EventBudget | `event-budget-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 13 | 4 | Event financial plan. |
| EventContract | `event-contract-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 14 | 8 | Event legal contract. Must persist. |
| EventDish | `event-dish-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 11 | 2 | Event menu item assignment. |
| EventGuest | `event-guest-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 17 | 3 | Event guest/RSVP record. |
| EventProfitability | `event-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 28 | 3 | Event P&L report. Financial record. |
| EventReport | `event-report-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 18 | 4 | Event report. Business record. |
| EventStaff | `event-staff-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 12 | 2 | Event staff assignment. |
| EventTimelineItem | `event-automation-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 13 | 4 | Event timeline entry. |
| EventWaitlistEntry | `event-automation-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 13 | 3 | Event waitlist. Customer-facing. |
| Facility | `facilities-all-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 14 | 3 | Facility/location. |
| FacilityArea | `facilities-all-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 12 | 3 | Facility area/zone. |
| FacilityAsset | `facilities-all-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 16 | 3 | Facility asset. |
| FacilitySchedule | `facilities-all-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 14 | 4 | Facility scheduling. |
| FacilityWorkOrder | `facilities-all-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 19 | 2 | Facility maintenance order. |
| Ingredient | `ingredient-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 13 | 5 | Ingredient master data. |
| InventoryItem | `inventory-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 20 | 7 | Inventory item. Core stock record. |
| InventorySupplier | `inventory-supplier-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 15 | 3 | Supplier record. Procurement. |
| InventoryTransaction | `inventory-transaction-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 16 | 1 | Inventory movement. Audit trail. |
| InventoryTransfer | `inventory-transfer-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 15 | 5 | Inventory transfer between locations. |
| Invoice | `invoice-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 32 | 10 | Invoice. Legal financial record. |
| KitchenTask | `kitchen-task-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 12 | 15 | Kitchen task. Operational execution record. |
| KnowledgeBaseEntry | `knowledge-base-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 12 | 4 | Knowledge base article. |
| LaborBudget | `labor-budget-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 12 | 3 | Labor budget. Financial planning. |
| Lead | `lead-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 19 | 5 | Sales lead. Revenue pipeline. |
| LogisticsDispatch | `logistics-all-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 12 | 1 | Dispatch record. Logistics. |
| LogisticsRoute | `logistics-all-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 19 | 5 | Delivery route. Logistics. |
| MaintenanceWorkOrder | `equipment-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 18 | 5 | Maintenance work order. |
| Menu | `menu-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 10 | 4 | Menu definition. Product catalog. |
| MenuDish | `menu-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 8 | 3 | Menu-dish association. |
| OverrideAudit | `override-audit-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 11 | 2 | Override audit log. Compliance. |
| Payment | `payment-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 25 | 9 | Payment transaction. |
| PaymentMethod | `payment-method-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 24 | 7 | Payment method config. |
| PayrollApprovalHistory | `payroll-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 10 | 1 | Payroll approval. Audit trail. |
| PayrollPeriod | `payroll-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 8 | 1 | Payroll period. Financial record. |
| PayrollRun | `payroll-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 15 | 1 | Payroll execution. Financial record. |
| PrepComment | `prep-comment-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 11 | 4 | Preparation comment. |
| PrepList | `prep-list-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 13 | 10 | Preparation list. Daily operations. |
| PrepListItem | `prep-list-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 23 | 6 | Preparation list detail. |
| PrepMethod | `prep-method-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 11 | 3 | Preparation method definition. Config/catalog. |
| PrepTask | `prep-task-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 21 | 13 | Preparation task. Operational execution record. |
| PricingTier | `pricing-tier-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 14 | 3 | Pricing configuration. |
| Proposal | `proposal-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 29 | 7 | Sales proposal with line items. Revenue pipeline. |
| ProposalLineItem | `proposal-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 16 | 3 | Proposal detail line. |
| QACheck | `qa-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 10 | 2 | QA check. Compliance record. |
| QACorrectiveAction | `qa-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 12 | 2 | QA corrective action. Compliance. |
| QATemperatureLog | `qa-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 11 | 1 | Temperature log. Food safety. |
| RateLimitConfig | `rate-limit-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 12 | 5 | Rate limit config. System config. |
| Recipe | `recipe-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 8 | 4 | Recipe entity. Core kitchen asset. |
| RecipeIngredient | `recipe-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 11 | 4 | Recipe ingredient line. |
| RecipeStep | `recipe-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 13 | 3 | Recipe step instruction. |
| RecipeVersion | `recipe-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 23 | 3 | Recipe version. Audit trail. |
| RevenueRecognitionLine | `revenue-recognition-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 17 | 4 | Revenue recognition line. Accounting. |
| RevenueRecognitionSchedule | `revenue-recognition-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 24 | 12 | Revenue recognition. Accounting. |
| RolePolicy | `role-policy-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 10 | 3 | RBAC policy. Security config. |
| Schedule | `schedule-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 12 | 4 | Staff schedule. Operational execution. |
| ScheduleShift | `schedule-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 12 | 3 | Schedule shift. Operational execution. |
| Shipment | `shipment-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 27 | 7 | Shipment record. Logistics. |
| ShipmentItem | `shipment-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 17 | 2 | Shipment line item. |
| SmsAutomationRule | `sms-automation-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 15 | 5 | SMS automation rule. |
| StaffPerformance | `staff-performance-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 16 | 4 | Staff performance. HR data. |
| Station | `station-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 12 | 7 | Kitchen station config. |
| TimeEntry | `time-entry-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 14 | 4 | Time clock entry. Payroll record. |
| TimeOffRequest | `time-off-request-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 14 | 5 | Time-off request. HR record. |
| TimecardEditRequest | `time-entry-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 11 | 3 | Timecard edit request. Audit trail. |
| TrainingAssignment | `training-assignment-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 12 | 2 | Training assignment. Compliance. |
| TrainingModule | `training-module-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 14 | 3 | Training content. Reference data. |
| User | `user-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 20 | 5 | User account. Core identity. |
| VarianceReport | `cycle-count-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 21 | 3 | Inventory variance report. |
| Vehicle | `logistics-all-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 17 | 3 | Vehicle record. Logistics. |
| Vendor | `vendor-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 19 | 5 | Vendor master data. |
| VendorCatalog | `vendor-catalog-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 25 | 3 | Vendor product catalog. |
| VendorContract | `vendor-contract-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 33 | 10 | Vendor contract. Legal record. |
| VersionApproval | `version-control-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 8 | 4 | Version approval. Governance. |
| VersionedEntity | `version-control-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 9 | 4 | Versioned entity base. |
| WasteEntry | `waste-entry-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 16 | 3 | Waste tracking. Cost management. |
| WorkOrder | `work-order-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 14 | 6 | Work order. Maintenance record. |

### Detail

**AdminTask** (`admin-task-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 13 | Cmds: 8
- Reason: Admin task. Work management.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**AlertsConfig** (`alerts-config-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 4 | Cmds: 3
- Reason: Alert configuration. System config.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**AllergenWarning** (`allergen-warning-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 18 | Cmds: 5
- Reason: Allergen alert. Safety record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**ApiKey** (`api-key-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 13 | Cmds: 5
- Reason: API key. Security credential.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**BankAccount** (`bank-account-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 13 | Cmds: 5
- Reason: Bank account. Financial record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**BattleBoard** (`battle-board-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 19 | Cmds: 7
- Reason: Event battle board (menu comparison). Planning artifact.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Budget** (`budget-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 13 | Cmds: 4
- Reason: Budget entity. Financial planning.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**BudgetAlert** (`labor-budget-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 11 | Cmds: 2
- Reason: Budget threshold alert config.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**BudgetLineItem** (`event-budget-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 14 | Cmds: 3
- Reason: Budget detail line.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**BulkOrderRule** (`bulk-order-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 18 | Cmds: 3
- Reason: Bulk ordering rules. Business config.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**CateringOrder** (`catering-order-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 33 | Cmds: 6
- Reason: Customer order with line items, payments, delivery. Hard business record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**ChartOfAccount** (`chart-of-account-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 10 | Cmds: 3
- Reason: Chart of accounts. Financial config.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Client** (`client-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 26 | Cmds: 4
- Reason: Customer account. Core CRM entity.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**ClientContact** (`client-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 15 | Cmds: 4
- Reason: Customer contact person. Core CRM.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**ClientInteraction** (`client-interaction-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 15 | Cmds: 3
- Reason: Interaction log (call, email, meeting). Audit trail.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**ClientPreference** (`client-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 10 | Cmds: 3
- Reason: Customer preferences. Must persist for service delivery.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**CollectionAction** (`collections-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 21 | Cmds: 4
- Reason: Collection action. Audit trail.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**CollectionCase** (`collections-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 34 | Cmds: 18
- Reason: Collection case. Financial/legal.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**CollectionPaymentPlan** (`collections-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 18 | Cmds: 5
- Reason: Payment plan. Financial obligation.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Container** (`container-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 14 | Cmds: 3
- Reason: Food container tracking. Inventory asset.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**ContractSignature** (`event-contract-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 11 | Cmds: 2
- Reason: Contract signature. Legal audit trail.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**CycleCountRecord** (`cycle-count-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 23 | Cmds: 4
- Reason: Individual count record. Audit trail.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**CycleCountSession** (`cycle-count-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 21 | Cmds: 5
- Reason: Inventory count session. Audit record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Deal** (`deal-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 15 | Cmds: 2
- Reason: Deal/opportunity. Revenue pipeline.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Dish** (`dish-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 20 | Cmds: 5
- Reason: Dish/menu item definition. Core product catalog.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**DocumentVersion** (`document-version-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 9 | Cmds: 2
- Reason: Document versioning. Audit trail.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Driver** (`logistics-all-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 14 | Cmds: 3
- Reason: Driver record. Logistics.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**EmailTemplate** (`email-template-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 12 | Cmds: 3
- Reason: Email template. Communication config.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**EmailWorkflow** (`email-workflow-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 11 | Cmds: 3
- Reason: Email workflow config.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**EmployeeAvailability** (`employee-availability-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 12 | Cmds: 3
- Reason: Employee availability. Scheduling.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**EmployeeCertification** (`employee-certification-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 11 | Cmds: 3
- Reason: Certification. Compliance.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**EmployeeDeduction** (`payroll-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 14 | Cmds: 1
- Reason: Payroll deduction. Financial.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**EntityVersion** (`version-control-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 14 | Cmds: 4
- Reason: Entity version record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Equipment** (`equipment-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 21 | Cmds: 7
- Reason: Equipment asset.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Event** (`event-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 25 | Cmds: 10
- Reason: Core event entity. The primary product.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**EventBudget** (`event-budget-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 13 | Cmds: 4
- Reason: Event financial plan.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**EventContract** (`event-contract-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 14 | Cmds: 8
- Reason: Event legal contract. Must persist.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**EventDish** (`event-dish-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 11 | Cmds: 2
- Reason: Event menu item assignment.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**EventGuest** (`event-guest-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 17 | Cmds: 3
- Reason: Event guest/RSVP record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**EventProfitability** (`event-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 28 | Cmds: 3
- Reason: Event P&L report. Financial record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**EventReport** (`event-report-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 18 | Cmds: 4
- Reason: Event report. Business record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**EventStaff** (`event-staff-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 12 | Cmds: 2
- Reason: Event staff assignment.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**EventTimelineItem** (`event-automation-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 13 | Cmds: 4
- Reason: Event timeline entry.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**EventWaitlistEntry** (`event-automation-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 13 | Cmds: 3
- Reason: Event waitlist. Customer-facing.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Facility** (`facilities-all-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 14 | Cmds: 3
- Reason: Facility/location.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**FacilityArea** (`facilities-all-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 12 | Cmds: 3
- Reason: Facility area/zone.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**FacilityAsset** (`facilities-all-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 16 | Cmds: 3
- Reason: Facility asset.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**FacilitySchedule** (`facilities-all-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 14 | Cmds: 4
- Reason: Facility scheduling.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**FacilityWorkOrder** (`facilities-all-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 19 | Cmds: 2
- Reason: Facility maintenance order.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Ingredient** (`ingredient-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 13 | Cmds: 5
- Reason: Ingredient master data.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**InventoryItem** (`inventory-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 20 | Cmds: 7
- Reason: Inventory item. Core stock record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**InventorySupplier** (`inventory-supplier-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 15 | Cmds: 3
- Reason: Supplier record. Procurement.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**InventoryTransaction** (`inventory-transaction-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 16 | Cmds: 1
- Reason: Inventory movement. Audit trail.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**InventoryTransfer** (`inventory-transfer-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 15 | Cmds: 5
- Reason: Inventory transfer between locations.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Invoice** (`invoice-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 32 | Cmds: 10
- Reason: Invoice. Legal financial record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**KitchenTask** (`kitchen-task-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 12 | Cmds: 15
- Reason: Kitchen task. Operational execution record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**KnowledgeBaseEntry** (`knowledge-base-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 12 | Cmds: 4
- Reason: Knowledge base article.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**LaborBudget** (`labor-budget-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 12 | Cmds: 3
- Reason: Labor budget. Financial planning.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Lead** (`lead-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 19 | Cmds: 5
- Reason: Sales lead. Revenue pipeline.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**LogisticsDispatch** (`logistics-all-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 12 | Cmds: 1
- Reason: Dispatch record. Logistics.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**LogisticsRoute** (`logistics-all-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 19 | Cmds: 5
- Reason: Delivery route. Logistics.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**MaintenanceWorkOrder** (`equipment-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 18 | Cmds: 5
- Reason: Maintenance work order.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Menu** (`menu-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 10 | Cmds: 4
- Reason: Menu definition. Product catalog.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**MenuDish** (`menu-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 8 | Cmds: 3
- Reason: Menu-dish association.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**OverrideAudit** (`override-audit-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 11 | Cmds: 2
- Reason: Override audit log. Compliance.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Payment** (`payment-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 25 | Cmds: 9
- Reason: Payment transaction.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**PaymentMethod** (`payment-method-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 24 | Cmds: 7
- Reason: Payment method config.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**PayrollApprovalHistory** (`payroll-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 10 | Cmds: 1
- Reason: Payroll approval. Audit trail.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**PayrollPeriod** (`payroll-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 8 | Cmds: 1
- Reason: Payroll period. Financial record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**PayrollRun** (`payroll-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 15 | Cmds: 1
- Reason: Payroll execution. Financial record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**PrepComment** (`prep-comment-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 11 | Cmds: 4
- Reason: Preparation comment.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**PrepList** (`prep-list-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 13 | Cmds: 10
- Reason: Preparation list. Daily operations.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**PrepListItem** (`prep-list-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 23 | Cmds: 6
- Reason: Preparation list detail.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**PrepMethod** (`prep-method-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 11 | Cmds: 3
- Reason: Preparation method definition. Config/catalog.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**PrepTask** (`prep-task-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 21 | Cmds: 13
- Reason: Preparation task. Operational execution record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**PricingTier** (`pricing-tier-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 14 | Cmds: 3
- Reason: Pricing configuration.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Proposal** (`proposal-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 29 | Cmds: 7
- Reason: Sales proposal with line items. Revenue pipeline.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**ProposalLineItem** (`proposal-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 16 | Cmds: 3
- Reason: Proposal detail line.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**QACheck** (`qa-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 10 | Cmds: 2
- Reason: QA check. Compliance record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**QACorrectiveAction** (`qa-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 12 | Cmds: 2
- Reason: QA corrective action. Compliance.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**QATemperatureLog** (`qa-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 11 | Cmds: 1
- Reason: Temperature log. Food safety.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**RateLimitConfig** (`rate-limit-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 12 | Cmds: 5
- Reason: Rate limit config. System config.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Recipe** (`recipe-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 8 | Cmds: 4
- Reason: Recipe entity. Core kitchen asset.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**RecipeIngredient** (`recipe-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 11 | Cmds: 4
- Reason: Recipe ingredient line.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**RecipeStep** (`recipe-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 13 | Cmds: 3
- Reason: Recipe step instruction.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**RecipeVersion** (`recipe-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 23 | Cmds: 3
- Reason: Recipe version. Audit trail.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**RevenueRecognitionLine** (`revenue-recognition-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 17 | Cmds: 4
- Reason: Revenue recognition line. Accounting.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**RevenueRecognitionSchedule** (`revenue-recognition-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 24 | Cmds: 12
- Reason: Revenue recognition. Accounting.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**RolePolicy** (`role-policy-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 10 | Cmds: 3
- Reason: RBAC policy. Security config.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Schedule** (`schedule-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 12 | Cmds: 4
- Reason: Staff schedule. Operational execution.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**ScheduleShift** (`schedule-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 12 | Cmds: 3
- Reason: Schedule shift. Operational execution.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Shipment** (`shipment-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 27 | Cmds: 7
- Reason: Shipment record. Logistics.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**ShipmentItem** (`shipment-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 17 | Cmds: 2
- Reason: Shipment line item.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**SmsAutomationRule** (`sms-automation-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 15 | Cmds: 5
- Reason: SMS automation rule.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**StaffPerformance** (`staff-performance-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 16 | Cmds: 4
- Reason: Staff performance. HR data.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Station** (`station-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 12 | Cmds: 7
- Reason: Kitchen station config.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**TimeEntry** (`time-entry-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 14 | Cmds: 4
- Reason: Time clock entry. Payroll record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**TimeOffRequest** (`time-off-request-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 14 | Cmds: 5
- Reason: Time-off request. HR record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**TimecardEditRequest** (`time-entry-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 11 | Cmds: 3
- Reason: Timecard edit request. Audit trail.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**TrainingAssignment** (`training-assignment-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 12 | Cmds: 2
- Reason: Training assignment. Compliance.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**TrainingModule** (`training-module-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 14 | Cmds: 3
- Reason: Training content. Reference data.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**User** (`user-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 20 | Cmds: 5
- Reason: User account. Core identity.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**VarianceReport** (`cycle-count-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 21 | Cmds: 3
- Reason: Inventory variance report.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Vehicle** (`logistics-all-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 17 | Cmds: 3
- Reason: Vehicle record. Logistics.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**Vendor** (`vendor-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 19 | Cmds: 5
- Reason: Vendor master data.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**VendorCatalog** (`vendor-catalog-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 25 | Cmds: 3
- Reason: Vendor product catalog.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**VendorContract** (`vendor-contract-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 33 | Cmds: 10
- Reason: Vendor contract. Legal record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**VersionApproval** (`version-control-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 8 | Cmds: 4
- Reason: Version approval. Governance.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**VersionedEntity** (`version-control-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 9 | Cmds: 4
- Reason: Versioned entity base.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**WasteEntry** (`waste-entry-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 16 | Cmds: 3
- Reason: Waste tracking. Cost management.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

**WorkOrder** (`work-order-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 14 | Cmds: 6
- Reason: Work order. Maintenance record.
- Impact: DATA LOSS ON RESTART. Business/financial/compliance records lost.
- Blocker: Add 'store {Entity} in durable' to manifest. Verify Prisma table exists.

## TRANSIENT_OK (5)

| Entity | File | Store | Skip | Props | Cmds | Reason |
|---|---|---|---|---|---|---|
| AiEventSetupSession | `ai-event-setup-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 20 | 5 | AI parsing session — wizard/scratchpad state. In-flight AI extraction,... |
| EventImportWorkflow | `event-import-workflow.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 17 | 18 | Import workflow orchestrator — multi-step import state machine. Transi... |
| EventSummary | `event-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 14 | 3 | AI-generated event summary. Can be regenerated from source data. Cache... |
| PerformancePrediction | `workforce-ai-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 10 | 1 | AI workforce prediction with expiration. Cache/projection that expires... |
| SampleData | `sample-data-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 8 | 3 | Sample/seed data for demos. Non-production. |

### Detail

**AiEventSetupSession** (`ai-event-setup-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 20 | Cmds: 5
- Reason: AI parsing session — wizard/scratchpad state. In-flight AI extraction, cleared after event creation.
- Impact: LOW. Transient/session data. Acceptable loss, regenerable.
- Blocker: None. Optionally add explicit 'store {Entity} in memory'.

**EventImportWorkflow** (`event-import-workflow.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 17 | Cmds: 18
- Reason: Import workflow orchestrator — multi-step import state machine. Transient until import completes.
- Impact: LOW. Transient/session data. Acceptable loss, regenerable.
- Blocker: None. Optionally add explicit 'store {Entity} in memory'.

**EventSummary** (`event-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 14 | Cmds: 3
- Reason: AI-generated event summary. Can be regenerated from source data. Cache-like.
- Impact: LOW. Transient/session data. Acceptable loss, regenerable.
- Blocker: None. Optionally add explicit 'store {Entity} in memory'.

**PerformancePrediction** (`workforce-ai-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 10 | Cmds: 1
- Reason: AI workforce prediction with expiration. Cache/projection that expires.
- Impact: LOW. Transient/session data. Acceptable loss, regenerable.
- Blocker: None. Optionally add explicit 'store {Entity} in memory'.

**SampleData** (`sample-data-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 8 | Cmds: 3
- Reason: Sample/seed data for demos. Non-production.
- Impact: LOW. Transient/session data. Acceptable loss, regenerable.
- Blocker: None. Optionally add explicit 'store {Entity} in memory'.

## UNKNOWN_REVIEW (11)

| Entity | File | Store | Skip | Props | Cmds | Reason |
|---|---|---|---|---|---|---|
| AdminChatParticipant | `admin-chat-participant-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 9 | 3 | Admin chat participant. Session state or durable config? |
| AutomatedFollowup | `event-automation-rules.manifest` | `none` | `PRISMA_SKIPPED_NO_STORE` | 14 | 4 | Automated follow-up. Durable CRM automation or transient task? |
| CommandBoard | `command-board-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 11 | 4 | Kanban board. Durable workspace config or transient? Clarify product i... |
| CommandBoardCard | `command-board-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 21 | 5 | Kanban card. See CommandBoard. |
| CommandBoardConnection | `command-board-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 11 | 2 | Kanban connection. See CommandBoard. |
| CommandBoardGroup | `command-board-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 14 | 3 | Kanban group. See CommandBoard. |
| CommandBoardLayout | `command-board-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 13 | 3 | Kanban layout. See CommandBoard. |
| Notification | `notification-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 11 | 4 | Notification. Transient (dismissed) or durable audit trail? |
| PrepTaskPlanWorkflow | `prep-task-plan-workflow.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 28 | 16 | Workflow orchestrator. Transient state machine or durable plan? |
| Workflow | `workflow-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 10 | 4 | Generic workflow. Depends on usage. |
| WorkforceOptimization | `workforce-ai-rules.manifest` | `none` | `PRISMA_SKIPPED_NON_DURABLE` | 8 | 4 | AI optimization. Transient recommendation or durable staffing plan? |

### Detail

**AdminChatParticipant** (`admin-chat-participant-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 9 | Cmds: 3
- Reason: Admin chat participant. Session state or durable config?
- Impact: UNKNOWN. Depends on product intent.
- Blocker: Clarify persistence intent with product owner.

**AutomatedFollowup** (`event-automation-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NO_STORE` | Props: 14 | Cmds: 4
- Reason: Automated follow-up. Durable CRM automation or transient task?
- Impact: UNKNOWN. Depends on product intent.
- Blocker: Clarify persistence intent with product owner.

**CommandBoard** (`command-board-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 11 | Cmds: 4
- Reason: Kanban board. Durable workspace config or transient? Clarify product intent.
- Impact: UNKNOWN. Depends on product intent.
- Blocker: Clarify persistence intent with product owner.

**CommandBoardCard** (`command-board-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 21 | Cmds: 5
- Reason: Kanban card. See CommandBoard.
- Impact: UNKNOWN. Depends on product intent.
- Blocker: Clarify persistence intent with product owner.

**CommandBoardConnection** (`command-board-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 11 | Cmds: 2
- Reason: Kanban connection. See CommandBoard.
- Impact: UNKNOWN. Depends on product intent.
- Blocker: Clarify persistence intent with product owner.

**CommandBoardGroup** (`command-board-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 14 | Cmds: 3
- Reason: Kanban group. See CommandBoard.
- Impact: UNKNOWN. Depends on product intent.
- Blocker: Clarify persistence intent with product owner.

**CommandBoardLayout** (`command-board-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 13 | Cmds: 3
- Reason: Kanban layout. See CommandBoard.
- Impact: UNKNOWN. Depends on product intent.
- Blocker: Clarify persistence intent with product owner.

**Notification** (`notification-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 11 | Cmds: 4
- Reason: Notification. Transient (dismissed) or durable audit trail?
- Impact: UNKNOWN. Depends on product intent.
- Blocker: Clarify persistence intent with product owner.

**PrepTaskPlanWorkflow** (`prep-task-plan-workflow.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 28 | Cmds: 16
- Reason: Workflow orchestrator. Transient state machine or durable plan?
- Impact: UNKNOWN. Depends on product intent.
- Blocker: Clarify persistence intent with product owner.

**Workflow** (`workflow-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 10 | Cmds: 4
- Reason: Generic workflow. Depends on usage.
- Impact: UNKNOWN. Depends on product intent.
- Blocker: Clarify persistence intent with product owner.

**WorkforceOptimization** (`workforce-ai-rules.manifest`)
- Store: `none` | Skip: `PRISMA_SKIPPED_NON_DURABLE` | Props: 8 | Cmds: 4
- Reason: AI optimization. Transient recommendation or durable staffing plan?
- Impact: UNKNOWN. Depends on product intent.
- Blocker: Clarify persistence intent with product owner.
