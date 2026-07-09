/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  runManifestCommand: vi.fn(),
  runManifestBatch: vi.fn(),
}));

vi.mock("@/lib/manifest-command", () => ({
  runManifestCommand: mocks.runManifestCommand,
}));

vi.mock("@/lib/manifest-batch", () => ({
  runManifestBatch: mocks.runManifestBatch,
}));

import { database } from "@repo/database";
import * as tenantModule from "../../../app/lib/tenant";
import { deleteDish } from "../../../app/(authenticated)/(operations)/kitchen/recipes/actions";

describe("deleteDish removeDrafts batching", () => {
  beforeEach(() => {
    vi.spyOn(tenantModule, "requireCurrentUser").mockResolvedValue({
      id: "user-1",
      tenantId: "tenant-1",
      role: "admin",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    });
    vi.spyOn(tenantModule, "requireTenantId").mockResolvedValue("tenant-1");
    vi.spyOn(database, "$queryRaw").mockResolvedValue([
      { id: "event-dish-1" },
      { id: "event-dish-2" },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends draft removals and dish archive as one atomic governed batch", async () => {
    mocks.runManifestBatch.mockRejectedValue(
      new Error("Operation 1 failed; the batch was rolled back")
    );

    await expect(deleteDish("dish-1", "removeDrafts")).rejects.toThrow();

    expect(mocks.runManifestBatch).toHaveBeenCalledWith({
      operations: [
        {
          entity: "EventDish",
          command: "remove",
          params: {
            id: "event-dish-1",
            reason: "Dish removed from catalog (draft events only)",
            userId: "user-1",
          },
        },
        {
          entity: "EventDish",
          command: "remove",
          params: {
            id: "event-dish-2",
            reason: "Dish removed from catalog (draft events only)",
            userId: "user-1",
          },
        },
        {
          entity: "Dish",
          command: "softDelete",
          params: {
            id: "dish-1",
            reason: "Deleted from recipe catalog",
            userId: "user-1",
          },
        },
      ],
    });
    expect(mocks.runManifestCommand).not.toHaveBeenCalled();
  });
});
