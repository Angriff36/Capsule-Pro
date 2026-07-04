/**
 * InventoryTransfer Prisma store (bespoke — not generic metadata-driven).
 *
 * Why this exists (per IMPLEMENTATION_PLAN.md "InventoryTransfer.transferNumber — deferred"):
 *
 * Before this store, InventoryTransfer fell back to the generic PrismaJsonStore,
 * which wrote a JSON blob to `manifest_instances` instead of a row to the
 * dedicated `inventory_transfers` table. The UI POSTs items in the body, and
 * those items had no destination. The manifest's `command create` declared
 * `requestedBy` as a required-but-defaulted `""` param that the UI never sent,
 * resulting in silent empty-string writes for an audit-sensitive field.
 *
 * This store:
 *   1. Persists InventoryTransfer rows in the real `inventory_transfers` table.
 *   2. Generates `transferNumber` server-side via `count() + 1` zero-padded
 *      to 6 digits (e.g. "TRF-000004"). Matches the pre-existing test fixture
 *      contract in apps/api/__tests__/inventory/transfers/transfers.quarantine.test.ts.
 *   3. Persists `items: [{ itemId, quantity, notes }]` to the
 *      `inventory_transfer_items` child table in the same `$transaction` as
 *      the parent row.
 *   4. Injects `requestedBy` from RuntimeContext.user.id (plumbed via the
 *      store provider's `userId` arg) — the manifest no longer captures it
 *      as a create param. Per IMPLEMENTATION_PLAN.md §101 and constitution
 *      §2/§14 — no silent `?? ""` fallback.
 *
 * Schema-drift allowlist entries that point at this file:
 *   - adapterDerived.InventoryTransfer.transferNumber → generated here
 *   - adapterDerived.InventoryTransfer.requestedBy    → injected here
 */

import type { PrismaClient } from "@repo/database/standalone";
import {
  asNullableDate,
  asNullableString,
  asString,
  type EntityInstance,
  reportOp,
  toDecimalRequired,
} from "./shared";

interface RawTransferItem {
  item_id?: string;
  itemId?: string;
  notes?: string | null;
  quantity?: number | string;
}

/** Coerce items payload to a normalized array regardless of whether the caller
 * sent an array, a JSON string, or nothing. */
