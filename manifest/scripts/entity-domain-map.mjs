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
//  - resolveAccessor() now auto-derives from the generated Prisma model metadata when available,
//    falling back to ENTITY_ACCESSOR_OVERRIDES for edge cases (entities whose IR name doesn't
//    match any Prisma model key, or intentional overrides like QACheck).
//
// NOTE (consolidation, phase-out-registry.md §D): ENTITY_DOMAIN_MAP is currently duplicated in
// manifest/scripts/generate-all-routes.mjs and generate-route-manifest.ts (and a separate copy
// in packages/mcp-server/src/lib/entity-domain-map.ts). Those consumers should import from this
// module; that rewire is a follow-up. This module is the canonical home.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Load auto-generated Prisma model metadata (produced by generate-prisma-model-metadata.mjs).
// Keys are Prisma MODEL names; values include the Prisma client accessor.
// For ~172/202 IR entities the model key equals the IR entity name directly.
const here = dirname(fileURLToPath(import.meta.url));
let _prismaMetadata = null;
function loadPrismaMetadata() {
  if (_prismaMetadata) return _prismaMetadata;
  try {
    const jsonPath = join(here, "..", "runtime", "src", "generated", "prisma-model-metadata.generated.json");
    _prismaMetadata = JSON.parse(readFileSync(jsonPath, "utf8"));
  } catch {
    _prismaMetadata = {};
  }
  return _prismaMetadata;
}

// Bridge map: IR entity name → Prisma MODEL name for entities where the names differ.
// Used by resolveAccessor() to look up the correct metadata entry.
// Each entry verified against schema.prisma (constitution: never invent accessors).
const ENTITY_TO_PRISMA_MODEL = {
  EventImportWorkflow: "EventImport",      // model EventImport @@map("event_imports")
  BankAccount: "EmployeeBankAccount",       // model EmployeeBankAccount @@map("employee_bank_accounts")
  LogisticsRoute: "DeliveryRoute",          // model DeliveryRoute @@map("delivery_routes")
  Document: "documents",                    // snake_case model name
  SmsAutomationRule: "sms_automation_rules", // snake_case model name
  EventTimelineItem: "EventTimeline",       // model EventTimeline @map("event_timeline") — different name
  StorageLocation: "storage_locations",     // snake_case model name
  BulkCombineRule: "bulk_combine_rules",    // snake_case model name
  MethodVideo: "method_videos",             // snake_case model name
  PrepListImport: "prep_list_imports",       // snake_case model name
  QACorrectiveAction: "CorrectiveAction",   // PascalCase model CorrectiveAction (schema.prisma:5961)
  QATemperatureLog: "TemperatureLog",       // PascalCase model TemperatureLog (schema.prisma:5929)
  TaskBundleItem: "task_bundle_items",       // snake_case model name
  TaskBundle: "task_bundles",               // snake_case model name
  OpenShift: "open_shifts",                 // snake_case model name
};

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
//   EventImportWorkflow  model EventImport @@map("event_imports")
//                        (packages/database/prisma/schema.prisma:1437) →
//                        accessor `eventImport`. Confirmed by store header
//                        manifest/runtime/src/prisma-stores/broken-read-batch08-event-guest-import.ts
//                        ("EventImport (manifest entity \"EventImportWorkflow\") → tenant_events.event_imports").
// (This corrects the stale phase-out-registry.md claim that EventImportWorkflow "has no table by
//  design" — the event_imports table exists, so the route is REMAPPED, not deleted.)
// Hard overrides for entity accessor resolution.
//
// resolveAccessor() resolves most entities automatically via PRISMA_MODEL_METADATA
// (step 2) — the bridge map ENTITY_TO_PRISMA_MODEL handles IR-name→model-name translation,
// and the metadata JSON provides the PrismaClient accessor. Entities absent from both
// overrides AND metadata are auto-dropped (step 3).
//
// This table is reserved for cases the metadata path CANNOT handle:
//   - Semantic mismatches: a Prisma model exists but maps to a DIFFERENT domain concept.
//     The override forces a DROP to avoid inventing read semantics over a mismatched table.
//
// Previously contained 32 entries (15 accessor remaps + 17 drops). All 15 remaps and 16
// of the drops were made redundant by Task 0.3 (created Prisma models) + the metadata
// resolution path. Consolidated in Task 2.1.
export const ENTITY_ACCESSOR_OVERRIDES = {
  // QACheck: dedicated Prisma model added (tenant_kitchen.qa_checks, v0.12.216).
  //   Previously dropped because only QualityCheck existed (different concept — QC session with
  //   itemized QualityCheckItem children). The accessor `qACheck` now auto-resolves via metadata.
};

