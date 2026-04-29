/**
 * BROKEN_PRISMA_READ batch 08 — EventGuest + EventImport stores.
 *
 * EventGuest → tenant_events.event_guests
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - String[] arrays: dietaryRestrictions, allergenRestrictions
 *   - Boolean fields: isPrimaryContact, specialMealRequired
 *
 * EventImport (manifest entity "EventImportWorkflow") → tenant_events.event_imports
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Json field: extractedData
 *   - String[] array: parseErrors
 *   - Bytes? field: content (not mapped to manifest entity)
 *   - Nullable eventId
 *
 * Both soft-delete via deletedAt.
 */
import { asBool, asJsonInput, asNullableDate, asNullableNumber, asNullableString, asStringArray, reportOp, } from "./shared.js";
// ---------------------------------------------------------------------------
// EventGuestPrismaStore  (tenant_events.event_guests)
// ---------------------------------------------------------------------------
export class EventGuestPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.eventGuest.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.eventGuest.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.eventGuest.create({
            data: {
                tenantId: this.tenantId,
                id,
                eventId: data.eventId,
                guestName: data.guestName ?? "Unknown Guest",
                guestEmail: asNullableString(data.guestEmail),
                guestPhone: asNullableString(data.guestPhone),
                isPrimaryContact: asBool(data.isPrimaryContact, false),
                dietaryRestrictions: asStringArray(data.dietaryRestrictions),
                allergenRestrictions: asStringArray(data.allergenRestrictions),
                notes: asNullableString(data.notes),
                specialMealRequired: asBool(data.specialMealRequired, false),
                specialMealNotes: asNullableString(data.specialMealNotes),
                tableAssignment: asNullableString(data.tableAssignment),
                mealPreference: asNullableString(data.mealPreference),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.eventId !== undefined)
                patch.eventId = data.eventId;
            if (data.guestName !== undefined)
                patch.guestName = data.guestName;
            if (data.guestEmail !== undefined)
                patch.guestEmail = asNullableString(data.guestEmail);
            if (data.guestPhone !== undefined)
                patch.guestPhone = asNullableString(data.guestPhone);
            if (data.isPrimaryContact !== undefined)
                patch.isPrimaryContact = asBool(data.isPrimaryContact, false);
            if (data.dietaryRestrictions !== undefined)
                patch.dietaryRestrictions = asStringArray(data.dietaryRestrictions);
            if (data.allergenRestrictions !== undefined)
                patch.allergenRestrictions = asStringArray(data.allergenRestrictions);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            if (data.specialMealRequired !== undefined)
                patch.specialMealRequired = asBool(data.specialMealRequired, false);
            if (data.specialMealNotes !== undefined)
                patch.specialMealNotes = asNullableString(data.specialMealNotes);
            if (data.tableAssignment !== undefined)
                patch.tableAssignment = asNullableString(data.tableAssignment);
            if (data.mealPreference !== undefined)
                patch.mealPreference = asNullableString(data.mealPreference);
            const row = await this.prisma.eventGuest.update({
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
            await this.prisma.eventGuest.update({
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
        await this.prisma.eventGuest.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            eventId: r.eventId ?? null,
            guestName: r.guestName ?? "Unknown Guest",
            guestEmail: r.guestEmail ?? null,
            guestPhone: r.guestPhone ?? null,
            isPrimaryContact: r.isPrimaryContact ?? false,
            dietaryRestrictions: r.dietaryRestrictions ?? [],
            allergenRestrictions: r.allergenRestrictions ?? [],
            notes: r.notes ?? null,
            specialMealRequired: r.specialMealRequired ?? false,
            specialMealNotes: r.specialMealNotes ?? null,
            tableAssignment: r.tableAssignment ?? null,
            mealPreference: r.mealPreference ?? null,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
        };
    }
}
// ---------------------------------------------------------------------------
// EventImportPrismaStore  (tenant_events.event_imports)
// Manifest entity name: "EventImportWorkflow"
// ---------------------------------------------------------------------------
export class EventImportPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.eventImport.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.eventImport.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.eventImport.create({
            data: {
                tenantId: this.tenantId,
                id,
                eventId: asNullableString(data.eventId),
                fileName: data.fileName ?? "unknown.pdf",
                mimeType: data.mimeType ?? "application/pdf",
                fileSize: asNullableNumber(data.fileSize) ?? 0,
                blobUrl: asNullableString(data.blobUrl),
                fileType: asNullableString(data.fileType) ?? "pdf",
                detectedFormat: asNullableString(data.detectedFormat),
                parseStatus: asNullableString(data.parseStatus) ?? "pending",
                extractedData: asJsonInput(data.extractedData),
                confidence: asNullableNumber(data.confidence) ?? 0,
                parseErrors: asStringArray(data.parseErrors),
                reportId: asNullableString(data.reportId),
                battleBoardId: asNullableString(data.battleBoardId),
                parsedAt: asNullableDate(data.parsedAt),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.eventId !== undefined)
                patch.eventId = asNullableString(data.eventId);
            if (data.fileName !== undefined)
                patch.fileName = data.fileName;
            if (data.mimeType !== undefined)
                patch.mimeType = data.mimeType;
            if (data.fileSize !== undefined)
                patch.fileSize = asNullableNumber(data.fileSize) ?? 0;
            if (data.blobUrl !== undefined)
                patch.blobUrl = asNullableString(data.blobUrl);
            if (data.fileType !== undefined)
                patch.fileType = asNullableString(data.fileType);
            if (data.detectedFormat !== undefined)
                patch.detectedFormat = asNullableString(data.detectedFormat);
            if (data.parseStatus !== undefined)
                patch.parseStatus = asNullableString(data.parseStatus);
            if (data.extractedData !== undefined)
                patch.extractedData = asJsonInput(data.extractedData);
            if (data.confidence !== undefined)
                patch.confidence = asNullableNumber(data.confidence) ?? 0;
            if (data.parseErrors !== undefined)
                patch.parseErrors = asStringArray(data.parseErrors);
            if (data.reportId !== undefined)
                patch.reportId = asNullableString(data.reportId);
            if (data.battleBoardId !== undefined)
                patch.battleBoardId = asNullableString(data.battleBoardId);
            if (data.parsedAt !== undefined)
                patch.parsedAt = asNullableDate(data.parsedAt);
            const row = await this.prisma.eventImport.update({
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
            await this.prisma.eventImport.update({
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
        await this.prisma.eventImport.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            eventId: r.eventId ?? null,
            fileName: r.fileName ?? "unknown.pdf",
            mimeType: r.mimeType ?? "application/pdf",
            fileSize: r.fileSize ?? 0,
            blobUrl: r.blobUrl ?? null,
            fileType: r.fileType ?? "pdf",
            detectedFormat: r.detectedFormat ?? null,
            parseStatus: r.parseStatus ?? "pending",
            extractedData: r.extractedData ?? {},
            confidence: r.confidence ?? 0,
            parseErrors: r.parseErrors ?? [],
            reportId: r.reportId ?? null,
            battleBoardId: r.battleBoardId ?? null,
            parsedAt: r.parsedAt ?? null,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
        };
    }
}
