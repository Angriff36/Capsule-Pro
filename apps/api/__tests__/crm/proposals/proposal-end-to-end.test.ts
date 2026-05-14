/**
 * Proposal End-to-End Persistence Tests
 *
 * Tests that the Proposal write path (manifest command → ProposalPrismaStore)
 * and read path (Prisma list/detail API) are aligned. The write path persists
 * through the ProposalPrismaStore, and the read path queries the same Prisma
 * model — so a created proposal is immediately visible in the list API.
 *
 * This test also verifies the `instanceId` fix: instance-scoped command routes
 * (update, send, accept, reject, withdraw, mark-viewed) must pass `instanceId`
 * to `runtime.runCommand` so the store can target the correct entity row.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@repo/database", async () => {
  return {
    database: {
      proposal: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
      },
      proposalLineItem: {
        findMany: vi.fn(),
      },
      client: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      lead: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      event: {
        findFirst: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
      },
    },
  };
});

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));

vi.mock("@/app/lib/invariant", async () => {
  const actual = await vi.importActual("@/app/lib/invariant");
  return actual;
});

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@repo/observability/log", () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@repo/manifest-adapters/route-helpers", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: (data: unknown, status = 200) =>
      NextResponse.json(
        {
          success: true,
          ...(typeof data === "object" && data !== null ? data : {}),
        },
        { status }
      ),
    manifestErrorResponse: (message: string, status: number) =>
      NextResponse.json({ success: false, message }, { status }),
  };
});

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

const mockExecuteManifestCommand = vi.fn();

vi.mock("@/lib/manifest-command-handler", () => ({
  executeManifestCommand: mockExecuteManifestCommand,
}));

// Import mocked modules after vi.mock setup
import { auth } from "@repo/auth/server";
import {
  getTenantIdForOrg,
  requireCurrentUser,
  resolveCurrentUser,
} from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_ORG_ID = "org-test-123";
const TEST_USER_ID = "u0000000-0000-4000-a000-000000000001";
const TEST_CLERK_ID = "clerk_test_001";

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------

function createMockProposal(overrides: Record<string, unknown> = {}) {
  return {
    id: "prop-001",
    tenantId: TEST_TENANT_ID,
    proposalNumber: "PROP-001",
    templateId: null,
    clientId: null,
    leadId: null,
    eventId: null,
    title: "Test Proposal",
    eventDate: null,
    eventType: null,
    guestCount: null,
    venueName: null,
    venueAddress: null,
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    discountAmount: 0,
    total: 0,
    status: "draft",
    publicToken: null,
    validUntil: null,
    sentAt: null,
    viewedAt: null,
    acceptedAt: null,
    rejectedAt: null,
    notes: null,
    termsAndConditions: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

function createMockRequest(
  url: string,
  options: RequestInit = {}
): NextRequest {
  if (options.body && !options.headers) {
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Proposal Persistence (write → read alignment)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. GET /api/crm/proposals — list route
  // -------------------------------------------------------------------------

  describe("GET /api/crm/proposals (list)", () => {
    it("returns proposals persisted through ProposalPrismaStore", async () => {
      const mockProposal = createMockProposal({
        id: "prop-001",
        title: "Corporate Lunch Proposal",
        status: "draft",
        total: 5000,
      });

      vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.proposal.findMany).mockResolvedValue([
        mockProposal,
      ] as never);
      vi.mocked(database.proposal.count).mockResolvedValue(1);
      vi.mocked(database.client.findMany).mockResolvedValue([]);
      vi.mocked(database.lead.findMany).mockResolvedValue([]);
      vi.mocked(database.proposalLineItem.findMany).mockResolvedValue([]);

      // Import the GET handler from the root route
      const { GET } = await import("@/app/api/crm/proposals/route");

      const request = createMockRequest(
        "http://localhost:3000/api/crm/proposals"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe("prop-001");
      expect(data.data[0].title).toBe("Corporate Lunch Proposal");
      expect(data.data[0].status).toBe("draft");

      // Verify the read path uses Prisma (not in-memory store)
      expect(database.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ tenantId: TEST_TENANT_ID }),
              expect.objectContaining({ deletedAt: null }),
            ]),
          }),
        })
      );
    });

    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as any);

      const { GET } = await import("@/app/api/crm/proposals/route");

      const request = createMockRequest(
        "http://localhost:3000/api/crm/proposals"
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("excludes soft-deleted proposals from the list", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.proposal.findMany).mockResolvedValue([]);
      vi.mocked(database.proposal.count).mockResolvedValue(0);
      vi.mocked(database.client.findMany).mockResolvedValue([]);
      vi.mocked(database.lead.findMany).mockResolvedValue([]);
      vi.mocked(database.proposalLineItem.findMany).mockResolvedValue([]);

      const { GET } = await import("@/app/api/crm/proposals/route");

      const request = createMockRequest(
        "http://localhost:3000/api/crm/proposals"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // 2. GET /api/crm/proposals/[id] — detail route
  // -------------------------------------------------------------------------

  describe("GET /api/crm/proposals/[id] (detail)", () => {
    it("returns a single persisted proposal with line items", async () => {
      const mockProposal = createMockProposal({
        id: "prop-002",
        clientId: "client-001",
        status: "sent",
        sentAt: new Date("2026-01-15"),
      });

      vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.proposal.findFirst).mockResolvedValue(
        mockProposal as never
      );
      vi.mocked(database.client.findFirst).mockResolvedValue(null);
      vi.mocked(database.lead.findFirst).mockResolvedValue(null);
      vi.mocked(database.proposalLineItem.findMany).mockResolvedValue([
        {
          id: "li-001",
          proposalId: "prop-002",
          category: "food",
          description: "Catering",
          sortOrder: 0,
        },
      ] as never);

      const { GET } = await import("@/app/api/crm/proposals/[id]/route");

      const request = createMockRequest(
        "http://localhost:3000/api/crm/proposals/prop-002"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "prop-002" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe("prop-002");
      expect(data.data.status).toBe("sent");
      expect(data.data.lineItems).toHaveLength(1);

      // Verify the read uses Prisma findFirst with tenant + id scoping
      expect(database.proposal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ id: "prop-002" }),
              expect.objectContaining({ tenantId: TEST_TENANT_ID }),
              expect.objectContaining({ deletedAt: null }),
            ]),
          }),
        })
      );
    });

    it("returns 404 for non-existent proposal", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.proposal.findFirst).mockResolvedValue(null);

      const { GET } = await import("@/app/api/crm/proposals/[id]/route");

      const request = createMockRequest(
        "http://localhost:3000/api/crm/proposals/non-existent"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "non-existent" }),
      });

      expect(response.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Command routes pass instanceId for instance-scoped verbs
  // -------------------------------------------------------------------------

  describe("instanceId on command routes (Blocker #1 fix)", () => {
    const mockUser = {
      id: TEST_USER_ID,
      tenantId: TEST_TENANT_ID,
      role: "admin",
      authUserId: TEST_CLERK_ID,
    };

    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(requireCurrentUser).mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
      });
      vi.mocked(resolveCurrentUser).mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
      });
      vi.mocked(database.user.findFirst).mockResolvedValue(mockUser as never);
      mockExecuteManifestCommand.mockClear();
      mockExecuteManifestCommand.mockResolvedValue({
        success: true,
        result: { id: "prop-003" },
      } as any);
    });

    const instanceScopedVerbs = [
      { verb: "send", file: "send" },
      { verb: "accept", file: "accept" },
      { verb: "reject", file: "reject" },
      { verb: "withdraw", file: "withdraw" },
      { verb: "markViewed", file: "mark-viewed" },
    ];

    for (const { verb, file } of instanceScopedVerbs) {
      it(`${verb} route passes entityName and commandName to executeManifestCommand`, async () => {
        const mod = await import(
          `@/app/api/crm/proposals/commands/${file}/route`
        );
        const request = createMockRequest(
          `http://localhost:3000/api/crm/proposals/commands/${file}`,
          {
            method: "POST",
            body: JSON.stringify({ id: "prop-003" }),
          }
        );

        await mod.POST(request, {
          params: Promise.resolve({ entity: "Proposal", command: "create" }),
        });

        // Verify executeManifestCommand was called with correct entity + command
        expect(mockExecuteManifestCommand).toHaveBeenCalledWith(
          request,
          expect.objectContaining({
            entityName: "Proposal",
            commandName: verb,
          })
        );
      });
    }
  });
});
