/**
 * BROKEN_PRISMA_READ batch 13 — VendorCatalog + VendorContract Prisma stores.
 *
 * VendorCatalog  — tenant_inventory.vendor_catalog   (camelCase fields, Decimal, String[] tags)
 * VendorContract  — tenant_inventory.vendor_contracts (camelCase fields, many Decimals/Ints)
 */

import type { PrismaClient } from "@repo/database/standalone";
import {
	asBool,
	asNullableDate,
	asNullableNumber,
	asNullableString,
	asString,
	asStringArray,
	reportOp,
	toDecimalInput,
	toDecimalRequired,
	type EntityInstance,
} from "./shared.js";

// ---------------------------------------------------------------------------
// VendorCatalogPrismaStore
// ---------------------------------------------------------------------------

export class VendorCatalogPrismaStore implements Store<EntityInstance> {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly tenantId: string,
	) {}

	async getAll(): Promise<EntityInstance[]> {
		const rows = await this.prisma.vendorCatalog.findMany({
			where: { tenantId: this.tenantId, deletedAt: null },
			orderBy: { createdAt: "desc" },
		});
		return rows.map((r) => this.mapToManifestEntity(r));
	}

	async getById(id: string): Promise<EntityInstance | undefined> {
		const row = await this.prisma.vendorCatalog.findFirst({
			where: { tenantId: this.tenantId, id, deletedAt: null },
		});
		return row ? this.mapToManifestEntity(row) : undefined;
	}

	async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
		const id = (data.id as string) || crypto.randomUUID();
		const row = await this.prisma.vendorCatalog.create({
			data: {
				tenantId: this.tenantId,
				id,
				supplierId: asString(data.supplierId),
				itemNumber: asString(data.itemNumber),
				itemName: asString(data.itemName),
				description: asNullableString(data.description),
				category: asNullableString(data.category),
				baseUnitCost: toDecimalRequired(data.baseUnitCost, 0),
				currency: asString(data.currency) || "USD",
				unitOfMeasure: asString(data.unitOfMeasure),
				leadTimeDays: asNullableNumber(data.leadTimeDays),
				leadTimeMinDays: asNullableNumber(data.leadTimeMinDays),
				leadTimeMaxDays: asNullableNumber(data.leadTimeMaxDays),
				minimumOrderQuantity: toDecimalInput(data.minimumOrderQuantity),
				orderMultiple: toDecimalInput(data.orderMultiple),
				isActive: asBool(data.isActive, true),
				effectiveFrom: asNullableDate(data.effectiveFrom),
				effectiveTo: asNullableDate(data.effectiveTo),
				supplierSku: asNullableString(data.supplierSku),
				notes: asNullableString(data.notes),
				tags: asStringArray(data.tags),
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
			if (data.itemName !== undefined) patch.itemName = asString(data.itemName);
			if (data.description !== undefined)
				patch.description = asNullableString(data.description);
			if (data.category !== undefined)
				patch.category = asNullableString(data.category);
			if (data.baseUnitCost !== undefined)
				patch.baseUnitCost = toDecimalRequired(data.baseUnitCost, 0);
			if (data.currency !== undefined) patch.currency = asString(data.currency);
			if (data.unitOfMeasure !== undefined)
				patch.unitOfMeasure = asString(data.unitOfMeasure);
			if (data.leadTimeDays !== undefined)
				patch.leadTimeDays = asNullableNumber(data.leadTimeDays);
			if (data.minimumOrderQuantity !== undefined)
				patch.minimumOrderQuantity = toDecimalInput(data.minimumOrderQuantity);
			if (data.isActive !== undefined) patch.isActive = asBool(data.isActive);
			if (data.effectiveFrom !== undefined)
				patch.effectiveFrom = asNullableDate(data.effectiveFrom);
			if (data.effectiveTo !== undefined)
				patch.effectiveTo = asNullableDate(data.effectiveTo);
			if (data.supplierSku !== undefined)
				patch.supplierSku = asNullableString(data.supplierSku);
			if (data.notes !== undefined) patch.notes = asNullableString(data.notes);
			if (data.tags !== undefined) patch.tags = asStringArray(data.tags);
			if (data.lastCostUpdate !== undefined)
				patch.lastCostUpdate = asNullableDate(data.lastCostUpdate);

			const updated = await this.prisma.vendorCatalog.update({
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
			await this.prisma.vendorCatalog.update({
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
		await this.prisma.vendorCatalog.deleteMany({
			where: { tenantId: this.tenantId },
		});
	}

	private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
		return {
			id: row.id as string,
			tenantId: row.tenantId as string,
			supplierId: (row.supplierId as string) ?? "",
			itemNumber: (row.itemNumber as string) ?? "",
			itemName: (row.itemName as string) ?? "",
			description: (row.description as string) ?? null,
			category: (row.category as string) ?? null,
			baseUnitCost: String(row.baseUnitCost ?? "0"),
			currency: (row.currency as string) ?? "USD",
			unitOfMeasure: (row.unitOfMeasure as string) ?? "",
			leadTimeDays: (row.leadTimeDays as number) ?? null,
			leadTimeMinDays: (row.leadTimeMinDays as number) ?? null,
			leadTimeMaxDays: (row.leadTimeMaxDays as number) ?? null,
			minimumOrderQuantity: row.minimumOrderQuantity != null ? String(row.minimumOrderQuantity) : null,
			orderMultiple: row.orderMultiple != null ? String(row.orderMultiple) : null,
			isActive: (row.isActive as boolean) ?? true,
			effectiveFrom: row.effectiveFrom
				? new Date(row.effectiveFrom as string | Date).getTime()
				: null,
			effectiveTo: row.effectiveTo
				? new Date(row.effectiveTo as string | Date).getTime()
				: null,
			supplierSku: (row.supplierSku as string) ?? null,
			notes: (row.notes as string) ?? null,
			tags: (row.tags as string[]) ?? [],
			lastCostUpdate: row.lastCostUpdate
				? new Date(row.lastCostUpdate as string | Date).getTime()
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
// VendorContractPrismaStore
// ---------------------------------------------------------------------------

export class VendorContractPrismaStore implements Store<EntityInstance> {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly tenantId: string,
	) {}

	async getAll(): Promise<EntityInstance[]> {
		const rows = await this.prisma.vendorContract.findMany({
			where: { tenantId: this.tenantId, deletedAt: null },
			orderBy: { createdAt: "desc" },
		});
		return rows.map((r) => this.mapToManifestEntity(r));
	}

	async getById(id: string): Promise<EntityInstance | undefined> {
		const row = await this.prisma.vendorContract.findFirst({
			where: { tenantId: this.tenantId, id, deletedAt: null },
		});
		return row ? this.mapToManifestEntity(row) : undefined;
	}

	async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
		const id = (data.id as string) || crypto.randomUUID();
		const row = await this.prisma.vendorContract.create({
			data: {
				tenantId: this.tenantId,
				id,
				contractNumber: asString(data.contractNumber) || `VC-${crypto.randomUUID().slice(0, 8)}`,
				vendorId: asString(data.vendorId),
				vendorName: asNullableString(data.vendorName),
				contractType: asString(data.contractType) || "purchase",
				status: asString(data.status) || "draft",
				startDate: asNullableDate(data.startDate) ?? new Date(),
				endDate: asNullableDate(data.endDate),
				autoRenew: asBool(data.autoRenew, false),
				renewalTermDays: (data.renewalTermDays as number) ?? 365,
				noticeDaysBeforeRenewal: (data.noticeDaysBeforeRenewal as number) ?? 30,
				paymentTerms: asString(data.paymentTerms) || "NET_30",
				deliveryTerms: asNullableString(data.deliveryTerms),
				minimumOrderQuantity: toDecimalRequired(data.minimumOrderQuantity, 0),
				annualSpendCommitment: toDecimalRequired(data.annualSpendCommitment, 0),
				spendToPeriod: asNullableDate(data.spendToPeriod),
				currencyCode: asString(data.currencyCode) || "USD",
				approvedBy: asNullableString(data.approvedBy),
				approvedAt: asNullableDate(data.approvedAt),
				contractUrl: asNullableString(data.contractUrl),
				notes: asNullableString(data.notes),
				complianceScore: (data.complianceScore as number) ?? 100,
				slaBreachCount: (data.slaBreachCount as number) ?? 0,
				onTimeDeliveryRate: toDecimalRequired(data.onTimeDeliveryRate, 0),
				qualityRating: toDecimalRequired(data.qualityRating, 0),
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
			if (data.status !== undefined) patch.status = asString(data.status);
			if (data.endDate !== undefined)
				patch.endDate = asNullableDate(data.endDate);
			if (data.autoRenew !== undefined) patch.autoRenew = asBool(data.autoRenew);
			if (data.paymentTerms !== undefined)
				patch.paymentTerms = asString(data.paymentTerms);
			if (data.deliveryTerms !== undefined)
				patch.deliveryTerms = asNullableString(data.deliveryTerms);
			if (data.minimumOrderQuantity !== undefined)
				patch.minimumOrderQuantity = toDecimalRequired(data.minimumOrderQuantity, 0);
			if (data.annualSpendCommitment !== undefined)
				patch.annualSpendCommitment = toDecimalRequired(data.annualSpendCommitment, 0);
			if (data.approvedBy !== undefined)
				patch.approvedBy = asNullableString(data.approvedBy);
			if (data.approvedAt !== undefined)
				patch.approvedAt = asNullableDate(data.approvedAt);
			if (data.terminatedBy !== undefined)
				patch.terminatedBy = asNullableString(data.terminatedBy);
			if (data.terminatedAt !== undefined)
				patch.terminatedAt = asNullableDate(data.terminatedAt);
			if (data.terminationReason !== undefined)
				patch.terminationReason = asNullableString(data.terminationReason);
			if (data.contractUrl !== undefined)
				patch.contractUrl = asNullableString(data.contractUrl);
			if (data.notes !== undefined) patch.notes = asNullableString(data.notes);
			if (data.complianceScore !== undefined)
				patch.complianceScore = data.complianceScore;
			if (data.lastComplianceReview !== undefined)
				patch.lastComplianceReview = asNullableDate(data.lastComplianceReview);
			if (data.slaBreachCount !== undefined)
				patch.slaBreachCount = data.slaBreachCount;
			if (data.onTimeDeliveryRate !== undefined)
				patch.onTimeDeliveryRate = toDecimalRequired(data.onTimeDeliveryRate, 0);
			if (data.qualityRating !== undefined)
				patch.qualityRating = toDecimalRequired(data.qualityRating, 0);

			const updated = await this.prisma.vendorContract.update({
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
			await this.prisma.vendorContract.update({
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
		await this.prisma.vendorContract.deleteMany({
			where: { tenantId: this.tenantId },
		});
	}

	private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
		return {
			id: row.id as string,
			tenantId: row.tenantId as string,
			contractNumber: (row.contractNumber as string) ?? "",
			vendorId: (row.vendorId as string) ?? "",
			vendorName: (row.vendorName as string) ?? null,
			contractType: (row.contractType as string) ?? "purchase",
			status: (row.status as string) ?? "draft",
			startDate: row.startDate
				? new Date(row.startDate as string | Date).getTime()
				: 0,
			endDate: row.endDate
				? new Date(row.endDate as string | Date).getTime()
				: null,
			autoRenew: (row.autoRenew as boolean) ?? false,
			renewalTermDays: (row.renewalTermDays as number) ?? 365,
			noticeDaysBeforeRenewal: (row.noticeDaysBeforeRenewal as number) ?? 30,
			paymentTerms: (row.paymentTerms as string) ?? "NET_30",
			deliveryTerms: (row.deliveryTerms as string) ?? null,
			minimumOrderQuantity: String(row.minimumOrderQuantity ?? "0"),
			annualSpendCommitment: String(row.annualSpendCommitment ?? "0"),
			spendToPeriod: row.spendToPeriod
				? new Date(row.spendToPeriod as string | Date).getTime()
				: null,
			currencyCode: (row.currencyCode as string) ?? "USD",
			approvedBy: (row.approvedBy as string) ?? null,
			approvedAt: row.approvedAt
				? new Date(row.approvedAt as string | Date).getTime()
				: null,
			terminatedBy: (row.terminatedBy as string) ?? null,
			terminatedAt: row.terminatedAt
				? new Date(row.terminatedAt as string | Date).getTime()
				: null,
			terminationReason: (row.terminationReason as string) ?? null,
			contractUrl: (row.contractUrl as string) ?? null,
			notes: (row.notes as string) ?? null,
			complianceScore: (row.complianceScore as number) ?? 100,
			lastComplianceReview: row.lastComplianceReview
				? new Date(row.lastComplianceReview as string | Date).getTime()
				: null,
			slaBreachCount: (row.slaBreachCount as number) ?? 0,
			onTimeDeliveryRate: String(row.onTimeDeliveryRate ?? "0"),
			qualityRating: String(row.qualityRating ?? "0"),
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
