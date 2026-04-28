/**
 * BROKEN_RAW_SQL parent workflow — Schedule Prisma store.
 *
 * Schedule — tenant_staff.schedules
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - schedule_date stored as DateTime @db.Date, manifest uses number (ms epoch)
 *   - published_at / published_by nullable
 *   - Status lifecycle: draft → published → closed
 *   - Soft-delete via deletedAt
 *
 * Note: The manifest declares `notes` and `shiftCount` properties that have no
 * corresponding column in the Prisma model. These fields are accepted on write
 * but silently dropped (not persisted). They are returned as defaults on read.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asNullableDate,
  asNullableString,
  type EntityInstance,
  reportOp,
} from "./shared.js";

// ---------------------------------------------------------------------------
// SchedulePrismaStore
// ---------------------------------------------------------------------------

export class SchedulePrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.schedule.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.schedule.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.schedule.create({
      data: {
        tenantId: this.tenantId,
        id,
        locationId: asNullableString(data.locationId),
        schedule_date: asNullableDate(data.scheduleDate) ?? new Date(),
        status: asNullableString(data.status) ?? "draft",
        published_at: asNullableDate(data.publishedAt),
        published_by: asNullableString(data.publishedBy),
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
      if (data.locationId !== undefined)
        patch.locationId = asNullableString(data.locationId);
      if (data.scheduleDate !== undefined)
        patch.schedule_date = asNullableDate(data.scheduleDate);
      if (data.status !== undefined)
        patch.status = asNullableString(data.status);
      if (data.publishedAt !== undefined)
        patch.published_at = asNullableDate(data.publishedAt);
      if (data.publishedBy !== undefined)
        patch.published_by = asNullableString(data.publishedBy);

      const row = await this.prisma.schedule.update({
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
      await this.prisma.schedule.update({
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
    await this.prisma.schedule.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      locationId: r.locationId ?? null,
      scheduleDate: r.schedule_date instanceof Date ? r.schedule_date.getTime() : 0,
      status: r.status ?? "draft",
      publishedAt:
        r.published_at instanceof Date ? r.published_at.getTime() : 0,
      publishedBy: r.published_by ?? "",
      // Manifest-only fields (no Prisma column) — return defaults
      notes: "",
      shiftCount: 0,
      createdAt:
        r.createdAt instanceof Date ? r.createdAt.getTime() : 0,
      updatedAt:
        r.updatedAt instanceof Date ? r.updatedAt.getTime() : 0,
      deletedAt:
        r.deletedAt instanceof Date ? r.deletedAt.getTime() : 0,
    };
  }
}
