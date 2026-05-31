/**
 * Staff slice Prisma stores — Phase 2 functional gate.
 *
 * Additive, Manifest-driven persistence for the Event/Staff vertical slice.
 * Both models are emitted by the Manifest Prisma projection (no hand twin):
 *
 * StaffMember (manifest entity "StaffMember") → tenant_staff.staff_members
 *   - camelCase Prisma fields (no @map); composite key tenantId_id
 *   - createdAt/updatedAt are required DateTime (no DB default) → set on create
 *   - soft-delete via deletedAt
 *
 * EventStaff (manifest entity "EventStaff") → tenant_events.event_staff
 *   - camelCase Prisma fields (no @map); composite key tenantId_id
 *   - staffMemberId links to StaffMember (flat string id; no FK in the slice)
 *   - shiftStart/shiftEnd are nullable Int; createdAt/updatedAt nullable DateTime
 *   - soft-delete via deletedAt
 *   - REPLACES the legacy EventStaffAssignmentPrismaStore wiring, which wrote to
 *     tenant_events.event_staff_assignments (model EventStaffAssignment). The
 *     Manifest entity "EventStaff" now persists to its own event_staff table.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asNullableDate,
  asNullableNumber,
  asNullableString,
  asString,
  type EntityInstance,
  reportOp,
} from "./shared";

// ---------------------------------------------------------------------------
// StaffMemberPrismaStore  (tenant_staff.staff_members)
// Manifest entity name: "StaffMember"
// ---------------------------------------------------------------------------

export class StaffMemberPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.staffMember.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.staffMember.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const now = new Date();
    const row = await this.prisma.staffMember.create({
      data: {
        tenantId: this.tenantId,
        id,
        displayName: asString(data.displayName),
        email: asNullableString(data.email),
        phone: asNullableString(data.phone),
        role: asNullableString(data.role) ?? "server",
        status: asNullableString(data.status) ?? "active",
        notes: asNullableString(data.notes),
        createdAt: asNullableDate(data.createdAt) ?? now,
        updatedAt: asNullableDate(data.updatedAt) ?? now,
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
      if (data.displayName !== undefined)
        patch.displayName = asString(data.displayName);
      if (data.email !== undefined) patch.email = asNullableString(data.email);
      if (data.phone !== undefined) patch.phone = asNullableString(data.phone);
      if (data.role !== undefined) patch.role = asNullableString(data.role);
      if (data.status !== undefined)
        patch.status = asNullableString(data.status) ?? "active";
      if (data.notes !== undefined) patch.notes = asNullableString(data.notes);
      patch.updatedAt = new Date();

      const row = await this.prisma.staffMember.update({
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
      await this.prisma.staffMember.update({
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
    await this.prisma.staffMember.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      displayName: r.displayName ?? "",
      email: r.email ?? null,
      phone: r.phone ?? null,
      role: r.role ?? null,
      status: r.status ?? "active",
      notes: r.notes ?? null,
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
      deletedAt: r.deletedAt ?? null,
    };
  }
}

// ---------------------------------------------------------------------------
// EventStaffPrismaStore  (tenant_events.event_staff)
// Manifest entity name: "EventStaff"
// ---------------------------------------------------------------------------

export class EventStaffPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.eventStaff.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.eventStaff.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const now = new Date();
    const row = await this.prisma.eventStaff.create({
      data: {
        tenantId: this.tenantId,
        id,
        eventId: data.eventId as string,
        staffMemberId: data.staffMemberId as string,
        role: asNullableString(data.role),
        notes: asNullableString(data.notes),
        shiftStart: asNullableNumber(data.shiftStart),
        shiftEnd: asNullableNumber(data.shiftEnd),
        status: asNullableString(data.status) ?? "assigned",
        createdAt: asNullableDate(data.createdAt) ?? now,
        updatedAt: asNullableDate(data.updatedAt) ?? now,
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
      if (data.eventId !== undefined) patch.eventId = data.eventId;
      if (data.staffMemberId !== undefined)
        patch.staffMemberId = data.staffMemberId;
      if (data.role !== undefined) patch.role = asNullableString(data.role);
      if (data.notes !== undefined) patch.notes = asNullableString(data.notes);
      if (data.shiftStart !== undefined)
        patch.shiftStart = asNullableNumber(data.shiftStart);
      if (data.shiftEnd !== undefined)
        patch.shiftEnd = asNullableNumber(data.shiftEnd);
      if (data.status !== undefined)
        patch.status = asNullableString(data.status) ?? "assigned";
      patch.updatedAt = new Date();

      const row = await this.prisma.eventStaff.update({
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
      await this.prisma.eventStaff.update({
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
    await this.prisma.eventStaff.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      eventId: r.eventId ?? null,
      staffMemberId: r.staffMemberId ?? null,
      role: r.role ?? null,
      notes: r.notes ?? null,
      shiftStart: r.shiftStart ?? null,
      shiftEnd: r.shiftEnd ?? null,
      status: r.status ?? "assigned",
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
      deletedAt: r.deletedAt ?? null,
    };
  }
}
