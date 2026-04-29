/**
 * BROKEN_RAW_SQL parent workflow — Proposal Prisma store.
 *
 * Proposal — tenant_crm.proposals
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Required Decimals (default 0): subtotal, taxRate, taxAmount,
 *     discountAmount, total
 *   - Status lifecycle: draft → sent → viewed → accepted / rejected / expired
 *   - Timestamp fields: sentAt, viewedAt, acceptedAt, rejectedAt
 *   - Soft-delete via deletedAt
 */
import { asNullableDate, asNullableNumber, asNullableString, reportOp, toDecimalRequired, } from "./shared.js";
// ---------------------------------------------------------------------------
// ProposalPrismaStore
// ---------------------------------------------------------------------------
export class ProposalPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.proposal.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.proposal.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.proposal.create({
            data: {
                tenantId: this.tenantId,
                id,
                proposalNumber: data.proposalNumber ?? `PROP-${Date.now()}`,
                templateId: asNullableString(data.templateId),
                clientId: asNullableString(data.clientId),
                leadId: asNullableString(data.leadId),
                eventId: asNullableString(data.eventId),
                title: data.title ?? "Untitled Proposal",
                eventDate: asNullableDate(data.eventDate),
                eventType: asNullableString(data.eventType),
                guestCount: asNullableNumber(data.guestCount),
                venueName: asNullableString(data.venueName),
                venueAddress: asNullableString(data.venueAddress),
                subtotal: toDecimalRequired(data.subtotal, 0),
                taxRate: toDecimalRequired(data.taxRate, 0),
                taxAmount: toDecimalRequired(data.taxAmount, 0),
                discountAmount: toDecimalRequired(data.discountAmount, 0),
                total: toDecimalRequired(data.total, 0),
                status: asNullableString(data.status) ?? "draft",
                publicToken: asNullableString(data.publicToken),
                validUntil: asNullableDate(data.validUntil),
                sentAt: asNullableDate(data.sentAt),
                viewedAt: asNullableDate(data.viewedAt),
                acceptedAt: asNullableDate(data.acceptedAt),
                rejectedAt: asNullableDate(data.rejectedAt),
                notes: asNullableString(data.notes),
                termsAndConditions: asNullableString(data.termsAndConditions),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.proposalNumber !== undefined)
                patch.proposalNumber = data.proposalNumber;
            if (data.templateId !== undefined)
                patch.templateId = asNullableString(data.templateId);
            if (data.clientId !== undefined)
                patch.clientId = asNullableString(data.clientId);
            if (data.leadId !== undefined)
                patch.leadId = asNullableString(data.leadId);
            if (data.eventId !== undefined)
                patch.eventId = asNullableString(data.eventId);
            if (data.title !== undefined)
                patch.title = data.title;
            if (data.eventDate !== undefined)
                patch.eventDate = asNullableDate(data.eventDate);
            if (data.eventType !== undefined)
                patch.eventType = asNullableString(data.eventType);
            if (data.guestCount !== undefined)
                patch.guestCount = asNullableNumber(data.guestCount);
            if (data.venueName !== undefined)
                patch.venueName = asNullableString(data.venueName);
            if (data.venueAddress !== undefined)
                patch.venueAddress = asNullableString(data.venueAddress);
            if (data.subtotal !== undefined)
                patch.subtotal = toDecimalRequired(data.subtotal, 0);
            if (data.taxRate !== undefined)
                patch.taxRate = toDecimalRequired(data.taxRate, 0);
            if (data.taxAmount !== undefined)
                patch.taxAmount = toDecimalRequired(data.taxAmount, 0);
            if (data.discountAmount !== undefined)
                patch.discountAmount = toDecimalRequired(data.discountAmount, 0);
            if (data.total !== undefined)
                patch.total = toDecimalRequired(data.total, 0);
            if (data.status !== undefined)
                patch.status = asNullableString(data.status);
            if (data.publicToken !== undefined)
                patch.publicToken = asNullableString(data.publicToken);
            if (data.validUntil !== undefined)
                patch.validUntil = asNullableDate(data.validUntil);
            if (data.sentAt !== undefined)
                patch.sentAt = asNullableDate(data.sentAt);
            if (data.viewedAt !== undefined)
                patch.viewedAt = asNullableDate(data.viewedAt);
            if (data.acceptedAt !== undefined)
                patch.acceptedAt = asNullableDate(data.acceptedAt);
            if (data.rejectedAt !== undefined)
                patch.rejectedAt = asNullableDate(data.rejectedAt);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            if (data.termsAndConditions !== undefined)
                patch.termsAndConditions = asNullableString(data.termsAndConditions);
            const row = await this.prisma.proposal.update({
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
            await this.prisma.proposal.update({
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
        await this.prisma.proposal.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            proposalNumber: r.proposalNumber ?? "",
            templateId: r.templateId ?? null,
            clientId: r.clientId ?? null,
            leadId: r.leadId ?? null,
            eventId: r.eventId ?? null,
            title: r.title ?? "Untitled Proposal",
            eventDate: r.eventDate ?? null,
            eventType: r.eventType ?? null,
            guestCount: r.guestCount ?? null,
            venueName: r.venueName ?? null,
            venueAddress: r.venueAddress ?? null,
            subtotal: r.subtotal ?? 0,
            taxRate: r.taxRate ?? 0,
            taxAmount: r.taxAmount ?? 0,
            discountAmount: r.discountAmount ?? 0,
            total: r.total ?? 0,
            status: r.status ?? "draft",
            publicToken: r.publicToken ?? null,
            validUntil: r.validUntil ?? null,
            sentAt: r.sentAt ?? null,
            viewedAt: r.viewedAt ?? null,
            acceptedAt: r.acceptedAt ?? null,
            rejectedAt: r.rejectedAt ?? null,
            notes: r.notes ?? null,
            termsAndConditions: r.termsAndConditions ?? null,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
        };
    }
}
