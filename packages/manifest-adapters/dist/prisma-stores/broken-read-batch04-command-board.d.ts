/**
 * Prisma stores for BROKEN_PRISMA_READ batch 04 — CommandBoard duo.
 *
 * Covers CommandBoard and CommandBoardCard (both in `tenant_events.*`).
 * Both carry a soft-delete `deletedAt` column, so `getAll`/`getById`
 * filter `deletedAt: null` and `delete` writes `deletedAt = new Date()`
 * rather than removing the row.
 *
 * Schema ↔ manifest mismatches handled here:
 *
 * - `CommandBoard.tags` is `String[]` in Prisma (text[] in Postgres) but
 *   the manifest declares `tags: string` (a comma-joined hint). We accept
 *   either an array or a comma-separated string and normalize to `string[]`
 *   before persisting; reads return the array verbatim.
 * - `CommandBoard.scope` (Json?) and `CommandBoard.autoPopulate` (Boolean)
 *   are not in the manifest entity. We pass `scope` through `asJsonInput`
 *   when provided (defaulting to `null`) and let `autoPopulate` default
 *   via `asBool(..., false)` so existing rows round-trip cleanly.
 * - `CommandBoardCard.metadata` is `Json` (default `{}`) — coerced via
 *   `asJsonInput`. `vectorClock` (Json?) is not in the manifest; reads
 *   pass it through as-is, writes leave it untouched.
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class CommandBoardPrismaStore implements Store<EntityInstance> {
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
export declare class CommandBoardCardPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-batch04-command-board.d.ts.map