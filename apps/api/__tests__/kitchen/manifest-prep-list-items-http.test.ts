/**
 * HTTP integration tests for PrepListItem command routes
 *
 * Tests the HTTP layer for all 5 PrepListItem command routes via the
 * unified dispatcher with mocked runManifestCommand.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({ createManifestRuntime: vi.fn() }));
vi.mock("@/lib/manifest-response", () => ({
  manifestSuccessResponse: vi.fn(
    (data, status = 200) =>
      new Response(
        JSON.stringify({
          success: true,
          ...(typeof data === "object" && data !== null ? data : { data }),
        }),
        { status }
      )
  ),
  manifestErrorResponse: vi.fn((message, status = 400) => {
    const body =
      typeof message === "string"
        ? { success: false, message }
        : {
            success: false,
            error: message.error,
            diagnostics: message.diagnostics ?? [],
          };
    return new Response(JSON.stringify(body), { status });
  }),
}));
vi.mock("@/app/lib/invariant", () => {
  class InvariantError extends Error {
    name = "InvariantError" as const;
    constructor(m: string) {
      super(m);
      this.name = "InvariantError";
    }
  }
  return { invariant: vi.fn(), InvariantError };
});
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@repo/notifications", () => ({}));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@/lib/manifest/issue-log", () => ({ logManifestIssue: vi.fn() }));

import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";
import { InvariantError } from "@/app/lib/invariant";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { manifestSuccessResponse } from "@/lib/manifest-response";

const dispatch = (entity: string, command: string) => (req: NextRequest) =>
  manifestDispatch(req, { params: Promise.resolve({ entity, command }) });

const mockCurrentUser = {
  id: "test-user-id",
  tenantId: "test-tenant",
  role: "admin",
  email: "test@test.com",
  firstName: "Test",
  lastName: "User",
};

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(
    "http://localhost/api/manifest/[entity]/commands/[command]",
    { method: "POST", body: JSON.stringify(body) }
  );
}

describe("Manifest HTTP - PrepListItem Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  describe("mark-completed", () => {
    it("should reject unauthorized requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValueOnce(
        new InvariantError("Unauthenticated")
      );
      const response = await dispatch(
        "PrepListItem",
        "mark-completed"
      )(makeRequest({ id: "item-001", completedByUserId: "user-001" }));
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthenticated");
    });

    it("should return 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValueOnce(
        new InvariantError("Tenant not found")
      );
      const response = await dispatch(
        "PrepListItem",
        "mark-completed"
      )(makeRequest({ id: "item-001", completedByUserId: "user-001" }));
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
    });

    it("should process valid mark-completed request", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: {
            id: "item-001",
            isCompleted: true,
            completedByUserId: "test-user-id",
          },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepListItem",
        "mark-completed"
      )(makeRequest({ id: "item-001", completedByUserId: "test-user-id" }));
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
    });
  });

  describe("mark-uncompleted", () => {
    it("should reject unauthorized requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValueOnce(
        new InvariantError("Unauthenticated")
      );
      const response = await dispatch(
        "PrepListItem",
        "mark-uncompleted"
      )(makeRequest({ id: "item-001" }));
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
    });

    it("should return 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValueOnce(
        new InvariantError("Tenant not found")
      );
      const response = await dispatch(
        "PrepListItem",
        "mark-uncompleted"
      )(makeRequest({ id: "item-001" }));
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
    });

    it("should process valid mark-uncompleted request", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "item-001", isCompleted: false },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepListItem",
        "mark-uncompleted"
      )(makeRequest({ id: "item-001" }));
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
    });
  });

  describe("update-prep-notes", () => {
    it("should reject unauthorized requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValueOnce(
        new InvariantError("Unauthenticated")
      );
      const response = await dispatch(
        "PrepListItem",
        "update-prep-notes"
      )(
        makeRequest({
          id: "item-001",
          newNotes: "Chop finely",
          newDietarySubstitutions: "Use tofu instead",
        })
      );
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
    });

    it("should return 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValueOnce(
        new InvariantError("Tenant not found")
      );
      const response = await dispatch(
        "PrepListItem",
        "update-prep-notes"
      )(
        makeRequest({
          id: "item-001",
          newNotes: "Chop finely",
          newDietarySubstitutions: "Use tofu instead",
        })
      );
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
    });

    it("should process valid update-prep-notes request", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: {
            id: "item-001",
            prepNotes: "Chop finely",
            dietarySubstitutions: "Use tofu instead",
          },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepListItem",
        "update-prep-notes"
      )(
        makeRequest({
          id: "item-001",
          newNotes: "Chop finely",
          newDietarySubstitutions: "Use tofu instead",
        })
      );
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
    });
  });

  describe("update-quantity", () => {
    it("should reject unauthorized requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValueOnce(
        new InvariantError("Unauthenticated")
      );
      const response = await dispatch(
        "PrepListItem",
        "update-quantity"
      )(
        makeRequest({
          id: "item-001",
          newBaseQuantity: 15,
          newScaledQuantity: 30,
          newBaseUnit: "kg",
          newScaledUnit: "kg",
        })
      );
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
    });

    it("should return 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValueOnce(
        new InvariantError("Tenant not found")
      );
      const response = await dispatch(
        "PrepListItem",
        "update-quantity"
      )(
        makeRequest({
          id: "item-001",
          newBaseQuantity: 15,
          newScaledQuantity: 30,
        })
      );
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
    });

    it("should process valid update-quantity request", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "item-001", baseQuantity: 15, scaledQuantity: 30 },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepListItem",
        "update-quantity"
      )(
        makeRequest({
          id: "item-001",
          newBaseQuantity: 15,
          newScaledQuantity: 30,
          newBaseUnit: "kg",
          newScaledUnit: "kg",
        })
      );
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
    });
  });

  describe("update-station", () => {
    it("should reject unauthorized requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValueOnce(
        new InvariantError("Unauthenticated")
      );
      const response = await dispatch(
        "PrepListItem",
        "update-station"
      )(
        makeRequest({
          id: "item-001",
          newStationId: "station-002",
          newStationName: "Cold Prep Station",
        })
      );
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
    });

    it("should return 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValueOnce(
        new InvariantError("Tenant not found")
      );
      const response = await dispatch(
        "PrepListItem",
        "update-station"
      )(
        makeRequest({
          id: "item-001",
          newStationId: "station-002",
          newStationName: "Cold Prep Station",
        })
      );
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
    });

    it("should process valid update-station request", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestSuccessResponse({
          result: { id: "item-001", stationId: "station-002" },
          events: [],
        })
      );
      const response = await dispatch(
        "PrepListItem",
        "update-station"
      )(
        makeRequest({
          id: "item-001",
          newStationId: "station-002",
          newStationName: "Cold Prep Station",
        })
      );
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
    });
  });
});
