"use server";

/**
 * Governed Menu lifecycle transitions (Manifest publication workflow).
 * Do not toggle isActive via Menu.update — status commands own that field.
 */

import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireCurrentUser, requireTenantId } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import {
  type MenuLifecycleActionResult,
  type MenuLifecycleStatus,
  normalizeMenuStatus,
} from "./menu-lifecycle";

const revalidateMenuPaths = (menuId: string) => {
  revalidatePath("/kitchen/recipes");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
  revalidatePath(`/kitchen/recipes/menus/${menuId}/edit`);
};

const loadMenu = async (menuId: string, tenantId: string) =>
  database.menu.findFirst({
    where: { tenantId, id: menuId, deletedAt: null },
    select: { id: true, name: true, status: true, isActive: true },
  });

const failure = (
  existing: { id: string; name: string; isActive: boolean },
  error: string,
  constraintOutcomes?: MenuLifecycleActionResult["constraintOutcomes"]
): MenuLifecycleActionResult => ({
  success: false,
  constraintOutcomes,
  menuId: existing.id,
  name: existing.name,
  isActive: existing.isActive,
  error,
});

const success = (
  existing: { id: string; name: string },
  isActive: boolean,
  constraintOutcomes?: MenuLifecycleActionResult["constraintOutcomes"]
): MenuLifecycleActionResult => ({
  success: true,
  constraintOutcomes,
  menuId: existing.id,
  name: existing.name,
  isActive,
});

async function runLifecycleCommand(
  menuId: string,
  command: "markPublished" | "unpublish" | "archive" | "restore",
  body: Record<string, unknown>,
  allowedFrom: MenuLifecycleStatus[],
  wrongStateMessage: string,
  nextIsActive: boolean
): Promise<MenuLifecycleActionResult> {
  const tenantId = await requireTenantId();
  const user = await requireCurrentUser();
  const existing = await loadMenu(menuId, tenantId);

  if (!existing) {
    return { success: false, error: "Menu not found." };
  }

  const status = normalizeMenuStatus(existing.status);
  if (!allowedFrom.includes(status)) {
    return failure(existing, wrongStateMessage);
  }

  const result = await runManifestCommand({
    entity: "Menu",
    command,
    instanceId: menuId,
    body: { id: menuId, ...body },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    return failure(
      existing,
      result.message || `Failed to ${command} menu`,
      result.constraintOutcomes
    );
  }

  revalidateMenuPaths(menuId);
  return success(existing, nextIsActive, result.constraintOutcomes);
}

/** draft → published */
export async function publishMenuManifest(
  menuId: string
): Promise<MenuLifecycleActionResult> {
  const user = await requireCurrentUser();
  return await runLifecycleCommand(
    menuId,
    "markPublished",
    { publishedBy: user.id },
    ["draft"],
    "Only a draft menu can be published.",
    true
  );
}

/** published → draft */
export async function unpublishMenuManifest(
  menuId: string,
  reason?: string
): Promise<MenuLifecycleActionResult> {
  return await runLifecycleCommand(
    menuId,
    "unpublish",
    { reason: reason || "Unpublished via menu management" },
    ["published"],
    "Only a published menu can be unpublished.",
    true
  );
}

/** draft|published → archived */
export async function archiveMenuManifest(
  menuId: string,
  reason?: string
): Promise<MenuLifecycleActionResult> {
  return await runLifecycleCommand(
    menuId,
    "archive",
    { reason: reason || "Archived via menu management" },
    ["draft", "published"],
    "Menu must be draft or published to archive.",
    false
  );
}

/** archived → draft */
export async function restoreMenuManifest(
  menuId: string,
  reason?: string
): Promise<MenuLifecycleActionResult> {
  return await runLifecycleCommand(
    menuId,
    "restore",
    { reason: reason || "Restored via menu management" },
    ["archived"],
    "Only an archived menu can be restored.",
    true
  );
}
