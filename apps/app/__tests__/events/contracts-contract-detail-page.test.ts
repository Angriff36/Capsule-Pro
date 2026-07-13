/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan item #7): the Contract Detail RSC page
 * issued 3 SERIAL post-guard round-trips — event.findFirst (← contract.eventId),
 * a $queryRaw client lookup (← contract.clientId), and contractSignature.findMany
 * (← route id). Each is keyed on independent data and each swallowed its own
 * errors to a default (null/[]), so they have no inter-dependency. Collapsed
 * into one Promise.all: 4 round-trips → 2 (the eventContract guard + one batch).
 *
 * This test pins:
 *  1. The three reads run CONCURRENTLY (all invoked before any resolves) — the
 *     regression guard that fails if the reads revert to sequential awaits.
 *  2. Per-read error isolation: a rejected read defaults independently and never
 *     fails the page (the .catch() per branch is what item #7 requires preserving).
 *  3. The eventContract guard short-circuits (missing/soft-deleted → notFound,
 *     zero detail reads fire).
 *  4. No read fires when unauthenticated.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("../../app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    eventContract: { findFirst: vi.fn() },
    event: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
    contractSignature: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import ContractDetailPage from "../../app/(authenticated)/(events)/events/contracts/[contractId]/page";
import { getTenantIdForOrg } from "../../app/lib/tenant";

// `auth`'s real type (AuthFn) doesn't structurally overlap Mock; bridge via
// unknown — at runtime the vi.mock factory replaces it with a vi.fn().
const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantIdForOrg as ReturnType<typeof vi.fn>;
const contractFindFirst = database.eventContract.findFirst as ReturnType<
  typeof vi.fn
>;
const eventFindFirst = database.event.findFirst as ReturnType<typeof vi.fn>;
const queryRaw = database.$queryRaw as ReturnType<typeof vi.fn>;
const signaturesFindMany = database.contractSignature.findMany as ReturnType<
  typeof vi.fn
>;

const TENANT_ID = "tenant-1";
const ORG_ID = "org-1";
const CONTRACT_ID = "contract-1";

const CONTRACT_ROW = {
  id: CONTRACT_ID,
  tenantId: TENANT_ID,
  eventId: "event-1",
  clientId: "client-1",
  title: "Spring Gala",
  deletedAt: null,
};

const pageProps = () => ({
  params: Promise.resolve({ contractId: CONTRACT_ID }),
});

describe("ContractDetailPage — parallel detail reads (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ orgId: ORG_ID });
    tenantMock.mockResolvedValue(TENANT_ID);
    contractFindFirst.mockResolvedValue(CONTRACT_ROW);
  });

  it("runs the three detail reads concurrently (overlap), not serially", async () => {
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

    eventFindFirst.mockImplementation(() =>
      tracked("event", { id: "event-1", title: "Spring Gala" })
    );
    queryRaw.mockImplementation(() => tracked("client", [{ id: "client-1" }]));
    signaturesFindMany.mockImplementation(() => tracked("signatures", []));

    const pagePromise = ContractDetailPage(pageProps());

    // Let auth → tenant → eventContract.findFirst settle, then Promise.all
    // invokes all three detail reads synchronously.
    await vi.waitFor(() => expect(invocations).toHaveLength(3));

    // PROOF OF PARALLELISM: all three invoked before ANY resolved — three
    // pending promises exist simultaneously. Serial execution would have
    // invoked only one here (the rest wait for it to resolve).
    expect(resolvers).toHaveLength(3);
    expect(invocations).toEqual(["event", "client", "signatures"]);

    for (const resolve of resolvers) {
      resolve();
    }
    await pagePromise;
  });

  it("isolates a rejected read (per-branch catch) so the page still resolves", async () => {
    // event.findFirst rejects; the per-branch .catch(() => null) must keep the
    // Promise.all from rejecting, so the page still resolves and the other two
    // reads still run and reach the client component.
    eventFindFirst.mockRejectedValue(new Error("event db down"));
    queryRaw.mockResolvedValue([{ id: "client-1", company_name: "Acme" }]);
    signaturesFindMany.mockResolvedValue([{ id: "sig-1" }]);

    await expect(ContractDetailPage(pageProps())).resolves.toBeDefined();

    expect(eventFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: TENANT_ID, id: "event-1" } })
    );
    expect(queryRaw).toHaveBeenCalled();
    expect(signaturesFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: TENANT_ID,
          contractId: CONTRACT_ID,
          deletedAt: null,
        },
      })
    );
  });

  it("does not fire detail reads when the contract is missing", async () => {
    contractFindFirst.mockResolvedValue(null);

    await expect(ContractDetailPage(pageProps())).rejects.toThrow("NOT_FOUND");

    expect(eventFindFirst).not.toHaveBeenCalled();
    expect(queryRaw).not.toHaveBeenCalled();
    expect(signaturesFindMany).not.toHaveBeenCalled();
  });

  it("does not fire detail reads when the contract is soft-deleted", async () => {
    contractFindFirst.mockResolvedValue({
      ...CONTRACT_ROW,
      deletedAt: "2026-01-01",
    });

    await expect(ContractDetailPage(pageProps())).rejects.toThrow("NOT_FOUND");

    expect(eventFindFirst).not.toHaveBeenCalled();
    expect(queryRaw).not.toHaveBeenCalled();
    expect(signaturesFindMany).not.toHaveBeenCalled();
  });

  it("fires no DB read when unauthenticated", async () => {
    authMock.mockResolvedValue({ orgId: null });

    await expect(ContractDetailPage(pageProps())).rejects.toThrow("NOT_FOUND");

    expect(contractFindFirst).not.toHaveBeenCalled();
    expect(eventFindFirst).not.toHaveBeenCalled();
    expect(queryRaw).not.toHaveBeenCalled();
    expect(signaturesFindMany).not.toHaveBeenCalled();
  });
});
