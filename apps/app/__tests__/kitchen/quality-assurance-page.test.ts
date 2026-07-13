/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan item #7): the Kitchen Quality Assurance
 * RSC page issued 3 SERIAL findMany round-trips — qACheck, temperatureLog,
 * correctiveAction — each keyed only on (tenantId, deletedAt: null) and fully
 * independent of the others. They back the three always-visible QA tabs, so all
 * three load on every page open. Collapsed into one Promise.all: 3 serial
 * round-trips → 1.
 *
 * This test pins:
 *  1. The three reads run CONCURRENTLY (all invoked before any resolves) — the
 *     regression guard that fails if the reads revert to sequential awaits.
 *  2. Each read keeps its scoped where/orderBy/take.
 *  3. No read fires when unauthenticated (the orgId guard short-circuits).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("../../app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    qACheck: { findMany: vi.fn() },
    temperatureLog: { findMany: vi.fn() },
    correctiveAction: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import QualityAssurancePage from "../../app/(authenticated)/(operations)/kitchen/quality-assurance/page";
import { getTenantIdForOrg } from "../../app/lib/tenant";

// `auth`'s real type (AuthFn) doesn't structurally overlap Mock; bridge via
// unknown — at runtime the vi.mock factory replaces it with a vi.fn().
const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantIdForOrg as ReturnType<typeof vi.fn>;
const qaFindMany = database.qACheck.findMany as ReturnType<typeof vi.fn>;
const tempFindMany = database.temperatureLog.findMany as ReturnType<
  typeof vi.fn
>;
const corrFindMany = database.correctiveAction.findMany as ReturnType<
  typeof vi.fn
>;

const TENANT_ID = "tenant-1";
const ORG_ID = "org-1";

describe("QualityAssurancePage — parallel reads (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ orgId: ORG_ID });
    tenantMock.mockResolvedValue(TENANT_ID);
  });

  it("runs the three reads concurrently (overlap), not serially", async () => {
    // Each read returns a promise we control. With Promise.all all three are
    // INVOKED in the same tick before any resolves; with serial awaits only the
    // first would be invoked while the rest are still pending.
    const resolvers: Array<() => void> = [];
    const pending = <T>(value: T) =>
      new Promise<T>((resolve) => {
        resolvers.push(() => resolve(value));
      });
    const invocations: string[] = [];
    const tracked = <T>(name: string, value: T) => {
      invocations.push(name);
      return pending(value);
    };

    qaFindMany.mockImplementation(() => tracked("qACheck", []));
    tempFindMany.mockImplementation(() => tracked("temperatureLog", []));
    corrFindMany.mockImplementation(() => tracked("correctiveAction", []));

    const pagePromise = QualityAssurancePage();

    // Let auth → getTenantIdForOrg settle, then Promise.all invokes all three
    // reads synchronously.
    await vi.waitFor(() => expect(invocations).toHaveLength(3));

    // PROOF OF PARALLELISM: all three invoked before ANY resolved — three
    // pending promises exist simultaneously. Serial execution would have
    // invoked only one here (the rest wait for it to resolve).
    expect(resolvers).toHaveLength(3);
    expect(invocations).toEqual([
      "qACheck",
      "temperatureLog",
      "correctiveAction",
    ]);

    for (const resolve of resolvers) {
      resolve();
    }
    await pagePromise;
  });

  it("keeps each read scoped (where/orderBy/take)", async () => {
    qaFindMany.mockResolvedValue([]);
    tempFindMany.mockResolvedValue([]);
    corrFindMany.mockResolvedValue([]);

    await expect(QualityAssurancePage()).resolves.toBeDefined();

    expect(qaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    );
    expect(tempFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, deletedAt: null },
        orderBy: { loggedAt: "desc" },
        take: 10,
      })
    );
    expect(corrFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    );
  });

  it("fires no DB read when unauthenticated", async () => {
    authMock.mockResolvedValue({ orgId: null });

    await expect(QualityAssurancePage()).rejects.toThrow("NOT_FOUND");

    expect(qaFindMany).not.toHaveBeenCalled();
    expect(tempFindMany).not.toHaveBeenCalled();
    expect(corrFindMany).not.toHaveBeenCalled();
  });
});
