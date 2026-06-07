/**
 * Entity-to-Prisma accessor resolution for generic read routes.
 *
 * This is the TypeScript runtime equivalent of the canonical
 * ENTITY_ACCESSOR_OVERRIDES / ENTITY_FIELD_OVERRIDES / ENTITY_DETAIL_DROP
 * maps in manifest/scripts/entity-domain-map.mjs.
 *
 * Single source of truth for generic route accessors lives in
 * entity-domain-map.mjs; this file mirrors the values so the API
 * server can resolve them without an ESM dynamic-import.
 */

import { database } from "@repo/database";

// ─────────────────────────────────────────────────────────────
// Accessor overrides (entity → Prisma client delegate name)
// ─────────────────────────────────────────────────────────────

/** Entity names whose Prisma accessor differs from naive camelCase, or null to drop (no table). */
const ENTITY_ACCESSOR_OVERRIDES: Record<string, string | null> = {
  // Remaps — accessor name mismatches (Prisma's own "Did you mean" suggestions)
  EventStaff: "eventStaff",
  EventImportWorkflow: "eventImport",
  BankAccount: "employeeBankAccount",
  LogisticsRoute: "deliveryRoute",
  Document: "documents",
  SmsAutomationRule: "sms_automation_rules",
  EventTimelineItem: "eventTimeline",
  StorageLocation: "storage_locations",
  BulkCombineRule: "bulk_combine_rules",
  MethodVideo: "method_videos",
  PrepListImport: "prep_list_imports",
  QACorrectiveAction: "correctiveAction",
  QATemperatureLog: "temperatureLog",
  TaskBundleItem: "task_bundle_items",
  TaskBundle: "task_bundles",
  OpenShift: "open_shifts",

  // Drops — no backing Prisma model (route should return 404)
  Deal: null,
  AiEventSetupSession: null,
  AutomatedFollowup: null,
  EntityVersion: null,
  EventWaitlistEntry: null,
  FacilitySchedule: null,
  FacilityWorkOrder: null,
  LogisticsDispatch: null,
  PerformancePrediction: null,
  SampleData: null,
  StaffPerformance: null,
  VersionApproval: null,
  VersionedEntity: null,
  WorkforceOptimization: null,
  Budget: null,
  Vendor: null,
  QACheck: null,
};

// ─────────────────────────────────────────────────────────────
// Field overrides (raw snake_case models without @map)
// ─────────────────────────────────────────────────────────────

/**
 * Models that use raw snake_case column names (no @map).
 * Prisma field names match the database columns, so `tenantId` → `tenant_id`.
 * Keyed by entity name; value maps the canonical camelCase name to the actual Prisma field.
 */
const ENTITY_FIELD_OVERRIDES: Record<string, Record<string, string | null>> = {
  Document: { tenantId: "tenant_id", createdAt: "created_at" },
  SmsAutomationRule: { tenantId: "tenant_id", createdAt: "created_at" },
  StorageLocation: { tenantId: "tenant_id", createdAt: "created_at" },
  BulkCombineRule: { tenantId: "tenant_id", createdAt: "created_at" },
  MethodVideo: { tenantId: "tenant_id", createdAt: "created_at" },
  PrepListImport: { tenantId: "tenant_id", createdAt: "created_at" },
  TaskBundle: { tenantId: "tenant_id", createdAt: "created_at" },
  TaskBundleItem: { tenantId: "tenant_id", createdAt: "created_at" },
  OpenShift: { tenantId: "tenant_id", createdAt: "created_at" },
};

// Models that have no `createdAt` column at all (absent from schema).
const ENTITY_NO_CREATED_AT = new Set([
  "ForecastInput",
  "InventoryForecast",
]);

// ─────────────────────────────────────────────────────────────
// Detail route drop (composite PK, no single `id` column)
// ─────────────────────────────────────────────────────────────

const ENTITY_DETAIL_DROP = new Set(["TaskBundleItem"]);

// ─────────────────────────────────────────────────────────────
// Resolution helpers
// ─────────────────────────────────────────────────────────────

export interface EntityResolution {
  /** Prisma client delegate name (e.g. "event", "eventStaffAssignment") */
  accessor: string;
  /** Whether the accessor exists on PrismaClient */
  exists: boolean;
  /** Whether this entity should be dropped (no backing table) */
  drop: boolean;
  /** Whether detail (by-id) route is supported */
  hasDetail: boolean;
  /** Correct field name for tenantId in this model's where clause */
  tenantIdField: string;
  /** Correct field name for createdAt in this model's orderBy, or null if absent */
  createdAtField: string | null;
}

/**
 * Resolve how a generic read route should access Prisma for `entityName`.
 * Mirrors resolveAccessor() from entity-domain-map.mjs but adds field-level info.
 */
export function resolveEntityAccessor(entityName: string): EntityResolution {
  // 1. Check overrides
  if (entityName in ENTITY_ACCESSOR_OVERRIDES) {
    const override = ENTITY_ACCESSOR_OVERRIDES[entityName];
    if (override === null) {
      return {
        accessor: "",
        exists: false,
        drop: true,
        hasDetail: false,
        tenantIdField: "tenantId",
        createdAtField: null,
      };
    }
    const exists = override in database;
    const fieldOverrides = ENTITY_FIELD_OVERRIDES[entityName];
    return {
      accessor: override,
      exists,
      drop: false,
      hasDetail: !ENTITY_DETAIL_DROP.has(entityName),
      tenantIdField: fieldOverrides?.tenantId ?? "tenantId",
      createdAtField: ENTITY_NO_CREATED_AT.has(entityName)
        ? null
        : (fieldOverrides?.createdAt ?? "createdAt"),
    };
  }

  // 2. Default: camelCase of entity name
  const accessor = entityName.charAt(0).toLowerCase() + entityName.slice(1);
  const exists = accessor in database;
  const fieldOverrides = ENTITY_FIELD_OVERRIDES[entityName];

  return {
    accessor,
    exists,
    drop: !exists,
    hasDetail: !ENTITY_DETAIL_DROP.has(entityName),
    tenantIdField: fieldOverrides?.tenantId ?? "tenantId",
    createdAtField: ENTITY_NO_CREATED_AT.has(entityName)
      ? null
      : (fieldOverrides?.createdAt ?? "createdAt"),
  };
}

/**
 * Build a Prisma `where` clause for tenant-scoped reads.
 * Handles both camelCase and raw snake_case models.
 */
export function buildTenantWhere(
  entityName: string,
  tenantId: string,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const resolution = resolveEntityAccessor(entityName);
  const where: Record<string, unknown> = {
    [resolution.tenantIdField]: tenantId,
    deletedAt: null,
    ...extra,
  };
  return where;
}

/**
 * Build a Prisma `orderBy` clause. Returns empty object if entity has no createdAt.
 */
export function buildOrderBy(entityName: string): Record<string, string> {
  const resolution = resolveEntityAccessor(entityName);
  if (!resolution.createdAtField) return {};
  return { [resolution.createdAtField]: "desc" as const };
}
