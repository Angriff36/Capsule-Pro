/**
 * @vitest-environment node
 *
 * Pins KitchenTask.create to Manifest contract:
 * non-empty summary, real dueDate (not ""), priority 1–5 only.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
  requireTenantId: vi.fn(),
}));

vi.mock("@/lib/manifest-command", () => ({
  runManifestCommand: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    kitchenTask: { findFirst: vi.fn() },
  },
}));

import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import { createKitchenTask } from "../../app/(authenticated)/(operations)/kitchen/tasks/create-kitchen-task";

const runCommand = runManifestCommand as ReturnType<typeof vi.fn>;
const requireUser = requireCurrentUser as ReturnType<typeof vi.fn>;
const findFirst = database.kitchenTask.findFirst as ReturnType<typeof vi.fn>;
const revalidate = revalidatePath as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const TASK_ID = "task-1";
const DUE = "2026-07-15T18:00";

function formWith(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("createKitchenTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "admin",
    });
    runCommand.mockResolvedValue({ ok: true, result: { id: TASK_ID } });
    findFirst.mockResolvedValue({
      id: TASK_ID,
      title: "Chop onions",
      summary: "For tonight service",
      priority: 3,
      status: "pending",
    });
  });

  it("creates with valid summary, due date, and priority 1–5", async () => {
    const task = await createKitchenTask(
      formWith({
        title: "Chop onions",
        summary: "For tonight service",
        priority: "3",
        dueDate: DUE,
      })
    );

    expect(task.id).toBe(TASK_ID);
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "KitchenTask",
        command: "create",
        body: expect.objectContaining({
          title: "Chop onions",
          summary: "For tonight service",
          priority: 3,
          complexity: 5,
          tags: "",
          dueDate: expect.any(Date),
        }),
      })
    );
    const body = runCommand.mock.calls[0]?.[0]?.body as {
      dueDate: Date;
    };
    expect(body.dueDate).toBeInstanceOf(Date);
    expect(Number.isNaN(body.dueDate.getTime())).toBe(false);
    expect(revalidate).toHaveBeenCalledWith("/kitchen/tasks");
  });

  it("blocks blank summary before Manifest dispatch", async () => {
    await expect(
      createKitchenTask(
        formWith({
          title: "Chop onions",
          summary: "   ",
          priority: "3",
          dueDate: DUE,
        })
      )
    ).rejects.toThrow(/summary/i);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("blocks missing due date before Manifest dispatch", async () => {
    await expect(
      createKitchenTask(
        formWith({
          title: "Chop onions",
          summary: "Prep for service",
          priority: "2",
        })
      )
    ).rejects.toThrow(/due date/i);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("blocks priority 10 before Manifest dispatch", async () => {
    await expect(
      createKitchenTask(
        formWith({
          title: "Chop onions",
          summary: "Prep for service",
          priority: "10",
          dueDate: DUE,
        })
      )
    ).rejects.toThrow(/priority/i);
    expect(runCommand).not.toHaveBeenCalled();
  });
});
