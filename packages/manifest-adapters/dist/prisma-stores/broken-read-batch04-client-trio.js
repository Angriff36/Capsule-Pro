/**
 * Prisma stores for BROKEN_PRISMA_READ batch 04 — CRM trio.
 *
 * Covers ClientContact, ClientInteraction, ClientPreference (all in
 * `tenant_crm.*`). All three carry a soft-delete `deletedAt` column, so
 * `getAll`/`getById` filter `deletedAt: null` and `delete` writes
 * `deletedAt = new Date()` rather than removing the row.
 *
 * Notes on schema ↔ manifest mismatches handled here (see
 * `IMPLEMENTATION_PLAN.md` and the manifest specs in
 * `packages/manifest-adapters/manifests/`):
 *
 * - `ClientContact` Prisma columns are literal snake_case (`first_name`,
 *   `last_name`) — the manifest declares them as `firstName` / `lastName`.
 *   The `create`/`update` paths accept both spellings (mirrors the Client
 *   store from batch 03).
 * - `ClientInteraction` has a literal snake_case `correlation_id` column;
 *   the manifest declares `correlationId`. Both spellings are accepted.
 * - `ClientPreference.preferenceValue` is `Json` in Prisma but `string` in
 *   the manifest. We pass the value through `asJsonInput` so any
 *   JSON-serializable input (string, number, object, array) round-trips.
 */
import { asBool, asJsonInput, asNullableDate, asNullableString, asString, reportOp, } from "./shared";
// ---------------------------------------------------------------------------
// ClientContact (tenant_crm.client_contacts)
// ---------------------------------------------------------------------------
export class ClientContactPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.clientContact.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.clientContact.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.clientContact.create({
            data: {
                tenantId: this.tenantId,
                id,
                clientId: asString(data.clientId),
                first_name: asString(data.first_name ?? data.firstName),
                last_name: asString(data.last_name ?? data.lastName),
                title: asNullableString(data.title),
                email: asNullableString(data.email),
                phone: asNullableString(data.phone),
                phoneMobile: asNullableString(data.phoneMobile),
                isPrimary: asBool(data.isPrimary, false),
                isBillingContact: asBool(data.isBillingContact, false),
                notes: asNullableString(data.notes),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.clientId !== undefined)
                patch.clientId = asString(data.clientId);
            if (data.first_name !== undefined)
                patch.first_name = asString(data.first_name);
            if (data.firstName !== undefined)
                patch.first_name = asString(data.firstName);
            if (data.last_name !== undefined)
                patch.last_name = asString(data.last_name);
            if (data.lastName !== undefined)
                patch.last_name = asString(data.lastName);
            if (data.title !== undefined)
                patch.title = asNullableString(data.title);
            if (data.email !== undefined)
                patch.email = asNullableString(data.email);
            if (data.phone !== undefined)
                patch.phone = asNullableString(data.phone);
            if (data.phoneMobile !== undefined)
                patch.phoneMobile = asNullableString(data.phoneMobile);
            if (data.isPrimary !== undefined)
                patch.isPrimary = asBool(data.isPrimary, false);
            if (data.isBillingContact !== undefined)
                patch.isBillingContact = asBool(data.isBillingContact, false);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            const row = await this.prisma.clientContact.update({
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
            await this.prisma.clientContact.update({
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
        await this.prisma.clientContact.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            clientId: r.clientId ?? "",
            first_name: r.first_name ?? "",
            last_name: r.last_name ?? "",
            title: r.title ?? null,
            email: r.email ?? null,
            phone: r.phone ?? null,
            phoneMobile: r.phoneMobile ?? null,
            isPrimary: r.isPrimary ?? false,
            isBillingContact: r.isBillingContact ?? false,
            notes: r.notes ?? null,
        };
    }
}
// ---------------------------------------------------------------------------
// ClientInteraction (tenant_crm.client_interactions)
// ---------------------------------------------------------------------------
export class ClientInteractionPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.clientInteraction.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.clientInteraction.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.clientInteraction.create({
            data: {
                tenantId: this.tenantId,
                id,
                clientId: asNullableString(data.clientId),
                leadId: asNullableString(data.leadId),
                employeeId: asString(data.employeeId),
                interactionType: asString(data.interactionType) || "note",
                interactionDate: asNullableDate(data.interactionDate) ?? new Date(),
                subject: asNullableString(data.subject),
                description: asNullableString(data.description),
                followUpDate: asNullableDate(data.followUpDate),
                followUpCompleted: asBool(data.followUpCompleted, false),
                correlation_id: asNullableString(data.correlation_id ?? data.correlationId),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.clientId !== undefined)
                patch.clientId = asNullableString(data.clientId);
            if (data.leadId !== undefined)
                patch.leadId = asNullableString(data.leadId);
            if (data.employeeId !== undefined)
                patch.employeeId = asString(data.employeeId);
            if (data.interactionType !== undefined)
                patch.interactionType = asString(data.interactionType) || "note";
            if (data.interactionDate !== undefined)
                patch.interactionDate =
                    asNullableDate(data.interactionDate) ?? new Date();
            if (data.subject !== undefined)
                patch.subject = asNullableString(data.subject);
            if (data.description !== undefined)
                patch.description = asNullableString(data.description);
            if (data.followUpDate !== undefined)
                patch.followUpDate = asNullableDate(data.followUpDate);
            if (data.followUpCompleted !== undefined)
                patch.followUpCompleted = asBool(data.followUpCompleted, false);
            if (data.correlation_id !== undefined)
                patch.correlation_id = asNullableString(data.correlation_id);
            if (data.correlationId !== undefined)
                patch.correlation_id = asNullableString(data.correlationId);
            const row = await this.prisma.clientInteraction.update({
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
            await this.prisma.clientInteraction.update({
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
        await this.prisma.clientInteraction.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            clientId: r.clientId ?? null,
            leadId: r.leadId ?? null,
            employeeId: r.employeeId ?? "",
            interactionType: r.interactionType ?? "note",
            interactionDate: r.interactionDate ?? null,
            subject: r.subject ?? null,
            description: r.description ?? null,
            followUpDate: r.followUpDate ?? null,
            followUpCompleted: r.followUpCompleted ?? false,
            correlation_id: r.correlation_id ?? null,
        };
    }
}
// ---------------------------------------------------------------------------
// ClientPreference (tenant_crm.client_preferences)
// ---------------------------------------------------------------------------
export class ClientPreferencePrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.clientPreference.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.clientPreference.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.clientPreference.create({
            data: {
                tenantId: this.tenantId,
                id,
                clientId: asString(data.clientId),
                preferenceType: asString(data.preferenceType),
                preferenceKey: asString(data.preferenceKey),
                preferenceValue: asJsonInput(data.preferenceValue),
                notes: asNullableString(data.notes),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.clientId !== undefined)
                patch.clientId = asString(data.clientId);
            if (data.preferenceType !== undefined)
                patch.preferenceType = asString(data.preferenceType);
            if (data.preferenceKey !== undefined)
                patch.preferenceKey = asString(data.preferenceKey);
            if (data.preferenceValue !== undefined)
                patch.preferenceValue = asJsonInput(data.preferenceValue);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            const row = await this.prisma.clientPreference.update({
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
            await this.prisma.clientPreference.update({
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
        await this.prisma.clientPreference.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            clientId: r.clientId ?? "",
            preferenceType: r.preferenceType ?? "",
            preferenceKey: r.preferenceKey ?? "",
            preferenceValue: r.preferenceValue ?? null,
            notes: r.notes ?? null,
        };
    }
}
