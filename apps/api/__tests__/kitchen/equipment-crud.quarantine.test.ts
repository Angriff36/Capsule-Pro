// @vitest-environment node
//
// Equipment CRUD + Alerts test suite
// Covers: GET /list, POST /create, POST /update-status,
//         POST /schedule-maintenance, POST /record-usage, GET /alerts

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── constants ────────────────────────────────────────────────────────
const TENANT_A = "10000000-0000-0000-0000-000000000001";
const TENANT_B = "20000000-0000-0000-0000-000000000002";
const ORG_ID = "org_123";
const USER_ID = "user_456";
const LOCATION_ID = "30000000-0000-0000-0000-000000000003";
const EQUIPMENT_ID = "40000000-0000-0000-0000-000000000004";

// ── hoisted mocks ────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  tenant: vi.fn(),
  resolveCurrentUser: vi.fn(),
  eqFindMany: vi.fn(),
  eqFindFirst: vi.fn(),
  eqCreate: vi.fn(),
  eqUpdate: vi.fn(),
  eqCount: vi.fn(),
  woCreate: vi.fn(),
  captureException: vi.fn(),
  runManifestCommand: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: mocks.tenant,
  resolveCurrentUser: mocks.resolveCurrentUser,
}));
vi.mock("@/lib/database", () => ({
  database: {
    equipment: {
      findMany: mocks.eqFindMany,
      findFirst: mocks.eqFindFirst,
      create: mocks.eqCreate,
      update: mocks.eqUpdate,
      count: mocks.eqCount,
    },
    workOrder: {
      create: mocks.woCreate,
    },
  },
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
}));
vi.mock("@repo/notifications", () => ({
  buildWebhookPayload: vi.fn(),
  determineNextStatus: vi.fn(),
  sendWebhook: vi.fn(),
  shouldAutoDisable: vi.fn(),
  shouldTriggerWebhook: vi.fn(),
}));
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: mocks.runManifestCommand,
}));

function setAuth(tenantId: string | null = TENANT_A) {
  mocks.auth.mockResolvedValue({ orgId: ORG_ID, userId: USER_ID });
  mocks.tenant.mockResolvedValue(tenantId);
}

