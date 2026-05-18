/**
 * Staff + Time Prisma Stores — BROKEN_PRISMA_READ Batch 12
 *
 * TimeEntryPrismaStore — time_entries table in tenant_staff.
 *   Mixed naming: camelCase (tenantId, employeeId, clockIn) alongside
 *   snake_case (shift_id, approved_by, approved_at, deleted_at).
 *   Soft-delete via deleted_at (snake_case). Composite key tenantId_id.
 *
 * TimecardEditRequestPrismaStore — timecard_edit_requests table in tenant_staff.
 *   CamelCase Prisma fields, NO soft-delete (hard delete).
 *   Composite key tenantId_id.
 *
 * TrainingAssignmentPrismaStore — training_assignments table in tenant_staff.
 *   All snake_case Prisma field names, soft-delete via deleted_at.
 *   Composite key tenant_id_id.
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class TimeEntryPrismaStore implements Store<EntityInstance> {
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
export declare class TimecardEditRequestPrismaStore implements Store<EntityInstance> {
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
export declare class TrainingAssignmentPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-batch12-staff-time.d.ts.map