// Per-entity Prisma FIELD-name corrections for generated read routes.
//
// Why: the upstream nextjs projection emits `where: { tenantId, ... }` (shorthand) and
// `orderBy: { createdAt: "desc" }` assuming camelCase Prisma fields. A handful of LEGACY models use
// RAW snake_case fields (`tenant_id`, `created_at`) with no @map, or lack a created-at column
// entirely — so those literal field names are phantom and break api typecheck (TS2561 / TS2353).
// The fix belongs in the producer (regenerate), never by hand-editing the "DO NOT EDIT" routes.
//
// Value semantics per field key:
//   tenantId: "<col>"   → rewrite the `where` shorthand `tenantId` to `<col>: tenantId`.
//   createdAt: "<col>"  → rewrite the `orderBy` field `createdAt` to `<col>`.
//   createdAt: null     → the model has NO created-at column; remove the `orderBy` clause entirely.
//   deletedAt: "<col>"  → rewrite the `where` soft-delete field `deletedAt` to `<col>`.
//   deletedAt: null     → the model has NO soft-delete column; remove the `deletedAt: null` filter.
//
// Verified against packages/database/prisma/schema.prisma (2026-06-03):
//   tenant_id raw + created_at raw: EventFollowup, ActionMilestone, DisciplinaryAction,
//     OnboardingCompletion, OnboardingTask, PerformanceReview.
//   tenantId @map + created_at raw: ReorderSuggestion (where ok, orderBy needs rewrite).
//   no created-at column: ForecastInput (absent), InventoryForecast (uses last_updated).
// Soft-delete drift verified 2026-06-08:
//   raw `deleted_at` column: Document, SmsAutomationRule, StorageLocation, OnboardingTask, EventFollowup.
//   CrmScoringRule and EventFollowup now have deleted_at columns (added 2026-06-08).
export const ENTITY_FIELD_OVERRIDES = {
  EventFollowup: { tenantId: "tenant_id", createdAt: "created_at", deletedAt: "deleted_at" },
  ActionMilestone: { tenantId: "tenant_id", createdAt: "created_at" },
  DisciplinaryAction: { tenantId: "tenant_id", createdAt: "created_at" },
  OnboardingCompletion: { tenantId: "tenant_id", createdAt: "created_at" },
  OnboardingTask: { tenantId: "tenant_id", createdAt: "created_at", deletedAt: "deleted_at" },
  PerformanceReview: { tenantId: "tenant_id", createdAt: "created_at" },
  ReorderSuggestion: { createdAt: "created_at" },
  ForecastInput: { createdAt: null },
  InventoryForecast: { createdAt: null },
  SampleData: { createdAt: null },  // no created-at column; uses seededAt/clearedAt instead

  // Raw snake_case models reached via ENTITY_ACCESSOR_OVERRIDES above. Fixing the accessor
  // exposed that these models also use raw `tenant_id` + `created_at` (no @map). Verified
  // 2026-06-03 against schema.prisma (all 9 have raw tenant_id + created_at columns).
  Document: { tenantId: "tenant_id", createdAt: "created_at", deletedAt: "deleted_at" },
  SmsAutomationRule: { tenantId: "tenant_id", createdAt: "created_at", deletedAt: "deleted_at" },
  StorageLocation: { tenantId: "tenant_id", createdAt: "created_at", deletedAt: "deleted_at" },
  BulkCombineRule: { tenantId: "tenant_id", createdAt: "created_at" },
  MethodVideo: { tenantId: "tenant_id", createdAt: "created_at" },
  PrepListImport: { tenantId: "tenant_id", createdAt: "created_at" },
  TaskBundle: { tenantId: "tenant_id", createdAt: "created_at" },
  TaskBundleItem: { tenantId: "tenant_id", createdAt: "created_at" },
  OpenShift: { tenantId: "tenant_id", createdAt: "created_at" },
};

// Entities whose generated DETAIL route (`[id]/route.ts`, fetch-by-single-id) cannot be emitted
// because the backing Prisma model has NO single-column `id` (composite primary key only). The
// list route is still valid and kept; only the by-id detail route is dropped.
//   TaskBundleItem → model task_bundle_items @@id([tenant_id, bundle_id, task_id]) — no `id` column,
//     so `findFirst({ where: { id } })` references a phantom field. schema.prisma (tenant_kitchen).
export const ENTITY_DETAIL_DROP = new Set(["TaskBundleItem"]);

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
 *
 * Resolution order:
 *   1. Hard overrides (ENTITY_ACCESSOR_OVERRIDES) — edge cases like QACheck where
 *      the Prisma model exists but represents a DIFFERENT domain concept. Also serves
 *      as the drop list for entities with no table.
 *   2. Auto-derive from PRISMA_MODEL_METADATA — if a metadata entry exists for the
 *      entity (direct key or via ENTITY_TO_PRISMA_MODEL bridge), use its accessor.
 *   3. Fallback — assume naive camelCase(entityName) is correct.
 *
 * @param {string} entityName
 * @returns {{ naive: string, accessor: string|null, drop: boolean, overridden: boolean }}
 *   - naive: the accessor the upstream projection emitted (camelCase entity).
 *   - accessor: the correct accessor to use (null when the entity has no table).
 *   - drop: true when the route must not be emitted (no backing table).
 *   - overridden: true when accessor !== naive (a rewrite is required).
 */
