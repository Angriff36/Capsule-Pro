import "server-only";

import { notFound } from "next/navigation";
import { requireCurrentUser } from "./tenant";

const ADMIN_ROLES = new Set([
  "super_admin",
  "tenant_admin",
  "admin",
]);

const MANAGER_ROLES = new Set([
  "super_admin",
  "tenant_admin",
  "admin",
  "finance_manager",
  "operations_manager",
  "staff_manager",
]);

export async function requireAdminUser() {
  const user = await requireCurrentUser();
  if (!ADMIN_ROLES.has(user.role)) {
    notFound();
  }
  return user;
}

export async function requireManagerUser() {
  const user = await requireCurrentUser();
  if (!MANAGER_ROLES.has(user.role)) {
    notFound();
  }
  return user;
}