function makeRequest(
  url = "http://localhost/api/kitchen/equipment/list",
  body?: Record<string, unknown>,
  method?: string
) {
  const resolvedMethod = method ?? (body ? "POST" : "GET");
  if (body) {
    return new NextRequest(url, {
      method: resolvedMethod,
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }
  return new NextRequest(url, { method: resolvedMethod });
}

// ── import routes (after mocks) ──────────────────────────────────────
const { GET: listGET } = await import("@/app/api/kitchen/equipment/list/route");
const { POST: createPOST } = await import(
  "@/app/api/manifest/[entity]/commands/[command]/route"
);
const { POST: updateStatusPOST } = await import(
  "@/app/api/manifest/[entity]/commands/[command]/route"
);
const { POST: scheduleMaintenancePOST } = await import(
  "@/app/api/manifest/[entity]/commands/[command]/route"
);
const { POST: recordUsagePOST } = await import(
  "@/app/api/manifest/[entity]/commands/[command]/route"
);
const { GET: alertsGET } = await import(
  "@/app/api/kitchen/equipment/alerts/route"
);

// ── tests ────────────────────────────────────────────────────────────

describe("Equipment API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── auth gates ─────────────────────────────────────────────────────

  describe("auth gates", () => {
    it("returns 401 when unauthenticated", async () => {
      mocks.auth.mockResolvedValue({ orgId: null, userId: null });
      const res = await listGET(makeRequest());
      expect(res.status).toBe(401);
    });

    it("returns 400 when tenant not found", async () => {
      mocks.auth.mockResolvedValue({ orgId: ORG_ID, userId: USER_ID });
      mocks.tenant.mockResolvedValue(null);
      const res = await listGET(makeRequest());
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

      const res = await listGET(makeRequest());
      expect(res.status).toBe(200);

      const json = (await res.json()) as {
        success: boolean;
        equipment: unknown[];
        total: number;
      };
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
        makeRequest(
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

      const res = await listGET(makeRequest());
      const json = (await res.json()) as {
        success: boolean;
        equipment: unknown[];
        total: number;
      };
      expect(json.success).toBe(true);
      expect(json.equipment).toHaveLength(0);
      expect(json.total).toBe(0);
    });
  });

  // ── POST /create ───────────────────────────────────────────────────

  describe("POST /create", () => {
    it("delegates to runManifestCommand with entity Equipment and command create", async () => {
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
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const req = makeRequest("http://localhost", {
        name: "Oven A",
        locationId: LOCATION_ID,
      });
      const res = await createPOST(req, {
        params: Promise.resolve({ entity: "Equipment", command: "create" }),
      });
      expect(res.status).toBe(200);

      const json = (await res.json()) as {
        success: boolean;
        result: { name: string };
      };
      expect(json.success).toBe(true);
      expect(json.result.name).toBe("Oven A");

      expect(mocks.runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Equipment",
          command: "create",
        })
      );
    });
  });

  // ── POST /update-status ────────────────────────────────────────────

  describe("POST /update-status", () => {
    it("delegates to runManifestCommand with entity Equipment and command updateStatus", async () => {
      mocks.runManifestCommand.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: EQUIPMENT_ID, status: "maintenance" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const req = makeRequest("http://localhost", {
        id: EQUIPMENT_ID,
        status: "maintenance",
      });
      const res = await updateStatusPOST(req, {
        params: Promise.resolve({
          entity: "Equipment",
          command: "updateStatus",
        }),
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
      mocks.runManifestCommand.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: {
              workOrderId: "wo-1",
              equipmentId: EQUIPMENT_ID,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const req = makeRequest("http://localhost", {
        equipmentId: EQUIPMENT_ID,
        priority: "high",
        scheduledDate: "2026-06-01",
      });
      const res = await scheduleMaintenancePOST(req, {
        params: Promise.resolve({
          entity: "Equipment",
          command: "scheduleMaintenance",
        }),
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
      mocks.runManifestCommand.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: {
              id: EQUIPMENT_ID,
              usageHours: 150,
              addedHours: 50,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const req = makeRequest("http://localhost", {
        id: EQUIPMENT_ID,
        hours: 50,
      });
      const res = await recordUsagePOST(req, {
        params: Promise.resolve({
          entity: "Equipment",
          command: "recordUsage",
        }),
      });
      expect(res.status).toBe(200);

      const json = (await res.json()) as {
        success: boolean;
        result: { usageHours: number; addedHours: number };
      };
      expect(json.success).toBe(true);
      expect(json.result.addedHours).toBe(50);
      expect(json.result.usageHours).toBe(150);

      expect(mocks.runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Equipment",
          command: "recordUsage",
        })
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

      const res = await alertsGET(makeRequest());
      expect(res.status).toBe(200);

      const json = (await res.json()) as {
        success: boolean;
        alerts: unknown[];
        summary: {
          total: number;
          bySeverity: { critical: number; high: number; medium: number };
        };
      };
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

      const res = await alertsGET(makeRequest());
      const json = (await res.json()) as {
        success: boolean;
        alerts: { alertType: string; severity: string }[];
        summary: {
          total: number;
          bySeverity: { critical: number; warning: number; info: number };
        };
      };
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

      const res = await alertsGET(makeRequest());
      const json = (await res.json()) as {
        success: boolean;
        alerts: { alertType: string; severity: string }[];
      };
      expect(json.success).toBe(true);
      expect(json.alerts[0].alertType).toBe("usage_critical");
      expect(json.alerts[0].severity).toBe("critical");
    });

    it("detects overdue maintenance", async () => {
      setAuth();
      const pastDate = new Date("2025-01-01");
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
          nextMaintenanceDate: pastDate,
          warrantyExpiry: null,
          workOrders: [],
        },
      ]);

      const res = await alertsGET(makeRequest());
      const json = (await res.json()) as {
        success: boolean;
        alerts: { alertType: string }[];
      };
      expect(json.success).toBe(true);
      expect(
        json.alerts.some((a) => a.alertType === "maintenance_overdue")
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

      const res = await alertsGET(makeRequest());
      const json = (await res.json()) as {
        success: boolean;
        alerts: { alertType: string }[];
      };
      expect(json.success).toBe(true);
      expect(json.alerts.some((a) => a.alertType === "iot_disconnected")).toBe(
        true
      );
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

      const res = await alertsGET(makeRequest());
      const json = (await res.json()) as {
        success: boolean;
        alerts: { severity: string }[];
      };
      expect(json.success).toBe(true);
      // All critical alerts should come before warning, which comes before info
      const severities = json.alerts.map((a) => a.severity);
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
