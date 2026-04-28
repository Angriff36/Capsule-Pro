/**
 * BROKEN_PRISMA_READ batch 09 — InventoryItem + InventorySupplier stores.
 *
 * InventoryItem → tenant_inventory.inventory_items
 *   - MIXED Prisma field naming: some camelCase with @map, some snake_case without @map
 *   - Composite key: tenantId_id
 *   - Required Decimal: unitCost, quantityOnHand, parLevel, reorder_level
 *   - Nullable String: description, supplierId, fsa_status
 *   - String[]: tags
 *   - Nullable Boolean: fsa_temp_logged, fsa_allergen_info, fsa_traceable
 *   - Required String: item_number, name, category
 *
 * InventorySupplier → tenant_inventory.inventory_suppliers
 *   - MIXED Prisma field naming: some camelCase with @map, some snake_case without @map
 *   - Composite key: tenantId_id
 *   - Required Json: connectorCredentials
 *   - String[]: tags
 *   - Nullable String: contact_person, email, phone, connectorType, notes
 *   - Required String: supplier_number, name, payment_terms
 *
 * Replaces the inline InventoryItemPrismaStore in prisma-store.ts.
 * Both soft-delete via deletedAt.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asBool,
  asJsonInput,
  asNullableString,
  asStringArray,
  toDecimalRequired,
  type EntityInstance,
  reportOp,
} from "./shared.js";

// ---------------------------------------------------------------------------
// InventoryItemPrismaStore  (tenant_inventory.inventory_items)
// ---------------------------------------------------------------------------

export class InventoryItemPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.inventoryItem.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.inventoryItem.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.inventoryItem.create({
      data: {
        tenantId: this.tenantId,
        id,
        item_number: (data.itemNumber as string) ?? (data.item_number as string) ?? `ITEM-${Date.now()}`,
        name: (data.name as string) ?? "Unnamed Item",
        description: asNullableString(data.description),
        category: (data.category as string) ?? "general",
        unitOfMeasure: (data.unitOfMeasure as string) ?? "each",
        unitCost: toDecimalRequired(data.unitCost ?? data.costPerUnit, 0),
        quantityOnHand: toDecimalRequired(data.quantityOnHand, 0),
        parLevel: toDecimalRequired(data.parLevel, 0),
        reorder_level: toDecimalRequired(data.reorder_level ?? data.reorderPoint, 0),
        supplierId: asNullableString(data.supplierId),
        tags: asStringArray(data.tags ?? data.allergens),
        fsa_status: asNullableString(data.fsa_status ?? data.fsaStatus) ?? "unknown",
        fsa_temp_logged: asBool(data.fsa_temp_logged ?? data.fsaTempLogged, false),
        fsa_allergen_info: asBool(data.fsa_allergen_info ?? data.fsaAllergenInfo, false),
        fsa_traceable: asBool(data.fsa_traceable ?? data.fsaTraceable, false),
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
      if (data.item_number !== undefined || data.itemNumber !== undefined)
        patch.item_number = data.item_number ?? data.itemNumber;
      if (data.name !== undefined) patch.name = data.name;
      if (data.description !== undefined)
        patch.description = asNullableString(data.description);
      if (data.category !== undefined) patch.category = data.category;
      if (data.unitOfMeasure !== undefined) patch.unitOfMeasure = data.unitOfMeasure;
      if (data.unitCost !== undefined || data.costPerUnit !== undefined)
        patch.unitCost = toDecimalRequired(data.unitCost ?? data.costPerUnit, 0);
      if (data.quantityOnHand !== undefined)
        patch.quantityOnHand = toDecimalRequired(data.quantityOnHand, 0);
      if (data.parLevel !== undefined)
        patch.parLevel = toDecimalRequired(data.parLevel, 0);
      if (data.reorder_level !== undefined || data.reorderPoint !== undefined)
        patch.reorder_level = toDecimalRequired(data.reorder_level ?? data.reorderPoint, 0);
      if (data.supplierId !== undefined)
        patch.supplierId = asNullableString(data.supplierId);
      if (data.tags !== undefined || data.allergens !== undefined)
        patch.tags = asStringArray(data.tags ?? data.allergens);
      if (data.fsa_status !== undefined || data.fsaStatus !== undefined)
        patch.fsa_status = asNullableString(data.fsa_status ?? data.fsaStatus);
      if (data.fsa_temp_logged !== undefined || data.fsaTempLogged !== undefined)
        patch.fsa_temp_logged = asBool(data.fsa_temp_logged ?? data.fsaTempLogged, false);
      if (data.fsa_allergen_info !== undefined || data.fsaAllergenInfo !== undefined)
        patch.fsa_allergen_info = asBool(data.fsa_allergen_info ?? data.fsaAllergenInfo, false);
      if (data.fsa_traceable !== undefined || data.fsaTraceable !== undefined)
        patch.fsa_traceable = asBool(data.fsa_traceable ?? data.fsaTraceable, false);

      const row = await this.prisma.inventoryItem.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(row);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.inventoryItem.update({
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
    await this.prisma.inventoryItem.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      itemNumber: r.item_number ?? "",
      name: r.name ?? "",
      description: r.description ?? null,
      category: r.category ?? "",
      unitOfMeasure: r.unitOfMeasure ?? "each",
      unitCost: r.unitCost ?? 0,
      quantityOnHand: r.quantityOnHand ?? 0,
      parLevel: r.parLevel ?? 0,
      reorderLevel: r.reorder_level ?? 0,
      supplierId: r.supplierId ?? null,
      tags: r.tags ?? [],
      fsaStatus: r.fsa_status ?? "unknown",
      fsaTempLogged: r.fsa_temp_logged ?? false,
      fsaAllergenInfo: r.fsa_allergen_info ?? false,
      fsaTraceable: r.fsa_traceable ?? false,
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
      deletedAt: r.deletedAt ?? null,
    };
  }
}

// ---------------------------------------------------------------------------
// InventorySupplierPrismaStore  (tenant_inventory.inventory_suppliers)
// ---------------------------------------------------------------------------

export class InventorySupplierPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.inventorySupplier.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.inventorySupplier.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.inventorySupplier.create({
      data: {
        tenantId: this.tenantId,
        id,
        supplier_number: (data.supplierNumber as string) ?? (data.supplier_number as string) ?? `SUP-${Date.now()}`,
        name: (data.name as string) ?? "Unnamed Supplier",
        contact_person: asNullableString(data.contact_person ?? data.contactPerson),
        email: asNullableString(data.email),
        phone: asNullableString(data.phone),
        payment_terms: (data.payment_terms as string) ?? (data.paymentTerms as string) ?? "NET_30",
        connectorType: asNullableString(data.connectorType),
        connectorCredentials: asJsonInput(data.connectorCredentials),
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
      if (data.supplier_number !== undefined || data.supplierNumber !== undefined)
        patch.supplier_number = data.supplier_number ?? data.supplierNumber;
      if (data.name !== undefined) patch.name = data.name;
      if (data.contact_person !== undefined || data.contactPerson !== undefined)
        patch.contact_person = asNullableString(data.contact_person ?? data.contactPerson);
      if (data.email !== undefined)
        patch.email = asNullableString(data.email);
      if (data.phone !== undefined)
        patch.phone = asNullableString(data.phone);
      if (data.payment_terms !== undefined || data.paymentTerms !== undefined)
        patch.payment_terms = data.payment_terms ?? data.paymentTerms;
      if (data.connectorType !== undefined)
        patch.connectorType = asNullableString(data.connectorType);
      if (data.connectorCredentials !== undefined)
        patch.connectorCredentials = asJsonInput(data.connectorCredentials);
      if (data.notes !== undefined)
        patch.notes = asNullableString(data.notes);
      if (data.tags !== undefined)
        patch.tags = asStringArray(data.tags);

      const row = await this.prisma.inventorySupplier.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(row);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.inventorySupplier.update({
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
    await this.prisma.inventorySupplier.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      supplierNumber: r.supplier_number ?? "",
      name: r.name ?? "",
      contactPerson: r.contact_person ?? null,
      email: r.email ?? null,
      phone: r.phone ?? null,
      paymentTerms: r.payment_terms ?? "NET_30",
      connectorType: r.connectorType ?? null,
      connectorCredentials: r.connectorCredentials ?? {},
      notes: r.notes ?? null,
      tags: r.tags ?? [],
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
      deletedAt: r.deletedAt ?? null,
    };
  }
}
