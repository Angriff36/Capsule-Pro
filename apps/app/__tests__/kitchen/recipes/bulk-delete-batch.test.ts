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
  requireCurrentUser: vi.fn(),
  requireTenantId: vi.fn(),
}));

vi.mock("@/lib/manifest-command", () => ({
  runManifestCommand: mocks.runManifestCommand,
}));

vi.mock("@/lib/manifest-batch", () => ({
  runManifestBatch: mocks.runManifestBatch,
}));

vi.mock("../../../app/lib/tenant", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
  requireTenantId: mocks.requireTenantId,
}));

import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import {
  bulkDeleteDishes,
  bulkDeleteRecipes,
} from "../../../app/(authenticated)/(operations)/kitchen/recipes/actions";

const REASON = "Deleted from recipe catalog";

const currentUser = {
  id: "user-1",
  tenantId: "tenant-1",
  role: "admin",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
};

describe("bulk delete batching", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockResolvedValue(currentUser);
    mocks.requireTenantId.mockResolvedValue("tenant-1");
    mocks.runManifestBatch.mockResolvedValue({ ok: true, results: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe("bulkDeleteRecipes", () => {
    it("collapses N recipe softDeletes into ONE atomic governed batch", async () => {
      await bulkDeleteRecipes(["r-1", "r-2", "r-3"]);

      expect(mocks.runManifestBatch).toHaveBeenCalledTimes(1);
      expect(mocks.runManifestBatch).toHaveBeenCalledWith({
        operations: [
          {
            entity: "Recipe",
            command: "softDelete",
            params: { id: "r-1", reason: REASON, userId: "user-1" },
          },
          {
            entity: "Recipe",
            command: "softDelete",
            params: { id: "r-2", reason: REASON, userId: "user-1" },
          },
          {
            entity: "Recipe",
            command: "softDelete",
            params: { id: "r-3", reason: REASON, userId: "user-1" },
          },
        ],
      });
      expect(mocks.runManifestCommand).not.toHaveBeenCalled();
    });

    it("is a no-op (no batch, no command) on an empty selection", async () => {
      await bulkDeleteRecipes([]);

      expect(mocks.runManifestBatch).not.toHaveBeenCalled();
      expect(mocks.runManifestCommand).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/kitchen/recipes");
    });

    it("throws the batch message and deletes nothing when the batch fails", async () => {
      mocks.runManifestBatch.mockResolvedValueOnce({
        ok: false,
        message: "Operation 2 failed; the batch was rolled back",
      });

      await expect(bulkDeleteRecipes(["r-1", "r-2"])).rejects.toThrow(
        "Operation 2 failed; the batch was rolled back"
      );
      expect(mocks.runManifestBatch).toHaveBeenCalledTimes(1);
      expect(mocks.runManifestCommand).not.toHaveBeenCalled();
    });
  });

  describe("bulkDeleteDishes (preserve — the hot/default path)", () => {
    it("defaults to preserve and collapses N dish softDeletes into ONE batch", async () => {
      await bulkDeleteDishes(["d-1", "d-2"]);

      expect(mocks.runManifestBatch).toHaveBeenCalledTimes(1);
      expect(mocks.runManifestBatch).toHaveBeenCalledWith({
        operations: [
          {
            entity: "Dish",
            command: "softDelete",
            params: { id: "d-1", reason: REASON, userId: "user-1" },
          },
          {
            entity: "Dish",
            command: "softDelete",
            params: { id: "d-2", reason: REASON, userId: "user-1" },
          },
        ],
      });
      expect(mocks.runManifestCommand).not.toHaveBeenCalled();
    });

    it("explicit preserve is identical to the default", async () => {
      await bulkDeleteDishes(["d-1"], "preserve");

      expect(mocks.runManifestBatch).toHaveBeenCalledTimes(1);
      expect(mocks.runManifestBatch).toHaveBeenCalledWith({
        operations: [
          {
            entity: "Dish",
            command: "softDelete",
            params: { id: "d-1", reason: REASON, userId: "user-1" },
          },
        ],
      });
      expect(mocks.runManifestCommand).not.toHaveBeenCalled();
    });

    it("is a no-op on an empty selection", async () => {
      await bulkDeleteDishes([]);

      expect(mocks.runManifestBatch).not.toHaveBeenCalled();
      expect(mocks.runManifestCommand).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/kitchen/recipes");
    });

    it("throws the batch message when the batch fails", async () => {
      mocks.runManifestBatch.mockResolvedValueOnce({
        ok: false,
        message: "Operation 1 failed; the batch was rolled back",
      });

      await expect(bulkDeleteDishes(["d-1", "d-2"])).rejects.toThrow(
        "Operation 1 failed; the batch was rolled back"
      );
      expect(mocks.runManifestBatch).toHaveBeenCalledTimes(1);
      expect(mocks.runManifestCommand).not.toHaveBeenCalled();
    });
  });

  describe("bulkDeleteDishes (removeDrafts — cold path, kept per-dish)", () => {
    it("delegates to governedDeleteDish per dish — NOT one mega-batch", async () => {
      // Each dish's draft-event removal + delete is its own governed batch.
      vi.spyOn(database, "$queryRaw").mockResolvedValue([
        { id: "event-dish-x" },
      ]);

      await bulkDeleteDishes(["d-1", "d-2"], "removeDrafts");

      // 2 dishes → 2 separate governed batches (the per-dish loop is preserved).
      expect(mocks.runManifestBatch).toHaveBeenCalledTimes(2);
      expect(mocks.runManifestCommand).not.toHaveBeenCalled();
      // Each batch carries that dish's draft removal + its own softDelete.
      expect(mocks.runManifestBatch).toHaveBeenNthCalledWith(1, {
        operations: [
          {
            entity: "EventDish",
            command: "remove",
            params: {
              id: "event-dish-x",
              reason: "Dish removed from catalog (draft events only)",
              userId: "user-1",
            },
          },
          {
            entity: "Dish",
            command: "softDelete",
            params: { id: "d-1", reason: REASON, userId: "user-1" },
          },
        ],
      });
      expect(mocks.runManifestBatch).toHaveBeenNthCalledWith(2, {
        operations: [
          {
            entity: "EventDish",
            command: "remove",
            params: {
              id: "event-dish-x",
              reason: "Dish removed from catalog (draft events only)",
              userId: "user-1",
            },
          },
          {
            entity: "Dish",
            command: "softDelete",
            params: { id: "d-2", reason: REASON, userId: "user-1" },
          },
        ],
      });
    });
  });
});
