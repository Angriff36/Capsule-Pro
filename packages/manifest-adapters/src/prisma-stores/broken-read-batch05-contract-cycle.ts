/**
 * Prisma stores for BROKEN_PRISMA_READ batch 05 — ContractSignature +
 * CycleCountRecord.
 *
 * Covers:
 * - ContractSignature (`tenant_events.contract_signatures`) — soft-delete
 *   via `deletedAt`, all string columns; `signedAt` is a `DateTime`
 *   (default `now()`) in Prisma but the manifest declares `number = 0`.
 * - CycleCountRecord (`tenant_inventory.cycle_count_records`) — soft-delete
 *   via `deletedAt`, four `Decimal` columns
 *   (`expectedQuantity`, `countedQuantity`, `variance`, `variancePct`),
 *   plus optional verifier columns (`verifiedById`, `verifiedAt`,
 *   `isVerified`) and offline-sync columns (`syncStatus`, `offlineId`).
 *
 * Schema ↔ manifest mismatches handled here:
 *
 * - Manifest timestamp fields are declared `number = 0` (epoch ms) but
 *   Prisma stores them as `DateTime`. Writes coerce via `asNullableDate`;
 *   reads pass the Prisma `Date | null` through verbatim.
 * - All `CycleCountRecord` decimal columns are non-null in Prisma with
 *   `default(0)`. Writes go through `toDecimalRequired(...)` so the
 *   mocked Prisma client (which does not expose a `Prisma.Decimal`
 *   constructor) records the input verbatim, while production wraps it
 *   in `Prisma.Decimal`.
 * - Manifest declares `signerEmail` / `ipAddress` / `barcode` / `notes` /
 *   `verifiedById` / `offlineId` as `string = ""`, while Prisma marks
 *   them nullable. We coerce via `asNullableString`.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asBool,
  asNullableDate,
  asNullableString,
  asString,
  type EntityInstance,
  reportOp,
  toDecimalRequired,
} from "./shared.js";

// ---------------------------------------------------------------------------
// ContractSignature (tenant_events.contract_signatures)
// ---------------------------------------------------------------------------

export class ContractSignaturePrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.contractSignature.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.contractSignature.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.contractSignature.create({
      data: {
        tenantId: this.tenantId,
        id,
        contractId: asString(data.contractId),
        signedAt: asNullableDate(data.signedAt) ?? new Date(),
        signatureData: asString(data.signatureData),
        signerName: asString(data.signerName),
        signerEmail: asNullableString(data.signerEmail),
        ipAddress: asNullableString(data.ipAddress),
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
      if (data.contractId !== undefined)
        patch.contractId = asString(data.contractId);
      if (data.signedAt !== undefined) {
        const d = asNullableDate(data.signedAt);
        if (d !== null) patch.signedAt = d;
      }
      if (data.signatureData !== undefined)
        patch.signatureData = asString(data.signatureData);
      if (data.signerName !== undefined)
        patch.signerName = asString(data.signerName);
      if (data.signerEmail !== undefined)
        patch.signerEmail = asNullableString(data.signerEmail);
      if (data.ipAddress !== undefined)
        patch.ipAddress = asNullableString(data.ipAddress);
      const row = await this.prisma.contractSignature.update({
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
      await this.prisma.contractSignature.update({
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
    await this.prisma.contractSignature.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      contractId: (r.contractId as string) ?? "",
      signedAt: r.signedAt ?? null,
      signatureData: (r.signatureData as string) ?? "",
      signerName: (r.signerName as string) ?? "",
      signerEmail: (r.signerEmail as string) ?? "",
      ipAddress: (r.ipAddress as string) ?? "",
    };
  }
}

// ---------------------------------------------------------------------------
// CycleCountRecord (tenant_inventory.cycle_count_records)
// ---------------------------------------------------------------------------

export class CycleCountRecordPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.cycleCountRecord.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.cycleCountRecord.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.cycleCountRecord.create({
      data: {
        tenantId: this.tenantId,
        id,
        sessionId: asString(data.sessionId),
        itemId: asString(data.itemId),
        itemNumber: asString(data.itemNumber),
        itemName: asString(data.itemName),
        storageLocationId: asString(data.storageLocationId),
        expectedQuantity: toDecimalRequired(data.expectedQuantity, 0),
        countedQuantity: toDecimalRequired(data.countedQuantity, 0),
        variance: toDecimalRequired(data.variance, 0),
        variancePct: toDecimalRequired(data.variancePct, 0),
        countDate: asNullableDate(data.countDate) ?? new Date(),
        countedById: asString(data.countedById),
        barcode: asNullableString(data.barcode),
        notes: asNullableString(data.notes),
        isVerified: asBool(data.isVerified, false),
        verifiedById: asNullableString(data.verifiedById),
        verifiedAt: asNullableDate(data.verifiedAt),
        syncStatus: asString(data.syncStatus) || "synced",
        offlineId: asNullableString(data.offlineId),
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
      if (data.sessionId !== undefined)
        patch.sessionId = asString(data.sessionId);
      if (data.itemId !== undefined) patch.itemId = asString(data.itemId);
      if (data.itemNumber !== undefined)
        patch.itemNumber = asString(data.itemNumber);
      if (data.itemName !== undefined) patch.itemName = asString(data.itemName);
      if (data.storageLocationId !== undefined)
        patch.storageLocationId = asString(data.storageLocationId);
      if (data.expectedQuantity !== undefined)
        patch.expectedQuantity = toDecimalRequired(data.expectedQuantity, 0);
      if (data.countedQuantity !== undefined)
        patch.countedQuantity = toDecimalRequired(data.countedQuantity, 0);
      if (data.variance !== undefined)
        patch.variance = toDecimalRequired(data.variance, 0);
      if (data.variancePct !== undefined)
        patch.variancePct = toDecimalRequired(data.variancePct, 0);
      if (data.countDate !== undefined) {
        const d = asNullableDate(data.countDate);
        if (d !== null) patch.countDate = d;
      }
      if (data.countedById !== undefined)
        patch.countedById = asString(data.countedById);
      if (data.barcode !== undefined)
        patch.barcode = asNullableString(data.barcode);
      if (data.notes !== undefined) patch.notes = asNullableString(data.notes);
      if (data.isVerified !== undefined)
        patch.isVerified = asBool(data.isVerified, false);
      if (data.verifiedById !== undefined)
        patch.verifiedById = asNullableString(data.verifiedById);
      if (data.verifiedAt !== undefined)
        patch.verifiedAt = asNullableDate(data.verifiedAt);
      if (data.syncStatus !== undefined)
        patch.syncStatus = asString(data.syncStatus) || "synced";
      if (data.offlineId !== undefined)
        patch.offlineId = asNullableString(data.offlineId);
      const row = await this.prisma.cycleCountRecord.update({
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
      await this.prisma.cycleCountRecord.update({
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
    await this.prisma.cycleCountRecord.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      sessionId: (r.sessionId as string) ?? "",
      itemId: (r.itemId as string) ?? "",
      itemNumber: (r.itemNumber as string) ?? "",
      itemName: (r.itemName as string) ?? "",
      storageLocationId: (r.storageLocationId as string) ?? "",
      expectedQuantity: r.expectedQuantity ?? 0,
      countedQuantity: r.countedQuantity ?? 0,
      variance: r.variance ?? 0,
      variancePct: r.variancePct ?? 0,
      countDate: r.countDate ?? null,
      countedById: (r.countedById as string) ?? "",
      barcode: (r.barcode as string) ?? "",
      notes: (r.notes as string) ?? "",
      isVerified: r.isVerified ?? false,
      verifiedById: (r.verifiedById as string) ?? "",
      verifiedAt: r.verifiedAt ?? null,
      syncStatus: (r.syncStatus as string) ?? "synced",
      offlineId: (r.offlineId as string) ?? "",
    };
  }
}
