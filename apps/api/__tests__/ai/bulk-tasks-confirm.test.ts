/**
 * Tests for AI Bulk-Task Confirm — POST /api/ai/bulk-tasks/confirm
 *
 * Pins the #19 parallelization: the per-task governed writes (PrepTask.create
 * then PrepTask.updateDetails) used to run in a serial `for-of` — N tasks × 2
 * governed round-trips, one after another. Tasks are mutually independent
 * (each is keyed only on its own inputs + the shared event.locationId), so the
 * per-task work now runs concurrently via Promise.all. Within a task
 * updateDetails stays serial behind create (it needs the created id); across
 * tasks the round-trips race → N×2 serial writes collapse to ~2 waves. Task
 * order is preserved (Promise.all yields results in array order).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

const mockEventFindFirst = vi.fn();
const mockPrepTaskFindMany = vi.fn();

vi.mock("@repo/database", () => ({
  database: {
    event: { findFirst: (...args: unknown[]) => mockEventFindFirst(...args) },
    prepTask: { findMany: (...args: unknown[]) => mockPrepTaskFindMany(...args) },
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));

// createManifestRuntime is only referenced inside the runManifestCommandCore
// callback, which is fully mocked below — stub the import so the test never
// touches the real manifest runtime.
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { captureException } from "@sentry/nextjs";

import { POST } from "../../app/api/ai/bulk-tasks/confirm/route";

const mockAuth = vi.mocked(auth);
const mockGetTenantId = vi.mocked(getTenantIdForOrg);
const mockRequireUser = vi.mocked(requireCurrentUser);
const mockRunManifest = vi.mocked(runManifestCommandCore);
const mockCapture = vi.mocked(captureException);

const TENANT_ID = "tenant-1";
const ORG_ID = "org-1";
const USER_ID = "user-1";
const EVENT_ID = "evt-1";
const LOC_ID = "loc-1";

const FAR_FUTURE = "2099-01-15";

/** A valid task input (due date in the future → survives the past-date filter). */
function task(name: string) {
  return {
    name,
    dishId: null,
    dueByDate: FAR_FUTURE,
    dueByTime: "14:00",
    estimatedMinutes: 30,
    priority: 5,
    quantityTotal: 10,
    startByDate: FAR_FUTURE,
    taskType: "prep",
    notes: "",
  };
}

