/**
 * BROKEN_RAW_SQL parent workflow — Shipment Prisma store.
 *
 * Shipment — tenant_inventory.shipments
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Nullable Decimals: shippingCost, totalValue
 *   - Multiple DateTime fields (scheduled, shipped, estimated delivery, actual delivery)
 *     stored as DateTime @db.Timestamptz(6), manifest uses number (ms epoch)
 *   - Status lifecycle: draft → scheduled → preparing → in_transit → delivered / cancelled
 *   - Soft-delete via deletedAt
 */
import { asNullableDate, asNullableNumber, asNullableString, reportOp, toDecimalInput, } from "./shared.js";
// ---------------------------------------------------------------------------
// ShipmentPrismaStore
// ---------------------------------------------------------------------------
export class ShipmentPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.shipment.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.shipment.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.shipment.create({
            data: {
                tenantId: this.tenantId,
                id,
                shipmentNumber: asNullableString(data.shipmentNumber) ?? `SHP-${Date.now()}`,
                status: (asNullableString(data.status) ?? "draft"),
                eventId: asNullableString(data.eventId),
                supplierId: asNullableString(data.supplierId),
                locationId: asNullableString(data.locationId),
                scheduledDate: asNullableDate(data.scheduledDate),
                shippedDate: asNullableDate(data.shippedDate),
                estimatedDeliveryDate: asNullableDate(data.estimatedDeliveryDate),
                actualDeliveryDate: asNullableDate(data.actualDeliveryDate),
                totalItems: asNullableNumber(data.totalItems) ?? 0,
                shippingCost: toDecimalInput(data.shippingCost),
                totalValue: toDecimalInput(data.totalValue),
                trackingNumber: asNullableString(data.trackingNumber),
                carrier: asNullableString(data.carrier),
                shippingMethod: asNullableString(data.shippingMethod),
                deliveredBy: asNullableString(data.deliveredBy),
                receivedBy: asNullableString(data.receivedBy),
                signature: asNullableString(data.signature),
                notes: asNullableString(data.notes),
                internalNotes: asNullableString(data.internalNotes),
                reference: asNullableString(data.reference),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.status !== undefined)
                patch.status = asNullableString(data.status);
            if (data.eventId !== undefined)
                patch.eventId = asNullableString(data.eventId);
            if (data.supplierId !== undefined)
                patch.supplierId = asNullableString(data.supplierId);
            if (data.locationId !== undefined)
                patch.locationId = asNullableString(data.locationId);
            if (data.scheduledDate !== undefined)
                patch.scheduledDate = asNullableDate(data.scheduledDate);
            if (data.shippedDate !== undefined)
                patch.shippedDate = asNullableDate(data.shippedDate);
            if (data.estimatedDeliveryDate !== undefined)
                patch.estimatedDeliveryDate = asNullableDate(data.estimatedDeliveryDate);
            if (data.actualDeliveryDate !== undefined)
                patch.actualDeliveryDate = asNullableDate(data.actualDeliveryDate);
            if (data.totalItems !== undefined)
                patch.totalItems = asNullableNumber(data.totalItems);
            if (data.shippingCost !== undefined)
                patch.shippingCost = toDecimalInput(data.shippingCost);
            if (data.totalValue !== undefined)
                patch.totalValue = toDecimalInput(data.totalValue);
            if (data.trackingNumber !== undefined)
                patch.trackingNumber = asNullableString(data.trackingNumber);
            if (data.carrier !== undefined)
                patch.carrier = asNullableString(data.carrier);
            if (data.shippingMethod !== undefined)
                patch.shippingMethod = asNullableString(data.shippingMethod);
            if (data.deliveredBy !== undefined)
                patch.deliveredBy = asNullableString(data.deliveredBy);
            if (data.receivedBy !== undefined)
                patch.receivedBy = asNullableString(data.receivedBy);
            if (data.signature !== undefined)
                patch.signature = asNullableString(data.signature);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            if (data.internalNotes !== undefined)
                patch.internalNotes = asNullableString(data.internalNotes);
            if (data.reference !== undefined)
                patch.reference = asNullableString(data.reference);
            const row = await this.prisma.shipment.update({
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
            await this.prisma.shipment.update({
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
        await this.prisma.shipment.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            shipmentNumber: r.shipmentNumber ?? "",
            status: r.status ?? "draft",
            eventId: r.eventId ?? null,
            supplierId: r.supplierId ?? null,
            locationId: r.locationId ?? null,
            scheduledDate: r.scheduledDate instanceof Date ? r.scheduledDate.getTime() : 0,
            shippedDate: r.shippedDate instanceof Date ? r.shippedDate.getTime() : 0,
            estimatedDeliveryDate: r.estimatedDeliveryDate instanceof Date
                ? r.estimatedDeliveryDate.getTime()
                : 0,
            actualDeliveryDate: r.actualDeliveryDate instanceof Date
                ? r.actualDeliveryDate.getTime()
                : 0,
            totalItems: r.totalItems ?? 0,
            shippingCost: r.shippingCost != null ? Number(r.shippingCost) : 0,
            totalValue: r.totalValue != null ? Number(r.totalValue) : 0,
            trackingNumber: r.trackingNumber ?? null,
            carrier: r.carrier ?? null,
            shippingMethod: r.shippingMethod ?? null,
            deliveredBy: r.deliveredBy ?? null,
            receivedBy: r.receivedBy ?? null,
            signature: r.signature ?? null,
            notes: r.notes ?? null,
            internalNotes: r.internalNotes ?? null,
            reference: r.reference ?? null,
            createdAt: r.createdAt instanceof Date ? r.createdAt.getTime() : 0,
            updatedAt: r.updatedAt instanceof Date ? r.updatedAt.getTime() : 0,
            deletedAt: r.deletedAt instanceof Date ? r.deletedAt.getTime() : 0,
        };
    }
}
