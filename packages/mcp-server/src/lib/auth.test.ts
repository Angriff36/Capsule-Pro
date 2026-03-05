/**
 * Tests for auth.ts — identity resolution.
 *
 * Tests the invariant: "Identity is resolved correctly from env vars or
 * auto-discovered from the database."
 *
 * Uses mock Prisma client to avoid database dependency.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaForAuth } from "./auth.js";
import { resolveIdentity } from "./auth.js";

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------

function createMockPrisma(
  findFirstImpl: (args: {
    where: Record<string, unknown>;
    select: Record<string, boolean>;
    orderBy?: Record<string, string>;
  }) => Promise<Record<string, unknown> | null>
): PrismaForAuth {
  return {
    user: {
      findFirst: vi.fn(findFirstImpl),
    },
  };
}

// ---------------------------------------------------------------------------
// resolveIdentity — stdio transport
// ---------------------------------------------------------------------------

describe("resolveIdentity (stdio)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear MCP env vars before each test
    process.env.MCP_SERVICE_ACCOUNT_ID = "";
    process.env.MCP_SERVICE_TENANT_ID = "";
  });

  afterEach(() => {
    // Restore original env
    process.env.MCP_SERVICE_ACCOUNT_ID = originalEnv.MCP_SERVICE_ACCOUNT_ID;
    process.env.MCP_SERVICE_TENANT_ID = originalEnv.MCP_SERVICE_TENANT_ID;
  });

  // ── Path 1: Explicit env vars ──

  it("resolves identity from explicit env vars", async () => {
    process.env.MCP_SERVICE_ACCOUNT_ID = "user-123";
    process.env.MCP_SERVICE_TENANT_ID = "tenant-456";

    const prisma = createMockPrisma(async () => ({
      role: "admin",
    }));

    const identity = await resolveIdentity("stdio", prisma);

    expect(identity.userId).toBe("user-123");
    expect(identity.tenantId).toBe("tenant-456");
    expect(identity.roles).toEqual(["admin"]);
    expect(identity.mode).toBe("service-account");
  });

  it("throws when env var user not found in database", async () => {
    process.env.MCP_SERVICE_ACCOUNT_ID = "nonexistent-user";
    process.env.MCP_SERVICE_TENANT_ID = "tenant-456";

    const prisma = createMockPrisma(async () => null);

    await expect(resolveIdentity("stdio", prisma)).rejects.toThrow(
      /Service account not found/
    );
  });

  it("handles user with no role", async () => {
    process.env.MCP_SERVICE_ACCOUNT_ID = "user-123";
    process.env.MCP_SERVICE_TENANT_ID = "tenant-456";

    const prisma = createMockPrisma(async () => ({
      role: null,
    }));

    const identity = await resolveIdentity("stdio", prisma);
    expect(identity.roles).toEqual([]);
  });

  // ── Path 2: Auto-discover ──

  it("auto-discovers owner user when no env vars set", async () => {
    const prisma = createMockPrisma(async (args) => {
      if (args.where.role === "owner") {
        return {
          id: "owner-1",
          tenantId: "tenant-auto",
          role: "owner",
          email: "owner@test.com",
          firstName: "Test",
          lastName: "Owner",
        };
      }
      return null;
    });

    const identity = await resolveIdentity("stdio", prisma);

    expect(identity.userId).toBe("owner-1");
    expect(identity.tenantId).toBe("tenant-auto");
    expect(identity.roles).toEqual(["owner"]);
    expect(identity.mode).toBe("service-account");
  });

  it("falls back to admin when no owner found", async () => {
    const prisma = createMockPrisma(async (args) => {
      if (args.where.role === "owner") return null;
      if (args.where.role === "admin") {
        return {
          id: "admin-1",
          tenantId: "tenant-auto",
          role: "admin",
          email: "admin@test.com",
          firstName: "Test",
          lastName: "Admin",
        };
      }
      return null;
    });

    const identity = await resolveIdentity("stdio", prisma);

    expect(identity.userId).toBe("admin-1");
    expect(identity.tenantId).toBe("tenant-auto");
    expect(identity.roles).toEqual(["admin"]);
  });

  it("falls back to any active user when no owner or admin found", async () => {
    const prisma = createMockPrisma(async (args) => {
      if (args.where.role === "owner") return null;
      if (args.where.role === "admin") return null;
      // No role filter = any active user
      return {
        id: "user-1",
        tenantId: "tenant-auto",
        role: "member",
        email: "user@test.com",
        firstName: "Test",
        lastName: "User",
      };
    });

    const identity = await resolveIdentity("stdio", prisma);

    expect(identity.userId).toBe("user-1");
    expect(identity.tenantId).toBe("tenant-auto");
    expect(identity.roles).toEqual(["member"]);
  });

  it("throws when no active users found at all", async () => {
    const prisma = createMockPrisma(async () => null);

    await expect(resolveIdentity("stdio", prisma)).rejects.toThrow(
      /No active users found/
    );
  });
});

// ---------------------------------------------------------------------------
// resolveIdentity — HTTP transport (Phase 2+)
// ---------------------------------------------------------------------------

describe("resolveIdentity (http)", () => {
  it("throws not-implemented error for HTTP transport", async () => {
    const prisma = createMockPrisma(async () => null);

    await expect(resolveIdentity("http", prisma)).rejects.toThrow(
      /HTTP transport identity resolution not yet implemented/
    );
  });
});
