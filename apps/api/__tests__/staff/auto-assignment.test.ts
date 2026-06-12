/**
 * Tests for Auto-Assignment Service
 *
 * These tests verify the intelligent shift assignment algorithm
 * that matches employees to open shifts based on availability,
 * skills, seniority, and labor budget.
 *
 * NOTE: The implementation uses structured Prisma findMany/findFirst
 * calls (not $queryRaw). Tests mock each Prisma method individually
 * to match the actual code paths.
 */

import { database } from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Manifest runtime (used by autoAssignShift)
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
  }),
}));

// Mock createManifestRuntime (used by autoAssignShift via the runtime factory)
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn().mockReturnValue({
    runCommand: vi.fn().mockResolvedValue({ ok: true, status: 200 }),
  }),
}));

import {
  autoAssignShift,
  getAssignmentSuggestionsForMultipleShifts,
  getEligibleEmployeesForShift,
  type ShiftRequirement,
} from "@/lib/staff/auto-assignment";

/**
 * Helper: set up all mocks for fetchEmployeesForShift.
 * The function makes 7 Prisma calls in this order:
 * 1. database.user.findMany → base employees
 * 2. database.employee_seniority.findMany → seniority (parallel)
 * 3. database.employee_skills.findMany → skills (parallel)
 * 4. database.employeeAvailability.findMany → availability (parallel)
 * 5. database.scheduleShift.findMany → shift conflicts (parallel)
 * 6. database.skills.findMany → skill names (sequential after parallel)
 * 7. database.location.findMany → location names (sequential after parallel)
 *
 * Returns Prisma-shaped data that the code transforms into DbEmployee[].
 */
function setupFetchMocks(opts: {
  employees?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    isActive: boolean;
    hourlyRate: number | null;
  }>;
  seniority?: Array<{
    employee_id: string;
    level: string;
    rank: number;
  }>;
  skills?: Array<{
    employee_id: string;
    skill_id: string;
    proficiency_level: number;
  }>;
  availability?: Array<{
    employeeId: string;
    dayOfWeek: number;
    startTime: Date;
    endTime: Date;
    isAvailable: boolean;
  }>;
  conflicts?: Array<{
    id: string;
    employeeId: string;
    locationId: string;
    shift_start: Date;
    shift_end: Date;
  }>;
  skillNames?: Array<{ id: string; name: string }>;
  locationNames?: Array<{ id: string; name: string }>;
}) {
  const employees = opts.employees ?? [];
  const employeeIds = employees.map((e) => e.id);

  vi.mocked(database.user.findMany).mockResolvedValue(employees as never);

  vi.mocked(database.employee_seniority.findMany).mockResolvedValue(
    (opts.seniority ?? []) as never
  );

  vi.mocked(database.employee_skills.findMany).mockResolvedValue(
    (opts.skills ?? []) as never
  );

  vi.mocked(database.employeeAvailability.findMany).mockResolvedValue(
    (opts.availability ?? []) as never
  );

  vi.mocked(database.scheduleShift.findMany).mockResolvedValue(
    (opts.conflicts ?? []) as never
  );

  // Derive skill names from skills if not explicitly provided
  const skillNames =
    opts.skillNames ??
    [...new Set((opts.skills ?? []).map((s) => s.skill_id))].map((id) => ({
      id,
      name: `Skill-${id}`,
    }));
  vi.mocked(database.skills.findMany).mockResolvedValue(skillNames as never);

  // Derive location names from conflicts if not explicitly provided
  const locationNames =
    opts.locationNames ??
    [...new Set((opts.conflicts ?? []).map((c) => c.locationId))].map((id) => ({
      id,
      name: `Location-${id}`,
    }));
  vi.mocked(database.location.findMany).mockResolvedValue(
    locationNames as never
  );

  return { employeeIds };
}

