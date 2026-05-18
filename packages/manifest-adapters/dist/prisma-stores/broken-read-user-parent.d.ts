/**
 * BROKEN_RAW_SQL parent workflow — User Prisma store.
 *
 * User — tenant_staff.employees
 *   - CamelCase Prisma fields (@map annotations → snake_case columns)
 *   - Composite key: tenantId_id
 *   - Soft-delete via deletedAt
 *   - Nullable Decimal columns: hourlyRate, salaryAnnual
 *   - EmploymentType enum field
 *   - Nullable date columns: terminationDate
 *   - Required date column: hireDate
 */
import type { Store } from "@angriff36/manifest";
import { type PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class UserPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-user-parent.d.ts.map