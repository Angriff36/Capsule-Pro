/**
 * BROKEN_PRISMA_READ batch 08 — EventProfitability + EventReport stores.
 *
 * EventProfitability → tenant_events.event_profitability
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Many required Decimal fields (all @default(0)): budgetedRevenue,
 *     budgetedFoodCost, budgetedLaborCost, budgetedOverhead,
 *     budgetedTotalCost, budgetedGrossMargin, budgetedGrossMarginPct,
 *     actualRevenue, actualFoodCost, actualLaborCost, actualOverhead,
 *     actualTotalCost, actualGrossMargin, actualGrossMarginPct,
 *     revenueVariance, foodCostVariance, laborCostVariance,
 *     totalCostVariance, marginVariancePct
 *
 * EventReport → tenant_events.event_reports
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Json fields: checklistData (required), parsedEventData (nullable),
 *     reportConfig (nullable)
 *   - Nullable Int: autoFillScore, completion
 *   - Nullable DateTime: reviewedAt, completedAt
 *
 * Both soft-delete via deletedAt.
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class EventProfitabilityPrismaStore implements Store<EntityInstance> {
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
export declare class EventReportPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-batch08-event-profit-report.d.ts.map