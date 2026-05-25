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
} from "./shared";

// ---------------------------------------------------------------------------
// EmployeeAvailabilityPrismaStore  (tenant_staff.employee_availability — snake_case)
// ---------------------------------------------------------------------------

export class EmployeeAvailabilityPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.employeeAvailability.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.employeeAvailability.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.employeeAvailability.create({
      data: {
        tenantId: this.tenantId,
        id,
        employeeId: data.employeeId as string,
        dayOfWeek: data.dayOfWeek as number,
        startTime: data.startTime as string,
        endTime: data.endTime as string,
        isAvailable: asBool(data.is_available, true),
        effectiveFrom: asNullableDate(data.effective_from) ?? new Date(),
        effectiveUntil: asNullableDate(data.effective_until),
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
      if (data.employeeId !== undefined) patch.employeeId = data.employeeId;
      if (data.dayOfWeek !== undefined) patch.dayOfWeek = data.dayOfWeek;
      if (data.startTime !== undefined) patch.startTime = data.startTime;
      if (data.endTime !== undefined) patch.endTime = data.endTime;
      if (data.is_available !== undefined)
        patch.is_available = asBool(data.is_available, true);
      if (data.effective_from !== undefined)
        patch.effective_from = asNullableDate(data.effective_from);
      if (data.effective_until !== undefined)
        patch.effective_until = asNullableDate(data.effective_until);

      const row = await this.prisma.employeeAvailability.update({
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
      await this.prisma.employeeAvailability.update({
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
    await this.prisma.employeeAvailability.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      employeeId: r.employeeId ?? null,
      dayOfWeek: r.dayOfWeek ?? null,
      startTime: r.startTime ?? null,
      endTime: r.endTime ?? null,
      isAvailable: r.is_available ?? true,
      effectiveFrom: r.effective_from ?? null,
      effectiveUntil: r.effective_until ?? null,
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
      deletedAt: r.deletedAt ?? null,
    };
  }
}
