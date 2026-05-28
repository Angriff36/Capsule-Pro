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
  // createInstance persistence after guarded runCommand
  "communications/email-templates/commands/create/route.ts",
  // Budget/actual aggregation + direct Prisma update (not a manifest command)
  "events/profitability/commands/recalculate/route.ts",
  // PO status FSM with direct SQL (legacy procurement surface)
  "procurement/purchase-orders/commands/update-status/route.ts",
  "procurement/purchase-orders/commands/receive/route.ts",
  // Cross-entity shift validation before manifest create/update
  "staff/shifts/commands/create-validated/route.ts",
  "staff/shifts/commands/update-validated/route.ts",
] as const;

export function isCustomCommandRoute(relativeApiPath: string): boolean {
  const normalized = relativeApiPath.replace(/\\/g, "/");
  return (CUSTOM_COMMAND_ROUTE_ALLOWLIST as readonly string[]).includes(
    normalized
  );
}
