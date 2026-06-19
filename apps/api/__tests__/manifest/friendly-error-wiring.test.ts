/**
 * Integration test: verifies the friendly-error mapper is wired into the
 * command dispatcher's failure path so the HTTP response body carries
 * `friendlyError` + `kind` alongside the existing `error`/`message`.
 *
 * Mocks `runManifestCommandCore` to return a guard failure, then asserts the
 * Response JSON produced by `runManifestCommand` includes the friendly payload.
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("@/lib/manifest/issue-log", () => ({
  logManifestIssue: vi.fn(),
}));

vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));

describe("runManifestCommand — friendly error wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes friendlyError + kind on the failure response for a guard_failed", async () => {
    const { runManifestCommandCore } = await import(
      "@repo/manifest-runtime/run-manifest-command-core"
    );
    const mocked = vi.mocked(runManifestCommandCore);
    mocked.mockResolvedValue({
      ok: false,
      entity: "Invoice",
      command: "send",
      kind: "guard_failed",
      httpStatus: 422,
      message: "Guard 0 failed: Can only send draft invoices",
      guardFailure: {
        index: 0,
        expression: 'self.status == "DRAFT"',
        formatted: "Can only send draft invoices",
        resolved: [{ expression: "self.status", value: "SENT" }],
      },
    });

    const { runManifestCommand } = await import(
      "@/lib/manifest/execute-command"
    );

    const response = await runManifestCommand({
      entity: "Invoice",
      command: "send",
      body: { id: "inv_wiring_001", clientContactId: "c_1" },
      user: { id: "u_1", tenantId: "t_1", role: "manager" },
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Guard");
    expect(body.kind).toBe("guard_failed");
    expect(body.friendlyError).toBeDefined();
    expect(body.friendlyError.category).toBe("wrong_status");
    expect(body.friendlyError.title).toContain("invoice");
    expect(body.friendlyError.message).toContain("draft");
    expect(body.friendlyError.suggestedFix).toBeTruthy();
    expect(body.friendlyError.blockingEntity).toBeDefined();
    expect(body.friendlyError.blockingEntity.link).toBe(
      "/accounting/invoices/inv_wiring_001"
    );
  });

  it("includes friendlyError on policy_denied", async () => {
    const { runManifestCommandCore } = await import(
      "@repo/manifest-runtime/run-manifest-command-core"
    );
    vi.mocked(runManifestCommandCore).mockResolvedValue({
      ok: false,
      entity: "Invoice",
      command: "send",
      kind: "policy_denied",
      httpStatus: 403,
      message: "Access denied: InvoiceDefaultAccess",
      policyDenial: {
        policyName: "InvoiceDefaultAccess",
        message: "role not allowed",
      },
    });

    const { runManifestCommand } = await import(
      "@/lib/manifest/execute-command"
    );

    const response = await runManifestCommand({
      entity: "Invoice",
      command: "send",
      body: { id: "inv_2" },
      user: { id: "u_1", tenantId: "t_1", role: "server" },
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.kind).toBe("policy_denied");
    expect(body.friendlyError).toBeDefined();
    expect(body.friendlyError.category).toBe("permission");
    expect(body.friendlyError.title).toContain("permission");
  });
});
