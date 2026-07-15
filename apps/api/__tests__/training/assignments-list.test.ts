/**
 * GET /api/training/assignments — over-fetch `select` regression guard.
 *
 * The list read previously did a bare `include: { module: true }`, materializing
 * the FULL TrainingAssignment row (28 cols: waiver/attempt/score-review cluster)
 * AND the FULL TrainingModule row (22 cols: `notes` text, `code`, publish/archive
 * timestamps) per assignment, while the response map consumes only 11 assignment
 * scalars + 11 module fields. This pins the folded top-level `select`. Reverting
 * to `include`, or dropping a consumed field, fails this suite loudly.
 *
 * NOTE: the sibling `trainingCompletion.findMany` is intentionally NOT narrowed —
 * its map consumes all 12 of the model's scalar columns (incl. `assignmentId` for
 * the lookup Map), so there is nothing to drop.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    trainingAssignment: { findMany: vi.fn(), count: vi.fn() },
    user: { findMany: vi.fn() },
    trainingCompletion: { findMany: vi.fn() },
  },
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/training/assignments/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const ASSIGNMENT_SELECT_KEYS = [
  "assignedAt",
  "assignedBy",
  "assignedToAll",
  "createdAt",
  "dueDate",
  "employeeId",
  "id",
  "module",
  "moduleId",
  "status",
  "tenantId",
  "updatedAt",
];

const MODULE_SELECT_KEYS = [
  "category",
  "contentUrl",
  "contentType",
  "createdAt",
  "createdBy",
  "description",
  "durationMinutes",
  "isActive",
  "isRequired",
  "title",
  "updatedAt",
];

// Heavy / unused columns that MUST be absent from the projection.
const DROPPED_ASSIGNMENT_COLUMNS = [
  "moduleCode",
  "moduleTitle",
  "waiverReason",
  "waiverApprovedBy",
  "attemptCount",
  "lastScorePercent",
  "passThresholdPercent",
  "maxAttempts",
  "managerReviewRequired",
  "reminderSentAt",
];
const DROPPED_MODULE_COLUMNS = [
  "id",
  "tenantId",
  "deletedAt",
  "code",
  "notes",
  "publishedAt",
  "archivedAt",
  "status",
  "version",
  "requiredRole",
];

const assignmentFixture = {
  id: "a1",
  tenantId: "t1",
  moduleId: "m1",
  employeeId: "u1",
  assignedToAll: false,
  assignedBy: "mgr1",
  dueDate: new Date("2026-08-01T00:00:00.000Z"),
  status: "assigned",
  assignedAt: new Date("2026-07-14T00:00:00.000Z"),
  createdAt: new Date("2026-07-14T08:00:00.000Z"),
  updatedAt: new Date("2026-07-14T09:00:00.000Z"),
  module: {
    title: "Safety 101",
    contentType: "video",
    description: "Core safety induction",
    contentUrl: "https://x/safety.mp4",
    durationMinutes: 30,
    category: "Safety",
    isRequired: true,
    isActive: true,
    createdBy: "mgr1",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-10T00:00:00.000Z"),
  },
};

const completionFixture = {
  id: "c1",
  tenantId: "t1",
  employeeId: "u1",
  assignmentId: "a1",
  moduleId: "m1",
  startedAt: new Date("2026-07-14T10:00:00.000Z"),
  completedAt: new Date("2026-07-14T11:00:00.000Z"),
  score: 92,
  passed: true,
  notes: "First try",
  createdAt: new Date("2026-07-14T11:00:00.000Z"),
  updatedAt: new Date("2026-07-14T11:00:00.000Z"),
};

describe("GET /api/training/assignments (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    vi.mocked(database.trainingAssignment.findMany).mockResolvedValue(
      [] as never
    );
    vi.mocked(database.trainingAssignment.count).mockResolvedValue(0);
    vi.mocked(database.user.findMany).mockResolvedValue([] as never);
    vi.mocked(database.trainingCompletion.findMany).mockResolvedValue(
      [] as never
    );
  });

  it("projects only the consumed assignment + module columns (not full rows)", async () => {
    await GET(new Request("http://x/api/training/assignments?limit=20"));

    expect(database.trainingAssignment.findMany).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(database.trainingAssignment.findMany).mock
      .calls[0]?.[0] as {
      select?: Record<string, unknown>;
      include?: Record<string, unknown>;
    };

    // Folded into a top-level `select`, NOT a bare `include`.
    expect(arg.include).toBeUndefined();
    expect(arg.select).toBeDefined();
    expect(Object.keys(arg.select!).sort()).toEqual(
      [...ASSIGNMENT_SELECT_KEYS].sort()
    );

    for (const dropped of DROPPED_ASSIGNMENT_COLUMNS) {
      expect(arg.select![dropped]).toBeUndefined();
    }

    // The nested module relation projects only its 11 consumed fields.
    const moduleSelect = arg.select!.module as {
      select?: Record<string, unknown>;
    };
    expect(moduleSelect.select).toBeDefined();
    expect(Object.keys(moduleSelect.select!).sort()).toEqual(
      [...MODULE_SELECT_KEYS].sort()
    );
    for (const dropped of DROPPED_MODULE_COLUMNS) {
      expect(moduleSelect.select![dropped]).toBeUndefined();
    }
  });

  it("maps assignments into the response shape with employee + module + completion", async () => {
    vi.mocked(database.trainingAssignment.findMany).mockResolvedValue([
      assignmentFixture,
    ] as never);
    vi.mocked(database.trainingAssignment.count).mockResolvedValue(1);
    vi.mocked(database.user.findMany).mockResolvedValue([
      { id: "u1", firstName: "Jane", lastName: "Doe", email: "jane@x.com" },
    ] as never);
    vi.mocked(database.trainingCompletion.findMany).mockResolvedValue([
      completionFixture,
    ] as never);

    const res = await GET(
      new Request("http://x/api/training/assignments?limit=20")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.assignments).toHaveLength(1);
    const a = body.assignments[0];
    expect(a.id).toBe("a1");
    expect(a.status).toBe("assigned");
    expect(a.module_id).toBe("m1"); // response module.id sourced from assignment.moduleId
    expect(a.employee_first_name).toBe("Jane");
    expect(a.employee_email).toBe("jane@x.com");
    expect(a.module.title).toBe("Safety 101");
    expect(a.module.content_type).toBe("video");
    expect(a.module.duration_minutes).toBe(30);
    expect(a.module.is_required).toBe(true);
    expect(a.completion.score).toBe(92); // Decimal → Number
    expect(a.completion.passed).toBe(true);

    expect(body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(new Request("http://x/api/training/assignments"));
    expect(res.status).toBe(401);
    expect(database.trainingAssignment.findMany).not.toHaveBeenCalled();
  });
});
