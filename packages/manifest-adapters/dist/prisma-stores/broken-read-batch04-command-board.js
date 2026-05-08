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
import { asBool, asJsonInput, asNullableNumber, asNullableString, asString, asStringArray, reportOp, } from "./shared.js";
/** Coerce manifest tag input (string | string[]) to string[]. */
function coerceTags(value) {
    if (Array.isArray(value)) {
        return value.filter((v) => v !== null && v !== undefined).map(String);
    }
    if (typeof value === "string" && value.length > 0) {
        return value
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
    }
    return asStringArray(value);
}
// ---------------------------------------------------------------------------
// CommandBoard (tenant_events.command_boards)
// ---------------------------------------------------------------------------
export class CommandBoardPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.commandBoard.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.commandBoard.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.commandBoard.create({
            data: {
                tenantId: this.tenantId,
                id,
                eventId: asNullableString(data.eventId),
                name: asString(data.name),
                description: asNullableString(data.description),
                status: asString(data.status) || "draft",
                isTemplate: asBool(data.isTemplate, false),
                tags: coerceTags(data.tags),
                autoPopulate: asBool(data.autoPopulate, false),
                ...(data.scope !== undefined ? { scope: asJsonInput(data.scope) } : {}),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.eventId !== undefined)
                patch.eventId = asNullableString(data.eventId);
            if (data.name !== undefined)
                patch.name = asString(data.name);
            if (data.description !== undefined)
                patch.description = asNullableString(data.description);
            if (data.status !== undefined)
                patch.status = asString(data.status) || "draft";
            if (data.isTemplate !== undefined)
                patch.isTemplate = asBool(data.isTemplate, false);
            if (data.tags !== undefined)
                patch.tags = coerceTags(data.tags);
            if (data.autoPopulate !== undefined)
                patch.autoPopulate = asBool(data.autoPopulate, false);
            if (data.scope !== undefined)
                patch.scope = asJsonInput(data.scope);
            const row = await this.prisma.commandBoard.update({
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
            await this.prisma.commandBoard.update({
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
        await this.prisma.commandBoard.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            eventId: r.eventId ?? null,
            name: r.name ?? "",
            description: r.description ?? null,
            status: r.status ?? "draft",
            isTemplate: r.isTemplate ?? false,
            tags: Array.isArray(r.tags) ? r.tags : [],
            scope: r.scope ?? null,
            autoPopulate: r.autoPopulate ?? false,
        };
    }
}
// ---------------------------------------------------------------------------
// CommandBoardCard (tenant_events.command_board_cards)
// ---------------------------------------------------------------------------
export class CommandBoardCardPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.commandBoardCard.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.commandBoardCard.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.commandBoardCard.create({
            data: {
                tenantId: this.tenantId,
                id,
                boardId: asString(data.boardId),
                title: asString(data.title),
                content: asNullableString(data.content),
                cardType: asString(data.cardType) || "task",
                status: asString(data.status) || "pending",
                positionX: asNullableNumber(data.positionX) ?? 0,
                positionY: asNullableNumber(data.positionY) ?? 0,
                width: asNullableNumber(data.width) ?? 200,
                height: asNullableNumber(data.height) ?? 150,
                zIndex: asNullableNumber(data.zIndex) ?? 0,
                color: asNullableString(data.color),
                metadata: asJsonInput(data.metadata),
                groupId: asNullableString(data.groupId),
                entityId: asNullableString(data.entityId),
                entityType: asNullableString(data.entityType),
                version: asNullableNumber(data.version) ?? 0,
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.boardId !== undefined)
                patch.boardId = asString(data.boardId);
            if (data.title !== undefined)
                patch.title = asString(data.title);
            if (data.content !== undefined)
                patch.content = asNullableString(data.content);
            if (data.cardType !== undefined)
                patch.cardType = asString(data.cardType) || "task";
            if (data.status !== undefined)
                patch.status = asString(data.status) || "pending";
            if (data.positionX !== undefined)
                patch.positionX = asNullableNumber(data.positionX) ?? 0;
            if (data.positionY !== undefined)
                patch.positionY = asNullableNumber(data.positionY) ?? 0;
            if (data.width !== undefined)
                patch.width = asNullableNumber(data.width) ?? 200;
            if (data.height !== undefined)
                patch.height = asNullableNumber(data.height) ?? 150;
            if (data.zIndex !== undefined)
                patch.zIndex = asNullableNumber(data.zIndex) ?? 0;
            if (data.color !== undefined)
                patch.color = asNullableString(data.color);
            if (data.metadata !== undefined)
                patch.metadata = asJsonInput(data.metadata);
            if (data.groupId !== undefined)
                patch.groupId = asNullableString(data.groupId);
            if (data.entityId !== undefined)
                patch.entityId = asNullableString(data.entityId);
            if (data.entityType !== undefined)
                patch.entityType = asNullableString(data.entityType);
            if (data.version !== undefined)
                patch.version = asNullableNumber(data.version) ?? 0;
            const row = await this.prisma.commandBoardCard.update({
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
            await this.prisma.commandBoardCard.update({
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
        await this.prisma.commandBoardCard.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            boardId: r.boardId ?? "",
            title: r.title ?? "",
            content: r.content ?? null,
            cardType: r.cardType ?? "task",
            status: r.status ?? "pending",
            positionX: r.positionX ?? 0,
            positionY: r.positionY ?? 0,
            width: r.width ?? 200,
            height: r.height ?? 150,
            zIndex: r.zIndex ?? 0,
            color: r.color ?? null,
            metadata: r.metadata ?? {},
            groupId: r.groupId ?? null,
            entityId: r.entityId ?? null,
            entityType: r.entityType ?? null,
            vectorClock: r.vectorClock ?? null,
            version: r.version ?? 0,
        };
    }
}
