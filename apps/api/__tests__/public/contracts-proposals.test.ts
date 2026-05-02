/**
 * Public Contracts & Proposals API Tests
 *
 * Tests 4 public-facing endpoints that do NOT require authentication:
 *   - GET  /api/public/contracts/[token]       — view contract by signing token
 *   - POST /api/public/contracts/[token]/sign   — sign a contract
 *   - GET  /api/public/proposals/[token]        — view proposal by public token
 *   - POST /api/public/proposals/[token]/respond — accept or reject a proposal
 *
 * Covers success, expiry (410), not-found (404), validation (400),
 * already-signed/responded (400), and error handling (500).
 *
 * @vitest-environment node
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — these routes do NOT use auth(); they are public token-based
// ---------------------------------------------------------------------------

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("@/lib/database", async () => {
  const mod =
    await vi.importActual<typeof import("@repo/database")>("@repo/database");
  return mod;
});

// ---------------------------------------------------------------------------
// Route handlers — imported after mocks are in place
// ---------------------------------------------------------------------------

const contractGet = (await import("@/app/api/public/contracts/[token]/route"))
  .GET;

const contractSign = (
  await import("@/app/api/public/contracts/[token]/sign/route")
).POST;

const proposalGet = (await import("@/app/api/public/proposals/[token]/route"))
  .GET;

const proposalRespond = (
  await import("@/app/api/public/proposals/[token]/respond/route")
).POST;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOKEN = "sign-token-abc-123";
const EXPIRED_TOKEN = "expired-token-xyz-789";
const MISSING_TOKEN = "missing-token-000";
const TENANT_ID = "t0000000-0000-4000-a000-000000000001";
const CONTRACT_ID = "c0000000-0000-4000-a000-000000000001";
const EVENT_ID = "e0000000-0000-4000-a000-000000000001";
const CLIENT_ID = "cl000000-0000-4000-a000-000000000001";
const SIGNATURE_ID = "s0000000-0000-4000-a000-000000000001";
const PROPOSAL_ID = "p0000000-0000-4000-a000-000000000001";

const PAST_DATE = new Date("2020-01-01T00:00:00.000Z");
const FUTURE_DATE = new Date("2099-12-31T23:59:59.000Z");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockContractGetRequest(token: string): NextRequest {
  return new NextRequest(
    new URL(`http://localhost:2223/api/public/contracts/${token}`)
  );
}

function mockSignRequest(
  token: string,
  body: Record<string, unknown>,
  headers?: Record<string, string>
): NextRequest {
  const req = new NextRequest(
    new URL(`http://localhost:2223/api/public/contracts/${token}/sign`),
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", ...headers },
    }
  );
  return req;
}

function mockProposalGetRequest(token: string): NextRequest {
  return new NextRequest(
    new URL(`http://localhost:2223/api/public/proposals/${token}`)
  );
}

function mockRespondRequest(
  token: string,
  body: Record<string, unknown>
): NextRequest {
  return new NextRequest(
    new URL(`http://localhost:2223/api/public/proposals/${token}/respond`),
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }
  );
}

function makeParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

// ---------------------------------------------------------------------------
// Reset all mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks();
});

// ===========================================================================
// 1. GET /api/public/contracts/[token]
// ===========================================================================

describe("GET /api/public/contracts/[token]", () => {
  it("returns 200 with contract details, event, client, and signatures", async () => {
    const contract = {
      id: CONTRACT_ID,
      title: "Catering Agreement",
      status: "sent",
      documentUrl: "https://example.com/contract.pdf",
      documentType: "pdf",
      notes: "Please sign before the event",
      expiresAt: FUTURE_DATE,
      createdAt: new Date("2025-06-01"),
      contractNumber: "CTR-2025-001",
      tenantId: TENANT_ID,
    } as never;

    // First findFirst call — the main contract query
    vi.mocked(database.eventContract.findFirst)
      .mockResolvedValueOnce(contract) // main select
      .mockResolvedValueOnce({ id: EVENT_ID } as never) // eventId lookup
      .mockResolvedValueOnce({ id: CLIENT_ID } as never); // clientId lookup

    vi.mocked(database.event.findFirst).mockResolvedValueOnce({
      title: "Summer Gala",
      eventDate: new Date("2025-08-15"),
      venueName: "Grand Ballroom",
    } as never);

    vi.mocked(database.$queryRaw).mockResolvedValueOnce([
      {
        company_name: "Acme Corp",
        first_name: "Jane",
        last_name: "Doe",
        email: "jane@acme.com",
      },
    ]);

    vi.mocked(database.contractSignature.findMany).mockResolvedValueOnce([
      {
        id: SIGNATURE_ID,
        signerName: "Bob Smith",
        signerEmail: "bob@acme.com",
        signedAt: new Date("2025-06-10"),
      },
    ] as never);

    vi.mocked(database.account.findFirst).mockResolvedValueOnce({
      name: "Best Catering Co",
    } as never);

    const res = await contractGet(
      mockContractGetRequest(TOKEN),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.contract.id).toBe(CONTRACT_ID);
    expect(json.contract.title).toBe("Catering Agreement");
    expect(json.event.title).toBe("Summer Gala");
    expect(json.client.company_name).toBe("Acme Corp");
    expect(json.signatures).toHaveLength(1);
    expect(json.organization).toBe("Best Catering Co");
  });

  it("returns 404 when contract is not found", async () => {
    vi.mocked(database.eventContract.findFirst).mockResolvedValueOnce(null);

    const res = await contractGet(
      mockContractGetRequest(MISSING_TOKEN),
      makeParams(MISSING_TOKEN)
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.message).toBe("Contract not found or link has expired");
  });

  it("returns 410 when contract has expired", async () => {
    vi.mocked(database.eventContract.findFirst).mockResolvedValueOnce({
      id: CONTRACT_ID,
      title: "Old Contract",
      status: "sent",
      documentUrl: null,
      documentType: null,
      notes: null,
      expiresAt: PAST_DATE,
      createdAt: new Date("2024-01-01"),
      contractNumber: "CTR-2024-099",
      tenantId: TENANT_ID,
    } as never);

    const res = await contractGet(
      mockContractGetRequest(EXPIRED_TOKEN),
      makeParams(EXPIRED_TOKEN)
    );

    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.message).toBe("This contract has expired");
    expect(json.expired).toBe(true);
  });

  it("returns contract without client when clientId is null", async () => {
    vi.mocked(database.eventContract.findFirst)
      .mockResolvedValueOnce({
        id: CONTRACT_ID,
        title: "No Client Contract",
        status: "draft",
        documentUrl: null,
        documentType: null,
        notes: null,
        expiresAt: FUTURE_DATE,
        createdAt: new Date("2025-06-01"),
        contractNumber: "CTR-2025-002",
        tenantId: TENANT_ID,
      } as never)
      .mockResolvedValueOnce({ eventId: null } as never)
      .mockResolvedValueOnce(null); // clientId is null

    vi.mocked(database.event.findFirst).mockResolvedValueOnce(null);
    vi.mocked(database.contractSignature.findMany).mockResolvedValueOnce([]);
    vi.mocked(database.account.findFirst).mockResolvedValueOnce(null);

    const res = await contractGet(
      mockContractGetRequest(TOKEN),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.client).toBeNull();
    expect(json.organization).toBe("Unknown Organization");
  });

  it("returns 500 on unexpected database error", async () => {
    vi.mocked(database.eventContract.findFirst).mockRejectedValueOnce(
      new Error("connection refused")
    );

    const res = await contractGet(
      mockContractGetRequest(TOKEN),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.message).toBe("Internal server error");
  });
});

// ===========================================================================
// 2. POST /api/public/contracts/[token]/sign
// ===========================================================================

describe("POST /api/public/contracts/[token]/sign", () => {
  it("signs a contract successfully and returns signature info", async () => {
    const contract = {
      id: CONTRACT_ID,
      tenantId: TENANT_ID,
      status: "sent",
      expiresAt: FUTURE_DATE,
      signingToken: TOKEN,
      deletedAt: null,
    } as never;

    vi.mocked(database.eventContract.findFirst).mockResolvedValueOnce(contract);

    vi.mocked(database.contractSignature.create).mockResolvedValueOnce({
      id: SIGNATURE_ID,
      signerName: "Jane Doe",
      signerEmail: "jane@acme.com",
      signedAt: new Date("2025-06-15"),
    } as never);

    vi.mocked(database.eventContract.update).mockResolvedValueOnce({
      id: CONTRACT_ID,
      status: "signed",
    } as never);

    const res = await contractSign(
      mockSignRequest(
        TOKEN,
        {
          signatureData: "data:image/png;base64,abc123",
          signerName: "Jane Doe",
          signerEmail: "jane@acme.com",
        },
        { "x-forwarded-for": "203.0.113.50, 70.41.3.18" }
      ),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe("Contract signed successfully");
    expect(json.signature.signerName).toBe("Jane Doe");

    // Verify signature creation captured the IP
    expect(vi.mocked(database.contractSignature.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ipAddress: "203.0.113.50",
        }),
      })
    );

    // Verify contract was updated to signed
    expect(vi.mocked(database.eventContract.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "signed" }),
      })
    );
  });

  it("returns 400 when signatureData is missing", async () => {
    const res = await contractSign(
      mockSignRequest(TOKEN, {
        signerName: "Jane Doe",
      }),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe("Signature data and signer name are required");
  });

  it("returns 400 when signerName is missing", async () => {
    const res = await contractSign(
      mockSignRequest(TOKEN, {
        signatureData: "data:image/png;base64,abc123",
      }),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe("Signature data and signer name are required");
  });

  it("returns 404 when contract is not found", async () => {
    vi.mocked(database.eventContract.findFirst).mockResolvedValueOnce(null);

    const res = await contractSign(
      mockSignRequest(MISSING_TOKEN, {
        signatureData: "data:image/png/base64,abc123",
        signerName: "Jane Doe",
      }),
      makeParams(MISSING_TOKEN)
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.message).toBe("Contract not found or link has expired");
  });

  it("returns 410 when contract has expired", async () => {
    vi.mocked(database.eventContract.findFirst).mockResolvedValueOnce({
      id: CONTRACT_ID,
      tenantId: TENANT_ID,
      status: "sent",
      expiresAt: PAST_DATE,
      signingToken: EXPIRED_TOKEN,
      deletedAt: null,
    } as never);

    const res = await contractSign(
      mockSignRequest(EXPIRED_TOKEN, {
        signatureData: "data:image/png;base64,abc123",
        signerName: "Jane Doe",
      }),
      makeParams(EXPIRED_TOKEN)
    );

    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.message).toBe(
      "This contract has expired and can no longer be signed"
    );
  });

  it("returns 400 when contract is already signed", async () => {
    vi.mocked(database.eventContract.findFirst).mockResolvedValueOnce({
      id: CONTRACT_ID,
      tenantId: TENANT_ID,
      status: "signed",
      expiresAt: FUTURE_DATE,
      signingToken: TOKEN,
      deletedAt: null,
    } as never);

    const res = await contractSign(
      mockSignRequest(TOKEN, {
        signatureData: "data:image/png;base64,abc123",
        signerName: "Jane Doe",
      }),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe("This contract has already been signed");
  });

  it("returns 400 when contract is cancelled", async () => {
    vi.mocked(database.eventContract.findFirst).mockResolvedValueOnce({
      id: CONTRACT_ID,
      tenantId: TENANT_ID,
      status: "cancelled",
      expiresAt: FUTURE_DATE,
      signingToken: TOKEN,
      deletedAt: null,
    } as never);

    const res = await contractSign(
      mockSignRequest(TOKEN, {
        signatureData: "data:image/png;base64,abc123",
        signerName: "Jane Doe",
      }),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe(
      "This contract is cancelled and cannot be signed"
    );
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", async () => {
    vi.mocked(database.eventContract.findFirst).mockResolvedValueOnce({
      id: CONTRACT_ID,
      tenantId: TENANT_ID,
      status: "sent",
      expiresAt: FUTURE_DATE,
      signingToken: TOKEN,
      deletedAt: null,
    } as never);

    vi.mocked(database.contractSignature.create).mockResolvedValueOnce({
      id: SIGNATURE_ID,
      signerName: "Jane Doe",
      signedAt: new Date("2025-06-15"),
    } as never);

    vi.mocked(database.eventContract.update).mockResolvedValueOnce({
      id: CONTRACT_ID,
      status: "signed",
    } as never);

    await contractSign(
      mockSignRequest(
        TOKEN,
        {
          signatureData: "data:image/png;base64,abc123",
          signerName: "Jane Doe",
        },
        { "x-real-ip": "10.0.0.1" }
      ),
      makeParams(TOKEN)
    );

    expect(vi.mocked(database.contractSignature.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ipAddress: "10.0.0.1" }),
      })
    );
  });

  it("returns 500 on database error during signing", async () => {
    vi.mocked(database.eventContract.findFirst).mockRejectedValueOnce(
      new Error("db failure")
    );

    const res = await contractSign(
      mockSignRequest(TOKEN, {
        signatureData: "data:image/png;base64,abc123",
        signerName: "Jane Doe",
      }),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.message).toBe("Failed to sign contract");
  });
});

// ===========================================================================
// 3. GET /api/public/proposals/[token]
// ===========================================================================

describe("GET /api/public/proposals/[token]", () => {
  const proposalRecord = {
    id: PROPOSAL_ID,
    tenantId: TENANT_ID,
    proposalNumber: "PROP-2025-001",
    title: "Summer Gala Proposal",
    status: "sent",
    eventDate: new Date("2025-08-15"),
    eventType: "Corporate",
    guestCount: 150,
    venueName: "Grand Ballroom",
    venueAddress: "123 Main St",
    subtotal: 5000 as never,
    taxRate: 0.08 as never,
    taxAmount: 400 as never,
    discountAmount: 200 as never,
    total: 5200 as never,
    notes: "Includes vegan options",
    termsAndConditions: "Payment due in 30 days",
    validUntil: FUTURE_DATE,
    sentAt: new Date("2025-06-01"),
    viewedAt: null,
    acceptedAt: null,
    rejectedAt: null,
    clientId: CLIENT_ID,
    leadId: null,
    eventId: EVENT_ID,
  } as never;

  it("returns 200 with proposal details, line items, client, and event", async () => {
    vi.mocked(database.proposal.findFirst).mockResolvedValueOnce(
      proposalRecord
    );

    vi.mocked(database.proposalLineItem.findMany).mockResolvedValueOnce([
      {
        id: "li-001",
        itemType: "service",
        category: "catering",
        description: "Full dinner service",
        quantity: 150,
        unitOfMeasure: "guests",
        unitPrice: 30,
        totalPrice: 4500 as never,
        sortOrder: 1,
      },
    ] as never);

    // Client query
    vi.mocked(database.$queryRaw)
      .mockResolvedValueOnce([
        {
          company_name: "Acme Corp",
          first_name: "Jane",
          last_name: "Doe",
          email: "jane@acme.com",
          phone: "555-0100",
        },
      ])
      .mockResolvedValueOnce([
        // Event query
        {
          title: "Summer Gala",
          event_date: new Date("2025-08-15"),
          venue_name: "Grand Ballroom",
        },
      ]);

    vi.mocked(database.account.findFirst).mockResolvedValueOnce({
      name: "Best Catering Co",
    } as never);

    vi.mocked(database.proposal.update).mockResolvedValueOnce({
      id: PROPOSAL_ID,
      status: "viewed",
    } as never);

    const res = await proposalGet(
      mockProposalGetRequest(TOKEN),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.proposal.id).toBe(PROPOSAL_ID);
    expect(json.proposal.title).toBe("Summer Gala Proposal");
    expect(json.lineItems).toHaveLength(1);
    expect(json.lineItems[0].totalPrice).toBe(4500);
    expect(json.client.company_name).toBe("Acme Corp");
    expect(json.event.title).toBe("Summer Gala");
    expect(json.organization).toBe("Best Catering Co");
  });

  it("updates viewedAt and transitions status from 'sent' to 'viewed' on first view", async () => {
    vi.mocked(database.proposal.findFirst).mockResolvedValueOnce(
      proposalRecord
    );
    vi.mocked(database.proposalLineItem.findMany).mockResolvedValueOnce([]);
    vi.mocked(database.$queryRaw)
      .mockResolvedValueOnce([]) // client
      .mockResolvedValueOnce([]); // event
    vi.mocked(database.account.findFirst).mockResolvedValueOnce({
      name: "Test Org",
    } as never);
    vi.mocked(database.proposal.update).mockResolvedValueOnce({
      id: PROPOSAL_ID,
      status: "viewed",
    } as never);

    await proposalGet(mockProposalGetRequest(TOKEN), makeParams(TOKEN));

    expect(vi.mocked(database.proposal.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          viewedAt: expect.any(Date),
          status: "viewed",
        }),
      })
    );
  });

  it("does NOT update viewedAt when already viewed", async () => {
    const viewedProposal = {
      id: PROPOSAL_ID,
      tenantId: TENANT_ID,
      proposalNumber: "PROP-2025-001",
      title: "Summer Gala Proposal",
      status: "viewed",
      eventDate: new Date("2025-08-15"),
      eventType: "Corporate",
      guestCount: 150,
      venueName: "Grand Ballroom",
      venueAddress: "123 Main St",
      subtotal: 5000 as never,
      taxRate: 0.08 as never,
      taxAmount: 400 as never,
      discountAmount: 200 as never,
      total: 5200 as never,
      notes: "Includes vegan options",
      termsAndConditions: "Payment due in 30 days",
      validUntil: FUTURE_DATE,
      sentAt: new Date("2025-06-01"),
      viewedAt: new Date("2025-06-10"),
      acceptedAt: null,
      rejectedAt: null,
      clientId: CLIENT_ID,
      leadId: null,
      eventId: EVENT_ID,
    } as never;

    vi.mocked(database.proposal.findFirst).mockResolvedValueOnce(
      viewedProposal
    );
    vi.mocked(database.proposalLineItem.findMany).mockResolvedValueOnce([]);
    vi.mocked(database.$queryRaw)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vi.mocked(database.account.findFirst).mockResolvedValueOnce({
      name: "Test Org",
    } as never);

    await proposalGet(mockProposalGetRequest(TOKEN), makeParams(TOKEN));

    expect(vi.mocked(database.proposal.update)).not.toHaveBeenCalled();
  });

  it("returns 404 when proposal is not found", async () => {
    vi.mocked(database.proposal.findFirst).mockResolvedValueOnce(null);

    const res = await proposalGet(
      mockProposalGetRequest(MISSING_TOKEN),
      makeParams(MISSING_TOKEN)
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.message).toBe("Proposal not found or link has expired");
  });

  it("returns 410 when proposal has expired (validUntil in the past)", async () => {
    vi.mocked(database.proposal.findFirst).mockResolvedValueOnce({
      id: PROPOSAL_ID,
      tenantId: TENANT_ID,
      status: "viewed",
      validUntil: PAST_DATE,
    } as never);

    const res = await proposalGet(
      mockProposalGetRequest(EXPIRED_TOKEN),
      makeParams(EXPIRED_TOKEN)
    );

    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.message).toBe("This proposal has expired");
    expect(json.expired).toBe(true);
  });

  it("fetches lead details when client is null", async () => {
    const proposalNoClient = {
      id: PROPOSAL_ID,
      tenantId: TENANT_ID,
      proposalNumber: "PROP-2025-001",
      title: "Summer Gala Proposal",
      status: "viewed",
      eventDate: new Date("2025-08-15"),
      eventType: "Corporate",
      guestCount: 150,
      venueName: "Grand Ballroom",
      venueAddress: "123 Main St",
      subtotal: 5000 as never,
      taxRate: 0.08 as never,
      taxAmount: 400 as never,
      discountAmount: 200 as never,
      total: 5200 as never,
      notes: "Includes vegan options",
      termsAndConditions: "Payment due in 30 days",
      validUntil: FUTURE_DATE,
      sentAt: new Date("2025-06-01"),
      viewedAt: new Date("2025-06-10"),
      acceptedAt: null,
      rejectedAt: null,
      clientId: null,
      leadId: "lead-001",
      eventId: EVENT_ID,
    } as never;

    vi.mocked(database.proposal.findFirst).mockResolvedValueOnce(
      proposalNoClient
    );
    vi.mocked(database.proposalLineItem.findMany).mockResolvedValueOnce([]);
    // clientId is null so no client $queryRaw call happens.
    // $queryRaw call order: lead (if !client && leadId), then event (if eventId)
    vi.mocked(database.$queryRaw)
      .mockResolvedValueOnce([
        // lead query
        {
          first_name: "Lead",
          last_name: "Person",
          email: "lead@test.com",
          phone: "555-0200",
        },
      ])
      .mockResolvedValueOnce([
        // event query
        {
          title: "Summer Gala",
          event_date: new Date("2025-08-15"),
          venue_name: "Grand Ballroom",
        },
      ]);
    vi.mocked(database.account.findFirst).mockResolvedValueOnce({
      name: "Test Org",
    } as never);
    vi.mocked(database.proposal.update).mockResolvedValueOnce({
      id: PROPOSAL_ID,
      status: "viewed",
    } as never);

    const res = await proposalGet(
      mockProposalGetRequest(TOKEN),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.client).toBeNull();
    expect(json.lead.first_name).toBe("Lead");
    expect(json.lead.email).toBe("lead@test.com");
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(database.proposal.findFirst).mockRejectedValueOnce(
      new Error("db connection lost")
    );

    const res = await proposalGet(
      mockProposalGetRequest(TOKEN),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.message).toBe("Internal server error");
  });
});

// ===========================================================================
// 4. POST /api/public/proposals/[token]/respond
// ===========================================================================

describe("POST /api/public/proposals/[token]/respond", () => {
  it("accepts a proposal successfully", async () => {
    vi.mocked(database.proposal.findFirst).mockResolvedValueOnce({
      id: PROPOSAL_ID,
      tenantId: TENANT_ID,
      status: "viewed",
      validUntil: FUTURE_DATE,
    } as never);

    vi.mocked(database.proposal.update).mockResolvedValueOnce({
      id: PROPOSAL_ID,
      status: "accepted",
      acceptedAt: new Date(),
      rejectedAt: null,
    } as never);

    vi.mocked(database.$executeRaw).mockResolvedValueOnce(undefined as never);

    const res = await proposalRespond(
      mockRespondRequest(TOKEN, {
        action: "accept",
        responderName: "Jane Doe",
        responderEmail: "jane@acme.com",
      }),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe("Proposal accepted successfully");
    expect(json.proposal.status).toBe("accepted");

    expect(vi.mocked(database.proposal.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "accepted",
          acceptedAt: expect.any(Date),
        }),
      })
    );
  });

  it("rejects a proposal successfully", async () => {
    vi.mocked(database.proposal.findFirst).mockResolvedValueOnce({
      id: PROPOSAL_ID,
      tenantId: TENANT_ID,
      status: "viewed",
      validUntil: FUTURE_DATE,
    } as never);

    vi.mocked(database.proposal.update).mockResolvedValueOnce({
      id: PROPOSAL_ID,
      status: "rejected",
      acceptedAt: null,
      rejectedAt: new Date(),
    } as never);

    vi.mocked(database.$executeRaw).mockResolvedValueOnce(undefined as never);

    const res = await proposalRespond(
      mockRespondRequest(TOKEN, {
        action: "reject",
        responderName: "Jane Doe",
        responderEmail: "jane@acme.com",
        notes: "Budget too high",
      }),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe("Proposal rejected successfully");
    expect(json.proposal.status).toBe("rejected");

    expect(vi.mocked(database.proposal.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "rejected",
          rejectedAt: expect.any(Date),
        }),
      })
    );
  });

  it("returns 400 when action is missing", async () => {
    const res = await proposalRespond(
      mockRespondRequest(TOKEN, {
        responderName: "Jane Doe",
        responderEmail: "jane@acme.com",
      }),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe("Invalid action. Must be 'accept' or 'reject'");
  });

  it("returns 400 when action is not 'accept' or 'reject'", async () => {
    const res = await proposalRespond(
      mockRespondRequest(TOKEN, {
        action: "maybe",
        responderName: "Jane Doe",
        responderEmail: "jane@acme.com",
      }),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe("Invalid action. Must be 'accept' or 'reject'");
  });

  it("returns 400 when responderName is missing", async () => {
    const res = await proposalRespond(
      mockRespondRequest(TOKEN, {
        action: "accept",
        responderEmail: "jane@acme.com",
      }),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe("Responder name and email are required");
  });

  it("returns 400 when responderEmail is missing", async () => {
    const res = await proposalRespond(
      mockRespondRequest(TOKEN, {
        action: "accept",
        responderName: "Jane Doe",
      }),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe("Responder name and email are required");
  });

  it("returns 404 when proposal is not found", async () => {
    vi.mocked(database.proposal.findFirst).mockResolvedValueOnce(null);

    const res = await proposalRespond(
      mockRespondRequest(MISSING_TOKEN, {
        action: "accept",
        responderName: "Jane Doe",
        responderEmail: "jane@acme.com",
      }),
      makeParams(MISSING_TOKEN)
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.message).toBe("Proposal not found or link has expired");
  });

  it("returns 410 when proposal has expired", async () => {
    vi.mocked(database.proposal.findFirst).mockResolvedValueOnce({
      id: PROPOSAL_ID,
      tenantId: TENANT_ID,
      status: "viewed",
      validUntil: PAST_DATE,
    } as never);

    const res = await proposalRespond(
      mockRespondRequest(EXPIRED_TOKEN, {
        action: "accept",
        responderName: "Jane Doe",
        responderEmail: "jane@acme.com",
      }),
      makeParams(EXPIRED_TOKEN)
    );

    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.message).toBe("This proposal has expired");
    expect(json.expired).toBe(true);
  });

  it("returns 400 when proposal is already accepted", async () => {
    vi.mocked(database.proposal.findFirst).mockResolvedValueOnce({
      id: PROPOSAL_ID,
      tenantId: TENANT_ID,
      status: "accepted",
      validUntil: FUTURE_DATE,
    } as never);

    const res = await proposalRespond(
      mockRespondRequest(TOKEN, {
        action: "accept",
        responderName: "Jane Doe",
        responderEmail: "jane@acme.com",
      }),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe("This proposal has already been accepted");
  });

  it("returns 400 when proposal is already rejected", async () => {
    vi.mocked(database.proposal.findFirst).mockResolvedValueOnce({
      id: PROPOSAL_ID,
      tenantId: TENANT_ID,
      status: "rejected",
      validUntil: FUTURE_DATE,
    } as never);

    const res = await proposalRespond(
      mockRespondRequest(TOKEN, {
        action: "accept",
        responderName: "Jane Doe",
        responderEmail: "jane@acme.com",
      }),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe("This proposal has already been rejected");
  });

  it("returns 400 when proposal status is 'expired'", async () => {
    vi.mocked(database.proposal.findFirst).mockResolvedValueOnce({
      id: PROPOSAL_ID,
      tenantId: TENANT_ID,
      status: "expired",
      validUntil: FUTURE_DATE,
    } as never);

    const res = await proposalRespond(
      mockRespondRequest(TOKEN, {
        action: "accept",
        responderName: "Jane Doe",
        responderEmail: "jane@acme.com",
      }),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe("This proposal has been expired");
  });

  it("returns 400 when proposal status is 'canceled'", async () => {
    vi.mocked(database.proposal.findFirst).mockResolvedValueOnce({
      id: PROPOSAL_ID,
      tenantId: TENANT_ID,
      status: "canceled",
      validUntil: FUTURE_DATE,
    } as never);

    const res = await proposalRespond(
      mockRespondRequest(TOKEN, {
        action: "reject",
        responderName: "Jane Doe",
        responderEmail: "jane@acme.com",
      }),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe("This proposal has been canceled");
  });

  it("creates an audit log entry on accept", async () => {
    vi.mocked(database.proposal.findFirst).mockResolvedValueOnce({
      id: PROPOSAL_ID,
      tenantId: TENANT_ID,
      status: "viewed",
      validUntil: FUTURE_DATE,
    } as never);

    vi.mocked(database.proposal.update).mockResolvedValueOnce({
      id: PROPOSAL_ID,
      status: "viewed",
    } as never);

    vi.mocked(database.$executeRaw).mockResolvedValueOnce(undefined as never);

    await proposalRespond(
      mockRespondRequest(TOKEN, {
        action: "accept",
        responderName: "Jane Doe",
        responderEmail: "jane@acme.com",
        notes: "Looking forward to it",
      }),
      makeParams(TOKEN)
    );

    expect(vi.mocked(database.$executeRaw)).toHaveBeenCalledTimes(1);
  });

  it("returns 500 on database error", async () => {
    vi.mocked(database.proposal.findFirst).mockRejectedValueOnce(
      new Error("connection reset")
    );

    const res = await proposalRespond(
      mockRespondRequest(TOKEN, {
        action: "accept",
        responderName: "Jane Doe",
        responderEmail: "jane@acme.com",
      }),
      makeParams(TOKEN)
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.message).toBe("Internal server error");
  });
});
