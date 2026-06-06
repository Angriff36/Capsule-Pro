"use server";

/**
 * Facilities Server Actions
 *
 * Create operations for work orders, PM schedules, areas, and assets.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { randomUUID } from "crypto";
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
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");
  const tenantId = await getTenantId();

  const area = await database.facilityArea.create({
    data: {
      tenantId,
      venueId: input.venueId || null,
      name: input.name.trim(),
      code: input.code?.trim() || null,
      areaType: input.areaType || "other",
      floor: input.floor?.trim() || null,
      description: input.description?.trim() || null,
      squareFeet: input.squareFeet ?? null,
      status: input.status || "active",
    },
  });

  revalidatePath("/facilities");
  revalidatePath("/facilities/areas");
  return area;
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
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");
  const tenantId = await getTenantId();

  const asset = await database.facilityAsset.create({
    data: {
      tenantId,
      name: input.name.trim(),
      assetType: input.assetType || "other",
      serialNumber: input.serialNumber?.trim() || null,
      manufacturer: input.manufacturer?.trim() || null,
      model: input.model?.trim() || null,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
      purchaseCost: input.purchaseCost ?? null,
      warrantyExpiry: input.warrantyExpiry
        ? new Date(input.warrantyExpiry)
        : null,
      areaId: input.areaId || null,
      status: input.status || "active",
      notes: input.notes?.trim() || null,
    },
  });

  revalidatePath("/facilities");
  revalidatePath("/facilities/assets");
  return asset;
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
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");
  const tenantId = await getTenantId();

  const workOrderNumber = `WO-${randomUUID().slice(0, 8).toUpperCase()}`;

  const wo = await database.maintenanceWorkOrder.create({
    data: {
      tenantId,
      workOrderNumber,
      areaId: input.areaId || null,
      equipmentId: input.equipmentId || null,
      workOrderType: input.workOrderType || "corrective",
      priority: input.priority || "medium",
      title: input.title.trim(),
      description: input.description?.trim() || null,
      reportedBy: orgId,
      assignedTo: input.assignedTo || null,
      scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
      notes: input.notes?.trim() || null,
    },
  });

  revalidatePath("/facilities");
  revalidatePath("/facilities/work-orders");
  return wo;
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
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");
  const tenantId = await getTenantId();

  const scheduleNumber = `PM-${randomUUID().slice(0, 8).toUpperCase()}`;

  const schedule = await database.preventiveMaintenanceSchedule.create({
    data: {
      tenantId,
      scheduleNumber,
      areaId: input.areaId || null,
      equipmentId: input.equipmentId || null,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      frequency: input.frequency || "monthly",
      intervalDays: input.intervalDays ?? 30,
      nextDueAt: new Date(input.nextDueAt),
      assignedTo: input.assignedTo || null,
      estimatedHours: input.estimatedHours ?? null,
      estimatedCost: input.estimatedCost ?? null,
      status: "active",
    },
  });

  revalidatePath("/facilities");
  revalidatePath("/facilities/schedules");
  return schedule;
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
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");
  const tenantId = await getTenantId();

  const schedule = await database.preventiveMaintenanceSchedule.findFirst({
    where: { tenantId, id: scheduleId },
  });

  if (!schedule) throw new Error("Schedule not found");

  const now = new Date();
  const nextDue = new Date(schedule.nextDueAt);
  const intervalMs = schedule.intervalDays * 24 * 60 * 60 * 1000;

  while (nextDue <= now) {
    nextDue.setTime(nextDue.getTime() + intervalMs);
  }

  await database.preventiveMaintenanceSchedule.update({
    where: { tenantId_id: { tenantId, id: scheduleId } },
    data: {
      lastCompletedAt: now,
      nextDueAt: nextDue,
    },
  });

  revalidatePath("/facilities/schedules");
}
