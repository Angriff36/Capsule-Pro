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
import { type EntityInstance } from "./shared";
export declare class ContractSignaturePrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
export declare class CycleCountRecordPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
//# sourceMappingURL=broken-read-batch05-contract-cycle.d.ts.map