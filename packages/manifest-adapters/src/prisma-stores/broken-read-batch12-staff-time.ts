/**
 * Staff + Time Prisma Stores — BROKEN_PRISMA_READ Batch 12
 *
 * TimeEntryPrismaStore — time_entries table in tenant_staff.
 *   Mixed naming: camelCase (tenantId, employeeId, clockIn) alongside
 *   snake_case (shift_id, approved_by, approved_at, deleted_at).
 *   Soft-delete via deleted_at (snake_case). Composite key tenantId_id.
 *
 * TimecardEditRequestPrismaStore — timecard_edit_requests table in tenant_staff.
 *   CamelCase Prisma fields, NO soft-delete (hard delete).
 *   Composite key tenantId_id.
 *
 * TrainingAssignmentPrismaStore — training_assignments table in tenant_staff.
 *   All snake_case Prisma field names, soft-delete via deleted_at.
 *   Composite key tenant_id_id.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asBool,
  asNullableDate,
  asNullableNumber,
  asNullableString,
  asString,
  type EntityInstance,
  reportOp,
} from "./shared.js";

// ---------------------------------------------------------------------------
// TimeEntryPrismaStore
// ---------------------------------------------------------------------------

export class TimeEntryPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.timeEntry.findMany({
      where: { tenantId: this.tenantId, deleted_at: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.timeEntry.findFirst({
      where: { tenantId: this.tenantId, id, deleted_at: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string) || crypto.randomUUID();
    const row = await this.prisma.timeEntry.create({
      data: {
        tenantId: this.tenantId,
        id,
        employeeId: asString(data.employeeId),
        locationId: asNullableString(data.locationId),
        shift_id: asNullableString(data.shiftId ?? data.shift_id),
        clockIn: data.clockIn
          ? new Date(data.clockIn as number | string)
          : new Date(),
        clockOut: asNullableDate(data.clockOut),
        breakMinutes: (data.breakMinutes as number) ?? 0,
        notes: asNullableString(data.notes),
        approved_by: asNullableString(data.approvedBy ?? data.approved_by),
        approved_at: asNullableDate(data.approvedAt ?? data.approved_at),
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
      if (data.clockOut !== undefined)
        patch.clockOut = asNullableDate(data.clockOut);
      if (data.breakMinutes !== undefined) patch.breakMinutes = data.breakMinutes;
      if (data.notes !== undefined) patch.notes = data.notes;
      if (data.approvedBy !== undefined || data.approved_by !== undefined)
        patch.approved_by = asNullableString(
          data.approvedBy ?? data.approved_by,
        );
      if (data.approvedAt !== undefined || data.approved_at !== undefined)
        patch.approved_at = asNullableDate(
          data.approvedAt ?? data.approved_at,
        );

      const updated = await this.prisma.timeEntry.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Soft delete — sets deleted_at (snake_case field)
      await this.prisma.timeEntry.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deleted_at: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.timeEntry.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      employeeId: (row.employeeId as string) ?? "",
      locationId: (row.locationId as string) ?? null,
      shiftId: (row.shift_id as string) ?? null,
      clockIn: row.clockIn
        ? new Date(row.clockIn as string | Date).getTime()
        : 0,
      clockOut: row.clockOut
        ? new Date(row.clockOut as string | Date).getTime()
        : null,
      breakMinutes: (row.breakMinutes as number) ?? 0,
      notes: (row.notes as string) ?? null,
      approvedBy: (row.approved_by as string) ?? null,
      approvedAt: row.approved_at
        ? new Date(row.approved_at as string | Date).getTime()
        : null,
      createdAt: row.createdAt
        ? new Date(row.createdAt as string | Date).getTime()
        : 0,
      updatedAt: row.updatedAt
        ? new Date(row.updatedAt as string | Date).getTime()
        : 0,
      deletedAt: row.deleted_at
        ? new Date(row.deleted_at as string | Date).getTime()
        : null,
    };
  }
}

// ---------------------------------------------------------------------------
// TimecardEditRequestPrismaStore
// ---------------------------------------------------------------------------

export class TimecardEditRequestPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.timecardEditRequest.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.timecardEditRequest.findFirst({
      where: { tenantId: this.tenantId, id },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string) || crypto.randomUUID();
    const row = await this.prisma.timecardEditRequest.create({
      data: {
        tenantId: this.tenantId,
        id,
        timeEntryId: asString(data.timeEntryId),
        employeeId: asString(data.employeeId),
        requestedClockIn: asNullableDate(data.requestedClockIn),
        requestedClockOut: asNullableDate(data.requestedClockOut),
        requestedBreakMinutes: asNullableNumber(data.requestedBreakMinutes),
        reason: asString(data.reason),
        status: ((data.status as string) ?? "pending") || "pending",
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
      if (data.status !== undefined) patch.status = data.status;
      if (data.reason !== undefined) patch.reason = data.reason;
      if (data.requestedClockIn !== undefined)
        patch.requestedClockIn = asNullableDate(data.requestedClockIn);
      if (data.requestedClockOut !== undefined)
        patch.requestedClockOut = asNullableDate(data.requestedClockOut);
      if (data.requestedBreakMinutes !== undefined)
        patch.requestedBreakMinutes = data.requestedBreakMinutes;

      const updated = await this.prisma.timecardEditRequest.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Hard delete — no deletedAt column
      await this.prisma.timecardEditRequest.delete({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.timecardEditRequest.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      timeEntryId: (row.timeEntryId as string) ?? "",
      employeeId: (row.employeeId as string) ?? "",
      requestedClockIn: row.requestedClockIn
        ? new Date(row.requestedClockIn as string | Date).getTime()
        : null,
      requestedClockOut: row.requestedClockOut
        ? new Date(row.requestedClockOut as string | Date).getTime()
        : null,
      requestedBreakMinutes: (row.requestedBreakMinutes as number) ?? null,
      reason: (row.reason as string) ?? "",
      status: (row.status as string) ?? "pending",
      createdAt: row.createdAt
        ? new Date(row.createdAt as string | Date).getTime()
        : 0,
      updatedAt: row.updatedAt
        ? new Date(row.updatedAt as string | Date).getTime()
        : 0,
    };
  }
}

// ---------------------------------------------------------------------------
// TrainingAssignmentPrismaStore
// ---------------------------------------------------------------------------

export class TrainingAssignmentPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.trainingAssignment.findMany({
      where: { tenant_id: this.tenantId, deleted_at: null },
      orderBy: { created_at: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.trainingAssignment.findFirst({
      where: { tenant_id: this.tenantId, id, deleted_at: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string) || crypto.randomUUID();
    const row = await this.prisma.trainingAssignment.create({
      data: {
        tenant_id: this.tenantId,
        id,
        module_id: asString(data.moduleId ?? data.module_id),
        employee_id: asNullableString(data.employeeId ?? data.employee_id),
        assigned_to_all: asBool(data.assignedToAll ?? data.assigned_to_all, false),
        assigned_by: asString(data.assignedBy ?? data.assigned_by),
        due_date: asNullableDate(data.dueDate ?? data.due_date),
        status: ((data.status as string) ?? "assigned") || "assigned",
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
      if (data.status !== undefined) patch.status = data.status;
      if (data.dueDate !== undefined || data.due_date !== undefined)
        patch.due_date = asNullableDate(data.dueDate ?? data.due_date);
      if (data.assignedToAll !== undefined || data.assigned_to_all !== undefined)
        patch.assigned_to_all = data.assignedToAll ?? data.assigned_to_all;
      patch.updated_at = new Date();

      const updated = await this.prisma.trainingAssignment.update({
        where: { tenant_id_id: { tenant_id: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Soft delete — sets deleted_at (snake_case field)
      await this.prisma.trainingAssignment.update({
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
    await this.prisma.trainingAssignment.deleteMany({
      where: { tenant_id: this.tenantId },
    });
  }

  private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      moduleId: (row.module_id as string) ?? "",
      employeeId: (row.employee_id as string) ?? null,
      assignedToAll: (row.assigned_to_all as boolean) ?? false,
      assignedBy: (row.assigned_by as string) ?? "",
      dueDate: row.due_date
        ? new Date(row.due_date as string | Date).getTime()
        : null,
      status: (row.status as string) ?? "assigned",
      assignedAt: row.assigned_at
        ? new Date(row.assigned_at as string | Date).getTime()
        : 0,
      createdAt: row.created_at
        ? new Date(row.created_at as string | Date).getTime()
        : 0,
      updatedAt: row.updated_at
        ? new Date(row.updated_at as string | Date).getTime()
        : 0,
      deletedAt: row.deleted_at
        ? new Date(row.deleted_at as string | Date).getTime()
        : null,
    };
  }
}
