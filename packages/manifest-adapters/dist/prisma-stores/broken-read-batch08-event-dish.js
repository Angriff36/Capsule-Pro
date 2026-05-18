/**
 * BROKEN_PRISMA_READ batch 08 — EventDish store.
 *
 * EventDish → tenant_events.event_dishes
 *   - Snake_case Prisma model name AND field names (no @map annotations)
 *   - Composite key: tenant_id_id (tenant_id + id)
 *   - No Decimal fields, no String[] arrays
 *   - Soft-delete via deleted_at
 */
import { asNullableNumber, asNullableString, reportOp, } from "./shared";
// ---------------------------------------------------------------------------
// EventDishPrismaStore  (tenant_events.event_dishes — snake_case model)
// ---------------------------------------------------------------------------
export class EventDishPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.eventDish.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.eventDish.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.eventDish.create({
            data: {
                tenantId: this.tenantId,
                id,
                eventId: data.eventId,
                dishId: data.dishId,
                course: asNullableString(data.course),
                quantityServings: asNullableNumber(data.quantityServings) ?? 1,
                serviceStyle: asNullableString(data.serviceStyle),
                specialInstructions: asNullableString(data.specialInstructions),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.eventId !== undefined)
                patch.eventId = data.eventId;
            if (data.dishId !== undefined)
                patch.dishId = data.dishId;
            if (data.course !== undefined)
                patch.course = asNullableString(data.course);
            if (data.quantityServings !== undefined)
                patch.quantityServings = asNullableNumber(data.quantityServings) ?? 1;
            if (data.serviceStyle !== undefined)
                patch.serviceStyle = asNullableString(data.serviceStyle);
            if (data.specialInstructions !== undefined)
                patch.specialInstructions = asNullableString(data.specialInstructions);
            const row = await this.prisma.eventDish.update({
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
            await this.prisma.eventDish.update({
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
        await this.prisma.eventDish.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            eventId: r.eventId ?? null,
            dishId: r.dishId ?? null,
            course: r.course ?? null,
            quantityServings: r.quantityServings ?? 1,
            serviceStyle: r.serviceStyle ?? null,
            specialInstructions: r.specialInstructions ?? null,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
        };
    }
}
