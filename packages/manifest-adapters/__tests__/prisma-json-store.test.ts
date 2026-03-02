/**
 * Unit tests for PrismaJsonStore
 *
 * Tests the generic JSON-backed Prisma store for Manifest entities.
 * Covers:
 * - CRUD operations (create, read, update, delete)
 * - Tenant isolation enforcement
 * - Version-based optimistic concurrency control
 * - Error handling
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPrismaJsonStoreProvider,
  PrismaJsonStore,
} from "../src/prisma-json-store";

// Hoist mock functions for use in vi.mock factory
const mockManifestEntity = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
  manifestEntity: mockManifestEntity,
}));

vi.mock("@repo/database", () => ({
  Prisma: {
    InputJsonValue: {},
  },
}));

// Create inline mock for PrismaClient
interface MockPrismaClient {
  manifestEntity: typeof mockManifestEntity;
}

describe("PrismaJsonStore", () => {
  const tenantId = "tenant-11111111-1111-1111-1111-111111111111";
  const otherTenantId = "tenant-22222222-2222-2222-2222-222222222222";
  const entityType = "TestEntity";

  let store: PrismaJsonStore;
  let prisma: MockPrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = { manifestEntity: mockManifestEntity };
    store = new PrismaJsonStore({
      prisma: prisma as unknown as MockPrismaClient & {
        manifestEntity: typeof mockManifestEntity;
      },
      tenantId,
      entityType,
    } as Parameters<typeof PrismaJsonStore>[0]);
  });

  describe("getAll", () => {
    it("returns all entities for the current tenant and type", async () => {
      const mockRows = [
        {
          id: "entity-1",
          data: { name: "First", value: 10 },
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          tenantId,
          entityType,
        },
        {
          id: "entity-2",
          data: { name: "Second", value: 20 },
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          tenantId,
          entityType,
        },
      ];
      mockManifestEntity.findMany.mockResolvedValue(mockRows);

      const result = await store.getAll();

      expect(mockManifestEntity.findMany).toHaveBeenCalledWith({
        where: { tenantId, entityType },
        orderBy: { createdAt: "asc" },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: "First", value: 10, id: "entity-1" });
      expect(result[1]).toEqual({ name: "Second", value: 20, id: "entity-2" });
    });

    it("returns empty array when no entities exist", async () => {
      mockManifestEntity.findMany.mockResolvedValue([]);

      const result = await store.getAll();

      expect(result).toEqual([]);
    });

    it("propagates database errors", async () => {
      const error = new Error("Database connection failed");
      mockManifestEntity.findMany.mockRejectedValue(error);

      await expect(store.getAll()).rejects.toThrow(
        "Database connection failed"
      );
    });
  });

  describe("getById", () => {
    it("returns entity when found", async () => {
      const mockRow = {
        id: "entity-1",
        data: { name: "Test", value: 42 },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId,
        entityType,
      };
      mockManifestEntity.findUnique.mockResolvedValue(mockRow);

      const result = await store.getById("entity-1");

      expect(mockManifestEntity.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_entityType_id: { tenantId, entityType, id: "entity-1" },
        },
      });
      expect(result).toEqual({ name: "Test", value: 42, id: "entity-1" });
    });

    it("returns undefined when entity not found", async () => {
      mockManifestEntity.findUnique.mockResolvedValue(null);

      const result = await store.getById("nonexistent");

      expect(result).toBeUndefined();
    });

    it("propagates database errors", async () => {
      const error = new Error("Query failed");
      mockManifestEntity.findUnique.mockRejectedValue(error);

      await expect(store.getById("entity-1")).rejects.toThrow("Query failed");
    });
  });

  describe("create", () => {
    it("creates entity with provided data and version 1", async () => {
      const mockRow = {
        id: "entity-1",
        data: { id: "entity-1", name: "New Entity", value: 100 },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId,
        entityType,
      };
      mockManifestEntity.create.mockResolvedValue(mockRow);

      const result = await store.create({
        id: "entity-1",
        name: "New Entity",
        value: 100,
      });

      expect(mockManifestEntity.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          entityType,
          id: "entity-1",
          data: { id: "entity-1", name: "New Entity", value: 100 },
          version: 1,
        },
      });
      expect(result).toEqual({
        id: "entity-1",
        name: "New Entity",
        value: 100,
      });
    });

    it("throws error when id is missing", async () => {
      await expect(store.create({ name: "No ID" })).rejects.toThrow(
        "create() requires data.id"
      );
      expect(mockManifestEntity.create).not.toHaveBeenCalled();
    });

    it("propagates database errors", async () => {
      const error = new Error("Insert failed");
      mockManifestEntity.create.mockRejectedValue(error);

      await expect(store.create({ id: "entity-1" })).rejects.toThrow(
        "Insert failed"
      );
    });
  });

  describe("update", () => {
    it("updates entity with shallow merge and increments version", async () => {
      const existingRow = {
        id: "entity-1",
        data: { name: "Original", value: 10 },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId,
        entityType,
      };
      mockManifestEntity.findUnique.mockResolvedValue(existingRow);
      mockManifestEntity.updateMany.mockResolvedValue({ count: 1 });

      const result = await store.update("entity-1", {
        value: 20,
        extra: "added",
      });

      expect(mockManifestEntity.updateMany).toHaveBeenCalledWith({
        where: { tenantId, entityType, id: "entity-1", version: 1 },
        data: {
          data: { name: "Original", value: 20, extra: "added", id: "entity-1" },
          version: 2,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual({
        name: "Original",
        value: 20,
        extra: "added",
        id: "entity-1",
      });
    });

    it("returns undefined when entity not found", async () => {
      mockManifestEntity.findUnique.mockResolvedValue(null);

      const result = await store.update("nonexistent", { value: 20 });

      expect(result).toBeUndefined();
      expect(mockManifestEntity.updateMany).not.toHaveBeenCalled();
    });

    it("returns undefined on optimistic concurrency conflict (version mismatch)", async () => {
      const existingRow = {
        id: "entity-1",
        data: { name: "Original", value: 10 },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId,
        entityType,
      };
      mockManifestEntity.findUnique.mockResolvedValue(existingRow);
      // Simulate concurrent modification: updateMany returns 0 rows affected
      mockManifestEntity.updateMany.mockResolvedValue({ count: 0 });

      const result = await store.update("entity-1", { value: 20 });

      expect(result).toBeUndefined();
    });

    it("preserves existing fields not in update data", async () => {
      const existingRow = {
        id: "entity-1",
        data: { name: "Original", value: 10, nested: { a: 1 } },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId,
        entityType,
      };
      mockManifestEntity.findUnique.mockResolvedValue(existingRow);
      mockManifestEntity.updateMany.mockResolvedValue({ count: 1 });

      await store.update("entity-1", { value: 20 });

      expect(mockManifestEntity.updateMany).toHaveBeenCalledWith({
        where: { tenantId, entityType, id: "entity-1", version: 1 },
        data: {
          data: {
            name: "Original",
            value: 20,
            nested: { a: 1 },
            id: "entity-1",
          },
          version: 2,
          updatedAt: expect.any(Date),
        },
      });
    });

    it("propagates database errors", async () => {
      const error = new Error("Update failed");
      mockManifestEntity.findUnique.mockRejectedValue(error);

      await expect(store.update("entity-1", { value: 20 })).rejects.toThrow(
        "Update failed"
      );
    });
  });

  describe("delete", () => {
    it("returns true when entity is deleted", async () => {
      mockManifestEntity.delete.mockResolvedValue({ id: "entity-1" });

      const result = await store.delete("entity-1");

      expect(mockManifestEntity.delete).toHaveBeenCalledWith({
        where: {
          tenantId_entityType_id: { tenantId, entityType, id: "entity-1" },
        },
      });
      expect(result).toBe(true);
    });

    it("returns false when entity not found", async () => {
      const error = new Error("Record to delete does not exist");
      mockManifestEntity.delete.mockRejectedValue(error);

      const result = await store.delete("nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("clear", () => {
    it("deletes all entities of current type for tenant", async () => {
      mockManifestEntity.deleteMany.mockResolvedValue({ count: 5 });

      await store.clear();

      expect(mockManifestEntity.deleteMany).toHaveBeenCalledWith({
        where: { tenantId, entityType },
      });
    });

    it("propagates database errors", async () => {
      const error = new Error("Delete failed");
      mockManifestEntity.deleteMany.mockRejectedValue(error);

      await expect(store.clear()).rejects.toThrow("Delete failed");
    });
  });

  describe("tenant isolation", () => {
    it("getAll only returns entities for current tenant", async () => {
      // This is implicitly tested above, but let's be explicit
      mockManifestEntity.findMany.mockResolvedValue([]);

      await store.getAll();

      expect(mockManifestEntity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        })
      );
    });

    it("getById uses composite key with tenantId", async () => {
      mockManifestEntity.findUnique.mockResolvedValue(null);

      await store.getById("entity-1");

      expect(mockManifestEntity.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_entityType_id: { tenantId, entityType, id: "entity-1" },
        },
      });
    });

    it("create includes tenantId in data", async () => {
      const mockRow = {
        id: "entity-1",
        data: { id: "entity-1" },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId,
        entityType,
      };
      mockManifestEntity.create.mockResolvedValue(mockRow);

      await store.create({ id: "entity-1" });

      expect(mockManifestEntity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId }),
        })
      );
    });
  });

  describe("version-based optimistic concurrency", () => {
    it("first update succeeds with version 1 -> 2", async () => {
      const existingRow = {
        id: "entity-1",
        data: { name: "Original" },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId,
        entityType,
      };
      mockManifestEntity.findUnique.mockResolvedValue(existingRow);
      mockManifestEntity.updateMany.mockResolvedValue({ count: 1 });

      const result = await store.update("entity-1", { name: "Updated" });

      expect(mockManifestEntity.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 2 }),
        })
      );
      expect(result).toBeDefined();
    });

    it("second concurrent update fails (version changed)", async () => {
      // First call sees version 1
      const existingRow = {
        id: "entity-1",
        data: { name: "Original" },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId,
        entityType,
      };
      mockManifestEntity.findUnique.mockResolvedValue(existingRow);
      // But by the time updateMany runs, version is already 2 (another client updated)
      mockManifestEntity.updateMany.mockResolvedValue({ count: 0 });

      const result = await store.update("entity-1", { name: "Late Update" });

      expect(result).toBeUndefined();
    });
  });
});

describe("createPrismaJsonStoreProvider", () => {
  it("creates a function that returns PrismaJsonStore instances", () => {
    const mockPrisma = { manifestEntity: {} };
    const tenantId = "tenant-11111111-1111-1111-1111-111111111111";

    const provider = createPrismaJsonStoreProvider(
      mockPrisma as unknown as Parameters<
        typeof createPrismaJsonStoreProvider
      >[0],
      tenantId
    );

    const store = provider("SomeEntity");

    expect(store).toBeInstanceOf(PrismaJsonStore);
  });

  it("creates different stores for different entity types", () => {
    const mockPrisma = { manifestEntity: {} };
    const tenantId = "tenant-11111111-1111-1111-1111-111111111111";

    const provider = createPrismaJsonStoreProvider(
      mockPrisma as unknown as Parameters<
        typeof createPrismaJsonStoreProvider
      >[0],
      tenantId
    );

    const store1 = provider("EntityA");
    const store2 = provider("EntityB");

    expect(store1).not.toBe(store2);
  });
});
