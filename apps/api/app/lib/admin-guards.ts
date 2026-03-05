/**
 * Admin Guards
 *
 * Role-based authorization helpers for API routes.
 */

import type { CurrentUser } from "./tenant";

const ADMIN_ROLES = new Set(["admin", "manager"]);

/**
 * Check if a user has admin privileges.
 */
export function requireAdmin(user: CurrentUser | null): boolean {
  if (!user) {
    return false;
  }
  return ADMIN_ROLES.has(user.role);
}

/**
 * Check if a user has a specific role.
 */
export function hasRole(user: CurrentUser | null, role: string): boolean {
  if (!user) {
    return false;
  }
  return user.role === role;
}

/**
 * Check if a user has any of the specified roles.
 */
export function hasAnyRole(user: CurrentUser | null, roles: string[]): boolean {
  if (!user) {
    return false;
  }
  return roles.includes(user.role);
}

/**
 * Get all admin roles.
 */
export function getAdminRoles(): ReadonlySet<string> {
  return ADMIN_ROLES;
}
