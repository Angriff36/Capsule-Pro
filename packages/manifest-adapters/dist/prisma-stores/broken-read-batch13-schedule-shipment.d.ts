/**
 * BROKEN_PRISMA_READ batch 13 — ScheduleShift + ShipmentItem Prisma stores.
 *
 * ScheduleShift — tenant_staff.schedule_shifts  (mixed: camelCase + snake_case shift_start/shift_end/role_during_shift)
 * ShipmentItem  — tenant_inventory.shipment_items (camelCase, Decimals)
 */
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class ScheduleShiftPrismaStore implements Store<EntityInstance> {
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
export declare class ShipmentItemPrismaStore implements Store<EntityInstance> {
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
interface Store<T> {
    getAll(): Promise<T[]>;
    getById(id: string): Promise<T | undefined>;
    create(data: Partial<T>): Promise<T>;
    update(id: string, data: Partial<T>): Promise<T | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
}
export {};
//# sourceMappingURL=broken-read-batch13-schedule-shipment.d.ts.map