/**
 * Prisma stores for BROKEN_PRISMA_READ batch 01 (WasteEntry, Workflow).
 *
 * Pattern mirrors AlertsConfigPrismaStore in `../prisma-store.ts`.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asBool,
  asJsonInput,
  asNullableDate,
  asNullableNumber,
  asNullableString,
  asString,
  type EntityInstance,
  reportOp,
  toDecimalInput,
  toDecimalRequired,
} from "./shared.js";

// ---------------------------------------------------------------------------
// WasteEntry (tenant_kitchen.waste_entries)
// ---------------------------------------------------------------------------

export class WasteEntryPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.wasteEntry.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.wasteEntry.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.wasteEntry.create({
      data: {
        tenantId: this.tenantId,
        id,
        inventoryItemId: asString(data.inventoryItemId),
        reasonId: asNullableNumber(data.reasonId) ?? 0,
        quantity: toDecimalRequired(data.quantity),
        unitId: asNullableNumber(data.unitId),
        locationId: asNullableString(data.locationId),
        eventId: asNullableString(data.eventId),
        loggedBy: asString(data.loggedBy),
        loggedAt: asNullableDate(data.loggedAt) ?? new Date(),
        unitCost: toDecimalInput(data.unitCost),
        totalCost: toDecimalInput(data.totalCost),
        notes: asNullableString(data.notes),
      },
    });
    return this.mapToManifestEntity(row);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};
      if (data.inventoryItemId !== undefined)
        patch.inventoryItemId = asString(data.inventoryItemId);
      if (data.reasonId !== undefined)
        patch.reasonId = asNullableNumber(data.reasonId) ?? 0;
      if (data.quantity !== undefined)
        patch.quantity = toDecimalInput(data.quantity);
      if (data.unitId !== undefined)
        patch.unitId = asNullableNumber(data.unitId);
      if (data.locationId !== undefined)
        patch.locationId = asNullableString(data.locationId);
      if (data.eventId !== undefined)
        patch.eventId = asNullableString(data.eventId);
      if (data.loggedBy !== undefined)
        patch.loggedBy = asString(data.loggedBy);
      if (data.loggedAt !== undefined)
        patch.loggedAt = asNullableDate(data.loggedAt);
      if (data.unitCost !== undefined)
        patch.unitCost = toDecimalInput(data.unitCost);
      if (data.totalCost !== undefined)
        patch.totalCost = toDecimalInput(data.totalCost);
      if (data.notes !== undefined)
        patch.notes = asNullableString(data.notes);
      const row = await this.prisma.wasteEntry.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(row);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.wasteEntry.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.wasteEntry.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      inventoryItemId: (r.inventoryItemId as string) ?? "",
      reasonId: r.reasonId ?? 0,
      quantity: r.quantity ?? null,
      unitId: r.unitId ?? null,
      locationId: (r.locationId as string) ?? null,
      eventId: (r.eventId as string) ?? null,
      loggedBy: (r.loggedBy as string) ?? "",
      loggedAt: r.loggedAt ?? null,
      unitCost: r.unitCost ?? null,
      totalCost: r.totalCost ?? null,
      notes: (r.notes as string) ?? null,
    };
  }
}

// ---------------------------------------------------------------------------
// Workflow (tenant_admin.workflows)
// ---------------------------------------------------------------------------

export class WorkflowPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.workflow.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.workflow.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.workflow.create({
      data: {
        tenantId: this.tenantId,
        id,
        name: asString(data.name),
        description: asNullableString(data.description),
        trigger_type: asString(data.trigger_type ?? data.triggerType),
        triggerConfig: asJsonInput(data.triggerConfig),
        isActive: asBool(data.isActive, true),
      },
    });
    return this.mapToManifestEntity(row);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};
      if (data.name !== undefined) patch.name = asString(data.name);
      if (data.description !== undefined)
        patch.description = asNullableString(data.description);
      if (data.trigger_type !== undefined)
        patch.trigger_type = asString(data.trigger_type);
      if (data.triggerType !== undefined)
        patch.trigger_type = asString(data.triggerType);
      if (data.triggerConfig !== undefined)
        patch.triggerConfig = asJsonInput(data.triggerConfig);
      if (data.isActive !== undefined)
        patch.isActive = asBool(data.isActive, true);
      const row = await this.prisma.workflow.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(row);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.workflow.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.workflow.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      name: (r.name as string) ?? "",
      description: (r.description as string) ?? null,
      trigger_type: (r.trigger_type as string) ?? "",
      triggerConfig: r.triggerConfig ?? {},
      isActive: r.isActive ?? true,
    };
  }
}
