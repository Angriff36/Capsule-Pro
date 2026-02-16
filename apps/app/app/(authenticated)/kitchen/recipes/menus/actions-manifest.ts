"use server";

import { randomUUID } from "node:crypto";
import type { ConstraintOutcome, OverrideRequest } from "@manifest/runtime/ir";
import type { Prisma } from "@repo/database";
import { database } from "@repo/database";
import {
  activateMenu,
  createMenu,
  createMenuRuntime,
  deactivateMenu,
  type KitchenOpsContext,
  updateMenu,
} from "@repo/manifest-adapters";
import { revalidatePath } from "next/cache";
import { requireCurrentUser, requireTenantId } from "../../../../lib/tenant";

// ============ Helper Functions ============

const parseNumber = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Result of a menu action with constraint outcomes
 */
export interface MenuManifestActionResult {
  success: boolean;
  constraintOutcomes?: ConstraintOutcome[];
  overrideRequests?: OverrideRequest[];
  redirectUrl?: string;
  error?: string;
  menuId?: string;
  name?: string;
  isActive?: boolean;
}

/**
 * Create a runtime context for menu operations.
 *
 * Uses requireCurrentUser() which auto-provisions the User record
 * if the Clerk user doesn't have one in this tenant yet.
 */
async function createMenuRuntimeContext(): Promise<KitchenOpsContext> {
  const currentUser = await requireCurrentUser();

  return {
    tenantId: currentUser.tenantId,
    userId: currentUser.id,
    userRole: currentUser.role ?? "kitchen_staff",
  };
}

/**
 * Create override requests from constraint outcomes
 */
function createOverrideRequests(
  outcomes: ConstraintOutcome[],
  reason: string,
  userId: string
): OverrideRequest[] {
  return outcomes.map((outcome) => ({
    constraintCode: outcome.code,
    reason,
    authorizedBy: userId,
    timestamp: Date.now(),
  }));
}

// ============ Public Actions ============

/**
 * Create a new menu using Manifest runtime for constraint checking.
 *
 * This action:
 * 1. Validates the menu input
 * 2. Creates the menu through Manifest runtime
 * 3. Persists to Prisma database
 * 4. Returns constraint outcomes for UI handling
 */
export async function createMenuManifest(
  formData: FormData
): Promise<MenuManifestActionResult> {
  const tenantId = await requireTenantId();

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    return { success: false, error: "Menu name is required." };
  }

  const description = String(formData.get("description") || "").trim() || null;
  const category = String(formData.get("category") || "").trim() || null;
  const basePrice = parseNumber(formData.get("basePrice")) ?? 0;
  const pricePerPerson = parseNumber(formData.get("pricePerPerson")) ?? 0;
  const minGuests = parseNumber(formData.get("minGuests")) ?? 0;
  const maxGuests = parseNumber(formData.get("maxGuests")) ?? 0;

  // Create runtime context
  const runtimeContext = await createMenuRuntimeContext();
  const runtime = await createMenuRuntime(runtimeContext);

  // Create the menu through Manifest runtime
  const menuId = randomUUID();
  const result = await createMenu(
    runtime,
    menuId,
    name,
    description ?? "",
    category ?? "",
    basePrice,
    pricePerPerson,
    minGuests,
    maxGuests
  );

  // Check for blocking constraints
  const blockingConstraints = result.constraintOutcomes?.filter(
    (c) => !c.passed && c.severity === "block"
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    return {
      success: false,
      constraintOutcomes: result.constraintOutcomes,
      menuId,
      name,
    };
  }

  // Persist to Prisma
  await database.menu.create({
    data: {
      tenantId,
      id: menuId,
      name,
      description,
      category,
      isActive: true,
      basePrice: basePrice > 0 ? basePrice : null,
      pricePerPerson: pricePerPerson > 0 ? pricePerPerson : null,
      minGuests: minGuests > 0 ? minGuests : null,
      maxGuests: maxGuests > 0 ? maxGuests : null,
    },
  });

  // Emit events to outbox
  for (const event of result.emittedEvents) {
    await database.outboxEvent.create({
      data: {
        tenantId,
        id: randomUUID(),
        eventType: event.name,
        payload: event.payload as Prisma.InputJsonValue,
        aggregateId: menuId,
        aggregateType: "Menu",
      },
    });
  }

  revalidatePath("/kitchen/menus");

  return {
    success: true,
    constraintOutcomes: result.constraintOutcomes,
    menuId,
    name,
    isActive: true,
    redirectUrl: `/kitchen/menus/${menuId}`,
  };
}

