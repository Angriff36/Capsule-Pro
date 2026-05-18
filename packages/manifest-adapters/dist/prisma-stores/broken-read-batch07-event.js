/**
 * BROKEN_PRISMA_READ batch 07 — Event + EventBudget + EventContract stores.
 *
 * Event         → (default schema).events
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Nullable Decimal: budget, ticketPrice
 *   - String[] arrays: accessibilityOptions, tags
 *
 * EventBudget   → tenant_events.event_budgets
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Required Decimal (default 0): totalBudgetAmount, totalActualAmount,
 *     varianceAmount, variancePercentage
 *
 * EventContract → tenant_events.event_contracts
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Nullable fields: contractNumber, documentUrl, documentType, signingToken, expiresAt
 *
 * All three soft-delete via deletedAt.
 */
import { asNullableDate, asNullableNumber, asNullableString, asStringArray, reportOp, toDecimalInput, toDecimalRequired, } from "./shared";
// ---------------------------------------------------------------------------
// EventPrismaStore
// ---------------------------------------------------------------------------
export class EventPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.event.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.event.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.event.create({
            data: {
                tenantId: this.tenantId,
                id,
                eventNumber: asNullableString(data.eventNumber),
                title: data.title ?? "Untitled Event",
                clientId: asNullableString(data.clientId),
                locationId: asNullableString(data.locationId),
                venueId: asNullableString(data.venueId),
                venueEntityId: asNullableString(data.venueEntityId),
                eventType: data.eventType,
                eventDate: asNullableDate(data.eventDate) ?? new Date(),
                guestCount: asNullableNumber(data.guestCount) ?? 1,
                status: asNullableString(data.status) ?? "confirmed",
                budget: toDecimalInput(data.budget),
                ticketPrice: toDecimalInput(data.ticketPrice),
                ticketTier: asNullableString(data.ticketTier),
                eventFormat: asNullableString(data.eventFormat),
                accessibilityOptions: asStringArray(data.accessibilityOptions),
                featuredMediaUrl: asNullableString(data.featuredMediaUrl),
                assignedTo: asNullableString(data.assignedTo),
                venueName: asNullableString(data.venueName),
                venueAddress: asNullableString(data.venueAddress),
                notes: asNullableString(data.notes),
                tags: asStringArray(data.tags),
                templateId: asNullableString(data.templateId),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.eventNumber !== undefined)
                patch.eventNumber = asNullableString(data.eventNumber);
            if (data.title !== undefined)
                patch.title = data.title;
            if (data.clientId !== undefined)
                patch.clientId = asNullableString(data.clientId);
            if (data.locationId !== undefined)
                patch.locationId = asNullableString(data.locationId);
            if (data.venueId !== undefined)
                patch.venueId = asNullableString(data.venueId);
            if (data.venueEntityId !== undefined)
                patch.venueEntityId = asNullableString(data.venueEntityId);
            if (data.eventType !== undefined)
                patch.eventType = data.eventType;
            if (data.eventDate !== undefined)
                patch.eventDate = asNullableDate(data.eventDate);
            if (data.guestCount !== undefined)
                patch.guestCount = asNullableNumber(data.guestCount) ?? 1;
            if (data.status !== undefined)
                patch.status = asNullableString(data.status);
            if (data.budget !== undefined)
                patch.budget = toDecimalInput(data.budget);
            if (data.ticketPrice !== undefined)
                patch.ticketPrice = toDecimalInput(data.ticketPrice);
            if (data.ticketTier !== undefined)
                patch.ticketTier = asNullableString(data.ticketTier);
            if (data.eventFormat !== undefined)
                patch.eventFormat = asNullableString(data.eventFormat);
            if (data.accessibilityOptions !== undefined)
                patch.accessibilityOptions = asStringArray(data.accessibilityOptions);
            if (data.featuredMediaUrl !== undefined)
                patch.featuredMediaUrl = asNullableString(data.featuredMediaUrl);
            if (data.assignedTo !== undefined)
                patch.assignedTo = asNullableString(data.assignedTo);
            if (data.venueName !== undefined)
                patch.venueName = asNullableString(data.venueName);
            if (data.venueAddress !== undefined)
                patch.venueAddress = asNullableString(data.venueAddress);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            if (data.tags !== undefined)
                patch.tags = asStringArray(data.tags);
            if (data.templateId !== undefined)
                patch.templateId = asNullableString(data.templateId);
            const row = await this.prisma.event.update({
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
            await this.prisma.event.update({
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
        await this.prisma.event.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            eventNumber: r.eventNumber ?? null,
            title: r.title ?? "Untitled Event",
            clientId: r.clientId ?? null,
            locationId: r.locationId ?? null,
            venueId: r.venueId ?? null,
            venueEntityId: r.venueEntityId ?? null,
            eventType: r.eventType ?? null,
            eventDate: r.eventDate ?? null,
            guestCount: r.guestCount ?? 1,
            status: r.status ?? "confirmed",
            budget: r.budget ?? null,
            ticketPrice: r.ticketPrice ?? null,
            ticketTier: r.ticketTier ?? null,
            eventFormat: r.eventFormat ?? null,
            accessibilityOptions: r.accessibilityOptions ?? [],
            featuredMediaUrl: r.featuredMediaUrl ?? null,
            assignedTo: r.assignedTo ?? null,
            venueName: r.venueName ?? null,
            venueAddress: r.venueAddress ?? null,
            notes: r.notes ?? null,
            tags: r.tags ?? [],
            templateId: r.templateId ?? null,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
        };
    }
}
// ---------------------------------------------------------------------------
// EventBudgetPrismaStore  (tenant_events.event_budgets)
// ---------------------------------------------------------------------------
export class EventBudgetPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.eventBudget.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.eventBudget.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.eventBudget.create({
            data: {
                tenantId: this.tenantId,
                id,
                eventId: data.eventId,
                version: asNullableNumber(data.version) ?? 1,
                status: asNullableString(data.status) ?? "draft",
                totalBudgetAmount: toDecimalRequired(data.totalBudgetAmount, 0),
                totalActualAmount: toDecimalRequired(data.totalActualAmount, 0),
                varianceAmount: toDecimalRequired(data.varianceAmount, 0),
                variancePercentage: toDecimalRequired(data.variancePercentage, 0),
                notes: asNullableString(data.notes),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.eventId !== undefined)
                patch.eventId = data.eventId;
            if (data.version !== undefined)
                patch.version = asNullableNumber(data.version) ?? 1;
            if (data.status !== undefined)
                patch.status = asNullableString(data.status);
            if (data.totalBudgetAmount !== undefined)
                patch.totalBudgetAmount = toDecimalRequired(data.totalBudgetAmount, 0);
            if (data.totalActualAmount !== undefined)
                patch.totalActualAmount = toDecimalRequired(data.totalActualAmount, 0);
            if (data.varianceAmount !== undefined)
                patch.varianceAmount = toDecimalRequired(data.varianceAmount, 0);
            if (data.variancePercentage !== undefined)
                patch.variancePercentage = toDecimalRequired(data.variancePercentage, 0);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            const row = await this.prisma.eventBudget.update({
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
            await this.prisma.eventBudget.update({
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
        await this.prisma.eventBudget.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            eventId: r.eventId ?? null,
            version: r.version ?? 1,
            status: r.status ?? "draft",
            totalBudgetAmount: r.totalBudgetAmount ?? 0,
            totalActualAmount: r.totalActualAmount ?? 0,
            varianceAmount: r.varianceAmount ?? 0,
            variancePercentage: r.variancePercentage ?? 0,
            notes: r.notes ?? null,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
        };
    }
}
// ---------------------------------------------------------------------------
// EventContractPrismaStore  (tenant_events.event_contracts)
// ---------------------------------------------------------------------------
export class EventContractPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.eventContract.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.eventContract.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.eventContract.create({
            data: {
                tenantId: this.tenantId,
                id,
                eventId: data.eventId,
                clientId: data.clientId,
                contractNumber: asNullableString(data.contractNumber),
                title: data.title ?? "Untitled Contract",
                status: asNullableString(data.status) ?? "draft",
                documentUrl: asNullableString(data.documentUrl),
                documentType: asNullableString(data.documentType),
                notes: asNullableString(data.notes),
                signingToken: asNullableString(data.signingToken),
                expiresAt: asNullableDate(data.expiresAt),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.eventId !== undefined)
                patch.eventId = data.eventId;
            if (data.clientId !== undefined)
                patch.clientId = data.clientId;
            if (data.contractNumber !== undefined)
                patch.contractNumber = asNullableString(data.contractNumber);
            if (data.title !== undefined)
                patch.title = data.title;
            if (data.status !== undefined)
                patch.status = asNullableString(data.status);
            if (data.documentUrl !== undefined)
                patch.documentUrl = asNullableString(data.documentUrl);
            if (data.documentType !== undefined)
                patch.documentType = asNullableString(data.documentType);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            if (data.signingToken !== undefined)
                patch.signingToken = asNullableString(data.signingToken);
            if (data.expiresAt !== undefined)
                patch.expiresAt = asNullableDate(data.expiresAt);
            const row = await this.prisma.eventContract.update({
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
            await this.prisma.eventContract.update({
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
        await this.prisma.eventContract.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            eventId: r.eventId ?? null,
            clientId: r.clientId ?? null,
            contractNumber: r.contractNumber ?? null,
            title: r.title ?? "Untitled Contract",
            status: r.status ?? "draft",
            documentUrl: r.documentUrl ?? null,
            documentType: r.documentType ?? null,
            notes: r.notes ?? null,
            signingToken: r.signingToken ?? null,
            expiresAt: r.expiresAt ?? null,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
        };
    }
}
