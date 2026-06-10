/**
 * Dish API Route Tests
 *
 * Tests all dish command routes via the manifest dispatcher:
 * - POST Dish.create, Dish.update, Dish.deactivate, Dish.updateLeadTime, Dish.updatePricing
 *
 * Covers: auth (401), policy denial (403), guard failure (422),
 * success (200), command wiring, and error handling (500).
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Standard mock block for dispatcher-based command tests
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), addBreadcrumb: vi.fn() }));
vi.mock("@/lib/manifest/execute-command", () => ({ runManifestCommand: vi.fn() }));
vi.mock("@/lib/manifest-runtime", () => ({ createManifestRuntime: vi.fn() }));
vi.mock("@/lib/manifest-response", () => ({
  manifestSuccessResponse: vi.fn((data, status = 200) => new Response(JSON.stringify(data), { status })),
  manifestErrorResponse: vi.fn((data, status = 400) => new Response(JSON.stringify(data), { status })),
}));
vi.mock("@/app/lib/invariant", () => {
  class InvariantError extends Error { name = "InvariantError" as const; constructor(m: string) { super(m); this.name = "InvariantError"; } }
  return { invariant: vi.fn(), InvariantError };
});
vi.mock("@/app/lib/webhook-dispatch", () => ({ dispatchWebhooks: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@repo/notifications", () => ({}));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({ runManifestCommandCore: vi.fn() }));
vi.mock("@/lib/manifest/issue-log", () => ({ logManifestIssue: vi.fn() }));

import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";
import { InvariantError } from "@/app/lib/invariant";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

const dispatch = (command: string) => (req: NextRequest) =>
  manifestDispatch(req, { params: Promise.resolve({ entity: "Dish", command }) });

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_USER_ID = "user-001";
const MOCK_USER = { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin", email: "test@test.com", firstName: "Test", lastName: "User" };

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/dish/test", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function mockAuthenticated() {
  vi.mocked(requireCurrentUser).mockResolvedValue(MOCK_USER as never);
}

function throwInvariant(message: string) {
  vi.mocked(requireCurrentUser).mockImplementation(() => { throw new InvariantError(message); });
}

function mockRunSuccess(result: Record<string, unknown> = { id: "dish-001" }) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    new Response(JSON.stringify({ success: true, result, events: [{ type: "DishCreated", entityId: result.id }] }), { status: 200 })
  );
}

function mockRunError(status: number, message: string) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    new Response(JSON.stringify({ success: false, message }), { status })
  );
}

describe("Dish API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticated();
  });

  // ---- POST Dish.create ----

  describe("POST Dish.create", () => {
    it("returns 401 when unauthenticated", async () => {
      throwInvariant("Unauthorized");

      const res = await dispatch("create")(makeRequest({ name: "Caesar Salad" }));
      expect(res.status).toBe(401);
    });

    it("returns 200 on successful create", async () => {
      mockRunSuccess({ id: "dish-001", name: "Caesar Salad", costPerPortionCents: 350, salesPriceCents: 1200 });

      const res = await dispatch("create")(makeRequest({ name: "Caesar Salad" }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Caesar Salad");
    });

    it("returns 403 on policy denial", async () => {
      mockRunError(403, "Access denied: chefOnly (role=admin)");

      const res = await dispatch("create")(makeRequest({ name: "Caesar Salad" }));
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.message).toContain("chefOnly");
    });

    it("returns 422 on guard failure", async () => {
      mockRunError(422, "Guard 1 failed: name must not be empty");

      const res = await dispatch("create")(makeRequest({ name: "" }));
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.message).toContain("Guard 1 failed");
    });

    it("returns 500 on unexpected error", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(new Error("Connection refused") as never);

      const res = await dispatch("create")(makeRequest({ name: "Caesar Salad" }));
      expect(res.status).toBe(500);
    });
  });

  // ---- POST Dish.update ----

  describe("POST Dish.update", () => {
    it("returns 401 when unauthenticated", async () => {
      throwInvariant("Unauthorized");

      const res = await dispatch("update")(makeRequest({ id: "dish-001", name: "Updated" }));
      expect(res.status).toBe(401);
    });

    it("returns 200 on successful update", async () => {
      mockRunSuccess({ id: "dish-001", name: "Greek Salad" });

      const res = await dispatch("update")(makeRequest({ id: "dish-001", name: "Greek Salad" }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Greek Salad");
    });

    it("passes correct entity and command to runManifestCommand", async () => {
      mockRunSuccess({ id: "dish-001" });

      await dispatch("update")(makeRequest({ id: "dish-001", name: "Updated" }));

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({ entity: "Dish", command: "update" })
      );
    });

    it("returns 422 on guard failure", async () => {
      mockRunError(422, "Guard 1 failed: name must not be empty");

      const res = await dispatch("update")(makeRequest({ id: "dish-001", name: "" }));
      expect(res.status).toBe(422);
      expect((await res.json()).message).toContain("Guard 1 failed");
    });
  });

  // ---- POST Dish.deactivate ----

  describe("POST Dish.deactivate", () => {
    it("returns 401 when unauthenticated", async () => {
      throwInvariant("Unauthorized");

      const res = await dispatch("deactivate")(makeRequest({ id: "dish-001" }));
      expect(res.status).toBe(401);
    });

    it("returns 200 on successful deactivate", async () => {
      mockRunSuccess({ id: "dish-001", isActive: false });

      const res = await dispatch("deactivate")(makeRequest({ id: "dish-001" }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result.isActive).toBe(false);
    });

    it("returns 400 on generic command failure", async () => {
      mockRunError(400, "Dish not found");

      const res = await dispatch("deactivate")(makeRequest({ id: "dish-999" }));
      expect(res.status).toBe(400);
      expect((await res.json()).message).toBe("Dish not found");
    });
  });

  // ---- POST Dish.updateLeadTime ----

  describe("POST Dish.updateLeadTime", () => {
    it("returns 401 when unauthenticated", async () => {
      throwInvariant("Unauthorized");

      const res = await dispatch("updateLeadTime")(makeRequest({ id: "dish-001", prepTimeMinutes: 45, cookTimeMinutes: 30 }));
      expect(res.status).toBe(401);
    });

    it("returns 200 on successful lead time update", async () => {
      mockRunSuccess({ id: "dish-001", prepTimeMinutes: 45, cookTimeMinutes: 30 });

      const res = await dispatch("updateLeadTime")(makeRequest({ id: "dish-001", prepTimeMinutes: 45, cookTimeMinutes: 30 }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result.prepTimeMinutes).toBe(45);
      expect(data.result.cookTimeMinutes).toBe(30);
    });

    it("passes correct entity and command to runManifestCommand", async () => {
      mockRunSuccess({ id: "dish-001" });

      await dispatch("updateLeadTime")(makeRequest({ id: "dish-001", prepTimeMinutes: 60 }));
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({ entity: "Dish", command: "updateLeadTime" })
      );
    });
  });

  // ---- POST Dish.updatePricing ----

  describe("POST Dish.updatePricing", () => {
    it("returns 401 when unauthenticated", async () => {
      throwInvariant("Unauthorized");

      const res = await dispatch("updatePricing")(makeRequest({ id: "dish-001", costPerPortionCents: 500, salesPriceCents: 1500 }));
      expect(res.status).toBe(401);
    });

    it("returns 200 on successful pricing update", async () => {
      mockRunSuccess({ id: "dish-001", costPerPortionCents: 500, salesPriceCents: 1500 });

      const res = await dispatch("updatePricing")(makeRequest({ id: "dish-001", costPerPortionCents: 500, salesPriceCents: 1500 }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result.salesPriceCents).toBe(1500);
    });

    it("passes correct entity and command to runManifestCommand", async () => {
      mockRunSuccess({ id: "dish-001" });

      await dispatch("updatePricing")(makeRequest({ id: "dish-001", costPerPortionCents: 600, salesPriceCents: 1800 }));
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({ entity: "Dish", command: "updatePricing" })
      );
    });

    it("returns 403 on policy denial for pricing change", async () => {
      mockRunError(403, "Access denied: financeOnly (role=admin)");

      const res = await dispatch("updatePricing")(makeRequest({ id: "dish-001", costPerPortionCents: 500, salesPriceCents: 1500 }));
      expect(res.status).toBe(403);
      expect((await res.json()).message).toContain("financeOnly");
    });

    it("returns 500 on unexpected error", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(new Error("Unexpected") as never);

      const res = await dispatch("updatePricing")(makeRequest({ id: "dish-001", costPerPortionCents: 500, salesPriceCents: 1500 }));
      expect(res.status).toBe(500);
    });
  });
});
