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
  eqFindMany: vi.fn(),
  eqFindFirst: vi.fn(),
  eqCreate: vi.fn(),
  eqUpdate: vi.fn(),
  eqCount: vi.fn(),
  woCreate: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: mocks.tenant,
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
  "@/app/api/kitchen/equipment/commands/create/route"
);
const { POST: updateStatusPOST } = await import(
  "@/app/api/kitchen/equipment/commands/update-status/route"
);
const { POST: scheduleMaintenancePOST } = await import(
  "@/app/api/kitchen/equipment/commands/schedule-maintenance/route"
);
const { POST: recordUsagePOST } = await import(
  "@/app/api/kitchen/equipment/commands/record-usage/route"
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
        equipment: unknown[];
        total: number;
      };
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
        equipment: unknown[];
        total: number;
      };
      expect(json.equipment).toHaveLength(0);
      expect(json.total).toBe(0);
    });
  });

  // ── POST /create ───────────────────────────────────────────────────

  describe("POST /create", () => {
    it("creates equipment with required fields", async () => {
      setAuth();
      const mockCreated = {
        id: EQUIPMENT_ID,
        tenantId: TENANT_A,
        name: "Oven A",
        type: "general",
        locationId: LOCATION_ID,
      };
      mocks.eqCreate.mockResolvedValue(mockCreated);

      const res = await createPOST(
        makeRequest("http://localhost", {
          name: "Oven A",
          locationId: LOCATION_ID,
        })
      );
      expect(res.status).toBe(201);

      const json = (await res.json()) as { equipment: { name: string } };
      expect(json.equipment.name).toBe("Oven A");
      expect(mocks.eqCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_A,
            name: "Oven A",
            locationId: LOCATION_ID,
          }),
        })
      );
    });

    it("returns 400 when name is missing", async () => {
      setAuth();
      const res = await createPOST(
        makeRequest("http://localhost", { locationId: LOCATION_ID })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when locationId is missing", async () => {
      setAuth();
      const res = await createPOST(
        makeRequest("http://localhost", { name: "Oven A" })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when locationId is not a valid UUID", async () => {
      setAuth();
      const res = await createPOST(
        makeRequest("http://localhost", {
          name: "Oven A",
          locationId: "not-a-uuid",
        })
      );
      expect(res.status).toBe(400);
    });
  });

  // ── POST /update-status ────────────────────────────────────────────

  describe("POST /update-status", () => {
    it("updates equipment status", async () => {
      setAuth();
      mocks.eqFindFirst.mockResolvedValue({ id: EQUIPMENT_ID });
      mocks.eqUpdate.mockResolvedValue({
        id: EQUIPMENT_ID,
        status: "maintenance",
      });

      const res = await updateStatusPOST(
        makeRequest("http://localhost", {
          id: EQUIPMENT_ID,
          status: "maintenance",
        })
      );
      expect(res.status).toBe(200);
      expect(mocks.eqUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "maintenance" }),
        })
      );
    });

    it("returns 404 when equipment not found", async () => {
      setAuth();
      mocks.eqFindFirst.mockResolvedValue(null);

      const res = await updateStatusPOST(
        makeRequest("http://localhost", {
          id: EQUIPMENT_ID,
          status: "active",
        })
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid status", async () => {
      setAuth();
      const res = await updateStatusPOST(
        makeRequest("http://localhost", {
          id: EQUIPMENT_ID,
          status: "invalid_status",
        })
      );
      expect(res.status).toBe(400);
    });
  });

  // ── POST /schedule-maintenance ─────────────────────────────────────

  describe("POST /schedule-maintenance", () => {
    it("creates work order and updates equipment status", async () => {
      setAuth();
      mocks.eqFindFirst.mockResolvedValue({
        id: EQUIPMENT_ID,
        name: "Oven A",
      });
      mocks.woCreate.mockResolvedValue({
        id: "wo-1",
        equipmentId: EQUIPMENT_ID,
        title: "Maintenance: Oven A",
        type: "maintenance",
      });
      mocks.eqUpdate.mockResolvedValue({ id: EQUIPMENT_ID });

      const res = await scheduleMaintenancePOST(
        makeRequest("http://localhost", {
          equipmentId: EQUIPMENT_ID,
          priority: "high",
          scheduledDate: "2026-06-01",
        })
      );
      expect(res.status).toBe(201);
      expect(mocks.woCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            equipmentId: EQUIPMENT_ID,
            equipmentName: "Oven A",
            type: "maintenance",
            priority: "high",
          }),
        })
      );
      expect(mocks.eqUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "maintenance" }),
        })
      );
    });

    it("returns 400 when equipmentId missing", async () => {
      setAuth();
      const res = await scheduleMaintenancePOST(
        makeRequest("http://localhost", {})
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 when equipment not found", async () => {
      setAuth();
      mocks.eqFindFirst.mockResolvedValue(null);
      const res = await scheduleMaintenancePOST(
        makeRequest("http://localhost", { equipmentId: EQUIPMENT_ID })
      );
      expect(res.status).toBe(404);
    });
  });

  // ── POST /record-usage ─────────────────────────────────────────────

  describe("POST /record-usage", () => {
    it("accumulates usage hours", async () => {
      setAuth();
      mocks.eqFindFirst.mockResolvedValue({
        id: EQUIPMENT_ID,
        usageHours: 100,
        maxUsageHours: 1000,
      });
      mocks.eqUpdate.mockResolvedValue({
        id: EQUIPMENT_ID,
        usageHours: 150,
      });

      const res = await recordUsagePOST(
        makeRequest("http://localhost", {
          id: EQUIPMENT_ID,
          hours: 50,
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        totalHours: number;
        addedHours: number;
      };
      expect(json.addedHours).toBe(50);
      expect(json.totalHours).toBe(150);
      expect(mocks.eqUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ usageHours: 150 }),
        })
      );
    });

    it("returns 400 when hours is negative", async () => {
      setAuth();
      const res = await recordUsagePOST(
        makeRequest("http://localhost", {
          id: EQUIPMENT_ID,
          hours: -5,
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 when equipment not found", async () => {
      setAuth();
      mocks.eqFindFirst.mockResolvedValue(null);
      const res = await recordUsagePOST(
        makeRequest("http://localhost", {
          id: EQUIPMENT_ID,
          hours: 10,
        })
      );
      expect(res.status).toBe(404);
    });

    it("auto-sets condition to fair at 80% usage", async () => {
      setAuth();
      mocks.eqFindFirst.mockResolvedValue({
        id: EQUIPMENT_ID,
        usageHours: 790,
        maxUsageHours: 1000,
      });
      mocks.eqUpdate.mockResolvedValue({ id: EQUIPMENT_ID });

      await recordUsagePOST(
        makeRequest("http://localhost", {
          id: EQUIPMENT_ID,
          hours: 20,
        })
      );

      expect(mocks.eqUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ condition: "fair" }),
        })
      );
    });

    it("auto-sets condition to needs_replacement at 100% usage", async () => {
      setAuth();
      mocks.eqFindFirst.mockResolvedValue({
        id: EQUIPMENT_ID,
        usageHours: 990,
        maxUsageHours: 1000,
      });
      mocks.eqUpdate.mockResolvedValue({ id: EQUIPMENT_ID });

      await recordUsagePOST(
        makeRequest("http://localhost", {
          id: EQUIPMENT_ID,
          hours: 20,
        })
      );

      expect(mocks.eqUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            condition: "needs_replacement",
          }),
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
        alerts: unknown[];
        summary: { total: number; critical: number };
      };
      expect(json.alerts).toHaveLength(0);
      expect(json.summary.total).toBe(0);
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
        alerts: { alertType: string; severity: string }[];
        summary: { warning: number };
      };
      expect(json.alerts).toHaveLength(1);
      expect(json.alerts[0].alertType).toBe("usage_warning");
      expect(json.alerts[0].severity).toBe("warning");
      expect(json.summary.warning).toBe(1);
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
        alerts: { alertType: string; severity: string }[];
      };
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
        alerts: { alertType: string }[];
      };
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
        alerts: { alertType: string }[];
      };
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
        alerts: { severity: string }[];
      };
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
