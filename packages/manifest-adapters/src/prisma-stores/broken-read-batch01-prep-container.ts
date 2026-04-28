/**
 * Prisma stores for BROKEN_PRISMA_READ batch 01 (PrepMethod, Container).
 *
 * Pattern mirrors AlertsConfigPrismaStore in `../prisma-store.ts`.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asBool,
  asNullableNumber,
  asNullableString,
  asString,
  asStringArray,
  type EntityInstance,
  reportOp,
  toDecimalInput,
} from "./shared.js";

// ---------------------------------------------------------------------------
// PrepMethod (tenant_kitchen.prep_methods)
// ---------------------------------------------------------------------------

export class PrepMethodPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.prepMethod.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.prepMethod.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.prepMethod.create({
      data: {
        tenantId: this.tenantId,
        id,
        name: asString(data.name),
        category: asNullableString(data.category),
        description: asNullableString(data.description),
        estimatedDurationMinutes: asNullableNumber(
          data.estimatedDurationMinutes
        ),
        requiresCertification: asStringArray(data.requiresCertification),
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
      if (data.category !== undefined)
        patch.category = asNullableString(data.category);
      if (data.description !== undefined)
        patch.description = asNullableString(data.description);
      if (data.estimatedDurationMinutes !== undefined)
        patch.estimatedDurationMinutes = asNullableNumber(
          data.estimatedDurationMinutes
        );
      if (data.requiresCertification !== undefined)
        patch.requiresCertification = asStringArray(data.requiresCertification);
      if (data.isActive !== undefined)
        patch.isActive = asBool(data.isActive, true);
      const row = await this.prisma.prepMethod.update({
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
      await this.prisma.prepMethod.update({
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
    await this.prisma.prepMethod.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      name: (r.name as string) ?? "",
      category: (r.category as string) ?? null,
      description: (r.description as string) ?? null,
      estimatedDurationMinutes: r.estimatedDurationMinutes ?? null,
      requiresCertification: Array.isArray(r.requiresCertification)
        ? (r.requiresCertification as string[])
        : [],
      isActive: r.isActive ?? true,
    };
  }
}

// ---------------------------------------------------------------------------
// Container (tenant_kitchen.containers)
// ---------------------------------------------------------------------------

export class ContainerPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.container.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.container.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.container.create({
      data: {
        tenantId: this.tenantId,
        id,
        locationId: asNullableString(data.locationId),
        name: asString(data.name),
        containerType: asString(data.containerType),
        sizeDescription: asNullableString(data.sizeDescription),
        capacityVolumeMl: toDecimalInput(data.capacityVolumeMl),
        capacityWeightG: toDecimalInput(data.capacityWeightG),
        capacityPortions: asNullableNumber(data.capacityPortions),
        isReusable: asBool(data.isReusable, true),
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
      if (data.locationId !== undefined)
        patch.locationId = asNullableString(data.locationId);
      if (data.name !== undefined) patch.name = asString(data.name);
      if (data.containerType !== undefined)
        patch.containerType = asString(data.containerType);
      if (data.sizeDescription !== undefined)
        patch.sizeDescription = asNullableString(data.sizeDescription);
      if (data.capacityVolumeMl !== undefined)
        patch.capacityVolumeMl = toDecimalInput(data.capacityVolumeMl);
      if (data.capacityWeightG !== undefined)
        patch.capacityWeightG = toDecimalInput(data.capacityWeightG);
      if (data.capacityPortions !== undefined)
        patch.capacityPortions = asNullableNumber(data.capacityPortions);
      if (data.isReusable !== undefined)
        patch.isReusable = asBool(data.isReusable, true);
      if (data.isActive !== undefined)
        patch.isActive = asBool(data.isActive, true);
      const row = await this.prisma.container.update({
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
      await this.prisma.container.update({
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
    await this.prisma.container.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      locationId: (r.locationId as string) ?? null,
      name: (r.name as string) ?? "",
      containerType: (r.containerType as string) ?? "",
      sizeDescription: (r.sizeDescription as string) ?? null,
      capacityVolumeMl: r.capacityVolumeMl ?? null,
      capacityWeightG: r.capacityWeightG ?? null,
      capacityPortions: r.capacityPortions ?? null,
      isReusable: r.isReusable ?? true,
      isActive: r.isActive ?? true,
    };
  }
}
