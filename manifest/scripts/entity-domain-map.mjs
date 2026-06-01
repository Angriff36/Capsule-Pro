// Canonical entity→domain + entity→Prisma-accessor mapping for the Manifest route
// generation pipeline. Single source of truth consumed by manifest/scripts/generate.mjs.
//
// Why this file exists:
//  - The upstream @angriff36/manifest nextjs projection emits generated read routes that call
//    `database.<camelCase(entityName)>` with ZERO validation that the Prisma model exists.
//    For entities whose Prisma model name differs from camelCase(entity), that accessor is a
//    phantom and breaks `pnpm --filter api typecheck` / `next build` (generated-surface drift,
//    constitution §10/§16). The fix belongs in the producer (this repo) + regenerate — never by
//    hand-editing the "DO NOT EDIT" generated files.
//  - ENTITY_ACCESSOR_OVERRIDES is the authoritative, reviewed correction map. Names are NOT
//    guessed: each entry is verified against packages/database/prisma/schema.prisma (@@map) and
//    the runtime store headers in manifest/runtime/src/prisma-stores/.
//
// NOTE (consolidation, phase-out-registry.md §D): ENTITY_DOMAIN_MAP is currently duplicated in
// manifest/scripts/generate-all-routes.mjs and generate-route-manifest.ts (and a separate copy
// in packages/mcp-server/src/lib/entity-domain-map.ts). Those consumers should import from this
// module; that rewire is a follow-up. This module is the canonical home.

