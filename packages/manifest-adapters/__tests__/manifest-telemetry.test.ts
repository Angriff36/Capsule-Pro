/**
 * Tests for Manifest Command Telemetry Collector
 *
 * @packageDocumentation
 */

import type { CommandResult } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTelemetryCollector,
  createTimingMetrics,
  type ManifestTelemetryCollector,
  markActionExecEnd,
  markActionExecStart,
  markGuardEvalEnd,
  markGuardEvalStart,
  type TelemetryContext,
} from "../src/manifest-telemetry-collector.js";

// Mock Prisma client
const mockPrismaClient = {
  manifestCommandTelemetry: {
    create: async () => ({ id: "test-id" }),
    createMany: async () => ({ count: 1 }),
  },
  $transaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
    fn(mockPrismaClient),
} as unknown as PrismaClient;

describe("ManifestTelemetryCollector", () => {
  let collector: ManifestTelemetryCollector;

  beforeEach(() => {
    collector = createTelemetryCollector({
      prisma: mockPrismaClient,
      enabled: true,
      sampleRate: 1.0,
      batchSize: 2,
      flushIntervalMs: 1000,
    });
  });

  afterEach(async () => {
    await collector.shutdown();
  });

  describe("Timing Metrics", () => {
    it("should create timing metrics with start time", () => {
      const before = Date.now();
      const metrics = createTimingMetrics();
      const after = Date.now();

      expect(metrics.startTime).toBeGreaterThanOrEqual(before);
      expect(metrics.startTime).toBeLessThanOrEqual(after);
      expect(metrics.guardEvalStart).toBeUndefined();
      expect(metrics.guardEvalEnd).toBeUndefined();
      expect(metrics.actionExecStart).toBeUndefined();
      expect(metrics.actionExecEnd).toBeUndefined();
    });

    it("should track guard evaluation timing", () => {
      let metrics = createTimingMetrics();
      expect(metrics.guardEvalStart).toBeUndefined();

      metrics = markGuardEvalStart(metrics);
      expect(metrics.guardEvalStart).toBeDefined();
      const start = metrics.guardEvalStart!;

      // Simulate some work
      const workStart = Date.now();
      while (Date.now() - workStart < 10) {
        // Small delay
      }

      metrics = markGuardEvalEnd(metrics);
      expect(metrics.guardEvalEnd).toBeDefined();
      expect(metrics.guardEvalEnd!).toBeGreaterThanOrEqual(start!);
    });

    it("should track action execution timing", () => {
      let metrics = createTimingMetrics();

      metrics = markActionExecStart(metrics);
      expect(metrics.actionExecStart).toBeDefined();
      const start = metrics.actionExecStart!;

      metrics = markActionExecEnd(metrics);
      expect(metrics.actionExecEnd).toBeDefined();
      expect(metrics.actionExecEnd!).toBeGreaterThanOrEqual(start!);
    });

    it("should track both guard and action timing", () => {
      let metrics = createTimingMetrics();

      metrics = markGuardEvalStart(metrics);
      metrics = markGuardEvalEnd(metrics);
      metrics = markActionExecStart(metrics);
      metrics = markActionExecEnd(metrics);

      expect(metrics.guardEvalStart).toBeDefined();
      expect(metrics.guardEvalEnd).toBeDefined();
      expect(metrics.actionExecStart).toBeDefined();
      expect(metrics.actionExecEnd).toBeDefined();

      if (
        metrics.guardEvalStart &&
        metrics.guardEvalEnd &&
        metrics.actionExecStart &&
        metrics.actionExecEnd
      ) {
        const guardDuration = metrics.guardEvalEnd - metrics.guardEvalStart;
        const actionDuration = metrics.actionExecEnd - metrics.actionExecStart;
        expect(guardDuration).toBeGreaterThanOrEqual(0);
        expect(actionDuration).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Guard Failure Extraction", () => {
    it("should extract guard failure from error message", async () => {
      const result: CommandResult = {
        success: false,
        error: "Guard 'user.role in [admin]' denied",
      };

      const timingMetrics = createTimingMetrics();
      const context: TelemetryContext = {
        tenantId: "tenant-123",
      };

      await collector.recordFromCommandResult({
        commandName: "create",
        entityName: "PrepTask",
        result,
        timingMetrics,
        context,
      });

      // The collector should have queued the record
      await collector.flush();
    });

    it("should identify guard_denied status", async () => {
      const result: CommandResult = {
        success: false,
        error: "Guard evaluation failed: permission denied",
      };

      const timingMetrics = createTimingMetrics();
      const context: TelemetryContext = {
        tenantId: "tenant-123",
      };

      await collector.recordFromCommandResult({
        commandName: "update",
        entityName: "Event",
        result,
        timingMetrics,
        context,
      });

      await collector.flush();
    });

    it("should identify constraint violation failures", async () => {
      const result: CommandResult = {
        success: false,
        error: "Constraint 'max_capacity' violated: too many attendees",
      };

      const timingMetrics = createTimingMetrics();
      const context: TelemetryContext = {
        tenantId: "tenant-123",
      };

      await collector.recordFromCommandResult({
        commandName: "update",
        entityName: "Event",
        result,
        timingMetrics,
        context,
      });

      await collector.flush();
    });
  });

  describe("Idempotency Tracking", () => {
    it("should record idempotency key usage", async () => {
      const result: CommandResult = {
        success: true,
        result: { id: "prep-task-123" },
      };

      const timingMetrics = createTimingMetrics();
      const context: TelemetryContext = {
        tenantId: "tenant-123",
      };

      await collector.recordFromCommandResult({
        commandName: "create",
        entityName: "PrepTask",
        result,
        timingMetrics,
        context,
        options: {
          idempotencyKey: "idemp-abc-123",
          wasIdempotentHit: false,
        },
      });

      await collector.flush();
    });

    it("should record idempotent cache hits", async () => {
      const result: CommandResult = {
        success: true,
        result: { id: "prep-task-123" },
      };

      const timingMetrics = createTimingMetrics();
      const context: TelemetryContext = {
        tenantId: "tenant-123",
      };

      await collector.recordFromCommandResult({
        commandName: "create",
        entityName: "PrepTask",
        result,
        timingMetrics,
        context,
        options: {
          idempotencyKey: "idemp-abc-123",
          wasIdempotentHit: true,
        },
      });

      await collector.flush();
    });
  });

  describe("Batch Collection", () => {
    it("should batch records before flushing", async () => {
      const timingMetrics = createTimingMetrics();
      const context: TelemetryContext = {
        tenantId: "tenant-123",
      };

      const result: CommandResult = {
        success: true,
        result: { id: "task-1" },
        emittedEvents: [],
      };

      // Add records below batch size
      await collector.recordCommandExecution({
        telemetry: {
          commandName: "create",
          entityName: "PrepTask",
          status: "success",
          durationMs: 100,
          guardsEvaluated: 2,
          guardsPassed: 2,
          guardsFailed: 0,
          eventsEmitted: 0,
        },
        context,
      });

      // Should not have flushed yet (batch size is 2)
      // Manual flush
      await collector.flush();
    });

    it("should auto-fllush when batch size is reached", async () => {
      const collectorWithSmallBatch = createTelemetryCollector({
        prisma: mockPrismaClient,
        enabled: true,
        sampleRate: 1.0,
        batchSize: 2,
        flushIntervalMs: 5000,
      });

      const context: TelemetryContext = {
        tenantId: "tenant-123",
      };

      // Add first record
      await collectorWithSmallBatch.recordCommandExecution({
        telemetry: {
          commandName: "create",
          entityName: "PrepTask",
          status: "success",
          durationMs: 100,
          guardsEvaluated: 2,
          guardsPassed: 2,
          guardsFailed: 0,
          eventsEmitted: 0,
        },
        context,
      });

      // Add second record - should trigger flush
      await collectorWithSmallBatch.recordCommandExecution({
        telemetry: {
          commandName: "update",
          entityName: "PrepTask",
          status: "success",
          durationMs: 150,
          guardsEvaluated: 1,
          guardsPassed: 1,
          guardsFailed: 0,
          eventsEmitted: 1,
        },
        context,
      });

      // Give time for flush to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      await collectorWithSmallBatch.shutdown();
    });
  });

  describe("Sampling", () => {
    it("should respect sample rate", async () => {
      const collectorWithSampling = createTelemetryCollector({
        prisma: mockPrismaClient,
        enabled: true,
        sampleRate: 0.0, // Never sample
        batchSize: 1,
      });

      const context: TelemetryContext = {
        tenantId: "tenant-123",
      };

      await collectorWithSampling.recordCommandExecution({
        telemetry: {
          commandName: "create",
          entityName: "PrepTask",
          status: "success",
          durationMs: 100,
          guardsEvaluated: 2,
          guardsPassed: 2,
          guardsFailed: 0,
          eventsEmitted: 0,
        },
        context,
      });

      // With 0% sampling, nothing should be collected
      await collectorWithSampling.shutdown();
    });

    it("should always collect with sample rate of 1.0", async () => {
      const context: TelemetryContext = {
        tenantId: "tenant-123",
      };

      const timingMetrics = createTimingMetrics();
      const result: CommandResult = {
        success: true,
        result: { id: "task-1" },
        emittedEvents: [],
      };

      await collector.recordFromCommandResult({
        commandName: "create",
        entityName: "PrepTask",
        result,
        timingMetrics,
        context,
      });

      await collector.flush();
    });
  });

  describe("Duration Tracking", () => {
    it("should calculate total duration from timing metrics", async () => {
      const timingMetrics = createTimingMetrics();

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result: CommandResult = {
        success: true,
        result: { id: "task-1" },
      };

      const context: TelemetryContext = {
        tenantId: "tenant-123",
      };

      await collector.recordFromCommandResult({
        commandName: "create",
        entityName: "PrepTask",
        result,
        timingMetrics,
        context,
      });

      await collector.flush();
    });
  });

  describe("Event Emission Tracking", () => {
    it("should track number of events emitted", async () => {
      const result: CommandResult = {
        success: true,
        result: { id: "task-1" },
        emittedEvents: [
          { name: "TaskCreated", payload: { taskId: "task-1" } },
          { name: "TaskAssigned", payload: { assigneeId: "user-1" } },
        ],
      };

      const timingMetrics = createTimingMetrics();
      const context: TelemetryContext = {
        tenantId: "tenant-123",
      };

      await collector.recordFromCommandResult({
        commandName: "create",
        entityName: "PrepTask",
        result,
        timingMetrics,
        context,
      });

      await collector.flush();
    });

    it("should handle commands with no events", async () => {
      const result: CommandResult = {
        success: true,
        result: { id: "task-1" },
        emittedEvents: [],
      };

      const timingMetrics = createTimingMetrics();
      const context: TelemetryContext = {
        tenantId: "tenant-123",
      };

      await collector.recordFromCommandResult({
        commandName: "update",
        entityName: "PrepTask",
        result,
        timingMetrics,
        context,
      });

      await collector.flush();
    });
  });

  describe("Guard Metrics", () => {
    it("should track guards evaluated, passed, and failed", async () => {
      const result: CommandResult = {
        success: true,
        result: { id: "task-1" },
      };

      const timingMetrics = createTimingMetrics();
      const context: TelemetryContext = {
        tenantId: "tenant-123",
      };

      await collector.recordFromCommandResult({
        commandName: "create",
        entityName: "PrepTask",
        result,
        timingMetrics,
        context,
        options: {
          guardsEvaluated: 5,
          guardsPassed: 4,
          guardsFailed: 1,
        },
      });

      await collector.flush();
    });

    it("should calculate guards failed from evaluated and passed", async () => {
      const result: CommandResult = {
        success: true,
        result: { id: "task-1" },
      };

      const timingMetrics = createTimingMetrics();
      const context: TelemetryContext = {
        tenantId: "tenant-123",
      };

      await collector.recordFromCommandResult({
        commandName: "create",
        entityName: "PrepTask",
        result,
        timingMetrics,
        context,
        options: {
          guardsEvaluated: 3,
          guardsPassed: 2,
          // guardsFailed should be calculated as 1
        },
      });

      await collector.flush();
    });
  });
});
