/**
 * BROKEN_PRISMA_READ batch 06 — EmployeeAvailability store.
 *
 * EmployeeAvailability → tenant_staff.employee_availability
 *   - Snake_case Prisma model & fields (employee_availability, tenant_id, employee_id, etc.)
 *   - Composite key: tenant_id_id
 *   - Soft-delete via deleted_at
 *   - Time fields (start_time, end_time) are @db.Time(6), passed through as strings
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asBool,
  asNullableDate,
  type EntityInstance,
  reportOp,
} from "./shared.js";

// ---------------------------------------------------------------------------
// EmployeeAvailabilityPrismaStore  (tenant_staff.employee_availability — snake_case)
// ---------------------------------------------------------------------------

export class EmployeeAvailabilityPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.employee_availability.findMany({
      where: { tenant_id: this.tenantId, deleted_at: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.employee_availability.findFirst({
      where: { tenant_id: this.tenantId, id, deleted_at: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.employee_availability.create({
      data: {
        tenant_id: this.tenantId,
        id,
        employee_id: data.employee_id as string,
        day_of_week: data.day_of_week as number,
        start_time: data.start_time as string,
        end_time: data.end_time as string,
        is_available: asBool(data.is_available, true),
        effective_from: asNullableDate(data.effective_from) ?? new Date(),
        effective_until: asNullableDate(data.effective_until),
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
      if (data.employee_id !== undefined) patch.employee_id = data.employee_id;
      if (data.day_of_week !== undefined) patch.day_of_week = data.day_of_week;
      if (data.start_time !== undefined) patch.start_time = data.start_time;
      if (data.end_time !== undefined) patch.end_time = data.end_time;
      if (data.is_available !== undefined)
        patch.is_available = asBool(data.is_available, true);
      if (data.effective_from !== undefined)
        patch.effective_from = asNullableDate(data.effective_from);
      if (data.effective_until !== undefined)
        patch.effective_until = asNullableDate(data.effective_until);

      const row = await this.prisma.employee_availability.update({
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
      await this.prisma.employee_availability.update({
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
    await this.prisma.employee_availability.deleteMany({
      where: { tenant_id: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenant_id: r.tenant_id as string,
      employee_id: r.employee_id ?? null,
      day_of_week: r.day_of_week ?? null,
      start_time: r.start_time ?? null,
      end_time: r.end_time ?? null,
      is_available: r.is_available ?? true,
      effective_from: r.effective_from ?? null,
      effective_until: r.effective_until ?? null,
      created_at: r.created_at ?? null,
      updated_at: r.updated_at ?? null,
      deleted_at: r.deleted_at ?? null,
    };
  }
}
