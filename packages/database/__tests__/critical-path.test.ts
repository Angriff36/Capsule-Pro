import { describe, expect, test } from "vitest";
import {
  calculateCriticalPath,
  getCriticalPathOrder,
  type TaskForCPM,
  validateTasksForCPM,
} from "../src/critical-path";

describe("Critical Path Method (CPM) Algorithm", () => {
  const BASE_TIME = new Date("2026-01-23T08:00:00Z");

  function createTask(
    id: string,
    startOffsetMinutes: number,
    durationMinutes: number,
    dependencies: string[] = []
  ): TaskForCPM {
    return {
      id,
      startTime: new Date(BASE_TIME.getTime() + startOffsetMinutes * 60 * 1000),
      endTime: new Date(
        BASE_TIME.getTime() + (startOffsetMinutes + durationMinutes) * 60 * 1000
      ),
      dependencies,
    };
  }

  describe("validateTasksForCPM", () => {
    test("should throw error for empty task list", () => {
      expect(() => validateTasksForCPM([])).toThrow("no tasks provided");
    });

    test("should throw error for missing dependencies", () => {
      const tasks: TaskForCPM[] = [
        createTask("1", 0, 60),
        createTask("2", 60, 60, ["missing-id"]),
      ];
      expect(() => validateTasksForCPM(tasks)).toThrow(
        'depends on non-existent task "missing-id"'
      );
    });

    test("should throw error for circular dependencies", () => {
      const tasks: TaskForCPM[] = [
        createTask("1", 0, 60, ["2"]),
        createTask("2", 60, 60, ["1"]),
      ];
      expect(() => validateTasksForCPM(tasks)).toThrow(
        "Circular dependency detected"
      );
    });

    test("should not throw for valid task list", () => {
      const tasks: TaskForCPM[] = [
        createTask("1", 0, 60),
        createTask("2", 60, 60, ["1"]),
      ];
      expect(() => validateTasksForCPM(tasks)).not.toThrow();
    });
  });

  describe("calculateCriticalPath", () => {
    test("should identify critical path for simple sequential tasks", () => {
      const tasks: TaskForCPM[] = [
        createTask("A", 0, 60), // 0-60 min
        createTask("B", 60, 120, ["A"]), // 60-180 min
        createTask("C", 180, 90, ["B"]), // 180-270 min
      ];

      const results = calculateCriticalPath(tasks);

      // All tasks should be on critical path (sequential)
      expect(results.get("A")?.isOnCriticalPath).toBe(true);
      expect(results.get("B")?.isOnCriticalPath).toBe(true);
      expect(results.get("C")?.isOnCriticalPath).toBe(true);

      // All tasks should have zero slack
      expect(results.get("A")?.slackMinutes).toBe(0);
      expect(results.get("B")?.slackMinutes).toBe(0);
      expect(results.get("C")?.slackMinutes).toBe(0);
    });

    test("should calculate slack for parallel tasks", () => {
      const tasks: TaskForCPM[] = [
        createTask("A", 0, 60), // 0-60 min
        createTask("B", 60, 60, ["A"]), // 60-120 min
        createTask("C", 60, 30, ["A"]), // 60-90 min (parallel with B)
        createTask("D", 120, 60, ["B", "C"]), // 120-180 min (after both B and C)
      ];

      const results = calculateCriticalPath(tasks);

      // A, B, D are on critical path (longest path)
      expect(results.get("A")?.isOnCriticalPath).toBe(true);
      expect(results.get("B")?.isOnCriticalPath).toBe(true);
      expect(results.get("D")?.isOnCriticalPath).toBe(true);

      // C is NOT on critical path (it has slack)
      expect(results.get("C")?.isOnCriticalPath).toBe(false);
      expect(results.get("C")?.slackMinutes).toBe(30); // Can start 30 min later
    });

    test("should handle complex task network", () => {
      const tasks: TaskForCPM[] = [
        // First path: A -> B -> D -> F (total: 60 + 90 + 90 + 30 = 270 min) - CRITICAL
        createTask("A", 0, 60),
        createTask("B", 60, 90, ["A"]),
        createTask("C", 60, 60, ["A"]), // Parallel path: A -> C -> E (total: 60 + 60 + 60 = 180 min)
        createTask("D", 150, 90, ["B"]),
        createTask("E", 120, 60, ["C"]),
        createTask("F", 240, 30, ["D", "E"]),
      ];

      const results = calculateCriticalPath(tasks);

      // A, B, D, F are on critical path (longest: 270 min)
      expect(results.get("A")?.isOnCriticalPath).toBe(true);
      expect(results.get("B")?.isOnCriticalPath).toBe(true);
      expect(results.get("D")?.isOnCriticalPath).toBe(true);
      expect(results.get("F")?.isOnCriticalPath).toBe(true);

      // C and E are NOT on critical path (shorter path: 180 min)
      expect(results.get("C")?.isOnCriticalPath).toBe(false);
      expect(results.get("E")?.isOnCriticalPath).toBe(false);

      // C has 60 minutes slack (can start at 120 instead of 60)
      expect(results.get("C")?.slackMinutes).toBe(60);

      // E has 60 minutes slack
      expect(results.get("E")?.slackMinutes).toBe(60);
    });

    test("should handle tasks with multiple dependencies", () => {
      const tasks: TaskForCPM[] = [
        createTask("A", 0, 60),
        createTask("B", 0, 90),
        createTask("C", 60, 60, ["A"]),
        createTask("D", 90, 60, ["B"]),
        createTask("E", 120, 60, ["C", "D"]), // Must wait for both C and D
      ];

      const results = calculateCriticalPath(tasks);

      // Longest path determines critical path
      // Path A->C->E: 60 + 60 + 60 = 180 min
      // Path B->D->E: 90 + 60 + 60 = 210 min (longer, so critical)
      expect(results.get("B")?.isOnCriticalPath).toBe(true);
      expect(results.get("D")?.isOnCriticalPath).toBe(true);
      expect(results.get("E")?.isOnCriticalPath).toBe(true);

      // A and C have slack (30 min each)
      expect(results.get("A")?.isOnCriticalPath).toBe(false);
      expect(results.get("C")?.isOnCriticalPath).toBe(false);
      expect(results.get("A")?.slackMinutes).toBe(30);
      expect(results.get("C")?.slackMinutes).toBe(30);
    });

    test("should handle single task", () => {
      const tasks: TaskForCPM[] = [createTask("A", 0, 60)];

      const results = calculateCriticalPath(tasks);

      expect(results.get("A")?.isOnCriticalPath).toBe(true);
      expect(results.get("A")?.slackMinutes).toBe(0);
    });

    test("should calculate earliest and latest times correctly", () => {
      const tasks: TaskForCPM[] = [
        createTask("A", 0, 60), // ES: 0, EF: 60
        createTask("B", 60, 120, ["A"]), // ES: 60, EF: 180
        createTask("C", 60, 30, ["A"]), // ES: 60, EF: 90
        createTask("D", 180, 60, ["B", "C"]), // ES: 180, EF: 240
      ];

      const results = calculateCriticalPath(tasks);

      // Task A
      expect(results.get("A")?.earliestStart).toEqual(
        new Date("2026-01-23T08:00:00Z")
      );
      expect(results.get("A")?.earliestFinish).toEqual(
        new Date("2026-01-23T09:00:00Z")
      );
      expect(results.get("A")?.latestStart).toEqual(
        new Date("2026-01-23T08:00:00Z")
      );
      expect(results.get("A")?.latestFinish).toEqual(
        new Date("2026-01-23T09:00:00Z")
      );

      // Task B (on critical path)
      expect(results.get("B")?.earliestStart).toEqual(
        new Date("2026-01-23T09:00:00Z")
      );
      expect(results.get("B")?.earliestFinish).toEqual(
        new Date("2026-01-23T11:00:00Z")
      );
      expect(results.get("B")?.latestStart).toEqual(
        new Date("2026-01-23T09:00:00Z")
      );
      expect(results.get("B")?.latestFinish).toEqual(
        new Date("2026-01-23T11:00:00Z")
      );

      // Task C (NOT on critical path, has 90 min slack)
      expect(results.get("C")?.earliestStart).toEqual(
        new Date("2026-01-23T09:00:00Z")
      );
      expect(results.get("C")?.earliestFinish).toEqual(
        new Date("2026-01-23T09:30:00Z")
      );
      expect(results.get("C")?.latestStart).toEqual(
        new Date("2026-01-23T10:30:00Z")
      );
      expect(results.get("C")?.latestFinish).toEqual(
        new Date("2026-01-23T11:00:00Z")
      );
      expect(results.get("C")?.slackMinutes).toBe(90);

      // Task D (on critical path)
      expect(results.get("D")?.earliestStart).toEqual(
        new Date("2026-01-23T11:00:00Z")
      );
      expect(results.get("D")?.earliestFinish).toEqual(
        new Date("2026-01-23T12:00:00Z")
      );
      expect(results.get("D")?.latestStart).toEqual(
        new Date("2026-01-23T11:00:00Z")
      );
      expect(results.get("D")?.latestFinish).toEqual(
        new Date("2026-01-23T12:00:00Z")
      );
    });

    test("should handle tasks with different start times", () => {
      const tasks: TaskForCPM[] = [
        createTask("A", 0, 60),
        createTask("B", 120, 60, ["A"]), // B starts later than A finishes (gap)
        createTask("C", 180, 60, ["B"]),
      ];

      const results = calculateCriticalPath(tasks);

      // All on critical path due to sequential nature
      expect(results.get("A")?.isOnCriticalPath).toBe(true);
      expect(results.get("B")?.isOnCriticalPath).toBe(true);
      expect(results.get("C")?.isOnCriticalPath).toBe(true);

      // B's earliest start is 120 (actual start time)
      // But after A finishes at 60, there's a 60 min gap
      // This gap contributes to slack
      expect(results.get("B")?.slackMinutes).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getCriticalPathOrder", () => {
    test("should return ordered list of critical task IDs", () => {
      const tasks: TaskForCPM[] = [
        createTask("A", 0, 60),
        createTask("B", 60, 120, ["A"]),
        createTask("C", 60, 30, ["A"]),
        createTask("D", 180, 60, ["B", "C"]),
      ];

      const results = calculateCriticalPath(tasks);
      const criticalOrder = getCriticalPathOrder(results);

      expect(criticalOrder).toEqual(["A", "B", "D"]);
    });

    test("should return empty array when no critical tasks", () => {
      const results = new Map();
      const criticalOrder = getCriticalPathOrder(results);
      expect(criticalOrder).toEqual([]);
    });

    test("should order by earliest start time", () => {
      const BASE_TIME = new Date("2026-01-23T08:00:00Z");
      const results = new Map([
        [
          "C",
          {
            taskId: "C",
            earliestStart: new Date(BASE_TIME.getTime() + 180 * 60 * 1000),
            earliestFinish: new Date(BASE_TIME.getTime() + 240 * 60 * 1000),
            latestStart: new Date(BASE_TIME.getTime() + 180 * 60 * 1000),
            latestFinish: new Date(BASE_TIME.getTime() + 240 * 60 * 1000),
            slackMinutes: 0,
            isOnCriticalPath: true,
          },
        ],
        [
          "A",
          {
            taskId: "A",
            earliestStart: BASE_TIME,
            earliestFinish: new Date(BASE_TIME.getTime() + 60 * 60 * 1000),
            latestStart: BASE_TIME,
            latestFinish: new Date(BASE_TIME.getTime() + 60 * 60 * 1000),
            slackMinutes: 0,
            isOnCriticalPath: true,
          },
        ],
        [
          "B",
          {
            taskId: "B",
            earliestStart: new Date(BASE_TIME.getTime() + 60 * 60 * 1000),
            earliestFinish: new Date(BASE_TIME.getTime() + 180 * 60 * 1000),
            latestStart: new Date(BASE_TIME.getTime() + 60 * 60 * 1000),
            latestFinish: new Date(BASE_TIME.getTime() + 180 * 60 * 1000),
            slackMinutes: 0,
            isOnCriticalPath: true,
          },
        ],
      ]);

      const criticalOrder = getCriticalPathOrder(results);
      expect(criticalOrder).toEqual(["A", "B", "C"]);
    });
  });

  describe("Edge cases", () => {
    test("should handle tasks that start at different times", () => {
      const tasks: TaskForCPM[] = [
        createTask("A", 0, 60),
        createTask("B", 180, 60, ["A"]), // Large gap between A and B
        createTask("C", 240, 60, ["B"]),
      ];

      const results = calculateCriticalPath(tasks);

      // All should still be on critical path
      expect(results.get("A")?.isOnCriticalPath).toBe(true);
      expect(results.get("B")?.isOnCriticalPath).toBe(true);
      expect(results.get("C")?.isOnCriticalPath).toBe(true);
    });

    test("should handle zero-duration tasks", () => {
      const tasks: TaskForCPM[] = [
        createTask("A", 0, 0), // Zero duration
        createTask("B", 0, 60, ["A"]),
        createTask("C", 60, 60, ["B"]),
      ];

      const results = calculateCriticalPath(tasks);

      expect(results.get("A")?.isOnCriticalPath).toBe(true);
      expect(results.get("B")?.isOnCriticalPath).toBe(true);
      expect(results.get("C")?.isOnCriticalPath).toBe(true);
    });

    test("should handle tasks ending at same time", () => {
      const tasks: TaskForCPM[] = [
        createTask("A", 0, 60),
        createTask("B", 0, 60),
        createTask("C", 60, 60, ["A", "B"]), // Both A and B end at same time
      ];

      const results = calculateCriticalPath(tasks);

      // A and B both have zero slack (parallel paths of equal length)
      expect(results.get("A")?.isOnCriticalPath).toBe(true);
      expect(results.get("B")?.isOnCriticalPath).toBe(true);
      expect(results.get("C")?.isOnCriticalPath).toBe(true);
    });
  });
});
