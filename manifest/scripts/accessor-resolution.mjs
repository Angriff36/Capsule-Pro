/**
 * Accessor + field resolution for legacy Next.js read-route generation.
 * Config-driven only — no Prisma schema metadata.
 */

import { getAccessorConfig } from "./read-config.mjs";

const _accessorConfig = getAccessorConfig();

export const ENTITY_TO_PRISMA_MODEL = _accessorConfig.entityToPrismaModel;
export const CONFIG_ACCESSOR_NAMES = _accessorConfig.accessorNames;

export function toCamelCase(value) {
  if (!value) {
    return value;
  }
  return value[0].toLowerCase() + value.slice(1);
}

export const ENTITY_ACCESSOR_OVERRIDES = {};

export const ENTITY_FIELD_OVERRIDES = {
  EventFollowup: {
    tenantId: "tenant_id",
    createdAt: "created_at",
    deletedAt: "deleted_at",
  },
  ActionMilestone: { tenantId: "tenant_id", createdAt: "created_at" },
  DisciplinaryAction: { tenantId: "tenant_id", createdAt: "created_at" },
  OnboardingCompletion: { tenantId: "tenant_id", createdAt: "created_at" },
  OnboardingTask: {
    tenantId: "tenant_id",
    createdAt: "created_at",
    deletedAt: "deleted_at",
  },
  PerformanceReview: { tenantId: "tenant_id", createdAt: "created_at" },
  ReorderSuggestion: { createdAt: "created_at" },
  ForecastInput: { createdAt: null },
  InventoryForecast: { createdAt: null },
  SampleData: { createdAt: null },
  Document: {
    tenantId: "tenant_id",
    createdAt: "created_at",
    deletedAt: "deleted_at",
  },
  SmsAutomationRule: {
    tenantId: "tenant_id",
    createdAt: "created_at",
    deletedAt: "deleted_at",
  },
  StorageLocation: {
    tenantId: "tenant_id",
    createdAt: "created_at",
    deletedAt: "deleted_at",
  },
  BulkCombineRule: { tenantId: "tenant_id", createdAt: "created_at" },
  MethodVideo: { tenantId: "tenant_id", createdAt: "created_at" },
  PrepListImport: { tenantId: "tenant_id", createdAt: "created_at" },
  TaskBundle: { tenantId: "tenant_id", createdAt: "created_at" },
  TaskBundleItem: { tenantId: "tenant_id", createdAt: "created_at" },
  OpenShift: { tenantId: "tenant_id", createdAt: "created_at" },
};

export const ENTITY_DETAIL_DROP = new Set(["TaskBundleItem"]);

export const ENTITY_DETAIL_SEGMENT_OVERRIDES = {
  AdminChatThread: "threadId",
  EventImport: "importId",
};

export function resolveAccessor(entityName) {
  const naive = toCamelCase(entityName);

  if (Object.hasOwn(ENTITY_ACCESSOR_OVERRIDES, entityName)) {
    const override = ENTITY_ACCESSOR_OVERRIDES[entityName];
    if (override === null) {
      return { naive, accessor: null, drop: true, overridden: false };
    }
    return {
      naive,
      accessor: override,
      drop: false,
      overridden: override !== naive,
    };
  }

  if (Object.hasOwn(CONFIG_ACCESSOR_NAMES, entityName)) {
    const accessor = CONFIG_ACCESSOR_NAMES[entityName];
    return { naive, accessor, drop: false, overridden: accessor !== naive };
  }

  return { naive, accessor: naive, drop: false, overridden: false };
}

export function resolveDetailSegment(entityName) {
  return ENTITY_DETAIL_SEGMENT_OVERRIDES[entityName] ?? "id";
}

export function applyFieldOverrides(content, entityName) {
  const overrides = entityName ? ENTITY_FIELD_OVERRIDES[entityName] : undefined;
  if (!overrides) {
    return { content, rewrites: [] };
  }
  let out = content;
  const rewrites = [];

  if (overrides.tenantId) {
    const before = out;
    out = out.replace(
      /(\n[^\S\n]*)tenantId(,?)(?=\s*\n)/g,
      `$1${overrides.tenantId}: tenantId$2`
    );
    if (out !== before) {
      rewrites.push(`where.tenantId → ${overrides.tenantId}`);
    }
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
    if (out !== before) {
      rewrites.push(`orderBy.createdAt → ${overrides.createdAt}`);
    }
  }

  if (overrides.deletedAt === null) {
    const before = out;
    out = out.replace(/\n[^\S\n]*deletedAt:\s*null,?/g, "");
    if (out !== before) {
      rewrites.push("where.deletedAt removed (no soft-delete column)");
    }
  } else if (overrides.deletedAt) {
    const before = out;
    out = out.replace(/deletedAt(\s*:\s*null)/g, `${overrides.deletedAt}$1`);
    if (out !== before) {
      rewrites.push(`where.deletedAt → ${overrides.deletedAt}`);
    }
  }

  return { content: out, rewrites };
}

export function resolveEntityResolution(entityName) {
  const acc = resolveAccessor(entityName);
  const fields = ENTITY_FIELD_OVERRIDES[entityName];
  const hasDeletedAt = fields?.deletedAt !== null;

  if (acc.drop || !acc.accessor) {
    return {
      accessor: "",
      exists: false,
      drop: true,
      hasDetail: false,
      tenantIdField: fields?.tenantId ?? "tenantId",
      createdAtField: null,
      softDeleteField: null,
    };
  }

  let createdAtField = "createdAt";
  if (fields?.createdAt === null) {
    createdAtField = null;
  } else if (fields?.createdAt) {
    createdAtField = fields.createdAt;
  }

  return {
    accessor: acc.accessor,
    exists: true,
    drop: false,
    hasDetail: !ENTITY_DETAIL_DROP.has(entityName),
    tenantIdField: fields?.tenantId ?? "tenantId",
    createdAtField,
    softDeleteField: hasDeletedAt
      ? (fields?.deletedAt ?? "deletedAt")
      : null,
  };
}
