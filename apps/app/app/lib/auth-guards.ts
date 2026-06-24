import "server-only";

import { notFound } from "next/navigation";
import { ADMIN_ROLES, MANAGER_ROLES } from "./roles";
import { requireCurrentUser } from "./tenant";

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
