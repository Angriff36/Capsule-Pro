/**
 * Unit tests for KitchenTaskPrismaStore claim handling.
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { KitchenTaskPrismaStore } from "../src/prisma-store";

const mockKitchenTask = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

const mockKitchenTaskClaim = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  Prisma: {
    Decimal: class Decimal {
      constructor(readonly value: number) {}
    },
    InputJsonValue: {},
  },
}));

describe("KitchenTaskPrismaStore", () => {
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const taskId = "22222222-2222-2222-2222-222222222222";
  const employeeId = "33333333-3333-3333-3333-333333333333";
  const claimId = "44444444-4444-4444-4444-444444444444";
  const now = new Date("2026-02-26T18:00:00.000Z");

  const baseTask = {
    tenantId,
    id: taskId,
    title: "Prep onions",
    summary: "Dice for service",
    status: "in_progress",
    priority: 5,
    complexity: 3,
    tags: ["prep", "veg"],
    dueDate: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  let store: KitchenTaskPrismaStore;

  beforeEach(() => {
    vi.clearAllMocks();

    store = new KitchenTaskPrismaStore(
      {
        kitchenTask: mockKitchenTask,
        kitchenTaskClaim: mockKitchenTaskClaim,
      } as never,
      tenantId
    );
  });

  it("persists a claim record and returns claimed fields when claimedBy is set", async () => {
    mockKitchenTask.findFirst.mockResolvedValue(baseTask);
    mockKitchenTask.update.mockResolvedValue(baseTask);
    mockKitchenTaskClaim.findFirst.mockResolvedValueOnce(null);
    mockKitchenTaskClaim.create.mockResolvedValue({
      tenantId,
      id: claimId,
      taskId,
      employeeId,
      claimedAt: now,
      releasedAt: null,
      releaseReason: null,
      createdAt: now,
      updatedAt: now,
    });
    mockKitchenTaskClaim.findMany.mockResolvedValue([
      {
        tenantId,
        id: claimId,
        taskId,
        employeeId,
        claimedAt: now,
        releasedAt: null,
        releaseReason: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await store.update(taskId, {
      status: "in_progress",
      claimedBy: employeeId,
      claimedAt: now.getTime(),
    });

    expect(mockKitchenTaskClaim.create).toHaveBeenCalledWith({
      data: {
        tenantId,
        taskId,
        employeeId,
        claimedAt: new Date(now.getTime()),
      },
    });
    expect(result).toMatchObject({
      id: taskId,
      claimedBy: employeeId,
      claimedAt: now.getTime(),
    });
  });
});
