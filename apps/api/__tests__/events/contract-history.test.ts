/**
 * GET /api/events/contracts/[id]/history — over-fetch guard (#20 contract-family tail).
 *
 * Pins that the existence-guard `findUnique` carries a focused `select: { id: true }`
 * (the contract row is fetched only to prove existence — none of its columns are
 * consumed downstream of the guard). A revert that drops the select fails loudly.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    eventContract: { findUnique: vi.fn() },
    contractSignature: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/events/contracts/[id]/history/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/events/contracts/[id]/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
  });

  it("existence-guard findUnique carries a focused select: { id: true }", async () => {
    vi.mocked(database.eventContract.findUnique).mockResolvedValue({
      id: "contract_1",
    } as never);
    vi.mocked(database.$queryRaw).mockResolvedValue([]);
    vi.mocked(database.contractSignature.findMany).mockResolvedValue([]);

    const res = await GET(
      new NextRequest("http://x/api/events/contracts/contract_1/history"),
      { params: Promise.resolve({ id: "contract_1" }) }
    );

    expect(res.status).toBe(200);
    expect(database.eventContract.findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_id: { tenantId: "tenant_test", id: "contract_1" },
      },
      select: { id: true },
    });
  });

  it("returns 404 when the contract is missing (and skips downstream reads)", async () => {
    vi.mocked(database.eventContract.findUnique).mockResolvedValue(null);

    const res = await GET(
      new NextRequest("http://x/api/events/contracts/contract_1/history"),
      { params: Promise.resolve({ id: "contract_1" }) }
    );

    expect(res.status).toBe(404);
    expect(database.$queryRaw).not.toHaveBeenCalled();
    expect(database.contractSignature.findMany).not.toHaveBeenCalled();
  });

  it("combines audit + signature entries and sorts newest-first", async () => {
    vi.mocked(database.eventContract.findUnique).mockResolvedValue({
      id: "contract_1",
    } as never);
    vi.mocked(database.$queryRaw).mockResolvedValue([
      {
        id: "a1",
        action: "status_change",
        createdAt: new Date("2026-07-10T10:00:00Z"),
        newValues: { status: "sent" },
        oldValues: { status: "draft" },
        performedBy: null,
        performerFirstName: null,
        performerLastName: null,
      },
    ]);
    vi.mocked(database.contractSignature.findMany).mockResolvedValue([
      {
        id: "s1",
        signedAt: new Date("2026-07-12T10:00:00Z"),
        signerEmail: "c@example.com",
        signerName: "Client",
      },
    ] as never);

    const res = await GET(
      new NextRequest("http://x/api/events/contracts/contract_1/history"),
      { params: Promise.resolve({ id: "contract_1" }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    // signature (newer) sorts before audit (older)
    expect(body.history[0]).toMatchObject({ type: "signature", id: "s1" });
    expect(body.history[1]).toMatchObject({ type: "audit", id: "a1" });
  });
});
