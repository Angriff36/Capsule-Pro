/**
 * Generated PrepTask.claim route wiring test
 *
 * Verifies that the manifest dispatcher route properly wires to
 * runManifestCommand for the PrepTask.claim command.
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
    override name = "InvariantError" as const;
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
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

const dispatch = (entity: string, command: string) => (req: NextRequest) =>
  manifestDispatch(req, { params: Promise.resolve({ entity, command }) });

const mockCurrentUser = {
  id: "user-1",
  tenantId: "tenant-1",
  role: "admin",
  email: "test@test.com",
  firstName: "Test",
  lastName: "User",
};

describe("Generated PrepTask.claim route wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(mockCurrentUser as never);
  });

  it("imports route module and calls runManifestCommand with entity/command from params", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          result: { id: "task-123", status: "in_progress" },
          events: [],
        }),
        { status: 200 }
      )
    );

    const response = await dispatch(
      "PrepTask",
      "claim"
    )(
      new NextRequest("http://localhost/api/manifest/PrepTask/commands/claim", {
        method: "POST",
        body: JSON.stringify({
          id: "task-123",
          userId: "user-1",
          stationId: "station-a",
        }),
      })
    );

    expect(typeof manifestDispatch).toBe("function");
    expect(runManifestCommand).toHaveBeenCalled();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.result).toEqual({ id: "task-123", status: "in_progress" });
  });
});
