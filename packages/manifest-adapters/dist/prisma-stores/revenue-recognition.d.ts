/**
 * Prisma stores for RevenueRecognitionSchedule + RevenueRecognitionLine.
 *
 * RevenueRecognitionSchedule — `tenant_accounting.revenue_recognition_schedules`
 *   - Composite key: tenantId_id
 *   - Required Decimals: totalAmount, remainingAmount
 *   - Default Decimal: recognizedAmount (0)
 *   - Required DateTimes: startDate, endDate
 *   - Required Int (no default): recognitionPeriod
 *   - Int defaults: totalMilestones (0), completedMilestones (0)
 *   - Optional DateTimes: serviceStartDate, serviceEndDate, completedAt
 *   - JSON column: metadata
 *   - Soft-delete via deletedAt
 *   - Every manifest property maps to a relational column — no metadata-only
 *     stashing required for this entity.
 *
 * RevenueRecognitionLine — `tenant_accounting.revenue_recognition_lines`
 *   - Composite key: tenantId_id
 *   - FK to schedule via tenantId+scheduleId (cascade delete)
 *   - Required Decimal: amount
 *   - Default Decimal: recognizedAmount (0)
 *   - Int default: sequence (0)
 *   - Optional DateTimes: dueDate, recognizedAt
 *   - Optional Strings: milestoneId/Name/Description, description, notes
 *   - JSON column: metadata
 *   - Soft-delete via deletedAt
 *   - Every manifest property maps to a relational column.
 *
 * Adding these stores closes the "soft compliance" gap surfaced by
 * `pnpm manifest:audit-direct-writes` for the revenue-recognition routes —
 * runtime persistence now writes the relational columns, not a JSON blob.
 * It does NOT migrate the API route. See the route's top-of-file blocker for
 * the remaining cross-entity-transaction blocker on `recognize` / `reverse`.
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class RevenueRecognitionSchedulePrismaStore implements Store<EntityInstance> {
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
export declare class RevenueRecognitionLinePrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=revenue-recognition.d.ts.map