function asTransferItems(value: unknown): RawTransferItem[] {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value as RawTransferItem[];
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as RawTransferItem[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Zero-pad an integer to N digits. */
function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

export class InventoryTransferPrismaStore implements Store<EntityInstance> {
  private readonly prisma: PrismaClient;
  private readonly tenantId: string;
  /** RuntimeContext.user.id, plumbed via createPrismaStoreProvider's 3rd arg.
   * Used as InventoryTransfer.requestedBy (audit field for who initiated). */
  private readonly requestedBy: string;

  constructor(prisma: PrismaClient, tenantId: string, requestedBy: string) {
    this.prisma = prisma;
    this.tenantId = tenantId;
    this.requestedBy = requestedBy;
  }

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.inventoryTransfer.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { lineItems: true },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.inventoryTransfer.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
      include: { lineItems: true },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    // 1. Generate server-side transferNumber (count + 1, zero-padded to 6).
    //    Tenant-scoped count so each tenant has its own sequence.
    const existing = await this.prisma.inventoryTransfer.count({
      where: { tenantId: this.tenantId },
    });
    const transferNumber = `TRF-${pad(existing + 1, 6)}`;

    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const items = asTransferItems(data.items);

    // 2. Transactionally insert parent + child rows.
    //    If items fan-out fails, the parent transfer rolls back too.
    const created = await this.prisma.$transaction(async (tx) => {
      const transfer = await tx.inventoryTransfer.create({
        data: {
          tenantId: this.tenantId,
          id,
          transferNumber,
          fromLocationId: asString(data.fromLocationId),
          toLocationId: asString(data.toLocationId),
          // Fallback to "pending_approval" (in manifest validStatus) rather
          // than the Prisma column default "pending" (which violates the
          // manifest constraint). The manifest's create command always
          // mutates status to "pending_approval", so this fallback is a
          // belt-and-suspenders guard for direct-store callers.
          status: asString(data.status) || "pending_approval",
          // requestedBy is adapter-derived from RuntimeContext.user.id;
          // the manifest no longer captures it as a create-command param.
          requestedBy: this.requestedBy || null,
          notes: asNullableString(data.notes),
        },
      });

      for (const item of items) {
        const itemId = asString(item.itemId ?? item.item_id);
        if (!itemId) {
          continue;
        }
        await tx.inventoryTransferItem.create({
          data: {
            tenantId: this.tenantId,
            transferId: transfer.id,
            itemId,
            quantity: toDecimalRequired(item.quantity, 0),
            notes: asNullableString(item.notes),
          },
        });
      }

      return transfer;
    });

    // Re-fetch with items so the returned entity surfaces the child rows.
    const full = await this.prisma.inventoryTransfer.findFirst({
      where: { tenantId: this.tenantId, id: created.id },
      include: { lineItems: true },
    });
    return this.mapToManifestEntity(full ?? created);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};
      if (data.status !== undefined) {
        patch.status = asString(data.status);
      }
      if (data.approvedBy !== undefined) {
        patch.approvedBy = asNullableString(data.approvedBy);
      }
      if (data.shippedBy !== undefined) {
        patch.shippedBy = asNullableString(data.shippedBy);
      }
      if (data.receivedBy !== undefined) {
        patch.receivedBy = asNullableString(data.receivedBy);
      }
      if (data.shippedAt !== undefined) {
        patch.shippedAt = asNullableDate(data.shippedAt);
      }
      if (data.receivedAt !== undefined) {
        patch.receivedAt = asNullableDate(data.receivedAt);
      }
      if (data.notes !== undefined) {
        patch.notes = asNullableString(data.notes);
      }

      const updated = await this.prisma.inventoryTransfer.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
        include: { lineItems: true },
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.inventoryTransfer.update({
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
    await this.prisma.inventoryTransfer.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
    const items = Array.isArray(row.lineItems) ? row.lineItems : [];
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      transferNumber: (row.transferNumber as string) ?? "",
      fromLocationId: (row.fromLocationId as string) ?? "",
      toLocationId: (row.toLocationId as string) ?? "",
      status: (row.status as string) ?? "pending",
      requestedBy: (row.requestedBy as string) ?? "",
      approvedBy: (row.approvedBy as string) ?? "",
      shippedBy: (row.shippedBy as string) ?? "",
      receivedBy: (row.receivedBy as string) ?? "",
      shippedAt: row.shippedAt
        ? new Date(row.shippedAt as string | Date).getTime()
        : 0,
      receivedAt: row.receivedAt
        ? new Date(row.receivedAt as string | Date).getTime()
        : 0,
      notes: (row.notes as string) ?? "",
      createdAt: row.createdAt
        ? new Date(row.createdAt as string | Date).getTime()
        : 0,
      updatedAt: row.updatedAt
        ? new Date(row.updatedAt as string | Date).getTime()
        : 0,
      // Items as a JSON-serializable array — surfaces child rows for reads.
      items: items.map((it) => ({
        id: (it as { id?: string }).id,
        itemId: (it as { itemId?: string }).itemId,
        quantity: String((it as { quantity?: unknown }).quantity ?? "0"),
        receivedQuantity:
          (it as { receivedQuantity?: unknown }).receivedQuantity == null
            ? null
            : String((it as { receivedQuantity: unknown }).receivedQuantity),
        notes: (it as { notes?: string | null }).notes ?? null,
      })),
    };
  }
}

// ---------------------------------------------------------------------------
// Minimal Store<T> interface (local re-declaration so this file is self-contained)
// ---------------------------------------------------------------------------

interface Store<T> {
  clear(): Promise<void>;
  create(data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | undefined>;
  update(id: string, data: Partial<T>): Promise<T | undefined>;
}
