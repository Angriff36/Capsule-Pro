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
import { getTenantId } from "@/app/lib/tenant";

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
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");
  const tenantId = await getTenantId();

  const name = formData.get("name") as string;
  const code = formData.get("code") as string | null;
  const facilityType = formData.get("facilityType") as string | null;
  const addressLine1 = formData.get("addressLine1") as string | null;
  const city = formData.get("city") as string | null;
  const state = formData.get("state") as string | null;
  const postalCode = formData.get("postalCode") as string | null;
  const phone = formData.get("phone") as string | null;
  const notes = formData.get("notes") as string | null;

  await database.facility.create({
    data: {
      tenantId,
      name: name?.trim() || "Untitled Facility",
      code: code?.trim() || null,
      facilityType: facilityType || "kitchen",
      addressLine1: addressLine1?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      postalCode: postalCode?.trim() || null,
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
      status: "active",
    },
  });

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
