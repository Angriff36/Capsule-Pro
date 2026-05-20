/**
 * Prisma stores for BROKEN_PRISMA_READ batch 03
 * (ChartOfAccount, Client).
 *
 * Pattern mirrors AlertsConfigPrismaStore in `../prisma-store.ts`.
 *
 * Note: ChartOfAccount has NO `deletedAt` column — it does not support
 * soft-delete. `delete` performs a hard delete; `getAll`/`getById` do not
 * filter by deletedAt.
 */
import { asBool, asNullableNumber, asNullableString, asString, asStringArray, reportOp, } from "./shared";
const VALID_ACCOUNT_TYPES = new Set([
    "ASSET",
    "LIABILITY",
    "EQUITY",
    "REVENUE",
    "EXPENSE",
]);
function coerceAccountType(value) {
    const v = String(value ?? "").toUpperCase();
    return VALID_ACCOUNT_TYPES.has(v) ? v : "ASSET";
}
export class ChartOfAccountPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.chartOfAccount.findMany({
            where: { tenantId: this.tenantId },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.chartOfAccount.findFirst({
            where: { tenantId: this.tenantId, id },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.chartOfAccount.create({
            data: {
                tenantId: this.tenantId,
                id,
                accountNumber: asString(data.accountNumber),
                accountName: asString(data.accountName),
                accountType: coerceAccountType(data.accountType),
                parentId: asNullableString(data.parentId),
                isActive: asBool(data.isActive, true),
                description: asNullableString(data.description),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.accountNumber !== undefined)
                patch.accountNumber = asString(data.accountNumber);
            if (data.accountName !== undefined)
                patch.accountName = asString(data.accountName);
            if (data.accountType !== undefined)
                patch.accountType = coerceAccountType(data.accountType);
            if (data.parentId !== undefined)
                patch.parentId = asNullableString(data.parentId);
            if (data.isActive !== undefined)
                patch.isActive = asBool(data.isActive, true);
            if (data.description !== undefined)
                patch.description = asNullableString(data.description);
            const row = await this.prisma.chartOfAccount.update({
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
            await this.prisma.chartOfAccount.delete({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.chartOfAccount.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            accountNumber: r.accountNumber ?? "",
            accountName: r.accountName ?? "",
            accountType: r.accountType ?? "ASSET",
            parentId: r.parentId ?? null,
            isActive: r.isActive ?? true,
            description: r.description ?? null,
        };
    }
}
// ---------------------------------------------------------------------------
// Client (tenant_crm.clients)
// ---------------------------------------------------------------------------
export class ClientPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.client.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.client.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.client.create({
            data: {
                tenantId: this.tenantId,
                id,
                clientType: asString(data.clientType) || "company",
                company_name: asNullableString(data.company_name ?? data.companyName),
                first_name: asNullableString(data.first_name ?? data.firstName),
                last_name: asNullableString(data.last_name ?? data.lastName),
                email: asNullableString(data.email),
                phone: asNullableString(data.phone),
                website: asNullableString(data.website),
                addressLine1: asNullableString(data.addressLine1),
                addressLine2: asNullableString(data.addressLine2),
                city: asNullableString(data.city),
                stateProvince: asNullableString(data.stateProvince),
                postalCode: asNullableString(data.postalCode),
                countryCode: asNullableString(data.countryCode),
                defaultPaymentTerms: asNullableNumber(data.defaultPaymentTerms) ?? 30,
                taxExempt: asBool(data.taxExempt, false),
                taxId: asNullableString(data.taxId),
                notes: asNullableString(data.notes),
                tags: asStringArray(data.tags),
                source: asNullableString(data.source),
                assignedTo: asNullableString(data.assignedTo),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.clientType !== undefined)
                patch.clientType = asString(data.clientType);
            if (data.company_name !== undefined)
                patch.company_name = asNullableString(data.company_name);
            if (data.companyName !== undefined)
                patch.company_name = asNullableString(data.companyName);
            if (data.first_name !== undefined)
                patch.first_name = asNullableString(data.first_name);
            if (data.firstName !== undefined)
                patch.first_name = asNullableString(data.firstName);
            if (data.last_name !== undefined)
                patch.last_name = asNullableString(data.last_name);
            if (data.lastName !== undefined)
                patch.last_name = asNullableString(data.lastName);
            if (data.email !== undefined)
                patch.email = asNullableString(data.email);
            if (data.phone !== undefined)
                patch.phone = asNullableString(data.phone);
            if (data.website !== undefined)
                patch.website = asNullableString(data.website);
            if (data.addressLine1 !== undefined)
                patch.addressLine1 = asNullableString(data.addressLine1);
            if (data.addressLine2 !== undefined)
                patch.addressLine2 = asNullableString(data.addressLine2);
            if (data.city !== undefined)
                patch.city = asNullableString(data.city);
            if (data.stateProvince !== undefined)
                patch.stateProvince = asNullableString(data.stateProvince);
            if (data.postalCode !== undefined)
                patch.postalCode = asNullableString(data.postalCode);
            if (data.countryCode !== undefined)
                patch.countryCode = asNullableString(data.countryCode);
            if (data.defaultPaymentTerms !== undefined)
                patch.defaultPaymentTerms =
                    asNullableNumber(data.defaultPaymentTerms) ?? 30;
            if (data.taxExempt !== undefined)
                patch.taxExempt = asBool(data.taxExempt, false);
            if (data.taxId !== undefined)
                patch.taxId = asNullableString(data.taxId);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            if (data.tags !== undefined)
                patch.tags = asStringArray(data.tags);
            if (data.source !== undefined)
                patch.source = asNullableString(data.source);
            if (data.assignedTo !== undefined)
                patch.assignedTo = asNullableString(data.assignedTo);
            const row = await this.prisma.client.update({
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
            await this.prisma.client.update({
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
        await this.prisma.client.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            clientType: r.clientType ?? "company",
            company_name: r.company_name ?? null,
            first_name: r.first_name ?? null,
            last_name: r.last_name ?? null,
            email: r.email ?? null,
            phone: r.phone ?? null,
            website: r.website ?? null,
            addressLine1: r.addressLine1 ?? null,
            addressLine2: r.addressLine2 ?? null,
            city: r.city ?? null,
            stateProvince: r.stateProvince ?? null,
            postalCode: r.postalCode ?? null,
            countryCode: r.countryCode ?? null,
            defaultPaymentTerms: r.defaultPaymentTerms ?? 30,
            taxExempt: r.taxExempt ?? false,
            taxId: r.taxId ?? null,
            notes: r.notes ?? null,
            tags: Array.isArray(r.tags) ? r.tags : [],
            source: r.source ?? null,
            assignedTo: r.assignedTo ?? null,
        };
    }
}