/**
 * Create a menu with constraint override support
 */
export async function createMenuWithOverride(
  formData: FormData,
  reason: string,
  details: string
): Promise<MenuManifestActionResult> {
  const runtimeContext = await createMenuRuntimeContext();

  // First run without overrides to get constraint outcomes
  const initialResult = await createMenuManifest(formData);

  if (!initialResult.success && initialResult.constraintOutcomes) {
    // Create override requests from the blocking constraints
    const _overrideRequests = createOverrideRequests(
      initialResult.constraintOutcomes.filter(
        (c) => !c.passed && c.severity === "block"
      ),
      `${reason}: ${details}`,
      runtimeContext.userId
    );

    // Re-run with overrides
    const runtime = await createMenuRuntime(runtimeContext);

    const name = String(formData.get("name") || "").trim();
    const description =
      String(formData.get("description") || "").trim() || null;
    const category = String(formData.get("category") || "").trim() || null;
    const basePrice = parseNumber(formData.get("basePrice")) ?? 0;
    const pricePerPerson = parseNumber(formData.get("pricePerPerson")) ?? 0;
    const minGuests = parseNumber(formData.get("minGuests")) ?? 0;
    const maxGuests = parseNumber(formData.get("maxGuests")) ?? 0;
    const menuId = initialResult.menuId ?? randomUUID();

    const result = await createMenu(
      runtime,
      menuId,
      name,
      description ?? "",
      category ?? "",
      basePrice,
      pricePerPerson,
      minGuests,
      maxGuests
    );

    // Persist to Prisma
    const tenantId = await requireTenantId();
    await database.menu.create({
      data: {
        tenantId,
        id: menuId,
        name,
        description,
        category,
        isActive: true,
        basePrice: basePrice > 0 ? basePrice : null,
        pricePerPerson: pricePerPerson > 0 ? pricePerPerson : null,
        minGuests: minGuests > 0 ? minGuests : null,
        maxGuests: maxGuests > 0 ? maxGuests : null,
      },
    });

    revalidatePath("/kitchen/menus");

    return {
      success: true,
      constraintOutcomes: result.constraintOutcomes,
      menuId,
      name,
      isActive: true,
      redirectUrl: `/kitchen/menus/${menuId}`,
    };
  }

  return initialResult;
}

/**
 * Update a menu using Manifest runtime for constraint checking.
 */