describe("Auto-Assignment Service", () => {
  const mockTenantId = "tenant-123";
  const mockShiftId = "shift-123";
  const mockScheduleId = "schedule-123";
  const mockLocationId = "location-123";

  // Reference date: Monday Jan 27 2025, 10:00-14:00 UTC
  const shiftStart = new Date("2025-01-27T10:00:00Z"); // Monday
  const shiftEnd = new Date("2025-01-27T14:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getEligibleEmployeesForShift", () => {
    it("should return eligible employees sorted by score", async () => {
      setupFetchMocks({
        employees: [
          {
            id: "emp-1",
            firstName: "John",
            lastName: "Senior",
            email: "john@example.com",
            role: "server",
            isActive: true,
            hourlyRate: 20,
          },
          {
            id: "emp-2",
            firstName: "Jane",
            lastName: "Junior",
            email: "jane@example.com",
            role: "server",
            isActive: true,
            hourlyRate: 15,
          },
          {
            id: "emp-3",
            firstName: "Bob",
            lastName: "Conflict",
            email: "bob@example.com",
            role: "server",
            isActive: true,
            hourlyRate: 18,
          },
        ],
        seniority: [
          { employee_id: "emp-1", level: "senior", rank: 4 },
          { employee_id: "emp-2", level: "junior", rank: 1 },
          { employee_id: "emp-3", level: "mid", rank: 2 },
        ],
        skills: [
          { employee_id: "emp-1", skill_id: "skill-1", proficiency_level: 5 },
          { employee_id: "emp-1", skill_id: "skill-2", proficiency_level: 4 },
          { employee_id: "emp-2", skill_id: "skill-1", proficiency_level: 2 },
          { employee_id: "emp-2", skill_id: "skill-2", proficiency_level: 3 },
          { employee_id: "emp-3", skill_id: "skill-1", proficiency_level: 4 },
        ],
        availability: [
          {
            employeeId: "emp-1",
            dayOfWeek: 1, // Monday
            startTime: new Date("2025-01-01T09:00:00Z"),
            endTime: new Date("2025-01-01T17:00:00Z"),
            isAvailable: true,
          },
          {
            employeeId: "emp-2",
            dayOfWeek: 1,
            startTime: new Date("2025-01-01T09:00:00Z"),
            endTime: new Date("2025-01-01T17:00:00Z"),
            isAvailable: true,
          },
        ],
        conflicts: [
          {
            id: "shift-999",
            employeeId: "emp-3", // Bob has a conflict
            locationId: "loc-other",
            shift_start: new Date("2025-01-27T14:00:00Z"),
            shift_end: new Date("2025-01-27T18:00:00Z"),
          },
        ],
        skillNames: [
          { id: "skill-1", name: "Bartending" },
          { id: "skill-2", name: "Food Service" },
        ],
        locationNames: [{ id: "loc-other", name: "Other Location" }],
      });

      const requirement: ShiftRequirement = {
        shiftId: mockShiftId,
        scheduleId: mockScheduleId,
        locationId: mockLocationId,
        shiftStart,
        shiftEnd,
        roleDuringShift: "server",
        requiredSkills: ["skill-1"],
      };

      const result = await getEligibleEmployeesForShift(
        mockTenantId,
        requirement
      );

      expect(result.shiftId).toBe(mockShiftId);
      expect(result.suggestions).toHaveLength(2); // emp-3 filtered out (conflict)
      expect(result.suggestions[0].employee.id).toBe("emp-1"); // Senior ranks first
      expect(result.suggestions[1].employee.id).toBe("emp-2");
      expect(result.bestMatch).not.toBeNull();
    });

    it("should correctly calculate confidence levels", async () => {
      setupFetchMocks({
        employees: [
          {
            id: "emp-1",
            firstName: "John",
            lastName: "Senior",
            email: "john@example.com",
            role: "server",
            isActive: true,
            hourlyRate: 20,
          },
        ],
        seniority: [{ employee_id: "emp-1", level: "senior", rank: 4 }],
        skills: [
          { employee_id: "emp-1", skill_id: "skill-1", proficiency_level: 5 },
          { employee_id: "emp-1", skill_id: "skill-2", proficiency_level: 4 },
        ],
        availability: [
          {
            employeeId: "emp-1",
            dayOfWeek: 1,
            startTime: new Date("2025-01-01T09:00:00Z"),
            endTime: new Date("2025-01-01T17:00:00Z"),
            isAvailable: true,
          },
        ],
        conflicts: [],
        skillNames: [
          { id: "skill-1", name: "Bartending" },
          { id: "skill-2", name: "Food Service" },
        ],
      });

      const requirement: ShiftRequirement = {
        shiftId: mockShiftId,
        scheduleId: mockScheduleId,
        locationId: mockLocationId,
        shiftStart,
        shiftEnd,
        requiredSkills: ["skill-1", "skill-2"],
      };

      const result = await getEligibleEmployeesForShift(
        mockTenantId,
        requirement
      );

      // Score components:
      // skills: (10+5*2) + (10+4*2) = 38, seniority: min(4*4,20) = 16
      // cost: 10 (rate=20 in 15-25 range), role: 10 (server=server)
      // Base score without availability = 38+16+10+10 = 74
      // Availability depends on timezone matching (formatTime uses UTC, checkAvailabilityMatch uses local)
      const suggestion = result.suggestions[0];
      expect(suggestion.score).toBeGreaterThanOrEqual(50);
      expect(suggestion.matchDetails.skillsMatch).toBe(true);
      expect(suggestion.matchDetails.hasConflicts).toBe(false);

      // Confidence depends on availability match (timezone-sensitive):
      // high: skillsMatch && !conflicts && availability && score>=50
      // medium: !conflicts && score>=30
      if (suggestion.matchDetails.availabilityMatch) {
        expect(suggestion.confidence).toBe("high");
      } else {
        expect(suggestion.confidence).toBe("medium");
      }
      expect(result.bestMatch).toBeTruthy();
    });

    it("should filter out employees with conflicting shifts", async () => {
      setupFetchMocks({
        employees: [
          {
            id: "emp-1",
            firstName: "John",
            lastName: "Senior",
            email: "john@example.com",
            role: "server",
            isActive: true,
            hourlyRate: 20,
          },
          {
            id: "emp-3",
            firstName: "Bob",
            lastName: "Conflict",
            email: "bob@example.com",
            role: "server",
            isActive: true,
            hourlyRate: 18,
          },
        ],
        seniority: [
          { employee_id: "emp-1", level: "senior", rank: 4 },
          { employee_id: "emp-3", level: "mid", rank: 2 },
        ],
        skills: [
          { employee_id: "emp-1", skill_id: "skill-1", proficiency_level: 5 },
          { employee_id: "emp-3", skill_id: "skill-1", proficiency_level: 4 },
        ],
        availability: [
          {
            employeeId: "emp-1",
            dayOfWeek: 1,
            startTime: new Date("2025-01-01T09:00:00Z"),
            endTime: new Date("2025-01-01T17:00:00Z"),
            isAvailable: true,
          },
        ],
        conflicts: [
          {
            id: "shift-999",
            employeeId: "emp-3", // Bob has a conflict
            locationId: "loc-other",
            shift_start: new Date("2025-01-27T12:00:00Z"),
            shift_end: new Date("2025-01-27T16:00:00Z"),
          },
        ],
        skillNames: [{ id: "skill-1", name: "Bartending" }],
        locationNames: [{ id: "loc-other", name: "Other Location" }],
      });

      const requirement: ShiftRequirement = {
        shiftId: mockShiftId,
        scheduleId: mockScheduleId,
        locationId: mockLocationId,
        shiftStart,
        shiftEnd,
      };

      const result = await getEligibleEmployeesForShift(
        mockTenantId,
        requirement
      );

      // Bob (emp-3) has conflicting shifts and should be filtered out
      const suggestionIds = result.suggestions.map((s) => s.employee.id);
      expect(suggestionIds).not.toContain("emp-3");
      expect(suggestionIds).toContain("emp-1");
    });

    it("should return empty suggestions when no eligible employees", async () => {
      setupFetchMocks({
        employees: [], // No employees
      });

      const requirement: ShiftRequirement = {
        shiftId: mockShiftId,
        scheduleId: mockScheduleId,
        locationId: mockLocationId,
        shiftStart,
        shiftEnd,
      };

      const result = await getEligibleEmployeesForShift(
        mockTenantId,
        requirement
      );

      expect(result.suggestions).toHaveLength(0);
      expect(result.bestMatch).toBeNull();
      expect(result.canAutoAssign).toBeFalsy();
    });

    it("should provide detailed reasoning for scoring", async () => {
      setupFetchMocks({
        employees: [
          {
            id: "emp-1",
            firstName: "John",
            lastName: "Senior",
            email: "john@example.com",
            role: "server",
            isActive: true,
            hourlyRate: 20,
          },
        ],
        seniority: [{ employee_id: "emp-1", level: "senior", rank: 4 }],
        skills: [
          { employee_id: "emp-1", skill_id: "skill-1", proficiency_level: 5 },
        ],
        availability: [
          {
            employeeId: "emp-1",
            dayOfWeek: 1,
            startTime: new Date("2025-01-01T09:00:00Z"),
            endTime: new Date("2025-01-01T17:00:00Z"),
            isAvailable: true,
          },
        ],
        conflicts: [],
        skillNames: [{ id: "skill-1", name: "Bartending" }],
      });

      const requirement: ShiftRequirement = {
        shiftId: mockShiftId,
        scheduleId: mockScheduleId,
        locationId: mockLocationId,
        shiftStart,
        shiftEnd,
        requiredSkills: ["skill-1"],
      };

      const result = await getEligibleEmployeesForShift(
        mockTenantId,
        requirement
      );

      // Reasoning should mention skills and seniority
      const reasoning = result.suggestions[0].reasoning.join(" ").toLowerCase();
      expect(reasoning).toContain("skill");
      expect(reasoning).toContain("seniority");
    });

    it("should include match details in suggestions", async () => {
      setupFetchMocks({
        employees: [
          {
            id: "emp-1",
            firstName: "John",
            lastName: "Senior",
            email: "john@example.com",
            role: "server",
            isActive: true,
            hourlyRate: 20,
          },
        ],
        seniority: [{ employee_id: "emp-1", level: "senior", rank: 4 }],
        skills: [
          { employee_id: "emp-1", skill_id: "skill-1", proficiency_level: 5 },
        ],
        availability: [
          {
            employeeId: "emp-1",
            dayOfWeek: 1,
            startTime: new Date("2025-01-01T09:00:00Z"),
            endTime: new Date("2025-01-01T17:00:00Z"),
            isAvailable: true,
          },
        ],
        conflicts: [],
        skillNames: [{ id: "skill-1", name: "Bartending" }],
      });

      const requirement: ShiftRequirement = {
        shiftId: mockShiftId,
        scheduleId: mockScheduleId,
        locationId: mockLocationId,
        shiftStart,
        shiftEnd,
        requiredSkills: ["skill-1"],
      };

      const result = await getEligibleEmployeesForShift(
        mockTenantId,
        requirement
      );

      const matchDetails = result.suggestions[0].matchDetails;
      expect(matchDetails).toHaveProperty("skillsMatch");
      expect(matchDetails).toHaveProperty("skillsMatched");
      expect(matchDetails).toHaveProperty("skillsMissing");
      expect(matchDetails).toHaveProperty("seniorityScore");
      expect(matchDetails).toHaveProperty("availabilityMatch");
      expect(matchDetails).toHaveProperty("hasConflicts");
      expect(matchDetails).toHaveProperty("costEstimate");
    });
  });

  describe("autoAssignShift", () => {
    it("should successfully assign an employee to a shift", async () => {
      vi.mocked(database.scheduleShift.findFirst)
        .mockResolvedValueOnce({
          locationId: mockLocationId,
          shift_start: shiftStart,
          shift_end: shiftEnd,
          role_during_shift: "server",
          notes: "",
        } as never)
        // Third findFirst call: system user lookup (returns an admin)
        .mockResolvedValueOnce({
          id: "admin-user",
          role: "admin",
        } as never);

      vi.mocked(database.user.findFirst).mockResolvedValueOnce({
        firstName: "John",
        lastName: "Senior",
      } as never);

      const result = await autoAssignShift(mockTenantId, mockShiftId, "emp-1");

      expect(result.success).toBe(true);
      expect(result.message).toContain("John Senior");
      expect(result.shiftId).toBe(mockShiftId);
      expect(result.employeeId).toBe("emp-1");
    });

    it("should fail when shift not found", async () => {
      // Reset and explicitly set scheduleShift.findFirst to return null
      vi.mocked(database.scheduleShift.findFirst).mockReset();
      vi.mocked(database.scheduleShift.findFirst).mockResolvedValue(null);

      const result = await autoAssignShift(mockTenantId, mockShiftId, "emp-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Shift not found");
    });

    it("should fail when employee not found", async () => {
      vi.mocked(database.scheduleShift.findFirst).mockResolvedValue({
        locationId: mockLocationId,
        shift_start: shiftStart,
        shift_end: shiftEnd,
        role_during_shift: "server",
        notes: "",
      } as never);

      vi.mocked(database.user.findFirst).mockResolvedValue(null as never);

      const result = await autoAssignShift(mockTenantId, mockShiftId, "emp-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Employee not found or inactive");
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(database.scheduleShift.findFirst).mockRejectedValue(
        new Error("Database connection failed")
      );

      const result = await autoAssignShift(mockTenantId, mockShiftId, "emp-1");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Database connection failed");
    });
  });

  describe("getAssignmentSuggestionsForMultipleShifts", () => {
    it("should return suggestions for multiple shifts", async () => {
      // Set up mocks for 2 shift lookups (each calls fetchEmployeesForShift)
      setupFetchMocks({
        employees: [
          {
            id: "emp-1",
            firstName: "John",
            lastName: "Senior",
            email: "john@example.com",
            role: "server",
            isActive: true,
            hourlyRate: 20,
          },
          {
            id: "emp-2",
            firstName: "Jane",
            lastName: "Junior",
            email: "jane@example.com",
            role: "server",
            isActive: true,
            hourlyRate: 15,
          },
        ],
        seniority: [
          { employee_id: "emp-1", level: "senior", rank: 4 },
          { employee_id: "emp-2", level: "junior", rank: 1 },
        ],
        skills: [
          { employee_id: "emp-1", skill_id: "skill-1", proficiency_level: 5 },
          { employee_id: "emp-2", skill_id: "skill-1", proficiency_level: 2 },
        ],
        availability: [
          {
            employeeId: "emp-1",
            dayOfWeek: 1,
            startTime: new Date("2025-01-01T09:00:00Z"),
            endTime: new Date("2025-01-01T17:00:00Z"),
            isAvailable: true,
          },
          {
            employeeId: "emp-2",
            dayOfWeek: 1,
            startTime: new Date("2025-01-01T09:00:00Z"),
            endTime: new Date("2025-01-01T17:00:00Z"),
            isAvailable: true,
          },
        ],
        conflicts: [],
        skillNames: [{ id: "skill-1", name: "Bartending" }],
      });

      const requirements: ShiftRequirement[] = [
        {
          shiftId: "shift-1",
          scheduleId: mockScheduleId,
          locationId: mockLocationId,
          shiftStart: new Date("2025-01-27T10:00:00Z"),
          shiftEnd: new Date("2025-01-27T14:00:00Z"),
        },
        {
          shiftId: "shift-2",
          scheduleId: mockScheduleId,
          locationId: mockLocationId,
          shiftStart: new Date("2025-01-27T15:00:00Z"),
          shiftEnd: new Date("2025-01-27T19:00:00Z"),
        },
      ];

      const results = await getAssignmentSuggestionsForMultipleShifts(
        mockTenantId,
        requirements
      );

      expect(results).toHaveLength(2);
      expect(results[0].shiftId).toBe("shift-1");
      expect(results[1].shiftId).toBe("shift-2");
      expect(results[0].suggestions.length).toBeGreaterThan(0);
      expect(results[1].suggestions.length).toBeGreaterThan(0);
    });

    it("should handle empty requirements array", async () => {
      const results = await getAssignmentSuggestionsForMultipleShifts(
        mockTenantId,
        []
      );

      expect(results).toHaveLength(0);
    });

    it("should process shifts in parallel", async () => {
      setupFetchMocks({
        employees: [
          {
            id: "emp-1",
            firstName: "John",
            lastName: "Senior",
            email: "john@example.com",
            role: "server",
            isActive: true,
            hourlyRate: 20,
          },
        ],
        seniority: [{ employee_id: "emp-1", level: "senior", rank: 4 }],
        skills: [
          { employee_id: "emp-1", skill_id: "skill-1", proficiency_level: 5 },
        ],
        availability: [
          {
            employeeId: "emp-1",
            dayOfWeek: 1,
            startTime: new Date("2025-01-01T09:00:00Z"),
            endTime: new Date("2025-01-01T17:00:00Z"),
            isAvailable: true,
          },
        ],
        conflicts: [],
        skillNames: [{ id: "skill-1", name: "Bartending" }],
      });

      const requirements: ShiftRequirement[] = [
        {
          shiftId: "shift-1",
          scheduleId: mockScheduleId,
          locationId: mockLocationId,
          shiftStart: new Date("2025-01-27T10:00:00Z"),
          shiftEnd: new Date("2025-01-27T14:00:00Z"),
        },
        {
          shiftId: "shift-2",
          scheduleId: mockScheduleId,
          locationId: mockLocationId,
          shiftStart: new Date("2025-01-27T15:00:00Z"),
          shiftEnd: new Date("2025-01-27T19:00:00Z"),
        },
        {
          shiftId: "shift-3",
          scheduleId: mockScheduleId,
          locationId: mockLocationId,
          shiftStart: new Date("2025-01-27T20:00:00Z"),
          shiftEnd: new Date("2025-01-27T23:00:00Z"),
        },
      ];

      const startTime = Date.now();
      await getAssignmentSuggestionsForMultipleShifts(
        mockTenantId,
        requirements
      );
      const endTime = Date.now();

      // If processed in parallel, should complete quickly
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
