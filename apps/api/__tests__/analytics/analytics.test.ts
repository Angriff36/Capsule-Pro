/**
 * Analytics API Test Suite
 *
 * Tests three analytics endpoints:
 * - GET /api/analytics/finance — financial aggregation with raw SQL
 * - GET /api/analytics/kitchen — kitchen performance with raw SQL
 * - GET /api/analytics/staff/summary — employee performance with raw SQL
 *
 * All routes use heavy $queryRaw for complex aggregation. Tests mock
 * $queryRaw to return sample data matching the expected interfaces and
 * verify response structure, auth guards, and error handling.
 */

import { database } from "@repo/database";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vi.fn(),
    budgetAlert: {
      findMany: vi.fn(),
    },
    allergenWarning: {
      count: vi.fn(),
    },
    wasteEntry: {
      count: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn().mockResolvedValue({
    id: "test-user-id",
    tenantId: "test-tenant",
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  }),
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");

// --- Route imports ---

import { GET as getFinanceAnalytics } from "@/app/api/analytics/finance/route";
import { GET as getKitchenAnalytics } from "@/app/api/analytics/kitchen/route";
import { GET as getStaffSummary } from "@/app/api/analytics/staff/summary/route";

// --- Constants ---

const AN_TENANT_ID = "00000000-0000-0000-0000-000000000040";
const AN_ORG_ID = "org_analytics_test";

// --- Helpers ---

function makeAuthedUser() {
  vi.mocked(auth).mockResolvedValue({ orgId: AN_ORG_ID } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(AN_TENANT_ID);
}

function makeRequest(url: string): Request {
  return new Request(new URL(url, "http://localhost:3000"));
}

// Sample raw SQL result shapes matching the TypeScript interfaces in each route.

const sampleCurrentMetrics = [
  {
    total_events: "10",
    budgeted_revenue: "100000",
    actual_revenue: "95000",
    budgeted_food_cost: "30000",
    actual_food_cost: "28000",
    budgeted_labor_cost: "20000",
    actual_labor_cost: "21000",
    budgeted_other_cost: "5000",
    actual_other_cost: "4500",
  },
];

const samplePreviousMetrics = [
  {
    total_events: "8",
    budgeted_revenue: "80000",
    actual_revenue: "75000",
    actual_food_cost: "25000",
    actual_labor_cost: "18000",
  },
];

const sampleLedgerData = [
  {
    pending_proposals: "5",
    active_contracts: "45000",
    deposits_received: "15000",
  },
];

const sampleStationMetrics = [
  {
    station_id: "station-001",
    station_name: "Grill",
    total_items: "50",
    completed_items: "40",
    avg_completion_minutes: "25.5",
  },
];

const samplePrepListsSync = [{ total: "20", completed: "18" }];
const sampleTimeToCompletion = [{ avg_minutes: "35.2" }];

const sampleStationTrends = [
  {
    date: "2026-04-28",
    station_name: "Grill",
    total: "10",
    completed: "8",
  },
  {
    date: "2026-04-28",
    station_name: "Saute",
    total: "12",
    completed: "10",
  },
];

const sampleTopPerformers = [
  {
    employee_id: "emp-001",
    first_name: "Alice",
    last_name: "Smith",
    completed_tasks: "45",
    avg_minutes: "22.5",
  },
];

const sampleEmployeePerformance = [
  {
    employee_id: "emp-001",
    first_name: "Alice",
    last_name: "Smith",
    role: "cook",
    total_tasks: "50",
    completed_tasks: "45",
    avg_duration_hours: "1.5",
    on_time_tasks: "40",
    total_shifts: "20",
    attended_shifts: "19",
    punctual_shifts: "18",
    total_hours: "160",
    progress_count: "50",
    rework_count: "2",
    client_interactions: "5",
    event_participation: "3",
  },
];

const sampleMonthlyTrends = [
  {
    month: "2026-03",
    avg_task_completion_rate: "90.0",
    avg_quality_score: "95.0",
    avg_efficiency_score: "80.0",
  },
  {
    month: "2026-04",
    avg_task_completion_rate: "92.0",
    avg_quality_score: "96.0",
    avg_efficiency_score: "82.0",
  },
];

// --- Tests ---

describe("Analytics API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    makeAuthedUser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ================================================================== FINANCE
  describe("GET /api/analytics/finance", () => {
    function setupFinanceMocks() {
      // The finance route makes 4 parallel calls via Promise.all:
      // 1. fetchCurrentPeriodMetrics -> $queryRaw
      // 2. fetchPreviousPeriodMetrics -> $queryRaw
      // 3. fetchLedgerData -> $queryRaw
      // 4. fetchBudgetAlerts -> budgetAlert.findMany
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce(sampleCurrentMetrics) // current metrics
        .mockResolvedValueOnce(samplePreviousMetrics) // previous metrics
        .mockResolvedValueOnce(sampleLedgerData); // ledger data
      vi.mocked(database.budgetAlert.findMany).mockResolvedValue([]);
    }

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as never);

      const response = await getFinanceAnalytics(
        makeRequest("/api/analytics/finance")
      );
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("should return finance analytics with default period", async () => {
      setupFinanceMocks();

      const response = await getFinanceAnalytics(
        makeRequest("/api/analytics/finance")
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.summary).toBeDefined();
      expect(body.summary.period).toBe("30d");
      expect(body.summary.startDate).toBeDefined();
      expect(body.summary.endDate).toBeDefined();
      expect(body.summary.locationId).toBeNull();
    });

    it("should return correct financeHighlights structure", async () => {
      setupFinanceMocks();

      const response = await getFinanceAnalytics(
        makeRequest("/api/analytics/finance")
      );
      const body = await response.json();

      expect(body.financeHighlights).toHaveLength(3);
      for (const highlight of body.financeHighlights) {
        expect(highlight).toHaveProperty("label");
        expect(highlight).toHaveProperty("value");
        expect(highlight).toHaveProperty("trend");
        expect(highlight).toHaveProperty("isPositive");
      }
    });

    it("should return correct ledgerSummary structure", async () => {
      setupFinanceMocks();

      const response = await getFinanceAnalytics(
        makeRequest("/api/analytics/finance")
      );
      const body = await response.json();

      expect(body.ledgerSummary).toHaveLength(3);
      expect(body.ledgerSummary[0]).toHaveProperty("label");
      expect(body.ledgerSummary[0]).toHaveProperty("amount");
    });

    it("should return financeAlerts structure", async () => {
      setupFinanceMocks();

      const response = await getFinanceAnalytics(
        makeRequest("/api/analytics/finance")
      );
      const body = await response.json();

      expect(Array.isArray(body.financeAlerts)).toBe(true);
      for (const alert of body.financeAlerts) {
        expect(alert).toHaveProperty("message");
        expect(alert).toHaveProperty("severity");
        expect(["High", "Medium", "Low"]).toContain(alert.severity);
      }
    });

    it("should return correct metrics with calculated values", async () => {
      setupFinanceMocks();

      const response = await getFinanceAnalytics(
        makeRequest("/api/analytics/finance")
      );
      const body = await response.json();

      expect(body.metrics).toBeDefined();
      expect(body.metrics.totalEvents).toBe(10);
      expect(body.metrics.budgetedRevenue).toBe(100_000);
      expect(body.metrics.actualRevenue).toBe(95_000);
      expect(body.metrics.actualFoodCost).toBe(28_000);
      expect(body.metrics.actualLaborCost).toBe(21_000);
      expect(body.metrics.totalCost).toBeDefined();
      expect(body.metrics.grossProfit).toBeDefined();
      expect(body.metrics.grossProfitMargin).toBeDefined();
    });

    it("should use period from query params", async () => {
      setupFinanceMocks();

      const response = await getFinanceAnalytics(
        makeRequest("/api/analytics/finance?period=90d")
      );
      const body = await response.json();
      expect(body.summary.period).toBe("90d");
    });

    it("should include locationId when provided", async () => {
      setupFinanceMocks();

      const locId = "loc-001";
      const response = await getFinanceAnalytics(
        makeRequest(`/api/analytics/finance?locationId=${locId}`)
      );
      const body = await response.json();
      expect(body.summary.locationId).toBe(locId);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(
        new Error("DB connection lost")
      );

      const response = await getFinanceAnalytics(
        makeRequest("/api/analytics/finance")
      );
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.message).toBe("Failed to fetch finance analytics");
    });

    it("should handle empty metrics gracefully", async () => {
      // Return empty arrays (no data)
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([]) // current
        .mockResolvedValueOnce([]) // previous
        .mockResolvedValueOnce([]); // ledger
      vi.mocked(database.budgetAlert.findMany).mockResolvedValue([]);

      const response = await getFinanceAnalytics(
        makeRequest("/api/analytics/finance")
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.metrics.totalEvents).toBe(0);
      expect(body.metrics.actualRevenue).toBe(0);
      // Should provide default financeAlerts when no alerts exist
      expect(body.financeAlerts.length).toBeGreaterThanOrEqual(2);
    });

    it("should include budget alerts in financeAlerts", async () => {
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce(sampleCurrentMetrics)
        .mockResolvedValueOnce(samplePreviousMetrics)
        .mockResolvedValueOnce(sampleLedgerData);
      vi.mocked(database.budgetAlert.findMany).mockResolvedValue([
        {
          id: "alert-001",
          message: "Budget overrun detected",
          alertType: "overrun",
          utilization: 105 as never,
          tenantId: AN_TENANT_ID,
          resolvedAt: null,
          createdAt: new Date(),
        } as never,
      ]);

      const response = await getFinanceAnalytics(
        makeRequest("/api/analytics/finance")
      );
      const body = await response.json();

      expect(body.financeAlerts).toHaveLength(1);
      expect(body.financeAlerts[0].message).toContain(
        "Budget overrun detected"
      );
      expect(body.financeAlerts[0].severity).toBe("High");
    });
  });

  // ================================================================== KITCHEN
  describe("GET /api/analytics/kitchen", () => {
    function setupKitchenMocks() {
      // Kitchen route makes 4 parallel calls:
      // 1. fetchStationMetrics -> $queryRaw
      // 2. fetchKitchenHealthMetrics -> multiple calls inside:
      //    a. $queryRaw (prepListsSync)
      //    b. allergenWarning.count
      //    c. wasteEntry.count
      //    d. $queryRaw (timeToCompletion)
      // 3. fetchStationTrends -> $queryRaw
      // 4. fetchTopPerformers -> $queryRaw
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce(sampleStationMetrics) // station metrics
        .mockResolvedValueOnce(samplePrepListsSync) // prep lists sync
        .mockResolvedValueOnce(sampleTimeToCompletion) // time to completion
        .mockResolvedValueOnce(sampleStationTrends) // station trends
        .mockResolvedValueOnce(sampleTopPerformers); // top performers
      vi.mocked(database.allergenWarning.count).mockResolvedValue(2);
      vi.mocked(database.wasteEntry.count).mockResolvedValue(5);
    }

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as never);

      const response = await getKitchenAnalytics(
        makeRequest("/api/analytics/kitchen")
      );
      expect(response.status).toBe(401);
    });

    it("should return kitchen analytics with default period", async () => {
      setupKitchenMocks();

      const response = await getKitchenAnalytics(
        makeRequest("/api/analytics/kitchen")
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.summary).toBeDefined();
      expect(body.summary.period).toBe("30d");
      expect(body.summary.startDate).toBeDefined();
      expect(body.summary.endDate).toBeDefined();
    });

    it("should return stationThroughput with correct structure", async () => {
      setupKitchenMocks();

      const response = await getKitchenAnalytics(
        makeRequest("/api/analytics/kitchen")
      );
      const body = await response.json();

      expect(body.stationThroughput).toHaveLength(1);
      const station = body.stationThroughput[0];
      expect(station.stationId).toBe("station-001");
      expect(station.stationName).toBe("Grill");
      expect(station.totalItems).toBe(50);
      expect(station.completedItems).toBe(40);
      expect(station.pendingItems).toBe(10);
      expect(station.load).toBeDefined();
      expect(station.completed).toBeDefined();
      expect(station.avgTime).toBeDefined();
    });

    it("should return kitchenHealth with correct structure", async () => {
      setupKitchenMocks();

      const response = await getKitchenAnalytics(
        makeRequest("/api/analytics/kitchen")
      );
      const body = await response.json();

      expect(body.kitchenHealth).toBeDefined();
      expect(body.kitchenHealth.prepListsSync).toBeDefined();
      expect(body.kitchenHealth.prepListsSync.rate).toBeDefined();
      expect(body.kitchenHealth.prepListsSync.total).toBe(20);
      expect(body.kitchenHealth.prepListsSync.completed).toBe(18);
      expect(body.kitchenHealth.allergenWarnings).toBe(2);
      expect(body.kitchenHealth.wasteAlerts).toBe(5);
      expect(body.kitchenHealth.timeToCompletion).toBeDefined();
      expect(body.kitchenHealth.avgMinutes).toBeDefined();
    });

    it("should return trends with correct structure", async () => {
      setupKitchenMocks();

      const response = await getKitchenAnalytics(
        makeRequest("/api/analytics/kitchen")
      );
      const body = await response.json();

      expect(Array.isArray(body.trends)).toBe(true);
      expect(body.trends.length).toBeGreaterThan(0);
      const trend = body.trends[0];
      expect(trend.date).toBeDefined();
      expect(Array.isArray(trend.stations)).toBe(true);
      const station = trend.stations[0];
      expect(station.stationName).toBeDefined();
      expect(station.total).toBeDefined();
      expect(station.completed).toBeDefined();
      expect(station.completionRate).toBeDefined();
    });

    it("should return topPerformers with correct structure", async () => {
      setupKitchenMocks();

      const response = await getKitchenAnalytics(
        makeRequest("/api/analytics/kitchen")
      );
      const body = await response.json();

      expect(body.topPerformers).toHaveLength(1);
      const performer = body.topPerformers[0];
      expect(performer.employeeId).toBe("emp-001");
      expect(performer.firstName).toBe("Alice");
      expect(performer.lastName).toBe("Smith");
      expect(performer.completedTasks).toBe(45);
      expect(performer.avgMinutes).toBeDefined();
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(
        new Error("Connection refused")
      );

      const response = await getKitchenAnalytics(
        makeRequest("/api/analytics/kitchen")
      );
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.message).toBe("Failed to fetch kitchen analytics");
    });

    it("should use custom period from query params", async () => {
      setupKitchenMocks();

      const response = await getKitchenAnalytics(
        makeRequest("/api/analytics/kitchen?period=7d")
      );
      const body = await response.json();
      expect(body.summary.period).toBe("7d");
    });

    it("should handle empty station metrics gracefully", async () => {
      // All queries return empty arrays
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([]) // station metrics
        .mockResolvedValueOnce([]) // prep lists sync
        .mockResolvedValueOnce([]) // time to completion
        .mockResolvedValueOnce([]) // station trends
        .mockResolvedValueOnce([]); // top performers
      vi.mocked(database.allergenWarning.count).mockResolvedValue(0);
      vi.mocked(database.wasteEntry.count).mockResolvedValue(0);

      const response = await getKitchenAnalytics(
        makeRequest("/api/analytics/kitchen")
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.stationThroughput).toHaveLength(0);
      expect(body.kitchenHealth.prepListsSync.rate).toBe(100); // empty = fully synced
      expect(body.trends).toHaveLength(0);
      expect(body.topPerformers).toHaveLength(0);
    });
  });

  // ================================================================== STAFF SUMMARY
  describe("GET /api/analytics/staff/summary", () => {
    function setupStaffMocks() {
      // Staff summary makes 2 parallel calls:
      // 1. fetchEmployeePerformanceData -> $queryRaw
      // 2. fetchMonthlyTrendsData -> $queryRaw
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce(sampleEmployeePerformance) // performance data
        .mockResolvedValueOnce(sampleMonthlyTrends); // monthly trends
    }

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as never);

      const response = await getStaffSummary(
        makeRequest("/api/analytics/staff/summary")
      );
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("should return staff summary with correct top-level structure", async () => {
      setupStaffMocks();

      const response = await getStaffSummary(
        makeRequest("/api/analytics/staff/summary")
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.totalEmployees).toBe(1);
      expect(body.averageTaskCompletionRate).toBeDefined();
      expect(body.averageAttendanceRate).toBeDefined();
      expect(body.averagePunctualityRate).toBeDefined();
      expect(body.averageQualityScore).toBeDefined();
      expect(body.averageEfficiencyScore).toBeDefined();
      expect(body.topPerformers).toBeDefined();
      expect(body.metricsByRole).toBeDefined();
      expect(body.monthlyTrends).toBeDefined();
    });

    it("should calculate average metrics correctly", async () => {
      setupStaffMocks();

      const response = await getStaffSummary(
        makeRequest("/api/analytics/staff/summary")
      );
      const body = await response.json();

      // employee has 50 tasks, 45 completed = 90% completion rate
      expect(body.averageTaskCompletionRate).toBeCloseTo(90, 0);
      // 20 shifts, 19 attended = 95% attendance
      expect(body.averageAttendanceRate).toBeCloseTo(95, 0);
      // 19 attended, 18 punctual = ~94.7% punctuality
      expect(body.averagePunctualityRate).toBeCloseTo(94.7, 0);
    });

    it("should return topPerformers with correct categories", async () => {
      setupStaffMocks();

      const response = await getStaffSummary(
        makeRequest("/api/analytics/staff/summary")
      );
      const body = await response.json();

      expect(body.topPerformers).toHaveLength(4);
      const categories = body.topPerformers.map(
        (p: { category: string }) => p.category
      );
      expect(categories).toContain("Task Completion");
      expect(categories).toContain("Quality");
      expect(categories).toContain("Efficiency");
      expect(categories).toContain("Punctuality");
    });

    it("should return metricsByRole grouped by employee role", async () => {
      setupStaffMocks();

      const response = await getStaffSummary(
        makeRequest("/api/analytics/staff/summary")
      );
      const body = await response.json();

      expect(body.metricsByRole).toHaveLength(1);
      expect(body.metricsByRole[0].role).toBe("cook");
      expect(body.metricsByRole[0].employeeCount).toBe(1);
      expect(body.metricsByRole[0].avgTaskCompletionRate).toBeDefined();
      expect(body.metricsByRole[0].avgQualityScore).toBeDefined();
      expect(body.metricsByRole[0].avgEfficiencyScore).toBeDefined();
    });

    it("should return monthlyTrends with correct structure", async () => {
      setupStaffMocks();

      const response = await getStaffSummary(
        makeRequest("/api/analytics/staff/summary")
      );
      const body = await response.json();

      expect(body.monthlyTrends).toHaveLength(2);
      expect(body.monthlyTrends[0].month).toBe("2026-03");
      expect(body.monthlyTrends[0].avgTaskCompletionRate).toBe(90);
      expect(body.monthlyTrends[0].avgQualityScore).toBe(95);
      expect(body.monthlyTrends[0].avgEfficiencyScore).toBe(80);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(new Error("Timeout"));

      const response = await getStaffSummary(
        makeRequest("/api/analytics/staff/summary")
      );
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.message).toBe("Failed to fetch employee performance summary");
    });

    it("should handle empty employee data gracefully", async () => {
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([]) // no employees
        .mockResolvedValueOnce([]); // no trends

      const response = await getStaffSummary(
        makeRequest("/api/analytics/staff/summary")
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.totalEmployees).toBe(0);
      expect(body.averageTaskCompletionRate).toBe(0);
      expect(body.averageAttendanceRate).toBe(0);
      expect(body.averageQualityScore).toBe(0);
      expect(body.topPerformers).toHaveLength(4); // 4 categories always present
      expect(body.metricsByRole).toHaveLength(0);
      expect(body.monthlyTrends).toHaveLength(0);
    });

    it("should use period from query params (default 3m)", async () => {
      setupStaffMocks();

      const response = await getStaffSummary(
        makeRequest("/api/analytics/staff/summary")
      );
      const body = await response.json();
      // Default period is 3m; verify the route processed successfully
      expect(body.totalEmployees).toBeDefined();
    });

    it("should handle multiple employees and calculate averages", async () => {
      const multiEmployees = [
        ...sampleEmployeePerformance,
        {
          employee_id: "emp-002",
          first_name: "Bob",
          last_name: "Jones",
          role: "prep",
          total_tasks: "40",
          completed_tasks: "30",
          avg_duration_hours: "2.0",
          on_time_tasks: "25",
          total_shifts: "18",
          attended_shifts: "16",
          punctual_shifts: "14",
          total_hours: "140",
          progress_count: "40",
          rework_count: "5",
          client_interactions: "2",
          event_participation: "1",
        },
      ];

      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce(multiEmployees)
        .mockResolvedValueOnce(sampleMonthlyTrends);

      const response = await getStaffSummary(
        makeRequest("/api/analytics/staff/summary")
      );
      const body = await response.json();

      expect(body.totalEmployees).toBe(2);
      expect(body.metricsByRole).toHaveLength(2); // "cook" and "prep"
      // Averages should be between the two employees' individual rates
      expect(body.averageTaskCompletionRate).toBeGreaterThan(0);
      expect(body.averageTaskCompletionRate).toBeLessThan(100);
    });
  });
});
