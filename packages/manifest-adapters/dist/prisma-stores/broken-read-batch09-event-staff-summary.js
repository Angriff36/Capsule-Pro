/**
 * BROKEN_PRISMA_READ batch 09 — EventStaffAssignment + EventSummary stores.
 *
 * EventStaffAssignment (manifest entity "EventStaff") → tenant_events.event_staff_assignments
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Nullable DateTime: startTime, endTime
 *   - Nullable String: notes
 *
 * EventSummary → tenant_events.event_summaries
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Nullable Json: highlights, issues, financialPerformance, clientFeedback, insights
 *   - Nullable String: overallSummary
 *   - Nullable Int: generationDurationMs
 *   - Required DateTime: generatedAt
 *
 * Both soft-delete via deletedAt.
 */
import { asJsonInput, asNullableDate, asNullableNumber, asNullableString, reportOp, } from "./shared.js";
// ---------------------------------------------------------------------------
// EventStaffAssignmentPrismaStore  (tenant_events.event_staff_assignments)
// Manifest entity name: "EventStaff"
// ---------------------------------------------------------------------------
export class EventStaffAssignmentPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.eventStaffAssignment.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.eventStaffAssignment.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.eventStaffAssignment.create({
            data: {
                tenantId: this.tenantId,
                id,
                eventId: data.eventId,
                employeeId: data.employeeId,
                role: data.role ?? "staff",
                startTime: asNullableDate(data.startTime),
                endTime: asNullableDate(data.endTime),
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
            if (data.employeeId !== undefined)
                patch.employeeId = data.employeeId;
            if (data.role !== undefined)
                patch.role = data.role;
            if (data.startTime !== undefined)
                patch.startTime = asNullableDate(data.startTime);
            if (data.endTime !== undefined)
                patch.endTime = asNullableDate(data.endTime);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            const row = await this.prisma.eventStaffAssignment.update({
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
            await this.prisma.eventStaffAssignment.update({
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
        await this.prisma.eventStaffAssignment.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            eventId: r.eventId ?? null,
            employeeId: r.employeeId ?? null,
            role: r.role ?? "staff",
            startTime: r.startTime ?? null,
            endTime: r.endTime ?? null,
            notes: r.notes ?? null,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
        };
    }
}
// ---------------------------------------------------------------------------
// EventSummaryPrismaStore  (tenant_events.event_summaries)
// ---------------------------------------------------------------------------
export class EventSummaryPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.eventSummary.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.eventSummary.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.eventSummary.create({
            data: {
                tenantId: this.tenantId,
                id,
                eventId: data.eventId,
                highlights: asJsonInput(data.highlights),
                issues: asJsonInput(data.issues),
                financialPerformance: asJsonInput(data.financialPerformance),
                clientFeedback: asJsonInput(data.clientFeedback),
                insights: asJsonInput(data.insights),
                overallSummary: asNullableString(data.overallSummary),
                generatedAt: asNullableDate(data.generatedAt) ?? new Date(),
                generationDurationMs: asNullableNumber(data.generationDurationMs),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.eventId !== undefined)
                patch.eventId = data.eventId;
            if (data.highlights !== undefined)
                patch.highlights = asJsonInput(data.highlights);
            if (data.issues !== undefined)
                patch.issues = asJsonInput(data.issues);
            if (data.financialPerformance !== undefined)
                patch.financialPerformance = asJsonInput(data.financialPerformance);
            if (data.clientFeedback !== undefined)
                patch.clientFeedback = asJsonInput(data.clientFeedback);
            if (data.insights !== undefined)
                patch.insights = asJsonInput(data.insights);
            if (data.overallSummary !== undefined)
                patch.overallSummary = asNullableString(data.overallSummary);
            if (data.generatedAt !== undefined)
                patch.generatedAt = asNullableDate(data.generatedAt) ?? new Date();
            if (data.generationDurationMs !== undefined)
                patch.generationDurationMs = asNullableNumber(data.generationDurationMs);
            const row = await this.prisma.eventSummary.update({
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
            await this.prisma.eventSummary.update({
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
        await this.prisma.eventSummary.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            eventId: r.eventId ?? null,
            highlights: r.highlights ?? [],
            issues: r.issues ?? [],
            financialPerformance: r.financialPerformance ?? [],
            clientFeedback: r.clientFeedback ?? [],
            insights: r.insights ?? [],
            overallSummary: r.overallSummary ?? null,
            generatedAt: r.generatedAt ?? null,
            generationDurationMs: r.generationDurationMs ?? null,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
        };
    }
}
