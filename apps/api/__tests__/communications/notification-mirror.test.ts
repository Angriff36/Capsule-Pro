/**
 * Notification-mirror tests.
 *
 * WHY THIS MATTERS: the email/SMS send services write only to infra
 * `email_logs`/`sms_logs` and emit no governed event, so `/notifications` was
 * blind to every message the system sent (IMPLEMENTATION_PLAN — "Notification on
 * email/SMS send"). `mirrorSendsToNotifications` closes that gap by dispatching
 * the governed `Notification.create` command for each DELIVERED message to an
 * EMPLOYEE recipient. These tests lock the contract that makes the mirror
 * correct and safe:
 *   - it dispatches the governed command (never a direct write),
 *   - as the `system` actor (so it is not gated by the sender's role),
 *   - only for recipients with an employeeId AND a successful send,
 *   - correlating results to recipients POSITIONALLY (results[i] ↔ recipients[i]),
 *   - and never throws — a mirror failure must not fail the completed send.
 */

import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  humanizeNotificationType,
  mirrorSendsToNotifications,
} from "@/app/lib/notification-mirror";

vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const TENANT_ID = "tenant-001";

describe("mirrorSendsToNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runManifestCommandCore).mockResolvedValue({
      ok: true,
      result: { id: "notif-1" },
      events: [],
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches Notification.create as the system actor for a delivered employee send", async () => {
    await mirrorSendsToNotifications({
      tenantId: TENANT_ID,
      notificationType: "shift_reminder",
      title: "Your shift",
      body: "",
      correlationId: "wf-9",
      recipients: [{ employeeId: "emp-1" }],
      results: [{ success: true }],
    });

    expect(runManifestCommandCore).toHaveBeenCalledTimes(1);
    const firstCall = vi.mocked(runManifestCommandCore).mock.calls[0];
    if (!firstCall) {
      throw new Error("expected a Notification.create dispatch");
    }
    const [, params] = firstCall;
    expect(params).toMatchObject({
      entity: "Notification",
      command: "create",
      user: { id: "system", role: "system", tenantId: TENANT_ID },
      body: {
        recipientEmployeeId: "emp-1",
        notificationType: "shift_reminder",
        title: "Your shift",
        correlationId: "wf-9",
      },
    });
  });

  it("skips recipients without an employeeId (external client — no in-app inbox)", async () => {
    await mirrorSendsToNotifications({
      tenantId: TENANT_ID,
      notificationType: "proposal_sent",
      title: "Proposal",
      body: "",
      recipients: [{}],
      results: [{ success: true }],
    });

    expect(runManifestCommandCore).not.toHaveBeenCalled();
  });

  it("skips recipients whose send failed", async () => {
    await mirrorSendsToNotifications({
      tenantId: TENANT_ID,
      notificationType: "shift_reminder",
      title: "Your shift",
      body: "",
      recipients: [{ employeeId: "emp-1" }],
      results: [{ success: false }],
    });

    expect(runManifestCommandCore).not.toHaveBeenCalled();
  });

  it("correlates results to recipients positionally", async () => {
    await mirrorSendsToNotifications({
      tenantId: TENANT_ID,
      notificationType: "shift_reminder",
      title: "Your shift",
      body: "",
      recipients: [
        { employeeId: "emp-A" }, // success → mirrored
        { employeeId: "emp-B" }, // failed → skipped
        { employeeId: "emp-C" }, // success → mirrored
      ],
      results: [{ success: true }, { success: false }, { success: true }],
    });

    expect(runManifestCommandCore).toHaveBeenCalledTimes(2);
    const recipientIds = vi
      .mocked(runManifestCommandCore)
      .mock.calls.map(
        ([, params]) =>
          (params.body as { recipientEmployeeId: string }).recipientEmployeeId
      );
    expect(recipientIds).toEqual(["emp-A", "emp-C"]);
  });

  it("does not throw when a dispatch fails or rejects", async () => {
    vi.mocked(runManifestCommandCore)
      .mockResolvedValueOnce({ ok: false, message: "policy denied" } as never)
      .mockRejectedValueOnce(new Error("runtime exploded"));

    await expect(
      mirrorSendsToNotifications({
        tenantId: TENANT_ID,
        notificationType: "shift_reminder",
        title: "Your shift",
        body: "",
        recipients: [{ employeeId: "emp-1" }, { employeeId: "emp-2" }],
        results: [{ success: true }, { success: true }],
      })
    ).resolves.toBeUndefined();

    expect(runManifestCommandCore).toHaveBeenCalledTimes(2);
  });
});

describe("humanizeNotificationType", () => {
  it("turns a snake/kebab slug into a capitalized title", () => {
    expect(humanizeNotificationType("shift_reminder")).toBe("Shift reminder");
    expect(humanizeNotificationType("contract-expiring")).toBe(
      "Contract expiring"
    );
  });

  it("falls back to a non-empty label so the create title guard always holds", () => {
    expect(humanizeNotificationType("___")).toBe("___");
    expect(humanizeNotificationType("alert")).toBe("Alert");
  });
});
