/**
 * Tests for executeDomainStepViaManifest() — the embedded runtime helper
 * that all plan approval domain steps delegate to.
 *
 * Verifies:
 * 1. Auth context validation (fail closed on missing userId/tenantId)
 * 2. Plan context validation (fail closed on missing planId/stepId)
 * 3. Stable idempotency key generation (plan:{planId}:step:{stepId})
 * 4. Success result mapping
 * 5. Failure result mapping (policy denial, guard failure, generic error)
 * 6. Exception handling (runtime throws)
 * 7. failureTtlMs is passed to the factory
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before imports
// ---------------------------------------------------------------------------

// Mock @repo/database
vi.mock("@repo/database", () => ({
  database: {
    user: { findFirst: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({});
    }),
  },
}));

// Capture createManifestRuntime calls and return a controllable mock runtime.
const mockRunCommand = vi.fn();
const mockCreateManifestRuntime = vi.fn().mockResolvedValue({
  runCommand: mockRunCommand,
  getInstance: vi.fn().mockResolvedValue(undefined),
  getCommands: vi.fn().mockReturnValue([]),
});

vi.mock("@repo/manifest-adapters", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    createManifestRuntime: (...args: unknown[]) =>
      mockCreateManifestRuntime(...args),
  };
});

// ---------------------------------------------------------------------------
// Import the module under test (after mocks)
// ---------------------------------------------------------------------------

const { executeDomainStepViaManifest } = await import(
  "@/app/(authenticated)/command-board/actions/manifest-step-executor"
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validOpts = {
  userId: "user-123",
  tenantId: "tenant-456",
  planId: "plan-789",
  stepId: "step-001",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("executeDomainStepViaManifest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunCommand.mockReset();
  });

  // -----------------------------------------------------------------------
  // 1. Auth context validation
  // -----------------------------------------------------------------------
  describe("auth context validation", () => {
    it("returns failure when userId is missing", async () => {
      const result = await executeDomainStepViaManifest(
        "Event",
        "create",
        { title: "Test" },
        { ...validOpts, userId: "" }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("userId");
      expect(mockCreateManifestRuntime).not.toHaveBeenCalled();
    });

    it("returns failure when tenantId is missing", async () => {
      const result = await executeDomainStepViaManifest(
        "Event",
        "create",
        { title: "Test" },
        { ...validOpts, tenantId: "" }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("tenantId");
      expect(mockCreateManifestRuntime).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 2. Plan context validation
  // -----------------------------------------------------------------------
  describe("plan context validation", () => {
    it("returns failure when planId is missing", async () => {
      const result = await executeDomainStepViaManifest(
        "Event",
        "create",
        { title: "Test" },
        { ...validOpts, planId: "" }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("planId");
    });

    it("returns failure when stepId is missing", async () => {
      const result = await executeDomainStepViaManifest(
        "Event",
        "create",
        { title: "Test" },
        { ...validOpts, stepId: "" }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("stepId");
    });
  });

  // -----------------------------------------------------------------------
  // 3. Stable idempotency key generation
  // -----------------------------------------------------------------------
  describe("idempotency key", () => {
    it("generates stable key from planId + stepId", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: true,
        result: { id: "event-1" },
        emittedEvents: [],
      });

      await executeDomainStepViaManifest(
        "Event",
        "create",
        { title: "Test" },
        validOpts
      );

      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        { title: "Test" },
        expect.objectContaining({
          entityName: "Event",
          idempotencyKey: "plan:plan-789:step:step-001",
        })
      );
    });

    it("same plan + same step = same key (deterministic)", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "event-1" },
        emittedEvents: [],
      });

      // Call twice with same opts
      await executeDomainStepViaManifest("Event", "create", {}, validOpts);
      await executeDomainStepViaManifest("Event", "create", {}, validOpts);

      const key1 = mockRunCommand.mock.calls[0][2].idempotencyKey;
      const key2 = mockRunCommand.mock.calls[1][2].idempotencyKey;
      expect(key1).toBe(key2);
      expect(key1).toBe("plan:plan-789:step:step-001");
    });

    it("different steps produce different keys", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: {},
        emittedEvents: [],
      });

      await executeDomainStepViaManifest("Event", "create", {}, validOpts);
      await executeDomainStepViaManifest(
        "Event",
        "create",
        {},
        {
          ...validOpts,
          stepId: "step-002",
        }
      );

      const key1 = mockRunCommand.mock.calls[0][2].idempotencyKey;
      const key2 = mockRunCommand.mock.calls[1][2].idempotencyKey;
      expect(key1).not.toBe(key2);
    });
  });

  // -----------------------------------------------------------------------
  // 4. Success result mapping
  // -----------------------------------------------------------------------
  describe("success result", () => {
    it("maps successful CommandResult to ManifestStepResult", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: true,
        result: { id: "event-1", title: "AI Event" },
        emittedEvents: [
          {
            name: "EventCreated",
            channel: "domain",
            payload: {},
            timestamp: 1,
          },
        ],
      });

      const result = await executeDomainStepViaManifest(
        "Event",
        "create",
        { title: "AI Event" },
        validOpts
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("Event.create");
      expect(result.message).toContain("manifest");
      expect(result.data).toEqual({ id: "event-1", title: "AI Event" });
      expect(result.emittedEvents).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // 5. Failure result mapping
  // -----------------------------------------------------------------------
  describe("failure result mapping", () => {
    it("maps policy denial to error string", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        error: "Access denied",
        policyDenial: {
          policyName: "AdminOnlyPolicy",
          expression: {},
          formatted: "user.role in [admin, owner]",
        },
        emittedEvents: [],
      });

      const result = await executeDomainStepViaManifest(
        "RolePolicy",
        "update",
        {},
        validOpts
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Access denied");
      expect(result.error).toContain("AdminOnlyPolicy");
    });

    it("maps guard failure to error string", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        error: "Guard failed",
        guardFailure: {
          index: 0,
          expression: {},
          formatted: "Name is required",
        },
        emittedEvents: [],
      });

      const result = await executeDomainStepViaManifest(
        "Event",
        "create",
        {},
        validOpts
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Guard failed");
      expect(result.error).toContain("Name is required");
    });

    it("maps generic error", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        error: "Entity not found",
        emittedEvents: [],
      });

      const result = await executeDomainStepViaManifest(
        "Event",
        "update",
        {},
        validOpts
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Entity not found");
    });
  });

  // -----------------------------------------------------------------------
  // 6. Exception handling
  // -----------------------------------------------------------------------
  describe("exception handling", () => {
    it("catches runtime exceptions and returns failure", async () => {
      mockRunCommand.mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      const result = await executeDomainStepViaManifest(
        "Event",
        "create",
        {},
        validOpts
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database connection failed");
      expect(result.message).toContain("threw an exception");
    });

    it("handles non-Error throws gracefully", async () => {
      mockRunCommand.mockRejectedValueOnce("string error");

      const result = await executeDomainStepViaManifest(
        "Event",
        "create",
        {},
        validOpts
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown error");
    });
  });

  // -----------------------------------------------------------------------
  // 7. Factory config — failureTtlMs is passed
  // -----------------------------------------------------------------------
  describe("factory config", () => {
    it("passes failureTtlMs: 30_000 to createManifestRuntime", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: true,
        result: {},
        emittedEvents: [],
      });

      await executeDomainStepViaManifest("Event", "create", {}, validOpts);

      expect(mockCreateManifestRuntime).toHaveBeenCalledTimes(1);
      const [deps] = mockCreateManifestRuntime.mock.calls[0];
      expect(deps.idempotency).toEqual({ failureTtlMs: 30_000 });
    });

    it("passes user context to createManifestRuntime", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: true,
        result: {},
        emittedEvents: [],
      });

      await executeDomainStepViaManifest("PrepTask", "create", {}, validOpts);

      const [, ctx] = mockCreateManifestRuntime.mock.calls[0];
      expect(ctx.user).toEqual({ id: "user-123", tenantId: "tenant-456" });
      expect(ctx.entityName).toBe("PrepTask");
    });
  });
});
