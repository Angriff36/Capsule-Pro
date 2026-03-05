/**
 * Tests for runtime-factory.ts — Prisma singleton lifecycle.
 *
 * Tests the invariant: "setPrisma/getPrisma manage a singleton correctly,
 * and getPrisma throws when not initialized."
 *
 * Note: runtime-factory.ts imports from @repo/manifest-adapters which
 * transitively imports @repo/database/standalone, triggering DATABASE_URL
 * validation. We mock the transitive dependency to avoid this.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the transitive imports that require DATABASE_URL
vi.mock("@repo/manifest-adapters/manifest-runtime-factory", () => ({
  createManifestRuntime: vi.fn(),
}));

vi.mock("@sentry/node", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runtime-factory Prisma lifecycle", () => {
  // Import after mocks are set up
  let setPrisma: typeof import("./runtime-factory.js").setPrisma;
  let getPrisma: typeof import("./runtime-factory.js").getPrisma;
  let disconnectPrisma: typeof import("./runtime-factory.js").disconnectPrisma;

  beforeEach(async () => {
    // Reset modules to get fresh singleton state
    vi.resetModules();

    // Re-apply mocks after reset
    vi.doMock("@repo/manifest-adapters/manifest-runtime-factory", () => ({
      createManifestRuntime: vi.fn(),
    }));
    vi.doMock("@sentry/node", () => ({
      addBreadcrumb: vi.fn(),
      captureException: vi.fn(),
    }));

    const mod = await import("./runtime-factory.js");
    setPrisma = mod.setPrisma;
    getPrisma = mod.getPrisma;
    disconnectPrisma = mod.disconnectPrisma;
  });

  it("getPrisma throws when not initialized", () => {
    expect(() => getPrisma()).toThrow(/Prisma not initialized/);
  });

  it("setPrisma stores and getPrisma retrieves the instance", () => {
    const mockPrisma = { marker: "test-prisma" } as any;
    setPrisma(mockPrisma);
    expect(getPrisma()).toBe(mockPrisma);
    expect((getPrisma() as any).marker).toBe("test-prisma");
  });

  it("disconnectPrisma calls $disconnect on the instance", async () => {
    const disconnectFn = vi.fn();
    const mockPrisma = { $disconnect: disconnectFn } as any;
    setPrisma(mockPrisma);
    await disconnectPrisma();
    expect(disconnectFn).toHaveBeenCalledOnce();
  });

  it("disconnectPrisma is safe when no $disconnect method", async () => {
    const mockPrisma = {} as any;
    setPrisma(mockPrisma);
    // Should not throw
    await disconnectPrisma();
  });
});

// ---------------------------------------------------------------------------
// DB env gate (MCP_ALLOW_DB)
// ---------------------------------------------------------------------------

describe("MCP_ALLOW_DB env gate", () => {
  const originalEnv = { ...process.env };

  let setPrisma: typeof import("./runtime-factory.js").setPrisma;
  let getPrisma: typeof import("./runtime-factory.js").getPrisma;

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("@repo/manifest-adapters/manifest-runtime-factory", () => ({
      createManifestRuntime: vi.fn(),
    }));
    vi.doMock("@sentry/node", () => ({
      addBreadcrumb: vi.fn(),
      captureException: vi.fn(),
    }));

    const mod = await import("./runtime-factory.js");
    setPrisma = mod.setPrisma;
    getPrisma = mod.getPrisma;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("getPrisma throws when MCP_ALLOW_DB=0", () => {
    const mockPrisma = { marker: "test" } as any;
    setPrisma(mockPrisma);
    process.env.MCP_ALLOW_DB = "0";
    expect(() => getPrisma()).toThrow(/Database access is disabled/);
  });

  it("getPrisma throws when MCP_ALLOW_DB=false", () => {
    const mockPrisma = { marker: "test" } as any;
    setPrisma(mockPrisma);
    process.env.MCP_ALLOW_DB = "false";
    expect(() => getPrisma()).toThrow(/Database access is disabled/);
  });

  it("getPrisma succeeds when MCP_ALLOW_DB=1", () => {
    const mockPrisma = { marker: "test" } as any;
    setPrisma(mockPrisma);
    process.env.MCP_ALLOW_DB = "1";
    expect(getPrisma()).toBe(mockPrisma);
  });

  it("getPrisma succeeds when MCP_ALLOW_DB is not set", () => {
    const mockPrisma = { marker: "test" } as any;
    setPrisma(mockPrisma);
    process.env.MCP_ALLOW_DB = undefined as unknown as string;
    expect(getPrisma()).toBe(mockPrisma);
  });
});