// Maps each Manifest entity to its domain directory under apps/api/app/api/.
export const ENTITY_DOMAIN_MAP = {
  // ─── Kitchen Operations ───
  PrepTask: "kitchen/prep-tasks",
  PrepTaskPlanWorkflow: "kitchen/prep-task-plan-workflows",
  KitchenTask: "kitchen/kitchen-tasks",
  Recipe: "kitchen/recipes",
  RecipeVersion: "kitchen/recipe-versions",
  RecipeIngredient: "kitchen/recipe-ingredients",
  RecipeStep: "kitchen/recipe-steps",
  Ingredient: "kitchen/ingredients",
  Dish: "kitchen/dishes",
  Menu: "kitchen/menus",
  MenuDish: "kitchen/menu-dishes",
  PrepList: "kitchen/prep-lists",
  PrepListItem: "kitchen/prep-list-items",
  Station: "kitchen/stations",
  InventoryItem: "kitchen/inventory",
  PrepComment: "kitchen/prep-comments",
  Container: "kitchen/containers",
  PrepMethod: "kitchen/prep-methods",
  WasteEntry: "kitchen/waste-entries",
  AllergenWarning: "kitchen/allergen-warnings",
  AlertsConfig: "kitchen/alerts-config",
  OverrideAudit: "kitchen/override-audits",
  // ─── Events & Catering ───
  Event: "events/event",
  EventProfitability: "events/profitability",
  EventSummary: "events/summaries",
  EventReport: "events/reports",
  EventBudget: "events/budgets",
  BudgetLineItem: "events/budget-line-items",
  BudgetAlert: "events/budget-alerts",
  CateringOrder: "events/catering-orders",
  BattleBoard: "events/battle-boards",
  EventGuest: "events/guests",
  EventContract: "events/contracts",
  ContractSignature: "events/contract-signatures",
  EventDish: "events/event-dishes",
  EventStaff: "events/staff",
  EventImportWorkflow: "events/import-workflows",
  // ─── CRM & Sales ───
  Client: "crm/clients",
  ClientContact: "crm/client-contacts",
  ClientPreference: "crm/client-preferences",
  Lead: "crm/leads",
  Proposal: "crm/proposals",
  ProposalLineItem: "crm/proposal-line-items",
  ClientInteraction: "crm/client-interactions",
  // ─── Purchasing & Inventory ───
  PurchaseOrder: "inventory/purchase-orders",
  PurchaseOrderItem: "inventory/purchase-order-items",
  PurchaseRequisition: "procurement/requisitions",
  PurchaseRequisitionItem: "procurement/requisition-items",
  VendorContract: "procurement/vendor-contracts",
  Shipment: "shipments/shipment",
  ShipmentItem: "shipments/shipment-items",
  InventoryTransaction: "inventory/transactions",
  InventorySupplier: "inventory/suppliers",
  CycleCountSession: "inventory/cycle-count/sessions",
  CycleCountRecord: "inventory/cycle-count/records",
  VarianceReport: "inventory/cycle-count/variance-reports",
  BulkOrderRule: "inventory/bulk-order-rules",
  PricingTier: "inventory/pricing-tiers",
  VendorCatalog: "inventory/vendor-catalogs",
  // ─── Staff & Scheduling ───
  User: "staff/employees",
  StaffMember: "staff/members",
  Schedule: "staff/schedules",
  ScheduleShift: "staff/shifts",
  TimeEntry: "timecards/entries",
  TimecardEditRequest: "timecards/edit-requests",
  TimeOffRequest: "timecards/time-off-requests",
  EmployeeAvailability: "staff/availability",
  EmployeeCertification: "staff/certifications",
  // ─── Payroll ───
  PayrollPeriod: "payroll/periods",
  PayrollRun: "payroll/runs",
  PayrollApprovalHistory: "payroll/approval-history",
  EmployeeDeduction: "payroll/deductions",
  LaborBudget: "payroll/labor-budgets",
  // ─── Training ───
  TrainingAssignment: "training/assignments",
  TrainingModule: "training/modules",
  // ─── Command Board ───
  CommandBoard: "command-board/boards",
  CommandBoardCard: "command-board/cards",
  CommandBoardGroup: "command-board/groups",
  CommandBoardConnection: "command-board/connections",
  CommandBoardLayout: "command-board/layouts",
  // ─── Workflows & Notifications ───
  Workflow: "collaboration/workflows",
  Notification: "collaboration/notifications",
  EmailTemplate: "communications/email-templates",
  EmailWorkflow: "communications/email-workflows",
  // ─── Administrative ───
  AdminTask: "administrative/tasks",
  AdminChatParticipant: "administrative/chat/participants",
  // ─── Settings ───
  ApiKey: "settings/api-keys",
  // ─── Rate Limiting ───
  RateLimitConfig: "administrative/rate-limits",
  // ─── Accounting ───
  ChartOfAccount: "accounting/chart-of-accounts",
  // ─── Role Policy ───
  RolePolicy: "rolepolicy/policies",
  // ─── Full-generation additions (2026-06-01) ───
  BankAccount: "accounting/bank-accounts",
  Budget: "accounting/budgets",
  CollectionCase: "accounting/collections/cases",
  CollectionAction: "accounting/collections/actions",
  CollectionPaymentPlan: "accounting/collections/payment-plans",
  Invoice: "accounting/invoices",
  PaymentMethod: "accounting/payment-methods",
  Payment: "accounting/payments",
  PaymentRefundAttempt: "accounting/payment-refund-attempts",
  RevenueRecognitionSchedule: "accounting/revenue-recognition/schedules",
  RevenueRecognitionLine: "accounting/revenue-recognition/lines",
  ProposalTemplate: "crm/proposal-templates",
  InteractionAttachment: "crm/interaction-attachments",
  CrmScoringRule: "crm/scoring-rules",
  Deal: "crm/deals",
  Venue: "events/venues",
  EventStaffAssignment: "events/staff-assignments",
  EventTimeline: "events/timelines",
  TimelineTask: "events/timeline-tasks",
  EventImport: "events/imports",
  EventFollowup: "events/followups",
  EventTimelineItem: "events/timeline-items",
  EventWaitlistEntry: "events/waitlist-entries",
  BoardProjection: "command-board/projections",
  BoardAnnotation: "command-board/annotations",
  AiEventSetupSession: "events/ai-setup-sessions",
  AutomatedFollowup: "events/automated-followups",
  TemperatureProbe: "kitchen/temperature-probes",
  TemperatureLog: "kitchen/temperature-logs",
  TemperatureReading: "kitchen/temperature-readings",
  IotAlertRule: "kitchen/iot-alert-rules",
  IoTAlert: "kitchen/iot-alerts",
  CorrectiveAction: "kitchen/corrective-actions",
  QualityCheck: "kitchen/quality-checks",
  QualityCheckItem: "kitchen/quality-check-items",
  KitchenTaskClaim: "kitchen/task-claims",
  KitchenTaskProgress: "kitchen/task-progress",
  TaskBundle: "kitchen/task-bundles",
  TaskBundleItem: "kitchen/task-bundle-items",
  BulkCombineRule: "kitchen/bulk-combine-rules",
  MethodVideo: "kitchen/method-videos",
  PrepListImport: "kitchen/prep-list-imports",
  QACheck: "kitchen/qa-checks",
  QACorrectiveAction: "kitchen/qa-corrective-actions",
  QATemperatureLog: "kitchen/qa-temperature-logs",
  StorageLocation: "inventory/storage-locations",
  InventoryStock: "inventory/stock",
  InventoryAlert: "inventory/alerts",
  InventoryForecast: "inventory/forecasts",
  ForecastInput: "inventory/forecast-inputs",
  ReorderSuggestion: "inventory/reorder-suggestions",
  VendorContact: "inventory/vendor-contacts",
  VendorRating: "inventory/vendor-ratings",
  InventoryTransferItem: "inventory/transfer-items",
  InventoryTransfer: "inventory/transfers",
  ProcurementBudget: "procurement/budgets",
  ProcurementBudgetAlert: "procurement/budget-alerts",
  AuditSchedule: "inventory/audit-schedules",
  Vendor: "inventory/vendors",
  Equipment: "facilities/equipment",
  MaintenanceWorkOrder: "facilities/maintenance-work-orders",
  Facility: "facilities/facilities",
  FacilityArea: "facilities/areas",
  FacilityAsset: "facilities/assets",
  FacilitySchedule: "facilities/schedules",
  FacilityWorkOrder: "facilities/work-orders",
  PreventiveMaintenanceSchedule: "facilities/preventive-maintenance",
  WorkOrder: "facilities/general-work-orders",
  Driver: "logistics/drivers",
  Vehicle: "logistics/vehicles",
  LogisticsRoute: "logistics/routes",
  LogisticsDispatch: "logistics/dispatches",
  DeliveryRoute: "logistics/delivery-routes",
  RouteStop: "logistics/route-stops",
  TimecardApproval: "staff/timecard-approvals",
  PayrollLineItem: "staff/payroll-line-items",
  TipPool: "staff/tip-pools",
  DisciplinaryAction: "staff/disciplinary-actions",
  ActionMilestone: "staff/action-milestones",
  PerformanceReview: "staff/performance-reviews",
  TrainingCompletion: "staff/training-completions",
  OnboardingTask: "staff/onboarding-tasks",
  OnboardingCompletion: "staff/onboarding-completions",
  OpenShift: "staff/open-shifts",
  StaffPerformance: "staff/performance",
  WorkforceOptimization: "staff/workforce-optimization",
  PerformancePrediction: "staff/performance-predictions",
  Report: "administrative/reports",
  Document: "administrative/documents",
  DocumentVersion: "administrative/document-versions",
  AdminChatThread: "administrative/chat/threads",
  AdminChatMessage: "administrative/chat/messages",
  Note: "administrative/notes",
  KnowledgeBaseEntry: "administrative/knowledge-base",
  SampleData: "administrative/sample-data",
  SmsAutomationRule: "administrative/sms-automation-rules",
  VersionedEntity: "administrative/versioned-entities",
  EntityVersion: "administrative/entity-versions",
  VersionApproval: "administrative/version-approvals",
};

