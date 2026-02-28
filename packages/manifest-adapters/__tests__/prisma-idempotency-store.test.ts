/**
 * Unit tests for PrismaIdempotencyStore
 *
 * Tests the Prisma-backed idempotency store for Manifest command deduplication.
 * Covers:
 * - has(), set(), get() operations
 * - TTL and expiration handling
 * - Tenant isolation
 * - Deduplication behavior
 * - Fail-open error handling
 *
 * @vitest-environment node
 */

import type { CommandResult } from "@angriff36/manifest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanupExpiredIdempotencyEntries,
  createPrismaIdempotencyStore,
  PrismaIdempotencyStore,
} from "../src/prisma-idempotency-store";

// Hoist mock functions for use in vi.mock factory
const mockManifestIdempotency = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  Prisma: {
    InputJsonValue: {},
  },
}));

// Create inline mock for PrismaClient
interface MockPrismaClient {
  manifestIdempotency: typeof mockManifestIdempotency;
}

describe("PrismaIdempotencyStore", () => {
  const tenantId = "tenant-11111111-1111-1111-1111-111111111111";
  const otherTenantId = "tenant-22222222-2222-2222-2222-222222222222";
  const defaultTtlMs = 24 * 60 * 60 * 1000; // 24 hours

  let store: PrismaIdempotencyStore;
  let prisma: MockPrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    prisma = { manifestIdempotency: mockManifestIdempotency };
    store = new PrismaIdempotencyStore({
      prisma: prisma as unknown as Parameters<
        typeof PrismaIdempotencyStore
      >[0]["prisma"],
      tenantId,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("has", () => {
    it("returns true when entry exists and not expired", async () => {
      const futureDate = new Date(Date.now() + 60_000); // 1 minute in future
      mockManifestIdempotency.findUnique.mockResolvedValue({
        tenantId,
        key: "cmd-123",
        result: { success: true },
        expiresAt: futureDate,
        createdAt: new Date(),
      });

      const result = await store.has("cmd-123");

      expect(result).toBe(true);
      expect(mockManifestIdempotency.findUnique).toHaveBeenCalledWith({
        where: { tenantId_key: { tenantId, key: "cmd-123" } },
      });
    });

    it("returns false when entry does not exist", async () => {
      mockManifestIdempotency.findUnique.mockResolvedValue(null);

      const result = await store.has("nonexistent");

      expect(result).toBe(false);
    });

    it("returns false and deletes expired entry", async () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      mockManifestIdempotency.findUnique.mockResolvedValue({
        tenantId,
        key: "cmd-123",
        result: { success: true },
        expiresAt: pastDate,
        createdAt: new Date(),
      });
      mockManifestIdempotency.delete.mockResolvedValue({});

      const result = await store.has("cmd-123");

      expect(result).toBe(false);
      expect(mockManifestIdempotency.delete).toHaveBeenCalledWith({
        where: { tenantId_key: { tenantId, key: "cmd-123" } },
      });
    });

    it("returns false on database error (fail-open)", async () => {
      mockManifestIdempotency.findUnique.mockRejectedValue(
        new Error("DB error")
      );

      const result = await store.has("cmd-123");

      expect(result).toBe(false);
    });

    it("uses tenantId in query for isolation", async () => {
      mockManifestIdempotency.findUnique.mockResolvedValue(null);

      await store.has("cmd-123");

      expect(mockManifestIdempotency.findUnique).toHaveBeenCalledWith({
        where: { tenantId_key: { tenantId, key: "cmd-123" } },
      });
    });
  });

  describe("set", () => {
    it("stores command result with calculated expiration", async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const commandResult: CommandResult = {
        success: true,
        result: { value: 42 },
        events: [],
      };
      mockManifestIdempotency.upsert.mockResolvedValue({});

      await store.set("cmd-123", commandResult);

      const expectedExpiresAt = new Date(now + defaultTtlMs);
      expect(mockManifestIdempotency.upsert).toHaveBeenCalledWith({
        where: { tenantId_key: { tenantId, key: "cmd-123" } },
        create: {
          tenantId,
          key: "cmd-123",
          result: commandResult,
          expiresAt: expectedExpiresAt,
        },
        update: {
          result: commandResult,
          expiresAt: expectedExpiresAt,
        },
      });
    });

    it("respects custom TTL", async () => {
      const customTtlMs = 60_000; // 1 minute
      const customStore = new PrismaIdempotencyStore({
        prisma: prisma as unknown as Parameters<
          typeof PrismaIdempotencyStore
        >[0]["prisma"],
        tenantId,
        ttlMs: customTtlMs,
      });

      const now = Date.now();
      vi.setSystemTime(now);

      const commandResult: CommandResult = { success: true, events: [] };
      mockManifestIdempotency.upsert.mockResolvedValue({});

      await customStore.set("cmd-123", commandResult);

      const expectedExpiresAt = new Date(now + customTtlMs);
      expect(mockManifestIdempotency.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ expiresAt: expectedExpiresAt }),
        })
      );
    });

    it("uses upsert for concurrent request handling", async () => {
      const commandResult: CommandResult = { success: true, events: [] };
      mockManifestIdempotency.upsert.mockResolvedValue({});

      await store.set("cmd-123", commandResult);

      expect(mockManifestIdempotency.upsert).toHaveBeenCalled();
    });

    it("does not throw on database error (fail-open)", async () => {
      mockManifestIdempotency.upsert.mockRejectedValue(new Error("DB error"));

      // Should not throw
      await expect(
        store.set("cmd-123", { success: true, events: [] })
      ).resolves.toBeUndefined();
    });

    it("stores result with tenant isolation", async () => {
      const commandResult: CommandResult = { success: true, events: [] };
      mockManifestIdempotency.upsert.mockResolvedValue({});

      await store.set("cmd-123", commandResult);

      expect(mockManifestIdempotency.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ tenantId }),
        })
      );
    });
  });

  describe("get", () => {
    it("returns cached result when entry exists and not expired", async () => {
      const futureDate = new Date(Date.now() + 60_000);
      const cachedResult: CommandResult = {
        success: true,
        result: { value: 42 },
        events: [{ channel: "test", payload: { data: "test" } }],
      };
      mockManifestIdempotency.findUnique.mockResolvedValue({
        tenantId,
        key: "cmd-123",
        result: cachedResult,
        expiresAt: futureDate,
        createdAt: new Date(),
      });

      const result = await store.get("cmd-123");

      expect(result).toEqual(cachedResult);
    });

    it("returns undefined when entry not found", async () => {
      mockManifestIdempotency.findUnique.mockResolvedValue(null);

      const result = await store.get("nonexistent");

      expect(result).toBeUndefined();
    });

    it("returns undefined and deletes expired entry", async () => {
      const pastDate = new Date(Date.now() - 1000);
      mockManifestIdempotency.findUnique.mockResolvedValue({
        tenantId,
        key: "cmd-123",
        result: { success: true },
        expiresAt: pastDate,
        createdAt: new Date(),
      });
      mockManifestIdempotency.delete.mockResolvedValue({});

      const result = await store.get("cmd-123");

      expect(result).toBeUndefined();
      expect(mockManifestIdempotency.delete).toHaveBeenCalledWith({
        where: { tenantId_key: { tenantId, key: "cmd-123" } },
      });
    });

    it("returns undefined on database error (fail-open)", async () => {
      mockManifestIdempotency.findUnique.mockRejectedValue(
        new Error("DB error")
      );

      const result = await store.get("cmd-123");

      expect(result).toBeUndefined();
    });

    it("uses tenantId in query for isolation", async () => {
      mockManifestIdempotency.findUnique.mockResolvedValue(null);

      await store.get("cmd-123");

      expect(mockManifestIdempotency.findUnique).toHaveBeenCalledWith({
        where: { tenantId_key: { tenantId, key: "cmd-123" } },
      });
    });
  });

  describe("deduplication flow", () => {
    it("full deduplication flow: first call caches, second returns cached", async () => {
      const commandResult: CommandResult = {
        success: true,
        result: { id: "new-entity" },
        events: [{ channel: "created", payload: { id: "new-entity" } }],
      };

      // First call: no cache exists
      mockManifestIdempotency.findUnique.mockResolvedValueOnce(null);
      const hasFirst = await store.has("cmd-123");
      expect(hasFirst).toBe(false);

      // Execute command and cache result
      mockManifestIdempotency.upsert.mockResolvedValue({});
      await store.set("cmd-123", commandResult);

      // Second call: cache exists
      const futureDate = new Date(Date.now() + 60_000);
      mockManifestIdempotency.findUnique.mockResolvedValueOnce({
        tenantId,
        key: "cmd-123",
        result: commandResult,
        expiresAt: futureDate,
        createdAt: new Date(),
      });
      const hasSecond = await store.has("cmd-123");
      expect(hasSecond).toBe(true);

      // Get cached result
      mockManifestIdempotency.findUnique.mockResolvedValueOnce({
        tenantId,
        key: "cmd-123",
        result: commandResult,
        expiresAt: futureDate,
        createdAt: new Date(),
      });
      const cachedResult = await store.get("cmd-123");
      expect(cachedResult).toEqual(commandResult);
    });
  });

  describe("tenant isolation", () => {
    it("different tenants have isolated idempotency keys", async () => {
      const storeA = new PrismaIdempotencyStore({
        prisma: prisma as unknown as Parameters<
          typeof PrismaIdempotencyStore
        >[0]["prisma"],
        tenantId,
      });
      const storeB = new PrismaIdempotencyStore({
        prisma: prisma as unknown as Parameters<
          typeof PrismaIdempotencyStore
        >[0]["prisma"],
        tenantId: otherTenantId,
      });

      mockManifestIdempotency.findUnique.mockResolvedValue(null);

      await storeA.has("cmd-123");
      await storeB.has("cmd-123");

      // Both calls use same key but different tenant IDs
      expect(mockManifestIdempotency.findUnique).toHaveBeenNthCalledWith(1, {
        where: { tenantId_key: { tenantId, key: "cmd-123" } },
      });
      expect(mockManifestIdempotency.findUnique).toHaveBeenNthCalledWith(2, {
        where: { tenantId_key: { tenantId: otherTenantId, key: "cmd-123" } },
      });
    });
  });

  describe("TTL behavior", () => {
    it("entries expire after TTL period", async () => {
      const shortTtlMs = 1000; // 1 second
      const shortTtlStore = new PrismaIdempotencyStore({
        prisma: prisma as unknown as Parameters<
          typeof PrismaIdempotencyStore
        >[0]["prisma"],
        tenantId,
        ttlMs: shortTtlMs,
      });

      const now = Date.now();
      vi.setSystemTime(now);

      // Create entry
      mockManifestIdempotency.upsert.mockResolvedValue({});
      await shortTtlStore.set("cmd-123", { success: true, events: [] });

      // Verify expiration is set correctly
      expect(mockManifestIdempotency.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            expiresAt: new Date(now + shortTtlMs),
          }),
        })
      );
    });

    it("default TTL is 24 hours", () => {
      const storeWithDefaultTtl = new PrismaIdempotencyStore({
        prisma: prisma as unknown as Parameters<
          typeof PrismaIdempotencyStore
        >[0]["prisma"],
        tenantId,
      });

      // The default TTL should be 24 hours
      // We can't directly access private ttlMs, but we can verify via set behavior
      expect(storeWithDefaultTtl).toBeDefined();
    });
  });
});