export function resolveAccessor(entityName) {
  const naive = toCamelCase(entityName);

  // 1. Hard overrides take precedence (edge cases + drop list)
  if (Object.prototype.hasOwnProperty.call(ENTITY_ACCESSOR_OVERRIDES, entityName)) {
    const override = ENTITY_ACCESSOR_OVERRIDES[entityName];
    if (override === null) {
      return { naive, accessor: null, drop: true, overridden: false };
    }
    return { naive, accessor: override, drop: false, overridden: override !== naive };
  }

  // 2. Auto-derive from generated Prisma metadata
  const meta = loadPrismaMetadata();
  const modelKey = ENTITY_TO_PRISMA_MODEL[entityName] || entityName;
  const modelMeta = meta[modelKey];
  if (modelMeta) {
    const accessor = modelMeta.accessor;
    return { naive, accessor, drop: false, overridden: accessor !== naive };
  }

  // 3. No metadata entry — entity has no Prisma table, drop the route.
  //    This auto-handles new entities added to the IR without a matching Prisma model.
  return { naive, accessor: null, drop: true, overridden: false };
}

export function resolveDetailSegment(entityName) {
  return ENTITY_DETAIL_SEGMENT_OVERRIDES[entityName] ?? "id";
}

/**
 * Rewrite phantom Prisma field names in a generated read-route body for `entityName`,
 * per ENTITY_FIELD_OVERRIDES. No-op when the entity has no field overrides.
 * Only the exact shapes the upstream nextjs projection emits are matched:
 *   - `where: { tenantId, ... }` shorthand  → `where: { <col>: tenantId, ... }`
 *     (composite `tenantId_id:` and explicit `tenantId: x` are left untouched).
 *   - `orderBy: { createdAt: "desc" }`       → rename field, or remove the clause when null.
 * @param {string} content - generated route source
 * @param {string} entityName
 * @returns {{ content: string, rewrites: string[] }}
 */
export function applyFieldOverrides(content, entityName) {
  const overrides = entityName ? ENTITY_FIELD_OVERRIDES[entityName] : undefined;
  if (!overrides) return { content, rewrites: [] };
  let out = content;
  const rewrites = [];

  if (overrides.tenantId) {
    const before = out;
    out = out.replace(
      /(\n[^\S\n]*)tenantId(,?)(?=\s*\n)/g,
      `$1${overrides.tenantId}: tenantId$2`
    );
    if (out !== before) rewrites.push(`where.tenantId → ${overrides.tenantId}`);
  }

  if (overrides.createdAt === null) {
    const before = out;
    out = out.replace(
      /\n[^\S\n]*orderBy:\s*\{\s*createdAt:\s*"desc",?\s*\},?/g,
      ""
    );
    if (out !== before) {
      rewrites.push("orderBy.createdAt removed (no created-at column)");
    }
  } else if (overrides.createdAt) {
    const before = out;
    out = out.replace(
      /(orderBy:\s*\{\s*)createdAt(\s*:\s*"desc")/g,
      `$1${overrides.createdAt}$2`
    );
    if (out !== before) rewrites.push(`orderBy.createdAt → ${overrides.createdAt}`);
  }

  if (overrides.deletedAt === null) {
    // Model has NO soft-delete column → remove the `deletedAt: null` filter entirely.
    // It is always the last `where` property (no trailing comma), so dropping the line
    // leaves the preceding property's comma as a valid trailing comma before `}`.
    const before = out;
    out = out.replace(/\n[^\S\n]*deletedAt:\s*null,?/g, "");
    if (out !== before) {
      rewrites.push("where.deletedAt removed (no soft-delete column)");
    }
  } else if (overrides.deletedAt) {
    // Legacy snake_case model: rewrite the `where` soft-delete field name.
    const before = out;
    out = out.replace(
      /deletedAt(\s*:\s*null)/g,
      `${overrides.deletedAt}$1`
    );
    if (out !== before) rewrites.push(`where.deletedAt → ${overrides.deletedAt}`);
  }

  return { content: out, rewrites };
}
