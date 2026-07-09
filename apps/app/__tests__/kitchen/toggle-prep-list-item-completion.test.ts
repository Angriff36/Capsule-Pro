/**
 * @vitest-environment node
 *
 * Optimistic mobile completion must only stick after the composite route
 * succeeds; failures must revert. No client-supplied actor id.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { togglePrepListItemCompletion } from "../../app/(mobile-kitchen)/kitchen/mobile/prep-lists/toggle-prep-list-item-completion";

describe("togglePrepListItemCompletion", () => {
  const applyOptimistic = vi.fn();
  const revert = vi.fn(async () => undefined);
  const queueOffline = vi.fn();
  const setCompletion = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("incomplete → complete persists via composite and keeps optimistic state", async () => {
    setCompletion.mockResolvedValue({ ok: true });

    const result = await togglePrepListItemCompletion({
      prepListId: "list-1",
      itemId: "item-1",
      currentlyCompleted: false,
      isOnline: true,
      applyOptimistic,
      revert,
      queueOffline,
      setCompletion,
    });

    expect(result).toEqual({ ok: true, completed: true });
    expect(applyOptimistic).toHaveBeenCalledWith(true);
    expect(setCompletion).toHaveBeenCalledWith({
      prepListId: "list-1",
      itemId: "item-1",
      completed: true,
    });
    expect(setCompletion.mock.calls[0]?.[0]).not.toHaveProperty(
      "completedByUserId"
    );
    expect(revert).not.toHaveBeenCalled();
    expect(queueOffline).not.toHaveBeenCalled();
  });

  it("complete → incomplete persists via composite", async () => {
    setCompletion.mockResolvedValue({ ok: true });

    const result = await togglePrepListItemCompletion({
      prepListId: "list-1",
      itemId: "item-1",
      currentlyCompleted: true,
      isOnline: true,
      applyOptimistic,
      revert,
      queueOffline,
      setCompletion,
    });

    expect(result).toEqual({ ok: true, completed: false });
    expect(applyOptimistic).toHaveBeenCalledWith(false);
    expect(setCompletion).toHaveBeenCalledWith({
      prepListId: "list-1",
      itemId: "item-1",
      completed: false,
    });
    expect(revert).not.toHaveBeenCalled();
  });

  it("failed request reverts optimistic state", async () => {
    setCompletion.mockResolvedValue({
      ok: false,
      error: "Guard failed",
    });

    const result = await togglePrepListItemCompletion({
      prepListId: "list-1",
      itemId: "item-1",
      currentlyCompleted: false,
      isOnline: true,
      applyOptimistic,
      revert,
      queueOffline,
      setCompletion,
    });

    expect(result.ok).toBe(false);
    expect(applyOptimistic).toHaveBeenCalledWith(true);
    expect(revert).toHaveBeenCalledTimes(1);
  });

  it("queues offline without calling composite", async () => {
    const result = await togglePrepListItemCompletion({
      prepListId: "list-1",
      itemId: "item-1",
      currentlyCompleted: false,
      isOnline: false,
      applyOptimistic,
      revert,
      queueOffline,
      setCompletion,
    });

    expect(result).toEqual({
      ok: true,
      completed: true,
      queuedOffline: true,
    });
    expect(applyOptimistic).toHaveBeenCalledWith(true);
    expect(queueOffline).toHaveBeenCalledWith({
      itemId: "item-1",
      completed: true,
    });
    expect(setCompletion).not.toHaveBeenCalled();
    expect(revert).not.toHaveBeenCalled();
  });
});
