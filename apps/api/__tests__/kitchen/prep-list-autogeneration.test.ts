/**
 * Prep List Auto-Generation Tests
 *
 * Tests for event-driven prep list generation functionality.
 * These functions live in @repo/manifest-runtime but we test
 * the contract by mocking the database and outbox layers.
 *
 * @vitest-environment node
 */

import { database } from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock @repo/realtime — the actual code uses createOutboxEvent, not database.outboxEvent.create
vi.mock("@repo/realtime", () => ({
  createOutboxEvent: vi.fn(),
}));

// Mock @sentry/node to avoid side effects
vi.mock("@sentry/node", () => ({
  captureException: vi.fn(),
}));

describe("Prep List Auto-Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("triggerPrepListAutoGeneration", () => {
    it("should create an outbox event for prep list generation", async () => {
      const { createOutboxEvent } = await import("@repo/realtime");
      vi.mocked(createOutboxEvent).mockResolvedValue({} as never);

      const { triggerPrepListAutoGeneration } = await import(
        "@repo/manifest-runtime/prep-list-autogeneration"
      );

      const input = {
        db: database,
        tenantId: "tenant-123",
        eventId: "event-456",
        eventTitle: "Test Event",
        guestCount: 100,
        batchMultiplier: 1.5,
        dietaryRestrictions: ["gluten-free"],
        userId: "user-789",
      };

      const result = await triggerPrepListAutoGeneration(input);

      expect(result.success).toBe(true);
      expect(createOutboxEvent).toHaveBeenCalledWith(
        database,
        expect.objectContaining({
          tenantId: "tenant-123",
          aggregateType: "Event",
          aggregateId: "event-456",
          eventType: "event.prep-list.requested",
          payload: expect.objectContaining({
            eventId: "event-456",
            eventTitle: "Test Event",
            guestCount: 100,
            batchMultiplier: 1.5,
            dietaryRestrictions: ["gluten-free"],
            requestedBy: "user-789",
            requestedAt: expect.any(String),
          }),
        })
      );
    });

    it("should handle errors gracefully", async () => {
      const { createOutboxEvent } = await import("@repo/realtime");
      vi.mocked(createOutboxEvent).mockRejectedValue(
        new Error("Database error")
      );

      const { triggerPrepListAutoGeneration } = await import(
        "@repo/manifest-runtime/prep-list-autogeneration"
      );

      const result = await triggerPrepListAutoGeneration({
        db: database,
        tenantId: "tenant-123",
        eventId: "event-456",
        eventTitle: "Test Event",
        guestCount: 100,
        userId: "user-789",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });

    it("should use default batch multiplier when not provided", async () => {
      const { createOutboxEvent } = await import("@repo/realtime");
      vi.mocked(createOutboxEvent).mockResolvedValue({} as never);

      const { triggerPrepListAutoGeneration } = await import(
        "@repo/manifest-runtime/prep-list-autogeneration"
      );

      await triggerPrepListAutoGeneration({
        db: database,
        tenantId: "tenant-123",
        eventId: "event-456",
        eventTitle: "Test Event",
        guestCount: 100,
        userId: "user-789",
      });

      expect(createOutboxEvent).toHaveBeenCalledWith(
        database,
        expect.objectContaining({
          payload: expect.objectContaining({
            batchMultiplier: 1,
          }),
        })
      );
    });
  });

  describe("processPendingPrepListGenerations", () => {
    it("should process pending prep list generation events", async () => {
      vi.mocked(database.outboxEvent.findMany).mockResolvedValue([
        {
          id: "outbox-1",
          tenantId: "tenant-123",
          aggregateType: "Event",
          aggregateId: "event-456",
          eventType: "event.prep-list.requested",
          payload: {
            eventId: "event-456",
            batchMultiplier: 1,
            dietaryRestrictions: [],
          },
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: null,
          error: null,
        },
      ] as never);

      vi.mocked(database.outboxEvent.update).mockResolvedValue({
        id: "outbox-1",
        tenantId: "tenant-123",
        aggregateType: "Event",
        aggregateId: "event-456",
        eventType: "event.prep-list.requested",
        payload: {},
        status: "published",
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
        error: null,
      } as never);

      const { processPendingPrepListGenerations } = await import(
        "@repo/manifest-runtime/prep-list-autogeneration"
      );

      const mockGenerateFn = vi.fn().mockResolvedValue({
        success: true,
        prepListId: "prep-list-789",
      });

      const result = await processPendingPrepListGenerations(
        database,
        mockGenerateFn
      );

      expect(result.processed).toBe(1);
      expect(result.errors).toBe(0);
      expect(mockGenerateFn).toHaveBeenCalledWith({
        eventId: "event-456",
        batchMultiplier: 1,
        dietaryRestrictions: [],
        saveToDatabase: true,
      });
      expect(database.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: "outbox-1" },
        data: {
          status: "published",
          publishedAt: expect.any(Date),
        },
      });
    });

    it("should handle processing errors", async () => {
      vi.mocked(database.outboxEvent.findMany).mockResolvedValue([
        {
          id: "outbox-1",
          tenantId: "tenant-123",
          aggregateType: "Event",
          aggregateId: "event-456",
          eventType: "event.prep-list.requested",
          payload: {
            eventId: "event-456",
          },
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: null,
          error: null,
        },
      ] as never);

      vi.mocked(database.outboxEvent.update).mockResolvedValue({
        id: "outbox-1",
        tenantId: "tenant-123",
        aggregateType: "Event",
        aggregateId: "event-456",
        eventType: "event.prep-list.requested",
        payload: {},
        status: "failed",
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        error: "Generation failed",
      } as never);

      const { processPendingPrepListGenerations } = await import(
        "@repo/manifest-runtime/prep-list-autogeneration"
      );

      const mockGenerateFn = vi.fn().mockResolvedValue({
        success: false,
        error: "Generation failed",
      });

      const result = await processPendingPrepListGenerations(
        database,
        mockGenerateFn
      );

      expect(result.processed).toBe(0);
      expect(result.errors).toBe(1);
      expect(database.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: "outbox-1" },
        data: {
          status: "failed",
          error: "Generation failed",
        },
      });
    });

    it("should process events in batches", async () => {
      const events = Array.from({ length: 15 }, (_, i) => ({
        id: `outbox-${i}`,
        tenantId: "tenant-123",
        aggregateType: "Event",
        aggregateId: `event-${i}`,
        eventType: "event.prep-list.requested",
        payload: { eventId: `event-${i}` },
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        error: null,
      }));

      // Return only first 10 (batch size)
      vi.mocked(database.outboxEvent.findMany).mockResolvedValue(
        events.slice(0, 10) as never
      );
      vi.mocked(database.outboxEvent.update).mockResolvedValue({
        id: "outbox-0",
        tenantId: "tenant-123",
        aggregateType: "Event",
        aggregateId: "event-0",
        eventType: "event.prep-list.requested",
        payload: {},
        status: "published",
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
        error: null,
      } as never);

      const { processPendingPrepListGenerations } = await import(
        "@repo/manifest-runtime/prep-list-autogeneration"
      );

      const mockGenerateFn = vi.fn().mockResolvedValue({
        success: true,
        prepListId: `prep-list-${Math.random()}`,
      });

      const result = await processPendingPrepListGenerations(
        database,
        mockGenerateFn
      );

      expect(result.processed).toBe(10);
      expect(database.outboxEvent.findMany).toHaveBeenCalledWith({
        where: {
          eventType: "event.prep-list.requested",
          status: "pending",
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 10,
      });
    });
  });

  describe("generatePrepListImmediately", () => {
    it("should generate prep list immediately without outbox", async () => {
      const { generatePrepListImmediately } = await import(
        "@repo/manifest-runtime/prep-list-autogeneration"
      );

      const mockGenerateFn = vi.fn().mockResolvedValue({
        success: true,
        prepListId: "prep-list-789",
      });

      const result = await generatePrepListImmediately(
        {
          tenantId: "tenant-123",
          eventId: "event-456",
          eventTitle: "Test Event",
          guestCount: 100,
          userId: "user-789",
        },
        mockGenerateFn
      );

      expect(result.success).toBe(true);
      expect(result.prepListId).toBe("prep-list-789");
      expect(mockGenerateFn).toHaveBeenCalledWith({
        eventId: "event-456",
        batchMultiplier: 1,
        dietaryRestrictions: [],
        saveToDatabase: true,
      });
    });

    it("should handle generation errors", async () => {
      const { generatePrepListImmediately } = await import(
        "@repo/manifest-runtime/prep-list-autogeneration"
      );

      const mockGenerateFn = vi
        .fn()
        .mockRejectedValue(new Error("Generation error"));

      const result = await generatePrepListImmediately(
        {
          tenantId: "tenant-123",
          eventId: "event-456",
          eventTitle: "Test Event",
          guestCount: 100,
          userId: "user-789",
        },
        mockGenerateFn
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Generation error");
    });
  });
});
