/**
 * events/contracts/[id] GET — concurrency regression guard (DB-perf plan: the
 * #23 read-parallelization sweep extended to detail routes).
 *
 * After the contract existence guard the handler fetched event + client
 * SERIALLY. Each keys off a contract field (eventId / clientId), never the
 * other read's result → collapse into one Promise.all. Removes 1 serial
 * round-trip per detail load.
 *
 * This test pins the parallelization: both reads must FIRE before the first one
 * RESOLVES. A regression back to `await event; ...; await client` makes client
 * block on event — the held-pending gate then never sees it and vi.waitFor
 * times out.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/database", () => {
  const database = {
    eventContract: { findFirst: vi.fn() },
    event: { findFirst: vi.fn() },
    client: { findFirst: vi.fn() },
  };
  return { database };
});
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@/app/lib/invariant", () => ({
  invariant: (condition: unknown, message: string) => {
    if (!condition) {
      throw new Error(message);
    }
  },
  InvariantError: class InvariantError extends Error {},
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { database } = await import("@repo/database");

import { GET } from "@/app/api/events/contracts/[id]/route";

const TENANT_ID = "00000000-0000-0000-0000-0000000000a0";
const ORG_ID = "org_events_contracts";
const CONTRACT_ID = "00000000-0000-0000-0000-0000000000a1";
const EVENT_ID = "00000000-0000-0000-0000-0000000000a2";
const CLIENT_ID = "00000000-0000-0000-0000-0000000000a3";

const contractFixture = {
  tenantId: TENANT_ID,
  id: CONTRACT_ID,
  eventId: EVENT_ID,
  clientId: CLIENT_ID,
  status: "draft",
};

function makeAuthed() {
  vi.mocked(auth).mockResolvedValue({ orgId: ORG_ID } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TENANT_ID);
}

function makeRequest() {
  return new Request(
    new URL(`/api/events/contracts/${CONTRACT_ID}`, "http://localhost:3000")
  );
}

describe("GET /api/events/contracts/[id] — read parallelization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    makeAuthed();
    vi.mocked(database.eventContract.findFirst).mockResolvedValue(
      contractFixture as never
    );
    vi.mocked(database.event.findFirst).mockResolvedValue({
      id: EVENT_ID,
      title: "Gala",
      eventDate: new Date("2026-08-01"),
    } as never);
    vi.mocked(database.client.findFirst).mockResolvedValue({
      id: CLIENT_ID,
      companyName: "Acme",
      firstName: null,
      lastName: null,
    } as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("fires event + client together after the contract guard (not serial)", async () => {
    // Hold the event read pending; the client read must still fire.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.mocked(database.event.findFirst).mockImplementation((() =>
      gate.then(() => ({
        id: EVENT_ID,
        title: "Gala",
        eventDate: new Date("2026-08-01"),
      }))) as never);
    const clientSpy = vi.mocked(database.client.findFirst);

    const responsePromise = GET(makeRequest(), {
      params: Promise.resolve({ id: CONTRACT_ID }),
    });

    await vi.waitFor(
      () => {
        expect(clientSpy).toHaveBeenCalledTimes(1);
      },
      { timeout: 500 }
    );
    release();
    const res = await responsePromise;
    expect(res.status).toBe(200);
  });

  it("returns 404 before event/client reads when the contract is missing", async () => {
    vi.mocked(database.eventContract.findFirst).mockResolvedValue(
      null as never
    );

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ id: CONTRACT_ID }),
    });
    expect(res.status).toBe(404);
    expect(database.event.findFirst).not.toHaveBeenCalled();
    expect(database.client.findFirst).not.toHaveBeenCalled();
  });
});
