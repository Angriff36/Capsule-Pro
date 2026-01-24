/**
 * Integration tests for bulk assignment suggestions API endpoint
 *
 * These tests verify the API endpoint for getting assignment suggestions
 * for multiple shifts at once.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import { GET, POST } from "./route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("server-only", () => ({}));
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vi.fn(),
  },
  Prisma: {
    sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    })),
  },
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@/lib/staff/auto-assignment", () => ({
  getAssignmentSuggestionsForMultipleShifts: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { getAssignmentSuggestionsForMultipleShifts } from "@/lib/staff/auto-assignment";

import { database } from "@repo/database";
describe("bulk-assignment-suggestions route", () => {
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
          confidence: "high" as const,
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
        confidence: "high" as const,
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: "user-1",
      orgId: mockOrgId,
    });
    vi.mocked(getTenantIdForOrg).mockResolvedValue(mockTenantId);
  });

  describe("GET", () => {
    it("should return suggestions for all open shifts", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue(mockOpenShifts);
      vi.mocked(getAssignmentSuggestionsForMultipleShifts).mockResolvedValue(mockBulkResults);

      const request = new NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions"
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.results).toHaveLength(2);
      expect(data.summary).toEqual({
        total: 2,
        canAutoAssign: 1,
        hasSuggestions: 1,
        noSuggestions: 1,
      });
    });

    it("should return empty results when no open shifts", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const request = new NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions"
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.results).toHaveLength(0);
      expect(data.summary).toEqual({
        total: 0,
        canAutoAssign: 0,
        hasSuggestions: 0,
        noSuggestions: 0,
      });
    });

    it("should filter by scheduleId query parameter", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([mockOpenShifts[0]]);
      vi.mocked(getAssignmentSuggestionsForMultipleShifts).mockResolvedValue([
        mockBulkResults[0],
      ]);

      const request = new NextRequest(
        `https://example.com/api/staff/shifts/bulk-assignment-suggestions?scheduleId=${mockScheduleId}`
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(database.$queryRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          strings: expect.arrayContaining([
            expect.stringContaining("schedule_id"),
          ]),
        })
      );
    });

    it("should filter by locationId query parameter", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue(mockOpenShifts);
      vi.mocked(getAssignmentSuggestionsForMultipleShifts).mockResolvedValue(mockBulkResults);

      const request = new NextRequest(
        `https://example.com/api/staff/shifts/bulk-assignment-suggestions?locationId=${mockLocationId}`
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should filter by date range", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue(mockOpenShifts);
      vi.mocked(getAssignmentSuggestionsForMultipleShifts).mockResolvedValue(mockBulkResults);

      const startDate = "2025-01-27T00:00:00Z";
      const endDate = "2025-01-27T23:59:59Z";

      const request = new NextRequest(
        `https://example.com/api/staff/shifts/bulk-assignment-suggestions?startDate=${startDate}&endDate=${endDate}`
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.results).toBeDefined();
    });

    it("should limit results to 50 shifts", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const request = new NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions"
      );

      await GET(request);

      expect(database.$queryRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          strings: expect.arrayContaining([
            expect.stringContaining("LIMIT 50"),
          ]),
        })
      );
    });

    it("should return 401 when unauthorized", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: "user-1",
        orgId: null,
      });

      const request = new NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions"
      );

      const response = await GET(request);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ message: "Unauthorized" });
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions"
      );

      const response = await GET(request);

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        message: "Failed to get open shifts suggestions",
      });
    });
  });

  describe("POST", () => {
    it("should return suggestions for specific shifts", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue(mockOpenShifts);
      vi.mocked(getAssignmentSuggestionsForMultipleShifts).mockResolvedValue(mockBulkResults);

      const request = new NextRequest(
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

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.results).toHaveLength(2);
    });

    it("should support locationId in request body", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue(mockOpenShifts);
      vi.mocked(getAssignmentSuggestionsForMultipleShifts).mockResolvedValue(mockBulkResults);

      const customLocationId = "custom-location-123";
      const request = new NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions",
        {
          method: "POST",
          body: JSON.stringify({
            shifts: [{ shiftId: mockShiftId1, locationId: customLocationId }],
          }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(getAssignmentSuggestionsForMultipleShifts).toHaveBeenCalledWith(
        mockTenantId,
        expect.arrayContaining([
          expect.objectContaining({
            locationId: customLocationId,
          }),
        ])
      );
    });

    it("should support requiredSkills in request body", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([mockOpenShifts[0]]);
      vi.mocked(getAssignmentSuggestionsForMultipleShifts).mockResolvedValue([
        mockBulkResults[0],
      ]);

      const request = new NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions",
        {
          method: "POST",
          body: JSON.stringify({
            shifts: [
              { shiftId: mockShiftId1, requiredSkills: ["skill-1", "skill-2"] },
            ],
          }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(getAssignmentSuggestionsForMultipleShifts).toHaveBeenCalledWith(
        mockTenantId,
        expect.arrayContaining([
          expect.objectContaining({
            requiredSkills: ["skill-1", "skill-2"],
          }),
        ])
      );
    });

    it("should return 400 when request body is invalid", async () => {
      const request = new NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions",
        {
          method: "POST",
          body: JSON.stringify({ invalid: "data" }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ message: "Invalid request body" });
    });

    it("should return 400 when shifts array is missing", async () => {
      const request = new NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ message: "Invalid request body" });
    });

    it("should return 401 when unauthorized", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: "user-1",
        orgId: null,
      });

      const request = new NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions",
        {
          method: "POST",
          body: JSON.stringify({ shifts: [] }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions",
        {
          method: "POST",
          body: JSON.stringify({ shifts: [{ shiftId: mockShiftId1 }] }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        message: "Failed to get bulk assignment suggestions",
      });
    });

    it("should handle empty shifts array", async () => {
      const request = new NextRequest(
        "https://example.com/api/staff/shifts/bulk-assignment-suggestions",
        {
          method: "POST",
          body: JSON.stringify({ shifts: [] }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.results).toHaveLength(0);
      expect(data.summary.total).toBe(0);
    });
  });
});
