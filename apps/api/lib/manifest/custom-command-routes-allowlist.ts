/**
 * Non-dispatcher command routes with real custom behavior.
 *
 * These paths live under app/api/.../commands/.../route.ts but are NOT thin
 * Manifest forwards. They must not be deleted in favor of the dynamic
 * dispatcher without re-homing their custom logic.
 *
 * Audit tooling (dispatcher-architecture.test.ts, route-conformance scan)
 * references this list. THIN_WRAPPER routes should be removed, not listed here.
 */

/** Relative to apps/api/app/api/ (forward slashes). */
export const CUSTOM_COMMAND_ROUTE_ALLOWLIST = [
  // Budget/actual aggregation + direct Prisma update (not a manifest command)
  "events/profitability/commands/recalculate/route.ts",
  // PO status FSM with direct SQL (legacy procurement surface)
  "procurement/purchase-orders/commands/update-status/route.ts",
  "procurement/purchase-orders/commands/receive/route.ts",
  // Kitchen dish create: governed Manifest constraint check + direct SQL persist + outbox event
  "kitchen/dishes/commands/create/route.ts",
  // Kitchen prep-list create: custom orchestration with Manifest constraint evaluation
  "kitchen/prep-lists/commands/create/route.ts",
] as const;

export function isCustomCommandRoute(relativeApiPath: string): boolean {
  const normalized = relativeApiPath.replace(/\\/g, "/");
  return (CUSTOM_COMMAND_ROUTE_ALLOWLIST as readonly string[]).includes(
    normalized
  );
}
