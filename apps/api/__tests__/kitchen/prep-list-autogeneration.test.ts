/**
 * Prep List Auto-Generation Tests
 *
 * Tests for event-driven prep list generation functionality.
 */

import { database, type OutboxStatus } from "@repo/database";
import {
  generatePrepListImmediately,
  type PrepListAutoGenerationInput,
  processPendingPrepListGenerations,
  triggerPrepListAutoGeneration,
} from "@repo/manifest-adapters";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the database
vi.mock("@repo/database", () => ({
  database: {
    outboxEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("Prep List Auto-Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("triggerPrepListAutoGeneration", () => {
    it("should create an outbox event for prep list generation", async () => {
      const mockCreate = vi.mocked(database.outboxEvent.create);
      mockCreate.mockResolvedValue({
        id: "outbox-123",
        tenantId: "tenant-123",
        aggregateType: "Event",
        aggregateId: "event-456",
        eventType: "event.prep-list.requested",
        payload: {},
        status: "pending",
        createdAt: new Date(),
        publishedAt: null,
        error: null,
      });

      const input: PrepListAutoGenerationInput = {
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
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          tenantId: "tenant-123",
          aggregateType: "Event",
          aggregateId: "event-456",
          eventType: "event.prep-list.requested",
          payload: {
            eventId: "event-456",
            eventTitle: "Test Event",
            guestCount: 100,
            batchMultiplier: 1.5,
            dietaryRestrictions: ["gluten-free"],
            requestedBy: "user-789",
            occurredAt: expect.any(String),
            requestedAt: expect.any(String),
          },
          status: "pending",
        },
      });
    });

    it("should handle errors gracefully", async () => {
      const mockCreate = vi.mocked(database.outboxEvent.create);
      mockCreate.mockRejectedValue(new Error("Database error"));

      const input: PrepListAutoGenerationInput = {
        db: database,
        tenantId: "tenant-123",
        eventId: "event-456",
        eventTitle: "Test Event",
        guestCount: 100,
        userId: "user-789",
      };

      const result = await triggerPrepListAutoGeneration(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });

    it("should use default batch multiplier when not provided", async () => {
      const mockCreate = vi.mocked(database.outboxEvent.create);
      mockCreate.mockResolvedValue({
        id: "outbox-123",
        tenantId: "tenant-123",
        aggregateType: "Event",
        aggregateId: "event-456",
        eventType: "event.prep-list.requested",
        payload: {},
        status: "pending",
        createdAt: new Date(),
        publishedAt: null,
        error: null,
      });

      const input: PrepListAutoGenerationInput = {
        db: database,
        tenantId: "tenant-123",
        eventId: "event-456",
        eventTitle: "Test Event",
        guestCount: 100,
        userId: "user-789",
      };

      await triggerPrepListAutoGeneration(input);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          payload: expect.objectContaining({
            batchMultiplier: 1,
          }),
        }),
      });
    });
  });

  describe("processPendingPrepListGenerations", () => {
    it("should process pending prep list generation events", async () => {
      const mockFindMany = vi.mocked(database.outboxEvent.findMany);
      const mockUpdate = vi.mocked(database.outboxEvent.update);

      mockFindMany.mockResolvedValue([
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
          publishedAt: null,
          error: null,
        },
      ]);

      mockUpdate.mockResolvedValue({
        id: "outbox-1",
        tenantId: "tenant-123",
        aggregateType: "Event",
        aggregateId: "event-456",
        eventType: "event.prep-list.requested",
        payload: {},
        status: "published",
        createdAt: new Date(),
        publishedAt: new Date(),
        error: null,
      });

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
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "outbox-1" },
        data: {
          status: "published",
          publishedAt: expect.any(Date),
        },
      });
    });

    it("should handle processing errors", async () => {
      const mockFindMany = vi.mocked(database.outboxEvent.findMany);
      const mockUpdate = vi.mocked(database.outboxEvent.update);

      mockFindMany.mockResolvedValue([
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
          publishedAt: null,
          error: null,
        },
      ]);

      mockUpdate.mockResolvedValue({
        id: "outbox-1",
        tenantId: "tenant-123",
        aggregateType: "Event",
        aggregateId: "event-456",
        eventType: "event.prep-list.requested",
        payload: {},
        status: "failed",
        createdAt: new Date(),
        publishedAt: null,
        error: "Generation failed",
      });

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
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "outbox-1" },
        data: {
          status: "failed",
          error: "Generation failed",
        },
      });
    });

    it("should process events in batches", async () => {
      const mockFindMany = vi.mocked(database.outboxEvent.findMany);
      const mockUpdate = vi.mocked(database.outboxEvent.update);

      // Return 15 events (more than the batch size of 10)
      const events = Array.from({ length: 15 }, (_, i) => ({
        id: `outbox-${i}`,
        tenantId: "tenant-123",
        aggregateType: "Event",
        aggregateId: `event-${i}`,
        eventType: "event.prep-list.requested",
        payload: { eventId: `event-${i}` },
        status: "pending" as OutboxStatus,
        createdAt: new Date(),
        publishedAt: null,
        error: null,
      }));

      mockFindMany.mockResolvedValue(events.slice(0, 10));
      mockUpdate.mockResolvedValue({
        id: "outbox-0",
        tenantId: "tenant-123",
        aggregateType: "Event",
        aggregateId: "event-0",
        eventType: "event.prep-list.requested",
        payload: {},
        status: "published",
        createdAt: new Date(),
        publishedAt: new Date(),
        error: null,
      });

      const mockGenerateFn = vi.fn().mockResolvedValue({
        success: true,
        prepListId: `prep-list-${Math.random()}`,
      });

      const result = await processPendingPrepListGenerations(
        database,
        mockGenerateFn
      );

      // Should process only 10 (batch size)
      expect(result.processed).toBe(10);
      expect(mockFindMany).toHaveBeenCalledWith({
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
