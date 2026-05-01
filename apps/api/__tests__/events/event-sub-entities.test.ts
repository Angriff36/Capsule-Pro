/**
 * Event Sub-Entities API Integration Tests
 *
 * Tests 8 event-related command domains:
 *   - EventGuest: create, update, softDelete
 *   - EventStaff: assign, unassign
 *   - EventDish: create, remove
 *   - EventReport: create, submit, approve, complete
 *   - EventProfitability: create, update, recalculate
 *   - EventSummary: create, update, refresh
 *   - EventImportWorkflow: create, cancel, fail, pause, resume, retry,
 *     startExtracting, completeExtraction, startParsing, completeParsing,
 *     startValidating, completeValidation, startProposing, completeProposing,
 *     startReserving, completeReserving, startActivating, completeActivating
 *   - ContractSignature: create, softDelete
 *
 * Validates auth gating (401), tenant resolution (400), command dispatch
 * success (200), policy denial (403), guard failure (422), general command
 * failure (400), and internal error handling (500).
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks - all route handlers share the same dependency surface
// ---------------------------------------------------------------------------

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// The manifest runtime is the command gateway; mock its factory so each
// test can program the mock runCommand return value.
const mockRunCommand = vi.fn();
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(() =>
    Promise.resolve({ runCommand: mockRunCommand })
  ),
}));

// Import mocked modules after vi.mock setup
const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000030";
const TEST_OTHER_TENANT_ID = "00000000-0000-0000-0000-000000000099";
const TEST_USER_ID = "user_test_event_sub";
const TEST_ORG_ID = "org_test_event_sub";
const TEST_EVENT_ID = "e0000000-0000-4000-a000-000000000030";
const TEST_GUEST_ID = "g0000000-0000-4000-a000-000000000030";
const TEST_STAFF_ID = "s0000000-0000-4000-a000-000000000030";
const TEST_DISH_ID = "d0000000-0000-4000-a000-000000000031";
const TEST_EVENT_DISH_ID = "ed000000-0000-4000-a000-000000000030";
const TEST_REPORT_ID = "r0000000-0000-4000-a000-000000000030";
const TEST_PROFITABILITY_ID = "p0000000-0000-4000-a000-000000000030";
const TEST_SUMMARY_ID = "su000000-0000-4000-a000-000000000030";
const TEST_WORKFLOW_ID = "w0000000-0000-4000-a000-000000000030";
const TEST_SIGNATURE_ID = "cs000000-0000-4000-a000-000000000030";
const TEST_CONTRACT_ID = "ct000000-0000-4000-a000-000000000030";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockRequest(url: string, options: RequestInit = {}): NextRequest {
  if (options.body && !options.headers) {
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

function setupAuth() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
}

function setupUnauthenticated() {
  vi.mocked(auth).mockResolvedValue({
    orgId: null,
    userId: null,
  } as never);
}

function setupNoTenant() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);
}

function setupSuccessResult(data: Record<string, unknown>, events: Array<{ type: string; payload?: Record<string, unknown> }> = []) {
  mockRunCommand.mockResolvedValueOnce({
    success: true,
    result: data,
    emittedEvents: events,
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Event Sub-Entities API Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // EventGuest (3 commands: create, update, softDelete)
  // =========================================================================

  describe("EventGuest Command Routes", () => {
    const GUEST_BASE = "/api/eventguest";
    const mockGuest = {
      tenantId: TEST_TENANT_ID,
      id: TEST_GUEST_ID,
      eventId: TEST_EVENT_ID,
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "+1234567890",
      rsvpStatus: "pending",
      dietaryRestrictions: null,
      plusOne: false,
      tableAssignment: null,
      createdAt: new Date("2026-01-15"),
      updatedAt: new Date("2026-01-15"),
      deletedAt: null,
    };

    // -- Auth gating --
    describe("Authentication gating", () => {
      it("create returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventguest/create/route");
        const req = createMockRequest(`${GUEST_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID, name: "Jane" }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("update returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventguest/update/route");
        const req = createMockRequest(`${GUEST_BASE}/update`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_GUEST_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });

      it("soft-delete returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventguest/soft-delete/route");
        const req = createMockRequest(`${GUEST_BASE}/soft-delete`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_GUEST_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });
    });

    // -- Tenant resolution --
    describe("Tenant resolution", () => {
      it("create returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/eventguest/create/route");
        const req = createMockRequest(`${GUEST_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Tenant not found");
      });

      it("update returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/eventguest/update/route");
        const req = createMockRequest(`${GUEST_BASE}/update`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_GUEST_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
      });

      it("soft-delete returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/eventguest/soft-delete/route");
        const req = createMockRequest(`${GUEST_BASE}/soft-delete`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_GUEST_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
      });
    });

    // -- Success --
    describe("POST /api/eventguest/create - success", () => {
      it("creates a guest and returns 200 with result and events", async () => {
        setupAuth();
        setupSuccessResult(mockGuest, [{ type: "GuestCreated", payload: { id: TEST_GUEST_ID } }]);

        const { POST } = await import("@/app/api/eventguest/create/route");
        const req = createMockRequest(`${GUEST_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID, name: "Jane Doe", email: "jane@example.com" }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.id).toBe(TEST_GUEST_ID);
        expect(body.events).toHaveLength(1);
        expect(body.events[0].type).toBe("GuestCreated");
        expect(mockRunCommand).toHaveBeenCalledWith("create", expect.any(Object), { entityName: "EventGuest" });
      });
    });

    describe("POST /api/eventguest/update - success", () => {
      it("updates a guest and returns 200", async () => {
        setupAuth();
        const updated = { ...mockGuest, rsvpStatus: "confirmed" };
        setupSuccessResult(updated);

        const { POST } = await import("@/app/api/eventguest/update/route");
        const req = createMockRequest(`${GUEST_BASE}/update`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_GUEST_ID, rsvpStatus: "confirmed" }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.rsvpStatus).toBe("confirmed");
        expect(mockRunCommand).toHaveBeenCalledWith("update", expect.any(Object), { entityName: "EventGuest" });
      });
    });

    describe("POST /api/eventguest/soft-delete - success", () => {
      it("soft-deletes a guest and returns 200", async () => {
        setupAuth();
        const deleted = { ...mockGuest, deletedAt: new Date("2026-02-01") };
        setupSuccessResult(deleted);

        const { POST } = await import("@/app/api/eventguest/soft-delete/route");
        const req = createMockRequest(`${GUEST_BASE}/soft-delete`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_GUEST_ID }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.deletedAt).not.toBeNull();
        expect(mockRunCommand).toHaveBeenCalledWith("softDelete", expect.any(Object), { entityName: "EventGuest" });
      });
    });

    // -- Error handling --
    describe("Error handling", () => {
      it("create returns 500 when runtime throws", async () => {
        setupAuth();
        mockRunCommand.mockRejectedValueOnce(new Error("DB connection lost"));

        const { POST } = await import("@/app/api/eventguest/create/route");
        const req = createMockRequest(`${GUEST_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Internal server error");
      });

      it("create returns 403 on policy denial", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          policyDenial: { policyName: "guestManagerOnly", formatted: "Not authorized" },
        });

        const { POST } = await import("@/app/api/eventguest/create/route");
        const req = createMockRequest(`${GUEST_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.message).toContain("Access denied");
        expect(body.message).toContain("guestManagerOnly");
      });

      it("update returns 422 on guard failure", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          guardFailure: { index: 0, formatted: "Guest already checked in" },
        });

        const { POST } = await import("@/app/api/eventguest/update/route");
        const req = createMockRequest(`${GUEST_BASE}/update`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_GUEST_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(422);
        const body = await res.json();
        expect(body.message).toContain("Guard 0 failed");
      });

      it("update returns 400 on general command failure", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          error: "Guest not found",
        });

        const { POST } = await import("@/app/api/eventguest/update/route");
        const req = createMockRequest(`${GUEST_BASE}/update`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_GUEST_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toBe("Guest not found");
      });

      it("update returns 400 with default message when error is null", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          error: null,
        });

        const { POST } = await import("@/app/api/eventguest/update/route");
        const req = createMockRequest(`${GUEST_BASE}/update`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_GUEST_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toBe("Command failed");
      });
    });

    // -- Tenant isolation --
    describe("Tenant isolation", () => {
      it("passes correct tenant id to runtime context", async () => {
        setupAuth();
        setupSuccessResult(mockGuest);

        const { createManifestRuntime } = await import("@/lib/manifest-runtime");
        const { POST } = await import("@/app/api/eventguest/create/route");
        const req = createMockRequest(`${GUEST_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });

        await POST(req);

        expect(vi.mocked(createManifestRuntime)).toHaveBeenCalledWith({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        });
      });
    });
  });

  // =========================================================================
  // EventStaff (2 commands: assign, unassign)
  // =========================================================================

  describe("EventStaff Command Routes", () => {
    const STAFF_BASE = "/api/eventstaff";
    const mockStaff = {
      tenantId: TEST_TENANT_ID,
      id: TEST_STAFF_ID,
      eventId: TEST_EVENT_ID,
      userId: TEST_USER_ID,
      role: "server",
      assignedAt: new Date("2026-01-15"),
      removedAt: null,
    };

    describe("Authentication gating", () => {
      it("assign returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventstaff/assign/route");
        const req = createMockRequest(`${STAFF_BASE}/assign`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID, userId: TEST_USER_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });

      it("unassign returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventstaff/unassign/route");
        const req = createMockRequest(`${STAFF_BASE}/unassign`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_STAFF_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });
    });

    describe("Tenant resolution", () => {
      it("assign returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/eventstaff/assign/route");
        const req = createMockRequest(`${STAFF_BASE}/assign`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
      });

      it("unassign returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/eventstaff/unassign/route");
        const req = createMockRequest(`${STAFF_BASE}/unassign`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_STAFF_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
      });
    });

    describe("POST /api/eventstaff/assign - success", () => {
      it("assigns staff to an event and returns 200", async () => {
        setupAuth();
        setupSuccessResult(mockStaff, [{ type: "StaffAssigned", payload: { id: TEST_STAFF_ID } }]);

        const { POST } = await import("@/app/api/eventstaff/assign/route");
        const req = createMockRequest(`${STAFF_BASE}/assign`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID, userId: TEST_USER_ID, role: "server" }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.id).toBe(TEST_STAFF_ID);
        expect(body.result.role).toBe("server");
        expect(body.events[0].type).toBe("StaffAssigned");
        expect(mockRunCommand).toHaveBeenCalledWith("assign", expect.any(Object), { entityName: "EventStaff" });
      });
    });

    describe("POST /api/eventstaff/unassign - success", () => {
      it("unassigns staff from an event and returns 200", async () => {
        setupAuth();
        const unassigned = { ...mockStaff, removedAt: new Date("2026-01-20") };
        setupSuccessResult(unassigned);

        const { POST } = await import("@/app/api/eventstaff/unassign/route");
        const req = createMockRequest(`${STAFF_BASE}/unassign`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_STAFF_ID }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.removedAt).not.toBeNull();
        expect(mockRunCommand).toHaveBeenCalledWith("unassign", expect.any(Object), { entityName: "EventStaff" });
      });
    });

    describe("Error handling", () => {
      it("assign returns 500 when runtime throws", async () => {
        setupAuth();
        mockRunCommand.mockRejectedValueOnce(new Error("DB error"));

        const { POST } = await import("@/app/api/eventstaff/assign/route");
        const req = createMockRequest(`${STAFF_BASE}/assign`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
      });

      it("assign returns 403 on policy denial", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          policyDenial: { policyName: "eventManagerOnly", formatted: "Not an event manager" },
        });

        const { POST } = await import("@/app/api/eventstaff/assign/route");
        const req = createMockRequest(`${STAFF_BASE}/assign`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(403);
      });

      it("unassign returns 422 on guard failure", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          guardFailure: { index: 0, formatted: "Staff already removed" },
        });

        const { POST } = await import("@/app/api/eventstaff/unassign/route");
        const req = createMockRequest(`${STAFF_BASE}/unassign`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_STAFF_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(422);
      });
    });
  });

  // =========================================================================
  // EventDish (2 commands: create, remove)
  // =========================================================================

  describe("EventDish Command Routes", () => {
    const DISH_BASE = "/api/eventdish";
    const mockEventDish = {
      tenantId: TEST_TENANT_ID,
      id: TEST_EVENT_DISH_ID,
      eventId: TEST_EVENT_ID,
      dishId: TEST_DISH_ID,
      quantity: 50,
      notes: "Gluten-free version",
      servingTime: "18:00",
      createdAt: new Date("2026-01-15"),
    };

    describe("Authentication gating", () => {
      it("create returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventdish/create/route");
        const req = createMockRequest(`${DISH_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID, dishId: TEST_DISH_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });

      it("remove returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventdish/remove/route");
        const req = createMockRequest(`${DISH_BASE}/remove`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_EVENT_DISH_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });
    });

    describe("Tenant resolution", () => {
      it("create returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/eventdish/create/route");
        const req = createMockRequest(`${DISH_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
      });

      it("remove returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/eventdish/remove/route");
        const req = createMockRequest(`${DISH_BASE}/remove`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_EVENT_DISH_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
      });
    });

    describe("POST /api/eventdish/create - success", () => {
      it("adds a dish to an event and returns 200", async () => {
        setupAuth();
        setupSuccessResult(mockEventDish, [{ type: "DishAdded", payload: { id: TEST_EVENT_DISH_ID } }]);

        const { POST } = await import("@/app/api/eventdish/create/route");
        const req = createMockRequest(`${DISH_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID, dishId: TEST_DISH_ID, quantity: 50 }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.dishId).toBe(TEST_DISH_ID);
        expect(body.result.quantity).toBe(50);
        expect(mockRunCommand).toHaveBeenCalledWith("create", expect.any(Object), { entityName: "EventDish" });
      });
    });

    describe("POST /api/eventdish/remove - success", () => {
      it("removes a dish from an event and returns 200", async () => {
        setupAuth();
        setupSuccessResult({ id: TEST_EVENT_DISH_ID, removed: true });

        const { POST } = await import("@/app/api/eventdish/remove/route");
        const req = createMockRequest(`${DISH_BASE}/remove`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_EVENT_DISH_ID }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockRunCommand).toHaveBeenCalledWith("remove", expect.any(Object), { entityName: "EventDish" });
      });
    });

    describe("Error handling", () => {
      it("create returns 500 when runtime throws", async () => {
        setupAuth();
        mockRunCommand.mockRejectedValueOnce(new Error("DB error"));

        const { POST } = await import("@/app/api/eventdish/create/route");
        const req = createMockRequest(`${DISH_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
      });

      it("remove returns 403 on policy denial", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          policyDenial: { policyName: "chefOnly", formatted: "Only chefs can remove dishes" },
        });

        const { POST } = await import("@/app/api/eventdish/remove/route");
        const req = createMockRequest(`${DISH_BASE}/remove`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_EVENT_DISH_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(403);
      });
    });
  });

  // =========================================================================
  // EventReport (4 commands: create, submit, approve, complete)
  // =========================================================================

  describe("EventReport Command Routes", () => {
    const REPORT_BASE = "/api/eventreport";
    const mockReport = {
      tenantId: TEST_TENANT_ID,
      id: TEST_REPORT_ID,
      eventId: TEST_EVENT_ID,
      title: "Post-Event Analysis",
      status: "draft",
      content: "Event performance metrics...",
      generatedAt: new Date("2026-02-01"),
      submittedAt: null,
      approvedAt: null,
      completedAt: null,
      createdAt: new Date("2026-01-20"),
      updatedAt: new Date("2026-01-20"),
    };

    describe("Authentication gating", () => {
      it("create returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventreport/create/route");
        const req = createMockRequest(`${REPORT_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });

      it("submit returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventreport/submit/route");
        const req = createMockRequest(`${REPORT_BASE}/submit`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_REPORT_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });

      it("approve returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventreport/approve/route");
        const req = createMockRequest(`${REPORT_BASE}/approve`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_REPORT_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });

      it("complete returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventreport/complete/route");
        const req = createMockRequest(`${REPORT_BASE}/complete`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_REPORT_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });
    });

    describe("Tenant resolution", () => {
      it("create returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/eventreport/create/route");
        const req = createMockRequest(`${REPORT_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
      });

      it("approve returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/eventreport/approve/route");
        const req = createMockRequest(`${REPORT_BASE}/approve`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_REPORT_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
      });
    });

    describe("POST /api/eventreport/create - success", () => {
      it("creates a report and returns 200", async () => {
        setupAuth();
        setupSuccessResult(mockReport, [{ type: "ReportCreated", payload: { id: TEST_REPORT_ID } }]);

        const { POST } = await import("@/app/api/eventreport/create/route");
        const req = createMockRequest(`${REPORT_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID, title: "Post-Event Analysis" }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.id).toBe(TEST_REPORT_ID);
        expect(body.result.status).toBe("draft");
        expect(mockRunCommand).toHaveBeenCalledWith("create", expect.any(Object), { entityName: "EventReport" });
      });
    });

    describe("POST /api/eventreport/submit - success", () => {
      it("submits a report and returns 200", async () => {
        setupAuth();
        const submitted = { ...mockReport, status: "submitted", submittedAt: new Date("2026-02-02") };
        setupSuccessResult(submitted, [{ type: "ReportSubmitted" }]);

        const { POST } = await import("@/app/api/eventreport/submit/route");
        const req = createMockRequest(`${REPORT_BASE}/submit`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_REPORT_ID }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.status).toBe("submitted");
        expect(mockRunCommand).toHaveBeenCalledWith("submit", expect.any(Object), { entityName: "EventReport" });
      });
    });

    describe("POST /api/eventreport/approve - success", () => {
      it("approves a report and returns 200", async () => {
        setupAuth();
        const approved = { ...mockReport, status: "approved", approvedAt: new Date("2026-02-03") };
        setupSuccessResult(approved);

        const { POST } = await import("@/app/api/eventreport/approve/route");
        const req = createMockRequest(`${REPORT_BASE}/approve`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_REPORT_ID }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.status).toBe("approved");
        expect(mockRunCommand).toHaveBeenCalledWith("approve", expect.any(Object), { entityName: "EventReport" });
      });
    });

    describe("POST /api/eventreport/complete - success", () => {
      it("completes a report and returns 200", async () => {
        setupAuth();
        const completed = { ...mockReport, status: "completed", completedAt: new Date("2026-02-04") };
        setupSuccessResult(completed);

        const { POST } = await import("@/app/api/eventreport/complete/route");
        const req = createMockRequest(`${REPORT_BASE}/complete`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_REPORT_ID }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.status).toBe("completed");
        expect(mockRunCommand).toHaveBeenCalledWith("complete", expect.any(Object), { entityName: "EventReport" });
      });
    });

    describe("Error handling", () => {
      it("create returns 500 when runtime throws", async () => {
        setupAuth();
        mockRunCommand.mockRejectedValueOnce(new Error("DB error"));

        const { POST } = await import("@/app/api/eventreport/create/route");
        const req = createMockRequest(`${REPORT_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
      });

      it("approve returns 403 on policy denial", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          policyDenial: { policyName: "managerOnly", formatted: "Only managers can approve" },
        });

        const { POST } = await import("@/app/api/eventreport/approve/route");
        const req = createMockRequest(`${REPORT_BASE}/approve`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_REPORT_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(403);
      });

      it("submit returns 422 on guard failure", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          guardFailure: { index: 0, formatted: "Report must be in draft status" },
        });

        const { POST } = await import("@/app/api/eventreport/submit/route");
        const req = createMockRequest(`${REPORT_BASE}/submit`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_REPORT_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(422);
      });

      it("complete returns 400 on general command failure", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          error: "Report not found",
        });

        const { POST } = await import("@/app/api/eventreport/complete/route");
        const req = createMockRequest(`${REPORT_BASE}/complete`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_REPORT_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
      });
    });
  });

  // =========================================================================
  // EventProfitability (3 commands: create, update, recalculate)
  // =========================================================================

  describe("EventProfitability Command Routes", () => {
    const PROFIT_BASE = "/api/eventprofitability";
    const mockProfitability = {
      tenantId: TEST_TENANT_ID,
      id: TEST_PROFITABILITY_ID,
      eventId: TEST_EVENT_ID,
      totalRevenue: 15000,
      totalCost: 8500,
      grossProfit: 6500,
      profitMargin: 43.33,
      calculatedAt: new Date("2026-02-01"),
      createdAt: new Date("2026-01-20"),
      updatedAt: new Date("2026-01-20"),
    };

    describe("Authentication gating", () => {
      it("create returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventprofitability/create/route");
        const req = createMockRequest(`${PROFIT_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });

      it("update returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventprofitability/update/route");
        const req = createMockRequest(`${PROFIT_BASE}/update`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_PROFITABILITY_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });

      it("recalculate returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventprofitability/recalculate/route");
        const req = createMockRequest(`${PROFIT_BASE}/recalculate`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_PROFITABILITY_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });
    });

    describe("Tenant resolution", () => {
      it("create returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/eventprofitability/create/route");
        const req = createMockRequest(`${PROFIT_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
      });

      it("recalculate returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/eventprofitability/recalculate/route");
        const req = createMockRequest(`${PROFIT_BASE}/recalculate`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_PROFITABILITY_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
      });
    });

    describe("POST /api/eventprofitability/create - success", () => {
      it("creates a profitability record and returns 200", async () => {
        setupAuth();
        setupSuccessResult(mockProfitability, [{ type: "ProfitabilityCalculated" }]);

        const { POST } = await import("@/app/api/eventprofitability/create/route");
        const req = createMockRequest(`${PROFIT_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.grossProfit).toBe(6500);
        expect(body.result.profitMargin).toBeCloseTo(43.33);
        expect(mockRunCommand).toHaveBeenCalledWith("create", expect.any(Object), { entityName: "EventProfitability" });
      });
    });

    describe("POST /api/eventprofitability/update - success", () => {
      it("updates a profitability record and returns 200", async () => {
        setupAuth();
        const updated = { ...mockProfitability, totalRevenue: 18000, grossProfit: 9500 };
        setupSuccessResult(updated);

        const { POST } = await import("@/app/api/eventprofitability/update/route");
        const req = createMockRequest(`${PROFIT_BASE}/update`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_PROFITABILITY_ID, totalRevenue: 18000 }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.totalRevenue).toBe(18000);
        expect(mockRunCommand).toHaveBeenCalledWith("update", expect.any(Object), { entityName: "EventProfitability" });
      });
    });

    describe("POST /api/eventprofitability/recalculate - success", () => {
      it("recalculates profitability and returns 200", async () => {
        setupAuth();
        const recalculated = { ...mockProfitability, grossProfit: 7000, profitMargin: 46.67, calculatedAt: new Date("2026-02-05") };
        setupSuccessResult(recalculated, [{ type: "ProfitabilityRecalculated" }]);

        const { POST } = await import("@/app/api/eventprofitability/recalculate/route");
        const req = createMockRequest(`${PROFIT_BASE}/recalculate`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_PROFITABILITY_ID }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.grossProfit).toBe(7000);
        expect(mockRunCommand).toHaveBeenCalledWith("recalculate", expect.any(Object), { entityName: "EventProfitability" });
      });
    });

    describe("Error handling", () => {
      it("create returns 500 when runtime throws", async () => {
        setupAuth();
        mockRunCommand.mockRejectedValueOnce(new Error("DB error"));

        const { POST } = await import("@/app/api/eventprofitability/create/route");
        const req = createMockRequest(`${PROFIT_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
      });

      it("update returns 403 on policy denial", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          policyDenial: { policyName: "financeOnly", formatted: "Finance access required" },
        });

        const { POST } = await import("@/app/api/eventprofitability/update/route");
        const req = createMockRequest(`${PROFIT_BASE}/update`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_PROFITABILITY_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(403);
      });
    });
  });

  // =========================================================================
  // EventSummary (3 commands: create, update, refresh)
  // =========================================================================

  describe("EventSummary Command Routes", () => {
    const SUMMARY_BASE = "/api/eventsummary";
    const mockSummary = {
      tenantId: TEST_TENANT_ID,
      id: TEST_SUMMARY_ID,
      eventId: TEST_EVENT_ID,
      totalGuests: 120,
      confirmedGuests: 95,
      totalStaff: 15,
      totalDishes: 8,
      budgetUsed: 7500,
      budgetTotal: 10000,
      status: "in_progress",
      generatedAt: new Date("2026-02-01"),
      createdAt: new Date("2026-01-20"),
      updatedAt: new Date("2026-01-20"),
    };

    describe("Authentication gating", () => {
      it("create returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventsummary/create/route");
        const req = createMockRequest(`${SUMMARY_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });

      it("update returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventsummary/update/route");
        const req = createMockRequest(`${SUMMARY_BASE}/update`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_SUMMARY_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });

      it("refresh returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventsummary/refresh/route");
        const req = createMockRequest(`${SUMMARY_BASE}/refresh`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_SUMMARY_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });
    });

    describe("Tenant resolution", () => {
      it("create returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/eventsummary/create/route");
        const req = createMockRequest(`${SUMMARY_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
      });

      it("refresh returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/eventsummary/refresh/route");
        const req = createMockRequest(`${SUMMARY_BASE}/refresh`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_SUMMARY_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
      });
    });

    describe("POST /api/eventsummary/create - success", () => {
      it("creates a summary and returns 200", async () => {
        setupAuth();
        setupSuccessResult(mockSummary, [{ type: "SummaryCreated" }]);

        const { POST } = await import("@/app/api/eventsummary/create/route");
        const req = createMockRequest(`${SUMMARY_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.totalGuests).toBe(120);
        expect(body.result.confirmedGuests).toBe(95);
        expect(mockRunCommand).toHaveBeenCalledWith("create", expect.any(Object), { entityName: "EventSummary" });
      });
    });

    describe("POST /api/eventsummary/update - success", () => {
      it("updates a summary and returns 200", async () => {
        setupAuth();
        const updated = { ...mockSummary, totalGuests: 150, confirmedGuests: 110 };
        setupSuccessResult(updated);

        const { POST } = await import("@/app/api/eventsummary/update/route");
        const req = createMockRequest(`${SUMMARY_BASE}/update`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_SUMMARY_ID, totalGuests: 150 }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.totalGuests).toBe(150);
        expect(mockRunCommand).toHaveBeenCalledWith("update", expect.any(Object), { entityName: "EventSummary" });
      });
    });

    describe("POST /api/eventsummary/refresh - success", () => {
      it("refreshes a summary and returns 200", async () => {
        setupAuth();
        const refreshed = { ...mockSummary, totalGuests: 130, generatedAt: new Date("2026-02-05") };
        setupSuccessResult(refreshed, [{ type: "SummaryRefreshed" }]);

        const { POST } = await import("@/app/api/eventsummary/refresh/route");
        const req = createMockRequest(`${SUMMARY_BASE}/refresh`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_SUMMARY_ID }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.totalGuests).toBe(130);
        expect(mockRunCommand).toHaveBeenCalledWith("refresh", expect.any(Object), { entityName: "EventSummary" });
      });
    });

    describe("Error handling", () => {
      it("create returns 500 when runtime throws", async () => {
        setupAuth();
        mockRunCommand.mockRejectedValueOnce(new Error("DB error"));

        const { POST } = await import("@/app/api/eventsummary/create/route");
        const req = createMockRequest(`${SUMMARY_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
      });

      it("refresh returns 422 on guard failure", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          guardFailure: { index: 0, formatted: "Event not finalized" },
        });

        const { POST } = await import("@/app/api/eventsummary/refresh/route");
        const req = createMockRequest(`${SUMMARY_BASE}/refresh`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_SUMMARY_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(422);
      });
    });
  });

  // =========================================================================
  // EventImportWorkflow (18 commands)
  // =========================================================================

  describe("EventImportWorkflow Command Routes", () => {
    const WF_BASE = "/api/eventimportworkflow";
    const mockWorkflow = {
      tenantId: TEST_TENANT_ID,
      id: TEST_WORKFLOW_ID,
      eventId: TEST_EVENT_ID,
      status: "created",
      source: "csv_upload",
      fileName: "guest-list.csv",
      totalRecords: 250,
      processedRecords: 0,
      failedRecords: 0,
      errorMessage: null,
      createdAt: new Date("2026-01-20"),
      updatedAt: new Date("2026-01-20"),
    };

    // -- Auth gating (representative sample) --
    describe("Authentication gating", () => {
      it("create returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventimportworkflow/create/route");
        const req = createMockRequest(`${WF_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID, source: "csv_upload" }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });

      it("cancel returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventimportworkflow/cancel/route");
        const req = createMockRequest(`${WF_BASE}/cancel`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_WORKFLOW_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });

      it("start-extracting returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventimportworkflow/start-extracting/route");
        const req = createMockRequest(`${WF_BASE}/start-extracting`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_WORKFLOW_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });

      it("complete-activating returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/eventimportworkflow/complete-activating/route");
        const req = createMockRequest(`${WF_BASE}/complete-activating`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_WORKFLOW_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });
    });

    // -- Tenant resolution --
    describe("Tenant resolution", () => {
      it("create returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/eventimportworkflow/create/route");
        const req = createMockRequest(`${WF_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
      });

      it("pause returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/eventimportworkflow/pause/route");
        const req = createMockRequest(`${WF_BASE}/pause`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_WORKFLOW_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
      });
    });

    // -- Success: core lifecycle commands --
    describe("POST /api/eventimportworkflow/create - success", () => {
      it("creates a workflow and returns 200", async () => {
        setupAuth();
        setupSuccessResult(mockWorkflow, [{ type: "ImportWorkflowCreated" }]);

        const { POST } = await import("@/app/api/eventimportworkflow/create/route");
        const req = createMockRequest(`${WF_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID, source: "csv_upload", fileName: "guest-list.csv" }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.id).toBe(TEST_WORKFLOW_ID);
        expect(body.result.status).toBe("created");
        expect(mockRunCommand).toHaveBeenCalledWith("create", expect.any(Object), { entityName: "EventImportWorkflow" });
      });
    });

    describe("POST /api/eventimportworkflow/cancel - success", () => {
      it("cancels a workflow and returns 200", async () => {
        setupAuth();
        const cancelled = { ...mockWorkflow, status: "cancelled" };
        setupSuccessResult(cancelled);

        const { POST } = await import("@/app/api/eventimportworkflow/cancel/route");
        const req = createMockRequest(`${WF_BASE}/cancel`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_WORKFLOW_ID, reason: "User cancelled" }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.status).toBe("cancelled");
        expect(mockRunCommand).toHaveBeenCalledWith("cancel", expect.any(Object), { entityName: "EventImportWorkflow" });
      });
    });

    describe("POST /api/eventimportworkflow/fail - success", () => {
      it("marks a workflow as failed and returns 200", async () => {
        setupAuth();
        const failed = { ...mockWorkflow, status: "failed", errorMessage: "Parse error" };
        setupSuccessResult(failed);

        const { POST } = await import("@/app/api/eventimportworkflow/fail/route");
        const req = createMockRequest(`${WF_BASE}/fail`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_WORKFLOW_ID, errorMessage: "Parse error" }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.status).toBe("failed");
        expect(mockRunCommand).toHaveBeenCalledWith("fail", expect.any(Object), { entityName: "EventImportWorkflow" });
      });
    });

    describe("POST /api/eventimportworkflow/pause - success", () => {
      it("pauses a workflow and returns 200", async () => {
        setupAuth();
        const paused = { ...mockWorkflow, status: "paused" };
        setupSuccessResult(paused);

        const { POST } = await import("@/app/api/eventimportworkflow/pause/route");
        const req = createMockRequest(`${WF_BASE}/pause`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_WORKFLOW_ID }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.status).toBe("paused");
        expect(mockRunCommand).toHaveBeenCalledWith("pause", expect.any(Object), { entityName: "EventImportWorkflow" });
      });
    });

    describe("POST /api/eventimportworkflow/resume - success", () => {
      it("resumes a workflow and returns 200", async () => {
        setupAuth();
        const resumed = { ...mockWorkflow, status: "extracting" };
        setupSuccessResult(resumed);

        const { POST } = await import("@/app/api/eventimportworkflow/resume/route");
        const req = createMockRequest(`${WF_BASE}/resume`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_WORKFLOW_ID }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockRunCommand).toHaveBeenCalledWith("resume", expect.any(Object), { entityName: "EventImportWorkflow" });
      });
    });

    describe("POST /api/eventimportworkflow/retry - success", () => {
      it("retries a workflow and returns 200", async () => {
        setupAuth();
        const retried = { ...mockWorkflow, status: "extracting", errorMessage: null };
        setupSuccessResult(retried);

        const { POST } = await import("@/app/api/eventimportworkflow/retry/route");
        const req = createMockRequest(`${WF_BASE}/retry`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_WORKFLOW_ID }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockRunCommand).toHaveBeenCalledWith("retry", expect.any(Object), { entityName: "EventImportWorkflow" });
      });
    });

    // -- Success: phase transition commands (start*/complete* pairs) --
    const phaseTransitions = [
      { dir: "start-extracting", cmd: "startExtracting", targetStatus: "extracting" },
      { dir: "complete-extraction", cmd: "completeExtraction", targetStatus: "extraction_complete" },
      { dir: "start-parsing", cmd: "startParsing", targetStatus: "parsing" },
      { dir: "start-validating", cmd: "startValidating", targetStatus: "validating" },
      { dir: "start-proposing", cmd: "startProposing", targetStatus: "proposing" },
      { dir: "start-reserving", cmd: "startReserving", targetStatus: "reserving" },
      { dir: "start-activating", cmd: "startActivating", targetStatus: "activating" },
    ] as const;

    for (const phase of phaseTransitions) {
      describe(`POST /api/eventimportworkflow/${phase.dir} - success`, () => {
        it(`transitions to ${phase.targetStatus} and returns 200`, async () => {
          setupAuth();
          const updated = { ...mockWorkflow, status: phase.targetStatus };
          setupSuccessResult(updated);

          const { POST } = await import(`@/app/api/eventimportworkflow/${phase.dir}/route`);
          const req = createMockRequest(`${WF_BASE}/${phase.dir}`, {
            method: "POST",
            body: JSON.stringify({ id: TEST_WORKFLOW_ID }),
          });

          const res = await POST(req);
          const body = await res.json();

          expect(res.status).toBe(200);
          expect(body.success).toBe(true);
          expect(body.result.status).toBe(phase.targetStatus);
          expect(mockRunCommand).toHaveBeenCalledWith(phase.cmd, expect.any(Object), { entityName: "EventImportWorkflow" });
        });
      });
    }

    const completeTransitions = [
      { dir: "complete-parsing", cmd: "completeParsing", targetStatus: "parsing_complete" },
      { dir: "complete-validation", cmd: "completeValidation", targetStatus: "validation_complete" },
      { dir: "complete-proposing", cmd: "completeProposing", targetStatus: "proposing_complete" },
      { dir: "complete-reserving", cmd: "completeReserving", targetStatus: "reserving_complete" },
      { dir: "complete-activating", cmd: "completeActivating", targetStatus: "activated" },
    ] as const;

    for (const phase of completeTransitions) {
      describe(`POST /api/eventimportworkflow/${phase.dir} - success`, () => {
        it(`transitions to ${phase.targetStatus} and returns 200`, async () => {
          setupAuth();
          const updated = { ...mockWorkflow, status: phase.targetStatus };
          setupSuccessResult(updated);

          const { POST } = await import(`@/app/api/eventimportworkflow/${phase.dir}/route`);
          const req = createMockRequest(`${WF_BASE}/${phase.dir}`, {
            method: "POST",
            body: JSON.stringify({ id: TEST_WORKFLOW_ID }),
          });

          const res = await POST(req);
          const body = await res.json();

          expect(res.status).toBe(200);
          expect(body.success).toBe(true);
          expect(body.result.status).toBe(phase.targetStatus);
          expect(mockRunCommand).toHaveBeenCalledWith(phase.cmd, expect.any(Object), { entityName: "EventImportWorkflow" });
        });
      });
    }

    // -- Error handling --
    describe("Error handling", () => {
      it("create returns 500 when runtime throws", async () => {
        setupAuth();
        mockRunCommand.mockRejectedValueOnce(new Error("DB error"));

        const { POST } = await import("@/app/api/eventimportworkflow/create/route");
        const req = createMockRequest(`${WF_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
      });

      it("start-extracting returns 403 on policy denial", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          policyDenial: { policyName: "importManagerOnly", formatted: "Not authorized for import" },
        });

        const { POST } = await import("@/app/api/eventimportworkflow/start-extracting/route");
        const req = createMockRequest(`${WF_BASE}/start-extracting`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_WORKFLOW_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(403);
      });

      it("complete-parsing returns 422 on guard failure", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          guardFailure: { index: 0, formatted: "Parsing not started" },
        });

        const { POST } = await import("@/app/api/eventimportworkflow/complete-parsing/route");
        const req = createMockRequest(`${WF_BASE}/complete-parsing`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_WORKFLOW_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(422);
      });

      it("cancel returns 400 on general command failure", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          error: "Workflow not found",
        });

        const { POST } = await import("@/app/api/eventimportworkflow/cancel/route");
        const req = createMockRequest(`${WF_BASE}/cancel`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_WORKFLOW_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
      });
    });

    // -- Tenant isolation --
    describe("Tenant isolation", () => {
      it("passes correct tenant id to runtime context", async () => {
        setupAuth();
        setupSuccessResult(mockWorkflow);

        const { createManifestRuntime } = await import("@/lib/manifest-runtime");
        const { POST } = await import("@/app/api/eventimportworkflow/create/route");
        const req = createMockRequest(`${WF_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        });

        await POST(req);

        expect(vi.mocked(createManifestRuntime)).toHaveBeenCalledWith({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        });
      });
    });
  });

  // =========================================================================
  // ContractSignature (2 commands: create, softDelete)
  // =========================================================================

  describe("ContractSignature Command Routes", () => {
    const SIG_BASE = "/api/contractsignature";
    const mockSignature = {
      tenantId: TEST_TENANT_ID,
      id: TEST_SIGNATURE_ID,
      contractId: TEST_CONTRACT_ID,
      signerName: "John Smith",
      signerEmail: "john@example.com",
      signerRole: "client",
      signatureData: "base64encodedsignature",
      ipAddress: "192.168.1.1",
      signedAt: new Date("2026-02-01"),
      createdAt: new Date("2026-02-01"),
      updatedAt: new Date("2026-02-01"),
      deletedAt: null,
    };

    describe("Authentication gating", () => {
      it("create returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/contractsignature/create/route");
        const req = createMockRequest(`${SIG_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ contractId: TEST_CONTRACT_ID, signerName: "John" }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("soft-delete returns 401 when unauthenticated", async () => {
        setupUnauthenticated();
        const { POST } = await import("@/app/api/contractsignature/soft-delete/route");
        const req = createMockRequest(`${SIG_BASE}/soft-delete`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_SIGNATURE_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
      });
    });

    describe("Tenant resolution", () => {
      it("create returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/contractsignature/create/route");
        const req = createMockRequest(`${SIG_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ contractId: TEST_CONTRACT_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Tenant not found");
      });

      it("soft-delete returns 400 when tenant not found", async () => {
        setupNoTenant();
        const { POST } = await import("@/app/api/contractsignature/soft-delete/route");
        const req = createMockRequest(`${SIG_BASE}/soft-delete`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_SIGNATURE_ID }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
      });
    });

    describe("POST /api/contractsignature/create - success", () => {
      it("creates a signature and returns 200 with result and events", async () => {
        setupAuth();
        setupSuccessResult(mockSignature, [{ type: "ContractSigned", payload: { id: TEST_SIGNATURE_ID } }]);

        const { POST } = await import("@/app/api/contractsignature/create/route");
        const req = createMockRequest(`${SIG_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({
            contractId: TEST_CONTRACT_ID,
            signerName: "John Smith",
            signerEmail: "john@example.com",
            signatureData: "base64encodedsignature",
          }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.id).toBe(TEST_SIGNATURE_ID);
        expect(body.result.signerName).toBe("John Smith");
        expect(body.events[0].type).toBe("ContractSigned");
        expect(mockRunCommand).toHaveBeenCalledWith("create", expect.any(Object), { entityName: "ContractSignature" });
      });
    });

    describe("POST /api/contractsignature/soft-delete - success", () => {
      it("soft-deletes a signature and returns 200", async () => {
        setupAuth();
        const deleted = { ...mockSignature, deletedAt: new Date("2026-02-05") };
        setupSuccessResult(deleted);

        const { POST } = await import("@/app/api/contractsignature/soft-delete/route");
        const req = createMockRequest(`${SIG_BASE}/soft-delete`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_SIGNATURE_ID }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.result.deletedAt).not.toBeNull();
        expect(mockRunCommand).toHaveBeenCalledWith("softDelete", expect.any(Object), { entityName: "ContractSignature" });
      });
    });

    describe("Error handling", () => {
      it("create returns 500 when runtime throws", async () => {
        setupAuth();
        mockRunCommand.mockRejectedValueOnce(new Error("DB error"));

        const { POST } = await import("@/app/api/contractsignature/create/route");
        const req = createMockRequest(`${SIG_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ contractId: TEST_CONTRACT_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Internal server error");
      });

      it("create returns 403 on policy denial", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          policyDenial: { policyName: "authorizedSignerOnly", formatted: "Not an authorized signer" },
        });

        const { POST } = await import("@/app/api/contractsignature/create/route");
        const req = createMockRequest(`${SIG_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ contractId: TEST_CONTRACT_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.message).toContain("Access denied");
      });

      it("soft-delete returns 422 on guard failure", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          guardFailure: { index: 0, formatted: "Cannot delete verified signature" },
        });

        const { POST } = await import("@/app/api/contractsignature/soft-delete/route");
        const req = createMockRequest(`${SIG_BASE}/soft-delete`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_SIGNATURE_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(422);
        const body = await res.json();
        expect(body.message).toContain("Guard 0 failed");
      });

      it("create returns 400 on general command failure", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          error: "Contract not found",
        });

        const { POST } = await import("@/app/api/contractsignature/create/route");
        const req = createMockRequest(`${SIG_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ contractId: TEST_CONTRACT_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toBe("Contract not found");
      });

      it("create returns 400 with default message when error is null", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          error: null,
        });

        const { POST } = await import("@/app/api/contractsignature/create/route");
        const req = createMockRequest(`${SIG_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ contractId: TEST_CONTRACT_ID }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toBe("Command failed");
      });

      it("create returns 500 when request body is invalid JSON", async () => {
        setupAuth();

        const { POST } = await import("@/app/api/contractsignature/create/route");
        const req = createMockRequest(`${SIG_BASE}/create`, {
          method: "POST",
          body: "not-valid-json{{{",
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Internal server error");
      });
    });

    // -- Tenant isolation --
    describe("Tenant isolation", () => {
      it("passes correct tenant id to runtime context", async () => {
        setupAuth();
        setupSuccessResult(mockSignature);

        const { createManifestRuntime } = await import("@/lib/manifest-runtime");
        const { POST } = await import("@/app/api/contractsignature/create/route");
        const req = createMockRequest(`${SIG_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ contractId: TEST_CONTRACT_ID }),
        });

        await POST(req);

        expect(vi.mocked(createManifestRuntime)).toHaveBeenCalledWith({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        });
      });
    });

    // -- Response shape --
    describe("Response shape", () => {
      it("success response includes success, result, and events", async () => {
        setupAuth();
        setupSuccessResult(mockSignature, [{ type: "ContractSigned" }]);

        const { POST } = await import("@/app/api/contractsignature/create/route");
        const req = createMockRequest(`${SIG_BASE}/create`, {
          method: "POST",
          body: JSON.stringify({ contractId: TEST_CONTRACT_ID }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(body.success).toBe(true);
        expect(body.result).toBeDefined();
        expect(body.events).toBeDefined();
        expect(Array.isArray(body.events)).toBe(true);
      });

      it("error response contains only success and message keys", async () => {
        setupAuth();
        mockRunCommand.mockResolvedValueOnce({
          success: false,
          error: "Something went wrong",
        });

        const { POST } = await import("@/app/api/contractsignature/soft-delete/route");
        const req = createMockRequest(`${SIG_BASE}/soft-delete`, {
          method: "POST",
          body: JSON.stringify({ id: TEST_SIGNATURE_ID }),
        });

        const res = await POST(req);
        const body = await res.json();

        const keys = Object.keys(body);
        expect(keys).toContain("success");
        expect(keys).toContain("message");
        expect(keys.length).toBe(2);
      });
    });
  });
});
