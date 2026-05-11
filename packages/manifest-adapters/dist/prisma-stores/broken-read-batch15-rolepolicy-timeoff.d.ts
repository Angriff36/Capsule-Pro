/**
 * Prisma stores for BROKEN_PRISMA_READ batch 15 — RolePolicy, TimeOffRequest.
 *
 * RolePolicy — tenant_staff.role_policies
 *   - Composite key: tenantId_id
 *   - Unique: tenantId_roleId
 *   - JSON column: permissions
 *   - Soft-delete via deletedAt
 *   - Prisma model: RolePolicy, client accessor: prisma.rolePolicy
 *
 * TimeOffRequest — tenant_staff.employee_time_off_requests
 *   - Composite key: tenant_id_id (snake_case fields)
 *   - Required fields: employee_id, request_type, start_date, end_date, hours
 *   - Status enum: PENDING, APPROVED, REJECTED, CANCELLED
 *   - Soft-delete via deleted_at
 *   - Prisma model: EmployeeTimeOffRequest, client accessor: prisma.employeeTimeOffRequest
 *   - Manifest entity name: "TimeOffRequest"
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared.js";
export declare class RolePolicyPrismaStore implements Store<EntityInstance> {
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
export declare class TimeOffRequestPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-batch15-rolepolicy-timeoff.d.ts.map