export async function updateMenuManifest(
  menuId: string,
  formData: FormData
): Promise<MenuManifestActionResult> {
  const tenantId = await requireTenantId();

  // Verify menu exists
  const existingMenu = await database.menu.findFirst({
    where: { tenantId, id: menuId, deletedAt: null },
  });

  if (!existingMenu) {
    return { success: false, error: "Menu not found." };
  }

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    return { success: false, error: "Menu name is required." };
  }

  const description = String(formData.get("description") || "").trim() || null;
  const category = String(formData.get("category") || "").trim() || null;
  const basePrice = parseNumber(formData.get("basePrice")) ?? 0;
  const pricePerPerson = parseNumber(formData.get("pricePerPerson")) ?? 0;
  const minGuests = parseNumber(formData.get("minGuests")) ?? 0;
  const maxGuests = parseNumber(formData.get("maxGuests")) ?? 0;
  const isActive = formData.get("isActive") === "true";

  // Create runtime context
  const runtimeContext = await createMenuRuntimeContext();
  const runtime = await createMenuRuntime(runtimeContext);

  // Update the menu through Manifest runtime
  const result = await updateMenu(
    runtime,
    menuId,
    name,
    description ?? "",
    category ?? "",
    basePrice,
    pricePerPerson,
    minGuests,
    maxGuests,
    isActive
  );

  // Check for blocking constraints
  const blockingConstraints = result.constraintOutcomes?.filter(
    (c) => !c.passed && c.severity === "block"
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    return {
      success: false,
      constraintOutcomes: result.constraintOutcomes,
      menuId,
      name,
    };
  }

  // Persist to Prisma
  await database.menu.update({
    where: { tenantId_id: { tenantId, id: menuId } },
    data: {
      name,
      description,
      category,
      isActive,
      basePrice: basePrice > 0 ? basePrice : null,
      pricePerPerson: pricePerPerson > 0 ? pricePerPerson : null,
      minGuests: minGuests > 0 ? minGuests : null,
      maxGuests: maxGuests > 0 ? maxGuests : null,
    },
  });

  // Emit events to outbox
  for (const event of result.emittedEvents) {
    await database.outboxEvent.create({
      data: {
        tenantId,
        id: randomUUID(),
        eventType: event.name,
        payload: event.payload as Prisma.InputJsonValue,
        aggregateId: menuId,
        aggregateType: "Menu",
      },
    });
  }

  revalidatePath("/kitchen/menus");
  revalidatePath(`/kitchen/menus/${menuId}`);

  return {
    success: true,
    constraintOutcomes: result.constraintOutcomes,
    menuId,
    name,
    isActive,
  };
}

/**
 * Update a menu with constraint override support
 */
export async function updateMenuWithOverride(
  menuId: string,
  formData: FormData,
  reason: string,
  details: string
): Promise<MenuManifestActionResult> {
  const runtimeContext = await createMenuRuntimeContext();

  // First run without overrides to get constraint outcomes
  const initialResult = await updateMenuManifest(menuId, formData);

  if (!initialResult.success && initialResult.constraintOutcomes) {
    // Create override requests from the blocking constraints
    const overrideRequests = createOverrideRequests(
      initialResult.constraintOutcomes.filter(
        (c) => !c.passed && c.severity === "block"
      ),
      `${reason}: ${details}`,
      runtimeContext.userId
    );

    // Re-run with overrides
    const runtime = await createMenuRuntime(runtimeContext);

    const name = String(formData.get("name") || "").trim();
    const description =
      String(formData.get("description") || "").trim() || null;
    const category = String(formData.get("category") || "").trim() || null;
    const basePrice = parseNumber(formData.get("basePrice")) ?? 0;
    const pricePerPerson = parseNumber(formData.get("pricePerPerson")) ?? 0;
    const minGuests = parseNumber(formData.get("minGuests")) ?? 0;
    const maxGuests = parseNumber(formData.get("maxGuests")) ?? 0;
    const isActive = formData.get("isActive") === "true";

    const result = await updateMenu(
      runtime,
      menuId,
      name,
      description ?? "",
      category ?? "",
      basePrice,
      pricePerPerson,
      minGuests,
      maxGuests,
      isActive,
      overrideRequests
    );

    // Persist to Prisma
    const tenantId = await requireTenantId();
    await database.menu.update({
      where: { tenantId_id: { tenantId, id: menuId } },
      data: {
        name,
        description,
        category,
        isActive,
        basePrice: basePrice > 0 ? basePrice : null,
        pricePerPerson: pricePerPerson > 0 ? pricePerPerson : null,
        minGuests: minGuests > 0 ? minGuests : null,
        maxGuests: maxGuests > 0 ? maxGuests : null,
      },
    });

    revalidatePath("/kitchen/menus");
    revalidatePath(`/kitchen/menus/${menuId}`);

    return {
      success: true,
      constraintOutcomes: result.constraintOutcomes,
      menuId,
      name,
      isActive,
    };
  }

  return initialResult;
}

