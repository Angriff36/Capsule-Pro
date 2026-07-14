/**
 * GET/POST /api/public/proposals-draft/[token] — over-fetch `select` guard.
 *
 * Both handlers read a ProposalDraft by magic token with NO auth (public
 * cold-link surface). This pins that each read projects ONLY the fields its
 * handler consumes — dropping the heavy `htmlContent` (@db.Text rendered-HTML
 * blob) and (on POST) the `visionSummary` @db.Text blob + all 6 JSON payloads +
 * ~20 unused columns. Reverting to an un-narrowed read, or dropping a consumed
 * field, fails this suite loudly.
 *
 * @vitest-environment node
 */
import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/database", () => ({
  database: {
    proposalDraft: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
    proposalAction: { create: vi.fn() },
  },
}));
vi.mock("@/lib/manifest/execute-command", () => ({ runCommand: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { GET, POST } from "@/app/api/public/proposals-draft/[token]/route";
import { runCommand } from "@/lib/manifest/execute-command";

const TOKEN = "magic-token-abc";
const TENANT_ID = "t0000000-0000-4000-a000-000000000001";
const FUTURE = new Date(Date.now() + 86_400_000);
const PAST = new Date("2020-01-01T00:00:00.000Z");

function fullDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: "draft-1",
    tenantId: TENANT_ID,
    title: "Gala Proposal",
    status: "viewed",
    version: 2,
    clientName: "Acme Corp",
    clientEmail: "buyer@acme.com",
    clientPhone: "+15551234",
    eventSummary: { date: "2026-09-01" },
    menuSections: { starters: [] },
    servicePlan: { staff: 10 },
    pricingBreakdown: { total: 5000 },
    timeline: [{ label: "cocktails" }],
    upgradeOptions: { valet: true },
    visionSummary: "An elegant evening…",
    notes: "Nut-free",
    nextSteps: "Sign and pay deposit",
    templateId: null,
    magicToken: TOKEN,
    magicTokenExpiresAt: FUTURE,
    sentAt: PAST,
    sentVia: "email",
    viewedAt: PAST,
    respondedAt: null,
    depositAmount: 1000,
    depositPaid: false,
    htmlContent: "<html>…tens of KB of rendered proposal HTML…</html>",
    createdAt: PAST,
    updatedAt: PAST,
    deletedAt: null,
    ...overrides,
  };
}

function req(method: "GET" | "POST", token: string, body?: unknown) {
  // Inline init literal so it is checked structurally against Next's
  // RequestInit (annotating `: RequestInit` resolves to lib.dom's global, which
  // is not assignable to next/server's extended RequestInit).
  const init =
    body === undefined
      ? { method }
      : {
          method,
          body: JSON.stringify(body),
          headers: { "content-type": "application/json" },
        };
  return new NextRequest(`http://x/api/public/proposals-draft/${token}`, init);
}

describe("GET /api/public/proposals-draft/[token] — over-fetch select guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("projects only the consumed fields, dropping htmlContent + unused columns", async () => {
    vi.mocked(database.proposalDraft.findFirst).mockResolvedValue(
      fullDraft() as never
    );

    const res = await GET(req("GET", TOKEN), {
      params: Promise.resolve({ token: TOKEN }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(database.proposalDraft.findFirst).toHaveBeenCalledTimes(1);

    const arg = vi.mocked(database.proposalDraft.findFirst).mock
      .calls[0]?.[0] as {
      select?: Record<string, unknown>;
      include?: Record<string, unknown>;
      where?: Record<string, unknown>;
    };

    // Narrowed via `select`, never an un-narrowed read.
    expect(arg.include).toBeUndefined();
    expect(arg.select).toBeDefined();

    expect(Object.keys(arg.select!).sort()).toEqual(
      [
        "clientName",
        "createdAt",
        "eventSummary",
        "id",
        "magicTokenExpiresAt",
        "menuSections",
        "nextSteps",
        "notes",
        "pricingBreakdown",
        "servicePlan",
        "status",
        "tenantId",
        "timeline",
        "title",
        "upgradeOptions",
        "version",
        "viewedAt",
        "visionSummary",
      ].sort()
    );

    // Heavy / unused columns MUST be absent from the projection.
    for (const dropped of [
      "htmlContent", // @db.Text rendered-HTML blob — the big win
      "depositAmount",
      "depositPaid",
      "clientEmail",
      "clientPhone",
      "sentAt",
      "sentVia",
      "respondedAt",
      "templateId",
      "magicToken",
      "updatedAt",
    ]) {
      expect(arg.select![dropped]).toBeUndefined();
    }

    // Response still carries the consumed subset (expiresAt ← magicTokenExpiresAt).
    expect(body.proposal).toMatchObject({
      id: "draft-1",
      title: "Gala Proposal",
      status: "viewed",
      version: 2,
      expiresAt: FUTURE.toISOString(),
    });
    // htmlContent never leaks to the public response.
    expect(JSON.stringify(body.proposal)).not.toContain("htmlContent");

    // viewedAt already set → the governed recordView write is skipped (no actor).
    expect(runCommand).not.toHaveBeenCalled();
    expect(database.user.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown / expired token before any governed write", async () => {
    vi.mocked(database.proposalDraft.findFirst).mockResolvedValue(
      null as never
    );
    const res = await GET(req("GET", "unknown"), {
      params: Promise.resolve({ token: "unknown" }),
    });
    expect(res.status).toBe(404);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("returns 410 when the magic token has expired", async () => {
    vi.mocked(database.proposalDraft.findFirst).mockResolvedValue(
      fullDraft({ magicTokenExpiresAt: PAST }) as never
    );
    const res = await GET(req("GET", TOKEN), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res.status).toBe(410);
  });

  it("returns 400 and reads nothing for a missing token", async () => {
    const res = await GET(req("GET", ""), {
      params: Promise.resolve({ token: "" }),
    });
    expect(res.status).toBe(400);
    expect(database.proposalDraft.findFirst).not.toHaveBeenCalled();
  });
});

describe("POST /api/public/proposals-draft/[token] — over-fetch select guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("projects only the 4 guard fields (id/status/expiry/tenant), dropping htmlContent + every JSON payload", async () => {
    vi.mocked(database.proposalDraft.findFirst).mockResolvedValue(
      fullDraft({ status: "sent" }) as never
    );
    vi.mocked(database.user.findFirst).mockResolvedValue({
      id: "admin-1",
      role: "admin",
    } as never);
    vi.mocked(runCommand).mockResolvedValue({
      ok: true,
      status: 200,
    } as never);
    vi.mocked(database.proposalAction.create).mockResolvedValue({} as never);

    const res = await POST(req("POST", TOKEN, { action: "approve" }), {
      params: Promise.resolve({ token: TOKEN }),
    });

    expect(res.status).toBe(200);
    expect(database.proposalDraft.findFirst).toHaveBeenCalledTimes(1);

    const arg = vi.mocked(database.proposalDraft.findFirst).mock
      .calls[0]?.[0] as {
      select?: Record<string, unknown>;
      include?: Record<string, unknown>;
    };
    expect(arg.include).toBeUndefined();
    expect(Object.keys(arg.select!).sort()).toEqual(
      ["id", "magicTokenExpiresAt", "status", "tenantId"].sort()
    );

    // Heavy @db.Text blobs + all JSON payloads MUST be absent.
    for (const dropped of [
      "htmlContent",
      "visionSummary",
      "eventSummary",
      "menuSections",
      "servicePlan",
      "pricingBreakdown",
      "timeline",
      "upgradeOptions",
      "notes",
      "nextSteps",
      "title",
      "version",
      "depositAmount",
    ]) {
      expect(arg.select![dropped]).toBeUndefined();
    }

    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "ProposalDraft", command: "approve" })
    );
  });

  it("returns 404 for an unknown token before any governed write", async () => {
    vi.mocked(database.proposalDraft.findFirst).mockResolvedValue(
      null as never
    );
    const res = await POST(req("POST", "unknown", { action: "approve" }), {
      params: Promise.resolve({ token: "unknown" }),
    });
    expect(res.status).toBe(404);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("returns 400 (already approved) and skips the governed transition", async () => {
    vi.mocked(database.proposalDraft.findFirst).mockResolvedValue(
      fullDraft({ status: "approved" }) as never
    );
    const res = await POST(req("POST", TOKEN, { action: "approve" }), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res.status).toBe(400);
    expect(runCommand).not.toHaveBeenCalled();
    expect(database.proposalAction.create).not.toHaveBeenCalled();
  });

  it("returns 410 when the magic token has expired", async () => {
    vi.mocked(database.proposalDraft.findFirst).mockResolvedValue(
      fullDraft({ status: "sent", magicTokenExpiresAt: PAST }) as never
    );
    const res = await POST(req("POST", TOKEN, { action: "approve" }), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res.status).toBe(410);
    expect(runCommand).not.toHaveBeenCalled();
  });
});
