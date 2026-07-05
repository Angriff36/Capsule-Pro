/**
 * PurchaseOrder /complete idempotency guard
 *
 * WHY THIS MATTERS: the completion route adds each line's quantityReceived to
 * InventoryItem.quantityOnHand on every call. Without a terminal-status guard, a
 * retried or duplicate POST against an already-received PO re-increments stock —
 * silent inventory corruption in a money/inventory path. The governed
 * PurchaseOrder FSM treats "received"/"cancelled" as terminal; this route must
 * honor the same invariant. These tests fail if the guard is removed or weakened
 * (e.g. lets a terminal PO reach the stock-mutating transaction).
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/database", () => ({
  database: {
    purchaseOrder: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn() },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";

const TENANT_ID = "a0000000-0000-4000-a000-000000000002";
const ORG_ID = "org-po-test";
const USER_ID = "u0000000-0000-4000-a000-000000000002";
const EMPLOYEE_ID = "e0000000-0000-4000-a000-000000000003";

function mockPO(status: string) {
  return {
    id: "po-001",
    tenantId: TENANT_ID,
    poNumber: "PO-2026-0001",
    locationId: "loc-001",
    status,
    notes: null,
    items: [
      {
        id: "poi-001",
        itemId: "item-001",
        quantityOrdered: 10,
        unitCost: 5,
      },
    ],
  };
}

function completeRequest(body: unknown): NextRequest {
  return new NextRequest(
    new URL(
      "http://localhost:3000/api/inventory/purchase-orders/po-001/complete"
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    } as ConstructorParameters<typeof NextRequest>[1]
  );
}

const validBody = {
  items: [{ id: "poi-001", quantity_received: 10, quality_status: "approved" }],
};

const context = { params: Promise.resolve({ id: "po-001" }) };

describe("POST /api/inventory/purchase-orders/[id]/complete — idempotency guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      orgId: ORG_ID,
      userId: USER_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TENANT_ID);
    vi.mocked(requireCurrentUser).mockResolvedValue({
      id: EMPLOYEE_ID,
      tenantId: TENANT_ID,
      role: "admin",
      email: "",
      firstName: "",
      lastName: "",
    });
  });

  it("rejects re-completing an already-received PO with 409 and never touches stock", async () => {
    vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue(
      mockPO("received") as never
    );

    const { POST } = await import(
      "@/app/api/inventory/purchase-orders/[id]/complete/route"
    );
    const response = await POST(completeRequest(validBody), context);

    expect(response.status).toBe(409);
    // The stock-mutating transaction must NOT run for a terminal PO.
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("rejects completing a cancelled PO with 409", async () => {
    vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue(
      mockPO("cancelled") as never
    );

    const { POST } = await import(
      "@/app/api/inventory/purchase-orders/[id]/complete/route"
    );
    const response = await POST(completeRequest(validBody), context);

    expect(response.status).toBe(409);
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("allows completing a non-terminal PO (guard does not over-block)", async () => {
    vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue(
      mockPO("confirmed") as never
    );
    // Stub the transaction so the guard's pass-through reaches it without
    // exercising the full Prisma write path.
    vi.mocked(database.$transaction).mockResolvedValue({
      updatedItems: [{}],
      transactions: [],
      newStatus: "received",
    } as never);

    const { POST } = await import(
      "@/app/api/inventory/purchase-orders/[id]/complete/route"
    );
    const response = await POST(completeRequest(validBody), context);

    expect(response.status).toBe(200);
    expect(database.$transaction).toHaveBeenCalledTimes(1);
  });
});
