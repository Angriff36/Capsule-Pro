/**
 * Prisma stores for BROKEN_PRISMA_READ batch 02
 * (ApiKey, BattleBoard, BudgetAlert).
 *
 * Pattern mirrors AlertsConfigPrismaStore in `../prisma-store.ts`.
 */
import { asBool, asJsonInput, asNullableDate, asNullableString, asString, asStringArray, reportOp, toDecimalRequired, } from "./shared.js";
// ---------------------------------------------------------------------------
// ApiKey (platform.api_keys)
// ---------------------------------------------------------------------------
export class ApiKeyPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.apiKey.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.apiKey.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.apiKey.create({
            data: {
                tenantId: this.tenantId,
                id,
                name: asString(data.name),
                keyPrefix: asString(data.keyPrefix),
                hashedKey: asString(data.hashedKey),
                scopes: asStringArray(data.scopes),
                lastUsedAt: asNullableDate(data.lastUsedAt),
                expiresAt: asNullableDate(data.expiresAt),
                revokedAt: asNullableDate(data.revokedAt),
                createdByUserId: asString(data.createdByUserId),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.name !== undefined)
                patch.name = asString(data.name);
            if (data.keyPrefix !== undefined)
                patch.keyPrefix = asString(data.keyPrefix);
            if (data.hashedKey !== undefined)
                patch.hashedKey = asString(data.hashedKey);
            if (data.scopes !== undefined)
                patch.scopes = asStringArray(data.scopes);
            if (data.lastUsedAt !== undefined)
                patch.lastUsedAt = asNullableDate(data.lastUsedAt);
            if (data.expiresAt !== undefined)
                patch.expiresAt = asNullableDate(data.expiresAt);
            if (data.revokedAt !== undefined)
                patch.revokedAt = asNullableDate(data.revokedAt);
            const row = await this.prisma.apiKey.update({
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
            await this.prisma.apiKey.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date(), revokedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.apiKey.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            name: r.name ?? "",
            keyPrefix: r.keyPrefix ?? "",
            hashedKey: r.hashedKey ?? "",
            scopes: Array.isArray(r.scopes) ? r.scopes : [],
            lastUsedAt: r.lastUsedAt ?? null,
            expiresAt: r.expiresAt ?? null,
            revokedAt: r.revokedAt ?? null,
            createdByUserId: r.createdByUserId ?? "",
        };
    }
}
// ---------------------------------------------------------------------------
// BattleBoard (tenant_events.battle_boards)
// ---------------------------------------------------------------------------
export class BattleBoardPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.battleBoard.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.battleBoard.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.battleBoard.create({
            data: {
                tenantId: this.tenantId,
                id,
                eventId: asNullableString(data.eventId),
                board_name: asString(data.board_name ?? data.boardName),
                board_type: asString(data.board_type ?? data.boardType) || "event-specific",
                schema_version: asString(data.schema_version ?? data.schemaVersion) ||
                    "mangia-battle-board@1",
                boardData: asJsonInput(data.boardData),
                document_url: asNullableString(data.document_url ?? data.documentUrl),
                source_document_type: asNullableString(data.source_document_type ?? data.sourceDocumentType),
                document_imported_at: asNullableDate(data.document_imported_at ?? data.documentImportedAt),
                status: asString(data.status) || "draft",
                is_template: asBool(data.is_template ?? data.isTemplate, false),
                description: asNullableString(data.description),
                notes: asNullableString(data.notes),
                tags: asStringArray(data.tags),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.eventId !== undefined)
                patch.eventId = asNullableString(data.eventId);
            if (data.board_name !== undefined)
                patch.board_name = asString(data.board_name);
            if (data.boardName !== undefined)
                patch.board_name = asString(data.boardName);
            if (data.board_type !== undefined)
                patch.board_type = asString(data.board_type);
            if (data.boardType !== undefined)
                patch.board_type = asString(data.boardType);
            if (data.boardData !== undefined)
                patch.boardData = asJsonInput(data.boardData);
            if (data.status !== undefined)
                patch.status = asString(data.status);
            if (data.is_template !== undefined)
                patch.is_template = asBool(data.is_template, false);
            if (data.isTemplate !== undefined)
                patch.is_template = asBool(data.isTemplate, false);
            if (data.description !== undefined)
                patch.description = asNullableString(data.description);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            if (data.tags !== undefined)
                patch.tags = asStringArray(data.tags);
            const row = await this.prisma.battleBoard.update({
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
            await this.prisma.battleBoard.update({
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
        await this.prisma.battleBoard.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            eventId: r.eventId ?? null,
            board_name: r.board_name ?? "",
            board_type: r.board_type ?? "event-specific",
            schema_version: r.schema_version ?? "mangia-battle-board@1",
            boardData: r.boardData ?? {},
            documentUrl: r.document_url ?? null,
            source_document_type: r.source_document_type ?? null,
            document_imported_at: r.document_imported_at ?? null,
            status: r.status ?? "draft",
            is_template: r.is_template ?? false,
            description: r.description ?? null,
            notes: r.notes ?? null,
            tags: Array.isArray(r.tags) ? r.tags : [],
        };
    }
}
// ---------------------------------------------------------------------------
// BudgetAlert (tenant_staff.budget_alerts)
// ---------------------------------------------------------------------------
export class BudgetAlertPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.budgetAlert.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.budgetAlert.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.budgetAlert.create({
            data: {
                tenantId: this.tenantId,
                id,
                budgetId: asString(data.budgetId),
                alertType: asString(data.alertType),
                utilization: toDecimalRequired(data.utilization ?? 0),
                message: asString(data.message),
                isAcknowledged: asBool(data.isAcknowledged, false),
                acknowledgedBy: asNullableString(data.acknowledgedBy),
                acknowledgedAt: asNullableDate(data.acknowledgedAt),
                resolved: asBool(data.resolved, false),
                resolvedAt: asNullableDate(data.resolvedAt),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.budgetId !== undefined)
                patch.budgetId = asString(data.budgetId);
            if (data.alertType !== undefined)
                patch.alertType = asString(data.alertType);
            if (data.utilization !== undefined)
                patch.utilization = toDecimalRequired(data.utilization);
            if (data.message !== undefined)
                patch.message = asString(data.message);
            if (data.isAcknowledged !== undefined)
                patch.isAcknowledged = asBool(data.isAcknowledged, false);
            if (data.acknowledgedBy !== undefined)
                patch.acknowledgedBy = asNullableString(data.acknowledgedBy);
            if (data.acknowledgedAt !== undefined)
                patch.acknowledgedAt = asNullableDate(data.acknowledgedAt);
            if (data.resolved !== undefined)
                patch.resolved = asBool(data.resolved, false);
            if (data.resolvedAt !== undefined)
                patch.resolvedAt = asNullableDate(data.resolvedAt);
            const row = await this.prisma.budgetAlert.update({
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
            await this.prisma.budgetAlert.update({
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
        await this.prisma.budgetAlert.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            budgetId: r.budgetId ?? "",
            alertType: r.alertType ?? "",
            utilization: r.utilization ?? null,
            message: r.message ?? "",
            isAcknowledged: r.isAcknowledged ?? false,
            acknowledgedBy: r.acknowledgedBy ?? null,
            acknowledgedAt: r.acknowledgedAt ?? null,
            resolved: r.resolved ?? false,
            resolvedAt: r.resolvedAt ?? null,
        };
    }
}
