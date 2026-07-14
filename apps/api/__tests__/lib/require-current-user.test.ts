/**
 * requireCurrentUser — resolution logic through the cache() wrapper (db-perf #2b).
 *
 * Why this matters: requireCurrentUser + requireTenantId are now wrapped in
 * React's `cache()` so that a single request which resolves the current user
 * more than once (a route handler calling auth()+requireCurrentUser, or a Server
 * Component fanning out to N server actions that each call requireCurrentUser)
 * runs the Clerk session + user.findFirst exactly once instead of N×. Identity
 * (orgId/clerkId/user row) is immutable within a request, so this is
 * zero-staleness; the memo is discarded at request end.
 *
 * NOTE on the dedupe itself: React `cache()` memoizes only inside a Next.js
 * request scope. In vitest there is no such scope, so `cache()` is a transparent
 * PASSTHROUGH (verified by probe: a no-arg cached fn still runs once per call).
 * The per-request dedupe is therefore a runtime guarantee that cannot be
 * observed here — these tests guard the resolver LOGIC through the wrapper
 * (proving the wrap did not change resolution behavior), not memoization.
 *
 * The global test/setup.ts stubs @/app/lib/tenant to bare vi.fns; here we
 * re-import the REAL implementation (importOriginal) so the resolution logic
 * actually runs, while @repo/database stays globally mocked (vite plugin).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));
vi.mock("@/lib/scope-guard", () => ({ getRequiredScope: vi.fn(() => null) }));
vi.mock("@/middleware/api-key-auth", () => ({
  authenticateApiKey: vi.fn(),
  hasScope: vi.fn(),
}));
vi.mock("next/headers", () => ({
  // No Authorization header → requireCurrentUser takes the Clerk session path.
  headers: vi.fn(async () => new Headers()),
}));
// The global setup.ts @sentry/nextjs mock omits captureMessage (used on the
// provisioning path); supply it here so provisioning cases don't crash.
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// Override the global stub so the REAL requireCurrentUser (with its cache wrap) runs.
vi.mock("@/app/lib/tenant", async (importOriginal) => await importOriginal());

import { database } from "@repo/database";
import { auth, currentUser } from "@repo/auth/server";
import { requireCurrentUser } from "@/app/lib/tenant";

const USER = {
  id: "user-1",
  tenantId: "tenant-1",
  role: "admin",
  email: "a@b.com",
  firstName: "A",
  lastName: "B",
};

describe("requireCurrentUser — Clerk-session resolution through cache() (#2b)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      orgId: "org-1",
      userId: "clerk-1",
    } as never);
    // No Bearer cp_ header → Clerk path.
    vi.mocked(database.account.findFirst).mockResolvedValue({ id: "tenant-1" } as never);
  });

  it("resolves an existing active user without provisioning", async () => {
    vi.mocked(database.user.findFirst).mockResolvedValue(USER as never);

    const user = await requireCurrentUser();

    expect(user).toEqual(USER);
    expect(database.user.findFirst).toHaveBeenCalledTimes(1);
    // Happy path returns before touching Clerk profile / provisioning.
    expect(currentUser).not.toHaveBeenCalled();
    expect(database.user.create).not.toHaveBeenCalled();
  });

  it("auto-provisions a new employee when no user record exists", async () => {
    // existing-active → null, ghost (soft-deleted) → null, by-email → null.
    vi.mocked(database.user.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    vi.mocked(currentUser).mockResolvedValue({
      firstName: "New",
      lastName: "User",
      emailAddresses: [{ emailAddress: "new@example.com" }],
    } as never);
    const created = { ...USER, id: "user-2", email: "new@example.com", firstName: "New", lastName: "User" };
    vi.mocked(database.user.create).mockResolvedValue(created as never);

    const user = await requireCurrentUser();

    expect(user).toEqual(created);
    expect(database.user.create).toHaveBeenCalledTimes(1);
  });

  it("takes the Clerk path (not the API-key path) without a Bearer cp_ header", async () => {
    vi.mocked(database.user.findFirst).mockResolvedValue(USER as never);

    await requireCurrentUser();

    // The API-key branch would call resolveCurrentUser → authenticateApiKey; the
    // Clerk branch calls auth() + getTenantIdForOrg + user.findFirst instead.
    expect(auth).toHaveBeenCalled();
  });
});
