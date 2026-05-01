/**
 * Shipment & ShipmentItem Command Route Tests
 *
 * Companion to `shipment-end-to-end.test.ts`. The end-to-end suite proves that
 * write commands flow through the right Prisma store and that instance-scoped
 * verbs receive `instanceId`. THIS suite covers what the end-to-end suite does
 * NOT: per-route auth/tenant/user guards, body-forwarding, policy denials,
 * guard failures, internal errors, and the ShipmentItem command surface.
 *
 * Why these matter
 * ----------------
 * Shipments drive a state machine (draft → scheduled → preparing → in_transit
 * → delivered) that the manifest enforces via guards. Cancel and mark-delivered
 * also have role policies (`ManagersCanCancelShipment` / `StaffCanReceiveShipment`)
 * that, if mis-wired, would either lock out legitimate users or — worse — let
 * unauthorized roles cancel/deliver. The 403/422 tests pin the wiring so a
 * future refactor of the manifest runtime cannot silently change who can
 * trigger a state transition.
 *
 * The `update-received` route is the most fragile of the bunch: the route
 * forwards the body to `runtime.runCommand("updateReceived", body)` WITHOUT
 * passing `instanceId`. That's a real bug (the manifest store cannot uniquely
 * identify the item to update) — the test below pins the current behavior so
 * it can't regress further while the bug is open.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_ORG_ID = "org-test-123";
const TEST_USER_ID = "u0000000-0000-4000-a000-000000000001";
const TEST_CLERK_ID = "clerk_test_001";
const TEST_SHIPMENT_ID = "ship-001";

const adminUser = {
  id: TEST_USER_ID,
  tenantId: TEST_TENANT_ID,
  role: "admin",
  authUserId: TEST_CLERK_ID,
};

function createMockRequest(
  url: string,
  options: RequestInit = {}
): NextRequest {
  if (options.body && !options.headers) {
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

function authedAsAdmin() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_CLERK_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  vi.mocked(database.user.findFirst).mockResolvedValue(adminUser as never);
}

function mockRuntime(runCommand: ReturnType<typeof vi.fn>) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand,
  } as never);
}

// ---------------------------------------------------------------------------
// Per-command auth/tenant/user guards — applied uniformly across every route
// ---------------------------------------------------------------------------

const SHIPMENT_COMMANDS: Array<{ verb: string; file: string; body: object }> = [
  {
    verb: "create",
    file: "create",
    body: { shipmentNumber: "SHP-NEW", carrier: "FedEx" },
  },
  { verb: "update", file: "update", body: { id: TEST_SHIPMENT_ID } },
  {
    verb: "cancel",
    file: "cancel",
    body: { id: TEST_SHIPMENT_ID, userId: TEST_USER_ID, reason: "duplicate" },
  },
  {
    verb: "schedule",
    file: "schedule",
    body: { id: TEST_SHIPMENT_ID, userId: TEST_USER_ID, scheduledDate: 0 },
  },
  {
    verb: "ship",
    file: "ship",
    body: {
      id: TEST_SHIPMENT_ID,
      userId: TEST_USER_ID,
      trackingNumber: "T-1",
    },
  },
  {
    verb: "startPreparing",
    file: "start-preparing",
    body: { id: TEST_SHIPMENT_ID, userId: TEST_USER_ID },
  },
  {
    verb: "markDelivered",
    file: "mark-delivered",
    body: {
      id: TEST_SHIPMENT_ID,
      userId: TEST_USER_ID,
      receivedBy: "John",
      signature: "sig",
    },
  },
];

describe("Shipment Command Routes — auth/tenant/user guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  for (const { verb, file, body } of SHIPMENT_COMMANDS) {
    describe(`POST /commands/${file}`, () => {
      it(`${verb}: returns 401 when unauthenticated`, async () => {
        vi.mocked(auth).mockResolvedValue({
          orgId: null,
          userId: null,
        } as never);

        const mod = await import(
          `@/app/api/shipments/shipment/commands/${file}/route`
        );
        const response = await mod.POST(
          createMockRequest("http://localhost:3000/test", {
            method: "POST",
            body: JSON.stringify(body),
          })
        );

        expect(response.status).toBe(401);
      });

      it(`${verb}: returns 400 when tenant cannot be resolved`, async () => {
        vi.mocked(auth).mockResolvedValue({
          orgId: TEST_ORG_ID,
          userId: TEST_CLERK_ID,
        } as never);
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const mod = await import(
          `@/app/api/shipments/shipment/commands/${file}/route`
        );
        const response = await mod.POST(
          createMockRequest("http://localhost:3000/test", {
            method: "POST",
            body: JSON.stringify(body),
          })
        );

        expect(response.status).toBe(400);
      });

      it(`${verb}: returns 400 when user not in database`, async () => {
        vi.mocked(auth).mockResolvedValue({
          orgId: TEST_ORG_ID,
          userId: TEST_CLERK_ID,
        } as never);
        vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
        vi.mocked(database.user.findFirst).mockResolvedValue(null);

        const mod = await import(
          `@/app/api/shipments/shipment/commands/${file}/route`
        );
        const response = await mod.POST(
          createMockRequest("http://localhost:3000/test", {
            method: "POST",
            body: JSON.stringify(body),
          })
        );

        expect(response.status).toBe(400);
      });

      it(`${verb}: returns 500 on internal error`, async () => {
        authedAsAdmin();
        vi.mocked(createManifestRuntime).mockRejectedValue(
          new Error("runtime boom")
        );

        const mod = await import(
          `@/app/api/shipments/shipment/commands/${file}/route`
        );
        const response = await mod.POST(
          createMockRequest("http://localhost:3000/test", {
            method: "POST",
            body: JSON.stringify(body),
          })
        );

        expect(response.status).toBe(500);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Per-command failure paths from the manifest runtime
// ---------------------------------------------------------------------------

describe("Shipment Command Routes — runtime failure responses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedAsAdmin();
  });

  for (const { verb, file, body } of SHIPMENT_COMMANDS) {
    describe(`POST /commands/${file}`, () => {
      it(`${verb}: returns 403 when policy denies access`, async () => {
        const runCommand = vi.fn().mockResolvedValue({
          success: false,
          policyDenial: { policyName: "ManagersCanCancelShipment" },
        });
        mockRuntime(runCommand);

        const mod = await import(
          `@/app/api/shipments/shipment/commands/${file}/route`
        );
        const response = await mod.POST(
          createMockRequest("http://localhost:3000/test", {
            method: "POST",
            body: JSON.stringify(body),
          })
        );
        const data = await response.json();

        expect(response.status).toBe(403);
        // Surface includes the policy name + role for ops debugging.
        expect(JSON.stringify(data)).toContain("ManagersCanCancelShipment");
        expect(JSON.stringify(data)).toContain("admin");
      });

      it(`${verb}: returns 422 when a manifest guard fails`, async () => {
        const runCommand = vi.fn().mockResolvedValue({
          success: false,
          guardFailure: { index: 0, formatted: "self.status == 'draft'" },
        });
        mockRuntime(runCommand);

        const mod = await import(
          `@/app/api/shipments/shipment/commands/${file}/route`
        );
        const response = await mod.POST(
          createMockRequest("http://localhost:3000/test", {
            method: "POST",
            body: JSON.stringify(body),
          })
        );
        const data = await response.json();

        expect(response.status).toBe(422);
        expect(JSON.stringify(data)).toContain("self.status == 'draft'");
      });

      it(`${verb}: returns 400 with raw error when neither policy nor guard set`, async () => {
        const runCommand = vi.fn().mockResolvedValue({
          success: false,
          error: "Constraint blockNoItems failed",
        });
        mockRuntime(runCommand);

        const mod = await import(
          `@/app/api/shipments/shipment/commands/${file}/route`
        );
        const response = await mod.POST(
          createMockRequest("http://localhost:3000/test", {
            method: "POST",
            body: JSON.stringify(body),
          })
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(JSON.stringify(data)).toContain("blockNoItems");
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Success paths: body forwarding + entityName wiring
// ---------------------------------------------------------------------------

describe("Shipment Command Routes — success paths", () => {
  let runCommand: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    authedAsAdmin();
    runCommand = vi.fn().mockResolvedValue({
      success: true,
      result: { id: TEST_SHIPMENT_ID, status: "draft" },
      emittedEvents: [{ type: "ShipmentCreated" }],
    });
    mockRuntime(runCommand);
  });

  it("create: forwards body and uses entityName Shipment", async () => {
    const { POST } = await import(
      "@/app/api/shipments/shipment/commands/create/route"
    );
    const body = { shipmentNumber: "SHP-100", carrier: "UPS" };
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify(body),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    // result+events shape proves manifest runtime success contract.
    expect(data).toMatchObject({
      result: { id: TEST_SHIPMENT_ID, status: "draft" },
      events: [{ type: "ShipmentCreated" }],
    });
    expect(runCommand).toHaveBeenCalledWith(
      "create",
      expect.objectContaining({ shipmentNumber: "SHP-100", carrier: "UPS" }),
      { entityName: "Shipment" }
    );
  });

  it("update: forwards body and instanceId from body.id", async () => {
    const { POST } = await import(
      "@/app/api/shipments/shipment/commands/update/route"
    );
    const body = {
      id: TEST_SHIPMENT_ID,
      trackingNumber: "T-9",
      carrier: "DHL",
    };
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify(body),
      })
    );

    expect(response.status).toBe(200);
    expect(runCommand).toHaveBeenCalledWith(
      "update",
      expect.objectContaining({ trackingNumber: "T-9", carrier: "DHL" }),
      expect.objectContaining({
        entityName: "Shipment",
        instanceId: TEST_SHIPMENT_ID,
      })
    );
  });

  it("cancel: forwards reason and userId fields", async () => {
    const { POST } = await import(
      "@/app/api/shipments/shipment/commands/cancel/route"
    );
    const body = {
      id: TEST_SHIPMENT_ID,
      userId: TEST_USER_ID,
      reason: "supplier delay",
    };
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify(body),
      })
    );

    expect(response.status).toBe(200);
    expect(runCommand).toHaveBeenCalledWith(
      "cancel",
      expect.objectContaining({
        reason: "supplier delay",
        userId: TEST_USER_ID,
      }),
      expect.objectContaining({ instanceId: TEST_SHIPMENT_ID })
    );
  });

  it("schedule: forwards scheduledDate", async () => {
    const { POST } = await import(
      "@/app/api/shipments/shipment/commands/schedule/route"
    );
    const body = {
      id: TEST_SHIPMENT_ID,
      userId: TEST_USER_ID,
      scheduledDate: 1735689600000,
    };
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify(body),
      })
    );

    expect(response.status).toBe(200);
    expect(runCommand).toHaveBeenCalledWith(
      "schedule",
      expect.objectContaining({ scheduledDate: 1735689600000 }),
      expect.objectContaining({ instanceId: TEST_SHIPMENT_ID })
    );
  });

  it("ship: forwards trackingNumber", async () => {
    const { POST } = await import(
      "@/app/api/shipments/shipment/commands/ship/route"
    );
    const body = {
      id: TEST_SHIPMENT_ID,
      userId: TEST_USER_ID,
      trackingNumber: "1Z9999",
    };
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify(body),
      })
    );

    expect(response.status).toBe(200);
    expect(runCommand).toHaveBeenCalledWith(
      "ship",
      expect.objectContaining({ trackingNumber: "1Z9999" }),
      expect.objectContaining({ instanceId: TEST_SHIPMENT_ID })
    );
  });

  it("startPreparing: forwards body unchanged", async () => {
    const { POST } = await import(
      "@/app/api/shipments/shipment/commands/start-preparing/route"
    );
    const body = { id: TEST_SHIPMENT_ID, userId: TEST_USER_ID };
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify(body),
      })
    );

    expect(response.status).toBe(200);
    expect(runCommand).toHaveBeenCalledWith(
      "startPreparing",
      expect.objectContaining({ userId: TEST_USER_ID }),
      expect.objectContaining({ instanceId: TEST_SHIPMENT_ID })
    );
  });

  it("markDelivered: forwards receivedBy + signature", async () => {
    const { POST } = await import(
      "@/app/api/shipments/shipment/commands/mark-delivered/route"
    );
    const body = {
      id: TEST_SHIPMENT_ID,
      userId: TEST_USER_ID,
      receivedBy: "Jane Doe",
      signature: "data:image/png;base64,xyz",
    };
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify(body),
      })
    );

    expect(response.status).toBe(200);
    expect(runCommand).toHaveBeenCalledWith(
      "markDelivered",
      expect.objectContaining({
        receivedBy: "Jane Doe",
        signature: "data:image/png;base64,xyz",
      }),
      expect.objectContaining({ instanceId: TEST_SHIPMENT_ID })
    );
  });
});

// ---------------------------------------------------------------------------
// ShipmentItem command routes — entirely uncovered prior to this suite
// ---------------------------------------------------------------------------

describe("ShipmentItem.create command", () => {
  let runCommand: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    runCommand = vi.fn().mockResolvedValue({
      success: true,
      result: { id: "item-001" },
      emittedEvents: [],
    });
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({
      orgId: null,
      userId: null,
    } as never);

    const { POST } = await import(
      "@/app/api/shipments/shipment-items/commands/create/route"
    );
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 when tenant resolution fails", async () => {
    vi.mocked(auth).mockResolvedValue({
      orgId: TEST_ORG_ID,
      userId: TEST_CLERK_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

    const { POST } = await import(
      "@/app/api/shipments/shipment-items/commands/create/route"
    );
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when user not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      orgId: TEST_ORG_ID,
      userId: TEST_CLERK_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
    vi.mocked(database.user.findFirst).mockResolvedValue(null);

    const { POST } = await import(
      "@/app/api/shipments/shipment-items/commands/create/route"
    );
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(400);
  });

  it("forwards body to runtime with entityName ShipmentItem (no instanceId)", async () => {
    authedAsAdmin();
    mockRuntime(runCommand);

    const { POST } = await import(
      "@/app/api/shipments/shipment-items/commands/create/route"
    );
    const body = {
      shipmentId: TEST_SHIPMENT_ID,
      itemId: "inv-001",
      quantityShipped: 10,
      unitCost: 4.5,
    };
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify(body),
      })
    );

    expect(response.status).toBe(200);
    expect(runCommand).toHaveBeenCalledWith(
      "create",
      expect.objectContaining({
        shipmentId: TEST_SHIPMENT_ID,
        itemId: "inv-001",
        quantityShipped: 10,
        unitCost: 4.5,
      }),
      { entityName: "ShipmentItem" }
    );
    // create routes are entity-scoped (not instance-scoped), so instanceId
    // MUST be absent — pin that contract.
    const callArgs = runCommand.mock.calls[0]?.[2] ?? {};
    expect(callArgs.instanceId).toBeUndefined();
  });

  it("returns 422 when guard rejects (e.g. quantityShipped <= 0)", async () => {
    authedAsAdmin();
    mockRuntime(
      vi.fn().mockResolvedValue({
        success: false,
        guardFailure: { index: 2, formatted: "quantityShipped > 0" },
      })
    );

    const { POST } = await import(
      "@/app/api/shipments/shipment-items/commands/create/route"
    );
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify({
          shipmentId: TEST_SHIPMENT_ID,
          itemId: "inv-001",
          quantityShipped: 0,
        }),
      })
    );

    expect(response.status).toBe(422);
  });

  it("returns 500 on uncaught error", async () => {
    authedAsAdmin();
    vi.mocked(createManifestRuntime).mockRejectedValue(new Error("boom"));

    const { POST } = await import(
      "@/app/api/shipments/shipment-items/commands/create/route"
    );
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify({ shipmentId: TEST_SHIPMENT_ID }),
      })
    );

    expect(response.status).toBe(500);
  });
});

describe("ShipmentItem.updateReceived command", () => {
  let runCommand: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    runCommand = vi.fn().mockResolvedValue({
      success: true,
      result: { id: "item-001", quantityReceived: 8 },
      emittedEvents: [],
    });
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({
      orgId: null,
      userId: null,
    } as never);

    const { POST } = await import(
      "@/app/api/shipments/shipment-items/commands/update-received/route"
    );
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 when tenant resolution fails", async () => {
    vi.mocked(auth).mockResolvedValue({
      orgId: TEST_ORG_ID,
      userId: TEST_CLERK_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

    const { POST } = await import(
      "@/app/api/shipments/shipment-items/commands/update-received/route"
    );
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(400);
  });

  it("forwards body and instanceId to runtime", async () => {
    authedAsAdmin();
    mockRuntime(runCommand);

    const { POST } = await import(
      "@/app/api/shipments/shipment-items/commands/update-received/route"
    );
    const body = {
      shipmentItemId: "item-001",
      quantityReceived: 8,
      quantityDamaged: 2,
      condition: "damaged",
      conditionNotes: "wet box",
      userId: TEST_USER_ID,
    };
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify(body),
      })
    );

    expect(response.status).toBe(200);
    // `updateReceived` is an instance-scoped manifest verb; the runtime
    // requires `instanceId` to load the target ShipmentItem before the
    // guards/mutations run. The route extracts it from `body.shipmentItemId`
    // (analogous to how Shipment.* commands extract `body.id`).
    expect(runCommand).toHaveBeenCalledWith(
      "updateReceived",
      expect.objectContaining({
        quantityReceived: 8,
        quantityDamaged: 2,
        condition: "damaged",
      }),
      { entityName: "ShipmentItem", instanceId: "item-001" }
    );
    const callArgs = runCommand.mock.calls[0]?.[2] ?? {};
    expect(callArgs.instanceId).toBe("item-001");
  });

  it("returns 422 when manifest guard rejects (e.g. quantityReceived < 0)", async () => {
    authedAsAdmin();
    mockRuntime(
      vi.fn().mockResolvedValue({
        success: false,
        guardFailure: { index: 0, formatted: "quantityReceived >= 0" },
      })
    );

    const { POST } = await import(
      "@/app/api/shipments/shipment-items/commands/update-received/route"
    );
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify({ quantityReceived: -1 }),
      })
    );

    expect(response.status).toBe(422);
  });

  it("returns 500 on uncaught error", async () => {
    authedAsAdmin();
    vi.mocked(createManifestRuntime).mockRejectedValue(new Error("boom"));

    const { POST } = await import(
      "@/app/api/shipments/shipment-items/commands/update-received/route"
    );
    const response = await POST(
      createMockRequest("http://localhost:3000/test", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// ShipmentItem read endpoints
// ---------------------------------------------------------------------------

describe("GET /api/shipments/shipment-items/list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({
      orgId: null,
      userId: null,
    } as never);

    const { GET } = await import(
      "@/app/api/shipments/shipment-items/list/route"
    );
    const response = await GET(
      createMockRequest("http://localhost:3000/test")
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 when tenant cannot be resolved", async () => {
    vi.mocked(auth).mockResolvedValue({
      orgId: TEST_ORG_ID,
      userId: TEST_CLERK_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

    const { GET } = await import(
      "@/app/api/shipments/shipment-items/list/route"
    );
    const response = await GET(
      createMockRequest("http://localhost:3000/test")
    );

    expect(response.status).toBe(400);
  });

  it("excludes soft-deleted items and orders by createdAt desc", async () => {
    vi.mocked(auth).mockResolvedValue({
      orgId: TEST_ORG_ID,
      userId: TEST_CLERK_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
    vi.mocked(database.shipmentItem.findMany).mockResolvedValue([
      { id: "item-002", quantityShipped: 5 },
      { id: "item-001", quantityShipped: 3 },
    ] as never);

    const { GET } = await import(
      "@/app/api/shipments/shipment-items/list/route"
    );
    const response = await GET(
      createMockRequest("http://localhost:3000/test")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.shipmentItems).toHaveLength(2);
    // Tenant scoping + soft-delete exclusion are non-negotiable; verify both.
    expect(database.shipmentItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TEST_TENANT_ID, deletedAt: null },
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("returns 500 on Prisma error", async () => {
    vi.mocked(auth).mockResolvedValue({
      orgId: TEST_ORG_ID,
      userId: TEST_CLERK_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
    vi.mocked(database.shipmentItem.findMany).mockRejectedValue(
      new Error("db down")
    );

    const { GET } = await import(
      "@/app/api/shipments/shipment-items/list/route"
    );
    const response = await GET(
      createMockRequest("http://localhost:3000/test")
    );

    expect(response.status).toBe(500);
  });
});
