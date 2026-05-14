import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InvariantError } from "@/app/lib/invariant";

const mockRunCommand = vi.fn();
const createManifestRuntimeMock = vi.fn();
const mockRequireCurrentUser = vi.fn();

// Mock auth
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      orgId: "test-org",
      userId: "test-user-id",
    })
  ),
}));

// Mock tenant resolution
vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: mockRequireCurrentUser,
  getTenantIdForOrg: vi.fn(() => Promise.resolve("test-tenant")),
}));

// Mock manifest runtime
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: createManifestRuntimeMock,
}));

describe("Generated PrepTask.claim route wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCurrentUser.mockResolvedValue({
      id: "user-1",
      tenantId: "tenant-1",
      role: "admin",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    });
    createManifestRuntimeMock.mockResolvedValue({
      runCommand: mockRunCommand,
    });
    mockRunCommand.mockResolvedValue({
      success: true,
      result: { id: "task-123", status: "in_progress" },
      emittedEvents: [],
    });
  });

  it("imports route module and calls createManifestRuntime/runCommand(claim)", async () => {
    const routeModule = await import(
      "@/app/api/manifest/[entity]/commands/[command]/route"
    );

    const response = await routeModule.POST(
      new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            id: "task-123",
            userId: "user-1",
            stationId: "station-a",
          }),
        }
      ),
      { params: Promise.resolve({ entity: "PrepTask", command: "claim" }) }
    );
    const json = await response.json();

    expect(typeof routeModule.POST).toBe("function");
    expect(createManifestRuntimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          id: "user-1",
          tenantId: "tenant-1",
        }),
      })
    );
    expect(mockRunCommand).toHaveBeenCalledWith(
      "claim",
      {
        id: "task-123",
        userId: "user-1",
        stationId: "station-a",
      },
      { entityName: "PrepTask" }
    );
    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      result: { id: "task-123", status: "in_progress" },
    });
  });

  it("returns 401 when requireCurrentUser throws InvariantError", async () => {
    mockRequireCurrentUser.mockRejectedValue(new InvariantError("Unauthorized"));

    const routeModule = await import(
      "@/app/api/manifest/[entity]/commands/[command]/route"
    );

    const response = await routeModule.POST(
      new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            id: "task-123",
            userId: "user-1",
            stationId: "station-a",
          }),
        }
      ),
      { params: Promise.resolve({ entity: "PrepTask", command: "claim" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toMatchObject({
      success: false,
      message: "Unauthorized",
    });
  });
});