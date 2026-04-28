/**
 * BROKEN_PRISMA_READ batch 13 — ScheduleShift + ShipmentItem Prisma stores.
 *
 * ScheduleShift — tenant_staff.schedule_shifts  (mixed: camelCase + snake_case shift_start/shift_end/role_during_shift)
 * ShipmentItem  — tenant_inventory.shipment_items (camelCase, Decimals)
 */

import type { PrismaClient } from "@repo/database/standalone";
import {
	asNullableDate,
	asNullableNumber,
	asNullableString,
	asString,
	reportOp,
	toDecimalInput,
	toDecimalRequired,
	type EntityInstance,
} from "./shared.js";

// ---------------------------------------------------------------------------
// ScheduleShiftPrismaStore
// ---------------------------------------------------------------------------

export class ScheduleShiftPrismaStore implements Store<EntityInstance> {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly tenantId: string,
	) {}

	async getAll(): Promise<EntityInstance[]> {
		const rows = await this.prisma.scheduleShift.findMany({
			where: { tenantId: this.tenantId, deletedAt: null },
			orderBy: { createdAt: "desc" },
		});
		return rows.map((r) => this.mapToManifestEntity(r));
	}

	async getById(id: string): Promise<EntityInstance | undefined> {
		const row = await this.prisma.scheduleShift.findFirst({
			where: { tenantId: this.tenantId, id, deletedAt: null },
		});
		return row ? this.mapToManifestEntity(row) : undefined;
	}

	async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
		const id = (data.id as string) || crypto.randomUUID();
		const row = await this.prisma.scheduleShift.create({
			data: {
				tenantId: this.tenantId,
				id,
				scheduleId: asString(data.scheduleId),
				employeeId: asString(data.employeeId),
				locationId: asString(data.locationId),
				shift_start: asNullableDate(data.shift_start ?? data.shiftStart) ?? new Date(),
				shift_end: asNullableDate(data.shift_end ?? data.shiftEnd) ?? new Date(),
				role_during_shift: asNullableString(data.role_during_shift ?? data.roleDuringShift),
				notes: asNullableString(data.notes),
			},
		});
		return this.mapToManifestEntity(row);
	}

	async update(
		id: string,
		data: Partial<EntityInstance>,
	): Promise<EntityInstance | undefined> {
		try {
			const patch: Record<string, unknown> = {};
			if (data.shift_start !== undefined)
				patch.shift_start = asNullableDate(data.shift_start);
			if (data.shiftStart !== undefined)
				patch.shift_start = asNullableDate(data.shiftStart);
			if (data.shift_end !== undefined)
				patch.shift_end = asNullableDate(data.shift_end);
			if (data.shiftEnd !== undefined)
				patch.shift_end = asNullableDate(data.shiftEnd);
			if (data.role_during_shift !== undefined)
				patch.role_during_shift = asNullableString(data.role_during_shift);
			if (data.roleDuringShift !== undefined)
				patch.role_during_shift = asNullableString(data.roleDuringShift);
			if (data.notes !== undefined)
				patch.notes = asNullableString(data.notes);

			const updated = await this.prisma.scheduleShift.update({
				where: { tenantId_id: { tenantId: this.tenantId, id } },
				data: patch,
			});
			return this.mapToManifestEntity(updated);
		} catch (error) {
			reportOp(this, "update", error);
			return undefined;
		}
	}

	async delete(id: string): Promise<boolean> {
		try {
			await this.prisma.scheduleShift.update({
				where: { tenantId_id: { tenantId: this.tenantId, id } },
				data: { deletedAt: new Date() },
			});
			return true;
		} catch (error) {
			reportOp(this, "delete", error);
			return false;
		}
	}

	async clear(): Promise<void> {
		await this.prisma.scheduleShift.deleteMany({
			where: { tenantId: this.tenantId },
		});
	}

	private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
		return {
			id: row.id as string,
			tenantId: row.tenantId as string,
			scheduleId: (row.scheduleId as string) ?? "",
			employeeId: (row.employeeId as string) ?? "",
			locationId: (row.locationId as string) ?? "",
			shiftStart: row.shift_start
				? new Date(row.shift_start as string | Date).getTime()
				: 0,
			shiftEnd: row.shift_end
				? new Date(row.shift_end as string | Date).getTime()
				: 0,
			roleDuringShift: (row.role_during_shift as string) ?? null,
			notes: (row.notes as string) ?? null,
			createdAt: row.createdAt
				? new Date(row.createdAt as string | Date).getTime()
				: 0,
			updatedAt: row.updatedAt
				? new Date(row.updatedAt as string | Date).getTime()
				: 0,
			deletedAt: row.deletedAt
				? new Date(row.deletedAt as string | Date).getTime()
				: null,
		};
	}
}

// ---------------------------------------------------------------------------
// ShipmentItemPrismaStore
// ---------------------------------------------------------------------------

