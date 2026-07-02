// Capsule domain routing for the Manifest nextjs route projection.
//
// D24 REMEDIATION (DONE): route paths are now driven natively by
// `projections.nextjs.options.routeSegments` in manifest.config.yaml — the
// staging-remap pipeline in generate.mjs is gone. ENTITY_DOMAIN_MAP below is
// DERIVED from that config block (single source of truth) and re-exported for
// the client/hook generators (generate-capsule-client.mjs,
// generate-react-query-hooks.mjs) via resolveClientChunk.
//
// Accessor naming is NOT here — see manifest.config.yaml + accessor-resolution.mjs.

export {
  applyFieldOverrides,
  CONFIG_ACCESSOR_NAMES,
  ENTITY_ACCESSOR_OVERRIDES,
  ENTITY_DETAIL_DROP,
  ENTITY_DETAIL_SEGMENT_OVERRIDES,
  ENTITY_FIELD_OVERRIDES,
  ENTITY_TO_PRISMA_MODEL,
  resolveAccessor,
  resolveDetailSegment,
  toCamelCase,
} from "./accessor-resolution.mjs";
import { readConfig } from "./read-config.mjs";

// Entity → domain path, DERIVED from config routeSegments (single source of truth).
// Consumed here by resolveClientChunk + iterated by generate-capsule-client.mjs.
export const ENTITY_DOMAIN_MAP =
  readConfig().projections?.nextjs?.options?.routeSegments ?? {};

// Reverse map: flat entity path segment → original entity name (upstream CLI emits lowercase).
export const FLAT_SEGMENT_TO_ENTITY = {};
for (const entity of Object.keys(ENTITY_DOMAIN_MAP)) {
  FLAT_SEGMENT_TO_ENTITY[entity.toLowerCase()] = entity;
}

// ─── Generated-client domain partitioning ───────────────────────────────────
//
// The generated Capsule client (~1054 command callers + list/get reads across
// 188 entities) is partitioned into domain-scoped chunks so route-based layouts
// ship only their domain's code instead of the whole monolith.
//
// ROUTE_SEGMENT → CLIENT CHUNK consolidation. The first path segment of each
// ENTITY_DOMAIN_MAP value is the route segment; this map folds the 19 route
// segments into 7 client chunks (6 role-scoped domains + a shared `core` for
// cross-domain primitives). Command-board folds into `events` because
// CommandBoard* IS the event tree (AGENTS.md BOARD disambiguation).
//
// Consumed by generate-capsule-client.mjs + generate-react-query-hooks.mjs.
// Keep ordered by (chunk, segment) for deterministic chunk iteration.
export const CLIENT_DOMAIN_MAP = {
  kitchen: "kitchen",
  events: "events",
  "command-board": "events",
  crm: "crm",
  accounting: "finance",
  payroll: "finance",
  staff: "staffing",
  timecards: "staffing",
  training: "staffing",
  inventory: "logistics",
  procurement: "logistics",
  shipments: "logistics",
  logistics: "logistics",
  facilities: "logistics",
  collaboration: "core",
  communications: "core",
  administrative: "core",
  settings: "core",
  rolepolicy: "core",
};

// Ordered list of client chunk names (deterministic generation order).
export const CLIENT_CHUNKS = [
  "core",
  "events",
  "kitchen",
  "finance",
  "staffing",
  "crm",
  "logistics",
];

// Resolve the client chunk for a given entity by looking up its route domain.
export function resolveClientChunk(entity) {
  const routeDomain = ENTITY_DOMAIN_MAP[entity];
  if (!routeDomain) {
    return "core";
  }
  const segment = routeDomain.split("/")[0];
  return CLIENT_DOMAIN_MAP[segment] ?? "core";
}
