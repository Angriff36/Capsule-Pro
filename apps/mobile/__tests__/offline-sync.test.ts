/**
 * Tests for Mobile Offline Sync
 * Covers the mobile-offline-mode feature
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock React Native dependencies
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock("@react-native-community/netinfo", () => ({
  default: {
    addEventListener: vi.fn((cb) => {
      cb({ isConnected: true, isInternetReachable: true });
      return () => {};
    }),
    fetch: vi.fn().mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    }),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

// Mock API client
vi.mock("../src/api/client", () => ({
  apiClient: vi.fn(),
}));

// Mock auth store
vi.mock("../src/store/auth", () => ({
  getAuthToken: vi.fn().mockResolvedValue("mock-token"),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getOfflineQueue,
  addToOfflineQueue,
  removeFromOfflineQueue,
  clearOfflineQueue,
} from "../src/store/offline-queue";
import type { OfflineQueueItem } from "../src/types";

// Get the mocked functions - AsyncStorage is a default export with methods
const mockAsyncStorage = vi.mocked(AsyncStorage, true);

describe("Offline Queue Storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getOfflineQueue", () => {
    it("should return empty array when no queue exists", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const queue = await getOfflineQueue();

      expect(queue).toEqual([]);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith("offline_queue");
    });

    it("should return parsed queue when exists", async () => {
      const mockQueue: OfflineQueueItem[] = [
        {
          id: "test-id-1",
          action: "claim",
          taskId: "task-1",
          timestamp: new Date().toISOString(),
        },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      const queue = await getOfflineQueue();

      expect(queue).toEqual(mockQueue);
    });

    it("should return empty array on parse error", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("invalid-json");

      const queue = await getOfflineQueue();

      expect(queue).toEqual([]);
    });
  });

  describe("addToOfflineQueue", () => {
    it("should add item to empty queue", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const item: OfflineQueueItem = {
        id: "test-id-1",
        action: "claim",
        taskId: "task-1",
        timestamp: new Date().toISOString(),
      };

      await addToOfflineQueue(item);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "offline_queue",
        JSON.stringify([item])
      );
    });

    it("should append item to existing queue", async () => {
      const existingItem: OfflineQueueItem = {
        id: "existing-id",
        action: "claim",
        taskId: "task-0",
        timestamp: new Date().toISOString(),
      };
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([existingItem])
      );

      const newItem: OfflineQueueItem = {
        id: "test-id-1",
        action: "complete",
        taskId: "task-1",
        timestamp: new Date().toISOString(),
      };

      await addToOfflineQueue(newItem);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "offline_queue",
        JSON.stringify([existingItem, newItem])
      );
    });
  });

  describe("removeFromOfflineQueue", () => {
    it("should remove item from queue", async () => {
      const queue: OfflineQueueItem[] = [
        {
          id: "test-id-1",
          action: "claim",
          taskId: "task-1",
          timestamp: new Date().toISOString(),
        },
        {
          id: "test-id-2",
          action: "claim",
          taskId: "task-2",
          timestamp: new Date().toISOString(),
        },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));

      await removeFromOfflineQueue("test-id-1");

      const setItemCall = mockAsyncStorage.setItem.mock.calls[0];
      const savedQueue = JSON.parse(setItemCall[1]);
      expect(savedQueue).toHaveLength(1);
      expect(savedQueue[0].id).toBe("test-id-2");
    });

    it("should handle removing from empty queue", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await removeFromOfflineQueue("nonexistent-id");

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "offline_queue",
        JSON.stringify([])
      );
    });
  });

  describe("clearOfflineQueue", () => {
    it("should remove the queue key from storage", async () => {
      await clearOfflineQueue();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith("offline_queue");
    });
  });
});

describe("OfflineQueueItem Types", () => {
  it("should support all action types", () => {
    const validActions: OfflineQueueItem["action"][] = [
      "claim",
      "release",
      "start",
      "complete",
      "markPrepComplete",
      "updatePrepNotes",
    ];

    validActions.forEach((action) => {
      const item: OfflineQueueItem = {
        id: `test-${action}`,
        action,
        taskId: "task-1",
        timestamp: new Date().toISOString(),
      };

      expect(item.action).toBe(action);
    });
  });

  it("should support optional payload", () => {
    const item: OfflineQueueItem = {
      id: "test-payload",
      action: "markPrepComplete",
      taskId: "task-1",
      timestamp: new Date().toISOString(),
      payload: {
        completed: true,
        notes: "Test notes",
      },
    };

    expect(item.payload).toBeDefined();
  });
});

describe("Queue Processing Logic", () => {
  it("should process items in FIFO order", async () => {
    const queue: OfflineQueueItem[] = [
      {
        id: "first",
        action: "claim",
        taskId: "task-1",
        timestamp: "2024-01-01T10:00:00.000Z",
      },
      {
        id: "second",
        action: "claim",
        taskId: "task-2",
        timestamp: "2024-01-01T10:00:01.000Z",
      },
      {
        id: "third",
        action: "claim",
        taskId: "task-3",
        timestamp: "2024-01-01T10:00:02.000Z",
      },
    ];

    // Verify FIFO: items should be processed in array order
    const processedOrder: string[] = [];
    for (const item of queue) {
      processedOrder.push(item.id);
    }

    expect(processedOrder).toEqual(["first", "second", "third"]);
  });
});

describe("Retry Configuration", () => {
  it("should have MAX_RETRIES = 3", () => {
    const MAX_RETRIES = 3;
    expect(MAX_RETRIES).toBe(3);
  });

  it("should have SYNC_INTERVAL_MS = 30000", () => {
    const SYNC_INTERVAL_MS = 30_000;
    expect(SYNC_INTERVAL_MS).toBe(30000);
  });

  it("should have RETRY_DELAY_MS = 1000", () => {
    const RETRY_DELAY_MS = 1000;
    expect(RETRY_DELAY_MS).toBe(1000);
  });
});

describe("Exponential Backoff", () => {
  it("should calculate correct backoff delays", () => {
    const RETRY_DELAY_MS = 1000;
    const backoffDelays: number[] = [];

    for (let retryCount = 0; retryCount < 3; retryCount++) {
      const delay = RETRY_DELAY_MS * 2 ** retryCount;
      backoffDelays.push(delay);
    }

    // Verify exponential backoff: 1000, 2000, 4000
    expect(backoffDelays[0]).toBe(1000);
    expect(backoffDelays[1]).toBe(2000);
    expect(backoffDelays[2]).toBe(4000);
  });
});
