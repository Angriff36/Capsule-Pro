/**
 * Single accessor + field resolution for Manifest read routes.
 *
 * Authority chain (no duplicate maps elsewhere):
 *   1. manifest.config.yaml → entityToPrismaModel + accessorNames (getAccessorConfig)
 *   2. prisma-model-metadata.generated.json (live schema delegates)
 *   3. ENTITY_ACCESSOR_OVERRIDES — semantic edge cases only (empty unless needed)
 *   4. ENTITY_FIELD_OVERRIDES — legacy snake_case columns (until schema @map cleanup)
 *
 * Consumed by: generate.mjs (route post-process), generate-entity-accessor.mjs (API TS emit),
 *   derive-prisma-options.mjs (via config, not hardcoded overrides).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAccessorConfig } from "./read-config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const _accessorConfig = getAccessorConfig();

export const ENTITY_TO_PRISMA_MODEL = _accessorConfig.entityToPrismaModel;
export const CONFIG_ACCESSOR_NAMES = _accessorConfig.accessorNames;

let _prismaMetadata = null;
function loadPrismaMetadata() {
  if (_prismaMetadata) {
    return _prismaMetadata;
  }
  const jsonPath = join(
    here,
    "..",
    "runtime",
    "src",
    "generated",
    "prisma-model-metadata.generated.json"
  );
  try {
    _prismaMetadata = JSON.parse(readFileSync(jsonPath, "utf8"));
  } catch (error) {
    // FAIL LOUD: an unreadable metadata file must never silently resolve
    // every entity to drop:true (2026-07-04 incident — a missed path repoint
    // regenerated entity-accessor with 208/213 entities dropped).
    throw new Error(
      `[accessor-resolution] cannot read ${jsonPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (Object.keys(_prismaMetadata).length === 0) {
    throw new Error(
      `[accessor-resolution] ${jsonPath} is empty — refusing to resolve (would drop every entity)`
    );
  }
  return _prismaMetadata;
}

export function toCamelCase(value) {
  if (!value) {
    return value;
  }
  return value[0].toLowerCase() + value.slice(1);
}

/** Semantic mismatches only — remaps live in manifest.config.yaml accessorNames. */
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

/**
 * @param {string} entityName
 * @returns {{ naive: string, accessor: string|null, drop: boolean, overridden: boolean }}
 */
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

  const meta = loadPrismaMetadata();
  const modelKey = ENTITY_TO_PRISMA_MODEL[entityName] || entityName;
  const modelMeta = meta[modelKey];
  if (modelMeta) {
    const accessor = modelMeta.accessor;
    return { naive, accessor, drop: false, overridden: accessor !== naive };
  }

  return { naive, accessor: null, drop: true, overridden: false };
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

/** Build API/runtime EntityResolution shape from resolveAccessor + field overrides. */
export function resolveEntityResolution(entityName) {
  const acc = resolveAccessor(entityName);
  const fields = ENTITY_FIELD_OVERRIDES[entityName];
  const meta = loadPrismaMetadata();
  const modelKey = ENTITY_TO_PRISMA_MODEL[entityName] || entityName;
  const hasDeletedAt =
    fields?.deletedAt === null
      ? false
      : fields?.deletedAt
        ? true
        : Boolean(meta[modelKey]?.hasDeletedAt);

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
    softDeleteField: hasDeletedAt ? (fields?.deletedAt ?? "deletedAt") : null,
  };
}
