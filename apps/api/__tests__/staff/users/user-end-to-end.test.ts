/**
 * User End-to-End Command Route Tests
 *
 * Tests that the User command routes correctly pass (or omit) `instanceId`
 * to `runtime.runCommand`. There is no list or detail GET route for Users --
 * the frontend reads directly from the database via `database.user.findMany()`.
 *
 * This test verifies:
 * 1. instanceId correctness on instance-scoped command routes (the core fix)
 * 2. Create route does NOT pass instanceId
 * 3. Authentication guards return 401 for unauthenticated requests
 * 4. Error handling for guard failures and policy denials
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockDatabase } = vi.hoisted(() => {
  const mockUserStore = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  };
  return {
    mockDatabase: {
      user: mockUserStore,
    },
  };
});

vi.mock("@repo/database", () => ({
  database: mockDatabase,
}));

vi.mock("@/lib/database", () => ({
  database: mockDatabase,
}));

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

// Import mocked modules after vi.mock setup
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_ORG_ID = "org-test-123";
const TEST_USER_ID = "u0000000-0000-4000-a000-000000000001";
const TEST_CLERK_ID = "clerk_test_001";

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------

function createMockRequest(
  url: string,
  options: RequestInit = {},
): NextRequest {
  if (options.body && !options.headers) {
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    options as ConstructorParameters<typeof NextRequest>[1],
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("User Command Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. instanceId on command routes (Blocker #1 fix)
  // -------------------------------------------------------------------------

  describe("instanceId on command routes (Blocker #1 fix)", () => {
    const mockRunCommand = vi.fn().mockResolvedValue({
      success: true,
      result: { id: "user-001" },
      emittedEvents: [],
    });

    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      mockRunCommand.mockClear();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as any);
    });

    const instanceScopedVerbs = [
      { verb: "update", file: "update", idField: "id" },
      { verb: "deactivate", file: "deactivate", idField: "userId" },
      { verb: "terminate", file: "terminate", idField: "userId" },
      { verb: "updateRole", file: "update-role", idField: "userId" },
    ];

    for (const { verb, file, idField } of instanceScopedVerbs) {
      it(`${verb} route passes instanceId to runCommand`, async () => {
        const mod = await import(`@/app/api/user/${file}/route`);
        const request = createMockRequest(
          `http://localhost:3000/api/user/${file}`,
          {
            method: "POST",
            body: JSON.stringify({ [idField]: "user-001" }),
          },
        );

        await mod.POST(request);

        expect(mockRunCommand).toHaveBeenCalledWith(
          verb,
          expect.any(Object),
          expect.objectContaining({
            entityName: "User",
            instanceId: "user-001",
          }),
        );
      });
    }

    it("create route does NOT pass instanceId", async () => {
      const mod = await import("@/app/api/user/create/route");
      const request = createMockRequest(
        "http://localhost:3000/api/user/create",
        {
          method: "POST",
          body: JSON.stringify({
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
            role: "staff",
          }),
        },
      );

      await mod.POST(request);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.any(Object),
        expect.not.objectContaining({ instanceId: expect.anything() }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // 2. Command route authentication
  // -------------------------------------------------------------------------

  describe("command route authentication", () => {
    it("create route returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as any);

      const { POST } = await import("@/app/api/user/create/route");
      const request = createMockRequest(
        "http://localhost:3000/api/user/create",
      );
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("update route returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as any);

      const { POST } = await import("@/app/api/user/update/route");
      const request = createMockRequest(
        "http://localhost:3000/api/user/update",
      );
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("deactivate route returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as any);

      const { POST } = await import("@/app/api/user/deactivate/route");
      const request = createMockRequest(
        "http://localhost:3000/api/user/deactivate",
      );
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("terminate route returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as any);

      const { POST } = await import("@/app/api/user/terminate/route");
      const request = createMockRequest(
        "http://localhost:3000/api/user/terminate",
      );
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("update-role route returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as any);

      const { POST } = await import("@/app/api/user/update-role/route");
      const request = createMockRequest(
        "http://localhost:3000/api/user/update-role",
      );
      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Command route error handling
  // -------------------------------------------------------------------------

  describe("command route error handling", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      mockRunCommand.mockClear();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as any);
    });

    it("returns 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        guardFailure: { index: 0, formatted: "Email is required" },
      });

      const { POST } = await import("@/app/api/user/create/route");
      const request = createMockRequest(
        "http://localhost:3000/api/user/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(422);
    });

    it("returns 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        policyDenial: { policyName: "AdminOnly" },
      });

      const { POST } = await import("@/app/api/user/create/route");
      const request = createMockRequest(
        "http://localhost:3000/api/user/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it("returns 400 on generic command failure", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        error: "Something went wrong",
      });

      const { POST } = await import("@/app/api/user/create/route");
      const request = createMockRequest(
        "http://localhost:3000/api/user/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("returns 500 on unexpected exception", async () => {
      mockRunCommand.mockRejectedValueOnce(new Error("Unexpected error"));

      const { POST } = await import("@/app/api/user/create/route");
      const request = createMockRequest(
        "http://localhost:3000/api/user/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it("returns 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const { POST } = await import("@/app/api/user/create/route");
      const request = createMockRequest(
        "http://localhost:3000/api/user/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
