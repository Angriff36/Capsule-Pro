/**
 * Payment Method PATCH Action Test Suite
 *
 * Verifies the command-action dispatcher on
 * `PATCH /api/accounting/payment-methods/[id]`. Actions:
 *   mark-as-default | verify | flag-for-fraud | mark-expired | remove
 *
 * Post-migration (Task 8.2): all mutations go through `runManifestCommand`.
 * Post-migration (updateMany→governed): clearing sibling defaults now goes
 * through `markNotDefault` Manifest commands instead of raw `updateMany`.
 *
 * Why these tests matter:
 *   - `mark-as-default` MUST unset prior defaults for the same client before
 *     marking the target. A regression here lets two payment methods both
 *     hold `isDefault=true`, which silently picks an arbitrary card at charge
 *     time. The route does this via governed `markNotDefault` commands
 *     filtered by clientId — we assert the findMany filter shape so a typo
 *     doesn't quietly demote every default in the tenant.
 *   - `flag-for-fraud` is a security control. The command must be delegated
 *     with the correct entity/command to ensure runtime RBAC + audit trail.
 *   - `remove` is a soft-delete. The Manifest command handles this.
 *   - Cross-tenant access on findFirst returning a record from another tenant
 *     must reject (covered via `validatePaymentMethodAccess`).
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000099";
const TENANT_ID_OTHER = "00000000-0000-0000-0000-000000000002";
const PM_ID = "11111111-1111-1111-1111-111111111111";
const CLIENT_ID = "22222222-2222-2222-2222-222222222222";

const mocks = vi.hoisted(() => ({
  pmFindFirstMock: vi.fn(),
  pmFindManyMock: vi.fn(),
  runManifestCommandMock: vi.fn(),
  runManifestCommandCoreMock: vi.fn(),
  resolveCurrentUserMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  consoleErrorMock: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    paymentMethod: {
      findFirst: mocks.pmFindFirstMock,
      findMany: mocks.pmFindManyMock,
    },
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  requireTenantId: vi
    .fn()
    .mockResolvedValue("00000000-0000-0000-0000-000000000001"),
  resolveCurrentUser: mocks.resolveCurrentUserMock,
}));

vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: mocks.runManifestCommandMock,
}));

vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: mocks.runManifestCommandCoreMock,
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureExceptionMock,
}));

import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/accounting/payment-methods/[id]/route";

const basePaymentMethod = {
  id: PM_ID,
  tenantId: TENANT_ID,
  clientId: CLIENT_ID,
  type: "CREDIT_CARD",
  cardLastFour: "4242",
  cardNetwork: "VISA",
  isDefault: false,
  status: "ACTIVE",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  deletedAt: null,
};

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(
    new URL(`http://localhost/api/accounting/payment-methods/${PM_ID}`),
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const params = Promise.resolve({ id: PM_ID });

describe("PATCH /api/accounting/payment-methods/[id] — action dispatcher", () => {
  beforeEach(() => {
    mocks.pmFindFirstMock.mockReset();
    mocks.pmFindManyMock.mockReset();
    mocks.runManifestCommandMock.mockReset();
    mocks.runManifestCommandCoreMock.mockReset();
    mocks.resolveCurrentUserMock.mockReset();
    mocks.captureExceptionMock.mockReset();
    mocks.consoleErrorMock.mockReset();

    mocks.resolveCurrentUserMock.mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "admin",
    });
    mocks.pmFindManyMock.mockResolvedValue([]);
    mocks.runManifestCommandCoreMock.mockResolvedValue({
      ok: true,
      entity: "PaymentMethod",
      command: "markNotDefault",
      result: { id: "sibling-id" },
    });
    mocks.runManifestCommandMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    vi.spyOn(console, "error").mockImplementation(mocks.consoleErrorMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------- guards

  it("returns 404 when payment method does not exist", async () => {
    mocks.pmFindFirstMock.mockResolvedValue(null);

    const response = await PATCH(makeRequest({ action: "mark-as-default" }), {
      params,
    });

    expect(response.status).toBe(404);
    expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
  });

  it("returns 500 (caught invariant) when payment method belongs to another tenant", async () => {
    mocks.pmFindFirstMock.mockResolvedValue({
      ...basePaymentMethod,
      tenantId: TENANT_ID_OTHER,
    });

    const response = await PATCH(makeRequest({ action: "verify" }), {
      params,
    });

    expect(response.status).toBe(500);
    expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
    expect(mocks.captureExceptionMock).toHaveBeenCalled();
  });

  it("returns 400 for unknown actions", async () => {
    mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);

    const response = await PATCH(makeRequest({ action: "unknown-action" }), {
      params,
    });

    expect(response.status).toBe(400);
    expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------- mark-as-default

  describe("action: mark-as-default", () => {
    it("clears sibling defaults via governed markNotDefault commands before delegating to Manifest runtime", async () => {
      mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);

      const response = await PATCH(makeRequest({ action: "mark-as-default" }), {
        params,
      });

      expect(response.status).toBe(200);

      // findMany must scope to (tenantId, clientId, NOT this id, isDefault=true)
      expect(mocks.pmFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            clientId: CLIENT_ID,
            id: { not: PM_ID },
            isDefault: true,
          }),
          select: { id: true },
        })
      );

      // Manifest runtime receives the markAsDefault command
      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "PaymentMethod",
          command: "markAsDefault",
          body: { id: PM_ID },
        })
      );
    });

    it("issues markNotDefault for each sibling default found", async () => {
      mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);
      const siblingIds = [
        "33333333-3333-3333-3333-333333333333",
        "44444444-4444-4444-4444-444444444444",
      ];
      mocks.pmFindManyMock.mockResolvedValue(siblingIds.map((id) => ({ id })));

      await PATCH(makeRequest({ action: "mark-as-default" }), { params });

      // Two markNotDefault calls — one per sibling
      expect(mocks.runManifestCommandCoreMock).toHaveBeenCalledTimes(2);
      expect(mocks.runManifestCommandCoreMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entity: "PaymentMethod",
          command: "markNotDefault",
          instanceId: siblingIds[0],
        })
      );
      expect(mocks.runManifestCommandCoreMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entity: "PaymentMethod",
          command: "markNotDefault",
          instanceId: siblingIds[1],
        })
      );
    });

    it("clears siblings BEFORE issuing markAsDefault (ordering matters)", async () => {
      mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);
      mocks.pmFindManyMock.mockResolvedValue([
        { id: "33333333-3333-3333-3333-333333333333" },
      ]);

      await PATCH(makeRequest({ action: "mark-as-default" }), { params });

      const coreOrder =
        mocks.runManifestCommandCoreMock.mock.invocationCallOrder[0]!;
      const manifestOrder =
        mocks.runManifestCommandMock.mock.invocationCallOrder[0]!;
      expect(coreOrder).toBeLessThan(manifestOrder);
    });
  });

  // ---------------------------------------------------------------- verify

  describe("action: verify", () => {
    it("delegates verify command to Manifest runtime", async () => {
      mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);

      const response = await PATCH(makeRequest({ action: "verify" }), {
        params,
      });

      expect(response.status).toBe(200);
      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "PaymentMethod",
          command: "verify",
          body: expect.objectContaining({ id: PM_ID }),
        })
      );
      // Must not call findMany or markNotDefault — verify does not touch sibling defaults.
      expect(mocks.pmFindManyMock).not.toHaveBeenCalled();
      expect(mocks.runManifestCommandCoreMock).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------- flag-for-fraud

  describe("action: flag-for-fraud", () => {
    it("delegates flagForFraud command to Manifest runtime", async () => {
      mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);

      const response = await PATCH(makeRequest({ action: "flag-for-fraud" }), {
        params,
      });

      expect(response.status).toBe(200);
      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "PaymentMethod",
          command: "flagForFraud",
          body: expect.objectContaining({ id: PM_ID }),
        })
      );
    });
  });

  // ---------------------------------------------------------------- mark-expired

  describe("action: mark-expired", () => {
    it("delegates markExpired command to Manifest runtime", async () => {
      mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);

      const response = await PATCH(makeRequest({ action: "mark-expired" }), {
        params,
      });

      expect(response.status).toBe(200);
      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "PaymentMethod",
          command: "markExpired",
          body: { id: PM_ID },
        })
      );
    });
  });

  // ---------------------------------------------------------------- remove

  describe("action: remove", () => {
    it("delegates remove command to Manifest runtime", async () => {
      mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);

      const response = await PATCH(makeRequest({ action: "remove" }), {
        params,
      });

      expect(response.status).toBe(200);
      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "PaymentMethod",
          command: "remove",
          body: { id: PM_ID },
        })
      );
    });
  });

  // ---------------------------------------------------------------- error path

  it("returns 500 when Manifest command returns error response", async () => {
    mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);
    mocks.runManifestCommandMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Internal error" }), { status: 500 })
    );

    const response = await PATCH(makeRequest({ action: "verify" }), {
      params,
    });

    expect(response.status).toBe(500);
  });
});
