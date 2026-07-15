/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan #7 — apps/app read waterfalls): the
 * training-module detail page awaited four independent-ish reads serially —
 * module, assignments, completions, employees — when the first two key only off
 * the route id/tenant, and the last two both depend on the assignments but not
 * on each other. Collapsing into two concurrent waves removes 2 serial
 * round-trips per page load (4 RT -> 2 RT).
 *
 * These tests pin the parallelization with a held-pending gate: the dependent
 * read must FIRE before the gating read RESOLVES. A serial revert
 * (`const a = await guard(); const b = await data();`) makes the data read block
 * on the guard, so the gate never sees it and vi.waitFor times out.
 *
 * JSX construction (createElement) does not invoke the child components, so the
 * page can be exercised through its data-fetch phase without rendering.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("../../app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    trainingModule: { findFirst: vi.fn() },
    trainingAssignment: { findMany: vi.fn() },
    trainingCompletion: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import TrainingModulePage from "../../app/(authenticated)/(tenant-team)/staff/training/[id]/page";
import { getTenantIdForOrg } from "../../app/lib/tenant";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantIdForOrg as ReturnType<typeof vi.fn>;
const moduleFindFirst = database.trainingModule.findFirst as ReturnType<
  typeof vi.fn
>;
const assignmentFindMany = database.trainingAssignment.findMany as ReturnType<
  typeof vi.fn
>;
const completionFindMany = database.trainingCompletion.findMany as ReturnType<
  typeof vi.fn
>;
const userFindMany = database.user.findMany as ReturnType<typeof vi.fn>;

const ORG_ID = "org-training";
const TENANT_ID = "tenant-training";
const MODULE_ID = "mod-1";
const ASSIGNMENT_ID = "asg-1";
const EMPLOYEE_ID = "emp-1";

const MODULE_ROW = {
  id: MODULE_ID,
  title: "Knife Skills",
  description: "Basics",
  contentUrl: "https://example.com/v",
  contentType: "video",
  durationMinutes: 30,
  category: "Kitchen",
  isRequired: true,
  isActive: true,
  createdAt: new Date("2026-07-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ orgId: ORG_ID });
  tenantMock.mockResolvedValue(TENANT_ID);
});

describe("training-module detail page — 2-wave read parallelization (plan #7)", () => {
  it("wave 1: assignments read fires before the module read resolves", async () => {
    // Hold the module read pending; the assignments read must still fire.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    moduleFindFirst.mockImplementation(() => gate.then(() => MODULE_ROW));
    assignmentFindMany.mockResolvedValue([]);
    completionFindMany.mockResolvedValue([]);
    userFindMany.mockResolvedValue([]);

    const promise = TrainingModulePage({
      params: Promise.resolve({ id: MODULE_ID }),
    } as never);

    // Serial: assignments never fire while module is pending -> timeout.
    await vi.waitFor(
      () => expect(assignmentFindMany).toHaveBeenCalledTimes(1),
      { timeout: 500 }
    );
    release();
    await promise; // wave 1 -> wave 2 (empty) -> JSX returned, ignored
  });

  it("wave 2: employees read fires before the completions read resolves", async () => {
    // Wave 1 resolves immediately (module + one assignment with an employee).
    moduleFindFirst.mockResolvedValue(MODULE_ROW);
    assignmentFindMany.mockResolvedValue([
      {
        id: ASSIGNMENT_ID,
        employeeId: EMPLOYEE_ID,
        status: "assigned",
        dueDate: null,
        assignedAt: new Date("2026-07-10"),
      },
    ]);

    // Hold the completions read pending; the employees read must still fire.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    completionFindMany.mockImplementation(() => gate.then(() => []));
    userFindMany.mockResolvedValue([
      { id: EMPLOYEE_ID, firstName: "Ada", lastName: "L", email: "a@x.io" },
    ]);

    const promise = TrainingModulePage({
      params: Promise.resolve({ id: MODULE_ID }),
    } as never);

    // Serial: employees never fire while completions is pending -> timeout.
    await vi.waitFor(() => expect(userFindMany).toHaveBeenCalledTimes(1), {
      timeout: 500,
    });
    release();
    await promise;
  });

  it("preserves the no-employees short-circuit: user.findMany is not called", async () => {
    moduleFindFirst.mockResolvedValue(MODULE_ROW);
    // Assignment with no employee -> employeeIds empty -> user query skipped.
    assignmentFindMany.mockResolvedValue([
      {
        id: ASSIGNMENT_ID,
        employeeId: null,
        status: "assigned",
        dueDate: null,
        assignedAt: new Date("2026-07-10"),
      },
    ]);
    completionFindMany.mockResolvedValue([]);
    userFindMany.mockResolvedValue([]);

    await TrainingModulePage({
      params: Promise.resolve({ id: MODULE_ID }),
    } as never);

    expect(userFindMany).not.toHaveBeenCalled();
    // completions still runs (in: [assignmentId]) even with a null-employee row.
    expect(completionFindMany).toHaveBeenCalledTimes(1);
  });
});
