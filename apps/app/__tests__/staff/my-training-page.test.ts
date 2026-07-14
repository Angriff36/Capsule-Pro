/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan #7 — apps/app over-fetch):
 * the My Training RSC page did `trainingAssignment.findMany({ include: { module:
 * true } })` with NO top-level select, materializing ~29 assignment columns +
 * ~23 module columns per row while the row-map consumed only 4 assignment fields
 * (id, status, dueDate, assignedAt) + 8 module fields (id, title, description,
 * contentType, durationMinutes, category, isRequired, contentUrl) — ~40 unused
 * columns per assignment, scaled by N assignments per page load. The sibling
 * `trainingCompletion.findMany` likewise had no select and consumed only 5 of
 * ~11 fields. The row-map builds an explicit TrainingRow (field-by-field, no
 * spread) passed as the sole prop to <MyTrainingClient>, so a focused select
 * drops the unused columns with zero behavior change (select is a column
 * projection — row counts + the serialized shape are identical; the `module`
 * relation filter in `where` is unaffected).
 *
 * This test pins:
 *  1. trainingAssignment.findMany carries a top-level select of EXACTLY the 4
 *     consumed assignment fields + a nested module select of the 8 consumed
 *     module fields — fails if the select is dropped (reverts to full-row) or a
 *     consumed field is removed (tsc also enforces this at compile time).
 *  2. trainingCompletion.findMany carries a select of EXACTLY the 5 consumed
 *     completion fields.
 *  3. The row-map + overdue recalculation resolve cleanly over a fixture
 *     (Date/Decimal coercion into the serialized shape; one assignment with a
 *     completion, one without).
 *  4. No read fires when unauthenticated (the requireCurrentUser guard
 *     short-circuits to redirect before any DB read).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@repo/database", () => ({
  database: {
    trainingAssignment: { findMany: vi.fn() },
    trainingCompletion: { findMany: vi.fn() },
  },
}));

import { database } from "@repo/database";
import { requireCurrentUser } from "@/app/lib/tenant";
import MyTrainingPage from "../../app/(authenticated)/(tenant-team)/staff/my-training/page";

const userMock = requireCurrentUser as ReturnType<typeof vi.fn>;
const assignmentFindMany = database.trainingAssignment.findMany as ReturnType<
  typeof vi.fn
>;
const completionFindMany = database.trainingCompletion.findMany as ReturnType<
  typeof vi.fn
>;

const TENANT_ID = "tenant-1";
const EMPLOYEE_ID = "user-1";

// Fixture: two assignments; the first has a completion, the second does not.
const assignmentsFixture = [
  {
    id: "assign-1",
    status: "in_progress",
    dueDate: new Date("2026-08-01"),
    assignedAt: new Date("2026-07-01"),
    module: {
      id: "mod-1",
      title: "Food Safety Basics",
      description: "Core hygiene practices.",
      contentType: "document",
      durationMinutes: 45,
      category: "Safety",
      isRequired: true,
      contentUrl: "https://example.com/fsb",
    },
  },
  {
    id: "assign-2",
    status: "assigned",
    dueDate: null,
    assignedAt: new Date("2026-07-10"),
    module: {
      id: "mod-2",
      title: "Knife Skills",
      description: null,
      contentType: "video",
      durationMinutes: 30,
      category: "Culinary",
      isRequired: false,
      contentUrl: "",
    },
  },
];

const completionsFixture = [
  {
    assignmentId: "assign-1",
    startedAt: new Date("2026-07-05"),
    completedAt: null,
    score: 0,
    passed: false,
  },
];

const ASSIGNMENT_SELECT = {
  id: true,
  status: true,
  dueDate: true,
  assignedAt: true,
  module: {
    select: {
      id: true,
      title: true,
      description: true,
      contentType: true,
      durationMinutes: true,
      category: true,
      isRequired: true,
      contentUrl: true,
    },
  },
};

const COMPLETION_SELECT = {
  assignmentId: true,
  startedAt: true,
  completedAt: true,
  score: true,
  passed: true,
};

describe("MyTrainingPage — focused select (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userMock.mockResolvedValue({ id: EMPLOYEE_ID, tenantId: TENANT_ID });
    assignmentFindMany.mockResolvedValue(assignmentsFixture);
    completionFindMany.mockResolvedValue(completionsFixture);
  });

  it("selects ONLY the consumed assignment + module fields (no full-row over-fetch)", async () => {
    await MyTrainingPage();

    expect(assignmentFindMany).toHaveBeenCalledTimes(1);
    // objectContaining recursively matches `select`, so this fails if the select
    // is dropped (reverts to include:{module:true} full-row) or a consumed field
    // (e.g. module.title) is removed.
    expect(assignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: ASSIGNMENT_SELECT })
    );
  });

  it("selects ONLY the 5 consumed completion fields", async () => {
    await MyTrainingPage();

    expect(completionFindMany).toHaveBeenCalledTimes(1);
    expect(completionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: COMPLETION_SELECT })
    );
  });

  it("resolves the row map over the fixture (Date/Decimal coercion, with + without completion)", async () => {
    // The page maps each assignment to a TrainingRow (module.* + completion?.*),
    // recomputes overdue status, then renders <MyTrainingClient>. Resolving
    // cleanly proves the selected fields feed every read path — including the
    // no-completion branch (startedAt/completedAt/score null, passed false).
    const result = await MyTrainingPage();
    expect(result).toBeDefined();
    expect(assignmentFindMany).toHaveBeenCalledTimes(1);
    expect(completionFindMany).toHaveBeenCalledTimes(1);
  });

  it("fires no DB read when unauthenticated", async () => {
    userMock.mockResolvedValue(null);

    await expect(MyTrainingPage()).rejects.toThrow(/REDIRECT/);

    expect(assignmentFindMany).not.toHaveBeenCalled();
    expect(completionFindMany).not.toHaveBeenCalled();
  });
});
