/**
 * Re-exports ENTITY_DOMAIN_MAP from the canonical source at
 * manifest/scripts/entity-domain-map.mjs (189 entries).
 *
 * Previously maintained as a stale copy (90/189 entries). All consumers
 * should use the canonical map to avoid drift.
 */

// Dynamic import to avoid TS module resolution issues with .mjs
// The canonical map has 189 entries covering all IR entities.
/* eslint-disable @typescript-eslint/no-var-requires */
const canonical = require("../../../../manifest/scripts/entity-domain-map.mjs") as {
  ENTITY_DOMAIN_MAP: Record<string, string>;
};
export const ENTITY_DOMAIN_MAP = canonical.ENTITY_DOMAIN_MAP;
