/**
 * SMS Automation Rule activate/deactivate route tests.
 *
 * WHY THIS MATTERS: these routes previously called the generic `update` command
 * with `{ isActive: true|false }`. That path emits only `SmsAutomationRuleUpdated`,
 * so the dedicated `SmsAutomationRuleActivated` / `SmsAutomationRuleDeactivated`
 * events never fired and no reaction could ever propagate activation state. It
 * also risked clobbering other fields via the generic update's full mutate set.
 * The fix routes through the dedicated `activate` / `deactivate` commands, which
 * enforce the transition guard and emit the correct semantic event. These tests
 * lock that contract: the route MUST invoke the dedicated command, never `update`.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as activateRoute } from "@/app/api/smsautomationrule/activate/route";
import { POST as deactivateRoute } from "@/app/api/smsautomationrule/deactivate/route";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

vi.mock("@repo/database", () => ({
  database: {
    smsAutomationRule: {
      findFirst: vi.fn(),
    },
  },
}));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({ createManifestRuntime: vi.fn() }));
vi.mock("@/lib/manifest-response", () => ({
  manifestSuccessResponse: vi.fn(
    (data, status = 200) =>
      new Response(JSON.stringify({ success: true, ...data }), { status })
  ),
  manifestErrorResponse: vi.fn(
    (data, status = 400) =>
      new Response(
        JSON.stringify({
          success: false,
          ...(typeof data === "string" ? { message: data } : data),
        }),
        { status }
      )
  ),
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const TEST_USER_ID = "user-001";
const TEST_ORG_ID = "org-001";
const TEST_TENANT_ID = "tenant-001";
const RULE_ID = "rule-001";

const EXISTING_RULE = {
  id: RULE_ID,
  tenant_id: TEST_TENANT_ID,
  name: "Shift reminder",
  description: null,
  trigger_type: "shift_scheduled",
  trigger_config: null,
  template_id: null,
  custom_message: "Your shift starts soon",
  recipient_type: "staff",
  recipient_config: null,
  priority: 1,
  created_at: new Date("2026-01-15"),
};

function makeRequest(path: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify({ id: RULE_ID }),
  });
}

describe("SMS automation rule activate/deactivate routes", () => {
  const mockRunCommand = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
    vi.mocked(requireCurrentUser).mockResolvedValue({
      id: "employee-sms-1",
      tenantId: TEST_TENANT_ID,
      role: "admin",
      email: "",
      firstName: "",
      lastName: "",
    });
    vi.mocked(database.smsAutomationRule.findFirst).mockResolvedValue(
      EXISTING_RULE as never
    );
    mockRunCommand.mockResolvedValue({
      success: true,
      emittedEvents: [{ name: "SmsAutomationRuleActivated" }],
    });
    vi.mocked(createManifestRuntime).mockResolvedValue({
      runCommand: mockRunCommand,
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/smsautomationrule/activate", () => {
    it("invokes the dedicated `activate` command (not generic `update`)", async () => {
      const response = await activateRoute(
        makeRequest("/api/smsautomationrule/activate")
      );

      expect(response.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "activate",
        { id: RULE_ID },
        { entityName: "SmsAutomationRule", instanceId: RULE_ID }
      );
      // Guard against regression to the generic update path that suppressed the event.
      expect(mockRunCommand).not.toHaveBeenCalledWith(
        "update",
        expect.anything(),
        expect.anything()
      );
    });

    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
      const response = await activateRoute(
        makeRequest("/api/smsautomationrule/activate")
      );
      expect(response.status).toBe(401);
      expect(mockRunCommand).not.toHaveBeenCalled();
    });

    it("returns 400 when id is missing", async () => {
      const request = new NextRequest(
        "http://localhost/api/smsautomationrule/activate",
        { method: "POST", body: JSON.stringify({}) }
      );
      const response = await activateRoute(request);
      expect(response.status).toBe(400);
      expect(mockRunCommand).not.toHaveBeenCalled();
    });

    it("returns 404 when the rule does not exist for the tenant", async () => {
      vi.mocked(database.smsAutomationRule.findFirst).mockResolvedValue(
        null as never
      );
      const response = await activateRoute(
        makeRequest("/api/smsautomationrule/activate")
      );
      expect(response.status).toBe(404);
      expect(mockRunCommand).not.toHaveBeenCalled();
    });

    it("returns 422 when the activation guard fails (already active)", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: { index: 1, formatted: "Rule is already active" },
      });
      const response = await activateRoute(
        makeRequest("/api/smsautomationrule/activate")
      );
      expect(response.status).toBe(422);
    });
  });

  describe("POST /api/smsautomationrule/deactivate", () => {
    it("invokes the dedicated `deactivate` command (not generic `update`)", async () => {
      const response = await deactivateRoute(
        makeRequest("/api/smsautomationrule/deactivate")
      );

      expect(response.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "deactivate",
        { id: RULE_ID },
        { entityName: "SmsAutomationRule", instanceId: RULE_ID }
      );
      expect(mockRunCommand).not.toHaveBeenCalledWith(
        "update",
        expect.anything(),
        expect.anything()
      );
    });

    it("returns 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "ManagerCanManageSms" },
      });
      const response = await deactivateRoute(
        makeRequest("/api/smsautomationrule/deactivate")
      );
      expect(response.status).toBe(403);
    });
  });
});
