/**
 * Tests for auth.ts — env-based identity resolution (no database).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveIdentity } from "./auth.js";

describe("resolveIdentity (stdio)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.MCP_SERVICE_ACCOUNT_ID;
    delete process.env.MCP_SERVICE_TENANT_ID;
    delete process.env.MCP_SERVICE_ACCOUNT_ROLE;
  });

  afterEach(() => {
    process.env.MCP_SERVICE_ACCOUNT_ID = originalEnv.MCP_SERVICE_ACCOUNT_ID;
    process.env.MCP_SERVICE_TENANT_ID = originalEnv.MCP_SERVICE_TENANT_ID;
    process.env.MCP_SERVICE_ACCOUNT_ROLE = originalEnv.MCP_SERVICE_ACCOUNT_ROLE;
  });

  it("resolves identity from env vars", async () => {
    process.env.MCP_SERVICE_ACCOUNT_ID = "user-123";
    process.env.MCP_SERVICE_TENANT_ID = "tenant-456";
    process.env.MCP_SERVICE_ACCOUNT_ROLE = "admin,owner";

    const identity = await resolveIdentity("stdio");

    expect(identity.userId).toBe("user-123");
    expect(identity.tenantId).toBe("tenant-456");
    expect(identity.roles).toEqual(["admin", "owner"]);
    expect(identity.mode).toBe("service-account");
  });

  it("defaults roles to empty when role env is unset", async () => {
    process.env.MCP_SERVICE_ACCOUNT_ID = "user-123";
    process.env.MCP_SERVICE_TENANT_ID = "tenant-456";

    const identity = await resolveIdentity("stdio");
    expect(identity.roles).toEqual([]);
  });

  it("throws when env vars are missing", async () => {
    await expect(resolveIdentity("stdio")).rejects.toThrow(
      /MCP_SERVICE_ACCOUNT_ID and MCP_SERVICE_TENANT_ID/
    );
  });
});

describe("resolveIdentity (http)", () => {
  it("throws not-implemented error for HTTP transport", async () => {
    await expect(resolveIdentity("http")).rejects.toThrow(
      /HTTP transport identity resolution not yet implemented/
    );
  });
});
