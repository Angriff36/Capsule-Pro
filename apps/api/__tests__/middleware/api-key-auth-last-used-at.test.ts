// @vitest-environment node

/**
 * authenticateApiKey — `lastUsedAt` write throttle (db-perf #2e).
 *
 * Every API-key-authenticated request previously fired a fire-and-forget
 * `apiKey.update({ data: { lastUsedAt: now } })`. `lastUsedAt` is display-only
 * (the security page formats it with day-granularity `formatDate`), so the write
 * is now throttled to ≤1/min/key: skip it when the stored timestamp is already
 * fresher than the throttle window. These tests pin that behavior.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mock fns so the vi.mock factories can reference them and the test can
// assert on typed Mocks (the re-imported `database` keeps its real Prisma types,
// which do not expose vitest's mock methods).
const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  isValidKeyFormat: vi.fn(() => true),
  extractKeyPrefix: vi.fn(() => "cp_live_prefix"),
  validateKey: vi.fn(() => true),
}));

vi.mock("@repo/database", () => ({
  database: {
    apiKey: {
      findFirst: mocks.findFirst,
      update: mocks.update,
    },
  },
}));

// Mock the api-key-service helpers so authenticateApiKey reaches the lookup/write
// path without needing real key hashing.
vi.mock("@/app/lib/api-key-service", () => ({
  isValidKeyFormat: mocks.isValidKeyFormat,
  extractKeyPrefix: mocks.extractKeyPrefix,
  validateKey: mocks.validateKey,
}));

import { authenticateApiKey } from "@/middleware/api-key-auth";

const BASE_RECORD = {
  tenantId: "t-1",
  id: "key-1",
  name: "Test key",
  keyPrefix: "cp_live_prefix",
  hashedKey: "hashed",
  scopes: ["read"] as string[],
  expiresAt: null as Date | null,
  revokedAt: null as Date | null,
  deletedAt: null as Date | null,
  createdByUserId: "u-1",
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

function buildRequest(): Request {
  return new Request("http://localhost:3000/api/test", {
    headers: { authorization: "Bearer cp_live_abc123" },
  });
}

describe("authenticateApiKey — lastUsedAt throttle (#2e)", () => {
  beforeEach(() => {
    mocks.findFirst.mockReset();
    mocks.update.mockReset();
    mocks.update.mockResolvedValue({});
    mocks.isValidKeyFormat.mockReturnValue(true);
    mocks.extractKeyPrefix.mockReturnValue("cp_live_prefix");
    mocks.validateKey.mockReturnValue(true);
  });

  it("writes lastUsedAt on first use (null timestamp)", async () => {
    mocks.findFirst.mockResolvedValue({ ...BASE_RECORD, lastUsedAt: null });

    const res = await authenticateApiKey(buildRequest());

    expect(res.success).toBe(true);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { lastUsedAt: expect.any(Date) } }),
    );
  });

  it("skips the write when lastUsedAt is fresher than the throttle window", async () => {
    // 30s ago — within the 60s throttle window.
    const recent = new Date(Date.now() - 30_000);
    mocks.findFirst.mockResolvedValue({ ...BASE_RECORD, lastUsedAt: recent });

    const res = await authenticateApiKey(buildRequest());

    expect(res.success).toBe(true);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("writes lastUsedAt when the stored timestamp is stale", async () => {
    // 120s ago — beyond the 60s throttle window.
    const stale = new Date(Date.now() - 120_000);
    mocks.findFirst.mockResolvedValue({ ...BASE_RECORD, lastUsedAt: stale });

    const res = await authenticateApiKey(buildRequest());

    expect(res.success).toBe(true);
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it("returns the stored (un-throttled) lastUsedAt in the success context", async () => {
    const recent = new Date(Date.now() - 30_000);
    mocks.findFirst.mockResolvedValue({ ...BASE_RECORD, lastUsedAt: recent });

    const res = await authenticateApiKey(buildRequest());

    expect(res.success).toBe(true);
    if (res.success) {
      // The skipped write must NOT mutate the returned context — it carries the
      // record's existing lastUsedAt, not "now".
      expect(res.apiKey.lastUsedAt).toEqual(recent);
    }
  });

  it("still authenticates and does not write on the revoked-key reject path", async () => {
    mocks.findFirst.mockResolvedValue({
      ...BASE_RECORD,
      lastUsedAt: null,
      revokedAt: new Date("2026-01-02T00:00:00Z"),
    });

    const res = await authenticateApiKey(buildRequest());

    expect(res.success).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
