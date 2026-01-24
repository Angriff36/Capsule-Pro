/**
 * Integration tests for bulk assignment suggestions API endpoint
 *
 * These tests verify the API endpoint for getting assignment suggestions
 * for multiple shifts at once.
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
  getAssignmentSuggestionsForMultipleShifts: vitest_1.vi.fn(),
}));
const server_2 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const tenant_1 = require("@/app/lib/tenant");
const auto_assignment_1 = require("@/lib/staff/auto-assignment");
(0, vitest_1.describe)("bulk-assignment-suggestions route", () => {
  const mockTenantId = "tenant-123";
  const mockOrgId = "org-123";
  const mockShiftId1 = "shift-123";
  const mockShiftId2 = "shift-456";
  const mockScheduleId = "schedule-123";
  const mockLocationId = "location-123";
  const mockOpenShifts = [
    {
      tenant_id: mockTenantId,
      id: mockShiftId1,
      schedule_id: mockScheduleId,
      location_id: mockLocationId,
      shift_start: new Date("2025-01-27T10:00:00Z"),
      shift_end: new Date("2025-01-27T14:00:00Z"),
      role_during_shift: "server",
    },
    {
      tenant_id: mockTenantId,
      id: mockShiftId2,
      schedule_id: mockScheduleId,
      location_id: mockLocationId,
      shift_start: new Date("2025-01-27T15:00:00Z"),
      shift_end: new Date("2025-01-27T19:00:00Z"),
      role_during_shift: "bartender",
    },
  ];
  const mockBulkResults = [
    {
      shiftId: mockShiftId1,
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
    },
    {
      shiftId: mockShiftId2,
      suggestions: [],
      bestMatch: null,
      canAutoAssign: false,
    },
  ];
  (0, vitest_1.beforeEach)(() => {
    vitest_1.vi.clearAllMocks();
    vitest_1.vi.mocked(server_2.auth).mockResolvedValue({
      userId: "user-1",
      orgId: mockOrgId,
    });
    vitest_1.vi
      .mocked(tenant_1.getTenantIdForOrg)
      .mockResolvedValue(mockTenantId);
  });
  (0, vitest_1.describe)("GET", () => {
    (0, vitest_1.it)(
      "should return suggestions for all open shifts",
      async () => {
        vitest_1.vi
          .mocked(database_1.database.$queryRaw)
          .mockResolvedValue(mockOpenShifts);
        vitest_1.vi
          .mocked(auto_assignment_1.getAssignmentSuggestionsForMultipleShifts)
          .mockResolvedValue(mockBulkResults);
        const request = new server_1.NextRequest(
          "https://example.com/api/staff/shifts/bulk-assignment-suggestions"
        );
        const response = await (0, route_1.GET)(request);
        (0, vitest_1.expect)(response.status).toBe(200);
        const data = await response.json();
        (0, vitest_1.expect)(data.results).toHaveLength(2);
        (0, vitest_1.expect)(data.summary).toEqual({
          total: 2,
          canAutoAssign: 1,
          hasSuggestions: 1,
          noSuggestions: 1,
        });
      }
    );
    (0, vitest_1.it)(
      "should return empty results when no open shifts",
      async () => {
        vitest_1.vi.mocked(database_1.database.$queryRaw).mockResolvedValue([]);
        const request = new server_1.NextRequest(
          "https://example.com/api/staff/shifts/bulk-assignment-suggestions"
        );
        const response = await (0, route_1.GET)(request);
        (0, vitest_1.expect)(response.status).toBe(200);
        const data = await response.json();
        (0, vitest_1.expect)(data.results).toHaveLength(0);
        (0, vitest_1.expect)(data.summary).toEqual({
          total: 0,
          canAutoAssign: 0,
          hasSuggestions: 0,
          noSuggestions: 0,
        });
      }
    );
    (0, vitest_1.it)(
      "should filter by scheduleId query parameter",
      async () => {
        vitest_1.vi
          .mocked(database_1.database.$queryRaw)
          .mockResolvedValue([mockOpenShifts[0]]);
        vitest_1.vi
          .mocked(auto_assignment_1.getAssignmentSuggestionsForMultipleShifts)
          .mockResolvedValue([mockBulkResults[0]]);
        const request = new server_1.NextRequest(
          `https://example.com/api/staff/shifts/bulk-assignment-suggestions?scheduleId=${mockScheduleId}`
        );
        const response = await (0, route_1.GET)(request);
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(
          database_1.database.$queryRaw
        ).toHaveBeenCalledWith(
          vitest_1.expect.objectContaining({
            strings: vitest_1.expect.arrayContaining([
              vitest_1.expect.stringContaining("schedule_id"),
            ]),
          })
        );
      }
    );
    (0, vitest_1.it)(
      "should filter by locationId query parameter",
      async () => {
        vitest_1.vi
          .mocked(database_1.database.$queryRaw)
          .mockResolvedValue(mockOpenShifts);
        vitest_1.vi
          .mocked(auto_assignment_1.getAssignmentSuggestionsForMultipleShifts)
          .mockResolvedValue(mockBulkResults);
        const request = new server_1.NextRequest(
          `https://example.com/api/staff/shifts/bulk-assignment-suggestions?locationId=${mockLocationId}`
        );
        const response = await (0, route_1.GET)(request);
        (0, vitest_1.expect)(response.status).toBe(200);
      }
    );
    (0, vitest_1.it)("should filter by date range", async () => {
      vitest_1.vi
        .mocked(database_1.database.$queryRaw)
        .mockResolvedValue(mockOpenShifts);
      vitest_1.vi
        .mocked(auto_assignment_1.getAssignmentSuggestionsForMultipleShifts)
        .mockResolvedValue(mockBulkResults);
      const startDate = "2025-01-27T00:00:00Z";
      const endDate = "2025-01-27T23:59:59Z";
      const request = new server_1.NextRequest(
        `https://example.com/api/staff/shifts/bulk-assignment-suggestions?startDate=${startDate}&endDate=${endDate}`
      );
      const response = await (0, route_1.GET)(request);
      (0, vitest_1.expect)(response.status).toBe(200);
      const data = await response.json();
      (0, vitest_1.expect)(data.results).toBeDefined();
    });
    (0, vitest_1.it)("should limit results to 50 shifts", async () => {
      vitest_1.vi.mocked(database_1.database.$queryRaw).mockResolvedValue([]);
      const request = new server_1.NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions"
      );
      await (0, route_1.GET)(request);
      (0, vitest_1.expect)(database_1.database.$queryRaw).toHaveBeenCalledWith(
        vitest_1.expect.objectContaining({
          strings: vitest_1.expect.arrayContaining([
            vitest_1.expect.stringContaining("LIMIT 50"),
          ]),
        })
      );
    });
    (0, vitest_1.it)("should return 401 when unauthorized", async () => {
      vitest_1.vi.mocked(server_2.auth).mockResolvedValue({
        userId: "user-1",
        orgId: null,
      });
      const request = new server_1.NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions"
      );
      const response = await (0, route_1.GET)(request);
      (0, vitest_1.expect)(response.status).toBe(401);
      (0, vitest_1.expect)(await response.json()).toEqual({
        message: "Unauthorized",
      });
    });
    (0, vitest_1.it)("should return 500 on internal error", async () => {
      vitest_1.vi
        .mocked(database_1.database.$queryRaw)
        .mockRejectedValue(new Error("Database error"));
      const request = new server_1.NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions"
      );
      const response = await (0, route_1.GET)(request);
      (0, vitest_1.expect)(response.status).toBe(500);
      (0, vitest_1.expect)(await response.json()).toEqual({
        message: "Failed to get open shifts suggestions",
      });
    });
  });
  (0, vitest_1.describe)("POST", () => {
    (0, vitest_1.it)(
      "should return suggestions for specific shifts",
      async () => {
        vitest_1.vi
          .mocked(database_1.database.$queryRaw)
          .mockResolvedValue(mockOpenShifts);
        vitest_1.vi
          .mocked(auto_assignment_1.getAssignmentSuggestionsForMultipleShifts)
          .mockResolvedValue(mockBulkResults);
        const request = new server_1.NextRequest(
          "https://example.com/api/staff/shifts/bulk-assignment-suggestions",
          {
            method: "POST",
            body: JSON.stringify({
              shifts: [
                { shiftId: mockShiftId1 },
                { shiftId: mockShiftId2, requiredSkills: ["skill-1"] },
              ],
            }),
          }
        );
        const response = await (0, route_1.POST)(request);
        (0, vitest_1.expect)(response.status).toBe(200);
        const data = await response.json();
        (0, vitest_1.expect)(data.results).toHaveLength(2);
      }
    );
    (0, vitest_1.it)("should support locationId in request body", async () => {
      vitest_1.vi
        .mocked(database_1.database.$queryRaw)
        .mockResolvedValue(mockOpenShifts);
      vitest_1.vi
        .mocked(auto_assignment_1.getAssignmentSuggestionsForMultipleShifts)
        .mockResolvedValue(mockBulkResults);
      const customLocationId = "custom-location-123";
      const request = new server_1.NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions",
        {
          method: "POST",
          body: JSON.stringify({
            shifts: [{ shiftId: mockShiftId1, locationId: customLocationId }],
          }),
        }
      );
      const response = await (0, route_1.POST)(request);
      (0, vitest_1.expect)(response.status).toBe(200);
      (0, vitest_1.expect)(
        auto_assignment_1.getAssignmentSuggestionsForMultipleShifts
      ).toHaveBeenCalledWith(
        mockTenantId,
        vitest_1.expect.arrayContaining([
          vitest_1.expect.objectContaining({
            locationId: customLocationId,
          }),
        ])
      );
    });
    (0, vitest_1.it)(
      "should support requiredSkills in request body",
      async () => {
        vitest_1.vi
          .mocked(database_1.database.$queryRaw)
          .mockResolvedValue([mockOpenShifts[0]]);
        vitest_1.vi
          .mocked(auto_assignment_1.getAssignmentSuggestionsForMultipleShifts)
          .mockResolvedValue([mockBulkResults[0]]);
        const request = new server_1.NextRequest(
          "https://example.com/api/staff/shifts/bulk-assignment-suggestions",
          {
            method: "POST",
            body: JSON.stringify({
              shifts: [
                {
                  shiftId: mockShiftId1,
                  requiredSkills: ["skill-1", "skill-2"],
                },
              ],
            }),
          }
        );
        const response = await (0, route_1.POST)(request);
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(
          auto_assignment_1.getAssignmentSuggestionsForMultipleShifts
        ).toHaveBeenCalledWith(
          mockTenantId,
          vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
              requiredSkills: ["skill-1", "skill-2"],
            }),
          ])
        );
      }
    );
    (0, vitest_1.it)(
      "should return 400 when request body is invalid",
      async () => {
        const request = new server_1.NextRequest(
          "https://example.com/api/staff/shifts/bulk-assignment-suggestions",
          {
            method: "POST",
            body: JSON.stringify({ invalid: "data" }),
          }
        );
        const response = await (0, route_1.POST)(request);
        (0, vitest_1.expect)(response.status).toBe(400);
        (0, vitest_1.expect)(await response.json()).toEqual({
          message: "Invalid request body",
        });
      }
    );
    (0, vitest_1.it)(
      "should return 400 when shifts array is missing",
      async () => {
        const request = new server_1.NextRequest(
          "https://example.com/api/staff/shifts/bulk-assignment-suggestions",
          {
            method: "POST",
            body: JSON.stringify({}),
          }
        );
        const response = await (0, route_1.POST)(request);
        (0, vitest_1.expect)(response.status).toBe(400);
        (0, vitest_1.expect)(await response.json()).toEqual({
          message: "Invalid request body",
        });
      }
    );
    (0, vitest_1.it)("should return 401 when unauthorized", async () => {
      vitest_1.vi.mocked(server_2.auth).mockResolvedValue({
        userId: "user-1",
        orgId: null,
      });
      const request = new server_1.NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions",
        {
          method: "POST",
          body: JSON.stringify({ shifts: [] }),
        }
      );
      const response = await (0, route_1.POST)(request);
      (0, vitest_1.expect)(response.status).toBe(401);
    });
    (0, vitest_1.it)("should return 500 on internal error", async () => {
      vitest_1.vi
        .mocked(database_1.database.$queryRaw)
        .mockRejectedValue(new Error("Database error"));
      const request = new server_1.NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions",
        {
          method: "POST",
          body: JSON.stringify({ shifts: [{ shiftId: mockShiftId1 }] }),
        }
      );
      const response = await (0, route_1.POST)(request);
      (0, vitest_1.expect)(response.status).toBe(500);
      (0, vitest_1.expect)(await response.json()).toEqual({
        message: "Failed to get bulk assignment suggestions",
      });
    });
    (0, vitest_1.it)("should handle empty shifts array", async () => {
      const request = new server_1.NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions",
        {
          method: "POST",
          body: JSON.stringify({ shifts: [] }),
        }
      );
      const response = await (0, route_1.POST)(request);
      (0, vitest_1.expect)(response.status).toBe(200);
      const data = await response.json();
      (0, vitest_1.expect)(data.results).toHaveLength(0);
      (0, vitest_1.expect)(data.summary.total).toBe(0);
    });
  });
});
