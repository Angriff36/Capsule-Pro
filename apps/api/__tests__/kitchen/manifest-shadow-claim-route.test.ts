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

describe("Shadow Claim Route - Generated Backup", () => {
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

  it("matches unauthorized behavior with the existing claim route", async () => {
    authMock.mockResolvedValue({
      orgId: null,
      userId: null,
    });

    const { POST: existingPOST } = await import(
      "@/app/api/kitchen/tasks/[id]/claim/route"
    );
    const { POST: shadowPOST } = await import(
      "@/app/api/kitchen/tasks/[id]/claim-shadow-manifest/route"
    );

    const existingRes = await existingPOST(
      new Request("http://localhost/api/kitchen/tasks/task-123/claim", {
        method: "POST",
        body: JSON.stringify({ stationId: "station-a" }),
      }),
      { params: Promise.resolve({ id: "task-123" }) }
    );
    const shadowRes = await shadowPOST(
      new NextRequest(
        "http://localhost/api/kitchen/tasks/task-123/claim-shadow-manifest",
        {
          method: "POST",
          body: JSON.stringify({ stationId: "station-a" }),
        }
      ),
      { params: Promise.resolve({ id: "task-123" }) }
    );

    const existingJson = await existingRes.json();
    const shadowJson = await shadowRes.json();

    expect(existingRes.status).toBe(401);
    expect(shadowRes.status).toBe(401);
    expect(existingJson).toMatchObject({
      success: false,
      message: "Unauthorized",
    });
    expect(shadowJson).toMatchObject({
      success: false,
      message: "Unauthorized",
    });
  });

  it("executes generated manifest command path with id injected from URL", async () => {
    const { POST } = await import(
      "@/app/api/kitchen/tasks/[id]/claim-shadow-manifest/route"
    );

    const response = await POST(
      new NextRequest(
        "http://localhost/api/kitchen/tasks/task-123/claim-shadow-manifest",
        {
          method: "POST",
          body: JSON.stringify({
            stationId: "station-a",
            userId: "spoofed-user",
          }),
        }
      ),
      { params: Promise.resolve({ id: "task-123" }) }
    );

    const json = await response.json();

    expect(createManifestRuntimeMock).toHaveBeenCalledWith({
      user: { id: "user-1", tenantId: "tenant-1" },
    });
    expect(runCommandMock).toHaveBeenCalledWith(
      "claim",
      expect.objectContaining({
        id: "task-123",
        stationId: "station-a",
        userId: "user-1",
      }),
      { entityName: "PrepTask" }
    );
    expect(runCommandMock).not.toHaveBeenCalledWith(
      "claim",
      expect.objectContaining({
        userId: "spoofed-user",
      }),
      expect.anything()
    );
    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      result: { id: "task-123", status: "in_progress" },
    });
  });

  it("wires generated route import to createManifestRuntime and runCommand", async () => {
    const routeModule = await import(
      "@/app/api/kitchen/tasks/[id]/claim-shadow-manifest/route"
    );

    const response = await routeModule.POST(
      new NextRequest(
        "http://localhost/api/kitchen/tasks/task-123/claim-shadow-manifest",
        {
          method: "POST",
          body: JSON.stringify({ stationId: "station-a" }),
        }
      ),
      { params: Promise.resolve({ id: "task-123" }) }
    );

    expect(typeof routeModule.POST).toBe("function");
    expect(createManifestRuntimeMock).toHaveBeenCalledTimes(1);
    expect(runCommandMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
  });

  it("ignores multiple spoofed identity fields from request body", async () => {
    const { POST } = await import(
      "@/app/api/kitchen/tasks/[id]/claim-shadow-manifest/route"
    );

    const response = await POST(
      new NextRequest(
        "http://localhost/api/kitchen/tasks/task-123/claim-shadow-manifest",
        {
          method: "POST",
          body: JSON.stringify({
            stationId: "station-a",
            userId: "spoofed-user",
            tenantId: "spoofed-tenant",
            orgId: "spoofed-org",
            user: { id: "spoofed-user-object", tenantId: "spoofed-tenant" },
          }),
        }
      ),
      { params: Promise.resolve({ id: "task-123" }) }
    );

    const json = await response.json();

    expect(createManifestRuntimeMock).toHaveBeenCalledWith({
      user: { id: "user-1", tenantId: "tenant-1" },
    });
    expect(runCommandMock).toHaveBeenCalledWith(
      "claim",
      expect.objectContaining({
        id: "task-123",
        stationId: "station-a",
        userId: "user-1",
      }),
      { entityName: "PrepTask" }
    );
    expect(runCommandMock).not.toHaveBeenCalledWith(
      "claim",
      expect.objectContaining({ userId: "spoofed-user" }),
      expect.anything()
    );
    expect(runCommandMock).not.toHaveBeenCalledWith(
      "claim",
      expect.objectContaining({ tenantId: "spoofed-tenant" }),
      expect.anything()
    );
    expect(runCommandMock).not.toHaveBeenCalledWith(
      "claim",
      expect.objectContaining({ orgId: "spoofed-org" }),
      expect.anything()
    );
    expect(runCommandMock).not.toHaveBeenCalledWith(
      "claim",
      expect.objectContaining({
        user: { id: "spoofed-user-object", tenantId: "spoofed-tenant" },
      }),
      expect.anything()
    );

    const claimPayload = runCommandMock.mock.calls.at(-1)?.[1] as
      | Record<string, unknown>
      | undefined;
    expect(claimPayload).toBeDefined();
    expect(claimPayload).not.toHaveProperty("tenantId");
    expect(claimPayload).not.toHaveProperty("orgId");
    expect(claimPayload).not.toHaveProperty("user");

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      result: { id: "task-123", status: "in_progress" },
    });
  });

  it("returns guard failures as 422 like generated command handlers", async () => {
    runCommandMock.mockResolvedValue({
      success: false,
      guardFailure: {
        index: 2,
        formatted: 'self.status == "open"',
      },
      error: "Guard failed",
    });

    const { POST } = await import(
      "@/app/api/kitchen/tasks/[id]/claim-shadow-manifest/route"
    );

    const response = await POST(
      new NextRequest(
        "http://localhost/api/kitchen/tasks/task-123/claim-shadow-manifest",
        {
          method: "POST",
          body: JSON.stringify({ stationId: "station-a" }),
        }
      ),
      { params: Promise.resolve({ id: "task-123" }) }
    );

    const json = await response.json();
    expect(response.status).toBe(422);
    expect(json).toMatchObject({
      success: false,
      message: 'Guard 2 failed: self.status == "open"',
    });
  });
});
