/**
 * Prisma stores for BROKEN_PRISMA_READ batch 03
 * (BudgetLineItem, BulkOrderRule, CateringOrder).
 *
 * Pattern mirrors AlertsConfigPrismaStore in `../prisma-store.ts`.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asBool,
  asNullableDate,
  asNullableNumber,
  asNullableString,
  asString,
  type EntityInstance,
  reportOp,
  toDecimalInput,
  toDecimalRequired,
} from "./shared.js";

// ---------------------------------------------------------------------------
// BudgetLineItem (tenant_events.budget_line_items)
// ---------------------------------------------------------------------------

export class BudgetLineItemPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.budgetLineItem.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.budgetLineItem.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.budgetLineItem.create({
      data: {
        tenantId: this.tenantId,
        id,
        budgetId: asString(data.budgetId),
        category: asString(data.category),
        name: asString(data.name),
        description: asNullableString(data.description),
        budgetedAmount: toDecimalRequired(data.budgetedAmount ?? 0),
        actualAmount: toDecimalRequired(data.actualAmount ?? 0),
        varianceAmount: toDecimalRequired(data.varianceAmount ?? 0),
        sortOrder: asNullableNumber(data.sortOrder) ?? 0,
        notes: asNullableString(data.notes),
      },
    });
    return this.mapToManifestEntity(row);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};
      if (data.budgetId !== undefined)
        patch.budgetId = asString(data.budgetId);
      if (data.category !== undefined)
        patch.category = asString(data.category);
      if (data.name !== undefined) patch.name = asString(data.name);
      if (data.description !== undefined)
        patch.description = asNullableString(data.description);
      if (data.budgetedAmount !== undefined)
        patch.budgetedAmount = toDecimalInput(data.budgetedAmount);
      if (data.actualAmount !== undefined)
        patch.actualAmount = toDecimalInput(data.actualAmount);
      if (data.varianceAmount !== undefined)
        patch.varianceAmount = toDecimalInput(data.varianceAmount);
      if (data.sortOrder !== undefined)
        patch.sortOrder = asNullableNumber(data.sortOrder) ?? 0;
      if (data.notes !== undefined)
        patch.notes = asNullableString(data.notes);
      const row = await this.prisma.budgetLineItem.update({
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
      await this.prisma.budgetLineItem.update({
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
    await this.prisma.budgetLineItem.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      budgetId: (r.budgetId as string) ?? "",
      category: (r.category as string) ?? "",
      name: (r.name as string) ?? "",
      description: (r.description as string) ?? null,
      budgetedAmount: r.budgetedAmount ?? null,
      actualAmount: r.actualAmount ?? null,
      varianceAmount: r.varianceAmount ?? null,
      sortOrder: r.sortOrder ?? 0,
      notes: (r.notes as string) ?? null,
    };
  }
}

// ---------------------------------------------------------------------------
// BulkOrderRule (tenant_inventory.bulk_order_rules)
// ---------------------------------------------------------------------------

export class BulkOrderRulePrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.bulkOrderRule.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.bulkOrderRule.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.bulkOrderRule.create({
      data: {
        tenantId: this.tenantId,
        id,
        catalogEntryId: asString(data.catalogEntryId),
        ruleName: asString(data.ruleName),
        minimumQuantity: toDecimalRequired(data.minimumQuantity ?? 0),
        ruleType: asString(data.ruleType),
        thresholdQuantity: toDecimalInput(data.thresholdQuantity),
        action: asString(data.action),
        discountPercent: toDecimalInput(data.discountPercent),
        freeItemQuantity: asNullableNumber(data.freeItemQuantity),
        shippingIncluded: asBool(data.shippingIncluded, false),
        priority: asNullableNumber(data.priority) ?? 0,
        effectiveFrom: asNullableDate(data.effectiveFrom),
        effectiveTo: asNullableDate(data.effectiveTo),
        isActive: asBool(data.isActive, true),
      },
    });
    return this.mapToManifestEntity(row);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};
      if (data.catalogEntryId !== undefined)
        patch.catalogEntryId = asString(data.catalogEntryId);
      if (data.ruleName !== undefined)
        patch.ruleName = asString(data.ruleName);
      if (data.minimumQuantity !== undefined)
        patch.minimumQuantity = toDecimalInput(data.minimumQuantity);
      if (data.ruleType !== undefined)
        patch.ruleType = asString(data.ruleType);
      if (data.thresholdQuantity !== undefined)
        patch.thresholdQuantity = toDecimalInput(data.thresholdQuantity);
      if (data.action !== undefined) patch.action = asString(data.action);
      if (data.discountPercent !== undefined)
        patch.discountPercent = toDecimalInput(data.discountPercent);
      if (data.freeItemQuantity !== undefined)
        patch.freeItemQuantity = asNullableNumber(data.freeItemQuantity);
      if (data.shippingIncluded !== undefined)
        patch.shippingIncluded = asBool(data.shippingIncluded, false);
      if (data.priority !== undefined)
        patch.priority = asNullableNumber(data.priority) ?? 0;
      if (data.effectiveFrom !== undefined)
        patch.effectiveFrom = asNullableDate(data.effectiveFrom);
      if (data.effectiveTo !== undefined)
        patch.effectiveTo = asNullableDate(data.effectiveTo);
      if (data.isActive !== undefined)
        patch.isActive = asBool(data.isActive, true);
      const row = await this.prisma.bulkOrderRule.update({
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
      await this.prisma.bulkOrderRule.update({
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
    await this.prisma.bulkOrderRule.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      catalogEntryId: (r.catalogEntryId as string) ?? "",
      ruleName: (r.ruleName as string) ?? "",
      minimumQuantity: r.minimumQuantity ?? null,
      ruleType: (r.ruleType as string) ?? "",
      thresholdQuantity: r.thresholdQuantity ?? null,
      action: (r.action as string) ?? "",
      discountPercent: r.discountPercent ?? null,
      freeItemQuantity: r.freeItemQuantity ?? null,
      shippingIncluded: r.shippingIncluded ?? false,
      priority: r.priority ?? 0,
      effectiveFrom: r.effectiveFrom ?? null,
      effectiveTo: r.effectiveTo ?? null,
      isActive: r.isActive ?? true,
    };
  }
}

// ---------------------------------------------------------------------------
// CateringOrder (tenant_events.catering_orders)
// ---------------------------------------------------------------------------

export class CateringOrderPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.cateringOrder.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.cateringOrder.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.cateringOrder.create({
      data: {
        tenantId: this.tenantId,
        id,
        customer_id: asString(data.customer_id ?? data.customerId),
        eventId: asNullableString(data.eventId),
        orderNumber: asString(data.orderNumber),
        order_status: asString(data.order_status ?? data.orderStatus) || "draft",
        order_date:
          asNullableDate(data.order_date ?? data.orderDate) ?? new Date(),
        delivery_date:
          asNullableDate(data.delivery_date ?? data.deliveryDate) ?? new Date(),
        delivery_time: asString(data.delivery_time ?? data.deliveryTime),
        subtotal_amount: toDecimalRequired(
          data.subtotal_amount ?? data.subtotalAmount ?? 0
        ),
        tax_amount: toDecimalRequired(data.tax_amount ?? data.taxAmount ?? 0),
        discount_amount: toDecimalRequired(
          data.discount_amount ?? data.discountAmount ?? 0
        ),
        service_charge_amount: toDecimalRequired(
          data.service_charge_amount ?? data.serviceChargeAmount ?? 0
        ),
        totalAmount: toDecimalRequired(data.totalAmount ?? 0),
        deposit_required: asBool(
          data.deposit_required ?? data.depositRequired,
          false
        ),
        deposit_amount: toDecimalInput(
          data.deposit_amount ?? data.depositAmount
        ),
        deposit_paid: asBool(data.deposit_paid ?? data.depositPaid, false),
        deposit_paid_at: asNullableDate(
          data.deposit_paid_at ?? data.depositPaidAt
        ),
        venue_name: asNullableString(data.venue_name ?? data.venueName),
        venue_address: asNullableString(
          data.venue_address ?? data.venueAddress
        ),
        venue_city: asNullableString(data.venue_city ?? data.venueCity),
        venue_state: asNullableString(data.venue_state ?? data.venueState),
        venue_zip: asNullableString(data.venue_zip ?? data.venueZip),
        venue_contact_name: asNullableString(
          data.venue_contact_name ?? data.venueContactName
        ),
        venue_contact_phone: asNullableString(
          data.venue_contact_phone ?? data.venueContactPhone
        ),
        guest_count: asNullableNumber(data.guest_count ?? data.guestCount) ?? 0,
        special_instructions: asNullableString(
          data.special_instructions ?? data.specialInstructions
        ),
        dietary_restrictions: asNullableString(
          data.dietary_restrictions ?? data.dietaryRestrictions
        ),
        staff_required: asNullableNumber(
          data.staff_required ?? data.staffRequired
        ),
        staff_assigned: asNullableNumber(
          data.staff_assigned ?? data.staffAssigned
        ),
      },
    });
    return this.mapToManifestEntity(row);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};
      if (data.customer_id !== undefined)
        patch.customer_id = asString(data.customer_id);
      if (data.customerId !== undefined)
        patch.customer_id = asString(data.customerId);
      if (data.eventId !== undefined)
        patch.eventId = asNullableString(data.eventId);
      if (data.orderNumber !== undefined)
        patch.orderNumber = asString(data.orderNumber);
      if (data.order_status !== undefined)
        patch.order_status = asString(data.order_status);
      if (data.orderStatus !== undefined)
        patch.order_status = asString(data.orderStatus);
      if (data.delivery_date !== undefined)
        patch.delivery_date = asNullableDate(data.delivery_date);
      if (data.delivery_time !== undefined)
        patch.delivery_time = asString(data.delivery_time);
      if (data.totalAmount !== undefined)
        patch.totalAmount = toDecimalInput(data.totalAmount);
      if (data.guest_count !== undefined)
        patch.guest_count = asNullableNumber(data.guest_count) ?? 0;
      const row = await this.prisma.cateringOrder.update({
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
      await this.prisma.cateringOrder.update({
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
    await this.prisma.cateringOrder.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      customer_id: (r.customer_id as string) ?? "",
      eventId: (r.eventId as string) ?? null,
      orderNumber: (r.orderNumber as string) ?? "",
      order_status: (r.order_status as string) ?? "draft",
      order_date: r.order_date ?? null,
      delivery_date: r.delivery_date ?? null,
      delivery_time: (r.delivery_time as string) ?? "",
      subtotal_amount: r.subtotal_amount ?? null,
      tax_amount: r.tax_amount ?? null,
      discount_amount: r.discount_amount ?? null,
      service_charge_amount: r.service_charge_amount ?? null,
      totalAmount: r.totalAmount ?? null,
      deposit_required: r.deposit_required ?? false,
      deposit_amount: r.deposit_amount ?? null,
      deposit_paid: r.deposit_paid ?? false,
      deposit_paid_at: r.deposit_paid_at ?? null,
      venue_name: (r.venue_name as string) ?? null,
      venue_address: (r.venue_address as string) ?? null,
      venue_city: (r.venue_city as string) ?? null,
      venue_state: (r.venue_state as string) ?? null,
      venue_zip: (r.venue_zip as string) ?? null,
      venue_contact_name: (r.venue_contact_name as string) ?? null,
      venue_contact_phone: (r.venue_contact_phone as string) ?? null,
      guest_count: r.guest_count ?? 0,
      special_instructions: (r.special_instructions as string) ?? null,
      dietary_restrictions: (r.dietary_restrictions as string) ?? null,
      staff_required: r.staff_required ?? null,
      staff_assigned: r.staff_assigned ?? null,
    };
  }
}