function postRequest(body: unknown) {
  return new Request("http://localhost/api/ai/bulk-tasks/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function seedAuthed() {
  mockAuth.mockResolvedValue({ orgId: ORG_ID } as never);
  mockGetTenantId.mockResolvedValue(TENANT_ID as never);
  mockRequireUser.mockResolvedValue({
    id: USER_ID,
    tenantId: TENANT_ID,
    role: "tenant_admin",
  } as never);
  mockEventFindFirst.mockResolvedValue({
    id: EVENT_ID,
    locationId: LOC_ID,
    deletedAt: null,
  } as never);
  mockPrepTaskFindMany.mockResolvedValue([] as never); // no existing duplicates
}

describe("POST /api/ai/bulk-tasks/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedAuthed();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 before any DB read or governed write when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ orgId: null } as never);

    const res = await POST(
      postRequest({ eventId: EVENT_ID, tasks: [task("A")] })
    );

    expect(res.status).toBe(401);
    expect(mockEventFindFirst).not.toHaveBeenCalled();
    expect(mockRunManifest).not.toHaveBeenCalled();
  });

  it("creates all tasks concurrently — N PrepTask.create calls in-flight at once, not one-at-a-time", async () => {
    // Discriminating mock: create calls stay pending (so we can observe how many
    // are in-flight simultaneously); updateDetails resolves immediately.
    let pendingCreates = 0;
    let maxConcurrentCreates = 0;
    const createResolvers: Array<(id: string) => void> = [];
    mockRunManifest.mockImplementation((_deps, params) => {
      if (params.command === "create") {
        pendingCreates += 1;
        maxConcurrentCreates = Math.max(maxConcurrentCreates, pendingCreates);
        return new Promise((resolve) => {
          createResolvers.push((id: string) => {
            pendingCreates -= 1;
            resolve({ ok: true, result: { id } } as never);
          });
        });
      }
      return Promise.resolve({ ok: true } as never);
    });

    const postPromise = POST(
      postRequest({
        eventId: EVENT_ID,
        tasks: [task("A"), task("B"), task("C")],
      })
    );
    // Drain microtasks so the route reaches the Promise.all over the 3 tasks.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // All 3 creates fired before ANY resolved — impossible in the old serial
    // layout (each awaited create + updateDetails before the next task).
    expect(maxConcurrentCreates).toBe(3);

    // Resolve each create with a distinct id, in task (push) order.
    createResolvers.forEach((resolve, i) => resolve(`task-id-${i}`));

    const res = await postPromise;
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.createdCount).toBe(3);
    // Promise.all preserves array order → createdIds in input order.
    expect(data.taskIds).toEqual(["task-id-0", "task-id-1", "task-id-2"]);
    expect(data.skippedCount).toBe(0);
  });

  it("keeps updateDetails serial behind create within a task (created id is threaded through)", async () => {
    mockRunManifest.mockImplementation((_deps, params) => {
      if (params.command === "create") {
        const name = params.body.name as string;
        return Promise.resolve({
          ok: true,
          result: { id: `id-${name}` },
        } as never);
      }
      return Promise.resolve({ ok: true } as never);
    });

    const res = await POST(
      postRequest({
        eventId: EVENT_ID,
        tasks: [task("Alpha"), task("Beta")],
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.createdCount).toBe(2);
    expect(data.taskIds).toEqual(["id-Alpha", "id-Beta"]);

    // 2 tasks × (1 create + 1 updateDetails) = 4 governed calls.
    expect(mockRunManifest).toHaveBeenCalledTimes(4);

    // Each updateDetails body carries the created id (proves the within-task
    // create→updateDetails dependency) + the shared event.locationId.
    const updateCalls = mockRunManifest.mock.calls.filter(
      ([, p]) => p.command === "updateDetails"
    );
    expect(updateCalls).toHaveLength(2);
    const updateIds = updateCalls.map(([, p]) => p.body.id);
    expect(updateIds).toEqual(expect.arrayContaining(["id-Alpha", "id-Beta"]));
    for (const [, p] of updateCalls) {
      expect(p.body.locationId).toBe(LOC_ID);
    }
  });

  it("skips a task whose create fails, reports it, and still creates the rest", async () => {
    mockRunManifest.mockImplementation((_deps, params) => {
      if (params.command === "create") {
        const name = params.body.name as string;
        if (name === "Beta") {
          return Promise.resolve({ ok: false, message: "rule rejected" } as never);
        }
        return Promise.resolve({
          ok: true,
          result: { id: `id-${name}` },
        } as never);
      }
      return Promise.resolve({ ok: true } as never);
    });

    const res = await POST(
      postRequest({
        eventId: EVENT_ID,
        tasks: [task("Alpha"), task("Beta"), task("Gamma")],
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    // Beta's create failed → only Alpha + Gamma created, in order.
    expect(data.createdCount).toBe(2);
    expect(data.taskIds).toEqual(["id-Alpha", "id-Gamma"]);
    // 3 inputs − 2 created = 1 skipped.
    expect(data.skippedCount).toBe(1);
    // The failed create was reported exactly once.
    expect(mockCapture).toHaveBeenCalledTimes(1);
    const reported = mockCapture.mock.calls[0]?.[0] as Error | undefined;
    expect(reported?.message).toContain("Beta");
  });

  it("short-circuits with createdCount 0 when every task duplicates an existing name", async () => {
    mockPrepTaskFindMany.mockResolvedValue([
      { name: "Alpha" },
      { name: "Beta" },
    ] as never);

    const res = await POST(
      postRequest({
        eventId: EVENT_ID,
        tasks: [task("Alpha"), task("Beta")],
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.createdCount).toBe(0);
    expect(data.taskIds).toEqual([]);
    expect(data.skippedCount).toBe(2);
    // No governed writes fire on the all-duplicates short-circuit.
    expect(mockRunManifest).not.toHaveBeenCalled();
  });
});