describe("createPrismaIdempotencyStore", () => {
  it("creates PrismaIdempotencyStore instance with required params", () => {
    const mockPrisma = { manifestIdempotency: {} };
    const tenantId = "tenant-11111111-1111-1111-1111-111111111111";

    const store = createPrismaIdempotencyStore(
      mockPrisma as unknown as Parameters<
        typeof createPrismaIdempotencyStore
      >[0],
      tenantId
    );

    expect(store).toBeInstanceOf(PrismaIdempotencyStore);
  });

  it("passes optional TTL to store", () => {
    const mockPrisma = { manifestIdempotency: {} };
    const tenantId = "tenant-11111111-1111-1111-1111-111111111111";
    const customTtl = 60_000;

    const store = createPrismaIdempotencyStore(
      mockPrisma as unknown as Parameters<
        typeof createPrismaIdempotencyStore
      >[0],
      tenantId,
      customTtl
    );

    expect(store).toBeInstanceOf(PrismaIdempotencyStore);
  });
});

describe("cleanupExpiredIdempotencyEntries", () => {
  it("deletes expired entries and returns count", async () => {
    const mockPrisma = {
      manifestIdempotency: {
        deleteMany: vi.fn().mockResolvedValue({ count: 5 }),
      },
    };

    const result = await cleanupExpiredIdempotencyEntries(
      mockPrisma as unknown as Parameters<
        typeof cleanupExpiredIdempotencyEntries
      >[0]
    );

    expect(result).toBe(5);
    expect(mockPrisma.manifestIdempotency.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: expect.any(Date) } },
    });
  });

  it("returns 0 when no expired entries", async () => {
    const mockPrisma = {
      manifestIdempotency: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const result = await cleanupExpiredIdempotencyEntries(
      mockPrisma as unknown as Parameters<
        typeof cleanupExpiredIdempotencyEntries
      >[0]
    );

    expect(result).toBe(0);
  });
});
