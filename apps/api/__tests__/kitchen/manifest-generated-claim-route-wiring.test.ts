import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const getTenantIdForOrgMock = vi.fn();
const runCommandMock = vi.fn();
const createManifestRuntimeMock = vi.fn();

vi.mock("@repo/auth/server", () => ({
  auth: authMock,
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: getTenantIdForOrgMock,
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: createManifestRuntimeMock,
}));

describe("Generated PrepTask.claim route wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
    });
    getTenantIdForOrgMock.mockResolvedValue("tenant-1");
    createManifestRuntimeMock.mockResolvedValue({
      runCommand: runCommandMock,
    });
    runCommandMock.mockResolvedValue({
      success: true,
      result: { id: "task-123", status: "in_progress" },
      emittedEvents: [],
    });
  });

  it("imports route module and calls createManifestRuntime/runCommand(claim)", async () => {
    const routeModule = await import(
      "@/app/api/kitchen/prep-tasks/commands/claim/route"
    );

    const response = await routeModule.POST(
      new NextRequest(
        "http://localhost/api/kitchen/prep-tasks/commands/claim",
        {
          method: "POST",
          body: JSON.stringify({
            id: "task-123",
            userId: "user-1",
            stationId: "station-a",
          }),
        }
      )
    );
    const json = await response.json();

    expect(typeof routeModule.POST).toBe("function");
    expect(createManifestRuntimeMock).toHaveBeenCalledWith({
      user: { id: "user-1", tenantId: "tenant-1" },
    });
    expect(runCommandMock).toHaveBeenCalledWith(
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
      data: {
        result: { id: "task-123", status: "in_progress" },
      },
    });
  });
});
