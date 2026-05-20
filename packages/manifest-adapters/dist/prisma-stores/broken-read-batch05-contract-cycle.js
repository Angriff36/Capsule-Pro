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
import { asBool, asNullableDate, asNullableString, asString, reportOp, toDecimalRequired, } from "./shared";
// ---------------------------------------------------------------------------
// ContractSignature (tenant_events.contract_signatures)
// ---------------------------------------------------------------------------
export class ContractSignaturePrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.contractSignature.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.contractSignature.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
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
    async update(id, data) {
        try {
            const patch = {};
            if (data.contractId !== undefined)
                patch.contractId = asString(data.contractId);
            if (data.signedAt !== undefined) {
                const d = asNullableDate(data.signedAt);
                if (d !== null)
                    patch.signedAt = d;
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
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.contractSignature.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.contractSignature.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            contractId: r.contractId ?? "",
            signedAt: r.signedAt ?? null,
            signatureData: r.signatureData ?? "",
            signerName: r.signerName ?? "",
            signerEmail: r.signerEmail ?? "",
            ipAddress: r.ipAddress ?? "",
        };
    }
}
// ---------------------------------------------------------------------------
// CycleCountRecord (tenant_inventory.cycle_count_records)
// ---------------------------------------------------------------------------
export class CycleCountRecordPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.cycleCountRecord.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.cycleCountRecord.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
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
    async update(id, data) {
        try {
            const patch = {};
            if (data.sessionId !== undefined)
                patch.sessionId = asString(data.sessionId);
            if (data.itemId !== undefined)
                patch.itemId = asString(data.itemId);
            if (data.itemNumber !== undefined)
                patch.itemNumber = asString(data.itemNumber);
            if (data.itemName !== undefined)
                patch.itemName = asString(data.itemName);
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
                if (d !== null)
                    patch.countDate = d;
            }
            if (data.countedById !== undefined)
                patch.countedById = asString(data.countedById);
            if (data.barcode !== undefined)
                patch.barcode = asNullableString(data.barcode);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
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
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.cycleCountRecord.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.cycleCountRecord.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            sessionId: r.sessionId ?? "",
            itemId: r.itemId ?? "",
            itemNumber: r.itemNumber ?? "",
            itemName: r.itemName ?? "",
            storageLocationId: r.storageLocationId ?? "",
            expectedQuantity: r.expectedQuantity ?? 0,
            countedQuantity: r.countedQuantity ?? 0,
            variance: r.variance ?? 0,
            variancePct: r.variancePct ?? 0,
            countDate: r.countDate ?? null,
            countedById: r.countedById ?? "",
            barcode: r.barcode ?? "",
            notes: r.notes ?? "",
            isVerified: r.isVerified ?? false,
            verifiedById: r.verifiedById ?? "",
            verifiedAt: r.verifiedAt ?? null,
            syncStatus: r.syncStatus ?? "synced",
            offlineId: r.offlineId ?? "",
        };
    }
}