/**
 * Activate a menu
 */
export async function activateMenuManifest(
  menuId: string
): Promise<MenuManifestActionResult> {
  const tenantId = await requireTenantId();

  // Verify menu exists
  const existingMenu = await database.menu.findFirst({
    where: { tenantId, id: menuId, deletedAt: null },
  });

  if (!existingMenu) {
    return { success: false, error: "Menu not found." };
  }

  if (existingMenu.isActive) {
    return { success: false, error: "Menu is already active." };
  }

  // Create runtime context
  const runtimeContext = await createMenuRuntimeContext();
  const runtime = await createMenuRuntime(runtimeContext);

  // Activate through Manifest runtime
  const result = await activateMenu(runtime, menuId);

  // Check for blocking constraints
  const blockingConstraints = result.constraintOutcomes?.filter(
    (c) => !c.passed && c.severity === "block"
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    return {
      success: false,
      constraintOutcomes: result.constraintOutcomes,
      menuId,
      name: existingMenu.name,
    };
  }

  // Persist to Prisma
  await database.menu.update({
    where: { tenantId_id: { tenantId, id: menuId } },
    data: { isActive: true },
  });

  // Emit events to outbox
  for (const event of result.emittedEvents) {
    await database.outboxEvent.create({
      data: {
        tenantId,
        id: randomUUID(),
        eventType: event.name,
        payload: event.payload as Prisma.InputJsonValue,
        aggregateId: menuId,
        aggregateType: "Menu",
      },
    });
  }

  revalidatePath("/kitchen/menus");
  revalidatePath(`/kitchen/menus/${menuId}`);

  return {
    success: true,
    constraintOutcomes: result.constraintOutcomes,
    menuId,
    name: existingMenu.name,
    isActive: true,
  };
}

/**
 * Deactivate a menu
 */
export async function deactivateMenuManifest(
  menuId: string,
  _reason?: string
): Promise<MenuManifestActionResult> {
  const tenantId = await requireTenantId();

  // Verify menu exists
  const existingMenu = await database.menu.findFirst({
    where: { tenantId, id: menuId, deletedAt: null },
  });

  if (!existingMenu) {
    return { success: false, error: "Menu not found." };
  }

  if (!existingMenu.isActive) {
    return { success: false, error: "Menu is already inactive." };
  }

  // Create runtime context
  const runtimeContext = await createMenuRuntimeContext();
  const runtime = await createMenuRuntime(runtimeContext);

  // Deactivate through Manifest runtime
  const result = await deactivateMenu(runtime, menuId);

  // Check for blocking constraints
  const blockingConstraints = result.constraintOutcomes?.filter(
    (c) => !c.passed && c.severity === "block"
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    return {
      success: false,
      constraintOutcomes: result.constraintOutcomes,
      menuId,
      name: existingMenu.name,
    };
  }

  // Persist to Prisma
  await database.menu.update({
    where: { tenantId_id: { tenantId, id: menuId } },
    data: { isActive: false },
  });

  // Emit events to outbox
  for (const event of result.emittedEvents) {
    await database.outboxEvent.create({
      data: {
        tenantId,
        id: randomUUID(),
        eventType: event.name,
        payload: event.payload as Prisma.InputJsonValue,
        aggregateId: menuId,
        aggregateType: "Menu",
      },
    });
  }

  revalidatePath("/kitchen/menus");
  revalidatePath(`/kitchen/menus/${menuId}`);

  return {
    success: true,
    constraintOutcomes: result.constraintOutcomes,
    menuId,
    name: existingMenu.name,
    isActive: false,
  };
}
