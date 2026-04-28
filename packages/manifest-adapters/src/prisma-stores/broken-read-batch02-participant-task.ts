/**
 * Prisma stores for BROKEN_PRISMA_READ batch 02
 * (AdminChatParticipant, AdminTask).
 *
 * Pattern mirrors AlertsConfigPrismaStore in `../prisma-store.ts`.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asNullableDate,
  asNullableString,
  asString,
  type EntityInstance,
  reportOp,
} from "./shared.js";

// ---------------------------------------------------------------------------
// AdminChatParticipant (tenant_admin.admin_chat_participants)
// ---------------------------------------------------------------------------

export class AdminChatParticipantPrismaStore
  implements Store<EntityInstance>
{
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.adminChatParticipant.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.adminChatParticipant.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.adminChatParticipant.create({
      data: {
        tenantId: this.tenantId,
        id,
        threadId: asString(data.threadId),
        userId: asString(data.userId),
        archivedAt: asNullableDate(data.archivedAt),
        clearedAt: asNullableDate(data.clearedAt),
        lastReadAt: asNullableDate(data.lastReadAt),
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
      if (data.threadId !== undefined)
        patch.threadId = asString(data.threadId);
      if (data.userId !== undefined) patch.userId = asString(data.userId);
      if (data.archivedAt !== undefined)
        patch.archivedAt = asNullableDate(data.archivedAt);
      if (data.clearedAt !== undefined)
        patch.clearedAt = asNullableDate(data.clearedAt);
      if (data.lastReadAt !== undefined)
        patch.lastReadAt = asNullableDate(data.lastReadAt);
      const row = await this.prisma.adminChatParticipant.update({
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
      await this.prisma.adminChatParticipant.update({
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
    await this.prisma.adminChatParticipant.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      threadId: (r.threadId as string) ?? "",
      userId: (r.userId as string) ?? "",
      archivedAt: r.archivedAt ?? null,
      clearedAt: r.clearedAt ?? null,
      lastReadAt: r.lastReadAt ?? null,
    };
  }
}

// ---------------------------------------------------------------------------
// AdminTask (tenant_admin.admin_tasks)
// ---------------------------------------------------------------------------

export class AdminTaskPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.adminTask.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.adminTask.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.adminTask.create({
      data: {
        tenantId: this.tenantId,
        id,
        title: asString(data.title),
        description: asNullableString(data.description),
        status: asString(data.status) || "backlog",
        priority: asString(data.priority) || "medium",
        category: asNullableString(data.category),
        dueDate: asNullableDate(data.dueDate),
        assignedTo: asNullableString(data.assignedTo),
        createdBy: asNullableString(data.createdBy),
        sourceType: asNullableString(data.sourceType),
        sourceId: asNullableString(data.sourceId),
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
      if (data.title !== undefined) patch.title = asString(data.title);
      if (data.description !== undefined)
        patch.description = asNullableString(data.description);
      if (data.status !== undefined) patch.status = asString(data.status);
      if (data.priority !== undefined)
        patch.priority = asString(data.priority);
      if (data.category !== undefined)
        patch.category = asNullableString(data.category);
      if (data.dueDate !== undefined)
        patch.dueDate = asNullableDate(data.dueDate);
      if (data.assignedTo !== undefined)
        patch.assignedTo = asNullableString(data.assignedTo);
      if (data.createdBy !== undefined)
        patch.createdBy = asNullableString(data.createdBy);
      if (data.sourceType !== undefined)
        patch.sourceType = asNullableString(data.sourceType);
      if (data.sourceId !== undefined)
        patch.sourceId = asNullableString(data.sourceId);
      const row = await this.prisma.adminTask.update({
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
      await this.prisma.adminTask.update({
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
    await this.prisma.adminTask.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      title: (r.title as string) ?? "",
      description: (r.description as string) ?? null,
      status: (r.status as string) ?? "backlog",
      priority: (r.priority as string) ?? "medium",
      category: (r.category as string) ?? null,
      dueDate: r.dueDate ?? null,
      assignedTo: (r.assignedTo as string) ?? null,
      createdBy: (r.createdBy as string) ?? null,
      sourceType: (r.sourceType as string) ?? null,
      sourceId: (r.sourceId as string) ?? null,
    };
  }
}
