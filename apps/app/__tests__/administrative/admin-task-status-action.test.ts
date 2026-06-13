/**
 * @vitest-environment node
 *
 * Why this test matters: it pins the Task 8.3 governance migration of the admin
 * kanban's `updateAdminTaskStatus`. Per constitution §3/§9 a governed status
 * change MUST run through the Manifest runtime (the command that OWNS the target
 * state), NOT a direct `prisma.adminTask.update`. The assertions fail if the
 * write ever regresses to a direct mutation, if the destination column stops
 * mapping 1:1 to its transition command, or if the no-op short-circuit (which
 * avoids the runtime's illegal no-op self-transition for an unchanged column)
 * is removed.
 *
 * It also encodes the AdminTask state machine reconciliation: the Kanban's four
 * columns (backlog/in_progress/review/done) each map to exactly one governed
 * command (moveToBacklog/startProgress/submitForReview/complete). The legacy
 * `todo` state is gone.
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

vi.mock("@repo/database", () => ({
  database: {
    adminTask: { update: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import { updateAdminTaskStatus } from "../../app/(authenticated)/administrative/kanban/actions";

const runCommand = runManifestCommand as ReturnType<typeof vi.fn>;
const requireUser = requireCurrentUser as ReturnType<typeof vi.fn>;
const revalidate = revalidatePath as ReturnType<typeof vi.fn>;
const findFirst = database.adminTask.findFirst as ReturnType<typeof vi.fn>;
const adminTaskUpdate = database.adminTask.update as ReturnType<typeof vi.fn>;

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

// Default: the task currently sits in `backlog`, so every target below is a real move.
const mockCurrentStatus = (status: string) =>
  findFirst.mockResolvedValue({ status });

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

  it("routes the status change through the governed command — no direct prisma write (constitution §9)", async () => {
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
    expect(adminTaskUpdate).not.toHaveBeenCalled();
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
      // current status is something OTHER than the target so it's a real move
      mockCurrentStatus(status === "backlog" ? "done" : "backlog");
      runCommand.mockResolvedValue({ ok: true });

      await updateAdminTaskStatus(form({ taskId: TASK_ID, status }));

      expect(runCommand).toHaveBeenCalledTimes(1);
      expect(runCommand.mock.calls[0][0]).toMatchObject({
        entity: "AdminTask",
        command,
        instanceId: TASK_ID,
      });
    }
  });

  it("short-circuits a no-op (target column equals current) without dispatching", async () => {
    mockCurrentStatus("review");
    await updateAdminTaskStatus(form({ taskId: TASK_ID, status: "review" }));

    expect(runCommand).not.toHaveBeenCalled();
    expect(adminTaskUpdate).not.toHaveBeenCalled();
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("rejects a status outside the closed Kanban enum BEFORE dispatching", async () => {
    await expect(
      updateAdminTaskStatus(form({ taskId: TASK_ID, status: "todo" }))
    ).rejects.toThrow(/Invalid status/);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("throws Task not found when the task is missing or deleted", async () => {
    findFirst.mockResolvedValue(null);
    await expect(
      updateAdminTaskStatus(form({ taskId: TASK_ID, status: "done" }))
    ).rejects.toThrow(/Task not found/);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("surfaces a failed governed command (e.g. illegal transition rejected by the runtime)", async () => {
    runCommand.mockResolvedValue({
      ok: false,
      kind: "guard_failed",
      message: "Can only complete from backlog, in_progress, or review",
    });
    await expect(
      updateAdminTaskStatus(form({ taskId: TASK_ID, status: "done" }))
    ).rejects.toThrow(/Can only complete/);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("requires taskId and status", async () => {
    await expect(
      updateAdminTaskStatus(form({ status: "done" }))
    ).rejects.toThrow(/Task ID is required/);
    await expect(
      updateAdminTaskStatus(form({ taskId: TASK_ID }))
    ).rejects.toThrow(/Status is required/);
    expect(runCommand).not.toHaveBeenCalled();
  });
});