// Naive accessor derivation, IDENTICAL to the upstream nextjs projection's toCamelCase
// (`@angriff36/manifest/.../projections/nextjs/generator.js`): value[0].toLowerCase() + rest.
// Must stay byte-for-byte equivalent so the producer can locate the exact `database.<naive>`
// token the projection emitted.
export function toCamelCase(value) {
  if (!value) return value;
  return value[0].toLowerCase() + value.slice(1);
}

// Authoritative entity → correct Prisma client accessor.
// Only entities whose committed Prisma model name differs from camelCase(entity) need an entry.
// Value semantics:
//   string  → rewrite generated `database.<naive>` to `database.<value>`.
//   null    → entity has NO Prisma table; do not emit a `database.*` read route (drop the file).
//
// Each entry is verified — NOT guessed (constitution: never invent Prisma accessors):
//   EventStaff           model EventStaffAssignment @@map("event_staff_assignments")
//                        (packages/database/prisma/schema.prisma:1394) →
//                        accessor `eventStaffAssignment`. Confirmed by store header
//                        manifest/runtime/src/prisma-stores/broken-read-batch09-event-staff-summary.ts
//                        ("manifest entity \"EventStaff\" → tenant_events.event_staff_assignments").
//   EventImportWorkflow  model EventImport @@map("event_imports")
//                        (packages/database/prisma/schema.prisma:1437) →
//                        accessor `eventImport`. Confirmed by store header
//                        manifest/runtime/src/prisma-stores/broken-read-batch08-event-guest-import.ts
//                        ("EventImport (manifest entity \"EventImportWorkflow\") → tenant_events.event_imports").
// (This corrects the stale phase-out-registry.md claim that EventImportWorkflow "has no table by
//  design" — the event_imports table exists, so the route is REMAPPED, not deleted.)
export const ENTITY_ACCESSOR_OVERRIDES = {
  EventStaff: "eventStaffAssignment",
  EventImportWorkflow: "eventImport",
};

