/**
 * BROKEN_PRISMA_READ batch 08 — EventDish store.
 *
 * EventDish → tenant_events.event_dishes
 *   - Snake_case Prisma model name AND field names (no @map annotations)
 *   - Composite key: tenant_id_id (tenant_id + id)
 *   - No Decimal fields, no String[] arrays
 *   - Soft-delete via deleted_at
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asNullableNumber,
  asNullableString,
  type EntityInstance,
  reportOp,
} from "./shared.js";

// ---------------------------------------------------------------------------
// EventDishPrismaStore  (tenant_events.event_dishes — snake_case model)
// ---------------------------------------------------------------------------

export class EventDishPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.event_dishes.findMany({
      where: { tenant_id: this.tenantId, deleted_at: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.event_dishes.findFirst({
      where: { tenant_id: this.tenantId, id, deleted_at: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.event_dishes.create({
      data: {
        tenant_id: this.tenantId,
        id,
        event_id: data.eventId as string,
        dish_id: data.dishId as string,
        course: asNullableString(data.course),
        quantity_servings: asNullableNumber(data.quantityServings) ?? 1,
        service_style: asNullableString(data.serviceStyle),
        special_instructions: asNullableString(data.specialInstructions),
      },
    });
    return this.mapToManifestEntity(row);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>,
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};
      if (data.eventId !== undefined) patch.event_id = data.eventId;
      if (data.dishId !== undefined) patch.dish_id = data.dishId;
      if (data.course !== undefined)
        patch.course = asNullableString(data.course);
      if (data.quantityServings !== undefined)
        patch.quantity_servings = asNullableNumber(data.quantityServings) ?? 1;
      if (data.serviceStyle !== undefined)
        patch.service_style = asNullableString(data.serviceStyle);
      if (data.specialInstructions !== undefined)
        patch.special_instructions = asNullableString(data.specialInstructions);

      const row = await this.prisma.event_dishes.update({
        where: { tenant_id_id: { tenant_id: this.tenantId, id } },
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
      await this.prisma.event_dishes.update({
        where: { tenant_id_id: { tenant_id: this.tenantId, id } },
        data: { deleted_at: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.event_dishes.deleteMany({
      where: { tenant_id: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenant_id as string,
      eventId: r.event_id ?? null,
      dishId: r.dish_id ?? null,
      course: r.course ?? null,
      quantityServings: r.quantity_servings ?? 1,
      serviceStyle: r.service_style ?? null,
      specialInstructions: r.special_instructions ?? null,
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
      deletedAt: r.deleted_at ?? null,
    };
  }
}
