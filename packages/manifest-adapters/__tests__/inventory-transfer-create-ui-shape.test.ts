/**
 * InventoryTransfer.create — UI-shape contract test.
 *
 * Proves the user-facing principle stated in IMPLEMENTATION_PLAN.md and
 * scripts/manifest/schema-drift-allowlist.json adapterDerived.InventoryTransfer.*:
 *
 *   The UI sends ONLY { fromLocationId, toLocationId, notes, items }.
 *   The system derives transferNumber, requestedBy, tenantId, status,
 *   createdAt, updatedAt, and the row id.
 *
 * Two layers:
 *   1. Manifest-source contract — the create command's parameter list does
 *      not include any internal/system fields.
 *   2. Store behaviour — InventoryTransferPrismaStore.create() invoked with
 *      a UI-shaped payload still produces a row with system-derived
 *      transferNumber, requestedBy, status, and tenantId, and fans items
 *      out to the child table transactionally.
 *
 * @vitest-environment node
 */

import { describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock the database client BEFORE importing the store (same pattern as
// __tests__/prisma-store-broken-read-batch13.test.ts).
// ---------------------------------------------------------------------------

vi.mock("@repo/database/standalone", () => ({
  PrismaClient: class {},
  Prisma: {},
}));

import { loadPrecompiledIR } from "../src/runtime/loadManifests.js";
import { InventoryTransferPrismaStore } from "../src/prisma-stores/broken-read-batch16-inventory-transfer.js";

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-0000000000aa";
const FROM_LOC = "00000000-0000-0000-0000-0000000000b1";
const TO_LOC = "00000000-0000-0000-0000-0000000000b2";
const ITEM_1 = "00000000-0000-0000-0000-0000000000c1";

// Fields the UI must NEVER need to provide for create. These are either
// adapter-derived (per schema-drift-allowlist) or runtime/system-managed.
const INTERNAL_FIELDS_FORBIDDEN_ON_UI_PAYLOAD = [
  "id",
  "tenantId",
  "transferNumber",
  "requestedBy",
  "status",
  "createdAt",
  "updatedAt",
] as const;

// ===========================================================================
// Layer 1 — Manifest-source contract
// ===========================================================================

describe("InventoryTransfer.create — manifest exposes only user-providable params", () => {
  it("create command parameters are exactly { fromLocationId, toLocationId, notes, items }", () => {
    const { ir } = loadPrecompiledIR(
      "packages/manifest-ir/ir/kitchen/kitchen.ir.json"
    );
    // Full command definitions live at ir.commands (entity.commands is just
    // an array of command name strings).
    const cmd = (ir.commands as Array<{
      entity: string;
      name: string;
      parameters?: Array<{ name: string }>;
    }>).find((c) => c.entity === "InventoryTransfer" && c.name === "create");
    expect(cmd).toBeDefined();

    const paramNames = (cmd?.parameters ?? []).map((p) => p.name).sort();
    expect(paramNames).toEqual(["fromLocationId", "items", "notes", "toLocationId"]);
  });

  it("create command params include none of the internal/system fields", () => {
    const { ir } = loadPrecompiledIR(
      "packages/manifest-ir/ir/kitchen/kitchen.ir.json"
    );
    const cmd = (ir.commands as Array<{
      entity: string;
      name: string;
      parameters?: Array<{ name: string }>;
    }>).find((c) => c.entity === "InventoryTransfer" && c.name === "create");

    const paramNames = new Set((cmd?.parameters ?? []).map((p) => p.name));
    for (const internal of INTERNAL_FIELDS_FORBIDDEN_ON_UI_PAYLOAD) {
      expect(paramNames.has(internal)).toBe(false);
    }
  });
});

// ===========================================================================
// Layer 2 — Store derives internals from system, not user input
// ===========================================================================

describe("InventoryTransferPrismaStore.create — derives internals from system", () => {
  /** Build a Prisma client mock with $transaction that resolves through a
   * stub tx exposing inventoryTransfer.create + inventoryTransferItem.create. */
  function makeMockClient(opts: { existingCount: number; createdId: string; createdNumber: string }) {
    const txTransferCreate = vi.fn().mockResolvedValue({
      id: opts.createdId,
      transferNumber: opts.createdNumber,
    });
    const txItemCreate = vi.fn().mockResolvedValue({});

    const findFirstResult = {
      tenantId: TENANT_ID,
      id: opts.createdId,
      transferNumber: opts.createdNumber,
      fromLocationId: FROM_LOC,
      toLocationId: TO_LOC,
      status: "pending_approval",
      requestedBy: USER_ID,
      approvedBy: null,
      shippedBy: null,
      receivedBy: null,
      shippedAt: null,
      receivedAt: null,
      notes: "test transfer",
      createdAt: new Date("2026-05-23T12:00:00Z"),
      updatedAt: new Date("2026-05-23T12:00:00Z"),
      items: [
        { id: "ti-1", itemId: ITEM_1, quantity: "10", receivedQuantity: null, notes: null },
      ],
    };

    return {
      txTransferCreate,
      txItemCreate,
      client: {
        inventoryTransfer: {
          count: vi.fn().mockResolvedValue(opts.existingCount),
          findFirst: vi.fn().mockResolvedValue(findFirstResult),
        },
        $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
          cb({
            inventoryTransfer: { create: txTransferCreate },
            inventoryTransferItem: { create: txItemCreate },
          })
        ),
      } as unknown as Parameters<typeof InventoryTransferPrismaStore>[0],
    };
  }

  it("user payload of only {fromLocationId, toLocationId, notes, items} → system-derived row", async () => {
    const mocks = makeMockClient({
      existingCount: 0,
      createdId: "trf-1",
      createdNumber: "TRF-000001",
    });
    const store = new InventoryTransferPrismaStore(mocks.client, TENANT_ID, USER_ID);

    // Canonical UI-shaped payload — exactly what the dispatcher receives
    // after the manifest's create command mutates apply.
    const uiPayload = {
      fromLocationId: FROM_LOC,
      toLocationId: TO_LOC,
      notes: "test transfer",
      items: JSON.stringify([{ itemId: ITEM_1, quantity: 10 }]),
    };

    // Sanity-check: the UI payload itself has none of the internal fields.
    for (const internal of INTERNAL_FIELDS_FORBIDDEN_ON_UI_PAYLOAD) {
      expect(uiPayload).not.toHaveProperty(internal);
    }

    const result = await store.create(uiPayload);

    // The tenant-scoped count drives the deterministic transferNumber.
    expect(mocks.client.inventoryTransfer.count).toHaveBeenCalledWith({
      where: { tenantId: TENANT_ID },
    });

    // The parent row was created inside a transaction with all internals derived.
    expect(mocks.txTransferCreate).toHaveBeenCalledTimes(1);
    const parentArgs = mocks.txTransferCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(parentArgs.data).toMatchObject({
      tenantId: TENANT_ID,            // adapter-injected from constructor
      transferNumber: "TRF-000001",   // server-generated from count+1
      requestedBy: USER_ID,           // adapter-derived from RuntimeContext.user.id
      status: "pending_approval",     // manifest-mutate fallback (in validStatus)
      fromLocationId: FROM_LOC,
      toLocationId: TO_LOC,
      notes: "test transfer",
    });

    // Item rows were fanned out in the same transaction.
    expect(mocks.txItemCreate).toHaveBeenCalledTimes(1);
    const itemArgs = mocks.txItemCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(itemArgs.data).toMatchObject({
      tenantId: TENANT_ID,
      transferId: "trf-1",
      itemId: ITEM_1,
    });

    // The mapped entity returned to the caller includes the system-derived fields.
    expect(result).toMatchObject({
      id: "trf-1",
      tenantId: TENANT_ID,
      transferNumber: "TRF-000001",
      requestedBy: USER_ID,
      status: "pending_approval",
    });
  });

  it("transferNumber is tenant-scoped and zero-padded to 6 digits", async () => {
    const mocks = makeMockClient({
      existingCount: 41,
      createdId: "trf-42",
      createdNumber: "TRF-000042",
    });
    const store = new InventoryTransferPrismaStore(mocks.client, TENANT_ID, USER_ID);

    await store.create({
      fromLocationId: FROM_LOC,
      toLocationId: TO_LOC,
      notes: "",
      items: "[]",
    });

    const parentArgs = mocks.txTransferCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(parentArgs.data.transferNumber).toBe("TRF-000042");
  });

  it("requestedBy persists as null (not empty string) when RuntimeContext.user.id is missing", async () => {
    // Per IMPLEMENTATION_PLAN.md §101 + constitution §2/§14: no silent ?? "" fallback.
    // If the dispatcher fails to plumb userId, the column must be null, not "".
    const mocks = makeMockClient({
      existingCount: 0,
      createdId: "trf-1",
      createdNumber: "TRF-000001",
    });
    const store = new InventoryTransferPrismaStore(mocks.client, TENANT_ID, "");

    await store.create({
      fromLocationId: FROM_LOC,
      toLocationId: TO_LOC,
      notes: "",
      items: "[]",
    });

    const parentArgs = mocks.txTransferCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(parentArgs.data.requestedBy).toBeNull();
  });
});
