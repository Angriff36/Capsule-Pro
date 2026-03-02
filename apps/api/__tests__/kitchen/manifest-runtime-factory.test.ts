/**
 * Tests for the shared manifest runtime factory.
 *
 * Verifies three critical behaviors:
 * 1. User role resolution occurs when role is missing from context
 * 2. Correct entity store provider is selected (PrismaStore vs PrismaJsonStore)
 * 3. Idempotency failureTtlMs config is forwarded into the idempotency store
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before imports
// ---------------------------------------------------------------------------

// Mock the IR loader so we don't need the actual IR file on disk.
vi.mock("@repo/manifest-adapters/runtime/loadManifests", () => ({
  loadPrecompiledIR: vi.fn(() => ({
    ir: {
      version: "1.0",
      provenance: { source: "test" },
      modules: [],
      entities: [],
      stores: [],
      events: [],
      commands: [],
      policies: [],
    },
    hash: "test-hash",
    files: [],
  })),
}));

// Capture PrismaStore constructor calls.
const prismaStoreConstructorSpy = vi.fn();
vi.mock("@repo/manifest-adapters/prisma-store", () => {
  class MockPrismaStore {
    constructor(config: unknown) {
      prismaStoreConstructorSpy(config);
    }
    getAll() {
      return Promise.resolve([]);
    }
    getById() {
      return Promise.resolve(undefined);
    }
    create() {
      return Promise.resolve({});
    }
    update() {
      return Promise.resolve(undefined);
    }
    // biome-ignore lint/performance/noDelete: test mock for Store interface
    delete() {
      return Promise.resolve(true);
    }
    clear() {
      return Promise.resolve();
    }
  }
  return {
    PrismaStore: MockPrismaStore,
    createPrismaOutboxWriter: vi.fn(
      () => async (_tx: unknown, _events: unknown[]) => {}
    ),
    createPrismaStoreProvider: vi.fn(),
  };
});

// Capture PrismaJsonStore constructor calls.
const prismaJsonStoreConstructorSpy = vi.fn();
vi.mock("@repo/manifest-adapters/prisma-json-store", () => {
  class MockPrismaJsonStore {
    constructor(config: unknown) {
      prismaJsonStoreConstructorSpy(config);
    }
    getAll() {
      return Promise.resolve([]);
    }
    getById() {
      return Promise.resolve(undefined);
    }
    create() {
      return Promise.resolve({});
    }
    update() {
      return Promise.resolve(undefined);
    }
    // biome-ignore lint/performance/noDelete: test mock for Store interface
    delete() {
      return Promise.resolve(true);
    }
    clear() {
      return Promise.resolve();
    }
  }
  return {
    PrismaJsonStore: MockPrismaJsonStore,
  };
});

// Capture PrismaIdempotencyStore constructor calls.
const idempotencyStoreConstructorSpy = vi.fn();
vi.mock("@repo/manifest-adapters/prisma-idempotency-store", () => {
  class MockPrismaIdempotencyStore {
    constructor(config: unknown) {
      idempotencyStoreConstructorSpy(config);
    }
    has() {
      return Promise.resolve(false);
    }
    get() {
      return Promise.resolve(undefined);
    }
    set() {
      return Promise.resolve();
    }
  }
  return {
    PrismaIdempotencyStore: MockPrismaIdempotencyStore,
  };
});

// Mock ManifestRuntimeEngine so we don't need the real runtime.
vi.mock("@repo/manifest-adapters/runtime-engine", () => {
  class MockManifestRuntimeEngine {
    ir: unknown;
    context: unknown;
    options: unknown;
    constructor(ir: unknown, context: unknown, options: unknown) {
      this.ir = ir;
      this.context = context;
      this.options = options;
    }
    runCommand() {
      return Promise.resolve({});
    }
    getInstance() {
      return Promise.resolve(undefined);
    }
    getCommands() {
      return [];
    }
  }
  return {
    ManifestRuntimeEngine: MockManifestRuntimeEngine,
  };
});

// ---------------------------------------------------------------------------
// Import the factory under test (after mocks are set up)
// ---------------------------------------------------------------------------

import type { CreateManifestRuntimeDeps } from "@repo/manifest-adapters/manifest-runtime-factory";
import { createManifestRuntime } from "@repo/manifest-adapters/manifest-runtime-factory";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFakePrisma(overrides?: { userFindFirst?: unknown }) {
  return {
    user: {
      findFirst: vi.fn().mockResolvedValue(overrides?.userFindFirst ?? null),
    },
    manifestIdempotency: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({});
    }),
  };
}

function makeDeps(
  prismaOverrides?: Parameters<typeof makeFakePrisma>[0],
  idempotency?: CreateManifestRuntimeDeps["idempotency"]
): CreateManifestRuntimeDeps {
  return {
    prisma: makeFakePrisma(
      prismaOverrides
    ) as unknown as CreateManifestRuntimeDeps["prisma"],
    log: { info: vi.fn(), error: vi.fn() },
    captureException: vi.fn(),
    telemetry: {
      onConstraintEvaluated: vi.fn(),
      onOverrideApplied: vi.fn(),
      onCommandExecuted: vi.fn(),
    },
    idempotency,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createManifestRuntime (shared factory)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // biome-ignore lint/performance/noDelete: env var cleanup requires delete
    delete process.env.NEXT_RUNTIME;
  });

  // -----------------------------------------------------------------------
  // 1. User role resolution
  // -----------------------------------------------------------------------
  describe("user role resolution", () => {
    it("resolves role from DB when role is missing", async () => {
      const deps = makeDeps({ userFindFirst: { role: "chef" } });

      const runtime = await createManifestRuntime(deps, {
        user: { id: "user-1", tenantId: "tenant-1" },
      });

      // The factory should have called prisma.user.findFirst to resolve the role
      const prisma = deps.prisma as unknown as {
        user: { findFirst: ReturnType<typeof vi.fn> };
      };
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: "user-1", tenantId: "tenant-1", deletedAt: null },
        select: { role: true },
      });

      // The runtime engine should have been created (non-null return)
      expect(runtime).toBeDefined();
    });

    it("skips DB lookup when role is already provided", async () => {
      const deps = makeDeps();

      await createManifestRuntime(deps, {
        user: { id: "user-1", tenantId: "tenant-1", role: "admin" },
      });

      const prisma = deps.prisma as unknown as {
        user: { findFirst: ReturnType<typeof vi.fn> };
      };
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it("proceeds with no role when DB returns null", async () => {
      const deps = makeDeps({ userFindFirst: null });

      const runtime = await createManifestRuntime(deps, {
        user: { id: "user-1", tenantId: "tenant-1" },
      });

      // Should still create a runtime even without a resolved role
      expect(runtime).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // 2. Entity store provider routing
  // -----------------------------------------------------------------------
  describe("store provider routing", () => {
    it("uses PrismaStore for entities with dedicated models", async () => {
      const deps = makeDeps();

      const runtime = await createManifestRuntime(deps, {
        user: { id: "user-1", tenantId: "tenant-1", role: "admin" },
      });

      prismaStoreConstructorSpy.mockClear();
      prismaJsonStoreConstructorSpy.mockClear();

      // The mock ManifestRuntimeEngine stores its constructor args.
      const engineOptions = (runtime as unknown as { options: unknown })
        .options as {
        storeProvider: (name: string) => unknown;
      };

      // Call with a dedicated-model entity
      engineOptions.storeProvider("PrepTask");
      expect(prismaStoreConstructorSpy).toHaveBeenCalledTimes(1);
      expect(prismaStoreConstructorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          entityName: "PrepTask",
          tenantId: "tenant-1",
        })
      );
      expect(prismaJsonStoreConstructorSpy).not.toHaveBeenCalled();
    });

    it("uses PrismaJsonStore for entities without dedicated models", async () => {
      const deps = makeDeps();

      const runtime = await createManifestRuntime(deps, {
        user: { id: "user-1", tenantId: "tenant-1", role: "admin" },
      });

      prismaStoreConstructorSpy.mockClear();
      prismaJsonStoreConstructorSpy.mockClear();

      const engineOptions = (runtime as unknown as { options: unknown })
        .options as {
        storeProvider: (name: string) => unknown;
      };

      // Call with an entity that has no dedicated model
      engineOptions.storeProvider("Event");
      expect(prismaJsonStoreConstructorSpy).toHaveBeenCalledTimes(1);
      expect(prismaJsonStoreConstructorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "tenant-1",
          entityType: "Event",
        })
      );
      expect(prismaStoreConstructorSpy).not.toHaveBeenCalled();
    });

    it("routes all 13 dedicated entities to PrismaStore", async () => {
      const dedicatedEntities = [
        "PrepTask",
        "Recipe",
        "RecipeVersion",
        "Ingredient",
        "RecipeIngredient",
        "Dish",
        "Menu",
        "MenuDish",
        "PrepList",
        "PrepListItem",
        "Station",
        "InventoryItem",
        "KitchenTask",
      ];

      const deps = makeDeps();
      const runtime = await createManifestRuntime(deps, {
        user: { id: "user-1", tenantId: "tenant-1", role: "admin" },
      });

      const engineOptions = (runtime as unknown as { options: unknown })
        .options as {
        storeProvider: (name: string) => unknown;
      };

      for (const entity of dedicatedEntities) {
        prismaStoreConstructorSpy.mockClear();
        engineOptions.storeProvider(entity);
        expect(prismaStoreConstructorSpy).toHaveBeenCalledTimes(1);
      }
    });
  });

  // -----------------------------------------------------------------------
  // 3. Idempotency config forwarding
  // -----------------------------------------------------------------------
  describe("idempotency config (Phase 2 type-only plumbing)", () => {
    it("does NOT forward failureTtlMs yet (type-only plumbing for Phase 2)", async () => {
      const deps = makeDeps(undefined, { failureTtlMs: 30_000 });

      await createManifestRuntime(deps, {
        user: { id: "user-1", tenantId: "tenant-1", role: "admin" },
      });

      // Phase 0c: failureTtlMs is accepted in the deps type but NOT mapped
      // into the PrismaIdempotencyStore constructor. The original apps/api
      // implementation never passed ttlMs, so we preserve that behavior.
      expect(idempotencyStoreConstructorSpy).toHaveBeenCalledTimes(1);
      const config = idempotencyStoreConstructorSpy.mock
        .calls[0]?.[0] as Record<string, unknown>;
      expect(config.tenantId).toBe("tenant-1");
      expect(config).not.toHaveProperty("ttlMs");
    });

    it("omits idempotency store entirely when deps.idempotency is not provided", async () => {
      const deps = makeDeps();

      await createManifestRuntime(deps, {
        user: { id: "user-1", tenantId: "tenant-1", role: "admin" },
      });

      // When deps.idempotency is undefined, no idempotency store is created
      expect(idempotencyStoreConstructorSpy).toHaveBeenCalledTimes(0);
    });
  });

  // -----------------------------------------------------------------------
  // Edge runtime guard
  // -----------------------------------------------------------------------
  describe("edge runtime guard", () => {
    it("throws when NEXT_RUNTIME is edge", async () => {
      process.env.NEXT_RUNTIME = "edge";
      const deps = makeDeps();

      await expect(
        createManifestRuntime(deps, {
          user: { id: "user-1", tenantId: "tenant-1" },
        })
      ).rejects.toThrow("Edge runtime is unsupported");
    });
  });
});
