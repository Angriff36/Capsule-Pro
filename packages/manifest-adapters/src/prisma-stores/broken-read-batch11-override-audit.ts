/**
 * OverrideAudit Prisma Store — BROKEN_PRISMA_READ Batch 11
 *
 * override_audit is an append-only audit table in tenant_kitchen.
 * No deletedAt or updatedAt columns — hard-delete semantics for delete(),
 * no soft-delete filtering in getAll/getById.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asNullableString,
  asString,
  type EntityInstance,
  reportOp,
} from "./shared.js";

export class OverrideAuditPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.overrideAudit.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.overrideAudit.findFirst({
      where: { tenantId: this.tenantId, id },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string) || crypto.randomUUID();
    const row = await this.prisma.overrideAudit.create({
      data: {
        tenantId: this.tenantId,
        id,
        entityType: asString(data.entityType),
        entityId: asString(data.entityId),
        constraintId: asString(data.constraintId),
        guardExpression: asNullableString(data.guardExpression),
        overriddenBy: asString(data.overriddenBy),
        overrideReason: asString(data.overrideReason),
        authorizedBy: asNullableString(data.authorizedBy),
        authorizedAt: data.authorizedAt
          ? new Date(data.authorizedAt as number | string)
          : null,
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
      if (data.guardExpression !== undefined)
        patch.guardExpression = data.guardExpression;
      if (data.overrideReason !== undefined)
        patch.overrideReason = data.overrideReason;
      if (data.authorizedBy !== undefined)
        patch.authorizedBy = data.authorizedBy;
      if (data.authorizedAt !== undefined)
        patch.authorizedAt = data.authorizedAt
          ? new Date(data.authorizedAt as number | string)
          : null;

      const updated = await this.prisma.overrideAudit.update({
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
      await this.prisma.overrideAudit.delete({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.overrideAudit.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      entityType: (row.entityType as string) ?? "",
      entityId: (row.entityId as string) ?? "",
      constraintId: (row.constraintId as string) ?? "",
      guardExpression: (row.guardExpression as string) ?? null,
      overriddenBy: (row.overriddenBy as string) ?? "",
      overrideReason: (row.overrideReason as string) ?? "",
      authorizedBy: (row.authorizedBy as string) ?? null,
      authorizedAt: row.authorizedAt
        ? new Date(row.authorizedAt as string | Date).getTime()
        : null,
      createdAt: row.createdAt
        ? new Date(row.createdAt as string | Date).getTime()
        : 0,
    };
  }
}
