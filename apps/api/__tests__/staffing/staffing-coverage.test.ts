/**
 * Staffing coverage GET — regression guard for the raw-SQL parameterization
 * refactor (DB-perf #26).
 *
 * Before the refactor, the route built a SQL *fragment* (`AND ss.location_id =
 * $N::uuid` with manually-numbered `$N`/`locIdx` bookkeeping) and
 * string-interpolated it into five `$queryRawUnsafe` calls. Now each of the
 * five queries is a tagged-template `$queryRaw` where every value self-binds
 * and the optional location filter is a static `(${locationId}::uuid IS NULL OR
 * ss.location_id = ${locationId}::uuid)` clause — no SQL fragment is ever
 * interpolated. These tests pin the response shape and guard the
 * parameterization across all five queries (the literal `locationId` must be a
 * bound value, never SQL text; the mock exposes `$queryRaw` only, so a revert
 * to `$queryRawUnsafe` throws).
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock exposes $queryRaw ONLY — a regression to $queryRawUnsafe would throw
// `database.$queryRawUnsafe is not a function`.
vi.mock("@/lib/database", () => ({
  database: { $queryRaw: vi.fn() },
}));

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { database } = await import("@/lib/database");

import { GET as getCoverage } from "@/app/api/staffing/coverage/route";

const SC_TENANT_ID = "00000000-0000-0000-0000-000000000070";
const SC_ORG_ID = "org_staffing_coverage";
const SC_USER_ID = "user_staffing_coverage";
const SC_LOCATION_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function makeAuthed() {
  vi.mocked(auth).mockResolvedValue({
    orgId: SC_ORG_ID,
    userId: SC_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(SC_TENANT_ID);
}

function makeRequest(query = ""): NextRequest {
  return new NextRequest(
    new URL(`/api/staffing/coverage${query}`, "http://localhost:3000")
  );
}

/** Five $queryRaw calls fire in code order: daily, location, today, todayLoc, weekly. */
function setupRows() {
  vi.mocked(database.$queryRaw)
    .mockResolvedValueOnce([
      {
        date: new Date("2026-07-13"),
        total_shifts: BigInt(4),
        filled_shifts: BigInt(3),
        unfilled_shifts: BigInt(1),
        unique_employees: BigInt(2),
        total_hours: 8,
      },
    ])
    .mockResolvedValueOnce([
      {
        location_id: "loc-1",
        location_name: "HQ",
        total_shifts: BigInt(4),
        filled_shifts: BigInt(3),
        unfilled_shifts: BigInt(1),
      },
    ])
    .mockResolvedValueOnce([
      {
        total_shifts: BigInt(2),
        filled_shifts: BigInt(2),
        unfilled_shifts: BigInt(0),
        active_employees: BigInt(2),
        total_hours: 4,
      },
    ])
    .mockResolvedValueOnce([
      {
        location_id: "loc-1",
        location_name: "HQ",
        total_shifts: BigInt(2),
        filled_shifts: BigInt(2),
        unfilled_shifts: BigInt(0),
      },
    ])
    .mockResolvedValueOnce([
      {
        week_start: new Date("2026-07-06"),
        week_end: new Date("2026-07-12"),
        total_shifts: BigInt(10),
        total_hours: 20,
        unique_employees: BigInt(3),
        unfilled_shifts: BigInt(1),
      },
    ]);
}

describe("GET /api/staffing/coverage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    makeAuthed();
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 401 before any DB read when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

    const res = await getCoverage(makeRequest() as never);
    expect(res.status).toBe(401);
    expect(database.$queryRaw).not.toHaveBeenCalled();
  });

  it("binds locationId as a parameter in all five queries, never as SQL text (#26)", async () => {
    setupRows();

    const res = await getCoverage(
      makeRequest(`?period=week&locationId=${SC_LOCATION_ID}`) as never
    );
    expect(res.status).toBe(200);

    // Exactly five tagged-template $queryRaw calls; $queryRawUnsafe is not on
    // the mock, so a revert cannot silently succeed.
    expect(database.$queryRaw).toHaveBeenCalledTimes(5);

    for (const call of vi.mocked(database.$queryRaw).mock.calls) {
      const strings = call[0] as readonly string[];
      const sql = strings.join("?");
      const values = call.slice(1);
      // Static parameterized clause present in every query.
      expect(sql).toContain("IS NULL");
      expect(sql).toContain("ss.location_id =");
      // Literal uuid never interpolated into the SQL text…
      expect(sql).not.toContain(SC_LOCATION_ID);
      // …it is a bound value.
      expect(values).toContain(SC_LOCATION_ID);
      expect(values[0]).toBe(SC_TENANT_ID);
    }
  });

  it("maps the five row sets into summary / daily / location_totals / today / weekly", async () => {
    setupRows();

    const res = await getCoverage(makeRequest("?period=week") as never);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.period.label).toBe("This Week");

    // summary derives from location_totals: 4 total, 3 filled → 75% coverage.
    expect(body.summary.total_shifts).toBe(4);
    expect(body.summary.unfilled_shifts).toBe(1);
    expect(body.summary.avg_coverage_pct).toBe(75);
    expect(body.summary.total_hours).toBe(8);

    expect(body.daily).toHaveLength(1);
    expect(body.daily[0]).toMatchObject({
      total_shifts: 4,
      filled_shifts: 3,
      unfilled_shifts: 1,
      total_hours: 8,
      locations: [],
    });
    expect(typeof body.daily[0].day_name).toBe("string");

    expect(body.location_totals).toHaveLength(1);
    expect(body.location_totals[0]).toMatchObject({
      location_id: "loc-1",
      location_name: "HQ",
      total_shifts: 4,
      coverage_pct: 75,
    });

    expect(body.today).toMatchObject({
      total_shifts: 2,
      filled_shifts: 2,
      unfilled_shifts: 0,
      active_employees: 2,
      total_hours: 4,
    });
    expect(body.today.locations[0]).toMatchObject({
      location_id: "loc-1",
      coverage_pct: 100,
    });

    expect(body.weekly).toHaveLength(1);
    expect(body.weekly[0]).toMatchObject({
      total_shifts: 10,
      total_hours: 20,
      unique_employees: 3,
      unfilled: 1,
    });
  });

  it("dispatches all five aggregates in one concurrent wave, not serially", async () => {
    // Hold the first query (daily) pending; the other four resolve immediately.
    // In the Promise.all layout every $queryRaw fires synchronously before any
    // await, so all 5 are recorded while daily is still pending. A serial
    // revert would block on the first await and never reach the remaining four
    // → vi.waitFor times out (the proof the collapse is real).
    let releaseDaily!: () => void;
    vi.mocked(database.$queryRaw)
      .mockReturnValueOnce(
        new Promise<unknown[]>((resolve) => {
          releaseDaily = () => resolve([]);
        }) as never
      )
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const promise = getCoverage(makeRequest("?period=week") as never);

    await vi.waitFor(() => {
      expect(database.$queryRaw).toHaveBeenCalledTimes(5);
    });

    releaseDaily();
    const res = await promise;
    expect(res.status).toBe(200);
  });
});