// Detail-route segment names for domain routes that already use a resource-specific
// slug. This keeps regenerated read routes from colliding with handcrafted sibling
// routes at the same URL shape.
export const ENTITY_DETAIL_SEGMENT_OVERRIDES = {
  AdminChatThread: "threadId",
  EventImport: "importId",
};

// Reverse map: flat entity path segment (entityName.toLowerCase(), as the upstream CLI emits)
// → original entity name. Lets the producer recover the entity for a staged route path.
export const FLAT_SEGMENT_TO_ENTITY = {};
for (const entity of Object.keys(ENTITY_DOMAIN_MAP)) {
  FLAT_SEGMENT_TO_ENTITY[entity.toLowerCase()] = entity;
}

/**
 * Resolve how a generated read route for `entityName` should reference Prisma.
 * @param {string} entityName
 * @returns {{ naive: string, accessor: string|null, drop: boolean, overridden: boolean }}
 *   - naive: the accessor the upstream projection emitted (camelCase entity).
 *   - accessor: the correct accessor to use (null when the entity has no table).
 *   - drop: true when the route must not be emitted (no backing table).
 *   - overridden: true when accessor !== naive (a rewrite is required).
 */
export function resolveAccessor(entityName) {
  const naive = toCamelCase(entityName);
  if (!Object.prototype.hasOwnProperty.call(ENTITY_ACCESSOR_OVERRIDES, entityName)) {
    return { naive, accessor: naive, drop: false, overridden: false };
  }
  const override = ENTITY_ACCESSOR_OVERRIDES[entityName];
  if (override === null) {
    return { naive, accessor: null, drop: true, overridden: false };
  }
  return { naive, accessor: override, drop: false, overridden: override !== naive };
}

export function resolveDetailSegment(entityName) {
  return ENTITY_DETAIL_SEGMENT_OVERRIDES[entityName] ?? "id";
}
