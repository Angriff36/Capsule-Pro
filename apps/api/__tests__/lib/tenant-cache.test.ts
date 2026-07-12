/**
 * getTenantIdForOrg per-process org→tenant cache (db-performance plan item #2).
 *
 * Why this matters: getTenantIdForOrg is called from ~120 sites and resolves the
 * org→tenantId mapping on every authenticated request (and twice per request in
 * routes like /api/user-preferences, which resolves the org directly AND again
 * inside requireCurrentUser). That mapping is immutable, so a short-TTL cache
 * removes the repeated account.findFirst round-trip without staleness risk.
 *
 * This test pins the dedupe + TTL + provision-then-cache behavior so a future
 * change cannot silently regress the N+1 removal. The global test/setup.ts stubs
 * @/app/lib/tenant to bare vi.fns; here we re-import the REAL implementation
 * (importOriginal) so the cache logic actually runs, while @repo/database stays
 * globally mocked (vitest plugin) — so database.account is a vi.fn we control.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Real tenant.ts pulls in auth/scope/api-key transitive imports; stub them so the
// module loads cleanly. (@repo/database is globally mocked via the vite plugin;
// server-only / observability / sentry are globally mocked in test/setup.ts.)
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));
vi.mock("@/lib/scope-guard", () => ({ getRequiredScope: vi.fn(() => null) }));
vi.mock("@/middleware/api-key-auth", () => ({
  authenticateApiKey: vi.fn(),
  hasScope: vi.fn(),
}));

// Override the global stub so the REAL getTenantIdForOrg (with its cache) runs.
vi.mock("@/app/lib/tenant", async (importOriginal) => await importOriginal());

import { database } from "@repo/database";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const findFirst = () => vi.mocked(database.account.findFirst);
const create = () => vi.mocked(database.account.create);

describe("getTenantIdForOrg — per-process org→tenant cache", () => {
  // restoreMocks:true (vitest config) does not reset call history on the
  // module-level vi.fn() mocks from @repo/database; clear them between tests so
  // call counts reflect only the current test (matches the kitchen-task test).
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dedupes repeated resolutions within the TTL window to one findFirst", async () => {
    findFirst().mockResolvedValue({ id: "tenant-dedupe" } as never);

    const a = await getTenantIdForOrg("org-dedupe");
    const b = await getTenantIdForOrg("org-dedupe");

    expect(a).toBe("tenant-dedupe");
    expect(b).toBe("tenant-dedupe");
    expect(findFirst()).toHaveBeenCalledTimes(1);
  });

  it("re-queries after the TTL expires", async () => {
    vi.useFakeTimers();
    findFirst().mockResolvedValue({ id: "tenant-expire" } as never);

    await getTenantIdForOrg("org-expire");
    expect(findFirst()).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30_001);

    await getTenantIdForOrg("org-expire");
    expect(findFirst()).toHaveBeenCalledTimes(2);
  });

  it("provisions on miss, then serves the created id from cache (no re-create)", async () => {
    findFirst().mockResolvedValue(null);
    create().mockResolvedValue({ id: "tenant-created" } as never);

    const a = await getTenantIdForOrg("org-create");
    const b = await getTenantIdForOrg("org-create");

    expect(a).toBe("tenant-created");
    expect(b).toBe("tenant-created");
    expect(create()).toHaveBeenCalledTimes(1);
    expect(findFirst()).toHaveBeenCalledTimes(1);
  });

  it("caches each org independently", async () => {
    findFirst()
      .mockResolvedValueOnce({ id: "id-org-a" } as never)
      .mockResolvedValueOnce({ id: "id-org-b" } as never);

    const a = await getTenantIdForOrg("org-a");
    const b = await getTenantIdForOrg("org-b");

    expect(a).toBe("id-org-a");
    expect(b).toBe("id-org-b");
    expect(findFirst()).toHaveBeenCalledTimes(2);
  });
});
