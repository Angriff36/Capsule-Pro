/**
 * Prisma stores for BROKEN_PRISMA_READ batch 05 — CommandBoard auxiliary trio.
 *
 * Covers CommandBoardConnection, CommandBoardGroup, and CommandBoardLayout
 * (all in `tenant_events.*`). Each entity carries a soft-delete `deletedAt`
 * column, so `getAll`/`getById` filter `deletedAt: null` and `delete` writes
 * `deletedAt = new Date()` rather than removing the row.
 *
 * Schema ↔ manifest mismatches handled here:
 *
 * - The manifest declares timestamp fields (`createdAt`, `updatedAt`,
 *   `deletedAt`, etc.) as `number` (epoch millis) but Prisma stores them as
 *   `DateTime`. Writes coerce via `asNullableDate`; reads pass the Prisma
 *   `Date | null` through verbatim — the runtime / read-API layer is
 *   responsible for the final epoch projection.
 * - `CommandBoardLayout.viewport` is `Json` in Prisma but the manifest
 *   declares `viewport: string = "{}"`. We pass values through
 *   `asJsonInput` so JSON objects round-trip cleanly while string defaults
 *   like `"{}"` are stored as JSON strings (still valid JSON).
 * - `CommandBoardLayout.visibleCards` is `String[]` in Prisma but the
 *   manifest declares `visibleCards: string = ""`. We accept either an
 *   array or a comma-joined string (mirroring the `CommandBoard.tags`
 *   pattern from batch 04).
 * - `CommandBoardGroup.color` is `String?` (nullable) in Prisma; the
 *   manifest declares it as `string = ""`. We coerce to `null` via
 *   `asNullableString` when blank.
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class CommandBoardConnectionPrismaStore implements Store<EntityInstance> {
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
export declare class CommandBoardGroupPrismaStore implements Store<EntityInstance> {
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
export declare class CommandBoardLayoutPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-batch05-command-board.d.ts.map