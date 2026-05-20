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
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class EventStaffAssignmentPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
export declare class EventSummaryPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
//# sourceMappingURL=broken-read-batch09-event-staff-summary.d.ts.map