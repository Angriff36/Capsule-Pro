/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
  getTenantIdForOrg: vi.fn(),
}));

vi.mock("@/lib/manifest-command", () => ({
  runManifestCommand: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/manifest-client.generated", () => ({
  listAdminTasks: vi.fn(),
  listUsers: vi.fn(),
}));

import { listAdminTasks as queryAdminTasks } from "@/app/lib/manifest-client.generated";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import { updateAdminTaskStatus } from "../../app/(authenticated)/administrative/kanban/actions";

const runCommand = runManifestCommand as ReturnType<typeof vi.fn>;
const requireUser = requireCurrentUser as ReturnType<typeof vi.fn>;
const revalidate = revalidatePath as ReturnType<typeof vi.fn>;
const queryTasks = queryAdminTasks as ReturnType<typeof vi.fn>;

const TASK_ID = "task-1";
const TENANT_ID = "tenant-1";
const USER_ID = "user-1";

const form = (fields: Record<string, string>): FormData => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.set(k, v);
  }
  return fd;
};

const mockCurrentStatus = (status: string) =>
  queryTasks.mockResolvedValue({
    data: [{ id: TASK_ID, status }],
  });

describe("updateAdminTaskStatus server action — governance + state machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "admin",
    });
    mockCurrentStatus("backlog");
    runCommand.mockResolvedValue({
      ok: true,
      entity: "AdminTask",
      command: "startProgress",
      result: { id: TASK_ID },
    });
  });

  it("routes the status change through the governed command (constitution §9)", async () => {
    mockCurrentStatus("review");
    await updateAdminTaskStatus(
      form({ taskId: TASK_ID, status: "in_progress" })
    );

    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "AdminTask",
        command: "startProgress",
        instanceId: TASK_ID,
        user: { id: USER_ID, tenantId: TENANT_ID, role: "admin" },
      })
    );
    expect(revalidate).toHaveBeenCalledWith("/administrative/kanban");
    expect(revalidate).toHaveBeenCalledWith("/administrative/overview-boards");
  });

  it("maps each Kanban column 1:1 to the command that owns it", async () => {
    const cases: [string, string][] = [
      ["backlog", "moveToBacklog"],
      ["in_progress", "startProgress"],
      ["review", "submitForReview"],
      ["done", "complete"],
    ];
    for (const [status, command] of cases) {
      vi.clearAllMocks();
      requireUser.mockResolvedValue({
        id: USER_ID,
        tenantId: TENANT_ID,
        role: "admin",
      });
      mockCurrentStatus(status === "backlog" ? "review" : "backlog");
      runCommand.mockResolvedValue({
        ok: true,
        entity: "AdminTask",
        command,
        result: { id: TASK_ID },
      });

      await updateAdminTaskStatus(form({ taskId: TASK_ID, status }));

      expect(runCommand).toHaveBeenCalledWith(
        expect.objectContaining({ command })
      );
    }
  });

  it("short-circuits when the posted status matches the current column", async () => {
    mockCurrentStatus("backlog");
    await updateAdminTaskStatus(form({ taskId: TASK_ID, status: "backlog" }));
    expect(runCommand).not.toHaveBeenCalled();
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("surfaces a failed governed command", async () => {
    mockCurrentStatus("backlog");
    runCommand.mockResolvedValue({
      ok: false,
      kind: "policy_denied",
      message: "Not allowed",
    });
    await expect(
      updateAdminTaskStatus(form({ taskId: TASK_ID, status: "done" }))
    ).rejects.toThrow(/Not allowed/);
    expect(revalidate).not.toHaveBeenCalled();
  });
});
