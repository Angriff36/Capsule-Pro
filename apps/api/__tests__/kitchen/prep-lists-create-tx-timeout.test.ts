/**
 * POST /api/kitchen/prep-lists/commands/create — $transaction pool-hold bound
 * regression guard (db-perf #18, same shape as #29).
 *
 * WHY THIS TEST EXISTS: this route runs N governed writes (PrepList.create →
 * N×PrepListItem.create) inside ONE interactive `$transaction`, which checks
 * out a single pool connection (max:20) for the whole duration. The original
 * timeout scaled with item count up to a 120s ceiling
 * (`Math.min(items.length*2000+5000, 120_000)`), so a few concurrent large
 * prep-list creates could each pin a connection for up to two minutes,
 * exhaust the pool, and starve every other request (Prisma P2024). The
 * ceiling is now the app-wide transaction timeout (30s) via
 * `batchTransactionTimeout`.
 *
 * This test pins that the route passes the BOUND timeout to `$transaction` —
 * a 100-item create (which the old formula would have held for the full 120s)
 * must now hold ≤30s. It fails if the inline 120_000 ceiling is restored.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  Prisma: { sql: vi.fn() },
}));

vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn().mockResolvedValue({}),
}));

vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi
    .fn()
    .mockResolvedValue({ ok: true, result: { id: "prep-1" }, events: [] }),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { database } from "@repo/database";
import { requireCurrentUser } from "@/app/lib/tenant";
import { batchTransactionTimeout } from "@/lib/manifest/batch-timeout";

const { POST } = await import(
  "@/app/api/kitchen/prep-lists/commands/create/route"
);

const TENANT_ID = "a0000000-0000-4000-a000-000000000002";
const USER_ID = "u0000000-0000-4000-a000-000000000003";

function req(input: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/kitchen/prep-lists/commands/create"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    }
  ) as unknown as NextRequest;
}

function makeItems(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    stationId: "stn-1",
    stationName: "Grill",
    ingredientId: `ing-${i}`,
    ingredientName: `Ingredient ${i}`,
    category: null,
    baseQuantity: 2,
    baseUnit: "kg",
    scaledQuantity: 2,
    scaledUnit: "kg",
    isOptional: false,
    preparationNotes: null,
    allergens: [],
    dietarySubstitutions: [],
    dishId: null,
    dishName: null,
    recipeVersionId: null,
  }));
}

/** Capture the `$transaction` options (2nd arg) while still invoking the
 * callback so the route reaches its success path. */
function captureTxOptions() {
  vi.mocked(database.$transaction).mockImplementation(async (cb, options) => {
    (database.$transaction as { __opts?: unknown }).__opts = options;
    return (cb as (tx: unknown) => Promise<unknown>)({});
  });
  return () =>
    (database.$transaction as { __opts?: { timeout: number } }).__opts;
}

describe("POST prep-lists/commands/create — $transaction pool-hold bound (#18)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "admin",
      email: "",
      firstName: "",
      lastName: "",
    });
    // Event existence guard (read path): returns at least one row.
    vi.mocked(database.$queryRaw).mockResolvedValue([{ id: "evt-1" }]);
  });

  it("bounds a 100-item create to the 30s app-wide tx ceiling (was 120s)", async () => {
    const getOpts = captureTxOptions();
    const res = await POST(req({ eventId: "evt-1", name: "Big Prep", items: makeItems(100) }));
    expect(res.status).toBe(200);

    const opts = getOpts();
    expect(opts).toBeDefined();
    // The discriminating guard: the old `Math.min(100*2000+5000, 120_000)`
    // yielded 120_000; the helper yields the 30s ceiling. opCount = items.
    expect(opts?.timeout).toBe(batchTransactionTimeout(100));
    expect(opts?.timeout).toBeLessThanOrEqual(30_000);
  });

  it("gives a small create proportional headroom below the ceiling", async () => {
    const getOpts = captureTxOptions();
    const res = await POST(req({ eventId: "evt-1", name: "Small Prep", items: makeItems(2) }));
    expect(res.status).toBe(200);

    const opts = getOpts();
    // 2 items → 2*2000+5000 = 9s, well under the 30s ceiling.
    expect(opts?.timeout).toBe(batchTransactionTimeout(2));
    expect(opts?.timeout).toBeLessThan(30_000);
  });

  it("requires an authenticated user before any DB read", async () => {
    // requireCurrentUser throws an InvariantError on missing auth; the route
    // maps that to 401.
    vi.mocked(requireCurrentUser).mockRejectedValue(
      Object.assign(new Error("No current user"), { name: "InvariantError" })
    );
    const res = await POST(req({ eventId: "evt-1", name: "X", items: makeItems(1) }));
    expect(res.status).toBe(401);
    expect(database.$transaction).not.toHaveBeenCalled();
  });
});
