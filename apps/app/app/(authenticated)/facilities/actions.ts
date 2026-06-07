"use server";

/**
 * Facilities Server Actions
 *
 * Create operations for work orders, PM schedules, areas, and assets.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";

import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { getTenantId, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

// ── Facility ────────────────────────────────────────────────────────────────

export async function getFacilities() {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");
  const tenantId = await getTenantId();

  return database.facility.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
}

export async function createFacility(formData: FormData) {
  // Governed write: Facility.create runs through the Manifest runtime (constitution
  // §9) — no direct database.facility.create. requireCurrentUser supplies the actor +
  // tenant the command needs for policy + audit context (§19). `status` is
  // command-owned (entity default "active"), so it is NOT sent in the body. Empty
  // optionals are sent as "" — GenericPrismaStore coerces "" → NULL for nullable
  // columns, so a blank `code` stays NULL and never trips @@unique([tenantId, code]).
  // addressLine2/country are not collected by the facilities form; sending "" keeps
  // them NULL exactly as the prior direct write left them (lossless).
  const user = await requireCurrentUser();

  const name =
    (formData.get("name") as string | null)?.trim() || "Untitled Facility";
  const code = (formData.get("code") as string | null)?.trim() || "";
  const facilityType =
    (formData.get("facilityType") as string | null) || "kitchen";
  const addressLine1 =
    (formData.get("addressLine1") as string | null)?.trim() || "";
  const city = (formData.get("city") as string | null)?.trim() || "";
  const state = (formData.get("state") as string | null)?.trim() || "";
  const postalCode =
    (formData.get("postalCode") as string | null)?.trim() || "";
  const phone = (formData.get("phone") as string | null)?.trim() || "";
  const notes = (formData.get("notes") as string | null)?.trim() || "";

  const result = await runManifestCommand({
    entity: "Facility",
    command: "create",
    body: {
      name,
      code,
      facilityType,
      addressLine1,
      addressLine2: "",
      city,
      state,
      postalCode,
      country: "",
      phone,
      notes,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create facility");
  }

  revalidatePath("/facilities");
}

// ── FacilityArea ────────────────────────────────────────────────────────────

export interface CreateFacilityAreaInput {
  venueId?: string;
  name: string;
  code?: string;
  areaType?: string;
  floor?: string;
  description?: string;
  squareFeet?: number;
  status?: string;
}

export async function createFacilityArea(input: CreateFacilityAreaInput) {
  // Governed write: FacilityArea.create runs through the Manifest runtime
  // (constitution §9) — no direct database.facilityArea.create.
  // requireCurrentUser supplies the actor + tenant for policy + audit (§19).
  // `status` is command-owned (entity default "active"), NOT sent in body.
  // squareFeet is a decimal in manifest; GenericPrismaStore coerces the
  // string-param default "0" correctly for nullable Decimal columns.
  const user = await requireCurrentUser();

  const result = await runManifestCommand({
    entity: "FacilityArea",
    command: "create",
    body: {
      venueId: input.venueId || "",
      name: input.name.trim(),
      code: input.code?.trim() || "",
      areaType: input.areaType || "other",
      floor: input.floor?.trim() || "",
      description: input.description?.trim() || "",
      squareFeet: input.squareFeet ?? 0,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create facility area");
  }

  revalidatePath("/facilities");
  revalidatePath("/facilities/areas");
  return (result.result as Record<string, unknown>) ?? {};
}

// ── FacilityAsset ───────────────────────────────────────────────────────────

export interface CreateFacilityAssetInput {
  name: string;
  assetType?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyExpiry?: string;
  areaId?: string;
  status?: string;
  notes?: string;
}

export async function createFacilityAsset(input: CreateFacilityAssetInput) {
  // Governed write: FacilityAsset.create runs through the Manifest runtime
  // (constitution §9) — no direct database.facilityAsset.create.
  // requireCurrentUser supplies the actor + tenant for policy + audit (§19).
  // `status` is command-owned (mutated to "operational" inside the command), so
  // it is NOT sent in the body. DateTime fields (purchaseDate, warrantyExpiry)
  // are passed as ISO strings — GenericPrismaStore coerces for @db.Date columns.
  // Empty optionals sent as "" — GenericPrismaStore coerces "" → NULL for
  // nullable columns. purchasePrice maps to the Manifest command param; note the
  // Prisma column is `purchaseCost` (IR drift — purchasePrice not in Prisma).
  const user = await requireCurrentUser();

  const result = await runManifestCommand({
    entity: "FacilityAsset",
    command: "create",
    body: {
      facilityId: "",
      areaId: input.areaId?.trim() || "",
      name: input.name.trim(),
      assetType: input.assetType || "other",
      purchaseDate: input.purchaseDate || "",
      purchasePrice: input.purchaseCost ?? 0,
      serialNumber: input.serialNumber?.trim() || "",
      manufacturer: input.manufacturer?.trim() || "",
      model: input.model?.trim() || "",
      warrantyExpiry: input.warrantyExpiry || "",
      notes: input.notes?.trim() || "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create facility asset");
  }

  // Read back the persisted row to preserve the return shape (constitution §10 —
  // reads may bypass runtime). The created id comes from the command result.
  const createdId = (result.result as { id?: string } | null)?.id;

  let asset: Record<string, unknown> | null = null;
  if (createdId) {
    asset = await database.facilityAsset.findFirst({
      where: { tenantId: user.tenantId, id: createdId },
    });
  }

  revalidatePath("/facilities");
  revalidatePath("/facilities/assets");
  return asset ?? (result.result as Record<string, unknown>) ?? {};
}

// ── MaintenanceWorkOrder ────────────────────────────────────────────────────

export interface CreateWorkOrderInput {
  areaId?: string;
  equipmentId?: string;
  workOrderType?: string;
  priority?: string;
  title: string;
  description?: string;
  assignedTo?: string;
  scheduledDate?: string;
  notes?: string;
}

export async function createWorkOrder(input: CreateWorkOrderInput) {
  // Governed write: MaintenanceWorkOrder.create runs through the Manifest runtime
  // (constitution §9) — no direct database.maintenanceWorkOrder.create.
  // requireCurrentUser supplies the actor + tenant for policy + audit (§19).
  // `status` is command-owned (mutated to "open"), NOT sent in body.
  // `workOrderNumber` is auto-generated inside the command.
  // `equipmentId`/`areaId` are both optional — work orders can target either.
  // `reportedBy` set to orgId (Clerk org) for tracking who submitted.
  // Empty optionals sent as "" — GenericPrismaStore coerces "" → NULL for
  // nullable columns.
  const user = await requireCurrentUser();

  const result = await runManifestCommand({
    entity: "MaintenanceWorkOrder",
    command: "create",
    body: {
      title: input.title.trim(),
      type: input.workOrderType || "corrective",
      priority: input.priority || "medium",
      description: input.description?.trim() || "",
      areaId: input.areaId || "",
      equipmentId: input.equipmentId || "",
      assignedTo: input.assignedTo || "",
      reportedBy: user.id,
      scheduledDate: input.scheduledDate || "",
      notes: input.notes?.trim() || "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create work order");
  }

  const createdId = (result.result as { id?: string } | null)?.id;

  // Read back the persisted row to preserve the return shape (constitution §10).
  if (createdId) {
    const wo = await database.maintenanceWorkOrder.findFirst({
      where: { tenantId: user.tenantId, id: createdId },
    });
    if (wo) {
      revalidatePath("/facilities");
      revalidatePath("/facilities/work-orders");
      return wo;
    }
  }

  revalidatePath("/facilities");
  revalidatePath("/facilities/work-orders");
  return (result.result as Record<string, unknown>) ?? {};
}

// ── PreventiveMaintenanceSchedule ───────────────────────────────────────────

export interface CreatePMScheduleInput {
  areaId?: string;
  equipmentId?: string;
  title: string;
  description?: string;
  frequency?: string;
  intervalDays?: number;
  nextDueAt: string;
  assignedTo?: string;
  estimatedHours?: number;
  estimatedCost?: number;
}

export async function createPMSchedule(input: CreatePMScheduleInput) {
  // Governed write: PreventiveMaintenanceSchedule.create runs through the
  // Manifest runtime (constitution §9) — no direct
  // database.preventiveMaintenanceSchedule.create. requireCurrentUser supplies
  // the actor + tenant for policy + audit (§19). `status` is command-owned
  // (mutated to "active"), NOT sent in body. `scheduleNumber` is auto-generated
  // inside the command. `equipmentId`/`areaId` both optional — schedules can
  // target either. nextDueAt passed as ISO datetime string — GenericPrismaStore
  // coerces for @db.Timestamptz columns. Nullable decimal fields (estimatedHours,
  // estimatedCost) sent as 0 for empty — store coerces 0 → NULL.
  const user = await requireCurrentUser();

  const result = await runManifestCommand({
    entity: "PreventiveMaintenanceSchedule",
    command: "create",
    body: {
      title: input.title.trim(),
      areaId: input.areaId || "",
      equipmentId: input.equipmentId || "",
      description: input.description?.trim() || "",
      frequency: input.frequency || "monthly",
      intervalDays: input.intervalDays ?? 30,
      nextDueAt: input.nextDueAt,
      assignedTo: input.assignedTo || "",
      estimatedHours: input.estimatedHours ?? 0,
      estimatedCost: input.estimatedCost ?? 0,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create maintenance schedule");
  }

  const createdId = (result.result as { id?: string } | null)?.id;

  // Read back the persisted row to preserve the return shape (constitution §10).
  if (createdId) {
    const schedule = await database.preventiveMaintenanceSchedule.findFirst({
      where: { tenantId: user.tenantId, id: createdId },
    });
    if (schedule) {
      revalidatePath("/facilities");
      revalidatePath("/facilities/schedules");
      return schedule;
    }
  }

  revalidatePath("/facilities");
  revalidatePath("/facilities/schedules");
  return (result.result as Record<string, unknown>) ?? {};
}

// ── Schedule Queries / Complete ─────────────────────────────────────────────

export async function getSchedules() {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");
  const tenantId = await getTenantId();

  return database.preventiveMaintenanceSchedule.findMany({
    where: { tenantId },
    orderBy: { nextDueAt: "asc" },
  });
}

export async function getFacilityAssets() {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");
  const tenantId = await getTenantId();

  return database.facilityAsset.findMany({
    where: { tenantId, status: "active" },
    orderBy: { name: "asc" },
  });
}

export async function completeSchedule(scheduleId: string) {
  // Governed write: PreventiveMaintenanceSchedule.complete runs through the
  // Manifest runtime (constitution §9) — no direct
  // database.preventiveMaintenanceSchedule.update. The command mutates
  // nextDueAt + lastCompletedAt (auto-set inside the command).
  // requireCurrentUser supplies the actor + tenant for policy + audit (§19).
  // Read-then-calculate is constitution §10 compliant (reads bypass runtime).
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  // Read: fetch current schedule to calculate next due date (constitution §10).
  const schedule = await database.preventiveMaintenanceSchedule.findFirst({
    where: { tenantId, id: scheduleId },
  });

  if (!schedule) throw new Error("Schedule not found");

  // Calculate the next due date by advancing past now.
  const now = new Date();
  const nextDue = new Date(schedule.nextDueAt);
  const intervalMs = schedule.intervalDays * 24 * 60 * 60 * 1000;

  while (nextDue <= now) {
    nextDue.setTime(nextDue.getTime() + intervalMs);
  }

  const result = await runManifestCommand({
    entity: "PreventiveMaintenanceSchedule",
    command: "complete",
    body: {
      id: scheduleId,
      nextDueAt: nextDue.toISOString(),
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to complete schedule");
  }

  revalidatePath("/facilities/schedules");
}
