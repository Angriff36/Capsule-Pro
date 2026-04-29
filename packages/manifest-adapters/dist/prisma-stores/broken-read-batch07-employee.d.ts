/**
 * BROKEN_PRISMA_READ batch 07 — EmployeeCertification + EmployeeDeduction stores.
 *
 * EmployeeCertification → tenant_staff.employee_certifications
 *   - Snake_case Prisma model & fields (employee_certifications, tenant_id, deleted_at, etc.)
 *   - Composite key: tenant_id_id
 *
 * EmployeeDeduction    → tenant_staff.employee_deductions (PascalCase model)
 *   - CamelCase Prisma field names, composite key tenant_id_id
 *   - Nullable Decimal columns: amount, percentage, max_annual_amount
 *
 * Both soft-delete via their respective deleted_at fields.
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared.js";
export declare class EmployeeCertificationPrismaStore implements Store<EntityInstance> {
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
export declare class EmployeeDeductionPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-batch07-employee.d.ts.map