/**
 * Generic Manifest read routes — resolver generated from manifest.config.yaml + schema.
 * DO NOT add hand-maintained accessor maps here.
 */
export {
  buildOrderBy,
  buildTenantWhere,
  resolveEntityAccessor,
  type EntityResolution,
} from "@repo/manifest-runtime/entity-accessor";
