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
import { getTenantId } from "@/app/lib/tenant";
import { randomUUID } from "crypto";

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
      warrantyExpiry: input.warrantyExpiry ? new Date(input.warrantyExpiry) : null,
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
