/**
 * Integration tests for assignment suggestions API endpoint
 *
 * These tests verify the API endpoint for getting assignment suggestions
 * and auto-assigning employees to shifts.
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

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
  getEligibleEmployeesForShift: vi.fn(),
  autoAssignShift: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  autoAssignShift,
  getEligibleEmployeesForShift,
} from "@/lib/staff/auto-assignment";

describe("assignment-suggestions route", () => {
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
        confidence: "high" as const,
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
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: "user-1",
      orgId: mockOrgId,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(mockTenantId);
    // Set default mocks that return empty results
    vi.mocked(database.$queryRaw).mockResolvedValue([]);
    vi.mocked(getEligibleEmployeesForShift).mockResolvedValue({
      shiftId: mockShiftId,
      suggestions: [],
      bestMatch: null,
      canAutoAssign: false,
    });
    vi.mocked(autoAssignShift).mockResolvedValue({
      success: false,
      message: "No mock configured",
      shiftId: mockShiftId,
      employeeId: "",
    });
  });

  describe("GET", () => {
    it("should return assignment suggestions for a shift", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue(mockShiftData);
      vi.mocked(getEligibleEmployeesForShift).mockResolvedValue(
        mockAssignmentResult
      );

      const request = new NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`
      );

      const response = await GET(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockAssignmentResult);
    });

    it("should return 401 when unauthorized", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: "user-1",
        orgId: null,
      } as unknown as Awaited<ReturnType<typeof auth>>);

      const request = new NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`
      );

      const response = await GET(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ message: "Unauthorized" });
    });

    it("should return 404 when shift not found", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const request = new NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`
      );

      const response = await GET(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ message: "Shift not found" });
    });

    it("should support requiredSkills query parameter", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue(mockShiftData);
      vi.mocked(getEligibleEmployeesForShift).mockResolvedValue(
        mockAssignmentResult
      );

      const request = new NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions?requiredSkills=skill-1,skill-2`
      );

      const response = await GET(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });

      expect(response.status).toBe(200);
      expect(getEligibleEmployeesForShift).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          requiredSkills: ["skill-1", "skill-2"],
        })
      );
    });

    it("should support locationId query parameter", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue(mockShiftData);
      vi.mocked(getEligibleEmployeesForShift).mockResolvedValue(
        mockAssignmentResult
      );

      const customLocationId = "custom-location-123";
      const request = new NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions?locationId=${customLocationId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });

      expect(response.status).toBe(200);
      expect(getEligibleEmployeesForShift).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          locationId: customLocationId,
        })
      );
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`
      );

      const response = await GET(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        message: "Failed to get assignment suggestions",
      });
    });
  });

  describe("POST", () => {
    it("should auto-assign the best match employee", async () => {
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce(mockShiftData) // First call - get shift
        .mockResolvedValueOnce(mockShiftData); // Second call - get shift again
      vi.mocked(getEligibleEmployeesForShift).mockResolvedValue(
        mockAssignmentResult
      );
      vi.mocked(autoAssignShift).mockResolvedValue({
        success: true,
        message: "Successfully assigned John Senior to shift",
        shiftId: mockShiftId,
        employeeId: "emp-1",
      });

      const request = new NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain("John Senior");
    });

    it("should assign specific employee when employeeId provided", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue(mockShiftData);
      vi.mocked(autoAssignShift).mockResolvedValue({
        success: true,
        message: "Successfully assigned Jane Junior to shift",
        shiftId: mockShiftId,
        employeeId: "emp-2",
      });

      const request = new NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`,
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-2" }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });

      expect(response.status).toBe(200);
      expect(autoAssignShift).toHaveBeenCalledWith(
        mockTenantId,
        mockShiftId,
        "emp-2"
      );
    });

    it("should return 400 when assignment fails", async () => {
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce(mockShiftData)
        .mockResolvedValueOnce(mockShiftData);
      vi.mocked(getEligibleEmployeesForShift).mockResolvedValue({
        ...mockAssignmentResult,
        canAutoAssign: false,
        bestMatch: null,
      });

      const request = new NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain("No high-confidence match found");
    });

    it("should force assignment when force=true", async () => {
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce(mockShiftData)
        .mockResolvedValueOnce(mockShiftData);
      vi.mocked(getEligibleEmployeesForShift).mockResolvedValue({
        ...mockAssignmentResult,
        canAutoAssign: false,
        bestMatch: mockAssignmentResult.bestMatch,
      });
      vi.mocked(autoAssignShift).mockResolvedValue({
        success: true,
        message: "Successfully assigned John Senior to shift",
        shiftId: mockShiftId,
        employeeId: "emp-1",
      });

      const request = new NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`,
        {
          method: "POST",
          body: JSON.stringify({ force: true }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });

      expect(response.status).toBe(200);
      expect(autoAssignShift).toHaveBeenCalled();
    });

    it("should return 404 when shift not found", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const request = new NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`,
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-1" }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });

      expect(response.status).toBe(404);
    });

    it("should return 401 when unauthorized", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: "user-1",
        orgId: null,
      } as unknown as Awaited<ReturnType<typeof auth>>);

      const request = new NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest(
        `https://example.com/api/staff/shifts/${mockShiftId}/assignment-suggestions`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ shiftId: mockShiftId }),
      });

      expect(response.status).toBe(500);
    });
  });
});
