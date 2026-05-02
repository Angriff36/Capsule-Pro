/**
 * Payment Method PATCH Action Test Suite
 *
 * Verifies the command-action dispatcher on
 * `PATCH /api/accounting/payment-methods/[id]`. Actions:
 *   mark-as-default | verify | flag-for-fraud | mark-expired | remove
 *
 * Why these tests matter:
 *   - `mark-as-default` MUST unset prior defaults for the same client before
 *     marking the target. A regression here lets two payment methods both
 *     hold `isDefault=true`, which silently picks an arbitrary card at charge
 *     time. The route does this via `updateMany` filtered by clientId — we
 *     assert the filter shape so a typo doesn't quietly demote every default
 *     in the tenant.
 *   - `flag-for-fraud` is a security control. If the status update never
 *     persists, fraudulent cards stay in the rotation and continue to charge.
 *     Capture the data shape and ensure the database write actually fires.
 *   - `remove` is a soft-delete that returns `{ success: true }` rather than
 *     the entity — clients that read `response.id` will break if we
 *     accidentally return the entity here.
 *   - Cross-tenant access on findFirst returning a record from another tenant
 *     must reject (covered via `validatePaymentMethodAccess`).
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TENANT_ID_OTHER = "00000000-0000-0000-0000-000000000002";
const PM_ID = "11111111-1111-1111-1111-111111111111";
const CLIENT_ID = "22222222-2222-2222-2222-222222222222";

const mocks = vi.hoisted(() => ({
  pmFindFirstMock: vi.fn(),
  pmUpdateMock: vi.fn(),
  pmUpdateManyMock: vi.fn(),
  requireTenantIdMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  consoleErrorMock: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    paymentMethod: {
      findFirst: mocks.pmFindFirstMock,
      update: mocks.pmUpdateMock,
      updateMany: mocks.pmUpdateManyMock,
    },
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  requireTenantId: mocks.requireTenantIdMock,
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
    mocks.pmUpdateMock.mockReset();
    mocks.pmUpdateManyMock.mockReset();
    mocks.requireTenantIdMock.mockReset();
    mocks.captureExceptionMock.mockReset();
    mocks.consoleErrorMock.mockReset();

    mocks.requireTenantIdMock.mockResolvedValue(TENANT_ID);
    mocks.pmUpdateManyMock.mockResolvedValue({ count: 0 });
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
    expect(mocks.pmUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 500 (caught invariant) when payment method belongs to another tenant", async () => {
    // Cross-tenant: lookup returns a PM owned by TENANT_ID_OTHER but
    // requireTenantId returns TENANT_ID — validatePaymentMethodAccess
    // throws an InvariantError caught in the route's catch block.
    mocks.pmFindFirstMock.mockResolvedValue({
      ...basePaymentMethod,
      tenantId: TENANT_ID_OTHER,
    });

    const response = await PATCH(makeRequest({ action: "verify" }), {
      params,
    });

    expect(response.status).toBe(500);
    expect(mocks.pmUpdateMock).not.toHaveBeenCalled();
    expect(mocks.captureExceptionMock).toHaveBeenCalled();
  });

  it("returns 400 for unknown actions", async () => {
    mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);

    const response = await PATCH(makeRequest({ action: "unknown-action" }), {
      params,
    });

    expect(response.status).toBe(400);
    expect(mocks.pmUpdateMock).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------- mark-as-default

  describe("action: mark-as-default", () => {
    it("unsets sibling defaults via updateMany before promoting the target", async () => {
      mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);
      mocks.pmUpdateMock.mockResolvedValue({
        ...basePaymentMethod,
        isDefault: true,
      });

      const response = await PATCH(makeRequest({ action: "mark-as-default" }), {
        params,
      });

      expect(response.status).toBe(200);

      // updateMany must scope to (tenantId, clientId, NOT this id, isDefault=true)
      expect(mocks.pmUpdateManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            clientId: CLIENT_ID,
            id: { not: PM_ID },
            isDefault: true,
          }),
          data: { isDefault: false },
        })
      );

      // Single update must promote this PM
      expect(mocks.pmUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isDefault: true }),
        })
      );
    });

    it("invokes updateMany BEFORE update (ordering matters)", async () => {
      mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);
      mocks.pmUpdateMock.mockResolvedValue({
        ...basePaymentMethod,
        isDefault: true,
      });

      await PATCH(makeRequest({ action: "mark-as-default" }), { params });

      const updateManyOrder =
        mocks.pmUpdateManyMock.mock.invocationCallOrder[0];
      const updateOrder = mocks.pmUpdateMock.mock.invocationCallOrder[0];
      expect(updateManyOrder).toBeLessThan(updateOrder);
    });

    it("returns the entity with computed displayInfo", async () => {
      mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);
      mocks.pmUpdateMock.mockResolvedValue({
        ...basePaymentMethod,
        isDefault: true,
      });

      const response = await PATCH(makeRequest({ action: "mark-as-default" }), {
        params,
      });
      const body = await response.json();

      expect(body.displayInfo).toBe("VISA •••• 4242");
      expect(body.isDefault).toBe(true);
    });
  });

  // ---------------------------------------------------------------- verify

  describe("action: verify", () => {
    it("sets status to VERIFIED and stamps updatedAt", async () => {
      mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);
      mocks.pmUpdateMock.mockResolvedValue({
        ...basePaymentMethod,
        status: "VERIFIED",
      });

      const response = await PATCH(makeRequest({ action: "verify" }), {
        params,
      });

      expect(response.status).toBe(200);
      const dataArg = mocks.pmUpdateMock.mock.calls[0][0].data;
      expect(dataArg.status).toBe("VERIFIED");
      expect(dataArg.updatedAt).toBeInstanceOf(Date);
      // Must not call updateMany — verify does not touch sibling defaults.
      expect(mocks.pmUpdateManyMock).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------- flag-for-fraud

  describe("action: flag-for-fraud", () => {
    it("sets status to FLAGGED", async () => {
      mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);
      mocks.pmUpdateMock.mockResolvedValue({
        ...basePaymentMethod,
        status: "FLAGGED",
      });

      const response = await PATCH(makeRequest({ action: "flag-for-fraud" }), {
        params,
      });

      expect(response.status).toBe(200);
      const dataArg = mocks.pmUpdateMock.mock.calls[0][0].data;
      expect(dataArg.status).toBe("FLAGGED");
    });
  });

  // ---------------------------------------------------------------- mark-expired

  describe("action: mark-expired", () => {
    it("sets status to EXPIRED", async () => {
      mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);
      mocks.pmUpdateMock.mockResolvedValue({
        ...basePaymentMethod,
        status: "EXPIRED",
      });

      const response = await PATCH(makeRequest({ action: "mark-expired" }), {
        params,
      });

      expect(response.status).toBe(200);
      const dataArg = mocks.pmUpdateMock.mock.calls[0][0].data;
      expect(dataArg.status).toBe("EXPIRED");
    });
  });

  // ---------------------------------------------------------------- remove

  describe("action: remove", () => {
    it("soft-deletes by stamping deletedAt and returns success envelope", async () => {
      mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);
      mocks.pmUpdateMock.mockResolvedValue({
        ...basePaymentMethod,
        deletedAt: new Date(),
      });

      const response = await PATCH(makeRequest({ action: "remove" }), {
        params,
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true });

      const dataArg = mocks.pmUpdateMock.mock.calls[0][0].data;
      expect(dataArg.deletedAt).toBeInstanceOf(Date);
      // Must NOT touch isDefault, type, or other fields on remove.
      expect(dataArg.status).toBeUndefined();
      expect(dataArg.isDefault).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------- error path

  it("returns 500 on unexpected database error during write", async () => {
    mocks.pmFindFirstMock.mockResolvedValue(basePaymentMethod);
    mocks.pmUpdateMock.mockRejectedValue(new Error("DB exploded"));

    const response = await PATCH(makeRequest({ action: "verify" }), {
      params,
    });

    expect(response.status).toBe(500);
    expect(mocks.captureExceptionMock).toHaveBeenCalled();
  });
});
