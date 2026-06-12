/**
 * Equipment CRUD + Alerts test suite
 *
 * Covers:
 *   GET  /api/kitchen/equipment/list       (direct Prisma read)
 *   GET  /api/kitchen/equipment/alerts      (computed alert logic)
 *   POST Equipment.create                   (manifest dispatcher)
 *   POST Equipment.updateStatus             (manifest dispatcher)
 *   POST Equipment.scheduleMaintenance      (manifest dispatcher)
 *   POST Equipment.recordUsage              (manifest dispatcher)
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Constants ────────────────────────────────────────────────────────
const TENANT_A = "10000000-0000-0000-0000-000000000001";
const ORG_ID = "org_123";
const USER_ID = "user_456";
const LOCATION_ID = "30000000-0000-0000-0000-000000000003";
const EQUIPMENT_ID = "40000000-0000-0000-0000-000000000004";

// ── Hoisted mocks ────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  tenant: vi.fn(),
  captureException: vi.fn(),
  runManifestCommand: vi.fn(),
  eqFindMany: vi.fn(),
  eqCount: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: mocks.tenant,
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@/lib/database", () => ({
  database: {
    equipment: {
      findMany: mocks.eqFindMany,
      count: mocks.eqCount,
    },
  },
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
  addBreadcrumb: vi.fn(),
}));
vi.mock("@repo/observability/log", () => ({ log: { error: mocks.logError } }));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: mocks.runManifestCommand,
}));
vi.mock("@/lib/manifest-runtime", () => ({ createManifestRuntime: vi.fn() }));
vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: (data: unknown, status = 200) =>
      NextResponse.json(
        {
          success: true,
          ...(typeof data === "object" && data !== null ? data : { data }),
        },
        { status }
      ),
    manifestErrorResponse: (
      message: string | { error: string },
      status: number
    ) => {
      const body =
        typeof message === "string"
          ? { success: false, message }
          : { success: false, ...message };
      return NextResponse.json(body, { status });
    },
  };
});
vi.mock("@/app/lib/invariant", () => {
  class InvariantError extends Error {
    name = "InvariantError" as const;
    constructor(m: string) {
      super(m);
      this.name = "InvariantError";
    }
  }
  return { invariant: vi.fn(), InvariantError };
});
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@repo/notifications", () => ({}));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@/lib/manifest/issue-log", () => ({ logManifestIssue: vi.fn() }));

// ── Import routes (after mocks) ──────────────────────────────────────
const { GET: listGET } = await import("@/app/api/kitchen/equipment/list/route");
const { GET: alertsGET } = await import(
  "@/app/api/kitchen/equipment/alerts/route"
);
const { POST: manifestDispatch } = await import(
  "@/app/api/manifest/[entity]/commands/[command]/route"
);

function setAuth(tenantId: string | null = TENANT_A) {
  mocks.auth.mockResolvedValue({ orgId: ORG_ID, userId: USER_ID });
  mocks.tenant.mockResolvedValue(tenantId);
}

function makeGET(url = "http://localhost/api/kitchen/equipment/list") {
  return new NextRequest(url, { method: "GET" });
}

function makePOST(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function dispatchCmd(command: string, body: Record<string, unknown>) {
  return manifestDispatch(makePOST("http://localhost", body), {
    params: Promise.resolve({ entity: "Equipment", command }),
  });
}

// ── Tests ────────────────────────────────────────────────────────────

describe("Equipment API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth gates ─────────────────────────────────────────────────────

  describe("auth gates", () => {
    it("returns 401 when unauthenticated (list)", async () => {
      mocks.auth.mockResolvedValue({ orgId: null, userId: null });
      const res = await listGET(makeGET());
      expect(res.status).toBe(401);
    });

    it("returns 400 when tenant not found (list)", async () => {
      mocks.auth.mockResolvedValue({ orgId: ORG_ID, userId: USER_ID });
      mocks.tenant.mockResolvedValue(null);
      const res = await listGET(makeGET());
      expect(res.status).toBe(400);
    });
  });

  // ── GET /list ──────────────────────────────────────────────────────

  describe("GET /list", () => {
    it("returns equipment list with total count", async () => {
      setAuth();
      const mockEquipment = [
        {
          id: EQUIPMENT_ID,
          name: "Oven A",
          type: "oven",
          status: "active",
          workOrders: [],
          _count: { workOrders: 0 },
        },
      ];
      mocks.eqFindMany.mockResolvedValue(mockEquipment);
      mocks.eqCount.mockResolvedValue(1);

      const res = await listGET(makeGET());
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.equipment).toHaveLength(1);
      expect(json.total).toBe(1);
      expect(mocks.eqFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_A }),
        })
      );
    });

    it("filters by status and type", async () => {
      setAuth();
      mocks.eqFindMany.mockResolvedValue([]);
      mocks.eqCount.mockResolvedValue(0);

      await listGET(
        makeGET(
          "http://localhost/api/kitchen/equipment/list?status=maintenance&type=oven"
        )
      );

      expect(mocks.eqFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "maintenance",
            type: "oven",
          }),
        })
      );
    });

    it("returns empty list when no equipment", async () => {
      setAuth();
      mocks.eqFindMany.mockResolvedValue([]);
      mocks.eqCount.mockResolvedValue(0);

      const res = await listGET(makeGET());
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.equipment).toHaveLength(0);
      expect(json.total).toBe(0);
    });
  });

  // ── POST /create ───────────────────────────────────────────────────

  describe("POST /create", () => {
    it("delegates to runManifestCommand with entity Equipment and command create", async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({
        id: USER_ID,
        tenantId: TENANT_A,
        role: "admin",
      } as never);

      mocks.runManifestCommand.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: {
              id: EQUIPMENT_ID,
              name: "Oven A",
              type: "general",
              locationId: LOCATION_ID,
            },
          }),
          { status: 200 }
        )
      );

      const res = await dispatchCmd("create", {
        name: "Oven A",
        locationId: LOCATION_ID,
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.result.name).toBe("Oven A");
      expect(mocks.runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({ entity: "Equipment", command: "create" })
      );
    });
  });

  // ── POST /update-status ────────────────────────────────────────────

  describe("POST /update-status", () => {
    it("delegates to runManifestCommand with entity Equipment and command updateStatus", async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({
        id: USER_ID,
        tenantId: TENANT_A,
        role: "admin",
      } as never);

      mocks.runManifestCommand.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: EQUIPMENT_ID, status: "maintenance" },
          }),
          { status: 200 }
        )
      );

      const res = await dispatchCmd("updateStatus", {
        id: EQUIPMENT_ID,
        status: "maintenance",
      });
      expect(res.status).toBe(200);
      expect(mocks.runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Equipment",
          command: "updateStatus",
        })
      );
    });
  });

  // ── POST /schedule-maintenance ─────────────────────────────────────

  describe("POST /schedule-maintenance", () => {
    it("delegates to runManifestCommand with entity Equipment and command scheduleMaintenance", async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({
        id: USER_ID,
        tenantId: TENANT_A,
        role: "admin",
      } as never);

      mocks.runManifestCommand.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { workOrderId: "wo-1", equipmentId: EQUIPMENT_ID },
          }),
          { status: 200 }
        )
      );

      const res = await dispatchCmd("scheduleMaintenance", {
        equipmentId: EQUIPMENT_ID,
        priority: "high",
        scheduledDate: "2026-06-01",
      });
      expect(res.status).toBe(200);
      expect(mocks.runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Equipment",
          command: "scheduleMaintenance",
        })
      );
    });
  });

  // ── POST /record-usage ─────────────────────────────────────────────

  describe("POST /record-usage", () => {
    it("delegates to runManifestCommand with entity Equipment and command recordUsage", async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({
        id: USER_ID,
        tenantId: TENANT_A,
        role: "admin",
      } as never);

      mocks.runManifestCommand.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: EQUIPMENT_ID, usageHours: 150, addedHours: 50 },
          }),
          { status: 200 }
        )
      );

      const res = await dispatchCmd("recordUsage", {
        id: EQUIPMENT_ID,
        hours: 50,
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.result.addedHours).toBe(50);
      expect(json.result.usageHours).toBe(150);
      expect(mocks.runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({ entity: "Equipment", command: "recordUsage" })
      );
    });
  });

  // ── GET /alerts ────────────────────────────────────────────────────

  describe("GET /alerts", () => {
    it("returns empty alerts for healthy equipment", async () => {
      setAuth();
      mocks.eqFindMany.mockResolvedValue([
        {
          id: EQUIPMENT_ID,
          name: "Oven A",
          usageHours: 100,
          maxUsageHours: 1000,
          condition: "good",
          isActive: true,
          connectionStatus: "connected",
          iotDeviceId: null,
          nextMaintenanceDate: new Date("2027-01-01"),
          warrantyExpiry: new Date("2028-01-01"),
          workOrders: [],
        },
      ]);

      const res = await alertsGET(
        makeGET("http://localhost/api/kitchen/equipment/alerts")
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.alerts).toHaveLength(0);
      expect(json.summary.total).toBe(0);
      expect(json.summary.bySeverity.critical).toBe(0);
    });

    it("detects usage warning at >= 80%", async () => {
      setAuth();
      mocks.eqFindMany.mockResolvedValue([
        {
          id: EQUIPMENT_ID,
          name: "Oven A",
          usageHours: 850,
          maxUsageHours: 1000,
          condition: "good",
          isActive: true,
          connectionStatus: "connected",
          iotDeviceId: null,
          nextMaintenanceDate: null,
          warrantyExpiry: null,
          workOrders: [],
        },
      ]);

      const res = await alertsGET(
        makeGET("http://localhost/api/kitchen/equipment/alerts")
      );
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.alerts).toHaveLength(1);
      expect(json.alerts[0].alertType).toBe("usage_warning");
      expect(json.alerts[0].severity).toBe("warning");
      expect(json.summary.bySeverity.warning).toBe(1);
    });

    it("detects critical usage at >= 90%", async () => {
      setAuth();
      mocks.eqFindMany.mockResolvedValue([
        {
          id: EQUIPMENT_ID,
          name: "Oven A",
          usageHours: 950,
          maxUsageHours: 1000,
          condition: "good",
          isActive: true,
          connectionStatus: "connected",
          iotDeviceId: null,
          nextMaintenanceDate: null,
          warrantyExpiry: null,
          workOrders: [],
        },
      ]);

      const res = await alertsGET(
        makeGET("http://localhost/api/kitchen/equipment/alerts")
      );
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.alerts[0].alertType).toBe("usage_critical");
      expect(json.alerts[0].severity).toBe("critical");
    });

    it("detects overdue maintenance", async () => {
      setAuth();
      mocks.eqFindMany.mockResolvedValue([
        {
          id: EQUIPMENT_ID,
          name: "Oven A",
          usageHours: 10,
          maxUsageHours: 1000,
          condition: "good",
          isActive: true,
          connectionStatus: "connected",
          iotDeviceId: null,
          nextMaintenanceDate: new Date("2025-01-01"),
          warrantyExpiry: null,
          workOrders: [],
        },
      ]);

      const res = await alertsGET(
        makeGET("http://localhost/api/kitchen/equipment/alerts")
      );
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(
        json.alerts.some(
          (a: { alertType: string }) => a.alertType === "maintenance_overdue"
        )
      ).toBe(true);
    });

    it("detects IoT disconnection", async () => {
      setAuth();
      mocks.eqFindMany.mockResolvedValue([
        {
          id: EQUIPMENT_ID,
          name: "Oven A",
          usageHours: 10,
          maxUsageHours: 1000,
          condition: "good",
          isActive: true,
          connectionStatus: "disconnected",
          iotDeviceId: "probe-001",
          nextMaintenanceDate: null,
          warrantyExpiry: null,
          workOrders: [],
        },
      ]);

      const res = await alertsGET(
        makeGET("http://localhost/api/kitchen/equipment/alerts")
      );
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(
        json.alerts.some(
          (a: { alertType: string }) => a.alertType === "iot_disconnected"
        )
      ).toBe(true);
    });

    it("sorts alerts by severity (critical first)", async () => {
      setAuth();
      const pastDate = new Date("2024-01-01");
      mocks.eqFindMany.mockResolvedValue([
        {
          id: "eq-1",
          name: "Oven",
          usageHours: 950,
          maxUsageHours: 1000,
          condition: "good",
          isActive: true,
          connectionStatus: "disconnected",
          iotDeviceId: "probe-1",
          nextMaintenanceDate: pastDate,
          warrantyExpiry: pastDate,
          workOrders: [],
        },
      ]);

      const res = await alertsGET(
        makeGET("http://localhost/api/kitchen/equipment/alerts")
      );
      const json = await res.json();
      expect(json.success).toBe(true);
      const severities = json.alerts.map(
        (a: { severity: string }) => a.severity
      );
      let lastOrder = -1;
      const order: Record<string, number> = {
        critical: 0,
        warning: 1,
        info: 2,
      };
      for (const sev of severities) {
        expect(order[sev]).toBeGreaterThanOrEqual(lastOrder);
        lastOrder = order[sev];
      }
    });
  });
});
