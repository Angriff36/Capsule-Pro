/**
 * @vitest-environment node
 *
 * Why this test matters: it pins the Task 8.3 governance migration of the admin
 * kanban's `createAdminTask`. Per constitution §3/§9 a governed mutation MUST run
 * through the Manifest runtime (`AdminTask.create`), NOT a direct
 * `prisma.adminTask.create`. The assertions fail if the write ever regresses to a
 * direct mutation, if the canonical command body drifts, or if the UI-level
 * pre-validation (title required, closed status/priority enums) stops gating the
 * dispatch.
 *
 * It also guards the root-cause fix that UNBLOCKED this migration: the governed
 * `AdminTask.create` previously did `mutate status = status`, which the runtime
 * re-validates as a state transition and rejects as a no-op self-transition
 * (e.g. backlog -> backlog is not in backlog's `to` list), so create failed for
 * every status that owns a transition rule. The fix lets `status` flow through the
 * command body as the initial state. These tests prove create dispatches for the
 * real kanban statuses (backlog/in_progress/review/done) without the action
 * re-introducing a direct write.
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

// createAdminTask no longer touches the database directly; the mock exists only so
// the module's top-level imports resolve (listAdminTasks/updateAdminTaskStatus use it).
vi.mock("@repo/database", () => ({
  database: {
    adminTask: { create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    user: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import { createAdminTask } from "../../app/(authenticated)/administrative/kanban/actions";

const runCommand = runManifestCommand as ReturnType<typeof vi.fn>;
const requireUser = requireCurrentUser as ReturnType<typeof vi.fn>;
const revalidate = revalidatePath as ReturnType<typeof vi.fn>;
const adminTaskCreate = database.adminTask.create as ReturnType<typeof vi.fn>;

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

const body = () => runCommand.mock.calls[0][0].body as Record<string, unknown>;

describe("createAdminTask server action — governance + spec enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "admin",
      email: "u@example.com",
      firstName: "U",
      lastName: "Ser",
    });
    runCommand.mockResolvedValue({
      ok: true,
      entity: "AdminTask",
      command: "create",
      result: { id: TASK_ID },
    });
  });

  it("routes the write through the governed AdminTask.create command (constitution §9)", async () => {
    await createAdminTask(form({ title: "Renew vendor insurance" }));
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "AdminTask",
        command: "create",
        user: { id: USER_ID, tenantId: TENANT_ID, role: "admin" },
      })
    );
    // Governed path only — no direct prisma write.
    expect(adminTaskCreate).not.toHaveBeenCalled();
    expect(revalidate).toHaveBeenCalledWith("/administrative/kanban");
    expect(revalidate).toHaveBeenCalledWith("/administrative/overview-boards");
  });

  it("sends the canonical command body; creator self-assigns and is the createdBy", async () => {
    await createAdminTask(
      form({
        title: "Audit payroll",
        description: "Q2 reconciliation",
        category: "payroll",
        status: "in_progress",
        priority: "high",
      })
    );
    expect(body()).toEqual({
      title: "Audit payroll",
      description: "Q2 reconciliation",
      category: "payroll",
      status: "in_progress",
      priority: "high",
      assignedTo: USER_ID,
      createdBy: USER_ID,
      dueDate: null,
    });
  });

  it("defaults status to backlog and priority to medium when omitted", async () => {
    await createAdminTask(form({ title: "Triage" }));
    expect(body()).toMatchObject({ status: "backlog", priority: "medium" });
  });

  it("dispatches for every real kanban status (the transition-self-loop fix)", async () => {
    for (const status of ["backlog", "in_progress", "review", "done"]) {
      runCommand.mockClear();
      await createAdminTask(form({ title: "T", status }));
      expect(runCommand).toHaveBeenCalledTimes(1);
      expect(body()).toMatchObject({ status });
    }
  });

  it("encodes dueDate as epoch-ms and null when absent", async () => {
    await createAdminTask(form({ title: "Deadline", dueDate: "2026-07-01" }));
    expect(typeof body().dueDate).toBe("number");
    expect(body().dueDate).toBe(new Date("2026-07-01").getTime());

    runCommand.mockClear();
    await createAdminTask(form({ title: "No deadline" }));
    expect(body().dueDate).toBeNull();
  });

  it("rejects an empty title BEFORE dispatching", async () => {
    await expect(createAdminTask(form({ title: "   " }))).rejects.toThrow(
      /Title is required/
    );
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("rejects a status outside the closed kanban enum BEFORE dispatching", async () => {
    await expect(
      createAdminTask(form({ title: "T", status: "archived" }))
    ).rejects.toThrow(/Invalid status/);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("rejects a priority outside the closed enum BEFORE dispatching", async () => {
    await expect(
      createAdminTask(form({ title: "T", priority: "urgent" }))
    ).rejects.toThrow(/Invalid priority/);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("surfaces a failed governed command", async () => {
    runCommand.mockResolvedValue({
      ok: false,
      kind: "guard_failed",
      message: "Title is required",
    });
    await expect(createAdminTask(form({ title: "Boom" }))).rejects.toThrow(
      /Title is required/
    );
    expect(revalidate).not.toHaveBeenCalled();
  });
});
