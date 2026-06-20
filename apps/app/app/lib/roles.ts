/**
 * Client-safe role tiers + helpers for UI permission gating.
 *
 * Mirrors the server guard tiers used by `auth-guards.ts` (which imports these
 * sets), but carries NO `server-only` marker so client components can DIM and
 * EXPLAIN restricted actions instead of hiding them. This is presentation only —
 * the authoritative check stays server-side (constitution §4: the UI orchestrates;
 * the runtime/route guards govern). Keep these tiers in sync with
 * `apps/api/app/lib/auth-roles.ts`.
 */

export const ADMIN_ROLES = new Set(["super_admin", "tenant_admin", "admin"]);

export const MANAGER_ROLES = new Set([
  "super_admin",
  "tenant_admin",
  "admin",
  "finance_manager",
  "operations_manager",
  "staff_manager",
]);

export type RoleTier = "admin" | "manager";

/** Whether `role` satisfies the given tier. Unknown/absent role never qualifies. */
export function meetsRole(role: string | undefined, tier: RoleTier): boolean {
  if (!role) {
    return false;
  }
  return tier === "admin" ? ADMIN_ROLES.has(role) : MANAGER_ROLES.has(role);
}

/** Human label for a tier, used in "Requires {label} role to …" copy. */
export function roleTierLabel(tier: RoleTier): string {
  return tier === "admin" ? "Admin" : "Manager";
}
