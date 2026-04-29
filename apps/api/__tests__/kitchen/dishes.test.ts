/**
 * Dish API Route Tests
 *
 * Tests all dish command routes under /api/dish/:
 * - POST /api/dish/create             -> Dish.create
 * - POST /api/dish/update             -> Dish.update
 * - POST /api/dish/deactivate         -> Dish.deactivate
 * - POST /api/dish/update-lead-time   -> Dish.updateLeadTime
 * - POST /api/dish/update-pricing     -> Dish.updatePricing
 *
 * Covers: auth (401), tenant-not-found (400), policy denial (403),
 * guard failure (422), success (200), command wiring, and error handling (500).
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

const TEST_TENANT_ID = "b0000000-0000-4000-b000-000000000002";
const TEST_USER_ID = "user_test_dish";
const TEST_ORG_ID = "org_test_dish";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/dish/test", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function mockAuthenticated() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
}

function mockRuntimeSuccess(
  result: Record<string, unknown> = { id: "dish-001" }
) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: true,
      result,
      emittedEvents: [{ type: "DishCreated", entityId: result.id }],
    }),
  } as never);
}

function mockRuntimeFailure(error: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      error,
    }),
  } as never);
}

function mockRuntimePolicyDenial(policyName: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      policyDenial: { policyName },
    }),
  } as never);
}

function mockRuntimeGuardFailure(index: number, formatted: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      guardFailure: { index, formatted },
    }),
  } as never);
}

describe("Dish API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- POST /api/dish/create ----

  describe("POST /api/dish/create", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const { POST } = await import("@/app/api/dish/create/route");
      const res = await POST(makeRequest({ name: "Caesar Salad" }));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Unauthorized");
    });

    it("returns 400 when tenant is not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_USER_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const { POST } = await import("@/app/api/dish/create/route");
      const res = await POST(makeRequest({ name: "Caesar Salad" }));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Tenant not found");
    });

    it("returns 200 on successful create", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({
        id: "dish-001",
        name: "Caesar Salad",
        costPerPortionCents: 350,
        salesPriceCents: 1200,
      });

      const { POST } = await import("@/app/api/dish/create/route");
      const res = await POST(makeRequest({ name: "Caesar Salad" }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Caesar Salad");
    });

    it("returns 403 on policy denial", async () => {
      mockAuthenticated();
      mockRuntimePolicyDenial("chefOnly");

      const { POST } = await import("@/app/api/dish/create/route");
      const res = await POST(makeRequest({ name: "Caesar Salad" }));
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain("chefOnly");
    });

    it("returns 500 on unexpected error", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("Connection refused") as never
      );

      const { POST } = await import("@/app/api/dish/create/route");
      const res = await POST(makeRequest({ name: "Caesar Salad" }));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Internal server error");
    });
  });

  // ---- POST /api/dish/update ----

  describe("POST /api/dish/update", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const { POST } = await import("@/app/api/dish/update/route");
      const res = await POST(
        makeRequest({ id: "dish-001", name: "Updated" })
      );
      const data = await res.json();

      expect(res.status).toBe(401);
    });

    it("returns 200 on successful update", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({ id: "dish-001", name: "Greek Salad" });

      const { POST } = await import("@/app/api/dish/update/route");
      const res = await POST(
        makeRequest({ id: "dish-001", name: "Greek Salad" })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Greek Salad");
    });

    it("passes correct command and entityName to runtime", async () => {
      mockAuthenticated();
      const runCommand = vi.fn().mockResolvedValue({
        success: true,
        result: { id: "dish-001" },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand,
      } as never);

      const { POST } = await import("@/app/api/dish/update/route");
      await POST(makeRequest({ id: "dish-001", name: "Updated" }));

      expect(runCommand).toHaveBeenCalledWith(
        "update",
        { id: "dish-001", name: "Updated" },
        { entityName: "Dish" }
      );
    });

    it("returns 422 on guard failure", async () => {
      mockAuthenticated();
      mockRuntimeGuardFailure(1, "name must not be empty");

      const { POST } = await import("@/app/api/dish/update/route");
      const res = await POST(makeRequest({ id: "dish-001", name: "" }));
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.message).toContain("Guard 1 failed");
    });
  });

  // ---- POST /api/dish/deactivate ----

  describe("POST /api/dish/deactivate", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const { POST } = await import("@/app/api/dish/deactivate/route");
      const res = await POST(makeRequest({ id: "dish-001" }));

      expect(res.status).toBe(401);
    });

    it("returns 200 on successful deactivate", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({ id: "dish-001", isActive: false });

      const { POST } = await import("@/app/api/dish/deactivate/route");
      const res = await POST(makeRequest({ id: "dish-001" }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.isActive).toBe(false);
    });

    it("returns 400 on generic command failure", async () => {
      mockAuthenticated();
      mockRuntimeFailure("Dish not found");

      const { POST } = await import("@/app/api/dish/deactivate/route");
      const res = await POST(makeRequest({ id: "dish-999" }));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.message).toBe("Dish not found");
    });
  });

  // ---- POST /api/dish/update-lead-time ----

  describe("POST /api/dish/update-lead-time", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const { POST } = await import("@/app/api/dish/update-lead-time/route");
      const res = await POST(
        makeRequest({
          id: "dish-001",
          prepTimeMinutes: 45,
          cookTimeMinutes: 30,
        })
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.message).toBe("Unauthorized");
    });

    it("returns 200 on successful lead time update", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({
        id: "dish-001",
        prepTimeMinutes: 45,
        cookTimeMinutes: 30,
      });

      const { POST } = await import("@/app/api/dish/update-lead-time/route");
      const res = await POST(
        makeRequest({
          id: "dish-001",
          prepTimeMinutes: 45,
          cookTimeMinutes: 30,
        })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.prepTimeMinutes).toBe(45);
      expect(data.result.cookTimeMinutes).toBe(30);
    });

    it("passes 'updateLeadTime' command with Dish entityName", async () => {
      mockAuthenticated();
      const runCommand = vi.fn().mockResolvedValue({
        success: true,
        result: { id: "dish-001" },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand,
      } as never);

      const body = { id: "dish-001", prepTimeMinutes: 60 };
      const { POST } = await import("@/app/api/dish/update-lead-time/route");
      await POST(makeRequest(body));

      expect(runCommand).toHaveBeenCalledWith("updateLeadTime", body, {
        entityName: "Dish",
      });
    });
  });

  // ---- POST /api/dish/update-pricing ----

  describe("POST /api/dish/update-pricing", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const { POST } = await import("@/app/api/dish/update-pricing/route");
      const res = await POST(
        makeRequest({
          id: "dish-001",
          costPerPortionCents: 500,
          salesPriceCents: 1500,
        })
      );
      const data = await res.json();

      expect(res.status).toBe(401);
    });

    it("returns 200 on successful pricing update", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({
        id: "dish-001",
        costPerPortionCents: 500,
        salesPriceCents: 1500,
      });

      const { POST } = await import("@/app/api/dish/update-pricing/route");
      const res = await POST(
        makeRequest({
          id: "dish-001",
          costPerPortionCents: 500,
          salesPriceCents: 1500,
        })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.salesPriceCents).toBe(1500);
    });

    it("passes 'updatePricing' command with Dish entityName", async () => {
      mockAuthenticated();
      const runCommand = vi.fn().mockResolvedValue({
        success: true,
        result: { id: "dish-001" },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand,
      } as never);

      const body = {
        id: "dish-001",
        costPerPortionCents: 600,
        salesPriceCents: 1800,
      };
      const { POST } = await import("@/app/api/dish/update-pricing/route");
      await POST(makeRequest(body));

      expect(runCommand).toHaveBeenCalledWith("updatePricing", body, {
        entityName: "Dish",
      });
    });

    it("returns 403 on policy denial for pricing change", async () => {
      mockAuthenticated();
      mockRuntimePolicyDenial("financeOnly");

      const { POST } = await import("@/app/api/dish/update-pricing/route");
      const res = await POST(
        makeRequest({
          id: "dish-001",
          costPerPortionCents: 500,
          salesPriceCents: 1500,
        })
      );
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.message).toContain("financeOnly");
    });

    it("returns 500 on unexpected error", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("Unexpected") as never
      );

      const { POST } = await import("@/app/api/dish/update-pricing/route");
      const res = await POST(
        makeRequest({
          id: "dish-001",
          costPerPortionCents: 500,
          salesPriceCents: 1500,
        })
      );

      expect(res.status).toBe(500);
    });
  });
});