export class ShipmentItemPrismaStore implements Store<EntityInstance> {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly tenantId: string,
	) {}

	async getAll(): Promise<EntityInstance[]> {
		const rows = await this.prisma.shipmentItem.findMany({
			where: { tenantId: this.tenantId, deletedAt: null },
			orderBy: { createdAt: "desc" },
		});
		return rows.map((r) => this.mapToManifestEntity(r));
	}

	async getById(id: string): Promise<EntityInstance | undefined> {
		const row = await this.prisma.shipmentItem.findFirst({
			where: { tenantId: this.tenantId, id, deletedAt: null },
		});
		return row ? this.mapToManifestEntity(row) : undefined;
	}

	async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
		const id = (data.id as string) || crypto.randomUUID();
		const row = await this.prisma.shipmentItem.create({
			data: {
				tenantId: this.tenantId,
				id,
				shipmentId: asString(data.shipmentId),
				itemId: asString(data.itemId),
				quantityShipped: toDecimalRequired(data.quantityShipped, 0),
				quantityReceived: toDecimalRequired(data.quantityReceived, 0),
				quantityDamaged: toDecimalRequired(data.quantityDamaged, 0),
				unitId: asNullableNumber(data.unitId),
				unitCost: toDecimalInput(data.unitCost),
				totalCost: toDecimalRequired(data.totalCost, 0),
				condition: asNullableString(data.condition) ?? "good",
				conditionNotes: asNullableString(data.conditionNotes),
				lotNumber: asNullableString(data.lotNumber),
				expirationDate: asNullableDate(data.expirationDate),
			},
		});
		return this.mapToManifestEntity(row);
	}

	async update(
		id: string,
		data: Partial<EntityInstance>,
	): Promise<EntityInstance | undefined> {
		try {
			const patch: Record<string, unknown> = {};
			if (data.quantityShipped !== undefined)
				patch.quantityShipped = toDecimalRequired(data.quantityShipped, 0);
			if (data.quantityReceived !== undefined)
				patch.quantityReceived = toDecimalRequired(data.quantityReceived, 0);
			if (data.quantityDamaged !== undefined)
				patch.quantityDamaged = toDecimalRequired(data.quantityDamaged, 0);
			if (data.unitId !== undefined)
				patch.unitId = asNullableNumber(data.unitId);
			if (data.unitCost !== undefined)
				patch.unitCost = toDecimalInput(data.unitCost);
			if (data.totalCost !== undefined)
				patch.totalCost = toDecimalRequired(data.totalCost, 0);
			if (data.condition !== undefined)
				patch.condition = asNullableString(data.condition);
			if (data.conditionNotes !== undefined)
				patch.conditionNotes = asNullableString(data.conditionNotes);
			if (data.lotNumber !== undefined)
				patch.lotNumber = asNullableString(data.lotNumber);
			if (data.expirationDate !== undefined)
				patch.expirationDate = asNullableDate(data.expirationDate);

			const updated = await this.prisma.shipmentItem.update({
				where: { tenantId_id: { tenantId: this.tenantId, id } },
				data: patch,
			});
			return this.mapToManifestEntity(updated);
		} catch (error) {
			reportOp(this, "update", error);
			return undefined;
		}
	}

	async delete(id: string): Promise<boolean> {
		try {
			await this.prisma.shipmentItem.update({
				where: { tenantId_id: { tenantId: this.tenantId, id } },
				data: { deletedAt: new Date() },
			});
			return true;
		} catch (error) {
			reportOp(this, "delete", error);
			return false;
		}
	}

	async clear(): Promise<void> {
		await this.prisma.shipmentItem.deleteMany({
			where: { tenantId: this.tenantId },
		});
	}

	private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
		return {
			id: row.id as string,
			tenantId: row.tenantId as string,
			shipmentId: (row.shipmentId as string) ?? "",
			itemId: (row.itemId as string) ?? "",
			quantityShipped: String(row.quantityShipped ?? "0"),
			quantityReceived: String(row.quantityReceived ?? "0"),
			quantityDamaged: String(row.quantityDamaged ?? "0"),
			unitId: (row.unitId as number) ?? null,
			unitCost: row.unitCost != null ? String(row.unitCost) : null,
			totalCost: String(row.totalCost ?? "0"),
			condition: (row.condition as string) ?? "good",
			conditionNotes: (row.conditionNotes as string) ?? null,
			lotNumber: (row.lotNumber as string) ?? null,
			expirationDate: row.expirationDate
				? new Date(row.expirationDate as string | Date).getTime()
				: null,
			createdAt: row.createdAt
				? new Date(row.createdAt as string | Date).getTime()
				: 0,
			updatedAt: row.updatedAt
				? new Date(row.updatedAt as string | Date).getTime()
				: 0,
			deletedAt: row.deletedAt
				? new Date(row.deletedAt as string | Date).getTime()
				: null,
		};
	}
}

// ---------------------------------------------------------------------------
// Minimal Store<T> interface (local re-declaration)
// ---------------------------------------------------------------------------

interface Store<T> {
	getAll(): Promise<T[]>;
	getById(id: string): Promise<T | undefined>;
	create(data: Partial<T>): Promise<T>;
	update(id: string, data: Partial<T>): Promise<T | undefined>;
	delete(id: string): Promise<boolean>;
	clear(): Promise<void>;
}
