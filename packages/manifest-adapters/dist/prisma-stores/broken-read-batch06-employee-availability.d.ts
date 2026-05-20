/**
 * BROKEN_PRISMA_READ batch 06 — EmployeeAvailability store.
 *
 * EmployeeAvailability → tenant_staff.employee_availability
 *   - Snake_case Prisma model & fields (employee_availability, tenant_id, employee_id, etc.)
 *   - Composite key: tenant_id_id
 *   - Soft-delete via deleted_at
 *   - Time fields (start_time, end_time) are @db.Time(6), passed through as strings
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class EmployeeAvailabilityPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-batch06-employee-availability.d.ts.map