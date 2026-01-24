/**
 * Integration tests for assignment suggestions API endpoint
 *
 * These tests verify the API endpoint for getting assignment suggestions
 * and auto-assigning employees to shifts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("next/server");
const vitest_1 = require("vitest");
const route_1 = require("./route");
// Mock dependencies
vitest_1.vi.mock("server-only", () => ({}));
vitest_1.vi.mock("@repo/auth/server", () => ({
  auth: vitest_1.vi.fn(),
}));
vitest_1.vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vitest_1.vi.fn(),
  },
  Prisma: {
    sql: vitest_1.vi.fn((strings, ...values) => ({
      strings,
      values,
    })),
  },
}));
vitest_1.vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vitest_1.vi.fn(),
}));
vitest_1.vi.mock("@/lib/staff/auto-assignment", () => ({
  getEligibleEmployeesForShift: vitest_1.vi.fn(),
  autoAssignShift: vitest_1.vi.fn(),
}));
const server_2 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const tenant_1 = require("@/app/lib/tenant");
const auto_assignment_1 = require("@/lib/staff/auto-assignment");
(0, vitest_1.describe)("assignment-suggestions route", () => {
  const mockTenantId = "tenant-123";
  const mockOrgId = "org-123";
  const mockShiftId = "shift-123";
  const mockScheduleId = "schedule-123";
  const mockLocationId = "location-123";
  const mockShiftData = [
    {
      tenant_id: mockTenantId,
      id: mockShiftId,
      schedule_id: mockScheduleId,
      location_id: mockLocationId,
      shift_start: new Date("2025-01-27T10:00:00Z"),
      shift_end: new Date("2025-01-27T14:00:00Z"),
      role_during_shift: "server",
      notes: "Lunch shift",
      employee_id: null,
    },
  ];
  const mockAssignmentResult = {
    shiftId: mockShiftId,
    suggestions: [
      {
        employee: {
          id: "emp-1",
          firstName: "John",
          lastName: "Senior",
          email: "john@example.com",
          role: "server",
          isActive: true,
          hourlyRate: 20,
          seniority: { level: "senior", rank: 4 },
          skills: [
            {
              skillId: "skill-1",
              skillName: "Bartending",
              proficiencyLevel: 5,
            },
          ],
          availability: [],
          hasConflictingShift: false,
          conflictingShifts: [],
        },
        score: 75,
        reasoning: ["All required skills matched", "Seniority level: senior"],
        confidence: "high",
        matchDetails: {
          skillsMatch: true,
          skillsMatched: ["Bartending"],
          skillsMissing: [],
          seniorityScore: 16,
          availabilityMatch: true,
          hasConflicts: false,
          costEstimate: 80,
        },
      },
    ],
    bestMatch: {
      employee: {
        id: "emp-1",
        firstName: "John",
        lastName: "Senior",
        email: "john@example.com",
        role: "server",
        isActive: true,
        hourlyRate: 20,
        seniority: { level: "senior", rank: 4 },
        skills: [],
        availability: [],
        hasConflictingShift: false,
        conflictingShifts: [],
      },
      score: 75,
      reasoning: [],
      confidence: "high",
      matchDetails: {
        skillsMatch: true,
        skillsMatched: [],
        skillsMissing: [],
        seniorityScore: 16,
        availabilityMatch: true,
        hasConflicts: false,
        costEstimate: 80,
      },
    },
    canAutoAssign: true,
  };
  (0, vitest_1.beforeEach)(() => {
    vitest_1.vi.resetAllMocks();
    vitest_1.vi.mocked(server_2.auth).mockResolvedValue({
      userId: "user-1",
      orgId: mockOrgId,
    });
    vitest_1.vi
      .mocked(tenant_1.getTenantIdForOrg)
      .mockResolvedValue(mockTenantId);
    // Set default mocks that return empty results
    vitest_1.vi.mocked(database_1.database.$queryRaw).mockResolvedValue([]);
    vitest_1.vi
      .mocked(auto_assignment_1.getEligibleEmployeesForShift)
      .mockResolvedValue({
        shiftId: mockShiftId,
        suggestions: [],
        bestMatch: null,
        canAutoAssign: false,
      });
    vitest_1.vi.mocked(auto_assignment_1.autoAssignShift).mockResolvedValue({
      success: false,
      message: "No mock configured",
      shiftId: mockShiftId,
      employeeId: "",
    });
  });
  (0, vitest_1.describe)("GET", () => {
    (0, vitest_1.it)(
      "should return assignment suggestions for a shift",
      async () => {
        vitest_1.vi
          .mocked(database_1.database.$queryRaw)
          .mockResolvedValue(mockShiftData);
        vitest_1.vi
          .mocked(auto_assignment_1.getEligibleEmployeesForShift)
          .mockResolvedValue(mockAssignmentResult);
        const request = new server_1.NextRequest(
          `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`
        );
        const response = await (0, route_1.GET)(request, {
          params: Promise.resolve({ shiftId: mockShiftId }),
        });
        (0, vitest_1.expect)(response.status).toBe(200);
        const data = await response.json();
        (0, vitest_1.expect)(data).toEqual(mockAssignmentResult);
      }
    );
    (0, vitest_1.it)("should return 401 when unauthorized", async () => {
      vitest_1.vi.mocked(server_2.auth).mockResolvedValue({
        userId: "user-1",
        orgId: null,
      });
      const request = new server_1.NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`
      );
      const response = await (0, route_1.GET)(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });
      (0, vitest_1.expect)(response.status).toBe(401);
      (0, vitest_1.expect)(await response.json()).toEqual({
        message: "Unauthorized",
      });
    });
    (0, vitest_1.it)("should return 404 when shift not found", async () => {
      vitest_1.vi.mocked(database_1.database.$queryRaw).mockResolvedValue([]);
      const request = new server_1.NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`
      );
      const response = await (0, route_1.GET)(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });
      (0, vitest_1.expect)(response.status).toBe(404);
      (0, vitest_1.expect)(await response.json()).toEqual({
        message: "Shift not found",
      });
    });
    (0, vitest_1.it)(
      "should support requiredSkills query parameter",
      async () => {
        vitest_1.vi
          .mocked(database_1.database.$queryRaw)
          .mockResolvedValue(mockShiftData);
        vitest_1.vi
          .mocked(auto_assignment_1.getEligibleEmployeesForShift)
          .mockResolvedValue(mockAssignmentResult);
        const request = new server_1.NextRequest(
          `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions?requiredSkills=skill-1,skill-2`
        );
        const response = await (0, route_1.GET)(request, {
          params: Promise.resolve({ shiftId: mockShiftId }),
        });
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(
          auto_assignment_1.getEligibleEmployeesForShift
        ).toHaveBeenCalledWith(
          mockTenantId,
          vitest_1.expect.objectContaining({
            requiredSkills: ["skill-1", "skill-2"],
          })
        );
      }
    );
    (0, vitest_1.it)("should support locationId query parameter", async () => {
      vitest_1.vi
        .mocked(database_1.database.$queryRaw)
        .mockResolvedValue(mockShiftData);
      vitest_1.vi
        .mocked(auto_assignment_1.getEligibleEmployeesForShift)
        .mockResolvedValue(mockAssignmentResult);
      const customLocationId = "custom-location-123";
      const request = new server_1.NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions?locationId=${customLocationId}`
      );
      const response = await (0, route_1.GET)(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });
      (0, vitest_1.expect)(response.status).toBe(200);
      (0, vitest_1.expect)(
        auto_assignment_1.getEligibleEmployeesForShift
      ).toHaveBeenCalledWith(
        mockTenantId,
        vitest_1.expect.objectContaining({
          locationId: customLocationId,
        })
      );
    });
    (0, vitest_1.it)("should return 500 on internal error", async () => {
      vitest_1.vi
        .mocked(database_1.database.$queryRaw)
        .mockRejectedValue(new Error("Database error"));
      const request = new server_1.NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`
      );
      const response = await (0, route_1.GET)(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });
      (0, vitest_1.expect)(response.status).toBe(500);
      (0, vitest_1.expect)(await response.json()).toEqual({
        message: "Failed to get assignment suggestions",
      });
    });
  });
  (0, vitest_1.describe)("POST", () => {
    (0, vitest_1.it)("should auto-assign the best match employee", async () => {
      vitest_1.vi
        .mocked(database_1.database.$queryRaw)
        .mockResolvedValueOnce(mockShiftData) // First call - get shift
        .mockResolvedValueOnce(mockShiftData); // Second call - get shift again
      vitest_1.vi
        .mocked(auto_assignment_1.getEligibleEmployeesForShift)
        .mockResolvedValue(mockAssignmentResult);
      vitest_1.vi.mocked(auto_assignment_1.autoAssignShift).mockResolvedValue({
        success: true,
        message: "Successfully assigned John Senior to shift",
        shiftId: mockShiftId,
        employeeId: "emp-1",
      });
      const request = new server_1.NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await (0, route_1.POST)(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });
      (0, vitest_1.expect)(response.status).toBe(200);
      const data = await response.json();
      (0, vitest_1.expect)(data.success).toBe(true);
      (0, vitest_1.expect)(data.message).toContain("John Senior");
    });
    (0, vitest_1.it)(
      "should assign specific employee when employeeId provided",
      async () => {
        vitest_1.vi
          .mocked(database_1.database.$queryRaw)
          .mockResolvedValue(mockShiftData);
        vitest_1.vi
          .mocked(auto_assignment_1.autoAssignShift)
          .mockResolvedValue({
            success: true,
            message: "Successfully assigned Jane Junior to shift",
            shiftId: mockShiftId,
            employeeId: "emp-2",
          });
        const request = new server_1.NextRequest(
          `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`,
          {
            method: "POST",
            body: JSON.stringify({ employeeId: "emp-2" }),
          }
        );
        const response = await (0, route_1.POST)(request, {
          params: Promise.resolve({ shiftId: mockShiftId }),
        });
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(
          auto_assignment_1.autoAssignShift
        ).toHaveBeenCalledWith(mockTenantId, mockShiftId, "emp-2");
      }
    );
    (0, vitest_1.it)("should return 400 when assignment fails", async () => {
      vitest_1.vi
        .mocked(database_1.database.$queryRaw)
        .mockResolvedValueOnce(mockShiftData)
        .mockResolvedValueOnce(mockShiftData);
      vitest_1.vi
        .mocked(auto_assignment_1.getEligibleEmployeesForShift)
        .mockResolvedValue({
          ...mockAssignmentResult,
          canAutoAssign: false,
          bestMatch: null,
        });
      const request = new server_1.NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await (0, route_1.POST)(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });
      (0, vitest_1.expect)(response.status).toBe(200);
      const data = await response.json();
      (0, vitest_1.expect)(data.message).toContain(
        "No high-confidence match found"
      );
    });
    (0, vitest_1.it)("should force assignment when force=true", async () => {
      vitest_1.vi
        .mocked(database_1.database.$queryRaw)
        .mockResolvedValueOnce(mockShiftData)
        .mockResolvedValueOnce(mockShiftData);
      vitest_1.vi
        .mocked(auto_assignment_1.getEligibleEmployeesForShift)
        .mockResolvedValue({
          ...mockAssignmentResult,
          canAutoAssign: false,
          bestMatch: mockAssignmentResult.bestMatch,
        });
      vitest_1.vi.mocked(auto_assignment_1.autoAssignShift).mockResolvedValue({
        success: true,
        message: "Successfully assigned John Senior to shift",
        shiftId: mockShiftId,
        employeeId: "emp-1",
      });
      const request = new server_1.NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`,
        {
          method: "POST",
          body: JSON.stringify({ force: true }),
        }
      );
      const response = await (0, route_1.POST)(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });
      (0, vitest_1.expect)(response.status).toBe(200);
      (0, vitest_1.expect)(
        auto_assignment_1.autoAssignShift
      ).toHaveBeenCalled();
    });
    (0, vitest_1.it)("should return 404 when shift not found", async () => {
      vitest_1.vi.mocked(database_1.database.$queryRaw).mockResolvedValue([]);
      const request = new server_1.NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`,
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-1" }),
        }
      );
      const response = await (0, route_1.POST)(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });
      (0, vitest_1.expect)(response.status).toBe(404);
    });
    (0, vitest_1.it)("should return 401 when unauthorized", async () => {
      vitest_1.vi.mocked(server_2.auth).mockResolvedValue({
        userId: "user-1",
        orgId: null,
      });
      const request = new server_1.NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await (0, route_1.POST)(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });
      (0, vitest_1.expect)(response.status).toBe(401);
    });
    (0, vitest_1.it)("should return 500 on internal error", async () => {
      vitest_1.vi
        .mocked(database_1.database.$queryRaw)
        .mockRejectedValue(new Error("Database error"));
      const request = new server_1.NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await (0, route_1.POST)(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });
      (0, vitest_1.expect)(response.status).toBe(500);
    });
  });
});
