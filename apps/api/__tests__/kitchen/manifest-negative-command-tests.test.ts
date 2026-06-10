/**
 * Negative Command Tests
 *
 * Tests that negative scenarios return proper 4xx responses with structured error:
 * - Missing required fields -> 400
 * - Invalid status transitions -> guard failure -> 422
 * - Policy/guard failures -> 403/422 with structured message
 * - No console noise on expected 4xx errors
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  manifestSuccessResponse: vi.fn((data, status = 200) => new Response(JSON.stringify({ success: true, ...(typeof data === "object" && data !== null ? data : { data }) }), { status })),
  manifestErrorResponse: vi.fn((message, status = 400) => {
    const body = typeof message === "string" ? { success: false, message } : { success: false, error: message.error, diagnostics: message.diagnostics ?? [] };
    return new Response(JSON.stringify(body), { status });
  }),
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
import { manifestErrorResponse } from "@/lib/manifest-response";

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

describe("Negative Command Tests - PrepTask Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Missing required field tests", () => {
    it("should return 400 when runCommand reports missing required field", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestErrorResponse("Missing required field: id", 400)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/PrepTask/commands/claim",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "test-user-id",
            stationId: "station-a",
          }),
        }
      );

      const response = await dispatch("PrepTask", "claim")(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBeDefined();
      expect(typeof data.message).toBe("string");
      expect(data.message.length).toBeGreaterThan(0);
      expect(console.error).not.toHaveBeenCalled();
    });

    it("should return 400 when body is empty", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestErrorResponse("Missing required field: id", 400)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/PrepTask/commands/claim",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await dispatch("PrepTask", "claim")(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBeDefined();
      expect(typeof data.message).toBe("string");
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe("Guard failure tests", () => {
    it("should return 422 when guard fails (invalid status transition)", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestErrorResponse("Guard 1 failed: status must be 'open' to claim, got 'done'", 422)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/PrepTask/commands/claim",
        {
          method: "POST",
          body: JSON.stringify({
            id: "task-done-001",
            userId: "test-user-id",
            stationId: "station-a",
          }),
        }
      );

      const response = await dispatch("PrepTask", "claim")(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Guard 1 failed");
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe("Policy denial tests", () => {
    it("should return 403 when policy denies access", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestErrorResponse("Access denied by policy: adminOnly — User does not have admin role", 403)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/PrepTask/commands/claim",
        {
          method: "POST",
          body: JSON.stringify({
            id: "task-001",
            userId: "test-user-id",
            stationId: "station-a",
          }),
        }
      );

      const response = await dispatch("PrepTask", "claim")(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Access denied");
      expect(data.message).toContain("adminOnly");
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe("Response shape validation", () => {
    it("error responses should only have success and message fields", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestErrorResponse("Validation failed", 400)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/PrepTask/commands/claim",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await dispatch("PrepTask", "claim")(request);
      const data = await response.json();

      const keys = Object.keys(data);
      expect(keys).toContain("success");
      expect(keys).toContain("message");
      expect(keys.length).toBe(2);
    });
  });

  describe("Console noise check", () => {
    it("should not log console.error for 400 responses", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestErrorResponse("Bad request", 400)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/PrepTask/commands/claim",
        { method: "POST", body: JSON.stringify({}) }
      );

      await dispatch("PrepTask", "claim")(request);
      expect(console.error).not.toHaveBeenCalled();
    });

    it("should not log console.error for 403 responses", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestErrorResponse("Access denied by policy: adminOnly — Denied", 403)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/PrepTask/commands/claim",
        { method: "POST", body: JSON.stringify({ id: "t" }) }
      );

      await dispatch("PrepTask", "claim")(request);
      expect(console.error).not.toHaveBeenCalled();
    });

    it("should not log console.error for 422 responses", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        manifestErrorResponse("Guard 0 failed: Guard failed", 422)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/PrepTask/commands/claim",
        { method: "POST", body: JSON.stringify({ id: "t" }) }
      );

      await dispatch("PrepTask", "claim")(request);
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});
